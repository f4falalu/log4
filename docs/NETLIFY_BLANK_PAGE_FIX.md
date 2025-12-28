# Netlify Blank Page - Troubleshooting Guide

## 🔍 Issue: Blank Page on Netlify Deployment

**URL:** https://zesty-lokum-5d0fe1.netlify.app
**Status:** Blank white page showing

---

## ✅ Fix Applied

### 1. Added `_redirects` File

**Created:** `public/_redirects`
**Content:**
```
/*    /index.html   200
```

This tells Netlify to serve `index.html` for all routes (required for React Router / SPA applications).

### 2. Rebuilt Application

**Status:** ✅ Build complete with `_redirects` included in `dist/` folder

**Verified:**
```bash
ls -la dist/_redirects
# Output: -rw-------@ 1 fbarde  staff  23 Dec 24 02:35 dist/_redirects
```

---

## 🚀 Next Steps: Redeploy to Netlify

### Option A: Dashboard Re-upload (RECOMMENDED)

1. **Go to:** https://app.netlify.com/sites/zesty-lokum-5d0fe1
2. **Click:** "Deploys" tab
3. **Click:** "Drag and drop your site output folder here"
4. **Drag:** The NEW `dist/` folder (with `_redirects` file)
5. **Wait:** 30-60 seconds for deployment

### Option B: CLI Redeploy

```bash
# In your project directory
npx netlify deploy --prod --dir=dist --site=zesty-lokum-5d0fe1
```

---

## 🔍 Additional Diagnostics

### Check Browser Console

**Before redeploying, check what errors are showing:**

1. Open DevTools (F12)
2. Go to Console tab
3. Take a screenshot of any errors
4. Common issues:
   - ❌ Failed to load resource (404 errors)
   - ❌ CORS errors (Supabase connection)
   - ❌ Module not found errors

### Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page
4. Look for:
   - Red (failed) requests
   - 404 errors
   - Large delay on any requests

---

## 🔧 Common Causes & Fixes

### Issue 1: SPA Routing (FIXED ✅)
**Symptom:** Blank page, no errors
**Cause:** Missing `_redirects` file
**Fix:** Added `public/_redirects` with `/* /index.html 200`
**Status:** ✅ FIXED

### Issue 2: Environment Variables
**Symptom:** White page with console errors about Supabase
**Cause:** Missing environment variables in Netlify
**Fix:** Add to Netlify Site Settings → Environment Variables

**Required Variables:**
```bash
VITE_SUPABASE_URL=https://cenugzabuzglswikoewy.supabase.co
VITE_SUPABASE_ANON_KEY=[your-key]
```

**How to Add:**
1. Go to: https://app.netlify.com/sites/zesty-lokum-5d0fe1/settings/env
2. Click "Add a variable"
3. Add both variables above
4. Redeploy (trigger new deploy)

### Issue 3: Build Output Path
**Symptom:** 404 on index.html
**Cause:** Wrong publish directory
**Fix:** Ensure publish directory is `dist`

**Verify:**
1. Go to: Site Settings → Build & Deploy → Build settings
2. **Publish directory:** Should be `dist`
3. **Build command:** Should be `npm run build`

### Issue 4: Base URL in Vite Config
**Symptom:** Assets not loading (404 on JS/CSS files)
**Cause:** Wrong base URL
**Check:** `vite.config.ts`

```typescript
export default defineConfig({
  base: '/', // Should be '/' for root domain
  // ...
})
```

---

## ✅ Verification Steps (After Redeploy)

### Step 1: Check Homepage
**URL:** https://zesty-lokum-5d0fe1.netlify.app

**Expected:**
- ✅ Page loads (not blank)
- ✅ See login screen or dashboard
- ✅ No console errors

### Step 2: Check Map Pages Directly

**Operational Map:**
https://zesty-lokum-5d0fe1.netlify.app/fleetops/map/operational

**Planning Map:**
https://zesty-lokum-5d0fe1.netlify.app/fleetops/map/planning

**Forensics Map:**
https://zesty-lokum-5d0fe1.netlify.app/fleetops/map/forensics

**Expected:**
- ✅ Each page loads (may require login first)
- ✅ Map tiles render
- ✅ Tools/buttons visible

### Step 3: Console Check
**Open DevTools → Console**

**Expected:**
- ✅ 0 errors (or only minor warnings)
- ✅ No "Failed to load resource" errors
- ✅ No CORS errors

---

## 🐛 If Still Blank After Redeploy

### Diagnostic Checklist:

1. **Clear Browser Cache**
   ```
   Ctrl+Shift+Delete (Windows)
   Cmd+Shift+Delete (Mac)
   Select "Cached images and files"
   ```

2. **Try Incognito/Private Window**
   - Opens fresh session
   - No cached files
   - Clean slate test

3. **Check Netlify Deploy Log**
   - Go to: Deploys tab
   - Click latest deploy
   - Check for errors in build log

4. **Verify Files Deployed**
   - In Netlify Deploy details
   - Check "Deploy preview" or "Published deploy"
   - Verify `_redirects` file is present
   - Verify `index.html` is present

5. **Check File Sizes**
   - If files are 0 bytes → build failed
   - If missing files → incomplete upload

---

## 📋 Quick Fix Checklist

Run through these in order:

- [x] ✅ Added `public/_redirects` file
- [x] ✅ Rebuilt application (`npm run build`)
- [x] ✅ Verified `_redirects` in `dist/` folder
- [ ] ⏳ Redeployed to Netlify (drag & drop NEW `dist/` folder)
- [ ] ⏳ Verified homepage loads (not blank)
- [ ] ⏳ Verified map pages load
- [ ] ⏳ Checked console (0 errors)

---

## 🚀 Redeploy Command

**Right now, run this:**

```bash
npx netlify deploy --prod --dir=dist
```

**Or drag-and-drop NEW `dist/` folder to:**
https://app.netlify.com/sites/zesty-lokum-5d0fe1/deploys

---

## 📞 Support

**If issues persist after redeploy:**

1. **Share Browser Console Screenshot:**
   - F12 → Console tab → Screenshot

2. **Share Netlify Deploy Log:**
   - Deploys tab → Latest deploy → Copy log

3. **Check Netlify Status:**
   - https://www.netlifystatus.com/

4. **Netlify Support:**
   - https://www.netlify.com/support/

---

## ✅ Expected Final State

After successful redeploy:

**Homepage:**
- ✅ Shows login screen or dashboard
- ✅ No blank white page
- ✅ No console errors

**Map Pages:**
- ✅ `/fleetops/map/operational` loads
- ✅ `/fleetops/map/planning` loads
- ✅ `/fleetops/map/forensics` loads

**Console:**
- ✅ 0 critical errors
- ✅ Supabase connection working

---

## 🎯 Action Required

**Redeploy NOW with the fixed `dist/` folder:**

1. Go to: https://app.netlify.com/sites/zesty-lokum-5d0fe1/deploys
2. Drag NEW `dist/` folder (built at 02:35, includes `_redirects`)
3. Wait 30 seconds
4. Refresh: https://zesty-lokum-5d0fe1.netlify.app
5. Should see content (not blank!)

---

**The `_redirects` file is the fix - just need to redeploy with it! 🚀**
