-- Create table for affiliator-specific product links
-- Each affiliator dapat memiliki custom TikTok affiliate link per produk

CREATE TABLE IF NOT EXISTS affiliator_product_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliator_id UUID NOT NULL REFERENCES affiliators(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tiktok_shop_link TEXT,
  shopee_link TEXT,
  lazada_link TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(affiliator_id, product_id)
);

-- Create index for faster queries
CREATE INDEX idx_affiliator_product_links_affiliator ON affiliator_product_links(affiliator_id);
CREATE INDEX idx_affiliator_product_links_product ON affiliator_product_links(product_id);

-- Disable RLS for now (temporary, like other tables)
ALTER TABLE affiliator_product_links DISABLE ROW LEVEL SECURITY;
