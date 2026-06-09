import { db, pedidos } from '@/db';
import { desc, gte, lte, and, sql, ilike, or } from 'drizzle-orm';
import { format,
  startOfMonth, endOfMonth, subMonths,
  startOfDay, endOfDay, startOfWeek, endOfWeek, subDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, AlertCircle, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Reveal } from '@/components/cinema/reveal';

export const dynamic = 'force-dynamic';

type Periodo = 'hoje' | 'ontem' | '7dias' | 'semana' | 'mes' | 'mes_passado' | 'custom' | 'tudo';

function resolverIntervalo(periodo: Periodo, inicioCustom?: string, fimCustom?: string): { inicio: Date | null; fim: Date | null; label: string } {
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
    case 'tudo':
      return { inicio: null, fim: null, label: 'Tudo' };
    case 'mes':
    default:
      return { inicio: startOfMonth(agora), fim: endOfMonth(agora), label: format(agora, "MMMM", { locale: ptBR }) };
  }
}

const POR_PAGINA = 50;

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string; q?: string; pag?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const periodo = ((['hoje', 'ontem', '7dias', 'semana', 'mes', 'mes_passado', 'custom', 'tudo'] as const).includes(sp.periodo as Periodo)
    ? sp.periodo
    : 'mes') as Periodo;
  const intervalo = resolverIntervalo(periodo, sp.inicio, sp.fim);
  const q = (sp.q || '').trim();
  const status = sp.status || 'todos';
  const pag = Math.max(1, parseInt(sp.pag || '1', 10));

  // condições
  const conds = [];
  if (intervalo.inicio) conds.push(gte(pedidos.dataPedido, intervalo.inicio));
  if (intervalo.fim) conds.push(lte(pedidos.dataPedido, intervalo.fim));
  if (q) conds.push(or(ilike(pedidos.clienteNome, `%${q}%`), sql`${pedidos.numero}::text ILIKE ${`%${q}%`}`)!);
  if (status !== 'todos') {
    if (status === 'cancelados') conds.push(sql`${pedidos.status} IN ('voided','refunded','cancelled')`);
    else conds.push(sql`${pedidos.status} = ${status}`);
  }
  const where = conds.length > 0 ? and(...conds) : undefined;

  // contagens + agregados
  const [stats] = await db
    .select({
      total: sql<string>`COUNT(*)::int`,
      pagos: sql<string>`COUNT(*) FILTER (WHERE ${pedidos.status} = 'paid')::int`,
      cancelados: sql<string>`COUNT(*) FILTER (WHERE ${pedidos.status} IN ('voided','refunded','cancelled'))::int`,
      receita: sql<string>`COALESCE(SUM(${pedidos.total}) FILTER (WHERE ${pedidos.status} = 'paid'), 0)`,
      lucro: sql<string>`COALESCE(SUM(${pedidos.lucroLiquido}) FILTER (WHERE ${pedidos.status} = 'paid'), 0)`,
    })
    .from(pedidos)
    .where(where);

  const totalNum = Number(stats?.total ?? 0);
  const pagosNum = Number(stats?.pagos ?? 0);
  const canceladosNum = Number(stats?.cancelados ?? 0);
  const receitaNum = Number(stats?.receita ?? 0);
  const lucroNum = Number(stats?.lucro ?? 0);

  const lista = await db
    .select()
    .from(pedidos)
    .where(where)
    .orderBy(desc(pedidos.dataPedido))
    .limit(POR_PAGINA)
    .offset((pag - 1) * POR_PAGINA);

  const totalPaginas = Math.max(1, Math.ceil(totalNum / POR_PAGINA));

  const linkPag = (p: number) => {
    const params = new URLSearchParams();
    params.set('periodo', periodo);
    if (sp.inicio) params.set('inicio', sp.inicio);
    if (sp.fim) params.set('fim', sp.fim);
    if (q) params.set('q', q);
    if (status !== 'todos') params.set('status', status);
    params.set('pag', String(p));
    return `/painel/pedidos?${params}`;
  };

  return (
    <div className="px-8 lg:px-10 py-7 max-w-[1400px] mx-auto">
      {/* Header */}
      <header className="mb-7">
        <p className="text-eyebrow mb-1">Vendas</p>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Pedidos</h1>
        <p className="text-sm text-[var(--color-ink-3)] mt-1.5">
          Cada pedido com cálculo de lucro real: taxa gateway + Nuvemshop + COGS + frete + embalagem.
        </p>
      </header>

      {/* Stats */}
      <Reveal>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <StatCard label="Total" valor={totalNum.toLocaleString('pt-BR')} />
          <StatCard label="Pagos" valor={pagosNum.toLocaleString('pt-BR')} tom="gain" />
          <StatCard label="Cancelados" valor={canceladosNum.toLocaleString('pt-BR')} tom="loss" />
          <StatCard label="Receita" valor={fmtMoeda(receitaNum)} />
          <StatCard label="Lucro" valor={fmtMoeda(lucroNum)} />
        </div>
      </Reveal>

      {/* Filtros */}
      <Reveal delay={0.1}>
        <Filtros periodo={periodo} inicioCustom={sp.inicio} fimCustom={sp.fim} q={q} status={status} />
      </Reveal>

      {/* Tabela */}
      {lista.length === 0 ? (
        <div className="card flex items-start gap-3 bg-amber-50 border-amber-200 mt-5">
          <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-900">
            <strong>Nenhum pedido encontrado nesse filtro.</strong> Troca o período ou limpa a busca.
          </div>
        </div>
      ) : (
        <Reveal delay={0.15}>
          <div className="card-flush mt-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-line)]">
                    <Th>#</Th>
                    <Th>Data</Th>
                    <Th>Cliente</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">Custos</Th>
                    <Th align="right">Lucro</Th>
                    <Th align="right">Margem</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)]">
                  {lista.map((p) => {
                    const lucro = Number(p.lucroLiquido || 0);
                    const margem = Number(p.margemPercent || 0);
                    const custos =
                      Number(p.taxaGateway || 0) +
                      Number(p.taxaNuvemshop || 0) +
                      Number(p.cogsTotal || 0) +
                      Number(p.custoEmbalagem || 0) +
                      Number(p.custoFrete || 0);
                    const cancelado = p.status === 'voided' || p.status === 'refunded' || p.status === 'cancelled';
                    return (
                      <tr key={p.id} className="hover:bg-[var(--color-surface-2)] transition-colors">
                        <td className="p-3 text-xs tabular text-[var(--color-ink-3)]">#{p.numero}</td>
                        <td className="p-3 text-xs text-[var(--color-ink-3)] whitespace-nowrap">
                          {format(p.dataPedido, "dd MMM · HH:mm", { locale: ptBR })}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full bg-[var(--color-blush-soft)] grid place-items-center text-[var(--color-blush-deep)] font-display text-[11px] leading-none shrink-0">
                              {(p.clienteNome || '?').slice(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-[var(--color-ink)] truncate max-w-[200px]">
                                {p.clienteNome || '—'}
                              </p>
                              <p className="text-[11px] text-[var(--color-ink-4)]">{p.meioPagamento || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right font-display tabular text-[var(--color-ink)] text-base">
                          {fmtMoeda(Number(p.total))}
                        </td>
                        <td className="p-3 text-right tabular text-[var(--color-ink-3)] text-xs">
                          {fmtMoeda(-custos)}
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-display tabular text-base ${
                            cancelado ? 'text-[var(--color-ink-4)]' :
                            lucro >= 0 ? 'text-[var(--color-gain)]' : 'text-[var(--color-loss)]'
                          }`}>
                            {cancelado ? '—' : fmtMoeda(lucro)}
                          </span>
                        </td>
                        <td className="p-3 text-right text-xs">
                          {cancelado ? (
                            <span className="text-[var(--color-ink-4)]">—</span>
                          ) : (
                            <span className={`font-semibold tabular ${
                              margem >= 35 ? 'text-[var(--color-gain)]' :
                              margem >= 15 ? 'text-[var(--color-warn)]' :
                              'text-[var(--color-loss)]'
                            }`}>
                              {margem.toFixed(0)}%
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-5 text-sm">
          <p className="text-[var(--color-ink-3)]">
            Página <strong className="text-[var(--color-ink)] tabular">{pag}</strong> de <strong className="text-[var(--color-ink)] tabular">{totalPaginas}</strong> · mostrando {lista.length} de {totalNum.toLocaleString('pt-BR')} pedidos
          </p>
          <div className="flex gap-2">
            {pag > 1 ? (
              <Link href={linkPag(pag - 1)} className="btn-ghost">
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </Link>
            ) : <span />}
            {pag < totalPaginas ? (
              <Link href={linkPag(pag + 1)} className="btn-ghost">
                Próxima <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : <span />}
          </div>
        </div>
      )}
    </div>
  );
}

function fmtMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`p-3 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink-3)] text-${align}`}>
      {children}
    </th>
  );
}

function StatCard({ label, valor, tom }: { label: string; valor: string; tom?: 'gain' | 'loss' }) {
  return (
    <div className="card" style={{ padding: '1rem 1.1rem' }}>
      <p className="text-eyebrow text-[10px] mb-1.5">{label}</p>
      <p className={`font-display text-2xl leading-none tabular ${
        tom === 'gain' ? 'text-[var(--color-gain)]' :
        tom === 'loss' ? 'text-[var(--color-loss)]' :
        'text-[var(--color-ink)]'
      }`}>
        {valor}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; pill: string }> = {
    paid: { label: 'Pago', pill: 'pill-gain' },
    voided: { label: 'Recusado', pill: 'pill-loss' },
    cancelled: { label: 'Cancelado', pill: 'pill-loss' },
    refunded: { label: 'Reembolso', pill: 'pill-loss' },
    pending: { label: 'Pendente', pill: 'pill-warn' },
    abandoned: { label: 'Abandonado', pill: 'pill-warn' },
  };
  const m = map[status] || { label: status, pill: '' };
  return <span className={`pill ${m.pill}`}>{m.label}</span>;
}

function Filtros({ periodo, inicioCustom, fimCustom, q, status }: {
  periodo: Periodo; inicioCustom?: string; fimCustom?: string; q: string; status: string;
}) {
  const opcoes: Array<{ v: Periodo; label: string }> = [
    { v: 'hoje', label: 'Hoje' },
    { v: 'ontem', label: 'Ontem' },
    { v: '7dias', label: '7 dias' },
    { v: 'semana', label: 'Semana' },
    { v: 'mes', label: 'Mês' },
    { v: 'mes_passado', label: 'Mês passado' },
    { v: 'tudo', label: 'Tudo' },
  ];
  return (
    <div className="card" style={{ padding: '1rem 1.1rem' }}>
      <form action="/painel/pedidos" method="get" className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
        {/* Período */}
        <div className="flex flex-wrap gap-1.5">
          {opcoes.map((o) => (
            <Link
              key={o.v}
              href={`/painel/pedidos?periodo=${o.v}${q ? `&q=${encodeURIComponent(q)}` : ''}${status !== 'todos' ? `&status=${status}` : ''}`}
              className={`pill ${periodo === o.v ? 'pill-active' : ''} hover:bg-[var(--color-surface-2)] transition-colors`}
            >
              {o.label}
            </Link>
          ))}
        </div>

        {/* Busca + status */}
        <div className="flex items-center gap-2 lg:ml-auto w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-ink-4)]" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Cliente ou #pedido"
              className="input pl-8 py-1.5 text-xs w-full lg:w-56"
            />
          </div>
          <select name="status" defaultValue={status} className="input py-1.5 text-xs w-32">
            <option value="todos">Todos status</option>
            <option value="paid">Pagos</option>
            <option value="cancelados">Cancelados</option>
            <option value="pending">Pendentes</option>
            <option value="abandoned">Abandonados</option>
          </select>
          <input type="hidden" name="periodo" value={periodo} />
          {inicioCustom && <input type="hidden" name="inicio" value={inicioCustom} />}
          {fimCustom && <input type="hidden" name="fim" value={fimCustom} />}
          <button type="submit" className="btn-ghost text-xs py-1.5 px-3">Filtrar</button>
        </div>
      </form>
    </div>
  );
}
