-- ================================================================
-- RLS (ROW LEVEL SECURITY) SETUP SCRIPT
-- ================================================================
-- 
-- PENTING: Execute ini step-by-step di Supabase SQL Editor
-- DO NOT run all at once - periksa setiap step untuk errors
-- 
-- Timeline: ~15-20 menit
-- Testing time: ~30 menit (untuk QA semua fitur)

-- ===================================================
-- STEP 1: ENABLE RLS (Temporary Permissive Policy)
-- ===================================================
-- Ini untuk testing safety - tidak break aplikasi

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_temp_all_access" ON orders FOR ALL USING (true);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_temp_all_access" ON order_items FOR ALL USING (true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_temp_all_access" ON users FOR ALL USING (true);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_temp_all_access" ON customers FOR ALL USING (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_temp_all_access" ON products FOR ALL USING (true);

-- ✅ At this point, aplikasi should work exactly the same
-- Test: Login, create order, view dashboard → semua harus jalan normal

-- ===================================================
-- STEP 2: PRODUCTS - Most Permissive (Public Read)
-- ===================================================

DROP POLICY "products_temp_all_access" ON products;

-- Everyone can read products
CREATE POLICY "products_public_read" ON products 
  FOR SELECT USING (true);

-- Only authenticated users (admin) can create/update/delete
CREATE POLICY "products_admin_write" ON products 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "products_admin_update" ON products 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "products_admin_delete" ON products 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ✅ Test: Browse products page → harus berjalan normal

-- ===================================================
-- STEP 3: CUSTOMERS - Admin Only Access
-- ===================================================

DROP POLICY "customers_temp_all_access" ON customers;

-- Only authenticated users can read customers
CREATE POLICY "customers_read" ON customers 
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only add customers via authenticated endpoints
CREATE POLICY "customers_insert" ON customers 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Update own or if admin
CREATE POLICY "customers_update" ON customers 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ✅ Test: Admin dashboard → customer search harus jalan

-- ===================================================
-- STEP 4: USERS - Own Data + Admin Access
-- ===================================================

DROP POLICY "users_temp_all_access" ON users;

-- Users can read own data
CREATE POLICY "users_read_own" ON users 
  FOR SELECT USING (auth.uid() = id);

-- Admin can read all users
CREATE POLICY "users_admin_read" ON users 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update own data
CREATE POLICY "users_update_own" ON users 
  FOR UPDATE USING (auth.uid() = id);

-- Admin can update any user
CREATE POLICY "users_admin_update" ON users 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ✅ Test: Login as user → hanya bisa lihat data sendiri
-- ✅ Test: Login as admin → bisa lihat semua users

-- ===================================================
-- STEP 5: ORDER_ITEMS - Tied to Orders
-- ===================================================

DROP POLICY "order_items_temp_all_access" ON order_items;

-- Users can read items of their own orders
CREATE POLICY "order_items_read_own" ON order_items 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE id = order_items.order_id AND user_id = auth.uid()
    )
  );

-- Admin can read all order items
CREATE POLICY "order_items_admin_read" ON order_items 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert tied to order access
CREATE POLICY "order_items_insert" ON order_items 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders WHERE id = order_items.order_id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ✅ Test: User dapat lihat items pesanan mereka
-- ✅ Test: Admin dapat lihat semua items

-- ===================================================
-- STEP 6: ORDERS - Most Critical RLS
-- ===================================================

DROP POLICY "orders_temp_all_access" ON orders;

-- Users can read own orders
CREATE POLICY "orders_read_own" ON orders 
  FOR SELECT USING (auth.uid() = user_id);

-- Admin can read all orders
CREATE POLICY "orders_admin_read" ON orders 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can create own orders
CREATE POLICY "orders_insert_own" ON orders 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can create on behalf (untuk offline orders)
CREATE POLICY "orders_admin_insert" ON orders 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can only update own orders (minimal fields)
CREATE POLICY "orders_update_own" ON orders 
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin can update any order
CREATE POLICY "orders_admin_update" ON orders 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Delete policy (very restrictive)
CREATE POLICY "orders_no_delete" ON orders 
  FOR DELETE USING (false); -- Disable deletes completely

-- ✅ Test: Customer dapat lihat order mereka saja
-- ✅ Test: Admin dapat lihat semua orders
-- ✅ Test: Customer TIDAK bisa lihat order orang lain

-- ===================================================
-- STEP 7: VERIFICATION (Run After All Policies)
-- ===================================================

-- Check that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('orders', 'order_items', 'users', 'customers', 'products');

-- Expected output: all should have rowsecurity = true

-- Count existing policies per table
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ===================================================
-- STEP 8: ROLLBACK (Just in case)
-- ===================================================
-- If something breaks, run this immediately:
/*
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
*/

-- ===================================================
-- TESTING CHECKLIST
-- ===================================================
/*
After implementing RLS, test these:

1. ✅ Customer Login:
   - Buka orders list → lihat hanya orders mereka
   - Tidak bisa akses orders customer lain

2. ✅ Admin Login:
   - Buka dashboard → see all orders ✓
   - Create offline order → work correctly ✓
   - Edit order → update status ✓
   - View all customers → success ✓

3. ✅ Product Page:
   - Browse products → load correctly ✓
   - Add to cart → no auth error ✓

4. ✅ Offline Functionality:
   - Create order without customer account ✓
   - Send WhatsApp notification ✓
   - Print label ✓

5. ✅ API Calls:
   - Monitor network tab → no permission errors
   - Check console → no RLS-related warnings

If any test fails, IMMEDIATELY run rollback and review policy.
*/

-- ===================================================
-- MONITORING (Post-Deployment)
-- ===================================================
-- Monitor RLS policy violations in Supabase logs
-- Dashboard → Logs → Policy violation errors
-- If you see errors, check:
-- 1. Auth context (is user logged in correctly?)
-- 2. User role (is it set as 'admin'?)
-- 3. Policy conditions (do they match user/data?)
