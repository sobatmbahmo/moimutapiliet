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

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_KEY);

async function list() {
  console.log('🔄 Mengambil data produk...');
  const { data: products, error } = await supabase.from('products').select('id, name, image_url');
  if (error) {
    console.error('❌ Gagal:', error.message);
  } else {
    console.log('\n📋 DAFTAR PRODUK & URL GAMBAR:');
    products.forEach((p, idx) => {
      console.log(`${idx + 1}. [${p.name}] -> ${p.image_url}`);
    });
  }
}

list();
