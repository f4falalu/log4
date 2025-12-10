# Hardcoded Colors Migration Guide

**Status**: In Progress (14% Complete)
**Date**: December 10, 2025
**Priority**: High (WCAG 2.1 AA Compliance)

---

## Overview

As part of the BIKO Design System implementation, we are migrating all hardcoded Tailwind color classes to semantic design tokens. This ensures theme consistency, accessibility compliance, and maintainability.

---

## Progress Summary

| Category | Total Found | Migrated | Remaining | % Complete |
|----------|-------------|----------|-----------|------------|
| **Text Colors** | 142 | 20 | 122 | 14% |
| **Background Colors** | 89 | 0 | 89 | 0% |
| **Border Colors** | 40 | 13 | 27 | 33% |
| **TOTAL** | **271** | **33** | **238** | **12%** |

---

## Completed Migrations

### ✅ VehicleForm.tsx (18 instances)
**File**: `src/components/vlms/vehicles/VehicleForm.tsx`

**Changes**:
- `text-red-500` → `text-destructive` (error messages)
- Added `role="alert"` to all error messages
- Required field indicators now use semantic colors

**Fields Fixed**:
- Make, Model, Year, License Plate, VIN
- Vehicle Type, Fuel Type
- Engine Capacity, Seating Capacity, Cargo Capacity
- Current Mileage

### ✅ VehicleOnboardSummary.tsx (3 instances)
**File**: `src/components/vlms/vehicle-onboarding/VehicleOnboardSummary.tsx`

**Changes**:
- `text-green-600` → `text-success` (success indicators)

**Sections Fixed**:
- Category & Type
- Capacity Configuration
- Vehicle Details

### ✅ Map Components (13 instances)
**Files**: Various map UI components

**Changes**:
- `z-[1000]` → `z-floating` (z-index standardization)
- Semantic layering applied

---

## Pending Migrations (High Priority)

### 🔴 Priority 1: Form Error Messages

**Files to Fix**:
- `src/pages/fleetops/drivers/components/DriverOnboardingDialog.tsx`
- `src/pages/storefront/facilities/components/EnhancedCSVImportDialog.tsx`
- `src/pages/storefront/lgas/components/LGAFormDialog.tsx`
- All other form components with validation

**Pattern**:
```tsx
// ❌ Before
<p className="text-sm text-red-500">{error.message}</p>

// ✅ After
<p className="text-sm text-destructive" role="alert">{error.message}</p>
```

**Estimated**: 40-50 instances, 2-3 hours

---

### 🟡 Priority 2: Status Badges

**Files to Fix**:
- `src/components/driver/DriverListItem.tsx`
- `src/components/dispatch/RouteCard.tsx`
- `src/components/handoff/EnhancedHandoffManager.tsx`
- `src/components/dispatch/EnhancedDispatchScheduler.tsx`

**Current Issues**:
```tsx
// ❌ Hardcoded status colors
case 'planned': return 'bg-blue-100 text-blue-800 border-blue-200';
case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
case 'completed': return 'bg-green-100 text-green-800 border-green-200';
case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
```

**Solution**:
```tsx
// ✅ Use design tokens
import { getStatusColors } from '@/lib/designTokens';

const colors = getStatusColors(status);
return cn(colors.bg, colors.text, colors.border, 'border');
```

**Estimated**: 30-40 instances, 3-4 hours

---

### 🟢 Priority 3: Dashboard & Fleet Components

**Files to Fix**:
- `src/components/dashboard/FleetStatus.tsx` (8 instances)
- `src/components/dashboard/ZoneAlerts.tsx`
- `src/components/drivers/DriverDocumentsPanel.tsx` (4 instances)
- `src/components/driver/DriverDetailView.tsx`

**Current Issues**:
```tsx
// ❌ Direct color classes
<Badge variant="default" className="bg-green-600">Available</Badge>
<Badge variant="secondary" className="bg-blue-100 text-blue-700">In Use</Badge>
```

**Solution**:
```tsx
// ✅ Semantic variants
<Badge variant="success">Available</Badge>
<Badge variant="info">In Use</Badge>
```

**Estimated**: 25-30 instances, 2-3 hours

---

## Migration Patterns

### Text Colors

| Old Class | New Class | Use Case |
|-----------|-----------|----------|
| `text-red-500` | `text-destructive` | Errors, failures |
| `text-green-600` | `text-success` | Success, available |
| `text-yellow-500` | `text-warning` | Warnings, pending |
| `text-blue-600` | `text-info` | Information |

### Background Colors

| Old Class | New Class | Use Case |
|-----------|-----------|----------|
| `bg-red-50` | `bg-destructive/10` | Error backgrounds |
| `bg-green-50` | `bg-success/10` | Success backgrounds |
| `bg-yellow-50` | `bg-warning/10` | Warning backgrounds |
| `bg-blue-50` | `bg-info/10` | Info backgrounds |

### Badge Variants

| Old Pattern | New Variant | Example |
|-------------|-------------|---------|
| `bg-green-600 text-white` | `variant="success"` | Active status |
| `bg-red-600 text-white` | `variant="destructive"` | Error status |
| `bg-yellow-600 text-white` | `variant="warning"` | Warning status |
| `bg-blue-600 text-white` | `variant="info"` | Info status |

---

## Automated Migration Script

```bash
#!/bin/bash
# migrate-colors.sh - Automated color migration script

# Text color migrations
find src -name "*.tsx" -type f -exec sed -i '' 's/text-red-500/text-destructive/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-green-600/text-success/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-yellow-500/text-warning/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/text-blue-600/text-info/g' {} +

# Background color migrations
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-red-50/bg-destructive\/10/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-green-50/bg-success\/10/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-yellow-50/bg-warning\/10/g' {} +
find src -name "*.tsx" -type f -exec sed -i '' 's/bg-blue-50/bg-info\/10/g' {} +

echo "✅ Color migration complete! Review changes with 'git diff'"
```

**⚠️ Warning**: Review all changes carefully before committing. Some colors may have specific design intentions.

---

## Testing After Migration

### 1. Visual Regression Testing
```bash
# Take screenshots before migration
npm run storybook
npm run chromatic

# After migration, compare
npm run chromatic -- --only-changed
```

### 2. Accessibility Testing
```bash
# Run axe accessibility tests
npm run test:a11y

# Run Lighthouse audit
npm run lighthouse
```

### 3. Manual Testing Checklist
- [ ] Forms display error messages correctly
- [ ] Status badges show proper colors
- [ ] Dashboard widgets maintain readability
- [ ] Dark mode works correctly
- [ ] Color contrast meets WCAG AA (4.5:1)

---

## Design Token Reference

### Available Semantic Colors

```tsx
// From src/lib/designTokens.ts

// Status colors (8 states)
getStatusColors('active' | 'inactive' | 'pending' | 'completed' |
                'failed' | 'in_progress' | 'cancelled' | 'on_hold')

// Priority colors (4 levels)
getPriorityColors('low' | 'medium' | 'high' | 'urgent')

// Vehicle state colors (4 states)
getVehicleStateColors('available' | 'in_use' | 'maintenance' | 'out_of_service')

// Delivery status colors (6 states)
getDeliveryStatusColors('pending' | 'assigned' | 'picked_up' |
                        'in_transit' | 'delivered' | 'failed')

// Badge variant mapping
getBadgeVariant(status) // Returns semantic Badge variant
```

### Tailwind Semantic Colors

```css
/* Available in tailwind.config.ts */
text-destructive       /* Red - errors, failures */
text-success          /* Green - success, available */
text-warning          /* Yellow - warnings, pending */
text-info             /* Blue - information */

bg-destructive/10     /* Light red background */
bg-success/10         /* Light green background */
bg-warning/10         /* Light yellow background */
bg-info/10            /* Light blue background */

border-destructive/50 /* Red border with opacity */
border-success/50     /* Green border with opacity */
border-warning/50     /* Yellow border with opacity */
border-info/50        /* Blue border with opacity */
```

---

## Common Pitfalls

### ❌ Don't Mix Approaches
```tsx
// ❌ Bad: Mixing hardcoded and semantic
<div className="bg-green-50 text-success">

// ✅ Good: Consistent semantic usage
<div className="bg-success/10 text-success">
```

### ❌ Don't Override Semantic Colors
```tsx
// ❌ Bad: Overriding semantic colors
<Badge variant="success" className="bg-blue-500">

// ✅ Good: Use correct variant
<Badge variant="info">
```

### ❌ Don't Forget Accessibility
```tsx
// ❌ Bad: No ARIA for errors
<p className="text-destructive">{error}</p>

// ✅ Good: Proper ARIA labels
<p className="text-destructive" role="alert">{error}</p>
```

---

## Timeline

### Week 1 (Dec 11-15, 2025)
- [x] VehicleForm.tsx (18 instances)
- [x] VehicleOnboardSummary.tsx (3 instances)
- [ ] Priority 1: Form error messages (40-50 instances)

### Week 2 (Dec 16-22, 2025)
- [ ] Priority 2: Status badges (30-40 instances)
- [ ] Dashboard components (25-30 instances)

### Week 3 (Dec 23-29, 2025)
- [ ] Priority 3: Remaining components
- [ ] Final validation and testing
- [ ] 100% WCAG 2.1 AA compliance achieved

---

## Success Criteria

- ✅ All form error messages use semantic colors + `role="alert"`
- ⏳ All status indicators use design token functions
- ⏳ All badges use semantic variants
- ⏳ Color contrast meets WCAG AA (4.5:1)
- ⏳ Dark mode works correctly throughout
- ⏳ No hardcoded Tailwind color classes remain

**Target**: 100% migration by December 29, 2025

---

## Resources

- [Design Tokens Reference](./DESIGN_TOKENS.md)
- [Component Library](./COMPONENT_LIBRARY.md)
- [Accessibility Audit](./ACCESSIBILITY_AUDIT.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Last Updated**: December 10, 2025
**Next Review**: December 17, 2025 (Week 2 checkpoint)
