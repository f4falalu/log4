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
          facility_ids: string[]
          id: string
          medication_type: string
          name: string
          notes: string | null
          optimized_route: Json
          priority: Database["public"]["Enums"]["delivery_priority"]
          scheduled_date: string
          scheduled_time: string
          status: Database["public"]["Enums"]["batch_status"]
          total_distance: number
          total_quantity: number
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
          facility_ids: string[]
          id?: string
          medication_type: string
          name: string
          notes?: string | null
          optimized_route: Json
          priority?: Database["public"]["Enums"]["delivery_priority"]
          scheduled_date: string
          scheduled_time: string
          status?: Database["public"]["Enums"]["batch_status"]
          total_distance: number
          total_quantity: number
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
          facility_ids?: string[]
          id?: string
          medication_type?: string
          name?: string
          notes?: string | null
          optimized_route?: Json
          priority?: Database["public"]["Enums"]["delivery_priority"]
          scheduled_date?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["batch_status"]
          total_distance?: number
          total_quantity?: number
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
      drivers: {
        Row: {
          created_at: string | null
          current_lat: number | null
          current_lng: number | null
          id: string
          license_type: Database["public"]["Enums"]["license_type"]
          max_hours: number
          name: string
          phone: string
          shift_end: string
          shift_start: string
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          license_type?: Database["public"]["Enums"]["license_type"]
          max_hours?: number
          name: string
          phone: string
          shift_end: string
          shift_start: string
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          license_type?: Database["public"]["Enums"]["license_type"]
          max_hours?: number
          name?: string
          phone?: string
          shift_end?: string
          shift_start?: string
          status?: Database["public"]["Enums"]["driver_status"]
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
      route_history: {
        Row: {
          actual_arrival: string | null
          actual_duration: number | null
          batch_id: string
          created_at: string | null
          distance_from_previous: number | null
          facility_id: string
          id: string
          notes: string | null
          planned_arrival: string | null
          planned_duration: number | null
          sequence_number: number
        }
        Insert: {
          actual_arrival?: string | null
          actual_duration?: number | null
          batch_id: string
          created_at?: string | null
          distance_from_previous?: number | null
          facility_id: string
          id?: string
          notes?: string | null
          planned_arrival?: string | null
          planned_duration?: number | null
          sequence_number: number
        }
        Update: {
          actual_arrival?: string | null
          actual_duration?: number | null
          batch_id?: string
          created_at?: string | null
          distance_from_previous?: number | null
          facility_id?: string
          id?: string
          notes?: string | null
          planned_arrival?: string | null
          planned_duration?: number | null
          sequence_number?: number
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
      vehicles: {
        Row: {
          avg_speed: number
          capacity: number
          created_at: string | null
          current_driver_id: string | null
          fuel_efficiency: number
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id: string
          max_weight: number
          model: string
          plate_number: string
          status: Database["public"]["Enums"]["vehicle_status"]
          type: Database["public"]["Enums"]["vehicle_type"]
          updated_at: string | null
        }
        Insert: {
          avg_speed?: number
          capacity: number
          created_at?: string | null
          current_driver_id?: string | null
          fuel_efficiency: number
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id?: string
          max_weight: number
          model: string
          plate_number: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          type: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string | null
        }
        Update: {
          avg_speed?: number
          capacity?: number
          created_at?: string | null
          current_driver_id?: string | null
          fuel_efficiency?: number
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          max_weight?: number
          model?: string
          plate_number?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          type?: Database["public"]["Enums"]["vehicle_type"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      setup_test_admin: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
