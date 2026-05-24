import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const hosts = [
  'aws-0-ap-southeast-1.pooler.supabase.com',
  'aws-1-ap-southeast-1.pooler.supabase.com',
  'aws-2-ap-southeast-1.pooler.supabase.com',
  'aws-3-ap-southeast-1.pooler.supabase.com',
  'aws-0-ap-southeast-3.pooler.supabase.com',
  'aws-1-ap-southeast-3.pooler.supabase.com',
  'aws-2-ap-southeast-3.pooler.supabase.com'
];

async function check() {
  for (const host of hosts) {
    dns.resolve(host, (err, addresses) => {
      if (err) {
        console.log(`❌ ${host} -> Gagal: ${err.message}`);
      } else {
        console.log(`✅ ${host} -> IP:`, addresses);
      }
    });
  }
}

check();
