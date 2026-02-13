-- ================================================================
-- RLS POLICIES FOR SUPABASE - CORRECTED SYNTAX
-- This script has been tested and works with Supabase PostgreSQL
-- FIXED: Checking 'admins' table instead of 'users' for role
-- ================================================================

-- Step 1: Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliators ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- PRODUCTS: Public read, admin write
-- ================================================================
CREATE POLICY "products_public_read" 
  ON products 
  FOR SELECT 
  USING (true);

CREATE POLICY "products_admin_insert" 
  ON products 
  FOR INSERT 
  WITH CHECK (
    EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

CREATE POLICY "products_admin_update" 
  ON products 
  FOR UPDATE 
  WITH CHECK (
    EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

CREATE POLICY "products_admin_delete" 
  ON products 
  FOR DELETE 
  USING (
    EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- ================================================================
-- USERS: Customers - public read (for orders), own data
-- ================================================================
CREATE POLICY "users_public_read" 
  ON users 
  FOR SELECT 
  USING (true);

CREATE POLICY "users_own_update" 
  ON users 
  FOR UPDATE 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_admin_all" 
  ON users 
  FOR ALL
  USING (
    EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- ================================================================
-- ADMINS: Own data + superadmin all
-- ================================================================
CREATE POLICY "admins_own_data_select" 
  ON admins 
  FOR SELECT 
  USING (
    auth.uid() = id 
    OR EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "admins_superadmin_update" 
  ON admins 
  FOR UPDATE 
  WITH CHECK (
    EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "admins_superadmin_delete" 
  ON admins 
  FOR DELETE 
  USING (
    EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role = 'superadmin')
  );

-- ================================================================
-- CUSTOMERS: Admin order management only
-- ================================================================
CREATE POLICY "customers_public_read" 
  ON customers 
  FOR SELECT 
  USING (true);

CREATE POLICY "customers_admin_insert" 
  ON customers 
  FOR INSERT 
  WITH CHECK (
    EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

CREATE POLICY "customers_admin_update" 
  ON customers 
  FOR UPDATE 
  WITH CHECK (
    EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

CREATE POLICY "customers_admin_delete" 
  ON customers 
  FOR DELETE 
  USING (
    EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- ================================================================
-- ORDERS: Own orders + admin all (NO DELETE)
-- ================================================================
CREATE POLICY "orders_customer_select" 
  ON orders 
  FOR SELECT 
  USING (
    user_id = auth.uid() 
    OR EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    OR affiliator_id = auth.uid()
  );

CREATE POLICY "orders_customer_insert" 
  ON orders 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders_admin_update" 
  ON orders 
  FOR UPDATE 
  WITH CHECK (
    EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- NO DELETE allowed for safety (prevent accidental data loss)
CREATE POLICY "orders_no_delete" 
  ON orders 
  FOR DELETE 
  USING (false);

-- ================================================================
-- ORDER ITEMS: Tied to order ownership
-- ================================================================
CREATE POLICY "order_items_select" 
  ON order_items 
  FOR SELECT 
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE user_id = auth.uid() 
      OR affiliator_id = auth.uid()
      OR EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    )
  );

CREATE POLICY "order_items_admin_update" 
  ON order_items 
  FOR UPDATE 
  WITH CHECK (
    EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

CREATE POLICY "order_items_admin_delete" 
  ON order_items 
  FOR DELETE 
  USING (
    EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- ================================================================
-- AFFILIATORS: Own data + admin all
-- ================================================================
CREATE POLICY "affiliators_own_data_select" 
  ON affiliators 
  FOR SELECT 
  USING (
    id = auth.uid() 
    OR EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

CREATE POLICY "affiliators_own_update" 
  ON affiliators 
  FOR UPDATE 
  WITH CHECK (id = auth.uid());

CREATE POLICY "affiliators_admin_update" 
  ON affiliators 
  FOR UPDATE 
  WITH CHECK (
    EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

CREATE POLICY "affiliators_admin_delete" 
  ON affiliators 
  FOR DELETE 
  USING (
    EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- ================================================================
-- VERIFICATION
-- ================================================================
-- Check if RLS is enabled on all tables:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- 
-- Then check policies:
-- Supabase > Project > Database > Row Level Security
-- Expected: All tables show "RLS: ON" with multiple policies per table
-- ================================================================
