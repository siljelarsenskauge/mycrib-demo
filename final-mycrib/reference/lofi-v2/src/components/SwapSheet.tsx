import { useEffect, useState } from 'react';
import { kr } from '../state/catalog';
import { dims } from '../state/geometry';
import type { Attachment, Furniture } from '../state/types';
import { GALLERY } from './FurniturePreview';
import { FurnitureThumb } from './FurnitureThumb';
import { Loading, ModalSheet } from './ui';

function diffText(current: Furniture, next: Attachment) {
  const d = next.width - current.width;
  if (d === 0) return 'Samme bredde';
  return `${Math.abs(d)} cm ${d > 0 ? 'bredere' : 'smalere'}`;
}

/** Try something from the camera roll: pick a photo → AI recognises it → compare → «Prøv i rommet». */
export function SwapSheet({ current, onSwap, onClose }: { current: Furniture; onSwap: (a: Attachment) => void; onClose: () => void }) {
  const [candidate, setCandidate] = useState<Attachment | null>(null);
  const [recognising, setRecognising] = useState<Attachment | null>(null);

  useEffect(() => {
    if (!recognising) return;
    const t = window.setTimeout(() => {
      setCandidate(recognising);
      setRecognising(null);
    }, 1500);
    return () => window.clearTimeout(t);
  }, [recognising]);

  if (recognising) {
    return (
      <ModalSheet title="Fra kamerarull" onClose={onClose}>
        <Loading inline text="AI gjenkjenner møbelet …" sub="Finner type, mål og produkt" />
      </ModalSheet>
    );
  }

  if (candidate) {
    return (
      <ModalSheet
        title="Fra kamerarull"
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={() => setCandidate(null)}>
              Tilbake
            </button>
            <button className="btn btn-primary" onClick={() => onSwap(candidate)}>
              Prøv i rommet
            </button>
          </>
        }
      >
        <div className="compare">
          <div className="compare-col">
            <span className="compare-label">Nå</span>
            <div className="compare-img">
              <FurnitureThumb item={current} />
            </div>
            <strong>{current.name}</strong>
            <span className="row-meta">{dims(current)}</span>
          </div>
          <span className="compare-arrow" aria-hidden>
            →
          </span>
          <div className="compare-col">
            <span className="compare-label">Fra bildet</span>
            <div className="compare-img">
              <FurnitureThumb item={candidate} />
            </div>
            <strong>{candidate.name}</strong>
            <span className="row-meta">{dims(candidate)}</span>
            {candidate.product && (
              <span className="row-meta">
                {candidate.product.store} {candidate.product.model} · {kr(candidate.product.price)}
              </span>
            )}
          </div>
        </div>
        <p className="compare-diff">{diffText(current, candidate)}</p>
      </ModalSheet>
    );
  }

  return (
    <ModalSheet title="Fra kamerarull" onClose={onClose}>
      <p className="hint" style={{ marginBottom: 12 }}>
        Velg et bilde eller et screenshot av møbelet du vil prøve (simulert kamerarull).
      </p>
      <div className="pins">
        {GALLERY.map((g) => (
          <button key={g.label} className="pin" onClick={() => setRecognising(g.item)}>
            <div className="placeholder-img" style={{ height: 100 }} />
            <span>{g.label}</span>
          </button>
        ))}
      </div>
    </ModalSheet>
  );
}
