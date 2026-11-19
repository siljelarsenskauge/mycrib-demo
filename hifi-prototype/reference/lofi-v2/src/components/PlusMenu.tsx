import { ModalSheet } from './ui';

export type PlusChoice = 'scan' | 'upload' | 'inspiration' | 'library';

const OPTIONS: { id: PlusChoice; icon: string; label: string; sub: string }[] = [
  { id: 'scan', icon: '⌖', label: 'Scan møbel', sub: 'Gå rundt møbelet med kameraet' },
  { id: 'upload', icon: '↥', label: 'Last opp bilde/screenshot', sub: 'Fra bilder, f.eks. fra en nettbutikk' },
  { id: 'inspiration', icon: '▦', label: 'Inspirasjon', sub: 'Fra rommets moodboard eller Pinterest' },
  { id: 'library', icon: '☰', label: 'Mine møbler', sub: 'Møbler du har lagret' },
];

/** Bottom sheet opened from [+] */
export function PlusMenu({
  onPick,
  onClose,
  title = 'Legg til',
  choices,
}: {
  onPick: (c: PlusChoice) => void;
  onClose: () => void;
  title?: string;
  choices?: PlusChoice[];
}) {
  return (
    <ModalSheet title={title} onClose={onClose}>
      {OPTIONS.filter((o) => !choices || choices.includes(o.id)).map((o) => (
        <button key={o.id} className="row" onClick={() => onPick(o.id)}>
          <span className="icon-btn" aria-hidden style={{ background: 'var(--surface)' }}>
            {o.icon}
          </span>
          <span className="row-main">
            <span className="row-title">{o.label}</span>
            <br />
            <span className="row-meta">{o.sub}</span>
          </span>
          <span className="chev">›</span>
        </button>
      ))}
    </ModalSheet>
  );
}
