# Driver Update Fix - 2026-03-10

## Problem
When updating driver information (email, date of birth, address, license number, etc.):
1. The update appeared to work initially
2. But when closing and reopening the edit dialog, all the entered values were gone

## Root Cause
Two issues were preventing driver updates from working properly:

### Issue 1: Missing Database Columns
The migration `20251125000000_driver_documents_and_extended_fields.sql` had a syntax error that prevented extended driver fields from being added to the database.

**Invalid SQL:**
```sql
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS
  email VARCHAR(255),
  address_line1 TEXT,
  ...
```

This syntax is invalid in PostgreSQL - you can't use a single `ADD COLUMN IF NOT EXISTS` with comma-separated columns.

### Issue 2: Incomplete Data Mapping
The `useDrivers` hook was only mapping a subset of columns from the database to the TypeScript `Driver` type. It was missing:
- Personal: `middleName`, `dateOfBirth`
- License: `licenseNumber`, `licenseState`
- Employment: `employer`, `position`, `employmentType`, `groupName`, `startDate`, `preferredServices`, `federalId`
- Address: `addressLine1`, `addressLine2`, `city`, `stateProvince`, `country`, `postalCode`
- Emergency: `emergencyContactName`, `emergencyContactPhone`
- Profile: `profilePhotoUrl`, `documentsComplete`

**Result:** When the dialog reopened, `useDrivers` would fetch fresh data but wouldn't include these fields, making them appear as if they were never saved.

## Solution

### 1. Created New Migration
Created `20260310000004_fix_drivers_extended_fields.sql` with proper syntax:
```sql
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS address_line1 TEXT;
-- ... one statement per column
```

### 2. Fixed useDriverManagement Hook
Updated the `updateDriver` mutation in `src/hooks/useDriverManagement.tsx` to properly filter data before sending to Supabase, similar to how `createDriver` works.

### 3. Fixed useDrivers Hook
Updated `src/hooks/useDrivers.tsx` to map ALL driver columns from the database:
- Added proper TypeScript typing with `DriverRow` type
- Mapped all 23 additional fields that were previously missing
- Now properly transforms snake_case database columns to camelCase TypeScript properties

## Files Modified
1. `supabase/migrations/20260310000004_fix_drivers_extended_fields.sql` (new)
2. `src/hooks/useDriverManagement.tsx` (updated)
3. `src/hooks/useDrivers.tsx` (updated)
4. `src/types/supabase.ts` (regenerated)

## Testing
After these fixes:
1. Edit a driver and update any fields (email, DOB, address, etc.)
2. Save the changes
3. Close the dialog
4. Reopen the edit dialog for the same driver
5. All previously entered values should now be present and persist correctly

## Technical Details
- Migration applied: `supabase db push --include-all`
- Types regenerated: `supabase gen types typescript --project-id cenugzabuzglswikoewy > src/types/supabase.ts`
- All extended driver fields are now properly stored and retrieved
