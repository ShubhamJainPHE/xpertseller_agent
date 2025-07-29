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
          current_price: number | null
          margin_floor: number
          stock_level: number
          velocity_30d: number
          conversion_rate_30d: number
          is_active: boolean
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
          current_price?: number | null
          margin_floor?: number
          stock_level?: number
          velocity_30d?: number
          conversion_rate_30d?: number
          is_active?: boolean
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
          current_price?: number | null
          margin_floor?: number
          stock_level?: number
          velocity_30d?: number
          conversion_rate_30d?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      recommendations: {
        Row: {
          id: string
          seller_id: string
          asin: string | null
          agent_type: string
          recommendation_type: string
          title: string
          description: string
          predicted_impact: number | null
          confidence_score: number
          urgency_level: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          asin?: string | null
          agent_type: string
          recommendation_type: string
          title: string
          description: string
          predicted_impact?: number | null
          confidence_score: number
          urgency_level?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          asin?: string | null
          agent_type?: string
          recommendation_type?: string
          title?: string
          description?: string
          predicted_impact?: number | null
          confidence_score?: number
          urgency_level?: string
          status?: string
          created_at?: string
        }
      }
      system_metrics: {
        Row: {
          id: string
          metric_type: string
          metric_name: string
          metric_value: number
          metric_unit: string | null
          dimensions: Json
          timestamp: string
        }
        Insert: {
          id?: string
          metric_type: string
          metric_name: string
          metric_value: number
          metric_unit?: string | null
          dimensions?: Json
          timestamp?: string
        }
        Update: {
          id?: string
          metric_type?: string
          metric_name?: string
          metric_value?: number
          metric_unit?: string | null
          dimensions?: Json
          timestamp?: string
        }
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