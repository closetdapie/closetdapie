'use client';

import { motion } from 'motion/react';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const TZ = 'America/Sao_Paulo';

type Pedido = {
  id: string;
  numero: number;
  cliente: string | null;
  total: string;
  status: string;
  meio: string | null;
  data: Date;
};

export function RecentPedidos({ pedidos }: { pedidos: Pedido[] }) {
  return (
    <ul className="space-y-2.5 flex-1">
      {pedidos.map((p, i) => (
        <motion.li
          key={p.id}
          initial={{ opacity: 0, x: 8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
        >
          <span className="w-8 h-8 rounded-full bg-[var(--color-blush-soft)] grid place-items-center text-[var(--color-blush-deep)] font-display text-xs leading-none shrink-0">
            {(p.cliente || '?').slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[var(--color-ink)] truncate">{p.cliente || 'Sem nome'}</p>
            <p className="text-[11px] text-[var(--color-ink-4)] truncate">
              #{p.numero} · {formatInTimeZone(p.data, TZ, 'dd MMM HH:mm', { locale: ptBR })} · {p.meio || '—'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-display text-base text-[var(--color-ink)] tabular leading-none">
              {Number(p.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </p>
            <p className={`text-[10px] uppercase tracking-wider mt-0.5 font-semibold ${
              p.status === 'paid' ? 'text-[var(--color-gain)]' :
              p.status === 'voided' || p.status === 'refunded' ? 'text-[var(--color-loss)]' :
              'text-[var(--color-ink-4)]'
            }`}>
              {p.status === 'paid' ? 'Pago' :
               p.status === 'voided' || p.status === 'refunded' ? 'Cancel.' : p.status}
            </p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
