'use client';

import { useState, useTransition } from 'react';
import { RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { Magnetic } from '@/components/cinema/magnetic';
import { motion, AnimatePresence } from 'motion/react';

export function BotaoSincronizar() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  async function sincronizar() {
    setMsg(null);
    start(async () => {
      try {
        const r = await fetch('/api/sync', { method: 'POST' });
        const d = await r.json();
        if (d.ok) {
          setMsg({ tipo: 'ok', texto: `${d.salvos} pedido${d.salvos !== 1 ? 's' : ''} sincronizado${d.salvos !== 1 ? 's' : ''}` });
          setTimeout(() => window.location.reload(), 1200);
        } else {
          setMsg({ tipo: 'erro', texto: d.dica || d.erro || 'Falha na sincronização' });
        }
      } catch (e) {
        setMsg({ tipo: 'erro', texto: String(e) });
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Magnetic strength={0.2}>
        <button onClick={sincronizar} disabled={pending} className="btn-ghost">
          <RefreshCw className={`w-3.5 h-3.5 ${pending ? 'animate-spin' : ''}`} />
          {pending ? 'Sincronizando' : 'Sincronizar'}
        </button>
      </Magnetic>
      <AnimatePresence>
        {msg && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className={`flex items-center gap-1.5 text-[11px] tracking-wider uppercase ${msg.tipo === 'ok' ? 'text-[var(--color-gain)]' : 'text-[var(--color-loss)]'}`}
          >
            {msg.tipo === 'ok' ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            {msg.texto}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
