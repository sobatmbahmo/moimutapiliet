-- ================================================================
-- TOKONEMBAHMO DATABASE SCHEMA
-- Setup untuk Supabase
-- ================================================================

-- 0. TABEL PRODUCTS (Data Produk) - HARUS DIBUAT PALING AWAL
CREATE TABLE IF NOT EXISTS products (
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
  product_weight INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);

-- 1. TABEL USERS (Data Pelanggan)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(255) NOT NULL,
  nomor_wa VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  alamat TEXT,
  referral_code VARCHAR(50),
  binding_affiliator_id UUID,
  binding_start_date TIMESTAMP,
  binding_end_date TIMESTAMP,
  last_order_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk pencarian user
CREATE INDEX IF NOT EXISTS idx_users_nomor_wa ON users(nomor_wa);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_binding_affiliator_id ON users(binding_affiliator_id);

-- 2. TABEL AFFILIATORS (Data Afiliator)
CREATE TABLE IF NOT EXISTS affiliators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(255) NOT NULL,
  nomor_wa VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  akun_tiktok TEXT[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending', -- pending, active, suspended, rejected
  current_balance DECIMAL(15,2) DEFAULT 0,
  total_commission DECIMAL(15,2) DEFAULT 0,
  total_withdrawn DECIMAL(15,2) DEFAULT 0,
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk pencarian affiliator
CREATE INDEX IF NOT EXISTS idx_affiliators_nomor_wa ON affiliators(nomor_wa);
CREATE INDEX IF NOT EXISTS idx_affiliators_email ON affiliators(email);
CREATE INDEX IF NOT EXISTS idx_affiliators_status ON affiliators(status);

-- 2.5 TABEL CUSTOMERS (Data Customer untuk Admin Order Manual)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(255) NOT NULL,
  nomor_wa VARCHAR(20) UNIQUE NOT NULL,
  alamat TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk pencarian customer
CREATE INDEX IF NOT EXISTS idx_customers_nomor_wa ON customers(nomor_wa);
CREATE INDEX IF NOT EXISTS idx_customers_nama ON customers(nama);

-- 3. TABEL ORDERS (Data Pesanan)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  affiliator_id UUID REFERENCES affiliators(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'WAITING_CONFIRMATION', -- WAITING_CONFIRMATION, PROCESSED, COMPLETED, EXPIRED, CANCELED
  metode_bayar VARCHAR(50), -- transfer, cod, mixed
  total_produk DECIMAL(15,2) NOT NULL,
  shipping_cost DECIMAL(15,2) DEFAULT 0,
  total_bayar DECIMAL(15,2),
  alamat TEXT NOT NULL,
  nomor_wa VARCHAR(20) NOT NULL,
  catatan TEXT,
  invoice_url VARCHAR(500),
  resi VARCHAR(100),
  is_offline BOOLEAN DEFAULT FALSE, -- untuk order offline
  payment_due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Index untuk order
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_affiliator_id ON orders(affiliator_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 5. TABEL ORDER_ITEMS (Detail Item dalam Pesanan)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty INT NOT NULL,
  varian VARCHAR(100), -- untuk Paket Komplit (GGSA, INL, RHS, etc)
  satuan VARCHAR(50) DEFAULT '100gr', -- satuan produk: 100gr atau Kg
  harga_satuan DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk order items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- 6. TABEL BINDING (Tracking Binding Customer ke Affiliator)
CREATE TABLE IF NOT EXISTS customer_binding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  affiliator_id UUID NOT NULL REFERENCES affiliators(id) ON DELETE CASCADE,
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active', -- active, expired, manual_cancel
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk binding
CREATE INDEX IF NOT EXISTS idx_binding_user_id ON customer_binding(user_id);
CREATE INDEX IF NOT EXISTS idx_binding_affiliator_id ON customer_binding(affiliator_id);
CREATE INDEX IF NOT EXISTS idx_binding_status ON customer_binding(status);

-- 7. TABEL WITHDRAWAL (Penarikan Komisi Affiliator)
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliator_id UUID NOT NULL REFERENCES affiliators(id) ON DELETE CASCADE,
  nominal DECIMAL(15,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, paid
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

-- Index untuk withdrawal
CREATE INDEX IF NOT EXISTS idx_withdrawals_affiliator_id ON withdrawals(affiliator_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);

-- 8. TABEL ADMIN (Data Admin)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(255) NOT NULL,
  nomor_wa VARCHAR(20),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin', -- admin, superadmin
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk admin
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);

-- 9. TABEL AFFILIATOR_PRODUCT_LINKS (Link TikTok per Affiliator per Produk)
CREATE TABLE IF NOT EXISTS affiliator_product_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliator_id UUID NOT NULL REFERENCES affiliators(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tiktok_link VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(affiliator_id, product_id)
);

-- Index untuk affiliator product links
CREATE INDEX IF NOT EXISTS idx_apl_affiliator_id ON affiliator_product_links(affiliator_id);
CREATE INDEX IF NOT EXISTS idx_apl_product_id ON affiliator_product_links(product_id);

-- 10. TABEL ACTIVITY_LOG (Log Aktivitas Admin - Opsional)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50), -- order, product, affiliator, user, withdrawal
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk activity log
CREATE INDEX IF NOT EXISTS idx_logs_admin_id ON activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON activity_logs(created_at DESC);

-- ================================================================
-- SAMPLE DATA (Opsional untuk testing)
-- ================================================================

-- Insert default admin
INSERT INTO admins (nama, email, password_hash, role) 
VALUES ('Mbahmo Admin', 'admin@tokonembahmo.com', 'hashed_password_here', 'superadmin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample affiliator
INSERT INTO affiliators (nama, nomor_wa, email, password_hash, status, akun_tiktok)
VALUES (
  'Raka Afiliator',
  '6281234567890',
  'raka@tokonembahmo.com',
  'hashed_password_here',
  'active',
  ARRAY['@raka_tiktok', '@raka_shop']
)
ON CONFLICT (email) DO NOTHING;

-- ================================================================
-- SETUP SELESAI
-- Gunakan script ini di Supabase SQL Editor untuk membuat schema
-- ================================================================
