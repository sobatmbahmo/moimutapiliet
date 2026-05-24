import dns from 'dns';
import pg from 'pg';
const { Client } = pg;

// Atur DNS ke Google DNS agar terhindar dari pemblokiran DNS lokal
dns.setServers(['8.8.8.8', '1.1.1.1']);

const tenant = 'enwngiuiqcnbonhinctl';
const user = `postgres.${tenant}`;
const password = 'y6M57jrzPR1LfRLL';

const awsRegions = [
  'ap-southeast-1', 'ap-southeast-2',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
  'ap-south-1', 'eu-central-1', 'eu-west-1', 'eu-west-2',
  'sa-east-1', 'ca-central-1'
];

const gcpRegions = [
  'asia-southeast1', 'asia-southeast2',
  'us-east1', 'us-east4', 'us-central1', 'us-west1',
  'europe-west3', 'europe-west1', 'europe-west2',
  'southamerica-east1'
];

async function checkDns(host) {
  return new Promise((resolve) => {
    dns.resolve(host, (err, addresses) => {
      if (err) {
        resolve(false);
      } else {
        resolve(addresses && addresses.length > 0);
      }
    });
  });
}

async function runSetup() {
  console.log('🔄 Memulai pencarian host pooler database Supabase Anda...');
  const candidates = [];

  for (const region of awsRegions) {
    candidates.push(`aws-0-${region}.pooler.supabase.com`);
    candidates.push(`aws-1-${region}.pooler.supabase.com`);
  }

  for (const region of gcpRegions) {
    candidates.push(`gcp-0-${region}.pooler.supabase.com`);
    candidates.push(`gcp-1-${region}.pooler.supabase.com`);
  }

  console.log(`📋 Memeriksa DNS untuk ${candidates.length} kandidat regional...`);

  let activeClient = null;
  let activeHost = null;

  for (const host of candidates) {
    const exists = await checkDns(host);
    if (!exists) continue;

    console.log(`📡 Host terdeteksi di DNS: ${host}. Mencoba menghubungkan...`);

    const client = new Client({
      host: host,
      port: 6543,
      user: user,
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log(`✅ BERHASIL TERHUBUNG ke ${host}!`);
      activeClient = client;
      activeHost = host;
      break;
    } catch (err) {
      // Jika tenant salah, pooler akan memberikan error spesifik dengan cepat
      // Kita lewati dan lanjut ke kandidat berikutnya
      await client.end().catch(() => {});
    }
  }

  if (!activeClient) {
    console.error('❌ Gagal terhubung ke pooler regional database Anda. Cek kembali password Anda.');
    process.exit(1);
  }

  try {
    console.log('🔄 Mengonfigurasi RLS & Storage Policies untuk "product-images"...');

    // 1. Buat bucket jika belum ada
    console.log('   -> Memastikan bucket "product-images" terdaftar sebagai publik...');
    await activeClient.query(`
      INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
      VALUES ('product-images', 'product-images', true, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
      ON CONFLICT (id) DO UPDATE SET public = true;
    `);

    // 2. SELECT Policy
    console.log('   -> Membuat kebijakan SELECT publik...');
    await activeClient.query(`
      DROP POLICY IF EXISTS "Allow public select" ON storage.objects;
      CREATE POLICY "Allow public select"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'product-images');
    `);

    // 3. INSERT Policy
    console.log('   -> Membuat kebijakan INSERT publik (Upload)...');
    await activeClient.query(`
      DROP POLICY IF EXISTS "Allow public insert" ON storage.objects;
      CREATE POLICY "Allow public insert"
      ON storage.objects
      FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'product-images');
    `);

    // 4. UPDATE Policy
    console.log('   -> Membuat kebijakan UPDATE publik...');
    await activeClient.query(`
      DROP POLICY IF EXISTS "Allow public update" ON storage.objects;
      CREATE POLICY "Allow public update"
      ON storage.objects
      FOR UPDATE
      TO public
      USING (bucket_id = 'product-images')
      WITH CHECK (bucket_id = 'product-images');
    `);

    // 5. DELETE Policy
    console.log('   -> Membuat kebijakan DELETE publik...');
    await activeClient.query(`
      DROP POLICY IF EXISTS "Allow public delete" ON storage.objects;
      CREATE POLICY "Allow public delete"
      ON storage.objects
      FOR DELETE
      TO public
      USING (bucket_id = 'product-images');
    `);

    console.log('\n🎉 SUKSES BESAR! Seluruh RLS Storage Policy telah berhasil dikonfigurasi langsung ke database Supabase Anda!');
    console.log('👉 Sekarang Anda dapat mencoba mengunggah foto produk langsung dari browser Anda tanpa ada kendala.');
  } catch (err) {
    console.error('❌ Gagal menjalankan query database:', err.message);
  } finally {
    await activeClient.end();
  }
}

runSetup();
