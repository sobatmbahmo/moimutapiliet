-- ================================================================
-- FIX SCHEMA - Tambah kolom yang kurang (Batch 2)
-- ================================================================

-- Orders: tambah kolom customers (kemungkinan JSONB atau TEXT)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customers TEXT;

-- Affiliator Product Links: tambah kolom tiktok_shop_link
ALTER TABLE affiliator_product_links ADD COLUMN IF NOT EXISTS tiktok_shop_link TEXT;

-- ================================================================
-- DONE
-- ================================================================
