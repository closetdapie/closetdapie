/* GET /api/cron/sync — chamado pelo Vercel Cron a cada 15min.
   Faz sync incremental: puxa pedidos criados/atualizados desde o último sync. */

import { NextResponse } from 'next/server';
import { db, pedidos, produtosCogs, configuracoes } from '@/db';
import { eq, desc } from 'drizzle-orm';
import { fetchPedidos, mapearMeioPagamento } from '@/lib/nuvemshop';
import { calcularLucroPedido, type ConfiguracoesCalculo } from '@/lib/calcular-lucro';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function mapearGateway(o: { gateway?: string; gateway_name?: string }): 'nuvem_pago' | 'mercado_pago' | 'cash' {
  const g = (o.gateway || o.gateway_name || '').toLowerCase();
  if (g.includes('cash') || g.includes('manual') || g.includes('offline') || g.includes('especie')) return 'cash';
  if (g.includes('mercado')) return 'mercado_pago';
  if (g.includes('nuvem') || g.includes('np') || g.includes('tn-')) return 'nuvem_pago';
  return 'cash';
}

export async function GET(req: Request) {
  // proteção: Vercel Cron envia header user-agent específico
  const ua = req.headers.get('user-agent') || '';
  const isVercelCron = ua.includes('vercel-cron');
  const authHeader = req.headers.get('authorization') || '';
  const secret = process.env.CRON_SECRET;

  // permite: Vercel cron, OU header com CRON_SECRET
  if (!isVercelCron && (!secret || authHeader !== `Bearer ${secret}`)) {
    return NextResponse.json({ erro: 'nao_autorizado' }, { status: 401 });
  }

  const [cfg] = await db.select().from(configuracoes).where(eq(configuracoes.id, 1));
  if (!cfg?.nuvemshopStoreId || !cfg?.nuvemshopAccessToken) {
    return NextResponse.json({ erro: 'nuvemshop_nao_configurado' }, { status: 400 });
  }

  // sync incremental: pega pedidos CRIADOS OU EDITADOS nas últimas horas
  // (assim atualiza valor de pedidos que foram editados após o sync original)
  const desde = new Date(Date.now() - 1000 * 60 * 60 * 6); // últimas 6 horas

  let novos;
  try {
    novos = await fetchPedidos(cfg.nuvemshopStoreId, cfg.nuvemshopAccessToken, desde, { porUpdated: true });
  } catch (e) {
    return NextResponse.json({ erro: 'nuvemshop_api', detalhe: String(e) }, { status: 502 });
  }

  const cogsList = await db.select().from(produtosCogs);
  const cogsMap = new Map<string, number>();
  for (const p of cogsList) {
    if (p.nuvemshopProductId) cogsMap.set(p.nuvemshopProductId, Number(p.custoUnitario));
  }

  const configCalc: ConfiguracoesCalculo = {
    taxaNuvemshopPercent: Number(cfg.taxaNuvemshopPercent),
    taxaMpCartaoCreditoPercent: Number(cfg.taxaMpCartaoCreditoPercent),
    taxaMpCartaoDebitoPercent: Number(cfg.taxaMpCartaoDebitoPercent),
    taxaMpPixPercent: Number(cfg.taxaMpPixPercent),
    taxaMpCartaoFixa: Number(cfg.taxaMpCartaoFixa),
    taxaMpBoletoFixa: Number(cfg.taxaMpBoletoFixa),
    custoEmbalagem: Number(cfg.custoEmbalagem),
    custoFreteMedio: Number(cfg.custoFreteMedio),
    limiteFreteGratis: Number(cfg.limiteFreteGratis),
  };

  let salvos = 0;
  for (const o of novos) {
    const meio = mapearMeioPagamento(o);
    const gateway = mapearGateway(o);
    const itens = o.products.map((p) => ({
      nuvemshopProductId: String(p.product_id),
      nome: p.name,
      quantidade: p.quantity,
      precoUnitario: Number(p.price),
    }));

    const calc = calcularLucroPedido({
      subtotal: Number(o.subtotal),
      desconto: Number(o.discount),
      freteCobrado: Number(o.shipping_cost_customer),
      freteCustoReal: null,
      total: Number(o.total),
      meioPagamento: meio,
      itens,
      cogsMap,
      config: configCalc,
    });

    const dados = {
      id: String(o.id),
      numero: o.number,
      clienteNome: o.customer?.name || o.contact_name || null,
      clienteEmail: o.customer?.email || o.contact_email || null,
      status: o.payment_status,
      dataPedido: new Date(o.created_at),
      subtotal: o.subtotal,
      desconto: o.discount,
      freteCobrado: o.shipping_cost_customer,
      freteCustoReal: null,
      total: o.total,
      meioPagamento: meio,
      parcelas: o.installments || null,
      gateway,
      taxaGateway: String(calc.taxaGateway),
      taxaNuvemshop: String(calc.taxaNuvemshop),
      cogsTotal: String(calc.cogsTotal),
      custoEmbalagem: String(calc.custoEmbalagem),
      custoFrete: String(calc.custoFrete),
      lucroLiquido: String(calc.lucroLiquido),
      margemPercent: String(calc.margemPercent),
      itens,
      recalculadoEm: new Date(),
      sincronizadoEm: new Date(),
    };

    await db
      .insert(pedidos)
      .values(dados)
      .onConflictDoUpdate({ target: pedidos.id, set: dados });
    salvos++;
  }

  return NextResponse.json({ ok: true, novos: novos.length, salvos, desde: desde.toISOString() });
}
