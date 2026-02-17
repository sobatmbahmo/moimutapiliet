// ================================================================
// SUPABASE MIGRATION SCRIPT
// Migrate data from old Supabase to new Supabase
// ================================================================

import { createClient } from '@supabase/supabase-js';

// OLD SUPABASE (Source)
const OLD_URL = 'https://sflnecqovkzfnrbsoawo.supabase.co';
const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbG5lY3Fvdmt6Zm5yYnNvYXdvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg4MzQ2NSwiZXhwIjoyMDg2NDU5NDY1fQ.F3wnvHrtCJWno-Zw58gOmlCsxFYHEHdpy-sDppLCWt4';

// NEW SUPABASE (Destination)
const NEW_URL = 'https://enwngiuiqcnbonhinctl.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud25naXVpcWNuYm9uaGluY3RsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg4NTA1OCwiZXhwIjoyMDg1NDYxMDU4fQ.ixJ8M8OuhkVA5vFvCze5q2NYyR4Nhkz0lTDHtu7L8Mw';

// Create clients
const oldSupabase = createClient(OLD_URL, OLD_SERVICE_KEY);
const newSupabase = createClient(NEW_URL, NEW_SERVICE_KEY);

// Tables to migrate (in order due to foreign key dependencies)
const TABLES = [
  'products',       // No dependencies
  'admins',         // No dependencies
  'affiliators',    // No dependencies
  'customers',      // No dependencies
  'users',          // References affiliators (binding_affiliator_id)
  'orders',         // References users, affiliators
  'order_items',    // References orders, products
  'customer_binding', // References users, affiliators
  'withdrawals',    // References affiliators
  'affiliator_product_links' // References affiliators, products
];

async function exportData(tableName) {
  console.log(`📤 Exporting ${tableName}...`);
  const { data, error } = await oldSupabase
    .from(tableName)
    .select('*');
  
  if (error) {
    console.error(`❌ Error exporting ${tableName}:`, error.message);
    return [];
  }
  
  console.log(`   ✅ Found ${data?.length || 0} records`);
  return data || [];
}

async function importData(tableName, data) {
  if (!data || data.length === 0) {
    console.log(`⏭️  Skipping ${tableName} (no data)`);
    return { success: true, count: 0 };
  }

  console.log(`📥 Importing ${data.length} records to ${tableName}...`);
  
  // Insert in batches of 100
  const batchSize = 100;
  let totalInserted = 0;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const { error } = await newSupabase
      .from(tableName)
      .insert(batch);
    
    if (error) {
      console.error(`❌ Error importing batch to ${tableName}:`, error.message);
      // Try inserting one by one to find problematic row
      for (const row of batch) {
        const { error: singleError } = await newSupabase
          .from(tableName)
          .insert(row);
        
        if (singleError) {
          console.error(`   ❌ Failed row:`, JSON.stringify(row).slice(0, 100));
        } else {
          totalInserted++;
        }
      }
    } else {
      totalInserted += batch.length;
    }
  }
  
  console.log(`   ✅ Imported ${totalInserted}/${data.length} records`);
  return { success: true, count: totalInserted };
}

async function migrateAll() {
  console.log('═'.repeat(60));
  console.log('🚀 SUPABASE MIGRATION SCRIPT');
  console.log('═'.repeat(60));
  console.log(`From: ${OLD_URL}`);
  console.log(`To:   ${NEW_URL}`);
  console.log('═'.repeat(60));
  console.log('');

  const results = {};

  for (const table of TABLES) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`📦 Table: ${table}`);
    console.log('─'.repeat(40));
    
    // Export from old
    const data = await exportData(table);
    
    // Import to new
    const result = await importData(table, data);
    results[table] = { exported: data.length, imported: result.count };
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('═'.repeat(60));
  
  for (const [table, counts] of Object.entries(results)) {
    const status = counts.exported === counts.imported ? '✅' : '⚠️';
    console.log(`${status} ${table}: ${counts.imported}/${counts.exported} records`);
  }

  console.log('\n✨ Migration completed!');
}

// Run migration
migrateAll().catch(console.error);
