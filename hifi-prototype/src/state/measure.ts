// The measuring tool from the group prototype Furnie («Skriv inn mål»), ported to TypeScript.
// The room is a polygon (cm). Wall i goes from pts[i] to pts[i + 1]. Openings and features sit on a wall,
// `dist` cm from the corner it is measured from (ref «a» = start of the wall, «b» = end of the wall).

export interface Pt {
  x: number;
  y: number;
}
export type Shape = 'rect' | 'L' | 'custom';
export type FeatKind = 'radiator' | 'column' | 'fireplace' | 'cupboard' | 'niche' | 'light' | 'outlet' | 'other';

export interface Opening {
  id: string;
  type: 'door' | 'window';
  wall: number;
  w: number;
  dist: number;
  ref: 'a' | 'b';
  swing?: 'in' | 'out';
  hinge?: 'a' | 'b';
  sill?: number | null;
  h?: number | null;
}
export interface Feature {
  id: string;
  type: 'feat';
  kind: FeatKind;
  wall: number;
  w: number;
  dist: number;
  ref: 'a' | 'b';
  d: number;
  out: number;
  name?: string;
}
export type Item = Opening | Feature;
export interface Slope {
  wall: number;
  from: number;
  low: number;
  high: number;
}
export interface Measurements {
  shape: Shape;
  pts: Pt[];
  closed: boolean;
  opens: Opening[];
  feats: Feature[];
  ceil: number | '';
  slope: Slope | null;
  /** walls the user has deleted (the room is open there until a wall is added again) */
  miss?: number[];
  /** curved walls (Synne 23.10): how far the middle of the wall bulges out from a straight line, in cm.
   *  Positive bulges out of the room, negative into it. Keyed by wall index; missing = straight. */
  curve?: Record<number, number>;
}

export interface Wall {
  a: Pt;
  b: Pt;
  len: number;
  ux: number;
  uy: number;
}

export const FEAT_KINDS: Record<FeatKind, { label: string; w: number; d: number; out: number }> = {
  radiator: { label: 'Radiator', w: 100, d: 12, out: 0 },
  column: { label: 'Column', w: 30, d: 30, out: 80 },
  fireplace: { label: 'Fireplace', w: 120, d: 50, out: 0 },
  cupboard: { label: 'Built-in cupboard', w: 150, d: 60, out: 0 },
  niche: { label: 'Niche', w: 100, d: 40, out: 0 },
  light: { label: 'Light point', w: 20, d: 20, out: 0 },
  outlet: { label: 'Outlet', w: 12, d: 4, out: 0 },
  other: { label: 'Other', w: 60, d: 60, out: 0 },
};

export const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

export function shapePts(shape: Shape): Pt[] {
  if (shape === 'rect') return [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 300 }, { x: 0, y: 300 }];
  if (shape === 'L') return [{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 220 }, { x: 260, y: 220 }, { x: 260, y: 420 }, { x: 0, y: 420 }];
  return [{ x: 0, y: 0 }, { x: 300, y: 0 }];
}
export const draft = (shape: Shape = 'rect'): Measurements => ({ shape, pts: shapePts(shape), closed: shape !== 'custom', opens: [], feats: [], ceil: '', slope: null });

/** A rectangular room of the given size – used when a room has no saved drawing yet. */
export function rectOf(width: number, depth: number, height?: number): Measurements {
  return { ...draft('rect'), pts: [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: depth }, { x: 0, y: depth }], ceil: height ?? '' };
}

/* ---------- geometry ---------- */
export const wallCount = (md: Measurements) => (md.closed ? md.pts.length : md.pts.length - 1);
export function wall(md: Measurements, i: number): Wall {
  const n = md.pts.length;
  const a = md.pts[i];
  const b = md.pts[(i + 1) % n];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { a, b, len, ux: dx / len, uy: dy / len };
}
export const wallLen = (md: Measurements, i: number) => Math.round(wall(md, i).len);
const letter = (i: number) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(i) || 'W' + (i + 1);
export const isMissing = (md: Measurements | null | undefined, i: number) => !!md?.miss?.includes(i);
/** Wall letter, skipping deleted walls so the letters stay A, B, C … */
export function wallName(md: Measurements, i: number) {
  let r = i;
  if (md.miss?.length) {
    r = 0;
    for (let k = 0; k < i; k++) if (!md.miss.includes(k)) r++;
  }
  return letter(r);
}
export const isComplete = (md: Measurements | null) => !!(md && md.closed && !md.miss?.length && !isBad(md));
export function signedArea(md: Measurements) {
  const p = md.pts;
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    s += p[i].x * q.y - q.x * p[i].y;
  }
  return s / 2;
}
export const area = (md: Measurements) => {
  // a curved wall adds (or takes away) about ⅔ · chord · bulge – the area of a parabolic segment
  let extra = 0;
  for (const [k, b] of Object.entries(md.curve ?? {})) {
    const i = Number(k);
    if (i < wallCount(md) && b) extra += (2 / 3) * wall(md, i).len * b;
  }
  return Math.max(0, Math.abs(signedArea(md)) + extra);
};

/* ---------- curved walls ---------- */
export const curveOf = (md: Measurements, i: number) => md.curve?.[i] ?? 0;
/** The control point of the quadratic curve: its peak lies half-way, so it sits twice the bulge out. */
export function curveCtrl(md: Measurements, i: number): Pt {
  const w = wall(md, i);
  const n = inward(md, i);
  const b = curveOf(md, i);
  return { x: (w.a.x + w.b.x) / 2 - n.x * 2 * b, y: (w.a.y + w.b.y) / 2 - n.y * 2 * b };
}
/** The peak of a curved wall (the middle of the curve). */
export function curvePeak(md: Measurements, i: number): Pt {
  const w = wall(md, i);
  const n = inward(md, i);
  const b = curveOf(md, i);
  return { x: (w.a.x + w.b.x) / 2 - n.x * b, y: (w.a.y + w.b.y) / 2 - n.y * b };
}
/** SVG path of the room's outline, with curved walls as quadratic curves. P maps a point to «x,y». */
export function outlinePath(md: Measurements, P: (p: Pt) => string = (p) => `${p.x},${p.y}`) {
  const n = wallCount(md);
  let d = `M ${P(md.pts[0])}`;
  for (let i = 0; i < n; i++) {
    const b = md.pts[(i + 1) % md.pts.length];
    d += curveOf(md, i) ? ` Q ${P(curveCtrl(md, i))} ${P(b)}` : ` L ${P(b)}`;
  }
  return d + (md.closed ? ' Z' : '');
}
/** SVG path of one wall. */
export function wallPath(md: Measurements, i: number, P: (p: Pt) => string = (p) => `${p.x},${p.y}`) {
  const w = wall(md, i);
  return curveOf(md, i) ? `M ${P(w.a)} Q ${P(curveCtrl(md, i))} ${P(w.b)}` : `M ${P(w.a)} L ${P(w.b)}`;
}
/** Unit normal pointing into the room. */
export function inward(md: Measurements, i: number): Pt {
  const w = wall(md, i);
  return signedArea(md) >= 0 ? { x: -w.uy, y: w.ux } : { x: w.uy, y: -w.ux };
}
export const cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx;
function segmentsCross(p1: Pt, p2: Pt, p3: Pt, p4: Pt) {
  const d1 = cross(p4.x - p3.x, p4.y - p3.y, p1.x - p3.x, p1.y - p3.y);
  const d2 = cross(p4.x - p3.x, p4.y - p3.y, p2.x - p3.x, p2.y - p3.y);
  const d3 = cross(p2.x - p1.x, p2.y - p1.y, p3.x - p1.x, p3.y - p1.y);
  const d4 = cross(p2.x - p1.x, p2.y - p1.y, p4.x - p1.x, p4.y - p1.y);
  return ((d1 > 0.01 && d2 < -0.01) || (d1 < -0.01 && d2 > 0.01)) && ((d3 > 0.01 && d4 < -0.01) || (d3 < -0.01 && d4 > 0.01));
}
/** Walls shorter than 10 cm or walls that cross each other. */
export function isBad(md: Measurements) {
  const n = wallCount(md);
  const np = md.pts.length;
  for (let i = 0; i < n; i++) if (wall(md, i).len < 10) return true;
  for (let a = 0; a < n; a++)
    for (let b = a + 2; b < n; b++) {
      if (md.closed && a === 0 && b === n - 1) continue;
      if (segmentsCross(md.pts[a], md.pts[(a + 1) % np], md.pts[b], md.pts[(b + 1) % np])) return true;
    }
  return false;
}
export function inside(md: Measurements, x: number, y: number) {
  const p = md.pts;
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if (p[i].y > y !== p[j].y > y && x < ((p[j].x - p[i].x) * (y - p[i].y)) / (p[j].y - p[i].y) + p[i].x) c = !c;
  }
  return c;
}
export function round(md: Measurements) {
  md.pts.forEach((p) => {
    p.x = Math.round(p.x * 10) / 10;
    p.y = Math.round(p.y * 10) / 10;
  });
  return md;
}
export function box(md: Measurements) {
  const xs = md.pts.map((p) => p.x);
  const ys = md.pts.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}
export const m2 = (cm2: number) => (Math.round(cm2 / 1000) / 10).toFixed(1);
export function detectShape(md: Measurements): Shape {
  if (!md.closed || md.pts.length !== 4) return 'custom';
  for (let i = 0; i < 4; i++) {
    const a = wall(md, i);
    const b = wall(md, (i + 1) % 4);
    if (Math.abs(a.ux * b.ux + a.uy * b.uy) > 0.01) return 'custom';
  }
  return 'rect';
}
export const isDefault = (md: Measurements) => {
  const d = draft('rect');
  return JSON.stringify(md.pts) === JSON.stringify(d.pts) && md.closed && !md.miss?.length && !md.opens.length && !md.feats.length && !md.slope;
};

/* ---------- wall lengths ---------- */
/** Which wall gives way when wall i changes length. */
export function affected(md: Measurements, i: number, alt: boolean) {
  const n = wallCount(md);
  if (!md.closed) return null;
  if (md.pts.length <= 3) return (i + 1) % n;
  return alt ? (i - 2 + n) % n : (i + 2) % n;
}
export function trySetLength(md: Measurements, i: number, v: number, alt: boolean) {
  const np = md.pts.length;
  const w = wall(md, i);
  const d = v - w.len;
  const dx = w.ux * d;
  const dy = w.uy * d;
  const nd = clone(md);
  const aff = affected(md, i, alt);
  const before = aff != null ? wall(md, aff) : null;
  const shift = (q: number, s: number) => {
    nd.pts[q].x += dx * s;
    nd.pts[q].y += dy * s;
  };
  if (!md.closed) for (let k = i + 1; k < np; k++) shift(k, 1);
  else if (np <= 3) shift((i + 1) % np, 1);
  else if (!alt) [(i + 1) % np, (i + 2) % np].forEach((q) => shift(q, 1));
  else [i, (i - 1 + np) % np].forEach((q) => shift(q, -1));
  round(nd);
  let ok = !isBad(nd);
  if (ok && before && aff != null && np > 3) {
    const af = wall(nd, aff);
    if (af.ux * before.ux + af.uy * before.uy < 0.5) ok = false;
  }
  return { ok, md: nd, aff };
}
export const featName = (o: Feature) => (o.kind === 'other' ? (o.name || '').trim() || 'Other' : FEAT_KINDS[o.kind].label);
export const itemName = (o: Item) => (o.type === 'door' ? 'The door' : o.type === 'window' ? 'The window' : featName(o as Feature));
export const offsetOf = (md: Measurements, o: Item) => (o.ref === 'b' ? wallLen(md, o.wall) - o.w - o.dist : o.dist);

/** Make doors, windows and features fit their walls again. Returns a note about what moved. */
export function fitItems(md: Measurements) {
  const moved: string[] = [];
  const fit = (o: Item, label: string) => {
    const L = wallLen(md, o.wall);
    const tag = `${label} on wall ${wallName(md, o.wall)}`;
    if (o.w > L) {
      o.w = L;
      moved.push(tag);
    }
    if (o.dist + o.w > L) {
      o.dist = Math.max(0, L - o.w);
      if (!moved.includes(tag)) moved.push(tag);
    }
  };
  md.opens.forEach((o) => fit(o, o.type === 'door' ? 'The door' : 'The window'));
  md.feats.forEach((o) => fit(o, featName(o)));
  return moved.length ? `${moved.join(', ')} was moved or made narrower to fit the wall.` : '';
}

/* ---------- re-indexing walls when corners are added or removed ---------- */
function remap(md: Measurements, fn: (j: number) => number) {
  let gone = 0;
  const keep = <T extends Item>(list: T[]) =>
    list.filter((o) => {
      const w = fn(o.wall);
      if (w < 0) {
        gone++;
        return false;
      }
      o.wall = w;
      return true;
    });
  md.opens = keep(md.opens);
  md.feats = keep(md.feats);
  if (md.slope) {
    const s = fn(md.slope.wall);
    if (s < 0) {
      md.slope = null;
      gone++;
    } else md.slope.wall = s;
  }
  if (md.miss) md.miss = md.miss.map(fn).filter((w) => w >= 0);
  if (md.curve) {
    const next: Record<number, number> = {};
    for (const [k, b] of Object.entries(md.curve)) {
      const w = fn(Number(k));
      if (w >= 0 && b) next[w] = b;
    }
    md.curve = next;
  }
  return gone;
}
function rotate(md: Measurements, r: number) {
  const np = md.pts.length;
  r = ((r % np) + np) % np;
  if (!r) return;
  md.pts = md.pts.slice(r).concat(md.pts.slice(0, r));
  remap(md, (j) => (j - r + np) % np);
}
/** Replace `cnt` corners starting at corner a with `ins`. Returns how many items were lost. */
export function replaceCorners(md: Measurements, a: number, cnt: number, ins: Pt[]) {
  const np = md.pts.length;
  const r = (((a - 1) % np) + np) % np;
  rotate(md, r);
  const A = 1;
  const m = ins.length;
  md.pts = md.pts.slice(0, A).concat(ins, md.pts.slice(A + cnt));
  const gone = remap(md, (j) => {
    if (j <= A - 1) return j;
    if (j <= A + cnt - 2) return -1;
    if (j === A + cnt - 1) return A + m - 1;
    return j - cnt + m;
  });
  const np2 = md.pts.length;
  rotate(md, np2 - (r % np2));
  return gone;
}
export function joinEnds(nd: Measurements) {
  if (nd.closed || nd.pts.length < 4) return false;
  const a = nd.pts[0];
  const b = nd.pts[nd.pts.length - 1];
  if (Math.hypot(a.x - b.x, a.y - b.y) >= 15) return false;
  nd.pts.pop();
  nd.closed = true;
  return true;
}

/* ---------- features ---------- */
export function featRect(md: Measurements, o: Feature): Pt[] {
  const w = wall(md, o.wall);
  const n = inward(md, o.wall);
  const s = offsetOf(md, o);
  const sign = o.kind === 'niche' ? -1 : 1;
  const o0 = o.kind === 'niche' ? 0 : o.out || 0;
  const o1 = o0 + o.d;
  const P = (t: number, q: number) => ({ x: w.a.x + w.ux * t + n.x * q * sign, y: w.a.y + w.uy * t + n.y * q * sign });
  return [P(s, o0), P(s + o.w, o0), P(s + o.w, o1), P(s, o1)];
}
export function featInside(md: Measurements, o: Feature) {
  if (o.kind === 'niche') return true;
  const w = wall(md, o.wall);
  const n = inward(md, o.wall);
  return featRect(md, o)
    .map((p, k) => {
      const t = k === 0 || k === 3 ? 1 : -1;
      const q = k < 2 ? 1 : -1;
      return { x: p.x + w.ux * t + n.x * q * 0.5, y: p.y + w.uy * t + n.y * q * 0.5 };
    })
    .every((p) => inside(md, p.x, p.y));
}
/** First free place for an opening of width w on a wall, as close to the middle as possible. */
export function freeSpot(md: Measurements, wallIdx: number, w: number, skipId: string | null) {
  const L = wallLen(md, wallIdx);
  const taken = md.opens.filter((o) => o.wall === wallIdx && o.id !== skipId).map((o) => [offsetOf(md, o), offsetOf(md, o) + o.w]);
  const center = Math.round((L - w) / 2);
  let best: number | null = null;
  for (let s = 0; s <= L - w; s += 5) {
    const ok = taken.every((t) => s + w <= t[0] || s >= t[1]);
    if (ok && (best === null || Math.abs(s - center) < Math.abs(best - center))) best = s;
  }
  return best;
}

export function summary(md: Measurements) {
  const d = md.opens.filter((o) => o.type === 'door').length;
  const w = md.opens.length - d;
  const n = wallCount(md) - (md.miss?.length ?? 0);
  const l = [md.shape === 'rect' ? 'Rectangular' : 'Custom shape', `${n} walls`, `approx. ${m2(area(md))} m²`];
  if (d) l.push(d + (d === 1 ? ' door' : ' doors'));
  if (w) l.push(w + (w === 1 ? ' window' : ' windows'));
  const det = md.feats.length + (md.slope ? 1 : 0);
  if (det) l.push(det + (det === 1 ? ' detail' : ' details'));
  return l.join(' · ');
}

/** The room as the rest of the app understands it: bounding box, ceiling height, one window and one door. */
export function toRoomSize(md: Measurements) {
  const b = box(md);
  const width = Math.round(b.x1 - b.x0);
  const depth = Math.round(b.y1 - b.y0);
  const at = (o: Opening) => {
    const w = wall(md, o.wall);
    const s = offsetOf(md, o) + o.w / 2;
    return { x: w.a.x + w.ux * s - b.x0, y: w.a.y + w.uy * s - b.y0 };
  };
  const win = md.opens.find((o) => o.type === 'window');
  const door = md.opens.find((o) => o.type === 'door');
  return {
    width,
    depth,
    height: md.ceil === '' ? undefined : md.ceil,
    window: win ? { center: at(win).x, length: win.w } : null,
    door: door ? { center: at(door).y, length: door.w } : null,
  };
}

/** The Room fields that follow from the measurements: bounding box, ceiling, and one window and door for the 3D view. */
export function roomShape(m: Measurements) {
  const size = toRoomSize(m);
  const W = Math.max(150, Math.min(1500, size.width));
  const D = Math.max(150, Math.min(1500, size.depth));
  const winLen = Math.min(size.window?.length ?? 120, W - 20);
  const doorLen = Math.min(size.door?.length ?? 85, D - 20);
  return {
    width: W,
    depth: D,
    height: size.height,
    window: { wall: 'back' as const, offset: Math.round(Math.max(0, Math.min(W - winLen, size.window ? size.window.center - winLen / 2 : W / 2 - winLen / 2))), length: winLen },
    door: { wall: 'left' as const, offset: Math.round(Math.max(0, Math.min(D - doorLen, size.door ? size.door.center - doorLen / 2 : D - doorLen - 25))), length: doorLen },
    plan: m,
  };
}

/** What the simulated room scan «finds»: 440 × 412 cm, a door, a window and a radiator. */
export function scannedRoom(): Measurements {
  const md = rectOf(440, 412, 250);
  md.opens = [
    { id: 'scan-door', type: 'door', wall: 3, w: 85, dist: 70, ref: 'a', swing: 'in', hinge: 'a' },
    { id: 'scan-window', type: 'window', wall: 0, w: 120, dist: 160, ref: 'a', sill: 90, h: null },
  ];
  md.feats = [{ id: 'scan-radiator', type: 'feat', kind: 'radiator', wall: 0, w: 100, dist: 170, ref: 'a', d: 12, out: 0 }];
  return md;
}

/** What the simulated AI reads from an uploaded floor plan: walls, a door and a window – but no ceiling height. */
export function floorPlanRoom(): Measurements {
  const md = rectOf(420, 360);
  md.opens = [
    { id: 'plan-door', type: 'door', wall: 2, w: 85, dist: 40, ref: 'a', swing: 'in', hinge: 'a' },
    { id: 'plan-window', type: 'window', wall: 0, w: 140, dist: 140, ref: 'a', sill: 90, h: null },
  ];
  return md;
}
