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
      accounts: {
        Row: {
          currency: string
          id: string
          locked_balance: number
          total_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          currency?: string
          id?: string
          locked_balance?: number
          total_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          currency?: string
          id?: string
          locked_balance?: number
          total_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_activity: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string
          created_at: string
          id: string
          new_value: string | null
          previous_value: string | null
          reason: string | null
          reference: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id: string
          created_at?: string
          id?: string
          new_value?: string | null
          previous_value?: string | null
          reason?: string | null
          reference?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string
          created_at?: string
          id?: string
          new_value?: string | null
          previous_value?: string | null
          reason?: string | null
          reference?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      fund_locks: {
        Row: {
          amount: number
          id: string
          locked_at: string
          reference: string
          released_at: string | null
          status: string
          unlock_date: string
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          locked_at?: string
          reference?: string
          released_at?: string | null
          status?: string
          unlock_date: string
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          locked_at?: string
          reference?: string
          released_at?: string | null
          status?: string
          unlock_date?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_assets: {
        Row: {
          category: Database["public"]["Enums"]["invest_category"]
          created_at: string
          day_open: number
          day_open_at: string
          description: string
          enabled: boolean
          icon_url: string | null
          id: string
          last_tick_at: string
          max_daily_move: number
          min_investment: number
          name: string
          price: number
          risk: Database["public"]["Enums"]["risk_level"]
          symbol: string
          trend: number
          update_interval_seconds: number
          updated_at: string
          volatility: number
        }
        Insert: {
          category: Database["public"]["Enums"]["invest_category"]
          created_at?: string
          day_open?: number
          day_open_at?: string
          description?: string
          enabled?: boolean
          icon_url?: string | null
          id?: string
          last_tick_at?: string
          max_daily_move?: number
          min_investment?: number
          name: string
          price: number
          risk?: Database["public"]["Enums"]["risk_level"]
          symbol: string
          trend?: number
          update_interval_seconds?: number
          updated_at?: string
          volatility?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["invest_category"]
          created_at?: string
          day_open?: number
          day_open_at?: string
          description?: string
          enabled?: boolean
          icon_url?: string | null
          id?: string
          last_tick_at?: string
          max_daily_move?: number
          min_investment?: number
          name?: string
          price?: number
          risk?: Database["public"]["Enums"]["risk_level"]
          symbol?: string
          trend?: number
          update_interval_seconds?: number
          updated_at?: string
          volatility?: number
        }
        Relationships: []
      }
      investment_positions: {
        Row: {
          amount: number
          asset_id: string
          category: Database["public"]["Enums"]["invest_category"]
          closed_at: string | null
          created_at: string
          current_value: number
          entry_price: number
          final_value: number | null
          id: string
          paused_at: string | null
          quantity: number
          reference: string
          status: Database["public"]["Enums"]["invest_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          asset_id: string
          category: Database["public"]["Enums"]["invest_category"]
          closed_at?: string | null
          created_at?: string
          current_value?: number
          entry_price: number
          final_value?: number | null
          id?: string
          paused_at?: string | null
          quantity: number
          reference?: string
          status?: Database["public"]["Enums"]["invest_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          asset_id?: string
          category?: Database["public"]["Enums"]["invest_category"]
          closed_at?: string | null
          created_at?: string
          current_value?: number
          entry_price?: number
          final_value?: number | null
          id?: string
          paused_at?: string | null
          quantity?: number
          reference?: string
          status?: Database["public"]["Enums"]["invest_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_positions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "investment_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_price_history: {
        Row: {
          asset_id: string
          id: number
          price: number
          recorded_at: string
        }
        Insert: {
          asset_id: string
          id?: number
          price: number
          recorded_at?: string
        }
        Update: {
          asset_id?: string
          id?: number
          price?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_price_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "investment_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_simulation_settings: {
        Row: {
          default_volatility: number
          engine_enabled: boolean
          id: string
          market_trend: number
          max_daily_move: number
          singleton: boolean
          update_interval_seconds: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          default_volatility?: number
          engine_enabled?: boolean
          id?: string
          market_trend?: number
          max_daily_move?: number
          singleton?: boolean
          update_interval_seconds?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          default_volatility?: number
          engine_enabled?: boolean
          id?: string
          market_trend?: number
          max_daily_move?: number
          singleton?: boolean
          update_interval_seconds?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      investment_transactions: {
        Row: {
          amount: number
          asset_id: string
          created_at: string
          id: string
          note: string | null
          position_id: string
          price: number
          quantity: number
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          asset_id: string
          created_at?: string
          id?: string
          note?: string | null
          position_id: string
          price: number
          quantity: number
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          asset_id?: string
          created_at?: string
          id?: string
          note?: string | null
          position_id?: string
          price?: number
          quantity?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "investment_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_transactions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "investment_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verifications: {
        Row: {
          country: string
          created_at: string
          document_path: string
          id: string
          id_type: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string
          user_id: string
        }
        Insert: {
          country: string
          created_at?: string
          document_path: string
          id?: string
          id_type: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path: string
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          user_id: string
        }
        Update: {
          country?: string
          created_at?: string
          document_path?: string
          id?: string
          id_type?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_number: string
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          last_active_at: string
          phone: string | null
          status: Database["public"]["Enums"]["account_status"]
          status_message: string | null
        }
        Insert: {
          account_number?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          last_active_at?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          status_message?: string | null
        }
        Update: {
          account_number?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_active_at?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          status_message?: string | null
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          conversation_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          message: string
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          message: string
          read_at?: string | null
          sender_id: string
          sender_role: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          message?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          created_by: string | null
          description: string
          id: string
          reference: string
          status: string
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          reference?: string
          status?: string
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          reference?: string
          status?: string
          type?: Database["public"]["Enums"]["txn_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_restrictions: {
        Row: {
          end_date: string | null
          id: string
          is_restricted: boolean
          message: string | null
          reason: string | null
          start_date: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          end_date?: string | null
          id?: string
          is_restricted?: boolean
          message?: string | null
          reason?: string | null
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          end_date?: string | null
          id?: string
          is_restricted?: boolean
          message?: string | null
          reason?: string | null
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          completed_at: string | null
          expected_completion_date: string | null
          id: string
          note: string | null
          processing_date: string | null
          reference: string
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          completed_at?: string | null
          expected_completion_date?: string | null
          id?: string
          note?: string | null
          processing_date?: string | null
          reference?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          amount?: number
          bank_name?: string
          completed_at?: string | null
          expected_completion_date?: string | null
          id?: string
          note?: string | null
          processing_date?: string | null
          reference?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_balance: {
        Args: {
          _amount: number
          _direction: string
          _reason: string
          _target: string
        }
        Returns: {
          currency: string
          id: string
          locked_balance: number
          total_balance: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_delete_kyc: {
        Args: { _id: string; _reason?: string }
        Returns: undefined
      }
      admin_delete_notification: { Args: { _id: string }; Returns: undefined }
      admin_investments: {
        Args: never
        Returns: {
          amount: number
          asset_id: string
          asset_name: string
          avatar_url: string
          category: Database["public"]["Enums"]["invest_category"]
          closed_at: string
          created_at: string
          current_price: number
          current_value: number
          email: string
          entry_price: number
          final_value: number
          full_name: string
          id: string
          quantity: number
          reference: string
          status: Database["public"]["Enums"]["invest_status"]
          symbol: string
          updated_at: string
          user_id: string
        }[]
      }
      admin_kyc: {
        Args: never
        Returns: {
          account_number: string
          country: string
          document_path: string
          email: string
          full_name: string
          id: string
          id_type: string
          rejection_reason: string
          reviewed_at: string
          reviewed_by: string
          reviewer_email: string
          selfie_path: string
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string
          user_id: string
        }[]
      }
      admin_log_event: {
        Args: { _action: string; _reason?: string; _target?: string }
        Returns: undefined
      }
      admin_overview: { Args: never; Returns: Json }
      admin_reply_support: {
        Args: { _conversation: string; _message: string }
        Returns: {
          conversation_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          message: string
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        SetofOptions: {
          from: "*"
          to: "support_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_review_kyc: {
        Args: {
          _id: string
          _reason?: string
          _status: Database["public"]["Enums"]["kyc_status"]
        }
        Returns: {
          country: string
          created_at: string
          document_path: string
          id: string
          id_type: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "kyc_verifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_avatar: {
        Args: { _target: string; _url: string }
        Returns: {
          account_number: string
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          last_active_at: string
          phone: string | null
          status: Database["public"]["Enums"]["account_status"]
          status_message: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_investment_status: {
        Args: {
          _id: string
          _reason?: string
          _status: Database["public"]["Enums"]["invest_status"]
        }
        Returns: {
          amount: number
          asset_id: string
          category: Database["public"]["Enums"]["invest_category"]
          closed_at: string | null
          created_at: string
          current_value: number
          entry_price: number
          final_value: number | null
          id: string
          paused_at: string | null
          quantity: number
          reference: string
          status: Database["public"]["Enums"]["invest_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "investment_positions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_restriction: {
        Args: {
          _end: string
          _is_restricted: boolean
          _message: string
          _reason: string
          _start: string
          _target: string
        }
        Returns: {
          end_date: string | null
          id: string
          is_restricted: boolean
          message: string | null
          reason: string | null
          start_date: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawal_restrictions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_status: {
        Args: {
          _message: string
          _reason: string
          _status: Database["public"]["Enums"]["account_status"]
          _target: string
        }
        Returns: {
          account_number: string
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          last_active_at: string
          phone: string | null
          status: Database["public"]["Enums"]["account_status"]
          status_message: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_support_conversations: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          id: string
          last_message: string
          last_message_at: string
          last_sender: string
          unread: number
          user_id: string
        }[]
      }
      admin_update_profile: {
        Args: {
          _account_number: string
          _created_at: string
          _full_name: string
          _phone: string
          _reason?: string
          _target: string
        }
        Returns: {
          account_number: string
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          last_active_at: string
          phone: string | null
          status: Database["public"]["Enums"]["account_status"]
          status_message: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_simulation: {
        Args: {
          _default_volatility: number
          _engine_enabled: boolean
          _market_trend: number
          _max_daily_move: number
          _reason?: string
          _update_interval_seconds: number
        }
        Returns: {
          default_volatility: number
          engine_enabled: boolean
          id: string
          market_trend: number
          max_daily_move: number
          singleton: boolean
          update_interval_seconds: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "investment_simulation_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_withdrawal: {
        Args: {
          _completed_at?: string
          _expected_date?: string
          _id: string
          _processing_date?: string
          _reason?: string
          _status?: Database["public"]["Enums"]["withdrawal_status"]
        }
        Returns: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          completed_at: string | null
          expected_completion_date: string | null
          id: string
          note: string | null
          processing_date: string | null
          reference: string
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_asset: {
        Args: {
          _category: Database["public"]["Enums"]["invest_category"]
          _description: string
          _enabled: boolean
          _icon_url: string
          _id: string
          _max_daily_move: number
          _min_investment: number
          _name: string
          _price: number
          _reason?: string
          _risk: Database["public"]["Enums"]["risk_level"]
          _symbol: string
          _trend: number
          _update_interval_seconds: number
          _volatility: number
        }
        Returns: {
          category: Database["public"]["Enums"]["invest_category"]
          created_at: string
          day_open: number
          day_open_at: string
          description: string
          enabled: boolean
          icon_url: string | null
          id: string
          last_tick_at: string
          max_daily_move: number
          min_investment: number
          name: string
          price: number
          risk: Database["public"]["Enums"]["risk_level"]
          symbol: string
          trend: number
          update_interval_seconds: number
          updated_at: string
          volatility: number
        }
        SetofOptions: {
          from: "*"
          to: "investment_assets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_notification: {
        Args: {
          _created_at: string
          _id: string
          _message: string
          _read?: boolean
          _target: string
          _title: string
          _type: string
        }
        Returns: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_users: {
        Args: never
        Returns: {
          account_number: string
          available_balance: number
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_restricted: boolean
          last_active_at: string
          locked_balance: number
          pending_withdrawals: number
          phone: string
          status: Database["public"]["Enums"]["account_status"]
          total_balance: number
        }[]
      }
      assert_admin: { Args: never; Returns: string }
      asset_series: {
        Args: { _asset_id: string; _period: string }
        Returns: {
          price: number
          t: string
        }[]
      }
      available_balance: { Args: { _user_id: string }; Returns: number }
      clean_support_message: { Args: { _m: string }; Returns: string }
      close_investment: {
        Args: { _id: string; _reason?: string }
        Returns: {
          amount: number
          asset_id: string
          category: Database["public"]["Enums"]["invest_category"]
          closed_at: string | null
          created_at: string
          current_value: number
          entry_price: number
          final_value: number | null
          id: string
          paused_at: string | null
          quantity: number
          reference: string
          status: Database["public"]["Enums"]["invest_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "investment_positions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_fund_lock: {
        Args: { _amount: number; _unlock_date: string }
        Returns: {
          amount: number
          id: string
          locked_at: string
          reference: string
          released_at: string | null
          status: string
          unlock_date: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "fund_locks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_investment: {
        Args: { _amount: number; _asset_id: string }
        Returns: {
          amount: number
          asset_id: string
          category: Database["public"]["Enums"]["invest_category"]
          closed_at: string | null
          created_at: string
          current_value: number
          entry_price: number
          final_value: number | null
          id: string
          paused_at: string | null
          quantity: number
          reference: string
          status: Database["public"]["Enums"]["invest_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "investment_positions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_support_message: { Args: { _id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_admin: {
        Args: {
          _action: string
          _admin: string
          _new: string
          _prev: string
          _reason: string
          _target: string
        }
        Returns: undefined
      }
      mark_support_read: { Args: { _conversation: string }; Returns: undefined }
      pending_withdrawal_total: { Args: { _user_id: string }; Returns: number }
      release_due_fund_locks: {
        Args: { _user_id?: string }
        Returns: undefined
      }
      request_withdrawal: {
        Args: {
          _account_name: string
          _account_number: string
          _amount: number
          _bank_name: string
          _note?: string
        }
        Returns: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          completed_at: string | null
          expected_completion_date: string | null
          id: string
          note: string | null
          processing_date: string | null
          reference: string
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_support_message: {
        Args: { _message: string }
        Returns: {
          conversation_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          message: string
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        SetofOptions: {
          from: "*"
          to: "support_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_kyc: {
        Args: {
          _country: string
          _document_path: string
          _id_type: string
          _selfie_path: string
        }
        Returns: {
          country: string
          created_at: string
          document_path: string
          id: string
          id_type: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "kyc_verifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tick_market: { Args: never; Returns: undefined }
    }
    Enums: {
      account_status: "active" | "restricted" | "suspended"
      app_role: "admin" | "user"
      invest_category: "stocks" | "crypto" | "forex"
      invest_status: "active" | "paused" | "closed"
      kyc_status: "not_verified" | "pending" | "verified" | "declined"
      risk_level: "low" | "medium" | "high"
      txn_type:
        | "deposit"
        | "withdrawal"
        | "adjustment"
        | "fund_lock"
        | "fund_unlock"
        | "investment"
        | "investment_return"
      withdrawal_status:
        | "pending"
        | "under_review"
        | "approved"
        | "rejected"
        | "processing"
        | "completed"
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
      account_status: ["active", "restricted", "suspended"],
      app_role: ["admin", "user"],
      invest_category: ["stocks", "crypto", "forex"],
      invest_status: ["active", "paused", "closed"],
      kyc_status: ["not_verified", "pending", "verified", "declined"],
      risk_level: ["low", "medium", "high"],
      txn_type: [
        "deposit",
        "withdrawal",
        "adjustment",
        "fund_lock",
        "fund_unlock",
        "investment",
        "investment_return",
      ],
      withdrawal_status: [
        "pending",
        "under_review",
        "approved",
        "rejected",
        "processing",
        "completed",
      ],
    },
  },
} as const
