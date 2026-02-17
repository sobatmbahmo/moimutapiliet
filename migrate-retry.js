// ================================================================
// SUPABASE MIGRATION SCRIPT - RETRY FAILED TABLES
// ================================================================

import { createClient } from '@supabase/supabase-js';

// OLD SUPABASE (Source)
const OLD_URL = 'https://sflnecqovkzfnrbsoawo.supabase.co';
const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbG5lY3Fvdmt6Zm5yYnNvYXdvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg4MzQ2NSwiZXhwIjoyMDg2NDU5NDY1fQ.F3wnvHrtCJWno-Zw58gOmlCsxFYHEHdpy-sDppLCWt4';

// NEW SUPABASE (Destination)
const NEW_URL = 'https://enwngiuiqcnbonhinctl.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud25naXVpcWNuYm9uaGluY3RsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg4NTA1OCwiZXhwIjoyMDg1NDYxMDU4fQ.ixJ8M8OuhkVA5vFvCze5q2NYyR4Nhkz0lTDHtu7L8Mw';

const oldSupabase = createClient(OLD_URL, OLD_SERVICE_KEY);
const newSupabase = createClient(NEW_URL, NEW_SERVICE_KEY);

// Tables yang gagal sebelumnya (dalam urutan foreign key)
const FAILED_TABLES = [
  'affiliators',
  'orders', 
  'order_items',
  'affiliator_product_links'
];

async function clearTable(tableName) {
  console.log(`🗑️  Clearing ${tableName}...`);
  const { error } = await newSupabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.log(`   ⚠️  Could not clear (might be empty): ${error.message}`);
  }
}

async function exportData(tableName) {
  console.log(`📤 Exporting ${tableName}...`);
  const { data, error } = await oldSupabase.from(tableName).select('*');
  
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
  
  let totalInserted = 0;
  
  for (const row of data) {
    const { error } = await newSupabase.from(tableName).insert(row);
    
    if (error) {
      console.log(`   ⚠️ Row failed: ${error.message.slice(0, 80)}`);
    } else {
      totalInserted++;
    }
  }
  
  console.log(`   ✅ Imported ${totalInserted}/${data.length} records`);
  return { success: true, count: totalInserted };
}

async function retryMigration() {
  console.log('═'.repeat(60));
  console.log('🔄 RETRY MIGRATION - FAILED TABLES');
  console.log('═'.repeat(60));
  console.log('');

  const results = {};

  for (const table of FAILED_TABLES) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`📦 Table: ${table}`);
    console.log('─'.repeat(40));
    
    // Clear existing data first
    await clearTable(table);
    
    // Export from old
    const data = await exportData(table);
    
    // Import to new
    const result = await importData(table, data);
    results[table] = { exported: data.length, imported: result.count };
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RETRY SUMMARY');
  console.log('═'.repeat(60));
  
  for (const [table, counts] of Object.entries(results)) {
    const status = counts.exported === counts.imported ? '✅' : '⚠️';
    console.log(`${status} ${table}: ${counts.imported}/${counts.exported} records`);
  }

  console.log('\n✨ Retry completed!');
}

retryMigration().catch(console.error);
