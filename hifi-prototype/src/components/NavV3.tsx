// Three tabs (Synne 11.11): Rooms (all rooms as a carousel + chats), Moodboards (two ready-made + make your own),
// Explore (try nature in your rooms + inspiration for moodboards). Trying nature happens in a preview, so the room
// itself is not changed until you save (my proposal, 11.11).
import { shownRooms } from '../stand';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { BoardCard } from './Inspo';
import { RoomCard } from './RoomCard';
import { IconButton, SectionHeader, navigate } from './ui';
import { Icon } from './Icon';
import { boardsOf, DREAM_BOARD_IDS, inspoSrc, sceneById } from '../state/inspo';
import { isRoomReady, saveVersion } from '../state/mutations';
import { AMETHYST, AMETHYST_LEVELS, NATURE_PALETTES, naturePalette, stepImage, stepLabel, type BraveStep } from '../state/nature';
import { useStore } from '../state/store';
import type { Room } from '../state/types';

/** My Crib (Synne 11.11): your rooms as a carousel, the last opened first, and your moodboards under them */
export function MyCribTab({ rooms, onNewBoard }: { rooms: Room[]; onNewBoard: () => void }) {
  return (
    <>
      <section className="home-block home-block-rooms" aria-label="Recent rooms">
        <SectionHeader title="Recent rooms" link="All Rooms" onLink={() => navigate('/rooms')} />
        <div className="room-row home-room-row">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      </section>
      <section className="home-block" aria-label="Moodboards">
        {/* no «All moodboards» link: MyCrib already shows every board (Synne 11.11) */}
        <SectionHeader title="Your moodboards" />
        <BoardBento />
      </section>
    </>
  );
}


/**
 * Moodboards (Synne 11.11): tall cards, two side by side going down (not a carousel). Each card shows one, two or
 * three of the board's photos, so the boards look different and are easy to tell apart.
 */
// tall, square-ish, wide: the cards change shape so the board does not look like a plain grid
const SHAPES = ['3 / 4.6', '1 / 1', '4 / 3.2', '1 / 1.25', '3 / 4', '1 / 1.1'];
/** boards with their own card: one cover photo and a fixed shape (Silje's sketch 18.11: Sea blue to the left, Fig tall to the right) */
const CARDS: Record<string, { shape: string; photos: number }> = {
  b_sea: { shape: '4 / 5', photos: 1 },
  b_fig: { shape: '3 / 4.6', photos: 1 },
  b_pastel: { shape: '4 / 5', photos: 1 },
  b_avocado: { shape: '1 / 1', photos: 1 },
};

export function BoardBento(_: { grid?: boolean } = {}) {
  const { state } = useStore();
  // the boards with dream room images first (Silje 18.11), then the other example boards, new ones after them, so a new board lands at the end of the board
  const START = DREAM_BOARD_IDS;
  const boards = boardsOf(state)
    .filter((b) => !b.archived)
    .sort((a, b) => (START.indexOf(a.id) + 1 || 99) - (START.indexOf(b.id) + 1 || 99));
  // each board goes under the shorter column, like a pin board, so new boards fill the gap logically (Synne 11.11)
  const shapeOf = (id: string, i: number) => CARDS[id]?.shape ?? SHAPES[i % SHAPES.length];
  const heights = [0, 0];
  const column = boards.map((_, i) => {
    const [w, h] = shapeOf(boards[i].id, i).split('/').map(Number);
    const c = heights[0] <= heights[1] ? 0 : 1;
    heights[c] += h / w;
    return c;
  });
  const columnOf = (i: number) => column[i];
  return (
    // two columns of different heights (Synne 11.11): a tall card, then a smaller one with the next under it
    <div className="board-tall-grid board-masonry">
      {[0, 1].map((col) => (
        <div key={col} className="board-col">
          {boards.map((b, i) => {
            if (columnOf(i) !== col) return null;
            // rooms first, so a board does not always open with a nature close-up
            const photos = [...b.items.filter((id) => !sceneById(id)), ...b.items.filter((id) => sceneById(id))];
            const n = Math.min(photos.length, CARDS[b.id]?.photos ?? [1, 3, 2][i % 3]);
            return (
              <button key={b.id} className={`board-tall board-tall-${n}` + (n === 0 ? ' is-empty' : '')} style={{ aspectRatio: shapeOf(b.id, i) }} onClick={() => navigate(`/moodboard/${b.id}`)}>
                {photos.slice(0, n).map((id) => (
                  <img key={id} src={inspoSrc(id)} alt="" />
                ))}
                {/* an empty board: a quiet placeholder instead of nothing (Synne 14.11) */}
                {n === 0 && <Icon name="moodboard" size={28} />}
                <span className="board-simple-name">{b.name}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Moodboards: two ready-made to start with. A new one is made from + (the «New moodboard» card was removed, Synne 11.11) */
export function BoardsTab(_: { onNewBoard: () => void }) {
  const { state } = useStore();
  const boards = boardsOf(state).filter((b) => !b.archived);
  return (
    <>
      <div className="board-grid nav3-boards">
        {boards.map((b) => (
          <BoardCard key={b.id} board={b} />
        ))}
      </div>
    </>
  );
}

/**
 * Nature as a tool (Synne 11.11): your rooms in a row on top, the nature photos in a list down the left, and the room
 * big in the chosen palette. «Now» shows the room as it is. Nothing changes until «Save as version».
 */
type Look = { id: string; name: string; photo: string; colors: string[]; steps: Partial<Record<BraveStep, string>>; changes: Partial<Record<BraveStep, string>>; canSave: boolean };

const STEPS = ['touch', 'statement', 'allIn'] as const;
// Synne took the room picker out of the Nature tab in Figma (844:14529, 11.11); kept behind a flag so it can come back
const SHOW_ROOM_PICKER = false;
// Synne's new room photos (11.11), each under the nature photo with the closest colours
const ROOM_PHOTOS: Record<string, string> = {
  fig: '/nature/room_fig.jpg', // blue walls, burgundy details – fig skin and fig flesh
  avocado: '/nature/room_avocado.jpg', // moody green with curves
  coast: '/nature/room_coast.jpg', // sea blue and driftwood brown
};
const fromPalette = (id: string): Look => {
  const p = NATURE_PALETTES.find((x) => x.id === id)!;
  const own = ROOM_PHOTOS[id];
  return {
    id: p.id,
    name: p.name,
    photo: p.photo,
    colors: p.colors.map((c) => c.hex),
    steps: own ? { statement: own } : Object.fromEntries(STEPS.filter((s) => p.steps[s]).map((s) => [s, stepImage(p, s)])),
    changes: Object.fromEntries(STEPS.filter((s) => p.steps[s]).map((s) => [s, p.steps[s]!.changes])),
    canSave: true,
  };
};
const LOOKS: Look[] = [
  fromPalette('fig'),
  fromPalette('avocado'),
  fromPalette('coast'),
  // burgundy and olive: Synne's own «Plum leaf» (dusty plum and soft green), 11.11
  { id: 'plum_leaf', name: 'Plum leaf', photo: '/inspo/n_plum_leaf.jpg', colors: ['#6b3f4f', '#996569', '#a8ad7a', '#d9c98a'], steps: { statement: '/nature/room_plum_leaf.jpg' }, changes: {}, canSave: false },
  fromPalette('lavender'),
  // Amethyst: Synne's own living room in two levels (07.11)
  { id: AMETHYST.id, name: 'Amethyst', photo: AMETHYST.photo, colors: AMETHYST.colors.map((c) => c.hex), steps: { touch: AMETHYST_LEVELS[1].image, allIn: AMETHYST_LEVELS[2].image }, changes: {}, canSave: false },
];


/** The rooms as small tabs on the photo (Synne 11.11): each tab as wide as its name, a pill that glides between them */
function RoomTabs({ rooms, value, onChange }: { rooms: Room[]; value: string; onChange: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(`[data-room="${value}"]`);
    if (!el || !pill.current) return;
    pill.current.style.width = `${el.offsetWidth}px`;
    pill.current.style.transform = `translateX(${el.offsetLeft}px)`;
  }, [value]);
  return (
    <div ref={box} className="nature-x-rooms" role="tablist" aria-label="Room">
      <span ref={pill} className="room-tabs-pill" aria-hidden />
      {rooms.map((r) => (
        <button key={r.id} data-room={r.id} role="tab" aria-selected={r.id === value} className="room-tab" onClick={() => onChange(r.id)}>
          {r.name}
        </button>
      ))}
    </div>
  );
}

/** Nature as a tab, or (with roomId) inside a room: then the room is fixed and ✕ closes it (Synne 11.11) */
export function NatureTab({ roomId: fixedRoom, onClose }: { roomId?: string; onClose?: () => void } = {}) {
  const { state, update, showToast } = useStore();
  const rooms = shownRooms(state.rooms).filter((r) => !r.archived);
  const [roomId, setRoomId] = useState(fixedRoom ?? rooms.find((r) => r.id === 'r_living')?.id ?? rooms[0]?.id);
  const [lookId, setLookId] = useState(LOOKS[0].id);
  const [holding, setHolding] = useState(false);
  const [roomMenu, setRoomMenu] = useState(false);
  const look = LOOKS.find((l) => l.id === lookId)!;
  // switching rooms slides the photo in from the side of the new tab (Synne 11.11)
  const roomIndex = rooms.findIndex((r) => r.id === roomId);
  const prevRoom = useRef(roomIndex);
  const slide = roomIndex > prevRoom.current ? 'slide-from-right' : roomIndex < prevRoom.current ? 'slide-from-left' : '';
  useLayoutEffect(() => {
    prevRoom.current = roomIndex;
  }, [roomIndex]);
  // the tint also reaches the phone's status bar, so the whole screen is one colour (Synne 11.11)
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--nature-tint', look.colors[0]);
    return () => {
      document.documentElement.style.removeProperty('--nature-tint');
    };
  }, [look]);
  const step = (['statement', 'touch', 'allIn'] as const).find((s) => look.steps[s]) ?? 'touch';
  const room = rooms.find((r) => r.id === roomId);
  const ready = !!room && isRoomReady(room.id) && room.id === 'r_living';
  // hold the photo to see the room as it is now
  const image = !ready ? room?.image : holding ? room?.image : look.steps[step];

  const save = () => {
    const p = naturePalette(look.id);
    if (!p || !room) return;
    const name = `${p.name} · ${stepLabel(step)}`;
    update((d) => {
      // a version only: the room itself is not changed
      saveVersion(d, room.id, name);
      d.snapshots[0].palette = { id: p.id, step };
    });
    showToast(`Saved in ${room.name}'s versions`);
  };

  return (
    // the background takes a soft tint of the chosen nature photo (Synne 11.11)
    <section className={'nature-x' + (onClose ? ' in-room' : '')} aria-label="Try nature in your rooms" style={{ '--nature-tint': look.colors[0] } as CSSProperties}>
      {/* the chosen nature photo, blurred far out, behind everything: the page takes its colour and texture (Synne 11.11) */}
      <div key={look.id} className="nature-x-ambient" style={{ backgroundImage: `url(${look.photo})` }} aria-hidden />
      <div
        className="nature-x-stage"
        onPointerDown={() => ready && setHolding(true)}
        onPointerUp={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
        onPointerCancel={() => setHolding(false)}
      >
        {image && <img key={image} className={slide} src={image} alt={ready ? `${room!.name} in ${look.name}` : room!.name} />}
      </div>

      <h1 className="nature-x-title">If nature says it fits, then it fits</h1>
      {/* the rooms as tabs, in the same style as All rooms (Synne's Figma comment 11.11) */}
      {!onClose && rooms.length > 1 && (
        <RoomTabs rooms={rooms} value={roomId ?? rooms[0].id} onChange={setRoomId} />
      )}
      <div className="nature-x-top">
        <div className="nature-x-tools">
          {onClose ? (
            <IconButton icon="close" label="Back to the room" variant="glass" className="nature-x-save" onClick={onClose} />
          ) : !SHOW_ROOM_PICKER ? null : (
          <div className="menu-anchor">
            <button className="nature-x-room" aria-haspopup="menu" aria-expanded={roomMenu} onClick={() => setRoomMenu((o) => !o)}>
              <Icon name="chevron_down" size={18} />
              {room?.name}
            </button>
            {roomMenu && (
              <div className="nature-x-menu glass" role="menu">
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    role="menuitemradio"
                    aria-checked={r.id === roomId}
                    className="menu-item"
                    onClick={() => {
                      setRoomId(r.id);
                      setRoomMenu(false);
                    }}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}
          {ready && look.canSave && <IconButton icon="save" label="Save as version" variant="glass" className="nature-x-save" onClick={save} />}
        </div>
      </div>

      <div className="nature-x-bottom">
        {/* the name and the palette of the chosen photo, right under the room (Synne 11.11) */}
        <div className="nature-x-info">
          <p className={'nature-x-name' + (ready ? '' : ' is-note')}>{ready ? look.name : 'Only the living room is ready in the prototype'}</p>
          {ready && (
            <span className="nature-x-palette" aria-label={`${look.name} palette`}>
              {look.colors.map((c) => (
                <i key={c} style={{ background: c }} />
              ))}
            </span>
          )}
        </div>
        <div className="nature-x-picks" role="radiogroup" aria-label="Nature photos">
          {LOOKS.map((l) => (
            <button key={l.id} role="radio" aria-checked={l.id === lookId} aria-label={l.name} className={'nature-x-pick' + (l.id === lookId ? ' is-on' : '')} onClick={() => setLookId(l.id)}>
              <img src={l.photo} alt="" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export { RoomCard };
