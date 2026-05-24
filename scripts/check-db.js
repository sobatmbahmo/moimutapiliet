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

async function check() {
  console.log('🔄 Menghubungkan ke Supabase...');
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (error) {
    console.error('❌ Gagal mengakses tabel "products":', error.message);
    if (error.message.includes('relation "public.products" does not exist')) {
      console.log('👉 Tabel "products" belum ada di database Supabase Anda.');
    }
  } else {
    console.log('✅ Koneksi sukses! Tabel "products" ditemukan.');
    console.log('📋 Contoh Data:', data);
  }
}

check();
