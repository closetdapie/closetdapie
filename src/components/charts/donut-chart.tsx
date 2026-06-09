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

const PALETA_PRATA = ['#FAFAFA', '#E5E4E2', '#C0C0C0', '#8A8A8E', '#4A4A4F', '#2A2A2D', '#181818'];

// Donut chart minimalista — arcos animados, hover destacado
export function DonutChart({
  dados,
  tamanho = 280,
  className = '',
  centroLabel,
  centroValor,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  const total = dados.reduce((s, d) => s + Math.max(0, d.valor), 0);
  if (total === 0) {
    return (
      <div className={`flex items-center justify-center text-[var(--color-steel)] text-sm ${className}`} style={{ height: tamanho }}>
        Sem despesas no período
      </div>
    );
  }

  const cx = tamanho / 2;
  const cy = tamanho / 2;
  const rOut = tamanho * 0.42;
  const rIn = tamanho * 0.3;
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
      cor: d.cor || PALETA_PRATA[i % PALETA_PRATA.length],
      label: d.label,
      valor: d.valor,
      pct: (d.valor / total) * 100,
    };
  });

  return (
    <div className={`flex items-center gap-8 ${className}`}>
      <svg ref={ref} width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`}>
        <defs>
          <filter id="donut-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {segments.map((s, i) => (
          <motion.path
            key={i}
            d={s.path}
            fill={s.cor}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
        {/* Texto centro */}
        {centroLabel && (
          <text x={cx} y={cy - 8} fill="rgba(229,228,226,0.4)" fontSize="9" fontFamily="Montserrat, sans-serif" fontWeight="600" letterSpacing="0.22em" textAnchor="middle">
            {centroLabel.toUpperCase()}
          </text>
        )}
        {centroValor && (
          <text x={cx} y={cy + 16} fill="#FAFAFA" fontSize="22" fontFamily="Bebas Neue, sans-serif" letterSpacing="0.02em" textAnchor="middle">
            {centroValor}
          </text>
        )}
      </svg>

      {/* Legenda */}
      <div className="flex-1 space-y-2.5">
        {segments.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.6 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.cor }} />
              <span className="text-[var(--color-mist)] truncate">{s.label}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 tabular">
              <span className="text-[var(--color-steel)] text-xs">{s.pct.toFixed(1)}%</span>
              <span className="font-display text-[15px] text-[var(--color-pearl)]" style={{ letterSpacing: '0.02em' }}>
                {s.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
