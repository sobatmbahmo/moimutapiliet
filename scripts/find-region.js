import pg from 'pg';
const { Client } = pg;

const tenant = 'enwngiuiqcnbonhinctl';
const user = `postgres.${tenant}`;
const password = 'y6M57jrzPR1LfRLL';

const regions = [
  'ap-southeast-1', // Singapore
  'us-east-1',      // N. Virginia
  'us-east-2',      // Ohio
  'us-west-1',      // N. California
  'us-west-2',      // Oregon
  'ap-northeast-1', // Tokyo
  'ap-northeast-2', // Seoul
  'ap-south-1',      // Mumbai
  'ap-southeast-2', // Sydney
  'eu-central-1',   // Frankfurt
  'eu-west-1',      // Ireland
  'eu-west-2',      // London
  'sa-east-1'       // Sao Paulo
];

async function findRegion() {
  console.log('🔄 Mencari region Supabase Anda...');
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const client = new Client({
      host: host,
      port: 6543,
      user: user,
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });

    try {
      await client.connect();
      console.log(`\n🎉 KETEMU! Region database Anda adalah: "${region}"`);
      console.log(`👉 Host: ${host}`);
      await client.end();
      return region;
    } catch (err) {
      if (err.message.includes('tenant/user') && err.message.includes('not found')) {
        // Ini berarti pooler menolak karena region salah (cepat saji)
        process.stdout.write(`.`);
      } else {
        console.log(`\n⚠️ Error lain di ${region}:`, err.message);
      }
    }
  }
  console.log('\n❌ Region tidak ditemukan di daftar default.');
  return null;
}

findRegion();
