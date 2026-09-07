# geo-build

Generates the map modules the Geographic Heatmap renders:
`apps/web/src/lib/collective/geo/`.

The output is committed, so nothing here runs during a normal build or install.
Run it only when the boundary data or the simplification budget changes:

```bash
cd tools/geo-build
npm install
npm run build
```

## What it does

1. **Downloads** the source boundaries into `./cache` (skipped when cached).
2. **Relabels** Census 2011 districts to the present-day States & UTs — Telangana
   split out of Andhra Pradesh (2014), Ladakh out of Jammu & Kashmir (2019),
   Dadra & Nagar Haveli merged with Daman & Diu (2020).
3. **Dissolves** districts into States, and simplifies each layer to the pixel
   resolution it is actually drawn at.
4. **Projects** the result — Lambert conformal conic for India and for each
   State (the projection Indian survey maps use), Natural Earth for the world —
   and writes rounded SVG paths plus a label point per shape.

District maps are written one file per State so Next.js can code-split them;
`districts/index.ts` holds the dynamic-import registry.

## Boundaries

India is drawn with its external boundary as claimed by India: the complete
Jammu & Kashmir and Ladakh extent, including Gilgit-Baltistan and Aksai Chin,
and Arunachal Pradesh. The world map is built by erasing that claimed area from
every country in Natural Earth (which draws the de-facto lines) and then adding
India back from the official outline, so no country overlaps it.

Census 2011 carries the areas India claims but does not administer as one
unnamed district. It cannot be split along the Gilgit-Baltistan / PoK line from
this data, so it stays with Jammu & Kashmir. It never carries poll data and
always renders in the inert "no data" style.

## Sources

| Data | Source | Licence |
| --- | --- | --- |
| India district boundaries | [datameet/maps](https://github.com/datameet/maps) Census 2011 | MIT |
| Present-day districts | [udit-001/india-maps-data](https://github.com/udit-001/india-maps-data) | Curated from public sources |
| World coastlines | Natural Earth 1:50m via [world-atlas](https://github.com/topojson/world-atlas) | Public domain |
