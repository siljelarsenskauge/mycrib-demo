// The measuring tool from the group prototype Furnie («Skriv inn mål»), ported in full and built with this design system.
// Layout from Figma 06L W1D (Synne 23.10): one screen – the drawing on top, the tabs Walls · Ceiling · Additional
// as their own component under it, and the rows as a quiet list below. No steps, no strokes, nothing that jumps.
import { useEffect, useLayoutEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { BottomSheet, Button, IconButton, phoneScale, SegmentedTabs } from '../components/ui';
import {
  FEAT_KINDS,
  area,
  box,
  clone,
  cross,
  curveOf,
  curvePeak,
  outlinePath,
  wallPath,
  detectShape,
  draft,
  featInside,
  featName,
  featRect,
  fitItems,
  freeSpot,
  inward,
  isBad,
  isComplete,
  isDefault,
  isMissing,
  itemName,
  joinEnds,
  m2,
  offsetOf,
  replaceCorners,
  round,
  signedArea,
  summary,
  trySetLength,
  wall,
  wallCount,
  wallLen,
  wallName,
  type FeatKind,
  type Feature,
  type Item,
  type Measurements,
  type Opening,
  type Pt,
} from '../state/measure';

export type { Measurements } from '../state/measure';
export const DEFAULT_MEASUREMENTS: Measurements = draft('rect');

type Sel = { t: 'wall'; i: number } | { t: 'wallEdit'; i: number } | { t: 'corner'; i: number } | { t: 'open'; id: string } | { t: 'feat'; id: string } | { t: 'slope' } | { t: 'ceil' };
type AddKind = 'door' | 'window' | FeatKind;
type Tab = 'walls' | 'ceiling' | 'more';
interface Ui {
  step: number;
  sel: Sel | null;
  add: AddKind | null;
  buf: Record<string, string>;
  ferr: Record<string, string>;
  note: string | null;
  err: { msg: string; alt?: number | null; wall?: number } | null;
  wallPick?: boolean;
  delPick?: { i: number } | null;
  help?: boolean;
}
interface Tf {
  s: number;
  W: number;
  H: number;
  ox: number;
  oy: number;
}

const ADD_GROUPS: [string, [AddKind, string][]][] = [
  ['Doors and windows', [['door', 'Door'], ['window', 'Window']]],
  ['Fixed in the room', [['radiator', 'Radiator'], ['column', 'Column'], ['fireplace', 'Fireplace'], ['cupboard', 'Built-in cupboard'], ['niche', 'Niche']]],
  ['Light and power', [['light', 'Light point'], ['outlet', 'Outlet']]],
  ['Other', [['other', 'Something else']]],
];
/** the most common things, straight in the «Additional» list under ADD MORE; the rest are behind «More» (Synne 26.10) */
const QUICK_ADD: [AddKind, string][] = [
  ['door', 'Door'],
  ['window', 'Window'],
  ['radiator', 'Radiator'],
  ['outlet', 'Outlet'],
];
/** used when the user leaves the ceiling height empty – shown in grey in the field (Synne 23.10) */
const STANDARD_CEIL = 250;
const addName = (k: AddKind) => (k === 'door' ? 'door' : k === 'window' ? 'window' : FEAT_KINDS[k].label.toLowerCase());
const num = (s: string | undefined) => {
  const t = String(s ?? '').trim();
  if (!t) return null;
  const x = parseFloat(t.replace(',', '.'));
  return isNaN(x) ? NaN : Math.round(x);
};
const sameSel = (a: Sel | null, b: Sel | null) => JSON.stringify(a) === JSON.stringify(b);

export function MeasureWizard({
  initial,
  onSave,
  onClose,
  startStep = 1,
  checkNote,
  asSheet,
}: {
  /** shown as a step in a sheet flow (Synne 27.10, «Create room»): handle, back arrow on the left, X on the right */
  asSheet?: { title: string; onBack: () => void; onClose: () => void };
  initial: Measurements;
  onSave: (m: Measurements) => void;
  onClose: () => void;
  /** 3 opens «Check the room» directly, e.g. after the AI has read a floor plan */
  startStep?: 1 | 2 | 3;
  /** info text on «Check the room», e.g. «Read from your floor plan. Check that it looks right.» */
  checkNote?: string;
}) {
  // The tool keeps its state in a ref (like Furnie's component state) and re-renders on every change.
  const st = useRef<{ md: Measurements; ui: Ui }>({
    md: clone(initial),
    ui: { step: startStep, sel: null, add: null, buf: {}, ferr: {}, note: null, err: null },
  });
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const hist = useRef({ undo: [] as Measurements[], redo: [] as Measurements[], noHist: false });
  const dragS = useRef<{ i: number; tf: Tf; el: SVGSVGElement; moved: boolean } | null>(null);
  const moveS = useRef<{ tf: Tf; el: SVGSVGElement; x0: number; y0: number; pts0: Pt[]; moved: boolean } | null>(null);
  const cams = useRef<Record<string, Tf>>({});
  const lenT = useRef<number | null>(null);
  const idN = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  // the list fades at the bottom while there is more to scroll to, so it is clear that it goes on (Synne 26.10, 06P A)
  const [moreBelow, setMoreBelow] = useState(false);
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const check = () => setMoreBelow(sc.scrollHeight - sc.scrollTop - sc.clientHeight > 4);
    check();
    sc.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(sc);
    for (const c of Array.from(sc.children)) ro.observe(c);
    return () => {
      sc.removeEventListener('scroll', check);
      ro.disconnect();
    };
  });
  const [appW, setAppW] = useState(402);
  const wizardRef = useRef<HTMLDivElement>(null);
  /** height of the open sheet, so the drawing can sit right above it */
  const [sheetH, setSheetH] = useState(0);
  const [more, setMore] = useState(false);
  // startStep 3 (check an existing room) used to open the summary; it now opens the same screen
  const [tab, setTab] = useState<Tab>('walls');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const el = wizardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAppW(el.clientWidth || 402));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => lenCancel(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const { md, ui } = st.current;
  const selKey = JSON.stringify(ui.sel);
  useEffect(() => setMore(false), [selKey]);
  useLayoutEffect(() => {
    const el = wizardRef.current?.querySelector<HTMLElement>('.sheet');
    const h = el ? el.offsetHeight : 0;
    if (Math.abs(h - sheetH) > 1) setSheetH(h);
  });
  useEffect(() => {
    if (sheetH > 0) revealPlan();
  }, [sheetH]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- state ---------- */
  function put(nd?: Measurements, patch?: Partial<Ui>) {
    const cur = st.current;
    const prevSel = cur.ui.sel;
    if (nd !== undefined && nd !== cur.md && !hist.current.noHist) {
      hist.current.undo = [...hist.current.undo, clone(cur.md)].slice(-100);
      hist.current.redo = [];
    }
    st.current = { md: nd ?? cur.md, ui: { ...cur.ui, ...(patch || {}) } };
    rerender();
    const sel = st.current.ui.sel;
    // bring the drawing into view when something new is selected (the edit panel covers the bottom)
    if (sel && sel.t !== 'corner' && !sameSel(sel, prevSel)) window.setTimeout(() => revealPlan(), 30);
  }
  const quiet = (nd: Measurements, patch?: Partial<Ui>) => {
    hist.current.noHist = true;
    put(nd, patch);
    hist.current.noHist = false;
  };
  function revealPlan() {
    const sc = scrollRef.current;
    const pl = sc?.querySelector('[data-mf-plan]');
    if (!sc || !pl) return;
    const d = (pl.getBoundingClientRect().top - sc.getBoundingClientRect().top) / phoneScale();
    if (d > 4 || d < -4) sc.scrollTo({ top: sc.scrollTop + d - 4, behavior: 'smooth' });
  }
  function revealTop() {
    window.setTimeout(() => {
      const sc = scrollRef.current;
      const bn = sc?.querySelector('[data-mf-banner]') || sc?.querySelector('[data-mf-plan]');
      if (!sc || !bn) return;
      const d = (bn.getBoundingClientRect().top - sc.getBoundingClientRect().top) / phoneScale();
      if (d < 0 || d > 40) sc.scrollTo({ top: Math.max(0, sc.scrollTop + d - 6), behavior: 'smooth' });
    }, 40);
  }
  function geom(nd: Measurements, patch: Partial<Ui>) {
    round(nd);
    nd.shape = detectShape(nd);
    const extra = fitItems(nd);
    if (patch.note && extra) patch.note += ' ' + extra;
    put(nd, patch);
  }

  /* ---------- wall lengths ---------- */
  function lenCancel() {
    if (lenT.current) {
      window.clearTimeout(lenT.current);
      lenT.current = null;
    }
  }
  function applyWall(i: number, alt: boolean, close?: boolean) {
    const { ui: u, md: m } = st.current;
    const raw = String(u.buf.len || '').trim();
    const v = num(raw);
    const done: Partial<Ui> = close ? { sel: null } : {};
    if (!u.sel || u.sel.t !== 'wall' || u.sel.i !== i) return;
    if (!raw) return put(undefined, { note: null, err: null, ...done });
    if (v == null || isNaN(v) || v < 30 || v > 3000) return put(undefined, { note: null, err: { msg: 'Type a length between 30 and 3000 cm.' } });
    if (v === wallLen(m, i) && !alt) return put(undefined, { err: null, note: null, ...done });
    const r = trySetLength(m, i, v, alt);
    if (!r.ok) {
      const r2 = alt || m.shape === 'rect' || !m.closed || m.pts.length <= 3 ? null : trySetLength(m, i, v, true);
      let msg = r.aff != null ? `That doesn’t fit: with ${v} cm, wall ${wallName(m, r.aff)} would be too short or cross another wall.` : 'That doesn’t fit: the walls would cross each other.';
      if (!r2?.ok) msg += ' Try another length, or drag the corners to change the shape.';
      return put(undefined, { note: null, err: { msg, alt: r2?.ok ? r2.aff : null, wall: i } });
    }
    const nd = r.md;
    const extra = fitItems(nd);
    put(nd, { err: null, note: extra || null, ...done });
  }

  /* ---------- corners and walls ---------- */
  function wallPick(on: boolean) {
    lenCancel();
    put(undefined, { wallPick: on, delPick: null, sel: null, err: null, note: null, add: null });
    if (on) revealTop();
  }
  function split(i: number, t?: number | null) {
    const m = st.current.md;
    const np = m.pts.length;
    const w = wall(m, i);
    if (!m.closed) return;
    if (w.len < 40) return put(undefined, { note: null, err: { msg: `Wall ${wallName(m, i)} is too short to split.` } });
    let tt = t == null ? w.len / 2 : t;
    tt = Math.max(20, Math.min(w.len - 20, Math.round(tt / 10) * 10));
    const mid = { x: Math.round(w.a.x + w.ux * tt), y: Math.round(w.a.y + w.uy * tt) };
    const nd = clone(m);
    replaceCorners(nd, (i + 1) % np, 1, [mid, clone(w.b)]);
    geom(nd, { sel: { t: 'corner', i: (i + 1) % nd.pts.length }, wallPick: false, err: null, note: null });
  }
  function delWallNow(i: number) {
    const m = st.current.md;
    const np = m.pts.length;
    if (np <= 3) return put(undefined, { sel: null, delPick: null, wallPick: false, note: null, err: { msg: 'The room needs at least three corners, so this wall can’t be deleted.' } });
    for (const at of [(i + 1) % np, i]) {
      const nd = clone(m);
      const gone = replaceCorners(nd, at, 1, []);
      round(nd);
      if (!isBad(nd)) return geom(nd, { sel: null, delPick: null, wallPick: false, add: null, err: null, note: gone ? `${gone} item${gone === 1 ? '' : 's'} on the wall ${gone === 1 ? 'was' : 'were'} removed.` : null });
    }
    put(undefined, { sel: null, delPick: null, note: null, err: { msg: 'This wall can’t be deleted – the walls would cross each other.' } });
  }
  function undo() {
    const h = hist.current;
    const prev = h.undo.pop();
    if (!prev) return;
    lenCancel();
    h.redo.push(clone(st.current.md));
    quiet(prev, { sel: null, buf: {}, ferr: {}, err: null, note: null, delPick: null, wallPick: false });
  }
  function redo() {
    const h = hist.current;
    const nxt = h.redo.pop();
    if (!nxt) return;
    lenCancel();
    h.undo.push(clone(st.current.md));
    quiet(nxt, { sel: null, buf: {}, ferr: {}, err: null, note: null, delPick: null, wallPick: false });
  }
  function reset() {
    lenCancel();
    const nd = draft('rect');
    nd.ceil = st.current.md.ceil;
    cams.current = {};
    put(nd, { sel: null, add: null, buf: {}, ferr: {}, err: null, note: null });
  }

  /* ---------- dragging corners and moving the room ---------- */
  function dragStart(i: number, e: React.PointerEvent, tf: Tf) {
    const el = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as SVGSVGElement);
    dragS.current = { i, tf, el, moved: false };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* not supported */
    }
    e.stopPropagation();
    put(undefined, { sel: { t: 'corner', i }, err: null, note: null });
  }
  function dragMove(e: React.PointerEvent) {
    const d = dragS.current;
    if (!d) return;
    const r = d.el.getBoundingClientRect();
    const px = ((e.clientX - r.left) * d.tf.W) / (r.width || d.tf.W);
    const py = ((e.clientY - r.top) * d.tf.H) / (r.height || d.tf.H);
    const x = Math.round((px - d.tf.ox) / d.tf.s / 10) * 10;
    const y = Math.round((py - d.tf.oy) / d.tf.s / 10) * 10;
    const m = st.current.md;
    const p = m.pts[d.i];
    if (p.x === x && p.y === y) return;
    const nd = clone(m);
    nd.pts[d.i] = { x, y };
    if (isBad(nd)) return; // blocked: the walls would cross
    const first = !d.moved;
    d.moved = true;
    nd.shape = detectShape(nd);
    if (first) put(nd);
    else quiet(nd);
  }
  function dragEnd() {
    const d = dragS.current;
    dragS.current = null;
    if (!d) return;
    let m = clone(st.current.md);
    if (!m.closed) {
      const j = clone(m);
      if (joinEnds(j) && !isBad(j)) m = j;
    }
    const extra = fitItems(m);
    m.shape = detectShape(m);
    quiet(m, { note: extra || null });
  }
  function moveStart(e: React.PointerEvent, tf: Tf) {
    const el = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as SVGSVGElement);
    moveS.current = { tf, el, x0: e.clientX, y0: e.clientY, pts0: clone(st.current.md.pts), moved: false };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* not supported */
    }
    lenCancel();
    put(undefined, { sel: null, err: null, note: null });
  }
  function moveMove(e: React.PointerEvent) {
    const d = moveS.current;
    if (!d) return;
    const r = d.el.getBoundingClientRect();
    const k = d.tf.W / (r.width || d.tf.W);
    let dx = Math.round(((e.clientX - d.x0) * k) / d.tf.s / 10) * 10;
    let dy = Math.round(((e.clientY - d.y0) * k) / d.tf.s / 10) * 10;
    const xs = d.pts0.map((p) => p.x);
    const ys = d.pts0.map((p) => p.y);
    const mg = 34;
    const t = d.tf;
    const minDx = (mg - t.ox) / t.s - Math.min(...xs);
    const maxDx = (t.W - mg - t.ox) / t.s - Math.max(...xs);
    const minDy = (mg - t.oy) / t.s - Math.min(...ys);
    const maxDy = (t.H - mg - t.oy) / t.s - Math.max(...ys);
    dx = minDx <= maxDx ? Math.max(minDx, Math.min(maxDx, dx)) : 0;
    dy = minDy <= maxDy ? Math.max(minDy, Math.min(maxDy, dy)) : 0;
    const nd = clone(st.current.md);
    nd.pts = d.pts0.map((p) => ({ x: Math.round((p.x + dx) * 10) / 10, y: Math.round((p.y + dy) * 10) / 10 }));
    if (!d.moved) {
      d.moved = true;
      put(nd);
    } else quiet(nd);
  }

  /* ---------- doors, windows and details ---------- */
  const find = (m: Measurements, sel: Sel | null): Item | null => {
    if (!sel || (sel.t !== 'open' && sel.t !== 'feat')) return null;
    const list: Item[] = sel.t === 'open' ? m.opens : m.feats;
    return list.find((o) => o.id === sel.id) ?? null;
  };
  const bufOf = (o: Item): Record<string, string> => ({
    w: String(o.w),
    dist: String(o.dist),
    sill: o.type === 'window' && o.sill != null ? String(o.sill) : '',
    h: o.type === 'window' && o.h ? String(o.h) : '',
    d: o.type === 'feat' ? String(o.d) : '',
    out: o.type === 'feat' ? String(o.out) : '',
    name: (o.type === 'feat' && o.name) || '',
  });
  function startAdd(kind: AddKind | null) {
    put(undefined, { add: st.current.ui.add === kind ? null : kind, sel: null, err: null, note: null, ferr: {} });
  }
  function place(kind: AddKind, wallIdx: number) {
    const m = st.current.md;
    const nd = clone(m);
    const L = wallLen(m, wallIdx);
    const wl = wallName(m, wallIdx);
    idN.current++;
    const id = 'm' + Date.now().toString(36) + idN.current;
    if (kind === 'door' || kind === 'window') {
      const w = kind === 'door' ? Math.min(90, L - 10) : Math.min(120, L - 20);
      if (w < (kind === 'door' ? 60 : 30)) return put(undefined, { err: { msg: `Wall ${wl} is too short for ${kind === 'door' ? 'a door' : 'a window'}.` } });
      const s = freeSpot(m, wallIdx, w, null);
      if (s === null) return put(undefined, { err: { msg: `There is no room for more openings on wall ${wl}.` } });
      const o: Opening =
        kind === 'door'
          ? { id, type: 'door', wall: wallIdx, w, dist: s, ref: 'a', swing: 'in', hinge: 'a' }
          : { id, type: 'window', wall: wallIdx, w, dist: s, ref: 'a', sill: 90, h: null };
      nd.opens.push(o);
      return put(nd, { add: null, sel: { t: 'open', id }, buf: bufOf(o), ferr: {}, err: null, note: null });
    }
    const k = FEAT_KINDS[kind];
    const fw = Math.min(k.w, L);
    const o: Feature = { id, type: 'feat', kind, wall: wallIdx, w: fw, dist: Math.max(0, Math.round((L - fw) / 2)), ref: 'a', d: k.d, out: k.out, name: kind === 'other' ? '' : undefined };
    if (!featInside(m, o)) {
      o.out = 0;
      o.d = Math.min(o.d, 20);
    }
    nd.feats.push(o);
    put(nd, { add: null, sel: { t: 'feat', id }, buf: bufOf(o), ferr: {}, err: null, note: null });
  }
  function field(f: string, val: string) {
    const { md: m, ui: u } = st.current;
    const o = find(m, u.sel);
    const buf = { ...u.buf, [f]: val };
    if (!o) return put(undefined, { buf });
    const L = wallLen(m, o.wall);
    const ferr: Record<string, string> = {};
    const c = clone(o);
    const ceil = m.ceil === '' ? 0 : m.ceil;
    const w = num(buf.w);
    const dist = num(buf.dist);
    const what = itemName(o);
    if (w === null || isNaN(w) || w < (o.type === 'feat' ? 5 : 30)) ferr.w = 'Type a width' + (o.type === 'feat' ? '.' : ' of at least 30 cm.');
    else if (w > L) ferr.w = `Wall ${wallName(m, o.wall)} is only ${L} cm long.`;
    if (dist === null || isNaN(dist) || dist < 0) ferr.dist = 'Type a distance (0 or more).';
    else if (!ferr.w && w != null && dist + w > L) ferr.dist = `${what} goes past the end of the wall. With a width of ${w} cm the distance can be at most ${L - w} cm.`;
    c.w = w ?? o.w;
    c.dist = dist ?? o.dist;
    if (c.type === 'window') {
      const sill = num(buf.sill);
      const hh = num(buf.h);
      if (sill === null || isNaN(sill) || sill < 0 || sill > 300) ferr.sill = 'Type a height between 0 and 300 cm.';
      if (hh !== null && (isNaN(hh) || hh < 20 || hh > 400)) ferr.h = 'Type a height between 20 and 400 cm, or leave it empty.';
      else if (hh !== null && !ferr.sill && ceil && (sill ?? 0) + hh > ceil) ferr.h = `The window is taller than the ceiling (${ceil} cm).`;
      c.sill = sill;
      c.h = hh;
    }
    if (c.type === 'feat') {
      const d = num(buf.d);
      const out = num(buf.out);
      if (d === null || isNaN(d) || d < 5 || d > 1000) ferr.d = 'Type a depth between 5 and 1000 cm.';
      c.d = d ?? c.d;
      if (c.kind === 'column') {
        if (out === null || isNaN(out) || out < 0) ferr.out = 'Type a distance (0 or more).';
        c.out = out ?? c.out;
      }
      if (c.kind === 'other') c.name = buf.name;
      if (!ferr.w && !ferr.dist && !ferr.d && !ferr.out && !featInside(m, c)) ferr[c.kind === 'column' ? 'out' : 'd'] = `${what} ends up outside the room. Make the depth smaller${c.kind === 'column' ? ' or the distance from the wall shorter.' : '.'}`;
    }
    if (o.type !== 'feat' && !ferr.w && !ferr.dist) {
      const s = c.ref === 'b' ? L - c.w - c.dist : c.dist;
      m.opens.forEach((x) => {
        if (x.id === o.id || x.wall !== o.wall || ferr.dist) return;
        const xs = offsetOf(m, x);
        if (s < xs + x.w && s + c.w > xs) ferr.dist = `Overlaps with the ${x.type === 'door' ? 'door' : 'window'} on the same wall.`;
      });
    }
    if (Object.keys(ferr).length) return put(undefined, { buf, ferr });
    const nd = clone(m);
    if (c.type === 'feat') nd.feats = nd.feats.map((x) => (x.id === c.id ? c : x));
    else nd.opens = nd.opens.map((x) => (x.id === c.id ? c : x));
    put(nd, { buf, ferr: {} });
  }
  function itemSet(patch: Partial<Opening>) {
    const { md: m, ui: u } = st.current;
    const o = find(m, u.sel);
    if (!o) return;
    const nd = clone(m);
    let buf = u.buf;
    const list: Item[] = o.type === 'feat' ? nd.feats : nd.opens;
    for (const it of list)
      if (it.id === o.id) {
        if (patch.ref && patch.ref !== o.ref) {
          it.dist = Math.max(0, wallLen(m, o.wall) - o.w - o.dist);
          buf = { ...buf, dist: String(it.dist) };
        }
        Object.assign(it, patch);
      }
    put(nd, { buf });
  }
  function removeItem(id?: string) {
    const { md: m, ui: u } = st.current;
    const o = id ? [...m.opens, ...m.feats].find((x) => x.id === id) : find(m, u.sel);
    if (!o) return;
    const nd = clone(m);
    nd.opens = nd.opens.filter((x) => x.id !== o.id);
    nd.feats = nd.feats.filter((x) => x.id !== o.id);
    put(nd, { sel: null, ferr: {}, note: `${itemName(o)} is removed.` });
  }
  function select(sel: Sel | null) {
    lenCancel();
    const { md: m, ui: u } = st.current;
    if (u.wallPick && sel?.t === 'wall') return split(sel.i);
    let buf: Record<string, string> = {};
    if (sel?.t === 'wall') buf = { len: String(wallLen(m, sel.i)) };
    else if (sel?.t === 'ceil') buf = { ceil: m.ceil === '' ? '' : String(m.ceil) };
    else if (sel?.t === 'slope') {
      const s = m.slope;
      buf = { from: s ? String(s.from) : '', low: s ? String(s.low) : '', high: s ? String(s.high) : '' };
    } else if (sel) {
      const o = find(m, sel);
      if (o) buf = bufOf(o);
    }
    put(undefined, { sel, buf, ferr: {}, err: null, note: null, add: null, delPick: null });
  }
  function tapWall(i: number, e?: React.MouseEvent, tf?: Tf) {
    const u = st.current.ui;
    if (u.wallPick) {
      let t: number | null = null;
      if (e && tf) {
        const svg = (e.currentTarget as SVGElement).ownerSVGElement!;
        const r = svg.getBoundingClientRect();
        const k = tf.W / (r.width || tf.W);
        const x = ((e.clientX - r.left) * k - tf.ox) / tf.s;
        const y = ((e.clientY - r.top) * k - tf.oy) / tf.s;
        const w = wall(st.current.md, i);
        t = (x - w.a.x) * w.ux + (y - w.a.y) * w.uy;
      }
      return split(i, t);
    }
    if (u.add) return place(u.add, i);
    // tapping a wall goes to its length in the list
    setTab('walls');
    window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-wall-input="${i}"]`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      el?.focus();
    }, 30);
  }
  function setCeil(val: string) {
    const { md: m, ui: u } = st.current;
    const t = val.trim();
    const x = num(t);
    const ferr = { ...u.ferr };
    delete ferr.ceil;
    if (t && (!x || isNaN(x) || x < 180 || x > 600)) {
      ferr.ceil = 'Type a ceiling height between 180 and 600 cm.';
      return put(undefined, { buf: { ...u.buf, ceil: val }, ferr });
    }
    const nd = clone(m);
    nd.ceil = t && x ? x : '';
    put(nd, { buf: { ...u.buf, ceil: val }, ferr });
  }
  function slopeOn() {
    const m = st.current.md;
    const nd = clone(m);
    const ceil = m.ceil === '' ? 250 : m.ceil;
    if (!nd.slope) nd.slope = { wall: 0, from: 120, low: Math.max(100, ceil - 110), high: ceil };
    const s = nd.slope;
    put(nd, { sel: { t: 'slope' }, add: null, buf: { from: String(s.from), low: String(s.low), high: String(s.high) }, ferr: {}, err: null, note: null });
  }
  function slopeField(f: string, val: string) {
    const { md: m, ui: u } = st.current;
    const buf = { ...u.buf, [f]: val };
    if (!m.slope) return;
    const from = num(buf.from) ?? NaN;
    const low = num(buf.low) ?? NaN;
    const high = num(buf.high) ?? NaN;
    const ferr: Record<string, string> = {};
    if (isNaN(low) || low < 50 || low > 600) ferr.low = 'Type a height between 50 and 600 cm.';
    if (isNaN(high) || high < 100 || high > 800) ferr.high = 'Type a height between 100 and 800 cm.';
    else if (!ferr.low && high <= low) ferr.high = `The highest point must be higher than the lowest (${low} cm).`;
    if (isNaN(from) || from < 10 || from > 2000) ferr.from = 'Type a distance between 10 and 2000 cm.';
    if (Object.keys(ferr).length) return put(undefined, { buf, ferr });
    const nd = clone(m);
    nd.slope = { wall: m.slope.wall, from, low, high };
    put(nd, { buf, ferr: {} });
  }
  function slopeWall(i: number) {
    const nd = clone(st.current.md);
    if (!nd.slope) return;
    nd.slope.wall = i;
    put(nd);
  }
  function slopeOff() {
    const nd = clone(st.current.md);
    nd.slope = null;
    put(nd, { sel: null, ferr: {}, note: 'The sloped ceiling is removed.' });
  }

  /* ---------- curved walls ---------- */
  function setCurve(i: number, bulge: number, keepBuf = false) {
    const nd = clone(st.current.md);
    nd.curve = { ...(nd.curve ?? {}) };
    if (bulge) nd.curve[i] = bulge;
    else delete nd.curve[i];
    put(nd, keepBuf ? {} : { buf: { ...st.current.ui.buf, bulge: String(Math.abs(bulge)) } });
  }

  /* ---------- the drawing ---------- */
  function plan(W: number, H: number, opt: { tapWalls: boolean; tapItems: boolean; corners: boolean }) {
    const n = wallCount(md);
    const np = md.pts.length;
    const bx = box(md);
    const fit = (): Tf => {
      const pad = 42;
      const bw = Math.max(bx.x1 - bx.x0, 300);
      const bh = Math.max(bx.y1 - bx.y0, 300);
      // the same zoom on every tab, so the drawing doesn't jump when you switch (Synne 23.10)
      const s = Math.min((W - 2 * pad) / bw, (H - 2 * pad) / bh) * 0.72;
      return { s, W, H, ox: (W - (bx.x1 - bx.x0) * s) / 2 - bx.x0 * s, oy: (H - (bx.y1 - bx.y0) * s) / 2 - bx.y0 * s };
    };
    let tf: Tf;
    const dr = dragS.current;
    const mv = moveS.current;
    if (dr && dr.tf.W === W && dr.tf.H === H) tf = dr.tf;
    else if (mv && mv.tf.W === W && mv.tf.H === H) tf = mv.tf;
    else if (opt.corners) {
      // keep the camera still while editing; refit only when the room leaves the view
      const key = W + 'x' + H;
      let cam = cams.current[key];
      const out = !cam || cam.ox + bx.x0 * cam.s < 10 || cam.ox + bx.x1 * cam.s > W - 10 || cam.oy + bx.y0 * cam.s < 10 || cam.oy + bx.y1 * cam.s > H - 10;
      if (out) cam = cams.current[key] = fit();
      tf = cam;
    } else tf = fit();
    const X = (x: number) => Math.round((tf.ox + x * tf.s) * 10) / 10;
    const Y = (y: number) => Math.round((tf.oy + y * tf.s) * 10) / 10;
    const P = (p: Pt) => X(p.x) + ',' + Y(p.y);
    const sel = ui.sel;
    const kids: ReactNode[] = [];
    const grid = Math.max(4, 50 * tf.s);
    const hasMiss = !!md.miss?.length;
    kids.push(
      <defs key="defs">
        <pattern id="mfGrid" width={grid} height={grid} patternUnits="userSpaceOnUse" x={tf.ox} y={tf.oy}>
          <path d={`M ${grid} 0 L 0 0 0 ${grid}`} fill="none" stroke="var(--color-border-default)" strokeWidth={1} />
        </pattern>
        <pattern id="mfHatch" width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={7} height={7} fill="var(--color-surface-subtle)" />
          <path d="M 0 0 L 0 7" stroke="var(--color-action-accent)" strokeOpacity={0.45} strokeWidth={1.2} />
        </pattern>
        {md.closed && (
          <clipPath id="mfClip">
            <path d={outlinePath(md, P)} />
          </clipPath>
        )}
      </defs>,
      <rect key="grid" x={0} y={0} width={W} height={H} fill="url(#mfGrid)" />,
    );
    if (md.closed && !hasMiss)
      kids.push(
        <path
          key="floor"
          d={outlinePath(md, P)}
          fill="var(--color-plan-floor)"
          style={opt.corners ? { cursor: 'move' } : undefined}
          onPointerDown={opt.corners && !ui.delPick ? (e) => moveStart(e, tf) : undefined}
        />,
      );
    if (md.closed && md.slope && md.slope.wall < n) {
      const sw = wall(md, md.slope.wall);
      const sn = inward(md, md.slope.wall);
      const f = md.slope.from;
      const ext = 2000;
      const q = [
        { x: sw.a.x - sw.ux * ext, y: sw.a.y - sw.uy * ext },
        { x: sw.b.x + sw.ux * ext, y: sw.b.y + sw.uy * ext },
      ];
      const band = [q[0], q[1], { x: q[1].x + sn.x * f, y: q[1].y + sn.y * f }, { x: q[0].x + sn.x * f, y: q[0].y + sn.y * f }];
      const on = sel?.t === 'slope';
      kids.push(
        <g key="slope" clipPath="url(#mfClip)">
          <polygon points={band.map(P).join(' ')} fill="url(#mfHatch)" stroke={on ? 'var(--color-text-primary)' : 'var(--color-action-accent)'} strokeWidth={on ? 2 : 1} strokeDasharray="5 4" />
        </g>,
      );
      const mid = { x: (sw.a.x + sw.b.x) / 2 + (sn.x * f) / 2, y: (sw.a.y + sw.b.y) / 2 + (sn.y * f) / 2 };
      kids.push(
        <text key="slopeT" x={X(mid.x)} y={Y(mid.y) + 4} textAnchor="middle" className="mf-svg-label is-accent">
          Sloped {md.slope.low}–{md.slope.high}
        </text>,
      );
      if (opt.tapItems) kids.push(<polygon key="slopeHit" points={band.map(P).join(' ')} clipPath="url(#mfClip)" fill="transparent" style={{ cursor: 'pointer' }} onClick={() => select({ t: 'slope' })} />);
    }
    md.feats.forEach((o) => {
      if (o.wall >= n) return;
      const r = featRect(md, o);
      const on = sel?.t === 'feat' && sel.id === o.id;
      kids.push(
        <polygon
          key={'f' + o.id}
          points={r.map(P).join(' ')}
          fill={o.kind === 'column' ? 'var(--color-border-strong)' : 'var(--color-surface-subtle)'}
          stroke={on ? 'var(--color-text-primary)' : 'var(--color-action-accent)'}
          strokeWidth={on ? 2.2 : 1.2}
          strokeDasharray={o.kind === 'niche' ? '4 3' : undefined}
          style={{ cursor: opt.tapItems ? 'pointer' : 'default' }}
          onClick={
            opt.tapItems
              ? (e) => {
                  e.stopPropagation();
                  select({ t: 'feat', id: o.id });
                }
              : undefined
          }
        />,
      );
      const cx = (r[0].x + r[2].x) / 2;
      const cy = (r[0].y + r[2].y) / 2;
      const lab = featName(o);
      if (Math.min(o.w, o.d) * tf.s > 14 || o.w * tf.s > lab.length * 6)
        kids.push(
          <text key={'ft' + o.id} x={X(cx)} y={Y(cy) + 3.5} textAnchor="middle" className="mf-svg-label is-accent is-small">
            {lab.length > 12 ? lab.slice(0, 11) + '…' : lab}
          </text>,
        );
    });
    for (let k = 0; k < n; k++) {
      if (isMissing(md, k)) continue;
      const on = ((sel?.t === 'wall' || sel?.t === 'wallEdit') && sel.i === k) || ui.delPick?.i === k;
      kids.push(<path key={'w' + k} d={wallPath(md, k, P)} fill="none" stroke={on ? 'var(--color-action-accent)' : 'var(--color-text-primary)'} strokeWidth={on ? 7 : 5} strokeLinecap="round" />);
    }
    md.opens.forEach((o) => {
      if (o.wall >= n) return;
      const w = wall(md, o.wall);
      const nn = inward(md, o.wall);
      const s = offsetOf(md, o);
      const on = sel?.t === 'open' && sel.id === o.id;
      const a = { x: w.a.x + w.ux * s, y: w.a.y + w.uy * s };
      const b = { x: w.a.x + w.ux * (s + o.w), y: w.a.y + w.uy * (s + o.w) };
      const g: ReactNode[] = [];
      if (o.type === 'door') {
        g.push(<line key="gap" x1={X(a.x)} y1={Y(a.y)} x2={X(b.x)} y2={Y(b.y)} stroke="var(--color-background-default)" strokeWidth={7} />);
        const hinge = o.hinge === 'b' ? b : a;
        const other = o.hinge === 'b' ? a : b;
        const dir = o.swing === 'out' ? -1 : 1;
        const tip = { x: hinge.x + nn.x * o.w * dir, y: hinge.y + nn.y * o.w * dir };
        const r = o.w * tf.s;
        const c2 = cross(other.x - hinge.x, other.y - hinge.y, tip.x - hinge.x, tip.y - hinge.y);
        g.push(<line key="leaf" x1={X(hinge.x)} y1={Y(hinge.y)} x2={X(tip.x)} y2={Y(tip.y)} stroke={on ? 'var(--color-action-accent)' : 'var(--color-text-primary)'} strokeWidth={on ? 2.5 : 1.8} />);
        g.push(<path key="arc" d={`M ${P(tip)} A ${r} ${r} 0 0 ${c2 > 0 ? 0 : 1} ${P(other)}`} fill="none" stroke={on ? 'var(--color-action-accent)' : 'var(--color-text-secondary)'} strokeWidth={1.2} strokeDasharray="4 3" />);
      } else {
        g.push(<line key="win" x1={X(a.x)} y1={Y(a.y)} x2={X(b.x)} y2={Y(b.y)} stroke={on ? 'var(--color-action-accent)' : 'var(--color-text-primary)'} strokeWidth={on ? 9 : 7} />);
        g.push(<line key="glass" x1={X(a.x)} y1={Y(a.y)} x2={X(b.x)} y2={Y(b.y)} stroke="var(--color-action-secondary)" strokeWidth={on ? 5 : 4} />);
        g.push(<line key="pane" x1={X(a.x)} y1={Y(a.y)} x2={X(b.x)} y2={Y(b.y)} stroke="var(--color-text-secondary)" strokeWidth={1} />);
      }
      kids.push(
        <g key={'o' + o.id} aria-label={`${o.type === 'door' ? 'Door' : 'Window'} on wall ${wallName(md, o.wall)}`}>
          {g}
        </g>,
      );
    });
    if (opt.tapWalls)
      for (let k = 0; k < n; k++) {
        if (isMissing(md, k)) continue;
        kids.push(
          <path
            key={'wh' + k}
            className={ui.wallPick ? 'mf-hit is-pick' : ui.add ? 'mf-hit is-add' : 'mf-hit'}
            d={wallPath(md, k, P)}
            fill="none"
            strokeWidth={24}
            strokeLinecap="round"
            onClick={(e) => tapWall(k, e, tf)}
          />,
        );
      }
    if (md.opens.length && opt.tapItems && !ui.add)
      md.opens.forEach((o) => {
        if (o.wall >= n) return;
        const w = wall(md, o.wall);
        const s = offsetOf(md, o);
        kids.push(
          <line
            key={'oh' + o.id}
            x1={X(w.a.x + w.ux * s)}
            y1={Y(w.a.y + w.uy * s)}
            x2={X(w.a.x + w.ux * (s + o.w))}
            y2={Y(w.a.y + w.uy * (s + o.w))}
            stroke="transparent"
            strokeWidth={26}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              select({ t: 'open', id: o.id });
            }}
          />,
        );
      });
    const sg = signedArea(md) >= 0 ? 1 : -1;
    for (let k = 0; k < n; k++) {
      if (isMissing(md, k)) continue;
      const wl = wall(md, k);
      const onw = (sel?.t === 'wall' || sel?.t === 'wallEdit') && sel.i === k;
      // a curved wall's label sits by the peak of the curve
      const mid = curveOf(md, k) ? curvePeak(md, k) : { x: (wl.a.x + wl.b.x) / 2, y: (wl.a.y + wl.b.y) / 2 };
      const lx = X(mid.x) + wl.uy * sg * 20;
      const ly = Y(mid.y) - wl.ux * sg * 20;
      const txt = `${wallName(md, k)}  ${Math.round(wl.len)}`;
      const tw = txt.length * 6.3 + 12;
      kids.push(
        <g key={'lb' + k} style={{ cursor: opt.tapWalls ? 'pointer' : 'default' }} onClick={opt.tapWalls ? () => tapWall(k) : undefined}>
          <rect x={lx - tw / 2} y={ly - 10} width={tw} height={20} rx={10} fill={onw ? 'var(--color-action-accent)' : 'var(--color-surface-raised)'} stroke={onw ? 'var(--color-action-accent)' : 'var(--color-border-strong)'} strokeWidth={1} />
          <text x={lx} y={ly + 4} textAnchor="middle" className={'mf-svg-label' + (onw ? ' is-on' : '')}>
            {txt}
          </text>
        </g>,
      );
    }
    if (opt.corners)
      md.pts.forEach((p, i) => {
        if (hasMiss && isMissing(md, i) && isMissing(md, (i - 1 + np) % np)) return;
        const on = sel?.t === 'corner' && sel.i === i;
        kids.push(
          <g key={'c' + i} style={{ cursor: 'grab', touchAction: 'none' }} aria-label={`Corner ${i + 1} – drag to move`} onPointerDown={(e) => dragStart(i, e, tf)}>
            <circle cx={X(p.x)} cy={Y(p.y)} r={24} fill="transparent" />
            <circle cx={X(p.x)} cy={Y(p.y)} r={on ? 9 : 7.5} fill={on ? 'var(--color-action-accent)' : 'var(--color-surface-raised)'} stroke="var(--color-action-accent)" strokeWidth={2.5} />
          </g>,
        );
      });
    if (!md.closed && np >= 3)
      kids.push(<line key="closeHint" x1={X(md.pts[np - 1].x)} y1={Y(md.pts[np - 1].y)} x2={X(md.pts[0].x)} y2={Y(md.pts[0].y)} stroke="var(--color-action-accent)" strokeWidth={1.5} strokeDasharray="5 5" pointerEvents="none" />);
    return (
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Floor plan: ${summary(md)}`}
        className={'mf-svg' + (opt.corners ? ' is-editable' : '')}
        onPointerMove={opt.corners ? (e) => (moveS.current ? moveMove(e) : dragMove(e)) : undefined}
        onPointerUp={opt.corners ? () => (moveS.current ? (moveS.current = null) : dragEnd()) : undefined}
        onPointerCancel={opt.corners ? () => (moveS.current ? (moveS.current = null) : dragEnd()) : undefined}
      >
        {kids}
      </svg>
    );
  }

  /* ---------- screen (Figma 06L W1D, Synne 23.10): one screen, no steps ---------- */
  // The drawing stays at the top; under it one panel with tabs (Walls · Ceiling · Additional) and a list that scrolls
  // on its own. Values are typed straight into the list; doors, windows and the sloped ceiling open a small sheet.
  const planW = Math.max(260, appW - 32 - 2);
  // the drawing keeps its size, so nothing below it jumps (Synne 23.10)
  let planH = 300;
  if (sheetH > 0 && wizardRef.current) {
    const above = wizardRef.current.clientHeight - sheetH - 200;
    planH = Math.max(150, Math.min(planH, above));
  }
  const items: Item[] = [...md.opens, ...md.feats];
  const canUndo = hist.current.undo.length > 0;
  const canRedo = hist.current.redo.length > 0;

  const unit = (label: string, key: string, value: string | undefined, onChange: (v: string) => void, err?: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label key={key} className="mf-field">
      <span className="field-label">{label}</span>
      <span className={'input input-unit' + (err ? ' is-invalid' : '')}>
        <input type="text" inputMode="numeric" value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-invalid={err ? true : undefined} {...extra} />
        <span>cm</span>
      </span>
      {err && (
        <span className="mf-field-err" role="alert">
          {err}
        </span>
      )}
    </label>
  );
  const seg = (key: string, label: string, opts: [string, string][], val: string | undefined, on: (v: string) => void) => (
    <div key={key} className="mf-seg-wrap">
      <span className="field-label">{label}</span>
      <div className="mf-seg" role="group" aria-label={label}>
        {opts.map(([v, l]) => (
          <button key={v} aria-pressed={val === v} onClick={() => on(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
  const notes = () => (
    <>
      {ui.err && (
        <div className="mf-msg is-error" role="alert">
          <Icon name="warning" size={16} />
          <span>
            {ui.err.msg}
            {ui.err.alt != null && ui.err.wall != null && (
              <button className="mf-inline-btn" onClick={() => applyWall(ui.err!.wall!, true)}>
                Adjust wall {wallName(md, ui.err.alt)} instead
              </button>
            )}
          </span>
        </div>
      )}
      {ui.note && (
        <div className="mf-msg" role="status">
          <Icon name="lightbulb" size={16} />
          <span>{ui.note}</span>
        </div>
      )}
    </>
  );
  /** a short instruction with Cancel, while the user taps a wall in the drawing */
  const pickHint = (text: string, onCancel: () => void) => (
    <div className="mf-pick" role="status">
      <span>{text}</span>
      <button className="mf-info-action" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
  const itemLabel = (o: Item) => (o.type === 'door' ? 'Door' : o.type === 'window' ? 'Window' : featName(o as Feature));
  const numInput = (id: string, value: string, onFocus: (e: React.FocusEvent<HTMLInputElement>) => void, onChange: (v: string) => void, onBlur: () => void, label: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <span className="mf-num">
      <input
        id={id}
        inputMode="numeric"
        value={value}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label={label}
        {...extra}
      />
      <span>cm</span>
    </span>
  );

  const n = wallCount(md);
  let list: ReactNode;
  if (tab === 'walls') {
    list = (
      <>
        {ui.wallPick && pickHint('Tap the wall where you want a new corner.', () => wallPick(false))}
        {Array.from({ length: n }, (_, i) => i)
          .filter((i) => !isMissing(md, i))
          .map((i) => {
            const on = ui.sel?.t === 'wall' && ui.sel.i === i;
            const val = on ? (ui.buf.len ?? '') : String(wallLen(md, i));
            return (
              <div key={i} className={'mf-row' + (on ? ' is-on' : '')}>
                {/* the letter and name open the wall's sheet: straight or curved, and Remove */}
                <button className="mf-row-open" onClick={() => select({ t: 'wallEdit', i })} aria-label={`Wall ${wallName(md, i)}: shape and more`}>
                  <span className="mf-badge">{wallName(md, i)}</span>
                  <span className="mf-row-label">
                    Wall {wallName(md, i)}
                    {curveOf(md, i) !== 0 && <small>Curved</small>}
                  </span>
                </button>
                {numInput(
                  `wall-${i}`,
                  val,
                  (e) => {
                    put(undefined, { sel: { t: 'wall', i }, buf: { len: String(wallLen(md, i)) }, err: null, note: null });
                    e.currentTarget.select();
                  },
                  (v) => put(undefined, { buf: { ...st.current.ui.buf, len: v }, err: null }),
                  () => st.current.ui.sel?.t === 'wall' && st.current.ui.sel.i === i && applyWall(i, false, true),
                  `Length of wall ${wallName(md, i)} in centimetres`,
                  { 'data-wall-input': i } as React.InputHTMLAttributes<HTMLInputElement>,
                )}
              </div>
            );
          })}
        {/* «Add corner» set apart from the walls: a line above and wine-red text (Synne 26.10, 06P A) */}
        <button className={'mf-row mf-row-add is-accent' + (ui.wallPick ? ' is-on' : '')} aria-pressed={!!ui.wallPick} onClick={() => wallPick(!ui.wallPick)}>
          <Icon name="add" size={20} />
          <span className="mf-row-label">Add corner</span>
        </button>
      </>
    );
  } else if (tab === 'ceiling') {
    list = (
      <>
        <div className="mf-row">
          <label className="mf-row-label" htmlFor="ceil-height">
            Ceiling height
          </label>
          {numInput('ceil-height', ui.buf.ceil ?? (md.ceil === '' ? '' : String(md.ceil)), () => undefined, setCeil, () => undefined, 'Ceiling height in centimetres', { placeholder: String(STANDARD_CEIL) })}
        </div>
        {ui.ferr.ceil && (
          <p className="mf-row-err" role="alert">
            {ui.ferr.ceil}
          </p>
        )}
        <button className="mf-row" onClick={() => (md.slope ? select({ t: 'slope' }) : slopeOn())}>
          <span className="mf-row-label">Sloped ceiling</span>
          <span className="mf-row-value">{md.slope ? `${md.slope.low}–${md.slope.high} cm` : 'None'}</span>
          <Icon name="chevron_right" size={20} />
        </button>
      </>
    );
  } else {
    list = (
      <>
        {ui.add && pickHint(`Tap the wall the ${addName(ui.add)} is on.`, () => startAdd(null))}
        {/* what is in the room under ADDED, and what can be added under ADD MORE – like Room settings (Synne 26.10, 06P A) */}
        {items.length > 0 && <h3 className="group-heading mf-list-heading">Added · {items.length}</h3>}
        {items.map((o) => {
          const on = (ui.sel?.t === 'open' || ui.sel?.t === 'feat') && ui.sel.id === o.id;
          return (
            <button key={o.id} className={'mf-row' + (on ? ' is-on' : '')} onClick={() => select({ t: o.type === 'feat' ? 'feat' : 'open', id: o.id })} aria-label={`${itemLabel(o)} on wall ${wallName(md, o.wall)}, ${o.w} cm. Change`}>
              <span className="mf-badge">{wallName(md, o.wall)}</span>
              <span className="mf-row-label">{itemLabel(o)}</span>
              <span className="mf-row-value">{o.w} cm</span>
              <Icon name="chevron_right" size={20} />
            </button>
          );
        })}
        <h3 className="group-heading mf-list-heading">Add more</h3>
        {QUICK_ADD.map(([k, label]) => (
          <button key={k} className={'mf-row mf-row-more' + (ui.add === k ? ' is-on' : '')} aria-pressed={ui.add === k} onClick={() => startAdd(k)}>
            <Icon name="add" size={20} />
            <span className="mf-row-label">{label}</span>
          </button>
        ))}
        <button className="mf-row mf-row-more" onClick={() => setAdding(true)}>
          <Icon name="add" size={20} />
          <span className="mf-row-label">More – column, fireplace, niche …</span>
        </button>
      </>
    );
  }

  /* sheets: X closes, ✓ confirms (adjusting something, rule 22.10) */
  let sheet: ReactNode = null;
  const sel = ui.sel;
  if (adding) {
    sheet = (
      <BottomSheet title="Add to the room" onClose={() => setAdding(false)}>
        <div className="mf-sheet">
          {ADD_GROUPS.map(([title, kinds]) => (
            <section key={title}>
              <h3 className="group-heading">{title}</h3>
              <div className="chips">
                {kinds.map(([k, label]) => (
                  <button
                    key={k}
                    className="chip"
                    onClick={() => {
                      setAdding(false);
                      startAdd(k);
                    }}
                  >
                    <Icon name="add" size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </BottomSheet>
    );
  } else if (sel?.t === 'wallEdit') {
    const i = sel.i;
    const b = curveOf(md, i);
    sheet = (
      <BottomSheet title={`Wall ${wallName(md, i)}`} onClose={() => select(null)} onConfirm={() => select(null)} confirmLabel="Done">
        <div className="mf-sheet">
          {seg('shape', 'Shape', [['straight', 'Straight'], ['curved', 'Curved']], b ? 'curved' : 'straight', (v) => setCurve(i, v === 'curved' ? Math.round(Math.min(120, wallLen(md, i) / 4)) : 0))}
          {b !== 0 && (
            <>
              {seg('dir', 'Curves', [['out', 'Outwards'], ['in', 'Into the room']], b > 0 ? 'out' : 'in', (v) => setCurve(i, (v === 'out' ? 1 : -1) * Math.abs(b)))}
              {unit('How far the middle curves', 'bulge', ui.buf.bulge ?? String(Math.abs(b)), (v) => {
                const x = num(v);
                put(undefined, { buf: { ...st.current.ui.buf, bulge: v } });
                if (x && !isNaN(x) && x >= 5 && x <= wallLen(md, i) / 2) setCurve(i, Math.sign(b) * x, true);
              })}
            </>
          )}
          {notes()}
          {n > 3 && (
            <button className="mf-remove" onClick={() => delWallNow(i)}>
              <Icon name="delete" size={20} />
              Remove wall {wallName(md, i)}
            </button>
          )}
        </div>
      </BottomSheet>
    );
  } else if (sel?.t === 'slope' && md.slope) {
    const fe = ui.ferr;
    sheet = (
      <BottomSheet title="Sloped ceiling" onClose={() => select(null)} onConfirm={() => select(null)} confirmLabel="Done">
        <div className="mf-sheet">
          <div className="mf-grid2">
            {unit('Lowest height', 'low', ui.buf.low, (v) => slopeField('low', v), fe.low)}
            {unit('Highest height', 'high', ui.buf.high, (v) => slopeField('high', v), fe.high)}
          </div>
          {seg('w', 'Slopes down towards wall', Array.from({ length: wallCount(md) }, (_, q) => [String(q), wallName(md, q)] as [string, string]), String(md.slope.wall), (v) => slopeWall(Number(v)))}
          {unit('The slope starts this far from the wall', 'from', ui.buf.from, (v) => slopeField('from', v), fe.from)}
          {notes()}
          <button className="mf-remove" onClick={slopeOff}>
            <Icon name="delete" size={20} />
            Remove sloped ceiling
          </button>
        </div>
      </BottomSheet>
    );
  } else if (sel && (sel.t === 'open' || sel.t === 'feat')) {
    const o = find(md, sel);
    if (o) {
      const fe = ui.ferr;
      const prevW = wallName(md, (o.wall - 1 + n) % n);
      const nextW = wallName(md, (o.wall + 1) % n);
      const basic: ReactNode[] = [unit('Width', 'w', ui.buf.w, (v) => field('w', v), fe.w), unit(`From corner ${o.ref === 'b' ? nextW : prevW}`, 'dist', ui.buf.dist, (v) => field('dist', v), fe.dist)];
      const extra: ReactNode[] = [];
      if (o.type === 'window') {
        extra.push(unit('Floor to sill', 'sill', ui.buf.sill, (v) => field('sill', v), fe.sill));
        extra.push(unit('Window height', 'h', ui.buf.h, (v) => field('h', v), fe.h, { placeholder: 'Optional' }));
      }
      if (o.type === 'feat' && !['light', 'outlet'].includes(o.kind)) {
        extra.push(unit(o.kind === 'niche' ? 'Depth into the wall' : 'Depth', 'd', ui.buf.d, (v) => field('d', v), fe.d));
        if (o.kind === 'column') extra.push(unit('From the wall', 'out', ui.buf.out, (v) => field('out', v), fe.out));
      }
      const extraErr = ['sill', 'h', 'd', 'out'].some((k) => fe[k]);
      const showMore = more || extraErr;
      // compact sheet: the drawing above stays visible (Synne 18.10); the rest is under «More options»
      sheet = (
        <BottomSheet title={`${itemLabel(o)} on wall ${wallName(md, o.wall)}`} onClose={() => select(null)} onConfirm={() => select(null)} confirmLabel="Done">
          <div className="mf-sheet mf-sheet-compact">
            {o.type === 'feat' && o.kind === 'other' && (
              <label className="mf-field">
                <span className="field-label">Name</span>
                <input className="input" type="text" value={ui.buf.name || ''} placeholder="E.g. Pipe" onChange={(e) => field('name', e.target.value)} />
              </label>
            )}
            <div className="mf-grid2">{basic}</div>
            {showMore && (
              <>
                {extra.length > 0 && <div className="mf-grid2">{extra}</div>}
                {seg('ref', 'Measured from', [['a', 'Corner ' + prevW], ['b', 'Corner ' + nextW]], o.ref, (r) => itemSet({ ref: r as 'a' | 'b' }))}
                {o.type === 'door' && (
                  <div className="mf-grid2">
                    {seg('swing', 'Opens', [['in', 'Inwards'], ['out', 'Outwards']], o.swing, (v) => itemSet({ swing: v as 'in' | 'out' }))}
                    {seg('hinge', 'Hinges at', [['a', 'Wall ' + prevW], ['b', 'Wall ' + nextW]], o.hinge, (v) => itemSet({ hinge: v as 'a' | 'b' }))}
                  </div>
                )}
              </>
            )}
            {!showMore && (
              <button className="mf-more-btn" aria-expanded={false} onClick={() => setMore(true)}>
                More options
                <Icon name="chevron_down" size={18} />
              </button>
            )}
            {notes()}
            <button className="mf-remove" onClick={() => removeItem()}>
              <Icon name="delete" size={20} />
              Remove {itemLabel(o).toLowerCase()}
            </button>
          </div>
        </BottomSheet>
      );
    }
  }

  const TABS: [Tab, string][] = [
    ['walls', 'Walls'],
    ['ceiling', 'Ceiling'],
    ['more', 'Additional'], // was «Doors & more» (Synne 26.10)
  ];
  const save = () => {
    lenCancel();
    if (!isComplete(st.current.md)) {
      setTab('walls');
      put(undefined, { err: { msg: st.current.md.miss?.length ? 'The room is open. Add the missing wall before you save.' : 'The walls cross each other or are too short. Move a corner first.' }, note: null });
      return;
    }
    const out = clone(st.current.md);
    // an empty ceiling height means the standard one
    if (out.ceil === '') out.ceil = STANDARD_CEIL;
    onSave(out);
  };

  return (
    <div ref={wizardRef} className={'screen-overlay wizard mf-screen' + (asSheet ? ' mf-as-sheet' : '')} role="dialog" aria-modal="true" aria-label={asSheet?.title ?? 'Measurements'}>
      {asSheet ? (
        <>
          <div className="sheet-handle" aria-hidden>
            <span />
          </div>
          <header className="sheet-head">
            <IconButton icon="chevron_left" label="Back" variant="glass" iconSize={20} onClick={asSheet.onBack} />
            <h2 className="sheet-title">{asSheet.title}</h2>
            <IconButton icon="close" label="Close" variant="glass" iconSize={20} onClick={asSheet.onClose} />
          </header>
        </>
      ) : (
        <header className="topbar">
          <IconButton icon="chevron_left" label="Back" onClick={onClose} />
          <h1 className="topbar-title-static">Measurements</h1>
          <span className="topbar-spacer" />
        </header>
      )}
      <div className="mf-body">
        <div className="mf-summary">
          <strong>{md.closed ? `${m2(area(md))} m²` : 'Not closed yet'}</strong>
          <span>
            {n} walls · ceiling {md.ceil || STANDARD_CEIL} cm
          </span>
        </div>
        {checkNote && <p className="mf-check-note">{checkNote}</p>}
        <div data-mf-plan="1" className="mf-plan">
          {plan(planW, planH, { tapWalls: true, tapItems: tab === 'more', corners: tab === 'walls' })}
          <div className="mf-plan-tools">
            <IconButton icon="undo" label="Undo" iconSize={18} disabled={!canUndo} onClick={undo} />
            <span className="flip-x">
              <IconButton icon="undo" label="Redo" iconSize={18} disabled={!canRedo} onClick={redo} />
            </span>
          </div>
          {!isDefault(md) && tab === 'walls' && (
            <button className="mf-plan-reset" onClick={reset}>
              Reset
            </button>
          )}
        </div>
        <section className="mf-box" aria-label="Measurements">
          <SegmentedTabs
            tabs={TABS.map(([id, label]) => ({ id, label }))}
            value={tab}
            idPrefix="mf-tab"
            controls="mf-box-list"
            onChange={(t) => {
              lenCancel();
              setTab(t);
              put(undefined, { sel: null, add: null, wallPick: false, err: null, note: null, ferr: {} });
            }}
          />
          <div ref={scrollRef} className={'mf-box-list' + (moreBelow ? ' has-more' : '')} role="tabpanel" id="mf-box-list" aria-labelledby={`mf-tab-${tab}`}>
            {list}
            {!sheet && (ui.err || ui.note) && <div className="mf-notes">{notes()}</div>}
          </div>
        </section>
      </div>
      <footer className="wizard-foot">
        <Button block onClick={save}>
          Save measurements
        </Button>
      </footer>
      {sheet}
    </div>
  );
}
