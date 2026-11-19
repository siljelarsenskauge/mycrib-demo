// A bottom sheet for «how do you want to add it?» (Synne 19.10–20.10, like the «Add to session» sheet in the Claude app):
// up to three equal tiles with an icon and a word, and the other choices as rows below.
// Used by «New room» and by «Add item» / [+] in the chat, so all three look and work the same.
import { Icon, type IconName } from './Icon';
import { BottomSheet } from './ui';

export interface Choice {
  icon: IconName;
  label: string;
  onClick: () => void;
  /** already used (e.g. the room is scanned): a check mark and the success colour */
  done?: boolean;
}

/** The tiles and rows on their own, for sheets that have more in them (e.g. «Create room»). */
export function Choices({ tiles, rows = [] }: { tiles: Choice[]; rows?: Choice[] }) {
  return (
    <>
      <div className="choice-tiles">
        {tiles.map((c) => (
          <button key={c.label} className={'choice-tile' + (c.done ? ' is-done' : '')} aria-pressed={c.done || undefined} onClick={c.onClick}>
            <Icon name={c.done ? 'check' : c.icon} size={24} />
            {c.label}
          </button>
        ))}
      </div>
      {rows.map((c) => (
        <button key={c.label} className={'choice-row' + (c.done ? ' is-done' : '')} aria-pressed={c.done || undefined} onClick={c.onClick}>
          <Icon name={c.done ? 'check' : c.icon} size={22} />
          <span>{c.label}</span>
          <Icon name="chevron_right" size={20} />
        </button>
      ))}
    </>
  );
}

export function ChoiceSheet({ title, tiles, rows = [], onClose, children }: { title: string; tiles: Choice[]; rows?: Choice[]; onClose: () => void; children?: React.ReactNode }) {
  return (
    <BottomSheet title={title} onClose={onClose}>
      <Choices tiles={tiles} rows={rows} />
      {children}
    </BottomSheet>
  );
}
