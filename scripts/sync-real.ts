/* Sincroniza pedidos REAIS de junho via API Nuvemshop.
   Roda: pnpm tsx scripts/sync-real.ts */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

const STORE_ID = '2159344';
const TOKEN = '63808a2039731d1ad28792050e6d95ad50bd1ed4';
const BASE = 'https://api.tiendanube.com/v1';
const UA = 'ClosetFinanceiro/1.0 (closetdapie@gmail.com)';

type NSOrder = {
  id: number;
  number: number;
  status: string;
  payment_status: string;
  payment_details?: { method?: string };
  gateway?: string;
  gateway_name?: string;
  installments?: number;
  contact_email?: string;
  contact_name?: string;
  customer?: { name?: string; email?: string };
  created_at: string;
  subtotal: string;
  discount: string;
  shipping_cost_customer: string;
  total: string;
  products: Array<{
    product_id: number;
    variant_id: number;
    name: string;
    sku?: string;
    quantity: number;
    price: string;
  }>;
};

function mapearMeio(o: NSOrder): 'pix' | 'credit_card' | 'debit_card' | 'boleto' | 'cash' {
  const m = (o.payment_details?.method || o.gateway_name || o.gateway || '').toLowerCase();
  if (m.includes('pix')) return 'pix';
  if (m.includes('boleto') || m.includes('ticket')) return 'boleto';
  if (m.includes('debit')) return 'debit_card';
  if (m.includes('cash') || m.includes('espécie') || m.includes('especie') || m.includes('dinheiro')) return 'cash';
  return 'credit_card'; // default
}

function mapearGateway(o: NSOrder): 'nuvem_pago' | 'mercado_pago' | 'cash' {
  const g = (o.gateway || o.gateway_name || '').toLowerCase();
  if (g.includes('cash') || g.includes('manual') || g.includes('offline')) return 'cash';
  if (g.includes('mercado')) return 'mercado_pago';
  if (g.includes('nuvem') || g.includes('np') || g.includes('tn-')) return 'nuvem_pago';
  // sem gateway preenchido — assume cash
  return 'cash';
}

function calcTaxa(total: number, gateway: string, meio: string): number {
  if (gateway === 'cash') return 0;
  if (gateway === 'nuvem_pago') {
    if (meio === 'pix') return Math.round(total * 0.99) / 100;
    if (meio === 'boleto') return 2.39;
    return Math.round(total * 2.99) / 100 + 0.35;
  }
  if (gateway === 'mercado_pago') {
    if (meio === 'pix') return Math.round(total * 0.99) / 100;
    if (meio === 'boleto') return 2.39;
    return Math.round(total * 4.49) / 100 + 0.35;
  }
  return 0;
}

async function fetchPagina(pagina: number, since: Date): Promise<NSOrder[]> {
  const params = new URLSearchParams({
    per_page: '200',
    page: String(pagina),
    created_at_min: since.toISOString(),
  });
  const url = `${BASE}/${STORE_ID}/orders?${params}`;
  const res = await fetch(url, {
    headers: {
      'Authentication': `bearer ${TOKEN}`,
      'User-Agent': UA,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

async function main() {
  // 1) Salva token no banco
  console.log('[sync] Salvando credenciais...');
  await sql`
    INSERT INTO configuracoes (id, nuvemshop_store_id, nuvemshop_access_token)
    VALUES (1, ${STORE_ID}, ${TOKEN})
    ON CONFLICT (id) DO UPDATE SET nuvemshop_store_id = ${STORE_ID}, nuvemshop_access_token = ${TOKEN}, atualizado_em = NOW()
  `;

  // 2) Limpa pedidos antigos (placeholder)
  console.log('[sync] Limpando pedidos antigos...');
  await sql`DELETE FROM pedidos`;
  await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS gateway text`;

  // 3) Busca config pra cálculo
  const [cfg] = await sql`SELECT taxa_nuvemshop_percent, custo_embalagem, custo_frete_medio, limite_frete_gratis FROM configuracoes WHERE id = 1`;
  const taxaNuvemPercent = Number(cfg?.taxa_nuvemshop_percent ?? 0.7);
  const custoEmbalagem = Number(cfg?.custo_embalagem ?? 3);
  const custoFreteMedio = Number(cfg?.custo_frete_medio ?? 25);

  // 4) Mapa de COGS
  const cogsRows = await sql`SELECT nuvemshop_product_id, custo_unitario FROM produtos_cogs WHERE nuvemshop_product_id IS NOT NULL` as any[];
  const cogsMap = new Map<string, number>();
  for (const r of cogsRows) cogsMap.set(String(r.nuvemshop_product_id), Number(r.custo_unitario));

  // 5) Puxa pedidos desde 01/06
  const since = new Date(2026, 5, 1, 0, 0, 0);
  console.log(`[sync] Puxando pedidos desde ${since.toISOString()}`);

  let pagina = 1, todos: NSOrder[] = [];
  while (true) {
    console.log(`[sync] Página ${pagina}...`);
    const lote = await fetchPagina(pagina, since);
    if (lote.length === 0) break;
    todos.push(...lote);
    if (lote.length < 200) break;
    pagina++;
  }
  console.log(`[sync] ${todos.length} pedidos retornados da API`);

  // 6) Insere
  let salvos = 0;
  for (const o of todos) {
    const meio = mapearMeio(o);
    const gateway = mapearGateway(o);
    const total = Number(o.total);
    const cancelado = o.payment_status === 'voided' || o.payment_status === 'refunded';

    const taxaGw = cancelado ? 0 : calcTaxa(total, gateway, meio);
    const taxaNs = cancelado ? 0 : Math.round(total * taxaNuvemPercent) / 100;
    const cogs = cancelado ? 0 : o.products.reduce((s, p) => s + (cogsMap.get(String(p.product_id)) ?? 0) * p.quantity, 0);
    const embalagem = cancelado ? 0 : custoEmbalagem;
    const frete = cancelado || gateway === 'cash' ? 0 : custoFreteMedio;
    const lucro = total - taxaGw - taxaNs - cogs - embalagem - frete;
    const margem = total > 0 ? (lucro / total) * 100 : 0;

    const itens = o.products.map((p) => ({
      nuvemshopProductId: String(p.product_id),
      nome: p.name,
      sku: p.sku,
      quantidade: p.quantity,
      precoUnitario: Number(p.price),
    }));

    await sql`
      INSERT INTO pedidos (
        id, numero, cliente_nome, cliente_email, status, data_pedido,
        subtotal, desconto, frete_cobrado, total, meio_pagamento, parcelas, gateway,
        taxa_gateway, taxa_nuvemshop, cogs_total, custo_embalagem, custo_frete,
        lucro_liquido, margem_percent, itens, recalculado_em, sincronizado_em
      ) VALUES (
        ${String(o.id)}, ${o.number}, ${o.customer?.name || o.contact_name || null}, ${o.customer?.email || o.contact_email || null},
        ${o.payment_status}, ${o.created_at},
        ${o.subtotal}, ${o.discount}, ${o.shipping_cost_customer}, ${o.total},
        ${meio}, ${o.installments || null}, ${gateway},
        ${taxaGw.toFixed(2)}, ${taxaNs.toFixed(2)}, ${cogs.toFixed(2)}, ${embalagem.toFixed(2)}, ${frete.toFixed(2)},
        ${lucro.toFixed(2)}, ${margem.toFixed(2)}, ${JSON.stringify(itens)}::jsonb,
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status, total = EXCLUDED.total,
        meio_pagamento = EXCLUDED.meio_pagamento, gateway = EXCLUDED.gateway,
        taxa_gateway = EXCLUDED.taxa_gateway, taxa_nuvemshop = EXCLUDED.taxa_nuvemshop,
        cogs_total = EXCLUDED.cogs_total, lucro_liquido = EXCLUDED.lucro_liquido,
        margem_percent = EXCLUDED.margem_percent, itens = EXCLUDED.itens,
        sincronizado_em = NOW()
    `;
    salvos++;
  }
  console.log(`[sync] ${salvos} pedidos salvos`);

  // 7) Stats finais
  const stats = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'paid')::int AS pagos,
      COUNT(*) FILTER (WHERE status IN ('voided', 'refunded'))::int AS cancelados,
      COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0)::numeric AS receita,
      COALESCE(SUM(lucro_liquido) FILTER (WHERE status = 'paid'), 0)::numeric AS lucro,
      COALESCE(AVG(total) FILTER (WHERE status = 'paid'), 0)::numeric AS ticket
    FROM pedidos
  `;
  console.log('\n[sync] === Junho 01 → hoje ===');
  console.log(`  Total: ${stats[0].total}`);
  console.log(`  Pagos: ${stats[0].pagos}`);
  console.log(`  Cancelados: ${stats[0].cancelados}`);
  console.log(`  Receita: R$ ${Number(stats[0].receita).toFixed(2)}`);
  console.log(`  Lucro (COGS=0): R$ ${Number(stats[0].lucro).toFixed(2)}`);
  console.log(`  Ticket médio: R$ ${Number(stats[0].ticket).toFixed(2)}`);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
