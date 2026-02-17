// ================================================================
// SMART MIGRATION - Transform data to match new schema
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

// Transform function - hanya ambil kolom yang dibutuhkan
const transformers = {
  affiliators: (row) => ({
    id: row.id,
    nama: row.nama,
    nomor_wa: row.nomor_wa,
    email: row.email,
    password_hash: row.password_hash,
    plain_password: row.plain_password || null,
    akun_tiktok: row.akun_tiktok || [],
    status: row.status,
    current_balance: row.current_balance || 0,
    total_commission: row.total_commission || 0,
    total_withdrawn: row.total_withdrawn || 0,
    bank_name: row.bank_name || null,
    account_number: row.account_number || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  }),

  orders: (row) => ({
    id: row.id,
    order_number: row.order_number,
    user_id: row.user_id,
    affiliator_id: row.affiliator_id || null,
    status: row.status,
    metode_bayar: row.metode_bayar,
    total_produk: row.total_produk,
    shipping_cost: row.shipping_cost || 0,
    total_bayar: row.total_bayar,
    alamat: row.alamat,
    nomor_wa: row.nomor_wa,
    catatan: row.catatan || null,
    invoice_url: row.invoice_url || null,
    resi: row.resi || null,
    shipping_courier: row.shipping_courier || row.courier_name || null,
    is_offline: row.is_offline || false,
    payment_due_date: row.payment_due_date || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at || null
  }),

  order_items: (row) => ({
    id: row.id,
    order_id: row.order_id,
    product_id: row.product_id,
    qty: row.qty,
    varian: row.varian || null,
    satuan: row.satuan || '100gr',
    harga_satuan: row.harga_satuan,
    subtotal: row.subtotal,
    created_at: row.created_at
  }),

  affiliator_product_links: (row) => ({
    id: row.id,
    affiliator_id: row.affiliator_id,
    product_id: row.product_id,
    tiktok_link: row.tiktok_link || row.tiktok_shop_link || '',
    created_at: row.created_at,
    updated_at: row.updated_at
  })
};

async function clearTable(tableName) {
  console.log(`🗑️  Clearing ${tableName}...`);
  const { error } = await newSupabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) console.log(`   ⚠️  ${error.message}`);
}

async function smartMigrate(tableName) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📦 Table: ${tableName}`);
  console.log('─'.repeat(50));

  // Clear existing
  await clearTable(tableName);

  // Export
  console.log(`📤 Exporting...`);
  const { data, error } = await oldSupabase.from(tableName).select('*');
  if (error) {
    console.error(`❌ Export error: ${error.message}`);
    return { exported: 0, imported: 0 };
  }
  console.log(`   ✅ Found ${data?.length || 0} records`);

  if (!data || data.length === 0) return { exported: 0, imported: 0 };

  // Transform and import
  console.log(`📥 Importing with transform...`);
  let imported = 0;
  const transformer = transformers[tableName];

  for (const row of data) {
    try {
      const transformed = transformer(row);
      const { error: insertError } = await newSupabase.from(tableName).insert(transformed);
      
      if (insertError) {
        console.log(`   ⚠️ ${insertError.message.slice(0, 60)}`);
      } else {
        imported++;
      }
    } catch (e) {
      console.log(`   ⚠️ Transform error: ${e.message}`);
    }
  }

  console.log(`   ✅ Imported ${imported}/${data.length}`);
  return { exported: data.length, imported };
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🔧 SMART MIGRATION - Transform to New Schema');
  console.log('═'.repeat(60));

  const results = {};
  
  // Migrate in order (respecting foreign keys)
  for (const table of ['affiliators', 'orders', 'order_items', 'affiliator_product_links']) {
    results[table] = await smartMigrate(table);
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('═'.repeat(60));
  
  for (const [table, counts] of Object.entries(results)) {
    const status = counts.exported === counts.imported ? '✅' : '⚠️';
    console.log(`${status} ${table}: ${counts.imported}/${counts.exported}`);
  }

  console.log('\n✨ Smart migration completed!');
}

main().catch(console.error);
