export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_units: {
        Row: {
          admin_level: number
          area_km2: number | null
          bounds: unknown
          center_point: unknown
          country_id: string
          created_at: string | null
          geometry: unknown
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          name_en: string | null
          name_local: string | null
          osm_id: number | null
          osm_type: string | null
          parent_id: string | null
          population: number | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          admin_level: number
          area_km2?: number | null
          bounds?: unknown
          center_point?: unknown
          country_id: string
          created_at?: string | null
          geometry?: unknown
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          name_en?: string | null
          name_local?: string | null
          osm_id?: number | null
          osm_type?: string | null
          parent_id?: string | null
          population?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          admin_level?: number
          area_km2?: number | null
          bounds?: unknown
          center_point?: unknown
          country_id?: string
          created_at?: string | null
          geometry?: unknown
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          name_en?: string | null
          name_local?: string | null
          osm_id?: number | null
          osm_type?: string | null
          parent_id?: string | null
          population?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_units_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "admin_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_units_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          bounds: unknown
          capital: string | null
          created_at: string | null
          currency_code: string | null
          id: string
          is_active: boolean | null
          iso_code: string
          iso3_code: string | null
          metadata: Json | null
          name: string
          phone_code: string | null
          updated_at: string | null
        }
        Insert: {
          bounds?: unknown
          capital?: string | null
          created_at?: string | null
          currency_code?: string | null
          id?: string
          is_active?: boolean | null
          iso_code: string
          iso3_code?: string | null
          metadata?: Json | null
          name: string
          phone_code?: string | null
          updated_at?: string | null
        }
        Update: {
          bounds?: unknown
          capital?: string | null
          created_at?: string | null
          currency_code?: string | null
          id?: string
          is_active?: boolean | null
          iso_code?: string
          iso3_code?: string | null
          metadata?: Json | null
          name?: string
          phone_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_batches: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          created_at: string | null
          driver_id: string | null
          estimated_distance_km: number | null
          estimated_duration: number
          estimated_duration_min: number | null
          external_route_data: Json | null
          facility_ids: string[]
          id: string
          medication_type: string
          name: string
          notes: string | null
          optimized_route: Json
          payload_utilization_pct: number | null
          priority: Database["public"]["Enums"]["delivery_priority"]
          route_constraints: Json | null
          route_optimization_method: string | null
          scheduled_date: string
          scheduled_time: string
          status: Database["public"]["Enums"]["batch_status"]
          total_distance: number
          total_quantity: number
          total_volume: number | null
          total_weight: number | null
          updated_at: string | null
          vehicle_id: string | null
          warehouse_id: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          created_at?: string | null
          driver_id?: string | null
          estimated_distance_km?: number | null
          estimated_duration: number
          estimated_duration_min?: number | null
          external_route_data?: Json | null
          facility_ids: string[]
          id?: string
          medication_type: string
          name: string
          notes?: string | null
          optimized_route: Json
          payload_utilization_pct?: number | null
          priority?: Database["public"]["Enums"]["delivery_priority"]
          route_constraints?: Json | null
          route_optimization_method?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: Database["public"]["Enums"]["batch_status"]
          total_distance: number
          total_quantity: number
          total_volume?: number | null
          total_weight?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
          warehouse_id: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          created_at?: string | null
          driver_id?: string | null
          estimated_distance_km?: number | null
          estimated_duration?: number
          estimated_duration_min?: number | null
          external_route_data?: Json | null
          facility_ids?: string[]
          id?: string
          medication_type?: string
          name?: string
          notes?: string | null
          optimized_route?: Json
          payload_utilization_pct?: number | null
          priority?: Database["public"]["Enums"]["delivery_priority"]
          route_constraints?: Json | null
          route_optimization_method?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["batch_status"]
          total_distance?: number
          total_quantity?: number
          total_volume?: number | null
          total_weight?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_batches_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_batches_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_batches_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_batches_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_tier_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_batches_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_schedules: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          created_by: string | null
          dispatched_at: string | null
          driver_id: string | null
          facility_ids: string[]
          id: string
          notes: string | null
          optimization_method: string | null
          planned_date: string
          route: Json | null
          status: string | null
          time_window: string | null
          title: string
          total_payload_kg: number | null
          total_volume_m3: number | null
          updated_at: string | null
          vehicle_id: string | null
          warehouse_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          dispatched_at?: string | null
          driver_id?: string | null
          facility_ids?: string[]
          id?: string
          notes?: string | null
          optimization_method?: string | null
          planned_date: string
          route?: Json | null
          status?: string | null
          time_window?: string | null
          title: string
          total_payload_kg?: number | null
          total_volume_m3?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
          warehouse_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          dispatched_at?: string | null
          driver_id?: string | null
          facility_ids?: string[]
          id?: string
          notes?: string | null
          optimization_method?: string | null
          planned_date?: string
          route?: Json | null
          status?: string | null
          time_window?: string | null
          title?: string
          total_payload_kg?: number | null
          total_volume_m3?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_tier_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_schedules_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_availability: {
        Row: {
          available: boolean | null
          created_at: string | null
          date: string
          driver_id: string
          id: string
          reason: string | null
        }
        Insert: {
          available?: boolean | null
          created_at?: string | null
          date: string
          driver_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          available?: boolean | null
          created_at?: string | null
          date?: string
          driver_id?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_availability_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_vehicle_history: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          driver_id: string
          id: string
          is_current: boolean | null
          notes: string | null
          total_distance: number | null
          total_trips: number | null
          unassigned_at: string | null
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          driver_id: string
          id?: string
          is_current?: boolean | null
          notes?: string | null
          total_distance?: number | null
          total_trips?: number | null
          unassigned_at?: string | null
          vehicle_id: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          driver_id?: string
          id?: string
          is_current?: boolean | null
          notes?: string | null
          total_distance?: number | null
          total_trips?: number | null
          unassigned_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_vehicle_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_tier_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string | null
          current_lat: number | null
          current_lng: number | null
          id: string
          license_expiry: string | null
          license_type: Database["public"]["Enums"]["license_type"]
          license_verified: boolean | null
          location_updated_at: string | null
          max_hours: number
          name: string
          on_time_percentage: number | null
          onboarding_completed: boolean | null
          performance_score: number | null
          phone: string
          shift_end: string
          shift_start: string
          status: Database["public"]["Enums"]["driver_status"]
          total_deliveries: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          license_expiry?: string | null
          license_type?: Database["public"]["Enums"]["license_type"]
          license_verified?: boolean | null
          location_updated_at?: string | null
          max_hours?: number
          name: string
          on_time_percentage?: number | null
          onboarding_completed?: boolean | null
          performance_score?: number | null
          phone: string
          shift_end: string
          shift_start: string
          status?: Database["public"]["Enums"]["driver_status"]
          total_deliveries?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          license_expiry?: string | null
          license_type?: Database["public"]["Enums"]["license_type"]
          license_verified?: boolean | null
          location_updated_at?: string | null
          max_hours?: number
          name?: string
          on_time_percentage?: number | null
          onboarding_completed?: boolean | null
          performance_score?: number | null
          phone?: string
          shift_end?: string
          shift_start?: string
          status?: Database["public"]["Enums"]["driver_status"]
          total_deliveries?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      facilities: {
        Row: {
          address: string
          admin_unit_id: string | null
          capacity: number | null
          contact_person: string | null
          created_at: string | null
          id: string
          lat: number
          lga: string | null
          lng: number
          name: string
          operating_hours: string | null
          phone: string | null
          state: string | null
          type: Database["public"]["Enums"]["facility_type"]
          updated_at: string | null
          ward: string | null
          workspace_id: string | null
        }
        Insert: {
          address: string
          admin_unit_id?: string | null
          capacity?: number | null
          contact_person?: string | null
          created_at?: string | null
          id?: string
          lat: number
          lga?: string | null
          lng: number
          name: string
          operating_hours?: string | null
          phone?: string | null
          state?: string | null
          type?: Database["public"]["Enums"]["facility_type"]
          updated_at?: string | null
          ward?: string | null
          workspace_id?: string | null
        }
        Update: {
          address?: string
          admin_unit_id?: string | null
          capacity?: number | null
          contact_person?: string | null
          created_at?: string | null
          id?: string
          lat?: number
          lga?: string | null
          lng?: number
          name?: string
          operating_hours?: string | null
          phone?: string | null
          state?: string | null
          type?: Database["public"]["Enums"]["facility_type"]
          updated_at?: string | null
          ward?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facilities_admin_unit_id_fkey"
            columns: ["admin_unit_id"]
            isOneToOne: false
            referencedRelation: "admin_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facilities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fleets: {
        Row: {
          created_at: string | null
          id: string
          mission: string | null
          name: string
          parent_fleet_id: string | null
          service_area_id: string | null
          status: string | null
          vendor_id: string | null
          zone_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mission?: string | null
          name: string
          parent_fleet_id?: string | null
          service_area_id?: string | null
          status?: string | null
          vendor_id?: string | null
          zone_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mission?: string | null
          name?: string
          parent_fleet_id?: string | null
          service_area_id?: string | null
          status?: string | null
          vendor_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleets_parent_fleet_id_fkey"
            columns: ["parent_fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleets_service_area_id_fkey"
            columns: ["service_area_id"]
            isOneToOne: false
            referencedRelation: "service_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleets_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "service_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      handoffs: {
        Row: {
          actual_time: string | null
          created_at: string | null
          created_by: string | null
          from_batch_id: string
          from_vehicle_id: string
          id: string
          location_lat: number
          location_lng: number
          notes: string | null
          scheduled_time: string | null
          status: string | null
          to_vehicle_id: string
        }
        Insert: {
          actual_time?: string | null
          created_at?: string | null
          created_by?: string | null
          from_batch_id: string
          from_vehicle_id: string
          id?: string
          location_lat: number
          location_lng: number
          notes?: string | null
          scheduled_time?: string | null
          status?: string | null
          to_vehicle_id: string
        }
        Update: {
          actual_time?: string | null
          created_at?: string | null
          created_by?: string | null
          from_batch_id?: string
          from_vehicle_id?: string
          id?: string
          location_lat?: number
          location_lng?: number
          notes?: string | null
          scheduled_time?: string | null
          status?: string | null
          to_vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handoffs_from_batch_id_fkey"
            columns: ["from_batch_id"]
            isOneToOne: false
            referencedRelation: "delivery_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_from_vehicle_id_fkey"
            columns: ["from_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_from_vehicle_id_fkey"
            columns: ["from_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_from_vehicle_id_fkey"
            columns: ["from_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_tier_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_from_vehicle_id_fkey"
            columns: ["from_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_to_vehicle_id_fkey"
            columns: ["to_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_to_vehicle_id_fkey"
            columns: ["to_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_to_vehicle_id_fkey"
            columns: ["to_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_tier_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_to_vehicle_id_fkey"
            columns: ["to_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      optimization_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          estimated_duration: number
          expires_at: string
          facility_ids: string[]
          id: string
          optimized_route: Json
          total_distance: number
          warehouse_id: string
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          estimated_duration: number
          expires_at: string
          facility_ids: string[]
          id?: string
          optimized_route: Json
          total_distance: number
          warehouse_id: string
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          estimated_duration?: number
          expires_at?: string
          facility_ids?: string[]
          id?: string
          optimized_route?: Json
          total_distance?: number
          warehouse_id?: string
        }
        Relationships: []
      }
      optimization_runs: {
        Row: {
          algorithm_used: string | null
          avg_capacity_utilization: number | null
          capacity_threshold: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          facility_ids: string[]
          id: string
          optimization_time_ms: number | null
          priority_weights: Json | null
          result_batches: Json | null
          run_name: string | null
          scheduler_batch_ids: string[] | null
          status: Database["public"]["Enums"]["optimization_status"] | null
          time_window_mode: string | null
          total_batches_created: number | null
          total_distance_km: number | null
          total_duration_min: number | null
          vehicle_constraints: Json | null
          warehouse_id: string | null
        }
        Insert: {
          algorithm_used?: string | null
          avg_capacity_utilization?: number | null
          capacity_threshold?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          facility_ids: string[]
          id?: string
          optimization_time_ms?: number | null
          priority_weights?: Json | null
          result_batches?: Json | null
          run_name?: string | null
          scheduler_batch_ids?: string[] | null
          status?: Database["public"]["Enums"]["optimization_status"] | null
          time_window_mode?: string | null
          total_batches_created?: number | null
          total_distance_km?: number | null
          total_duration_min?: number | null
          vehicle_constraints?: Json | null
          warehouse_id?: string | null
        }
        Update: {
          algorithm_used?: string | null
          avg_capacity_utilization?: number | null
          capacity_threshold?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          facility_ids?: string[]
          id?: string
          optimization_time_ms?: number | null
          priority_weights?: Json | null
          result_batches?: Json | null
          run_name?: string | null
          scheduler_batch_ids?: string[] | null
          status?: Database["public"]["Enums"]["optimization_status"] | null
          time_window_mode?: string | null
          total_batches_created?: number | null
          total_distance_km?: number | null
          total_duration_min?: number | null
          vehicle_constraints?: Json | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optimization_runs_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      payload_items: {
        Row: {
          batch_id: string | null
          box_type: string | null
          created_at: string | null
          custom_height_cm: number | null
          custom_length_cm: number | null
          custom_width_cm: number | null
          facility_id: string | null
          id: string
          quantity: number | null
          status: string | null
          volume_m3: number | null
          weight_kg: number | null
        }
        Insert: {
          batch_id?: string | null
          box_type?: string | null
          created_at?: string | null
          custom_height_cm?: number | null
          custom_length_cm?: number | null
          custom_width_cm?: number | null
          facility_id?: string | null
          id?: string
          quantity?: number | null
          status?: string | null
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Update: {
          batch_id?: string | null
          box_type?: string | null
          created_at?: string | null
          custom_height_cm?: number | null
          custom_length_cm?: number | null
          custom_width_cm?: number | null
          facility_id?: string | null
          id?: string
          quantity?: number | null
          status?: string | null
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payload_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "delivery_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payload_items_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recurring_schedules: {
        Row: {
          active: boolean | null
          created_at: string | null
          end_date: string | null
          facility_ids: string[]
          id: string
          medication_type: string
          name: string
          priority: Database["public"]["Enums"]["delivery_priority"] | null
          quantity: number
          recurrence_days: number[] | null
          recurrence_type: string
          scheduled_time: string
          start_date: string
          warehouse_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          end_date?: string | null
          facility_ids: string[]
          id?: string
          medication_type: string
          name: string
          priority?: Database["public"]["Enums"]["delivery_priority"] | null
          quantity: number
          recurrence_days?: number[] | null
          recurrence_type: string
          scheduled_time: string
          start_date: string
          warehouse_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          end_date?: string | null
          facility_ids?: string[]
          id?: string
          medication_type?: string
          name?: string
          priority?: Database["public"]["Enums"]["delivery_priority"] | null
          quantity?: number
          recurrence_days?: number[] | null
          recurrence_type?: string
          scheduled_time?: string
          start_date?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      requisition_items: {
        Row: {
          created_at: string
          handling_instructions: string | null
          id: string
          item_name: string
          quantity: number
          requisition_id: string
          temperature_required: boolean | null
          unit: string
          volume_m3: number | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          handling_instructions?: string | null
          id?: string
          item_name: string
          quantity: number
          requisition_id: string
          temperature_required?: boolean | null
          unit?: string
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          handling_instructions?: string | null
          id?: string
          item_name?: string
          quantity?: number
          requisition_id?: string
          temperature_required?: boolean | null
          unit?: string
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      requisitions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          facility_id: string
          fulfilled_at: string | null
          id: string
          notes: string | null
          priority: string
          rejection_reason: string | null
          requested_by: string
          requested_delivery_date: string
          requisition_number: string
          status: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          facility_id: string
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          priority?: string
          rejection_reason?: string | null
          requested_by: string
          requested_delivery_date: string
          requisition_number: string
          status?: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          facility_id?: string
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          priority?: string
          rejection_reason?: string | null
          requested_by?: string
          requested_delivery_date?: string
          requisition_number?: string
          status?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: []
      }
      route_history: {
        Row: {
          actual_arrival: string | null
          actual_duration: number | null
          batch_id: string
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          delay_reason: string | null
          distance_from_previous: number | null
          facility_id: string
          handoff_id: string | null
          id: string
          notes: string | null
          planned_arrival: string | null
          planned_duration: number | null
          proof_of_delivery_url: string | null
          recipient_name: string | null
          sequence_number: number
          status: string | null
        }
        Insert: {
          actual_arrival?: string | null
          actual_duration?: number | null
          batch_id: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          delay_reason?: string | null
          distance_from_previous?: number | null
          facility_id: string
          handoff_id?: string | null
          id?: string
          notes?: string | null
          planned_arrival?: string | null
          planned_duration?: number | null
          proof_of_delivery_url?: string | null
          recipient_name?: string | null
          sequence_number: number
          status?: string | null
        }
        Update: {
          actual_arrival?: string | null
          actual_duration?: number | null
          batch_id?: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          delay_reason?: string | null
          distance_from_previous?: number | null
          facility_id?: string
          handoff_id?: string | null
          id?: string
          notes?: string | null
          planned_arrival?: string | null
          planned_duration?: number | null
          proof_of_delivery_url?: string | null
          recipient_name?: string | null
          sequence_number?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "delivery_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_history_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_history_handoff_id_fkey"
            columns: ["handoff_id"]
            isOneToOne: false
            referencedRelation: "handoffs"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          active: boolean | null
          auto_schedule: boolean | null
          created_at: string | null
          created_by: string | null
          default_driver_id: string | null
          default_vehicle_id: string | null
          description: string | null
          facility_ids: string[]
          id: string
          last_used_at: string | null
          name: string
          priority: string | null
          recurrence_days: number[] | null
          recurrence_type: string | null
          time_window: string | null
          updated_at: string | null
          usage_count: number | null
          warehouse_id: string | null
        }
        Insert: {
          active?: boolean | null
          auto_schedule?: boolean | null
          created_at?: string | null
          created_by?: string | null
          default_driver_id?: string | null
          default_vehicle_id?: string | null
          description?: string | null
          facility_ids?: string[]
          id?: string
          last_used_at?: string | null
          name: string
          priority?: string | null
          recurrence_days?: number[] | null
          recurrence_type?: string | null
          time_window?: string | null
          updated_at?: string | null
          usage_count?: number | null
          warehouse_id?: string | null
        }
        Update: {
          active?: boolean | null
          auto_schedule?: boolean | null
          created_at?: string | null
          created_by?: string | null
          default_driver_id?: string | null
          default_vehicle_id?: string | null
          description?: string | null
          facility_ids?: string[]
          id?: string
          last_used_at?: string | null
          name?: string
          priority?: string | null
          recurrence_days?: number[] | null
          recurrence_type?: string | null
          time_window?: string | null
          updated_at?: string | null
          usage_count?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_templates_default_driver_id_fkey"
            columns: ["default_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_templates_default_vehicle_id_fkey"
            columns: ["default_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_templates_default_vehicle_id_fkey"
            columns: ["default_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_templates_default_vehicle_id_fkey"
            columns: ["default_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_tier_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_templates_default_vehicle_id_fkey"
            columns: ["default_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_templates_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_batches: {
        Row: {
          batch_code: string | null
          capacity_utilization_pct: number | null
          created_at: string | null
          created_by: string | null
          driver_id: string | null
          estimated_duration_min: number | null
          facility_ids: string[]
          id: string
          name: string | null
          notes: string | null
          optimized_route: Json | null
          planned_date: string
          priority: string | null
          published_at: string | null
          published_batch_id: string | null
          scheduled_at: string | null
          scheduling_mode: Database["public"]["Enums"]["scheduling_mode"] | null
          status: Database["public"]["Enums"]["scheduler_batch_status"] | null
          tags: string[] | null
          time_window: string | null
          total_consignments: number | null
          total_distance_km: number | null
          total_volume_m3: number | null
          total_weight_kg: number | null
          updated_at: string | null
          vehicle_id: string | null
          warehouse_id: string | null
          zone: string | null
        }
        Insert: {
          batch_code?: string | null
          capacity_utilization_pct?: number | null
          created_at?: string | null
          created_by?: string | null
          driver_id?: string | null
          estimated_duration_min?: number | null
          facility_ids?: string[]
          id?: string
          name?: string | null
          notes?: string | null
          optimized_route?: Json | null
          planned_date: string
          priority?: string | null
          published_at?: string | null
          published_batch_id?: string | null
          scheduled_at?: string | null
          scheduling_mode?:
            | Database["public"]["Enums"]["scheduling_mode"]
            | null
          status?: Database["public"]["Enums"]["scheduler_batch_status"] | null
          tags?: string[] | null
          time_window?: string | null
          total_consignments?: number | null
          total_distance_km?: number | null
          total_volume_m3?: number | null
          total_weight_kg?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
          warehouse_id?: string | null
          zone?: string | null
        }
        Update: {
          batch_code?: string | null
          capacity_utilization_pct?: number | null
          created_at?: string | null
          created_by?: string | null
          driver_id?: string | null
          estimated_duration_min?: number | null
          facility_ids?: string[]
          id?: string
          name?: string | null
          notes?: string | null
          optimized_route?: Json | null
          planned_date?: string
          priority?: string | null
          published_at?: string | null
          published_batch_id?: string | null
          scheduled_at?: string | null
          scheduling_mode?:
            | Database["public"]["Enums"]["scheduling_mode"]
            | null
          status?: Database["public"]["Enums"]["scheduler_batch_status"] | null
          tags?: string[] | null
          time_window?: string | null
          total_consignments?: number | null
          total_distance_km?: number | null
          total_volume_m3?: number | null
          total_weight_kg?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
          warehouse_id?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_batches_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_batches_published_batch_id_fkey"
            columns: ["published_batch_id"]
            isOneToOne: false
            referencedRelation: "delivery_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_batches_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_batches_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_batches_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_tier_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_batches_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_settings: {
        Row: {
          auto_cluster_enabled: boolean | null
          created_at: string | null
          default_capacity_threshold: number | null
          default_time_window: string | null
          default_view: string | null
          default_warehouse_id: string | null
          id: string
          notify_on_optimization_complete: boolean | null
          notify_on_publish: boolean | null
          show_zones: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_cluster_enabled?: boolean | null
          created_at?: string | null
          default_capacity_threshold?: number | null
          default_time_window?: string | null
          default_view?: string | null
          default_warehouse_id?: string | null
          id?: string
          notify_on_optimization_complete?: boolean | null
          notify_on_publish?: boolean | null
          show_zones?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_cluster_enabled?: boolean | null
          created_at?: string | null
          default_capacity_threshold?: number | null
          default_time_window?: string | null
          default_view?: string | null
          default_warehouse_id?: string | null
          id?: string
          notify_on_optimization_complete?: boolean | null
          notify_on_publish?: boolean | null
          show_zones?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_settings_default_warehouse_id_fkey"
            columns: ["default_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      service_zones: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          geometry: Json
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          geometry: Json
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          geometry?: Json
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_categories: {
        Row: {
          code: string | null
          created_at: string | null
          default_tier_config: Json | null
          description: string | null
          display_name: string
          icon_name: string | null
          id: string
          name: string
          source: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          default_tier_config?: Json | null
          description?: string | null
          display_name: string
          icon_name?: string | null
          id?: string
          name: string
          source?: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          default_tier_config?: Json | null
          description?: string | null
          display_name?: string
          icon_name?: string | null
          id?: string
          name?: string
          source?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      vehicle_maintenance: {
        Row: {
          completed_date: string | null
          cost: number | null
          created_at: string | null
          description: string | null
          id: string
          maintenance_type: string
          odometer_reading: number | null
          scheduled_date: string
          status: string | null
          vehicle_id: string
        }
        Insert: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          maintenance_type: string
          odometer_reading?: number | null
          scheduled_date: string
          status?: string | null
          vehicle_id: string
        }
        Update: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          maintenance_type?: string
          odometer_reading?: number | null
          scheduled_date?: string
          status?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_tier_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_tiers: {
        Row: {
          created_at: string | null
          id: string
          max_volume_m3: number | null
          max_weight_kg: number | null
          tier_name: string
          tier_order: number
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_volume_m3?: number | null
          max_weight_kg?: number | null
          tier_name: string
          tier_order: number
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          max_volume_m3?: number | null
          max_weight_kg?: number | null
          tier_name?: string
          tier_order?: number
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_tiers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_tiers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_tiers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_tier_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_tiers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_trips: {
        Row: {
          batch_id: string | null
          created_at: string | null
          driver_id: string | null
          end_odometer: number | null
          end_time: string | null
          fuel_consumed: number | null
          id: string
          start_odometer: number | null
          start_time: string | null
          vehicle_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          driver_id?: string | null
          end_odometer?: number | null
          end_time?: string | null
          fuel_consumed?: number | null
          id?: string
          start_odometer?: number | null
          start_time?: string | null
          vehicle_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          driver_id?: string | null
          end_odometer?: number | null
          end_time?: string | null
          fuel_consumed?: number | null
          id?: string
          start_odometer?: number | null
          start_time?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_trips_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "delivery_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_with_tier_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles_with_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_types: {
        Row: {
          category_id: string | null
          code: string | null
          created_at: string | null
          created_by: string | null
          default_capacity_kg: number | null
          default_capacity_m3: number | null
          default_tier_config: Json | null
          display_name: string
          icon_name: string | null
          id: string
          is_default: boolean | null
          name: string
        }
        Insert: {
          category_id?: string | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          default_capacity_kg?: number | null
          default_capacity_m3?: number | null
          default_tier_config?: Json | null
          display_name: string
          icon_name?: string | null
          id?: string
          is_default?: boolean | null
          name: string
        }
        Update: {
          category_id?: string | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          default_capacity_kg?: number | null
          default_capacity_m3?: number | null
          default_tier_config?: Json | null
          display_name?: string
          icon_name?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          acquisition_date: string | null
          acquisition_type: string | null
          ai_capacity_image_url: string | null
          ai_generated: boolean | null
          avg_speed: number
          capacity: number
          capacity_kg: number | null
          capacity_m3: number | null
          capacity_volume_m3: number | null
          capacity_weight_kg: number | null
          category_id: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          current_book_value: number | null
          current_driver_id: string | null
          current_location_id: string | null
          current_mileage: number | null
          depreciation_rate: number | null
          documents: Json | null
          engine_capacity: number | null
          fleet_id: string | null
          fuel_efficiency: number
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          height_cm: number | null
          id: string
          insurance_expiry: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          last_inspection_date: string | null
          last_service_date: string | null
          length_cm: number | null
          license_plate: string | null
          make: string | null
          max_weight: number
          model: string
          next_inspection_date: string | null
          next_service_date: string | null
          notes: string | null
          photo_uploaded_at: string | null
          photo_url: string | null
          photos: Json | null
          plate_number: string
          purchase_price: number | null
          registration_expiry: string | null
          seating_capacity: number | null
          status: Database["public"]["Enums"]["vehicle_status"]
          tags: string[] | null
          thumbnail_url: string | null
          tiered_config: Json | null
          total_maintenance_cost: number | null
          transmission: string | null
          type: string
          updated_at: string | null
          updated_by: string | null
          vehicle_id: string | null
          vehicle_type_id: string | null
          vendor_name: string | null
          vin: string | null
          warranty_expiry: string | null
          width_cm: number | null
          year: number | null
        }
        Insert: {
          acquisition_date?: string | null
          acquisition_type?: string | null
          ai_capacity_image_url?: string | null
          ai_generated?: boolean | null
          avg_speed?: number
          capacity: number
          capacity_kg?: number | null
          capacity_m3?: number | null
          capacity_volume_m3?: number | null
          capacity_weight_kg?: number | null
          category_id?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          current_book_value?: number | null
          current_driver_id?: string | null
          current_location_id?: string | null
          current_mileage?: number | null
          depreciation_rate?: number | null
          documents?: Json | null
          engine_capacity?: number | null
          fleet_id?: string | null
          fuel_efficiency: number
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          height_cm?: number | null
          id?: string
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_inspection_date?: string | null
          last_service_date?: string | null
          length_cm?: number | null
          license_plate?: string | null
          make?: string | null
          max_weight: number
          model: string
          next_inspection_date?: string | null
          next_service_date?: string | null
          notes?: string | null
          photo_uploaded_at?: string | null
          photo_url?: string | null
          photos?: Json | null
          plate_number: string
          purchase_price?: number | null
          registration_expiry?: string | null
          seating_capacity?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          tags?: string[] | null
          thumbnail_url?: string | null
          tiered_config?: Json | null
          total_maintenance_cost?: number | null
          transmission?: string | null
          type: string
          updated_at?: string | null
          updated_by?: string | null
          vehicle_id?: string | null
          vehicle_type_id?: string | null
          vendor_name?: string | null
          vin?: string | null
          warranty_expiry?: string | null
          width_cm?: number | null
          year?: number | null
        }
        Update: {
          acquisition_date?: string | null
          acquisition_type?: string | null
          ai_capacity_image_url?: string | null
          ai_generated?: boolean | null
          avg_speed?: number
          capacity?: number
          capacity_kg?: number | null
          capacity_m3?: number | null
          capacity_volume_m3?: number | null
          capacity_weight_kg?: number | null
          category_id?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          current_book_value?: number | null
          current_driver_id?: string | null
          current_location_id?: string | null
          current_mileage?: number | null
          depreciation_rate?: number | null
          documents?: Json | null
          engine_capacity?: number | null
          fleet_id?: string | null
          fuel_efficiency?: number
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          height_cm?: number | null
          id?: string
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_inspection_date?: string | null
          last_service_date?: string | null
          length_cm?: number | null
          license_plate?: string | null
          make?: string | null
          max_weight?: number
          model?: string
          next_inspection_date?: string | null
          next_service_date?: string | null
          notes?: string | null
          photo_uploaded_at?: string | null
          photo_url?: string | null
          photos?: Json | null
          plate_number?: string
          purchase_price?: number | null
          registration_expiry?: string | null
          seating_capacity?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          tags?: string[] | null
          thumbnail_url?: string | null
          tiered_config?: Json | null
          total_maintenance_cost?: number | null
          transmission?: string | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          vehicle_id?: string | null
          vehicle_type_id?: string | null
          vendor_name?: string | null
          vin?: string | null
          warranty_expiry?: string | null
          width_cm?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_current_location_id_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      vlms_assignments: {
        Row: {
          actual_return_date: string | null
          assigned_location_id: string | null
          assigned_to_id: string | null
          assignment_id: string
          assignment_letter_url: string | null
          assignment_type: string
          authorization_number: string | null
          authorized_by_id: string | null
          condition_end: string | null
          condition_start: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          fuel_level_end: number | null
          fuel_level_start: number | null
          id: string
          notes: string | null
          odometer_end: number | null
          odometer_start: number | null
          photos_end: Json | null
          photos_start: Json | null
          project_name: string | null
          purpose: string
          return_checklist_url: string | null
          start_date: string
          status: string
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          actual_return_date?: string | null
          assigned_location_id?: string | null
          assigned_to_id?: string | null
          assignment_id: string
          assignment_letter_url?: string | null
          assignment_type: string
          authorization_number?: string | null
          authorized_by_id?: string | null
          condition_end?: string | null
          condition_start?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          fuel_level_end?: number | null
          fuel_level_start?: number | null
          id?: string
          notes?: string | null
          odometer_end?: number | null
          odometer_start?: number | null
          photos_end?: Json | null
          photos_start?: Json | null
          project_name?: string | null
          purpose: string
          return_checklist_url?: string | null
          start_date: string
          status?: string
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          actual_return_date?: string | null
          assigned_location_id?: string | null
          assigned_to_id?: string | null
          assignment_id?: string
          assignment_letter_url?: string | null
          assignment_type?: string
          authorization_number?: string | null
          authorized_by_id?: string | null
          condition_end?: string | null
          condition_start?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          fuel_level_end?: number | null
          fuel_level_start?: number | null
          id?: string
          notes?: string | null
          odometer_end?: number | null
          odometer_start?: number | null
          photos_end?: Json | null
          photos_start?: Json | null
          project_name?: string | null
          purpose?: string
          return_checklist_url?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vlms_assignments_assigned_location_id_fkey"
            columns: ["assigned_location_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_assignments_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_assignments_authorized_by_id_fkey"
            columns: ["authorized_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_available_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vlms_disposal_records: {
        Row: {
          authorized_by_id: string | null
          bill_of_sale_url: string | null
          buyer_address: string | null
          buyer_contact: string | null
          buyer_name: string | null
          created_at: string | null
          created_by: string | null
          disposal_authorization_number: string | null
          disposal_date: string
          disposal_id: string
          disposal_method: string
          disposal_reason: string
          disposal_value: number | null
          final_book_value: number | null
          final_condition: string | null
          final_mileage: number | null
          final_photos: Json | null
          gain_loss: number | null
          id: string
          notes: string | null
          release_documents: Json | null
          total_lifecycle_cost: number | null
          vehicle_id: string
        }
        Insert: {
          authorized_by_id?: string | null
          bill_of_sale_url?: string | null
          buyer_address?: string | null
          buyer_contact?: string | null
          buyer_name?: string | null
          created_at?: string | null
          created_by?: string | null
          disposal_authorization_number?: string | null
          disposal_date: string
          disposal_id: string
          disposal_method: string
          disposal_reason: string
          disposal_value?: number | null
          final_book_value?: number | null
          final_condition?: string | null
          final_mileage?: number | null
          final_photos?: Json | null
          gain_loss?: number | null
          id?: string
          notes?: string | null
          release_documents?: Json | null
          total_lifecycle_cost?: number | null
          vehicle_id: string
        }
        Update: {
          authorized_by_id?: string | null
          bill_of_sale_url?: string | null
          buyer_address?: string | null
          buyer_contact?: string | null
          buyer_name?: string | null
          created_at?: string | null
          created_by?: string | null
          disposal_authorization_number?: string | null
          disposal_date?: string
          disposal_id?: string
          disposal_method?: string
          disposal_reason?: string
          disposal_value?: number | null
          final_book_value?: number | null
          final_condition?: string | null
          final_mileage?: number | null
          final_photos?: Json | null
          gain_loss?: number | null
          id?: string
          notes?: string | null
          release_documents?: Json | null
          total_lifecycle_cost?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vlms_disposal_records_authorized_by_id_fkey"
            columns: ["authorized_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_disposal_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_disposal_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_available_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_disposal_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vlms_fuel_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          driver_id: string | null
          driver_name: string | null
          fuel_card_number: string | null
          fuel_efficiency: number | null
          fuel_type: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          odometer_reading: number
          payment_method: string | null
          quantity: number
          receipt_number: string | null
          receipt_url: string | null
          station_location: string | null
          station_name: string | null
          total_cost: number | null
          transaction_date: string
          transaction_number: string | null
          trip_distance: number | null
          unit_price: number
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          driver_id?: string | null
          driver_name?: string | null
          fuel_card_number?: string | null
          fuel_efficiency?: number | null
          fuel_type: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          odometer_reading: number
          payment_method?: string | null
          quantity: number
          receipt_number?: string | null
          receipt_url?: string | null
          station_location?: string | null
          station_name?: string | null
          total_cost?: number | null
          transaction_date?: string
          transaction_number?: string | null
          trip_distance?: number | null
          unit_price: number
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          driver_id?: string | null
          driver_name?: string | null
          fuel_card_number?: string | null
          fuel_efficiency?: number | null
          fuel_type?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          odometer_reading?: number
          payment_method?: string | null
          quantity?: number
          receipt_number?: string | null
          receipt_url?: string | null
          station_location?: string | null
          station_name?: string | null
          total_cost?: number | null
          transaction_date?: string
          transaction_number?: string | null
          trip_distance?: number | null
          unit_price?: number
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vlms_fuel_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_fuel_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_available_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vlms_incidents: {
        Row: {
          action_taken: string | null
          actual_repair_cost: number | null
          cause: string | null
          claim_status: string | null
          created_at: string | null
          created_by: string | null
          damages_description: string | null
          deductible_amount: number | null
          description: string
          driver_id: string | null
          driver_name: string
          estimated_repair_cost: number | null
          id: string
          incident_date: string
          incident_id: string
          incident_type: string
          insurance_claim_number: string | null
          insurance_documents: Json | null
          insurance_payout: number | null
          latitude: number | null
          location: string
          longitude: number | null
          odometer_reading: number | null
          other_parties: string | null
          passengers: string | null
          photos: Json | null
          police_report_number: string | null
          police_report_url: string | null
          police_station: string | null
          preventive_measures: string | null
          resolved_date: string | null
          responsible_party: string | null
          severity: string
          status: string
          updated_at: string | null
          vehicle_condition_before: string | null
          vehicle_id: string
          witness_statements: Json | null
        }
        Insert: {
          action_taken?: string | null
          actual_repair_cost?: number | null
          cause?: string | null
          claim_status?: string | null
          created_at?: string | null
          created_by?: string | null
          damages_description?: string | null
          deductible_amount?: number | null
          description: string
          driver_id?: string | null
          driver_name: string
          estimated_repair_cost?: number | null
          id?: string
          incident_date: string
          incident_id: string
          incident_type: string
          insurance_claim_number?: string | null
          insurance_documents?: Json | null
          insurance_payout?: number | null
          latitude?: number | null
          location: string
          longitude?: number | null
          odometer_reading?: number | null
          other_parties?: string | null
          passengers?: string | null
          photos?: Json | null
          police_report_number?: string | null
          police_report_url?: string | null
          police_station?: string | null
          preventive_measures?: string | null
          resolved_date?: string | null
          responsible_party?: string | null
          severity: string
          status?: string
          updated_at?: string | null
          vehicle_condition_before?: string | null
          vehicle_id: string
          witness_statements?: Json | null
        }
        Update: {
          action_taken?: string | null
          actual_repair_cost?: number | null
          cause?: string | null
          claim_status?: string | null
          created_at?: string | null
          created_by?: string | null
          damages_description?: string | null
          deductible_amount?: number | null
          description?: string
          driver_id?: string | null
          driver_name?: string
          estimated_repair_cost?: number | null
          id?: string
          incident_date?: string
          incident_id?: string
          incident_type?: string
          insurance_claim_number?: string | null
          insurance_documents?: Json | null
          insurance_payout?: number | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          odometer_reading?: number | null
          other_parties?: string | null
          passengers?: string | null
          photos?: Json | null
          police_report_number?: string | null
          police_report_url?: string | null
          police_station?: string | null
          preventive_measures?: string | null
          resolved_date?: string | null
          responsible_party?: string | null
          severity?: string
          status?: string
          updated_at?: string | null
          vehicle_condition_before?: string | null
          vehicle_id?: string
          witness_statements?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "vlms_incidents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_incidents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_incidents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_available_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_incidents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vlms_inspections: {
        Row: {
          brakes: Json | null
          certificate_expiry_date: string | null
          certificate_issued_date: string | null
          certificate_number: string | null
          checklist: Json
          compliance_notes: string | null
          created_at: string | null
          created_by: string | null
          defects_found: string[] | null
          electrical_system: Json | null
          engine_mechanical: Json | null
          exterior_condition: Json | null
          fluid_levels: Json | null
          id: string
          inspection_date: string
          inspection_id: string
          inspection_report_url: string | null
          inspection_type: string
          inspector_certification: string | null
          inspector_id: string | null
          inspector_name: string
          interior_condition: Json | null
          lights_signals: Json | null
          meets_safety_standards: boolean
          next_inspection_date: string | null
          notes: string | null
          odometer_reading: number | null
          overall_status: string
          photos: Json | null
          priority_repairs: string[] | null
          recommendations: string | null
          reinspection_date: string | null
          reinspection_required: boolean | null
          roadworthy: boolean
          safety_equipment: Json | null
          tires: Json | null
          vehicle_id: string
        }
        Insert: {
          brakes?: Json | null
          certificate_expiry_date?: string | null
          certificate_issued_date?: string | null
          certificate_number?: string | null
          checklist: Json
          compliance_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          defects_found?: string[] | null
          electrical_system?: Json | null
          engine_mechanical?: Json | null
          exterior_condition?: Json | null
          fluid_levels?: Json | null
          id?: string
          inspection_date: string
          inspection_id: string
          inspection_report_url?: string | null
          inspection_type: string
          inspector_certification?: string | null
          inspector_id?: string | null
          inspector_name: string
          interior_condition?: Json | null
          lights_signals?: Json | null
          meets_safety_standards: boolean
          next_inspection_date?: string | null
          notes?: string | null
          odometer_reading?: number | null
          overall_status: string
          photos?: Json | null
          priority_repairs?: string[] | null
          recommendations?: string | null
          reinspection_date?: string | null
          reinspection_required?: boolean | null
          roadworthy: boolean
          safety_equipment?: Json | null
          tires?: Json | null
          vehicle_id: string
        }
        Update: {
          brakes?: Json | null
          certificate_expiry_date?: string | null
          certificate_issued_date?: string | null
          certificate_number?: string | null
          checklist?: Json
          compliance_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          defects_found?: string[] | null
          electrical_system?: Json | null
          engine_mechanical?: Json | null
          exterior_condition?: Json | null
          fluid_levels?: Json | null
          id?: string
          inspection_date?: string
          inspection_id?: string
          inspection_report_url?: string | null
          inspection_type?: string
          inspector_certification?: string | null
          inspector_id?: string | null
          inspector_name?: string
          interior_condition?: Json | null
          lights_signals?: Json | null
          meets_safety_standards?: boolean
          next_inspection_date?: string | null
          notes?: string | null
          odometer_reading?: number | null
          overall_status?: string
          photos?: Json | null
          priority_repairs?: string[] | null
          recommendations?: string | null
          reinspection_date?: string | null
          reinspection_required?: boolean | null
          roadworthy?: boolean
          safety_equipment?: Json | null
          tires?: Json | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vlms_inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_available_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vlms_maintenance_records: {
        Row: {
          actual_date: string | null
          category: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          invoices: Json | null
          issues_found: string | null
          labor_cost: number | null
          labor_hours: number | null
          maintenance_type: string
          mileage_at_service: number | null
          next_service_date: string | null
          next_service_mileage: number | null
          parts_cost: number | null
          parts_replaced: Json | null
          photos: Json | null
          priority: string | null
          recommendations: string | null
          record_id: string
          scheduled_date: string | null
          service_location: string | null
          service_provider: string | null
          status: string
          technician_name: string | null
          total_cost: number | null
          updated_at: string | null
          vehicle_id: string
          warranty_until: string | null
          work_order_number: string | null
        }
        Insert: {
          actual_date?: string | null
          category?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          invoices?: Json | null
          issues_found?: string | null
          labor_cost?: number | null
          labor_hours?: number | null
          maintenance_type: string
          mileage_at_service?: number | null
          next_service_date?: string | null
          next_service_mileage?: number | null
          parts_cost?: number | null
          parts_replaced?: Json | null
          photos?: Json | null
          priority?: string | null
          recommendations?: string | null
          record_id: string
          scheduled_date?: string | null
          service_location?: string | null
          service_provider?: string | null
          status?: string
          technician_name?: string | null
          total_cost?: number | null
          updated_at?: string | null
          vehicle_id: string
          warranty_until?: string | null
          work_order_number?: string | null
        }
        Update: {
          actual_date?: string | null
          category?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          invoices?: Json | null
          issues_found?: string | null
          labor_cost?: number | null
          labor_hours?: number | null
          maintenance_type?: string
          mileage_at_service?: number | null
          next_service_date?: string | null
          next_service_mileage?: number | null
          parts_cost?: number | null
          parts_replaced?: Json | null
          photos?: Json | null
          priority?: string | null
          recommendations?: string | null
          record_id?: string
          scheduled_date?: string | null
          service_location?: string | null
          service_provider?: string | null
          status?: string
          technician_name?: string | null
          total_cost?: number | null
          updated_at?: string | null
          vehicle_id?: string
          warranty_until?: string | null
          work_order_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vlms_maintenance_records_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_maintenance_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_available_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vlms_vehicles: {
        Row: {
          acquisition_date: string
          acquisition_type: string
          cargo_capacity: number | null
          color: string | null
          created_at: string | null
          created_by: string | null
          current_assignment_type: string | null
          current_book_value: number | null
          current_driver_id: string | null
          current_location_id: string | null
          current_mileage: number | null
          depreciation_rate: number | null
          documents: Json | null
          engine_capacity: number | null
          fuel_type: string
          id: string
          insurance_expiry: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          last_inspection_date: string | null
          last_service_date: string | null
          license_plate: string
          make: string
          model: string
          next_inspection_date: string | null
          next_service_date: string | null
          notes: string | null
          photos: Json | null
          purchase_price: number | null
          registration_expiry: string | null
          seating_capacity: number | null
          status: string
          tags: string[] | null
          total_maintenance_cost: number | null
          transmission: string | null
          updated_at: string | null
          updated_by: string | null
          vehicle_id: string
          vehicle_type: string
          vendor_name: string | null
          vin: string | null
          warranty_expiry: string | null
          year: number
        }
        Insert: {
          acquisition_date: string
          acquisition_type: string
          cargo_capacity?: number | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          current_assignment_type?: string | null
          current_book_value?: number | null
          current_driver_id?: string | null
          current_location_id?: string | null
          current_mileage?: number | null
          depreciation_rate?: number | null
          documents?: Json | null
          engine_capacity?: number | null
          fuel_type: string
          id?: string
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_inspection_date?: string | null
          last_service_date?: string | null
          license_plate: string
          make: string
          model: string
          next_inspection_date?: string | null
          next_service_date?: string | null
          notes?: string | null
          photos?: Json | null
          purchase_price?: number | null
          registration_expiry?: string | null
          seating_capacity?: number | null
          status?: string
          tags?: string[] | null
          total_maintenance_cost?: number | null
          transmission?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_id: string
          vehicle_type: string
          vendor_name?: string | null
          vin?: string | null
          warranty_expiry?: string | null
          year: number
        }
        Update: {
          acquisition_date?: string
          acquisition_type?: string
          cargo_capacity?: number | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          current_assignment_type?: string | null
          current_book_value?: number | null
          current_driver_id?: string | null
          current_location_id?: string | null
          current_mileage?: number | null
          depreciation_rate?: number | null
          documents?: Json | null
          engine_capacity?: number | null
          fuel_type?: string
          id?: string
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_inspection_date?: string | null
          last_service_date?: string | null
          license_plate?: string
          make?: string
          model?: string
          next_inspection_date?: string | null
          next_service_date?: string | null
          notes?: string | null
          photos?: Json | null
          purchase_price?: number | null
          registration_expiry?: string | null
          seating_capacity?: number | null
          status?: string
          tags?: string[] | null
          total_maintenance_cost?: number | null
          transmission?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_id?: string
          vehicle_type?: string
          vendor_name?: string | null
          vin?: string | null
          warranty_expiry?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vlms_vehicles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_vehicles_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_vehicles_current_location_id_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_vehicles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string
          capacity: number
          created_at: string | null
          id: string
          lat: number
          lng: number
          name: string
          operating_hours: string
          type: Database["public"]["Enums"]["warehouse_type"]
          updated_at: string | null
        }
        Insert: {
          address: string
          capacity: number
          created_at?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          operating_hours: string
          type?: Database["public"]["Enums"]["warehouse_type"]
          updated_at?: string | null
        }
        Update: {
          address?: string
          capacity?: number
          created_at?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          operating_hours?: string
          type?: Database["public"]["Enums"]["warehouse_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          country_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          country_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_alerts: {
        Row: {
          acknowledged: boolean | null
          driver_id: string
          event_type: string
          id: string
          location_lat: number
          location_lng: number
          notes: string | null
          timestamp: string | null
          zone_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          driver_id: string
          event_type: string
          id?: string
          location_lat: number
          location_lng: number
          notes?: string | null
          timestamp?: string | null
          zone_id: string
        }
        Update: {
          acknowledged?: boolean | null
          driver_id?: string
          event_type?: string
          id?: string
          location_lat?: number
          location_lng?: number
          notes?: string | null
          timestamp?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_alerts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_alerts_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "service_zones"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      scheduler_overview_stats: {
        Row: {
          active_warehouses: number | null
          assigned_drivers: number | null
          assigned_vehicles: number | null
          avg_capacity: number | null
          cancelled_count: number | null
          published_count: number | null
          ready_count: number | null
          scheduled_count: number | null
          total_consignments: number | null
          total_distance: number | null
        }
        Relationships: []
      }
      vehicles_with_taxonomy: {
        Row: {
          ai_capacity_image_url: string | null
          ai_generated: boolean | null
          avg_speed: number | null
          capacity: number | null
          capacity_kg: number | null
          capacity_m3: number | null
          capacity_volume_m3: number | null
          capacity_weight_kg: number | null
          category_code: string | null
          category_display_name: string | null
          category_id: string | null
          category_name: string | null
          category_source: string | null
          created_at: string | null
          current_driver_id: string | null
          fleet_id: string | null
          fuel_efficiency: number | null
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          height_cm: number | null
          id: string | null
          length_cm: number | null
          max_weight: number | null
          model: string | null
          photo_uploaded_at: string | null
          photo_url: string | null
          plate_number: string | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          thumbnail_url: string | null
          tiered_config: Json | null
          type: string | null
          type_code: string | null
          type_default_capacity_kg: number | null
          type_default_capacity_m3: number | null
          type_name: string | null
          updated_at: string | null
          vehicle_type_id: string | null
          width_cm: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles_with_tier_stats: {
        Row: {
          ai_capacity_image_url: string | null
          ai_generated: boolean | null
          avg_speed: number | null
          capacity: number | null
          capacity_kg: number | null
          capacity_m3: number | null
          capacity_volume_m3: number | null
          capacity_weight_kg: number | null
          category_id: string | null
          created_at: string | null
          current_driver_id: string | null
          fleet_id: string | null
          fuel_efficiency: number | null
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          height_cm: number | null
          id: string | null
          length_cm: number | null
          max_weight: number | null
          model: string | null
          photo_uploaded_at: string | null
          photo_url: string | null
          plate_number: string | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          thumbnail_url: string | null
          tier_count: number | null
          tiered_config: Json | null
          total_tier_volume_m3: number | null
          total_tier_weight_kg: number | null
          type: string | null
          updated_at: string | null
          vehicle_type_id: string | null
          width_cm: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      vlms_active_assignments: {
        Row: {
          actual_return_date: string | null
          assigned_location_id: string | null
          assigned_location_name: string | null
          assigned_to_id: string | null
          assigned_to_name: string | null
          assignment_id: string | null
          assignment_letter_url: string | null
          assignment_type: string | null
          authorization_number: string | null
          authorized_by_id: string | null
          condition_end: string | null
          condition_start: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          fuel_level_end: number | null
          fuel_level_start: number | null
          id: string | null
          license_plate: string | null
          make: string | null
          model: string | null
          notes: string | null
          odometer_end: number | null
          odometer_start: number | null
          photos_end: Json | null
          photos_start: Json | null
          project_name: string | null
          purpose: string | null
          return_checklist_url: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          vehicle_display_id: string | null
          vehicle_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vlms_assignments_assigned_location_id_fkey"
            columns: ["assigned_location_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_assignments_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_assignments_authorized_by_id_fkey"
            columns: ["authorized_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_available_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vlms_available_vehicles: {
        Row: {
          acquisition_date: string | null
          acquisition_type: string | null
          assignment_count: number | null
          cargo_capacity: number | null
          color: string | null
          created_at: string | null
          created_by: string | null
          current_assignment_type: string | null
          current_book_value: number | null
          current_driver_id: string | null
          current_location_id: string | null
          current_mileage: number | null
          depreciation_rate: number | null
          documents: Json | null
          engine_capacity: number | null
          fuel_type: string | null
          id: string | null
          incident_count: number | null
          insurance_expiry: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          last_inspection_date: string | null
          last_service_date: string | null
          license_plate: string | null
          maintenance_count: number | null
          make: string | null
          model: string | null
          next_inspection_date: string | null
          next_service_date: string | null
          notes: string | null
          photos: Json | null
          purchase_price: number | null
          registration_expiry: string | null
          seating_capacity: number | null
          status: string | null
          tags: string[] | null
          total_maintenance_cost: number | null
          transmission: string | null
          updated_at: string | null
          updated_by: string | null
          vehicle_id: string | null
          vehicle_type: string | null
          vendor_name: string | null
          vin: string | null
          warranty_expiry: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vlms_vehicles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_vehicles_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_vehicles_current_location_id_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_vehicles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vlms_overdue_maintenance: {
        Row: {
          actual_date: string | null
          category: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          days_overdue: number | null
          description: string | null
          id: string | null
          invoices: Json | null
          issues_found: string | null
          labor_cost: number | null
          labor_hours: number | null
          license_plate: string | null
          maintenance_type: string | null
          make: string | null
          mileage_at_service: number | null
          model: string | null
          next_service_date: string | null
          next_service_mileage: number | null
          parts_cost: number | null
          parts_replaced: Json | null
          photos: Json | null
          priority: string | null
          recommendations: string | null
          record_id: string | null
          scheduled_date: string | null
          service_location: string | null
          service_provider: string | null
          status: string | null
          technician_name: string | null
          total_cost: number | null
          updated_at: string | null
          vehicle_display_id: string | null
          vehicle_id: string | null
          warranty_until: string | null
          work_order_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vlms_maintenance_records_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_maintenance_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_available_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vlms_upcoming_maintenance: {
        Row: {
          actual_date: string | null
          category: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          current_mileage: number | null
          description: string | null
          id: string | null
          invoices: Json | null
          issues_found: string | null
          labor_cost: number | null
          labor_hours: number | null
          license_plate: string | null
          maintenance_type: string | null
          make: string | null
          mileage_at_service: number | null
          model: string | null
          next_service_date: string | null
          next_service_mileage: number | null
          parts_cost: number | null
          parts_replaced: Json | null
          photos: Json | null
          priority: string | null
          recommendations: string | null
          record_id: string | null
          scheduled_date: string | null
          service_location: string | null
          service_provider: string | null
          status: string | null
          technician_name: string | null
          total_cost: number | null
          updated_at: string | null
          vehicle_display_id: string | null
          vehicle_id: string | null
          warranty_until: string | null
          work_order_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vlms_maintenance_records_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_maintenance_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_available_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlms_maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vlms_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vlms_vehicles_with_taxonomy: {
        Row: {
          ai_capacity_image_url: string | null
          ai_generated: boolean | null
          avg_speed: number | null
          capacity: number | null
          capacity_volume_m3: number | null
          capacity_weight_kg: number | null
          category_code: string | null
          category_name: string | null
          category_source: string | null
          created_at: string | null
          current_driver_id: string | null
          fleet_id: string | null
          fuel_efficiency: number | null
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          id: string | null
          max_weight: number | null
          model: string | null
          photo_uploaded_at: string | null
          photo_url: string | null
          plate_number: string | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          thumbnail_url: string | null
          type: string | null
          type_code: string | null
          type_display_name: string | null
          type_name: string | null
          updated_at: string | null
          vehicle_type_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      calculate_cargo_volume: {
        Args: { height_cm: number; length_cm: number; width_cm: number }
        Returns: number
      }
      calculate_vehicle_fuel_efficiency: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_vehicle_id: string
        }
        Returns: number
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      dropgeometrytable:
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      find_admin_unit_by_point: {
        Args: {
          p_admin_level?: number
          p_country_id?: string
          p_lat: number
          p_lng: number
        }
        Returns: {
          admin_level: number
          country_id: string
          id: string
          name: string
        }[]
      }
      fuzzy_match_admin_unit: {
        Args: {
          p_admin_level?: number
          p_country_id: string
          p_name: string
          p_threshold?: number
        }
        Returns: {
          admin_level: number
          id: string
          name: string
          similarity: number
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_admin_unit_descendants: {
        Args: { unit_id: string }
        Returns: {
          admin_level: number
          depth: number
          id: string
          name: string
        }[]
      }
      get_driver_vehicles: {
        Args: { p_driver_id: string }
        Returns: {
          ai_generated: boolean
          assigned_at: string
          avg_speed: number
          capacity: number
          fuel_type: string
          is_current: boolean
          model: string
          photo_url: string
          plate_number: string
          thumbnail_url: string
          total_trips: number
          type: string
          vehicle_id: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { use_typmod?: boolean }; Returns: string }
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_askml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geom: unknown }; Returns: number }
        | { Args: { geog: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      sync_vehicle_tiers_from_config: {
        Args: { p_tiered_config: Json; p_vehicle_id: string }
        Returns: undefined
      }
      unaccent: { Args: { "": string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      validate_tier_config: {
        Args: { p_tiered_config: Json }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "system_admin"
        | "warehouse_officer"
        | "driver"
        | "zonal_manager"
        | "viewer"
      batch_status:
        | "planned"
        | "assigned"
        | "in-progress"
        | "completed"
        | "cancelled"
      delivery_priority: "low" | "medium" | "high" | "urgent"
      driver_status: "available" | "busy" | "offline"
      facility_type:
        | "hospital"
        | "clinic"
        | "health_center"
        | "pharmacy"
        | "lab"
        | "other"
      fuel_type: "diesel" | "petrol" | "electric"
      license_type: "standard" | "commercial"
      optimization_status: "pending" | "running" | "completed" | "failed"
      scheduler_batch_status:
        | "draft"
        | "ready"
        | "scheduled"
        | "published"
        | "cancelled"
      scheduling_mode: "manual" | "ai_optimized" | "uploaded" | "template"
      vehicle_status: "available" | "in-use" | "maintenance"
      vehicle_type: "truck" | "van" | "pickup" | "car"
      warehouse_type: "central" | "zonal" | "regional"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: [
        "system_admin",
        "warehouse_officer",
        "driver",
        "zonal_manager",
        "viewer",
      ],
      batch_status: [
        "planned",
        "assigned",
        "in-progress",
        "completed",
        "cancelled",
      ],
      delivery_priority: ["low", "medium", "high", "urgent"],
      driver_status: ["available", "busy", "offline"],
      facility_type: [
        "hospital",
        "clinic",
        "health_center",
        "pharmacy",
        "lab",
        "other",
      ],
      fuel_type: ["diesel", "petrol", "electric"],
      license_type: ["standard", "commercial"],
      optimization_status: ["pending", "running", "completed", "failed"],
      scheduler_batch_status: [
        "draft",
        "ready",
        "scheduled",
        "published",
        "cancelled",
      ],
      scheduling_mode: ["manual", "ai_optimized", "uploaded", "template"],
      vehicle_status: ["available", "in-use", "maintenance"],
      vehicle_type: ["truck", "van", "pickup", "car"],
      warehouse_type: ["central", "zonal", "regional"],
    },
  },
} as const
