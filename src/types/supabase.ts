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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      event_staff_assignments: {
        Row: {
          id: string
          event_id: string
          staff_id: string
          role: string
          pay_rate: number
          pay_type: 'hourly' | 'flat'
          total_pay: number | null
          status: 'pending' | 'confirmed' | 'declined' | 'completed'
          is_paid: boolean
          paid_at: string | null
          payroll_run_id: string | null
          payment_reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          staff_id: string
          role: string
          pay_rate: number
          pay_type: 'hourly' | 'flat'
          total_pay?: number | null
          status?: 'pending' | 'confirmed' | 'declined' | 'completed'
          is_paid?: boolean
          paid_at?: string | null
          payroll_run_id?: string | null
          payment_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          staff_id?: string
          role?: string
          pay_rate?: number
          pay_type?: 'hourly' | 'flat'
          total_pay?: number | null
          status?: 'pending' | 'confirmed' | 'declined' | 'completed'
          is_paid?: boolean
          paid_at?: string | null
          payroll_run_id?: string | null
          payment_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_staff_assignments_staff_id_fkey_users"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_assignments_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          }
        ]
      }
      payroll_runs: {
        Row: {
          id: string
          period_start: string
          period_end: string
          payment_date: string
          total_amount: number
          status: 'draft' | 'processed' | 'paid'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          period_start: string
          period_end: string
          payment_date: string
          total_amount: number
          status?: 'draft' | 'processed' | 'paid'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          period_start?: string
          period_end?: string
          payment_date?: string
          total_amount?: number
          status?: 'draft' | 'processed' | 'paid'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_profiles: {
        Row: {
          user_id: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          address: string | null
          date_of_birth: string | null
          id_type: string | null
          id_number: string | null
          id_expiration_date: string | null
          id_front_url: string | null
          id_back_url: string | null
          is_driver: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          address?: string | null
          date_of_birth?: string | null
          id_type?: string | null
          id_number?: string | null
          id_expiration_date?: string | null
          id_front_url?: string | null
          id_back_url?: string | null
          is_driver?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          address?: string | null
          date_of_birth?: string | null
          id_type?: string | null
          id_number?: string | null
          id_expiration_date?: string | null
          id_front_url?: string | null
          id_back_url?: string | null
          is_driver?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
        staff_pay_rates: {
          Row: {
            id: string
            position_key: string
            position_label: string
            rate_type: 'flat' | 'per_direction' | 'percent_revenue' | 'tiered_hours' | 'tiered_quantity'
            config: Json
            notes: string | null
            created_at: string | null
            updated_at: string | null
          }
          Insert: {
            id?: string
            position_key: string
            position_label: string
            rate_type: 'flat' | 'per_direction' | 'percent_revenue' | 'tiered_hours' | 'tiered_quantity'
            config: Json
            notes?: string | null
            created_at?: string | null
            updated_at?: string | null
          }
          Update: {
            id?: string
            position_key?: string
            position_label?: string
            rate_type?: 'flat' | 'per_direction' | 'percent_revenue' | 'tiered_hours' | 'tiered_quantity'
            config?: Json
            notes?: string | null
            created_at?: string | null
            updated_at?: string | null
          }
          Relationships: []
        }
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          created_by: string
          details: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          created_by: string
          details?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
        }
        Update: {
          action?: string
          created_at?: string | null
          created_by?: string
          details?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          status: string
          triggered_at: string
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          status: string
          triggered_at: string
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          status?: string
          triggered_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_settings: {
        Row: {
          accent_color: string
          company_name: string
          created_at: string | null
          id: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          theme_mode: Database["public"]["Enums"]["theme_mode"]
        }
        Insert: {
          accent_color: string
          company_name: string
          created_at?: string | null
          id?: string
          logo_url?: string | null
          primary_color: string
          secondary_color: string
          theme_mode: Database["public"]["Enums"]["theme_mode"]
        }
        Update: {
          accent_color?: string
          company_name?: string
          created_at?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          theme_mode?: Database["public"]["Enums"]["theme_mode"]
        }
        Relationships: []
      }
      calendar_settings: {
        Row: {
          created_at: string | null
          id: string
          timezone: string
          week_start_day: string
          working_hours: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          timezone: string
          week_start_day: string
          working_hours?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          timezone?: string
          week_start_day?: string
          working_hours?: Json | null
        }
        Relationships: []
      }
      client_files: {
        Row: {
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          size: number
          type: string
          uploaded_by: string
          url: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          size: number
          type: string
          uploaded_by: string
          url: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          size?: number
          type?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          auth_user_id: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          email: string
          facebook: string | null
          first_name: string
          id: string
          instagram: string | null
          last_name: string
          lead_source: Database["public"]["Enums"]["lead_source"] | null
          notes: string | null
          phone: string | null
          portal_access: boolean | null
          portal_last_login: string | null
          portal_settings: Json | null
          role: Database["public"]["Enums"]["client_role"] | null
          state: string | null
          type: Database["public"]["Enums"]["client_type"] | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          facebook?: string | null
          first_name: string
          id?: string
          instagram?: string | null
          last_name: string
          lead_source?: Database["public"]["Enums"]["lead_source"] | null
          notes?: string | null
          phone?: string | null
          portal_access?: boolean | null
          portal_last_login?: string | null
          portal_settings?: Json | null
          role?: Database["public"]["Enums"]["client_role"] | null
          state?: string | null
          type?: Database["public"]["Enums"]["client_type"] | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          facebook?: string | null
          first_name?: string
          id?: string
          instagram?: string | null
          last_name?: string
          lead_source?: Database["public"]["Enums"]["lead_source"] | null
          notes?: string | null
          phone?: string | null
          portal_access?: boolean | null
          portal_last_login?: string | null
          portal_settings?: Json | null
          role?: Database["public"]["Enums"]["client_role"] | null
          state?: string | null
          type?: Database["public"]["Enums"]["client_type"] | null
          zip_code?: string | null
        }
        Relationships: []
      }
      contact_forms: {
        Row: {
          created_at: string | null
          fields: Json
          id: string
          name: string
          settings: Json | null
        }
        Insert: {
          created_at?: string | null
          fields: Json
          id?: string
          name: string
          settings?: Json | null
        }
        Update: {
          created_at?: string | null
          fields?: Json
          id?: string
          name?: string
          settings?: Json | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          client_id: string
          content: string
          created_at: string | null
          event_id: string
          id: string
          signed_at: string | null
          status: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string | null
          event_id: string
          id?: string
          signed_at?: string | null
          status: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string | null
          event_id?: string
          id?: string
          signed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          created_at: string | null
          id: string
          notifications: Json
          sender_identity: Json
          signature: string | null
          sms_config: Json | null
          smtp_config: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          notifications: Json
          sender_identity: Json
          signature?: string | null
          sms_config?: Json | null
          smtp_config: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          notifications?: Json
          sender_identity?: Json
          signature?: string | null
          sms_config?: Json | null
          smtp_config?: Json
        }
        Relationships: []
      }
      event_timeline_items: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string
          icon: Database["public"]["Enums"]["timeline_icon"]
          id: string
          is_anchor: boolean | null
          offset_minutes: number
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id: string
          icon: Database["public"]["Enums"]["timeline_icon"]
          id?: string
          is_anchor?: boolean | null
          offset_minutes: number
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string
          icon?: Database["public"]["Enums"]["timeline_icon"]
          id?: string
          is_anchor?: boolean | null
          offset_minutes?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_timeline_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          budget: number | null
          client_id: string
          secondary_client_id: string | null
          created_at: string | null
          date: string
          venue_name: string | null
          guest_count: number | null
          id: string
          name: string
          notes: string | null
          planner_id: string | null
          status: Database["public"]["Enums"]["event_status"]
          venue_id: string | null
        }
        Insert: {
          budget?: number | null
          client_id: string
          secondary_client_id?: string | null
          created_at?: string | null
          date: string
          venue_name?: string | null
          guest_count?: number | null
          id?: string
          name: string
          notes?: string | null
          planner_id?: string | null
          status: Database["public"]["Enums"]["event_status"]
          venue_id?: string | null
        }
        Update: {
          budget?: number | null
          client_id?: string
          secondary_client_id?: string | null
          created_at?: string | null
          date?: string
          venue_name?: string | null
          guest_count?: number | null
          id?: string
          name?: string
          notes?: string | null
          planner_id?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_planner_id_fkey"
            columns: ["planner_id"]
            isOneToOne: false
            referencedRelation: "planners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_settings: {
        Row: {
          created_at: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          invoice_sequence_prefix: string | null
          invoice_sequence_start: number | null
          quote_sequence_prefix: string | null
          quote_sequence_start: number | null
          tax_rate: number
        }
        Insert: {
          created_at?: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          id?: string
          invoice_sequence_prefix?: string | null
          invoice_sequence_start?: number | null
          tax_rate: number
        }
        Update: {
          created_at?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          invoice_sequence_prefix?: string | null
          invoice_sequence_start?: number | null
          tax_rate?: number
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          invoice_id: string
          quantity: number | null
          total: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id: string
          quantity?: number | null
          total?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string
          quantity?: number | null
          total?: number | null
          unit_price?: number | null
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
          client_id: string
          created_at: string | null
          due_date: string
          event_id: string
          id: string
          invoice_number: string
          items: Json
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount: number
          type: Database["public"]["Enums"]["invoice_type"]
        }
        Insert: {
          client_id: string
          created_at?: string | null
          due_date: string
          event_id: string
          id?: string
          invoice_number: string
          items: Json
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount: number
          type: Database["public"]["Enums"]["invoice_type"]
        }
        Update: {
          client_id?: string
          created_at?: string | null
          due_date?: string
          event_id?: string
          id?: string
          invoice_number?: string
          items?: Json
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          type?: Database["public"]["Enums"]["invoice_type"]
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          email: string
          event_date: string | null
          event_type: string | null
          first_name: string
          guest_count: number | null
          id: string
          last_name: string
          lead_source: Database["public"]["Enums"]["lead_source"] | null
          notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["client_role"] | null
          services_interested: string[] | null
          status: Database["public"]["Enums"]["lead_status"]
          venue_name: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          event_date?: string | null
          event_type?: string | null
          first_name: string
          guest_count?: number | null
          id?: string
          last_name: string
          lead_source?: Database["public"]["Enums"]["lead_source"] | null
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["client_role"] | null
          services_interested?: string[] | null
          status: Database["public"]["Enums"]["lead_status"]
          venue_name?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          event_date?: string | null
          event_type?: string | null
          first_name?: string
          guest_count?: number | null
          id?: string
          last_name?: string
          lead_source?: Database["public"]["Enums"]["lead_source"] | null
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["client_role"] | null
          services_interested?: string[] | null
          status?: Database["public"]["Enums"]["lead_status"]
          venue_name?: string | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          is_active: boolean | null
          name: string
          type: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          type: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      payment_schedules: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          milestones: Json
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          milestones: Json
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          milestones?: Json
          name?: string
        }
        Relationships: []
      }
      planners: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          facebook: string | null
          first_name: string
          id: string
          instagram: string | null
          last_name: string
          phone: string | null
          website: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          facebook?: string | null
          first_name: string
          id?: string
          instagram?: string | null
          last_name: string
          phone?: string | null
          website?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          facebook?: string | null
          first_name?: string
          id?: string
          instagram?: string | null
          last_name?: string
          phone?: string | null
          website?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          cost: number
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price_direct: number
          price_pv: number
          unit: string | null
        }
        Insert: {
          category: string
          cost: number
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price_direct: number
          price_pv: number
          unit?: string | null
        }
        Update: {
          category?: string
          cost?: number
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price_direct?: number
          price_pv?: number
          unit?: string | null
        }
        Relationships: []
      }
      questionnaires: {
        Row: {
          answers: Json | null
          client_id: string
          created_at: string | null
          event_id: string
          id: string
          status: string
          title: string
        }
        Insert: {
          answers?: Json | null
          client_id: string
          created_at?: string | null
          event_id: string
          id?: string
          status: string
          title: string
        }
        Update: {
          answers?: Json | null
          client_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaires_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string
          contract_template_id: string | null
          created_at: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          event_id: string
          exchange_rate: number
          id: string
          items: Json
          taxes?: Json
          parent_quote_id: string | null
          payment_plan_template_id: string | null
          questionnaire_template_id: string | null
          status: Database["public"]["Enums"]["quote_status"]
          total_amount: number
          valid_until: string
          version: number
        }
        Insert: {
          client_id: string
          contract_template_id?: string | null
          created_at?: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          event_id: string
          exchange_rate: number
          id?: string
          items: Json
          taxes?: Json
          parent_quote_id?: string | null
          payment_plan_template_id?: string | null
          questionnaire_template_id?: string | null
          status: Database["public"]["Enums"]["quote_status"]
          total_amount: number
          valid_until: string
          version?: number
        }
        Update: {
          client_id?: string
          contract_template_id?: string | null
          created_at?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          event_id?: string
          exchange_rate?: number
          id?: string
          items?: Json
          taxes?: Json
          parent_quote_id?: string | null
          payment_plan_template_id?: string | null
          questionnaire_template_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          total_amount?: number
          valid_until?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_contract_template_id_fkey"
            columns: ["contract_template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_questionnaire_template_id_fkey"
            columns: ["questionnaire_template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          client_id: string
          comment: string
          created_at: string | null
          event_id: string
          id: string
          rating: number
          status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          client_id: string
          comment: string
          created_at?: string | null
          event_id: string
          id?: string
          rating: number
          status: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          client_id?: string
          comment?: string
          created_at?: string | null
          event_id?: string
          id?: string
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          field_security: Json
          id: string
          is_system: boolean
          name: string
          permissions: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          field_security: Json
          id?: string
          is_system: boolean
          name: string
          permissions: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          field_security?: Json
          id?: string
          is_system?: boolean
          name?: string
          permissions?: Json
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          client_id: string | null
          venue_id: string | null
          planner_id: string | null
          completed_at: string | null
          completed_by: string | null
          assigned_to: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Insert: {
          client_id?: string | null
          venue_id?: string | null
          planner_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Update: {
          client_id?: string | null
          venue_id?: string | null
          planner_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_planner_id_fkey"
            columns: ["planner_id"]
            isOneToOne: false
            referencedRelation: "planners"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_modified: string | null
          name: string
          questions: Json | null
          subject: string | null
          type: Database["public"]["Enums"]["template_type"]
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_modified?: string | null
          name: string
          questions?: Json | null
          subject?: string | null
          type: Database["public"]["Enums"]["template_type"]
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_modified?: string | null
          name?: string
          questions?: Json | null
          subject?: string | null
          type?: Database["public"]["Enums"]["template_type"]
        }
        Relationships: []
      }
      tokens: {
        Row: {
          category: string
          created_at: string | null
          default_value: string | null
          id: string
          key: string
          label: string
        }
        Insert: {
          category: string
          created_at?: string | null
          default_value?: string | null
          id?: string
          key: string
          label: string
        }
        Update: {
          category?: string
          created_at?: string | null
          default_value?: string | null
          id?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device: string
          id: string
          ip_address: string
          last_active: string
          location: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device: string
          id?: string
          ip_address: string
          last_active: string
          location?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device?: string
          id?: string
          ip_address?: string
          last_active?: string
          location?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          name: string
          role: string[]
          security_config: Json | null
          status: Database["public"]["Enums"]["user_status"]
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          last_login?: string | null
          name: string
          role: string[]
          security_config?: Json | null
          status: Database["public"]["Enums"]["user_status"]
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          name?: string
          role?: string[]
          security_config?: Json | null
          status?: Database["public"]["Enums"]["user_status"]
        }
        Relationships: []
      }
      venue_contacts: {
        Row: {
          created_at: string | null
          email: string
          first_name: string
          id: string
          is_primary: boolean | null
          last_name: string
          phone: string | null
          role: string
          venue_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          is_primary?: boolean | null
          last_name: string
          phone?: string | null
          role: string
          venue_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          is_primary?: boolean | null
          last_name?: string
          phone?: string | null
          role?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_contacts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          venue_area: Database["public"]["Enums"]["venue_area"] | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          venue_area?: Database["public"]["Enums"]["venue_area"] | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          venue_area?: Database["public"]["Enums"]["venue_area"] | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      workflows: {
        Row: {
          actions: Json
          active: boolean
          conditions: Json
          created_at: string | null
          id: string
          name: string
          trigger: string
        }
        Insert: {
          actions: Json
          active: boolean
          conditions?: Json
          created_at?: string | null
          id?: string
          name: string
          trigger: string
        }
        Update: {
          actions?: Json
          active?: boolean
          conditions?: Json
          created_at?: string | null
          id?: string
          name?: string
          trigger?: string
        }
        Relationships: []
      }
      social_integrations: {
        Row: {
          id: string
          platform: 'facebook' | 'instagram'
          page_id: string
          page_name: string | null
          access_token: string
          webhook_secret: string | null
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          platform: 'facebook' | 'instagram'
          page_id: string
          page_name?: string | null
          access_token: string
          webhook_secret?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          platform?: 'facebook' | 'instagram'
          page_id?: string
          page_name?: string | null
          access_token?: string
          webhook_secret?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
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
      client_role:
        | "Bride"
        | "Groom"
        | "Parent"
        | "External Planner"
        | "Hotel/Resort"
        | "Private Venue"
      client_type: "Direct" | "Preferred Vendor"
      currency_code: "MXN" | "USD" | "GBP" | "EUR" | "CAD"
      entity_type: "client" | "event" | "venue" | "planner" | "lead"
      event_status: "inquiry" | "confirmed" | "completed" | "cancelled"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      invoice_type: "retainer" | "standard" | "change_order" | "final_balance"
      lead_source:
        | "Website"
        | "Facebook"
        | "Facebook Group"
        | "Instagram"
        | "TikTok"
        | "External Planner"
        | "Hotel/Venue"
        | "Hotel/Venue PV"
        | "Vendor Referral"
        | "Client Referral"
        | "Other"
      lead_status: "New" | "Contacted" | "Qualified" | "Converted" | "Lost"
      quote_status: "draft" | "sent" | "accepted" | "rejected"
      review_status: "pending" | "submitted"
      task_status: "pending" | "completed"
      template_type:
        | "email"
        | "contract"
        | "invoice"
        | "quote"
        | "questionnaire"
      theme_mode: "light" | "dark" | "system"
      timeline_icon: "package" | "car" | "pin" | "wrench" | "party" | "flag"
      user_role: "admin" | "manager" | "staff"
      user_status: "active" | "pending" | "deactivated"
      venue_area:
        | "Playa/Costa Mujeres"
        | "Cancun Z/H"
        | "Cancun"
        | "Puerto Morelos"
        | "Playa Del Carmen"
        | "Puerto Aventuras"
        | "Akumal"
        | "Tulum"
        | "Isla Mujeres"
        | "Cozumel"
        | "Other"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      client_role: [
        "Bride",
        "Groom",
        "Parent",
        "External Planner",
        "Hotel/Resort",
        "Private Venue",
      ],
      client_type: ["Direct", "Preferred Vendor"],
      currency_code: ["MXN", "USD", "GBP", "EUR", "CAD"],
      entity_type: ["client", "event", "venue", "planner", "lead"],
      event_status: ["inquiry", "confirmed", "completed", "cancelled"],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      invoice_type: ["retainer", "standard", "change_order", "final_balance"],
      lead_source: [
        "Website",
        "Facebook",
        "Facebook Group",
        "Instagram",
        "TikTok",
        "External Planner",
        "Hotel/Venue",
        "Hotel/Venue PV",
        "Vendor Referral",
        "Client Referral",
        "Other",
      ],
      lead_status: ["New", "Contacted", "Qualified", "Converted", "Lost"],
      quote_status: ["draft", "sent", "accepted", "rejected"],
      review_status: ["pending", "submitted"],
      task_status: ["pending", "completed"],
      template_type: ["email", "contract", "invoice", "quote", "questionnaire"],
      theme_mode: ["light", "dark", "system"],
      timeline_icon: ["package", "car", "pin", "wrench", "party", "flag"],
      user_role: ["admin", "manager", "staff"],
      user_status: ["active", "pending", "deactivated"],
      venue_area: [
        "Playa/Costa Mujeres",
        "Cancun Z/H",
        "Cancun",
        "Puerto Morelos",
        "Playa Del Carmen",
        "Puerto Aventuras",
        "Akumal",
        "Tulum",
        "Isla Mujeres",
        "Cozumel",
        "Other",
      ],
    },
  },
} as const
