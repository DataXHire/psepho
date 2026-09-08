# geo-build

Generates the cartographic boundary map modules rendered by the Geographic Heatmap component:
`apps/web/src/lib/collective/geo/`.

The compiled TypeScript output is committed directly into source control, so nothing in this directory needs to run during normal development, installation, or production builds.

Run this tool only when boundary data, source projections, or simplification budgets change:

```bash
# From workspace root:
pnpm --filter psepho-geo-build run build

# Or directly from this directory:
cd tools/geo-build
pnpm install
pnpm run build
```

## What it does

1. **Downloads** source boundaries into `./cache` (skipped automatically when already cached).
2. **Relabels** Census 2011 districts to present-day Indian States & Union Territories:
   - Telangana split out of Andhra Pradesh (2014)
   - Ladakh split out of Jammu & Kashmir (2019)
   - Dadra & Nagar Haveli merged with Daman & Diu (2020)
3. **Dissolves** districts into State boundaries and simplifies each topological layer to the exact pixel resolution required by the heatmap.
4. **Projects** the cartographic coordinates:
   - **Lambert Conformal Conic (LCC)** for India and for each State (the official projection standard used by Indian survey cartography).
   - **Natural Earth** projection for the global world view.
   - Writes rounded SVG paths and centroid label coordinates for each territory.

District maps are emitted as individual files per State to enable Next.js automatic code-splitting; `districts/index.ts` serves as the dynamic-import registry.

## Boundaries & Integrity

India is drawn with its external boundary as claimed by the Republic of India: the complete extent of Jammu & Kashmir and Ladakh (including Gilgit-Baltistan and Aksai Chin) and Arunachal Pradesh. The world map is constructed by clipping that claimed territory from Natural Earth (which renders de-facto borders) and merging India from the official Survey outline, guaranteeing no overlapping geometry.

Census 2011 records the areas India claims but does not currently administer as a single unnamed district. Because it cannot be accurately partitioned along the Gilgit-Baltistan / Line of Control demarcation from this source data, it remains associated with Jammu & Kashmir. It carries no poll tally data and always renders in the inert "no data" style.

## Data Sources & Licenses

| Data Layer | Source | License |
| :--- | :--- | :--- |
| **India District Boundaries** | [datameet/maps](https://github.com/datameet/maps) Census 2011 | MIT |
| **Present-Day Districts** | [udit-001/india-maps-data](https://github.com/udit-001/india-maps-data) | Curated Public Data |
| **World Coastlines** | Natural Earth 1:50m via [world-atlas](https://github.com/topojson/world-atlas) | Public Domain |
