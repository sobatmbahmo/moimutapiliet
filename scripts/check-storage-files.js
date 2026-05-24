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

async function checkStorage() {
  console.log('🔄 Memeriksa isi bucket "product-images" di project baru...');
  const { data: files, error } = await supabase.storage.from('product-images').list();
  if (error) {
    console.error('❌ Gagal memeriksa storage:', error.message);
  } else {
    console.log(`✅ Ditemukan ${files.length} file di bucket "product-images" pada project baru!`);
    if (files.length > 0) {
      console.log('📋 Contoh file:', files.slice(0, 5));
    }
  }
}

checkStorage();
