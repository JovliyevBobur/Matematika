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
      books: {
        Row: {
          author: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          download_count: number
          file_size_bytes: number | null
          id: string
          is_published: boolean
          page_count: number | null
          pdf_path: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number
          file_size_bytes?: number | null
          id?: string
          is_published?: boolean
          page_count?: number | null
          pdf_path: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number
          file_size_bytes?: number | null
          id?: string
          is_published?: boolean
          page_count?: number | null
          pdf_path?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      choices: {
        Row: {
          choice_text: string
          id: string
          is_correct: boolean
          order_index: number
          question_id: string
        }
        Insert: {
          choice_text: string
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id: string
        }
        Update: {
          choice_text?: string
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_import_jobs: {
        Row: {
          access_code: string | null
          answer_keys: string | null
          attempt_count: number
          completed_at: string | null
          created_at: string
          debug: Json | null
          duration_minutes: number
          error_message: string | null
          error_stage: string | null
          file_name: string
          file_size_bytes: number
          id: string
          max_attempts: number
          page_count: number | null
          progress: number
          questions_count: number | null
          result_test_id: string | null
          stage: string
          started_at: string | null
          status: string
          subject: Database["public"]["Enums"]["subject"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string | null
          answer_keys?: string | null
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          debug?: Json | null
          duration_minutes?: number
          error_message?: string | null
          error_stage?: string | null
          file_name: string
          file_size_bytes: number
          id?: string
          max_attempts?: number
          page_count?: number | null
          progress?: number
          questions_count?: number | null
          result_test_id?: string | null
          stage?: string
          started_at?: string | null
          status?: string
          subject: Database["public"]["Enums"]["subject"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string | null
          answer_keys?: string | null
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          debug?: Json | null
          duration_minutes?: number
          error_message?: string | null
          error_stage?: string | null
          file_name?: string
          file_size_bytes?: number
          id?: string
          max_attempts?: number
          page_count?: number | null
          progress?: number
          questions_count?: number | null
          result_test_id?: string | null
          stage?: string
          started_at?: string | null
          status?: string
          subject?: Database["public"]["Enums"]["subject"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_import_jobs_result_test_id_fkey"
            columns: ["result_test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          is_blocked: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_blocked?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_blocked?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string
          id: string
          order_index: number
          question_text: string
          explanation: string | null
          test_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          question_text: string
          explanation?: string | null
          test_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          question_text?: string
          explanation?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          completed_at: string | null
          id: string
          score: number | null
          started_at: string
          test_id: string
          time_spent_seconds: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          score?: number | null
          started_at?: string
          test_id: string
          time_spent_seconds?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          score?: number | null
          started_at?: string
          test_id?: string
          time_spent_seconds?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          access_code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_published: boolean
          subject: Database["public"]["Enums"]["subject"]
          title: string
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          subject: Database["public"]["Enums"]["subject"]
          title: string
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          subject?: Database["public"]["Enums"]["subject"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_answers: {
        Row: {
          attempt_id: string
          id: string
          is_correct: boolean | null
          question_id: string
          selected_choice_id: string | null
        }
        Insert: {
          attempt_id: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_choice_id?: string | null
        }
        Update: {
          attempt_id?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_choice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_selected_choice_id_fkey"
            columns: ["selected_choice_id"]
            isOneToOne: false
            referencedRelation: "choices"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      get_leaderboard: {
        Args: {
          p_limit?: number
          p_subject?: Database["public"]["Enums"]["subject"]
        }
        Returns: {
          avatar_url: string
          avg_score: number
          full_name: string
          tests_completed: number
          total_score: number
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_super: { Args: { _user_id: string }; Returns: boolean }
      promote_to_super_admin: {
        Args: { user_email: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user"
      subject:
        | "math"
        | "physics"
        | "english"
        | "history"
        | "russian"
        | "uzbek"
        | "chemistry"
        | "biology"
        | "informatics"
      user_role: "user" | "admin"
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
      app_role: ["super_admin", "admin", "user"],
      subject: [
        "math",
        "physics",
        "english",
        "history",
        "russian",
        "uzbek",
        "chemistry",
        "biology",
        "informatics",
      ],
      user_role: ["user", "admin"],
    },
  },
} as const
