/* Verifica se nosso banco bate com a Nuvemshop pro mesmo período. */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const sql = neon(process.env.DATABASE_URL!);
const STORE_ID = '2159344';
const TOKEN = '63808a2039731d1ad28792050e6d95ad50bd1ed4';
const BASE = 'https://api.tiendanube.com/v1';
const TZ = 'America/Sao_Paulo';

async function fetchPedidosNS(since: Date) {
  const todos: any[] = [];
  let page = 1;
  while (true) {
    const params = new URLSearchParams({
      per_page: '200',
      page: String(page),
      created_at_min: since.toISOString(),
    });
    const res = await fetch(`${BASE}/${STORE_ID}/orders?${params}`, {
      headers: {
        'Authentication': `bearer ${TOKEN}`,
        'User-Agent': 'ClosetFinanceiro/1.0',
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const lote = await res.json();
    if (!lote.length) break;
    todos.push(...lote);
    if (lote.length < 200) break;
    page++;
  }
  return todos;
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
}

function diaBR(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, 'yyyy-MM-dd');
}

async function main() {
  const inicio = new Date('2026-06-01T03:00:00.000Z');

  console.log('========================================');
  console.log('  VERIFICAÇÃO NUVEMSHOP × SISTEMA (TZ BR)');
  console.log('========================================\n');

  const nsPedidos = await fetchPedidosNS(inicio);
  const nsPagos = nsPedidos.filter((p) => p.payment_status === 'paid');
  const nsCancel = nsPedidos.filter((p) => ['voided', 'refunded', 'cancelled'].includes(p.payment_status));
  const nsReceita = nsPagos.reduce((s, p) => s + Number(p.total), 0);

  console.log(`Nuvemshop: ${nsPedidos.length} pedidos (${nsPagos.length} pagos, ${nsCancel.length} cancel.) — Receita ${fmt(nsReceita)}`);

  const [stats] = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'paid')::int AS pagos,
      COUNT(*) FILTER (WHERE status IN ('voided','refunded','cancelled'))::int AS cancelados,
      COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0)::numeric AS receita
    FROM pedidos
    WHERE data_pedido >= ${inicio.toISOString()}
  ` as any[];

  console.log(`Sistema:   ${stats.total} pedidos (${stats.pagos} pagos, ${stats.cancelados} cancel.) — Receita ${fmt(Number(stats.receita))}`);

  const diffReceita = nsReceita - Number(stats.receita);
  console.log(`\nDiferença em receita: ${Math.abs(diffReceita) < 0.01 ? '✓ IGUAL' : `⚠ ${fmt(Math.abs(diffReceita))}`}`);

  // ----- Investigar receita por pedido -----
  if (Math.abs(diffReceita) > 0.01) {
    console.log('\n--- Investigando diferenças de valor por pedido ---');
    const banco = await sql`SELECT id, numero, total FROM pedidos WHERE status = 'paid' AND data_pedido >= ${inicio.toISOString()}` as any[];
    const bancoMap = new Map(banco.map((p) => [String(p.id), { numero: p.numero, total: Number(p.total) }]));

    const diff: Array<{ numero: number; sys: number; ns: number; d: number }> = [];
    for (const p of nsPagos) {
      const b = bancoMap.get(String(p.id));
      if (!b) continue;
      const d = Number(p.total) - b.total;
      if (Math.abs(d) > 0.01) diff.push({ numero: p.number, sys: b.total, ns: Number(p.total), d });
    }
    diff.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    console.log(`${diff.length} pedidos com valor divergente:`);
    diff.slice(0, 10).forEach((p) => {
      console.log(`  #${p.numero} | Sistema ${fmt(p.sys)} | NS ${fmt(p.ns)} | Δ ${fmt(p.d)}`);
    });
  }

  // ----- Comparação dia-a-dia em TIMEZONE BR -----
  console.log('\n--- Dia a dia (TIMEZONE BR) ---');

  const porDiaNS = new Map<string, { qtd: number; receita: number }>();
  for (const p of nsPagos) {
    const dia = diaBR(p.created_at);
    const ent = porDiaNS.get(dia) ?? { qtd: 0, receita: 0 };
    ent.qtd++;
    ent.receita += Number(p.total);
    porDiaNS.set(dia, ent);
  }

  // Agrupamento correto: nosso campo é `timestamp` sem TZ mas conteúdo é UTC
  const porDiaSys = await sql`
    SELECT to_char((data_pedido AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS dia,
           COUNT(*)::int AS qtd,
           COALESCE(SUM(total), 0)::numeric AS receita
    FROM pedidos
    WHERE data_pedido >= ${inicio.toISOString()} AND status = 'paid'
    GROUP BY to_char((data_pedido AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
    ORDER BY dia
  ` as any[];

  const sysMap = new Map(porDiaSys.map((r) => [r.dia, { qtd: Number(r.qtd), receita: Number(r.receita) }]));

  console.log('\nDIA        | NS qtd | Sys qtd | NS receita     | Sys receita    | Match?');
  console.log('-----------|--------|---------|----------------|----------------|--------');

  const todosDias = new Set([...porDiaNS.keys(), ...sysMap.keys()]);
  const dias = Array.from(todosDias).sort();

  for (const dia of dias) {
    const ns = porDiaNS.get(dia) ?? { qtd: 0, receita: 0 };
    const sys = sysMap.get(dia) ?? { qtd: 0, receita: 0 };
    const match = ns.qtd === sys.qtd && Math.abs(ns.receita - sys.receita) < 0.01;
    console.log(
      `${dia} | ${String(ns.qtd).padStart(6)} | ${String(sys.qtd).padStart(7)} | ${fmt(ns.receita).padStart(14)} | ${fmt(sys.receita).padStart(14)} | ${match ? '✓' : '✗'}`
    );
  }
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
