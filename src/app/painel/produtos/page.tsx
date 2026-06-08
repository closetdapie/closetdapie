import { db, produtosCogs } from '@/db';
import { desc, sql } from 'drizzle-orm';
import { formatBRL } from '@/lib/calcular-lucro';
import { criarProdutoCogs, atualizarCogs, deletarProdutoCogs } from '@/lib/produtos-actions';
import { Trash2, Save } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProdutosPage() {
  const lista = await db.select().from(produtosCogs).orderBy(desc(produtosCogs.atualizadoEm)).limit(100);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Produtos — Custo (COGS)</h1>
        <p className="text-sm text-[var(--color-ink-mute)] mt-1">
          Quanto cada peça custa pra você. Esse valor é descontado do lucro de cada venda.
        </p>
      </header>

      {/* Form rápido */}
      <form action={criarProdutoCogs} className="card space-y-4">
        <h2 className="font-semibold">+ Adicionar produto</h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label className="label">Nome do produto</label>
            <input name="nome" required className="input" placeholder="Ex: Body Vampy Preto" />
          </div>
          <div className="md:col-span-2">
            <label className="label">SKU</label>
            <input name="sku" className="input" placeholder="Opcional" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Custo (R$)</label>
            <input name="custoUnitario" type="number" step="0.01" min="0" required className="input" placeholder="0,00" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Preço venda (R$)</label>
            <input name="precoVenda" type="number" step="0.01" min="0" className="input" placeholder="opcional" />
          </div>
          <div className="md:col-span-1">
            <label className="label opacity-0">.</label>
            <button type="submit" className="btn w-full justify-center">+</button>
          </div>
          <div className="md:col-span-12">
            <label className="label">ID Nuvemshop (opcional, pra ligar automaticamente)</label>
            <input name="nuvemshopProductId" className="input" placeholder="Ex: 229126435" />
          </div>
        </div>
      </form>

      {/* Lista */}
      <div className="card">
        <h2 className="font-semibold mb-4">Catálogo cadastrado ({lista.length})</h2>
        {lista.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-mute)] py-8 text-center">
            Nenhum produto cadastrado ainda. Comece adicionando os top sellers (Body Vampy, Shorts Saia Temptation, etc).
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {lista.map((p) => {
              const margem = p.precoVenda
                ? ((Number(p.precoVenda) - Number(p.custoUnitario)) / Number(p.precoVenda)) * 100
                : null;
              return (
                <li key={p.id} className="py-3 grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12 md:col-span-5">
                    <p className="font-medium text-sm">{p.nome}</p>
                    <p className="text-xs text-[var(--color-ink-mute)] mt-0.5">
                      {p.sku && `SKU ${p.sku}`}
                      {p.nuvemshopProductId && ` · NS ${p.nuvemshopProductId}`}
                    </p>
                  </div>
                  <form action={atualizarCogs} className="col-span-8 md:col-span-3 flex items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      name="custoUnitario"
                      type="number"
                      step="0.01"
                      defaultValue={p.custoUnitario}
                      className="input text-sm"
                    />
                    <button className="btn-ghost p-2" title="Salvar">
                      <Save className="w-4 h-4" />
                    </button>
                  </form>
                  <div className="col-span-3 md:col-span-3 text-sm">
                    {p.precoVenda ? (
                      <>
                        <span className="text-[var(--color-ink-mute)] text-xs">Venda </span>
                        <span className="font-mono">{formatBRL(p.precoVenda)}</span>
                        {margem != null && (
                          <span className={`ml-2 text-xs ${margem >= 50 ? 'text-[var(--color-success)]' : margem >= 30 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>
                            {margem.toFixed(0)}% margem
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[var(--color-ink-faint)] text-xs">—</span>
                    )}
                  </div>
                  <form action={deletarProdutoCogs} className="col-span-1 md:col-span-1 flex justify-end">
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-[var(--color-ink-faint)] hover:text-[var(--color-danger)] p-1" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
