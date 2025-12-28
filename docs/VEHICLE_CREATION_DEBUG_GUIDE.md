# Vehicle Creation Debug Guide

**Issue**: Vehicle creation failing with "Creation Failed" error

---

## Debugging Steps

### 1. Open Browser Console

1. Open the vehicle configurator dialog
2. Open Chrome DevTools (F12 or Cmd+Option+I)
3. Go to the **Console** tab
4. Click "Save & Continue" in the configurator

### 2. Check Console Output

You should see detailed logging like this:

```
=== VehicleConfiguratorDialog ===
Raw formData from configurator: {
  "category_id": "...",
  "model_name": "...",
  "license_plate": "...",
  ...
}

Transformed vehicleData to send: {
  "model": "...",
  "make": "...",
  "vehicle_type": "truck",
  ...
}
=================================

Creating vehicle with data: {
  ...
}
```

### 3. Look for Missing Required Fields

Check if any of these required fields are **null**, **undefined**, or empty string:

**Required by Database**:
- `make` - Must be non-empty string
- `model` - Must be non-empty string
- `year` - Must be a number (1900 to current year + 1)
- `license_plate` - Must be non-empty string
- `vehicle_type` - Must be one of: 'sedan', 'suv', 'truck', 'van', 'motorcycle', 'bus', 'other'
- `fuel_type` - Must be one of: 'gasoline', 'diesel', 'electric', 'hybrid', 'cng', 'lpg'
- `acquisition_date` - Must be valid date string (YYYY-MM-DD)
- `acquisition_type` - Must be one of: 'purchase', 'lease', 'donation', 'transfer'
- `status` - Must be one of: 'available', 'in_use', 'maintenance', 'out_of_service', 'disposed'
- `current_mileage` - Must be a number

### 4. Check for Supabase Errors

Look for:
```
Supabase error creating vehicle: {
  code: "...",
  message: "...",
  details: "..."
}
```

Common error codes:
- `23502` - NOT NULL violation (missing required field)
- `23505` - Unique constraint violation (duplicate license_plate or vehicle_id)
- `23503` - Foreign key violation (invalid category_id or vehicle_type_id)
- `23514` - Check constraint violation (invalid enum value)

---

## Common Issues and Fixes

### Issue 1: "NOT NULL violation" Error

**Symptom**: Error message contains `null value in column "field_name" violates not-null constraint`

**Fix**: The configurator didn't provide a required field. Check the field mapping in VehicleConfiguratorDialog.tsx

**Example**:
```
ERROR: null value in column "year" violates not-null constraint
```

**Solution**: Ensure the configurator's form includes the year field and it's being passed correctly:
```typescript
// In getFormData():
year: year,  // Make sure this is set

// In handleSave (VehicleConfiguratorDialog):
year: (formData.year && typeof formData.year === 'number')
  ? formData.year
  : currentYear,  // This should provide default
```

### Issue 2: "Invalid enum value" Error

**Symptom**: Error message contains `invalid input value for enum`

**Fix**: One of the enum fields has an invalid value

**Example**:
```
ERROR: invalid input value for enum vehicle_type: "Large Van M2"
```

**Solution**: The value needs to be one of the exact enum values. Update the mapping:
```typescript
vehicle_type: 'van',  // Not "Large Van M2"
```

### Issue 3: "Unique constraint violation" Error

**Symptom**: Error message contains `duplicate key value violates unique constraint`

**Fix**: License plate or vehicle_id already exists

**Example**:
```
ERROR: duplicate key value violates unique constraint "vehicles_license_plate_key"
```

**Solution**: Use a different license plate or let the system generate a unique temp one

### Issue 4: Field Name Mismatch

**Symptom**: Required field shows as undefined in transformed data

**Check**: The configurator might be using different field names

**Example**:
```json
// Raw formData uses:
{
  "date_acquired": "2025-12-13"  // Wrong name
}

// But we expect:
{
  "acquisition_date": "2025-12-13"  // Correct name
}
```

**Solution**: Update the field mapping in VehicleConfigurator Dialog:
```typescript
acquisition_date: formData.acquisition_date || formData.date_acquired || new Date().toISOString().split('T')[0],
```

---

## Field Mapping Reference

| Configurator Field | Database Field | Type | Required | Default |
|-------------------|----------------|------|----------|---------|
| `model_name` | `model` | string | Yes | 'Unknown' |
| `model_name` (first word) | `make` | string | Yes | 'Unknown' |
| `license_plate` | `license_plate` | string | Yes | `TEMP-XXXXXX` |
| `year` | `year` | number | Yes | Current year |
| `fuel_type` | `fuel_type` | enum | Yes | 'diesel' |
| `transmission` | `transmission` | enum | No | 'manual' |
| `date_acquired` | `acquisition_date` | string | Yes | Today |
| `acquisition_mode` | `acquisition_type` | enum | Yes | 'purchase' |
| `vehicle_name` | `vehicle_id` | string | No | `VEH-timestamp` |
| - | `vehicle_type` | enum | Yes | 'truck' |
| - | `status` | enum | Yes | 'available' |
| - | `current_mileage` | number | Yes | 0 |

---

## Step-by-Step Fix Process

### Step 1: Identify the Issue

1. Look at the console logs
2. Find which field is causing the problem
3. Note if it's null/undefined or has wrong value

### Step 2: Check Configurator Form

1. Open [src/hooks/useVehicleConfiguratorStore.ts](../src/hooks/useVehicleConfiguratorStore.ts)
2. Find `getFormData()` function (around line 326)
3. Check if the field is being included
4. Check the field name

### Step 3: Check Field Mapping

1. Open [src/components/vlms/vehicles/VehicleConfiguratorDialog.tsx](../src/components/vlms/vehicles/VehicleConfiguratorDialog.tsx)
2. Find `handleSave()` function (line 31)
3. Check the `vehicleData` object (line 40)
4. Verify the field is being mapped correctly

### Step 4: Add Default Value

If a required field might be missing, add a default:

```typescript
// Example for a potentially missing field
vehicle_type: formData.vehicle_type || 'truck',
transmission: formData.transmission || 'manual',
```

### Step 5: Test

1. Save the changes
2. Refresh the browser
3. Try creating a vehicle again
4. Check console logs again

---

## Quick Fixes for Common Missing Fields

Add these to `vehicleData` in VehicleConfiguratorDialog.tsx if they're missing:

```typescript
const vehicleData = {
  // ... existing fields ...

  // If acquisition_date is missing:
  acquisition_date: formData.acquisition_date ||
                   formData.date_acquired ||
                   new Date().toISOString().split('T')[0],

  // If acquisition_type is missing:
  acquisition_type: formData.acquisition_type ||
                   formData.acquisition_mode ||
                   'purchase',

  // If year is missing or invalid:
  year: (formData.year && typeof formData.year === 'number' &&
         formData.year >= 1900 && formData.year <= currentYear + 1)
    ? formData.year
    : currentYear,

  // If fuel_type is missing:
  fuel_type: (formData.fuel_type && validFuelTypes.includes(formData.fuel_type))
    ? formData.fuel_type
    : 'diesel',
};
```

---

## Validation Checklist

Before the vehicle can be saved, verify:

- [ ] Category is selected
- [ ] Dimensions are filled OR manual capacity is provided
- [ ] Model name is not empty
- [ ] License plate is not empty (or auto-generated)
- [ ] Year is a valid number (1900 to current year + 1)
- [ ] Fuel type is a valid enum value
- [ ] Acquisition date is in YYYY-MM-DD format
- [ ] Acquisition type is a valid enum value

The configurator's `isValid()` function checks these. If it returns `false`, the save button should be disabled.

---

## Next Steps After Fix

Once you identify the issue:

1. Update the field mapping in VehicleConfiguratorDialog
2. Add appropriate defaults
3. Test with minimal data
4. Test with full data
5. Document any field name changes

---

**Last Updated**: December 13, 2025
**Status**: Debug logging enabled - ready for testing
