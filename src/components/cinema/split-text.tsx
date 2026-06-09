'use client';

import { motion } from 'motion/react';

type Props = {
  text: string;
  className?: string;
  delay?: number;
  staggerChildren?: number;
  duration?: number;
};

// Split por palavra → revelação stacked com clip mask (estilo Awwwards)
export function SplitText({
  text,
  className = '',
  delay = 0,
  staggerChildren = 0.06,
  duration = 0.9,
}: Props) {
  const words = text.split(' ');
  return (
    <motion.span
      className={`inline-flex flex-wrap ${className}`}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren, delayChildren: delay },
        },
      }}
    >
      {words.map((word, i) => (
        <span key={i} className="inline-flex overflow-hidden mr-[0.22em]">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: '110%', opacity: 0 },
              show: {
                y: 0,
                opacity: 1,
                transition: { duration, ease: [0.16, 1, 0.3, 1] },
              },
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

// Versão char-by-char pra impacto máximo em palavras curtas
export function SplitChars({
  text,
  className = '',
  delay = 0,
}: Props) {
  return (
    <motion.span
      className={`inline-flex ${className}`}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.035, delayChildren: delay } },
      }}
    >
      {Array.from(text).map((char, i) => (
        <span key={i} className="inline-flex overflow-hidden">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: '110%' },
              show: {
                y: 0,
                transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
              },
            }}
          >
            {char === ' ' ? ' ' : char}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
