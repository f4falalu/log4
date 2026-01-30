# Driver Execution Layer Migration Summary

## Migration: `20260130000002_driver_execution_layer.sql`

---

## What Was Built

### 1. Enums
- `driver_status` — State machine (7 states)
- `event_type` — Allowed events (8 types)

### 2. Tables

#### `driver_sessions`
- One active session per driver (enforced via partial unique index)
- Tracks device ID, tokens, invalidation
- Device change allowed, concurrent sessions denied

#### `driver_events`
- Append-only event log
- Links driver + batch + session
- Supports offline sync (recorded_at vs synced_at)
- Geo-fence validation flag (flagged_for_review)

#### `delivery_batches` (extended)
New columns:
- `driver_status` (current execution state)
- `current_stop_index` (route progress)
- `actual_start_time` / `actual_end_time` (execution timeline)
- `execution_metadata` (flexible storage)

### 3. Functions

#### `validate_driver_state_transition()`
- Enforces state machine on event insert
- Validates driver assignment
- Updates batch status atomically
- Blocks invalid transitions

#### `update_session_activity()`
- Bumps `last_active_at` on event
- Enables session timeout logic

### 4. Triggers
- State validation on `driver_events` insert
- Session activity update on event
- Timestamp management

### 5. RLS Policies
- Drivers see only their data
- Workspace members see workspace events
- Supervisor policies ready for role-based expansion

---

## State Machine (Enforced)

```
INACTIVE → ACTIVE (login)
ACTIVE → EN_ROUTE (ROUTE_STARTED)
EN_ROUTE ↔ AT_STOP (ARRIVED_AT_STOP / DEPARTED_STOP)
EN_ROUTE → DELAYED (DELAY_REPORTED)
DELAYED → EN_ROUTE (resume)
EN_ROUTE → COMPLETED (ROUTE_COMPLETED)
* → SUSPENDED (SUPERVISOR_OVERRIDE)
* → INACTIVE (ROUTE_CANCELLED, not from COMPLETED)
```

### Event → Status Mapping

| Event | Required From | Transitions To |
|-------|--------------|----------------|
| ROUTE_STARTED | INACTIVE, ACTIVE | EN_ROUTE |
| ARRIVED_AT_STOP | EN_ROUTE | AT_STOP |
| DEPARTED_STOP | AT_STOP | EN_ROUTE |
| DELAY_REPORTED | EN_ROUTE, AT_STOP | DELAYED |
| ROUTE_COMPLETED | EN_ROUTE, AT_STOP, DELAYED | COMPLETED |
| ROUTE_CANCELLED | Any except COMPLETED | INACTIVE |
| SUPERVISOR_OVERRIDE | Any | Any (logged) |
| PROOF_CAPTURED | Any | No change |

---

## State Validation Function

### What It Does
1. Checks driver is assigned to batch
2. Validates current batch status allows event
3. Enforces event → status transition rules
4. Updates batch status + timestamps atomically
5. Raises exception on invalid transition

### Example Validation

```sql
-- This will succeed
INSERT INTO driver_events (driver_id, batch_id, event_type, driver_status, recorded_at)
VALUES (driver_uuid, batch_uuid, 'ROUTE_STARTED', 'EN_ROUTE', NOW());
-- Batch status: INACTIVE → EN_ROUTE ✓

-- This will fail
INSERT INTO driver_events (driver_id, batch_id, event_type, driver_status, recorded_at)
VALUES (driver_uuid, batch_uuid, 'ARRIVED_AT_STOP', 'AT_STOP', NOW());
-- Error: Cannot arrive at stop from status INACTIVE ✗
```

---

## RLS Summary

### `driver_sessions`

| Action | Policy |
|--------|--------|
| SELECT | Driver sees own sessions |
| INSERT | Driver can create own sessions |
| UPDATE | Driver can update own sessions |
| DELETE | No policy (prevent deletion) |

### `driver_events`

| Action | Policy |
|--------|--------|
| SELECT | Driver sees own events **OR** workspace member sees workspace events |
| INSERT | Driver can insert own events |
| UPDATE | No policy (append-only) |
| DELETE | No policy (append-only) |

### Security Model
- Drivers authenticated via `auth.uid()`
- Workspace scoping via `workspace_members` join
- Supervisor policies ready for role column (future)
- No DELETE policies = audit-safe

---

## What This Enables

### For Drivers (Mobile PWA)
- ✓ Single active session enforcement
- ✓ Device switch without supervisor (if not on route)
- ✓ Offline event queuing (synced later)
- ✓ State-driven UI (EN_ROUTE shows nav, AT_STOP shows proof capture)

### For Supervisors (MOD4)
- ✓ Real-time driver status visibility
- ✓ Event audit trail
- ✓ Flagged event review queue
- ✓ Force session invalidation
- ✓ Override state transitions (logged)

### For System (BIKO)
- ✓ Immutable event log
- ✓ State machine enforcement
- ✓ Geo-fence validation ready
- ✓ Replay-safe execution audit

---

## Indexes Created

### Performance
- `driver_sessions(driver_id)` — session lookup
- `driver_events(driver_id, batch_id, session_id)` — event queries
- `driver_events(recorded_at DESC)` — timeline queries
- `driver_events(flagged_for_review) WHERE TRUE` — review queue
- `delivery_batches(driver_status)` — status dashboards

---

## Migration Safety

### Idempotent Operations
- Enums: Create if not exists (no evolution in this migration due to PostgreSQL transaction limitations)
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS` (all indexes)
- Column additions wrapped in existence checks
- `DROP POLICY IF EXISTS` before create
- `DROP TRIGGER IF EXISTS` before create
- `CREATE OR REPLACE FUNCTION`

### Known Limitation: Partial Migration Recovery

If this migration failed partway through due to enum issues, you may have incomplete enum types.

**Symptoms:**
- Error: `unsafe use of new value "X" of enum type`
- Enums exist but tables don't

**Fix:**
Run the cleanup script first, then re-run the migration:

```bash
# From supabase/migrations directory
psql $DATABASE_URL -f 20260130000002_cleanup.sql
psql $DATABASE_URL -f 20260130000002_driver_execution_layer.sql
```

Or via Supabase CLI:
```bash
supabase db reset  # WARNING: Destroys all data
```

### No Data Loss
- All new tables (no destructive changes)
- Extends existing `delivery_batches` (additive only)
- Default values for new columns

### Rollback Strategy
If needed, reverse with:
```sql
DROP TABLE driver_events CASCADE;
DROP TABLE driver_sessions CASCADE;
ALTER TABLE delivery_batches DROP COLUMN driver_status;
-- (drop other columns)
DROP TYPE event_type;
DROP TYPE driver_status;
```

---

## Next Steps (Not Built Yet)

### Immediate Dependencies
1. Driver credential table (username + PIN hash)
2. Device change flow (UI + API)
3. Supervisor role enforcement (role column)
4. Geo-fence validation logic

### Future Enhancements
1. Session timeout (based on `last_active_at`)
2. Token rotation on reconnect
3. Offline event signature validation
4. Route hijack detection (rapid location change)

---

## Testing Checklist

- [ ] Driver can create session
- [ ] Second session invalidates first
- [ ] Session blocked if driver is EN_ROUTE
- [ ] ROUTE_STARTED transitions INACTIVE → EN_ROUTE
- [ ] Cannot ARRIVE_AT_STOP from INACTIVE (validation error)
- [ ] ROUTE_COMPLETED sets actual_end_time
- [ ] Unassigned driver cannot insert event (validation error)
- [ ] Driver sees only own events (RLS)
- [ ] Workspace member sees workspace events (RLS)
- [ ] Supervisor override allows any transition

---

**Migration Complete.**
State machine locked. Session model enforced. Execution handshake ready.
