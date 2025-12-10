# BIKO Design System Guidelines

## Layout Architecture

### Page Layout Patterns

BIKO uses **three distinct layout patterns** for different use cases:

#### 1. Standard Contained Layout
**Use for**: Content-focused pages, forms, lists with moderate data density

**Structure**:
```tsx
<div className="container mx-auto p-6 space-y-6">
  <PageHeader />
  <Content />
</div>
```

**When to use**:
- Requisitions, Facilities (list view), simple CRUD pages
- Pages where content should be centered and not exceed readable width
- Form-heavy pages

**Examples**: Storefront Home, Requisitions Page

---

#### 2. Full-Width Workspace Layout
**Use for**: Data-intensive UIs, tables, maps, dashboards

**Structure**:
```tsx
<div className="flex flex-col h-full p-6 space-y-6">
  <PageHeader />
  <Content />
</div>
```

**When to use**:
- Pages with large tables, data grids, maps
- Multi-panel interfaces (sidebars + main content)
- Dashboards with multiple widgets
- Pages that benefit from maximum screen real estate

**Examples**: Facilities Page, Zones Page, Batch Management

---

#### 3. Full-Screen Application Layout
**Use for**: Immersive experiences, complex data visualization

**Structure**:
```tsx
<div className="h-screen flex flex-col">
  <Header className="px-6 py-5" />
  <Content className="flex-1 overflow-auto" />
</div>
```

**When to use**:
- Vehicle management (grid/list views with filters)
- Driver management (split-screen with details)
- Tactical maps
- Schedule planners

**Examples**: VehiclesPage, DriverManagement, TacticalMap

---

## Spacing System

### Page-Level Spacing

| Element | Value | Usage |
|---------|-------|-------|
| **Container Padding** | `p-6` | Standard page padding |
| **Section Spacing** | `space-y-6` | Between major page sections |
| **Tight Section Spacing** | `space-y-4` | Between related subsections |
| **Wide Section Spacing** | `space-y-8` | Between distinct page areas |

### Component Spacing

| Element | Value | Usage |
|---------|-------|-------|
| **Card Grid Gap** | `gap-6` | Major section grids (stats, features) |
| **Compact Grid Gap** | `gap-4` | Compact layouts, nested grids |
| **Button Group Gap** | `gap-3` | Action buttons in headers |
| **Inline Button Gap** | `gap-2` | Small inline button groups |

### Header Spacing

| Element | Value | Usage |
|---------|-------|-------|
| **Title Bottom Margin** | `mb-6` | Main page title to content |
| **Subtitle Top Margin** | `mt-2` | Below page title |
| **Header Section Bottom** | `mb-8` | If header has multiple elements |

---

## Typography Scale

### Page Headers
```tsx
<h1 className="text-3xl font-bold">Page Title</h1>
<p className="text-muted-foreground mt-2">Subtitle or description</p>
```

### Section Headers
```tsx
<h2 className="text-2xl font-semibold">Section Title</h2>
<p className="text-sm text-muted-foreground mt-2">Section description</p>
```

### Card Headers
```tsx
<CardTitle className="text-lg font-semibold">Card Title</CardTitle>
<CardDescription className="text-sm">Card description</CardDescription>
```

---

## Grid Patterns

### Standard Grid Layouts

**4-Column Stats Grid** (Dashboard stats, key metrics):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
```

**3-Column Feature Grid** (Module cards, feature blocks):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

**2-Column Content Grid** (Side-by-side content):
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```

**Responsive Table Grid** (Data tables with filters):
```tsx
<div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
  <Filters />
  <Table />
</div>
```

---

## Responsive Breakpoints

### Standard Breakpoint Usage

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm:` | 640px | Mobile landscape, small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops, small desktops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large desktops |

### Mobile-First Patterns

Always write mobile styles first, then add breakpoints:

```tsx
// ✅ Correct (mobile-first)
<div className="flex flex-col md:flex-row gap-4">
  <Button className="w-full md:w-auto">Action</Button>
</div>

// ❌ Incorrect (desktop-first)
<div className="flex-row md:flex-col">
```

---

## Component Patterns

### Page Header with Actions

**Standard Pattern**:
```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-3xl font-bold">Page Title</h1>
    <p className="text-muted-foreground mt-2">Description</p>
  </div>
  <div className="flex items-center gap-3">
    <Button variant="outline">Secondary</Button>
    <Button>Primary</Button>
  </div>
</div>
```

**Mobile-Responsive Pattern**:
```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
  <div>
    <h1 className="text-3xl font-bold">Page Title</h1>
    <p className="text-muted-foreground mt-2">Description</p>
  </div>
  <div className="flex items-center gap-3 w-full sm:w-auto">
    <Button variant="outline" className="flex-1 sm:flex-none">Secondary</Button>
    <Button className="flex-1 sm:flex-none">Primary</Button>
  </div>
</div>
```

### Stats Cards

**4-Column Layout** (Key metrics):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  <Card>
    <CardHeader className="pb-3">
      <CardDescription>Metric Label</CardDescription>
      <CardTitle className="text-3xl">1,234</CardTitle>
    </CardHeader>
  </Card>
</div>
```

### Data Tables

**With Pagination**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Table Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {isLoading ? (
      <TableLoadingState message="Loading data..." />
    ) : data.length === 0 ? (
      <EmptyState
        icon={Icon}
        title="No data found"
        description="Get started by adding your first item."
        variant="dashed"
      />
    ) : (
      <>
        <Table>
          {/* Table content */}
        </Table>
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setPage}
        />
      </>
    )}
  </CardContent>
</Card>
```

---

## Color Usage

### Semantic Colors

Use semantic color tokens, not hardcoded values:

```tsx
// ✅ Correct
<Badge className="bg-success/10 text-success border-success/20">Active</Badge>
<Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>
<Badge className="bg-destructive/10 text-destructive border-destructive/20">Error</Badge>

// ❌ Incorrect
<Badge className="bg-green-100 text-green-600">Active</Badge>
```

### Available Semantic Tokens

- **Primary**: Main brand color, CTAs, links
- **Secondary**: Less prominent actions
- **Success**: Positive actions, completion states
- **Warning**: Caution states, pending actions
- **Destructive**: Errors, delete actions
- **Info**: Informational messages
- **Muted**: Subtle backgrounds, disabled states

---

## Loading & Empty States

### Loading States

Use standardized loading components:

```tsx
import { TableLoadingState, PageLoadingState, InlineLoadingState } from '@/components/ui/loading-state';

// For tables
<TableLoadingState message="Loading data..." />

// For full pages
<PageLoadingState message="Loading page..." />

// For small components
<InlineLoadingState message="Loading..." />
```

### Empty States

Use the EmptyState component with appropriate icons:

```tsx
import { EmptyState } from '@/components/ui/empty-state';

<EmptyState
  icon={IconName}
  title="No items found"
  description="Get started by creating your first item."
  action={
    <Button onClick={handleCreate}>
      <Plus className="h-4 w-4 mr-2" />
      Create Item
    </Button>
  }
  variant="dashed"
/>
```

---

## Table Standards

### Cell Padding

```tsx
<TableHead className="py-4 px-4">Header</TableHead>
<TableCell className="py-4 px-4">Content</TableCell>
// Use py-5 for cells with multi-line content
<TableCell className="py-5 px-4">
  <div>Line 1</div>
  <div className="text-sm text-muted-foreground">Line 2</div>
</TableCell>
```

### Action Buttons

```tsx
<Button variant="ghost" size="icon" className="h-9 w-9">
  <Edit className="h-4 w-4" />
</Button>
```

---

## Dialog/Modal Standards

### Standard Widths

```tsx
// Small dialog (forms with few fields)
<DialogContent className="sm:max-w-[500px]">

// Medium dialog (standard forms)
<DialogContent className="sm:max-w-[600px]">

// Large dialog (complex forms, multi-step)
<DialogContent className="sm:max-w-[800px]">

// Extra large (data tables, detailed views)
<DialogContent className="sm:max-w-[1000px]">
```

---

## Migration Checklist

When updating a page, ensure:

- [ ] Appropriate layout pattern chosen (Contained/Full-Width/Full-Screen)
- [ ] Container padding is `p-6`
- [ ] Section spacing is `space-y-6` (or `space-y-8` for major sections)
- [ ] Header has `mb-6` bottom margin
- [ ] Grid patterns match design system (4-col/3-col/2-col)
- [ ] Responsive breakpoints follow mobile-first approach
- [ ] Semantic color tokens used (no hardcoded colors)
- [ ] LoadingState component used for loading states
- [ ] EmptyState component used for empty states
- [ ] Table cells have proper padding (`py-4 px-4`)
- [ ] Action buttons are `h-9 w-9` in tables

---

## Quick Reference

### Standard Page Template (Contained)

```tsx
export default function PageName() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Page Title</h1>
          <p className="text-muted-foreground mt-2">Page description</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">Secondary</Button>
          <Button>Primary Action</Button>
        </div>
      </div>

      {/* Stats (if applicable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat cards */}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Section Title</CardTitle>
          <CardDescription>Section description</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Content */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Standard Page Template (Full-Width)

```tsx
export default function PageName() {
  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Page Title</h1>
          <p className="text-muted-foreground mt-2">Page description</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">Secondary</Button>
          <Button>Primary Action</Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Section Title</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Content */}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Resources

- **Component Library**: `/src/components/ui/`
- **Layout Components**: `/src/components/layout/`
- **Design Tokens**: `/src/index.css` (CSS variables)
- **Tailwind Config**: `/tailwind.config.ts`
- **Examples**: Check Facilities page (full-width), Requisitions page (contained)
