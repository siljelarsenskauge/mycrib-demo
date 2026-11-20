// Simulated iOS camera, photo library and Files app (Synne 29.10, for the user test – copied from her iOS screenshots
// IMG_0471 / IMG_0473). They are system screens, not MyCrib's design, so they look like iOS. Everything is pretend:
// the camera «takes» photos of the living room, and the library and Files show a fixed set of pictures and files.
import { useState } from 'react';
import { Icon } from './Icon';
import { IconButton } from './ui';

/** Photos in the pretend camera roll – the living room first, then other rooms and a couple of furniture photos. */
// The living room is cut from its panorama: «?x=30» is where in the panorama the photo is taken (0–100 %).
const LIVING = (x: number) => `/pano/room-pano.jpg?x=${x}`;
/** object-position for a cut of the panorama, so a «photo» shows that part of the room */
export const photoPos = (src: string) => {
  const m = /[?&]x=(\d+)/.exec(src);
  return m ? { objectPosition: `${m[1]}% 50%` } : undefined;
};

export const LIBRARY_PHOTOS = [
  // Synne's own kitchen (IMG_0649, 14.11): for making a room from one photo, without scanning
  '/library/img_0649.jpg',
  LIVING(8),
  LIVING(30),
  LIVING(52),
  LIVING(74),
  '/rooms/living.jpg',
  '/rooms/bedroom.jpg',
  '/rooms/kitchen.jpg',
  '/rooms/office.jpg',
  '/rooms/hallway.jpg',
  '/scan/nesting-tables.jpg',
  '/scan/rug.jpg',
  '/scan/chair-scene.jpg',
];

/** Furniture photos for «Item photo» (Synne 04.11, from Pexels, in public/furniture-photos). Some file names have
 *  spaces and æøå: macOS stores «å» decomposed (NFD), so the names are normalised the same way, then encoded. */
export const FURNITURE_PHOTOS = ['grønn sofa.png', 'mørkebrun sofa.png', 'skinnstol .png', 'grå stol .png', 'beige bord.png', 'svart bord.png', 'mørkebrunt brod.png', 'synne sitt bord.png'].map(
  (f) => encodeURI(`/furniture-photos/${f.normalize('NFD')}`),
);

/** What the pretend camera sees, in turn: the walls of the living room. */
const CAMERA_VIEWS = [LIVING(20), LIVING(42), LIVING(64), LIVING(86)];

export type FakeFile = { name: string; date: string; kind: 'plan' | 'pdf' | 'zip' | '3d' | 'photo'; thumb?: string };
export const FILES: FakeFile[] = [
  { name: 'Floor plan – apartment.pdf', date: '27.10.2026', kind: 'plan', thumb: '/files/floor-plan.svg' },
  { name: '3D scan – living room.zip', date: '20.10.2026', kind: 'zip' },
  { name: 'IMG_0412.jpg', date: '19.10.2026', kind: 'photo', thumb: '/rooms/living.jpg' },
  { name: 'Living room.usdz', date: '18.10.2026', kind: '3d' },
  { name: 'Floor plan.jpg', date: '14.10.2026', kind: 'plan', thumb: '/files/floor-plan.svg' },
  { name: 'Lease agreement.pdf', date: '02.10.2026', kind: 'pdf' },
];

const Svg = ({ d, size = 22 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

/** Camera: a viewfinder of the living room, a shutter button, the last photo bottom-left and «Done» once there are photos. */
export function FakeCamera({ onDone, onClose }: { onDone: (photos: string[]) => void; onClose: () => void }) {
  const [view, setView] = useState(0);
  const [shots, setShots] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const shoot = () => {
    setShots((s) => [...s, CAMERA_VIEWS[view]]);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 120);
    // «turn» to the next wall, so the next photo is of another part of the room
    window.setTimeout(() => setView((v) => (v + 1) % CAMERA_VIEWS.length), 500);
  };
  return (
    <div className="ios-camera" role="dialog" aria-modal="true" aria-label="Camera">
      <div className="ios-camera-top">
        <button className="ios-camera-text" onClick={onClose}>
          Cancel
        </button>
        <span className="ios-camera-pill">Simulated</span>
      </div>
      <div className="ios-camera-view">
        <img src={CAMERA_VIEWS[view]} style={photoPos(CAMERA_VIEWS[view])} alt="" draggable={false} />
        {flash && <span className="ios-camera-flash" aria-hidden />}
      </div>
      <div className="ios-camera-modes" aria-hidden>
        {/* only PHOTO – no VIDEO / PORTRAIT, they would just distract in the test (Synne 29.10) */}
        <strong>PHOTO</strong>
      </div>
      <div className="ios-camera-bottom">
        <span className="ios-camera-last">{shots.length > 0 && <img src={shots[shots.length - 1]} style={photoPos(shots[shots.length - 1])} alt={`${shots.length} taken`} />}</span>
        <button className="ios-shutter" aria-label="Take photo" onClick={shoot}>
          <span />
        </button>
        {shots.length ? (
          <button className="ios-camera-text" onClick={() => onDone(shots)}>
            Done
          </button>
        ) : (
          <span className="ios-camera-last" aria-hidden />
        )}
      </div>
    </div>
  );
}

/** Photo library: «Photos | Collections», X and ✓, a grid you tick photos in (blue checks), «Select up to 20 items».
 *  Room photos by default; «Item photo» passes FURNITURE_PHOTOS (Synne 04.11). */
export function FakePhotoLibrary({
  onDone,
  onClose,
  max = 20,
  photos = LIBRARY_PHOTOS,
}: {
  onDone: (photos: string[]) => void;
  onClose: () => void;
  max?: number;
  photos?: string[];
}) {
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (p: string) => setSel((s) => (s.includes(p) ? s.filter((x) => x !== p) : max === 1 ? [p] : s.length < max ? [...s, p] : s));
  return (
    <div className="ios-sheet ios-photos" role="dialog" aria-modal="true" aria-label="Photo library">
      <p className="ios-photos-hint">{max === 1 ? 'Select a photo.' : `Select up to ${max} items.`}</p>
      <div className="ios-photos-head">
        <button className="ios-round" aria-label="Cancel" onClick={onClose}>
          <Icon name="close" size={22} />
        </button>
        <div className="ios-seg" aria-hidden>
          <span className="is-on">Photos</span>
          <span>Collections</span>
        </div>
        <button className={'ios-round ios-round-done' + (sel.length ? ' is-on' : '')} aria-label={`Add ${sel.length} photos`} disabled={!sel.length} onClick={() => onDone(sel)}>
          <Icon name="check" size={22} />
        </button>
      </div>
      <div className="ios-photos-grid">
        {photos.map((p, i) => {
          const n = sel.indexOf(p);
          return (
            <button key={p} className={'ios-photo' + (n >= 0 ? ' is-on' : '')} aria-pressed={n >= 0} aria-label={`Photo ${i + 1}`} onClick={() => toggle(p)}>
              <img src={p} style={photoPos(p)} alt="" />
              {n >= 0 && <span className="ios-photo-check">{max === 1 ? '✓' : n + 1}</span>}
            </button>
          );
        })}
      </div>
      <div className="ios-photos-bar" aria-hidden>
        {sel.length ? `${sel.length} selected` : 'Select items'}
      </div>
    </div>
  );
}

const FileIcon = ({ f }: { f: FakeFile }) =>
  f.thumb ? (
    <img src={f.thumb} alt="" />
  ) : (
    <span className={'ios-file-doc is-' + f.kind}>
      {f.kind === 'zip' ? <Svg d="M12 3v2m0 2v2m0 2v2m-2 2h4v4h-4z" /> : f.kind === '3d' ? <Svg d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 0v9m0 0l8-4.5M12 12l-8-4.5" size={30} /> : <Svg d="M7 8h10M7 12h10M7 16h6" />}
      <small>{f.kind === 'zip' ? 'ZIP' : f.kind === '3d' ? 'USDZ' : 'PDF'}</small>
    </span>
  );

/** Files (Recents): back / forward and X, a search field, a grid of files and the tab bar. Files that can't be used are greyed. */
export function FakeFiles({ accept, onPick, onClose }: { accept: FakeFile['kind'][]; onPick: (f: FakeFile) => void; onClose: () => void }) {
  return (
    <div className="ios-sheet ios-files" role="dialog" aria-modal="true" aria-label="Files">
      {/* the head is like MyCrib's other bottom sheets – X on the left, the title in the middle – so the
          prototype stays simple (Synne 29.10); the rest of the screen is still iOS Files */}
      <header className="sheet-head ios-files-head">
        <IconButton icon="close" label="Close" variant="glass" iconSize={20} onClick={onClose} />
        <h2 className="sheet-title">Recents</h2>
        <span aria-hidden />
      </header>
      <div className="ios-search" aria-hidden>
        <Svg d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3l-4-4" size={20} />
        <span>Search</span>
      </div>
      <div className="ios-files-grid">
        {FILES.map((f) => {
          const ok = accept.includes(f.kind);
          return (
            <button key={f.name} className="ios-file" disabled={!ok} onClick={() => onPick(f)}>
              <span className="ios-file-thumb">
                <FileIcon f={f} />
              </span>
              <span className="ios-file-name">{f.name}</span>
              <small>{f.date}</small>
              <small>iCloud Drive</small>
            </button>
          );
        })}
      </div>
      <div className="ios-files-tabs" aria-hidden>
        <span className="is-on">
          <Svg d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
          Recents
        </span>
        <span>
          <Svg d="M16 11a3 3 0 1 0 0-6M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 9a5 5 0 0 1 10 0m3-5a5 5 0 0 1 5 5" />
          Shared
        </span>
        <span>
          <Svg d="M3 7h6l2 2h10v10H3z" />
          Browse
        </span>
      </div>
    </div>
  );
}
