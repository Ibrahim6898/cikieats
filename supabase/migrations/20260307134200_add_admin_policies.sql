-- Create is_admin helper function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1. Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT TO authenticated USING (is_admin());

-- 2. User Roles
DROP POLICY IF EXISTS "Authenticated users can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
CREATE POLICY "Authenticated users can view roles" ON user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own role" ON user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. Vendors
DROP POLICY IF EXISTS "Anyone can view approved vendors" ON vendors;
DROP POLICY IF EXISTS "Owners can manage own vendor" ON vendors;
DROP POLICY IF EXISTS "Admins can manage all vendors" ON vendors;

CREATE POLICY "Anyone can view approved vendors" ON vendors FOR SELECT TO authenticated USING (status = 'approved' OR owner_id = auth.uid() OR is_admin());
CREATE POLICY "vendors can create their restaurant" ON vendors FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "vendors can update their restaurant" ON vendors FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Admins can manage all vendors" ON vendors FOR ALL TO authenticated USING (is_admin());

-- 4. Menu Items
DROP POLICY IF EXISTS "Anyone can view menu items" ON menu_items;
DROP POLICY IF EXISTS "vendors manage their menu" ON menu_items;

CREATE POLICY "Anyone can view menu items" ON menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "vendors manage their menu" ON menu_items FOR ALL TO authenticated 
USING (vendor_id IN (SELECT id FROM vendors WHERE owner_id = auth.uid()))
WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE owner_id = auth.uid()));

-- 5. Riders
DROP POLICY IF EXISTS "Riders can manage own profile" ON riders;
DROP POLICY IF EXISTS "Admins can manage all riders" ON riders;

CREATE POLICY "Riders can view own profile" ON riders FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Riders can create own profile" ON riders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Riders can update own profile" ON riders FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all riders" ON riders FOR ALL TO authenticated USING (is_admin());

-- 6. Orders
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Vendors can view restaurant orders" ON orders;
DROP POLICY IF EXISTS "Riders can view assigned orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;

CREATE POLICY "Customers can view own orders" ON orders FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Customers can create orders" ON orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Vendors can view restaurant orders" ON orders FOR SELECT TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE owner_id = auth.uid()));
CREATE POLICY "Vendors can update restaurant orders" ON orders FOR UPDATE TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE owner_id = auth.uid()));
CREATE POLICY "Riders can view assigned orders" ON orders FOR SELECT TO authenticated USING (rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()));
CREATE POLICY "Riders can update assigned orders" ON orders FOR UPDATE TO authenticated USING (rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all orders" ON orders FOR ALL TO authenticated USING (is_admin());

-- 7. Order Items
DROP POLICY IF EXISTS "Users can view related order items" ON order_items;
CREATE POLICY "Users can view related order items" ON order_items FOR SELECT TO authenticated USING (
  order_id IN (SELECT id FROM orders)
);
-- Note: Order items are usually created with orders, so INSERT often happens via RPC or batch.
-- Adding a simple INSERT policy.
CREATE POLICY "Users can insert order items" ON order_items FOR INSERT TO authenticated WITH CHECK (true);
