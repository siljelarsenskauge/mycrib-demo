import { useEffect, useState } from 'react';
import { kr, SOFA_VEDBY, SUGGESTIONS } from '../state/catalog';
import type { Attachment } from '../state/types';
import { FurnitureThumb } from './FurnitureThumb';
import { Loading, ModalSheet } from './ui';

export type CaptureMethod = 'scan' | 'photo' | 'upload' | 'library';

const SOFA = SOFA_VEDBY;
const ARMCHAIR = { ...SUGGESTIONS.find((s) => s.product?.model === 'ULLERUP')!, source: 'bilde' };

export const GALLERY: { label: string; item: Attachment }[] = [
  { label: 'Screenshot: sofa fra nettbutikk', item: SOFA },
  { label: 'Bilde: sofa i butikk', item: SOFA },
  { label: 'Bilde: lenestol', item: ARMCHAIR },
  { label: 'Screenshot: bokhylle', item: { name: 'Bokhylle', kind: 'shelf', width: 80, depth: 30, height: 200, color: '#9a8a78', colorName: 'tre', source: 'bilde' } },
];

const TITLES: Record<CaptureMethod, string> = {
  scan: 'Scan møbel',
  photo: 'Ta bilde',
  upload: 'Velg bilde',
  library: 'Mine møbler',
};

/**
 * Simulated capture → "AI recognises" → preview with editable measurements → «Legg ved».
 * When `initial` is given (from Mine møbler) it goes straight to the preview.
 */
export function FurniturePreview({
  method,
  initial,
  onAttach,
  onClose,
  confirmLabel = 'Legg ved',
}: {
  confirmLabel?: string;
  method: CaptureMethod;
  initial?: Attachment;
  onAttach: (a: Attachment) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'capture' | 'recognizing' | 'result'>(initial ? 'result' : 'capture');
  const [item, setItem] = useState<Attachment>(initial ?? SOFA);

  useEffect(() => {
    if (step !== 'recognizing') return;
    const t = window.setTimeout(() => setStep('result'), 1700);
    return () => window.clearTimeout(t);
  }, [step]);

  const recognise = (a: Attachment) => {
    setItem(a);
    setStep('recognizing');
  };

  const setDim = (key: 'width' | 'depth' | 'height', v: string) => {
    const n = parseInt(v.replace(/\D/g, ''), 10);
    setItem({ ...item, [key]: Number.isFinite(n) ? n : 0 });
  };
  const valid = item.width > 0 && item.depth > 0 && item.height > 0 && item.name.trim().length > 0;

  if (step === 'capture') {
    return (
      <ModalSheet title={TITLES[method]} onClose={onClose}>
        {method === 'upload' ? (
          <>
            <p className="hint" style={{ marginBottom: 12 }}>
              Velg et bilde eller et screenshot av møbelet (simulert bildebibliotek).
            </p>
            <div className="pins">
              {GALLERY.map((g) => (
                <button key={g.label} className="pin" onClick={() => recognise(g.item)}>
                  <div className="placeholder-img" style={{ height: 110 }} />
                  <span>{g.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="fake-camera">
              {method === 'scan'
                ? 'Kamerasøker (simulert)\nHold telefonen mot møbelet og gå sakte rundt det.'
                : 'Kamerasøker (simulert)\nSikt mot møbelet.'}
            </div>
            <button className="btn btn-primary btn-block" onClick={() => recognise(SOFA)}>
              {method === 'scan' ? 'Start skanning' : 'Ta bilde'}
            </button>
          </>
        )}
      </ModalSheet>
    );
  }

  if (step === 'recognizing') {
    return (
      <ModalSheet title={TITLES[method]} onClose={onClose}>
        <Loading inline text="AI gjenkjenner møbelet …" sub="Finner type og anslår mål" />
      </ModalSheet>
    );
  }

  return (
    <ModalSheet
      title={initial ? item.name : 'Dette så AI-en'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Avbryt
          </button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onAttach({ ...item, name: item.name.trim() })}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ height: 130, background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 14 }}>
        <FurnitureThumb item={item} />
      </div>
      {item.product && (
        <p className="product-line">
          <strong>
            {item.product.store} · {item.product.model}
          </strong>{' '}
          · {kr(item.product.price)} · finnes i {item.product.variants.length} farger
        </p>
      )}
      <div className="field">
        <label htmlFor="fp-name">Møbel</label>
        <input id="fp-name" className="input" value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} />
      </div>
      <div className="field">
        <span className="label">Mål i cm – sjekk at de stemmer</span>
        <div className="dims">
          {(
            [
              ['width', 'Bredde (B)'],
              ['depth', 'Dybde (D)'],
              ['height', 'Høyde (H)'],
            ] as const
          ).map(([k, l]) => (
            <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--fs-xs)', color: 'var(--ink-2)' }}>
              {l}
              <input className="input" inputMode="numeric" value={item[k] || ''} onChange={(e) => setDim(k, e.target.value)} aria-label={`${l} i cm`} />
            </label>
          ))}
        </div>
      </div>
      <p className="hint">
        {initial
          ? 'Fra Mine møbler. Målene brukes når møbelet plasseres i rommet.'
          : 'Målene er anslått fra bildet. Endre dem hvis du vet de nøyaktige målene – de brukes når AI-en plasserer møbelet.'}
      </p>
    </ModalSheet>
  );
}
