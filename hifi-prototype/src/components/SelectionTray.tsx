import { useEffect, useRef, useState } from 'react';
import { nok, suggestionsFor } from '../state/catalog';
import type { Attachment, Furniture, LibraryItem } from '../state/types';
import { FurnitureThumb } from './FurnitureThumb';
import { Icon } from './Icon';

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

const SEARCH_MS = 1100;

/**
 * Chat/SelectionTray («Try others»): colours of the recognised product and similar items. Everything is one tap.
 * Shown in the chat sheet instead of the messages while an item is marked.
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
  // remember how the item looked when it was marked, so the user can always go back with one tap
  const original = useRef<Furniture>(item);
  if (original.current.id !== item.id) original.current = item;
  const [searching, setSearching] = useState(true);
  useEffect(() => {
    setSearching(true);
    const t = window.setTimeout(() => setSearching(false), SEARCH_MS);
    return () => window.clearTimeout(t);
    // a new search only when another item is marked (swaps keep the same id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const p = item.product;
  const kind = original.current.kind;
  const online = suggestionsFor(kind);
  const mine = library.filter((l) => l.kind === kind).map((l) => toAttachment(l, 'My furniture'));
  const start = toAttachment(original.current, 'original');
  const showOriginal = !sameThing(item, start) || item.color !== start.color;

  const card = (a: Attachment, label: string, sub: string, key: string) => {
    const active = sameThing(item, a);
    return (
      <button key={key} className="tray-card" aria-pressed={active} onClick={() => !active && onSwap(a)} aria-label={`Try ${label}`}>
        <span className="tray-card-img">
          <FurnitureThumb item={active ? item : a} />
        </span>
        <span className="tray-card-name">{label}</span>
        <span className="tray-card-sub">{sub}</span>
      </button>
    );
  };

  return (
    <div className="tray" role="group" aria-label={`Options for ${item.name}`}>
      <div className="tray-head">
        <div className="tray-product">
          <span className="tray-product-name">{p ? `${p.store} ${p.model}` : item.name}</span>
          <span className="tray-product-meta">{p ? `${nok(p.price)} · ${item.colorName}` : item.colorName}</span>
        </div>
        {p && p.variants.length > 1 && (
          <div className="tray-swatches">
            {p.variants.map((v) => (
              <button
                key={v.color}
                className="swatch"
                aria-pressed={item.color === v.color}
                aria-label={`Change to ${v.colorName}`}
                title={v.colorName}
                onClick={() => onVariant(v.color, v.colorName)}
              >
                <span style={{ background: swatchBackground(v.color) }} />
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="tray-label">Similar items</span>
      <div className="tray-cards">
        {showOriginal && (
          <button className="tray-card" onClick={() => onSwap(start)} aria-label="Go back to how it was">
            <span className="tray-card-img tray-card-icon">
              <Icon name="undo" size={22} />
            </span>
            <span className="tray-card-name">As it was</span>
            <span className="tray-card-sub">Original</span>
          </button>
        )}
        {searching ? (
          <>
            <div className="tray-card tray-card-loading" role="status">
              <span className="tray-card-img tray-card-icon">
                <span className="spinner" aria-hidden />
              </span>
              <span className="tray-card-sub">Searching online …</span>
            </div>
            <div className="tray-card" aria-hidden>
              <span className="tray-card-img skeleton" />
            </div>
          </>
        ) : (
          online.map((a) => card(a, a.product!.model, nok(a.product!.price), a.product!.model))
        )}
        {mine.map((a, i) => card(a, a.name, 'My furniture', 'mine' + i))}
        <button className="tray-card" onClick={onCamera}>
          <span className="tray-card-img tray-card-icon">
            <Icon name="photo_camera" size={22} />
          </span>
          <span className="tray-card-name">Camera roll</span>
          <span className="tray-card-sub">Try your own photo</span>
        </button>
      </div>
    </div>
  );
}
