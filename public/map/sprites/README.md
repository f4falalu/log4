# Map Sprites

This directory contains MapLibre GL sprite sheets auto-generated from `src/map/icons/iconMap.ts`.

## Files

- `map-icons.json` - Sprite metadata (icon positions and dimensions)
- `map-icons.png` - 1x sprite sheet (placeholder)
- `map-icons@2x.png` - 2x sprite sheet for high-DPI displays (placeholder)

## Sprite Naming Convention

All sprites follow the pattern: `{domain}.{entity}.{variant}`

### Domains

- `entity.*` - Primary entity markers (facility, warehouse, vehicle, etc.)
- `badge.*` - Status/alert badges (delayed, offline, etc.)
- `control.*` - Map control buttons (locate, layers, etc.)
- `route.*` - Routing icons
- `planning.*` - Planning mode tools
- `operational.*` - Operational mode actions
- `forensic.*` - Forensic mode controls
- `geometric.*` - Simple shapes for minimal representation

### Examples

```
entity.facility
entity.warehouse
entity.vehicle
badge.alert
badge.delayed
control.locate
control.layers
```

## Generating Sprites

**Note:** Sprite generation requires the `canvas` package which is not included in the main dependencies.

To generate production sprites:

1. Install canvas dependency:
   ```bash
   npm install --save-dev canvas @types/node
   ```

2. Run the generation script:
   ```bash
   npm run generate:sprites
   ```

3. The script will:
   - Read all icons from `src/map/icons/iconMap.ts`
   - Render each icon to SVG
   - Generate sprite sheets (PNG) with all icons
   - Generate metadata (JSON) with icon positions
   - Output to this directory

## Current Status

Currently using **placeholder sprites**. The sprite generation script (`scripts/generate-map-sprites.ts`) is ready but requires the `canvas` dependency to run.

For development, the MapLibre map can use React components directly via DOM markers. Sprites are only required for:

- High-density marker rendering (100+ markers)
- MapLibre symbol layers
- Production performance optimization

## Integration with MapLibre

Use sprites in MapLibre layers:

```typescript
map.addLayer({
  id: 'facilities-symbol',
  type: 'symbol',
  source: 'facilities',
  layout: {
    'icon-image': 'entity.facility', // References sprite name
    'icon-size': 0.75,
    'icon-allow-overlap': true,
  },
  paint: {
    'icon-color': ['get', 'markerColor'], // State comes from data, not icon
  },
});
```

## Governance

Icons in sprites MUST match `iconMap.ts` exactly. Any changes to icons require:

1. Update `iconMap.ts`
2. Re-run `npm run generate:sprites`
3. Commit both iconMap.ts and generated sprites

Never manually edit sprite files.
