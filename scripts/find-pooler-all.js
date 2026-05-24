import dns from 'dns';
import pg from 'pg';
const { Client } = pg;

const tenant = 'enwngiuiqcnbonhinctl';
const user = `postgres.${tenant}`;
const password = 'y6M57jrzPR1LfRLL';

const awsRegions = [
  'ap-southeast-1', 'ap-southeast-2', 'ap-southeast-3',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
  'ap-south-1', 'eu-central-1', 'eu-west-1', 'eu-west-2',
  'eu-west-3', 'sa-east-1', 'ca-central-1'
];

const gcpRegions = [
  'asia-southeast1', 'asia-southeast2',
  'us-east1', 'us-east4', 'us-central1', 'us-west1',
  'europe-west3', 'europe-west1', 'europe-west2',
  'europe-west9', 'southamerica-east1'
];

async function checkDns(host) {
  return new Promise((resolve) => {
    dns.resolve(host, (err, addresses) => {
      if (err) {
        resolve(false);
      } else {
        resolve(addresses && addresses.length > 0);
      }
    });
  });
}

async function findPooler() {
  console.log('🔄 Mencari host pooler yang valid di DNS...');
  const candidates = [];

  // Generate AWS hosts
  for (const region of awsRegions) {
    candidates.push(`aws-0-${region}.pooler.supabase.com`);
    candidates.push(`aws-1-${region}.pooler.supabase.com`);
  }

  // Generate GCP hosts
  for (const region of gcpRegions) {
    candidates.push(`gcp-0-${region}.pooler.supabase.com`);
    candidates.push(`gcp-1-${region}.pooler.supabase.com`);
  }

  console.log(`📋 Memeriksa ${candidates.length} kandidat DNS...`);

  let foundHost = null;
  for (const host of candidates) {
    const exists = await checkDns(host);
    if (exists) {
      console.log(`✨ Host aktif di DNS: ${host}`);
      
      // Coba koneksi Postgres
      const client = new Client({
        host: host,
        port: 6543,
        user: user,
        password: password,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      });

      try {
        await client.connect();
        console.log(`\n🎉 KONEKSI BERHASIL!`);
        console.log(`   Host: ${host}`);
        foundHost = host;
        await client.end();
        break; // Stop jika sudah ketemu yang sukses connect
      } catch (err) {
        console.log(`   ❌ Gagal koneksi ke ${host}: ${err.message}`);
      }
    }
  }

  if (foundHost) {
    return foundHost;
  } else {
    console.log('\n❌ Tidak ada host pooler yang berhasil terhubung.');
    return null;
  }
}

findPooler();
