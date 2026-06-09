'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';

// Heatmap: dia da semana x faixa de hora — mostra quando mais vende
// Estilo GitHub contributions, mas refinado

export type CelulaHeatmap = {
  diaSemana: number; // 0-6 (seg=0)
  hora: number;      // 0-23
  valor: number;
};

type Props = {
  dados: CelulaHeatmap[];
  className?: string;
};

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// agrupa hora em buckets de 3h (8 buckets)
const BUCKETS = ['0–3', '3–6', '6–9', '9–12', '12–15', '15–18', '18–21', '21–24'];

export function HeatmapCalendar({ dados, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  // Agrega valores em grid 7 dias x 8 buckets
  const grid: number[][] = Array.from({ length: 7 }, () => Array(8).fill(0));
  for (const c of dados) {
    const bucket = Math.floor(c.hora / 3);
    if (c.diaSemana >= 0 && c.diaSemana < 7 && bucket >= 0 && bucket < 8) {
      grid[c.diaSemana][bucket] += c.valor;
    }
  }
  const flat = grid.flat();
  const max = Math.max(...flat, 1);

  function cor(valor: number): string {
    if (valor === 0) return '#F1F2F4';
    const t = valor / max;
    // gradient blush light → blush deep
    if (t < 0.2) return '#FBF1F3';
    if (t < 0.4) return '#F5E0E4';
    if (t < 0.6) return '#E5BCC4';
    if (t < 0.8) return '#C76A78';
    return '#8C3A4A';
  }

  return (
    <div ref={ref} className={className}>
      <div className="flex">
        {/* Coluna de labels Y (horas) */}
        <div className="flex flex-col justify-around pr-2 pt-5 pb-1 text-[10px] tabular text-[var(--color-ink-4)] tracking-wide" style={{ height: 280 }}>
          {BUCKETS.map((b) => (
            <span key={b}>{b}</span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 grid grid-cols-7 gap-1.5">
          {DIAS.map((dia, diaIdx) => (
            <div key={dia} className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-3)] font-semibold text-center mb-0.5">
                {dia}
              </span>
              {BUCKETS.map((_, bucketIdx) => {
                const v = grid[diaIdx][bucketIdx];
                return (
                  <motion.div
                    key={bucketIdx}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{
                      duration: 0.45,
                      delay: 0.1 + (diaIdx + bucketIdx) * 0.025,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="aspect-square rounded-md group relative"
                    style={{ background: cor(v), border: '1px solid rgba(10,10,15,0.04)' }}
                  >
                    {v > 0 && (
                      <div className="absolute z-10 left-1/2 -translate-x-1/2 -top-9 bg-[var(--color-ink)] text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg">
                        {DIAS[diaIdx]} {BUCKETS[bucketIdx]}h
                        <br />
                        <span className="font-display text-[13px] tracking-wide">
                          {v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-end gap-2 mt-4 text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">
        <span>Menos</span>
        <div className="flex gap-1">
          {['#F1F2F4', '#FBF1F3', '#F5E0E4', '#E5BCC4', '#C76A78', '#8C3A4A'].map((c) => (
            <span key={c} className="w-3 h-3 rounded" style={{ background: c, border: '1px solid rgba(10,10,15,0.04)' }} />
          ))}
        </div>
        <span>Mais</span>
      </div>
    </div>
  );
}
