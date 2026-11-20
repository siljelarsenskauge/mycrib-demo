import { useState } from 'react';
import { PIN_CATALOG } from '../state/pins';
import type { Pin } from '../state/types';

/** Grey placeholder "image" – height varies so the grid reads like Pinterest. */
function PinImage({ id }: { id: string }) {
  const h = 100 + (id.charCodeAt(id.length - 1) % 4) * 18;
  return <div className="placeholder-img" style={{ height: h }} aria-hidden />;
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden>
      <path d="M2 1.5h12v15l-6-4-6 4z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Grid of pins. The small bookmark in the corner saves/removes the pin in the room's
 * moodboard. When `onToggleSelect` is given, tapping the image marks it for the chat.
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
  selectedIds?: Set<string>;
  onToggleSelect?: (p: Pin) => void;
  empty?: string;
}) {
  if (pins.length === 0) return <p className="empty">{empty ?? 'Ingen bilder.'}</p>;
  return (
    <div className="pins">
      {pins.map((p) => {
        const saved = savedIds.has(p.id);
        const selected = !!selectedIds?.has(p.id);
        return (
          <div key={p.id} className={'pin' + (selected ? ' is-selected' : '')}>
            {onToggleSelect ? (
              <button className="pin-main" aria-pressed={selected} onClick={() => onToggleSelect(p)} aria-label={`${selected ? 'Fjern markering av' : 'Marker'} «${p.title}»`}>
                <PinImage id={p.id} />
                <span>{p.title}</span>
              </button>
            ) : (
              <div className="pin-main">
                <PinImage id={p.id} />
                <span>{p.title}</span>
              </div>
            )}
            {selected && (
              <span className="pin-check" aria-hidden>
                ✓
              </span>
            )}
            <button className="pin-save" aria-pressed={saved} onClick={() => onToggleSave(p)} aria-label={saved ? `Fjern «${p.title}» fra moodboard` : `Lagre «${p.title}» i moodboard`}>
              <BookmarkIcon filled={saved} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Simulated Pinterest search. */
export function PinterestExplore({
  savedIds,
  onToggleSave,
  selectedIds,
  onToggleSelect,
}: {
  savedIds: Set<string>;
  onToggleSave: (p: Pin) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (p: Pin) => void;
}) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const results = query ? PIN_CATALOG.filter((p) => (p.title + ' ' + p.tags).toLowerCase().includes(query)) : PIN_CATALOG;
  return (
    <>
      <div className="field" style={{ marginBottom: 10 }}>
        <label className="sr-only" htmlFor="pin-search">
          Søk på Pinterest
        </label>
        <input id="pin-search" className="input" type="search" placeholder="Søk på Pinterest, f.eks. «sofa» eller «varm»" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <PinGrid pins={results} savedIds={savedIds} onToggleSave={onToggleSave} selectedIds={selectedIds} onToggleSelect={onToggleSelect} empty="Ingen treff. Prøv et annet søkeord." />
    </>
  );
}
