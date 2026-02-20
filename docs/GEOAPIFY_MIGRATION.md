# Geoapify API Migration Guide

## ⚠️ CRITICAL SECURITY FIX

**Issue:** Geoapify API key was exposed in client-side URL query parameters, making it visible in:
- Browser history
- Server logs
- Network traffic
- Developer tools

**Solution:** Migrate to Supabase Edge Functions that proxy Geoapify API calls server-side.

---

## Migration Steps

### 1. Deploy Edge Functions

```bash
# Set API key as Supabase secret
supabase secrets set GEOAPIFY_API_KEY=your_geoapify_api_key

# Deploy functions
supabase functions deploy geocode
supabase functions deploy routing
supabase functions deploy isoline
```

### 2. Update Client Code

Replace all direct Geoapify API calls in [src/lib/geoapify.ts](../src/lib/geoapify.ts):

#### Before (Lines 30-40):
```typescript
const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_API_KEY}&limit=5`
const response = await fetch(url)
```

#### After:
```typescript
import { supabase } from '@/integrations/supabase/client'

const { data, error } = await supabase.functions.invoke('geocode', {
  body: {
    type: 'search',
    query: query
  }
})
if (error) throw error
return data
```

---

## Files to Update

### 1. [src/lib/geoapify.ts](../src/lib/geoapify.ts)

**Function: `geocodeAddress` (Line 34)**
```typescript
// OLD:
const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_API_KEY}&limit=5`

// NEW:
const { data, error } = await supabase.functions.invoke('geocode', {
  body: { type: 'search', query }
})
if (error) throw error
return data
```

**Function: `reverseGeocode` (Line 91)**
```typescript
// OLD:
const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${GEOAPIFY_API_KEY}`

// NEW:
const { data, error } = await supabase.functions.invoke('geocode', {
  body: { type: 'reverse', lat, lon }
})
if (error) throw error
return data
```

**Function: `calculateRoute` (Line 128)**
```typescript
// OLD:
const url = `https://api.geoapify.com/v1/routing?waypoints=${waypointsParam}&mode=drive&apiKey=${GEOAPIFY_API_KEY}`

// NEW:
const { data, error } = await supabase.functions.invoke('routing', {
  body: { waypoints, mode: 'drive' }
})
if (error) throw error
return data
```

**Function: `getServiceArea` (Line 163)**
```typescript
// OLD:
const url = `https://api.geoapify.com/v1/isoline?lat=${lat}&lon=${lon}&type=time&mode=drive&range=${timeMinutes * 60}&apiKey=${GEOAPIFY_API_KEY}`

// NEW:
const { data, error } = await supabase.functions.invoke('isoline', {
  body: {
    lat,
    lon,
    type: 'time',
    mode: 'drive',
    range: timeMinutes * 60
  }
})
if (error) throw error
return data
```

---

## Environment Variables

### Remove from `.env` files:
```bash
# DELETE THIS - No longer needed on client side
VITE_GEOAPIFY_API_KEY=your_key_here
```

### Add to Supabase Secrets:
```bash
# Run this command once
supabase secrets set GEOAPIFY_API_KEY=your_geoapify_api_key
```

---

## Testing

### Test Edge Function Locally
```bash
# Create .env.local with your API key
echo "GEOAPIFY_API_KEY=your_key" > supabase/.env.local

# Start local Supabase
supabase start

# Test geocode function
curl -X POST http://localhost:54321/functions/v1/geocode \
  -H "Content-Type: application/json" \
  -d '{"type":"search","query":"New York City"}'
```

### Test in Production
```typescript
// In browser console or test file
const { data, error } = await supabase.functions.invoke('geocode', {
  body: { type: 'search', query: 'New York' }
})
console.log(data)
```

---

## Rollback Plan

If edge functions fail, you can temporarily rollback to direct API calls:

1. Restore `VITE_GEOAPIFY_API_KEY` in `.env`
2. Revert changes to `geoapify.ts`
3. Redeploy

**Note:** This is NOT recommended for production - only use as emergency fallback.

---

## Performance Impact

**Before:**
- Client → Geoapify API directly
- ~200-500ms latency

**After:**
- Client → Supabase Edge Function → Geoapify API
- ~300-600ms latency (+100ms overhead)

The slight performance trade-off is acceptable for the security improvement.

---

## Security Benefits

✅ API key never exposed to client
✅ No API key in browser history
✅ No API key in server logs
✅ No API key in network traffic
✅ Centralized API key management
✅ Can add rate limiting per user
✅ Can add usage monitoring
✅ Can add request validation

---

## Post-Migration Checklist

- [ ] Deploy all 3 edge functions (`geocode`, `routing`, `isoline`)
- [ ] Set `GEOAPIFY_API_KEY` in Supabase secrets
- [ ] Update `src/lib/geoapify.ts` with new edge function calls
- [ ] Remove `VITE_GEOAPIFY_API_KEY` from all `.env` files
- [ ] Test geocoding in production
- [ ] Test routing in production
- [ ] Test isoline/service areas in production
- [ ] Monitor edge function logs for errors
- [ ] Update Netlify environment variables (remove old key)
