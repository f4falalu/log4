# Enterprise RBAC Architecture for Log4/BIKO Platform

## Overview

This document defines the complete Role-Based Access Control (RBAC) architecture for the Log4 logistics platform, based on industry patterns from Salesforce, mSupply, e2Open, and Fleetbase.

## Architecture Principles

1. **Separation of Concerns**: Identity ≠ Authorization ≠ Data Scope
2. **Action-Based Permissions**: Not page-based, but action-based (e.g., `requisition.approve`)
3. **Flexible Assignment**: Roles + Permission Sets (additive)
4. **Contextual Scoping**: Permissions scoped by warehouse/program/zone
5. **Audit Everything**: All state changes logged
6. **Workflow Guards**: State machine enforcement

## Data Model

### Core Entities

```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       ├──────────┬────────────┬───────────────┐
       │          │            │               │
┌──────▼──────┐  │            │               │
│ user_roles  │  │            │               │
└──────┬──────┘  │            │               │
       │         │            │               │
┌──────▼──────┐  │            │               │
│    Roles    │  │            │               │
└──────┬──────┘  │            │               │
       │         │            │               │
┌──────▼─────────▼──────┐     │               │
│  role_permissions     │     │               │
└──────┬────────────────┘     │               │
       │                      │               │
┌──────▼──────┐               │               │
│ Permissions │      ┌────────▼────────────┐  │
└─────────────┘      │ user_permission_sets│  │
                     └────────┬────────────┘  │
                              │               │
                     ┌────────▼────────────┐  │
                     │  permission_sets    │  │
                     └────────┬────────────┘  │
                              │               │
                     ┌────────▼────────────────▼─────┐
                     │ permission_set_permissions    │
                     └───────────────────────────────┘
```

### 1. Permissions Table

Master catalog of all possible actions in the system.

```sql
permissions
- id: uuid
- resource: text (e.g., 'requisition', 'batch', 'invoice')
- action: text (e.g., 'create', 'approve', 'dispatch')
- code: text (e.g., 'requisition.approve') -- resource.action
- description: text
- category: text (e.g., 'SYSTEM', 'INVENTORY', 'FLEETOPS')
- is_dangerous: boolean -- flags risky actions
- created_at: timestamp
```

### 2. Roles Table

Named groupings of permissions. Admin-defined, not hardcoded.

```sql
roles
- id: uuid
- name: text
- code: text (slug, e.g., 'system_admin')
- description: text
- organization_id: uuid
- is_system_role: boolean -- true for default roles
- created_at: timestamp
- updated_at: timestamp
```

### 3. Role Permissions (Junction)

```sql
role_permissions
- id: uuid
- role_id: uuid -> roles
- permission_id: uuid -> permissions
- created_at: timestamp
UNIQUE(role_id, permission_id)
```

### 4. User Roles (Current - Enhanced)

```sql
user_roles
- id: uuid
- user_id: uuid -> auth.users
- role_id: uuid -> roles
- assigned_by: uuid -> auth.users
- assigned_at: timestamp
UNIQUE(user_id, role_id)
```

### 5. Permission Sets

Salesforce-style additive privilege layer.

```sql
permission_sets
- id: uuid
- name: text
- code: text
- description: text
- organization_id: uuid
- is_active: boolean
- created_at: timestamp
- updated_at: timestamp
```

### 6. Permission Set Permissions (Junction)

```sql
permission_set_permissions
- id: uuid
- permission_set_id: uuid -> permission_sets
- permission_id: uuid -> permissions
- created_at: timestamp
UNIQUE(permission_set_id, permission_id)
```

### 7. User Permission Sets (Assignment)

```sql
user_permission_sets
- id: uuid
- user_id: uuid -> auth.users
- permission_set_id: uuid -> permission_sets
- assigned_by: uuid -> auth.users
- assigned_at: timestamp
- expires_at: timestamp (nullable)
UNIQUE(user_id, permission_set_id)
```

### 8. Scope Bindings

Contextual data access restrictions.

```sql
user_scope_bindings
- id: uuid
- user_id: uuid -> auth.users
- scope_type: text ('warehouse', 'program', 'zone', 'facility')
- scope_id: uuid
- assigned_by: uuid -> auth.users
- assigned_at: timestamp
UNIQUE(user_id, scope_type, scope_id)
```

### 9. Audit Logs

Complete state change tracking.

```sql
audit_logs
- id: uuid
- organization_id: uuid
- user_id: uuid -> auth.users
- action: text (permission code, e.g., 'batch.dispatch')
- resource: text (e.g., 'batch')
- resource_id: uuid
- previous_state: jsonb
- new_state: jsonb
- ip_address: inet
- user_agent: text
- timestamp: timestamp
- metadata: jsonb
```

## Permission Catalog (V1)

### System / Admin (5 permissions)

- `system.manage_users`
- `system.manage_roles`
- `system.manage_permissions`
- `system.manage_scopes`
- `system.manage_settings`

### Master Data (5 permissions)

- `item.manage` (create/update/delete)
- `program.manage`
- `warehouse.manage`
- `facility.manage`
- `zone.manage`

### Inventory (3 permissions)

- `inventory.view`
- `inventory.adjust`
- `inventory.transfer`

### Requisition (3 permissions)

- `requisition.create`
- `requisition.approve`
- `requisition.cancel`

### Invoice (2 permissions)

- `invoice.process` (includes create + validate)
- `invoice.cancel`

### Scheduler (3 permissions)

- `schedule.create`
- `schedule.review`
- `schedule.delete`

### Batch / FleetOps (5 permissions)

- `batch.create`
- `batch.assign` (vehicle + driver)
- `batch.dispatch`
- `batch.complete`
- `batch.cancel`

### Driver Execution (4 permissions)

- `driver.view_assigned`
- `driver.confirm_delivery`
- `driver.record_discrepancy`
- `driver.record_return`

### Reporting (2 permissions)

- `report.view`
- `report.export`

### Total: 32 Permissions (V1)

## Default Roles (V1)

### 1. System Admin

**All permissions**

### 2. Operations User

- item.manage
- program.manage
- inventory.view
- inventory.adjust
- requisition.create
- requisition.approve
- invoice.process
- schedule.create
- schedule.review
- report.view

**Cannot dispatch batches**

### 3. FleetOps User

- inventory.view
- batch.create
- batch.assign
- batch.dispatch
- batch.complete
- batch.cancel
- report.view

**Cannot modify requisitions or invoices**

### 4. Driver

- driver.view_assigned
- driver.confirm_delivery
- driver.record_discrepancy
- driver.record_return

**Mobile-only execution**

## Permission Calculation

```typescript
function getUserEffectivePermissions(userId: string): string[] {
  // Get permissions from roles
  const rolePermissions = getRolePermissions(userId);

  // Get permissions from permission sets
  const permissionSetPermissions = getPermissionSetPermissions(userId);

  // Union (additive)
  return [...new Set([...rolePermissions, ...permissionSetPermissions])];
}
```

## Scope Enforcement

```typescript
function canAccessResource(
  userId: string,
  permission: string,
  resource: { warehouse_id?: string, program_id?: string }
): boolean {
  // 1. Check permission
  if (!userHasPermission(userId, permission)) return false;

  // 2. Check scope
  const scopes = getUserScopes(userId);

  // If no scopes defined, user has org-wide access
  if (scopes.length === 0) return true;

  // If resource has warehouse, check warehouse scope
  if (resource.warehouse_id) {
    const warehouseScopes = scopes.filter(s => s.scope_type === 'warehouse');
    if (warehouseScopes.length > 0) {
      return warehouseScopes.some(s => s.scope_id === resource.warehouse_id);
    }
  }

  // Similar for program, zone, etc.

  return true;
}
```

## Workflow State Guards

### Requisition State Machine

```
DRAFT → SUBMITTED → APPROVED → CANCELLED
                 ↓
              REJECTED
```

**Transition Rules**:
- `DRAFT → SUBMITTED`: requires `requisition.create`
- `SUBMITTED → APPROVED`: requires `requisition.approve`
- `SUBMITTED → REJECTED`: requires `requisition.approve`
- `APPROVED → CANCELLED`: requires `requisition.cancel`

### Invoice State Machine

```
DRAFT → PROCESSED → CANCELLED
```

**Constraints**:
- Cannot process unless `requisition.status === 'APPROVED'`
- Requires `invoice.process`

### Batch State Machine

```
DRAFT → READY → DISPATCHED → COMPLETED
                           ↓
                       CANCELLED
```

**Transition Guards**:
- `DRAFT → READY`: vehicle assigned AND driver assigned
- `READY → DISPATCHED`: requires `batch.dispatch`
- `DISPATCHED → COMPLETED`: requires `batch.complete`
- Cannot dispatch if schedule not in PRE_BATCH state

### Driver Route State Machine

```
ASSIGNED → STARTED → ARRIVED → DELIVERED → COMPLETED
```

**Guards**:
- Cannot confirm delivery unless batch.status === 'DISPATCHED'
- Requires `driver.confirm_delivery`

## Audit Logging Rules

### Critical Actions (Always Logged)

- All financial state changes (requisition.approve, invoice.process)
- All inventory adjustments (inventory.adjust, inventory.transfer)
- All dispatch actions (batch.dispatch, batch.complete)
- All role/permission changes (role.update, permission.assign)
- All user management (user.create, user.deactivate)

### Audit Log Entry Example

```json
{
  "id": "uuid",
  "user_id": "user-uuid",
  "action": "batch.dispatch",
  "resource": "batch",
  "resource_id": "batch-uuid",
  "previous_state": {
    "status": "READY",
    "dispatched_at": null,
    "dispatched_by": null
  },
  "new_state": {
    "status": "DISPATCHED",
    "dispatched_at": "2026-02-21T10:30:00Z",
    "dispatched_by": "user-uuid"
  },
  "ip_address": "192.168.1.1",
  "timestamp": "2026-02-21T10:30:00Z"
}
```

## API Enforcement Pattern

Every API endpoint must follow this pattern:

```typescript
async function dispatchBatch(batchId: string, userId: string) {
  // 1. Auth check
  if (!userId) throw 401;

  // 2. Permission check
  if (!hasPermission(userId, 'batch.dispatch')) throw 403;

  // 3. Load resource
  const batch = await getBatch(batchId);

  // 4. Scope check
  if (!canAccessResource(userId, 'batch.dispatch', {
    warehouse_id: batch.warehouse_id
  })) throw 403;

  // 5. Workflow guard
  if (batch.status !== 'READY') throw 400;
  if (!batch.driver_id || !batch.vehicle_id) throw 400;

  // 6. Execute
  const previousState = { ...batch };
  batch.status = 'DISPATCHED';
  batch.dispatched_at = now();
  batch.dispatched_by = userId;

  // 7. Audit log
  await createAuditLog({
    user_id: userId,
    action: 'batch.dispatch',
    resource: 'batch',
    resource_id: batchId,
    previous_state: previousState,
    new_state: batch
  });

  // 8. Commit
  await saveBatch(batch);

  return batch;
}
```

## Admin UI Pages

### 1. `/admin/roles` - Role & Permission Matrix

**Left Panel**: List of roles
**Right Panel**: Permission matrix (grouped by category)

Each checkbox toggles permission for selected role.

**Features**:
- Create/edit/delete roles
- Clone existing role
- Search permissions
- Highlight dangerous permissions
- Collapsible category sections

### 2. `/admin/permission-sets` - Permission Sets

**Layout**:
- List of permission sets
- Create/edit permission sets
- Assign users to permission sets
- View which users have each set

### 3. `/admin/users/[id]` - User Management

**Tabs**:
- Profile
- Roles (assign role dropdown)
- Permission Sets (multi-select)
- Scopes (assign warehouse/program/zone access)
- Audit History (user's recent actions)

### 4. `/admin/audit` - Audit Log Viewer

**Filters**:
- User
- Action
- Resource type
- Date range
- IP address

**Features**:
- Export to CSV
- View state diff
- Timeline view
- Real-time updates

## Database Functions

### Permission Checking

```sql
-- Check if user has permission (direct or via role or permission set)
CREATE FUNCTION has_permission(
  _user_id uuid,
  _permission_code text
) RETURNS boolean AS $$
  SELECT EXISTS (
    -- From roles
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id
      AND p.code = _permission_code

    UNION

    -- From permission sets
    SELECT 1
    FROM user_permission_sets ups
    JOIN permission_set_permissions psp ON ups.permission_set_id = psp.permission_set_id
    JOIN permissions p ON psp.permission_id = p.id
    WHERE ups.user_id = _user_id
      AND p.code = _permission_code
      AND (ups.expires_at IS NULL OR ups.expires_at > now())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Get User Effective Permissions

```sql
CREATE FUNCTION get_user_permissions(_user_id uuid)
RETURNS TABLE(permission_code text) AS $$
  -- From roles
  SELECT DISTINCT p.code
  FROM user_roles ur
  JOIN role_permissions rp ON ur.role_id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = _user_id

  UNION

  -- From permission sets
  SELECT DISTINCT p.code
  FROM user_permission_sets ups
  JOIN permission_set_permissions psp ON ups.permission_set_id = psp.permission_set_id
  JOIN permissions p ON psp.permission_id = p.id
  WHERE ups.user_id = _user_id
    AND (ups.expires_at IS NULL OR ups.expires_at > now());
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Audit Trigger

```sql
CREATE FUNCTION create_audit_log() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action,
    resource,
    resource_id,
    previous_state,
    new_state,
    timestamp
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    auth.uid(),
    TG_ARGV[0], -- action code passed to trigger
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD),
    to_jsonb(NEW),
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Migration Strategy

1. **Migration 1**: Create permissions table + seed default 32 permissions
2. **Migration 2**: Create roles table + role_permissions junction
3. **Migration 3**: Migrate existing user_roles to new structure
4. **Migration 4**: Create permission_sets tables
5. **Migration 5**: Create scope_bindings table
6. **Migration 6**: Create audit_logs table + triggers
7. **Migration 7**: Create permission checking functions
8. **Migration 8**: Update RLS policies to use new permission system

## Security Considerations

1. **Never trust frontend**: Always check permissions server-side
2. **Audit dangerous actions**: Flag and log all risky operations
3. **Scope isolation**: Prevent cross-warehouse/program data leakage
4. **State machine integrity**: Enforce workflow guards in database
5. **Immutable audit logs**: Never allow deletion or modification

## Future Enhancements (V2)

- **Multiple roles per user** (currently single role + permission sets)
- **Time-based permissions** (temporary access grants)
- **Conditional permissions** (based on resource attributes)
- **Delegation** (temporary permission delegation to other users)
- **Approval workflows** (multi-step approval chains)
- **Regional scoping** (county/district-level access)

---

**Document Version**: 1.0
**Last Updated**: 2026-02-21
**Author**: Log4 Engineering Team
