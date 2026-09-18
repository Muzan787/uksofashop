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
      admins: {
        Row: {
          created_at: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      attribution_actions: {
        Row: {
          action_type: string
          arrival_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          order_id: string | null
          page_url: string | null
          product_id: string | null
          session_id: string | null
          variant_id: string | null
          visitor_id: string | null
          whatsapp_reference: string | null
        }
        Insert: {
          action_type: string
          arrival_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          page_url?: string | null
          product_id?: string | null
          session_id?: string | null
          variant_id?: string | null
          visitor_id?: string | null
          whatsapp_reference?: string | null
        }
        Update: {
          action_type?: string
          arrival_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          page_url?: string | null
          product_id?: string | null
          session_id?: string | null
          variant_id?: string | null
          visitor_id?: string | null
          whatsapp_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribution_actions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_sessions: {
        Row: {
          arrival_id: string
          created_at: string
          fbclid: string | null
          first_touch_campaign: string | null
          first_touch_content: string | null
          first_touch_medium: string | null
          first_touch_source: string | null
          first_touch_term: string | null
          ga_client_id: string | null
          gbraid: string | null
          gclid: string | null
          id: string
          initial_product_id: string | null
          initial_variant_id: string | null
          landing_page: string | null
          last_seen_at: string
          last_touch_campaign: string | null
          last_touch_content: string | null
          last_touch_medium: string | null
          last_touch_source: string | null
          last_touch_term: string | null
          meta_fbc: string | null
          meta_fbp: string | null
          referrer: string | null
          session_id: string
          visitor_id: string
          wbraid: string | null
        }
        Insert: {
          arrival_id: string
          created_at?: string
          fbclid?: string | null
          first_touch_campaign?: string | null
          first_touch_content?: string | null
          first_touch_medium?: string | null
          first_touch_source?: string | null
          first_touch_term?: string | null
          ga_client_id?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          initial_product_id?: string | null
          initial_variant_id?: string | null
          landing_page?: string | null
          last_seen_at?: string
          last_touch_campaign?: string | null
          last_touch_content?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          last_touch_term?: string | null
          meta_fbc?: string | null
          meta_fbp?: string | null
          referrer?: string | null
          session_id: string
          visitor_id: string
          wbraid?: string | null
        }
        Update: {
          arrival_id?: string
          created_at?: string
          fbclid?: string | null
          first_touch_campaign?: string | null
          first_touch_content?: string | null
          first_touch_medium?: string | null
          first_touch_source?: string | null
          first_touch_term?: string | null
          ga_client_id?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          initial_product_id?: string | null
          initial_variant_id?: string | null
          landing_page?: string | null
          last_seen_at?: string
          last_touch_campaign?: string | null
          last_touch_content?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          last_touch_term?: string | null
          meta_fbc?: string | null
          meta_fbp?: string | null
          referrer?: string | null
          session_id?: string
          visitor_id?: string
          wbraid?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_recovery_leads: {
        Row: {
          arrival_id: string
          basket: Json
          consent_at: string
          consent_copy_version: string
          converted_order_id: string | null
          created_at: string
          data_class: string
          done_at: string | null
          email: string | null
          email_opt_in: boolean
          expires_at: string
          id: string
          phone: string | null
          reminder_emailed_at: string | null
          session_id: string
          status: string
          updated_at: string
          visitor_id: string
          whatsapp_opt_in: boolean
        }
        Insert: {
          arrival_id: string
          basket?: Json
          consent_at?: string
          consent_copy_version?: string
          converted_order_id?: string | null
          created_at?: string
          data_class?: string
          done_at?: string | null
          email?: string | null
          email_opt_in?: boolean
          expires_at?: string
          id?: string
          phone?: string | null
          reminder_emailed_at?: string | null
          session_id: string
          status?: string
          updated_at?: string
          visitor_id: string
          whatsapp_opt_in?: boolean
        }
        Update: {
          arrival_id?: string
          basket?: Json
          consent_at?: string
          consent_copy_version?: string
          converted_order_id?: string | null
          created_at?: string
          data_class?: string
          done_at?: string | null
          email?: string | null
          email_opt_in?: boolean
          expires_at?: string
          id?: string
          phone?: string | null
          reminder_emailed_at?: string | null
          session_id?: string
          status?: string
          updated_at?: string
          visitor_id?: string
          whatsapp_opt_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "checkout_recovery_leads_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_events: {
        Row: {
          created_at: string
          error_metadata: Json | null
          event_id: string | null
          event_name: string
          id: string
          order_id: string | null
          platform: string
          response_metadata: Json | null
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_metadata?: Json | null
          event_id?: string | null
          event_name: string
          id?: string
          order_id?: string | null
          platform: string
          response_metadata?: Json | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_metadata?: Json | null
          event_id?: string | null
          event_name?: string
          id?: string
          order_id?: string | null
          platform?: string
          response_metadata?: Json | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fabric_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort: number
          supplier: string
          supplier_handle: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort?: number
          supplier?: string
          supplier_handle?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort?: number
          supplier?: string
          supplier_handle?: string | null
        }
        Relationships: []
      }
      fabrics: {
        Row: {
          code: string
          collection_id: string
          created_at: string
          hex: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_swatchable: boolean
          name: string
          sort: number
          supplier_title: string | null
        }
        Insert: {
          code: string
          collection_id: string
          created_at?: string
          hex?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_swatchable?: boolean
          name: string
          sort?: number
          supplier_title?: string | null
        }
        Update: {
          code?: string
          collection_id?: string
          created_at?: string
          hex?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_swatchable?: boolean
          name?: string
          sort?: number
          supplier_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fabrics_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "fabric_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      google_offline_conversions: {
        Row: {
          conversion_stage: string
          conversion_time: string
          created_at: string
          currency: string
          customer_email: string | null
          customer_first_name: string | null
          customer_last_name: string | null
          customer_phone: string | null
          customer_postcode: string | null
          error_message: string | null
          gbraid: string | null
          gclid: string | null
          id: string
          order_id: string
          upload_status: string
          uploaded_at: string | null
          value: number
          wbraid: string | null
        }
        Insert: {
          conversion_stage: string
          conversion_time: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_first_name?: string | null
          customer_last_name?: string | null
          customer_phone?: string | null
          customer_postcode?: string | null
          error_message?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          order_id: string
          upload_status?: string
          uploaded_at?: string | null
          value: number
          wbraid?: string | null
        }
        Update: {
          conversion_stage?: string
          conversion_time?: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_first_name?: string | null
          customer_last_name?: string | null
          customer_phone?: string | null
          customer_postcode?: string | null
          error_message?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          order_id?: string
          upload_status?: string
          uploaded_at?: string | null
          value?: number
          wbraid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_offline_conversions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          confirm_token: string
          confirmed_at: string | null
          consent_ip: string | null
          consent_user_agent: string | null
          created_at: string
          email: string
          id: string
          last_sent_at: string | null
          status: string
          subscribed_at: string
          unsubscribe_token: string
          unsubscribed_at: string | null
        }
        Insert: {
          confirm_token?: string
          confirmed_at?: string | null
          consent_ip?: string | null
          consent_user_agent?: string | null
          created_at?: string
          email: string
          id?: string
          last_sent_at?: string | null
          status?: string
          subscribed_at?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
        }
        Update: {
          confirm_token?: string
          confirmed_at?: string | null
          consent_ip?: string | null
          consent_user_agent?: string | null
          created_at?: string
          email?: string
          id?: string
          last_sent_at?: string | null
          status?: string
          subscribed_at?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      offer_entitlements: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          qualifying_arrival_id: string | null
          revoked_at: string | null
          source: string
          started_at: string
          token: string
          updated_at: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          qualifying_arrival_id?: string | null
          revoked_at?: string | null
          source: string
          started_at?: string
          token?: string
          updated_at?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          qualifying_arrival_id?: string | null
          revoked_at?: string | null
          source?: string
          started_at?: string
          token?: string
          updated_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      offer_product_tiers: {
        Row: {
          product_id: string
          tier: string
        }
        Insert: {
          product_id: string
          tier: string
        }
        Update: {
          product_id?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_product_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          customisation: Json | null
          fabric_code: string | null
          fabric_collection: string | null
          fabric_id: string | null
          fabric_name: string | null
          id: string
          order_id: string
          price_at_time_of_purchase: number
          quantity: number
          variant_id: string
        }
        Insert: {
          customisation?: Json | null
          fabric_code?: string | null
          fabric_collection?: string | null
          fabric_id?: string | null
          fabric_name?: string | null
          id?: string
          order_id: string
          price_at_time_of_purchase: number
          quantity: number
          variant_id: string
        }
        Update: {
          customisation?: Json | null
          fabric_code?: string | null
          fabric_collection?: string | null
          fabric_id?: string | null
          fabric_name?: string | null
          id?: string
          order_id?: string
          price_at_time_of_purchase?: number
          quantity?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_fabric_id_fkey"
            columns: ["fabric_id"]
            isOneToOne: false
            referencedRelation: "fabrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          arrival_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_ip: string | null
          customer_name: string
          customer_phone: string
          customer_user_agent: string | null
          delivered_at: string | null
          delivered_event_sent_at: string | null
          delivery_floor: number
          delivery_has_lift: boolean
          delivery_total: number
          discount_amount: number
          discount_tier: string | null
          fbclid: string | null
          fee_assembly: number
          fee_sofa_removal: number
          fee_upstairs: number
          ga_client_id: string | null
          gbraid: string | null
          gclid: string | null
          has_made_to_order: boolean
          id: string
          items_subtotal: number
          landing_page: string | null
          manual_acquisition_at: string | null
          manual_acquisition_note: string | null
          manual_acquisition_source: string | null
          meta_fbc: string | null
          meta_fbp: string | null
          offer_source: string | null
          preferred_delivery_date: string | null
          processing_at: string | null
          promotion_code: string | null
          purchase_event_id: string
          purchase_event_sent_at: string | null
          referrer: string | null
          review_request_sent_at: string | null
          session_id: string | null
          shipped_at: string | null
          shipping_address: string
          sofa_removal_seats: number | null
          source: string
          special_instructions: string | null
          status: string | null
          total_amount: number
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string | null
          wants_assembly: boolean
          wants_sofa_removal: boolean
          wbraid: string | null
          whatsapp_reference: string | null
        }
        Insert: {
          arrival_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_ip?: string | null
          customer_name: string
          customer_phone: string
          customer_user_agent?: string | null
          delivered_at?: string | null
          delivered_event_sent_at?: string | null
          delivery_floor?: number
          delivery_has_lift?: boolean
          delivery_total?: number
          discount_amount?: number
          discount_tier?: string | null
          fbclid?: string | null
          fee_assembly?: number
          fee_sofa_removal?: number
          fee_upstairs?: number
          ga_client_id?: string | null
          gbraid?: string | null
          gclid?: string | null
          has_made_to_order?: boolean
          id?: string
          items_subtotal?: number
          landing_page?: string | null
          manual_acquisition_at?: string | null
          manual_acquisition_note?: string | null
          manual_acquisition_source?: string | null
          meta_fbc?: string | null
          meta_fbp?: string | null
          offer_source?: string | null
          preferred_delivery_date?: string | null
          processing_at?: string | null
          promotion_code?: string | null
          purchase_event_id?: string
          purchase_event_sent_at?: string | null
          referrer?: string | null
          review_request_sent_at?: string | null
          session_id?: string | null
          shipped_at?: string | null
          shipping_address: string
          sofa_removal_seats?: number | null
          source?: string
          special_instructions?: string | null
          status?: string | null
          total_amount: number
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
          wants_assembly?: boolean
          wants_sofa_removal?: boolean
          wbraid?: string | null
          whatsapp_reference?: string | null
        }
        Update: {
          arrival_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_ip?: string | null
          customer_name?: string
          customer_phone?: string
          customer_user_agent?: string | null
          delivered_at?: string | null
          delivered_event_sent_at?: string | null
          delivery_floor?: number
          delivery_has_lift?: boolean
          delivery_total?: number
          discount_amount?: number
          discount_tier?: string | null
          fbclid?: string | null
          fee_assembly?: number
          fee_sofa_removal?: number
          fee_upstairs?: number
          ga_client_id?: string | null
          gbraid?: string | null
          gclid?: string | null
          has_made_to_order?: boolean
          id?: string
          items_subtotal?: number
          landing_page?: string | null
          manual_acquisition_at?: string | null
          manual_acquisition_note?: string | null
          manual_acquisition_source?: string | null
          meta_fbc?: string | null
          meta_fbp?: string | null
          offer_source?: string | null
          preferred_delivery_date?: string | null
          processing_at?: string | null
          promotion_code?: string | null
          purchase_event_id?: string
          purchase_event_sent_at?: string | null
          referrer?: string | null
          review_request_sent_at?: string | null
          session_id?: string | null
          shipped_at?: string | null
          shipping_address?: string
          sofa_removal_seats?: number | null
          source?: string
          special_instructions?: string | null
          status?: string | null
          total_amount?: number
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
          wants_assembly?: boolean
          wants_sofa_removal?: boolean
          wbraid?: string | null
          whatsapp_reference?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          color_hex: string | null
          created_at: string | null
          id: string
          image_url: string | null
          material: string | null
          price_adjustment: number | null
          priority: number | null
          product_id: string
          sku: string
          stock_quantity: number | null
        }
        Insert: {
          color?: string | null
          color_hex?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          material?: string | null
          price_adjustment?: number | null
          priority?: number | null
          product_id: string
          sku: string
          stock_quantity?: number | null
        }
        Update: {
          color?: string | null
          color_hex?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          material?: string | null
          price_adjustment?: number | null
          priority?: number | null
          product_id?: string
          sku?: string
          stock_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          average_rating: number | null
          base_price: number
          category_id: string | null
          created_at: string | null
          custom_made: boolean
          description: string | null
          gallery_images: string[] | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          origin: string
          review_count: number | null
          size_label: string | null
          slug: string
          specifications: Json | null
          subgroup_label: string | null
          title: string
          variant_group_id: string | null
        }
        Insert: {
          average_rating?: number | null
          base_price: number
          category_id?: string | null
          created_at?: string | null
          custom_made?: boolean
          description?: string | null
          gallery_images?: string[] | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          origin?: string
          review_count?: number | null
          size_label?: string | null
          slug: string
          specifications?: Json | null
          subgroup_label?: string | null
          title: string
          variant_group_id?: string | null
        }
        Update: {
          average_rating?: number | null
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          custom_made?: boolean
          description?: string | null
          gallery_images?: string[] | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          origin?: string
          review_count?: number | null
          size_label?: string | null
          slug?: string
          specifications?: Json | null
          subgroup_label?: string | null
          title?: string
          variant_group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_variant_group_id_fkey"
            columns: ["variant_group_id"]
            isOneToOne: false
            referencedRelation: "variant_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string | null
          id: string
          image_url: string | null
          is_approved: boolean
          order_id: string | null
          product_id: string | null
          rating: number
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean
          order_id?: string | null
          product_id?: string | null
          rating: number
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean
          order_id?: string | null
          product_id?: string | null
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      swatch_request_items: {
        Row: {
          fabric_code: string
          fabric_collection: string
          fabric_id: string | null
          fabric_name: string
          id: string
          request_id: string
        }
        Insert: {
          fabric_code: string
          fabric_collection: string
          fabric_id?: string | null
          fabric_name: string
          id?: string
          request_id: string
        }
        Update: {
          fabric_code?: string
          fabric_collection?: string
          fabric_id?: string | null
          fabric_name?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swatch_request_items_fabric_id_fkey"
            columns: ["fabric_id"]
            isOneToOne: false
            referencedRelation: "fabrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swatch_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "swatch_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      swatch_requests: {
        Row: {
          created_at: string
          customer_email: string
          customer_ip: string | null
          customer_name: string
          customer_phone: string | null
          customer_user_agent: string | null
          id: string
          postcode: string
          posted_at: string | null
          shipping_address: string
          status: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_ip?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_user_agent?: string | null
          id?: string
          postcode: string
          posted_at?: string | null
          shipping_address: string
          status?: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_ip?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_user_agent?: string | null
          id?: string
          postcode?: string
          posted_at?: string | null
          shipping_address?: string
          status?: string
        }
        Relationships: []
      }
      variant_groups: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          subgroup_title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          subgroup_title?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          subgroup_title?: string
        }
        Relationships: []
      }
      whatsapp_enquiries: {
        Row: {
          arrival_id: string | null
          converted_at: string | null
          converted_order_id: string | null
          created_at: string
          fbclid: string | null
          ga_client_id: string | null
          gbraid: string | null
          gclid: string | null
          id: string
          meta_fbc: string | null
          meta_fbp: string | null
          page_context: string | null
          page_url: string | null
          product_id: string | null
          product_name: string | null
          reference: string
          session_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          variant_id: string | null
          visitor_id: string | null
          wbraid: string | null
        }
        Insert: {
          arrival_id?: string | null
          converted_at?: string | null
          converted_order_id?: string | null
          created_at?: string
          fbclid?: string | null
          ga_client_id?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          meta_fbc?: string | null
          meta_fbp?: string | null
          page_context?: string | null
          page_url?: string | null
          product_id?: string | null
          product_name?: string | null
          reference: string
          session_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant_id?: string | null
          visitor_id?: string | null
          wbraid?: string | null
        }
        Update: {
          arrival_id?: string | null
          converted_at?: string | null
          converted_order_id?: string | null
          created_at?: string
          fbclid?: string | null
          ga_client_id?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          meta_fbc?: string | null
          meta_fbp?: string | null
          page_context?: string | null
          page_url?: string | null
          product_id?: string | null
          product_name?: string | null
          reference?: string
          session_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant_id?: string | null
          visitor_id?: string | null
          wbraid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_enquiries_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_order_offer: {
        Args: {
          p_items: Json
          p_offer_entitlement_token?: string
          p_promotion_code?: string
        }
        Returns: Json
      }
      confirm_order: {
        Args: { p_order_id: string }
        Returns: {
          created_at: string
          customer_name: string
          id: string
          shipping_address: string
          status: string
          total_amount: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      issue_paid_offer_entitlement: {
        Args: { p_arrival_id?: string; p_source: string; p_visitor_id: string }
        Returns: Json
      }
      newsletter_confirm: { Args: { p_token: string }; Returns: Json }
      newsletter_subscribe: {
        Args: { p_email: string; p_ip?: string; p_user_agent?: string }
        Returns: Json
      }
      newsletter_unsubscribe: { Args: { p_token: string }; Returns: Json }
      place_manual_order: {
        Args: {
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_delivery_charge?: number
          p_items: Json
          p_shipping_address: string
          p_source?: string
          p_special_instructions: string
          p_whatsapp_reference?: string
        }
        Returns: Json
      }
      place_order: {
        Args: {
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_delivery_floor?: number
          p_delivery_has_lift?: boolean
          p_expected_total: number
          p_items: Json
          p_offer_entitlement_token?: string
          p_preferred_delivery_date?: string
          p_promotion_code?: string
          p_shipping_address: string
          p_sofa_removal_seats?: number
          p_special_instructions: string
          p_wants_assembly?: boolean
          p_wants_sofa_removal?: boolean
        }
        Returns: Json
      }
      refresh_product_review_stats: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      request_swatches: {
        Args: {
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_fabric_ids: string[]
          p_ip?: string
          p_postcode: string
          p_shipping_address: string
          p_user_agent?: string
        }
        Returns: Json
      }
      track_order: {
        Args: { p_postcode: string; p_reference: string }
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
    Enums: {},
  },
} as const
