import { TABS } from '../state/nav';
import { STAND, shownRooms } from '../stand';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { allSaved, boardCover, boardsOf, DREAM, editBoards, INSPO, inspoSrc, PRODUCTS, sceneById, titleOf, toAttachment, type Product } from '../state/inspo';
import { nok } from '../state/catalog';
import { isRoomReady } from '../state/mutations';
import { dims } from '../state/geometry';
import type { Moodboard } from '../state/types';
import { useStore } from '../state/store';
import { uid } from '../state/seed';
import { Icon } from './Icon';
import { IsoView3D } from './IsoView3D';
import { BottomSheet, Button, navigate } from './ui';

/** Home | Discover: the app's two surfaces (Synne's frames in Figma, 06.11). */
// the tab that was active on the last screen, so the pill can slide from there to the new one (Synne 11.11)
let lastSurface: string | null = null;
const SHOW_NATURE_TAB = false;
/** which way the last tab switch went, so the new page can slide in from that side (Synne 11.11) */
export const navSlide = { dir: 0 };

export function SurfaceSwitch({ active }: { active: 'home' | 'discover' | 'nature' }) {
  // three tabs: My Crib, Explore, Nature (Synne 11.11)
  const tabs = [
    { id: 'home', label: TABS.home, path: '/' },
    { id: 'discover', label: TABS.creative, path: TABS.creativePath },
    // Nature is now part of Explore (Synne 14.11): its photos are the «If nature says it fits» row there. Kept behind a flag
    ...(SHOW_NATURE_TAB ? [{ id: 'nature', label: TABS.nature, path: TABS.naturePath }] : []),
  ] as const;
  const nav = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  // a pill behind the tabs that glides from the last tab to this one
  useLayoutEffect(() => {
    const at = (id: string | null) => nav.current?.querySelector<HTMLElement>(`[data-tab="${id}"]`);
    const place = (el: HTMLElement | null | undefined) => {
      if (!el || !pill.current) return;
      pill.current.style.width = `${el.offsetWidth}px`;
      pill.current.style.transform = `translateX(${el.offsetLeft}px)`;
    };
    const from = at(lastSurface);
    if (from && pill.current) {
      pill.current.style.transition = 'none';
      place(from);
      pill.current.getBoundingClientRect();
      pill.current.style.transition = '';
    }
    place(at(active));
    lastSurface = active;
  }, [active]);
  return (
    <>
      {/* the images fade out behind the buttons (Synne 06.11) */}
      <span className="surface-fade" aria-hidden />
      <nav ref={nav} className="surface-switch surface-switch-3 has-pill" aria-label="Main">
        <span ref={pill} className="surface-pill" aria-hidden />
        {tabs.map((t) => (
          <button key={t.id} data-tab={t.id} className={active === t.id ? 'is-active' : ''} aria-current={active === t.id ? 'page' : undefined} onClick={() => {
            navSlide.dir = Math.sign(tabs.findIndex((x) => x.id === t.id) - tabs.findIndex((x) => x.id === active));
            navigate(t.path);
          }}>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  );
}

/** A moodboard as a card: the nature image big on the left, two rooms on the right. */
/** A board's cover: the nature image big, then two rooms. An empty board gets a quiet placeholder (Synne 14.11). */
export function BoardCover({ board }: { board: Moodboard }) {
  const ids = boardCover(board);
  if (!ids.some(Boolean))
    return (
      <span className="board-cover is-empty">
        <Icon name="moodboard" size={28} />
      </span>
    );
  return (
    <span className="board-cover">
      {ids.map((id, i) => (
        <span key={i}>{id && <img src={inspoSrc(id)} alt="" />}</span>
      ))}
    </span>
  );
}

export function BoardCard({ board }: { board: Moodboard }) {
  const n = board.items.length;
  return (
    <button className="board-card" onClick={() => navigate(`/moodboard/${board.id}`)}>
      <BoardCover board={board} />
      <span className="board-card-name">{board.name}</span>
      <span className="board-card-meta">
        {n} {n === 1 ? 'image' : 'images'}
      </span>
    </button>
  );
}

/** Two columns of images with different heights, like a pin board. */
/** `glowFirst`: the first photo pulses, so it is clear a photo can be tapped (the stand's moodboard task, Synne 19.11) */
export function InspoGrid<T extends { id: string; title: string; ratio: string; price?: number }>({ items, onOpen, glowFirst = false }: { items: T[]; onOpen: (i: T) => void; glowFirst?: boolean }) {
  // asymmetric (Synne's Figma comment 11.11): a wide and a narrow column, both starting on the same line at the top.
  // Each image goes to the column that is shortest so far, so the two end up about as long.
  const ratio = (r: string) => {
    const [w, h] = r.split('/').map(Number);
    return h / w;
  };
  const widths = [0.6, 0.4];
  const cols: T[][] = [[], []];
  const height = [0, 0];
  for (const i of items) {
    const c = height[0] <= height[1] ? 0 : 1;
    cols[c].push(i);
    height[c] += widths[c] * ratio(i.ratio) + 0.08;
  }
  const tile = (i: T) => (
    <div key={i.id} className="inspo-tile">
      <button className={'inspo-tile-main' + (glowFirst && i.id === items[0]?.id ? ' stand-next' : '')} style={{ aspectRatio: i.ratio }} onClick={() => onOpen(i)} aria-label={i.title}>
        <img src={inspoSrc(i.id)} alt="" />
      </button>
      <span className="inspo-tile-title">{i.title}</span>
      {i.price !== undefined && <span className="inspo-tile-meta">{nok(i.price)}</span>}
    </div>
  );
  return (
    <div className="inspo-grid inspo-grid-asym">
      <div className="inspo-col inspo-col-wide">{cols[0].map(tile)}</div>
      <div className="inspo-col inspo-col-narrow">{cols[1].map(tile)}</div>
    </div>
  );
}

/** «All saved» on Home: every saved image in one grid, on a moodboard or not (Synne 06.11). */
export function SavedGrid() {
  const { state } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const items = allSaved(state).map((id) => {
    const scene = sceneById(id);
    return scene ? { id, title: scene.name, ratio: '4 / 5' } : [...INSPO, ...DREAM, ...PRODUCTS].find((i) => i.id === id)!;
  });
  const open = (id: string) => {
    const p = PRODUCTS.find((x) => x.id === id);
    if (p) setProduct(p);
    else navigate(sceneById(id) ? `/discover/${id}` : `/image/${id}`);
  };
  return (
    <>
      {items.length ? <InspoGrid items={items} onOpen={(i) => open(i.id)} /> : <p className="empty">Nothing saved yet. Find something in Discover.</p>}
      {product && <ProductSheet product={product} onClose={() => setProduct(null)} />}
    </>
  );
}

/** A piece of furniture found online: try it in a room, or save it to a moodboard. */
export function ProductSheet({ product, nature, onClose }: { product: Product; nature?: string; onClose: () => void }) {
  const { state, update } = useStore();
  const [step, setStep] = useState<'info' | 'room' | 'save'>('info');
  // only rooms that are built in the prototype can show the item
  const rooms = shownRooms(state.rooms).filter((r) => !r.archived && isRoomReady(r.id));
  const tryIn = (roomId: string) => {
    update((d) => {
      d.activeChat[roomId] = null; // a fresh chat for this item
      d.pending = { roomId, attachment: toAttachment(product) };
    });
    navigate(`/room/${roomId}`);
  };
  if (step === 'save') return <SaveSheet item={product.id} nature={nature} onClose={onClose} />;
  if (step === 'room') {
    return (
      <BottomSheet title="Which room?" onBack={() => setStep('info')} onClose={onClose}>
        <div className="room-pick">
          {rooms.map((r) => (
            <button key={r.id} className="room-pick-card" onClick={() => tryIn(r.id)}>
              <span className="room-pick-img">{r.image && <img src={r.image} alt="" />}</span>
              <span className="room-pick-name">{r.name}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
    );
  }
  return (
    <BottomSheet title={product.title} onClose={onClose} primary={{ label: 'Try in my room', onClick: () => (rooms.length === 1 ? tryIn(rooms[0].id) : setStep('room')), disabled: rooms.length === 0 }}>
      <img className="save-preview" src={inspoSrc(product.id)} alt={product.title} />
      <p className="product-price">{nok(product.price)}</p>
      <p className="sheet-lead">
        Online store · {dims({ width: product.size[0], depth: product.size[1], height: product.size[2] })} · {product.colorName}
      </p>
      <Button variant="secondary" block onClick={() => setStep('save')}>
        Save to moodboard
      </Button>
    </BottomSheet>
  );
}

/** A row with a picture and a name, nothing else (Synne 06.11). */
function PickRow({ title, thumb, onPick, next = false }: { title: string; thumb: ReactNode; onPick: () => void; next?: boolean }) {
  return (
    <button className={'pick-row' + (next ? ' stand-next-row' : '')} onClick={onPick}>
      <span className="list-thumb">{thumb}</span>
      <span className="pick-row-title">{title}</span>
    </button>
  );
}

function BoardRow({ board, onPick, next }: { board: Moodboard; onPick: () => void; next?: boolean }) {
  return <PickRow next={next} title={board.name} thumb={board.items[0] && <img src={inspoSrc(board.items[0])} alt="" />} onPick={onPick} />;
}

/** Save an image (Synne 06.11): the first row keeps it without a moodboard, tapping a moodboard saves it there. */
export function SaveSheet({ item, nature, onClose }: { item: string; /** the nature image it was found from */ nature?: string; onClose: () => void }) {
  const { state, update, showToast } = useStore();
  // the stand: the visitor's own board first, and it shows the way (Synne 19.11)
  const own = STAND ? state.standBoard : undefined;
  const boards = boardsOf(state)
    .filter((b) => !b.archived)
    .sort((a, b) => Number(b.id === own) - Number(a.id === own));
  const [creating, setCreating] = useState(false);
  if (creating) return <NewMoodboardSheet item={item} nature={nature} onClose={onClose} />;
  const save = (board?: Moodboard) => {
    update((d) => {
      if (!board) {
        d.saved = [...(d.saved ?? []).filter((x) => x !== item), item];
        return;
      }
      const b = editBoards(d).find((x) => x.id === board.id)!;
      if (!b.items.includes(item)) b.items.push(item);
      // the board gets the nature image as its cover, unless it already has one
      if (nature && !b.items.some((id) => sceneById(id))) b.items.unshift(nature);
    });
    showToast(board ? `Saved to ${board.name}` : 'Saved');
    onClose();
  };
  return (
    <BottomSheet title="Save to moodboard" onClose={onClose} primary={{ label: 'Create new moodboard', onClick: () => setCreating(true) }}>
      <PickRow title="Save" thumb={<Icon name="bookmark" />} onPick={() => save()} />
      {boards.map((b) => (
        <BoardRow key={b.id} board={b} next={b.id === own && !b.items.includes(item)} onPick={() => save(b)} />
      ))}
    </BottomSheet>
  );
}

/** New moodboard (Figma D5). A room is optional: it can be connected later. */
export function NewMoodboardSheet({ item, nature, onClose }: { item?: string; nature?: string; onClose: () => void }) {
  const { state, update, showToast } = useStore();
  // named after the nature image, e.g. «Fig»; the name can be changed here and later (Synne 06.11)
  const [name, setName] = useState(nature ? titleOf(nature) : '');
  // several rooms can use the same moodboard (Synne 14.11)
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const rooms = shownRooms(state.rooms).filter((r) => !r.archived);
  const create = () => {
    const id = uid('b');
    update((d) => {
      const boards = editBoards(d);
      boards.push({ id, name: name.trim(), items: [nature, item].filter((x): x is string => !!x), roomIds });
      // the stand's moodboard task: this is the board to fill (Synne 19.11)
      if (STAND && d.standTrip === 'boards') {
        d.standBoard = id;
        d.standTrip = undefined;
      }
    });
    showToast(`${name.trim()} is ready`);
    onClose();
    if (!item) navigate(`/moodboard/${id}`);
  };
  return (
    <BottomSheet title="New moodboard" onClose={onClose} primary={{ label: 'Create moodboard', onClick: create, disabled: !name.trim() }}>
      <div className="field">
        <label className="field-label" htmlFor="mb-name">
          Name
        </label>
        <input id="mb-name" className="input" autoComplete="off" placeholder="Give your moodboard a name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <h3 className="field-label mb-room-label">
        Connect to rooms <span className="nr-optional">(optional)</span>
      </h3>
      {/* photos, so the rooms are easy to tell apart; tap again to leave it without a room (Synne 06.11) */}
      <div className="nature-strip room-strip">
        {rooms.map((r) => (
          <button key={r.id} className={'nature-pick' + (roomIds.includes(r.id) ? ' is-active' : '')} aria-pressed={roomIds.includes(r.id)} onClick={() => setRoomIds((l) => (l.includes(r.id) ? l.filter((x) => x !== r.id) : [...l, r.id]))}>
            {r.image ? <img src={r.image} alt="" /> : <span className="room-strip-iso"><IsoView3D room={r} items={r.furniture} mini /></span>}
            <span>{r.name}</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}

/** Add moodboard to a room (Figma D7): from + in the chat. One board per room. */
export function AddBoardSheet({ onAdd, onClose }: { onAdd: (boardId: string) => void; onClose: () => void }) {
  const { state } = useStore();
  const boards = boardsOf(state).filter((b) => !b.archived);
  return (
    <BottomSheet title="Add moodboard" onClose={onClose}>
      <p className="sheet-lead">The AI uses the moodboard as a reference for everything in this room.</p>
      {boards.length === 0 && <p className="empty">No moodboards yet. Make one from Home.</p>}
      {boards.map((b) => (
        <BoardRow key={b.id} board={b} onPick={() => onAdd(b.id)} />
      ))}
    </BottomSheet>
  );
}
