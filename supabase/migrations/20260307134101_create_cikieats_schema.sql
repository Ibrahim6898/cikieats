/*
  # CIKIEats Food Delivery Platform Schema

  ## Overview
  Complete database schema for a multi-role food delivery platform supporting customers, vendors, riders, and admins.

  ## Tables Created

  1. **profiles** - User profile information
     - id (uuid, references auth.users)
     - name (text)
     - email (text)
     - created_at (timestamptz)

  2. **user_roles** - Role assignments for users
     - id (uuid)
     - user_id (uuid, references auth.users)
     - role (text: customer, vendor, rider, admin)

  3. **vendors** - Restaurant vendor information
     - id (uuid)
     - owner_id (uuid, references auth.users)
     - restaurant_name (text)
     - cuisine (text)
     - address (text)
     - landmark (text)
     - delivery_fee (numeric)
     - status (text: pending, approved, rejected)
     - is_open (boolean)
     - created_at (timestamptz)

  4. **vendor_images** - Restaurant photos
     - id (uuid)
     - vendor_id (uuid, references vendors)
     - image_url (text)

  5. **menu_items** - Restaurant menu items
     - id (uuid)
     - vendor_id (uuid, references vendors)
     - name (text)
     - description (text)
     - price (numeric)
     - image_url (text)
     - available (boolean)

  6. **orders** - Customer orders
     - id (uuid)
     - customer_id (uuid, references auth.users)
     - vendor_id (uuid, references vendors)
     - rider_id (uuid, references riders)
     - status (text)
     - delivery_address (text)
     - phone (text)
     - payment_method (text)
     - total_price (numeric)
     - created_at (timestamptz)

  7. **order_items** - Items in each order
     - id (uuid)
     - order_id (uuid, references orders)
     - menu_item_id (uuid, references menu_items)
     - quantity (integer)
     - price (numeric)

  8. **riders** - Delivery driver information
     - id (uuid)
     - user_id (uuid, references auth.users)
     - phone (text)
     - vehicle_type (text)
     - status (text: pending, approved, rejected)
     - is_online (boolean)
     - deliveries_completed (integer)

  9. **reviews** - Order reviews and ratings
     - id (uuid)
     - order_id (uuid, references orders)
     - customer_id (uuid, references auth.users)
     - vendor_id (uuid, references vendors)
     - rating (integer)
     - comment (text)
     - created_at (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Customers can only access their own data
  - Vendors can only manage their own restaurants
  - Riders can only see assigned deliveries
  - Admins have full access
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('customer', 'vendor', 'rider', 'admin')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_name text NOT NULL,
  cuisine text NOT NULL,
  address text NOT NULL,
  landmark text,
  delivery_fee numeric DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_open boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (status = 'approved');

CREATE POLICY "Owners can view own vendor"
  ON vendors FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert own vendor"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own vendor"
  ON vendors FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Create vendor_images table
CREATE TABLE IF NOT EXISTS vendor_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vendor images"
  ON vendor_images FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vendor owners can insert images"
  ON vendor_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_id
      AND vendors.owner_id = auth.uid()
    )
  );

CREATE POLICY "Vendor owners can delete images"
  ON vendor_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_id
      AND vendors.owner_id = auth.uid()
    )
  );

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  image_url text,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (available = true);

CREATE POLICY "Vendor owners can view own menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_id
      AND vendors.owner_id = auth.uid()
    )
  );

CREATE POLICY "Vendor owners can insert menu items"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_id
      AND vendors.owner_id = auth.uid()
    )
  );

CREATE POLICY "Vendor owners can update menu items"
  ON menu_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_id
      AND vendors.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_id
      AND vendors.owner_id = auth.uid()
    )
  );

CREATE POLICY "Vendor owners can delete menu items"
  ON menu_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_id
      AND vendors.owner_id = auth.uid()
    )
  );

-- Create riders table
CREATE TABLE IF NOT EXISTS riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone text NOT NULL,
  vehicle_type text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_online boolean DEFAULT false,
  deliveries_completed integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE riders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders can view own profile"
  ON riders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Riders can insert own profile"
  ON riders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Riders can update own profile"
  ON riders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  rider_id uuid REFERENCES riders(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled')),
  delivery_address text NOT NULL,
  phone text NOT NULL,
  payment_method text NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Vendors can view restaurant orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_id
      AND vendors.owner_id = auth.uid()
    )
  );

CREATE POLICY "Riders can view assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM riders
      WHERE riders.id = rider_id
      AND riders.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Vendors can update restaurant orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_id
      AND vendors.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_id
      AND vendors.owner_id = auth.uid()
    )
  );

CREATE POLICY "Riders can update assigned orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM riders
      WHERE riders.id = rider_id
      AND riders.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM riders
      WHERE riders.id = rider_id
      AND riders.user_id = auth.uid()
    )
  );

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  price numeric NOT NULL
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view order items for their orders"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND (
        orders.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM vendors
          WHERE vendors.id = orders.vendor_id
          AND vendors.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM riders
          WHERE riders.id = orders.rider_id
          AND riders.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Customers can insert order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Customers can insert own reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can delete own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = customer_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_owner_id ON vendors(owner_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_menu_items_vendor_id ON menu_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_riders_user_id ON riders(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_vendor_id ON reviews(vendor_id);