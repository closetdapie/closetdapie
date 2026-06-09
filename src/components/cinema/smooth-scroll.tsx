'use client';

import { useEffect } from 'react';

export function SmoothScroll() {
  useEffect(() => {
    let lenis: any;
    let raf = 0;
    (async () => {
      const mod = await import('lenis');
      const Lenis = mod.default;
      lenis = new Lenis({
        duration: 1.1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.4,
      });
      const tick = (t: number) => {
        lenis.raf(t);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();
    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy?.();
    };
  }, []);
  return null;
}
