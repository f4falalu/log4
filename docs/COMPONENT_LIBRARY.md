# BIKO Component Library Reference

**Version**: 1.0
**Last Updated**: December 2025
**Status**: Phase 1 & 2 Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Layout Components](#layout-components)
3. [UI Components](#ui-components)
4. [Loading States](#loading-states)
5. [Design Tokens Integration](#design-tokens-integration)
6. [Usage Guidelines](#usage-guidelines)
7. [Accessibility](#accessibility)

---

## Overview

The BIKO Component Library provides a standardized set of React components built on top of shadcn/ui, Radix UI primitives, and Tailwind CSS. All components follow consistent patterns for:

- **Type safety** with full TypeScript definitions
- **Accessibility** with ARIA labels and keyboard navigation
- **Theming** via CSS variables and design tokens
- **Composition** with flexible, composable APIs

### Installation

All components are located in `src/components/` and can be imported directly:

```tsx
import { PageLayout } from '@/components/layout/PageLayout';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
```

---

## Layout Components

### PageLayout

**File**: [`src/components/layout/PageLayout.tsx`](../src/components/layout/PageLayout.tsx)

Standardized page layout component with header, breadcrumbs, actions, and content area.

#### API

```tsx
interface PageLayoutProps {
  /** Page title displayed in header */
  title: string;

  /** Optional subtitle below title */
  subtitle?: string;

  /** Breadcrumb navigation items */
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;

  /** Action buttons displayed in header (right side) */
  actions?: React.ReactNode;

  /** Page content */
  children: React.ReactNode;

  /** Optional className for container */
  className?: string;
}
```

#### Example Usage

```tsx
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function VehiclesPage() {
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Vehicle
        </Button>
      }
    >
      <VehicleTable />
    </PageLayout>
  );
}
```

#### Features

- Responsive header with title/subtitle
- Breadcrumb navigation with optional links
- Action button positioning (top-right)
- Consistent spacing and layout
- Mobile-responsive design

---

## UI Components

### EmptyState

**File**: [`src/components/ui/empty-state.tsx`](../src/components/ui/empty-state.tsx)

Consistent empty state pattern for lists, tables, and containers with no data.

#### API

```tsx
interface EmptyStateProps {
  /** Icon component from lucide-react */
  icon?: React.ComponentType<{ className?: string }>;

  /** Title text */
  title: string;

  /** Optional description text */
  description?: string;

  /** Optional CTA button or action */
  action?: React.ReactNode;

  /** Visual variant */
  variant?: 'default' | 'dashed';

  /** Optional className */
  className?: string;
}
```

#### Example Usage

```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Basic empty state
<EmptyState
  icon={Package}
  title="No vehicles found"
  description="Add your first vehicle to get started"
/>

// With action button
<EmptyState
  icon={Package}
  title="No vehicles found"
  description="Add your first vehicle to get started"
  action={
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add Vehicle
    </Button>
  }
/>

// Dashed variant for file uploads
<EmptyState
  variant="dashed"
  title="Drop files here"
  description="or click to browse"
/>
```

#### Features

- Accessibility: `role="status"` and `aria-label`
- Optional icon display
- Two visual variants (default, dashed)
- Centered layout with consistent spacing
- Support for action buttons

---

### PaginationControls

**File**: [`src/components/ui/pagination-controls.tsx`](../src/components/ui/pagination-controls.tsx)

Standardized pagination UI with page info and navigation controls.

#### API

```tsx
interface PaginationControlsProps {
  /** Current page (1-indexed) */
  currentPage: number;

  /** Total number of pages */
  totalPages: number;

  /** Total number of items */
  totalItems: number;

  /** Items per page */
  pageSize: number;

  /** Callback when page changes */
  onPageChange: (page: number) => void;

  /** Optional loading state */
  isLoading?: boolean;

  /** Optional className */
  className?: string;
}
```

#### Hook: usePagination

```tsx
interface UsePaginationProps {
  /** Items per page */
  pageSize: number;

  /** Total number of items */
  totalItems: number;

  /** Optional initial page (default: 1) */
  initialPage?: number;
}

interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  startIndex: number;
  endIndex: number;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}
```

#### Example Usage

```tsx
import { PaginationControls, usePagination } from '@/components/ui/pagination-controls';

export function VehicleTable({ vehicles }: { vehicles: Vehicle[] }) {
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
    <div>
      <Table data={paginatedVehicles} />
      <PaginationControls {...pagination} />
    </div>
  );
}
```

#### Features

- Built-in state management via `usePagination` hook
- Page info display ("Showing 1-50 of 237 items")
- Previous/Next navigation buttons
- Disabled states when at boundaries
- Loading state support

---

### Badge

**File**: [`src/components/ui/badge.tsx`](../src/components/ui/badge.tsx)

Enhanced badge component with semantic variants.

#### API

```tsx
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Badge visual variant */
  variant?:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'success'
    | 'warning'
    | 'info';
}
```

#### Example Usage

```tsx
import { Badge } from '@/components/ui/badge';

// Semantic variants
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Failed</Badge>
<Badge variant="info">In Progress</Badge>

// Using with design tokens
import { getBadgeVariant } from '@/lib/designTokens';

const status = 'active';
<Badge variant={getBadgeVariant(status)}>
  {status}
</Badge>
```

#### Variants

| Variant | Background | Text | Use Case |
|---------|------------|------|----------|
| `default` | Primary | White | Default actions |
| `secondary` | Muted | Foreground | Secondary info |
| `destructive` | Red | White | Errors, failures |
| `outline` | Transparent | Foreground | Neutral status |
| `success` | Green | White | Success states |
| `warning` | Yellow/Orange | White | Warnings |
| `info` | Blue | White | Informational |

---

### Alert

**File**: [`src/components/ui/alert.tsx`](../src/components/ui/alert.tsx)

Enhanced alert component with semantic variants.

#### API

```tsx
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Alert visual variant */
  variant?:
    | 'default'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'info';
}
```

#### Example Usage

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

// Success alert
<Alert variant="success">
  <CheckCircle className="h-4 w-4" />
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>
    Vehicle added successfully
  </AlertDescription>
</Alert>

// Warning alert
<Alert variant="warning">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Warning</AlertTitle>
  <AlertDescription>
    Vehicle fuel level is low
  </AlertDescription>
</Alert>

// Error alert
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Failed to load vehicles
  </AlertDescription>
</Alert>
```

---

## Loading States

### LoadingState

**File**: [`src/components/ui/loading-state.tsx`](../src/components/ui/loading-state.tsx)

Standardized loading spinner with message support.

#### API

```tsx
interface LoadingStateProps {
  /** Optional loading message */
  message?: string;

  /** Size variant */
  size?: 'sm' | 'default' | 'lg';

  /** Full-height container (min-h-[400px]) */
  fullHeight?: boolean;

  /** Optional className */
  className?: string;

  /** Optional spinner className */
  spinnerClassName?: string;
}
```

#### Example Usage

```tsx
import { LoadingState } from '@/components/ui/loading-state';

// Basic loading state
{isLoading ? (
  <LoadingState message="Loading vehicles..." />
) : (
  <VehicleTable vehicles={vehicles} />
)}

// Small inline loading
<LoadingState
  message="Saving..."
  size="sm"
  fullHeight={false}
/>

// Large page loading
<LoadingState
  message="Loading dashboard..."
  size="lg"
/>
```

#### Variants

**InlineLoadingState**: For small components or cards
```tsx
import { InlineLoadingState } from '@/components/ui/loading-state';

<InlineLoadingState message="Loading..." />
```

**TableLoadingState**: For data tables
```tsx
import { TableLoadingState } from '@/components/ui/loading-state';

<TableLoadingState message="Loading data..." />
```

**PageLoadingState**: For full-page loads
```tsx
import { PageLoadingState } from '@/components/ui/loading-state';

<PageLoadingState message="Loading page..." />
```

#### Features

- Accessibility: `role="status"`, `aria-live="polite"`, `aria-label`
- Screen reader text with `sr-only`
- Three size variants (sm, default, lg)
- Optional full-height container
- Respects `prefers-reduced-motion`

---

### Skeleton

**File**: [`src/components/ui/skeleton.tsx`](../src/components/ui/skeleton.tsx)

Base skeleton component for loading placeholders.

#### API

```tsx
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}
```

#### Example Usage

```tsx
import { Skeleton } from '@/components/ui/skeleton';

// Basic skeleton
<Skeleton className="h-12 w-full" />

// Custom skeleton shapes
<div className="space-y-2">
  <Skeleton className="h-4 w-[250px]" />
  <Skeleton className="h-4 w-[200px]" />
  <Skeleton className="h-4 w-[150px]" />
</div>

// Circle skeleton (avatar)
<Skeleton className="h-12 w-12 rounded-full" />
```

#### Prebuilt Skeletons

**TableSkeleton**: For data tables
```tsx
import { TableSkeleton } from '@/components/ui/loading-state';

<TableSkeleton rows={5} />
```

**CardSkeleton**: For card grids
```tsx
import { CardSkeleton } from '@/components/ui/loading-state';

<CardSkeleton cards={3} />
```

---

## Design Tokens Integration

### Using Color Tokens

All components support semantic color tokens from [`src/lib/designTokens.ts`](../src/lib/designTokens.ts):

```tsx
import {
  getStatusColors,
  getPriorityColors,
  getVehicleStateColors,
  getDeliveryStatusColors,
  getBadgeVariant
} from '@/lib/designTokens';
import { cn } from '@/lib/utils';

// Status colors
const colors = getStatusColors('active');
<div className={cn(colors.bg, colors.text, colors.border, 'border')}>
  Active
</div>

// Badge variants
const variant = getBadgeVariant('completed');
<Badge variant={variant}>Completed</Badge>

// Vehicle state colors
const vehicleColors = getVehicleStateColors('in_use');
<span className={vehicleColors.text}>In Use</span>
```

### Color Token Functions

#### getStatusColors(status)

Returns background, text, and border classes for status states.

**Statuses**: `'active' | 'inactive' | 'pending' | 'completed' | 'failed' | 'in_progress' | 'cancelled' | 'on_hold'`

#### getPriorityColors(priority)

Returns background, text, and border classes for priority levels.

**Priorities**: `'low' | 'medium' | 'high' | 'urgent'`

#### getVehicleStateColors(state)

Returns background, text, and border classes for vehicle states.

**States**: `'available' | 'in_use' | 'maintenance' | 'out_of_service'`

#### getDeliveryStatusColors(status)

Returns background, text, and border classes for delivery statuses.

**Statuses**: `'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed'`

#### getBadgeVariant(status)

Maps status to Badge component variant.

**Returns**: `'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'`

---

## Usage Guidelines

### ✅ DO

```tsx
// Use PageLayout for consistent page structure
<PageLayout title="Vehicles" breadcrumbs={[...]} actions={<Button>Add</Button>}>
  {content}
</PageLayout>

// Use design tokens for colors
const colors = getStatusColors(status);
<Badge className={cn(colors.bg, colors.text)}>Status</Badge>

// Use semantic Badge variants
<Badge variant={getBadgeVariant(status)}>{status}</Badge>

// Use EmptyState for no-data scenarios
{vehicles.length === 0 && (
  <EmptyState
    icon={Package}
    title="No vehicles"
    action={<Button>Add Vehicle</Button>}
  />
)}

// Use loading states consistently
{isLoading ? (
  <LoadingState message="Loading..." />
) : (
  <Content />
)}

// Use PaginationControls for tables
const pagination = usePagination({ pageSize: 50, totalItems: data.length });
<PaginationControls {...pagination} />
```

### ❌ DON'T

```tsx
// Don't create custom page headers
<div className="flex justify-between mb-8">
  <h1>Vehicles</h1>
  <Button>Add</Button>
</div>

// Don't use hardcoded colors
<Badge className="bg-green-600 text-white">Active</Badge>

// Don't create custom empty states
<div className="text-center py-12 text-muted-foreground">
  No data found
</div>

// Don't use raw spinners
<Loader2 className="animate-spin" />

// Don't build custom pagination
<div>
  <button onClick={() => setPage(page - 1)}>Previous</button>
  <span>Page {page}</span>
  <button onClick={() => setPage(page + 1)}>Next</button>
</div>
```

---

## Accessibility

All components follow WCAG 2.1 Level AA guidelines:

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Focus indicators visible on all focusable elements
- Tab order follows logical reading order

### Screen Reader Support

- Semantic HTML (`role`, `aria-label`, `aria-live`)
- Descriptive button labels (no icon-only buttons without labels)
- Status announcements with `aria-live="polite"`

### Motion

- All animations respect `prefers-reduced-motion`
- Optional motion via Tailwind plugin in [`tailwind.config.ts:134-146`](../tailwind.config.ts#L134-L146)

### Color Contrast

- All text meets 4.5:1 minimum contrast ratio (WCAG AA)
- Semantic colors use CSS variables for theme compatibility

### Component-Specific Accessibility

#### LoadingState
```tsx
<div
  role="status"
  aria-live="polite"
  aria-label={message || 'Loading'}
>
  <Loader2 aria-hidden="true" />
  <span className="sr-only">Loading content, please wait</span>
</div>
```

#### EmptyState
```tsx
<div
  role="status"
  aria-label={title}
>
  {icon && <Icon aria-hidden="true" />}
  <h3>{title}</h3>
  <p>{description}</p>
</div>
```

#### PaginationControls
```tsx
<Button
  disabled={!canGoPrevious}
  aria-label="Go to previous page"
  aria-disabled={!canGoPrevious}
>
  <ChevronLeft aria-hidden="true" />
  Previous
</Button>
```

---

## Testing

### Component Testing with Vitest

```tsx
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/ui/empty-state';
import { Package } from 'lucide-react';

describe('EmptyState', () => {
  it('renders with title and description', () => {
    render(
      <EmptyState
        icon={Package}
        title="No items"
        description="Add your first item"
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Add your first item')).toBeInTheDocument();
  });

  it('renders action button', () => {
    render(
      <EmptyState
        title="No items"
        action={<button>Add Item</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
  });
});
```

### Accessibility Testing

```tsx
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should not have accessibility violations', async () => {
  const { container } = render(<EmptyState title="Test" />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Component Checklist

When creating new components, ensure:

- [ ] Full TypeScript types with JSDoc comments
- [ ] Accessibility attributes (`role`, `aria-label`, `aria-live`)
- [ ] Design token usage (no hardcoded colors)
- [ ] Responsive design (mobile-first)
- [ ] Loading/error/empty states
- [ ] Keyboard navigation support
- [ ] Focus visible styles
- [ ] Screen reader text where needed
- [ ] `prefers-reduced-motion` respect
- [ ] Unit tests with accessibility checks
- [ ] Documentation with examples
- [ ] Usage in Storybook (if available)

---

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Tailwind CSS](https://tailwindcss.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Inclusive Components](https://inclusive-components.design/)
- [Design Tokens Reference](./DESIGN_TOKENS.md)
- [Component Usage Guide](./COMPONENT_USAGE.md)

---

**Last Updated**: December 2025
**Maintained By**: BIKO Engineering Team
**Questions?** See [COMPONENT_USAGE.md](./COMPONENT_USAGE.md) for practical examples.
