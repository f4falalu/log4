# MOD4 Driver PWA - Architecture Reference

> Offline-first Progressive Web App for delivery driver execution

**Production URL**: https://driverbiko.netlify.app
**Local Dev**: http://localhost:3001 (or 8780)
**Backend**: Shared Supabase with BIKO platform

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Project Structure](#project-structure)
3. [Routes & Pages](#routes--pages)
4. [Components Architecture](#components-architecture)
5. [State Management](#state-management)
6. [Database & Sync](#database--sync)
7. [Authentication Flow](#authentication-flow)
8. [PWA Configuration](#pwa-configuration)
9. [Data Models](#data-models)
10. [Technology Stack](#technology-stack)
11. [Integration Points](#integration-points)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BIKO ECOSYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────┐      ┌──────────────────────┐        │
│   │   BIKO Platform      │      │   MOD4 Driver PWA    │        │
│   │   (Admin/Dispatch)   │      │   (Field Execution)  │        │
│   ├──────────────────────┤      ├──────────────────────┤        │
│   │ • Fleet management   │      │ • Delivery execution │        │
│   │ • Driver monitoring  │      │ • PoD capture        │        │
│   │ • Batch assignment   │      │ • GPS tracking       │        │
│   │ • Route planning     │      │ • Offline support    │        │
│   │ • Analytics          │      │ • Route navigation   │        │
│   └──────────┬───────────┘      └──────────┬───────────┘        │
│              │                              │                    │
│              └──────────┬───────────────────┘                    │
│                         │                                        │
│              ┌──────────▼───────────┐                           │
│              │     Supabase         │                           │
│              │  (Shared Backend)    │                           │
│              │  • Auth              │                           │
│              │  • Database          │                           │
│              │  • Realtime          │                           │
│              │  • Storage           │                           │
│              └──────────────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment Architecture

| App | URL | Purpose | Users |
|-----|-----|---------|-------|
| BIKO Platform | appbiko.netlify.app | Admin dashboard | Fleet managers, dispatchers |
| MOD4 Driver | driverbiko.netlify.app | Mobile PWA | Delivery drivers |
| BIKO /mod4 | appbiko.netlify.app/mod4 | Dispatcher view | Fleet coordinators |

---

## Project Structure

```
mod4/
├── public/                          # PWA assets
│   ├── manifest.json               # Web app manifest
│   ├── icon-192.svg                # PWA icons
│   ├── icon-512.svg
│   └── apple-touch-icon.svg
│
├── src/
│   ├── pages/                      # Route pages
│   │   ├── Dashboard.tsx           # Main execution view
│   │   ├── Route.tsx               # Map + itinerary
│   │   ├── Login.tsx               # Authentication
│   │   ├── Onboarding.tsx          # First-time setup
│   │   ├── Profile.tsx             # Settings
│   │   ├── Support.tsx             # Support requests
│   │   ├── ShiftSummary.tsx        # Analytics
│   │   └── NotFound.tsx            # 404
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn-ui (40+ components)
│   │   ├── delivery/               # PoD workflow (9)
│   │   ├── route/                  # Route viz (10)
│   │   ├── map/                    # Map rendering (3)
│   │   ├── calendar/               # History (4)
│   │   ├── pod/                    # PoD display (3)
│   │   ├── support/                # Support forms (5)
│   │   ├── sync/                   # Offline UI (2)
│   │   ├── notifications/          # Push (2)
│   │   └── AppShell.tsx            # Layout wrapper
│   │
│   ├── stores/                     # Zustand stores
│   │   ├── authStore.ts            # Auth + driver profile
│   │   ├── batchStore.ts           # Current batch/slots
│   │   ├── calendarStore.ts        # Delivery history
│   │   └── notificationStore.ts    # Notifications
│   │
│   ├── lib/
│   │   ├── db/                     # IndexedDB
│   │   │   ├── schema.ts           # DB setup + models
│   │   │   ├── events.ts           # Event operations
│   │   │   ├── batches.ts          # Batch queries
│   │   │   └── pod.ts              # PoD storage
│   │   │
│   │   ├── sync/                   # Sync engine
│   │   │   └── machine.ts          # State machine
│   │   │
│   │   ├── gps/                    # Location
│   │   │   ├── telemetry.ts        # GPS tracking
│   │   │   └── eta.ts              # ETA calc
│   │   │
│   │   ├── route/                  # Routing
│   │   │   └── optimization.ts     # Nearest-neighbor
│   │   │
│   │   └── pdf/                    # Documents
│   │       └── generatePoDPdf.ts   # PoD reports
│   │
│   ├── integrations/
│   │   └── supabase/               # Backend
│   │       ├── client.ts           # Supabase init
│   │       └── types.ts            # DB types
│   │
│   ├── App.tsx                     # Root + routing
│   └── main.tsx                    # Entry point
│
├── vite.config.ts                  # Vite + PWA config
├── netlify.toml                    # Deployment
└── package.json
```

---

## Routes & Pages

| Route | Component | Purpose | Auth |
|-------|-----------|---------|------|
| `/onboarding` | Onboarding.tsx | First-time carousel | No |
| `/login` | Login.tsx | Driver authentication | No |
| `/` `/dashboard` | Dashboard.tsx | Batch execution | Yes |
| `/route` | Route.tsx | Map + itinerary | Yes |
| `/support` | Support.tsx | Support requests | Yes |
| `/profile` | Profile.tsx | Settings | Yes |
| `/summary` | ShiftSummary.tsx | Shift analytics | Yes |

### Route Protection

```tsx
// Protected routes wrap with auth check
<ProtectedRoute>
  {isAuthenticated ? children : <Navigate to="/login" />}
</ProtectedRoute>

// Onboarding check via localStorage
const completed = localStorage.getItem('mod4_onboarding_completed');
```

---

## Components Architecture

### Delivery Workflow (`components/delivery/`)

```
DeliverySheet.tsx (main modal)
├── SlotChecklist.tsx
├── QuantityConfirmation.tsx
├── DiscrepancyForm.tsx
├── RecipientAttestation.tsx
├── LocationVerification.tsx
├── PhotoCapture.tsx
├── SignatureCanvas.tsx
└── PoDReviewStep.tsx
```

### Route Visualization (`components/route/`)

```
RouteMap.tsx (MapLibre)
├── ItineraryTimeline.tsx
│   └── ItineraryStop.tsx
├── CollapsedItinerary.tsx
├── FacilityPopover.tsx
├── FacilityTypeFilter.tsx
├── NavigationControls.tsx
├── AlternateRoutes.tsx
├── RouteTopBar.tsx
└── RouteBottomTabs.tsx
```

### Support (`components/support/`)

```
SupportRequestForm.tsx
├── IssueTypeSelector.tsx
├── DamageTypeSelector.tsx
├── EvidenceCapture.tsx
└── HandOffRequestForm.tsx
```

---

## State Management

### Zustand Stores

#### authStore.ts
```typescript
interface AuthState {
  user: User | null
  session: Session | null
  driver: {
    id: string
    name: string
    email: string
    phone?: string
    vehicle_id?: string
    status: 'active' | 'inactive' | 'on_break' | 'on_delivery'
  }
  isAuthenticated: boolean
  isLoading: boolean
}

// Actions
login(email, password)     // Password auth
loginWithOtp(email)        // Magic link
verifyOtp(email, token)    // OTP verify
logout()                   // Sign out
refreshSession()           // Check session
fetchDriverProfile()       // Load driver

// Persistence: 'mod4-auth' (driver profile)
```

#### batchStore.ts
```typescript
interface BatchState {
  currentBatch: Batch | null
  slots: Slot[]
  facilities: Facility[]
  activeSlotId: string | null
  completedSlots: number
  totalSlots: number
  progress: number  // 0-100
}

// Actions
setBatch(batch)
setActiveSlot(slotId)
updateSlotStatus(slotId, status)
reorderPendingSlots(optimizedOrder)
```

#### calendarStore.ts
```typescript
interface CalendarState {
  currentMonth: Date
  selectedDate: Date | null
  summaryMap: Map<dateKey, DailyDeliverySummary>
  selectedDayDeliveries: DeliveryRecord[]
}

// Actions
setCurrentMonth(month)
selectDate(date)
loadMonthData(month)
loadDayDeliveries(date)
```

#### notificationStore.ts
```typescript
interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  pushEnabled: boolean
  pushPermission: 'default' | 'granted' | 'denied'
}

// Actions
addNotification(notification)
markAsRead(id)
markAllAsRead()
requestPushPermission()

// Persistence: 'mod4-notifications' (last 50)
```

---

## Database & Sync

### IndexedDB Schema

```typescript
// Databases
events          // Event log (all mutations)
batches         // Current assignments
proof_of_delivery // PoD records
map_tiles       // Cached tiles
sync_meta       // Sync state
```

### Sync State Machine

```
IDLE → OFFLINE → QUEUED → SYNCING → SYNCED → IDLE
                    ↓
                  ERROR → (retry)
```

### Event Types

| Event | Description |
|-------|-------------|
| `slot_delivered` | Delivery completed with PoD |
| `slot_failed` | Failed delivery |
| `slot_skipped` | Skipped stop |
| `location_update` | GPS position |
| `batch_started` | Batch activated |
| `batch_completed` | Batch finished |
| `tradeoff_request` | Support request |
| `handoff_request` | Vehicle handoff |

### Sync to Supabase

```typescript
// Event sync flow
IndexedDB (pending) → Supabase → IndexedDB (synced)

// Sync triggers
- Network goes online
- Manual sync button
- After significant events
- Batch processing (50/batch)
```

---

## Authentication Flow

```
┌────────────┐
│  Landing   │
└─────┬──────┘
      │
      ▼
┌────────────┐
│ Onboarding │ (first time only)
└─────┬──────┘
      │
      ▼
┌────────────────────────────────┐
│            Login               │
├────────────┬───────────────────┤
│ Email/Pass │    Magic Link     │
│     │      │        │          │
│     ▼      │        ▼          │
│ signIn     │   signInWithOtp   │
│ WithPass   │        │          │
│     │      │        ▼          │
│     │      │   verifyOtp       │
│     └──────┴────────┘          │
│            │                   │
│            ▼                   │
│   fetchDriverProfile           │
│            │                   │
└────────────┼───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│     Dashboard (Protected)      │
└────────────────────────────────┘
```

### Supabase Auth Config

```typescript
// client.ts
export const supabase = createClient(URL, ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

---

## PWA Configuration

### Vite PWA Plugin

```typescript
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      // Google Fonts - CacheFirst, 1 year
      // Gstatic - CacheFirst, 1 year
    ]
  }
})
```

### Manifest

```json
{
  "name": "MOD4 Driver",
  "short_name": "MOD4",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0f1a",
  "theme_color": "#0a0f1a"
}
```

### Offline Features

1. **Local-First Storage**: All mutations to IndexedDB first
2. **Network Detection**: Auto online/offline handling
3. **Event Queuing**: Pending events queue in DB
4. **Adaptive Sync**: Batch processing with retries
5. **UI Indicators**: Offline banner, sync status

---

## Data Models

### Batch

```typescript
interface Batch {
  id: string
  driver_id: string
  vehicle_id: string
  status: 'assigned' | 'active' | 'completed'
  route_polyline?: string
  estimated_duration?: number
  facilities: Facility[]
  slots: Slot[]
  created_at: timestamp
  cached_at: timestamp
}
```

### Slot

```typescript
interface Slot {
  id: string
  batch_id: string
  facility_id: string
  sequence: number
  status: 'pending' | 'active' | 'delivered' | 'failed' | 'skipped'
  scheduled_time?: timestamp
  actual_time?: timestamp
  photo_uri?: string
  signature_uri?: string
  notes?: string
}
```

### Facility

```typescript
interface Facility {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type?: 'warehouse' | 'facility' | 'public'
  contact_name?: string
  contact_phone?: string
  instructions?: string
}
```

### Proof of Delivery

```typescript
interface ProofOfDelivery {
  id: string
  slot_id: string
  batch_id: string
  driver_id: string
  facility_id: string
  facility_name: string
  status: 'completed' | 'flagged'
  items: DeliveryItem[]
  has_discrepancy: boolean
  discrepancy_reason?: string
  discrepancy_notes?: string
  recipient_name: string
  recipient_role?: string
  recipient_signature_url: string
  photo_urls: string[]
  delivered_at: timestamp
  sync_status: 'pending' | 'synced'
}
```

### Event

```typescript
interface Mod4Event {
  id: string
  type: EventType
  timestamp: number
  device_id: string
  driver_id: string
  batch_id?: string
  slot_id?: string
  lat?: number
  lng?: number
  accuracy?: number
  payload: Record<string, unknown>
  sync_status: 'pending' | 'syncing' | 'synced' | 'error'
  sync_attempts: number
}
```

---

## Technology Stack

### Core

| Package | Version | Purpose |
|---------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 | Type safety |
| Vite | 5.4.19 | Build tool |

### State & Data

| Package | Version | Purpose |
|---------|---------|---------|
| zustand | 5.0.9 | State management |
| @supabase/supabase-js | 2.93.2 | Backend |
| idb | 8.0.3 | IndexedDB wrapper |
| @tanstack/react-query | 5.83.0 | Data fetching |

### UI

| Package | Version | Purpose |
|---------|---------|---------|
| shadcn-ui | - | Component library |
| @radix-ui/* | - | Primitives |
| tailwindcss | 3.4.17 | Styling |
| lucide-react | 0.462.0 | Icons |
| framer-motion | 12.24.0 | Animations |

### Maps & Media

| Package | Version | Purpose |
|---------|---------|---------|
| maplibre-gl | 5.15.0 | Map rendering |
| jspdf | 4.0.0 | PDF generation |
| recharts | 2.15.4 | Charts |

### Forms

| Package | Version | Purpose |
|---------|---------|---------|
| react-hook-form | 7.61.1 | Form state |
| zod | 3.25.76 | Validation |

### PWA

| Package | Version | Purpose |
|---------|---------|---------|
| vite-plugin-pwa | 1.2.0 | Service worker |

---

## Integration Points

### GPS Telemetry

```typescript
// lib/gps/telemetry.ts
// Battery-aware adaptive tracking

Battery Level → Tracking Interval
─────────────────────────────────
Charging      → 3s
>50%          → 5s
20-50%        → 15s
<20%          → 30s (battery saver)

// Min distance: 10m before emitting
// Kalman filtering for accuracy
```

### Route Optimization

```typescript
// lib/route/optimization.ts
// Nearest-neighbor algorithm

1. Start from warehouse
2. Calculate Haversine distance to all pending
3. Pick nearest, mark visited
4. Repeat until all visited
5. Return optimized sequence + savings
```

### Photo Capture

```typescript
// components/delivery/PhotoCapture.tsx

1. Request camera access (MediaDevices API)
2. Canvas-based frame capture
3. JPEG compression (80% quality)
4. Fallback to file picker if denied
5. Base64 encoding for storage
```

### PDF Generation

```typescript
// lib/pdf/generatePoDPdf.ts

1. Create jsPDF document
2. Add facility info, items, discrepancies
3. Embed recipient signature
4. Add status badges & colors
5. Download/print ready
```

---

## Development

### Local Setup

```bash
cd /Users/fbarde/Documents/log4/mod4
npm install
npm run dev -- --port 3001
```

### Environment Variables

```bash
# .env
VITE_SUPABASE_URL=https://cenugzabuzglswikoewy.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Build & Deploy

```bash
npm run build          # Production build
npm run preview        # Preview build
git push origin main   # Auto-deploy to Netlify
```

---

## Related Documentation

- [BIKO Platform Architecture](../../log4/docs/ARCHITECTURE.md)
- [Supabase Schema](../../log4/supabase/migrations/)
- [API Reference](../../log4/docs/API.md)

---

*Last updated: February 2026*
