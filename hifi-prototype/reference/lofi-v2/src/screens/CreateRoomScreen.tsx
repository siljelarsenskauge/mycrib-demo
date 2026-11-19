import { useState } from 'react';
import { MeasureEditor, type RoomMeasures } from '../components/MeasureEditor';
import { PhotoPickerSheet, PlanUploadSheet, ScanRoomFlow } from '../components/RoomCapture';
import { Loading, navigate, TopBar } from '../components/ui';
import { uid } from '../state/seed';
import { useStore } from '../state/store';

type Source = 'scan' | 'plan' | 'photos';

/** Everything the user can give the AI. All optional; combine as many as you like. */
const SOURCES: { id: Source; icon: string; label: string; sub: string; action: string }[] = [
  { id: 'scan', icon: '⌖', label: 'Scan rommet', sub: 'Gå rundt i rommet med kameraet', action: 'Skann' },
  { id: 'plan', icon: '▭', label: 'Plantegning', sub: 'Bilde eller PDF', action: 'Last opp' },
  { id: 'photos', icon: '▦', label: 'Bilder av rommet', sub: 'Noen bilder fra ulike vinkler', action: 'Last opp' },
];

/** What the (simulated) AI reads out of a scan or a floor plan. */
const DETECTED: Record<'scan' | 'plan', RoomMeasures> = {
  scan: { width: 420, depth: 380, wallRight: 380, wallBottom: 420, height: 250, windowLength: 140, windowOffset: 150, windowHeight: 120, windowSill: 90, doorLength: 85, doorOffset: 270, doorHeight: 205, doorOpensOut: false, doorHinge: 'start', fixtures: [
    { id: 'sc_o1', kind: 'outlet', wall: 'back', offset: 40 },
    { id: 'sc_o2', kind: 'outlet', wall: 'front', offset: 300 },
    { id: 'sc_l1', kind: 'light', x: 210, y: 190 },
    { id: 'sc_r1', kind: 'radiator', wall: 'back', offset: 220 },
  ] },
  plan: { width: 430, depth: 375, wallRight: 375, wallBottom: 430, height: 240, windowLength: 140, windowOffset: 155, windowHeight: 120, windowSill: 85, doorLength: 90, doorOffset: 265, doorHeight: 210, doorOpensOut: false, doorHinge: 'start', fixtures: [] },
};
const MANUAL: RoomMeasures = { width: 400, depth: 350, wallRight: 350, wallBottom: 400, height: 240, windowLength: 120, windowOffset: 140, windowHeight: 120, windowSill: 90, doorLength: 85, doorOffset: 250, doorHeight: 205, doorOpensOut: false, doorHinge: 'start', fixtures: [] };

/**
 * Opprett rom: one page. The user can scan, upload a floor plan, add photos and type measurements –
 * any combination, no extra screens. Then «Lag rommet» → simulated "AI bygger rommodellen …".
 */
export function CreateRoomScreen() {
  const { update } = useStore();
  const [name, setName] = useState('');
  const [added, setAdded] = useState<Source[]>([]);
  const [measures, setMeasures] = useState<RoomMeasures | null>(null);
  const [measureSource, setMeasureSource] = useState('');
  const [edited, setEdited] = useState(false);
  const [building, setBuilding] = useState(false);
  // which capture flow is open: the scan camera, the floor-plan picker or the photo picker
  const [capturing, setCapturing] = useState<Source | null>(null);
  const [planFile, setPlanFile] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const canBuild = added.length > 0 || !!measures;

  const finish = (s: Source) => {
    setCapturing(null);
    setAdded((list) => (list.includes(s) ? list : [...list, s]));
    // a scan or floor plan gives measurements to check – unless the user has already corrected them
    if ((s === 'scan' || s === 'plan') && !edited) {
      setMeasures(DETECTED[s]);
      setMeasureSource(s === 'scan' ? 'Målene er hentet fra skanningen' : 'Målene er hentet fra plantegningen');
    }
  };
  const remove = (s: Source) => {
    setAdded((list) => list.filter((x) => x !== s));
    if (s === 'photos') setPhotos([]);
  };
  const doneText = (s: Source) =>
    s === 'scan' ? 'Rommet er skannet · 4 vegger, 1 vindu, 1 dør' : s === 'plan' ? planFile : `${photos.length} bilder lagt til`;

  // «Mål» counts as its own source once the user has typed or corrected measurements
  const used = [...SOURCES.filter((s) => added.includes(s.id)).map((s) => s.label), ...(edited ? ['Mål'] : [])];

  const build = () => {
    if (!canBuild) return;
    setBuilding(true);
    const id = uid('r');
    const m = measures ?? MANUAL;
    // the room model is still a rectangle, so it uses the longest of the opposite walls
    const w = Math.max(200, Math.min(1200, Math.max(m.width, m.wallBottom) || 400));
    const d = Math.max(200, Math.min(1200, Math.max(m.depth, m.wallRight) || 350));
    const winLen = Math.min(m.windowLength || 120, w - 20);
    const doorLen = Math.min(m.doorLength || 85, d - 20);
    const roomName = name.trim() || 'Nytt rom';
    window.setTimeout(() => {
      update((s) => {
        s.rooms.push({
          id,
          name: roomName,
          width: w,
          depth: d,
          height: m.height || 240,
          window: { wall: 'back', offset: Math.max(0, Math.min(w - winLen, m.windowOffset)), length: winLen, height: m.windowHeight, sill: m.windowSill },
          door: { wall: 'left', offset: Math.max(0, Math.min(d - doorLen, m.doorOffset)), length: doorLen, height: m.doorHeight, opensOut: m.doorOpensOut, hinge: m.doorHinge },
          fixtures: m.fixtures,
          furniture: [],
          instructions: '',
          photos: added.includes('photos') ? photos : [],
          moodboard: [],
          createdVia: used.join(' + '),
          lastOpenedAt: Date.now(),
          updatedAt: Date.now(),
        });
        s.snapshots.unshift({ id: uid('s'), roomId: id, createdAt: Date.now(), label: 'Opprinnelig rom', furniture: [] });
        s.activeChat[id] = null;
      });
      navigate(`/room/${id}`, true);
    }, 2300);
  };

  if (building) {
    return <Loading text="AI bygger rommodellen …" sub={`Bruker ${used.join(', ').toLowerCase()}`} />;
  }

  return (
    <div className="screen" style={{ position: 'relative' }}>
      <TopBar title="Nytt rom" back="/" />
      <div className="scroll">
        <div className="field">
          <label htmlFor="room-name">Navn på rommet</label>
          <input id="room-name" className="input" placeholder="F.eks. Hjemmekontor" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <h2 className="section-title">Hva vil du gi AI-en?</h2>
        <p className="hint" style={{ marginBottom: 10 }}>
          Legg til så mye du vil. Jo mer AI-en får, desto mer nøyaktig blir rommet.
        </p>

        <div className="source-list">
          {SOURCES.map((s) => {
            const isAdded = added.includes(s.id);
            return (
              <div key={s.id} className={'source-row' + (isAdded ? ' is-added' : '')}>
                <span className="source-icon" aria-hidden>
                  {isAdded ? '✓' : s.icon}
                </span>
                <span className="row-main">
                  <span className="row-title">{s.label}</span>
                  <br />
                  <span className="row-meta">{isAdded ? doneText(s.id) : s.sub}</span>
                  {s.id === 'photos' && isAdded && (
                    <span className="photo-strip" aria-hidden>
                      {photos.map((p) => (
                        <span key={p} className="placeholder-img" />
                      ))}
                    </span>
                  )}
                </span>
                {isAdded ? (
                  <span className="source-actions">
                    {/* photos can be changed; scan and plan can be done again */}
                    <button className="btn btn-ghost source-btn" onClick={() => setCapturing(s.id)}>
                      {s.id === 'photos' ? 'Endre' : 'Gjør på nytt'}
                    </button>
                    <button className="btn btn-ghost source-btn" onClick={() => remove(s.id)}>
                      Fjern
                    </button>
                  </span>
                ) : (
                  <button className="btn source-btn" onClick={() => setCapturing(s.id)}>
                    {s.action}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* check and correct the measurements before the room is built */}
        <h2 className="section-title">Mål</h2>
        {measures ? (
          <MeasureEditor
            value={measures}
            source={measureSource}
            onChange={(m) => {
              setMeasures(m);
              setEdited(true);
            }}
          />
        ) : (
          <div className="source-row">
            <span className="source-icon" aria-hidden>
              ↔
            </span>
            <span className="row-main">
              <span className="row-title">Sjekk målene</span>
              <br />
              <span className="row-meta">Vises her når rommet er skannet eller plantegningen er lastet opp</span>
            </span>
            <button
              className="btn btn-ghost source-btn"
              onClick={() => {
                setMeasures(MANUAL);
                setMeasureSource('Skriv inn målene på rommet ditt');
                setEdited(true);
              }}
            >
              Skriv inn selv
            </button>
          </div>
        )}
      </div>

      <div className="modal-foot" style={{ borderTop: '1px solid var(--line)' }}>
        <button className="btn btn-primary" onClick={build} disabled={!canBuild}>
          {canBuild ? 'Lag rommet' : 'Legg til minst én ting'}
        </button>
      </div>

      {capturing === 'scan' && <ScanRoomFlow onCancel={() => setCapturing(null)} onDone={() => finish('scan')} />}
      {capturing === 'plan' && (
        <PlanUploadSheet
          onClose={() => setCapturing(null)}
          onDone={(f) => {
            setPlanFile(f);
            finish('plan');
          }}
        />
      )}
      {capturing === 'photos' && (
        <PhotoPickerSheet
          initial={photos}
          onClose={() => setCapturing(null)}
          onDone={(p) => {
            setPhotos(p);
            finish('photos');
          }}
        />
      )}
    </div>
  );
}
