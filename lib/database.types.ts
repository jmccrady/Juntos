export type Database = {
  public: {
    Tables: {
      driver_availability: {
        Row: { id: string; driver_id: string; starts_at: string; ends_at: string; service_region: string | null; service_region_id: string | null; created_at: string }
        Insert: { id?: string; driver_id: string; starts_at: string; ends_at: string; service_region?: string | null; service_region_id?: string | null; created_at?: string }
        Update: { id?: string; driver_id?: string; starts_at?: string; ends_at?: string; service_region?: string | null; service_region_id?: string | null; created_at?: string }
        Relationships: []
      }
      driver_profiles: {
        Row: { user_id: string; service_region: string | null; service_region_id: string | null; languages: string[]; is_accepting_rides: boolean; created_at: string; updated_at: string }
        Insert: { user_id: string; service_region?: string | null; service_region_id?: string | null; languages?: string[]; is_accepting_rides?: boolean; created_at?: string; updated_at?: string }
        Update: { user_id?: string; service_region?: string | null; service_region_id?: string | null; languages?: string[]; is_accepting_rides?: boolean; created_at?: string; updated_at?: string }
        Relationships: []
      }
      pickup_hubs: {
        Row: { id: string; service_region_id: string; name_en: string; name_es: string; hub_type: string; address_text: string; instructions_en: string | null; instructions_es: string | null; active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; service_region_id: string; name_en: string; name_es: string; hub_type?: string; address_text: string; instructions_en?: string | null; instructions_es?: string | null; active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; service_region_id?: string; name_en?: string; name_es?: string; hub_type?: string; address_text?: string; instructions_en?: string | null; instructions_es?: string | null; active?: boolean; created_at?: string; updated_at?: string }
        Relationships: []
      }
      profiles: {
        Row: { id: string; display_name: string | null; preferred_language: string; created_at: string }
        Insert: { id: string; display_name?: string | null; preferred_language?: string; created_at?: string }
        Update: { id?: string; display_name?: string | null; preferred_language?: string; created_at?: string }
        Relationships: []
      }
      ride_assignments: {
        Row: { id: string; ride_request_id: string; driver_id: string; vehicle_id: string; assigned_by: string; status: Database['public']['Enums']['ride_assignment_status']; assigned_at: string; responded_at: string | null; completed_at: string | null; updated_at: string }
        Insert: { id?: string; ride_request_id: string; driver_id: string; vehicle_id: string; assigned_by: string; status?: Database['public']['Enums']['ride_assignment_status']; assigned_at?: string; responded_at?: string | null; completed_at?: string | null; updated_at?: string }
        Update: { id?: string; ride_request_id?: string; driver_id?: string; vehicle_id?: string; assigned_by?: string; status?: Database['public']['Enums']['ride_assignment_status']; assigned_at?: string; responded_at?: string | null; completed_at?: string | null; updated_at?: string }
        Relationships: []
      }
      ride_candidates: {
        Row: { ride_request_id: string; driver_id: string; vehicle_id: string; availability_id: string; driver_display_name: string; vehicle_label: string; seat_capacity: number; languages: string[]; language_match: boolean; capacity_margin: number; score: number; match_rank: number; generated_at: string }
        Insert: { ride_request_id: string; driver_id: string; vehicle_id: string; availability_id: string; driver_display_name: string; vehicle_label: string; seat_capacity: number; languages: string[]; language_match: boolean; capacity_margin: number; score: number; match_rank: number; generated_at?: string }
        Update: { ride_request_id?: string; driver_id?: string; vehicle_id?: string; availability_id?: string; driver_display_name?: string; vehicle_label?: string; seat_capacity?: number; languages?: string[]; language_match?: boolean; capacity_margin?: number; score?: number; match_rank?: number; generated_at?: string }
        Relationships: []
      }
      ride_events: {
        Row: { id: number; ride_request_id: string; actor_id: string | null; event_type: string; old_status: Database['public']['Enums']['ride_status'] | null; new_status: Database['public']['Enums']['ride_status'] | null; reason_code: string | null; created_at: string }
        Insert: { id?: never; ride_request_id: string; actor_id?: string | null; event_type: string; old_status?: Database['public']['Enums']['ride_status'] | null; new_status?: Database['public']['Enums']['ride_status'] | null; reason_code?: string | null; created_at?: string }
        Update: { id?: never; ride_request_id?: string; actor_id?: string | null; event_type?: string; old_status?: Database['public']['Enums']['ride_status'] | null; new_status?: Database['public']['Enums']['ride_status'] | null; reason_code?: string | null; created_at?: string }
        Relationships: []
      }
      ride_private_locations: {
        Row: { ride_request_id: string; rider_id: string; pickup_address: string | null; destination_address: string | null; retained_until: string }
        Insert: { ride_request_id: string; rider_id: string; pickup_address?: string | null; destination_address?: string | null; retained_until?: string }
        Update: { ride_request_id?: string; rider_id?: string; pickup_address?: string | null; destination_address?: string | null; retained_until?: string }
        Relationships: []
      }
      ride_requests: {
        Row: { id: string; rider_id: string; pickup_area: string; destination_area: string; pickup_region_id: string | null; destination_region_id: string | null; pickup_hub_id: string | null; requested_at: string; rider_count: number; purpose: string | null; needs: string | null; status: Database['public']['Enums']['ride_status']; created_at: string }
        Insert: { id?: string; rider_id: string; pickup_area: string; destination_area: string; pickup_region_id?: string | null; destination_region_id?: string | null; pickup_hub_id?: string | null; requested_at: string; rider_count?: number; purpose?: string | null; needs?: string | null; status?: Database['public']['Enums']['ride_status']; created_at?: string }
        Update: { id?: string; rider_id?: string; pickup_area?: string; destination_area?: string; pickup_region_id?: string | null; destination_region_id?: string | null; pickup_hub_id?: string | null; requested_at?: string; rider_count?: number; purpose?: string | null; needs?: string | null; status?: Database['public']['Enums']['ride_status']; created_at?: string }
        Relationships: []
      }
      service_regions: {
        Row: { id: string; slug: string; name_en: string; name_es: string; active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; slug: string; name_en: string; name_es: string; active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; slug?: string; name_en?: string; name_es?: string; active?: boolean; created_at?: string; updated_at?: string }
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
    Functions: {
      refresh_ride_candidates: { Args: { p_actor_id: string; p_ride_request_id: string }; Returns: number }
      assign_ride: { Args: { p_actor_id: string; p_ride_request_id: string; p_driver_id: string }; Returns: string }
      respond_to_ride_offer: { Args: { p_actor_id: string; p_ride_request_id: string; p_accept: boolean }; Returns: Database['public']['Enums']['ride_status'] }
      advance_ride: { Args: { p_actor_id: string; p_ride_request_id: string; p_target: Database['public']['Enums']['ride_status'] }; Returns: Database['public']['Enums']['ride_status'] }
      cancel_ride: { Args: { p_actor_id: string; p_ride_request_id: string; p_reason_code?: string }; Returns: Database['public']['Enums']['ride_status'] }
      set_private_ride_location: { Args: { p_actor_id: string; p_ride_request_id: string; p_pickup_address: string; p_destination_address: string }; Returns: undefined }
    }
    Enums: {
      app_role: 'rider' | 'driver' | 'dispatcher' | 'admin'
      ride_assignment_status: 'offered' | 'accepted' | 'declined' | 'cancelled' | 'completed'
      ride_status: 'requested' | 'matched' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
    }
    CompositeTypes: Record<string, never>
  }
}
