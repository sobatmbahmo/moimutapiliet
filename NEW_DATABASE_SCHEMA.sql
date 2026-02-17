-- ================================================================
-- TOKONEMBAHMO DATABASE SCHEMA + RLS POLICIES
-- Untuk Supabase Project: sobatmbahmo
-- ================================================================

-- ================================================================
-- STEP 0: DROP EXISTING TABLES (Urutan terbalik karena foreign keys)
-- ================================================================
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS affiliator_product_links CASCADE;
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS customer_binding CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS affiliators CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- ================================================================
-- STEP 1: CREATE TABLES
-- ================================================================

-- 0. TABEL PRODUCTS (Data Produk) - HARUS DIBUAT PALING AWAL
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(15,2) NOT NULL,
  image_url VARCHAR(500),
  default_link VARCHAR(500),
  variants JSONB DEFAULT '[]',
  product_code VARCHAR(100) UNIQUE,
  sort_order INT,
  commission_rate DECIMAL(5,2) DEFAULT 10,
  product_weight INT DEFAULT 0,
  berat_produk INT DEFAULT 200
);

CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);

-- 1. TABEL ADMINS (Harus sebelum yang lain untuk referensi)
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(255) NOT NULL,
  nomor_wa VARCHAR(20),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);

-- 2. TABEL AFFILIATORS (Data Afiliator)
CREATE TABLE affiliators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(255) NOT NULL,
  nomor_wa VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  plain_password VARCHAR(255),
  akun_tiktok TEXT[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending',
  current_balance DECIMAL(15,2) DEFAULT 0,
  total_commission DECIMAL(15,2) DEFAULT 0,
  total_withdrawn DECIMAL(15,2) DEFAULT 0,
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliators_nomor_wa ON affiliators(nomor_wa);
CREATE INDEX IF NOT EXISTS idx_affiliators_email ON affiliators(email);
CREATE INDEX IF NOT EXISTS idx_affiliators_status ON affiliators(status);

-- 3. TABEL CUSTOMERS (Data Customer untuk Admin Order Manual)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(255) NOT NULL,
  nomor_wa VARCHAR(20) UNIQUE NOT NULL,
  alamat TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_nomor_wa ON customers(nomor_wa);
CREATE INDEX IF NOT EXISTS idx_customers_nama ON customers(nama);

-- 4. TABEL USERS (Data Pelanggan)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(255) NOT NULL,
  nomor_wa VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  alamat TEXT,
  referral_code VARCHAR(50),
  binding_affiliator_id UUID REFERENCES affiliators(id) ON DELETE SET NULL,
  binding_start_date TIMESTAMP,
  binding_end_date TIMESTAMP,
  last_order_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_nomor_wa ON users(nomor_wa);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_binding_affiliator_id ON users(binding_affiliator_id);

-- 5. TABEL ORDERS (Data Pesanan)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  affiliator_id UUID REFERENCES affiliators(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'WAITING_CONFIRMATION',
  metode_bayar VARCHAR(50),
  total_produk DECIMAL(15,2) NOT NULL,
  shipping_cost DECIMAL(15,2) DEFAULT 0,
  total_bayar DECIMAL(15,2),
  alamat TEXT NOT NULL,
  nomor_wa VARCHAR(20) NOT NULL,
  catatan TEXT,
  invoice_url VARCHAR(500),
  resi VARCHAR(100),
  shipping_courier VARCHAR(100),
  is_offline BOOLEAN DEFAULT FALSE,
  payment_due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_affiliator_id ON orders(affiliator_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 6. TABEL ORDER_ITEMS (Detail Item dalam Pesanan)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty INT NOT NULL,
  varian VARCHAR(100),
  satuan VARCHAR(50) DEFAULT '100gr',
  harga_satuan DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- 7. TABEL CUSTOMER_BINDING (Tracking Binding Customer ke Affiliator)
CREATE TABLE customer_binding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  affiliator_id UUID NOT NULL REFERENCES affiliators(id) ON DELETE CASCADE,
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_binding_user_id ON customer_binding(user_id);
CREATE INDEX IF NOT EXISTS idx_binding_affiliator_id ON customer_binding(affiliator_id);
CREATE INDEX IF NOT EXISTS idx_binding_status ON customer_binding(status);

-- 8. TABEL WITHDRAWALS (Penarikan Komisi Affiliator)
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliator_id UUID NOT NULL REFERENCES affiliators(id) ON DELETE CASCADE,
  nominal DECIMAL(15,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  bank_name VARCHAR(100),
  bank_account VARCHAR(100),
  account_holder VARCHAR(255),
  bukti_transfer_url VARCHAR(500),
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  paid_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_affiliator_id ON withdrawals(affiliator_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);

-- 9. TABEL AFFILIATOR_PRODUCT_LINKS (Link TikTok per Affiliator per Produk)
CREATE TABLE affiliator_product_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliator_id UUID NOT NULL REFERENCES affiliators(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tiktok_link TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(affiliator_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_apl_affiliator_id ON affiliator_product_links(affiliator_id);
CREATE INDEX IF NOT EXISTS idx_apl_product_id ON affiliator_product_links(product_id);

-- 10. TABEL ACTIVITY_LOGS (Optional)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_admin_id ON activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON activity_logs(created_at DESC);

-- ================================================================
-- STEP 2: ENABLE RLS AND CREATE POLICIES (Allow All for Anon)
-- ================================================================

-- Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);

-- Admins
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on admins" ON admins FOR ALL USING (true) WITH CHECK (true);

-- Affiliators
ALTER TABLE affiliators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on affiliators" ON affiliators FOR ALL USING (true) WITH CHECK (true);

-- Customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true) WITH CHECK (true);

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);

-- Order Items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- Customer Binding
ALTER TABLE customer_binding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on customer_binding" ON customer_binding FOR ALL USING (true) WITH CHECK (true);

-- Withdrawals
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on withdrawals" ON withdrawals FOR ALL USING (true) WITH CHECK (true);

-- Affiliator Product Links
ALTER TABLE affiliator_product_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on affiliator_product_links" ON affiliator_product_links FOR ALL USING (true) WITH CHECK (true);

-- Activity Logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);

-- ================================================================
-- SCHEMA SETUP COMPLETE!
-- ================================================================
