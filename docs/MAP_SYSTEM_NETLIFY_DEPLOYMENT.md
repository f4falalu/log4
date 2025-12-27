# Map System - Netlify Deployment Guide

## 🎉 Verification Results: PERFECT!

Your database migration is **100% successful**:
- ✅ **Tables:** 9 (expected: 9)
- ✅ **Functions:** 3 (expected: 3)
- ✅ **Indexes:** 49 (expected: 28+) - Exceeds target! ⭐
- ✅ **RLS Policies:** 19 (expected: 11+) - Exceeds target! ⭐

**All systems operational and ready for deployment!**

---

## 🚀 Netlify Deployment Options

### Option A: Netlify CLI (Interactive)

You're already logged into Netlify! Now create and deploy:

```bash
# Create new site and deploy in one command
npx netlify deploy --prod --dir=dist --alias biko-map-staging
```

**This will:**
1. Create a new Netlify site
2. Deploy the `dist/` folder
3. Give you a live URL (e.g., `https://biko-map-staging.netlify.app`)

---

### Option B: Netlify Dashboard (Drag & Drop)

**Easiest method - 2 minutes:**

1. **Go to:** https://app.netlify.com/
2. **Click:** "Add new site" → "Deploy manually"
3. **Drag and drop** the entire `dist/` folder
4. **Wait** for deployment (30-60 seconds)
5. **Get URL:** e.g., `https://amazing-payne-123456.netlify.app`

---

### Option C: Link to Existing Netlify Site

If you already have a Netlify site for this project:

```bash
# Link to existing site
npx netlify link

# Then deploy
npx netlify deploy --prod --dir=dist
```

---

## ✅ Post-Deployment Verification

After deployment completes, you'll get a URL. Test these pages:

### 1. Operational Map
**URL:** `https://[your-netlify-url].netlify.app/fleetops/map/operational`

**Check:**
- [ ] Map renders with tiles
- [ ] "Initiate Trade-Off" button visible
- [ ] No console errors (F12 → Console)

### 2. Planning Map
**URL:** `https://[your-netlify-url].netlify.app/fleetops/map/planning`

**Check:**
- [ ] Map renders with tiles
- [ ] 5 tool buttons visible:
  - Zone Editor (MapPin icon)
  - Route Sketch (Route icon)
  - Facility Assigner (Building icon)
  - Distance Measure (Ruler icon)
  - Review & Activate (CheckCircle icon)
- [ ] No console errors

### 3. Forensics Map
**URL:** `https://[your-netlify-url].netlify.app/fleetops/map/forensics`

**Check:**
- [ ] Map renders with tiles
- [ ] Timeline scrubber visible
- [ ] Analysis tool buttons visible
- [ ] No console errors

---

## 🔧 Environment Variables

**Important:** Add these to Netlify:

1. Go to: Site settings → Environment variables
2. Add:

```bash
VITE_SUPABASE_URL=https://cenugzabuzglswikoewy.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
VITE_ENABLE_MAP_SYSTEM=true
VITE_ENABLE_TRADE_OFFS=true
VITE_ENABLE_PLANNING_MODE=true
VITE_ENABLE_FORENSICS_MODE=true
```

**Note:** If these aren't set, the site will still work if they're in your `.env` file and were included during build.

---

## 📊 Deployment Status Checklist

### Pre-Deployment ✅
- [x] Frontend build complete (14.29s, 0 errors)
- [x] Database migration verified (9 tables, 3 functions, 49 indexes, 19 policies)
- [x] Netlify CLI installed and authenticated
- [x] `dist/` folder ready for deployment

### Deployment ⏳
- [ ] Netlify site created
- [ ] `dist/` folder deployed
- [ ] Deployment URL received

### Post-Deployment ⏳
- [ ] All 3 map pages load
- [ ] No console errors
- [ ] Map tiles render correctly
- [ ] Database connection working

### UAT Preparation ⏳
- [ ] 10 test users created in Supabase
- [ ] UAT materials distributed
- [ ] UAT kickoff scheduled

---

## 🎯 Quick Deployment Command

**Recommended: Create new site with custom alias**

```bash
npx netlify deploy --prod --dir=dist --alias biko-map-staging
```

This gives you a predictable URL: `https://biko-map-staging.netlify.app`

---

## 🐛 Troubleshooting

### Issue: "This folder isn't linked to a site"
**Solution:** Use `--alias` flag or drag-and-drop via dashboard

### Issue: Deployment successful but pages 404
**Solution:**
1. Add `_redirects` file to `public/` folder:
   ```
   /*    /index.html   200
   ```
2. Rebuild: `npm run build`
3. Redeploy

### Issue: Environment variables not working
**Solution:**
1. Check Netlify dashboard → Site settings → Environment variables
2. Redeploy after adding variables

---

## 📞 Support

**Netlify Support:** https://www.netlify.com/support/
**Netlify Docs:** https://docs.netlify.com/

**Supabase Project:** cenugzabuzglswikoewy
**Build Folder:** `dist/`
**Build Command:** `npm run build` (already done)

---

## 🎉 Success Criteria

**Deployment is successful when:**
- ✅ You have a live Netlify URL
- ✅ All 3 map pages load without errors
- ✅ Browser console shows 0 errors
- ✅ Map tiles render correctly
- ✅ Buttons/tools are interactive

**Then you're ready for UAT!** 🎊

---

## 📋 Next Steps After Deployment

1. **Test the 3 map pages** (15 min)
2. **Create 10 UAT test users** in Supabase (15 min)
3. **Send UAT invitation emails** (15 min)
4. **Schedule UAT kickoff meeting** (Week 1)

**Total time to UAT-ready:** ~1 hour

---

## 🚀 Recommended: Use Dashboard Drag & Drop

**Fastest method (2 minutes):**
1. Open: https://app.netlify.com/
2. Click: "Add new site" → "Deploy manually"
3. Drag `dist/` folder
4. Wait 30 seconds
5. Get URL and test!

---

**You're logged into Netlify and ready to deploy!**

Choose your method and let's get the Map System live! 🎊
