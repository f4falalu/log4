# Vehicle Lifecycle Management System (VLMS) - Implementation Plan

## Executive Summary

The Vehicle Lifecycle Management System (VLMS) is a comprehensive fleet operations platform designed to manage the complete lifecycle of vehicles from acquisition through disposal. This document outlines the technical implementation strategy across 5 phases.

**Timeline Estimate**: 2-4 weeks (depending on team size and testing requirements)
**Priority Level**: High-impact feature with significant operational value
**Risk Level**: Medium (complex data relationships, integration points)

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Phase Breakdown](#phase-breakdown)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [API Contracts](#api-contracts)
7. [Security & RLS Policies](#security--rls-policies)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Checklist](#deployment-checklist)
10. [Acceptance Criteria](#acceptance-criteria)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Next.js)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Vehicle    │  │ Maintenance  │  │   Reports &  │      │
│  │  Management  │  │   Tracking   │  │  Analytics   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Zustand Stores  │
                    │  (State Management)│
                    └─────────┬─────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│                    Supabase Backend                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  PostgreSQL  │  │ Edge Functions│  │   Realtime   │       │
│  │   Database   │  │     (API)     │  │ Subscriptions│       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└───────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React 18, Next.js 14 (App Router), TypeScript
- **UI Framework**: Shadcn UI, Tailwind CSS, BIKO design tokens
- **State Management**: Zustand (local state), React Query (server state)
- **Backend**: Supabase (PostgreSQL, Edge Functions, Realtime)
- **File Storage**: Supabase Storage (documents, photos)
- **Maps**: Leaflet + OSM tiles
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Tables**: TanStack Table v8

---

## Database Schema

### Core Tables

#### 1. `vlms_vehicles`

Primary vehicle registry with comprehensive tracking.

```sql
CREATE TABLE vlms_vehicles (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: VEH-2024-001

  -- Basic Info
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
  vin VARCHAR(17) UNIQUE, -- Vehicle Identification Number
  license_plate VARCHAR(20) UNIQUE NOT NULL,

  -- Classification
  vehicle_type VARCHAR(50) NOT NULL, -- sedan, suv, truck, van, motorcycle
  fuel_type VARCHAR(50) NOT NULL, -- gasoline, diesel, electric, hybrid
  transmission VARCHAR(50), -- automatic, manual

  -- Specifications
  engine_capacity DECIMAL(10, 2), -- in liters or kWh
  color VARCHAR(50),
  seating_capacity INTEGER,
  cargo_capacity DECIMAL(10, 2), -- in cubic meters

  -- Acquisition
  acquisition_date DATE NOT NULL,
  acquisition_type VARCHAR(50) NOT NULL, -- purchase, lease, donation
  purchase_price DECIMAL(15, 2),
  vendor_name VARCHAR(255),
  warranty_expiry DATE,

  -- Current Status
  status VARCHAR(50) NOT NULL DEFAULT 'available', -- available, in_use, maintenance, out_of_service, disposed
  current_location_id UUID REFERENCES facilities(id),
  current_driver_id UUID REFERENCES profiles(id),
  current_assignment_type VARCHAR(50), -- permanent, temporary, pool

  -- Operational Metrics
  current_mileage DECIMAL(10, 2) DEFAULT 0,
  last_service_date DATE,
  next_service_date DATE,
  last_inspection_date DATE,
  next_inspection_date DATE,

  -- Insurance & Registration
  insurance_provider VARCHAR(255),
  insurance_policy_number VARCHAR(100),
  insurance_expiry DATE,
  registration_expiry DATE,

  -- Financial
  depreciation_rate DECIMAL(5, 2), -- percentage
  current_book_value DECIMAL(15, 2),
  total_maintenance_cost DECIMAL(15, 2) DEFAULT 0,

  -- Documents & Photos
  documents JSONB DEFAULT '[]'::jsonb, -- Array of {name, url, type, uploaded_at}
  photos JSONB DEFAULT '[]'::jsonb, -- Array of {url, caption, uploaded_at}

  -- Metadata
  notes TEXT,
  tags TEXT[], -- Array of searchable tags
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX idx_vlms_vehicles_status ON vlms_vehicles(status);
CREATE INDEX idx_vlms_vehicles_type ON vlms_vehicles(vehicle_type);
CREATE INDEX idx_vlms_vehicles_location ON vlms_vehicles(current_location_id);
CREATE INDEX idx_vlms_vehicles_driver ON vlms_vehicles(current_driver_id);
CREATE INDEX idx_vlms_vehicles_license ON vlms_vehicles(license_plate);
CREATE INDEX idx_vlms_vehicles_next_service ON vlms_vehicles(next_service_date) WHERE status != 'disposed';
CREATE INDEX idx_vlms_vehicles_tags ON vlms_vehicles USING gin(tags);
```

#### 2. `vlms_maintenance_records`

Comprehensive maintenance and repair tracking.

```sql
CREATE TABLE vlms_maintenance_records (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: MNT-2024-001
  vehicle_id UUID NOT NULL REFERENCES vlms_vehicles(id) ON DELETE CASCADE,

  -- Scheduling
  scheduled_date DATE,
  actual_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled

  -- Classification
  maintenance_type VARCHAR(50) NOT NULL, -- routine, repair, inspection, emergency, recall
  category VARCHAR(100), -- oil_change, tire_rotation, brake_service, engine_repair, etc.
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, critical

  -- Service Details
  service_provider VARCHAR(255), -- internal, vendor name
  service_location VARCHAR(255),
  technician_name VARCHAR(255),
  work_order_number VARCHAR(100),

  -- Metrics
  mileage_at_service DECIMAL(10, 2),
  labor_hours DECIMAL(6, 2),

  -- Costs
  labor_cost DECIMAL(12, 2) DEFAULT 0,
  parts_cost DECIMAL(12, 2) DEFAULT 0,
  total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (labor_cost + parts_cost) STORED,

  -- Details
  description TEXT NOT NULL,
  parts_replaced JSONB DEFAULT '[]'::jsonb, -- Array of {part_name, part_number, quantity, cost}
  issues_found TEXT,
  recommendations TEXT,

  -- Follow-up
  next_service_date DATE,
  next_service_mileage DECIMAL(10, 2),
  warranty_until DATE,

  -- Documents
  invoices JSONB DEFAULT '[]'::jsonb, -- Array of {name, url, amount, uploaded_at}
  photos JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  completed_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX idx_vlms_maintenance_vehicle ON vlms_maintenance_records(vehicle_id);
CREATE INDEX idx_vlms_maintenance_status ON vlms_maintenance_records(status);
CREATE INDEX idx_vlms_maintenance_type ON vlms_maintenance_records(maintenance_type);
CREATE INDEX idx_vlms_maintenance_scheduled ON vlms_maintenance_records(scheduled_date) WHERE status IN ('scheduled', 'in_progress');
CREATE INDEX idx_vlms_maintenance_actual_date ON vlms_maintenance_records(actual_date);
```

#### 3. `vlms_fuel_logs`

Track fuel consumption and efficiency.

```sql
CREATE TABLE vlms_fuel_logs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vlms_vehicles(id) ON DELETE CASCADE,

  -- Transaction Details
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transaction_number VARCHAR(100),

  -- Location
  station_name VARCHAR(255),
  station_location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Fuel Details
  fuel_type VARCHAR(50) NOT NULL, -- gasoline, diesel, electric
  quantity DECIMAL(10, 2) NOT NULL, -- liters or kWh
  unit_price DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  -- Vehicle State
  odometer_reading DECIMAL(10, 2) NOT NULL,
  trip_distance DECIMAL(10, 2), -- since last fill-up
  fuel_efficiency DECIMAL(8, 2), -- km/L or kWh/100km

  -- Payment
  payment_method VARCHAR(50), -- cash, card, fuel_card, account
  fuel_card_number VARCHAR(50),
  receipt_number VARCHAR(100),

  -- Personnel
  driver_id UUID REFERENCES profiles(id),
  driver_name VARCHAR(255),

  -- Documents
  receipt_url TEXT,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX idx_vlms_fuel_vehicle ON vlms_fuel_logs(vehicle_id);
CREATE INDEX idx_vlms_fuel_date ON vlms_fuel_logs(transaction_date);
CREATE INDEX idx_vlms_fuel_driver ON vlms_fuel_logs(driver_id);
```

#### 4. `vlms_assignments`

Track vehicle assignments to drivers and locations.

```sql
CREATE TABLE vlms_assignments (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: ASN-2024-001
  vehicle_id UUID NOT NULL REFERENCES vlms_vehicles(id) ON DELETE CASCADE,

  -- Assignment Details
  assigned_to_id UUID REFERENCES profiles(id), -- Driver
  assigned_location_id UUID REFERENCES facilities(id),
  assignment_type VARCHAR(50) NOT NULL, -- permanent, temporary, pool, project

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  actual_return_date DATE,

  -- Purpose
  purpose TEXT NOT NULL,
  project_name VARCHAR(255),
  authorization_number VARCHAR(100),
  authorized_by_id UUID REFERENCES profiles(id),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, completed, cancelled, overdue

  -- Handover Details
  odometer_start DECIMAL(10, 2),
  odometer_end DECIMAL(10, 2),
  fuel_level_start DECIMAL(5, 2), -- percentage
  fuel_level_end DECIMAL(5, 2),
  condition_start TEXT,
  condition_end TEXT,

  -- Documents
  assignment_letter_url TEXT,
  return_checklist_url TEXT,
  photos_start JSONB DEFAULT '[]'::jsonb,
  photos_end JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX idx_vlms_assignments_vehicle ON vlms_assignments(vehicle_id);
CREATE INDEX idx_vlms_assignments_driver ON vlms_assignments(assigned_to_id);
CREATE INDEX idx_vlms_assignments_location ON vlms_assignments(assigned_location_id);
CREATE INDEX idx_vlms_assignments_status ON vlms_assignments(status);
CREATE INDEX idx_vlms_assignments_active ON vlms_assignments(start_date, end_date) WHERE status = 'active';
```

#### 5. `vlms_incidents`

Track accidents, damage, and incidents.

```sql
CREATE TABLE vlms_incidents (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: INC-2024-001
  vehicle_id UUID NOT NULL REFERENCES vlms_vehicles(id) ON DELETE CASCADE,

  -- When & Where
  incident_date TIMESTAMPTZ NOT NULL,
  location VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Classification
  incident_type VARCHAR(50) NOT NULL, -- accident, theft, vandalism, breakdown, damage
  severity VARCHAR(20) NOT NULL, -- minor, moderate, major, total_loss

  -- People Involved
  driver_id UUID REFERENCES profiles(id),
  driver_name VARCHAR(255) NOT NULL,
  passengers TEXT,
  other_parties TEXT,

  -- Vehicle State
  odometer_reading DECIMAL(10, 2),
  vehicle_condition_before TEXT,

  -- Description
  description TEXT NOT NULL,
  cause TEXT,
  damages_description TEXT,

  -- Official Reports
  police_report_number VARCHAR(100),
  police_station VARCHAR(255),
  insurance_claim_number VARCHAR(100),
  claim_status VARCHAR(50), -- filed, in_progress, approved, rejected, settled

  -- Financial Impact
  estimated_repair_cost DECIMAL(15, 2),
  actual_repair_cost DECIMAL(15, 2),
  insurance_payout DECIMAL(15, 2),
  deductible_amount DECIMAL(15, 2),

  -- Follow-up
  action_taken TEXT,
  preventive_measures TEXT,
  responsible_party VARCHAR(255),

  -- Documents & Evidence
  police_report_url TEXT,
  insurance_documents JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  witness_statements JSONB DEFAULT '[]'::jsonb,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'reported', -- reported, investigating, resolved, closed
  resolved_date DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX idx_vlms_incidents_vehicle ON vlms_incidents(vehicle_id);
CREATE INDEX idx_vlms_incidents_driver ON vlms_incidents(driver_id);
CREATE INDEX idx_vlms_incidents_date ON vlms_incidents(incident_date);
CREATE INDEX idx_vlms_incidents_type ON vlms_incidents(incident_type);
CREATE INDEX idx_vlms_incidents_status ON vlms_incidents(status);
```

#### 6. `vlms_inspections`

Regular vehicle inspections and safety checks.

```sql
CREATE TABLE vlms_inspections (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: INS-2024-001
  vehicle_id UUID NOT NULL REFERENCES vlms_vehicles(id) ON DELETE CASCADE,

  -- Scheduling
  inspection_date DATE NOT NULL,
  inspection_type VARCHAR(50) NOT NULL, -- routine, annual, pre_trip, post_trip, safety

  -- Inspector
  inspector_id UUID REFERENCES profiles(id),
  inspector_name VARCHAR(255) NOT NULL,
  inspector_certification VARCHAR(100),

  -- Vehicle State
  odometer_reading DECIMAL(10, 2),

  -- Inspection Results
  overall_status VARCHAR(20) NOT NULL, -- pass, fail, conditional
  checklist JSONB NOT NULL, -- Array of {item, category, status, notes}

  -- Categories Checked
  exterior_condition JSONB, -- {status, notes, issues: []}
  interior_condition JSONB,
  engine_mechanical JSONB,
  electrical_system JSONB,
  brakes JSONB,
  tires JSONB,
  lights_signals JSONB,
  safety_equipment JSONB,
  fluid_levels JSONB,

  -- Issues Found
  defects_found TEXT[],
  priority_repairs TEXT[],
  recommendations TEXT,

  -- Follow-up
  next_inspection_date DATE,
  reinspection_required BOOLEAN DEFAULT false,
  reinspection_date DATE,

  -- Compliance
  meets_safety_standards BOOLEAN NOT NULL,
  roadworthy BOOLEAN NOT NULL,
  compliance_notes TEXT,

  -- Documents
  inspection_report_url TEXT,
  photos JSONB DEFAULT '[]'::jsonb,

  -- Certification
  certificate_number VARCHAR(100),
  certificate_issued_date DATE,
  certificate_expiry_date DATE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX idx_vlms_inspections_vehicle ON vlms_inspections(vehicle_id);
CREATE INDEX idx_vlms_inspections_date ON vlms_inspections(inspection_date);
CREATE INDEX idx_vlms_inspections_status ON vlms_inspections(overall_status);
CREATE INDEX idx_vlms_inspections_next ON vlms_inspections(next_inspection_date) WHERE overall_status = 'pass';
```

#### 7. `vlms_disposal_records`

Track vehicle disposal and end-of-life management.

```sql
CREATE TABLE vlms_disposal_records (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disposal_id VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: DSP-2024-001
  vehicle_id UUID NOT NULL REFERENCES vlms_vehicles(id) ON DELETE CASCADE,

  -- Disposal Details
  disposal_date DATE NOT NULL,
  disposal_method VARCHAR(50) NOT NULL, -- sale, auction, scrap, donation, trade_in
  disposal_reason TEXT NOT NULL,

  -- Financial
  final_book_value DECIMAL(15, 2),
  disposal_value DECIMAL(15, 2),
  gain_loss DECIMAL(15, 2) GENERATED ALWAYS AS (disposal_value - final_book_value) STORED,

  -- Buyer/Recipient Details
  buyer_name VARCHAR(255),
  buyer_contact VARCHAR(255),
  buyer_address TEXT,

  -- Vehicle Final State
  final_mileage DECIMAL(10, 2),
  final_condition TEXT,
  total_lifecycle_cost DECIMAL(15, 2), -- acquisition + maintenance + operational

  -- Documentation
  disposal_authorization_number VARCHAR(100),
  authorized_by_id UUID REFERENCES profiles(id),
  bill_of_sale_url TEXT,
  release_documents JSONB DEFAULT '[]'::jsonb,
  final_photos JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX idx_vlms_disposal_vehicle ON vlms_disposal_records(vehicle_id);
CREATE INDEX idx_vlms_disposal_date ON vlms_disposal_records(disposal_date);
CREATE INDEX idx_vlms_disposal_method ON vlms_disposal_records(disposal_method);
```

---

## Phase Breakdown

### Phase 0: Database Foundation (Days 1-2)

**Objective**: Set up database schema, RLS policies, and base infrastructure.

**Tasks**:
1. Create migration file for all 7 tables
2. Set up RLS policies for each table
3. Create database functions for auto-generated IDs
4. Create views for common queries
5. Set up triggers for `updated_at` timestamps
6. Create indexes for performance
7. Add sample seed data for testing

**Deliverables**:
- Migration file: `20241113000000_vlms_schema.sql`
- Seed file: `vlms_seed.sql`
- Database documentation

**Testing**:
- Run migrations in local Supabase
- Verify RLS policies work correctly
- Test auto-generated IDs
- Validate foreign key constraints

### Phase 1: Vehicle Management (Days 3-5)

**Objective**: Core vehicle CRUD operations with comprehensive details.

**Features**:
- Vehicle registration and profile management
- Document and photo uploads
- Status management (available, in_use, maintenance, etc.)
- Basic search and filtering
- Vehicle list and detail views

**Components**:
```
src/pages/fleetops/vlms/
├── vehicles/
│   ├── page.tsx                 # Vehicle list with filters
│   ├── [id]/
│   │   └── page.tsx             # Vehicle detail view
│   └── components/
│       ├── VehicleForm.tsx      # Add/Edit form
│       ├── VehicleCard.tsx      # Grid card view
│       ├── VehicleFilters.tsx   # Search/filter sidebar
│       ├── VehicleStatusBadge.tsx
│       └── DocumentUpload.tsx
```

**Zustand Stores**:
```typescript
// src/stores/vlmsVehiclesStore.ts
interface VehiclesStore {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  filters: VehicleFilters;
  setFilters: (filters: Partial<VehicleFilters>) => void;
  fetchVehicles: () => Promise<void>;
  createVehicle: (data: VehicleFormData) => Promise<void>;
  updateVehicle: (id: string, data: Partial<VehicleFormData>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
}
```

**Deliverables**:
- Vehicle management UI (list, create, edit, delete)
- File upload functionality
- Filtering and search
- Vehicle detail dashboard

### Phase 2: Maintenance Tracking (Days 6-8)

**Objective**: Comprehensive maintenance and service history tracking.

**Features**:
- Schedule maintenance (routine, repair, inspection)
- Record service history
- Track costs (labor + parts)
- Maintenance calendar view
- Upcoming maintenance alerts
- Service reminders based on mileage/date

**Components**:
```
src/pages/fleetops/vlms/
├── maintenance/
│   ├── page.tsx                     # Maintenance dashboard
│   ├── calendar/
│   │   └── page.tsx                 # Calendar view
│   └── components/
│       ├── MaintenanceForm.tsx      # Schedule/Record form
│       ├── MaintenanceCard.tsx
│       ├── MaintenanceCalendar.tsx  # Full calendar component
│       ├── ServiceHistoryTable.tsx
│       └── CostBreakdown.tsx
```

**Zustand Stores**:
```typescript
// src/stores/vlmsMaintenanceStore.ts
interface MaintenanceStore {
  records: MaintenanceRecord[];
  upcomingMaintenance: MaintenanceRecord[];
  fetchRecords: (vehicleId?: string) => Promise<void>;
  scheduleService: (data: MaintenanceFormData) => Promise<void>;
  completeService: (id: string, data: CompletionData) => Promise<void>;
}
```

**Deliverables**:
- Maintenance scheduling UI
- Service record forms
- Calendar view
- Cost tracking
- Automated reminders

### Phase 3: Fuel & Operational Logs (Days 9-10)

**Objective**: Track fuel consumption, efficiency, and operational metrics.

**Features**:
- Log fuel purchases
- Calculate fuel efficiency (km/L)
- Fuel cost analysis
- Station tracking
- Efficiency trends and reports

**Components**:
```
src/pages/fleetops/vlms/
├── fuel/
│   ├── page.tsx                 # Fuel log list
│   └── components/
│       ├── FuelLogForm.tsx
│       ├── FuelLogTable.tsx
│       ├── EfficiencyChart.tsx  # Recharts
│       └── FuelCostSummary.tsx
```

**Deliverables**:
- Fuel log entry UI
- Efficiency calculations
- Cost analytics
- Visual reports

### Phase 4: Assignments & Incidents (Days 11-13)

**Objective**: Vehicle assignment tracking and incident management.

**Features**:
- Assign vehicles to drivers/locations
- Track assignment history
- Record incidents (accidents, damage, theft)
- Insurance claim tracking
- Incident reports and documentation

**Components**:
```
src/pages/fleetops/vlms/
├── assignments/
│   ├── page.tsx
│   └── components/
│       ├── AssignmentForm.tsx
│       ├── AssignmentHistory.tsx
│       └── HandoverChecklist.tsx
├── incidents/
│   ├── page.tsx
│   └── components/
│       ├── IncidentForm.tsx
│       ├── IncidentCard.tsx
│       └── IncidentTimeline.tsx
```

**Deliverables**:
- Assignment management UI
- Incident reporting system
- Document/photo uploads
- Status tracking

### Phase 5: Inspections & Reports (Days 14-16)

**Objective**: Safety inspections and comprehensive reporting.

**Features**:
- Digital inspection checklists
- Safety compliance tracking
- Fleet analytics dashboard
- Custom reports (maintenance costs, fuel efficiency, utilization)
- Export to PDF/Excel

**Components**:
```
src/pages/fleetops/vlms/
├── inspections/
│   ├── page.tsx
│   └── components/
│       ├── InspectionForm.tsx
│       ├── ChecklistBuilder.tsx
│       └── ComplianceStatus.tsx
├── reports/
│   ├── page.tsx
│   └── components/
│       ├── FleetDashboard.tsx
│       ├── MaintenanceCostReport.tsx
│       ├── FuelEfficiencyReport.tsx
│       ├── UtilizationReport.tsx
│       └── ExportDialog.tsx
```

**Deliverables**:
- Inspection system
- Comprehensive analytics
- Custom report builder
- Export functionality

---

## Component Architecture

### Shared Components

Located in `src/components/vlms/`:

```
src/components/vlms/
├── layout/
│   ├── VLMSLayout.tsx           # Main VLMS layout wrapper
│   └── VLMSSidebar.tsx          # Navigation sidebar
├── common/
│   ├── VehicleSelector.tsx      # Reusable vehicle dropdown
│   ├── DriverSelector.tsx
│   ├── LocationSelector.tsx
│   ├── DateRangePicker.tsx
│   ├── FileUploadZone.tsx       # Drag-drop upload
│   ├── ImageGallery.tsx
│   └── PDFViewer.tsx
├── charts/
│   ├── CostTrendChart.tsx
│   ├── FuelEfficiencyChart.tsx
│   ├── MaintenanceFrequencyChart.tsx
│   └── UtilizationChart.tsx
└── tables/
    ├── VehicleDataTable.tsx
    ├── MaintenanceDataTable.tsx
    └── FuelLogDataTable.tsx
```

### Design System Integration

All components will use existing BIKO design tokens:

```typescript
// Example component styling
<Card className="bg-surface-primary border-border-primary">
  <CardHeader className="border-b border-border-subtle">
    <CardTitle className="text-text-primary">Vehicle Details</CardTitle>
  </CardHeader>
  <CardContent className="text-text-secondary">
    {/* Content */}
  </CardContent>
</Card>
```

---

## State Management

### Zustand Store Structure

```typescript
// src/stores/vlms/vehiclesStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface VehiclesState {
  // State
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  filters: VehicleFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  setVehicles: (vehicles: Vehicle[]) => void;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  setFilters: (filters: Partial<VehicleFilters>) => void;

  // Async Actions
  fetchVehicles: () => Promise<void>;
  createVehicle: (data: VehicleFormData) => Promise<Vehicle>;
  updateVehicle: (id: string, data: Partial<VehicleFormData>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  uploadDocument: (vehicleId: string, file: File, type: string) => Promise<void>;
}

export const useVehiclesStore = create<VehiclesState>()(
  devtools(
    (set, get) => ({
      // Initial state
      vehicles: [],
      selectedVehicle: null,
      filters: {},
      isLoading: false,
      error: null,

      // Implementations...
    }),
    { name: 'vlms-vehicles' }
  )
);
```

### React Query Integration

For server state caching:

```typescript
// src/hooks/vlms/useVehicles.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useVehicles(filters?: VehicleFilters) {
  return useQuery({
    queryKey: ['vlms', 'vehicles', filters],
    queryFn: () => fetchVehicles(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vlms', 'vehicles'] });
      toast.success('Vehicle created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create vehicle: ${error.message}`);
    },
  });
}
```

---

## API Contracts

### Supabase Edge Functions

#### 1. `vlms-vehicle-operations`

**Purpose**: Complex vehicle operations not suitable for direct client calls.

**Endpoints**:
- `POST /vlms-vehicle-operations/create` - Create vehicle with auto-generated ID
- `PATCH /vlms-vehicle-operations/update-status` - Update status with validation
- `POST /vlms-vehicle-operations/calculate-depreciation` - Recalculate book value
- `GET /vlms-vehicle-operations/available` - Get available vehicles for assignment

#### 2. `vlms-maintenance-scheduler`

**Purpose**: Automated maintenance scheduling and reminders.

**Endpoints**:
- `POST /vlms-maintenance-scheduler/schedule` - Schedule maintenance with auto-reminders
- `GET /vlms-maintenance-scheduler/upcoming` - Get upcoming maintenance
- `POST /vlms-maintenance-scheduler/complete` - Mark complete and update vehicle
- `GET /vlms-maintenance-scheduler/overdue` - Get overdue maintenance

#### 3. `vlms-reports-generator`

**Purpose**: Generate complex reports and analytics.

**Endpoints**:
- `GET /vlms-reports-generator/fleet-summary` - Overall fleet metrics
- `GET /vlms-reports-generator/maintenance-costs` - Cost breakdown by vehicle/period
- `GET /vlms-reports-generator/fuel-efficiency` - Efficiency trends
- `GET /vlms-reports-generator/utilization` - Vehicle utilization rates
- `POST /vlms-reports-generator/export-pdf` - Generate PDF report

---

## Security & RLS Policies

### Row-Level Security Policies

All tables will have comprehensive RLS policies based on user roles.

#### Example: `vlms_vehicles` RLS

```sql
-- Enable RLS
ALTER TABLE vlms_vehicles ENABLE ROW LEVEL SECURITY;

-- Policy: View vehicles
CREATE POLICY "Users can view vehicles in their organization"
ON vlms_vehicles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.organization_id = vlms_vehicles.organization_id
  )
);

-- Policy: Create vehicles (Fleet Managers only)
CREATE POLICY "Fleet managers can create vehicles"
ON vlms_vehicles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'fleet_manager')
  )
);

-- Policy: Update vehicles (Fleet Managers only)
CREATE POLICY "Fleet managers can update vehicles"
ON vlms_vehicles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'fleet_manager')
  )
);

-- Policy: Delete vehicles (Admins only)
CREATE POLICY "Admins can delete vehicles"
ON vlms_vehicles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### File Storage Security

Bucket policies for vehicle documents and photos:

```sql
-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('vlms-documents', 'vlms-documents', false),
  ('vlms-photos', 'vlms-photos', false);

-- Policy: Upload documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vlms-documents'
  AND auth.role() = 'authenticated'
);

-- Policy: View documents
CREATE POLICY "Users can view organization documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vlms-documents');
```

---

## Testing Strategy

### Unit Tests

**Framework**: Vitest

**Coverage**:
- Zustand store actions
- Utility functions (date formatting, calculations)
- Form validation schemas (Zod)
- Data transformations

**Example**:
```typescript
// src/stores/vlms/__tests__/vehiclesStore.test.ts
describe('VehiclesStore', () => {
  it('should add vehicle to store', () => {
    const { result } = renderHook(() => useVehiclesStore());

    act(() => {
      result.current.setVehicles([mockVehicle]);
    });

    expect(result.current.vehicles).toHaveLength(1);
  });
});
```

### Integration Tests

**Framework**: Vitest + Testing Library

**Coverage**:
- Component interactions
- Form submissions
- API calls (mocked)
- Navigation flows

**Example**:
```typescript
// src/pages/fleetops/vlms/vehicles/__tests__/VehicleForm.test.tsx
describe('VehicleForm', () => {
  it('should create vehicle on form submit', async () => {
    const { user } = render(<VehicleForm />);

    await user.type(screen.getByLabelText('Make'), 'Toyota');
    await user.type(screen.getByLabelText('Model'), 'Hilux');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(mockCreateVehicle).toHaveBeenCalledWith(
      expect.objectContaining({ make: 'Toyota', model: 'Hilux' })
    );
  });
});
```

### E2E Tests

**Framework**: Playwright

**Critical Flows**:
1. Register new vehicle → Upload documents → Assign to driver
2. Schedule maintenance → Complete service → View history
3. Log fuel → View efficiency chart
4. Report incident → Attach photos → Track status
5. Generate report → Export to PDF

---

## Deployment Checklist

### Pre-Deployment

- [ ] Run all migrations in staging environment
- [ ] Verify RLS policies work correctly
- [ ] Test file uploads to Supabase Storage
- [ ] Run full test suite (unit + integration + E2E)
- [ ] Check TypeScript compilation (no errors)
- [ ] Review bundle size impact
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test mobile responsiveness
- [ ] Verify accessibility (WCAG 2.1 AA)
- [ ] Load test with sample data (1000+ vehicles)

### Deployment

- [ ] Create production migration backup
- [ ] Run migrations in production
- [ ] Deploy Edge Functions
- [ ] Configure storage buckets
- [ ] Set up monitoring alerts
- [ ] Deploy frontend build
- [ ] Verify DNS/routing
- [ ] Smoke test critical flows

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify realtime subscriptions
- [ ] Test with real users
- [ ] Gather initial feedback
- [ ] Create user documentation
- [ ] Train fleet managers
- [ ] Set up support channels

---

## Acceptance Criteria

### Phase 1: Vehicle Management

- [ ] Users can register new vehicles with all required fields
- [ ] Users can upload multiple documents and photos
- [ ] Users can update vehicle status (available, in_use, maintenance, etc.)
- [ ] Users can search vehicles by make, model, license plate, VIN
- [ ] Users can filter vehicles by status, type, location
- [ ] Vehicle detail page shows comprehensive information
- [ ] Warehouse code auto-generates in correct format
- [ ] Validation prevents duplicate VIN/license plates

### Phase 2: Maintenance Tracking

- [ ] Users can schedule maintenance (routine, repair, inspection)
- [ ] Users can record completed service with costs
- [ ] System calculates next service date based on rules
- [ ] Calendar view shows scheduled and overdue maintenance
- [ ] Users can attach invoices and photos
- [ ] Maintenance history visible on vehicle detail page
- [ ] Total maintenance cost updates on vehicle record

### Phase 3: Fuel & Operational Logs

- [ ] Users can log fuel purchases with all details
- [ ] System calculates fuel efficiency (km/L)
- [ ] Fuel efficiency chart shows trends over time
- [ ] Users can filter fuel logs by vehicle, date range
- [ ] Cost summary shows total spend by vehicle/period
- [ ] Odometer readings validate (must increase)

### Phase 4: Assignments & Incidents

- [ ] Users can assign vehicles to drivers with start/end dates
- [ ] System prevents double-booking vehicles
- [ ] Assignment history visible on vehicle detail page
- [ ] Users can record incidents with full details
- [ ] Users can upload police reports and photos
- [ ] Insurance claim status tracked
- [ ] Incident timeline shows chronological events

### Phase 5: Inspections & Reports

- [ ] Users can conduct inspections with digital checklist
- [ ] System flags vehicles failing inspection
- [ ] Next inspection date calculated automatically
- [ ] Fleet dashboard shows key metrics (utilization, costs, efficiency)
- [ ] Users can generate custom reports
- [ ] Reports can be exported to PDF/Excel
- [ ] Charts and graphs render correctly

---

## Risk Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database performance with large datasets | Medium | High | Proper indexing, query optimization, pagination |
| File upload failures | Medium | Medium | Retry logic, chunked uploads, error handling |
| Complex RLS policies causing slowdowns | Low | Medium | Test with realistic data volumes, optimize policies |
| Realtime subscription limits | Low | Medium | Implement polling fallback, rate limiting |
| Migration failures | Low | High | Backup before migration, rollback plan, staging test |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| User adoption resistance | Medium | High | Training, user-friendly UI, gradual rollout |
| Data entry errors | High | Medium | Validation, required fields, format guides |
| Incomplete historical data | High | Low | Import tools, data cleanup scripts |
| Changing requirements mid-project | Medium | Medium | Modular architecture, regular stakeholder reviews |

---

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 0: Database Foundation | 2 days | None |
| Phase 1: Vehicle Management | 3 days | Phase 0 |
| Phase 2: Maintenance Tracking | 3 days | Phase 1 |
| Phase 3: Fuel & Operational Logs | 2 days | Phase 1 |
| Phase 4: Assignments & Incidents | 3 days | Phase 1 |
| Phase 5: Inspections & Reports | 3 days | Phases 2-4 |
| **Total** | **16 days** | |

**Buffer**: Add 4-8 days for testing, bug fixes, and documentation.

**Estimated Total**: 20-24 calendar days (3-4 weeks)

---

## Next Steps

1. **Review & Approve**: Stakeholder review of this plan
2. **Prioritize**: Confirm phase priorities or adjust order
3. **Kickoff**: Schedule Phase 0 start date
4. **Daily Standups**: Brief progress checks
5. **Weekly Demos**: Show working features to stakeholders
6. **Feedback Loops**: Incorporate feedback between phases

---

## Appendix

### A. Sample Data Structures

#### Vehicle JSON Example

```json
{
  "vehicle_id": "VEH-2024-001",
  "make": "Toyota",
  "model": "Hilux",
  "year": 2023,
  "vin": "JTFDE626000000000",
  "license_plate": "KN-1234-ABC",
  "vehicle_type": "truck",
  "fuel_type": "diesel",
  "acquisition_date": "2023-06-15",
  "status": "available",
  "current_mileage": 15234.50,
  "documents": [
    {
      "name": "registration.pdf",
      "url": "https://...",
      "type": "registration",
      "uploaded_at": "2023-06-15T10:30:00Z"
    }
  ],
  "photos": [
    {
      "url": "https://...",
      "caption": "Front view",
      "uploaded_at": "2023-06-15T10:35:00Z"
    }
  ]
}
```

### B. Database Functions

```sql
-- Auto-generate vehicle ID
CREATE OR REPLACE FUNCTION generate_vehicle_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.vehicle_id := 'VEH-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
    LPAD(NEXTVAL('vehicle_id_seq')::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_vehicle_id
BEFORE INSERT ON vlms_vehicles
FOR EACH ROW
EXECUTE FUNCTION generate_vehicle_id();
```

### C. Validation Schemas

```typescript
// src/lib/vlms/validationSchemas.ts
import { z } from 'zod';

export const vehicleFormSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  vin: z.string().length(17, 'VIN must be 17 characters').optional(),
  license_plate: z.string().min(1, 'License plate is required'),
  vehicle_type: z.enum(['sedan', 'suv', 'truck', 'van', 'motorcycle']),
  fuel_type: z.enum(['gasoline', 'diesel', 'electric', 'hybrid']),
  acquisition_date: z.date(),
  acquisition_type: z.enum(['purchase', 'lease', 'donation']),
  purchase_price: z.number().positive().optional(),
});
```

---

**Document Version**: 1.0
**Last Updated**: 2024-11-13
**Author**: Claude Code
**Status**: Draft - Awaiting Approval
