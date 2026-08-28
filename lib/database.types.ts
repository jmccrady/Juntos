export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; preferred_language: string; created_at: string }
        Insert: { id: string; display_name?: string | null; preferred_language?: string; created_at?: string }
        Update: { id?: string; display_name?: string | null; preferred_language?: string; created_at?: string }
        Relationships: []
      }
      user_roles: {
        Row: { user_id: string; role: Database['public']['Enums']['app_role'] }
        Insert: { user_id: string; role: Database['public']['Enums']['app_role'] }
        Update: { user_id?: string; role?: Database['public']['Enums']['app_role'] }
        Relationships: []
      }
      ride_requests: {
        Row: {
          id: string
          rider_id: string
          pickup_area: string
          destination_area: string
          requested_at: string
          rider_count: number
          purpose: string | null
          needs: string | null
          status: Database['public']['Enums']['ride_status']
          created_at: string
        }
        Insert: {
          id?: string
          rider_id: string
          pickup_area: string
          destination_area: string
          requested_at: string
          rider_count?: number
          purpose?: string | null
          needs?: string | null
          status?: Database['public']['Enums']['ride_status']
          created_at?: string
        }
        Update: {
          id?: string
          rider_id?: string
          pickup_area?: string
          destination_area?: string
          requested_at?: string
          rider_count?: number
          purpose?: string | null
          needs?: string | null
          status?: Database['public']['Enums']['ride_status']
          created_at?: string
        }
        Relationships: []
      }
      ride_private_locations: {
        Row: {
          ride_request_id: string
          rider_id: string
          pickup_address: string | null
          destination_address: string | null
          retained_until: string
        }
        Insert: {
          ride_request_id: string
          rider_id: string
          pickup_address?: string | null
          destination_address?: string | null
          retained_until?: string
        }
        Update: {
          ride_request_id?: string
          rider_id?: string
          pickup_address?: string | null
          destination_address?: string | null
          retained_until?: string
        }
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
