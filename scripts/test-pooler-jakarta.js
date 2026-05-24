import pg from 'pg';
const { Client } = pg;

const host = 'aws-0-ap-southeast-3.pooler.supabase.com';
const user = 'postgres.enwngiuiqcnbonhinctl';
const password = 'y6M57jrzPR1LfRLL';

const client = new Client({
  host: host,
  port: 6543,
  user: user,
  password: password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log(`Connecting to ${host}...`);
    await client.connect();
    console.log('✅ Connected successfully!');
    const res = await client.query('SELECT version()');
    console.log(res.rows[0]);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
