export type Database = {
  public: {
    Tables: {
      driver_availability: {
        Row: { id: string; driver_id: string; starts_at: string; ends_at: string; service_region: string | null; created_at: string }
        Insert: { id?: string; driver_id: string; starts_at: string; ends_at: string; service_region?: string | null; created_at?: string }
        Update: { id?: string; driver_id?: string; starts_at?: string; ends_at?: string; service_region?: string | null; created_at?: string }
        Relationships: []
      }
      driver_profiles: {
        Row: { user_id: string; service_region: string | null; languages: string[]; is_accepting_rides: boolean; created_at: string; updated_at: string }
        Insert: { user_id: string; service_region?: string | null; languages?: string[]; is_accepting_rides?: boolean; created_at?: string; updated_at?: string }
        Update: { user_id?: string; service_region?: string | null; languages?: string[]; is_accepting_rides?: boolean; created_at?: string; updated_at?: string }
        Relationships: []
      }
      profiles: {
        Row: { id: string; display_name: string | null; preferred_language: string; created_at: string }
        Insert: { id: string; display_name?: string | null; preferred_language?: string; created_at?: string }
        Update: { id?: string; display_name?: string | null; preferred_language?: string; created_at?: string }
        Relationships: []
      }
      ride_private_locations: {
        Row: { ride_request_id: string; rider_id: string; pickup_address: string | null; destination_address: string | null; retained_until: string }
        Insert: { ride_request_id: string; rider_id: string; pickup_address?: string | null; destination_address?: string | null; retained_until?: string }
        Update: { ride_request_id?: string; rider_id?: string; pickup_address?: string | null; destination_address?: string | null; retained_until?: string }
        Relationships: []
      }
      ride_requests: {
        Row: { id: string; rider_id: string; pickup_area: string; destination_area: string; requested_at: string; rider_count: number; purpose: string | null; needs: string | null; status: Database['public']['Enums']['ride_status']; created_at: string }
        Insert: { id?: string; rider_id: string; pickup_area: string; destination_area: string; requested_at: string; rider_count?: number; purpose?: string | null; needs?: string | null; status?: Database['public']['Enums']['ride_status']; created_at?: string }
        Update: { id?: string; rider_id?: string; pickup_area?: string; destination_area?: string; requested_at?: string; rider_count?: number; purpose?: string | null; needs?: string | null; status?: Database['public']['Enums']['ride_status']; created_at?: string }
        Relationships: []
      }
      user_roles: {
        Row: { user_id: string; role: Database['public']['Enums']['app_role'] }
        Insert: { user_id: string; role: Database['public']['Enums']['app_role'] }
        Update: { user_id?: string; role?: Database['public']['Enums']['app_role'] }
        Relationships: []
      }
      vehicles: {
        Row: { id: string; driver_id: string; make: string; model: string; color: string; model_year: number | null; seat_capacity: number; wheelchair_accessible: boolean; active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; driver_id: string; make: string; model: string; color: string; model_year?: number | null; seat_capacity: number; wheelchair_accessible?: boolean; active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; driver_id?: string; make?: string; model?: string; color?: string; model_year?: number | null; seat_capacity?: number; wheelchair_accessible?: boolean; active?: boolean; created_at?: string; updated_at?: string }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      app_role: 'rider' | 'driver' | 'dispatcher' | 'admin'
      ride_status: 'requested' | 'matched' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
    }
    CompositeTypes: Record<string, never>
  }
}
