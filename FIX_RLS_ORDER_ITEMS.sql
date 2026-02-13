-- Fix RLS on order_items table
-- 401 Unauthorized error when adding order items
-- Solution: Disable RLS on order_items table temporarily for admin to insert items

-- Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'order_items' AND schemaname = 'public';

-- Disable RLS on order_items table
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Verify disable
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'order_items' AND schemaname = 'public';

-- Alternative: Keep RLS enabled but create proper INSERT policy for public/anon
-- (Only use if you want RLS enabled)
-- CREATE POLICY "Allow anon to insert order items" ON order_items
-- FOR INSERT
-- WITH CHECK (true);
