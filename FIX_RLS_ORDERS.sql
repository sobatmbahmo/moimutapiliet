-- ================================================================
-- FIX RLS - Allow Admin to Create Orders
-- ================================================================

-- Drop existing order policies that restrict admin
DROP POLICY IF EXISTS "orders_customer_insert" ON orders;

-- New policy: Allow user to create their own orders OR admin to create for anyone
CREATE POLICY "orders_insert_policy" 
  ON orders 
  FOR INSERT 
  WITH CHECK (
    user_id = auth.uid() 
    OR EXISTS(SELECT 1 FROM admins WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Verify
SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'orders';
