export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          name: string;
          location: string | null;
          address: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location?: string | null;
          address?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string | null;
          address?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "owner" | "receptionist";
          store_id: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: "owner" | "receptionist";
          store_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: "owner" | "receptionist";
          store_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          description: string | null;
          sku: string | null;
          category: string | null;
          buying_price: number;
          selling_price: number;
          stock: number;
          low_stock_threshold: number;
          image_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          description?: string | null;
          sku?: string | null;
          category?: string | null;
          buying_price: number;
          selling_price: number;
          stock?: number;
          low_stock_threshold?: number;
          image_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          description?: string | null;
          sku?: string | null;
          category?: string | null;
          buying_price?: number;
          selling_price?: number;
          stock?: number;
          low_stock_threshold?: number;
          image_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          customer_type: "regular" | "vip" | "wholesale";
          discount_type: "percentage" | "fixed";
          discount_percentage: number;
          discount_fixed_amount: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          customer_type?: "regular" | "vip" | "wholesale";
          discount_type?: "percentage" | "fixed";
          discount_percentage?: number;
          discount_fixed_amount?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          customer_type?: "regular" | "vip" | "wholesale";
          discount_type?: "percentage" | "fixed";
          discount_percentage?: number;
          discount_fixed_amount?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          store_id: string;
          total_amount: number;
          profit: number;
          payment_method: "cash" | "card" | "other" | null;
          sold_by: string | null;
          customer_id: string | null;
          discount_amount: number;
          original_amount: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          total_amount: number;
          profit: number;
          payment_method?: "cash" | "card" | "other" | null;
          sold_by?: string | null;
          customer_id?: string | null;
          discount_amount?: number;
          original_amount?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          total_amount?: number;
          profit?: number;
          payment_method?: "cash" | "card" | "other" | null;
          sold_by?: string | null;
          customer_id?: string | null;
          discount_amount?: number;
          original_amount?: number | null;
          created_at?: string;
        };
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          price_at_sale: number;
          cost_at_sale: number;
          subtotal: number;
          profit: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          price_at_sale: number;
          cost_at_sale: number;
          subtotal: number;
          profit: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          sale_id?: string;
          product_id?: string;
          quantity?: number;
          price_at_sale?: number;
          cost_at_sale?: number;
          subtotal?: number;
          profit?: number;
          created_at?: string;
        };
      };
      purchases: {
        Row: {
          id: string;
          store_id: string;
          product_id: string;
          quantity: number;
          cost_per_unit: number;
          total_cost: number;
          supplier: string | null;
          notes: string | null;
          purchased_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          product_id: string;
          quantity: number;
          cost_per_unit: number;
          total_cost: number;
          supplier?: string | null;
          notes?: string | null;
          purchased_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          product_id?: string;
          quantity?: number;
          cost_per_unit?: number;
          total_cost?: number;
          supplier?: string | null;
          notes?: string | null;
          purchased_by?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
