import { db, pedidos } from '@/db';
import { desc } from 'drizzle-orm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBRL } from '@/lib/calcular-lucro';
import { AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PedidosPage() {
  const lista = await db.select().from(pedidos).orderBy(desc(pedidos.dataPedido)).limit(100);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-[var(--color-ink-mute)] mt-1">
          Cada pedido com o lucro real calculado (descontando taxas, COGS, frete, embalagem).
        </p>
      </header>

      {lista.length === 0 ? (
        <div className="card flex items-start gap-3 bg-amber-50 border-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-900">
            <strong>Nenhum pedido sincronizado ainda.</strong>{' '}
            Configure a integração Nuvemshop em{' '}
            <a href="/painel/configuracoes" className="underline">Configurações</a> pra puxar automaticamente.
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-cream)] text-[11px] uppercase tracking-wider text-[var(--color-ink-mute)]">
                <tr>
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">Custos</th>
                  <th className="text-right p-3">Lucro</th>
                  <th className="text-right p-3">Margem</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {lista.map((p) => {
                  const lucro = Number(p.lucroLiquido || 0);
                  const margem = Number(p.margemPercent || 0);
                  const custos =
                    Number(p.taxaGateway || 0) +
                    Number(p.taxaNuvemshop || 0) +
                    Number(p.cogsTotal || 0) +
                    Number(p.custoEmbalagem || 0) +
                    Number(p.custoFrete || 0);
                  return (
                    <tr key={p.id} className="hover:bg-[var(--color-cream)]">
                      <td className="p-3 font-mono text-xs">#{p.numero}</td>
                      <td className="p-3 text-xs text-[var(--color-ink-mute)]">
                        {format(p.dataPedido, "dd MMM HH:mm", { locale: ptBR })}
                      </td>
                      <td className="p-3">{p.clienteNome || '—'}</td>
                      <td className="p-3 text-right font-mono">{formatBRL(p.total)}</td>
                      <td className="p-3 text-right font-mono text-[var(--color-ink-mute)]">{formatBRL(-custos)}</td>
                      <td className={`p-3 text-right font-mono font-semibold ${lucro >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                        {formatBRL(lucro)}
                      </td>
                      <td className={`p-3 text-right text-xs ${margem >= 30 ? 'text-[var(--color-success)]' : margem >= 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>
                        {margem.toFixed(1)}%
                      </td>
                      <td className="p-3 text-xs">{p.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
