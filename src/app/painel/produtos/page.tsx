import { db, produtosCogs } from '@/db';
import { sql, ilike, or, eq, isNotNull, asc } from 'drizzle-orm';
import { formatBRL } from '@/lib/calcular-lucro';
import { criarProdutoCogs, atualizarCogs, deletarProdutoCogs } from '@/lib/produtos-actions';
import { Trash2, Save, Search, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const POR_PAGINA = 50;

export default async function ProdutosPage({ searchParams }: { searchParams: Promise<{ q?: string; pag?: string; filtro?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  const pag = Math.max(1, parseInt(sp.pag || '1', 10));
  const filtro = sp.filtro || 'todos'; // todos | sem_cogs | com_cogs

  // Contadores
  const [{ total }] = await db.select({ total: sql<string>`COUNT(*)::int` }).from(produtosCogs);
  const [{ semCogs }] = await db
    .select({ semCogs: sql<string>`COUNT(*)::int` })
    .from(produtosCogs)
    .where(eq(produtosCogs.custoUnitario, '0'));
  const totalNum = Number(total);
  const semCogsNum = Number(semCogs);
  const comCogsNum = totalNum - semCogsNum;

  // Lista
  const where = [];
  if (q) where.push(or(ilike(produtosCogs.nome, `%${q}%`), ilike(produtosCogs.sku, `%${q}%`)));
  if (filtro === 'sem_cogs') where.push(eq(produtosCogs.custoUnitario, '0'));
  if (filtro === 'com_cogs') where.push(sql`${produtosCogs.custoUnitario}::numeric > 0`);

  const baseQuery = db.select().from(produtosCogs);
  const lista = await (where.length > 0
    ? baseQuery.where(sql.join(where, sql` AND `))
    : baseQuery
  )
    .orderBy(asc(produtosCogs.nome))
    .limit(POR_PAGINA)
    .offset((pag - 1) * POR_PAGINA);

  const totalPaginas = Math.ceil(totalNum / POR_PAGINA);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Produtos — Custo (COGS)</h1>
        <p className="text-sm text-[var(--color-ink-mute)] mt-1">
          {totalNum} produtos importados da Nuvemshop. Preencha o custo de cada peça pra calcular a margem real.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total" valor={totalNum} cor="text-[var(--color-ink)]" />
        <Stat label="Com COGS preenchido" valor={comCogsNum} cor="text-[var(--color-success)]" />
        <Stat label="Faltam preencher" valor={semCogsNum} cor={semCogsNum > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'} />
      </div>

      {semCogsNum > 0 && (
        <div className="card flex items-start gap-3 bg-amber-50 border-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-900">
            <strong>{semCogsNum} produtos sem custo cadastrado.</strong>{' '}
            Comece pelos top sellers — o sistema vai calcular o lucro real de cada venda automaticamente quando você sincronizar pedidos.
          </div>
        </div>
      )}

      {/* Filtros + Busca */}
      <form className="card flex flex-col md:flex-row gap-3 items-end">
        <div className="flex-1">
          <label className="label">Buscar produto</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-faint)]" />
            <input
              name="q"
              defaultValue={q}
              className="input pl-9"
              placeholder="Body Vampy, Shorts Saia, Vestido Crazy..."
            />
          </div>
        </div>
        <div>
          <label className="label">Filtro</label>
          <select name="filtro" defaultValue={filtro} className="input">
            <option value="todos">Todos</option>
            <option value="sem_cogs">Sem COGS</option>
            <option value="com_cogs">Com COGS</option>
          </select>
        </div>
        <input type="hidden" name="pag" value="1" />
        <button type="submit" className="btn">Buscar</button>
      </form>

      {/* Lista */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-cream)] text-[11px] uppercase tracking-wider text-[var(--color-ink-mute)]">
            <tr>
              <th className="text-left p-3">Produto</th>
              <th className="text-right p-3">Preço venda</th>
              <th className="text-right p-3">Custo (COGS)</th>
              <th className="text-right p-3">Margem</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {lista.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-[var(--color-ink-mute)]">Nenhum produto encontrado</td></tr>
            ) : lista.map((p) => {
              const custo = Number(p.custoUnitario);
              const preco = p.precoVenda ? Number(p.precoVenda) : null;
              const margem = preco && custo > 0 ? ((preco - custo) / preco) * 100 : null;
              return (
                <tr key={p.id} className="hover:bg-[var(--color-cream)]">
                  <td className="p-3">
                    <p className="font-medium">{p.nome}</p>
                    {p.nuvemshopProductId && (
                      <p className="text-xs text-[var(--color-ink-faint)] mt-0.5 font-mono">NS#{p.nuvemshopProductId}</p>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {preco != null ? formatBRL(preco) : <span className="text-[var(--color-ink-faint)]">—</span>}
                  </td>
                  <td className="p-3 text-right">
                    <form action={atualizarCogs} className="flex items-center gap-1.5 justify-end">
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        name="custoUnitario"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={custo}
                        className="input text-sm text-right w-24"
                      />
                      <button type="submit" className="btn-ghost p-1.5" title="Salvar custo">
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </td>
                  <td className="p-3 text-right">
                    {margem != null ? (
                      <span className={`text-xs font-semibold ${margem >= 50 ? 'text-[var(--color-success)]' : margem >= 30 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>
                        {margem.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-[var(--color-ink-faint)] text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <form action={deletarProdutoCogs}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-[var(--color-ink-faint)] hover:text-[var(--color-danger)] p-1" title="Excluir">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-[var(--color-ink-mute)]">
            Página {pag} de {totalPaginas} · mostrando {lista.length} de {totalNum}
          </p>
          <div className="flex gap-2">
            {pag > 1 && (
              <Link
                href={`/painel/produtos?q=${encodeURIComponent(q)}&filtro=${filtro}&pag=${pag - 1}`}
                className="btn-ghost"
              >
                ← Anterior
              </Link>
            )}
            {pag < totalPaginas && (
              <Link
                href={`/painel/produtos?q=${encodeURIComponent(q)}&filtro=${filtro}&pag=${pag + 1}`}
                className="btn-ghost"
              >
                Próxima →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Cadastro manual (caso de produto fora da Nuvemshop) */}
      <details className="card">
        <summary className="font-semibold cursor-pointer">+ Cadastrar produto manualmente</summary>
        <form action={criarProdutoCogs} className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label className="label">Nome</label>
            <input name="nome" required className="input" placeholder="Ex: Body Vampy Preto" />
          </div>
          <div className="md:col-span-2">
            <label className="label">SKU</label>
            <input name="sku" className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Custo</label>
            <input name="custoUnitario" type="number" step="0.01" min="0" required className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Preço venda</label>
            <input name="precoVenda" type="number" step="0.01" min="0" className="input" />
          </div>
          <div className="md:col-span-1">
            <label className="label opacity-0">.</label>
            <button type="submit" className="btn w-full justify-center">+</button>
          </div>
        </form>
      </details>
    </div>
  );
}

function Stat({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div className="card">
      <p className="text-[11px] uppercase tracking-wider text-[var(--color-ink-mute)]">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${cor}`}>{valor}</p>
    </div>
  );
}
