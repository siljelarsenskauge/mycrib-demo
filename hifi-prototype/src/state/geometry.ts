import type { Furniture, Room } from './types';

export interface Rect {
  x: number;
  y: number;
  w: number;
  d: number;
}

export function footprint(f: Furniture): Rect {
  return f.rot === 90
    ? { x: f.x, y: f.y, w: f.depth, d: f.width }
    : { x: f.x, y: f.y, w: f.width, d: f.depth };
}

export function overlaps(a: Rect, b: Rect, margin = 0): boolean {
  return (
    a.x < b.x + b.w + margin &&
    a.x + a.w + margin > b.x &&
    a.y < b.y + b.d + margin &&
    a.y + a.d + margin > b.y
  );
}

export function doorZone(room: Room): Rect {
  const { door } = room;
  // a door that opens outwards doesn't need free floor inside the room
  if (door.opensOut) return { x: -1000, y: -1000, w: 0, d: 0 };
  if (door.wall === 'right') return { x: room.width - door.length, y: door.offset, w: door.length, d: door.length };
  return door.wall === 'left'
    ? { x: 0, y: door.offset, w: door.length, d: door.length }
    : { x: door.offset, y: 0, w: door.length, d: door.length };
}

export function clampToRoom(room: Room, f: Furniture): Furniture {
  const r = footprint(f);
  return {
    ...f,
    x: Math.max(0, Math.min(room.width - r.w, f.x)),
    y: Math.max(0, Math.min(room.depth - r.d, f.y)),
  };
}

/** Pairs that naturally stand close together and should not count as a walking zone. */
const GROUPS: [string, string][] = [
  ['sofa', 'coffeetable'],
  ['armchair', 'coffeetable'],
  ['chair', 'diningtable'],
  ['chair', 'chair'],
  ['bed', 'lamp'],
];
export function pairIgnored(a: Furniture, b: Furniture) {
  return GROUPS.some(([p, q]) => (a.kind === p && b.kind === q) || (a.kind === q && b.kind === p));
}

export type Dir = 'left' | 'right' | 'up' | 'down';
export interface Gap {
  dir: Dir;
  dist: number;
  target: Furniture | null; // null = wall
  /** line in room coordinates */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Distance from an item to the nearest neighbour (or wall) in each direction. */
export function gaps(room: Room, items: Furniture[], item: Furniture, ignoreGroups = false): Gap[] {
  const r = footprint(item);
  const others = items.filter((o) => o.id !== item.id && !(ignoreGroups && pairIgnored(o, item)));
  const result: Gap[] = [];
  const dirs: Dir[] = ['left', 'right', 'up', 'down'];
  for (const dir of dirs) {
    let best: Gap | null = null;
    for (const o of others) {
      const q = footprint(o);
      if (dir === 'right' || dir === 'left') {
        const y0 = Math.max(r.y, q.y);
        const y1 = Math.min(r.y + r.d, q.y + q.d);
        if (y1 <= y0) continue;
        const dist = dir === 'right' ? q.x - (r.x + r.w) : r.x - (q.x + q.w);
        if (dist < 0) continue;
        if (!best || dist < best.dist) {
          const ym = (y0 + y1) / 2;
          const xa = dir === 'right' ? r.x + r.w : r.x;
          best = { dir, dist, target: o, x1: xa, y1: ym, x2: dir === 'right' ? xa + dist : xa - dist, y2: ym };
        }
      } else {
        const x0 = Math.max(r.x, q.x);
        const x1 = Math.min(r.x + r.w, q.x + q.w);
        if (x1 <= x0) continue;
        const dist = dir === 'down' ? q.y - (r.y + r.d) : r.y - (q.y + q.d);
        if (dist < 0) continue;
        if (!best || dist < best.dist) {
          const xm = (x0 + x1) / 2;
          const ya = dir === 'down' ? r.y + r.d : r.y;
          best = { dir, dist, target: o, x1: xm, y1: ya, x2: xm, y2: dir === 'down' ? ya + dist : ya - dist };
        }
      }
    }
    if (!best) {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.d / 2;
      if (dir === 'left') best = { dir, dist: r.x, target: null, x1: r.x, y1: cy, x2: 0, y2: cy };
      if (dir === 'right') best = { dir, dist: room.width - r.x - r.w, target: null, x1: r.x + r.w, y1: cy, x2: room.width, y2: cy };
      if (dir === 'up') best = { dir, dist: r.y, target: null, x1: cx, y1: r.y, x2: cx, y2: 0 };
      if (dir === 'down') best = { dir, dist: room.depth - r.y - r.d, target: null, x1: cx, y1: r.y + r.d, x2: cx, y2: room.depth };
    }
    if (best) result.push(best);
  }
  return result;
}

/** Narrowest gap to another piece of furniture (walking zone), ignoring natural groups. */
export function tightestPassage(room: Room, items: Furniture[], item: Furniture): Gap | null {
  const g = gaps(room, items, item, true).filter((x) => x.target && x.dist > 0 && x.dist < 150);
  if (g.length === 0) return null;
  return g.reduce((a, b) => (a.dist <= b.dist ? a : b));
}

export function blocksDoor(room: Room, item: Furniture) {
  return overlaps(footprint(item), doorZone(room));
}

export type PlaceWall = 'back' | 'front' | 'left' | 'right';

export function placeAlongWall(room: Room, items: Furniture[], item: Furniture, wall: PlaceWall, margin = 10): Furniture | null {
  const rot: 0 | 90 = wall === 'back' || wall === 'front' ? 0 : 90;
  const cand: Furniture = { ...item, rot };
  const r = footprint(cand);
  const others = items.filter((o) => o.id !== item.id).map(footprint);
  const door = doorZone(room);
  // a window that goes down to the floor is a door to the balcony: keep the floor in front of it free
  const { window: win } = room;
  const glassDoor: Rect | null = win.sill === 0 && win.wall === 'back' ? { x: win.offset, y: 0, w: win.length, d: 60 } : null;
  const free = (c: Furniture) => {
    const fr = footprint(c);
    return !overlaps(fr, door) && !(glassDoor && overlaps(fr, glassDoor)) && others.every((o) => !overlaps(fr, o, margin));
  };
  if (wall === 'back' || wall === 'front') {
    const y = wall === 'back' ? 0 : room.depth - r.d;
    for (let x = 10; x + r.w <= room.width; x += 10) {
      const c = { ...cand, x, y };
      if (free(c)) return c;
    }
  } else {
    const x = wall === 'left' ? 0 : room.width - r.w;
    for (let y = 10; y + r.d <= room.depth; y += 10) {
      const c = { ...cand, x, y };
      if (free(c)) return c;
    }
  }
  return null;
}

/** Move an item to another wall, preferring spots with a comfortable walking zone. */
export function placeOnOtherWall(room: Room, items: Furniture[], item: Furniture, only?: PlaceWall[]): { item: Furniture; wall: PlaceWall } | null {
  const cur = wallOf(room, item);
  const walls = (only ?? (['front', 'right', 'back', 'left'] as PlaceWall[])).filter((w) => only || w !== cur);
  for (const margin of [40, 25, 10]) {
    for (const w of walls) {
      const p = placeAlongWall(room, items, item, w, margin);
      if (p) return { item: p, wall: w };
    }
  }
  return null;
}

export function wallOf(room: Room, item: Furniture): PlaceWall | null {
  const r = footprint(item);
  if (r.y <= 5) return 'back';
  if (r.y + r.d >= room.depth - 5) return 'front';
  if (r.x <= 5) return 'left';
  if (r.x + r.w >= room.width - 5) return 'right';
  return null;
}

export const WALL_PHRASE: Record<PlaceWall, string> = {
  back: 'against the window wall',
  front: 'against the wall nearest you',
  left: 'against the wall with the door',
  right: 'against the right wall',
};

export function findFreeSpot(room: Room, items: Furniture[], item: Furniture): Furniture {
  for (const margin of [60, 40, 25, 10]) {
    for (const w of ['front', 'right', 'back', 'left'] as PlaceWall[]) {
      const p = placeAlongWall(room, items, item, w, margin);
      if (p) return p;
    }
  }
  return clampToRoom(room, { ...item, x: room.width / 2, y: room.depth / 2 });
}

export const dims = (f: { width: number; depth: number; height: number }) =>
  `${f.width} × ${f.depth} × ${f.height} cm`;

/**
 * Door on the left wall (x = 0), from y = start to start + len.
 * Returns the door leaf and the swing arc for the given direction and hinge side.
 */
export function doorSwing(start: number, len: number, opensOut = false, hinge: 'start' | 'end' = 'start') {
  const hy = hinge === 'start' ? start : start + len; // hinge point
  const other = hinge === 'start' ? start + len : start; // the other jamb
  const lx = opensOut ? -len : len; // leaf end, inside (+) or outside (-) the room
  // sweep direction depends on which quarter circle the leaf moves through
  const sweep = (hinge === 'start') === !opensOut ? 1 : 0;
  return {
    leaf: { x1: 0, y1: hy, x2: lx, y2: hy },
    arc: `M ${lx} ${hy} A ${len} ${len} 0 0 ${sweep} 0 ${other}`,
  };
}
