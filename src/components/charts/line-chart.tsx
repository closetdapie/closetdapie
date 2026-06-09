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

// Line chart SVG custom — sem libs. AAAA: path animado, gradient fill, hover tooltip
export function LineChart({
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
      <div className={`flex items-center justify-center text-[var(--color-steel)] text-sm ${className}`} style={{ height: altura }}>
        Sem dados no período
      </div>
    );
  }

  const padding = { top: 24, right: 24, bottom: 36, left: 56 };
  const innerW = w - padding.left - padding.right;
  const innerH = altura - padding.top - padding.bottom;

  const max = Math.max(...dados.map((d) => d.valor));
  const min = 0;
  const yRange = max - min || 1;

  const xPos = (i: number) =>
    padding.left + (dados.length === 1 ? innerW / 2 : (i / (dados.length - 1)) * innerW);
  const yPos = (v: number) => padding.top + innerH - ((v - min) / yRange) * innerH;

  // Path suave (cubic bezier)
  const pathD = dados
    .map((d, i) => {
      const x = xPos(i);
      const y = yPos(d.valor);
      if (i === 0) return `M ${x},${y}`;
      const prevX = xPos(i - 1);
      const cx1 = prevX + (x - prevX) / 2;
      const cx2 = prevX + (x - prevX) / 2;
      return `C ${cx1},${yPos(dados[i - 1].valor)} ${cx2},${y} ${x},${y}`;
    })
    .join(' ');

  // Area fill
  const areaD = `${pathD} L ${xPos(dados.length - 1)},${padding.top + innerH} L ${xPos(0)},${padding.top + innerH} Z`;

  // Grid Y (4 linhas)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * yRange);

  return (
    <div className={`relative w-full ${className}`}>
      <svg ref={ref} width="100%" height={altura} viewBox={`0 0 ${w} ${altura}`} className="overflow-visible">
        <defs>
          <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FAFAFA" />
            <stop offset="100%" stopColor="#C0C0C0" />
          </linearGradient>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(229,228,226,0.28)" />
            <stop offset="100%" stopColor="rgba(229,228,226,0)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid Y */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={yPos(v)}
              x2={w - padding.right}
              y2={yPos(v)}
              stroke="rgba(229,228,226,0.06)"
              strokeWidth={1}
              strokeDasharray="2 6"
            />
            <text
              x={padding.left - 10}
              y={yPos(v) + 4}
              fill="rgba(229,228,226,0.4)"
              fontSize="10"
              fontFamily="Montserrat, sans-serif"
              fontWeight="500"
              textAnchor="end"
              letterSpacing="0.05em"
            >
              {formatY(v)}
            </text>
          </g>
        ))}

        {/* Area + Linha animadas */}
        <motion.path
          d={areaD}
          fill="url(#area-grad)"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 1.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.path
          d={pathD}
          fill="none"
          stroke="url(#line-grad)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Pontos */}
        {dados.map((d, i) => {
          const cx = xPos(i);
          const cy = yPos(d.valor);
          const ativo = hover === i;
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 1.2 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* hit area invisível */}
              <rect
                x={cx - 25}
                y={padding.top}
                width={50}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}
              />
              <circle cx={cx} cy={cy} r={ativo ? 6 : 3.5} fill="#FAFAFA" />
              {ativo && <circle cx={cx} cy={cy} r={12} fill="rgba(250,250,250,0.18)" />}
            </motion.g>
          );
        })}

        {/* Labels X */}
        {dados.map((d, i) => {
          // Show every other label if many points
          const showAll = dados.length <= 14;
          if (!showAll && i % 2 !== 0 && i !== dados.length - 1) return null;
          return (
            <text
              key={i}
              x={xPos(i)}
              y={altura - padding.bottom + 22}
              fill="rgba(229,228,226,0.4)"
              fontSize="10"
              fontFamily="Montserrat, sans-serif"
              fontWeight="500"
              textAnchor="middle"
              letterSpacing="0.08em"
            >
              {d.label}
            </text>
          );
        })}

        {/* Tooltip */}
        {hover !== null && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <line
              x1={xPos(hover)}
              y1={padding.top}
              x2={xPos(hover)}
              y2={padding.top + innerH}
              stroke="rgba(229,228,226,0.25)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <g transform={`translate(${Math.min(xPos(hover) + 12, w - 140)}, ${Math.max(yPos(dados[hover].valor) - 36, padding.top)})`}>
              <rect x={0} y={0} width={130} height={48} rx={8} fill="#0B0B0E" stroke="rgba(229,228,226,0.18)" />
              <text x={12} y={18} fill="rgba(229,228,226,0.5)" fontSize="9" fontFamily="Montserrat, sans-serif" fontWeight="600" letterSpacing="0.18em">
                {dados[hover].label.toUpperCase()}
              </text>
              <text x={12} y={38} fill="#FAFAFA" fontSize="14" fontFamily="Bebas Neue, sans-serif" letterSpacing="0.04em">
                {dados[hover].valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </text>
            </g>
          </motion.g>
        )}
      </svg>
    </div>
  );
}
