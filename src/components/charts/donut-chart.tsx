'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';

type Slice = { label: string; valor: number; cor?: string };

type Props = {
  dados: Slice[];
  tamanho?: number;
  className?: string;
  centroLabel?: string;
  centroValor?: string;
};

// Paleta sofisticada — preto, prata, blush, tons quentes
const PALETA = ['#0A0A0F', '#3A3A44', '#6A6A75', '#B25667', '#E5BCC4', '#A0A0AB', '#CFCFD6'];

export function DonutChart({
  dados,
  tamanho = 220,
  className = '',
  centroLabel,
  centroValor,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  const total = dados.reduce((s, d) => s + Math.max(0, d.valor), 0);
  if (total === 0) {
    return (
      <div className={`flex items-center justify-center text-[var(--color-ink-4)] text-sm ${className}`} style={{ height: tamanho }}>
        Sem dados no período
      </div>
    );
  }

  const cx = tamanho / 2;
  const cy = tamanho / 2;
  const rOut = tamanho * 0.44;
  const rIn = tamanho * 0.32;
  const cAngle = (deg: number) => (deg - 90) * (Math.PI / 180);

  let cumulado = 0;
  const segments = dados.map((d, i) => {
    const start = (cumulado / total) * 360;
    cumulado += Math.max(0, d.valor);
    const end = (cumulado / total) * 360;
    const a1 = cAngle(start);
    const a2 = cAngle(end);
    const large = end - start > 180 ? 1 : 0;
    const x1 = cx + rOut * Math.cos(a1);
    const y1 = cy + rOut * Math.sin(a1);
    const x2 = cx + rOut * Math.cos(a2);
    const y2 = cy + rOut * Math.sin(a2);
    const xi1 = cx + rIn * Math.cos(a2);
    const yi1 = cy + rIn * Math.sin(a2);
    const xi2 = cx + rIn * Math.cos(a1);
    const yi2 = cy + rIn * Math.sin(a1);
    const path = `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${rIn} ${rIn} 0 ${large} 0 ${xi2} ${yi2} Z`;
    return {
      path,
      cor: d.cor || PALETA[i % PALETA.length],
      label: d.label,
      valor: d.valor,
      pct: (d.valor / total) * 100,
    };
  });

  return (
    <div className={`flex flex-col md:flex-row items-center gap-6 ${className}`}>
      <svg ref={ref} width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} className="shrink-0">
        {segments.map((s, i) => (
          <motion.path
            key={i}
            d={s.path}
            fill={s.cor}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
        {centroLabel && (
          <text x={cx} y={cy - 6} fill="var(--color-ink-3)" fontSize="9" fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="0.18em" textAnchor="middle">
            {centroLabel.toUpperCase()}
          </text>
        )}
        {centroValor && (
          <text x={cx} y={cy + 16} fill="var(--color-ink)" fontSize="22" fontFamily="Bebas Neue, sans-serif" letterSpacing="0.02em" textAnchor="middle">
            {centroValor}
          </text>
        )}
      </svg>

      <div className="flex-1 w-full space-y-2.5">
        {segments.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.5 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.cor }} />
              <span className="text-[var(--color-ink-2)] truncate">{s.label}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 tabular">
              <span className="text-[var(--color-ink-4)] text-xs">{s.pct.toFixed(1)}%</span>
              <span className="font-display text-[15px] text-[var(--color-ink)]" style={{ letterSpacing: '0.02em' }}>
                {s.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
