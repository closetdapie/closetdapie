'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'motion/react';

type Ponto = { label: string; valor: number };

type Props = {
  dados: Ponto[];
  altura?: number;
  className?: string;
  formatY?: (v: number) => string;
};

// BAR CHART premium estilo Stripe — barras gradient rounded top, animação stagger
export function BarChart({
  dados,
  altura = 280,
  className = '',
  formatY = (v) => `R$ ${(v / 1000).toFixed(1)}k`,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [hover, setHover] = useState<number | null>(null);
  const [w, setW] = useState(800);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setW(cr.width);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  if (dados.length === 0) {
    return (
      <div className={`flex items-center justify-center text-[var(--color-ink-4)] text-sm ${className}`} style={{ height: altura }}>
        Sem dados no período
      </div>
    );
  }

  const padding = { top: 24, right: 16, bottom: 36, left: 56 };
  const innerW = w - padding.left - padding.right;
  const innerH = altura - padding.top - padding.bottom;

  const max = Math.max(...dados.map((d) => d.valor)) * 1.1;
  const min = 0;

  // largura da barra (com gap)
  const gap = 8;
  const barW = Math.max(8, (innerW - gap * (dados.length - 1)) / dados.length);

  // Y ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * (max - min));

  return (
    <div className={`relative w-full ${className}`}>
      <svg ref={ref} width="100%" height={altura} viewBox={`0 0 ${w} ${altura}`} className="overflow-visible">
        <defs>
          <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0A0A0F" />
            <stop offset="100%" stopColor="#3A3A44" />
          </linearGradient>
          <linearGradient id="bar-grad-hover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B25667" />
            <stop offset="100%" stopColor="#8C3A4A" />
          </linearGradient>
        </defs>

        {/* Grid Y */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={padding.top + innerH - ((v - min) / (max - min)) * innerH}
              x2={w - padding.right}
              y2={padding.top + innerH - ((v - min) / (max - min)) * innerH}
              stroke="rgba(10,10,15,0.05)"
              strokeWidth={1}
            />
            <text
              x={padding.left - 10}
              y={padding.top + innerH - ((v - min) / (max - min)) * innerH + 3.5}
              fill="var(--color-ink-4)"
              fontSize="10"
              fontFamily="Inter, sans-serif"
              fontWeight="500"
              textAnchor="end"
              letterSpacing="0.02em"
            >
              {formatY(v)}
            </text>
          </g>
        ))}

        {/* Bars */}
        {dados.map((d, i) => {
          const x = padding.left + i * (barW + gap);
          const h = max > 0 ? ((d.valor - min) / (max - min)) * innerH : 0;
          const y = padding.top + innerH - h;
          const ativo = hover === i;
          return (
            <motion.g
              key={i}
              initial={{ y: 30, opacity: 0 }}
              animate={inView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* hit area maior */}
              <rect
                x={x - gap / 2}
                y={padding.top}
                width={barW + gap}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}
              />
              <motion.rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={Math.min(barW / 2, 5)}
                fill={ativo ? 'url(#bar-grad-hover)' : 'url(#bar-grad)'}
                animate={{ opacity: ativo ? 1 : 0.92 }}
                transition={{ duration: 0.25 }}
              />
            </motion.g>
          );
        })}

        {/* Labels X */}
        {dados.map((d, i) => {
          const showAll = dados.length <= 14;
          if (!showAll && i % 2 !== 0 && i !== dados.length - 1 && i !== 0) return null;
          const x = padding.left + i * (barW + gap) + barW / 2;
          return (
            <text
              key={i}
              x={x}
              y={altura - padding.bottom + 22}
              fill="var(--color-ink-4)"
              fontSize="10"
              fontFamily="Inter, sans-serif"
              fontWeight="500"
              textAnchor="middle"
              letterSpacing="0.02em"
            >
              {d.label}
            </text>
          );
        })}

        {/* Tooltip */}
        {hover !== null && (
          <motion.g initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <g transform={`translate(${Math.min(padding.left + hover * (barW + gap) + barW / 2 - 70, w - 150)}, ${Math.max(padding.top + innerH - ((dados[hover].valor - min) / (max - min)) * innerH - 56, 0)})`}>
              <rect
                x={0}
                y={0}
                width={140}
                height={48}
                rx={10}
                fill="#0A0A0F"
                stroke="rgba(255,255,255,0.05)"
                style={{ filter: 'drop-shadow(0 6px 24px rgba(10,10,15,0.18))' }}
              />
              <text x={14} y={18} fill="rgba(255,255,255,0.55)" fontSize="9" fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="0.16em">
                {dados[hover].label.toUpperCase()}
              </text>
              <text x={14} y={36} fill="#FFFFFF" fontSize="15" fontFamily="Bebas Neue, sans-serif" letterSpacing="0.02em">
                {dados[hover].valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </text>
            </g>
          </motion.g>
        )}
      </svg>
    </div>
  );
}
