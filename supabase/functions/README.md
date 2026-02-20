# Supabase Edge Functions

## Overview
These edge functions proxy external API calls to protect API keys and provide backend logic.

## Available Functions

### 1. `geocode` - Geocoding Proxy
Proxies geocoding requests to Geoapify API (address ↔ coordinates).

**Endpoint:** `https://cenugzabuzglswikoewy.supabase.co/functions/v1/geocode`

**Request:**
```json
{
  "type": "search",
  "query": "123 Main St, City"
}
```
or
```json
{
  "type": "reverse",
  "lat": 40.7128,
  "lon": -74.0060
}
```

**Response:** Geoapify geocoding result

---

### 2. `routing` - Route Calculation Proxy
Proxies routing requests to Geoapify API.

**Endpoint:** `https://cenugzabuzglswikoewy.supabase.co/functions/v1/routing`

**Request:**
```json
{
  "waypoints": [
    { "lat": 40.7128, "lon": -74.0060 },
    { "lat": 40.7580, "lon": -73.9855 }
  ],
  "mode": "drive"
}
```

**Response:** Geoapify routing result with turn-by-turn directions

---

### 3. `isoline` - Service Area (Isoline) Proxy
Proxies isoline requests to Geoapify API.

**Endpoint:** `https://cenugzabuzglswikoewy.supabase.co/functions/v1/isoline`

**Request:**
```json
{
  "lat": 40.7128,
  "lon": -74.0060,
  "type": "time",
  "mode": "drive",
  "range": 1800
}
```

**Response:** GeoJSON polygon representing service area

---

## Deployment

### Prerequisites
1. Install Supabase CLI: `npm install -g supabase`
2. Link project: `supabase link --project-ref cenugzabuzglswikoewy`

### Set API Key Secret
```bash
# Set Geoapify API key as a secret
supabase secrets set GEOAPIFY_API_KEY=your_api_key_here
```

### Deploy Functions
```bash
# Deploy all functions
supabase functions deploy geocode
supabase functions deploy routing
supabase functions deploy isoline

# Or deploy all at once
supabase functions deploy
```

### Configure JWT Verification (Optional)
Add to `supabase/config.toml`:
```toml
[functions.geocode]
verify_jwt = true

[functions.routing]
verify_jwt = true

[functions.isoline]
verify_jwt = true
```

---

## Client Usage

### Example: Geocoding
```typescript
const { data, error } = await supabase.functions.invoke('geocode', {
  body: {
    type: 'search',
    query: '123 Main St, New York'
  }
})
```

### Example: Routing
```typescript
const { data, error } = await supabase.functions.invoke('routing', {
  body: {
    waypoints: [
      { lat: 40.7128, lon: -74.0060 },
      { lat: 40.7580, lon: -73.9855 }
    ],
    mode: 'drive'
  }
})
```

---

## Migrating from Direct API Calls

### Before (Insecure - API key exposed):
```typescript
const url = `https://api.geoapify.com/v1/geocode/search?text=${query}&apiKey=${GEOAPIFY_API_KEY}`
const response = await fetch(url)
```

### After (Secure - API key protected):
```typescript
const { data, error } = await supabase.functions.invoke('geocode', {
  body: { type: 'search', query }
})
```

---

## Security Notes

1. **API Key Protection:** Geoapify API key is stored in Supabase secrets, never exposed to client
2. **CORS:** Functions allow all origins (`*`) - restrict in production if needed
3. **JWT Verification:** Enable `verify_jwt = true` in config to require authenticated requests
4. **Rate Limiting:** Consider adding rate limiting for production

---

## Testing Locally

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve geocode --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/geocode \
  -H "Content-Type: application/json" \
  -d '{"type":"search","query":"New York"}'
```

---

## Monitoring

View function logs in Supabase Dashboard:
- Navigate to: Edge Functions → Select function → Logs
- Or via CLI: `supabase functions logs geocode`
