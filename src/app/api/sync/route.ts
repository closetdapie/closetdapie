/* POST /api/sync — puxa pedidos da Nuvemshop, calcula lucro real e salva no banco.
   Pode ser chamado manualmente (botão) ou por cron. */

import { NextResponse } from 'next/server';
import { db, pedidos, produtosCogs, configuracoes } from '@/db';
import { eq } from 'drizzle-orm';
import { fetchPedidos, mapearMeioPagamento } from '@/lib/nuvemshop';
import { calcularLucroPedido, type ConfiguracoesCalculo } from '@/lib/calcular-lucro';
import { auth } from '@/lib/auth';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 });

  const [cfg] = await db.select().from(configuracoes).where(eq(configuracoes.id, 1));
  if (!cfg?.nuvemshopStoreId || !cfg?.nuvemshopAccessToken) {
    return NextResponse.json({ erro: 'nuvemshop_nao_configurado', dica: 'Preencha Store ID e Access Token em /painel/configuracoes' }, { status: 400 });
  }

  const ultimo = await db.query.pedidos.findFirst({ orderBy: (t, { desc }) => desc(t.dataPedido) });
  const since = ultimo?.dataPedido ?? new Date(Date.now() - 1000 * 60 * 60 * 24 * 60); // padrão: 60d atrás

  let novos: Awaited<ReturnType<typeof fetchPedidos>>;
  try {
    novos = await fetchPedidos(cfg.nuvemshopStoreId, cfg.nuvemshopAccessToken, since);
  } catch (e) {
    return NextResponse.json({ erro: 'nuvemshop_api', detalhe: String(e) }, { status: 502 });
  }

  // mapa de COGS pra cálculo rápido
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

  return NextResponse.json({ ok: true, novos: novos.length, salvos });
}
