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
  public: {
    Tables: {
      delivery_batches: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          created_at: string | null
          driver_id: string | null
          estimated_duration: number
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
          estimated_duration: number
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
          estimated_duration?: number
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
          capacity: number | null
          contact_person: string | null
          created_at: string | null
          id: string
          lat: number
          lng: number
          name: string
          operating_hours: string | null
          phone: string | null
          type: Database["public"]["Enums"]["facility_type"]
          updated_at: string | null
        }
        Insert: {
          address: string
          capacity?: number | null
          contact_person?: string | null
          created_at?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          operating_hours?: string | null
          phone?: string | null
          type?: Database["public"]["Enums"]["facility_type"]
          updated_at?: string | null
        }
        Update: {
          address?: string
          capacity?: number | null
          contact_person?: string | null
          created_at?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          operating_hours?: string | null
          phone?: string | null
          type?: Database["public"]["Enums"]["facility_type"]
          updated_at?: string | null
        }
        Relationships: []
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
            foreignKeyName: "handoffs_to_vehicle_id_fkey"
            columns: ["to_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
      payload_items: {
        Row: {
          batch_id: string
          created_at: string | null
          handling_instructions: string | null
          id: string
          name: string
          quantity: number
          temperature_required: boolean | null
          volume_m3: number
          weight_kg: number
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          handling_instructions?: string | null
          id?: string
          name: string
          quantity: number
          temperature_required?: boolean | null
          volume_m3: number
          weight_kg: number
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          handling_instructions?: string | null
          id?: string
          name?: string
          quantity?: number
          temperature_required?: boolean | null
          volume_m3?: number
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "payload_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "delivery_batches"
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
      schedule_batches: {
        Row: {
          batch_name: string
          capacity_used_pct: number | null
          created_at: string
          driver_id: string | null
          estimated_distance: number | null
          estimated_duration: number | null
          facility_ids: string[]
          id: string
          route_data: Json | null
          schedule_id: string | null
          sequence: number
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          batch_name: string
          capacity_used_pct?: number | null
          created_at?: string
          driver_id?: string | null
          estimated_distance?: number | null
          estimated_duration?: number | null
          facility_ids: string[]
          id?: string
          route_data?: Json | null
          schedule_id?: string | null
          sequence?: number
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          batch_name?: string
          capacity_used_pct?: number | null
          created_at?: string
          driver_id?: string | null
          estimated_distance?: number | null
          estimated_duration?: number | null
          facility_ids?: string[]
          id?: string
          route_data?: Json | null
          schedule_id?: string | null
          sequence?: number
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_batches_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_batches_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "delivery_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_batches_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
      upload_validations: {
        Row: {
          created_at: string
          file_name: string
          id: string
          parsed_data: Json
          status: string
          uploaded_by: string | null
          validation_errors: Json | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          parsed_data: Json
          status?: string
          uploaded_by?: string | null
          validation_errors?: Json | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          parsed_data?: Json
          status?: string
          uploaded_by?: string | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "upload_validations_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      vehicle_types: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_name: string
          icon_name: string | null
          id: string
          is_default: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_name: string
          icon_name?: string | null
          id?: string
          is_default?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_name?: string
          icon_name?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          ai_generated: boolean | null
          avg_speed: number
          capacity: number
          created_at: string | null
          current_driver_id: string | null
          fuel_efficiency: number
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id: string
          max_weight: number
          model: string
          photo_uploaded_at: string | null
          photo_url: string | null
          plate_number: string
          status: Database["public"]["Enums"]["vehicle_status"]
          thumbnail_url: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          avg_speed?: number
          capacity: number
          created_at?: string | null
          current_driver_id?: string | null
          fuel_efficiency: number
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id?: string
          max_weight: number
          model: string
          photo_uploaded_at?: string | null
          photo_url?: string | null
          plate_number: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          thumbnail_url?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          avg_speed?: number
          capacity?: number
          created_at?: string | null
          current_driver_id?: string | null
          fuel_efficiency?: number
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          max_weight?: number
          model?: string
          photo_uploaded_at?: string | null
          photo_url?: string | null
          plate_number?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          thumbnail_url?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
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
      [_ in never]: never
    }
    Functions: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      setup_test_admin: { Args: never; Returns: undefined }
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
      vehicle_status: "available" | "in-use" | "maintenance"
      vehicle_type: "truck" | "van" | "pickup" | "car"
      warehouse_type: "central" | "zonal" | "regional"
    }
    CompositeTypes: {
      [_ in never]: never
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
      vehicle_status: ["available", "in-use", "maintenance"],
      vehicle_type: ["truck", "van", "pickup", "car"],
      warehouse_type: ["central", "zonal", "regional"],
    },
  },
} as const
