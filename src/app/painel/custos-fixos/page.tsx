import { db, custosFixos } from '@/db';
import { desc, isNull } from 'drizzle-orm';
import { formatBRL } from '@/lib/calcular-lucro';
import { criarCustoFixo, encerrarCustoFixo, deletarCustoFixo } from '@/lib/despesas-actions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, CircleStop } from 'lucide-react';

export const dynamic = 'force-dynamic';

const CATEGORIAS = [
  { v: 'plataforma', l: 'Plataforma (Nuvemshop, apps)' },
  { v: 'marketing', l: 'Marketing fixo (contratos)' },
  { v: 'operacional', l: 'Operacional (internet, software)' },
  { v: 'pessoal', l: 'Pessoal (salário, prolabore)' },
  { v: 'outros', l: 'Outros' },
];

export default async function CustosFixosPage() {
  const ativos = await db.select().from(custosFixos).where(isNull(custosFixos.ativoAte)).orderBy(desc(custosFixos.criadoEm));
  const totalMensal = ativos.reduce((s, c) => s + Number(c.valor), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Custos fixos mensais</h1>
        <p className="text-sm text-[var(--color-ink-mute)] mt-1">
          Despesas recorrentes que entram automaticamente no cálculo de cada mês.
        </p>
      </header>

      {/* Resumo */}
      <div className="card flex items-center justify-between bg-[var(--color-cream)]">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[var(--color-ink-mute)]">Total mensal fixo</p>
          <p className="text-3xl font-bold mt-1">{formatBRL(totalMensal)}</p>
        </div>
        <p className="text-xs text-[var(--color-ink-mute)] text-right">
          {ativos.length} custo{ativos.length !== 1 ? 's' : ''} ativo{ativos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Form */}
      <form action={criarCustoFixo} className="card space-y-4">
        <h2 className="font-semibold">+ Novo custo fixo</h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label className="label">Descrição</label>
            <input name="descricao" required className="input" placeholder="Ex: Plano Nuvemshop" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Valor (R$/mês)</label>
            <input name="valor" type="number" step="0.01" min="0" required className="input" placeholder="0,00" />
          </div>
          <div className="md:col-span-3">
            <label className="label">Categoria</label>
            <select name="categoria" className="input">
              {CATEGORIAS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Dia de cobrança</label>
            <input name="diaCobranca" type="number" min="1" max="31" className="input" placeholder="—" />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn">Adicionar custo fixo</button>
        </div>
      </form>

      {/* Lista */}
      <div className="card">
        <h2 className="font-semibold mb-4">Custos ativos</h2>
        {ativos.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-mute)] py-8 text-center">
            Nenhum custo fixo cadastrado. Sugestões: Plano Nuvemshop (R$ 389,90), Avise-me (R$ 49,90), Provaly, etc.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {ativos.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{c.descricao}</p>
                  <p className="text-xs text-[var(--color-ink-mute)] mt-0.5">
                    {CATEGORIAS.find((x) => x.v === c.categoria)?.l || c.categoria}
                    {c.diaCobranca && ` · cobra dia ${c.diaCobranca}`}
                    {` · desde ${format(c.ativoDesde, "MMM yyyy", { locale: ptBR })}`}
                  </p>
                </div>
                <span className="font-mono font-semibold text-sm shrink-0">{formatBRL(c.valor)}/mês</span>
                <div className="flex gap-1 shrink-0">
                  <form action={encerrarCustoFixo}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="text-[var(--color-ink-faint)] hover:text-[var(--color-warning)] p-1" title="Encerrar (parar de cobrar)">
                      <CircleStop className="w-4 h-4" />
                    </button>
                  </form>
                  <form action={deletarCustoFixo}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="text-[var(--color-ink-faint)] hover:text-[var(--color-danger)] p-1" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
