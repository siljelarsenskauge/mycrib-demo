import { useState } from 'react';
import { dims } from '../state/geometry';
import { PIN_CATALOG } from '../state/pins';
import type { LibraryItem, Pin } from '../state/types';
import { FurnitureThumb } from './FurnitureThumb';
import { Icon } from './Icon';
import { BottomSheet, ListRow, SegmentedTabs } from './ui';

/**
 * Content/MoodboardTile grid. The small badge in the corner saves/removes the image in the room's moodboard.
 * Tapping the image marks it for the chat.
 */
export function PinGrid({
  pins,
  savedIds,
  onToggleSave,
  selectedIds,
  onToggleSelect,
  empty,
}: {
  pins: Pin[];
  savedIds: Set<string>;
  onToggleSave: (p: Pin) => void;
  selectedIds: Set<string>;
  onToggleSelect: (p: Pin) => void;
  empty: string;
}) {
  if (pins.length === 0) return <p className="empty">{empty}</p>;
  return (
    <div className="photo-grid">
      {pins.map((p) => {
        const saved = savedIds.has(p.id);
        const selected = selectedIds.has(p.id);
        return (
          <div key={p.id} className="moodboard-tile">
            <button className="photo-tile" aria-pressed={selected} onClick={() => onToggleSelect(p)} aria-label={`${selected ? 'Unmark' : 'Mark'} «${p.title}»`}>
              <span className="photo-tile-img">
                <Icon name="image" size={22} />
              </span>
              <span className="photo-tile-caption">{p.title}</span>
              {selected && (
                <span className="photo-check" aria-hidden>
                  <Icon name="check" size={14} />
                </span>
              )}
            </button>
            <button
              className="icon-badge"
              aria-pressed={saved}
              onClick={() => onToggleSave(p)}
              aria-label={saved ? `Remove «${p.title}» from the moodboard` : `Save «${p.title}» to the moodboard`}
            >
              <Icon name="bookmark" size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Inspiration from [+]: mark images from the room's moodboard or Pinterest, then add them to the chat. */
export function InspirationSheet({
  title = 'Inspiration',
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
  const [q, setQ] = useState('');
  const saved = new Set(moodboard.map((p) => p.id));
  const selectedIds = new Set(selected.map((p) => p.id));
  const toggleSelect = (p: Pin) =>
    setSelected((list) => (list.some((x) => x.id === p.id) ? list.filter((x) => x.id !== p.id) : [...list, { id: p.id, title: p.title, prompt: p.prompt }]));
  const query = q.trim().toLowerCase();
  const results = query ? PIN_CATALOG.filter((p) => (p.title + ' ' + p.tags).toLowerCase().includes(query)) : PIN_CATALOG;

  return (
    <BottomSheet
      title={title}
      onClose={onClose}
      primary={{ label: `Add to chat${selected.length ? ` (${selected.length})` : ''}`, onClick: () => onAdd(selected), disabled: selected.length === 0 }}
    >
      <SegmentedTabs
        tabs={[
          { id: 'board', label: 'Moodboard' },
          { id: 'explore', label: 'Explore Pinterest' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'board' ? (
        <PinGrid
          pins={moodboard}
          savedIds={saved}
          onToggleSave={onToggleSave}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          empty={`The moodboard for ${roomName} is empty. Find images under «Explore Pinterest».`}
        />
      ) : (
        <>
          <label className="sr-only" htmlFor="pin-search">
            Search Pinterest
          </label>
          <input id="pin-search" className="input search-input" type="search" placeholder="Search Pinterest, e.g. «sofa» or «warm»" value={q} onChange={(e) => setQ(e.target.value)} />
          <PinGrid pins={results} savedIds={saved} onToggleSave={onToggleSave} selectedIds={selectedIds} onToggleSelect={toggleSelect} empty="No results. Try another word." />
        </>
      )}
    </BottomSheet>
  );
}

export function MyFurnitureSheet({ items, onPick, onClose }: { items: LibraryItem[]; onPick: (i: LibraryItem) => void; onClose: () => void }) {
  return (
    <BottomSheet title="My furniture" onClose={onClose}>
      {items.length === 0 && <p className="empty">No saved furniture yet.</p>}
      {items.map((it) => (
        <ListRow
          key={it.id}
          title={it.name}
          meta={`${dims(it)} · ${it.colorName}`}
          leading={
            <span className="list-thumb">
              <FurnitureThumb item={it} />
            </span>
          }
          onClick={() => onPick(it)}
        />
      ))}
    </BottomSheet>
  );
}
