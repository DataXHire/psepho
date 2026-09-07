#!/usr/bin/env node
/**
 * Generates the SVG path modules behind the Geographic Heatmap.
 *
 *   cd tools/geo-build && npm install && npm run build
 *
 * Downloads official boundary data (cached under ./cache), reprojects it and
 * writes ready-to-render path strings into
 * apps/web/src/lib/collective/geo/. The generated files are committed, so this
 * only needs to run when the boundary data itself changes.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mapshaper from 'mapshaper';
import polylabel from 'polylabel';
import { geoNaturalEarth1, geoConicConformal, geoMercator, geoPath } from 'd3-geo';
import {
  SOURCES,
  STATE_NAME_FIXES,
  TELANGANA_DISTRICTS,
  LADAKH_DISTRICTS,
  UNADMINISTERED_DISTRICT,
  STATE_CODES,
  CURRENT_DISTRICT_FILES,
} from './sources.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, 'cache');
const OUT = path.resolve(HERE, '../../apps/web/src/lib/collective/geo');

/**
 * Simplification budget, expressed as the pixel resolution each layer needs to
 * survive. Vertices that would land inside the same pixel at that size are
 * dropped, which keeps detail where it shows and drops it where it cannot.
 */
const SIMPLIFY = {
  india: 'resolution=620x620',
  world: 'resolution=900x900',
  district: 'resolution=620x620',
};

/**
 * Drawing box each map is fitted into before it is cropped to its content.
 * Coordinates are emitted as integers in this space, so the box size sets the
 * precision: 2000 units keeps paths within 0.05% of true position while costing
 * a character less per coordinate than fractional values would.
 */
const FIT = { world: 2000, india: 2000, district: 2000 };
const PAD = 8;

// ---------------------------------------------------------------------------
// Source acquisition
// ---------------------------------------------------------------------------

async function download(url, dest) {
  try {
    await fs.access(dest);
    return dest;
  } catch {
    /* not cached yet */
  }
  process.stdout.write(`  fetching ${path.basename(dest)} ... `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
  console.log(`${(buf.length / 1024).toFixed(0)}KB`);
  return dest;
}

async function ensureSources() {
  await fs.mkdir(CACHE, { recursive: true });
  console.log('Sources');
  const { datameetDistricts, currentDistricts } = SOURCES;
  for (const ext of datameetDistricts.extensions) {
    await download(`${datameetDistricts.base}.${ext}`, path.join(CACHE, `2011_Dist.${ext}`));
  }
  for (const file of Object.values(CURRENT_DISTRICT_FILES)) {
    await download(`${currentDistricts.base}/${file}.geojson`, path.join(CACHE, `cur-${file}.geojson`));
  }
}

// ---------------------------------------------------------------------------
// mapshaper helpers
// ---------------------------------------------------------------------------

/** Runs mapshaper against in-memory GeoJSON and returns the resulting features. */
async function shape(commands, inputs) {
  const out = await mapshaper.applyCommands(commands, inputs);
  const key = Object.keys(out)[0];
  const parsed = JSON.parse(Buffer.from(out[key]).toString('utf8'));
  const features =
    parsed.type === 'FeatureCollection'
      ? parsed.features
      : parsed.type === 'GeometryCollection'
        ? parsed.geometries.map((geometry) => ({ type: 'Feature', properties: {}, geometry }))
        : [{ type: 'Feature', properties: {}, geometry: parsed }];
  return features.filter((f) => f.geometry).map(rewind);
}

/** Reads the Census 2011 shapefile once and relabels it to present-day States/UTs. */
async function loadIndiaDistricts() {
  const shp = path.join(CACHE, '2011_Dist.shp');
  const raw = path.join(CACHE, '2011_Dist.geojson');
  try {
    await fs.access(raw);
  } catch {
    await mapshaper.runCommands(`-i "${shp}" -o "${raw}"`);
  }
  const fc = JSON.parse(await fs.readFile(raw, 'utf8'));

  return fc.features.map((f) => {
    const district = f.properties.DISTRICT;
    let state = STATE_NAME_FIXES[f.properties.ST_NM] ?? f.properties.ST_NM;
    if (state === 'Andhra Pradesh' && TELANGANA_DISTRICTS.has(district)) state = 'Telangana';
    if (state === 'Jammu & Kashmir' && LADAKH_DISTRICTS.has(district)) state = 'Ladakh';
    return {
      type: 'Feature',
      properties: {
        state,
        code: STATE_CODES[state],
        district: district === UNADMINISTERED_DISTRICT ? '' : district,
      },
      geometry: f.geometry,
    };
  });
}

// ---------------------------------------------------------------------------
// Projection + path emission
// ---------------------------------------------------------------------------

const round = (n, digits = 0) => Number(n.toFixed(digits));

/** Signed area of a ring in lon/lat; negative means clockwise. */
function signedArea(ring) {
  let a = 0;
  for (let i = 0, n = ring.length - 1; i < n; i += 1) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return a / 2;
}

/**
 * d3-geo reads rings as spherical polygons: an exterior ring must be clockwise,
 * or the projection treats the rest of the planet as the shape's interior.
 * mapshaper writes RFC 7946 (counter-clockwise), so everything is rewound here
 * before it reaches a projection.
 */
function rewind(feature) {
  const geometry = feature.geometry;
  if (!geometry) return feature;
  const fix = (polygon) =>
    polygon.map((ring, i) => {
      const area = signedArea(ring);
      const wantClockwise = i === 0;
      return (area < 0) === wantClockwise ? ring : [...ring].reverse();
    });
  const coordinates =
    geometry.type === 'MultiPolygon' ? geometry.coordinates.map(fix) : fix(geometry.coordinates);
  return { ...feature, geometry: { ...geometry, coordinates } };
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0, n = ring.length - 1; i < n; i += 1) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(a / 2);
}

/** Pole of inaccessibility of the largest part — a label point that stays inside. */
function labelPoint(feature, projection) {
  const geom = feature.geometry;
  const polygons = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
  let best = null;
  let bestArea = -1;
  for (const polygon of polygons) {
    const projected = polygon
      .map((ring) => ring.map((c) => projection(c)).filter((p) => p && Number.isFinite(p[0])))
      .filter((ring) => ring.length > 3);
    if (!projected.length) continue;
    const area = ringArea(projected[0]);
    if (area > bestArea) {
      bestArea = area;
      best = projected;
    }
  }
  if (!best) return null;
  const [x, y] = polylabel(best, 0.4);
  return [round(x), round(y)];
}

/**
 * Fits a projection to the features, crops the drawing box to what is actually
 * drawn, and emits one rounded SVG path per feature.
 */
function renderMap({ features, makeProjection, fit, pad = PAD }) {
  const collection = { type: 'FeatureCollection', features };
  const projection = makeProjection(collection);
  projection.fitExtent(
    [
      [0, 0],
      [fit, fit],
    ],
    collection
  );

  const measure = geoPath(projection);
  const [[x0, y0], [x1, y1]] = measure.bounds(collection);
  const [tx, ty] = projection.translate();
  projection.translate([tx - x0 + pad, ty - y0 + pad]);

  const render = geoPath(projection);
  if (typeof render.digits === 'function') render.digits(0);

  const width = round(x1 - x0 + pad * 2);
  const height = round(y1 - y0 + pad * 2);

  const shapes = features.map((feature) => {
    const d = render(feature);
    const [[bx0, by0], [bx1, by1]] = render.bounds(feature);
    return {
      ...feature.properties,
      d,
      label: labelPoint(feature, projection),
      bbox: [round(bx0), round(by0), round(bx1), round(by1)],
    };
  });

  return { width, height, shapes, projection, render };
}

/** Lambert conformal conic, the projection Indian survey maps are drawn on. */
function conicFor(collection) {
  let minLat = 90;
  let maxLat = -90;
  let minLon = 180;
  let maxLon = -180;
  const visit = (coords) => {
    if (typeof coords[0] === 'number') {
      minLon = Math.min(minLon, coords[0]);
      maxLon = Math.max(maxLon, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLat = Math.max(maxLat, coords[1]);
      return;
    }
    coords.forEach(visit);
  };
  collection.features.forEach((f) => visit(f.geometry.coordinates));

  const span = maxLat - minLat;
  const midLon = (minLon + maxLon) / 2;
  // Conformal conic degenerates when the standard parallels converge, so very
  // small territories (Delhi, Chandigarh, Lakshadweep) use Mercator instead.
  if (span < 1.5) return geoMercator().center([midLon, (minLat + maxLat) / 2]);
  // The far side of a conformal cone runs off to infinity; d3 draws that cut as
  // a ring which would otherwise dominate fitExtent. Clipping well outside the
  // territory removes it without touching the geometry we care about.
  return geoConicConformal()
    .parallels([minLat + span / 6, maxLat - span / 6])
    .rotate([-midLon, 0])
    .clipAngle(60);
}

// ---------------------------------------------------------------------------
// Map builders
// ---------------------------------------------------------------------------

async function buildIndia(districts) {
  console.log('\nIndia — States & UTs');
  const input = { 'in.json': { type: 'FeatureCollection', features: districts } };

  const stateFeatures = await shape(
    `-i in.json -dissolve state copy-fields=code -simplify visvalingam ${SIMPLIFY.india} keep-shapes ` +
      `-filter-islands min-area=12km2 -clean -o format=geojson states.json`,
    input
  );

  const map = renderMap({ features: stateFeatures, makeProjection: conicFor, fit: FIT.india });
  const shapes = map.shapes.map((s) => ({
    id: `in-${s.code.toLowerCase()}`,
    name: s.state,
    code: s.code,
    d: s.d,
    label: s.label,
    bbox: s.bbox,
  }));
  shapes.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`  ${shapes.length} States & UTs`);
  return { id: 'india', name: 'India', width: map.width, height: map.height, shapes };
}

async function buildWorld(districts) {
  console.log('\nWorld — countries');
  const claim = await shape(
    `-i in.json -dissolve -simplify visvalingam ${SIMPLIFY.world} keep-shapes -clean -o format=geojson claim.json`,
    { 'in.json': { type: 'FeatureCollection', features: districts } }
  );
  const claimFc = { type: 'FeatureCollection', features: claim };

  const atlas = JSON.parse(
    await fs.readFile(path.join(HERE, 'node_modules/world-atlas/countries-50m.json'), 'utf8')
  );
  // The numeric ISO 3166-1 code lives on the TopoJSON geometry rather than in
  // its properties, where mapshaper would drop it. Move it across first.
  for (const geometry of atlas.objects.countries.geometries) {
    geometry.properties = { ...geometry.properties, iso: String(geometry.id ?? '') };
  }

  // India is redrawn from the official claim, so the claimed area is first
  // erased from every country in the atlas (which draws the de-facto lines).
  const countries = await shape(
    `-i world.json -target countries -erase source=claim.json ` +
      `-simplify visvalingam ${SIMPLIFY.world} keep-shapes ` +
      `-filter-islands min-area=400km2 -filter-slivers -clean -o format=geojson target=countries countries.json`,
    { 'world.json': atlas, 'claim.json': claimFc }
  );

  const features = countries
    .filter((f) => f.geometry && f.properties.name && f.properties.name !== 'India')
    .map((f) => ({
      type: 'Feature',
      properties: { name: f.properties.name, code: String(f.properties.iso ?? '') },
      geometry: f.geometry,
    }));

  features.push({
    type: 'Feature',
    properties: { name: 'India', code: '356' },
    geometry: claim[0].geometry,
  });

  const map = renderMap({
    features,
    makeProjection: () => geoNaturalEarth1(),
    fit: FIT.world,
  });

  const shapes = map.shapes
    .map((s) => ({
      id: `w-${(s.code || s.name).toString().toLowerCase().replace(/\W+/g, '-')}`,
      name: s.name,
      code: s.code,
      d: s.d,
      label: s.label,
      bbox: s.bbox,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`  ${shapes.length} countries`);
  return { id: 'world', name: 'World', width: map.width, height: map.height, shapes };
}

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[()']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function buildDistricts(code, name) {
  const file = path.join(CACHE, `cur-${CURRENT_DISTRICT_FILES[code]}.geojson`);
  const fc = JSON.parse(await fs.readFile(file, 'utf8'));
  const input = {
    'st.json': {
      type: 'FeatureCollection',
      features: fc.features.map((f) => ({
        type: 'Feature',
        properties: { district: f.properties.district },
        geometry: f.geometry,
      })),
    },
  };

  const districtFeatures = await shape(
    `-i st.json -dissolve district -simplify visvalingam ${SIMPLIFY.district} keep-shapes ` +
      `-filter-islands min-area=4km2 -clean -o format=geojson d.json`,
    input
  );

  const map = renderMap({ features: districtFeatures, makeProjection: conicFor, fit: FIT.district });
  const shapes = map.shapes
    .map((s) => ({
      id: `${code.toLowerCase()}-${slug(s.district)}`,
      name: s.district,
      code: code,
      d: s.d,
      label: s.label,
      bbox: s.bbox,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    id: `in-${code.toLowerCase()}`,
    name,
    width: map.width,
    height: map.height,
    shapes,
  };
}

// ---------------------------------------------------------------------------
// TypeScript emission
// ---------------------------------------------------------------------------

const HEADER = `// AUTO-GENERATED by tools/geo-build — do not edit by hand.
// Run \`cd tools/geo-build && npm install && npm run build\` to regenerate.
//
// Boundaries: DataMeet India community Census 2011 district maps (MIT), relabelled
// to the present-day States & UTs, and udit-001/india-maps-data for current
// districts. India is drawn with its external boundary as claimed by India.
// World coastlines: Natural Earth 1:50m via world-atlas (public domain).
`;

function serializeMap(map) {
  const shapes = map.shapes
    .map(
      (s) =>
        `  {\n` +
        `    id: ${JSON.stringify(s.id)},\n` +
        `    name: ${JSON.stringify(s.name)},\n` +
        `    code: ${JSON.stringify(s.code)},\n` +
        `    label: ${JSON.stringify(s.label)},\n` +
        `    bbox: ${JSON.stringify(s.bbox)},\n` +
        `    d: ${JSON.stringify(s.d)},\n` +
        `  },`
    )
    .join('\n');
  return (
    `{\n` +
    `  id: ${JSON.stringify(map.id)},\n` +
    `  name: ${JSON.stringify(map.name)},\n` +
    `  width: ${map.width},\n` +
    `  height: ${map.height},\n` +
    `  shapes: [\n${shapes}\n  ],\n` +
    `}`
  );
}

async function writeModule(file, body) {
  const dest = path.join(OUT, file);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, body);
  const kb = (Buffer.byteLength(body) / 1024).toFixed(0);
  console.log(`  wrote ${file.padEnd(30)} ${kb.padStart(5)}KB`);
  return Buffer.byteLength(body);
}

// ---------------------------------------------------------------------------

async function main() {
  await ensureSources();
  const districts = await loadIndiaDistricts();

  const india = await buildIndia(districts);
  const world = await buildWorld(districts);

  console.log('\nWriting modules');
  let total = 0;
  total += await writeModule(
    'world.ts',
    `${HEADER}\nimport type { GeoMap } from './types';\n\nexport const WORLD_MAP: GeoMap = ${serializeMap(world)};\n`
  );
  total += await writeModule(
    'india.ts',
    `${HEADER}\nimport type { GeoMap } from './types';\n\nexport const INDIA_MAP: GeoMap = ${serializeMap(india)};\n`
  );

  console.log('\nIndia — districts');
  const built = [];
  for (const s of india.shapes) {
    if (!CURRENT_DISTRICT_FILES[s.code]) continue;
    const map = await buildDistricts(s.code, s.name);
    const key = s.code.toLowerCase();
    total += await writeModule(
      `districts/${key}.ts`,
      `${HEADER}\nimport type { GeoMap } from './../types';\n\nconst map: GeoMap = ${serializeMap(map)};\n\nexport default map;\n`
    );
    built.push({ id: s.id, key, count: map.shapes.length });
  }

  const registry =
    `${HEADER}\nimport type { GeoMap } from '../types';\n\n` +
    `/**\n * District maps are code-split: a State's districts are only downloaded when a\n` +
    ` * viewer actually drills into that State.\n */\n` +
    `export const DISTRICT_MAP_LOADERS: Record<string, () => Promise<GeoMap>> = {\n` +
    built
      .map((b) => `  ${JSON.stringify(b.id)}: () => import('./${b.key}').then((m) => m.default),`)
      .join('\n') +
    `\n};\n`;
  total += await writeModule('districts/index.ts', registry);

  console.log(`\nDone — ${(total / 1024).toFixed(0)}KB of generated map data.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
