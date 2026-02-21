# Integration Page - Testing & Verification Guide

## Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the integration page:**
   ```
   http://localhost:8080/admin/integration
   ```

## What You Should See

### **1. Main Page (Available Integrations Tab)**
- ✅ Stats dashboard with 4 cards:
  - Active Integrations: 1
  - Connected: (number of linked drivers)
  - Pending OTPs: (number)
  - Pending Requests: (number)

- ✅ Three tabs:
  - Available Integrations
  - Current Integrations (with badge showing count)
  - Mod4 Setup (with badge if pending items)

- ✅ Search bar (working)
- ✅ Category filter buttons (All, Supply Chain, Fleet Management, Telemetry, Government, Execution)

- ✅ Integration cards in 3-column grid:
  - mSupply
  - NHLMIS
  - OpenLMIS (Coming Soon)
  - Traccar GPS Server (NEW)
  - GT02 GPS Tracker
  - Fuel Monitoring (NEW)
  - Mod4 Driver System (ACTIVE)

### **2. Integration Cards**
Each card shows:
- Icon
- Name
- Status badge (Active, New, Coming Soon)
- Description
- 3 capabilities
- Button (Add Integration or Configure)

### **3. Configuration Dialog Testing**

#### **Test mSupply:**
1. Click "Add Integration" on mSupply card
2. Dialog opens with title "Add mSupply"
3. **Connection Tab:**
   - mSupply Server URL field
   - Username field
   - Password/API Key field
   - Store ID field
4. **Sync Settings Tab:**
   - Sync Interval slider (5-1440 minutes)
   - Enable Webhooks toggle
   - Webhook URL field (appears when enabled)
5. Click "Test Connection" → Shows success/error indicator
6. Click "Add Integration" → Shows toast notification → Dialog closes

#### **Test NHLMIS:**
1. Click "Add Integration" on NHLMIS card
2. **Connection Tab:**
   - NHLMIS API URL field
   - API Key field
   - Facility ID field
3. Same Sync Settings tab as above

#### **Test Traccar GPS:**
1. Click "Add Integration" on Traccar card
2. **Connection Tab:**
   - Traccar Server URL field
   - Username field
   - Password field
3. Same Sync Settings tab

#### **Test GT02 GPS Tracker:**
1. Click "Add Integration" on GT02 Tracker card
2. **Connection Tab:**
   - **Protocol dropdown** ← CRITICAL TEST
     - Should show: TCP (Recommended), UDP
     - Default: TCP
   - Port field (default 5023)
   - Device IDs field (comma-separated)
3. Same Sync Settings tab

**Expected behavior:**
- ✅ Dropdown opens when clicked
- ✅ Shows both TCP and UDP options
- ✅ Selecting an option updates the field
- ✅ TCP is pre-selected by default

#### **Test Fuel Monitoring:**
1. Click "Add Integration" on Fuel Monitoring card
2. **Connection Tab:**
   - **Sensor Type dropdown** ← CRITICAL TEST
     - Should show: CAN Bus, RS-485, OBD-II, Analog Sensor
     - Default: CAN Bus
   - Gateway/Server URL field (optional)
   - Device/Sensor IDs field (comma-separated)
3. Same Sync Settings tab

**Expected behavior:**
- ✅ Dropdown opens when clicked
- ✅ Shows all 4 sensor type options
- ✅ Selecting an option updates the field
- ✅ CAN Bus is pre-selected by default

### **4. Current Integrations Tab**
- Shows Mod4 Driver System as active
- Displays:
  - Integration name and description
  - Status badge (Active)
  - Last sync time (X minutes/hours ago)
  - Configure button
  - Actions dropdown (Sync Now, Settings, Disable)

### **5. Mod4 Setup Tab**
- All existing functionality preserved:
  - Link by Email button
  - Generate OTP button
  - Linked Users table
  - Pending OTP codes (if any)
  - Onboarding Requests table

## Common Issues & Solutions

### **Issue: Dropdowns Don't Open**

**Symptoms:** Clicking Protocol or Sensor Type dropdown does nothing

**Solutions:**
1. Check browser console for errors (F12)
2. Verify z-index isn't being overridden by CSS
3. Check if `position="popper"` is set on SelectContent
4. Clear browser cache and hard refresh (Ctrl+Shift+R)

**Current Fix Applied:**
- Added `position="popper"` to both SelectContent components
- This ensures proper rendering inside Dialog overlays

### **Issue: Dialog Doesn't Open**

**Symptoms:** Clicking integration card button does nothing

**Solutions:**
1. Check console for React errors
2. Verify onClick handler is attached: `handleConfigure`
3. Check if `configDialogOpen` state is updating
4. Ensure IntegrationConfigDialog is rendered at bottom of page

### **Issue: Page Doesn't Load**

**Symptoms:** Blank page or error screen

**Solutions:**
1. Check console for import/module errors
2. Verify all imports exist:
   ```bash
   # Check if all files exist
   ls -la src/components/admin/integration/IntegrationConfigDialog.tsx
   ls -la src/data/integrations.ts
   ls -la src/types/integration.ts
   ```
3. Restart dev server:
   ```bash
   pkill -f vite
   npm run dev
   ```

### **Issue: Toast Notifications Don't Appear**

**Symptoms:** No success/error messages after saving

**Solutions:**
1. Verify Sonner is set up in main App component
2. Check if `toast.success()` and `toast.error()` are imported correctly
3. Ensure Toaster component is rendered

## Manual Testing Checklist

- [ ] Navigate to `/admin/integration`
- [ ] Page loads without errors
- [ ] All 7 integration cards display correctly
- [ ] Search functionality works
- [ ] Category filters work
- [ ] Click mSupply → Dialog opens
- [ ] Fill all required fields → Test Connection button works
- [ ] Switch to Sync Settings tab → All fields visible
- [ ] Click GT02 Tracker → Dialog opens
- [ ] **Protocol dropdown opens and shows TCP/UDP**
- [ ] Select UDP → Dropdown closes, value updates
- [ ] Click Fuel Monitoring → Dialog opens
- [ ] **Sensor Type dropdown opens and shows all 4 options**
- [ ] Select RS-485 → Dropdown closes, value updates
- [ ] Enter all fields → Click "Add Integration"
- [ ] Success toast appears
- [ ] Dialog closes
- [ ] Check console → Config logged
- [ ] Switch to "Current Integrations" tab
- [ ] Mod4 shows as active
- [ ] Click Configure on Mod4 → Dialog opens with existing config
- [ ] Switch to "Mod4 Setup" tab
- [ ] All existing Mod4 features work

## Browser Compatibility

Tested on:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari

## Known Limitations

1. **Configurations save to console only** (not database yet)
2. **Test Connection is simulated** (not real API calls)
3. **Active integrations list is mock data** (except Mod4)
4. **OpenLMIS shows "Coming Soon"** (not configurable yet)

## Next Steps

To make integrations production-ready:

1. **Create database table:**
   ```sql
   CREATE TABLE integrations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     type TEXT NOT NULL,
     name TEXT NOT NULL,
     status TEXT NOT NULL,
     config JSONB,
     last_sync TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );
   ```

2. **Implement save logic:**
   - Replace mock `handleSaveConfig` with actual database insert
   - Store API keys securely (Supabase Vault)
   - Fetch active integrations from database

3. **Implement connection testing:**
   - Add real API calls to test each integration
   - Show detailed error messages
   - Validate credentials

4. **Implement sync jobs:**
   - Create background workers for periodic sync
   - Handle webhooks from external systems
   - Log sync activity

## Debugging Commands

```bash
# Check TypeScript errors
npx tsc --noEmit | grep integration

# Check for console.log statements
grep -r "console.log" src/components/admin/integration/
grep -r "console.log" src/pages/admin/integration/

# Find all integration-related files
find src -name "*integration*" -type f

# Check imports
grep -r "IntegrationConfigDialog" src/
```

## Success Criteria

✅ All 7 integrations display correctly
✅ Configuration dialogs open for each type
✅ GT02 Protocol dropdown works (TCP/UDP)
✅ Fuel Monitoring Sensor Type dropdown works (4 options)
✅ Form validation prevents saving incomplete configs
✅ Test Connection button shows feedback
✅ Toast notifications appear on save
✅ Mod4 existing features still work
✅ No console errors
✅ Responsive design works on mobile

---

**Status:** Ready for testing
**Last Updated:** 2026-02-21
**Version:** 1.0.0
