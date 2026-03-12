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
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'customer' | 'vendor' | 'rider' | 'admin'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'customer' | 'vendor' | 'rider' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'customer' | 'vendor' | 'rider' | 'admin'
          created_at?: string
        }
      }
      vendors: {
        Row: {
          id: string
          owner_id: string
          restaurant_name: string
          cuisine: string
          address: string
          landmark: string | null
          delivery_fee: number
          status: 'pending' | 'approved' | 'rejected'
          is_open: boolean
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          restaurant_name: string
          cuisine: string
          address: string
          landmark?: string | null
          delivery_fee?: number
          status?: 'pending' | 'approved' | 'rejected'
          is_open?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          restaurant_name?: string
          cuisine?: string
          address?: string
          landmark?: string | null
          delivery_fee?: number
          status?: 'pending' | 'approved' | 'rejected'
          is_open?: boolean
          created_at?: string
        }
      }
      vendor_images: {
        Row: {
          id: string
          vendor_id: string
          image_url: string
          created_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          image_url: string
          created_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          image_url?: string
          created_at?: string
        }
      }
      menu_items: {
        Row: {
          id: string
          vendor_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          available?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          available?: boolean
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          customer_id: string
          vendor_id: string
          rider_id: string | null
          status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled'
          delivery_address: string
          phone: string
          payment_method: string
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          vendor_id: string
          rider_id?: string | null
          status?: 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled'
          delivery_address: string
          phone: string
          payment_method: string
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          vendor_id?: string
          rider_id?: string | null
          status?: 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled'
          delivery_address?: string
          phone?: string
          payment_method?: string
          total_price?: number
          created_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string
          quantity: number
          price: number
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id: string
          quantity: number
          price: number
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string
          quantity?: number
          price?: number
        }
      }
      riders: {
        Row: {
          id: string
          user_id: string
          phone: string
          vehicle_type: string
          status: 'pending' | 'approved' | 'rejected'
          is_online: boolean
          deliveries_completed: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          phone: string
          vehicle_type: string
          status?: 'pending' | 'approved' | 'rejected'
          is_online?: boolean
          deliveries_completed?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          phone?: string
          vehicle_type?: string
          status?: 'pending' | 'approved' | 'rejected'
          is_online?: boolean
          deliveries_completed?: number
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          order_id: string
          customer_id: string
          vendor_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          customer_id: string
          vendor_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          customer_id?: string
          vendor_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
      }
    }
  }
}
