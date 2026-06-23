// src/ui/useIsMobile.ts
import { useEffect, useState } from 'react';

const BREAKPOINT = 760;
const query = () => {
  if (typeof window === 'undefined') return false;
  // ?mobile=1 / ?mobile=0 forces the layout (handy for previewing on desktop)
  const forced = new URLSearchParams(window.location.search).get('mobile');
  if (forced === '1') return true;
  if (forced === '0') return false;
  return window.innerWidth < BREAKPOINT;
};

// True on narrow viewports; updates on resize/orientation change.
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(query);
  useEffect(() => {
    const onResize = () => setMobile(query());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return mobile;
}
