import { useEffect } from 'react';

/** Desktop only: scale the phone frame so the whole 402 × 874 screen fits the window (never larger than 1). */
export function useFitPhone() {
  useEffect(() => {
    const root = document.documentElement;
    const desktop = window.matchMedia('(min-width: 520px)');
    const fit = () => {
      if (!desktop.matches) return root.style.removeProperty('--phone-scale');
      const css = getComputedStyle(root);
      const w = parseFloat(css.getPropertyValue('--phone-width'));
      const h = parseFloat(css.getPropertyValue('--phone-height'));
      // 24 px page padding and the 10 px frame ring on each side
      const room = 2 * (24 + 10);
      const s = Math.min(1, (window.innerHeight - room) / h, (window.innerWidth - room) / w);
      root.style.setProperty('--phone-scale', String(Math.max(0.4, s)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
}
