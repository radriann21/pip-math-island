// Generated from the `educative-project` Supabase schema (generate_typescript_types). Do not edit by hand:
// change supabase/migrations/*.sql and regenerate. Helper generics from the generator are omitted (unused).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      child_badges: {
        Row: { badge_id: string; child_id: string; earned_at: string }
        Insert: { badge_id: string; child_id: string; earned_at?: string }
        Update: { badge_id?: string; child_id?: string; earned_at?: string }
        Relationships: [
          {
            foreignKeyName: "child_badges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          created_at: string
          grade: number
          id: string
          last_played: string | null
          locale: string
          name: string
          parent_id: string
          race_best: number
          rounds_total: number
          sound_enabled: boolean
          streak: number
          updated_at: string
          xp: number
        }
        Insert: {
          created_at?: string
          grade: number
          id?: string
          last_played?: string | null
          locale?: string
          name: string
          parent_id: string
          race_best?: number
          rounds_total?: number
          sound_enabled?: boolean
          streak?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          created_at?: string
          grade?: number
          id?: string
          last_played?: string | null
          locale?: string
          name?: string
          parent_id?: string
          race_best?: number
          rounds_total?: number
          sound_enabled?: boolean
          streak?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      daily_activity: {
        Row: { bonus_claimed: boolean; child_id: string; day: string; rounds: number }
        Insert: { bonus_claimed?: boolean; child_id: string; day: string; rounds?: number }
        Update: { bonus_claimed?: boolean; child_id?: string; day?: string; rounds?: number }
        Relationships: [
          {
            foreignKeyName: "daily_activity_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      race_scores: {
        Row: { best_combo: number; child_id: string; grade: number; id: string; played_at: string; score: number }
        Insert: { best_combo?: number; child_id: string; grade: number; id?: string; played_at?: string; score: number }
        Update: { best_combo?: number; child_id?: string; grade?: number; id?: string; played_at?: string; score?: number }
        Relationships: [
          {
            foreignKeyName: "race_scores_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          best_combo: number
          child_id: string
          details: Json
          first_try: number
          grade: number
          id: string
          missed: number
          played_at: string
          second_try: number
          stars: number
          tier_after: number
          tier_before: number
          topic: string
          xp_gained: number
        }
        Insert: {
          best_combo: number
          child_id: string
          details?: Json
          first_try: number
          grade: number
          id?: string
          missed: number
          played_at?: string
          second_try: number
          stars: number
          tier_after: number
          tier_before: number
          topic: string
          xp_gained: number
        }
        Update: {
          best_combo?: number
          child_id?: string
          details?: Json
          first_try?: number
          grade?: number
          id?: string
          missed?: number
          played_at?: string
          second_try?: number
          stars?: number
          tier_after?: number
          tier_before?: number
          topic?: string
          xp_gained?: number
        }
        Relationships: [
          {
            foreignKeyName: "rounds_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_progress: {
        Row: {
          answered: number
          best_stars: number
          child_id: string
          correct: number
          grade: number
          tier: number
          topic: string
          updated_at: string
        }
        Insert: {
          answered?: number
          best_stars?: number
          child_id: string
          correct?: number
          grade: number
          tier?: number
          topic: string
          updated_at?: string
        }
        Update: {
          answered?: number
          best_stars?: number
          child_id?: string
          correct?: number
          grade?: number
          tier?: number
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_progress_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      record_race: {
        Args: {
          p_badges: string[]
          p_best_combo: number
          p_child_id: string
          p_grade: number
          p_score: number
          p_xp_gained: number
        }
        Returns: undefined
      }
      record_round: {
        Args: {
          p_badges: string[]
          p_best_combo: number
          p_bonus_xp: number
          p_child_id: string
          p_details: Json
          p_first_try: number
          p_grade: number
          p_missed: number
          p_second_try: number
          p_stars: number
          p_streak: number
          p_tier_after: number
          p_tier_before: number
          p_today: string
          p_topic: string
          p_xp_gained: number
        }
        Returns: undefined
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
