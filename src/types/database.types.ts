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
      app_users: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      board_games_box_association: {
        Row: {
          user_id: string | null
          capacity_units: number
          container_box_id: number | null
          created_at: string
          custom_depth_mm: number | null
          custom_height_mm: number | null
          custom_width_mm: number | null
          favorite: boolean
          game_box_size_id: string | null
          game_id: string
          id: string
          library_id: string | null
          box_face: "wxd" | "hxd" | "wxh" | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          capacity_units?: number
          user_id?: string | null
          container_box_id?: number | null
          created_at?: string
          custom_depth_mm?: number | null
          custom_height_mm?: number | null
          custom_width_mm?: number | null
          favorite?: boolean
          game_box_size_id?: string | null
          game_id: string
          id?: string
          library_id?: string | null
          box_face?: "wxd" | "hxd" | "wxh" | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          capacity_units?: number
          user_id?: string | null
          container_box_id?: number | null
          created_at?: string
          custom_depth_mm?: number | null
          custom_height_mm?: number | null
          custom_width_mm?: number | null
          favorite?: boolean
          game_box_size_id?: string | null
          game_id?: string
          id?: string
          library_id?: string | null
          box_face?: "wxd" | "hxd" | "wxh" | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "association_size_game_fkey"
            columns: ["game_box_size_id", "game_id"]
            isOneToOne: false
            referencedRelation: "game_box_sizes"
            referencedColumns: ["id", "game_id"]
          },
          {
            foreignKeyName: "board_games_box_association_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_games_box_fkey"
            columns: ["container_box_id"]
            isOneToOne: false
            referencedRelation: "container_box"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_games_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      container_box: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          id: number
          inner_depth_mm: number
          inner_height_mm: number
          inner_width_mm: number
          label: string | null
          layout_direction: 'horizontal' | 'vertical'
          library_id: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: number
          inner_depth_mm?: number
          inner_height_mm?: number
          inner_width_mm?: number
          label?: string | null
          layout_direction?: 'horizontal' | 'vertical'
          library_id?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: number
          inner_depth_mm?: number
          inner_height_mm?: number
          inner_width_mm?: number
          label?: string | null
          layout_direction?: 'horizontal' | 'vertical'
          library_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "container_box_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      game_box_sides: {
        Row: {
          bgg_id: number
          image_url: string
          updated_at: string
        }
        Insert: {
          bgg_id: number
          image_url: string
          updated_at?: string
        }
        Update: {
          bgg_id?: number
          image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_box_sizes: {
        Row: {
          country: string
          created_at: string
          created_by: string | null
          depth_mm: number
          game_id: string
          height_mm: number
          id: string
          label: string
          width_mm: number
        }
        Insert: {
          country?: string
          created_at?: string
          created_by?: string | null
          depth_mm: number
          game_id: string
          height_mm: number
          id?: string
          label: string
          width_mm: number
        }
        Update: {
          country?: string
          created_at?: string
          created_by?: string | null
          depth_mm?: number
          game_id?: string
          height_mm?: number
          id?: string
          label?: string
          width_mm?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_box_sizes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_covers: {
        Row: {
          bgg_id: number
          image_url: string
          updated_at: string
        }
        Insert: {
          bgg_id: number
          image_url: string
          updated_at?: string
        }
        Update: {
          bgg_id?: number
          image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_logos: {
        Row: {
          bgg_id: number
          image_url: string
          updated_at: string
        }
        Insert: {
          bgg_id: number
          image_url: string
          updated_at?: string
        }
        Update: {
          bgg_id?: number
          image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_reviews: {
        Row: {
          bgg_id: number
          body: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bgg_id: number
          body: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          bgg_id?: number
          body?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_wallpapers: {
        Row: {
          bgg_id: number
          image_url: string
          updated_at: string
        }
        Insert: {
          bgg_id: number
          image_url: string
          updated_at?: string
        }
        Update: {
          bgg_id?: number
          image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_box_size_votes: {
        Row: { game_id: string; user_id: string; size_id: string }
        Insert: { game_id: string; user_id?: string; size_id: string }
        Update: { game_id?: string; user_id?: string; size_id?: string }
        Relationships: [
          { foreignKeyName: "game_box_size_votes_game_id_fkey"; columns: ["game_id"]; isOneToOne: false; referencedRelation: "games"; referencedColumns: ["id"] },
          { foreignKeyName: "game_box_size_votes_size_id_game_id_fkey"; columns: ["size_id", "game_id"]; isOneToOne: false; referencedRelation: "game_box_sizes"; referencedColumns: ["id", "game_id"] }
        ]
      }
      games: {
        Row: {
          default_box_size_id: string | null
          bgg_id: number | null
          bgg_url: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          name: string
          release_year: number
        }
        Insert: {
          default_box_size_id?: string | null
          bgg_id?: number | null
          bgg_url: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          name: string
          release_year: number
        }
        Update: {
          default_box_size_id?: string | null
          bgg_id?: number | null
          bgg_url?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          name?: string
          release_year?: number
        }
        Relationships: [{ foreignKeyName: "games_default_box_size_fkey"; columns: ["default_box_size_id", "id"]; isOneToOne: false; referencedRelation: "game_box_sizes"; referencedColumns: ["id", "game_id"] }]
      }
      libraries: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          shelf_columns: number | null
          shelf_rows: number | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          shelf_columns?: number | null
          shelf_rows?: number | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          shelf_columns?: number | null
          shelf_rows?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "libraries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      rating: {
        Row: {
          game_id: number
          id: string
          value: number
        }
        Insert: {
          game_id: number
          id: string
          value?: number
        }
        Update: {
          game_id?: number
          id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "rating_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "board_games_box_association"
            referencedColumns: ["id"]
          },
        ]
      }
      session_games: {
        Row: {
          game_id: string
          game_snapshot: Json
          session_id: string
        }
        Insert: {
          game_id: string
          game_snapshot: Json
          session_id: string
        }
        Update: {
          game_id?: string
          game_snapshot?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_games_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "voting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_votes: {
        Row: {
          created_at: string
          game_id: string
          session_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          session_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          session_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_votes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "voting_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_votes_session_id_game_id_fkey"
            columns: ["session_id", "game_id"]
            isOneToOne: false
            referencedRelation: "session_games"
            referencedColumns: ["session_id", "game_id"]
          },
        ]
      }
      social_connections: {
        Row: {
          created_at: string
          id: string
          kind: string
          recipient_id: string
          requester_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          recipient_id: string
          requester_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          recipient_id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "social_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "social_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_profiles: {
        Row: {
          avatar_url: string | null
          connection_mode: 'approval' | 'follow'
          display_name: string
          handle: string
          id: string
        }
        Insert: {
          avatar_url?: string | null
          connection_mode?: 'approval' | 'follow'
          display_name: string
          handle: string
          id: string
        }
        Update: {
          avatar_url?: string | null
          connection_mode?: 'approval' | 'follow'
          display_name?: string
          handle?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_sessions: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          owner_id: string
          status: string
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          owner_id?: string
          status?: string
          title?: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          owner_id?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      default_game_box_size: { Args: { p_game_id: string }; Returns: string | null }
      add_default_collection_copy: { Args: { p_game_id: string }; Returns: string }
      move_collection_game: {
        Args: {
          p_container_box_id: number | null
          p_copy_id: string
          p_index?: number
        }
        Returns: undefined
      }
      search_collectors: {
        Args: { query: string }
        Returns: {
          avatar_url: string | null
          connection_mode: 'approval' | 'follow'
          display_name: string
          handle: string
          id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "social_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
