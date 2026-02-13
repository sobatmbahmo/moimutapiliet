# 🔒 RLS SETUP GUIDE - Step by Step

**Status**: READY TO EXECUTE
**Time Estimate**: 45 minutes
**Critical**: YES

---

## 📋 **Prerequisites Check**

Before running RLS:
- [ ] Have Supabase dashboard open
- [ ] Access to SQL Editor
- [ ] Have RLS_IMPLEMENTATION.sql file (already created)
- [ ] Backup of database (recommended)

---

## 🚀 **Execution Steps**

### **STEP 1: Enable RLS with Permissive Policies (5 min)**

Open your Supabase SQL Editor and run:

```sql
-- STEP 1: Enable RLS with permissive baseline (SAFE - nothing breaks)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliators ENABLE ROW LEVEL SECURITY;

-- Permissive policy (allows everything for now - safe baseline)
CREATE POLICY "permissive_policy" ON products FOR ALL USING (true);
CREATE POLICY "permissive_policy" ON users FOR ALL USING (true);
CREATE POLICY "permissive_policy" ON customers FOR ALL USING (true);
CREATE POLICY "permissive_policy" ON orders FOR ALL USING (true);
CREATE POLICY "permissive_policy" ON order_items FOR ALL USING (true);
CREATE POLICY "permissive_policy" ON affiliators FOR ALL USING (true);
```

**After this step:**
- ✅ Everything still works
- ✅ No data broken
- ✅ Can rollback easily

**Test**: Login to app, verify order list still works ✓

---

### **STEP 2: Products Table - Secure (5 min)**

```sql
-- Products: Public read, admin write only
DROP POLICY IF EXISTS "permissive_policy" ON products;

CREATE POLICY "products_public_read" 
  ON products FOR SELECT 
  USING (true);

CREATE POLICY "products_admin_write" 
  ON products FOR INSERT, UPDATE, DELETE 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
```

**Test**: 
- [ ] Non-admin can view products ✓
- [ ] Non-admin cannot create product ✗ (expected)
- [ ] Admin can create product ✓

---

### **STEP 3: Users Table - Own Data Only (5 min)**

```sql
-- Users: Own data + admin all
DROP POLICY IF EXISTS "permissive_policy" ON users;

CREATE POLICY "users_own_data" 
  ON users FOR SELECT 
  USING (auth.uid() = id OR 
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "users_admin_modify" 
  ON users FOR UPDATE, DELETE 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
```

**Test**:
- [ ] User A cannot see User B's data ✗
- [ ] User A can see own data ✓
- [ ] Admin can see all ✓

---

### **STEP 4: Customers Table - Authenticated Only (5 min)**

```sql
-- Customers: Authenticated users only
DROP POLICY IF EXISTS "permissive_policy" ON customers;

CREATE POLICY "customers_authenticated" 
  ON customers FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

**Test**:
- [ ] Logged-in users can view ✓
- [ ] Anonymous users see nothing ✗

---

### **STEP 5: Orders Table - Own Orders + Admin (10 min)**

```sql
-- Orders: See own orders + admin sees all
DROP POLICY IF EXISTS "permissive_policy" ON orders;

-- Customer can see own orders
CREATE POLICY "orders_own_orders" 
  ON orders FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Customer can create own orders
CREATE POLICY "orders_customer_insert" 
  ON orders FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Admin can do everything
CREATE POLICY "orders_admin_all" 
  ON orders FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- NO DELETE for safety (archive instead)
CREATE POLICY "orders_no_delete" 
  ON orders FOR DELETE 
  USING (false);
```

**Test**:
- [ ] Customer A cannot see Customer B's orders ✗
- [ ] Customer can see own orders ✓
- [ ] Admin can see all orders ✓
- [ ] No one can DELETE orders ✗ (expected - safe)

---

### **STEP 6: Order Items - Tied to Order (5 min)**

```sql
-- Order Items: Tied to order ownership
DROP POLICY IF EXISTS "permissive_policy" ON order_items;

CREATE POLICY "order_items_select" 
  ON order_items FOR SELECT 
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE user_id = auth.uid() OR 
        EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "order_items_modify" 
  ON order_items FOR UPDATE, DELETE 
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## ✅ **Complete RLS Script**

Copy-paste everything at once (recommended):

```sql
-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliators ENABLE ROW LEVEL SECURITY;

-- ==================== PRODUCTS ====================
CREATE POLICY "products_public_read" ON products FOR SELECT USING (true);
CREATE POLICY "products_admin_write" ON products FOR INSERT, UPDATE, DELETE 
  WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ==================== USERS ====================
CREATE POLICY "users_own_data" ON users FOR SELECT 
  USING (auth.uid() = id OR EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "users_admin_modify" ON users FOR UPDATE, DELETE 
  WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ==================== CUSTOMERS ====================
CREATE POLICY "customers_authenticated" ON customers FOR ALL 
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ==================== ORDERS ====================
CREATE POLICY "orders_own_orders" ON orders FOR SELECT 
  USING (user_id = auth.uid() OR EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "orders_customer_insert" ON orders FOR INSERT 
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "orders_admin_all" ON orders FOR ALL 
  USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "orders_no_delete" ON orders FOR DELETE USING (false);

-- ==================== ORDER ITEMS ====================
CREATE POLICY "order_items_select" ON order_items FOR SELECT 
  USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid() OR 
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')));
CREATE POLICY "order_items_modify" ON order_items FOR UPDATE, DELETE 
  WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ==================== AFFILIATORS ====================
CREATE POLICY "affiliators_own_data" ON affiliators FOR SELECT 
  USING (id = auth.uid() OR EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "affiliators_admin_modify" ON affiliators FOR UPDATE, DELETE 
  WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
```

---

## 🧪 **Test Cases After RLS**

### Test 1: Customer Cannot See Other Customer's Orders
```javascript
// Login as Customer A (ID: cust_a@test.com)
// Try to fetch orders
// Should see: Only Customer A's orders

// Try to manually construct query for Customer B's orders
// Should see: ERROR - RLS prevents access
```

### Test 2: Admin Can See All Orders
```javascript
// Login as Admin
// Should see: ALL orders from all customers
```

### Test 3: Anonymous Cannot Access
```javascript
// Don't login
// Try to fetch orders
// Should see: ERROR - Must be authenticated
```

### Test 4: No Deletion Allowed
```javascript
// Login as Admin
// Try: DELETE FROM orders
// Should see: ERROR - RLS policy blocks deletion
```

---

## ⚠️ **Rollback Procedure (if needed)**

```sql
-- If something breaks, disable RLS:
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE affiliators DISABLE ROW LEVEL SECURITY;

-- Then debug and try again
```

---

## ✅ **Verification Checklist**

After RLS setup:

- [ ] All tables show "RLS: ON" in Supabase
- [ ] All policies created successfully
- [ ] Dev server still connects
- [ ] Can login to app
- [ ] Can view own orders
- [ ] Cannot view other's orders (if not admin)
- [ ] Admin page works
- [ ] No data loss

---

## 📞 **If Something Breaks**

1. **Check RLS is enabled**: Table → RLS toggle should be ON
2. **Check policies exist**: Auth Policies tab
3. **Check your auth flow**: Is `auth.uid()` being set?
4. **Rollback**: Use disable commands above
5. **Check logs**: Supabase → Logs for detailed errors

---

## 🎯 **Success Criteria**

✅ RLS is complete when:
- All tables have RLS enabled
- All policies are created
- Data is secure (Customer A can't see B's orders)
- App still works normally
- Admin can see everything
- No data loss

**Time to Setup**: ~45 minutes
**Risk Level**: LOW (safe rollback available)
