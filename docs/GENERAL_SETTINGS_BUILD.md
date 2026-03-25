# General Settings Page — Build Reference

## Context

The current General Settings page mixes workspace-level config with user-level preferences (language/timezone) and lacks operational fields that should drive logistics behavior. We restructure into 4 clean sections enforcing strict domain boundaries.

**Principle**: General Settings = "How does THIS workspace operate?" — NOT "How does THIS user prefer things?"

---

## Scope

**Primary file**: `src/pages/settings/general/page.tsx`
**No migration needed** — `org_type` column exists; new fields go in JSONB `settings` column.

---

## Structure: 4 Sections

### Section 1: Workspace Identity

| Field | Type | Storage | Notes |
|-------|------|---------|-------|
| Workspace Name | text input | `workspaces.name` column | Keep as-is |
| State Code | read-only badge | `workspaces.slug` column | Keep as-is |
| Workspace Type | select | `workspaces.org_type` column | NEW — State Program / NGO / Private Ops |

### Section 2: Operational Defaults

| Field | Type | Storage | Notes |
|-------|------|---------|-------|
| Default Dispatch Zone | select (zones) | `settings.default_zone_id` | Keep — move to this section |
| Default Warehouse | select (warehouses) | `settings.default_warehouse_id` | NEW |
| Auto-assign Driver | toggle (Switch) | `settings.auto_assign_driver` | NEW |

### Section 3: Programs

| Field | Type | Storage | Notes |
|-------|------|---------|-------|
| Active Programs | checkbox list | `settings.active_program_ids` | Keep — move to this section |

### Section 4: Operational Calendar

| Field | Type | Storage | Notes |
|-------|------|---------|-------|
| Start of Week | select | `settings.start_of_week` | Keep — move to this section |
| Working Days | Mon–Sun checkboxes | `settings.working_days` | NEW — default Mon–Fri |
| Dispatch Cutoff Time | time input | `settings.dispatch_cutoff` | NEW — e.g. "14:00" |
| Delivery SLA | number input | `settings.sla_hours` | NEW — hours |

### REMOVE from this page

- **Language** → already on Profile page (`src/pages/settings/profile/page.tsx`)
- **Timezone** → already on Profile page

---

## Updated Interface

```ts
interface WorkspaceSettings {
  date_format?: string;
  start_of_week?: string;
  default_zone_id?: string;
  active_program_ids?: string[];
  default_warehouse_id?: string;  // NEW
  auto_assign_driver?: boolean;   // NEW
  working_days?: string[];        // NEW
  dispatch_cutoff?: string;       // NEW ("14:00")
  sla_hours?: number;             // NEW
}
```

No `language` or `timezone` — those are user-level.

---

## Constants

```ts
const ORG_TYPES = [
  { value: 'state_program', label: 'State Program' },
  { value: 'ngo', label: 'NGO' },
  { value: 'private_ops', label: 'Private Ops' },
];

const ALL_DAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];
```

Remove `TIMEZONES` and `LANGUAGES` constants.

---

## Data Queries

### Workspace (update existing)

```ts
.select('id, name, slug, description, settings, org_type')
```

### Warehouses (NEW query)

```ts
supabase
  .from('warehouses')
  .select('id, name')
  .eq('is_active', true)
  .order('name')
```

Warehouse query relies on RLS for workspace scoping — do NOT assume global access.

### Zones & Programs — keep existing queries unchanged.

---

## State Management

```ts
const [name, setName] = useState('');
const [orgType, setOrgType] = useState<string | null>(null);  // NEW
const [settings, setSettings] = useState<WorkspaceSettings>({});
const [hasChanges, setHasChanges] = useState(false);
```

Initialize `orgType` from `workspace.org_type` in useEffect.
Reset `orgType` in Cancel handler.

---

## Mutation

Single save — one `.update()` on `workspaces` table:

```ts
.update({
  name,
  org_type: orgType,
  settings: settings as Record<string, unknown>,
})
.eq('id', workspace.id)
```

### On save — persist defaults:

```ts
// Before saving, ensure working_days has a value
if (!settings.working_days || settings.working_days.length === 0) {
  settings.working_days = ['monday','tuesday','wednesday','thursday','friday'];
}
```

---

## RBAC (MANDATORY)

Page is already behind `<ProtectedRoute permission="workspace.manage">` in App.tsx routing.

Additionally, within the page:

```ts
const { can } = useAbility();
if (!can('workspace.manage')) return null;
```

If unauthorized: hide entire edit capability. Do NOT show disabled fields.

---

## Validation Rules

### Required for operational readiness:

- `default_zone_id` — required (show warning banner if missing)
- `default_warehouse_id` — required (show warning banner if missing)

### On save:

- If `working_days` undefined → persist `['monday','tuesday','wednesday','thursday','friday']`
- `sla_hours` must be positive integer (1–168)
- `dispatch_cutoff` must be valid time string

---

## Error Handling

```ts
onError: (err) => {
  console.error('Failed to save settings:', err);
  toast.error('Failed to save settings');
}
```

Handle mutation failures gracefully — already has this pattern.

---

## Data Usage Contract

These settings MUST be retrievable via a shared pattern:

```ts
getWorkspaceSettings(workspaceId) → WorkspaceSettings
```

They MUST be consumed by batch creation to auto-fill:
- `default_zone_id`
- `default_warehouse_id`

Do NOT hardcode these values anywhere else in the system.

---

## Import Changes

### Add:
- `Switch` from `@/components/ui/switch`

### Remove:
- `Globe` from `lucide-react`

---

## UI Layout

Each section = `<div className="border rounded-lg bg-card">` with heading, wrapping `SettingsSection` rows.
All 4 sections wrapped in `<div className="space-y-6">`.
Header with Save/Cancel buttons stays above.

Reuse existing `SettingsSection` component from `src/components/admin/settings/SettingsSection.tsx`.

---

## Verification Checklist

- [ ] Navigate to `/settings/general` — 4 section cards render
- [ ] Language/timezone fields are gone
- [ ] New fields visible and interactive (Workspace Type, Default Warehouse, Auto-assign Driver, Working Days, Dispatch Cutoff, SLA)
- [ ] Save persists all values (verify in Supabase)
- [ ] Cancel resets all fields including new ones
- [ ] Profile page still has language/timezone independently
- [ ] RBAC: unauthorized users cannot access page
- [ ] Warning shown if required defaults (zone, warehouse) are missing
- [ ] Working days defaults to Mon–Fri if undefined

---

## Strategic Context

This page is NOT just a form — it's the **operational control layer** that feeds:

```
Settings → Batch Creation Defaults → Templates → Routing
```

`org_type` will be used for: template filtering, reporting segmentation (future phases).
`sla_hours` + `dispatch_cutoff` + `working_days` will feed: route planning, batch scheduling, performance analytics (future phases).

---

## Files Reference

| File | Action |
|------|--------|
| `src/pages/settings/general/page.tsx` | MODIFY — sole implementation file |
| `src/components/admin/settings/SettingsSection.tsx` | READ ONLY — reuse for field rows |
| `src/pages/settings/profile/page.tsx` | READ ONLY — confirms language/timezone already there |
| `src/rbac/useAbility.ts` | READ ONLY — import `useAbility` for RBAC guard |
| `src/types/supabase.ts` | READ ONLY — confirms `org_type` exists, warehouse schema |
