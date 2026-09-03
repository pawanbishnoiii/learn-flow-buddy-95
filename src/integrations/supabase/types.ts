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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      app_events: {
        Row: {
          created_at: string
          event: string
          id: string
          metadata: Json
          path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          metadata?: Json
          path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          metadata?: Json
          path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          accent_color: string
          ai_enabled: boolean
          android_force_update: boolean
          android_latest_version: string | null
          android_min_version: string | null
          android_update_url: string | null
          announcement_level: string
          avatar_upload_enabled: boolean
          banner_text: string | null
          created_at: string
          default_daily_goal_hours: number
          default_weekly_goal_hours: number
          email_auth_enabled: boolean
          google_auth_enabled: boolean
          id: boolean
          landing_enabled: boolean
          maintenance_note: string | null
          manual_log_enabled: boolean
          onboarding_require_subjects: boolean
          one_tap_enabled: boolean
          push_enabled: boolean
          signup_enabled: boolean
          site_name: string
          support_email: string | null
          tagline: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          ai_enabled?: boolean
          android_force_update?: boolean
          android_latest_version?: string | null
          android_min_version?: string | null
          android_update_url?: string | null
          announcement_level?: string
          avatar_upload_enabled?: boolean
          banner_text?: string | null
          created_at?: string
          default_daily_goal_hours?: number
          default_weekly_goal_hours?: number
          email_auth_enabled?: boolean
          google_auth_enabled?: boolean
          id?: boolean
          landing_enabled?: boolean
          maintenance_note?: string | null
          manual_log_enabled?: boolean
          onboarding_require_subjects?: boolean
          one_tap_enabled?: boolean
          push_enabled?: boolean
          signup_enabled?: boolean
          site_name?: string
          support_email?: string | null
          tagline?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          ai_enabled?: boolean
          android_force_update?: boolean
          android_latest_version?: string | null
          android_min_version?: string | null
          android_update_url?: string | null
          announcement_level?: string
          avatar_upload_enabled?: boolean
          banner_text?: string | null
          created_at?: string
          default_daily_goal_hours?: number
          default_weekly_goal_hours?: number
          email_auth_enabled?: boolean
          google_auth_enabled?: boolean
          id?: boolean
          landing_enabled?: boolean
          maintenance_note?: string | null
          manual_log_enabled?: boolean
          onboarding_require_subjects?: boolean
          one_tap_enabled?: boolean
          push_enabled?: boolean
          signup_enabled?: boolean
          site_name?: string
          support_email?: string | null
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      avatar_presets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          device_label: string | null
          id: string
          last_seen_at: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          id?: string
          last_seen_at?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          from_email: string | null
          from_name: string | null
          id: boolean
          provider: string
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_user: string | null
          updated_at: string
        }
        Insert: {
          from_email?: string | null
          from_name?: string | null
          id?: boolean
          provider?: string
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
        }
        Update: {
          from_email?: string | null
          from_name?: string | null
          id?: boolean
          provider?: string
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          attempts: number
          created_at: string
          created_by: string | null
          id: string
          kind: string
          last_error: string | null
          payload: Json
          run_at: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          last_error?: string | null
          payload?: Json
          run_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          payload?: Json
          run_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      motivations: {
        Row: {
          author: string | null
          body: string
          created_at: string
          id: string
          is_global: boolean | null
          kind: string
          month: number | null
          title: string
          user_id: string | null
        }
        Insert: {
          author?: string | null
          body: string
          created_at?: string
          id?: string
          is_global?: boolean | null
          kind?: string
          month?: number | null
          title: string
          user_id?: string | null
        }
        Update: {
          author?: string | null
          body?: string
          created_at?: string
          id?: string
          is_global?: boolean | null
          kind?: string
          month?: number | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_path: string | null
          body: string | null
          created_at: string | null
          created_by: string | null
          id: string
          kind: string | null
          push_sent: boolean
          read: boolean | null
          title: string
          user_id: string | null
        }
        Insert: {
          action_path?: string | null
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          kind?: string | null
          push_sent?: boolean
          read?: boolean | null
          title: string
          user_id?: string | null
        }
        Update: {
          action_path?: string | null
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          kind?: string | null
          push_sent?: boolean
          read?: boolean | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          avg_study_hours: number
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          last_seen_at: string | null
          onboarded: boolean
          onboarded_at: string | null
          phone: string | null
          sign_in_count: number
          timezone: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          avg_study_hours?: number
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          last_seen_at?: string | null
          onboarded?: boolean
          onboarded_at?: string | null
          phone?: string | null
          sign_in_count?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          avg_study_hours?: number
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          last_seen_at?: string | null
          onboarded?: boolean
          onboarded_at?: string | null
          phone?: string | null
          sign_in_count?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_breaks: {
        Row: {
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          kind: string
          note: string | null
          session_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          kind?: string
          note?: string | null
          session_id?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          kind?: string
          note?: string | null
          session_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_breaks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          mood: string | null
          quality_rating: number | null
          started_at: string | null
          subject_id: string | null
          user_id: string | null
          xp_earned: number | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          mood?: string | null
          quality_rating?: number | null
          started_at?: string | null
          subject_id?: string | null
          user_id?: string | null
          xp_earned?: number | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          mood?: string | null
          quality_rating?: number | null
          started_at?: string | null
          subject_id?: string | null
          user_id?: string | null
          xp_earned?: number | null
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          auto_closed: boolean
          break_minutes: number
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          is_running: boolean
          kind: string
          notes: string | null
          planned_end_at: string | null
          started_at: string
          subject_id: string | null
          subject_name: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          auto_closed?: boolean
          break_minutes?: number
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          is_running?: boolean
          kind?: string
          notes?: string | null
          planned_end_at?: string | null
          started_at?: string
          subject_id?: string | null
          subject_name?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          auto_closed?: boolean
          break_minutes?: number
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          is_running?: boolean
          kind?: string
          notes?: string | null
          planned_end_at?: string | null
          started_at?: string
          subject_id?: string | null
          subject_name?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
          weekly_target_hours: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
          weekly_target_hours?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
          weekly_target_hours?: number
        }
        Relationships: []
      }
      targets: {
        Row: {
          created_at: string
          daily_hours: number
          deadline: string | null
          id: string
          is_active: boolean
          subject_id: string | null
          title: string
          user_id: string
          weekly_hours: number
        }
        Insert: {
          created_at?: string
          daily_hours?: number
          deadline?: string | null
          id?: string
          is_active?: boolean
          subject_id?: string | null
          title: string
          user_id: string
          weekly_hours?: number
        }
        Update: {
          created_at?: string
          daily_hours?: number
          deadline?: string | null
          id?: string
          is_active?: boolean
          subject_id?: string | null
          title?: string
          user_id?: string
          weekly_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "targets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_blocks: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          kind: string
          location: string | null
          sort_order: number
          start_time: string
          subject_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          kind?: string
          location?: string | null
          sort_order?: number
          start_time: string
          subject_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          kind?: string
          location?: string | null
          sort_order?: number
          start_time?: string
          subject_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_blocks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
      user_settings: {
        Row: {
          ai_autopilot: boolean
          ai_tone: string
          auto_stop_hours: number
          daily_goal_hours: number
          updated_at: string
          user_id: string
          week_starts_monday: boolean
          weekly_goal_hours: number
        }
        Insert: {
          ai_autopilot?: boolean
          ai_tone?: string
          auto_stop_hours?: number
          daily_goal_hours?: number
          updated_at?: string
          user_id: string
          week_starts_monday?: boolean
          weekly_goal_hours?: number
        }
        Update: {
          ai_autopilot?: boolean
          ai_tone?: string
          auto_stop_hours?: number
          daily_goal_hours?: number
          updated_at?: string
          user_id?: string
          week_starts_monday?: boolean
          weekly_goal_hours?: number
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          id: string
          level: number
          streak: number
          total_xp: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          level?: number
          streak?: number
          total_xp?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          level?: number
          streak?: number
          total_xp?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_overview: { Args: never; Returns: Json }
      admin_users: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          email: string
          id: string
          last_seen_at: string
          onboarded: boolean
          session_count: number
          total_minutes: number
        }[]
      }
      close_stale_sessions: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      touch_last_seen: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
