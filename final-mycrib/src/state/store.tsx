import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createSeed } from './seed';
import type { AppState } from './types';

export const KEY = 'interiorapp-v1:state';
// 5: the real living room (measured 360°/3D/2D, scanned tables), Rathi 29.10 – stored states from version 4 start again
// 6: «Recent rooms» instead of pinned rooms (Synne 04.11) – stored states start again so the order is Living Room, Bedroom, Kitchen
const VERSION = 6;

/** the seed rooms' covers: Synne's own photos, so they look like an ordinary home (06.11). Only the cover changes, not the room's views. */
const ROOM_COVERS: Record<string, string> = {
  // the living room as it is in its 360° view, with the beige sofa (Synne 19.11: the cover matches the room now; it
  // started as the empty room, Silje 13.11). The cover then follows the room – see roomCoverFor in RoomScreen
  '/rooms/living.jpg': '/rooms/living_beige.jpg',
  '/rooms/living-empty.jpg': '/rooms/living_beige.jpg',
  '/rooms/bedroom.jpg': '/rooms/my_bedroom.jpg',
  '/rooms/kitchen.jpg': '/rooms/my_kitchen.jpg',
  '/rooms/office.jpg': '/rooms/my_dining.jpg',
  // covers from the first try, in states saved since
  '/inspo/r_burgundy_sofa.jpg': '/rooms/living_beige.jpg',
  '/inspo/r_linen_bed.jpg': '/rooms/my_bedroom.jpg',
  '/inspo/r_green_kitchen.jpg': '/rooms/my_kitchen.jpg',
  '/inspo/r_jungle_dining.jpg': '/rooms/my_dining.jpg',
};

function withCovers(s: AppState): AppState {
  // Hallway was taken out of the example rooms (Synne 06.11)
  s.rooms = s.rooms.filter((r) => r.id !== 'r_hallway');
  s.chats = s.chats.filter((c) => c.roomId !== 'r_hallway');
  s.snapshots = s.snapshots.filter((v) => v.roomId !== 'r_hallway');
  s.rooms.forEach((r) => {
    if (r.image) r.image = ROOM_COVERS[r.image] ?? r.image;
    if (r.id === 'r_office' && r.name === 'Home Office') r.name = 'Dining area'; // matches the photo
    // Fig may challenge the user in the living room unless they switched it off (Synne 17.11); off is stored as false
    if (r.id === 'r_living' && !('challenge' in r)) r.challenge = true;
  });
  return s;
}

// «#reset» typed into an app that is already open only changes the hash, so the page doesn't load again and the old
// state stayed (Silje 17.11: the living room had its sofa after a reset). Load the page again; load() then starts over.
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#reset') window.location.reload();
  });
}

function load(): AppState {
  const params = new URLSearchParams(window.location.search);
  // «#reset» does the same: a claude.ai artifact link can carry a plain #name but no ?query – used to start over
  // between people at the stand on 20.11 (Rathi 11.11)
  if (params.has('reset') || window.location.hash === '#reset') {
    try {
      localStorage.removeItem(KEY);
      // a fresh visit: Fig's hello and the stand's welcome show again (Synne 19.11)
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    window.history.replaceState(null, '', window.location.pathname + '#/');
    return withCovers(createSeed());
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === VERSION) {
        return withCovers(parsed);
      }
    }
  } catch {
    /* ignore */
  }
  return withCovers(createSeed());
}

interface Store {
  state: AppState;
  update: (recipe: (draft: AppState) => void) => void;
  toast: string | null;
  showToast: (msg: string) => void;
  /** a room that isn't ready was tapped: «… isn't ready yet» is shown (not saved) */
  notReady: string | null;
  setNotReady: (roomId: string | null) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [toast, setToast] = useState<string | null>(null);
  const [notReady, setNotReady] = useState<string | null>(null);
  const timer = useRef<number>();

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const update = useCallback((recipe: (draft: AppState) => void) => {
    setState((prev) => {
      const draft = structuredClone(prev);
      recipe(draft);
      return draft;
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  return <Ctx.Provider value={{ state, update, toast, showToast, notReady, setNotReady }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
