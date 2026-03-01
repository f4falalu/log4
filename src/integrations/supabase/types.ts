// MOD4 Database Types
// Subset of BIKO types relevant to driver operations

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // Driver-related tables
      drivers: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          name: string;
          email: string;
          phone: string | null;
          status: 'active' | 'inactive' | 'on_break' | 'on_delivery';
          vehicle_id: string | null;
          current_location: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          name: string;
          email: string;
          phone?: string | null;
          status?: 'active' | 'inactive' | 'on_break' | 'on_delivery';
          vehicle_id?: string | null;
          current_location?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          status?: 'active' | 'inactive' | 'on_break' | 'on_delivery';
          vehicle_id?: string | null;
          current_location?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Delivery assignments
      delivery_assignments: {
        Row: {
          id: string;
          driver_id: string;
          batch_id: string;
          payload_id: string;
          sequence_number: number;
          status: 'pending' | 'in_transit' | 'arrived' | 'delivered' | 'failed' | 'skipped';
          scheduled_time: string | null;
          actual_arrival_time: string | null;
          actual_delivery_time: string | null;
          proof_of_delivery: Json | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          batch_id: string;
          payload_id: string;
          sequence_number: number;
          status?: 'pending' | 'in_transit' | 'arrived' | 'delivered' | 'failed' | 'skipped';
          scheduled_time?: string | null;
          actual_arrival_time?: string | null;
          actual_delivery_time?: string | null;
          proof_of_delivery?: Json | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          batch_id?: string;
          payload_id?: string;
          sequence_number?: number;
          status?: 'pending' | 'in_transit' | 'arrived' | 'delivered' | 'failed' | 'skipped';
          scheduled_time?: string | null;
          actual_arrival_time?: string | null;
          actual_delivery_time?: string | null;
          proof_of_delivery?: Json | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Driver location tracking
      driver_locations: {
        Row: {
          id: string;
          driver_id: string;
          latitude: number;
          longitude: number;
          accuracy: number | null;
          speed: number | null;
          heading: number | null;
          altitude: number | null;
          timestamp: string;
          battery_level: number | null;
          is_charging: boolean | null;
          network_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          latitude: number;
          longitude: number;
          accuracy?: number | null;
          speed?: number | null;
          heading?: number | null;
          altitude?: number | null;
          timestamp?: string;
          battery_level?: number | null;
          is_charging?: boolean | null;
          network_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          latitude?: number;
          longitude?: number;
          accuracy?: number | null;
          speed?: number | null;
          heading?: number | null;
          altitude?: number | null;
          timestamp?: string;
          battery_level?: number | null;
          is_charging?: boolean | null;
          network_type?: string | null;
          created_at?: string;
        };
      };
      // Driver events (for sync)
      driver_events: {
        Row: {
          id: string;
          driver_id: string;
          event_type: string;
          event_data: Json;
          client_timestamp: string;
          server_timestamp: string | null;
          synced: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          event_type: string;
          event_data: Json;
          client_timestamp: string;
          server_timestamp?: string | null;
          synced?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          event_type?: string;
          event_data?: Json;
          client_timestamp?: string;
          server_timestamp?: string | null;
          synced?: boolean;
          created_at?: string;
        };
      };
      // Driver devices (trusted device registry)
      driver_devices: {
        Row: {
          id: string;
          user_id: string;
          device_id: string;
          device_name: string | null;
          platform: string | null;
          user_agent: string | null;
          is_trusted: boolean;
          registered_at: string;
          last_seen_at: string;
          revoked_at: string | null;
          revoked_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_id: string;
          device_name?: string | null;
          platform?: string | null;
          user_agent?: string | null;
          is_trusted?: boolean;
          registered_at?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          device_id?: string;
          device_name?: string | null;
          platform?: string | null;
          user_agent?: string | null;
          is_trusted?: boolean;
          registered_at?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Onboarding requests (driver-submitted, no identity)
      onboarding_requests: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          organization_hint: string | null;
          device_id: string | null;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          reviewer_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          organization_hint?: string | null;
          device_id?: string | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reviewer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          organization_hint?: string | null;
          device_id?: string | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reviewer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      verify_mod4_otp: {
        Args: { p_email: string; p_otp: string };
        Returns: string;
      };
      complete_driver_activation: {
        Args: {
          p_pin: string;
          p_device_id: string;
          p_device_name?: string | null;
          p_platform?: string | null;
          p_user_agent?: string | null;
          p_display_name?: string | null;
        };
        Returns: boolean;
      };
      submit_onboarding_request: {
        Args: {
          p_full_name: string;
          p_phone?: string | null;
          p_email?: string | null;
          p_organization_hint?: string | null;
          p_device_id?: string | null;
        };
        Returns: string;
      };
      validate_driver_device: {
        Args: { p_device_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience types
export type Driver = Database['public']['Tables']['drivers']['Row'];
export type DriverInsert = Database['public']['Tables']['drivers']['Insert'];
export type DriverUpdate = Database['public']['Tables']['drivers']['Update'];

export type DeliveryAssignment = Database['public']['Tables']['delivery_assignments']['Row'];
export type DeliveryAssignmentInsert = Database['public']['Tables']['delivery_assignments']['Insert'];
export type DeliveryAssignmentUpdate = Database['public']['Tables']['delivery_assignments']['Update'];

export type DriverLocation = Database['public']['Tables']['driver_locations']['Row'];
export type DriverLocationInsert = Database['public']['Tables']['driver_locations']['Insert'];

export type DriverEvent = Database['public']['Tables']['driver_events']['Row'];
export type DriverEventInsert = Database['public']['Tables']['driver_events']['Insert'];
