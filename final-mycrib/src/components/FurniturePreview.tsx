import { useEffect, useRef, useState } from 'react';
import { nok, SOFA_VEDBY, SUGGESTIONS } from '../state/catalog';
import type { Attachment } from '../state/types';
import { FurnitureThumb } from './FurnitureThumb';
import { Icon } from './Icon';
import { fromTag, NESTING_TABLES, NotThisItemSheet, ScanScreen, TagScanScreen } from './ItemScan';
import { BottomSheet, Button, Loading } from './ui';

/** «Not this item?» as a link under the name (hidden 19.11, Synne: a ghost button under the main button instead) */
const SHOW_NOT_LINK = false;

export type CaptureMethod = 'scan' | 'upload' | 'link' | 'library';

const SOFA = SOFA_VEDBY;
const ARMCHAIR = { ...SUGGESTIONS.find((s) => s.product?.model === 'ULLERUP')!, source: 'photo' };

/** Simulated photo library. The first tile opens the real camera roll on a phone. */
export const GALLERY: { label: string; item: Attachment }[] = [
  { label: 'Screenshot: sofa from a web shop', item: SOFA },
  { label: 'Photo: sofa in a store', item: SOFA },
  { label: 'Photo: armchair', item: ARMCHAIR },
  { label: 'Screenshot: bookshelf', item: { name: 'Bookshelf', kind: 'shelf', width: 80, depth: 30, height: 200, color: '#9a8a78', colorName: 'wood', source: 'photo' } },
  { label: 'Photo: coffee table', item: { ...SUGGESTIONS.find((s) => s.product?.model === 'TONSTAD')!, source: 'photo' } },
];

/** Simulated «read the product page»: guess the item from words in the link. */
export function itemFromLink(url: string): Attachment {
  const u = url.toLowerCase();
  // the link the user pasted is the product page
  const href = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
  const withUrl = (a: Attachment): Attachment => ({ ...a, source: 'link', product: a.product ? { ...a.product, url: href } : a.product });
  const find = (model: string) => withUrl(SUGGESTIONS.find((s) => s.product?.model === model)!);
  // a link to one of the products in the catalogue (e.g. a JYSK coffee table) gives that product – Rathi 11.11
  const plain = (m: string) => m.toLowerCase().replace(/ö/g, 'oe').replace(/å/g, 'aa').replace(/æ/g, 'ae').replace(/ø/g, 'oe');
  const named = SUGGESTIONS.find((s) => s.product && (u.includes(s.product.model.toLowerCase()) || u.includes(plain(s.product.model))));
  if (named) return withUrl(named);
  if (/lenestol|armchair|ullerup/.test(u)) return find('ULLERUP');
  if (/salongbord|sofabord|coffee/.test(u)) return find('TONSTAD');
  if (/kivik/.test(u)) return find('KIVIK');
  if (/seng|bed/.test(u)) return find('GOLD F110');
  // any other link: the test product for now, the Telemark side tables (Synne 22.10 – may change later)
  return { ...NESTING_TABLES, source: 'link', product: { ...NESTING_TABLES.product!, url: href } };
}

/** «www.trademax.no/…» → «trademax.no» */
const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const looksLikeLink = (s: string) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(s.trim());

/** Shrink a picked photo to a small data URL, so it can be kept in localStorage. */
export function toThumb(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 240;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Capture → "AI recognises" → «Here's what the AI saw» with editable measurements → Add.
 * When `initial` is given (from My furniture) it goes straight to the result.
 */
export function FurniturePreview({
  method,
  initial,
  resume,
  onAttach,
  onClose,
  confirmLabel = 'Add to room',
  roomName = 'this room',
  photo,
  scanDemo,
  photoItem,
}: {
  /** what a picked photo is recognised as (the stand's coffee tables, Synne 18.11); else the test sofa */
  photoItem?: Attachment;
  /** what the scan finds (the sofa from «Add furniture» on Home, Synne 18.11) */
  scanDemo?: string;
  confirmLabel?: string;
  roomName?: string;
  /** a photo the user picked from the camera roll: go straight to «recognising» */
  photo?: string;
  method: CaptureMethod;
  initial?: Attachment;
  /** back from «Which room?»: the item that was found, shown again as the result (Synne 19.11) */
  resume?: Attachment;
  onAttach: (a: Attachment) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'capture' | 'recognizing' | 'result' | 'tag'>(initial || resume ? 'result' : photo ? 'recognizing' : 'capture');
  const [item, setItem] = useState<Attachment>(initial ?? resume ?? (photo ? (photoItem ? { ...photoItem, photo } : { ...SOFA, product: undefined, photo, uncertain: ['depth', 'height'] }) : SOFA));
  // «Scan again» can switch a photo or link flow over to the scan
  const [mode, setMode] = useState<CaptureMethod>(method);
  const [notThis, setNotThis] = useState(false);
  // where to go back to when the price tag scan is closed
  const [tagFrom, setTagFrom] = useState<'capture' | 'result'>('result');
  const [picked, setPicked] = useState<number | null>(null);
  // always empty when «Product link» opens – no example or earlier link (Synne 04.11; before, the test product was filled in)
  const [link, setLink] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 'recognizing') return;
    const t = window.setTimeout(() => setStep('result'), 1700);
    return () => window.clearTimeout(t);
  }, [step]);

  const recognise = (a: Attachment) => {
    setItem(a);
    setStep('recognizing');
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    // a real photo from the camera roll – the recognition is still simulated, so it "finds" the test sofa
    const photo = await toThumb(file).catch(() => undefined);
    recognise({ ...SOFA, product: undefined, photo, uncertain: ['depth', 'height'] });
  };

  const setDim = (key: 'width' | 'depth' | 'height', v: string) => {
    const n = parseInt(v.replace(/\D/g, ''), 10);
    // a size the user has typed is checked, so it is no longer marked as a guess
    setItem({ ...item, [key]: Number.isFinite(n) ? n : 0, uncertain: item.uncertain?.filter((u) => u !== key) });
  };
  const valid = item.width > 0 && item.depth > 0 && (item.flat || item.height > 0) && item.name.trim().length > 0;
  const openTag = (from: 'capture' | 'result', a: Attachment) => {
    setItem(a);
    setTagFrom(from);
    setStep('tag');
  };

  if (step === 'tag')
    return (
      <TagScanScreen
        item={fromTag(item, SOFA)}
        onClose={() => setStep(tagFrom)}
        onUse={() => {
          setItem(fromTag(item, SOFA));
          setStep('result');
        }}
      />
    );

  if (step === 'capture' && mode === 'scan')
    return (
      <ScanScreen
        startDemo={scanDemo}
        roomName={roomName}
        onClose={onClose}
        onDone={recognise}
        onTag={(a) => openTag('capture', a)}
        onEnter={(a) => {
          // the scan couldn't measure it: type the size yourself
          setItem({ ...a, product: undefined, sizes: undefined, measured: undefined, name: a.flat ? 'Rug' : a.kind === 'sofa' ? 'Sofa' : 'Side tables', width: 0, depth: 0, height: a.flat ? 1 : 0, uncertain: a.flat ? ['width', 'depth'] : ['width', 'depth', 'height'], source: 'manual' });
          setStep('result');
        }}
      />
    );

  if (step === 'capture' && mode === 'link') {
    const ok = looksLikeLink(link);
    return (
      <BottomSheet
        title="Product link"
        onClose={onClose}
        primary={{ label: 'Fetch product', onClick: () => recognise(itemFromLink(link)), disabled: !ok }}
      >
        <form
          className="field"
          onSubmit={(e) => {
            e.preventDefault();
            if (ok) recognise(itemFromLink(link));
          }}
        >
          <label className="field-label" htmlFor="fp-link">
            Link
          </label>
          <input
            id="fp-link"
            className="input"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="Paste product link here..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
            autoFocus
          />
          <span className="field-help">Paste a link from a web shop. The AI fetches the name, size, colours and price from the page.</span>
        </form>
      </BottomSheet>
    );
  }

  if (step === 'capture') {
    return (
      <BottomSheet
        title="Photos"
        onClose={onClose}
        primary={{ label: 'Use photo', onClick: () => picked !== null && recognise(GALLERY[picked].item), disabled: picked === null }}
      >
        <p className="sheet-intro">Choose a photo or screenshot of the item.</p>
        <div className="photo-grid">
          <button className="photo-tile photo-tile-roll" onClick={() => fileRef.current?.click()}>
            <Icon name="photo_camera" size={24} />
            <span>Camera roll</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          {GALLERY.map((g, i) => (
            <button key={g.label} className="photo-tile" aria-pressed={picked === i} aria-label={g.label} onClick={() => setPicked(picked === i ? null : i)}>
              <span className="photo-tile-img">
                <FurnitureThumb item={g.item} />
              </span>
              {picked === i && (
                <span className="photo-check" aria-hidden>
                  <Icon name="check" size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      </BottomSheet>
    );
  }

  if (step === 'recognizing') {
    return (
      <BottomSheet label="Recognising the item" onClose={onClose}>
        <div className="preview-img">{item.photo ? <FurnitureThumb item={item} /> : <Icon name="sofa" size={32} />}</div>
        <Loading text={method === 'link' ? 'Fetching the product …' : 'AI is recognising the item …'} sub={method === 'link' ? 'Reading name, size and price from the page' : 'Finding the type and estimating size'} />
      </BottomSheet>
    );
  }

  // where the sizes come from – said plainly, and only flagged when the AI actually guessed (Synne 22.10)
  const typed = item.source === 'manual';
  const guessed = !initial && !!item.uncertain?.length;
  const fromScan = item.source === 'scan';
  const source = initial
    ? null
    : item.sizes && item.measured
      ? `Your scan measured ${item.measured.width} × ${item.measured.depth} cm – closest size chosen`
      : item.source === 'tag'
        ? 'From the price tag'
        : item.source === 'link'
          ? 'From the product page'
          : fromScan
            ? item.product
              ? 'Measured by your scan'
              : item.flat
                ? 'Flat on the floor – height isn’t needed'
                : 'Measured by your scan – the AI knows the size, just not the shop'
            : item.product
              ? 'From the product page of the recognised item'
              : null;
  const meta = item.product
    ? [item.product.store && `${item.product.store} ${item.product.model}`, nok(item.product.price), item.sizes ? `${item.sizes.length} sizes` : item.product.variants.length > 1 && `${item.product.variants.length} colours`].filter(Boolean).join(' · ')
    : initial
      ? 'From My furniture'
      : typed
        ? 'Not found online · type the size'
        : fromScan
          ? 'Not found online · measured by your scan'
          : 'Recognised from the photo';
  const sizeKey = (w: number, d: number) => `${w}x${d}`;
  const dims = item.flat
    ? ([
        ['width', 'W', 'Width'],
        ['depth', 'L', 'Length'],
      ] as const)
    : ([
        ['width', 'W', 'Width'],
        ['depth', 'D', 'Depth'],
        ['height', 'H', 'Height'],
      ] as const);

  return (
    <>
      <BottomSheet
        title={initial ? 'My furniture' : 'What the AI saw'}
        onClose={onClose}
        closeRight
        footer={
          <>
            <Button block className="stand-next-btn" disabled={!valid} onClick={() => onAttach({ ...item, name: item.name.trim(), height: item.flat ? 1 : item.height })}>
              {confirmLabel}
            </Button>
            {/* the AI may have found the wrong thing: a ghost button under the main one (Synne 19.11), was a link by the name */}
            {item.product && !initial && (
              <Button variant="text" block className="preview-not-btn" onClick={() => setNotThis(true)}>
                Not this item?
              </Button>
            )}
          </>
        }
      >
        <div className="preview-hero">{item.photo ? <img src={item.photo} alt={item.name} /> : <FurnitureThumb item={item} />}</div>
        <div className="preview-info">
        <div className="preview-name">
          <input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} aria-label="Item name" />
          <Icon name="edit" size={16} />
        </div>
        <p className="preview-meta">
          {meta}
          {/* where the AI found the product – opens the shop's page (Synne 22.10) */}
          {item.product?.url && !initial && (
            <>
              {' · '}
              <a className="preview-link" href={item.product.url} target="_blank" rel="noopener noreferrer" aria-label={`Open the product page on ${domainOf(item.product.url)} (new tab)`}>
                {domainOf(item.product.url)}
                <Icon name="open_in_new" size={14} />
              </a>
            </>
          )}
        </p>
        {/* the AI may have found the wrong thing – correcting it is as easy as accepting it (02D.1) */}
        {SHOW_NOT_LINK && item.product && !initial && (
          <button className="text-link preview-not" onClick={() => setNotThis(true)}>
            Not this item?
          </button>
        )}
        </div>

        {/* one label level only: «SIZE» above, and W / D / H inside the fields (Synne 22.10, option B) */}
        <div className="field">
          <span className="field-label">
            Size
            {guessed && !typed && (
              <span className="tag tag-warning">
                <Icon name="warning" size={12} /> Check the size
              </span>
            )}
          </span>
          {item.sizes ? (
            // a product in fixed sizes: one quiet choice, the closest to the scan already chosen (02D.7)
            <label className="input input-unit size-select">
              <select
                aria-label="Size"
                value={sizeKey(item.width, item.depth)}
                onChange={(e) => {
                  const s = item.sizes!.find((x) => sizeKey(x.width, x.depth) === e.target.value)!;
                  setItem({ ...item, width: s.width, depth: s.depth });
                }}
              >
                {item.sizes.map((s) => (
                  <option key={sizeKey(s.width, s.depth)} value={sizeKey(s.width, s.depth)}>
                    {s.width} × {s.depth} cm
                  </option>
                ))}
              </select>
              <span>{item.sizes.length} sizes</span>
              <Icon name="chevron_down" size={18} />
            </label>
          ) : (
            <div className={'dims' + (item.flat ? ' is-flat' : '')}>
              {dims.map(([k, key, l]) => {
                const unsure = !initial && item.uncertain?.includes(k);
                return (
                  <label key={k} className={'input input-unit dim-field' + (unsure ? ' is-uncertain' : '')}>
                    <span className="dim-key" aria-hidden>
                      {key}
                    </span>
                    <input inputMode="numeric" value={item[k] || ''} onChange={(e) => setDim(k, e.target.value)} aria-label={`${l} in cm${unsure ? ', estimated – please check' : ''}`} />
                    <span>cm</span>
                  </label>
                );
              })}
            </div>
          )}
          {guessed ? (
            // only when the AI is unsure does it suggest the price tag (02D.3)
            <div className="dims-hint is-warning has-action">
              <Icon name="warning" size={16} />
              <span>{typed ? 'The scan couldn’t measure it. Type the size, or snap the price tag.' : 'Not sure about the size. Snap the price tag for the exact size.'}</span>
              <Button variant="secondary" size="small" icon="scan_camera" onClick={() => openTag('result', item)}>
                Scan tag
              </Button>
            </div>
          ) : (
            source && (
              <p className="dims-hint">
                <Icon name="info" size={16} />
                {source}
              </p>
            )
          )}
        </div>
      </BottomSheet>
      {notThis && (
        <NotThisItemSheet
          scanned={fromScan}
          onClose={() => setNotThis(false)}
          onPick={(m) => {
            setItem({ ...m, source: item.source });
            setNotThis(false);
          }}
          onRescan={() => {
            setNotThis(false);
            setMode('scan');
            setStep('capture');
          }}
          onKeep={() => {
            setItem({ ...item, product: undefined, sizes: undefined, measured: item.measured, width: item.measured?.width ?? item.width, depth: item.measured?.depth ?? item.depth, name: item.flat ? 'Rug' : item.name });
            setNotThis(false);
          }}
        />
      )}
    </>
  );
}
