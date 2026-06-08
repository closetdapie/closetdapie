import { db, pedidos, custosFixos, despesas } from '@/db';
import { gte, lte, and, sql } from 'drizzle-orm';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBRL } from '@/lib/calcular-lucro';
import { TrendingUp, TrendingDown, ShoppingBag, Wallet, AlertCircle } from 'lucide-react';
import { BotaoSincronizar } from '@/components/botao-sincronizar';

export const dynamic = 'force-dynamic';

async function dadosMes(inicio: Date, fim: Date) {
  // tenta puxar pedidos sincronizados — se banco vazio, retorna zeros (ok pra primeiro uso)
  const [agg] = await db
    .select({
      receita: sql<string>`COALESCE(SUM(${pedidos.total}), 0)`,
      qtd: sql<string>`COUNT(*)::int`,
      taxaGw: sql<string>`COALESCE(SUM(${pedidos.taxaGateway}), 0)`,
      taxaNuvem: sql<string>`COALESCE(SUM(${pedidos.taxaNuvemshop}), 0)`,
      cogs: sql<string>`COALESCE(SUM(${pedidos.cogsTotal}), 0)`,
      embalagem: sql<string>`COALESCE(SUM(${pedidos.custoEmbalagem}), 0)`,
      frete: sql<string>`COALESCE(SUM(${pedidos.custoFrete}), 0)`,
      lucro: sql<string>`COALESCE(SUM(${pedidos.lucroLiquido}), 0)`,
    })
    .from(pedidos)
    .where(and(gte(pedidos.dataPedido, inicio), lte(pedidos.dataPedido, fim)));

  const fixos = await db.select().from(custosFixos);
  const totalFixos = fixos
    .filter((c) => !c.ativoAte || c.ativoAte >= inicio)
    .reduce((s, c) => s + Number(c.valor), 0);

  const desps = await db
    .select({ total: sql<string>`COALESCE(SUM(${despesas.valor}), 0)` })
    .from(despesas)
    .where(and(gte(despesas.data, inicio), lte(despesas.data, fim)));

  return {
    receita: Number(agg?.receita ?? 0),
    qtd: Number(agg?.qtd ?? 0),
    taxaGw: Number(agg?.taxaGw ?? 0),
    taxaNuvem: Number(agg?.taxaNuvem ?? 0),
    cogs: Number(agg?.cogs ?? 0),
    embalagem: Number(agg?.embalagem ?? 0),
    frete: Number(agg?.frete ?? 0),
    lucroPedidos: Number(agg?.lucro ?? 0),
    fixos: totalFixos,
    despesas: Number(desps[0]?.total ?? 0),
  };
}

export default async function Dashboard() {
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);
  const mesAnterior = subMonths(hoje, 1);

  const atual = await dadosMes(inicioMes, fimMes);
  const anterior = await dadosMes(startOfMonth(mesAnterior), endOfMonth(mesAnterior));

  const lucroReal = atual.lucroPedidos - atual.fixos - atual.despesas;
  const margemReal = atual.receita > 0 ? (lucroReal / atual.receita) * 100 : 0;
  const lucroAnterior = anterior.lucroPedidos - anterior.fixos - anterior.despesas;
  const variacao = lucroAnterior !== 0 ? ((lucroReal - lucroAnterior) / Math.abs(lucroAnterior)) * 100 : 0;

  const ticketMedio = atual.qtd > 0 ? atual.receita / atual.qtd : 0;

  const vazio = atual.qtd === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quanto eu lucrei?</h1>
          <p className="text-sm text-[var(--color-ink-mute)] mt-0.5">
            {format(hoje, "MMMM 'de' yyyy", { locale: ptBR })} · até agora
          </p>
        </div>
        <BotaoSincronizar />
      </header>

      {vazio && (
        <div className="card flex items-start gap-3 bg-amber-50 border-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="text-sm">
            <strong className="text-amber-900">Nenhum pedido sincronizado ainda.</strong>{' '}
            <span className="text-amber-800">
              Vá em <a href="/painel/configuracoes" className="underline">Configurações</a> e conecte
              sua loja Nuvemshop pra puxar os pedidos automaticamente.
            </span>
          </div>
        </div>
      )}

      {/* CARD HERO — Lucro Real */}
      <div className="card bg-gradient-to-br from-[var(--color-ink)] to-[var(--color-rose-cdp-dark)] text-white">
        <p className="text-[11px] uppercase tracking-widest opacity-80">Lucro Real este mês</p>
        <p className="text-5xl font-bold mt-2">{formatBRL(lucroReal)}</p>
        <div className="flex items-center gap-4 mt-3 text-sm opacity-90">
          <span>Margem {margemReal.toFixed(1)}%</span>
          {!vazio && lucroAnterior !== 0 && (
            <span className="flex items-center gap-1">
              {variacao >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(variacao).toFixed(0)}% vs mês passado
            </span>
          )}
        </div>
      </div>

      {/* GRID — onde tá indo o dinheiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi titulo="Faturamento" valor={formatBRL(atual.receita)} sub={`${atual.qtd} pedidos`} icon={ShoppingBag} />
        <Kpi titulo="Ticket médio" valor={formatBRL(ticketMedio)} sub="por pedido" icon={Wallet} />
        <Kpi titulo="Lucro por pedido" valor={formatBRL(atual.qtd > 0 ? lucroReal / atual.qtd : 0)} sub="média" icon={TrendingUp} />
      </div>

      <div className="card">
        <h2 className="font-semibold text-base mb-4">Pra onde foi o dinheiro</h2>
        <Linha label="Faturamento bruto" valor={atual.receita} positivo />
        <Linha label="(-) Custo dos produtos (COGS)" valor={-atual.cogs} percent={atual.receita ? (atual.cogs / atual.receita) * 100 : 0} />
        <Linha label="(-) Taxa MercadoPago" valor={-atual.taxaGw} percent={atual.receita ? (atual.taxaGw / atual.receita) * 100 : 0} />
        <Linha label="(-) Taxa Nuvemshop" valor={-atual.taxaNuvem} percent={atual.receita ? (atual.taxaNuvem / atual.receita) * 100 : 0} />
        <Linha label="(-) Frete absorvido" valor={-atual.frete} percent={atual.receita ? (atual.frete / atual.receita) * 100 : 0} />
        <Linha label="(-) Embalagem" valor={-atual.embalagem} percent={atual.receita ? (atual.embalagem / atual.receita) * 100 : 0} />
        <Linha label="(-) Custos fixos do mês" valor={-atual.fixos} percent={atual.receita ? (atual.fixos / atual.receita) * 100 : 0} />
        <Linha label="(-) Despesas pontuais" valor={-atual.despesas} percent={atual.receita ? (atual.despesas / atual.receita) * 100 : 0} />
        <div className="border-t border-[var(--color-border)] mt-3 pt-3">
          <Linha label="= Lucro líquido real" valor={lucroReal} destaque />
        </div>
      </div>
    </div>
  );
}

function Kpi({ titulo, valor, sub, icon: Icon }: { titulo: string; valor: string; sub: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-[var(--color-ink-mute)]">{titulo}</p>
        <Icon className="w-4 h-4 text-[var(--color-ink-faint)]" />
      </div>
      <p className="text-2xl font-bold mt-2">{valor}</p>
      <p className="text-xs text-[var(--color-ink-mute)] mt-1">{sub}</p>
    </div>
  );
}

function Linha({ label, valor, percent, positivo, destaque }: { label: string; valor: number; percent?: number; positivo?: boolean; destaque?: boolean }) {
  const cor = destaque
    ? (valor >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]')
    : positivo
    ? 'text-[var(--color-ink)]'
    : 'text-[var(--color-ink-soft)]';
  return (
    <div className={`flex justify-between py-1.5 text-sm ${destaque ? 'font-bold text-base' : ''}`}>
      <span className="text-[var(--color-ink-soft)]">{label}</span>
      <span className={`font-mono ${cor}`}>
        {formatBRL(valor)}
        {percent != null && percent > 0 && (
          <span className="text-[10px] text-[var(--color-ink-faint)] ml-2">({percent.toFixed(1)}%)</span>
        )}
      </span>
    </div>
  );
}
