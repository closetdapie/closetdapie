import { db, despesas } from '@/db';
import { desc } from 'drizzle-orm';
import { ptBR } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
const TZ = 'America/Sao_Paulo';
import { formatBRL } from '@/lib/calcular-lucro';
import { criarDespesa, deletarDespesa } from '@/lib/despesas-actions';
import { Trash2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

const CATEGORIAS = [
  { v: 'ads_meta', l: 'Ads — Meta (Facebook/Instagram)' },
  { v: 'ads_google', l: 'Ads — Google' },
  { v: 'estoque', l: 'Compra de coleção / estoque' },
  { v: 'marketing', l: 'Marketing / parceria / influencer' },
  { v: 'operacional', l: 'Operacional (embalagem, etiqueta)' },
  { v: 'imposto', l: 'Impostos / contadora' },
  { v: 'outros', l: 'Outros' },
];

export default async function DespesasPage() {
  const lista = await db.select().from(despesas).orderBy(desc(despesas.data)).limit(50);

  return (
    <div className="max-w-4xl mx-auto space-y-5 lg:space-y-6 px-4 sm:px-6 lg:px-10 py-5 lg:py-7">
      <header>
        <h1 className="text-xl lg:text-2xl font-bold">Despesas pontuais</h1>
        <p className="text-sm text-[var(--color-ink-mute)] mt-1">
          Tudo que sair do caixa que não é recorrente (ads, coleção, parceria, etc.)
        </p>
      </header>

      {/* Form de adicionar */}
      <form action={criarDespesa} className="card space-y-4">
        <h2 className="font-semibold">+ Nova despesa</h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label className="label">Descrição</label>
            <input name="descricao" required className="input" placeholder="Ex: Anúncio Reels — campanha festival" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Valor</label>
            <input name="valor" type="number" step="0.01" min="0" required className="input" placeholder="0,00" />
          </div>
          <div className="md:col-span-3">
            <label className="label">Categoria</label>
            <select name="categoria" className="input">
              {CATEGORIAS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Data</label>
            <input name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
          </div>
          <div className="md:col-span-12">
            <label className="label">Observação (opcional)</label>
            <input name="observacao" className="input" placeholder="Nota fiscal, link campanha, etc." />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn">Adicionar despesa</button>
        </div>
      </form>

      {/* Lista */}
      <div className="card">
        <h2 className="font-semibold mb-4">Últimas 50 despesas</h2>
        {lista.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-mute)] py-8 text-center">
            Nenhuma despesa cadastrada ainda.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {lista.map((d) => (
              <li key={d.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{d.descricao}</p>
                  <p className="text-xs text-[var(--color-ink-mute)] mt-0.5">
                    {formatInTimeZone(d.data, TZ, "dd MMM yyyy", { locale: ptBR })} ·{' '}
                    {CATEGORIAS.find((c) => c.v === d.categoria)?.l || d.categoria}
                    {d.observacao && ` · ${d.observacao}`}
                  </p>
                </div>
                <span className="font-mono font-semibold text-sm shrink-0">{formatBRL(d.valor)}</span>
                <form action={deletarDespesa}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
