// Simulated capture flows for «Nytt rom»: scanning the room, picking a floor plan, picking photos.
// Nothing is real – but each step looks and feels like the real thing, so testers know what happened.
import { useEffect, useState } from 'react';
import { Loading, ModalSheet } from './ui';

/* ---------- Scan the room ---------- */

const SCAN_MS = 6500;

const SCAN_STEPS: { at: number; text: string; found?: string }[] = [
  { at: 0, text: 'Pek kameraet mot et hjørne av rommet' },
  { at: 0.12, text: 'Gå sakte langs veggen', found: 'Vegg 1' },
  { at: 0.3, text: 'Fortsett rundt rommet', found: 'Vindu' },
  { at: 0.48, text: 'Hold telefonen i brysthøyde', found: 'Vegg 2' },
  { at: 0.62, text: 'Ta med døren', found: 'Dør' },
  { at: 0.78, text: 'Pek mot taket og gulvet', found: 'Takhøyde' },
  { at: 0.92, text: 'Nesten ferdig …', found: 'Vegg 3 og 4' },
];

/** Full-screen "camera" where the room is drawn up bit by bit while you walk around. */
export function ScanRoomFlow({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!started) return;
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / SCAN_MS);
      setProgress(p);
      if (p >= 1) window.clearInterval(id);
    }, 80);
    return () => window.clearInterval(id);
  }, [started]);

  const done = progress >= 1;
  const step = [...SCAN_STEPS].reverse().find((s) => progress >= s.at)!;
  const found = SCAN_STEPS.filter((s) => s.found && progress >= s.at).map((s) => s.found!);

  // the outline of the room appears edge by edge (perimeter of a 420 × 380 rectangle)
  const perimeter = 2 * (420 + 380);
  const drawn = perimeter * progress;

  return (
    <div className="scan" role="dialog" aria-label="Skann rommet">
      <div className="scan-top">
        <button className="btn btn-ghost scan-cancel" onClick={onCancel}>
          Avbryt
        </button>
        <span className="scan-title">Skann rommet</span>
        <span style={{ width: 72 }} />
      </div>

      <div className="scan-view">
        <svg viewBox="-60 -60 540 500" width="100%" height="100%" aria-hidden>
          {/* camera grid */}
          {[0, 1, 2, 3].map((i) => (
            <line key={'v' + i} x1={i * 140 - 60} y1={-60} x2={i * 140 - 60} y2={440} stroke="rgba(255,255,255,0.07)" />
          ))}
          {started && (
            <>
              <rect x={0} y={0} width={420} height={380} fill="rgba(255,255,255,0.06)" stroke="#fff" strokeWidth={6} strokeDasharray={`${drawn} ${perimeter}`} />
              {found.includes('Vindu') && <rect x={150} y={-8} width={140} height={16} fill="#9fd3ff" stroke="#fff" strokeWidth={2} />}
              {found.includes('Dør') && <path d="M 0 270 A 85 85 0 0 0 85 355" fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="6 6" />}
            </>
          )}
        </svg>
        {!started && <p className="scan-hint">Stå i et hjørne og hold telefonen foran deg.</p>}
      </div>

      <div className="scan-bottom">
        {started && (
          <>
            <div className="scan-progress" aria-label={`${Math.round(progress * 100)} % skannet`}>
              <div style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="scan-step" aria-live="polite">
              {done ? 'Rommet er skannet' : step.text}
            </p>
            <div className="scan-found">
              {found.map((f) => (
                <span key={f}>✓ {f}</span>
              ))}
            </div>
          </>
        )}
        {!started ? (
          <button className="btn btn-primary btn-block scan-btn" onClick={() => setStarted(true)}>
            Start skanning
          </button>
        ) : (
          <button className="btn btn-primary btn-block scan-btn" onClick={onDone} disabled={!done}>
            {done ? 'Ferdig' : `Skanner … ${Math.round(progress * 100)} %`}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Floor plan ---------- */

const PLAN_FILES = [
  { name: 'Plantegning_leilighet.pdf', meta: 'PDF · 1,2 MB · Filer' },
  { name: 'Plantegning_fra_Finn.jpg', meta: 'Bilde · Kamerarull' },
  { name: 'Skjermbilde_plantegning.png', meta: 'Skjermbilde · Kamerarull' },
];

/** Pick a file → «AI leser plantegningen …» → see what it found → «Bruk plantegningen». */
export function PlanUploadSheet({ onDone, onClose }: { onDone: (fileName: string) => void; onClose: () => void }) {
  const [file, setFile] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (!reading) return;
    const t = window.setTimeout(() => setReading(false), 1600);
    return () => window.clearTimeout(t);
  }, [reading]);

  if (file && reading) {
    return (
      <ModalSheet title="Plantegning" onClose={onClose}>
        <Loading inline text="AI leser plantegningen …" sub="Finner vegger, mål, vindu og dør" />
      </ModalSheet>
    );
  }

  if (file) {
    return (
      <ModalSheet
        title="Plantegning"
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={() => setFile(null)}>
              Velg en annen
            </button>
            <button className="btn btn-primary" onClick={() => onDone(file)}>
              Bruk plantegningen
            </button>
          </>
        }
      >
        <div className="plan-preview">
          <svg viewBox="-30 -30 490 440" width="100%" height="100%" aria-hidden>
            <rect x={0} y={0} width={430} height={375} fill="var(--room-floor)" stroke="var(--ink)" strokeWidth={6} />
            <rect x={155} y={-6} width={140} height={12} fill="var(--room-window)" stroke="var(--ink)" strokeWidth={2} />
            <path d="M 0 265 A 90 90 0 0 0 90 355" fill="none" stroke="var(--ink-3)" strokeWidth={2} strokeDasharray="6 6" />
          </svg>
        </div>
        <p className="row-title" style={{ marginTop: 10 }}>
          {file}
        </p>
        <p className="hint">AI-en fant 4 vegger, 1 vindu og 1 dør. Du kan sjekke og rette målene etterpå.</p>
      </ModalSheet>
    );
  }

  return (
    <ModalSheet title="Velg plantegning" onClose={onClose}>
      <p className="hint" style={{ marginBottom: 8 }}>
        Fra Filer eller kamerarullen (simulert).
      </p>
      {PLAN_FILES.map((f) => (
        <button
          key={f.name}
          className="row"
          onClick={() => {
            setFile(f.name);
            setReading(true);
          }}
        >
          <span className="thumb plan-thumb" aria-hidden>
            ▭
          </span>
          <span className="row-main">
            <span className="row-title">{f.name}</span>
            <br />
            <span className="row-meta">{f.meta}</span>
          </span>
          <span className="chev">›</span>
        </button>
      ))}
    </ModalSheet>
  );
}

/* ---------- Photos ---------- */

const ROOM_PHOTOS = ['Mot vinduet', 'Mot døren', 'Hjørnet ved sofaen', 'Gulvet', 'Taket', 'Langs veggen', 'Fra døråpningen', 'Detalj: vindu'];

/** A simulated photo library: mark several photos, then «Legg til (n)». */
export function PhotoPickerSheet({ initial, onDone, onClose }: { initial: string[]; onDone: (photos: string[]) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>(initial);
  const toggle = (p: string) => setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  return (
    <ModalSheet
      title="Bilder av rommet"
      onClose={onClose}
      footer={
        <button className="btn btn-primary" disabled={selected.length === 0} onClick={() => onDone(selected)}>
          {selected.length ? `Legg til (${selected.length})` : 'Velg bilder'}
        </button>
      }
    >
      <p className="hint" style={{ marginBottom: 10 }}>
        Velg noen bilder fra ulike vinkler (simulert kamerarull).
      </p>
      <div className="photo-grid">
        {ROOM_PHOTOS.map((p) => {
          const on = selected.includes(p);
          return (
            <button key={p} className={'photo-tile' + (on ? ' is-selected' : '')} aria-pressed={on} onClick={() => toggle(p)}>
              <span className="placeholder-img">{p}</span>
              {on && (
                <span className="pin-check" aria-hidden>
                  {selected.indexOf(p) + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </ModalSheet>
  );
}
