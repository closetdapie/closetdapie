'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';

type Props = {
  dados: number[];
  width?: number;
  height?: number;
  cor?: string;
  preencher?: boolean;
};

// Mini line chart inline pra KPI cards (estilo Linear/Stripe)
export function Sparkline({
  dados,
  width = 120,
  height = 36,
  cor = '#0A0A0F',
  preencher = true,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });

  if (dados.length < 2) {
    return <svg ref={ref} width={width} height={height} />;
  }

  const max = Math.max(...dados);
  const min = Math.min(...dados);
  const range = max - min || 1;
  const pad = 2;

  const pontos = dados.map((v, i) => {
    const x = pad + (i / (dados.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return { x, y };
  });

  // Path curvo bezier
  const pathD = pontos
    .map((p, i) => {
      if (i === 0) return `M ${p.x},${p.y}`;
      const prev = pontos[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `C ${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
    })
    .join(' ');

  const areaD = `${pathD} L ${pontos[pontos.length - 1].x},${height - pad} L ${pontos[0].x},${height - pad} Z`;
  const gradId = `spark-${cor.replace('#', '')}`;

  return (
    <svg ref={ref} width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {preencher && (
        <motion.path
          d={areaD}
          fill={`url(#${gradId})`}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
      <motion.path
        d={pathD}
        fill="none"
        stroke={cor}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : {}}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />
      {/* ponto final */}
      <motion.circle
        cx={pontos[pontos.length - 1].x}
        cy={pontos[pontos.length - 1].y}
        r={2.5}
        fill={cor}
        initial={{ scale: 0 }}
        animate={inView ? { scale: 1 } : {}}
        transition={{ duration: 0.5, delay: 1.3, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}
