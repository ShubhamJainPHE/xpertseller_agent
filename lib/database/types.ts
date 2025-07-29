export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sellers: {
        Row: {
          id: string
          email: string
          amazon_seller_id: string
          marketplace_ids: string[]
          sp_api_credentials: Json
          business_context: Json
          preferences: Json
          risk_tolerance: number
          onboarding_completed: boolean
          subscription_tier: string
          monthly_profit_target: number | null
          created_at: string
          updated_at: string
          last_login_at: string | null
          status: string
        }
        Insert: {
          id?: string
          email: string
          amazon_seller_id: string
          marketplace_ids?: string[]
          sp_api_credentials: Json
          business_context?: Json
          preferences?: Json
          risk_tolerance?: number
          onboarding_completed?: boolean
          subscription_tier?: string
          monthly_profit_target?: number | null
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          email?: string
          amazon_seller_id?: string
          marketplace_ids?: string[]
          sp_api_credentials?: Json
          business_context?: Json
          preferences?: Json
          risk_tolerance?: number
          onboarding_completed?: boolean
          subscription_tier?: string
          monthly_profit_target?: number | null
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
          status?: string
        }
      }
      products: {
        Row: {
          id: string
          seller_id: string
          asin: string
          marketplace_id: string
          title: string
          brand: string | null
          category: string | null
          subcategory: string | null
          product_group: string | null
          current_price: number | null
          list_price: number | null
          cost_basis: number | null
          margin_floor: number
          target_margin: number | null
          min_price: number | null
          max_price: number | null
          stock_level: number
          reserved_quantity: number
          inbound_quantity: number
          available_quantity: number | null
          velocity_7d: number
          velocity_30d: number
          velocity_90d: number
          lead_time_days: number
          reorder_point: number
          max_inventory: number | null
          supplier_info: Json
          product_dimensions: Json
          weight: number | null
          is_fba: boolean
          is_active: boolean
          last_buy_box_win: string | null
          buy_box_percentage_30d: number
          session_percentage_30d: number
          conversion_rate_30d: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          asin: string
          marketplace_id: string
          title: string
          brand?: string | null
          category?: string | null
          subcategory?: string | null
          product_group?: string | null
          current_price?: number | null
          list_price?: number | null
          cost_basis?: number | null
          margin_floor?: number
          target_margin?: number | null
          min_price?: number | null
          max_price?: number | null
          stock_level?: number
          reserved_quantity?: number
          inbound_quantity?: number
          velocity_7d?: number
          velocity_30d?: number
          velocity_90d?: number
          lead_time_days?: number
          reorder_point?: number
          max_inventory?: number | null
          supplier_info?: Json
          product_dimensions?: Json
          weight?: number | null
          is_fba?: boolean
          is_active?: boolean
          last_buy_box_win?: string | null
          buy_box_percentage_30d?: number
          session_percentage_30d?: number
          conversion_rate_30d?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          asin?: string
          marketplace_id?: string
          title?: string
          brand?: string | null
          category?: string | null
          subcategory?: string | null
          product_group?: string | null
          current_price?: number | null
          list_price?: number | null
          cost_basis?: number | null
          margin_floor?: number
          target_margin?: number | null
          min_price?: number | null
          max_price?: number | null
          stock_level?: number
          reserved_quantity?: number
          inbound_quantity?: number
          velocity_7d?: number
          velocity_30d?: number
          velocity_90d?: number
          lead_time_days?: number
          reorder_point?: number
          max_inventory?: number | null
          supplier_info?: Json
          product_dimensions?: Json
          weight?: number | null
          is_fba?: boolean
          is_active?: boolean
          last_buy_box_win?: string | null
          buy_box_percentage_30d?: number
          session_percentage_30d?: number
          conversion_rate_30d?: number
          created_at?: string
          updated_at?: string
        }
      }
      recommendations: {
        Row: {
          id: string
          seller_id: string
          asin: string | null
          marketplace_id: string | null
          agent_type: string
          recommendation_type: string
          title: string
          description: string
          action_required: Json
          predicted_impact: number | null
          impact_timeframe: string
          confidence_score: number
          risk_level: string
          priority: number
          urgency_level: string
          reasoning: Json
          supporting_data: Json
          prerequisites: Json
          expected_outcome: Json
          rollback_plan: Json
          status: string
          simulation_results: Json
          execution_count: number
          expires_at: string
          viewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          asin?: string | null
          marketplace_id?: string | null
          agent_type: string
          recommendation_type: string
          title: string
          description: string
          action_required?: Json
          predicted_impact?: number | null
          impact_timeframe?: string
          confidence_score: number
          risk_level?: string
          priority?: number
          urgency_level?: string
          reasoning?: Json
          supporting_data?: Json
          prerequisites?: Json
          expected_outcome?: Json
          rollback_plan?: Json
          status?: string
          simulation_results?: Json
          execution_count?: number
          expires_at: string
          viewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          asin?: string | null
          marketplace_id?: string | null
          agent_type?: string
          recommendation_type?: string
          title?: string
          description?: string
          action_required?: Json
          predicted_impact?: number | null
          impact_timeframe?: string
          confidence_score?: number
          risk_level?: string
          priority?: number
          urgency_level?: string
          reasoning?: Json
          supporting_data?: Json
          prerequisites?: Json
          expected_outcome?: Json
          rollback_plan?: Json
          status?: string
          simulation_results?: Json
          execution_count?: number
          expires_at?: string
          viewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      fact_stream: {
        Row: {
          id: number
          seller_id: string
          asin: string | null
          marketplace_id: string | null
          event_type: string
          event_category: string
          timestamp: string
          data: Json
          metadata: Json
          processed_by: string[]
          correlation_id: string | null
          importance_score: number
          requires_action: boolean
          processing_status: string
          retry_count: number
          created_at: string
        }
        Insert: {
          id?: number
          seller_id: string
          asin?: string | null
          marketplace_id?: string | null
          event_type: string
          event_category: string
          timestamp?: string
          data?: Json
          metadata?: Json
          processed_by?: string[]
          correlation_id?: string | null
          importance_score?: number
          requires_action?: boolean
          processing_status?: string
          retry_count?: number
          created_at?: string
        }
        Update: {
          id?: number
          seller_id?: string
          asin?: string | null
          marketplace_id?: string | null
          event_type?: string
          event_category?: string
          timestamp?: string
          data?: Json
          metadata?: Json
          processed_by?: string[]
          correlation_id?: string | null
          importance_score?: number
          requires_action?: boolean
          processing_status?: string
          retry_count?: number
          created_at?: string
        }
      }
      automated_actions: {
        Row: {
          id: string
          recommendation_id: string
          action_type: string
          action_data: Json
          execution_status: string
          approval_required: boolean
          approved_by: string | null
          approved_at: string | null
          scheduled_at: string | null
          executed_at: string | null
          completed_at: string | null
          sp_api_request: Json
          sp_api_response: Json
          error_details: Json
          retry_count: number
          max_retries: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          recommendation_id: string
          action_type: string
          action_data?: Json
          execution_status?: string
          approval_required?: boolean
          approved_by?: string | null
          approved_at?: string | null
          scheduled_at?: string | null
          executed_at?: string | null
          completed_at?: string | null
          sp_api_request?: Json
          sp_api_response?: Json
          error_details?: Json
          retry_count?: number
          max_retries?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          recommendation_id?: string
          action_type?: string
          action_data?: Json
          execution_status?: string
          approval_required?: boolean
          approved_by?: string | null
          approved_at?: string | null
          scheduled_at?: string | null
          executed_at?: string | null
          completed_at?: string | null
          sp_api_request?: Json
          sp_api_response?: Json
          error_details?: Json
          retry_count?: number
          max_retries?: number
          created_at?: string
          updated_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          seller_id: string
          alert_type: string
          channel: string
          title: string
          message: string
          action_url: string | null
          related_recommendation_id: string | null
          related_asin: string | null
          send_after: string
          expires_at: string | null
          sent_at: string | null
          delivered_at: string | null
          opened_at: string | null
          status: string
          retry_count: number
          created_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          alert_type: string
          channel: string
          title: string
          message: string
          action_url?: string | null
          related_recommendation_id?: string | null
          related_asin?: string | null
          send_after?: string
          expires_at?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          opened_at?: string | null
          status?: string
          retry_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          alert_type?: string
          channel?: string
          title?: string
          message?: string
          action_url?: string | null
          related_recommendation_id?: string | null
          related_asin?: string | null
          send_after?: string
          expires_at?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          opened_at?: string | null
          status?: string
          retry_count?: number
          created_at?: string
        }
      }
      intelligence_cache: {
        Row: {
          id: string
          cache_key: string
          seller_id: string | null
          cache_type: string
          domain: string | null
          data: Json
          embeddings: number[] | null
          confidence_score: number
          usage_count: number
          last_accessed: string
          expires_at: string
          auto_refresh: boolean
          tags: string[]
          created_at: string
        }
        Insert: {
          id?: string
          cache_key: string
          seller_id?: string | null
          cache_type: string
          domain?: string | null
          data?: Json
          embeddings?: number[] | null
          confidence_score?: number
          usage_count?: number
          last_accessed?: string
          expires_at: string
          auto_refresh?: boolean
          tags?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          cache_key?: string
          seller_id?: string | null
          cache_type?: string
          domain?: string | null
          data?: Json
          embeddings?: number[] | null
          confidence_score?: number
          usage_count?: number
          last_accessed?: string
          expires_at?: string
          auto_refresh?: boolean
          tags?: string[]
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_product_velocity: {
        Args: {
          p_product_id: string
        }
        Returns: undefined
      }
      calculate_recommendation_priority: {
        Args: {
          p_predicted_impact: number
          p_confidence_score: number
          p_risk_level: string
          p_urgency_level: string
        }
        Returns: number
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