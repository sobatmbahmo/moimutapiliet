import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'product-images';

async function cleanupStorage() {
  console.log("Fetching referenced images from database...");
  
  // Get all product images
  const { data: products, error: productsError } = await supabase.from('products').select('image_url');
  if (productsError) throw productsError;
  
  // Get all slider images
  const { data: sliders, error: slidersError } = await supabase.from('app_sliders').select('image_url');
  if (slidersError) throw slidersError;

  const usedUrls = new Set();
  
  products?.forEach(p => {
    if (p.image_url) usedUrls.add(p.image_url);
  });
  
  sliders?.forEach(s => {
    if (s.image_url) usedUrls.add(s.image_url);
  });
  
  console.log(`Found ${usedUrls.size} images referenced in the database.`);

  console.log("Fetching files from storage bucket...");
  
  let allFiles = [];
  
  do {
      const { data: files, error: filesError } = await supabase.storage.from(BUCKET_NAME).list('', {
          limit: 1000,
          offset: allFiles.length
      });
      if (filesError) throw filesError;
      if (!files || files.length === 0) break;
      
      const validFiles = files.filter(f => f.name !== '.emptyFolderPlaceholder');
      allFiles = allFiles.concat(validFiles);
      
      if (files.length < 1000) break;
  } while (true);

  console.log(`Found ${allFiles.length} files in the storage bucket '${BUCKET_NAME}'.`);

  const filesToDelete = [];
  let totalSavedBytes = 0;
  
  const baseUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/`;

  allFiles.forEach(file => {
    const filePublicUrl = `${baseUrl}${file.name}`;
    if (!usedUrls.has(filePublicUrl)) {
      filesToDelete.push(file.name);
      totalSavedBytes += file.metadata?.size || 0;
    }
  });

  console.log(`Found ${filesToDelete.length} orphaned files to delete.`);
  
  if (filesToDelete.length > 0) {
    console.log(`Deleting orphaned files... (Saving approx ${(totalSavedBytes / 1024 / 1024).toFixed(2)} MB of storage)`);
    
    const chunkSize = 100;
    for (let i = 0; i < filesToDelete.length; i += chunkSize) {
      const chunk = filesToDelete.slice(i, i + chunkSize);
      const { data, error } = await supabase.storage.from(BUCKET_NAME).remove(chunk);
      if (error) {
        console.error(`Error deleting chunk:`, error.message);
      } else {
        console.log(`Deleted ${data?.length || 0} files.`);
      }
    }
    console.log("Cleanup complete!");
  } else {
    console.log("No orphaned files found. Storage is already clean.");
  }
}

cleanupStorage().catch(console.error);
