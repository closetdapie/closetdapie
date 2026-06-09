import { db, pedidos, custosFixos, despesas } from '@/db';
import { gte, lte, and, sql, desc } from 'drizzle-orm';
import {
  startOfMonth, endOfMonth, subMonths, format,
  startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, differenceInDays, eachDayOfInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { agoraBR, paraUTC, fmtBR, TZ } from '@/lib/timezone';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BotaoSincronizar } from '@/components/botao-sincronizar';
import { AnimatedBRL, AnimatedCounter } from '@/components/cinema/animated-counter';
import { Reveal, RevealStagger, RevealItem } from '@/components/cinema/reveal';
import { Sparkline } from '@/components/charts/sparkline';
import { BarChart } from '@/components/charts/bar-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { HeatmapCalendar, type CelulaHeatmap } from '@/components/charts/heatmap';
import { RecentPedidos } from '@/components/painel/recent-pedidos';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Periodo = 'hoje' | 'ontem' | '7dias' | 'semana' | 'mes' | 'mes_passado' | 'custom';

// Tudo em horário BR (America/Sao_Paulo). Datas retornadas em UTC absoluto pra Drizzle.
function resolverIntervalo(periodo: Periodo, inicioCustom?: string, fimCustom?: string): { inicio: Date; fim: Date; label: string } {
  const agoraBr = agoraBR();
  switch (periodo) {
    case 'hoje':
      return { inicio: paraUTC(startOfDay(agoraBr)), fim: paraUTC(endOfDay(agoraBr)), label: 'Hoje' };
    case 'ontem': {
      const o = subDays(agoraBr, 1);
      return { inicio: paraUTC(startOfDay(o)), fim: paraUTC(endOfDay(o)), label: 'Ontem' };
    }
    case '7dias':
      return { inicio: paraUTC(startOfDay(subDays(agoraBr, 6))), fim: paraUTC(endOfDay(agoraBr)), label: 'Últimos 7 dias' };
    case 'semana':
      return { inicio: paraUTC(startOfWeek(agoraBr, { weekStartsOn: 1 })), fim: paraUTC(endOfWeek(agoraBr, { weekStartsOn: 1 })), label: 'Esta semana' };
    case 'mes_passado': {
      const m = subMonths(agoraBr, 1);
      return { inicio: paraUTC(startOfMonth(m)), fim: paraUTC(endOfMonth(m)), label: format(m, "MMMM", { locale: ptBR }) };
    }
    case 'custom':
      if (inicioCustom && fimCustom) {
        const ini = paraUTC(startOfDay(new Date(inicioCustom + 'T00:00:00')));
        const fim = paraUTC(endOfDay(new Date(fimCustom + 'T00:00:00')));
        return { inicio: ini, fim, label: `${fmtBR(ini, 'dd/MM')} – ${fmtBR(fim, 'dd/MM')}` };
      }
      return { inicio: paraUTC(startOfMonth(agoraBr)), fim: paraUTC(endOfMonth(agoraBr)), label: format(agoraBr, "MMMM", { locale: ptBR }) };
    case 'mes':
    default:
      return { inicio: paraUTC(startOfMonth(agoraBr)), fim: paraUTC(endOfMonth(agoraBr)), label: format(agoraBr, "MMMM", { locale: ptBR }) };
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
  // agrupa por dia EM TIMEZONE BR (não UTC)
  const rows = await db
    .select({
      dia: sql<string>`DATE(${pedidos.dataPedido} AT TIME ZONE 'America/Sao_Paulo')`,
      total: sql<string>`COALESCE(SUM(${pedidos.total}), 0)`,
      lucro: sql<string>`COALESCE(SUM(${pedidos.lucroLiquido}), 0)`,
      qtd: sql<string>`COUNT(*)::int`,
    })
    .from(pedidos)
    .where(and(gte(pedidos.dataPedido, inicio), lte(pedidos.dataPedido, fim), sql`${pedidos.status} = 'paid'`))
    .groupBy(sql`DATE(${pedidos.dataPedido} AT TIME ZONE 'America/Sao_Paulo')`)
    .orderBy(sql`DATE(${pedidos.dataPedido} AT TIME ZONE 'America/Sao_Paulo')`);

  const mapa = new Map(rows.map((r) => [r.dia, r]));
  // gera dias em BR — converte cada Date pra wall-clock BR antes de gerar a sequência
  const inicioBR = toZonedTime(inicio, TZ);
  const fimBR = toZonedTime(fim, TZ);
  const todosDias = eachDayOfInterval({ start: inicioBR, end: fimBR });
  return todosDias.map((d) => {
    const k = format(d, 'yyyy-MM-dd');
    const r = mapa.get(k);
    return {
      data: d,
      label: format(d, 'dd/MM'),
      labelCurto: format(d, 'dd'),
      receita: r ? Number(r.total) : 0,
      lucro: r ? Number(r.lucro) : 0,
      qtd: r ? Number(r.qtd) : 0,
    };
  });
}

async function heatmapHoraDia(inicio: Date, fim: Date): Promise<CelulaHeatmap[]> {
  // EXTRACT no horário BR (não UTC)
  const rows = await db
    .select({
      dia: sql<string>`EXTRACT(ISODOW FROM ${pedidos.dataPedido} AT TIME ZONE 'America/Sao_Paulo')::int`,
      hora: sql<string>`EXTRACT(HOUR FROM ${pedidos.dataPedido} AT TIME ZONE 'America/Sao_Paulo')::int`,
      total: sql<string>`COALESCE(SUM(${pedidos.total}), 0)`,
    })
    .from(pedidos)
    .where(and(gte(pedidos.dataPedido, inicio), lte(pedidos.dataPedido, fim), sql`${pedidos.status} = 'paid'`))
    .groupBy(sql`EXTRACT(ISODOW FROM ${pedidos.dataPedido} AT TIME ZONE 'America/Sao_Paulo'), EXTRACT(HOUR FROM ${pedidos.dataPedido} AT TIME ZONE 'America/Sao_Paulo')`);

  return rows.map((r) => ({
    diaSemana: Number(r.dia) - 1,
    hora: Number(r.hora),
    valor: Number(r.total),
  }));
}

async function ultimosPedidos(inicio: Date, fim: Date) {
  return db
    .select({
      id: pedidos.id,
      numero: pedidos.numero,
      cliente: pedidos.clienteNome,
      total: pedidos.total,
      status: pedidos.status,
      meio: pedidos.meioPagamento,
      data: pedidos.dataPedido,
      lucro: pedidos.lucroLiquido,
    })
    .from(pedidos)
    .where(and(gte(pedidos.dataPedido, inicio), lte(pedidos.dataPedido, fim)))
    .orderBy(desc(pedidos.dataPedido))
    .limit(8);
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string }> }) {
  const sp = await searchParams;
  const periodo = ((['hoje', 'ontem', '7dias', 'semana', 'mes', 'mes_passado', 'custom'] as const).includes(sp.periodo as Periodo) ? sp.periodo : 'mes') as Periodo;
  const intervalo = resolverIntervalo(periodo, sp.inicio, sp.fim);

  const atual = await dadosDoIntervalo(intervalo.inicio, intervalo.fim);
  const tamanho = differenceInDays(intervalo.fim, intervalo.inicio) + 1;
  const anterior = await dadosDoIntervalo(subDays(intervalo.inicio, tamanho), subDays(intervalo.fim, tamanho));
  const serieDias = await receitaPorDia(intervalo.inicio, intervalo.fim);
  const heatmap = await heatmapHoraDia(intervalo.inicio, intervalo.fim);
  const recentPedidos = await ultimosPedidos(intervalo.inicio, intervalo.fim);

  const lucroReal = atual.lucroPedidos - atual.fixos - atual.despesas;
  const margemReal = atual.receita > 0 ? (lucroReal / atual.receita) * 100 : 0;
  const lucroAnterior = anterior.lucroPedidos - anterior.fixos - anterior.despesas;
  const variacao = lucroAnterior !== 0 ? ((lucroReal - lucroAnterior) / Math.abs(lucroAnterior)) * 100 : 0;
  const variacaoReceita = anterior.receita !== 0 ? ((atual.receita - anterior.receita) / anterior.receita) * 100 : 0;
  const ticketMedio = atual.qtd > 0 ? atual.receita / atual.qtd : 0;
  const ticketAnterior = anterior.qtd > 0 ? anterior.receita / anterior.qtd : 0;
  const variacaoTicket = ticketAnterior !== 0 ? ((ticketMedio - ticketAnterior) / ticketAnterior) * 100 : 0;
  const variacaoPedidos = anterior.qtd !== 0 ? ((atual.qtd - anterior.qtd) / anterior.qtd) * 100 : 0;

  // sparkline data
  const sparkReceita = serieDias.map((d) => d.receita);
  const sparkLucro = serieDias.map((d) => d.lucro);
  const sparkPedidos = serieDias.map((d) => d.qtd);

  const despesasBreakdown = [
    { label: 'Produtos (COGS)', valor: atual.cogs },
    { label: 'Gateway pagamento', valor: atual.taxaGw },
    { label: 'Taxa Nuvemshop', valor: atual.taxaNuvem },
    { label: 'Frete', valor: atual.frete },
    { label: 'Embalagem', valor: atual.embalagem },
    { label: 'Custos fixos', valor: atual.fixos },
    { label: 'Despesas pontuais', valor: atual.despesas },
  ].filter((d) => d.valor > 0);

  const totalSaidas = despesasBreakdown.reduce((s, d) => s + d.valor, 0);

  const dadosBar = serieDias.map((d) => ({ label: d.labelCurto, valor: d.receita }));

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-5 lg:py-7 max-w-[1400px] mx-auto">
      {/* TOP BAR */}
      <header className="flex items-center justify-between gap-3 mb-5 lg:mb-7">
        <div className="min-w-0">
          <p className="text-eyebrow mb-0.5">Visão geral</p>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[var(--color-ink)] truncate">
            Olá, Pietra <span className="inline-block animate-wave">👋</span>
          </h1>
        </div>
        <div className="shrink-0">
          <BotaoSincronizar />
        </div>
      </header>

      {/* PERIOD FILTER */}
      <Reveal delay={0.05}>
        <FiltrosPeriodo periodo={periodo} inicioCustom={sp.inicio} fimCustom={sp.fim} />
      </Reveal>

      {/* HERO LUCRO REAL */}
      <Reveal delay={0.15}>
        <div className="card mt-5 relative overflow-hidden card-hover" style={{ padding: '1.25rem' }}>
          <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full opacity-40 pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(245,224,228,0.8) 0%, transparent 70%)' }} />
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="min-w-0">
              <p className="text-eyebrow mb-2">Lucro líquido real · {intervalo.label}</p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <p className="font-display text-[clamp(2.8rem,9vw,6rem)] leading-[0.85] tabular text-[var(--color-ink)]">
                  <AnimatedBRL value={lucroReal} />
                </p>
                {lucroAnterior !== 0 && (
                  <span className={`pill ${variacao >= 0 ? 'pill-gain' : 'pill-loss'}`}>
                    {variacao >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(variacao).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-ink-3)] mt-3">
                Margem de <strong className="text-[var(--color-ink)]"><AnimatedCounter value={margemReal} decimals={1} suffix="%" /></strong> sobre R$ <AnimatedCounter value={atual.receita / 1000} decimals={1} suffix="k" /> em <strong className="text-[var(--color-ink)]">{atual.qtd}</strong> pedido{atual.qtd !== 1 ? 's' : ''}.
              </p>
            </div>
            <div className="lg:w-[380px] w-full">
              <Sparkline dados={sparkLucro} width={380} height={70} cor="#B25667" />
              <div className="flex justify-between text-[10px] text-[var(--color-ink-4)] tracking-wider uppercase mt-1">
                <span>{serieDias[0]?.label}</span>
                <span>{serieDias[serieDias.length - 1]?.label}</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* KPI ROW */}
      <RevealStagger delay={0.05} stagger={0.08} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <RevealItem>
          <KpiCard
            label="Faturamento"
            valor={<AnimatedBRL value={atual.receita} />}
            variacao={variacaoReceita}
            spark={sparkReceita}
            sparkColor="#0A0A0F"
          />
        </RevealItem>
        <RevealItem>
          <KpiCard
            label="Ticket médio"
            valor={<AnimatedBRL value={ticketMedio} />}
            variacao={variacaoTicket}
            spark={serieDias.map((d) => d.qtd > 0 ? d.receita / d.qtd : 0)}
            sparkColor="#3A3A44"
          />
        </RevealItem>
        <RevealItem>
          <KpiCard
            label="Pedidos pagos"
            valor={<AnimatedCounter value={atual.qtd} />}
            variacao={variacaoPedidos}
            spark={sparkPedidos}
            sparkColor="#B25667"
            integerValor
          />
        </RevealItem>
      </RevealStagger>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
        {/* Receita por dia — Bar chart */}
        <Reveal delay={0.05} className="lg:col-span-3">
          <div className="card h-full">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-eyebrow mb-1">Performance diária</p>
                <h2 className="text-lg font-semibold text-[var(--color-ink)] tracking-tight">Receita por dia</h2>
              </div>
              <span className="pill"><Activity className="w-3 h-3" /> Tempo real</span>
            </div>
            <BarChart dados={dadosBar} altura={300} />
          </div>
        </Reveal>

        {/* Donut breakdown */}
        <Reveal delay={0.1} className="lg:col-span-2">
          <div className="card h-full">
            <div className="mb-5">
              <p className="text-eyebrow mb-1">Composição</p>
              <h2 className="text-lg font-semibold text-[var(--color-ink)] tracking-tight">Pra onde foi o dinheiro</h2>
            </div>
            {despesasBreakdown.length > 0 ? (
              <DonutChart
                dados={despesasBreakdown}
                tamanho={180}
                centroLabel="Saída total"
                centroValor={totalSaidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              />
            ) : (
              <p className="text-sm text-[var(--color-ink-4)] text-center py-12">Sem despesas no período</p>
            )}
          </div>
        </Reveal>
      </div>

      {/* HEATMAP + ULTIMOS PEDIDOS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
        <Reveal delay={0.05} className="lg:col-span-3">
          <div className="card h-full">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-eyebrow mb-1">Comportamento</p>
                <h2 className="text-lg font-semibold text-[var(--color-ink)] tracking-tight">Quando suas clientes mais compram</h2>
                <p className="text-xs text-[var(--color-ink-4)] mt-1">Distribuição de receita por dia da semana e faixa de hora</p>
              </div>
            </div>
            <HeatmapCalendar dados={heatmap} />
          </div>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-2">
          <div className="card h-full flex flex-col">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-eyebrow mb-1">Recentes</p>
                <h2 className="text-lg font-semibold text-[var(--color-ink)] tracking-tight">Últimos pedidos</h2>
              </div>
              <Link href="/painel/pedidos" className="pill hover:bg-[var(--color-surface-2)] transition-colors">
                Ver todos
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <RecentPedidos pedidos={recentPedidos.map((p) => ({ ...p, total: String(p.total) }))} />
          </div>
        </Reveal>
      </div>

      {/* LEDGER */}
      <Reveal delay={0.05}>
        <div className="card mt-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-eyebrow mb-1">Ledger</p>
              <h2 className="text-lg font-semibold text-[var(--color-ink)] tracking-tight">Da receita ao lucro real</h2>
            </div>
            <span className="pill">{atual.dias} dia{atual.dias !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-[var(--color-line)]">
            <LedgerRow label="Faturamento bruto" valor={atual.receita} accent />
            <LedgerRow label="Custo dos produtos (COGS)" valor={-atual.cogs} pct={pct(atual.cogs, atual.receita)} />
            <LedgerRow label="Gateway pagamento (MP / Nuvem Pago)" valor={-atual.taxaGw} pct={pct(atual.taxaGw, atual.receita)} />
            <LedgerRow label="Taxa Nuvemshop" valor={-atual.taxaNuvem} pct={pct(atual.taxaNuvem, atual.receita)} />
            <LedgerRow label="Frete absorvido" valor={-atual.frete} pct={pct(atual.frete, atual.receita)} />
            <LedgerRow label="Embalagem" valor={-atual.embalagem} pct={pct(atual.embalagem, atual.receita)} />
            <LedgerRow label={`Custos fixos do período`} valor={-atual.fixos} pct={pct(atual.fixos, atual.receita)} />
            <LedgerRow label="Despesas pontuais" valor={-atual.despesas} pct={pct(atual.despesas, atual.receita)} />
          </div>
          <div className="mt-5 pt-5 border-t border-[var(--color-line-2)]">
            <LedgerRow label="Lucro líquido real" valor={lucroReal} destaque />
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
    <div className="card flex flex-col lg:flex-row gap-3 items-stretch lg:items-center" style={{ padding: '0.9rem 1.1rem' }}>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map((o) => (
          <Link key={o.v} href={`/painel?periodo=${o.v}`} className={`pill ${periodo === o.v ? 'pill-active' : ''} hover:bg-[var(--color-surface-2)] transition-colors`}>
            {o.label}
          </Link>
        ))}
      </div>

      <form action="/painel" method="get" className="flex items-center gap-1.5 lg:gap-2 lg:ml-auto flex-wrap">
        <input type="hidden" name="periodo" value="custom" />
        <input
          name="inicio"
          type="date"
          defaultValue={inicioCustom || ''}
          className="input text-[11px] py-1.5 w-[120px] sm:w-32 flex-1 sm:flex-initial"
          aria-label="Início"
        />
        <span className="text-[10px] text-[var(--color-ink-4)] uppercase tracking-wider hidden sm:inline">até</span>
        <input
          name="fim"
          type="date"
          defaultValue={fimCustom || ''}
          className="input text-[11px] py-1.5 w-[120px] sm:w-32 flex-1 sm:flex-initial"
          aria-label="Fim"
        />
        <button type="submit" className="btn-ghost text-[11px] py-1.5 px-3">Aplicar</button>
      </form>
    </div>
  );
}

function KpiCard({
  label, valor, variacao, spark, sparkColor, integerValor,
}: {
  label: string;
  valor: React.ReactNode;
  variacao: number;
  spark: number[];
  sparkColor: string;
  integerValor?: boolean;
}) {
  const hasVariacao = isFinite(variacao) && variacao !== 0;
  const positiva = variacao >= 0;
  return (
    <div className="card card-hover h-full">
      <div className="flex items-start justify-between mb-4">
        <p className="text-eyebrow">{label}</p>
        {hasVariacao && (
          <span className={`pill ${positiva ? 'pill-gain' : 'pill-loss'}`}>
            {positiva ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(variacao).toFixed(0)}%
          </span>
        )}
      </div>
      <p className={`font-display tabular text-[var(--color-ink)] leading-none ${integerValor ? 'text-5xl' : 'text-[clamp(2rem,3.5vw,3rem)]'}`}>
        {valor}
      </p>
      <div className="mt-4">
        <Sparkline dados={spark} width={300} height={40} cor={sparkColor} />
      </div>
    </div>
  );
}

function LedgerRow({ label, valor, pct, accent, destaque }: { label: string; valor: number; pct?: number; accent?: boolean; destaque?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-3 gap-4">
      <span className={`text-sm tracking-tight ${
        destaque ? 'text-[var(--color-ink)] font-semibold text-base' :
        accent ? 'text-[var(--color-ink)] font-medium' :
        'text-[var(--color-ink-2)]'
      }`}>
        {accent && !destaque && '+ '}
        {!accent && !destaque && '− '}
        {label}
      </span>
      <span className="flex items-baseline gap-3">
        {pct != null && pct > 0 && (
          <span className="text-[10px] tabular text-[var(--color-ink-4)] tracking-wider">
            {pct.toFixed(1)}%
          </span>
        )}
        <span className={`tabular font-display ${
          destaque ? `text-2xl tracking-wide ${valor >= 0 ? 'text-[var(--color-gain)]' : 'text-[var(--color-loss)]'}` :
          accent ? 'text-xl text-[var(--color-ink)]' :
          'text-base text-[var(--color-ink-2)]'
        }`}>
          {Math.abs(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
        </span>
      </span>
    </div>
  );
}
