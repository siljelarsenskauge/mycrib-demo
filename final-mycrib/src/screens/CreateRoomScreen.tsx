// NOT IN USE since 27.10: Synne chose «Create room» as a sheet (screens/NewRoomFlow.tsx, Figma 06R). RoomNameField is still used
// from here. Silje's version (24.10, Figma 06N) is kept so we can go back to it.
// «New room», step by step (Synne 19.10 chose Figma 06D, «like Vipps / BankID»): one question per screen and one black
// button at the bottom; the other ways are quiet links under it.
// Step 1 is the name and the four ways on one page: each way card goes straight to its method (Synne 23.10).
// The name suggestions open as a list under the field, filtered while typing (Synne 23.10).
// 1 Name + way (scan, floor plan, own measurements or photos) → 2 Does this look right? → 3 Photos (optional) → Ready.
// The cover photo is picked next to the name, as in Room settings (Synne 26.10); without one, the first photo is used.
// «Add more» and instructions for the AI live in Room settings.
import { forwardRef, useRef, useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { PlanPreview } from '../components/PlanThumb';
import { MethodCard, PhotoSlots } from '../components/RoomSources';
import { Button, IconButton, ListRow, Loading, navigate } from '../components/ui';
import { area, featName, floorPlanRoom, m2, scannedRoom, toRoomSize, draft as rectDraft, wallCount } from '../state/measure';
import { uid } from '../state/seed';
import { useStore } from '../state/store';
import type { Room } from '../state/types';
import { MeasureWizard, type Measurements } from './MeasureWizard';
import { RoomScanScreen } from './RoomScanScreen';

const SUGGESTIONS = ['Living room', 'Bedroom', 'Kitchen', 'Home office', 'Kids’ room', 'Hallway'];

/** «?» next to «Create your room» opens a card under the title: what each way does and which views it gives (Synne 23.10). */
const METHOD_HELP: { icon: IconName; title: string; text: string }[] = [
  { icon: 'scan_camera', title: 'Scan room', text: 'Walk around the room with your phone. The AI finds the walls, doors, windows and ceiling height. Most accurate — gives 2D, 3D and a panorama.' },
  { icon: 'floor_plan', title: 'Upload floor plan', text: 'A photo or PDF of the floor plan. The AI reads the walls, and you add the ceiling height. Gives 2D and 3D.' },
  { icon: 'straighten', title: 'Enter measurements', text: 'Draw the room and type in the wall lengths yourself. Gives 2D and 3D.' },
  { icon: 'image', title: 'Upload photos', text: 'Photos of the room help the AI with colours, materials and style. Gives a panorama.' },
];

type Step = 'name' | 'check' | 'photos' | 'ready';
const STEP_NO: Record<Step, number> = { name: 1, check: 2, photos: 3, ready: 3 };
const STEPS = 3;
type Source = 'scan' | 'plan' | 'measure';

/** The room name with suggestions in a list under the field: open on a tap, filtered while typing,
 *  closed when one is picked or the field loses focus. The user can also type their own name. */
export const RoomNameField = forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; error?: string }>(function RoomNameField({ value, onChange, error }, ref) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const q = value.trim().toLowerCase();
  const matches = SUGGESTIONS.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q);
  const shown = open && matches.length > 0;
  const pick = (s: string) => {
    onChange(s);
    setOpen(false);
    setActive(-1);
  };
  return (
    <div className="field">
      <label className="field-label" htmlFor="room-name">
        Room name
      </label>
      <div className="menu-anchor">
        <input
          id="room-name"
          ref={ref}
          className="input"
          placeholder="Enter room name..."
          autoComplete="off"
          role="combobox"
          aria-expanded={shown}
          aria-controls="room-name-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={shown && active >= 0 ? `room-name-option-${active}` : undefined}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'room-name-error' : undefined}
          // opens on a tap (not on focus), so «Give the room a name first.» is not covered when the app focuses the field
          onPointerDown={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            else if (e.key === 'ArrowDown' && matches.length) {
              e.preventDefault();
              setOpen(true);
              setActive((i) => (i + 1) % matches.length);
            } else if (e.key === 'ArrowUp' && matches.length) {
              e.preventDefault();
              setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
            } else if (e.key === 'Enter') {
              if (shown && active >= 0) pick(matches[active]);
              else setOpen(false);
            }
          }}
        />
        {shown && (
          <div id="room-name-suggestions" className="dropdown glass cr-name-list" role="listbox" aria-label="Suggestions">
            {matches.map((s, i) => (
              <div
                key={s}
                id={`room-name-option-${i}`}
                role="option"
                aria-selected={i === active}
                className={'menu-item' + (i === active ? ' is-active' : '')}
                // mousedown, so the field does not lose focus (and close the list) before the pick
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
              >
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

/** Small data URL so the photo can be stored in localStorage. */
function toThumb(file: File, max = 480): Promise<string> {
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

export function CreateRoomScreen() {
  const { update } = useStore();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [md, setMd] = useState<Measurements | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [edited, setEdited] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [cover, setCover] = useState<string | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [flow, setFlow] = useState<null | 'scan' | 'reading' | 'enter' | 'edit'>(null);
  const planRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [nameMissing, setNameMissing] = useState(false);
  const [help, setHelp] = useState(false);

  const title = name.trim();
  const close = () => navigate('/');
  const back = () => {
    if (step === 'name') close();
    else if (step === 'check') setStep('name');
    else if (step === 'photos') setStep(source === 'measure' || !md ? 'name' : 'check');
  };

  const create = () => {
    const m = md ?? rectDraft();
    const id = uid('r');
    const size = toRoomSize(m);
    const W = Math.max(150, Math.min(1500, size.width));
    const D = Math.max(150, Math.min(1500, size.depth));
    const winLen = Math.min(size.window?.length ?? 120, W - 20);
    const doorLen = Math.min(size.door?.length ?? 85, D - 20);
    const room: Room = {
      id,
      name: title,
      // the cover photo picked next to the name; otherwise the first photo
      image: cover ?? photos[0],
      width: W,
      depth: D,
      height: size.height,
      window: { wall: 'back', offset: Math.round(Math.max(0, Math.min(W - winLen, size.window ? size.window.center - winLen / 2 : W / 2 - winLen / 2))), length: winLen },
      door: { wall: 'left', offset: Math.round(Math.max(0, Math.min(D - doorLen, size.door ? size.door.center - doorLen / 2 : D - doorLen - 25))), length: doorLen },
      // a room from photos only has no measurements yet: the size is a placeholder, and the AI says it can’t measure
      // from a photo (Synne 19.10, kept when Silje’s version was taken in 24.10)
      plan: md ?? undefined,
      unmeasured: md ? undefined : true,
      measuresEdited: edited && source !== 'measure' ? true : undefined,
      furniture: [],
      instructions: '',
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
    setRoomId(id);
    setStep('ready');
  };

  const steps = (
    <div className="cr-steps" aria-label={`Step ${STEP_NO[step]} of ${STEPS}`}>
      {Array.from({ length: STEPS }, (_, i) => i + 1).map((n) => (
        <span key={n} className={n <= STEP_NO[step] ? 'is-done' : undefined} />
      ))}
    </div>
  );

  let body: React.ReactNode = null;
  let foot: React.ReactNode = null;

  if (step === 'name') {
    // the room needs a name before a way is started; the name is kept when the user comes back
    const start = (open: () => void) => () => {
      if (title) return open();
      setNameMissing(true);
      nameRef.current?.focus();
    };
    body = (
      <>
        <div className="cr-title-spaced">
          <div className="cr-title-row">
            <h1 className="cr-title">Create your room</h1>
            <IconButton
              icon="help"
              label="How the methods work"
              iconSize={26}
              className="cr-help"
              aria-expanded={help}
              aria-controls="cr-help-card"
              onClick={() => setHelp((h) => !h)}
            />
          </div>
          {/* in the page, not on top: it pushes the name field and the ways down as it opens */}
          <div className={'cr-help-wrap' + (help ? ' is-open' : '')}>
            <div className="cr-help-clip">
              <section id="cr-help-card" className="cr-help-card" aria-label="Ways to create a room" aria-hidden={!help}>
                <h2 className="cr-help-title">Ways to create a room</h2>
                <p className="cr-help-intro">Start with one method. You can add photos next, and the other methods later in Room settings.</p>
                {METHOD_HELP.map((m, i) => (
                  <ListRow key={m.title} leading={<Icon name={m.icon} size={22} />} title={m.title} meta={m.text} divider={i < METHOD_HELP.length - 1} />
                ))}
              </section>
            </div>
          </div>
        </div>
        <div className="name-row">
          <RoomNameField ref={nameRef} value={name} onChange={setName} error={nameMissing && !title ? 'Give the room a name first.' : undefined} />
          <button className={'cover-button' + (cover ? ' has-photo' : '')} onClick={() => coverRef.current?.click()} aria-label={cover ? 'Change the cover photo' : 'Add a cover photo'}>
            {cover ? <img src={cover} alt="" /> : <Icon name="image" size={22} />}
          </button>
        </div>
        {/* under the row, so the cover photo stays level with the field */}
        {nameMissing && !title && (
          <p id="room-name-error" className="group-footer is-error cr-error" role="alert">
            Give the room a name first.
          </p>
        )}
        <h2 className="group-heading cr-ways-heading">Choose a method to create your room</h2>
        <div className="way-list">
          <MethodCard icon="scan_camera" title="Scan room" note="Most accurate" onClick={start(() => setFlow('scan'))} />
          <MethodCard icon="floor_plan" title="Upload floor plan" onClick={start(() => planRef.current?.click())} />
          <MethodCard icon="straighten" title="Enter measurements" onClick={start(() => setFlow('enter'))} />
          <MethodCard icon="image" title="Upload photos" onClick={start(() => photosRef.current?.click())} />
        </div>
      </>
    );
  } else if (step === 'check' && md) {
    body = (
      <>
        <h1 className="cr-title">Does this look right?</h1>
        <p className="cr-sub">
          {edited ? 'Edited by you. ' : source === 'plan' ? 'Read from your floor plan – add the ceiling height. ' : 'From your scan. '}
          {!(source === 'plan' && !edited) && 'You can change it later in Room settings.'}
        </p>
        <PlanPreview md={md} />
        <div className="cr-summary">
          <strong>
            {wallCount(md)} walls · {m2(area(md))} m²
          </strong>
          <span>{details(md)}</span>
        </div>
      </>
    );
    foot = (
      <>
        <Button block onClick={() => setStep('photos')}>
          Looks right
        </Button>
        <Button variant="text" block onClick={() => setFlow('edit')}>
          Edit measurements
        </Button>
      </>
    );
  } else if (step === 'photos') {
    body = (
      <>
        <h1 className="cr-title">Add photos of the room?</h1>
        <p className="cr-sub">Optional. They help the AI with colours, materials and style.</p>
        <PhotoSlots photos={photos} onAdd={() => photosRef.current?.click()} onRemove={(i) => setPhotos((list) => list.filter((_, k) => k !== i))} />
      </>
    );
    // started with photos only: the measurements can still be added (the ways can be combined)
    const addWay = !md && (
      <Button variant="text" block onClick={() => setStep('name')}>
        Add measurements too
      </Button>
    );
    foot = photos.length ? (
      <>
        <Button block onClick={create}>
          Continue
        </Button>
        {addWay}
      </>
    ) : (
      <>
        <Button block icon="image" onClick={() => photosRef.current?.click()}>
          Add photos
        </Button>
        <Button variant="text" block onClick={create}>
          Not now
        </Button>
      </>
    );
  }

  if (step === 'ready')
    return (
      <div className="screen cr cr-ready">
        <div className="cr-ready-body">
          <span className="cr-ready-check" aria-hidden>
            <Icon name="check" size={44} />
          </span>
          <h1 className="cr-title">{title} is ready</h1>
          <p className="cr-sub">Ask the AI anything about the room – or add your first piece of furniture.</p>
        </div>
        <footer className="cr-foot">
          <Button block onClick={() => roomId && navigate(`/room/${roomId}`, true)}>
            Open the room
          </Button>
        </footer>
      </div>
    );

  return (
    <div className="screen cr">
      <header className="cr-head">
        <IconButton icon="chevron_left" label="Back" onClick={back} />
        {steps}
        <IconButton icon="close" label="Cancel – don’t create the room" onClick={close} />
      </header>
      <div className="screen-scroll cr-body">{body}</div>
      {foot && <footer className="cr-foot">{foot}</footer>}

      <input
        ref={coverRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) setCover((await toThumb(f).catch(() => null)) ?? cover);
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
          if (!f) return;
          setFlow('reading');
          window.setTimeout(() => {
            setMd(floorPlanRoom());
            setSource('plan');
            setEdited(false);
            setFlow(null);
            setStep('check');
          }, 1600);
        }}
      />
      <input
        ref={photosRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          const thumbs = await Promise.all(files.map((f) => toThumb(f).catch(() => '')));
          setPhotos((p) => [...p, ...thumbs.filter(Boolean)]);
          // «Upload photos» on the first page: go on to the photos step to see them
          if (step === 'name' && thumbs.some(Boolean)) setStep('photos');
        }}
      />

      {flow === 'scan' && (
        <RoomScanScreen
          roomName={title}
          onClose={() => setFlow(null)}
          onDone={() => {
            setMd(scannedRoom());
            setSource('scan');
            setEdited(false);
            setFlow(null);
            setStep('check');
          }}
        />
      )}
      {(flow === 'enter' || flow === 'edit') && (
        <MeasureWizard
          key={flow}
          initial={flow === 'edit' && md ? md : rectDraft()}
          // «Edit measurements» starts at step 1 too, with the scanned / read values filled in (Synne 19.10)
          startStep={1}
          onClose={() => setFlow(null)}
          onSave={(next) => {
            if (flow === 'enter') {
              // drawn by the user: no need to ask whether it looks right
              setMd(next);
              setSource('measure');
              setEdited(true);
              setFlow(null);
              setStep('photos');
              return;
            }
            if (JSON.stringify(next) !== JSON.stringify(md)) setEdited(true);
            setMd(next);
            setFlow(null);
          }}
        />
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
    </div>
  );
}
