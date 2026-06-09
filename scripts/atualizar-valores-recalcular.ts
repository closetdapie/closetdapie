/* Atualiza embalagem=6 e frete medio=15 + RECALCULA todos os pedidos
   com os novos valores. */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

const EMBALAGEM = 6.00;
const FRETE_MEDIO = 15.00;

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

async function main() {
  console.log('[atualizar] Atualizando configurações: embalagem=R$', EMBALAGEM, 'frete=R$', FRETE_MEDIO);
  await sql`
    UPDATE configuracoes
    SET custo_embalagem = ${EMBALAGEM}, custo_frete_medio = ${FRETE_MEDIO}, atualizado_em = NOW()
    WHERE id = 1
  `;

  // Pega config completa pra recalcular
  const [cfg] = await sql`SELECT * FROM configuracoes WHERE id = 1` as any[];
  const taxaNuvemPercent = Number(cfg.taxa_nuvemshop_percent ?? 0.7);

  console.log('[atualizar] Recalculando pedidos...');
  const pedidos = await sql`SELECT id, total, status, meio_pagamento, gateway, itens FROM pedidos` as any[];

  // mapa COGS
  const cogsRows = await sql`SELECT nuvemshop_product_id, custo_unitario FROM produtos_cogs WHERE nuvemshop_product_id IS NOT NULL` as any[];
  const cogsMap = new Map<string, number>();
  for (const r of cogsRows) cogsMap.set(String(r.nuvemshop_product_id), Number(r.custo_unitario));

  let atualizados = 0;
  for (const p of pedidos) {
    const cancelado = p.status === 'voided' || p.status === 'refunded' || p.status === 'cancelled';
    const total = Number(p.total);
    const gateway = p.gateway || 'cash';
    const meio = p.meio_pagamento || 'cash';

    const taxaGw = cancelado ? 0 : calcTaxa(total, gateway, meio);
    const taxaNs = cancelado ? 0 : Math.round(total * taxaNuvemPercent) / 100;
    const itens = Array.isArray(p.itens) ? p.itens : [];
    const cogs = cancelado ? 0 : itens.reduce((s: number, item: any) =>
      s + (cogsMap.get(String(item.nuvemshopProductId)) ?? 0) * (item.quantidade || 1), 0);
    const embalagem = cancelado ? 0 : EMBALAGEM;
    const frete = cancelado || gateway === 'cash' ? 0 : FRETE_MEDIO;
    const lucro = total - taxaGw - taxaNs - cogs - embalagem - frete;
    const margem = total > 0 ? (lucro / total) * 100 : 0;

    await sql`
      UPDATE pedidos
      SET taxa_gateway = ${taxaGw.toFixed(2)},
          taxa_nuvemshop = ${taxaNs.toFixed(2)},
          cogs_total = ${cogs.toFixed(2)},
          custo_embalagem = ${embalagem.toFixed(2)},
          custo_frete = ${frete.toFixed(2)},
          lucro_liquido = ${lucro.toFixed(2)},
          margem_percent = ${margem.toFixed(2)},
          recalculado_em = NOW()
      WHERE id = ${p.id}
    `;
    atualizados++;
  }
  console.log(`[atualizar] ${atualizados} pedidos recalculados`);

  // Stats por dia (junho)
  const porDia = await sql`
    SELECT
      DATE(data_pedido) AS dia,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'paid')::int AS pagos,
      COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0)::numeric AS receita,
      COALESCE(SUM(lucro_liquido) FILTER (WHERE status = 'paid'), 0)::numeric AS lucro
    FROM pedidos
    WHERE data_pedido >= '2026-06-01'
    GROUP BY DATE(data_pedido)
    ORDER BY dia
  ` as any[];

  console.log('\n[atualizar] Junho dia a dia:');
  console.log('Dia        Total  Pagos  Receita      Lucro');
  let totalPagos = 0, totalReceita = 0, totalLucro = 0;
  for (const d of porDia) {
    const dia = new Date(d.dia).toLocaleDateString('pt-BR');
    console.log(
      `${dia.padEnd(11)} ${String(d.total).padStart(5)}  ${String(d.pagos).padStart(5)}  R$ ${Number(d.receita).toFixed(2).padStart(9)}  R$ ${Number(d.lucro).toFixed(2).padStart(9)}`
    );
    totalPagos += d.pagos;
    totalReceita += Number(d.receita);
    totalLucro += Number(d.lucro);
  }
  console.log(`${'TOTAL'.padEnd(11)}       ${String(totalPagos).padStart(5)}  R$ ${totalReceita.toFixed(2).padStart(9)}  R$ ${totalLucro.toFixed(2).padStart(9)}`);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
