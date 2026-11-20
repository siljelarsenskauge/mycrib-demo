import { useEffect, useRef, useState } from 'react';
import { kr, suggestionsFor } from '../state/catalog';
import type { Attachment, Furniture, LibraryItem } from '../state/types';
import { FurnitureThumb } from './FurnitureThumb';

export function swatchBackground(color: string) {
  return color === 'zebra' ? 'repeating-linear-gradient(55deg,#111 0 5px,#f4f4f4 5px 11px)' : color;
}

export const toAttachment = (f: Furniture | LibraryItem, source: string): Attachment => ({
  name: f.name,
  kind: f.kind,
  width: f.width,
  depth: f.depth,
  height: f.height,
  color: f.color,
  colorName: f.colorName,
  source,
  product: f.product,
});

const sameThing = (f: Furniture, a: Attachment) =>
  f.product && a.product ? f.product.store === a.product.store && f.product.model === a.product.model : f.name === a.name && f.width === a.width;

function widthDiff(current: Furniture, next: Attachment) {
  const d = next.width - current.width;
  return d === 0 ? 'samme bredde' : `${d > 0 ? '+' : '−'}${Math.abs(d)} cm`;
}

const SEARCH_MS = 1100;

/**
 * Shown above the chat input when a piece of furniture is marked. Everything is one tap:
 * - the colours a recognised product exists in
 * - similar furniture the AI found online (simulated), Mine møbler of the same type, and «Slik den var»
 * - «Kamerarull» to try something you photographed
 */
export function SelectionTray({
  item,
  library,
  onVariant,
  onSwap,
  onCamera,
}: {
  item: Furniture;
  library: LibraryItem[];
  onVariant: (color: string, colorName: string) => void;
  onSwap: (a: Attachment) => void;
  onCamera: () => void;
}) {
  // remember how the piece looked when it was marked, so the user can always go back with one tap
  const original = useRef<Furniture>(item);
  if (original.current.id !== item.id) original.current = item;
  const [searching, setSearching] = useState(true);
  useEffect(() => {
    setSearching(true);
    const t = window.setTimeout(() => setSearching(false), SEARCH_MS);
    return () => window.clearTimeout(t);
    // a new search only when another piece of furniture is marked (swaps keep the same id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const p = item.product;
  const kind = original.current.kind;
  const online = suggestionsFor(kind);
  const mine = library.filter((l) => l.kind === kind).map((l) => toAttachment(l, 'Mine møbler'));
  const start = toAttachment(original.current, 'opprinnelig');
  const showOriginal = !sameThing(item, start) || item.color !== start.color;

  const card = (a: Attachment, label: string, sub: string, key: string) => {
    const active = sameThing(item, a);
    return (
      <button key={key} className="alt-card" aria-pressed={active} onClick={() => !active && onSwap(a)} aria-label={`Prøv ${label}`}>
        <span className="alt-img">
          <FurnitureThumb item={active ? item : a} />
        </span>
        <span className="alt-name">{label}</span>
        <span className="alt-sub">{sub}</span>
      </button>
    );
  };

  return (
    <div className="tray" role="group" aria-label={`Valg for ${item.name}`}>
      <div className="tray-head">
        <span className="tray-label">{p ? `${p.store} ${p.model} · ${kr(p.price)}` : item.name}</span>
        {p && p.variants.length > 1 && (
          <div className="tray-variants">
            {p.variants.map((v) => (
              <button
                key={v.color}
                className="tray-swatch"
                aria-pressed={item.color === v.color}
                aria-label={`Bytt til ${v.colorName}`}
                title={v.colorName}
                onClick={() => onVariant(v.color, v.colorName)}
              >
                <span style={{ background: swatchBackground(v.color) }} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="tray-alts" aria-label="Lignende møbler">
        {showOriginal && card(start, 'Slik den var', start.product ? start.product.model : start.name, 'original')}
        {searching ? (
          <>
            <div className="alt-card alt-loading" role="status">
              <span className="spinner small" />
              <span className="alt-sub">AI søker etter lignende på nettet …</span>
            </div>
            <div className="alt-card alt-skeleton" aria-hidden />
            <div className="alt-card alt-skeleton" aria-hidden />
          </>
        ) : (
          online.map((a) => card(a, `${a.product!.store} ${a.product!.model}`, `${kr(a.product!.price)} · ${widthDiff(item, a)}`, a.product!.model))
        )}
        {mine.map((a, i) => card(a, a.name, `Mine møbler · ${widthDiff(item, a)}`, 'mine' + i))}
        <button className="alt-card alt-camera" onClick={onCamera}>
          <span className="alt-img alt-icon" aria-hidden>
            ◉
          </span>
          <span className="alt-name">Kamerarull</span>
          <span className="alt-sub">Prøv ditt eget bilde</span>
        </button>
      </div>
    </div>
  );
}
