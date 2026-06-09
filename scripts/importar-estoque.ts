/* Re-scrapa todos os produtos pra pegar dados de estoque do JSON-LD.
   Roda: pnpm tsx scripts/importar-estoque.ts */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const STORE_URL = 'https://www.closetdapie.com.br';
const sql = neon(process.env.DATABASE_URL!);

async function buscarUrls(): Promise<string[]> {
  const res = await fetch(`${STORE_URL}/sitemap.xml`);
  const xml = await res.text();
  const isIndex = xml.includes('<sitemapindex');
  if (isIndex) {
    const sitemaps = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const todos: string[] = [];
    for (const sm of sitemaps) {
      try {
        const r = await fetch(sm);
        const x = await r.text();
        const urls = [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => u.includes('/produtos/'));
        todos.push(...urls);
      } catch {}
    }
    return [...new Set(todos)];
  }
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1])
    .filter((u) => u.includes('/produtos/') && !u.endsWith('/produtos/'));
}

type Estoque = {
  productId: string;
  variantesDisponiveis: number;
  variantesTotal: number;
  disponivel: boolean;
};

async function parseEstoque(url: string): Promise<Estoque | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ClosetFinanceiro/1.0' } });
    if (!res.ok) return null;
    const html = await res.text();

    // Product ID
    const pid = html.match(/name=["']add_to_cart["']\s+value=["'](\d+)["']/)?.[1]
      || html.match(/value=["'](\d+)["']\s+name=["']add_to_cart["']/)?.[1]
      || html.match(/data-product-id=["'](\d+)["']/)?.[1];
    if (!pid) return null;

    // Pega todos JSON-LD scripts
    const jsonLdBlocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)]
      .map((m) => m[1]);

    let variantesDisponiveis = 0;
    let variantesTotal = 0;

    for (const block of jsonLdBlocks) {
      try {
        const data = JSON.parse(block);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          // ProductGroup com hasVariant
          if (item.hasVariant && Array.isArray(item.hasVariant)) {
            for (const v of item.hasVariant) {
              variantesTotal++;
              const avail = v.offers?.availability || v.availability || '';
              if (String(avail).toLowerCase().includes('instock')) variantesDisponiveis++;
            }
          }
          // Product direto com offers
          if (item['@type'] === 'Product' && item.offers && !item.hasVariant) {
            variantesTotal++;
            const avail = item.offers.availability || '';
            if (String(avail).toLowerCase().includes('instock')) variantesDisponiveis++;
          }
        }
      } catch {}
    }

    // Fallback: se não achou nada no JSON-LD, busca direto no HTML
    if (variantesTotal === 0) {
      const instock = (html.match(/schema\.org\/InStock/gi) || []).length;
      const outofstock = (html.match(/schema\.org\/OutOfStock/gi) || []).length;
      variantesDisponiveis = instock;
      variantesTotal = instock + outofstock;
    }

    return {
      productId: pid,
      variantesDisponiveis,
      variantesTotal,
      disponivel: variantesDisponiveis > 0,
    };
  } catch {
    return null;
  }
}

async function main() {
  console.log('[estoque] Ajustando schema...');
  await sql`ALTER TABLE produtos_cogs ADD COLUMN IF NOT EXISTS variantes_disponiveis integer DEFAULT 0`;
  await sql`ALTER TABLE produtos_cogs ADD COLUMN IF NOT EXISTS variantes_total integer DEFAULT 0`;
  await sql`ALTER TABLE produtos_cogs ADD COLUMN IF NOT EXISTS disponivel boolean DEFAULT false`;

  console.log('[estoque] Buscando URLs...');
  const urls = await buscarUrls();
  console.log(`[estoque] ${urls.length} produtos`);

  const BATCH = 10;
  let processados = 0, atualizados = 0;
  for (let i = 0; i < urls.length; i += BATCH) {
    const lote = urls.slice(i, i + BATCH);
    const resultados = await Promise.all(lote.map(parseEstoque));
    for (const r of resultados) {
      if (!r) continue;
      await sql`
        UPDATE produtos_cogs
        SET variantes_disponiveis = ${r.variantesDisponiveis},
            variantes_total = ${r.variantesTotal},
            disponivel = ${r.disponivel}
        WHERE nuvemshop_product_id = ${r.productId}
      `;
      atualizados++;
    }
    processados += lote.length;
    if (processados % 100 === 0 || processados >= urls.length) {
      console.log(`[estoque] ${processados}/${urls.length} (${atualizados} atualizados)`);
    }
  }

  const stats = await sql`
    SELECT
      COUNT(*) FILTER (WHERE disponivel = true)::int AS disponiveis,
      COUNT(*) FILTER (WHERE disponivel = false)::int AS indisponiveis
    FROM produtos_cogs
  `;
  console.log('\n[estoque] Resultado:');
  console.log('  Disponíveis:', stats[0].disponiveis);
  console.log('  Indisponíveis:', stats[0].indisponiveis);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
