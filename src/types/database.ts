export interface Database {
  public: {
    Tables: {
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          trial_start: string;
          trial_end: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trial_start?: string;
          trial_end?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trial_start?: string;
          trial_end?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string;
        };
      };
      news_headlines: {
        Row: {
          id: string;
          original_title: string;
          neutral_title: string | null;
          original_description: string | null;
          neutral_description: string | null;
          url: string;
          published_at: string;
          source_name: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          original_title: string;
          neutral_title?: string | null;
          original_description?: string | null;
          neutral_description?: string | null;
          url: string;
          published_at: string;
          source_name: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          original_title?: string;
          neutral_title?: string | null;
          original_description?: string | null;
          neutral_description?: string | null;
          url?: string;
          published_at?: string;
          source_name?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
  };
}