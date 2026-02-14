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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      hadiths: {
        Row: {
          created_at: string
          hadith_english: string | null
          hadith_tamil: string
          id: string
          is_active: boolean
          reference: string | null
        }
        Insert: {
          created_at?: string
          hadith_english?: string | null
          hadith_tamil: string
          id?: string
          is_active?: boolean
          reference?: string | null
        }
        Update: {
          created_at?: string
          hadith_english?: string | null
          hadith_tamil?: string
          id?: string
          is_active?: boolean
          reference?: string | null
        }
        Relationships: []
      }
      hijri_admin_log: {
        Row: {
          action: string
          created_at: string
          hijri_date_snapshot: string
          id: string
        }
        Insert: {
          action: string
          created_at?: string
          hijri_date_snapshot: string
          id?: string
        }
        Update: {
          action?: string
          created_at?: string
          hijri_date_snapshot?: string
          id?: string
        }
        Relationships: []
      }
      hijri_date: {
        Row: {
          created_at: string
          hijri_day: number
          hijri_month: number
          hijri_year: number
          id: string
          last_updated: string
        }
        Insert: {
          created_at?: string
          hijri_day: number
          hijri_month: number
          hijri_year: number
          id?: string
          last_updated?: string
        }
        Update: {
          created_at?: string
          hijri_day?: number
          hijri_month?: number
          hijri_year?: number
          id?: string
          last_updated?: string
        }
        Relationships: []
      }
      prayer_time_changes: {
        Row: {
          asr_adhan: string | null
          created_at: string
          effective_from: string
          id: string
          isha_adhan: string | null
          luhar_adhan: string | null
          magrib_adhan: string | null
          subah_adhan: string | null
          sunrise: string | null
        }
        Insert: {
          asr_adhan?: string | null
          created_at?: string
          effective_from: string
          id?: string
          isha_adhan?: string | null
          luhar_adhan?: string | null
          magrib_adhan?: string | null
          subah_adhan?: string | null
          sunrise?: string | null
        }
        Update: {
          asr_adhan?: string | null
          created_at?: string
          effective_from?: string
          id?: string
          isha_adhan?: string | null
          luhar_adhan?: string | null
          magrib_adhan?: string | null
          subah_adhan?: string | null
          sunrise?: string | null
        }
        Relationships: []
      }
      prayer_times: {
        Row: {
          asr_adhan: string | null
          asr_iqamath: string | null
          created_at: string
          date: string
          hijri_date: string | null
          id: string
          isha_adhan: string | null
          isha_iqamath: string | null
          luhar_adhan: string | null
          luhar_iqamath: string | null
          magrib_adhan: string | null
          magrib_iqamath: string | null
          subah_adhan: string | null
          subah_iqamath: string | null
          sunrise: string | null
          updated_at: string
        }
        Insert: {
          asr_adhan?: string | null
          asr_iqamath?: string | null
          created_at?: string
          date: string
          hijri_date?: string | null
          id?: string
          isha_adhan?: string | null
          isha_iqamath?: string | null
          luhar_adhan?: string | null
          luhar_iqamath?: string | null
          magrib_adhan?: string | null
          magrib_iqamath?: string | null
          subah_adhan?: string | null
          subah_iqamath?: string | null
          sunrise?: string | null
          updated_at?: string
        }
        Update: {
          asr_adhan?: string | null
          asr_iqamath?: string | null
          created_at?: string
          date?: string
          hijri_date?: string | null
          id?: string
          isha_adhan?: string | null
          isha_iqamath?: string | null
          luhar_adhan?: string | null
          luhar_iqamath?: string | null
          magrib_adhan?: string | null
          magrib_iqamath?: string | null
          subah_adhan?: string | null
          subah_iqamath?: string | null
          sunrise?: string | null
          updated_at?: string
        }
        Relationships: []
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
