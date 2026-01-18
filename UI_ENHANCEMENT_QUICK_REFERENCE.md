# BIKO Map UI Enhancement - Quick Reference Guide

**For Developers** | Last Updated: January 10, 2026

---

## New Components

### 1. ControlSurface
**File:** `src/components/map/ui/ControlSurface.tsx`

Base container for all map controls. Ensures guaranteed contrast on any basemap.

**Usage:**
```tsx
import { ControlSurface } from '@/components/map/ui/ControlSurface';

<ControlSurface variant="navigation" position="top-left">
  <Button>Your Control</Button>
</ControlSurface>
```

**Variants:**
- `navigation` - For zoom, compass, locate controls
- `tools` - For drawing, measuring tools
- `playback` - For timeline/playback controls
- `kpi` - For KPI displays

**Positions:**
- `top-left`, `top-right`, `top-center`
- `bottom-left`, `bottom-right`, `bottom-center`

---

### 2. ModeIndicator
**File:** `src/components/map/ui/ModeIndicator.tsx`

Visual indicator showing current map mode (operational/planning/forensic).

**Usage:**
```tsx
import { ModeIndicator } from '@/components/map/ui/ModeIndicator';

<ModeIndicator mode="operational" />
<ModeIndicator mode="planning" />
<ModeIndicator mode="forensic" />
```

**Color Coding:**
- Operational: Green (live/active)
- Planning: Blue (drafting/configuration)
- Forensic: Purple (historical/analysis)

---

### 3. EmptyState
**File:** `src/components/map/ui/EmptyState.tsx`

Empty state component for missing/unavailable data.

**Usage:**
```tsx
import { EmptyState } from '@/components/map/ui/EmptyState';
import { Calendar } from 'lucide-react';

<EmptyState
  icon={Calendar}
  title="No Historical Data"
  description="Select a time range to view historical vehicle activity"
  action={{
    label: "Select Time Range",
    onClick: () => setTimePickerOpen(true)
  }}
/>
```

---

## Updated Components

### KPIRibbon - Loading State
**File:** `src/components/map/ui/KPIRibbon.tsx`

Now supports loading skeleton:

```tsx
<KPIRibbon
  activeVehicles={stats.activeVehicles}
  inProgress={stats.inProgress}
  completed={stats.completed}
  isLoading={isStatsLoading}  // ← NEW
/>
```

---

### PlaybackControls - Timestamp Guards
**File:** `src/components/map/PlaybackControls.tsx`

Now validates timestamps and prevents "Invalid time value" errors:

```tsx
// Automatically handles invalid timestamps
<PlaybackControls
  startTimestamp={start}      // Validated internally
  endTimestamp={end}          // Validated internally
  currentTimestamp={current}  // Validated internally
  {...otherProps}
/>
```

**Fallback Behavior:**
- Invalid timestamp → Shows `--:--:--`
- Invalid date → Shows `Invalid Date`
- Invalid range → Progress returns 0

---

### TimelineSlider - Timestamp Guards
**File:** `src/components/map/TimelineSlider.tsx`

Now validates timestamps and prevents NaN errors:

```tsx
<TimelineSlider
  startTimestamp={start}      // Validated internally
  endTimestamp={end}          // Validated internally
  currentTimestamp={current}  // Validated internally
  onTimestampChange={handleChange}
/>
```

**Fallback Behavior:**
- Invalid timestamp → Returns `--:--`
- Invalid range → Slider value returns 0
- Invalid conversion → Fallback to current time

---

## Design System Tokens

### ICON_STATE
**File:** `src/lib/mapDesignSystem.ts`

Use these for consistent icon states:

```tsx
import { ICON_STATE } from '@/lib/mapDesignSystem';

<Button className={ICON_STATE.default}>Normal</Button>
<Button className={ICON_STATE.active}>Active</Button>
<Button className={ICON_STATE.disabled}>Disabled</Button>
<Button className={ICON_STATE.alert}>Alert</Button>
```

---

### CONTROL_SURFACE
**File:** `src/lib/mapDesignSystem.ts`

Pre-defined control surface styles:

```tsx
import { CONTROL_SURFACE } from '@/lib/mapDesignSystem';

// Use in custom components
<div className={cn(CONTROL_SURFACE.navigation, CONTROL_SURFACE.padding)}>
  {children}
</div>
```

**Available Tokens:**
- `CONTROL_SURFACE.solid` - Opaque background
- `CONTROL_SURFACE.glass` - Translucent with blur
- `CONTROL_SURFACE.navigation` - Navigation controls
- `CONTROL_SURFACE.tools` - Tool controls
- `CONTROL_SURFACE.playback` - Playback controls
- `CONTROL_SURFACE.kpi` - KPI displays

---

### CONTROL_POSITIONS
**File:** `src/lib/mapDesignSystem.ts`

Standardized positioning:

```tsx
import { CONTROL_POSITIONS } from '@/lib/mapDesignSystem';

<div className={cn('absolute', CONTROL_POSITIONS['top-left'])}>
  {children}
</div>
```

---

## Theme Integration

### useThemeAwareBasemap Hook
**File:** `src/hooks/useThemeAwareBasemap.ts`

Automatic basemap theme synchronization:

```tsx
import { useThemeAwareBasemap } from '@/hooks/useThemeAwareBasemap';

function MyMapComponent() {
  const [tileProvider, setTileProvider] = useThemeAwareBasemap('fleetops');

  // tileProvider automatically switches between 'cartoLight' and 'cartoDark'
  // based on current theme
}
```

---

### getMapLibreStyle Function
**File:** `src/lib/mapConfig.ts`

Get theme-appropriate MapLibre style:

```tsx
import { getMapLibreStyle } from '@/lib/mapConfig';
import { useTheme } from 'next-themes';

function MyMapLibreComponent() {
  const { theme } = useTheme();
  const styleUrl = getMapLibreStyle(theme);

  // styleUrl automatically selects light or dark basemap
}
```

---

## Mode-Specific Control Visibility

### Operational Mode
```tsx
// src/pages/fleetops/map/operational/page.tsx

✅ KPIRibbon (live stats)
✅ MapControls
✅ RepresentationToggle
✅ SearchPanel
❌ PlaybackControls
❌ TimelineSlider
❌ Planning tools
```

### Planning Mode
```tsx
// src/pages/fleetops/map/planning/page.tsx

✅ KPIRibbon (draft stats)
✅ MapControls
✅ RepresentationToggle
✅ Planning tools (measure, draw, zone editor)
❌ PlaybackControls
❌ TimelineSlider
❌ Live exception handling
```

### Forensic Mode
```tsx
// src/pages/fleetops/map/forensics/page.tsx

✅ KPIRibbon (historical stats)
✅ MapControls
✅ PlaybackControls (MANDATORY)
✅ TimelineSlider (MANDATORY)
❌ RepresentationToggle (force minimal)
❌ Editing tools
❌ Search panel
```

---

## Common Patterns

### Adding a New Map Control

1. **Wrap in ControlSurface:**
```tsx
import { ControlSurface } from '@/components/map/ui/ControlSurface';
import { ICON_STATE } from '@/lib/mapDesignSystem';

export function MyControl() {
  return (
    <ControlSurface variant="tools" position="top-right">
      <Button className={ICON_STATE.default}>
        <Icon className="h-4 w-4" />
      </Button>
    </ControlSurface>
  );
}
```

2. **Add State Feedback:**
```tsx
<Button
  className={cn(
    isActive ? ICON_STATE.active : ICON_STATE.default,
    isDisabled && ICON_STATE.disabled
  )}
>
  <Icon />
</Button>
```

3. **Position Appropriately:**
- Navigation controls → `top-left`
- Tools → `top-right`
- Playback → `bottom-center`
- KPIs → `top-center`

---

### Adding Empty States

```tsx
import { EmptyState } from '@/components/map/ui/EmptyState';
import { Icon } from 'lucide-react';

{!data ? (
  <EmptyState
    icon={Icon}
    title="No Data Available"
    description="Description of why data is missing"
    action={{
      label: "Call to Action",
      onClick: handleAction
    }}
  />
) : (
  <YourComponent data={data} />
)}
```

---

### Adding Loading States

**For KPI Ribbon:**
```tsx
const { data: stats, isLoading } = useRealtimeStats();

<KPIRibbon
  {...stats}
  isLoading={isLoading}
/>
```

**For Custom Components:**
```tsx
import { Skeleton } from '@/components/ui/skeleton';

{isLoading ? (
  <Skeleton className="h-10 w-full" />
) : (
  <YourComponent />
)}
```

---

### Validating Timestamps

**In your component:**
```tsx
const isValidTimestamp = (timestamp: string | null): boolean => {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
};

// Use before processing
if (!isValidTimestamp(timestamp)) {
  return '--:--'; // Fallback
}
```

---

## Migration Checklist

When creating new map pages or components:

- [ ] Wrap all controls in `ControlSurface`
- [ ] Use `ICON_STATE` for button states
- [ ] Add `ModeIndicator` to page header
- [ ] Validate timestamps before use
- [ ] Add loading states for async data
- [ ] Add empty states for missing data
- [ ] Use `useThemeAwareBasemap()` for theme sync
- [ ] Position controls using `CONTROL_POSITIONS`
- [ ] Test on both light and dark themes
- [ ] Test with invalid/missing data

---

## Testing

### Visual Regression Tests

1. **Control Legibility:**
   - Toggle theme: Light → Dark
   - Verify all controls remain visible
   - Check hover/active/disabled states

2. **Theme Integration:**
   - Toggle theme: Light → Dark → System
   - Verify basemap switches
   - Check UI and map cohesion

3. **Mode Transitions:**
   - Navigate: Operational → Planning → Forensic
   - Verify mode indicator updates
   - Check control visibility matrix

4. **Error Handling:**
   - Load page with no data
   - Verify empty states show
   - Check no console errors

---

## Performance Notes

- `ControlSurface` uses `backdrop-blur` (GPU-accelerated)
- `ModeIndicator` renders once per mode change
- `EmptyState` is lightweight (no complex logic)
- Timestamp validation is memoized internally
- Theme switching triggers single re-render

---

## Browser Support

- **Modern browsers:** Full support
- **Safari:** Tested on macOS/iOS
- **Chrome/Edge:** Tested on desktop/mobile
- **Firefox:** Tested on desktop

**Fallbacks:**
- `backdrop-blur` → solid background on unsupported browsers
- Theme detection → defaults to light on older browsers

---

## Troubleshooting

### Controls not visible on dark basemap
→ Ensure wrapped in `ControlSurface`

### Basemap not switching with theme
→ Check `useThemeAwareBasemap()` or `getMapLibreStyle()` usage

### "Invalid time value" errors
→ Use validation guards in `PlaybackControls`/`TimelineSlider`

### Mode indicator not showing
→ Ensure `<ModeIndicator mode="..." />` added to page

### Loading state not showing
→ Pass `isLoading` prop to components

---

## Further Reading

- [UI_ENHANCEMENT_COMPLETE.md](UI_ENHANCEMENT_COMPLETE.md) - Full implementation report
- [UI_ENHANCEMENT_PHASE1_PHASE2_COMPLETE.md](UI_ENHANCEMENT_PHASE1_PHASE2_COMPLETE.md) - Phase 1 & 2 details
- Design system tokens: `src/lib/mapDesignSystem.ts`
- Map config: `src/lib/mapConfig.ts`

---

**Questions?** Check the implementation files or the complete report documents.
