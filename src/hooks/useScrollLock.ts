import { useEffect } from 'react';

let lockCount = 0;

export const useScrollLock = (lock: boolean = true) => {
  useEffect(() => {
    if (!lock) return;

    lockCount++;
    if (lockCount === 1) {
      // Prevent scrolling on document body
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
    }

    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    };
  }, [lock]);
};
