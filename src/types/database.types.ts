export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
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
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      libraries: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "libraries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      board_games: {
        Row: {
          bgg_id: number | null
          bgg_url: string
          box: number | null
          box_depth_mm: number
          box_height_mm: number
          box_width_mm: number
          created_at: string
          favorite: boolean
          id: string
          image_url: string | null
          library_id: string | null
          name: string
          release_year: number
          size: number
        }
        Insert: {
          bgg_id?: number | null
          bgg_url: string
          box?: number | null
          box_depth_mm?: number
          box_height_mm?: number
          box_width_mm?: number
          created_at?: string
          favorite?: boolean
          id?: string
          image_url?: string | null
          library_id?: string | null
          name: string
          release_year: number
          size?: number
        }
        Update: {
          bgg_id?: number | null
          bgg_url?: string
          box?: number | null
          box_depth_mm?: number
          box_height_mm?: number
          box_width_mm?: number
          created_at?: string
          favorite?: boolean
          id?: string
          image_url?: string | null
          library_id?: string | null
          name?: string
          release_year?: number
          size?: number
        }
        Relationships: [
          {
            foreignKeyName: "board_games_box_fkey"
            columns: ["box"]
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
      game_placements: {
        Row: {
          container_box_id: number | null
          created_at: string
          game_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          container_box_id?: number | null
          created_at?: string
          game_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          container_box_id?: number | null
          created_at?: string
          game_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_placements_container_box_id_fkey"
            columns: ["container_box_id"]
            isOneToOne: false
            referencedRelation: "container_box"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_placements_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "board_games"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "board_games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
