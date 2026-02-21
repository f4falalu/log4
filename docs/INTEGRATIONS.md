# Integrations System

## Overview

The integrations page (`/admin/integration`) provides a centralized hub for connecting external systems to the BIKO platform. This includes supply chain management systems, fleet telemetry, government reporting, and execution platforms.

## Architecture

### File Structure

```
src/
├── types/integration.ts              # TypeScript types
├── data/integrations.ts              # Available integrations catalog
├── components/admin/integration/
│   ├── IntegrationCard.tsx          # Card component for available integrations
│   ├── ActiveIntegrationItem.tsx    # List item for active integrations
│   ├── LinkByEmailDialog.tsx        # Mod4 email linking
│   ├── GenerateOTPDialog.tsx        # Mod4 OTP generation
│   ├── LinkedUsersTable.tsx         # Mod4 linked users
│   └── OnboardingRequestsTable.tsx  # Mod4 onboarding requests
└── pages/admin/integration/
    └── page.tsx                     # Main integrations page
```

### Integration Categories

1. **Supply Chain** - mSupply, OpenLMIS
2. **Government** - NHLMIS (National Health Logistics MIS)
3. **Fleet Management** - Fuel monitoring systems
4. **Telemetry** - Traccar, GT02 GPS trackers
5. **Execution** - Mod4 driver platform

## Current Integrations

### 1. mSupply (Supply Chain)
- **Description**: Open-source LMIS for pharmaceutical supply chains
- **Integration Type**: REST/GraphQL API, bidirectional sync
- **Data Exchange**: Stock levels, requisitions, shipments, item catalogs
- **Status**: Available for configuration

### 2. NHLMIS (Government Reporting)
- **Description**: Nigeria's national health logistics system
- **Integration Type**: API key-based authentication, RESTful API
- **Data Exchange**: Stock reporting, requisitions, compliance tracking
- **Status**: Available for configuration

### 3. Traccar GPS Server (Telemetry)
- **Description**: Open-source GPS tracking platform (200+ protocols, 2000+ devices)
- **Integration Type**: Pull from Traccar API (intermediary server)
- **Data Exchange**: Real-time GPS, geofencing, speed monitoring
- **Status**: Available for configuration (NEW)

### 4. GT02 GPS Tracker (Telemetry)
- **Description**: Low-cost GPS tracking devices
- **Integration Type**: Direct TCP/UDP binary protocol
- **Data Exchange**: GPS coordinates, speed, heading, heartbeat
- **Status**: Available for configuration

### 5. Fuel Monitoring (Fleet Management)
- **Description**: Real-time fuel level tracking
- **Integration Type**: CAN bus, RS-485, OBD, or analog sensors via telematics
- **Data Exchange**: Fuel levels, filling events, drain alerts, consumption
- **Status**: Available for configuration (NEW)

### 6. Mod4 Driver System (Execution)
- **Description**: Driver execution platform for delivery batches
- **Integration Type**: Direct database link, OTP/email onboarding
- **Data Exchange**: Driver assignments, batch status, proof of delivery
- **Status**: Active

## Adding a New Integration

### 1. Define Integration Type

Add to [src/types/integration.ts](../src/types/integration.ts):

```typescript
export type IntegrationType =
  | 'msupply'
  | 'your_new_integration'; // Add here
```

### 2. Add to Catalog

Add to [src/data/integrations.ts](../src/data/integrations.ts):

```typescript
{
  type: 'your_new_integration',
  name: 'Your Integration Name',
  description: 'Brief description (1-2 sentences)',
  category: 'supply_chain', // or fleet_management, telemetry, etc.
  capabilities: [
    'Capability 1',
    'Capability 2',
    'Capability 3',
  ],
  icon: 'Package', // Lucide icon name
  isNew: true, // Optional badge
  comingSoon: false, // Show as coming soon
}
```

### 3. Add Icon Mapping

Update icon maps in:
- [src/components/admin/integration/IntegrationCard.tsx](../src/components/admin/integration/IntegrationCard.tsx)
- [src/components/admin/integration/ActiveIntegrationItem.tsx](../src/components/admin/integration/ActiveIntegrationItem.tsx)

```typescript
const ICON_MAP = {
  Package,
  YourNewIcon, // Import and add here
};
```

### 4. Implement Configuration

Create configuration dialog/drawer for your integration:

```typescript
// src/components/admin/integration/YourIntegrationConfig.tsx
export function YourIntegrationConfig({ onSave }: Props) {
  return (
    <Dialog>
      {/* Configuration form */}
    </Dialog>
  );
}
```

### 5. Handle Configuration Action

Update [src/pages/admin/integration/page.tsx](../src/pages/admin/integration/page.tsx):

```typescript
const handleConfigure = (type: string) => {
  if (type === 'your_new_integration') {
    // Open your configuration dialog
  }
  // ...
};
```

## Integration Patterns

### Push Integration (Webhooks)
External system sends data to BIKO via webhooks.
- Use queue-based processing for resilience
- Validate and transform data before storage
- Send acknowledgments

### Pull Integration (API Polling)
BIKO periodically fetches data from external API.
- Use scheduled jobs (cron)
- Implement rate limiting
- Cache responses when appropriate

### Bidirectional Sync
BIKO and external system exchange data in both directions.
- Track sync state (last_sync timestamp)
- Handle conflicts (last-write-wins, manual resolution)
- Support incremental sync

### Real-time Push (TCP/UDP)
Devices push data directly to BIKO server.
- Use intermediary server like Traccar for protocol decoding
- Pull processed data from intermediary API

## Database Schema (Future)

```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL, -- active, inactive, configured, error
  config JSONB,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id),
  event_type TEXT NOT NULL, -- sync_start, sync_success, sync_error
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Security Considerations

- Store API keys in Supabase Vault or environment variables
- Use HTTPS for all external API calls
- Validate and sanitize incoming data
- Implement rate limiting on webhook endpoints
- Log all integration events for audit trail

## Next Steps

1. Implement database schema for storing integration configs
2. Create configuration dialogs for each integration type
3. Build sync jobs for API-based integrations
4. Add integration health monitoring
5. Implement webhook receivers for push integrations
6. Add integration activity logs and analytics

## References

- mSupply: https://docs.msupply.foundation/
- NHLMIS: https://docs.msupply.org.nz/integration:nhlmis
- Traccar: https://www.traccar.org/
- GT02 Protocol: https://www.traccar.org/protocol/5022-gt02/
