# RBAC Implementation Guide

**Status:** ✅ Foundation Complete
**Date:** December 25, 2025

---

## Overview

This guide shows how to use the RBAC (Role-Based Access Control) system throughout the BIKO platform to enforce permissions in the UI.

---

## System Architecture

### 1. Permission Definitions

**File:** `/src/lib/permissions.ts`

```typescript
// 5 Roles
export type AppRole =
  | 'system_admin'      // Full access
  | 'warehouse_officer' // Manage facilities, create batches
  | 'dispatcher'        // Assign drivers, update batches
  | 'driver'            // View assigned batches only
  | 'viewer';           // Read-only access

// 12 Permissions
export type Permission =
  | 'view_batches'
  | 'create_batches'
  | 'update_batches'
  | 'delete_batches'
  | 'assign_drivers'
  | 'manage_drivers'
  | 'manage_vehicles'
  | 'manage_facilities'
  | 'view_reports'
  | 'manage_users'
  | 'view_analytics'
  | 'view_tactical_map';
```

### 2. Permission Mapping

```typescript
const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  system_admin: [
    'view_batches', 'create_batches', 'update_batches', 'delete_batches',
    'assign_drivers', 'manage_drivers', 'manage_vehicles', 'manage_facilities',
    'view_reports', 'manage_users', 'view_analytics', 'view_tactical_map'
  ],
  warehouse_officer: [
    'view_batches', 'create_batches', 'update_batches',
    'assign_drivers', 'manage_facilities', 'view_reports',
    'view_analytics', 'view_tactical_map'
  ],
  dispatcher: [
    'view_batches', 'update_batches', 'assign_drivers',
    'view_reports', 'view_tactical_map'
  ],
  driver: ['view_batches'],
  viewer: ['view_batches', 'view_reports']
};
```

---

## Usage Examples

### Example 1: Protect Entire Routes

**File:** `/src/App.tsx`

```typescript
import { PermissionRoute } from "./components/auth/PermissionRoute";

// Protect admin routes (require manage_users permission)
<Route path="/admin" element={
  <ProtectedRoute>
    <PermissionRoute permission="manage_users">
      <AdminLayout />
    </PermissionRoute>
  </ProtectedRoute>
}>
  <Route path="users" element={<UserManagementPage />} />
  <Route path="locations" element={<LocationManagementPage />} />
</Route>

// Protect dispatch page (require assign_drivers permission)
<Route path="/fleetops/dispatch" element={
  <ProtectedRoute>
    <PermissionRoute permission="assign_drivers">
      <DispatchPage />
    </PermissionRoute>
  </ProtectedRoute>
} />

// Require MULTIPLE permissions (ANY)
<Route path="/fleetops/batches" element={
  <ProtectedRoute>
    <PermissionRoute permission={['create_batches', 'update_batches']}>
      <BatchManagement />
    </PermissionRoute>
  </ProtectedRoute>
} />

// Require MULTIPLE permissions (ALL)
<Route path="/fleetops/fleet-management" element={
  <ProtectedRoute>
    <PermissionRoute
      permission={['manage_drivers', 'manage_vehicles']}
      requireAll
    >
      <FleetManagement />
    </PermissionRoute>
  </ProtectedRoute>
} />
```

---

### Example 2: Hide UI Elements Based on Permissions

**File:** `/src/pages/fleetops/page.tsx`

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

function FleetOpsHome() {
  const { canCreateBatches, canManageDrivers, isAdmin } = usePermissions();

  return (
    <div>
      <h1>FleetOps Dashboard</h1>

      {/* Method 1: Conditional rendering with hook */}
      {canCreateBatches && (
        <Button onClick={handleCreateBatch}>
          Create New Batch
        </Button>
      )}

      {/* Method 2: Using PermissionGuard component (recommended) */}
      <PermissionGuard permission="create_batches">
        <Button onClick={handleCreateBatch}>
          Create New Batch
        </Button>
      </PermissionGuard>

      {/* Method 3: Hide button completely (no error message) */}
      <PermissionGuard permission="delete_batches" hideOnDenied>
        <Button variant="destructive" onClick={handleDeleteBatch}>
          Delete Batch
        </Button>
      </PermissionGuard>

      {/* Show content for admins only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <Button>System Settings</Button>
          </CardContent>
        </Card>
      )}

      {/* Multiple permissions (ANY) */}
      <PermissionGuard permission={['manage_drivers', 'assign_drivers']}>
        <DriverAssignmentPanel />
      </PermissionGuard>

      {/* Multiple permissions (ALL required) */}
      <PermissionGuard
        permission={['manage_vehicles', 'manage_facilities']}
        requireAll
      >
        <FleetConfigurationPanel />
      </PermissionGuard>
    </div>
  );
}
```

---

### Example 3: Disable Form Inputs

**File:** `/src/components/batches/BatchForm.tsx`

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function BatchForm({ batch }: { batch: Batch }) {
  const { canUpdateBatches, canAssignDrivers } = usePermissions();

  return (
    <form>
      <Input
        label="Batch Name"
        value={batch.name}
        disabled={!canUpdateBatches}
      />

      <Select
        label="Assigned Driver"
        value={batch.driver_id}
        disabled={!canAssignDrivers}
      >
        {drivers.map(driver => (
          <SelectItem key={driver.id} value={driver.id}>
            {driver.name}
          </SelectItem>
        ))}
      </Select>

      <Button
        type="submit"
        disabled={!canUpdateBatches}
      >
        Save Changes
      </Button>
    </form>
  );
}
```

---

### Example 4: Navigation Menu with Permissions

**File:** `/src/components/layout/Sidebar.tsx`

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

function Sidebar() {
  const {
    canViewBatches,
    canManageDrivers,
    canManageVehicles,
    canManageFacilities,
    canViewReports,
    isAdmin
  } = usePermissions();

  return (
    <nav>
      {/* Always visible */}
      <NavItem href="/fleetops">
        <Home /> Dashboard
      </NavItem>

      {/* Conditional items */}
      {canViewBatches && (
        <NavItem href="/fleetops/batches">
          <Package /> Batches
        </NavItem>
      )}

      <PermissionGuard permission="manage_drivers" hideOnDenied>
        <NavItem href="/fleetops/drivers">
          <Users /> Drivers
        </NavItem>
      </PermissionGuard>

      <PermissionGuard permission="manage_vehicles" hideOnDenied>
        <NavItem href="/fleetops/vlms/vehicles">
          <Truck /> Vehicles
        </NavItem>
      </PermissionGuard>

      <PermissionGuard permission="manage_facilities" hideOnDenied>
        <NavItem href="/storefront/facilities">
          <Warehouse /> Facilities
        </NavItem>
      </PermissionGuard>

      <PermissionGuard permission="view_reports" hideOnDenied>
        <NavItem href="/fleetops/reports">
          <BarChart /> Reports
        </NavItem>
      </PermissionGuard>

      {/* Admin-only section */}
      {isAdmin && (
        <>
          <Separator />
          <NavItem href="/admin/users">
            <Shield /> User Management
          </NavItem>
          <NavItem href="/admin/locations">
            <MapPin /> Location Management
          </NavItem>
        </>
      )}
    </nav>
  );
}
```

---

### Example 5: Table Actions with Permissions

**File:** `/src/components/batches/BatchTable.tsx`

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

function BatchTable({ batches }: { batches: Batch[] }) {
  const { canUpdateBatches, canDeleteBatches, canAssignDrivers } = usePermissions();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Batch ID</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Driver</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map(batch => (
          <TableRow key={batch.id}>
            <TableCell>{batch.id}</TableCell>
            <TableCell>{batch.status}</TableCell>
            <TableCell>{batch.driver?.name || 'Unassigned'}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* Always visible */}
                  <DropdownMenuItem onClick={() => handleView(batch.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>

                  {/* Conditional items */}
                  {canUpdateBatches && (
                    <DropdownMenuItem onClick={() => handleEdit(batch.id)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}

                  {canAssignDrivers && (
                    <DropdownMenuItem onClick={() => handleAssign(batch.id)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Driver
                    </DropdownMenuItem>
                  )}

                  {canDeleteBatches && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(batch.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

### Example 6: API Request Authorization

**File:** `/src/hooks/useBatches.ts`

```typescript
import { usePermissions } from '@/hooks/usePermissions';

export function useCreateBatch() {
  const { canCreateBatches } = usePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBatchData) => {
      // Check permission before making API call
      if (!canCreateBatches) {
        throw new Error('You do not have permission to create batches');
      }

      const { data: batch, error } = await supabase
        .from('delivery_batches')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch created successfully');
    },
    onError: (error: any) => {
      if (error.message.includes('permission')) {
        toast.error('Access denied: ' + error.message);
      } else {
        toast.error('Failed to create batch');
      }
    },
  });
}
```

---

### Example 7: Custom Permission Logic

**File:** `/src/hooks/useBatchPermissions.ts`

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { Batch } from '@/types';

/**
 * Custom hook for batch-specific permission logic
 */
export function useBatchPermissions(batch?: Batch) {
  const {
    canUpdateBatches,
    canDeleteBatches,
    canAssignDrivers,
    activeRole,
    hasPermission
  } = usePermissions();

  const canEditBatch = (batch?: Batch): boolean => {
    if (!batch) return canUpdateBatches;

    // Can't edit finalized batches
    if (batch.status === 'completed' || batch.status === 'cancelled') {
      return false;
    }

    // Only warehouse officers and admins can edit planned batches
    if (batch.status === 'planned') {
      return canUpdateBatches;
    }

    // Dispatchers can edit in-progress batches
    return canUpdateBatches;
  };

  const canDeleteBatch = (batch?: Batch): boolean => {
    if (!batch) return canDeleteBatches;

    // Can't delete started batches
    if (batch.status !== 'planned') {
      return false;
    }

    return canDeleteBatches;
  };

  const canAssignDriver = (batch?: Batch): boolean => {
    if (!batch) return canAssignDrivers;

    // Can only assign to planned or in-progress batches
    if (batch.status === 'completed' || batch.status === 'cancelled') {
      return false;
    }

    return canAssignDrivers;
  };

  return {
    canEditBatch,
    canDeleteBatch,
    canAssignDriver,
  };
}
```

---

## Best Practices

### 1. Always Check Permissions Client-Side AND Server-Side

```typescript
// ✅ GOOD: Check both places
// Client-side (UI)
{canCreateBatches && <Button onClick={handleCreate}>Create</Button>}

// Server-side (RLS policy in Supabase)
CREATE POLICY "Users can create batches if they have permission"
ON delivery_batches FOR INSERT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('system_admin', 'warehouse_officer')
  )
);
```

### 2. Use PermissionGuard for UI Elements

```typescript
// ✅ GOOD: Declarative and clean
<PermissionGuard permission="manage_users" hideOnDenied>
  <Button>Admin Panel</Button>
</PermissionGuard>

// ❌ BAD: Verbose and error-prone
{hasPermission('manage_users') && <Button>Admin Panel</Button>}
```

### 3. Use PermissionRoute for Pages

```typescript
// ✅ GOOD: Protect entire route
<Route path="/admin" element={
  <ProtectedRoute>
    <PermissionRoute permission="manage_users">
      <AdminPanel />
    </PermissionRoute>
  </ProtectedRoute>
} />

// ❌ BAD: Check inside component (user sees flash)
function AdminPanel() {
  const { isAdmin } = usePermissions();
  if (!isAdmin) return <Navigate to="/" />;
  // ...
}
```

### 4. Provide Clear Feedback

```typescript
// ✅ GOOD: User knows why they can't access
<PermissionRoute permission="manage_users">
  <AdminPanel />
</PermissionRoute>
// Shows: "Access Denied - You don't have permission..."

// ❌ BAD: Silent failure
{canManageUsers && <AdminPanel />}
// Shows: Nothing (confusing)
```

### 5. Disable, Don't Hide Critical Actions

```typescript
// ✅ GOOD: User sees option but can't use it (better UX)
<Button disabled={!canDelete} onClick={handleDelete}>
  Delete
</Button>
{!canDelete && (
  <p className="text-sm text-muted-foreground">
    Only admins can delete this item
  </p>
)}

// ⚠️ OK: Hide for cleaner UI
<PermissionGuard permission="delete_batches" hideOnDenied>
  <Button onClick={handleDelete}>Delete</Button>
</PermissionGuard>
```

---

## Files Created

1. `/src/hooks/usePermissions.ts` - Main permission checking hook
2. `/src/components/auth/PermissionGuard.tsx` - Component-level guard
3. `/src/components/auth/PermissionRoute.tsx` - Route-level guard
4. Updated `/src/App.tsx` - Protected admin routes

---

## Implementation Checklist

### Phase 1: Core Routes (Week 1)
- [x] Protect `/admin/*` routes (manage_users permission)
- [ ] Protect `/fleetops/dispatch` (assign_drivers permission)
- [ ] Protect `/fleetops/batches` (create_batches OR update_batches)
- [ ] Protect `/fleetops/drivers` (manage_drivers permission)
- [ ] Protect `/fleetops/vlms/vehicles` (manage_vehicles permission)
- [ ] Protect `/storefront/facilities` (manage_facilities permission)

### Phase 2: UI Components (Week 2)
- [ ] BatchManagement - hide create/delete buttons
- [ ] DriverManagement - hide onboard/edit buttons
- [ ] VehicleManagement - hide add/remove buttons
- [ ] FacilityManagement - hide create/delete buttons
- [ ] Dispatch - hide assign driver button

### Phase 3: Navigation (Week 2)
- [ ] FleetOps sidebar - hide items based on permissions
- [ ] Storefront sidebar - hide items based on permissions
- [ ] Command palette - filter commands by permissions

### Phase 4: Forms & Actions (Week 3)
- [ ] Batch forms - disable fields based on permissions
- [ ] Driver forms - disable fields based on permissions
- [ ] Vehicle forms - disable fields based on permissions
- [ ] Table actions - hide/disable based on permissions

### Phase 5: Advanced (Week 4)
- [ ] Custom permission logic per batch status
- [ ] Permission-based dashboard widgets
- [ ] Permission-based reports
- [ ] Role switcher UI (for users with multiple roles)

---

## Testing

### Manual Testing

```typescript
// Test as different roles:

// 1. System Admin
localStorage.setItem('test_role', 'system_admin');
// Should see: Everything

// 2. Warehouse Officer
localStorage.setItem('test_role', 'warehouse_officer');
// Should see: Create batches, manage facilities
// Should NOT see: User management

// 3. Dispatcher
localStorage.setItem('test_role', 'dispatcher');
// Should see: Assign drivers, update batches
// Should NOT see: Create batches, delete batches

// 4. Driver
localStorage.setItem('test_role', 'driver');
// Should see: View batches only
// Should NOT see: Any management features

// 5. Viewer
localStorage.setItem('test_role', 'viewer');
// Should see: View batches, view reports
// Should NOT see: Any editing features
```

### Automated Testing

```typescript
// Example unit test
describe('usePermissions', () => {
  it('should allow system_admin all permissions', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper({ role: 'system_admin' })
    });

    expect(result.current.canCreateBatches).toBe(true);
    expect(result.current.canManageUsers).toBe(true);
    expect(result.current.isAdmin).toBe(true);
  });

  it('should restrict driver permissions', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper({ role: 'driver' })
    });

    expect(result.current.canViewBatches).toBe(true);
    expect(result.current.canCreateBatches).toBe(false);
    expect(result.current.canManageUsers).toBe(false);
  });
});
```

---

## Next Steps

1. **Apply to all routes** - Systematically add PermissionRoute to every route
2. **Update navigation menus** - Hide items based on permissions
3. **Protect UI actions** - Hide/disable buttons based on permissions
4. **Add role switcher** - UI for users with multiple roles
5. **Test thoroughly** - Test each role's access level
6. **Document permissions** - Update user guide with permission descriptions

---

**Status:** Foundation complete, ready for systematic rollout
**Next:** Apply permissions to FleetOps and Storefront routes
