/* POST /api/import-produtos — re-sincroniza catálogo da Nuvemshop (público).
   Roda em background na máquina via script local; aqui é versão API leve. */

import { NextResponse } from 'next/server';
import { db, produtosCogs } from '@/db';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

const STORE_URL = 'https://www.closetdapie.com.br';

export const maxDuration = 60;

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

async function parseProduto(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();
    const pid = html.match(/name=["']add_to_cart["']\s+value=["'](\d+)["']/)?.[1]
      || html.match(/value=["'](\d+)["']\s+name=["']add_to_cart["']/)?.[1]
      || html.match(/data-product-id=["'](\d+)["']/)?.[1]
      || html.match(/"product"\s*:\s*\{[^}]*"id"\s*:\s*(\d+)/)?.[1];
    if (!pid) return null;
    const nome = (html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] || html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/)?.[1] || '').replace(/\s*-\s*comprar online\s*$/i, '').trim();
    const precoRaw = html.match(/<meta\s+itemprop=["']price["']\s+content=["']([\d.]+)["']/)?.[1] || html.match(/"price"\s*:\s*"([\d.]+)"/)?.[1];
    const preco = precoRaw ? parseFloat(precoRaw) : null;
    return { productId: pid, nome, preco };
  } catch { return null; }
}

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 });

  const urls = await buscarUrls();
  let inseridos = 0, atualizados = 0;
  const BATCH = 8;
  for (let i = 0; i < urls.length; i += BATCH) {
    const lote = urls.slice(i, i + BATCH);
    const resultados = await Promise.all(lote.map(parseProduto));
    for (const p of resultados) {
      if (!p) continue;
      const exist = await db.select({ id: produtosCogs.id }).from(produtosCogs).where(eq(produtosCogs.nuvemshopProductId, p.productId)).limit(1);
      if (exist.length > 0) {
        await db.update(produtosCogs).set({ nome: p.nome, precoVenda: p.preco != null ? String(p.preco) : null, atualizadoEm: new Date() }).where(eq(produtosCogs.id, exist[0].id));
        atualizados++;
      } else {
        await db.insert(produtosCogs).values({
          nuvemshopProductId: p.productId,
          nome: p.nome,
          custoUnitario: '0',
          precoVenda: p.preco != null ? String(p.preco) : null,
        });
        inseridos++;
      }
    }
  }
  return NextResponse.json({ ok: true, total: urls.length, inseridos, atualizados });
}
