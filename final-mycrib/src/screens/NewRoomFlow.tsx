// «Create room» as a sheet over the screen you came from (Synne 27.10, Figma 06R – her own frames, with her comments).
// 1 Choose method (half sheet, X) → the method → 2 Check your room (scan / floor plan) → 3 Add photos? or Add measurements?
// → 4 Room details: name (required), instructions for the AI (optional, «i» explains), interior style (optional) → Create room.
// Every step after the first has a back arrow instead of X. «Create room» is only active when the room has a name.
import { editBoards } from '../state/inspo';
import { STAND } from '../stand';
import { stitchPhotos } from '../state/stitch';
import { useEffect, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { PlanPreview } from '../components/PlanThumb';
import { PhotoPicker, usePhotoSource } from '../components/PhotoPicker';
import { FakeFiles, FakePhotoLibrary, photoPos } from '../components/FakePickers';
import { BottomSheet, Button, IconButton, Loading, navigate, SegmentedTabs } from '../components/ui';
import { area, draft as rectDraft, floorPlanRoom, m2, scannedRoom, toRoomSize, wallCount } from '../state/measure';
import { createSeed, uid } from '../state/seed';
import { useStore } from '../state/store';
import type { Furniture, Room } from '../state/types';
import { MeasureWizard, type Measurements } from './MeasureWizard';
import { StyleChips } from '../components/StyleChips';
import { ChallengeSwitch, MoodboardRow, MoodboardSheet, NatureColours, syncNatureBoard, userBoards } from '../components/RoomExtras';
import { RoomScanScreen } from './RoomScanScreen';

type Step = 'choose' | 'check' | 'photos' | 'measure' | 'details' | 'boards';
type Source = 'scan' | 'plan' | 'measure';
type Method = Source | 'photos';

/** why photos are worth adding – one line, kept minimal (Synne 29.10) */
export const ROOM_PHOTO_MAX = 1;
const PHOTOS_WHY = 'Photos show the AI your colours, materials and light, so its suggestions match the room.';

const METHODS: { id: Method; icon: IconName; title: string }[] = [
  { id: 'scan', icon: 'scan_room', title: 'Scan room' },
  { id: 'plan', icon: 'floor_plan', title: 'Upload floor plan' },
  { id: 'measure', icon: 'straighten', title: 'Enter measurements' },
  { id: 'photos', icon: 'image', title: 'Add photos' },
];

/** The room as it will be saved – also used for the cover preview on «Room details». */
/** «Explore colours from nature» in Create room (off since Synne 18.11; it is in Room settings) */
const SHOW_NATURE_IN_CREATE = false;
/** a pulsing ring round the next view tab in «Check your room» (off since Synne 19.11) */
const SHOW_TAB_GLOW = false;

/** the scan is of the living room (Synne 19.11: the floor plan was empty): the scanned room gets the living room's
 *  furniture from the start, moved inside the walls if the measured room is smaller */
function scannedFurniture(W: number, D: number): Furniture[] {
  const living = createSeed().rooms.find((r) => r.id === 'r_living')?.furniture ?? [];
  return living
    .map((f) => {
      const w = f.rot === 90 ? f.depth : f.width;
      const d = f.rot === 90 ? f.width : f.depth;
      return { ...f, id: uid('f'), x: Math.max(0, Math.min(W - w, f.x)), y: Math.max(0, Math.min(D - d, f.y)), _w: w, _d: d };
    })
    .filter((f) => f._w <= W && f._d <= D)
    .map(({ _w, _d, ...f }) => f);
}

function buildRoom(o: { id: string; name: string; md: Measurements | null; source: Source | null; edited: boolean; photos: string[]; cover: string | null; instructions: string; styles: string[]; challenge: boolean; natures: string[] }): Room {
  const m = o.md ?? rectDraft();
  const size = toRoomSize(m);
  const W = Math.max(150, Math.min(1500, size.width));
  const D = Math.max(150, Math.min(1500, size.depth));
  const winLen = Math.min(size.window?.length ?? 120, W - 20);
  const doorLen = Math.min(size.door?.length ?? 85, D - 20);
  return {
    id: o.id,
    name: o.name,
    // the scan is of the living room, so its photo is the cover until the user picks another (Synne 14.11)
    image: o.cover ?? (o.source === 'scan' ? '/rooms/my_living.jpg' : o.photos[0]),
    width: W,
    depth: D,
    height: size.height,
    window: { wall: 'back', offset: Math.round(Math.max(0, Math.min(W - winLen, size.window ? size.window.center - winLen / 2 : W / 2 - winLen / 2))), length: winLen },
    door: { wall: 'left', offset: Math.round(Math.max(0, Math.min(D - doorLen, size.door ? size.door.center - doorLen / 2 : D - doorLen - 25))), length: doorLen },
    // a room from photos only has no measurements yet: the AI says it can’t measure from a photo (Synne 19.10)
    plan: o.md ?? undefined,
    unmeasured: o.md ? undefined : true,
    measuresEdited: o.edited && o.source !== 'measure' ? true : undefined,
    furniture: o.source === 'scan' ? scannedFurniture(W, D) : [],
    // where a coffee table goes, as in the living room the scan is of (Synne 19.11: the tasks happen in this room)
    coffeeSpot: o.source === 'scan' ? createSeed().rooms.find((r) => r.id === 'r_living')?.coffeeSpot : undefined,
    instructions: o.instructions.trim(),
    styles: o.styles.length ? o.styles : undefined,
    challenge: o.challenge || undefined,
    natures: o.natures.length ? o.natures : undefined,
    photos: o.photos,
    moodboard: [],
    scannedAt: o.source === 'scan' ? Date.now() : undefined,
    floorPlan: o.source === 'plan' ? { name: 'Floor plan', at: Date.now() } : undefined,
    createdVia: [o.source, o.photos.length && 'photos'].filter(Boolean).join(', '),
    updatedAt: Date.now(),
    lastOpenedAt: Date.now(),
  };
}

/** `start`: the method was already picked, in the menu from the + on Home */
// the «Choose method» sheet with four tiles (27.10) – replaced by the pop-up menu everywhere (Synne 14.11); kept behind a flag
const SHOW_CHOOSE_SHEET = false;

export function NewRoomFlow({ onClose, start: startWith }: { onClose: () => void; start?: Method }) {
  const { state, update, showToast } = useStore();
  // moodboards connected to the new room, picked in their own sheet (Synne 14.11); the draft is what is ticked in the sheet
  const [boardIds, setBoardIds] = useState<string[]>([]);
  const [boardDraft, setBoardDraft] = useState<string[]>([]);
  const myBoards = userBoards(state);
  const [more, setMore] = useState(false);
  const [step, setStep] = useState<Step>(startWith === 'photos' ? 'photos' : 'choose');
  // several colours can be picked (Synne 14.11)
  const [natures, setNatures] = useState<string[]>([]);
  const [challenge, setChallenge] = useState(false);
  const [history, setHistory] = useState<Step[]>([]);
  const [md, setMd] = useState<Measurements | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [edited, setEdited] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [stitching, setStitching] = useState(false);
  const [cover, setCover] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [styles, setStyles] = useState<string[]>([]);
  const [info, setInfo] = useState(false);
  const [view, setView] = useState<'360' | '3d' | 'plan'>('360');
  // the stand (Synne 19.11): the visitor tries all three views of the scan – 360° (drag around), 3D and the floor plan.
  // A view counts as seen after a few seconds; the next one glows, and «Looks right» glows once all three are seen
  const VIEWS = ['360', '3d', 'plan'] as const;
  const [seenViews, setSeenViews] = useState<string[]>([]);
  useEffect(() => {
    if (!STAND || step !== 'check' || source !== 'scan' || seenViews.includes(view)) return;
    const t = window.setTimeout(() => setSeenViews((v) => (v.includes(view) ? v : [...v, view])), 2500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, step, source]);
  const nextView = STAND ? VIEWS.find((v) => v !== view && !seenViews.includes(v)) : undefined;
  const allSeen = STAND && VIEWS.every((v) => seenViews.includes(v) || v === view) && seenViews.length >= 2;
  // the ring around the next tab (19.11) is off: 3D and the floor plan are tried in the room itself (Synne 19.11)
  const tabLabel = (id: string, text: string) => (SHOW_TAB_GLOW && nextView === id && seenViews.includes(view) ? <span className="stand-tab-next">{text}</span> : text);
  const [flow, setFlow] = useState<null | 'scan' | 'reading' | 'enter' | 'edit' | 'files' | 'cover'>(startWith === 'scan' ? 'scan' : startWith === 'plan' ? 'files' : startWith === 'measure' ? 'enter' : null);
  const [draftId] = useState(() => uid('r'));
  // «Add photos» opens the camera / camera-roll menu over the box; the photos step then shows what was added (Synne 29.10)
  // a room has one photo for now (Synne 14.11); picking another replaces it. (Several photos stitched into one view:
  // state/stitch.ts, only used if ROOM_PHOTO_MAX goes above 1.)
  const photoSource = usePhotoSource((t) => {
    setPhotos((p) => [...p, ...t].slice(-ROOM_PHOTO_MAX));
    if (step !== 'photos') go('photos');
  }, ROOM_PHOTO_MAX);

  // one pattern for choosing a method (Synne 14.11): the method is picked in the pop-up menu, the steps are sheets.
  // So «Choose method» never shows when the flow was started from the menu – leaving a step (X in the scan, the file
  // picker …) or going back past the first step closes the whole flow instead of landing on a sheet you never saw.
  const fromMenu = !!startWith && SHOW_CHOOSE_SHEET === false;
  useEffect(() => {
    if (fromMenu && step === 'choose' && !flow) onClose();
  }, [fromMenu, step, flow]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (next: Step) => {
    setHistory((h) => [...h, step]);
    setStep(next);
  };
  const back = () => {
    const prev = history[history.length - 1];
    if (!prev) return onClose();
    setHistory((h) => h.slice(0, -1));
    setStep(prev);
  };
  // after the measurements are in: photos are offered, unless there already are some (or the scan has them)
  const afterMeasures = (src: Source) => go(src === 'scan' || photos.length ? 'details' : 'photos');

  const start = (m: Method, el?: HTMLElement) => {
    if (m === 'scan') setFlow('scan');
    else if (m === 'plan') setFlow('files');
    else if (m === 'measure') setFlow('enter');
    else if (el) photoSource.open(el);
  };

  const room = buildRoom({ id: draftId, name: name.trim(), md, source, edited, photos, cover, instructions, styles, challenge, natures });
  const create = () => {
    if (!name.trim()) return;
    update((d) => {
      d.rooms.push(room);
      // the stand: «Lag ditt eget rom» is done (Synne 19.11)
      // the task is done when the new room has been looked around in, in all three views (RoomScreen)
      if (STAND) d.standRoom = room.id;
      d.activeChat[room.id] = null;
      // colours from nature are a small moodboard for the room, so the AI has one thing to use
      for (const b of editBoards(d)) if (boardIds.includes(b.id)) b.roomIds = [...(b.roomIds ?? []), room.id];
      syncNatureBoard(d, room.id, room.name, natures);
    });
    showToast(`${room.name} is ready`);
    onClose();
    navigate(`/room/${room.id}`, true);
  };

  // the methods as boxes with a big icon, two by two (Synne 27.10)
  // «recommended» gets a faint wine-red tint – only «Scan room» in «Choose method»
  const methodList = (ms: Method[], recommended?: Method) => (
    <div className="plus-tiles">
      {METHODS.filter((m) => ms.includes(m.id)).map((m) => (
        <button key={m.id} className={m.id === recommended ? 'nr-tile is-recommended' : 'nr-tile'} aria-haspopup={m.id === 'photos' ? 'menu' : undefined} onClick={(e) => start(m.id, e.currentTarget)}>
          <Icon name={m.icon} size={32} />
          {m.id === recommended ? (
            <span className="nr-tile-text">
              <span>{m.title}</span>
              <span className="nr-tile-note">Recommended method</span>
            </span>
          ) : (
            <span>{m.title}</span>
          )}
        </button>
      ))}
    </div>
  );

  let sheet: ReactNode = null;
  if (step === 'choose' && !fromMenu) {
    // half sheet: the screen behind stays visible (Synne 27.10)
    sheet = (
      <BottomSheet title="Choose method" onClose={onClose}>
        {methodList(['scan', 'plan', 'measure', 'photos'], 'scan')}
      </BottomSheet>
    );
  } else if (step === 'check' && md) {
    const showScan = source === 'scan' && view !== 'plan';
    sheet = (
      <BottomSheet
        tall
        title="Check your room"
        onBack={back}
        onClose={onClose}
        footer={
          <>
            <Button block className={allSeen ? 'stand-ok-btn' : ''} onClick={() => afterMeasures(source ?? 'plan')}>
              Looks right
            </Button>
            {source === 'scan' ? (
              <Button variant="text" block onClick={() => setFlow('scan')}>
                Scan again
              </Button>
            ) : (
              <Button variant="text" block onClick={() => setFlow('files')}>
                Upload another
              </Button>
            )}
            <Button variant="text" block onClick={() => setFlow('edit')}>
              Edit measurements
            </Button>
          </>
        }
      >
        <div className="nr-check">
          {source === 'scan' && (
            <SegmentedTabs
              label="View"
              tabs={[
                { id: '360', label: tabLabel('360', '360°') },
                { id: '3d', label: tabLabel('3d', '3D') },
                { id: 'plan', label: tabLabel('plan', 'Floor plan') },
              ]}
              value={view}
              onChange={setView}
            />
          )}
          {/* the stand: what to do in this view, in one short line (Synne 19.11) */}
          {STAND && source === 'scan' && (
            <p className="stand-check-hint">
              {view === '360' ? 'Dra i bildet for å se deg rundt i rommet' : view === '3d' ? 'Dra for å snu rommet, knip for å zoome' : 'Plantegningen med målene fra skanningen'}
            </p>
          )}
          {showScan ? (
            <div className="cr-scan-3d">
              {/* the same 3D room as in the room editor (Synne 14.11), instead of the raw scan */}
              <iframe key={view} className="cr-scan-frame" src={view === '360' ? '/furnie/360/index.html?embed=1' : '/furnie/3d/index.html?embed=1'} aria-label={view === '360' ? 'Your room in 360°. Drag to look around.' : 'Your room in 3D. Drag to look around, pinch to move closer.'} />
            </div>
          ) : (
            <PlanPreview md={md} />
          )}
          <p className="nr-summary">
            {wallCount(md)} walls · {m2(area(md))} m²{md.ceil ? ` · ceiling ${md.ceil} cm` : ''}
            {edited && <span> · edited by you</span>}
          </p>
        </div>
      </BottomSheet>
    );
  } else if (step === 'photos') {
    // take photos or choose from the library, and see what has been added (Synne 29.10)
    sheet = (
      <BottomSheet
        tall
        title={ROOM_PHOTO_MAX === 1 ? 'Add a photo' : 'Add photos'}
        onBack={back}
        onClose={onClose}
        footer={
          photos.length ? (
            // a room has one photo: several are put together into one wide view first (Synne 14.11)
            <Button
              block
              disabled={stitching}
              onClick={async () => {
                if (photos.length > 1) {
                  setStitching(true);
                  const one = await stitchPhotos(photos);
                  setPhotos([one]);
                  setStitching(false);
                }
                go(md ? 'details' : 'measure');
              }}
            >
              {stitching ? 'Putting the photos together …' : 'Continue'}
            </Button>
          ) : (
            // nothing added yet: one black «Add photos» (camera or library), with «Skip for now» under it (Synne 29.10)
            <>
              <Button block icon="add" aria-haspopup="menu" onClick={(e) => photoSource.open(e.currentTarget)}>
                {ROOM_PHOTO_MAX === 1 ? 'Add a photo' : 'Add photos'}
              </Button>
              {md && (
                <Button variant="text" block onClick={() => go('details')}>
                  Skip for now
                </Button>
              )}
            </>
          )
        }
      >
        {/* one short line on why – kept minimal (Synne 29.10) */}
        {/* no «why» line once a photo is added (Synne 14.11) */}
        {photos.length > 1 && <p className="nr-intro">Your photos are put together into one view of the room.</p>}
        {/* before anything is added: three example photos, a little down the sheet (Synne 29.10, Figma 06R.F2B) */}
        {photos.length === 0 && (
          <div className="nr-examples">
            <div className="nr-examples-fan" aria-hidden>
              <img src="/rooms/bedroom.jpg" alt="" />
              <img src="/rooms/kitchen.jpg" alt="" />
              <img src="/rooms/living.jpg" alt="" />
            </div>
            {/* the «why» sits under the photos while nothing is added (Synne 29.10) */}
            <p>{PHOTOS_WHY}</p>
          </div>
        )}
        {photos.length > 0 && <PhotoPicker max={ROOM_PHOTO_MAX} photos={photos} onAdd={(t) => setPhotos((p) => [...p, ...t].slice(-ROOM_PHOTO_MAX))} onRemove={(i) => setPhotos((list) => list.filter((_, k) => k !== i))} />}
      </BottomSheet>
    );
  } else if (step === 'measure') {
    sheet = (
      <BottomSheet
        tall
        title="Add measurements"
        onBack={back}
        onClose={onClose}
        footer={
          <Button variant="outlined" block onClick={() => go('details')}>
            Skip for now
          </Button>
        }
      >
        <p className="nr-intro">With measurements the AI can tell you what fits. You can skip this and add them later.</p>
        {methodList(['scan', 'plan', 'measure'])}
      </BottomSheet>
    );
  } else if (step === 'boards') {
    // all the user's moodboards; one or more can be connected to the room (Synne 14.11)
    sheet = (
      <MoodboardSheet
        boards={myBoards}
        draft={boardDraft}
        setDraft={setBoardDraft}
        onBack={back}
        onClose={onClose}
        onDone={() => {
          setBoardIds(boardDraft);
          back();
        }}
      />
    );
  } else if (step === 'details') {
    sheet = (
      <BottomSheet tall title="Room details" onBack={back} onClose={onClose} primary={{ label: 'Create room', onClick: create, disabled: !name.trim() }}>
        <div className="nr-details">
          {/* the cover is made from what was added (photo, otherwise the room itself), and can be changed (Synne 27.10) */}
          <button className={'nr-cover' + (room.image ? '' : ' is-empty')} onClick={() => setFlow('cover')} aria-label={room.image ? 'Change the cover photo' : 'Add a cover photo'}>
            {/* no photo yet: a calm placeholder with an image icon instead of the cut-off 3D drawing (Synne 14.11) */}
            {room.image ? <img src={room.image} style={photoPos(room.image)} alt="" /> : <Icon name="image" size={32} />}
            <span className="nr-cover-change">{room.image ? 'Change photo' : 'Add photo'}</span>
          </button>
          {/* a plain text field – no list of suggested names while typing (Synne 29.10) */}
          <div className="field">
            <label className="field-label" htmlFor="nr-name">
              Room name
            </label>
            <input id="nr-name" className={'input' + (STAND && !name.trim() ? ' stand-next-field' : '')} placeholder="Enter room name..." autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {/* everything optional sits behind one row, so the sheet asks only for the name (Synne 14.11, option A);
              all of it can be changed later in Room settings */}
          {/* the stand (Synne 19.11): first the name glows, then «Personalise the room», shown as a box you can tap */}
          <button type="button" className={'nr-more-row' + (STAND ? ' stand-more' : '') + (STAND && name.trim() && !more ? ' stand-next-row' : '')} aria-expanded={more} aria-controls="nr-more" onClick={() => setMore((v) => !v)}>
            <span className="nr-switch-text">
              <span className="nr-switch-title">Personalise the room <span className="nr-optional">(optional)</span></span>
              {/* short (Synne 14.11: too much text, no show / hide label) */}
              <span className="nr-switch-note">Helps the AI interior expert create your dream room</span>
            </span>
            <Icon name="chevron_down" size={20} />
          </button>
          {more && (
            <div id="nr-more" className="nr-more">
              <div className="field">
                <div className="nr-label-row">
                  <label className="field-label" htmlFor="nr-instructions">
                    Instructions for the AI
                  </label>
                  <IconButton icon="info" className="nr-info-btn" label="What are instructions for the AI?" iconSize={18} aria-expanded={info} onClick={() => setInfo((v) => !v)} />
                </div>
                {info && <p className="nr-info">Tell the AI what to keep in mind in this room – for example what to keep, what to avoid, or who lives there. The AI uses it in every chat about the room, and you can change it later in Room settings.</p>}
                <textarea id="nr-instructions" className="input textarea" rows={3} placeholder="E.g. We rent – no drilling. Keep the sofa." value={instructions} onChange={(e) => setInstructions(e.target.value)} />
              </div>
              <section className="nr-group" aria-labelledby="nr-style">
                <h3 className="field-label" id="nr-style">
                  Interior style
                </h3>
                <StyleChips value={styles} onChange={setStyles} labelledBy="nr-style" />
              </section>
              {myBoards.length > 0 && (
                <MoodboardRow
                  boards={myBoards}
                  selected={boardIds}
                  onOpen={() => {
                    setBoardDraft(boardIds);
                    go('boards');
                  }}
                />
              )}
              {/* under the moodboards (Synne 14.11) */}
              <ChallengeSwitch value={challenge} onChange={setChallenge} />
              {/* not in Create room (Synne 18.11) – still in Room settings; behind SHOW_NATURE_IN_CREATE */}
              {SHOW_NATURE_IN_CREATE && <NatureColours id="nr-nature" value={natures} onChange={setNatures} optional={false} />}
            </div>
          )}
        </div>
      </BottomSheet>
    );
  }

  return (
    <>
      {!flow && sheet}
      {photoSource.element}
      {flow === 'files' && (
        <FakeFiles
          accept={['plan', 'pdf', 'photo']}
          onClose={() => setFlow(null)}
          onPick={() => {
            // the AI «reads» the floor plan
            setFlow('reading');
            window.setTimeout(() => {
              setMd(floorPlanRoom());
              setSource('plan');
              setEdited(false);
              setView('plan');
              setFlow(null);
              if (step !== 'check') go('check');
            }, 1600);
          }}
        />
      )}
      {flow === 'cover' && (
        <FakePhotoLibrary
          max={1}
          onClose={() => setFlow(null)}
          onDone={(p) => {
            setCover(p[0] ?? cover);
            setFlow(null);
          }}
        />
      )}
      {flow === 'scan' && (
        <RoomScanScreen
          roomName={name.trim() || undefined}
          onClose={() => setFlow(null)}
          onDone={() => {
            setMd(scannedRoom());
            setSource('scan');
            setEdited(false);
            setView('360'); // the room is checked in 360° first (Synne 18.11), not 3D
            setFlow(null);
            if (step !== 'check') go('check');
          }}
        />
      )}
      {(flow === 'enter' || flow === 'edit') && (
        <MeasureWizard
          key={flow}
          initial={flow === 'edit' && md ? md : rectDraft()}
          startStep={1}
          // a step in this flow, with the same sheet look (Synne 27.10)
          asSheet={{ title: flow === 'edit' ? 'Edit measurements' : 'Enter measurements', onBack: () => setFlow(null), onClose }}
          onClose={() => setFlow(null)}
          onSave={(next) => {
            if (flow === 'enter') {
              setMd(next);
              setSource('measure');
              setEdited(true);
              setFlow(null);
              afterMeasures('measure');
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
    </>
  );
}
