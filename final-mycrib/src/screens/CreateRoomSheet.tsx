// NOT IN USE since 24.10: Synne chose Silje's «Create room» (screens/CreateRoomScreen.tsx). This version (Figma 06K B with
// the AI instructions from 06M A) is kept so we can go back to it – Figma 06K and 06M show it.
// «Create room» as one tall sheet over the home screen (Figma 06K B, Synne 23.10): the room's name and four ways to add
// the room – Scan the room · Floor plan · Enter measurements · Room photos. One is enough. A way that has been added turns
// green, gets «Check» and moves up into its own list, «Added». The others are listed under «Add more» as ordinary rows –
// what is recommended comes first with a «Recommended» tag, what isn't needed says so in its text (Synne 23.10).
// A scan or a floor plan is checked first («Does this look right?»). «Create room» is ready when the room has a name and
// a shape or photos. Instructions for the AI are optional: a row under «Add more» opens its own sheet with a text field and
// suggestions; once saved, the row turns green under «Added» with «Edit» (Figma 06M A, Synne 23.10).
import { useEffect, useRef, useState } from 'react';
import { PlanPreview } from '../components/PlanThumb';
import { WayRow, type Way } from '../components/RoomSources';
import { Icon } from '../components/Icon';
import { BottomSheet, Button, Loading, navigate } from '../components/ui';
import { area, draft as rectDraft, featName, floorPlanRoom, m2, roomShape, scannedRoom, wallCount } from '../state/measure';
import { uid } from '../state/seed';
import { useStore } from '../state/store';
import type { Room } from '../state/types';
import { MeasureWizard, type Measurements } from './MeasureWizard';
import { RoomScanScreen } from './RoomScanScreen';

type Source = 'scan' | 'plan' | 'measure';

/** Data URL small enough for localStorage, large enough to fill the room view. */
function toPhoto(file: File, max = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
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

/** Quick suggestions in the instructions sheet; tapping one adds it to the text, tapping again takes it out. */
const SUGGESTIONS = ['I rent – no drilling', 'Keep the sofa', 'Kids live here', 'We have pets', 'Small budget', 'Calm and light'];

/** Add or remove one suggestion as its own sentence. */
function toggleSuggestion(text: string, s: string) {
  const parts = text.split(/\.\s*/).map((p) => p.trim()).filter(Boolean);
  const next = parts.includes(s) ? parts.filter((p) => p !== s) : [...parts, s];
  return next.length ? next.join('. ') + '.' : '';
}

/** «1 door · 1 window · 1 radiator · ceiling 250 cm» */
function details(md: Measurements) {
  const doors = md.opens.filter((o) => o.type === 'door').length;
  const wins = md.opens.length - doors;
  const feats: Record<string, number> = {};
  for (const f of md.feats) feats[featName(f).toLowerCase()] = (feats[featName(f).toLowerCase()] ?? 0) + 1;
  const n = (k: number, word: string) => `${k} ${word}${k > 1 ? 's' : ''}`;
  return [doors && n(doors, 'door'), wins && n(wins, 'window'), ...Object.entries(feats).map(([w, k]) => n(k, w)), md.ceil ? `ceiling ${md.ceil} cm` : 'ceiling height not set']
    .filter(Boolean)
    .join(' · ');
}

export function CreateRoomSheet({ onClose }: { onClose: () => void }) {
  const { update, showToast } = useStore();
  const [name, setName] = useState('');
  const [md, setMd] = useState<Measurements | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [edited, setEdited] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  // the instructions sheet: null when closed, otherwise the text being written
  const [instrDraft, setInstrDraft] = useState<string | null>(null);
  // a scan or floor plan waiting for «Looks right»
  const [pending, setPending] = useState<{ md: Measurements; source: Source; edited: boolean } | null>(null);
  const [flow, setFlow] = useState<null | 'scan' | 'reading' | 'enter' | 'edit'>(null);
  // after a scan: look around in the 3D scan, or see the floor plan made from it (Synne 23.10)
  const [checkView, setCheckView] = useState<'3d' | 'plan'>('3d');
  const photosRef = useRef<HTMLInputElement>(null);
  const planRef = useRef<HTMLInputElement>(null);

  // the floor plan is «read» by the AI
  useEffect(() => {
    if (flow !== 'reading') return;
    const t = window.setTimeout(() => {
      setPending({ md: floorPlanRoom(), source: 'plan', edited: false });
      setFlow(null);
    }, 1600);
    return () => window.clearTimeout(t);
  }, [flow]);

  const title = name.trim();
  const ready = !!title && (!!md || photos.length > 0);

  const create = () => {
    const id = uid('r');
    const shape = md ? roomShape(md) : null;
    const room: Room = {
      id,
      name: title,
      // a room from photos only has no shape yet; the size is a placeholder until it is scanned
      ...(shape ?? {
        width: 400,
        depth: 400,
        window: { wall: 'back', offset: 140, length: 120 },
        door: { wall: 'left', offset: 290, length: 85 },
      }),
      unmeasured: shape ? undefined : true,
      image: photos[0],
      measuresEdited: edited && source !== 'measure' ? true : undefined,
      furniture: [],
      instructions: instructions.trim(),
      photos,
      moodboard: [],
      scannedAt: source === 'scan' ? Date.now() : undefined,
      floorPlan: source === 'plan' ? { name: 'Floor plan', at: Date.now() } : undefined,
      createdVia: [source, photos.length && 'photos'].filter(Boolean).join(', '),
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
    };
    update((d) => {
      d.rooms.push(room);
      d.activeChat[id] = null;
    });
    navigate(`/room/${id}`);
    showToast(`${title} is ready`);
  };

  const overlays = (
    <>
      <input
        ref={photosRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          const add = (await Promise.all(files.map((f) => toPhoto(f).catch(() => '')))).filter(Boolean);
          if (add.length) setPhotos((p) => [...p, ...add]);
        }}
      />
      <input
        ref={planRef}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) setFlow('reading');
        }}
      />
      {flow === 'scan' && (
        <RoomScanScreen
          roomName={title}
          onClose={() => setFlow(null)}
          onDone={() => {
            setPending({ md: scannedRoom(), source: 'scan', edited: false });
            setFlow(null);
          }}
        />
      )}
      {(flow === 'enter' || flow === 'edit') && (
        <MeasureWizard
          key={flow}
          initial={(flow === 'edit' ? pending?.md : md) ?? rectDraft()}
          startStep={1}
          onClose={() => setFlow(null)}
          onSave={(next) => {
            if (flow === 'edit' && pending) {
              setPending({ ...pending, md: next, edited: pending.edited || JSON.stringify(next) !== JSON.stringify(pending.md) });
            } else {
              // drawn by the user: no need to ask whether it looks right
              setMd(next);
              setSource('measure');
              setEdited(false);
            }
            setFlow(null);
          }}
        />
      )}
    </>
  );

  // «Does this look right?» – in the same sheet
  if (pending) {
    return (
      <>
        <BottomSheet
          tall
          closeRight
          title="Create room"
          onClose={() => setPending(null)}
          footer={
            <>
              <Button
                block
                onClick={() => {
                  setMd(pending.md);
                  setSource(pending.source);
                  setEdited(pending.edited);
                  setPending(null);
                }}
              >
                Looks right
              </Button>
              <Button variant="text" block onClick={() => setFlow('edit')}>
                Edit measurements
              </Button>
              {pending.source === 'scan' && (
                <Button variant="text" block onClick={() => { setPending(null); setFlow('scan'); }}>
                  Scan again
                </Button>
              )}
            </>
          }
        >
          <h3 className="cr-title">Does this look right?</h3>
          <h4 className="group-heading cr-group">{pending.edited ? 'Edited by you' : pending.source === 'plan' ? 'Measurements from your floor plan' : 'Measurements from your scan'}</h4>
          {pending.source === 'scan' && (
            <div className="mf-seg cr-check-toggle" role="group" aria-label="Show">
              <button aria-pressed={checkView === '3d'} onClick={() => setCheckView('3d')}>
                3D scan
              </button>
              <button aria-pressed={checkView === 'plan'} onClick={() => setCheckView('plan')}>
                Floor plan
              </button>
            </div>
          )}
          {pending.source === 'scan' && checkView === '3d' ? (
            <div className="cr-scan-3d">
              <iframe className="cr-scan-frame" src="/furnie/3d/index.html?embed=1" aria-label="Your room in 3D. Drag to look around, pinch to move closer." />
            </div>
          ) : (
            <PlanPreview md={pending.md} />
          )}
          <div className="cr-summary">
            <strong>
              {wallCount(pending.md)} walls · {m2(area(pending.md))} m²
            </strong>
            <span>{details(pending.md)}</span>
          </div>
        </BottomSheet>
        {overlays}
      </>
    );
  }

  // ---- the four ways, in the order 06K B shows them ----
  const summary = md ? `${wallCount(md)} walls · ${m2(area(md))} m²${edited ? ' · edited by you' : ''}` : '';
  const check = () => md && source && (source === 'measure' ? setFlow('enter') : setPending({ md, source, edited }));
  const scan: Way = { icon: 'scan_camera', title: 'Scan the room', meta: '3D, measurements and photos · about 1 min', onClick: () => setFlow('scan') };
  const plan: Way = { icon: 'floor_plan', title: 'Floor plan', meta: 'Upload a drawing – the AI reads the walls', onClick: () => planRef.current?.click() };
  const enter: Way = { icon: 'straighten', title: 'Enter measurements', meta: 'Type the lengths yourself', onClick: () => setFlow('enter') };
  const pics: Way = { icon: 'image', title: 'Room photos', meta: 'Quickest way to start – measure later', onClick: () => photosRef.current?.click() };
  const photosAdded: Way = { ...pics, title: `${photos.length} photo${photos.length === 1 ? '' : 's'} added`, meta: 'The AI makes a 360° view if they overlap', state: 'added', action: 'Add' };
  // «Added» on top, then «Add more» with what is recommended first (Synne 23.10)
  let added: Way[] = [];
  let more: Way[];
  if (source === 'scan') {
    added = [{ ...scan, title: 'Scanned', meta: summary, state: 'added', onClick: check }, ...(photos.length ? [photosAdded] : [])];
    more = [
      ...(photos.length ? [] : [{ ...pics, meta: 'Not needed – your scan shows the room' }]),
      { ...plan, meta: 'Not needed – your scan has the walls' },
      { ...enter, meta: 'Not needed – check the scan instead' },
    ];
  } else if (source === 'plan' || source === 'measure') {
    added = [
      source === 'plan' ? { ...plan, title: 'Floor plan added', meta: summary, state: 'added', onClick: check } : { ...enter, title: 'Measurements added', meta: summary, state: 'added', onClick: check },
      ...(photos.length ? [photosAdded] : []),
    ];
    more = [
      ...(photos.length ? [] : [{ ...pics, meta: 'So the AI knows how the room looks', state: 'recommended' as const }]),
      { ...scan, meta: 'Optional – adds a 3D model' },
      source === 'plan' ? { ...enter, meta: 'Not needed – check the floor plan instead' } : { ...plan, meta: 'Not needed – you have the measurements' },
    ];
  } else if (photos.length) {
    added = [photosAdded];
    more = [{ ...scan, meta: 'Optional – for 3D and to check what fits' }, { ...plan, meta: 'Optional' }, { ...enter, meta: 'Optional' }];
  } else {
    more = [{ ...scan, state: 'recommended' }, plan, enter, pics];
  }
  // instructions for the AI: last under «Add more» once the room has been added, green under «Added» when written
  const hasWay = added.length > 0;
  const instr: Way = { icon: 'wand_shine', title: 'Instructions for the AI', meta: 'Optional – what to keep, avoid or think about', onClick: () => setInstrDraft(instructions) };
  if (instructions) added.push({ ...instr, meta: `“${instructions}”`, state: 'added', action: 'Edit' });
  else if (hasWay) more.push(instr);

  return (
    <>
      <BottomSheet
        tall
        closeRight
        title="Create room"
        onClose={onClose}
        footer={
          <Button block disabled={!ready} onClick={create}>
            Create room
          </Button>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="room-name">
            Room name
          </label>
          <input id="room-name" className="input" placeholder="E.g. Living room" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {added.length > 0 && (
          <>
            <h3 className="group-heading cr-group">Added</h3>
            <div className="cr-ways">{added.map((w) => <WayRow key={w.icon} {...w} />)}</div>
          </>
        )}
        <h3 className="group-heading cr-group">{hasWay ? 'Add more (optional)' : 'Add the room · one is enough'}</h3>
        <div className="cr-ways">{more.map((w) => <WayRow key={w.icon} {...w} />)}</div>
        {!ready && <p className="cr-hint">Add a name and one of the four to create the room.</p>}
      </BottomSheet>
      {overlays}
      {instrDraft !== null && (
        <BottomSheet
          title="Instructions for the AI"
          onClose={() => setInstrDraft(null)}
          onConfirm={() => {
            setInstructions(instrDraft.trim());
            setInstrDraft(null);
          }}
          confirmLabel="Save instructions"
        >
          <div className="cr-instr">
            <p className="cr-instr-intro">What should the AI keep in mind when it suggests changes? You can change this later in Room settings.</p>
            <div className="field">
              <label className="field-label" htmlFor="cr-instructions">
                What should the AI know about this room?
              </label>
              <textarea
                id="cr-instructions"
                className="input textarea"
                rows={3}
                placeholder="E.g. I rent – no drilling. Keep the sofa."
                value={instrDraft}
                onChange={(e) => setInstrDraft(e.target.value)}
              />
            </div>
            <h3 className="group-heading">Suggestions</h3>
            <div className="chips">
              {SUGGESTIONS.map((s) => {
                const on = instrDraft.split(/\.\s*/).map((p) => p.trim()).includes(s);
                return (
                  <button key={s} type="button" className="chip" aria-pressed={on} onClick={() => setInstrDraft(toggleSuggestion(instrDraft, s))}>
                    <Icon name={on ? 'check' : 'add'} size={16} />
                    {s}
                  </button>
                );
              })}
            </div>
            {instructions && (
              <button
                className="mf-remove"
                onClick={() => {
                  setInstructions('');
                  setInstrDraft(null);
                }}
              >
                <Icon name="delete" size={20} />
                Remove instructions
              </button>
            )}
          </div>
        </BottomSheet>
      )}
      {flow === 'reading' && (
        <div className="scrim">
          <section className="sheet">
            <div className="sheet-body">
              <Loading text="AI is reading the floor plan …" />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
