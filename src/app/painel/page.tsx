import { db, pedidos, custosFixos, despesas } from '@/db';
import { gte, lte, and, sql } from 'drizzle-orm';
import {
  startOfMonth, endOfMonth, subMonths, format,
  startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, differenceInDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBRL } from '@/lib/calcular-lucro';
import { TrendingUp, TrendingDown, ShoppingBag, Wallet, AlertCircle, Calendar } from 'lucide-react';
import { BotaoSincronizar } from '@/components/botao-sincronizar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Periodo = 'hoje' | 'ontem' | '7dias' | 'semana' | 'mes' | 'mes_passado' | 'custom';

function resolverIntervalo(periodo: Periodo, inicioCustom?: string, fimCustom?: string): { inicio: Date; fim: Date; label: string } {
  const agora = new Date();
  switch (periodo) {
    case 'hoje':
      return { inicio: startOfDay(agora), fim: endOfDay(agora), label: 'Hoje' };
    case 'ontem': {
      const o = subDays(agora, 1);
      return { inicio: startOfDay(o), fim: endOfDay(o), label: 'Ontem' };
    }
    case '7dias':
      return { inicio: startOfDay(subDays(agora, 6)), fim: endOfDay(agora), label: 'Últimos 7 dias' };
    case 'semana':
      return { inicio: startOfWeek(agora, { weekStartsOn: 1 }), fim: endOfWeek(agora, { weekStartsOn: 1 }), label: 'Esta semana' };
    case 'mes_passado': {
      const m = subMonths(agora, 1);
      return { inicio: startOfMonth(m), fim: endOfMonth(m), label: format(m, "MMMM 'de' yyyy", { locale: ptBR }) };
    }
    case 'custom':
      if (inicioCustom && fimCustom) {
        const ini = startOfDay(new Date(inicioCustom + 'T00:00:00'));
        const fim = endOfDay(new Date(fimCustom + 'T00:00:00'));
        return { inicio: ini, fim, label: `${format(ini, 'dd/MM/yyyy')} → ${format(fim, 'dd/MM/yyyy')}` };
      }
      // fallback
      return { inicio: startOfMonth(agora), fim: endOfMonth(agora), label: format(agora, "MMMM 'de' yyyy", { locale: ptBR }) };
    case 'mes':
    default:
      return { inicio: startOfMonth(agora), fim: endOfMonth(agora), label: format(agora, "MMMM 'de' yyyy", { locale: ptBR }) };
  }
}

async function dadosDoIntervalo(inicio: Date, fim: Date) {
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
    .where(and(gte(pedidos.dataPedido, inicio), lte(pedidos.dataPedido, fim), sql`${pedidos.status} = 'paid'`));

  // Rateio de custos fixos: se intervalo < 28 dias, divide proporcionalmente
  const diasIntervalo = Math.max(1, differenceInDays(fim, inicio) + 1);
  const fixosAtivos = await db.select().from(custosFixos);
  const totalFixosMensal = fixosAtivos
    .filter((c) => !c.ativoAte || c.ativoAte >= inicio)
    .reduce((s, c) => s + Number(c.valor), 0);
  // assume mês de 30 dias pra rateio
  const fixosNoPeriodo = (totalFixosMensal * diasIntervalo) / 30;

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
    fixos: fixosNoPeriodo,
    despesas: Number(desps[0]?.total ?? 0),
    diasIntervalo,
  };
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string }> }) {
  const sp = await searchParams;
  const periodo = ((['hoje', 'ontem', '7dias', 'semana', 'mes', 'mes_passado', 'custom'] as const).includes(sp.periodo as Periodo) ? sp.periodo : 'mes') as Periodo;
  const intervalo = resolverIntervalo(periodo, sp.inicio, sp.fim);

  // dados do período + período anterior equivalente (pra comparação)
  const atual = await dadosDoIntervalo(intervalo.inicio, intervalo.fim);
  const tamanho = differenceInDays(intervalo.fim, intervalo.inicio) + 1;
  const inicioAnterior = subDays(intervalo.inicio, tamanho);
  const fimAnterior = subDays(intervalo.fim, tamanho);
  const anterior = await dadosDoIntervalo(inicioAnterior, fimAnterior);

  const lucroReal = atual.lucroPedidos - atual.fixos - atual.despesas;
  const margemReal = atual.receita > 0 ? (lucroReal / atual.receita) * 100 : 0;
  const lucroAnterior = anterior.lucroPedidos - anterior.fixos - anterior.despesas;
  const variacao = lucroAnterior !== 0 ? ((lucroReal - lucroAnterior) / Math.abs(lucroAnterior)) * 100 : 0;
  const ticketMedio = atual.qtd > 0 ? atual.receita / atual.qtd : 0;

  const vazio = atual.qtd === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quanto eu lucrei?</h1>
          <p className="text-sm text-[var(--color-ink-mute)] mt-0.5">
            {intervalo.label} · {atual.qtd} pedido{atual.qtd !== 1 ? 's' : ''}
          </p>
        </div>
        <BotaoSincronizar />
      </header>

      {/* Filtros de período */}
      <FiltrosPeriodo periodo={periodo} inicioCustom={sp.inicio} fimCustom={sp.fim} />

      {vazio && (
        <div className="card flex items-start gap-3 bg-amber-50 border-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="text-sm">
            <strong className="text-amber-900">Nenhum pedido nesse período.</strong>{' '}
            <span className="text-amber-800">Tenta outro filtro ou clica em "Sincronizar Nuvemshop".</span>
          </div>
        </div>
      )}

      {/* CARD HERO — Lucro Real */}
      <div className="card bg-gradient-to-br from-[var(--color-ink)] to-[var(--color-rose-cdp-dark)] text-white">
        <p className="text-[11px] uppercase tracking-widest opacity-80">Lucro Real · {intervalo.label}</p>
        <p className="text-5xl font-bold mt-2">{formatBRL(lucroReal)}</p>
        <div className="flex items-center gap-4 mt-3 text-sm opacity-90">
          <span>Margem {margemReal.toFixed(1)}%</span>
          {!vazio && lucroAnterior !== 0 && (
            <span className="flex items-center gap-1">
              {variacao >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(variacao).toFixed(0)}% vs período anterior
            </span>
          )}
        </div>
      </div>

      {/* GRID KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi titulo="Faturamento" valor={formatBRL(atual.receita)} sub={`${atual.qtd} pedidos pagos`} icon={ShoppingBag} />
        <Kpi titulo="Ticket médio" valor={formatBRL(ticketMedio)} sub="por pedido" icon={Wallet} />
        <Kpi titulo="Lucro por pedido" valor={formatBRL(atual.qtd > 0 ? lucroReal / atual.qtd : 0)} sub="média" icon={TrendingUp} />
      </div>

      <div className="card">
        <h2 className="font-semibold text-base mb-4">Pra onde foi o dinheiro</h2>
        <Linha label="Faturamento bruto" valor={atual.receita} positivo />
        <Linha label="(-) Custo dos produtos (COGS)" valor={-atual.cogs} percent={atual.receita ? (atual.cogs / atual.receita) * 100 : 0} />
        <Linha label="(-) Taxa MercadoPago/Nuvem Pago" valor={-atual.taxaGw} percent={atual.receita ? (atual.taxaGw / atual.receita) * 100 : 0} />
        <Linha label="(-) Taxa Nuvemshop" valor={-atual.taxaNuvem} percent={atual.receita ? (atual.taxaNuvem / atual.receita) * 100 : 0} />
        <Linha label="(-) Frete absorvido" valor={-atual.frete} percent={atual.receita ? (atual.frete / atual.receita) * 100 : 0} />
        <Linha label="(-) Embalagem" valor={-atual.embalagem} percent={atual.receita ? (atual.embalagem / atual.receita) * 100 : 0} />
        <Linha label={`(-) Custos fixos do período (${atual.diasIntervalo} dia${atual.diasIntervalo !== 1 ? 's' : ''})`} valor={-atual.fixos} percent={atual.receita ? (atual.fixos / atual.receita) * 100 : 0} />
        <Linha label="(-) Despesas pontuais" valor={-atual.despesas} percent={atual.receita ? (atual.despesas / atual.receita) * 100 : 0} />
        <div className="border-t border-[var(--color-border)] mt-3 pt-3">
          <Linha label="= Lucro líquido real" valor={lucroReal} destaque />
        </div>
      </div>
    </div>
  );
}

function FiltrosPeriodo({ periodo, inicioCustom, fimCustom }: { periodo: Periodo; inicioCustom?: string; fimCustom?: string }) {
  const opcoes: Array<{ v: Periodo; label: string }> = [
    { v: 'hoje', label: 'Hoje' },
    { v: 'ontem', label: 'Ontem' },
    { v: '7dias', label: '7 dias' },
    { v: 'semana', label: 'Esta semana' },
    { v: 'mes', label: 'Este mês' },
    { v: 'mes_passado', label: 'Mês passado' },
  ];

  return (
    <div className="card flex flex-col lg:flex-row gap-3 items-start lg:items-center">
      <Calendar className="w-4 h-4 text-[var(--color-ink-mute)] hidden lg:block" />
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <Link
            key={o.v}
            href={`/painel?periodo=${o.v}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              periodo === o.v
                ? 'bg-[var(--color-ink)] text-white'
                : 'bg-[var(--color-cream)] text-[var(--color-ink-soft)] hover:bg-[var(--color-border)]'
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>

      <form action="/painel" method="get" className="flex items-center gap-2 lg:ml-auto">
        <input type="hidden" name="periodo" value="custom" />
        <input
          name="inicio"
          type="date"
          defaultValue={inicioCustom || ''}
          className="input text-xs px-2 py-1.5 w-36"
          aria-label="Início"
        />
        <span className="text-xs text-[var(--color-ink-mute)]">até</span>
        <input
          name="fim"
          type="date"
          defaultValue={fimCustom || ''}
          className="input text-xs px-2 py-1.5 w-36"
          aria-label="Fim"
        />
        <button type="submit" className="btn-ghost px-3 py-1.5 text-xs">
          Aplicar
        </button>
      </form>
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
