'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Poll, GeoScope, TerritoryMetric } from '@/lib/collective/types';
import {
  getChoicePalettes,
  getScopeTerritories,
  getDrillableStates,
} from '@/lib/collective/analytics';
import {
  INDIA_MAP,
  WORLD_MAP,
  loadDistrictMap,
  hasDistrictMap,
  type GeoMap,
  type GeoShape,
} from '@/lib/collective/geo';

interface GeographicHeatmapProps {
  poll: Poll;
  initialScope?: GeoScope;
  compact?: boolean;
}

/** Ground colour a choice is mixed into; matches `surface-container-low`. */
const MAP_BASE = '#f2f3ff';
/** Fill for territory with no reportable data. */
const NO_DATA_FILL = '#e7e9f3';
const NO_DATA_INK = '#c3c9da';
/** Border for a no-data territory: white would disappear against its hatch. */
const NO_DATA_BORDER = '#98a0ba';
/** Shadowed edge of the plate the map sits on. */
const SLAB_INK = '#8b91b2';

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Blends `to` into `from` by `amount` (0..1) and returns an opaque colour. */
function mixHex(from: string, to: string, amount: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const channel = (i: number) => Math.round(a[i] + (b[i] - a[i]) * amount);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

/** Lightens a top face, so a raised block reads as catching the light. */
function litShade(fill: string): string {
  const rgb = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(fill);
  if (!rgb) return fill;
  const lift = (v: string) => Math.round(Number(v) + (255 - Number(v)) * 0.16);
  return `rgb(${lift(rgb[1])}, ${lift(rgb[2])}, ${lift(rgb[3])})`;
}

/**
 * Darkens a top face into the colour of its own side wall, so each block reads
 * as one solid piece rather than sitting on an unrelated grey shadow.
 */
function wallShade(fill: string, amount = 0.68): string {
  const rgb = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(fill);
  if (!rgb) return SLAB_INK;
  const shade = (v: string) => Math.round(Number(v) * amount);
  return `rgb(${shade(rgb[1])}, ${shade(rgb[2])}, ${shade(rgb[3])})`;
}

/**
 * Typical vertical size of a shape's parts, ignoring a few outliers.
 *
 * A territory may be one landmass or a scatter of islands. Extruding an island
 * chain by the full slab depth spaces the copies further apart than the islands
 * are tall, which combs them into dashes instead of a wall — so each shape's
 * wall is capped by the size of the parts it is actually made of.
 */
function typicalPartHeight(d: string): number {
  const heights = d
    .split('M')
    .filter(Boolean)
    .map((part) => {
      let min = Infinity;
      let max = -Infinity;
      for (const match of part.matchAll(/,(-?\d+(?:\.\d+)?)/g)) {
        const y = Number(match[1]);
        if (y < min) min = y;
        if (y > max) max = y;
      }
      return max - min;
    })
    .filter((h) => Number.isFinite(h))
    .sort((a, b) => a - b);

  if (heights.length === 0) return 0;
  return heights[Math.min(heights.length - 1, Math.floor(heights.length * 0.75))];
}

export const GeographicHeatmap: React.FC<GeographicHeatmapProps> = ({
  poll,
  initialScope = 'india',
  compact = false,
}) => {
  const [scope, setScope] = useState<GeoScope>(initialScope);
  const [requestedStateId, setStateId] = useState<string>('in-ka');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [districtMap, setDistrictMap] = useState<GeoMap | null>(null);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const palettes = useMemo(() => getChoicePalettes(poll.options), [poll.options]);
  const drillableStates = useMemo(() => getDrillableStates(poll), [poll]);

  // A poll with few responses may not report the default State at all; fall
  // back to one it does report so the State tab is never empty.
  const stateId =
    drillableStates.some((s) => s.id === requestedStateId) || drillableStates.length === 0
      ? requestedStateId
      : drillableStates[0].id;

  // District geometry is code-split, so drilling into a State fetches its map.
  useEffect(() => {
    if (scope !== 'state') return;
    let cancelled = false;
    setLoadingDistricts(true);
    loadDistrictMap(stateId)
      .then((map) => {
        if (!cancelled) setDistrictMap(map);
      })
      .finally(() => {
        if (!cancelled) setLoadingDistricts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, stateId]);

  const baseMap: GeoMap | null =
    scope === 'world' ? WORLD_MAP : scope === 'india' ? INDIA_MAP : districtMap;

  const territories = useMemo(
    () => getScopeTerritories(scope, poll, stateId, districtMap?.shapes ?? []),
    [scope, poll, stateId, districtMap]
  );

  /** Only territories in here have data; everything else renders inert. */
  const metrics = useMemo(() => {
    const byId = new Map<string, TerritoryMetric>();
    for (const t of territories) byId.set(t.id, t);
    return byId;
  }, [territories]);

  // A pinned or hovered territory that vanishes on a scope change must clear.
  useEffect(() => {
    setActiveId(null);
    setPinnedId(null);
  }, [scope, stateId, poll.id]);

  const readoutId = activeId ?? pinnedId;
  const readout = readoutId ? metrics.get(readoutId) : undefined;

  const changeScope = useCallback((next: GeoScope) => {
    setScope(next);
    setActiveId(null);
    setPinnedId(null);
  }, []);

  const drillInto = useCallback((id: string) => {
    setStateId(id);
    setScope('state');
    setActiveId(null);
    setPinnedId(null);
  }, []);

  const canDrill = (id: string) => scope === 'india' && hasDistrictMap(id);

  const handleShapeActivate = (shape: GeoShape) => {
    if (scope === 'india' && canDrill(shape.id)) {
      drillInto(shape.id);
      return;
    }
    if (scope === 'world' && shape.id === 'w-356') {
      changeScope('india');
      return;
    }
    setPinnedId((current) => (current === shape.id ? null : shape.id));
  };

  /** Opaque fill for a territory, or the inert fill when it has no data. */
  const fillFor = (metric: TerritoryMetric | undefined) => {
    if (!metric) return NO_DATA_FILL;

    if (selectedOptionId) {
      const palette =
        palettes.find((p) => p.optionId === selectedOptionId) ?? palettes[0];
      const share = metric.percentages[selectedOptionId] ?? 0;
      return mixHex(MAP_BASE, palette.color, Math.min(1, Math.max(0.08, share / 100)));
    }

    const palette =
      palettes.find((p) => p.optionId === metric.leadingOptionId) ?? palettes[0];
    return mixHex(MAP_BASE, palette.color, 0.28 + metric.intensity * 0.72);
  };

  const activeStateName =
    drillableStates.find((s) => s.id === stateId)?.name ??
    INDIA_MAP.shapes.find((s) => s.id === stateId)?.name ??
    'State';

  const scopeNoun =
    scope === 'world' ? 'countries' : scope === 'india' ? 'States & UTs' : 'districts';
  const totalShapes = baseMap?.shapes.length ?? 0;

  return (
    <div className="geo-heatmap w-full select-none">
      {/* Scope selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="inline-flex p-0.5 bg-surface-container-high rounded-full text-xs font-label-bold border border-outline-variant/20">
          {(['world', 'india', 'state'] as GeoScope[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => changeScope(value)}
              aria-pressed={scope === value}
              className={`px-3 py-1 rounded-full transition-all ${
                scope === value
                  ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {value === 'world' ? 'World' : value === 'india' ? 'India' : activeStateName}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {scope === 'state' ? (
            <label className="flex items-center gap-1">
              <span className="sr-only">State or Union Territory</span>
              <select
                value={stateId}
                onChange={(event) => drillInto(event.target.value)}
                className="text-xs py-1 px-2.5 bg-surface-container-lowest border border-primary/30 rounded-full font-label-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
              >
                {drillableStates.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSelectedOptionId(null)}
                aria-pressed={selectedOptionId === null}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                  selectedOptionId === null
                    ? 'bg-surface-container-lowest text-on-surface border-primary font-bold shadow-xs'
                    : 'bg-transparent text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
                }`}
              >
                Leader
              </button>

              {palettes.map((palette) => (
                <button
                  key={palette.optionId}
                  type="button"
                  onClick={() => setSelectedOptionId(palette.optionId)}
                  aria-pressed={selectedOptionId === palette.optionId}
                  className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                    selectedOptionId === palette.optionId
                      ? 'bg-surface-container-lowest border-primary font-bold shadow-xs'
                      : 'bg-transparent text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: palette.color }}
                  />
                  <span>{palette.label}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Map beside its readout — the readout never sits over the map */}
      <div className="geo-heatmap-layout flex flex-col gap-2.5">
        <div
          className={`geo-heatmap-canvas relative flex-1 min-w-0 rounded-xl bg-surface-container-low/80 border border-outline-variant/20 p-1.5 flex items-center justify-center ${
            compact ? 'is-compact' : ''
          }`}
          onMouseLeave={() => setActiveId(null)}
        >
          {loadingDistricts && !districtMap ? (
            <div className="text-[11px] text-on-surface-variant animate-pulse">
              Loading {activeStateName} districts…
            </div>
          ) : !baseMap ? (
            <div className="text-[11px] text-on-surface-variant">Map unavailable</div>
          ) : (
            <MapSurface
              map={baseMap}
              metrics={metrics}
              activeId={readoutId}
              fillFor={fillFor}
              canDrill={canDrill}
              onHover={setActiveId}
              onActivate={handleShapeActivate}
            />
          )}

          {scope === 'state' && (
            <button
              type="button"
              onClick={() => changeScope('india')}
              className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-label-bold text-primary bg-surface-container-lowest/90 backdrop-blur-sm border border-primary/20 rounded-full px-2 py-0.5 shadow-xs hover:bg-surface-container"
            >
              ← All India
            </button>
          )}
        </div>

        <TerritoryReadout
          poll={poll}
          palettes={palettes}
          readout={readout}
          reporting={territories.length}
          total={totalShapes}
          scopeNoun={scopeNoun}
          drillable={readout ? canDrill(readout.id) : false}
          pinned={pinnedId !== null && pinnedId === readoutId}
        />
      </div>

      {/* Legend */}
      <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-on-surface-variant font-medium">
        <span className="whitespace-nowrap">Even split</span>
        <div
          className="flex-grow h-1.5 rounded-full"
          style={{
            background: `linear-gradient(to right, ${mixHex(
              MAP_BASE,
              palettes[0].color,
              0.28
            )}, ${palettes[0].color})`,
          }}
        />
        <span className="whitespace-nowrap">Landslide</span>
        <span className="flex items-center gap-1 whitespace-nowrap pl-1 border-l border-outline-variant/30">
          <span
            className="w-2.5 h-2.5 rounded-sm border"
            style={{ backgroundColor: NO_DATA_FILL, borderColor: NO_DATA_INK }}
          />
          No data
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

interface MapSurfaceProps {
  map: GeoMap;
  metrics: Map<string, TerritoryMetric>;
  activeId: string | null;
  fillFor: (metric: TerritoryMetric | undefined) => string;
  canDrill: (id: string) => boolean;
  onHover: (id: string | null) => void;
  onActivate: (shape: GeoShape) => void;
}

/** Everything needed to draw one territory's top face. */
type FaceProps = React.SVGProps<SVGPathElement>;

/** Thickness of the slab the map sits on, as a fraction of its longest side. */
const SLAB_DEPTH = 0.034;
/** How far the active territory rises out of the slab, relative to that depth. */
const BULGE = 1.5;
/** Bands used to paint a side wall; they overlap into one solid face. */
const WALL_BANDS = 8;
/** A shape's wall may not exceed this share of the parts it is made of. */
const WALL_CAP = 0.55;

/**
 * Draws the map as a tilted slab: the whole plate is rotated away from the
 * viewer in CSS, and thickness is painted inside the SVG by repeating each
 * outline below its top face.
 *
 * Territories without data are painted but made inert — they take no pointer
 * events, no focus and no hover, because there is nothing to show for them.
 */
const MapSurface: React.FC<MapSurfaceProps> = ({
  map,
  metrics,
  activeId,
  fillFor,
  canDrill,
  onHover,
  onActivate,
}) => {
  // useId keeps these references identical on the server and the client; their
  // colons are not valid inside a `url(#...)` reference.
  const uid = useId().replace(/:/g, '');
  const patternId = `no-data-${uid}`;

  const span = Math.max(map.width, map.height);
  const hatch = span / 42;
  const depth = span * SLAB_DEPTH;
  const bulge = depth * BULGE;

  // The raised territory needs headroom above the plate, the slab needs room
  // below it, so the drawing box is grown at both ends.
  const viewBox = `0 ${-bulge} ${map.width} ${map.height + depth + bulge}`;

  // Wall geometry only changes with the map or the colouring, not on hover.
  const walls = useMemo(
    () =>
      map.shapes
        .map((shape) => {
          const metric = metrics.get(shape.id);
          const part = typicalPartHeight(shape.d);
          return {
            shape,
            wallDepth: Math.max(1, Math.min(depth, part * WALL_CAP)),
            colour: metric ? wallShade(fillFor(metric)) : SLAB_INK,
            south: shape.bbox[3],
          };
        })
        .sort((a, b) => a.south - b.south),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [map, metrics, depth]
  );

  const activeShape = activeId ? map.shapes.find((s) => s.id === activeId) : undefined;
  const restShapes = activeShape
    ? map.shapes.filter((s) => s.id !== activeShape.id)
    : map.shapes;

  const shapeProps = (shape: GeoShape, raised: boolean): FaceProps => {
    const metric = metrics.get(shape.id);
    const interactive = Boolean(metric);
    const drillable = interactive && canDrill(shape.id);
    const face = metric ? fillFor(metric) : `url(#${patternId})`;

    return {
      d: shape.d,
      fill: raised ? litShade(face) : face,
      // A border only reads if it contrasts with what it encloses: white over a
      // filled territory, grey over the pale hatch of one with no data.
      stroke: metric ? '#ffffff' : NO_DATA_BORDER,
      strokeWidth: raised ? 1.7 : 0.9,
      strokeLinejoin: 'round' as const,
      vectorEffect: 'non-scaling-stroke' as const,
      pointerEvents: (interactive ? 'auto' : 'none') as 'auto' | 'none',
      tabIndex: interactive ? 0 : undefined,
      role: interactive ? 'button' : undefined,
      'aria-label': interactive
        ? `${shape.name}, ${metric!.votes.toLocaleString()} responses${
            drillable ? ', open districts' : ''
          }`
        : undefined,
      className: `transition-[fill,stroke] duration-150 focus:outline-none ${
        interactive ? (drillable ? 'cursor-pointer' : 'cursor-default') : ''
      }`,
      onMouseEnter: interactive ? () => onHover(shape.id) : undefined,
      onFocus: interactive ? () => onHover(shape.id) : undefined,
      onBlur: interactive ? () => onHover(null) : undefined,
      onClick: interactive ? () => onActivate(shape) : undefined,
      onKeyDown: interactive
        ? (event: React.KeyboardEvent<SVGPathElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onActivate(shape);
            }
          }
        : undefined,
    };
  };

  return (
    <div className="geo-heatmap-stage w-full h-full">
      <div className="geo-heatmap-tilt w-full h-full">
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full overflow-visible"
          role="img"
          aria-label={`${map.name} heatmap`}
        >
          <defs>
            {/* Sized against the map's own coordinate space so the hatch stays
                legible whether the map is drawn at 200px or 900px. */}
            <pattern
              id={patternId}
              width={hatch}
              height={hatch}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width={hatch} height={hatch} fill={NO_DATA_FILL} />
              <line x1="0" y1="0" x2="0" y2={hatch} stroke={NO_DATA_INK} strokeWidth={hatch / 4} />
            </pattern>

          </defs>

          {/* Side of the plate. Each territory carries its own wall, shaded
              from its own fill and capped to the size of the parts it is made
              of; southern walls are painted last so they sit nearer. */}
          <g aria-hidden="true">
            {walls.map(({ shape, wallDepth, colour }) => (
              <WallBands
                key={shape.id}
                d={shape.d}
                from={0}
                depth={wallDepth}
                colour={colour}
              />
            ))}
          </g>

          {restShapes.map((shape) => (
            <path key={shape.id} {...shapeProps(shape, false)} />
          ))}

          {/* The active territory rises out of the plate, carrying its own wall
              in a shaded version of its fill. Drawn last so it sits over its
              neighbours the way a raised block would. */}
          {activeShape && (
            <ExtrudedShape
              shape={activeShape}
              lift={bulge}
              depth={
                bulge + Math.min(depth, typicalPartHeight(activeShape.d) * WALL_CAP)
              }
              wall={wallShade(fillFor(metrics.get(activeShape.id)))}
              face={shapeProps(activeShape, true)}
            />
          )}
        </svg>
      </div>
    </div>
  );
};

/**
 * One side wall, painted as overlapping copies of the outline stepping down
 * from `from` to `from + depth`. Each band is stroked by exactly one step so
 * consecutive bands close into a solid face without widening the silhouette
 * more than half a step.
 */
const WallBands: React.FC<{
  d: string;
  from: number;
  depth: number;
  colour: string;
  bands?: number;
}> = ({ d, from, depth, colour, bands = WALL_BANDS }) => {
  const step = depth / bands;
  return (
    <g fill={colour} stroke={colour} strokeWidth={step} strokeLinejoin="round">
      {Array.from({ length: bands }, (_, band) => (
        <path key={band} d={d} transform={`translate(0 ${from + step * (band + 1)})`} />
      ))}
    </g>
  );
};

/** One territory lifted off the plate, with the side wall the lift exposes. */
const ExtrudedShape: React.FC<{
  shape: GeoShape;
  lift: number;
  depth: number;
  wall: string;
  face: FaceProps;
}> = ({ shape, lift, depth, wall, face }) => (
  <g className="geo-heatmap-raised">
    <WallBands d={shape.d} from={-lift} depth={depth} colour={wall} bands={WALL_BANDS + 4} />
    <g transform={`translate(0 ${-lift})`}>
      <path {...face} />
    </g>
  </g>
);

// ---------------------------------------------------------------------------

interface TerritoryReadoutProps {
  poll: Poll;
  palettes: ReturnType<typeof getChoicePalettes>;
  readout: TerritoryMetric | undefined;
  reporting: number;
  total: number;
  scopeNoun: string;
  drillable: boolean;
  pinned: boolean;
}

/** The panel beside the map. Shows coverage until a territory is picked. */
const TerritoryReadout: React.FC<TerritoryReadoutProps> = ({
  poll,
  palettes,
  readout,
  reporting,
  total,
  scopeNoun,
  drillable,
  pinned,
}) => (
  <aside className="geo-heatmap-readout bg-surface-container-lowest border border-outline-variant/25 rounded-xl p-2.5 text-xs shadow-xs">
    {readout ? (
      <>
        <div className="flex items-start justify-between gap-2 pb-1.5 mb-1.5 border-b border-outline-variant/20">
          <span className="font-label-bold text-xs text-on-surface leading-tight">
            {readout.name}
          </span>
          {pinned && (
            <span className="text-[9px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5 whitespace-nowrap">
              Pinned
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          {poll.options.map((option) => {
            const pct = readout.percentages[option.id] ?? 0;
            const palette = palettes.find((p) => p.optionId === option.id);
            const leads = option.id === readout.leadingOptionId;
            return (
              <div key={option.id}>
                <div className="flex justify-between items-baseline gap-2 text-[10px]">
                  <span className="truncate text-on-surface-variant">{option.label}</span>
                  <strong
                    className="tabular-nums"
                    style={{ color: leads ? palette?.textColor : undefined }}
                  >
                    {pct}%
                  </strong>
                </div>
                <div className="h-1 rounded-full bg-surface-container-high overflow-hidden mt-0.5">
                  <div
                    className="h-full rounded-full transition-[width] duration-200"
                    style={{ width: `${pct}%`, backgroundColor: palette?.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 pt-1.5 border-t border-outline-variant/20 flex items-center justify-between text-[9.5px] text-on-surface-variant">
          <span>Responses</span>
          <span className="font-semibold text-on-surface tabular-nums">
            {readout.votes.toLocaleString()}
          </span>
        </div>

        {drillable && (
          <p className="mt-1.5 text-[9.5px] font-bold text-primary text-center bg-primary/5 rounded py-0.5">
            Click to open districts →
          </p>
        )}
      </>
    ) : (
      <>
        <p className="font-label-bold text-xs text-on-surface mb-1.5 pb-1.5 border-b border-outline-variant/20">
          Consensus by geography
        </p>
        <p className="text-[10px] text-on-surface-variant leading-relaxed">
          Shaded areas report enough responses to break out. Hover or tab to one for its
          split; hatched areas have too few responses to report.
        </p>
        <div className="mt-2 pt-1.5 border-t border-outline-variant/20 flex items-center justify-between text-[9.5px] text-on-surface-variant">
          <span>Reporting</span>
          <span className="font-semibold text-on-surface tabular-nums">
            {reporting} of {total} {scopeNoun}
          </span>
        </div>
      </>
    )}
  </aside>
);
