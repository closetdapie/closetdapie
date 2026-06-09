/* Importa todos os produtos da Nuvemshop (closetdapie.com.br) pro produtos_cogs.
   Roda 1x: pnpm tsx scripts/importar-produtos.ts */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

const STORE_URL = 'https://www.closetdapie.com.br';
const sql = neon(process.env.DATABASE_URL!);

type Produto = {
  slug: string;
  productId: string;
  nome: string;
  precoVenda: number | null;
  imagem: string | null;
};

async function buscarSitemap(): Promise<string[]> {
  const res = await fetch(`${STORE_URL}/sitemap.xml`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const produtos = locs.filter((u) => u.includes('/produtos/') && !u.endsWith('/produtos/'));
  return produtos;
}

async function buscarSitemapSecundario(url: string): Promise<string[]> {
  try {
    const res = await fetch(url);
    const xml = await res.text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => u.includes('/produtos/'));
  } catch { return []; }
}

async function buscarUrlsTotal(): Promise<string[]> {
  // Sitemap principal pode apontar pra sitemaps menores
  const res = await fetch(`${STORE_URL}/sitemap.xml`);
  const xml = await res.text();
  const isIndex = xml.includes('<sitemapindex');
  if (isIndex) {
    const sitemaps = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const todos: string[] = [];
    for (const sm of sitemaps) {
      const urls = await buscarSitemapSecundario(sm);
      todos.push(...urls);
    }
    return [...new Set(todos)];
  }
  // Sitemap simples
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1])
    .filter((u) => u.includes('/produtos/') && !u.endsWith('/produtos/'));
}

function extrairSlug(url: string): string {
  const m = url.match(/\/produtos\/([^/?#]+)/);
  return m ? m[1] : '';
}

async function parseProduto(url: string): Promise<Produto | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ClosetFinanceiro/1.0' } });
    if (!res.ok) return null;
    const html = await res.text();

    // Product ID: input name="add_to_cart" value="XXX"
    let productId = '';
    const pid1 = html.match(/name=["']add_to_cart["']\s+value=["'](\d+)["']/);
    const pid2 = html.match(/value=["'](\d+)["']\s+name=["']add_to_cart["']/);
    const pid3 = html.match(/data-product-id=["'](\d+)["']/);
    const pid4 = html.match(/"product"\s*:\s*\{[^}]*"id"\s*:\s*(\d+)/);
    productId = pid1?.[1] || pid2?.[1] || pid3?.[1] || pid4?.[1] || '';
    if (!productId) return null;

    // Nome: h1 ou meta og:title
    let nome = '';
    const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const ogt = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/);
    nome = (h1?.[1] || ogt?.[1] || '').replace(/\s*-\s*comprar online\s*$/i, '').trim();

    // Preço: meta itemprop="price" ou JSON-LD ou data-product-price
    let preco: number | null = null;
    const p1 = html.match(/<meta\s+itemprop=["']price["']\s+content=["']([\d.]+)["']/);
    const p2 = html.match(/"price"\s*:\s*"([\d.]+)"/);
    const p3 = html.match(/data-product-price=["']([\d.]+)["']/);
    const raw = p1?.[1] || p2?.[1] || p3?.[1];
    if (raw) preco = parseFloat(raw);

    // Imagem: og:image
    let imagem: string | null = null;
    const img = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/);
    if (img) imagem = img[1];

    return {
      slug: extrairSlug(url),
      productId,
      nome,
      precoVenda: preco,
      imagem,
    };
  } catch (e) {
    console.error(`Erro ao buscar ${url}:`, (e as Error).message);
    return null;
  }
}

async function importar() {
  console.log('[importar] Buscando sitemap...');
  const urls = await buscarUrlsTotal();
  console.log(`[importar] ${urls.length} URLs de produtos encontradas`);

  if (urls.length === 0) {
    console.log('[importar] Nenhuma URL. Saindo.');
    return;
  }

  const BATCH = 8;
  const produtos: Produto[] = [];
  let processados = 0;

  for (let i = 0; i < urls.length; i += BATCH) {
    const lote = urls.slice(i, i + BATCH);
    const resultados = await Promise.all(lote.map(parseProduto));
    for (const p of resultados) {
      if (p) produtos.push(p);
    }
    processados += lote.length;
    console.log(`[importar] ${processados}/${urls.length} processados (${produtos.length} válidos)`);
  }

  console.log(`[importar] Inserindo ${produtos.length} produtos no banco...`);

  let inseridos = 0;
  let atualizados = 0;
  for (const p of produtos) {
    // upsert por nuvemshop_product_id
    const existentes = await sql`
      SELECT id FROM produtos_cogs WHERE nuvemshop_product_id = ${p.productId} LIMIT 1
    `;
    if (existentes.length > 0) {
      await sql`
        UPDATE produtos_cogs
        SET nome = ${p.nome}, preco_venda = ${p.precoVenda}, atualizado_em = NOW()
        WHERE nuvemshop_product_id = ${p.productId}
      `;
      atualizados++;
    } else {
      await sql`
        INSERT INTO produtos_cogs (id, nuvemshop_product_id, nome, custo_unitario, preco_venda)
        VALUES (gen_random_uuid(), ${p.productId}, ${p.nome}, 0, ${p.precoVenda})
      `;
      inseridos++;
    }
  }

  console.log(`[importar] DONE — ${inseridos} novos, ${atualizados} atualizados`);
}

importar().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
