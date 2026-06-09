'use client';

import { motion } from 'motion/react';

// Background cinematográfico: grid + duas auroras prata + watermark
export function AuroraBackground({
  watermark,
  className = '',
}: {
  watermark?: string;
  className?: string;
}) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Grid sutil */}
      <div
        className="absolute inset-0 grid-bg"
        style={{ maskImage: 'radial-gradient(ellipse at center, #000 0%, transparent 75%)' }}
      />
      {/* Auroras prata */}
      <motion.div
        className="aurora-silver"
        style={{ top: '-20%', left: '-15%' }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="aurora-silver"
        style={{ bottom: '-25%', right: '-15%', animationDelay: '7s' }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      />
      {/* Watermark gigante (palavra fantasma) */}
      {watermark && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="text-watermark"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {watermark}
          </motion.span>
        </div>
      )}
      {/* Vinheta */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(5,5,7,0.6) 100%)',
        }}
      />
    </div>
  );
}
