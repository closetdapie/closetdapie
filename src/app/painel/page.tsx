import { db, pedidos, custosFixos, despesas } from '@/db';
import { gte, lte, and, sql } from 'drizzle-orm';
import {
  startOfMonth, endOfMonth, subMonths, format,
  startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, differenceInDays, eachDayOfInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { BotaoSincronizar } from '@/components/botao-sincronizar';
import { AnimatedBRL, AnimatedCounter } from '@/components/cinema/animated-counter';
import { Reveal, RevealStagger, RevealItem } from '@/components/cinema/reveal';
import { SplitText, SplitChars } from '@/components/cinema/split-text';
import { LineChart } from '@/components/charts/line-chart';
import { DonutChart } from '@/components/charts/donut-chart';
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
      return { inicio: startOfMonth(m), fim: endOfMonth(m), label: format(m, "MMMM", { locale: ptBR }) };
    }
    case 'custom':
      if (inicioCustom && fimCustom) {
        const ini = startOfDay(new Date(inicioCustom + 'T00:00:00'));
        const fim = endOfDay(new Date(fimCustom + 'T00:00:00'));
        return { inicio: ini, fim, label: `${format(ini, 'dd/MM')} – ${format(fim, 'dd/MM')}` };
      }
      return { inicio: startOfMonth(agora), fim: endOfMonth(agora), label: format(agora, "MMMM", { locale: ptBR }) };
    case 'mes':
    default:
      return { inicio: startOfMonth(agora), fim: endOfMonth(agora), label: format(agora, "MMMM", { locale: ptBR }) };
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

  const dias = Math.max(1, differenceInDays(fim, inicio) + 1);
  const fixosAtivos = await db.select().from(custosFixos);
  const totalFixosMensal = fixosAtivos
    .filter((c) => !c.ativoAte || c.ativoAte >= inicio)
    .reduce((s, c) => s + Number(c.valor), 0);
  const fixosNoPeriodo = (totalFixosMensal * dias) / 30;

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
    dias,
  };
}

async function receitaPorDia(inicio: Date, fim: Date) {
  const rows = await db
    .select({
      dia: sql<string>`DATE(${pedidos.dataPedido})`,
      total: sql<string>`COALESCE(SUM(${pedidos.total}), 0)`,
    })
    .from(pedidos)
    .where(and(gte(pedidos.dataPedido, inicio), lte(pedidos.dataPedido, fim), sql`${pedidos.status} = 'paid'`))
    .groupBy(sql`DATE(${pedidos.dataPedido})`)
    .orderBy(sql`DATE(${pedidos.dataPedido})`);

  // preenche dias sem vendas
  const mapa = new Map(rows.map((r) => [r.dia, Number(r.total)]));
  const todosDias = eachDayOfInterval({ start: inicio, end: fim });
  return todosDias.map((d) => ({
    label: format(d, 'dd/MM'),
    valor: mapa.get(format(d, 'yyyy-MM-dd')) ?? 0,
  }));
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string }> }) {
  const sp = await searchParams;
  const periodo = ((['hoje', 'ontem', '7dias', 'semana', 'mes', 'mes_passado', 'custom'] as const).includes(sp.periodo as Periodo) ? sp.periodo : 'mes') as Periodo;
  const intervalo = resolverIntervalo(periodo, sp.inicio, sp.fim);

  const atual = await dadosDoIntervalo(intervalo.inicio, intervalo.fim);
  const tamanho = differenceInDays(intervalo.fim, intervalo.inicio) + 1;
  const anterior = await dadosDoIntervalo(subDays(intervalo.inicio, tamanho), subDays(intervalo.fim, tamanho));
  const linhaReceita = await receitaPorDia(intervalo.inicio, intervalo.fim);

  const lucroReal = atual.lucroPedidos - atual.fixos - atual.despesas;
  const margemReal = atual.receita > 0 ? (lucroReal / atual.receita) * 100 : 0;
  const lucroAnterior = anterior.lucroPedidos - anterior.fixos - anterior.despesas;
  const variacao = lucroAnterior !== 0 ? ((lucroReal - lucroAnterior) / Math.abs(lucroAnterior)) * 100 : 0;
  const ticketMedio = atual.qtd > 0 ? atual.receita / atual.qtd : 0;
  const lucroPorPedido = atual.qtd > 0 ? lucroReal / atual.qtd : 0;

  const despesasBreakdown = [
    { label: 'Produtos (COGS)', valor: atual.cogs },
    { label: 'Gateway pagamento', valor: atual.taxaGw },
    { label: 'Taxa Nuvemshop', valor: atual.taxaNuvem },
    { label: 'Frete', valor: atual.frete },
    { label: 'Embalagem', valor: atual.embalagem },
    { label: 'Custos fixos', valor: atual.fixos },
    { label: 'Despesas pontuais', valor: atual.despesas },
  ].filter((d) => d.valor > 0);

  return (
    <div className="max-w-[1400px] mx-auto space-y-12">
      {/* Hero — eyebrow + headline gigante + valor animado */}
      <section className="relative pt-4">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-eyebrow mb-3">
              <SplitText text={`Dashboard · ${intervalo.label}`} />
            </p>
          </div>
          <BotaoSincronizar />
        </div>

        <h1 className="text-display text-platinum-grad mb-3">
          <SplitChars text="LUCRO" delay={0.15} />
        </h1>

        <div className="flex items-end gap-6 flex-wrap">
          <Reveal delay={0.5}>
            <p className="font-display text-[clamp(3rem,9vw,7rem)] leading-[0.9] tabular text-[var(--color-pearl)]">
              <AnimatedBRL value={lucroReal} />
            </p>
          </Reveal>

          <Reveal delay={0.9} className="pb-3">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-eyebrow mb-0.5">Margem</p>
                <p className="font-display text-3xl text-[var(--color-platinum)] tabular">
                  <AnimatedCounter value={margemReal} decimals={1} suffix="%" />
                </p>
              </div>
              {lucroAnterior !== 0 && (
                <div className="flex items-center gap-2 text-sm">
                  {variacao >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-[var(--color-gain)]" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-[var(--color-loss)]" />
                  )}
                  <span className={variacao >= 0 ? 'text-[var(--color-gain)]' : 'text-[var(--color-loss)]'}>
                    {Math.abs(variacao).toFixed(0)}%
                  </span>
                  <span className="text-[var(--color-steel)]">vs. anterior</span>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Filtros de período */}
      <Reveal delay={1.1}>
        <FiltrosPeriodo periodo={periodo} inicioCustom={sp.inicio} fimCustom={sp.fim} />
      </Reveal>

      {/* KPIs em grid */}
      <RevealStagger delay={0.1} stagger={0.12} className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <RevealItem>
          <KpiCard label="Faturamento" valor={<AnimatedBRL value={atual.receita} />} sub={`${atual.qtd} pedidos pagos`} accent />
        </RevealItem>
        <RevealItem>
          <KpiCard label="Ticket médio" valor={<AnimatedBRL value={ticketMedio} />} sub="por pedido" />
        </RevealItem>
        <RevealItem>
          <KpiCard label="Lucro por pedido" valor={<AnimatedBRL value={lucroPorPedido} />} sub="média líquida" />
        </RevealItem>
      </RevealStagger>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Line chart receita por dia */}
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-eyebrow mb-1.5">Performance</p>
              <h2 className="font-display text-section text-[var(--color-pearl)]">Receita por dia</h2>
            </div>
            <Calendar className="w-4 h-4 text-[var(--color-steel)]" />
          </div>
          <LineChart dados={linhaReceita} altura={300} />
        </div>

        {/* Donut despesas */}
        <div className="lg:col-span-2 card">
          <div className="mb-6">
            <p className="text-eyebrow mb-1.5">Breakdown</p>
            <h2 className="font-display text-section text-[var(--color-pearl)]">Pra onde foi</h2>
          </div>
          {despesasBreakdown.length > 0 ? (
            <DonutChart
              dados={despesasBreakdown}
              tamanho={200}
              centroLabel="Total saída"
              centroValor={(despesasBreakdown.reduce((s, d) => s + d.valor, 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            />
          ) : (
            <p className="text-sm text-[var(--color-steel)] text-center py-10">Sem despesas no período</p>
          )}
        </div>
      </div>

      {/* Linha por linha — ledger */}
      <Reveal>
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-eyebrow mb-1.5">Ledger</p>
              <h2 className="font-display text-section text-[var(--color-pearl)]">Da receita ao lucro</h2>
            </div>
            <p className="text-eyebrow tabular">{atual.dias} dia{atual.dias !== 1 ? 's' : ''}</p>
          </div>

          <div className="divide-y divide-[rgba(229,228,226,0.06)]">
            <LedgerRow label="Faturamento bruto" valor={atual.receita} highlight />
            <LedgerRow label="(–) Custo dos produtos (COGS)" valor={-atual.cogs} pct={pct(atual.cogs, atual.receita)} />
            <LedgerRow label="(–) Gateway pagamento (MP / Nuvem Pago)" valor={-atual.taxaGw} pct={pct(atual.taxaGw, atual.receita)} />
            <LedgerRow label="(–) Taxa Nuvemshop" valor={-atual.taxaNuvem} pct={pct(atual.taxaNuvem, atual.receita)} />
            <LedgerRow label="(–) Frete absorvido" valor={-atual.frete} pct={pct(atual.frete, atual.receita)} />
            <LedgerRow label="(–) Embalagem" valor={-atual.embalagem} pct={pct(atual.embalagem, atual.receita)} />
            <LedgerRow label={`(–) Custos fixos do período`} valor={-atual.fixos} pct={pct(atual.fixos, atual.receita)} />
            <LedgerRow label="(–) Despesas pontuais" valor={-atual.despesas} pct={pct(atual.despesas, atual.receita)} />
          </div>
          <div className="mt-6 pt-6 border-t border-[rgba(229,228,226,0.15)]">
            <LedgerRow label="= LUCRO LÍQUIDO REAL" valor={lucroReal} destaque />
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function pct(v: number, total: number): number {
  return total > 0 ? (v / total) * 100 : 0;
}

function FiltrosPeriodo({ periodo, inicioCustom, fimCustom }: { periodo: Periodo; inicioCustom?: string; fimCustom?: string }) {
  const opcoes: Array<{ v: Periodo; label: string }> = [
    { v: 'hoje', label: 'Hoje' },
    { v: 'ontem', label: 'Ontem' },
    { v: '7dias', label: '7 dias' },
    { v: 'semana', label: 'Semana' },
    { v: 'mes', label: 'Mês' },
    { v: 'mes_passado', label: 'Mês passado' },
  ];

  return (
    <div className="card flex flex-col lg:flex-row gap-4 items-start lg:items-center">
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map((o) => (
          <Link
            key={o.v}
            href={`/painel?periodo=${o.v}`}
            className="px-4 py-2 rounded-full text-[12px] font-semibold tracking-wider uppercase transition-all"
            style={{
              background: periodo === o.v ? 'linear-gradient(180deg, #FAFAFA, #C0C0C0)' : 'transparent',
              color: periodo === o.v ? 'var(--color-onyx)' : 'var(--color-steel)',
              border: `1px solid ${periodo === o.v ? 'transparent' : 'rgba(229,228,226,0.12)'}`,
            }}
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
          className="input text-xs py-1.5 w-32 border-b border-[rgba(229,228,226,0.14)]"
          aria-label="Início"
        />
        <span className="text-eyebrow">até</span>
        <input
          name="fim"
          type="date"
          defaultValue={fimCustom || ''}
          className="input text-xs py-1.5 w-32 border-b border-[rgba(229,228,226,0.14)]"
          aria-label="Fim"
        />
        <button type="submit" className="btn-ghost text-[10px] py-1.5 px-3">Aplicar</button>
      </form>
    </div>
  );
}

function KpiCard({ label, valor, sub, accent }: { label: string; valor: React.ReactNode; sub: string; accent?: boolean }) {
  return (
    <div className="card group h-full">
      <p className="text-eyebrow mb-3">{label}</p>
      <p className={`font-display text-[clamp(2.4rem,4vw,4rem)] leading-none tabular ${accent ? 'text-platinum-grad' : 'text-[var(--color-pearl)]'}`}>
        {valor}
      </p>
      <p className="mt-3 text-xs text-[var(--color-steel)] tracking-wide">{sub}</p>
    </div>
  );
}

function LedgerRow({ label, valor, pct, highlight, destaque }: { label: string; valor: number; pct?: number; highlight?: boolean; destaque?: boolean }) {
  const cor = destaque
    ? valor >= 0 ? 'text-[var(--color-gain)]' : 'text-[var(--color-loss)]'
    : highlight
    ? 'text-[var(--color-pearl)]'
    : 'text-[var(--color-mist)]';
  return (
    <div className="flex items-baseline justify-between py-3.5 gap-4">
      <span className={`text-sm tracking-wide ${highlight ? 'text-[var(--color-pearl)] font-semibold' : 'text-[var(--color-mist)]'} ${destaque ? 'font-display text-xl tracking-wider uppercase' : ''}`}>
        {label}
      </span>
      <span className="flex items-baseline gap-3">
        {pct != null && pct > 0 && (
          <span className="text-[10px] tabular text-[var(--color-iron)] tracking-wider">
            {pct.toFixed(1)}%
          </span>
        )}
        <span className={`tabular ${destaque ? 'font-display text-3xl tracking-wider' : 'font-display text-xl'} ${cor}`}>
          {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
        </span>
      </span>
    </div>
  );
}
