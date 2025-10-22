# BIKO Typography Scale

## Standardized Typography System

### Heading Hierarchy

```tsx
// Page Title (H1) - Main page heading
<h1 className="text-2xl font-bold tracking-tight">
  Command Center
</h1>

// Section Title (H2) - Major sections
<h2 className="text-xl font-semibold">
  Fleet Status
</h2>

// Card Title (H3) - Card headers, subsections
<h3 className="text-lg font-semibold">
  Active Deliveries
</h3>

// Subsection (H4) - Minor headings
<h4 className="text-base font-medium">
  Vehicle Details
</h4>
```

### Body Text

```tsx
// Default body text
<p className="text-sm">
  Regular content text
</p>

// Muted/secondary text
<p className="text-sm text-muted-foreground">
  Supporting information
</p>

// Small text / captions
<span className="text-xs text-muted-foreground">
  Metadata, timestamps, labels
</span>
```

### Font Sizes

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Captions, labels, metadata |
| `text-sm` | 14px | Body text, descriptions |
| `text-base` | 16px | Emphasized body, H4 |
| `text-lg` | 18px | Card titles, H3 |
| `text-xl` | 20px | Section titles, H2 |
| `text-2xl` | 24px | Page titles, H1 |

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Emphasized text, H4 |
| `font-semibold` | 600 | H2, H3, important labels |
| `font-bold` | 700 | H1, primary actions |

### Examples by Component

#### CommandCenter Page
```tsx
// Page header
<h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
<p className="text-sm text-muted-foreground">Real-time operations dashboard</p>
```

#### Card Component
```tsx
<CardTitle className="text-lg font-semibold">Active Fleet</CardTitle>
<CardDescription className="text-sm text-muted-foreground">
  Currently deployed vehicles
</CardDescription>
```

#### Metrics Display
```tsx
<p className="text-sm font-medium text-muted-foreground">Total Distance</p>
<h3 className="text-3xl font-bold tracking-tight">1,234 km</h3>
<p className="text-xs text-muted-foreground">Last 7 days</p>
```

#### Navigation
```tsx
<span className="text-sm font-medium">Dashboard</span>
```

### Line Height

- Headings: `leading-tight` or `leading-none`
- Body text: Default (1.5)
- Compact lists: `leading-snug`

### Letter Spacing

- Headings: `tracking-tight`
- Body text: Default
- All caps: `tracking-wide`

## Migration Guide

### Before (Inconsistent)
```tsx
<h1 className="text-4xl font-bold">Page Title</h1>
<h1 className="text-2xl font-bold">Another Page</h1>
<h3 className="text-xl">Card Title</h3>
<h3 className="text-base">Another Card</h3>
```

### After (Standardized)
```tsx
<h1 className="text-2xl font-bold tracking-tight">Page Title</h1>
<h1 className="text-2xl font-bold tracking-tight">Another Page</h1>
<h3 className="text-lg font-semibold">Card Title</h3>
<h3 className="text-lg font-semibold">Another Card</h3>
```

## Implementation Checklist

- [x] CommandCenter.tsx - Page title updated
- [x] Layout.tsx - Navigation text standardized
- [x] Card components - Title sizes consistent
- [ ] Storefront pages - Apply typography scale
- [ ] Dashboard components - Update headings
- [ ] Form labels - Standardize sizes

## Notes

- Always use `tracking-tight` with headings for better readability
- Use `text-muted-foreground` for secondary information
- Maintain visual hierarchy: H1 > H2 > H3 > H4 > Body
- Avoid skipping heading levels (H1 → H3)
