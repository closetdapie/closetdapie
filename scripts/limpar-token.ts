import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`UPDATE configuracoes SET nuvemshop_access_token = NULL WHERE id = 1`;
  console.log('Token limpo. Store ID mantido: 2159344');
}

main();
