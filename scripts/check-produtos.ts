import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const total = await sql`SELECT COUNT(*)::int as c FROM produtos_cogs`;
  console.log('Total produtos:', total[0].c);

  const semCogs = await sql`SELECT COUNT(*)::int as c FROM produtos_cogs WHERE custo_unitario = 0`;
  console.log('Sem COGS:', semCogs[0].c);

  console.log('\nMais caros:');
  const top = await sql`SELECT nome, preco_venda FROM produtos_cogs WHERE preco_venda IS NOT NULL ORDER BY preco_venda DESC LIMIT 5`;
  top.forEach((r) => console.log(' -', r.nome, '| R$', r.preco_venda));

  console.log('\nMais baratos:');
  const bot = await sql`SELECT nome, preco_venda FROM produtos_cogs WHERE preco_venda IS NOT NULL AND preco_venda > 0 ORDER BY preco_venda ASC LIMIT 5`;
  bot.forEach((r) => console.log(' -', r.nome, '| R$', r.preco_venda));
}

main();
