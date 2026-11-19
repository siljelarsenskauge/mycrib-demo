import { useEffect, useState, type ReactNode } from 'react';

/* ---------- Hash router ---------- */
const parse = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

export function useRoute(): string[] {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(path: string, replace = false) {
  const hash = '#' + path;
  if (replace) {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = path;
  }
}

/* ---------- Top bar ---------- */
export function TopBar({ title, back, right }: { title: ReactNode; back?: string; right?: ReactNode }) {
  return (
    <header className="topbar">
      {back !== undefined && (
        <button className="icon-btn" onClick={() => navigate(back)} aria-label="Tilbake">
          ←
        </button>
      )}
      <h1 className="topbar-title">{title}</h1>
      {right}
    </header>
  );
}

/* ---------- Modal bottom sheet ---------- */
export function ModalSheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="backdrop" onClick={onClose}>
      <section className="modal-sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden style={{ height: 20 }}>
          <span className="grabber" />
        </div>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Lukk">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </section>
    </div>
  );
}

export function Loading({ text, sub, inline }: { text: string; sub?: string; inline?: boolean }) {
  return (
    <div className={'loading' + (inline ? ' inline' : '')} role="status" aria-live="polite">
      <div className="spinner" />
      <strong>{text}</strong>
      {sub && <p className="hint">{sub}</p>}
      {!inline && (
        <div className="progress">
          <div />
        </div>
      )}
    </div>
  );
}

export const fmtTime = (t: number) => {
  const d = new Date(t);
  const now = new Date();
  const time = d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `I dag ${time}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `I går ${time}`;
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }) + ` ${time}`;
};
