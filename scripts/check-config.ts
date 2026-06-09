import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const [c] = await sql`SELECT nuvemshop_store_id, nuvemshop_access_token FROM configuracoes WHERE id = 1`;
  console.log('store_id:', JSON.stringify(c.nuvemshop_store_id));
  console.log('access_token:', JSON.stringify(c.nuvemshop_access_token));
}

main();
