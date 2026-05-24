import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:y6M57jrzPR1LfRLL@db.enwngiuiqcnbonhinctl.supabase.co:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function setup() {
  try {
    console.log('🔄 Menghubungkan ke database PostgreSQL Supabase Anda...');
    await client.connect();
    console.log('✅ Berhasil terhubung ke database!');

    console.log('🔄 Mengaktifkan RLS dan membuat kebijakan Storage untuk "product-images"...');

    // 1. Pastikan bucket "product-images" ada di tabel storage.buckets
    console.log('   -> Memeriksa bucket "product-images"...');
    await client.query(`
      INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
      VALUES ('product-images', 'product-images', true, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
      ON CONFLICT (id) DO UPDATE SET public = true;
    `);
    console.log('   ✅ Bucket "product-images" siap.');

    // 2. Buat policy SELECT (jika belum ada)
    console.log('   -> Membuat kebijakan SELECT...');
    await client.query(`
      DROP POLICY IF EXISTS "Allow public select" ON storage.objects;
      CREATE POLICY "Allow public select"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'product-images');
    `);

    // 3. Buat policy INSERT (jika belum ada)
    console.log('   -> Membuat kebijakan INSERT...');
    await client.query(`
      DROP POLICY IF EXISTS "Allow public insert" ON storage.objects;
      CREATE POLICY "Allow public insert"
      ON storage.objects
      FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'product-images');
    `);

    // 4. Buat policy UPDATE (jika belum ada)
    console.log('   -> Membuat kebijakan UPDATE...');
    await client.query(`
      DROP POLICY IF EXISTS "Allow public update" ON storage.objects;
      CREATE POLICY "Allow public update"
      ON storage.objects
      FOR UPDATE
      TO public
      USING (bucket_id = 'product-images')
      WITH CHECK (bucket_id = 'product-images');
    `);

    // 5. Buat policy DELETE (jika belum ada)
    console.log('   -> Membuat kebijakan DELETE...');
    await client.query(`
      DROP POLICY IF EXISTS "Allow public delete" ON storage.objects;
      CREATE POLICY "Allow public delete"
      ON storage.objects
      FOR DELETE
      TO public
      USING (bucket_id = 'product-images');
    `);

    console.log('🎉 Sukses! Semua RLS policy untuk "product-images" berhasil dibuat di database Supabase Anda.');
  } catch (err) {
    console.error('❌ Terjadi kesalahan:', err.message);
  } finally {
    await client.end();
  }
}

setup();
