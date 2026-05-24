import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Baca .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value;
  }
});

// Gunakan Service Role Key jika ada, agar bisa bypass RLS jika diperlukan
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_KEY;
const supabase = createClient(env.VITE_SUPABASE_URL, supabaseKey);

const OLD_ID = 'qqyggahvwtysefbmpoqr';
const NEW_ID = 'enwngiuiqcnbonhinctl';

async function updateUrls() {
  console.log('🔄 Mengambil data produk...');
  const { data: products, error } = await supabase.from('products').select('id, name, image_url');
  if (error) {
    console.error('❌ Gagal mengambil data produk:', error.message);
    process.exit(1);
  }

  console.log(`📋 Memproses ${products.length} produk...`);
  
  let successCount = 0;
  for (const p of products) {
    if (p.image_url && p.image_url.includes(OLD_ID)) {
      const newUrl = p.image_url.replace(OLD_ID, NEW_ID);
      console.log(`🔄 Mengubah URL untuk [${p.name}]:`);
      console.log(`   Sebelum: ${p.image_url}`);
      console.log(`   Sesudah: ${newUrl}`);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: newUrl })
        .eq('id', p.id);

      if (updateError) {
        console.error(`   ❌ Gagal:`, updateError.message);
      } else {
        console.log(`   ✅ Berhasil diperbarui!`);
        successCount++;
      }
    }
  }

  console.log(`\n🏁 Selesai! Berhasil memperbarui ${successCount} URL produk di database baru.`);
}

updateUrls();
