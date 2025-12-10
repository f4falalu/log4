# Component Usage Guide

This guide demonstrates how to use the newly standardized BIKO Design System components.

## PageLayout Component

Provides consistent page structure with header, breadcrumbs, and actions.

### Basic Usage

```tsx
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';

export function MyPage() {
  return (
    <PageLayout
      title="Vehicle Management"
      subtitle="Manage your fleet vehicles"
      breadcrumbs={[
        { label: 'FleetOps', href: '/fleetops' },
        { label: 'VLMS', href: '/fleetops/vlms' },
        { label: 'Vehicles' }
      ]}
      actions={
        <>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </>
      }
    >
      {/* Your page content */}
    </PageLayout>
  );
}
```

---

## EmptyState Component

Shows when no data is available, with optional icon and action button.

### Basic Usage

```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Package, Plus } from 'lucide-react';

export function VehicleList() {
  if (vehicles.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No vehicles found"
        description="Add your first vehicle to get started with fleet management."
        action={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        }
      />
    );
  }

  return <VehicleTable vehicles={vehicles} />;
}
```

### With Dashed Border Variant

```tsx
<EmptyState
  variant="dashed"
  icon={Package}
  title="No vehicles found"
  description="Add your first vehicle to get started."
/>
```

---

## PaginationControls Component

Standardized pagination UI with page info and navigation.

### With usePagination Hook

```tsx
import { PaginationControls, usePagination } from '@/components/ui/pagination-controls';

export function VehicleList({ vehicles }) {
  const pagination = usePagination({
    pageSize: 50,
    totalItems: vehicles.length,
  });

  // Get paginated data
  const paginatedVehicles = vehicles.slice(
    pagination.startIndex,
    pagination.endIndex
  );

  return (
    <div className="space-y-6">
      {/* Your list/table */}
      <VehicleTable vehicles={paginatedVehicles} />

      {/* Pagination controls */}
      <PaginationControls {...pagination} />
    </div>
  );
}
```

### Manual Control

```tsx
import { PaginationControls } from '@/components/ui/pagination-controls';

export function VehicleList() {
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 50;
  const totalItems = vehicles.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <PaginationControls
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      totalItems={totalItems}
      onPageChange={setCurrentPage}
      isLoading={isLoadingVehicles}
    />
  );
}
```

---

## Alert Component (Enhanced)

Now supports success, warning, and info variants.

### Usage

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

// Success alert
<Alert variant="success">
  <CheckCircle2 className="h-4 w-4" />
  <AlertTitle>Success!</AlertTitle>
  <AlertDescription>
    Your vehicle has been added successfully.
  </AlertDescription>
</Alert>

// Warning alert
<Alert variant="warning">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Warning</AlertTitle>
  <AlertDescription>
    This vehicle requires maintenance soon.
  </AlertDescription>
</Alert>

// Info alert
<Alert variant="info">
  <Info className="h-4 w-4" />
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>
    The system will be under maintenance tonight.
  </AlertDescription>
</Alert>
```

---

## Badge Component (Enhanced)

Now supports success, warning, and info variants.

### Usage

```tsx
import { Badge } from '@/components/ui/badge';

// Status badges
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="info">In Review</Badge>
<Badge variant="destructive">Failed</Badge>
<Badge variant="secondary">Inactive</Badge>
<Badge variant="outline">Draft</Badge>
```

---

## Design Tokens (Color System)

Use semantic color utilities for consistent theming.

### Using Status Colors

```tsx
import { getStatusColors, getBadgeVariant } from '@/lib/designTokens';

// Get color classes for status
const statusColors = getStatusColors('active');

<div className={cn(
  'p-4 rounded-lg',
  statusColors.bg,
  statusColors.text,
  statusColors.border,
  'border'
)}>
  Status: Active
</div>

// Get badge variant for status
const badgeVariant = getBadgeVariant('active');
<Badge variant={badgeVariant}>Active</Badge>
```

### Using Priority Colors

```tsx
import { getPriorityColors } from '@/lib/designTokens';

const priorityColors = getPriorityColors('urgent');

<div className={cn(
  'px-2 py-1 rounded',
  priorityColors.bg,
  priorityColors.text
)}>
  URGENT
</div>
```

### Using Vehicle State Colors

```tsx
import { getVehicleStateColors } from '@/lib/designTokens';

const stateColors = getVehicleStateColors('in_use');

<span className={cn(stateColors.text, stateColors.bg, 'px-2 py-1 rounded')}>
  In Use
</span>
```

---

## Z-Index Scale

Use semantic z-index values for proper layering.

### Available Values

```tsx
// In Tailwind classes
<div className="z-base">Base layer (0)</div>
<div className="z-sticky">Sticky headers (10)</div>
<div className="z-floating">Floating UI elements (20)</div>
<div className="z-dropdown">Dropdowns/Popovers (30)</div>
<div className="z-tooltip">Tooltips (40)</div>
<div className="z-modal">Modals/Dialogs (50)</div>
```

### Example: Floating Map Controls

```tsx
<div className="absolute top-4 right-4 z-floating bg-background border rounded-lg shadow-lg p-2">
  {/* Map controls */}
</div>
```

---

## Accessibility Best Practices

### Icon-Only Buttons

Always add `aria-label` to icon-only buttons:

```tsx
import { Button } from '@/components/ui/button';
import { Edit, Trash2, MoreVertical } from 'lucide-react';

<Button size="icon" variant="ghost" aria-label="Edit vehicle">
  <Edit className="h-4 w-4" />
</Button>

<Button size="icon" variant="ghost" aria-label="Delete vehicle">
  <Trash2 className="h-4 w-4" />
</Button>

<Button size="icon" variant="ghost" aria-label="More actions">
  <MoreVertical className="h-4 w-4" />
</Button>
```

### Empty States

Always use `role="status"` for empty states:

```tsx
<EmptyState
  icon={Package}
  title="No results"
  description="Try adjusting your filters"
  // Automatically includes role="status" and aria-label
/>
```

---

## Migration Examples

### Before: Hardcoded Colors

```tsx
// ❌ Old way
<div className="bg-green-100 text-green-800 border-green-200">
  Active
</div>
```

### After: Semantic Tokens

```tsx
// ✅ New way
import { getStatusColors } from '@/lib/designTokens';

const colors = getStatusColors('active');
<div className={cn(colors.bg, colors.text, colors.border, 'border')}>
  Active
</div>

// Or use Badge component
<Badge variant="success">Active</Badge>
```

### Before: Inconsistent Page Headers

```tsx
// ❌ Old way
<div>
  <h1 className="text-2xl font-bold">Vehicles</h1>
  <div className="flex gap-2 mt-4">
    <Button>Add Vehicle</Button>
  </div>
  {/* Content */}
</div>
```

### After: PageLayout

```tsx
// ✅ New way
<PageLayout
  title="Vehicles"
  subtitle="Manage your fleet vehicles"
  actions={<Button>Add Vehicle</Button>}
>
  {/* Content */}
</PageLayout>
```

### Before: Custom Pagination

```tsx
// ❌ Old way (50+ lines of custom pagination code)
```

### After: PaginationControls

```tsx
// ✅ New way (3 lines)
const pagination = usePagination({ pageSize: 50, totalItems: data.length });
const paginatedData = data.slice(pagination.startIndex, pagination.endIndex);
<PaginationControls {...pagination} />
```

---

## Testing Components

All components have been tested with:
- ✅ TypeScript type safety
- ✅ Vite production build
- ✅ Accessibility attributes (ARIA labels, roles)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Dark mode support (via CSS variables)

---

## Questions?

For more information, see:
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Full design system documentation
- [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) - Color token reference (coming soon)
- [COMPONENT_LIBRARY.md](./COMPONENT_LIBRARY.md) - Complete component API (coming soon)
