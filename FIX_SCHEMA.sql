-- ================================================================
-- FIX SCHEMA - Tambah kolom yang kurang
-- ================================================================

-- Affiliators: tambah kolom username
ALTER TABLE affiliators ADD COLUMN IF NOT EXISTS username VARCHAR(100);

-- Orders: tambah kolom courier_name (rename dari shipping_courier)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);

-- Affiliator Product Links: tambah kolom lazada_link dan shopee_link
ALTER TABLE affiliator_product_links ADD COLUMN IF NOT EXISTS lazada_link TEXT;
ALTER TABLE affiliator_product_links ADD COLUMN IF NOT EXISTS shopee_link TEXT;

-- ================================================================
-- DONE
-- ================================================================
