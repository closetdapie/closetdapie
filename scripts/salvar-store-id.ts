import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // garante linha de configuração
  await sql`
    INSERT INTO configuracoes (id, nuvemshop_store_id)
    VALUES (1, '2159344')
    ON CONFLICT (id) DO UPDATE SET nuvemshop_store_id = '2159344', atualizado_em = NOW()
  `;
  const [c] = await sql`SELECT nuvemshop_store_id, nuvemshop_access_token FROM configuracoes WHERE id = 1`;
  console.log('Store ID salvo:', c.nuvemshop_store_id);
  console.log('Access token:', c.nuvemshop_access_token ? '✓ definido' : '✗ FALTANDO');
}

main();
