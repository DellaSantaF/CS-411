import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
export function GuidanceDialog({ children, close, anchor, label }: { children: ReactNode; close(): void; anchor?: HTMLElement | null; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!; element.showModal();
    const position = () => {
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect(), bounds = element.getBoundingClientRect();
      const left = Math.max(12, Math.min(innerWidth - bounds.width - 12, rect.left + rect.width / 2 - bounds.width / 2));
      const below = rect.bottom + 20 + bounds.height < innerHeight - 12;
      element.style.left = `${left}px`; element.style.top = `${below ? rect.bottom + 20 : Math.max(12, rect.top - bounds.height - 20)}px`; element.style.margin = '0';
      element.dataset.side = below ? 'below' : 'above';
      element.style.setProperty('--tip-x', `${Math.max(16, Math.min(bounds.width - 16, rect.left + rect.width / 2 - left))}px`);
    };
    position(); window.addEventListener('resize', position); window.addEventListener('scroll', position, true);
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); element.close(); };
  }, [anchor]);
  return <dialog ref={dialog} className={`guidance-dialog ${anchor ? 'anchored' : ''}`} aria-label={label} onCancel={event => { event.preventDefault(); close(); }}><button className="quiet close-popup" aria-label="Close" autoFocus onClick={close}>×</button>{children}</dialog>;
}
