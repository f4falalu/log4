# BIKO Design Tokens Reference

## Overview

BIKO uses a token-based design system to ensure consistency across all components. All tokens are defined in `src/styles/biko-tokens.css` as CSS custom properties and mapped to Tailwind classes in `tailwind.config.ts`.

---

## Color Tokens

### Primary Palette

| Token | HSL Value | Hex Equivalent | Usage |
|-------|-----------|----------------|-------|
| `--biko-primary` | `217 91% 60%` | `#2563EB` | Primary actions, CTAs, active states |
| `--biko-primary-600` | `217 91% 50%` | `#1D4ED8` | Hover states, pressed buttons |
| `--biko-secondary` | `266 83% 67%` | `#7C3AED` | Secondary actions, accents |
| `--biko-accent` | `189 94% 43%` | `#06B6D4` | Info badges, highlights |

### Semantic Colors

| Token | HSL Value | Hex Equivalent | Usage |
|-------|-----------|----------------|-------|
| `--biko-success` | `142 76% 36%` | `#22C55E` | Success states, available status |
| `--biko-warning` | `38 92% 50%` | `#F59E0B` | Warnings, near capacity |
| `--biko-danger` | `0 72% 51%` | `#EF4444` | Errors, critical alerts, overload |
| `--biko-muted` | `215 20% 65%` | `#94A3B8` | Disabled states, secondary text |

### Background Colors

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--biko-bg-dark` | `222.2 84% 4.9%` | Main application background (FleetOps) |
| `--biko-surface-1` | `215 28% 12%` | Card backgrounds, panels |
| `--biko-surface-2` | `215 28% 17%` | Elevated panels, drawers |

### Zone Colors (with transparency)

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--biko-zone-blue` | `217 91% 60% / 0.15` | Service zone polygons (standard) |
| `--biko-zone-green` | `142 76% 36% / 0.12` | High-priority zones |
| `--biko-zone-red` | `0 72% 51% / 0.10` | Restricted zones |

### Glass Morphism

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--biko-glass` | `0 0% 100% / 0.04` | Translucent overlays |
| `--biko-glass-border` | `0 0% 100% / 0.08` | Glass element borders |

---

## Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--biko-space-1` | `4px` | Tight spacing, icon gaps |
| `--biko-space-2` | `8px` | Small padding, compact layouts |
| `--biko-space-3` | `12px` | Medium padding, button padding |
| `--biko-space-4` | `16px` | Standard padding, card padding |
| `--biko-space-5` | `24px` | Large padding, section spacing |
| `--biko-space-6` | `32px` | Extra large padding, page margins |

### Tailwind Mapping

```typescript
// tailwind.config.ts
spacing: {
  'biko-1': 'var(--biko-space-1)',
  'biko-2': 'var(--biko-space-2)',
  'biko-3': 'var(--biko-space-3)',
  'biko-4': 'var(--biko-space-4)',
  'biko-5': 'var(--biko-space-5)',
  'biko-6': 'var(--biko-space-6)',
}
```

---

## Typography Tokens

### Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `--biko-font-family` | `"Inter", ui-sans-serif, system-ui` | Primary text |
| `--biko-font-mono` | `"JetBrains Mono", ui-monospace, monospace` | Code, data displays |

### Font Sizes (via Tailwind)

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-sm` | `14px` | `20px` | Body text, labels |
| `text-base` | `16px` | `24px` | Default text |
| `text-lg` | `18px` | `28px` | Emphasized text |
| `text-xl` | `20px` | `28px` | Subheadings |
| `text-2xl` | `24px` | `32px` | Headings |

---

## Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--biko-radius-sm` | `6px` | Buttons, badges |
| `--biko-radius-md` | `10px` | Cards, inputs |
| `--biko-radius-lg` | `14px` | Drawers, modals |

### Tailwind Classes

```tsx
// Usage in components
<div className="rounded-biko-sm">Small radius</div>
<div className="rounded-biko-md">Medium radius</div>
<div className="rounded-biko-lg">Large radius</div>
```

---

## Shadow Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--biko-shadow-sm` | `0 2px 8px rgba(0,0,0,0.4)` | Subtle elevation |
| `--biko-shadow-lg` | `0 10px 30px rgba(2,6,23,0.6)` | Prominent elevation |

### Tailwind Classes

```tsx
<div className="shadow-biko-sm">Subtle shadow</div>
<div className="shadow-biko-lg">Prominent shadow</div>
```

---

## Motion Tokens

### Easing Functions

| Token | Value | Usage |
|-------|-------|-------|
| `--biko-ease` | `cubic-bezier(0.2, 0.9, 0.2, 1)` | All transitions |

### Durations

| Token | Value | Usage |
|-------|-------|-------|
| `--biko-duration-fast` | `120ms` | Micro-interactions (hover, focus) |
| `--biko-duration-normal` | `200ms` | Standard transitions |
| `--biko-duration-slow` | `360ms` | Drawer/modal animations |

### Animations

#### Pulse Animation

```css
@keyframes biko-pulse {
  0% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.6); opacity: 0.14; }
  100% { transform: scale(1); opacity: 0.7; }
}
```

**Usage:**
```tsx
<div className="animate-[biko-pulse_1.6s_var(--biko-ease)_infinite]">
  Active driver marker
</div>
```

---

## Usage Guidelines

### ✅ DO

```tsx
// Use semantic tokens
<Button className="bg-biko-primary text-white">
  Primary Action
</Button>

// Use spacing tokens
<div className="p-biko-4 gap-biko-2">
  Content
</div>

// Use motion tokens
<div className="transition-all duration-[var(--biko-duration-normal)]">
  Animated content
</div>
```

### ❌ DON'T

```tsx
// Don't use direct color values
<Button className="bg-blue-500 text-white">
  Wrong
</Button>

// Don't use arbitrary spacing
<div className="p-[17px] gap-[13px]">
  Wrong
</div>

// Don't use random durations
<div className="transition-all duration-[247ms]">
  Wrong
</div>
```

---

## Theme Variants

### FleetOps (Operational Dark)

```css
.workspace-fleetops {
  --background: var(--biko-bg-dark);
  --foreground: 210 40% 98%;
  --card: var(--biko-surface-1);
  --primary: var(--biko-primary);
}
```

**When to use:** Tactical Map, Command Center, real-time operations.

### Storefront (Light)

Uses default light theme from Shadcn UI.

**When to use:** Planning tools, requisitions, reports.

---

## Figma Integration

### Exporting Tokens to Figma

1. Install [Figma Tokens](https://www.figma.com/community/plugin/843461159747178978/Figma-Tokens) plugin
2. Import `design/figma-tokens.json` (generated from `biko-tokens.css`)
3. Apply token sets:
   - `BIKO/Core` (colors, spacing, typography)
   - `BIKO/Semantic` (success, warning, danger)
   - `BIKO/Themes/FleetOps` or `BIKO/Themes/Storefront`

### Creating Components in Figma

1. **Use color variables**, not direct fills
2. **Name layers semantically**: "Button/Primary", "Card/Surface"
3. **Document component states**: Default, Hover, Active, Disabled
4. **Provide dark/light mode variants**

---

## Token Naming Convention

### Format

```
--{namespace}-{category}-{variant}?
```

### Examples

- `--biko-primary` (color)
- `--biko-space-4` (spacing with size)
- `--biko-radius-md` (border radius with size)
- `--biko-duration-fast` (motion with speed)

---

## Accessibility Considerations

### Color Contrast

All color combinations meet **WCAG AA** standards (4.5:1 minimum):

| Background | Foreground | Contrast Ratio | Pass |
|------------|------------|----------------|------|
| `--biko-bg-dark` | `--foreground` | 14.2:1 | ✅ AAA |
| `--biko-primary` | white | 4.8:1 | ✅ AA |
| `--biko-danger` | white | 5.1:1 | ✅ AA |
| `--biko-warning` | black | 9.7:1 | ✅ AAA |

### Focus Indicators

All interactive elements use visible focus rings:

```tsx
<Button className="focus-visible:ring-2 focus-visible:ring-biko-primary">
  Accessible Button
</Button>
```

---

## Maintenance

### Adding New Tokens

1. Define in `src/styles/biko-tokens.css`
2. Map to Tailwind in `tailwind.config.ts`
3. Document in this file
4. Update Figma tokens JSON
5. Create PR with examples

### Deprecating Tokens

1. Mark as deprecated in comments
2. Provide migration path
3. Update all usages in codebase
4. Remove after 2 releases

---

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Shadcn UI Components](https://ui.shadcn.com)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [CSS Custom Properties MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
