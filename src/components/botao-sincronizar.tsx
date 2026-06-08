'use client';

import { useState, useTransition } from 'react';
import { RefreshCw, Check, AlertTriangle } from 'lucide-react';

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
      <button onClick={sincronizar} disabled={pending} className="btn-ghost">
        <RefreshCw className={`w-4 h-4 ${pending ? 'animate-spin' : ''}`} />
        {pending ? 'Sincronizando...' : 'Sincronizar Nuvemshop'}
      </button>
      {msg && (
        <span className={`flex items-center gap-1.5 text-xs ${msg.tipo === 'ok' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
          {msg.tipo === 'ok' ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {msg.texto}
        </span>
      )}
    </div>
  );
}
