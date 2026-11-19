import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

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

/* ---------- Phone frame scale ---------- */
/** How much the desktop phone frame is scaled down to fit the window (1 on a real phone).
 *  Divide screen distances (getBoundingClientRect, clientX) by it to get CSS px inside the app. */
export function phoneScale(): number {
  const p = document.querySelector<HTMLElement>('.phone');
  return p?.offsetWidth ? p.getBoundingClientRect().width / p.offsetWidth : 1;
}

/* ---------- Actions/Button ---------- */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'accent' | 'secondary' | 'outlined' | 'text';
  size?: 'large' | 'small';
  icon?: IconName;
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'large', icon, block, className = '', children, ...rest }, ref) {
  return (
    <button ref={ref} className={`btn btn-${variant} btn-${size}${block ? ' btn-block' : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'small' ? 18 : 22} />}
      <span className="btn-label">{children}</span>
    </button>
  );
});

/* ---------- Actions/IconButton ---------- */
type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  variant?: 'plain' | 'outlined' | 'filled' | 'primary' | 'glass';
  iconSize?: number;
};

export function IconButton({ icon, label, variant = 'plain', iconSize = 24, className = '', ...rest }: IconButtonProps) {
  return (
    // no title: the browser's grey tooltip box looked broken on hover (Synne 19.11); aria-label still names the button
    <button className={`icon-btn icon-btn-${variant} ${className}`} aria-label={label} {...rest}>
      <Icon name={icon} size={iconSize} />
    </button>
  );
}

/* ---------- Navigation/SectionHeader ---------- */
export function SectionHeader({ title, link, onLink, action }: { title: string; link?: string; onLink?: () => void; action?: ReactNode }) {
  return (
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      {link && (
        <button className="section-link" onClick={onLink}>
          {link}
        </button>
      )}
      {action}
    </div>
  );
}

/* ---------- Content/ListRow ---------- */
export function ListRow({
  title,
  meta,
  leading,
  onClick,
  selected,
  divider = true,
  compact,
  chevron = true,
}: {
  title: ReactNode;
  meta?: ReactNode;
  leading?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  divider?: boolean;
  compact?: boolean;
  /** off for rows that do something right away, instead of opening a new page */
  chevron?: boolean;
}) {
  const className = 'list-row' + (divider ? ' list-row-divider' : '') + (compact ? ' list-row-compact' : '');
  const content = (
    <>
      {leading && <span className="list-row-leading">{leading}</span>}
      <span className="list-row-text">
        <span className="list-row-title">{title}</span>
        {meta && <span className="list-row-meta">{meta}</span>}
      </span>
    </>
  );
  // Rows without an action are plain list items: no button, no chevron.
  if (!onClick) return <div className={className + ' list-row-static'}>{content}</div>;
  return (
    <button className={className} aria-current={selected || undefined} onClick={onClick}>
      {content}
      {chevron && <Icon name="chevron_right" size={22} />}
    </button>
  );
}

/* ---------- Overlays/BottomSheet ---------- */
/**
 * Two kinds of sheets (Synne 22.10), never both in one sheet:
 * - `primary`: the sheet leads to an action that matters (add, save, restore, fetch …) → a black primary button
 *   at the bottom with a verb, and only X (on the left) in the header.
 * - `onConfirm`: you only adjust something and are done (e.g. the measuring tool) → ✓ in the header, X on the left.
 * `footer` is for anything else, e.g. destructive confirmations (Cancel / Delete).
 */
export function BottomSheet({
  title,
  onClose,
  children,
  footer,
  label,
  onConfirm,
  confirmLabel = 'Done',
  confirmDisabled,
  tall,
  closeRight: closeRightProp,
  primary,
  onBack,
  modeless,
}: {
  title?: string;
  /** a step in a flow: a back arrow on the left instead of X (Synne 27.10, «Create room») */
  onBack?: () => void;
  /** almost full height (a form, e.g. «Create room») */
  tall?: boolean;
  /** no longer used: X is on the right (Synne 04.11) */
  closeRight?: boolean;
  /** accessible name when there is no visible title */
  label?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  onConfirm?: () => void;
  /** accessible name of the ✓ button, e.g. «Save version» */
  confirmLabel?: string;
  confirmDisabled?: boolean;
  /** the main action, as a primary button at the bottom */
  primary?: { label: string; onClick: () => void; disabled?: boolean };
  /** the screen behind stays usable (no dark layer, a tap outside doesn't close): e.g. the 360° view over the room */
  modeless?: boolean;
}) {
  void closeRightProp; // kept so older call sites still compile – where X goes is decided above (Synne 04.11)
  if (primary)
    footer = (
      <Button block disabled={primary.disabled} onClick={primary.onClick}>
        {primary.label}
      </Button>
    );
  useEffect(() => {
    // Esc in a text field only leaves the field (or closes its suggestions) – it doesn't throw away the whole sheet
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === 'Escape' && !(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'))) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={'scrim' + (modeless ? ' scrim-modeless' : '')} onClick={modeless ? undefined : onClose}>
      <section className={'sheet' + (tall ? ' sheet-tall' : '')} role="dialog" aria-modal={!modeless} aria-label={title ?? label} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden>
          <span />
        </div>
        {title && (
          <header className="sheet-head">
            {/* X is on the right (Synne 04.11; before 27.10–04.11 on the left). On the left: «back» in a step of a flow.
                A sheet where you only adjust something has ✓ on the right, so its X stays on the left */}
            {onBack ? (
              <IconButton icon="chevron_left" label="Back" variant="glass" iconSize={20} onClick={onBack} />
            ) : onConfirm && !primary ? (
              <IconButton icon="close" label="Close" variant="glass" iconSize={20} onClick={onClose} />
            ) : (
              <span aria-hidden />
            )}
            <h2 className="sheet-title">{title}</h2>
            {onConfirm && !primary ? (
              <IconButton icon="check" label={confirmLabel} variant="primary" iconSize={22} disabled={confirmDisabled} onClick={onConfirm} />
            ) : (
              <IconButton icon="close" label="Close" variant="glass" iconSize={20} onClick={onClose} />
            )}
          </header>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </section>
    </div>
  );
}

/** Small centred dialog for actions that need a confirmation (Figma 164:2546). */
export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="scrim scrim-center" onClick={onCancel}>
      <section className="dialog" role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">{title}</h2>
        <p className="dialog-text">{text}</p>
        <div className="dialog-actions">
          <Button variant="text" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="text" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

/* ---------- Feedback/Loading ---------- */
export function Loading({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden />
      <strong>{text}</strong>
      {sub && <span className="loading-sub">{sub}</span>}
    </div>
  );
}

/** «10:24», «yesterday», «Mon», «3 Oct» – short, like the chat lists in Figma. */
export const fmtShort = (t: number) => {
  const d = new Date(t);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'yesterday';
  if (now.getTime() - t < 6 * 24 * 3600_000) return d.toLocaleDateString('en-GB', { weekday: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/** «Today 10:31», «Yesterday», «3 Oct» – used for saved versions. */
export const fmtDay = (t: number) => {
  const d = new Date(t);
  const now = new Date();
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Today ${time}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/**
 * Navigation/SegmentedTabs: the one tab style in the app (Synne 26.10, Figma 06O proposal 1) – a grey track with the
 * chosen tab in white, full width. When the tab changes, the white «thumb» slides over and turns to glass on the way,
 * like the iOS segmented control (Synne's reference IMG_0450).
 */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  label = 'Show',
  idPrefix,
  controls,
  className = '',
}: {
  tabs: { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  label?: string;
  idPrefix?: string;
  controls?: string;
  className?: string;
}) {
  const index = Math.max(0, tabs.findIndex((t) => t.id === value));
  const [moving, setMoving] = useState(false);
  const [prev, setPrev] = useState(index);
  // glass only while the thumb is on its way (also when the tab is changed from outside)
  if (prev !== index) {
    setPrev(index);
    setMoving(true);
  }
  useEffect(() => {
    if (!moving) return;
    const t = window.setTimeout(() => setMoving(false), 380);
    return () => window.clearTimeout(t);
  }, [moving, index]);
  return (
    <div
      className={'seg-tabs' + (moving ? ' is-moving' : '') + (className ? ' ' + className : '')}
      role="tablist"
      aria-label={label}
      style={{ '--seg-n': tabs.length, '--seg-i': index } as CSSProperties}
    >
      <span className="seg-thumb" aria-hidden />
      {tabs.map((t) => (
        <button
          key={t.id}
          id={idPrefix ? `${idPrefix}-${t.id}` : undefined}
          role="tab"
          aria-selected={t.id === value}
          aria-controls={controls}
          className="seg-tab"
          onClick={() => t.id !== value && onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
