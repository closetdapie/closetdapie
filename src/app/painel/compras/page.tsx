import { db, produtosCogs, despesas } from '@/db';
import { asc, eq, desc } from 'drizzle-orm';
import { formatBRL } from '@/lib/calcular-lucro';
import { ptBR } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
const TZ = 'America/Sao_Paulo';
import { FormularioCompra } from '@/components/formulario-compra';

export const dynamic = 'force-dynamic';

export default async function ComprasPage() {
  const produtos = await db.select({
    id: produtosCogs.id,
    nome: produtosCogs.nome,
    custoUnitario: produtosCogs.custoUnitario,
  }).from(produtosCogs).orderBy(asc(produtosCogs.nome));

  const ultimasCompras = await db.select().from(despesas).where(eq(despesas.categoria, 'estoque')).orderBy(desc(despesas.data)).limit(10);

  return (
    <div className="max-w-5xl mx-auto space-y-5 lg:space-y-6 px-4 sm:px-6 lg:px-10 py-5 lg:py-7">
      <header>
        <h1 className="text-xl lg:text-2xl font-bold">Compra de coleção / mercadoria</h1>
        <p className="text-sm text-[var(--color-ink-mute)] mt-1">
          Registre cada compra de produtos do fornecedor. Atualiza o custo (COGS) de cada peça e lança a despesa no caixa automaticamente.
        </p>
      </header>

      <FormularioCompra produtos={produtos} />

      <section className="card">
        <h2 className="font-semibold mb-4">Últimas compras</h2>
        {ultimasCompras.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-mute)] py-8 text-center">
            Nenhuma compra registrada ainda.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {ultimasCompras.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{c.descricao}</p>
                  <p className="text-xs text-[var(--color-ink-mute)] mt-0.5">
                    {formatInTimeZone(c.data, TZ, "dd MMM yyyy", { locale: ptBR })}
                    {c.observacao && ` · ${c.observacao}`}
                  </p>
                </div>
                <span className="font-mono font-semibold">{formatBRL(c.valor)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
