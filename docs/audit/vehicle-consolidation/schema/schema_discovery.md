# BIKO Vehicle Database Schema - Complete Production Mapping

## Executive Summary

The BIKO application maintains **two distinct vehicle management systems** with different table structures:
1. **Production `vehicles` table** - Simplified, active production schema for fleet operations
2. **VLMS (Vehicle Lifecycle Management System)** - Comprehensive vehicle management with full lifecycle tracking via `vlms_vehicles` table

This report maps the complete production database schema for all vehicle-related tables, including schema reconciliation with TypeScript types.

---

## 1. Schema Overview: Vehicle-Related Tables

### Core Tables
- **`vehicles`** - Primary production vehicle registry (simplified schema)
- **`vlms_vehicles`** - Comprehensive VLMS vehicle registry (full lifecycle)
- **`vehicle_categories`** - EU/BIKO vehicle classification standards
- **`vehicle_types`** - Operational vehicle subtypes
- **`vehicle_tiers`** - Normalized tier-based capacity storage
- **`fleets`** - Fleet organization and hierarchy
- **`vehicle_maintenance`** - Maintenance records (references `vehicles`)
- **`vehicle_trips`** - Trip tracking (references `vehicles`)

### VLMS Extended Tables
- **`vlms_maintenance_records`** - Comprehensive maintenance tracking
- **`vlms_fuel_logs`** - Fuel consumption tracking
- **`vlms_assignments`** - Vehicle assignment management
- **`vlms_incidents`** - Accident/incident tracking
- **`vlms_inspections`** - Safety inspection records
- **`vlms_disposal_records`** - End-of-life vehicle disposal

---

## 2. Detailed Schema: `vehicles` Table (Production)

### Column Definitions

| Column Name | Data Type | Constraints | Default | Description |
|------------|-----------|-------------|---------|-------------|
| `id` | UUID | PRIMARY KEY | `gen_random_uuid()` | Unique vehicle identifier |
| `type` | TEXT | NOT NULL | - | Vehicle type (formerly ENUM, converted to TEXT) |
| `model` | TEXT | NOT NULL | - | Vehicle model/make |
| `plate_number` | TEXT | NOT NULL, UNIQUE | - | License plate number |
| `capacity` | DECIMAL(10,2) | NOT NULL | - | Cargo capacity in cubic meters |
| `max_weight` | INTEGER | NOT NULL | - | Maximum weight capacity in kg |
| `fuel_type` | fuel_type (ENUM) | NOT NULL | - | Fuel type: 'diesel', 'petrol', 'electric' |
| `avg_speed` | INTEGER | NOT NULL | 40 | Average speed in km/h |
| `fuel_efficiency` | DECIMAL(5,2) | NOT NULL | - | Fuel efficiency metric |
| `status` | vehicle_status (ENUM) | NOT NULL | 'available' | Status: 'available', 'in-use', 'maintenance' |
| `current_driver_id` | UUID | FK → drivers(id) | NULL | Currently assigned driver |
| `fleet_id` | UUID | FK → fleets(id) | NULL | Associated fleet |
| `category_id` | UUID | FK → vehicle_categories(id) | NULL | Vehicle category classification |
| `vehicle_type_id` | UUID | FK → vehicle_types(id) | NULL | Operational vehicle type |
| `photo_url` | TEXT | - | NULL | Full-size vehicle photo URL |
| `thumbnail_url` | TEXT | - | NULL | Thumbnail photo URL |
| `photo_uploaded_at` | TIMESTAMPTZ | - | NULL | Photo upload timestamp |
| `ai_generated` | BOOLEAN | - | FALSE | Whether photo is AI-generated |
| `ai_capacity_image_url` | TEXT | - | NULL | AI-generated capacity visualization |
| `capacity_volume_m3` | FLOAT | - | NULL | Fleet management capacity (m³) |
| `capacity_weight_kg` | FLOAT | - | NULL | Fleet management capacity (kg) |
| `capacity_kg` | NUMERIC | - | NULL | VLMS-style capacity (kg) |
| `capacity_m3` | NUMERIC | - | NULL | VLMS-style capacity (m³) |
| `length_cm` | INTEGER | - | NULL | Cargo area length (cm) |
| `width_cm` | INTEGER | - | NULL | Cargo area width (cm) |
| `height_cm` | INTEGER | - | NULL | Cargo area height (cm) |
| `tiered_config` | JSONB | - | NULL | Tier-based capacity configuration |
| `created_at` | TIMESTAMPTZ | - | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | - | `now()` | Last update timestamp |

### Critical Findings

**CRITICAL ISSUE #1: Foreign Key Mismatch**
- TypeScript types suggest `vehicle_tiers` references production `vehicles` table
- Actual SQL shows `vehicle_tiers` references `vlms_vehicles` table
- Impact: JOIN operations will fail at runtime

**CRITICAL ISSUE #2: Missing VLMS Fields**
The following fields are expected by VLMS onboarding but DO NOT exist:
- `make`, `year`, `vin`, `license_plate` (conflicts with `plate_number`)
- `acquisition_date`, `acquisition_type`, `purchase_price`, `vendor_name`
- `color`, `transmission`, `seating_capacity`, `engine_capacity`
- `insurance_provider`, `insurance_policy_number`, `insurance_expiry`
- `registration_expiry`, `notes`

**Total Missing Fields**: 17

---

See full report for complete schema details, relationships diagram, and recommendations.
