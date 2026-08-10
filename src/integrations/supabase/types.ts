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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      borrow_requests: {
        Row: {
          created_at: string
          id: string
          lender_id: string
          message: string
          requested_duration: string
          requester_id: string
          resource_id: string
          status: Database["public"]["Enums"]["borrow_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lender_id: string
          message?: string
          requested_duration?: string
          requester_id: string
          resource_id: string
          status?: Database["public"]["Enums"]["borrow_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lender_id?: string
          message?: string
          requested_duration?: string
          requester_id?: string
          resource_id?: string
          status?: Database["public"]["Enums"]["borrow_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrow_requests_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resource_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      found_items: {
        Row: {
          category: Database["public"]["Enums"]["item_category"]
          claimed_by: string | null
          created_at: string
          date_found: string
          description: string
          finder_id: string
          id: string
          image_url: string | null
          is_sample: boolean
          location_found: string
          matched_lost_item_id: string | null
          status: Database["public"]["Enums"]["found_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["item_category"]
          claimed_by?: string | null
          created_at?: string
          date_found?: string
          description?: string
          finder_id: string
          id?: string
          image_url?: string | null
          is_sample?: boolean
          location_found: string
          matched_lost_item_id?: string | null
          status?: Database["public"]["Enums"]["found_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["item_category"]
          claimed_by?: string | null
          created_at?: string
          date_found?: string
          description?: string
          finder_id?: string
          id?: string
          image_url?: string | null
          is_sample?: boolean
          location_found?: string
          matched_lost_item_id?: string | null
          status?: Database["public"]["Enums"]["found_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "found_items_finder_id_fkey"
            columns: ["finder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_claims: {
        Row: {
          claimant_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          found_item_id: string
          id: string
          lost_item_id: string | null
          message: string
          status: Database["public"]["Enums"]["claim_status"]
        }
        Insert: {
          claimant_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          found_item_id: string
          id?: string
          lost_item_id?: string | null
          message?: string
          status?: Database["public"]["Enums"]["claim_status"]
        }
        Update: {
          claimant_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          found_item_id?: string
          id?: string
          lost_item_id?: string | null
          message?: string
          status?: Database["public"]["Enums"]["claim_status"]
        }
        Relationships: [
          {
            foreignKeyName: "item_claims_found_item_id_fkey"
            columns: ["found_item_id"]
            isOneToOne: false
            referencedRelation: "found_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_claims_lost_item_id_fkey"
            columns: ["lost_item_id"]
            isOneToOne: false
            referencedRelation: "lost_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_contacts: {
        Row: {
          contact_info: string
          created_at: string
          id: string
          item_id: string
          item_type: string
          owner_id: string
        }
        Insert: {
          contact_info: string
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          owner_id: string
        }
        Update: {
          contact_info?: string
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          owner_id?: string
        }
        Relationships: []
      }
      lost_items: {
        Row: {
          category: Database["public"]["Enums"]["item_category"]
          created_at: string
          date_lost: string
          description: string
          id: string
          image_url: string | null
          is_sample: boolean
          location_lost: string
          matched_found_item_id: string | null
          reporter_id: string
          status: Database["public"]["Enums"]["lost_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["item_category"]
          created_at?: string
          date_lost?: string
          description?: string
          id?: string
          image_url?: string | null
          is_sample?: boolean
          location_lost: string
          matched_found_item_id?: string | null
          reporter_id: string
          status?: Database["public"]["Enums"]["lost_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["item_category"]
          created_at?: string
          date_lost?: string
          description?: string
          id?: string
          image_url?: string | null
          is_sample?: boolean
          location_lost?: string
          matched_found_item_id?: string | null
          reporter_id?: string
          status?: Database["public"]["Enums"]["lost_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_items_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          campus: string | null
          contact_info: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          campus?: string | null
          contact_info?: string | null
          created_at?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          campus?: string | null
          contact_info?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resource_listings: {
        Row: {
          availability: Database["public"]["Enums"]["resource_availability"]
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_sample: boolean
          item_condition: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          availability?: Database["public"]["Enums"]["resource_availability"]
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_sample?: boolean
          item_condition?: string
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          availability?: Database["public"]["Enums"]["resource_availability"]
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_sample?: boolean
          item_condition?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
    }
    Enums: {
      app_role: "admin" | "student"
      borrow_status: "pending" | "approved" | "rejected" | "returned"
      claim_status: "pending" | "approved" | "rejected"
      found_status: "open" | "matched" | "claimed"
      item_category:
        | "ID Card"
        | "Electronics"
        | "Stationery"
        | "Bottle"
        | "Clothing"
        | "Books"
        | "Other"
      lost_status: "open" | "matched" | "resolved"
      resource_availability: "available" | "lent" | "unavailable"
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
      app_role: ["admin", "student"],
      borrow_status: ["pending", "approved", "rejected", "returned"],
      claim_status: ["pending", "approved", "rejected"],
      found_status: ["open", "matched", "claimed"],
      item_category: [
        "ID Card",
        "Electronics",
        "Stationery",
        "Bottle",
        "Clothing",
        "Books",
        "Other",
      ],
      lost_status: ["open", "matched", "resolved"],
      resource_availability: ["available", "lent", "unavailable"],
    },
  },
} as const
