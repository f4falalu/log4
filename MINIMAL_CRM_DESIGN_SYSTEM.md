# BIKO Minimal CRM Design System

**Version:** 2.0  
**Style:** Minimal, Professional, SaaS/CRM Dashboard  
**Date:** October 22, 2025

---

## Design Philosophy

A clean, neutral, and professional design system inspired by modern CRM platforms like BizLink. Focuses on:

- **Clarity over decoration** - Every element serves a purpose
- **Calm aesthetics** - Neutral colors, subtle shadows, balanced whitespace
- **Professional typography** - General Sans for geometric precision
- **High readability** - Excellent contrast, clear hierarchy
- **Responsive by default** - Mobile-first, adaptive layouts

---

## Color Palette

### Primary Colors
```css
Background:    #f6f7ed (HSL: 40 14% 97%)  /* Warm off-white */
Foreground:    #1f1f1f (HSL: 0 0% 12%)   /* Near black */
Card:          #ffffff (HSL: 0 0% 100%)  /* Pure white */
```

### Neutral Grays
```css
Secondary:     #f4f4f4 (HSL: 0 0% 96%)   /* Light gray */
Muted:         #f4f4f4 (HSL: 0 0% 96%)   /* Same as secondary */
Muted Text:    #737373 (HSL: 0 0% 45%)   /* Medium gray */
Border:        #e5e5e5 (HSL: 0 0% 90%)   /* Subtle border */
```

### Accent Colors
```css
Accent:        #f6f7ed (HSL: 40 14% 97%)  /* Warm accent */
Success:       #22c55e (HSL: 142 71% 45%) /* Green */
Warning:       #f59e0b (HSL: 38 92% 50%)  /* Amber */
Destructive:   #ef4444 (HSL: 0 72% 51%)   /* Red */
```

### Usage Guidelines
- **Background:** Page background, subtle contrast
- **Card:** All card surfaces, modals, dropdowns
- **Foreground:** Primary text, icons, buttons
- **Muted:** Secondary backgrounds, disabled states
- **Borders:** Subtle dividers, card outlines

---

## Typography

### Font Family
**Primary:** General Sans (Geometric Sans-serif)
- Weights: 200, 300, 400, 500, 600, 700
- Source: Fontshare API
- Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

### Type Scale
```
H1 (Page Title):     20px (text-xl)      font-semibold  tracking-tight
H2 (Section):        18px (text-lg)      font-semibold  tracking-tight
H3 (Card Title):     15px (text-[15px])  font-semibold  tracking-tight
H4 (Subsection):     14px (text-sm)      font-medium    tracking-normal
Body:                14px (text-sm)      font-normal    tracking-normal
Small:               13px (text-[13px])  font-normal    tracking-normal
Tiny:                12px (text-[12px])  font-normal    tracking-normal
Badge/Label:         11px (text-[11px])  font-medium    tracking-normal
```

### Letter Spacing
- Headings: `-0.02em` (tighter)
- Body: `-0.01em` (slightly tight)
- Labels: `normal`

### Line Height
- Headings: `1.2`
- Body: `1.6`
- Tight: `1.4`

---

## Spacing Scale

Based on 4px base unit:

```
xs:   4px   (space-1)
sm:   8px   (space-2)
md:   12px  (space-3)
base: 16px  (space-4)
lg:   20px  (space-5)
xl:   24px  (space-6)
2xl:  32px  (space-8)
```

### Component Spacing
- **Card padding:** 20px (p-5)
- **Section gap:** 20px (gap-5)
- **Grid gap:** 16px (gap-4)
- **Button padding:** 12px horizontal (px-3)
- **Input padding:** 12px horizontal (px-3)

---

## Border Radius

```
sm:   4px   (rounded-sm)
md:   6px   (rounded-md)
base: 8px   (rounded-lg)
lg:   12px  (rounded-xl)
full: 9999px (rounded-full)
```

### Usage
- **Cards:** `rounded-lg` (8px)
- **Buttons:** `rounded-md` (6px)
- **Badges:** `rounded-md` (6px)
- **Inputs:** `rounded-md` (6px)
- **Avatars:** `rounded-full`

---

## Shadows

Subtle, soft shadows for depth:

```css
sm:  0 1px 2px 0 rgb(0 0 0 / 0.05)
md:  0 4px 6px -1px rgb(0 0 0 / 0.1)
lg:  0 10px 15px -3px rgb(0 0 0 / 0.1)
```

### Usage
- **Cards:** `shadow-sm`
- **Dropdowns:** `shadow-md`
- **Modals:** `shadow-lg`
- **Hover states:** No shadow change (keep minimal)

---

## Components

### Card
```tsx
<Card className="rounded-lg border border-border/50 bg-card shadow-sm">
  <CardHeader className="p-5 space-y-1.5">
    <CardTitle className="text-[15px] font-semibold">Title</CardTitle>
    <CardDescription className="text-[13px] text-muted-foreground">
      Description
    </CardDescription>
  </CardHeader>
  <CardContent className="p-5 pt-0">
    Content
  </CardContent>
</Card>
```

### Button
```tsx
// Default (dark)
<Button className="h-9 px-4 text-[13px] bg-foreground text-background">
  Primary Action
</Button>

// Outline (light)
<Button variant="outline" className="h-8 px-3 text-[13px]">
  Secondary
</Button>

// Ghost (minimal)
<Button variant="ghost" className="h-8 px-3 text-[13px]">
  Tertiary
</Button>
```

### Badge
```tsx
<Badge className="rounded-md px-2 py-0.5 text-[11px]">
  Status
</Badge>

<Badge variant="success" className="bg-green-500/10 text-green-700">
  Active
</Badge>

<Badge variant="warning" className="bg-amber-500/10 text-amber-700">
  Pending
</Badge>
```

### Input
```tsx
<Input 
  className="h-9 rounded-md border-border text-[13px]"
  placeholder="Enter text..."
/>
```

---

## Layout Structure

### Page Layout
```tsx
<Layout>
  {/* Header: 56px (h-14) */}
  <header className="h-14 border-b border-border/50 bg-card">
    <div className="mx-auto max-w-[1400px] px-6">
      {/* Logo + Nav */}
    </div>
  </header>

  {/* Navigation: ~40px */}
  <nav className="border-b border-border/30 bg-card">
    <div className="mx-auto max-w-[1400px] px-6">
      {/* Nav items */}
    </div>
  </nav>

  {/* Main Content */}
  <main className="mx-auto max-w-[1400px] px-6 py-8">
    {/* Page content */}
  </main>
</Layout>
```

### Grid Layouts
```tsx
// 4-column metrics
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
  {/* Metric cards */}
</div>

// 3-column dashboard
<div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
  <div className="lg:col-span-1">{/* Sidebar */}</div>
  <div className="lg:col-span-2">{/* Main content */}</div>
</div>
```

---

## Interaction States

### Hover
- **Cards:** No change (keep minimal)
- **Buttons:** Slight opacity change (90%)
- **Links:** Background color change
- **Nav items:** Background: `bg-secondary/50`

### Focus
```css
focus-visible:outline-none 
focus-visible:ring-2 
focus-visible:ring-ring 
focus-visible:ring-offset-2
```

### Active
- **Buttons:** Slight scale (98%)
- **Nav items:** Background: `bg-secondary`

### Disabled
```css
disabled:pointer-events-none 
disabled:opacity-50
```

---

## Accessibility

### Color Contrast
- **Body text:** 4.5:1 minimum (WCAG AA)
- **Large text:** 3:1 minimum
- **UI elements:** 3:1 minimum

### Focus Indicators
- Always visible on keyboard focus
- 2px ring with offset
- High contrast color

### Semantic HTML
- Proper heading hierarchy
- ARIA labels where needed
- Keyboard navigation support

---

## Responsive Breakpoints

```css
sm:  640px   /* Mobile landscape */
md:  768px   /* Tablet */
lg:  1024px  /* Desktop */
xl:  1280px  /* Large desktop */
2xl: 1536px  /* Extra large */
```

### Mobile-First Approach
```tsx
// Stack on mobile, grid on desktop
className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4"

// Full width on mobile, constrained on desktop
className="w-full lg:max-w-[1400px]"
```

---

## Animation

### Transitions
```css
transition-colors  /* Color changes */
transition-shadow  /* Shadow changes */
transition-all     /* Multiple properties (use sparingly) */
```

### Duration
- **Fast:** 150ms (hover, active)
- **Medium:** 200ms (dropdowns, modals)
- **Slow:** 300ms (page transitions)

### Easing
```css
ease-in-out  /* Default */
ease-out     /* Entrances */
ease-in      /* Exits */
```

---

## Best Practices

### Do's ✅
- Use semantic color tokens (`bg-card`, `text-foreground`)
- Maintain consistent spacing (multiples of 4px)
- Keep shadows subtle
- Use proper heading hierarchy
- Test in light and dark modes
- Ensure keyboard accessibility

### Don'ts ❌
- Don't use arbitrary colors (`bg-[#123456]`)
- Don't mix spacing scales
- Don't add excessive shadows
- Don't skip heading levels
- Don't rely on color alone for meaning
- Don't forget focus states

---

## Dark Mode

Automatically supported via CSS variables:

```css
.dark {
  --background: 0 0% 12%;      /* #1f1f1f */
  --foreground: 0 0% 96%;      /* #f4f4f4 */
  --card: 0 0% 15%;            /* Slightly lighter */
  --border: 0 0% 25%;          /* Lighter borders */
}
```

---

## Migration from Previous Design

### Color Changes
```
Old BDS Blue (#2563eb) → New Neutral (#1f1f1f)
Old Gray-50 (#f9fafb) → New Warm (#f6f7ed)
Old Inter Font → New General Sans
```

### Component Updates
- Cards: Smaller padding (p-6 → p-5)
- Buttons: Smaller height (h-10 → h-9)
- Typography: Smaller sizes overall
- Borders: More subtle (border-border/50)

---

## Examples

### Dashboard Header
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-xl font-semibold tracking-tight">
      Command Center
    </h1>
    <p className="mt-0.5 text-[13px] text-muted-foreground">
      Real-time operations • 12:34 PM
    </p>
  </div>
  <Button variant="outline" size="sm">
    Refresh
  </Button>
</div>
```

### Metric Card
```tsx
<Card>
  <div className="p-5">
    <p className="text-[13px] font-medium text-muted-foreground">
      Active Routes
    </p>
    <div className="mt-2 flex items-baseline gap-2">
      <h3 className="text-2xl font-semibold tracking-tight">24</h3>
      <TrendingUp className="h-4 w-4 text-green-700" />
    </div>
    <p className="mt-1 text-[12px] text-muted-foreground">
      +12% from yesterday
    </p>
  </div>
</Card>
```

---

## Resources

- **Font:** [General Sans on Fontshare](https://www.fontshare.com/fonts/general-sans)
- **Icons:** Lucide React
- **Components:** Shadcn/UI + Radix Primitives
- **Styling:** Tailwind CSS

---

**Status:** ✅ Fully Implemented  
**Last Updated:** October 22, 2025
