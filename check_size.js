import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'product-images';

async function checkSize() {
  let allFiles = [];
  do {
      const { data: files, error } = await supabase.storage.from(BUCKET_NAME).list('', {
          limit: 1000,
          offset: allFiles.length
      });
      if (error) throw error;
      if (!files || files.length === 0) break;
      
      const validFiles = files.filter(f => f.name !== '.emptyFolderPlaceholder');
      allFiles = allFiles.concat(validFiles);
      if (files.length < 1000) break;
  } while (true);

  const totalBytes = allFiles.reduce((acc, file) => acc + (file.metadata?.size || 0), 0);
  const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
  
  console.log(`STATUS PENYIMPANAN SAAT INI:`);
  console.log(`- Jumlah Gambar: ${allFiles.length} file`);
  console.log(`- Total Ukuran: ${totalMB} MB`);
}

checkSize().catch(console.error);
