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
      ai_models: {
        Row: {
          context_window: number | null
          created_at: string
          currency: string
          deleted_at: string | null
          display_name: string
          family: string | null
          id: string
          input_cost_per_1k: number
          is_active: boolean
          max_output_tokens: number | null
          metadata: Json
          modality: string
          output_cost_per_1k: number
          provider_id: string
          slug: string
          sort_order: number
          supports_tools: boolean
          supports_vision: boolean
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          context_window?: number | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          display_name: string
          family?: string | null
          id?: string
          input_cost_per_1k?: number
          is_active?: boolean
          max_output_tokens?: number | null
          metadata?: Json
          modality?: string
          output_cost_per_1k?: number
          provider_id: string
          slug: string
          sort_order?: number
          supports_tools?: boolean
          supports_vision?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          context_window?: number | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          display_name?: string
          family?: string | null
          id?: string
          input_cost_per_1k?: number
          is_active?: boolean
          max_output_tokens?: number | null
          metadata?: Json
          modality?: string
          output_cost_per_1k?: number
          provider_id?: string
          slug?: string
          sort_order?: number
          supports_tools?: boolean
          supports_vision?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_models_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_personalities: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          metadata: Json
          name: string
          system_prompt: string
          temperature: number
          tenant_id: string | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          system_prompt: string
          temperature?: number
          tenant_id?: string | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          system_prompt?: string
          temperature?: number
          tenant_id?: string | null
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_personalities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_health: {
        Row: {
          avg_response_ms: number
          consecutive_failures: number
          deleted_at: string | null
          failure_count: number
          last_error: string | null
          last_failure_at: string | null
          last_success_at: string | null
          provider_id: string
          status: Database["public"]["Enums"]["ai_provider_status"]
          success_count: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          avg_response_ms?: number
          consecutive_failures?: number
          deleted_at?: string | null
          failure_count?: number
          last_error?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          provider_id: string
          status?: Database["public"]["Enums"]["ai_provider_status"]
          success_count?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          avg_response_ms?: number
          consecutive_failures?: number
          deleted_at?: string | null
          failure_count?: number
          last_error?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          provider_id?: string
          status?: Database["public"]["Enums"]["ai_provider_status"]
          success_count?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_health_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_provider_health_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          api_key: string | null
          base_url: string | null
          category: Database["public"]["Enums"]["ai_provider_category"]
          created_at: string
          deleted_at: string | null
          enabled: boolean
          id: string
          is_primary: boolean
          max_retries: number
          model: string | null
          name: string
          notes: string | null
          priority: number
          slug: string
          timeout_ms: number
          updated_at: string
          vendor: string
          weight: number
          workspace_id: string | null
        }
        Insert: {
          api_key?: string | null
          base_url?: string | null
          category: Database["public"]["Enums"]["ai_provider_category"]
          created_at?: string
          deleted_at?: string | null
          enabled?: boolean
          id?: string
          is_primary?: boolean
          max_retries?: number
          model?: string | null
          name: string
          notes?: string | null
          priority?: number
          slug: string
          timeout_ms?: number
          updated_at?: string
          vendor: string
          weight?: number
          workspace_id?: string | null
        }
        Update: {
          api_key?: string | null
          base_url?: string | null
          category?: Database["public"]["Enums"]["ai_provider_category"]
          created_at?: string
          deleted_at?: string | null
          enabled?: boolean
          id?: string
          is_primary?: boolean
          max_retries?: number
          model?: string | null
          name?: string
          notes?: string | null
          priority?: number
          slug?: string
          timeout_ms?: number
          updated_at?: string
          vendor?: string
          weight?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_providers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_request_logs: {
        Row: {
          attempt: number
          category: Database["public"]["Enums"]["ai_provider_category"]
          created_at: string
          deleted_at: string | null
          error_code: string | null
          error_message: string | null
          failover_from: string | null
          id: string
          message_type: Database["public"]["Enums"]["ai_message_type"]
          prompt_preview: string | null
          provider_id: string | null
          provider_name: string | null
          response_ms: number
          status: Database["public"]["Enums"]["ai_request_status"]
          workspace_id: string | null
        }
        Insert: {
          attempt?: number
          category: Database["public"]["Enums"]["ai_provider_category"]
          created_at?: string
          deleted_at?: string | null
          error_code?: string | null
          error_message?: string | null
          failover_from?: string | null
          id?: string
          message_type: Database["public"]["Enums"]["ai_message_type"]
          prompt_preview?: string | null
          provider_id?: string | null
          provider_name?: string | null
          response_ms?: number
          status: Database["public"]["Enums"]["ai_request_status"]
          workspace_id?: string | null
        }
        Update: {
          attempt?: number
          category?: Database["public"]["Enums"]["ai_provider_category"]
          created_at?: string
          deleted_at?: string | null
          error_code?: string | null
          error_message?: string | null
          failover_from?: string | null
          id?: string
          message_type?: Database["public"]["Enums"]["ai_message_type"]
          prompt_preview?: string | null
          provider_id?: string | null
          provider_name?: string | null
          response_ms?: number
          status?: Database["public"]["Enums"]["ai_request_status"]
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_request_logs_failover_from_fkey"
            columns: ["failover_from"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_request_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_request_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          deleted_at: string | null
          gemini_api_key: string | null
          id: number
          max_tokens: number
          model: string
          temperature: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          deleted_at?: string | null
          gemini_api_key?: string | null
          id?: number
          max_tokens?: number
          model?: string
          temperature?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          deleted_at?: string | null
          gemini_api_key?: string | null
          id?: number
          max_tokens?: number
          model?: string
          temperature?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_stats: {
        Row: {
          cost_cents: number
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          input_tokens: number
          metadata: Json
          model_slug: string
          output_tokens: number
          provider_id: string | null
          request_count: number
          tenant_id: string
          total_tokens: number
          updated_at: string
          usage_date: string
        }
        Insert: {
          cost_cents?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          input_tokens?: number
          metadata?: Json
          model_slug: string
          output_tokens?: number
          provider_id?: string | null
          request_count?: number
          tenant_id: string
          total_tokens?: number
          updated_at?: string
          usage_date: string
        }
        Update: {
          cost_cents?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          input_tokens?: number
          metadata?: Json
          model_slug?: string
          output_tokens?: number
          provider_id?: string | null
          request_count?: number
          tenant_id?: string
          total_tokens?: number
          updated_at?: string
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_stats_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_stats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_published: boolean
          published_at: string | null
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          severity?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          created_at: string
          deleted_at: string | null
          duration_ms: number | null
          endpoint: string
          id: string
          ip: string | null
          metadata: Json
          method: string
          request_bytes: number | null
          response_bytes: number | null
          status_code: number | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          endpoint: string
          id?: string
          ip?: string | null
          metadata?: Json
          method: string
          request_bytes?: number | null
          response_bytes?: number | null
          status_code?: number | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          endpoint?: string
          id?: string
          ip?: string | null
          metadata?: Json
          method?: string
          request_bytes?: number | null
          response_bytes?: number | null
          status_code?: number | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          deleted_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip: string | null
          metadata: Json
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          deleted_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip?: string | null
          metadata?: Json
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          deleted_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip?: string | null
          metadata?: Json
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_actions: {
        Row: {
          action_type: string
          config: Json
          created_at: string
          delay_seconds: number
          deleted_at: string | null
          id: string
          position: number
          rule_id: string
          tenant_id: string
        }
        Insert: {
          action_type: string
          config?: Json
          created_at?: string
          delay_seconds?: number
          deleted_at?: string | null
          id?: string
          position?: number
          rule_id: string
          tenant_id: string
        }
        Update: {
          action_type?: string
          config?: Json
          created_at?: string
          delay_seconds?: number
          deleted_at?: string | null
          id?: string
          position?: number
          rule_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_actions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          actions_run: number
          conversation_id: string | null
          created_at: string
          deleted_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          input: Json
          matched: boolean
          output: Json
          rule_id: string | null
          status: string
          tenant_id: string
          trigger_event: string | null
        }
        Insert: {
          actions_run?: number
          conversation_id?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json
          matched?: boolean
          output?: Json
          rule_id?: string | null
          status?: string
          tenant_id: string
          trigger_event?: string | null
        }
        Update: {
          actions_run?: number
          conversation_id?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json
          matched?: boolean
          output?: Json
          rule_id?: string | null
          status?: string
          tenant_id?: string
          trigger_event?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          conditions: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_enabled: boolean
          last_run_at: string | null
          match_mode: string
          name: string
          priority: number
          run_count: number
          stop_on_match: boolean
          tenant_id: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          conditions?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          match_mode?: string
          name: string
          priority?: number
          run_count?: number
          stop_on_match?: boolean
          tenant_id: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          conditions?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          match_mode?: string
          name?: string
          priority?: number
          run_count?: number
          stop_on_match?: boolean
          tenant_id?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_triggers: {
        Row: {
          channel: string | null
          config: Json
          created_at: string
          deleted_at: string | null
          event_type: string
          id: string
          position: number
          rule_id: string
          tenant_id: string
        }
        Insert: {
          channel?: string | null
          config?: Json
          created_at?: string
          deleted_at?: string | null
          event_type: string
          id?: string
          position?: number
          rule_id: string
          tenant_id: string
        }
        Update: {
          channel?: string | null
          config?: Json
          created_at?: string
          deleted_at?: string | null
          event_type?: string
          id?: string
          position?: number
          rule_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_triggers_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_triggers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_memory: {
        Row: {
          about: string | null
          company_name: string | null
          created_at: string
          deleted_at: string | null
          do_list: string[]
          dont_list: string[]
          id: string
          languages: string[]
          metadata: Json
          policy: string | null
          tenant_id: string
          tone: string | null
          updated_at: string
          voice: string | null
        }
        Insert: {
          about?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          do_list?: string[]
          dont_list?: string[]
          id?: string
          languages?: string[]
          metadata?: Json
          policy?: string | null
          tenant_id: string
          tone?: string | null
          updated_at?: string
          voice?: string | null
        }
        Update: {
          about?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          do_list?: string[]
          dont_list?: string[]
          id?: string
          languages?: string[]
          metadata?: Json
          policy?: string | null
          tenant_id?: string
          tone?: string | null
          updated_at?: string
          voice?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_memory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_memory_chunks: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          external_id: string | null
          id: string
          image_url: string | null
          source_id: string
          title: string | null
          url: string | null
          workspace_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          source_id: string
          title?: string | null
          url?: string | null
          workspace_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          source_id?: string
          title?: string | null
          url?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_memory_chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "brand_memory_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_memory_chunks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_memory_sources: {
        Row: {
          created_at: string
          deleted_at: string | null
          error: string | null
          fb_page_id: string | null
          id: string
          item_count: number
          kind: Database["public"]["Enums"]["brand_source_kind"]
          label: string
          last_synced_at: string | null
          status: Database["public"]["Enums"]["brand_source_status"]
          updated_at: string
          url: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          error?: string | null
          fb_page_id?: string | null
          id?: string
          item_count?: number
          kind: Database["public"]["Enums"]["brand_source_kind"]
          label: string
          last_synced_at?: string | null
          status?: Database["public"]["Enums"]["brand_source_status"]
          updated_at?: string
          url?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          error?: string | null
          fb_page_id?: string | null
          id?: string
          item_count?: number
          kind?: Database["public"]["Enums"]["brand_source_kind"]
          label?: string
          last_synced_at?: string | null
          status?: Database["public"]["Enums"]["brand_source_status"]
          updated_at?: string
          url?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_memory_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_settings: {
        Row: {
          brand_name: string
          created_at: string
          deleted_at: string | null
          id: string
          phone: string
          singleton: boolean
          updated_at: string
          webhook_base_url: string
          webhook_verify_token: string
          website: string
          workspace_id: string | null
        }
        Insert: {
          brand_name?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          phone?: string
          singleton?: boolean
          updated_at?: string
          webhook_base_url?: string
          webhook_verify_token?: string
          website?: string
          workspace_id?: string | null
        }
        Update: {
          brand_name?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          phone?: string
          singleton?: boolean
          updated_at?: string
          webhook_base_url?: string
          webhook_verify_token?: string
          website?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branding_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_webhooks: {
        Row: {
          app_secret: string | null
          callback_url: string
          channel: string
          channel_ref_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          last_delivery_at: string | null
          last_delivery_status: string | null
          last_error: string | null
          metadata: Json
          subscribed_events: string[]
          tenant_id: string
          updated_at: string
          verify_token: string
        }
        Insert: {
          app_secret?: string | null
          callback_url: string
          channel: string
          channel_ref_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          last_error?: string | null
          metadata?: Json
          subscribed_events?: string[]
          tenant_id: string
          updated_at?: string
          verify_token: string
        }
        Update: {
          app_secret?: string | null
          callback_url?: string
          channel?: string
          channel_ref_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          last_error?: string | null
          metadata?: Json
          subscribed_events?: string[]
          tenant_id?: string
          updated_at?: string
          verify_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          ai_provider_id: string | null
          company: string | null
          created_at: string
          credentials: Json
          deleted_at: string | null
          email: string | null
          expires_at: string | null
          fb_page_id: string | null
          id: string
          monthly_fee: number | null
          name: string
          notes: string | null
          phone: string | null
          services: string[]
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_provider_id?: string | null
          company?: string | null
          created_at?: string
          credentials?: Json
          deleted_at?: string | null
          email?: string | null
          expires_at?: string | null
          fb_page_id?: string | null
          id?: string
          monthly_fee?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          services?: string[]
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_provider_id?: string | null
          company?: string | null
          created_at?: string
          credentials?: Json
          deleted_at?: string | null
          email?: string | null
          expires_at?: string | null
          fb_page_id?: string | null
          id?: string
          monthly_fee?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          services?: string[]
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_ai_provider_id_fkey"
            columns: ["ai_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          channel: string
          channel_comment_id: string
          conversation_id: string | null
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          id: string
          is_from_page: boolean
          is_hidden: boolean
          metadata: Json
          page_id: string | null
          parent_comment_id: string | null
          post_id: string | null
          tenant_id: string
          text: string | null
        }
        Insert: {
          channel: string
          channel_comment_id: string
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          is_from_page?: boolean
          is_hidden?: boolean
          metadata?: Json
          page_id?: string | null
          parent_comment_id?: string | null
          post_id?: string | null
          tenant_id: string
          text?: string | null
        }
        Update: {
          channel?: string
          channel_comment_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          is_from_page?: boolean
          is_hidden?: boolean
          metadata?: Json
          page_id?: string | null
          parent_comment_id?: string | null
          post_id?: string | null
          tenant_id?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_assignments: {
        Row: {
          assigned_by: string | null
          assignee_user_id: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          role: string
          tenant_id: string
          unassigned_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          assignee_user_id: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          role?: string
          tenant_id: string
          unassigned_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          assignee_user_id?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          role?: string
          tenant_id?: string
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_assignments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_labels: {
        Row: {
          color: string | null
          conversation_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          label: string
          tenant_id: string
        }
        Insert: {
          color?: string | null
          conversation_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          label: string
          tenant_id: string
        }
        Update: {
          color?: string | null
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          label?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_labels_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_labels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ai_enabled: boolean | null
          channel: string
          channel_thread_id: string | null
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          metadata: Json
          priority: string
          snoozed_until: string | null
          status: string
          subject: string | null
          tenant_id: string
          unread_count: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          ai_enabled?: boolean | null
          channel: string
          channel_thread_id?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json
          priority?: string
          snoozed_until?: string | null
          status?: string
          subject?: string | null
          tenant_id: string
          unread_count?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          ai_enabled?: boolean | null
          channel?: string
          channel_thread_id?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json
          priority?: string
          snoozed_until?: string | null
          status?: string
          subject?: string | null
          tenant_id?: string
          unread_count?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          fb_user_id: string | null
          full_name: string | null
          id: string
          ig_user_id: string | null
          last_seen_at: string | null
          locale: string | null
          metadata: Json
          notes: string | null
          phone: string | null
          tags: string[]
          tenant_id: string
          timezone: string | null
          updated_at: string
          wa_phone: string | null
          workspace_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          fb_user_id?: string | null
          full_name?: string | null
          id?: string
          ig_user_id?: string | null
          last_seen_at?: string | null
          locale?: string | null
          metadata?: Json
          notes?: string | null
          phone?: string | null
          tags?: string[]
          tenant_id: string
          timezone?: string | null
          updated_at?: string
          wa_phone?: string | null
          workspace_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          fb_user_id?: string | null
          full_name?: string | null
          id?: string
          ig_user_id?: string | null
          last_seen_at?: string | null
          locale?: string | null
          metadata?: Json
          notes?: string | null
          phone?: string | null
          tags?: string[]
          tenant_id?: string
          timezone?: string | null
          updated_at?: string
          wa_phone?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_page_tokens: {
        Row: {
          access_token: string
          created_at: string
          deleted_at: string | null
          expires_at: string | null
          fb_page_id: string
          id: string
          is_active: boolean
          issued_at: string
          last_verified_at: string | null
          metadata: Json
          rotated_from: string | null
          scopes: string[]
          tenant_id: string
          token_type: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          fb_page_id: string
          id?: string
          is_active?: boolean
          issued_at?: string
          last_verified_at?: string | null
          metadata?: Json
          rotated_from?: string | null
          scopes?: string[]
          tenant_id: string
          token_type?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          fb_page_id?: string
          id?: string
          is_active?: boolean
          issued_at?: string
          last_verified_at?: string | null
          metadata?: Json
          rotated_from?: string | null
          scopes?: string[]
          tenant_id?: string
          token_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_page_tokens_fb_page_id_fkey"
            columns: ["fb_page_id"]
            isOneToOne: false
            referencedRelation: "fb_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_page_tokens_rotated_from_fkey"
            columns: ["rotated_from"]
            isOneToOne: false
            referencedRelation: "facebook_page_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_page_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_conversations: {
        Row: {
          ai_enabled: boolean | null
          created_at: string
          deleted_at: string | null
          fb_user_id: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          page_id: string
          post_id: string | null
          source: string
          unread_count: number
          updated_at: string
          user_avatar_url: string | null
          user_name: string | null
          workspace_id: string | null
        }
        Insert: {
          ai_enabled?: boolean | null
          created_at?: string
          deleted_at?: string | null
          fb_user_id: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          page_id: string
          post_id?: string | null
          source: string
          unread_count?: number
          updated_at?: string
          user_avatar_url?: string | null
          user_name?: string | null
          workspace_id?: string | null
        }
        Update: {
          ai_enabled?: boolean | null
          created_at?: string
          deleted_at?: string | null
          fb_user_id?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          page_id?: string
          post_id?: string | null
          source?: string
          unread_count?: number
          updated_at?: string
          user_avatar_url?: string | null
          user_name?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_messages: {
        Row: {
          ai_provider: string | null
          attachment_url: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          direction: string
          error: string | null
          fb_message_id: string | null
          id: string
          kind: string
          parent_comment_id: string | null
          sender: string
          text: string | null
          workspace_id: string | null
        }
        Insert: {
          ai_provider?: string | null
          attachment_url?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          direction: string
          error?: string | null
          fb_message_id?: string | null
          id?: string
          kind?: string
          parent_comment_id?: string | null
          sender: string
          text?: string | null
          workspace_id?: string | null
        }
        Update: {
          ai_provider?: string | null
          attachment_url?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          direction?: string
          error?: string | null
          fb_message_id?: string | null
          id?: string
          kind?: string
          parent_comment_id?: string | null
          sender?: string
          text?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "fb_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_pages: {
        Row: {
          access_token: string
          app_secret: string | null
          created_at: string
          deleted_at: string | null
          id: string
          last_subscribed_at: string | null
          page_id: string
          page_name: string
          subscribed: boolean
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          access_token: string
          app_secret?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_subscribed_at?: string | null
          page_id: string
          page_name: string
          subscribed?: boolean
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          access_token?: string
          app_secret?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_subscribed_at?: string | null
          page_id?: string
          page_name?: string
          subscribed?: boolean
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_pages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_settings: {
        Row: {
          ai_global_enabled: boolean
          ai_system_prompt: string
          bad_words: string[]
          comment_max_lines: number
          created_at: string
          deleted_at: string | null
          humanize_enabled: boolean
          messenger_length: string
          moderation_action: string
          moderation_block_duration: string
          moderation_block_threshold: number
          moderation_enabled: boolean
          moderation_match_threshold: number
          reply_delay_ms: number
          row_id: string
          strip_markdown: boolean
          updated_at: string
          whitelist_words: string[]
          workspace_id: string | null
        }
        Insert: {
          ai_global_enabled?: boolean
          ai_system_prompt?: string
          bad_words?: string[]
          comment_max_lines?: number
          created_at?: string
          deleted_at?: string | null
          humanize_enabled?: boolean
          messenger_length?: string
          moderation_action?: string
          moderation_block_duration?: string
          moderation_block_threshold?: number
          moderation_enabled?: boolean
          moderation_match_threshold?: number
          reply_delay_ms?: number
          row_id?: string
          strip_markdown?: boolean
          updated_at?: string
          whitelist_words?: string[]
          workspace_id?: string | null
        }
        Update: {
          ai_global_enabled?: boolean
          ai_system_prompt?: string
          bad_words?: string[]
          comment_max_lines?: number
          created_at?: string
          deleted_at?: string | null
          humanize_enabled?: boolean
          messenger_length?: string
          moderation_action?: string
          moderation_block_duration?: string
          moderation_block_threshold?: number
          moderation_enabled?: boolean
          moderation_match_threshold?: number
          reply_delay_ms?: number
          row_id?: string
          strip_markdown?: boolean
          updated_at?: string
          whitelist_words?: string[]
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_user_offenses: {
        Row: {
          block_expires_at: string | null
          blocked_at: string | null
          created_at: string
          deleted_at: string | null
          fb_user_id: string
          id: string
          last_offense_at: string | null
          offense_count: number
          page_id: string
          updated_at: string
          user_name: string | null
          workspace_id: string | null
        }
        Insert: {
          block_expires_at?: string | null
          blocked_at?: string | null
          created_at?: string
          deleted_at?: string | null
          fb_user_id: string
          id?: string
          last_offense_at?: string | null
          offense_count?: number
          page_id: string
          updated_at?: string
          user_name?: string | null
          workspace_id?: string | null
        }
        Update: {
          block_expires_at?: string | null
          blocked_at?: string | null
          created_at?: string
          deleted_at?: string | null
          fb_user_id?: string
          id?: string
          last_offense_at?: string | null
          offense_count?: number
          page_id?: string
          updated_at?: string
          user_name?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_user_offenses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          name: string
          rollout_percent: number
          tenant_overrides: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          name: string
          rollout_percent?: number
          tenant_overrides?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          name?: string
          rollout_percent?: number
          tenant_overrides?: Json
          updated_at?: string
        }
        Relationships: []
      }
      internal_notes: {
        Row: {
          author_user_id: string | null
          body: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          mentions: string[]
          metadata: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          author_user_id?: string | null
          body: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          mentions?: string[]
          metadata?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          mentions?: string[]
          metadata?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount_cents: number
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          invoice_id: string
          metadata: Json
          metric: string | null
          period_end: string | null
          period_start: string | null
          quantity: number
          unit_amount_cents: number
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          invoice_id: string
          metadata?: Json
          metric?: string | null
          period_end?: string | null
          period_start?: string | null
          quantity?: number
          unit_amount_cents?: number
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          metadata?: Json
          metric?: string | null
          period_end?: string | null
          period_start?: string | null
          quantity?: number
          unit_amount_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid_cents: number
          created_at: string
          currency: string
          deleted_at: string | null
          due_at: string | null
          id: string
          invoice_no: string
          metadata: Json
          notes: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          provider: string | null
          provider_invoice_id: string | null
          status: string
          subscription_id: string | null
          subtotal_cents: number
          tax_cents: number
          tenant_id: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          amount_paid_cents?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          due_at?: string | null
          id?: string
          invoice_no: string
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          provider?: string | null
          provider_invoice_id?: string | null
          status?: string
          subscription_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          tenant_id: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          amount_paid_cents?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          due_at?: string | null
          id?: string
          invoice_no?: string
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          provider?: string | null
          provider_invoice_id?: string | null
          status?: string
          subscription_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          tenant_id?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_bases: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          kind: string
          metadata: Json
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          metadata?: Json
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          metadata?: Json
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_bases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          error: string | null
          id: string
          knowledge_base_id: string
          metadata: Json
          mime_type: string | null
          size_bytes: number | null
          source_type: string
          source_url: string | null
          status: string
          storage_path: string | null
          tenant_id: string
          title: string
          token_count: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          error?: string | null
          id?: string
          knowledge_base_id: string
          metadata?: Json
          mime_type?: string | null
          size_bytes?: number | null
          source_type?: string
          source_url?: string | null
          status?: string
          storage_path?: string | null
          tenant_id: string
          title: string
          token_count?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          error?: string | null
          id?: string
          knowledge_base_id?: string
          metadata?: Json
          mime_type?: string | null
          size_bytes?: number | null
          source_type?: string
          source_url?: string | null
          status?: string
          storage_path?: string | null
          tenant_id?: string
          title?: string
          token_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          channel_message_id: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          direction: string
          error: string | null
          id: string
          metadata: Json
          reply_to_id: string | null
          sender: string
          sender_user_id: string | null
          status: string
          tenant_id: string
          text: string | null
        }
        Insert: {
          attachments?: Json
          channel_message_id?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          direction: string
          error?: string | null
          id?: string
          metadata?: Json
          reply_to_id?: string | null
          sender: string
          sender_user_id?: string | null
          status?: string
          tenant_id: string
          text?: string | null
        }
        Update: {
          attachments?: Json
          channel_message_id?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          direction?: string
          error?: string | null
          id?: string
          metadata?: Json
          reply_to_id?: string | null
          sender?: string
          sender_user_id?: string | null
          status?: string
          tenant_id?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_read: boolean
          metadata: Json
          read_at: string | null
          severity: string
          tenant_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json
          read_at?: string | null
          severity?: string
          tenant_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json
          read_at?: string | null
          severity?: string
          tenant_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string | null
          subtotal: number
          unit_price: number
          variant_id: string | null
          variant_name: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sku?: string | null
          subtotal?: number
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string | null
          subtotal?: number
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          area: string
          created_at: string
          customer_name: string
          deleted_at: string | null
          district: string
          id: string
          note: string | null
          order_no: string | null
          phone: string
          product_id: string | null
          product_name: string
          quantity: number
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          total: number
          unit_price: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          address: string
          area?: string
          created_at?: string
          customer_name: string
          deleted_at?: string | null
          district?: string
          id?: string
          note?: string | null
          order_no?: string | null
          phone: string
          product_id?: string | null
          product_name: string
          quantity?: number
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          unit_price?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          address?: string
          area?: string
          created_at?: string
          customer_name?: string
          deleted_at?: string | null
          district?: string
          id?: string
          note?: string | null
          order_no?: string | null
          phone?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          unit_price?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          invoice_id: string | null
          payer_reference: string | null
          processed_at: string | null
          provider: string
          provider_txn_id: string | null
          raw_payload: Json
          status: string
          subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          invoice_id?: string | null
          payer_reference?: string | null
          processed_at?: string | null
          provider: string
          provider_txn_id?: string | null
          raw_payload?: Json
          status?: string
          subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          invoice_id?: string | null
          payer_reference?: string | null
          processed_at?: string | null
          provider?: string
          provider_txn_id?: string | null
          raw_payload?: Json
          status?: string
          subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          order_id: string
          paid_at: string | null
          payer_name: string | null
          payer_phone: string | null
          provider: string
          provider_txn_id: string | null
          raw_payload: Json
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          order_id: string
          paid_at?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          provider: string
          provider_txn_id?: string | null
          raw_payload?: Json
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          order_id?: string
          paid_at?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          provider?: string
          provider_txn_id?: string | null
          raw_payload?: Json
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          currency: string
          deleted_at: string | null
          features: Json
          id: string
          is_public: boolean
          limits: Json
          monthly_price_cents: number
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          features?: Json
          id?: string
          is_public?: boolean
          limits?: Json
          monthly_price_cents?: number
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          features?: Json
          id?: string
          is_public?: boolean
          limits?: Json
          monthly_price_cents?: number
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_primary: boolean
          position: number
          product_id: string
          url: string
          variant_id: string | null
          workspace_id: string | null
        }
        Insert: {
          alt?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          position?: number
          product_id: string
          url: string
          variant_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          position?: number
          product_id?: string
          url?: string
          variant_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_at_price: number | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          options: Json
          position: number
          price: number
          product_id: string
          sku: string | null
          stock: number
          updated_at: string
          weight_grams: number | null
          workspace_id: string | null
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          options?: Json
          position?: number
          price?: number
          product_id: string
          sku?: string | null
          stock?: number
          updated_at?: string
          weight_grams?: number | null
          workspace_id?: string | null
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          options?: Json
          position?: number
          price?: number
          product_id?: string
          sku?: string | null
          stock?: number
          updated_at?: string
          weight_grams?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string
          features: string
          gallery: string[]
          id: string
          name: string
          price: number
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          features?: string
          gallery?: string[]
          id?: string
          name: string
          price?: number
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          features?: string
          gallery?: string[]
          id?: string
          name?: string
          price?: number
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompt_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string | null
          updated_at: string
          variables: Json
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id?: string | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string | null
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          language: Database["public"]["Enums"]["prompt_lang"]
          name: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          language?: Database["public"]["Enums"]["prompt_lang"]
          name: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          language?: Database["public"]["Enums"]["prompt_lang"]
          name?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_secret: boolean
          key: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_secret?: boolean
          key: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_secret?: boolean
          key?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          deleted_at: string | null
          id: string
          plan_id: string
          provider: string | null
          provider_subscription_id: string | null
          status: string
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          deleted_at?: string | null
          id?: string
          plan_id: string
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          deleted_at?: string | null
          id?: string
          plan_id?: string
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assignee_id: string | null
          created_at: string
          id: string
          last_activity_at: string
          priority: string
          requester_id: string | null
          status: string
          subject: string
          tenant_id: string | null
          ticket_no: string | null
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          priority?: string
          requester_id?: string | null
          status?: string
          subject: string
          tenant_id?: string | null
          ticket_no?: string | null
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          priority?: string
          requester_id?: string | null
          status?: string
          subject?: string
          tenant_id?: string | null
          ticket_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          context: Json
          created_at: string
          deleted_at: string | null
          id: string
          level: string
          message: string
          request_id: string | null
          source: string
          stack: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          level: string
          message: string
          request_id?: string | null
          source: string
          stack?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          level?: string
          message?: string
          request_id?: string | null
          source?: string
          stack?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          deleted_at: string | null
          role: Database["public"]["Enums"]["tenant_member_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          role?: Database["public"]["Enums"]["tenant_member_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          role?: Database["public"]["Enums"]["tenant_member_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          billing_email: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          owner_id: string
          slug: string | null
          status: string
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          owner_id: string
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          count: number
          deleted_at: string | null
          metric: string
          period_month: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          count?: number
          deleted_at?: string | null
          metric: string
          period_month: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          count?: number
          deleted_at?: string | null
          metric?: string
          period_month?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wa_conversations: {
        Row: {
          ai_enabled: boolean | null
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          phone_number_id: string
          tenant_id: string | null
          unread_count: number
          updated_at: string
          user_name: string | null
          wa_user_id: string
        }
        Insert: {
          ai_enabled?: boolean | null
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          phone_number_id: string
          tenant_id?: string | null
          unread_count?: number
          updated_at?: string
          user_name?: string | null
          wa_user_id: string
        }
        Update: {
          ai_enabled?: boolean | null
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          phone_number_id?: string
          tenant_id?: string | null
          unread_count?: number
          updated_at?: string
          user_name?: string | null
          wa_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_messages: {
        Row: {
          ai_provider: string | null
          conversation_id: string
          created_at: string
          direction: string
          error: string | null
          id: string
          sender: string
          tenant_id: string | null
          text: string | null
          wa_message_id: string | null
        }
        Insert: {
          ai_provider?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          error?: string | null
          id?: string
          sender: string
          tenant_id?: string | null
          text?: string | null
          wa_message_id?: string | null
        }
        Update: {
          ai_provider?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          sender?: string
          tenant_id?: string | null
          text?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          attempt_count: number
          created_at: string
          deleted_at: string | null
          duration_ms: number | null
          error: string | null
          event_type: string | null
          external_id: string | null
          headers: Json
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          signature_ok: boolean | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          error?: string | null
          event_type?: string | null
          external_id?: string | null
          headers?: Json
          id?: string
          payload?: Json
          processed_at?: string | null
          provider: string
          signature_ok?: boolean | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          error?: string | null
          event_type?: string | null
          external_id?: string | null
          headers?: Json
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          signature_ok?: boolean | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_accounts: {
        Row: {
          access_token: string | null
          business_id: string | null
          created_at: string
          currency: string | null
          deleted_at: string | null
          id: string
          is_connected: boolean
          metadata: Json
          name: string
          status: string
          tenant_id: string
          timezone: string | null
          updated_at: string
          waba_id: string
        }
        Insert: {
          access_token?: string | null
          business_id?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          id?: string
          is_connected?: boolean
          metadata?: Json
          name: string
          status?: string
          tenant_id: string
          timezone?: string | null
          updated_at?: string
          waba_id: string
        }
        Update: {
          access_token?: string | null
          business_id?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          id?: string
          is_connected?: boolean
          metadata?: Json
          name?: string
          status?: string
          tenant_id?: string
          timezone?: string | null
          updated_at?: string
          waba_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_phone_numbers: {
        Row: {
          code_verification_status: string | null
          created_at: string
          deleted_at: string | null
          display_phone_number: string
          id: string
          is_default: boolean
          messaging_limit_tier: string | null
          metadata: Json
          phone_number_id: string
          quality_rating: string | null
          tenant_id: string
          updated_at: string
          verified_name: string | null
          whatsapp_account_id: string
        }
        Insert: {
          code_verification_status?: string | null
          created_at?: string
          deleted_at?: string | null
          display_phone_number: string
          id?: string
          is_default?: boolean
          messaging_limit_tier?: string | null
          metadata?: Json
          phone_number_id: string
          quality_rating?: string | null
          tenant_id: string
          updated_at?: string
          verified_name?: string | null
          whatsapp_account_id: string
        }
        Update: {
          code_verification_status?: string | null
          created_at?: string
          deleted_at?: string | null
          display_phone_number?: string
          id?: string
          is_default?: boolean
          messaging_limit_tier?: string | null
          metadata?: Json
          phone_number_id?: string
          quality_rating?: string | null
          tenant_id?: string
          updated_at?: string
          verified_name?: string | null
          whatsapp_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_phone_numbers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_phone_numbers_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          role: Database["public"]["Enums"]["workspace_member_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["workspace_member_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["workspace_member_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          owner_id: string
          slug: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          owner_id: string
          slug?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          slug?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_ai_usage: {
        Args: {
          _cost_cents: number
          _in: number
          _model: string
          _out: number
          _provider: string
          _tenant: string
        }
        Returns: undefined
      }
      bump_usage: {
        Args: { _amount?: number; _metric: string; _tenant: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["tenant_member_role"]
          _t: string
          _u: string
        }
        Returns: boolean
      }
      has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["workspace_member_role"]
          _uid: string
          _ws: string
        }
        Returns: boolean
      }
      is_tenant_member: { Args: { _t: string; _u: string }; Returns: boolean }
      is_workspace_member: {
        Args: { _uid: string; _ws: string }
        Returns: boolean
      }
      resolve_default_workspace_id: { Args: never; Returns: string }
    }
    Enums: {
      ai_message_type: "text" | "image" | "voice_tts" | "voice_stt" | "mixed"
      ai_provider_category: "text" | "image" | "voice_tts" | "voice_stt"
      ai_provider_status:
        | "unknown"
        | "online"
        | "degraded"
        | "offline"
        | "error"
      ai_request_status:
        | "success"
        | "timeout"
        | "rate_limit"
        | "api_error"
        | "invalid"
        | "server_down"
      app_role: "admin" | "user" | "super_admin"
      brand_source_kind: "fb_page" | "website" | "text" | "pdf"
      brand_source_status: "idle" | "syncing" | "ready" | "error"
      order_source:
        | "facebook_messenger"
        | "whatsapp"
        | "website_direct"
        | "ai_chatbot"
        | "facebook_ads"
        | "google_ads"
        | "other"
      order_status:
        | "pending_verification"
        | "call_pending"
        | "confirmed"
        | "processing"
        | "packed"
        | "shipped"
        | "delivered"
        | "cancelled"
      product_status: "active" | "draft"
      prompt_lang: "en" | "bn" | "both"
      tenant_member_role: "owner" | "admin" | "billing" | "member"
      workspace_member_role: "owner" | "admin" | "editor" | "viewer"
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
      ai_message_type: ["text", "image", "voice_tts", "voice_stt", "mixed"],
      ai_provider_category: ["text", "image", "voice_tts", "voice_stt"],
      ai_provider_status: ["unknown", "online", "degraded", "offline", "error"],
      ai_request_status: [
        "success",
        "timeout",
        "rate_limit",
        "api_error",
        "invalid",
        "server_down",
      ],
      app_role: ["admin", "user", "super_admin"],
      brand_source_kind: ["fb_page", "website", "text", "pdf"],
      brand_source_status: ["idle", "syncing", "ready", "error"],
      order_source: [
        "facebook_messenger",
        "whatsapp",
        "website_direct",
        "ai_chatbot",
        "facebook_ads",
        "google_ads",
        "other",
      ],
      order_status: [
        "pending_verification",
        "call_pending",
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      product_status: ["active", "draft"],
      prompt_lang: ["en", "bn", "both"],
      tenant_member_role: ["owner", "admin", "billing", "member"],
      workspace_member_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
