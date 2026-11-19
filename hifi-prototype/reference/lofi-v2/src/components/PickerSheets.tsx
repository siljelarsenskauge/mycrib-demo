import { dims } from '../state/geometry';
import { useState } from 'react';
import type { LibraryItem, Pin } from '../state/types';
import { PinGrid, PinterestExplore } from './Moodboard';
import { FurnitureThumb } from './FurnitureThumb';
import { ModalSheet } from './ui';

/**
 * Inspiration from [+]: mark one or more images from the room's moodboard or from
 * Pinterest, then «Legg til» attaches them to the chat input.
 */
export function InspirationSheet({
  title = 'Inspirasjon',
  roomName,
  moodboard,
  onToggleSave,
  onAdd,
  onClose,
}: {
  title?: string;
  roomName: string;
  moodboard: Pin[];
  onToggleSave: (p: Pin) => void;
  onAdd: (pins: Pin[]) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'board' | 'explore'>(moodboard.length ? 'board' : 'explore');
  const [selected, setSelected] = useState<Pin[]>([]);
  const saved = new Set(moodboard.map((p) => p.id));
  const selectedIds = new Set(selected.map((p) => p.id));
  const toggleSelect = (p: Pin) =>
    setSelected((list) => (list.some((x) => x.id === p.id) ? list.filter((x) => x.id !== p.id) : [...list, { id: p.id, title: p.title, prompt: p.prompt }]));

  return (
    <ModalSheet
      title={title}
      onClose={onClose}
      footer={
        selected.length > 0 ? (
          <button className="btn btn-primary" onClick={() => onAdd(selected)}>
            Legg til i chatten ({selected.length})
          </button>
        ) : undefined
      }
    >
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'board'} onClick={() => setTab('board')}>
          Moodboard ({moodboard.length})
        </button>
        <button role="tab" aria-selected={tab === 'explore'} onClick={() => setTab('explore')}>
          Utforsk Pinterest
        </button>
      </div>
      {tab === 'board' ? (
        <PinGrid
          pins={moodboard}
          savedIds={saved}
          onToggleSave={onToggleSave}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          empty={`Moodboardet for ${roomName} er tomt. Finn bilder under «Utforsk Pinterest».`}
        />
      ) : (
        <PinterestExplore savedIds={saved} onToggleSave={onToggleSave} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
      )}
    </ModalSheet>
  );
}

export function LibraryList({ items, onPick }: { items: LibraryItem[]; onPick: (i: LibraryItem) => void }) {
  if (items.length === 0) return <p className="empty">Ingen møbler lagret ennå.</p>;
  return (
    <>
      {items.map((it) => (
        <button key={it.id} className="row" onClick={() => onPick(it)}>
          <span className="thumb" style={{ width: 56, height: 48, padding: 4 }}>
            <FurnitureThumb item={it} />
          </span>
          <span className="row-main">
            <span className="row-title">{it.name}</span>
            <br />
            <span className="row-meta">{dims(it)}</span>
          </span>
          <span className="chev">›</span>
        </button>
      ))}
    </>
  );
}

export function MyFurnitureSheet({ items, onPick, onClose }: { items: LibraryItem[]; onPick: (i: LibraryItem) => void; onClose: () => void }) {
  return (
    <ModalSheet title="Mine møbler" onClose={onClose}>
      <p className="hint" style={{ marginBottom: 8 }}>
        Velg et møbel for å legge det til i rommet.
      </p>
      <LibraryList items={items} onPick={onPick} />
    </ModalSheet>
  );
}
