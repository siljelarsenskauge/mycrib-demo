import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { doorSwing } from '../state/geometry';
import { uid } from '../state/seed';
import type { Fixture, FixtureKind, RoomWall } from '../state/types';

/** The measurements the AI "found" in a scan or floor plan. All in cm. */
export interface RoomMeasures {
  width: number; // the window wall (top in the plan)
  depth: number; // the door wall (left in the plan)
  wallRight: number; // the wall opposite the door
  wallBottom: number; // the wall opposite the window
  height: number; // ceiling
  windowLength: number;
  windowOffset: number; // from the left corner of the window wall
  windowHeight: number;
  windowSill: number; // from the floor to the bottom of the window
  doorLength: number;
  doorOffset: number; // from the window wall, along the door wall
  doorHeight: number;
  doorOpensOut: boolean;
  doorHinge: 'start' | 'end';
  /** outlets, lights, extra windows, radiators */
  fixtures: Fixture[];
}

/** the measurements that are numbers (and get an input in the drawing) */
type Key = Exclude<keyof RoomMeasures, 'doorOpensOut' | 'doorHinge' | 'fixtures'>;
/** the floor plan, or one of the four walls seen from the front */
type View = 'plan' | RoomWall;

const VIEWS: { id: View; label: string }[] = [
  { id: 'plan', label: 'Ovenfra' },
  { id: 'back', label: 'Vindusveggen' },
  { id: 'left', label: 'Veggen med døren' },
  { id: 'right', label: 'Veggen overfor døren' },
  { id: 'front', label: 'Veggen overfor vinduet' },
];

const LABELS: Record<Key, string> = {
  width: 'Vindusveggen',
  depth: 'Veggen med døren',
  wallRight: 'Veggen overfor døren',
  wallBottom: 'Veggen overfor vinduet',
  height: 'Takhøyde',
  windowLength: 'Vinduets bredde',
  windowOffset: 'Vinduets avstand fra hjørnet',
  windowHeight: 'Vinduets høyde',
  windowSill: 'Vinduets høyde fra gulvet',
  doorLength: 'Dørens bredde',
  doorOffset: 'Dørens avstand fra vindusveggen',
  doorHeight: 'Dørens høyde',
};

/** Where an input sits in the drawing, in drawing units (cm). */
interface Anchor {
  key: Key;
  x: number;
  y: number;
}

interface Layout {
  box: { x: number; y: number; w: number; h: number }; // viewBox
  body: ReactNode;
  anchors: Anchor[];
}

const PAD = 110;

export const FIXTURES: { kind: FixtureKind; label: string; plural: string; hint: string }[] = [
  { kind: 'outlet', label: 'Stikkontakt', plural: 'stikkontakter', hint: 'Trykk på veggen der stikkontakten er' },
  { kind: 'light', label: 'Lys', plural: 'lys', hint: 'Trykk der lampen henger i taket' },
  { kind: 'window', label: 'Vindu', plural: 'ekstra vinduer', hint: 'Trykk på veggen der vinduet er' },
  { kind: 'radiator', label: 'Radiator', plural: 'radiatorer', hint: 'Trykk på veggen der radiatoren står' },
];
const EXTRA_WINDOW = 100; // cm
const RADIATOR = 80; // cm

/** The four walls of the measured shape (top-left corner fixed; the right wall may be slanted). */
function wallLines(m: RoomMeasures): Record<RoomWall, { a: [number, number]; b: [number, number] }> {
  const t = Math.max(m.width, 100);
  const l = Math.max(m.depth, 100);
  const b = Math.max(m.wallBottom, 100);
  return {
    back: { a: [0, 0], b: [t, 0] },
    left: { a: [0, 0], b: [0, l] },
    right: { a: [t, 0], b: [b, l] },
    front: { a: [0, l], b: [b, l] },
  };
}

/** Point `offset` cm along a wall, plus the wall's direction (unit vector). */
function onWall(m: RoomMeasures, wall: RoomWall, offset: number) {
  const { a, b } = wallLines(m)[wall];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  const o = Math.max(0, Math.min(len, offset));
  return { x: a[0] + ux * o, y: a[1] + uy * o, ux, uy, len };
}

/** Nearest wall to a tapped point, and how far along it. */
function nearestWall(m: RoomMeasures, x: number, y: number): { wall: RoomWall; offset: number } {
  let best: { wall: RoomWall; offset: number; d: number } | null = null;
  for (const [wall, { a, b }] of Object.entries(wallLines(m)) as [RoomWall, { a: [number, number]; b: [number, number] }][]) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / len;
    const uy = (b[1] - a[1]) / len;
    const o = Math.max(0, Math.min(len, (x - a[0]) * ux + (y - a[1]) * uy));
    const d = Math.hypot(a[0] + ux * o - x, a[1] + uy * o - y);
    if (!best || d < best.d) best = { wall, offset: Math.round(o), d };
  }
  return { wall: best!.wall, offset: best!.offset };
}

/** Plan symbol for an outlet, light, window or radiator. */
function FixtureSymbol({ f, m, selected, onSelect }: { f: Fixture; m: RoomMeasures; selected: boolean; onSelect: () => void }) {
  const stroke = { stroke: 'var(--ink)', strokeWidth: selected ? 3 : 1.6, vectorEffect: 'non-scaling-stroke' as const };
  let shape: ReactNode;
  if (f.kind === 'light') {
    const x = f.x ?? 0;
    const y = f.y ?? 0;
    shape = (
      <g>
        <circle cx={x} cy={y} r={16} fill="var(--bg)" {...stroke} />
        <line x1={x - 11} y1={y - 11} x2={x + 11} y2={y + 11} {...stroke} />
        <line x1={x - 11} y1={y + 11} x2={x + 11} y2={y - 11} {...stroke} />
      </g>
    );
  } else {
    const p = onWall(m, f.wall ?? 'back', f.offset ?? 0);
    const angle = (Math.atan2(p.uy, p.ux) * 180) / Math.PI;
    shape = (
      <g transform={`translate(${p.x} ${p.y}) rotate(${angle})`}>
        {f.kind === 'outlet' && (
          <>
            <circle cx={0} cy={0} r={13} fill="var(--bg)" {...stroke} />
            <line x1={-4} y1={-5} x2={-4} y2={5} {...stroke} />
            <line x1={4} y1={-5} x2={4} y2={5} {...stroke} />
          </>
        )}
        {f.kind === 'window' && <rect x={-EXTRA_WINDOW / 2} y={-6} width={EXTRA_WINDOW} height={12} fill="var(--room-window)" {...stroke} />}
        {f.kind === 'radiator' && <rect x={-RADIATOR / 2} y={4} width={RADIATOR} height={14} fill="var(--surface-2)" strokeDasharray="4 3" {...stroke} />}
      </g>
    );
  }
  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`${FIXTURES.find((x) => x.kind === f.kind)!.label} – trykk for å velge`}
    >
      {shape}
    </g>
  );
}

const TOLERANCE = 5; // cm

/** With the other three walls fixed, how long the wall opposite the door must be. */
export const expectedRightWall = (m: RoomMeasures) => Math.round(Math.hypot(m.wallBottom - m.width, m.depth));
export const rightWallFits = (m: RoomMeasures) => Math.abs(expectedRightWall(m) - m.wallRight) <= TOLERANCE;

const dashed = (x1: number, y1: number, x2: number, y2: number, active: boolean, key: string) => (
  <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={active ? 'var(--ink)' : 'var(--ink-3)'} strokeWidth={active ? 2.5 : 1.2} strokeDasharray={active ? undefined : '4 4'} vectorEffect="non-scaling-stroke" />
);

function layout(view: View, m: RoomMeasures, active: Key | null): Layout {
  const is = (k: Key) => active === k;

  if (view === 'plan') {
    const t = Math.max(m.width, 100);
    const l = Math.max(m.depth, 100);
    const b = Math.max(m.wallBottom, 100);
    const wx = Math.min(m.windowOffset, t);
    const dy = Math.min(m.doorOffset, l);
    const fits = rightWallFits(m);
    const swing = doorSwing(dy, m.doorLength, m.doorOpensOut, m.doorHinge);
    // corners: top-left (0,0) → top-right (t,0) → bottom-right (b,l) → bottom-left (0,l)
    const outline = `M 0 0 L ${t} 0 L ${b} ${l} L 0 ${l} Z`;
    const rx = (t + b) / 2 + 55;
    return {
      box: { x: -PAD, y: -PAD, w: Math.max(t, b) + PAD * 2, h: l + PAD * 2 },
      body: (
        <>
          <path d={outline} fill="var(--room-floor)" stroke="var(--ink)" strokeWidth={3} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {/* the wall being edited is drawn thicker */}
          {is('width') && <line x1={0} y1={0} x2={t} y2={0} stroke="var(--ink)" strokeWidth={6} vectorEffect="non-scaling-stroke" />}
          {is('depth') && <line x1={0} y1={0} x2={0} y2={l} stroke="var(--ink)" strokeWidth={6} vectorEffect="non-scaling-stroke" />}
          {is('wallBottom') && <line x1={0} y1={l} x2={b} y2={l} stroke="var(--ink)" strokeWidth={6} vectorEffect="non-scaling-stroke" />}
          <line x1={t} y1={0} x2={b} y2={l} stroke="var(--ink)" strokeWidth={is('wallRight') ? 6 : 3} strokeDasharray={fits ? undefined : '10 8'} vectorEffect="non-scaling-stroke" />
          <rect x={wx} y={-5} width={m.windowLength} height={10} fill="var(--room-window)" stroke="var(--ink)" strokeWidth={is('windowLength') ? 3 : 1.5} vectorEffect="non-scaling-stroke" />
          <rect x={-5} y={dy} width={10} height={m.doorLength} fill="var(--room-floor)" />
          <path d={swing.arc} fill="none" stroke="var(--ink-3)" strokeWidth={1.2} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <line {...swing.leaf} stroke="var(--ink)" strokeWidth={is('doorLength') ? 3 : 2} vectorEffect="non-scaling-stroke" />
          {dashed(0, 40, wx, 40, is('windowOffset'), 'wo')}
          {dashed(70, 0, 70, dy, is('doorOffset'), 'do')}
        </>
      ),
      anchors: [
        { key: 'width', x: t / 2, y: -55 },
        { key: 'depth', x: -55, y: l / 2 },
        { key: 'wallRight', x: rx, y: l / 2 },
        { key: 'wallBottom', x: b / 2, y: l + 55 },
        { key: 'windowOffset', x: Math.max(wx / 2, 40), y: 40 },
        { key: 'windowLength', x: wx + m.windowLength / 2, y: 40 },
        { key: 'doorOffset', x: 70, y: Math.max(dy / 2, 90) },
        { key: 'doorLength', x: m.doorLength + 60, y: dy + m.doorLength / 2 },
      ],
    };
  }

  // a wall seen from the front, with what's on it: the main window or door, extra windows, outlets, radiators
  const wall = view;
  const lengthKey: Key = ({ back: 'width', left: 'depth', right: 'wallRight', front: 'wallBottom' } as const)[wall];
  const w = Math.max(m[lengthKey], 100);
  const h = Math.max(m.height, 100);
  const opening =
    wall === 'back'
      ? { len: 'windowLength', h: 'windowHeight', off: 'windowOffset', sill: m.windowSill, isWin: true }
      : wall === 'left'
        ? { len: 'doorLength', h: 'doorHeight', off: 'doorOffset', sill: 0, isWin: false }
        : null;
  const onThisWall = m.fixtures.filter((f) => f.wall === wall);
  const floorY = (z: number) => h - z; // height above the floor → y in the drawing

  let openingBody: ReactNode = null;
  const openingAnchors: Anchor[] = [];
  if (opening) {
    const k = { len: opening.len as Key, h: opening.h as Key, off: opening.off as Key };
    const ox = Math.min(m[k.off], w);
    const len = m[k.len];
    const oh = m[k.h];
    const top = h - opening.sill - oh;
    openingBody = (
      <>
        <rect x={ox} y={top} width={len} height={oh} fill={opening.isWin ? 'var(--room-window)' : 'var(--bg)'} stroke="var(--ink)" strokeWidth={is(k.h) || is(k.len) ? 3 : 1.5} vectorEffect="non-scaling-stroke" />
        {dashed(ox + len + 45, top, ox + len + 45, top + oh, is(k.h), 'oh')}
        {opening.isWin && dashed(ox + len / 2, top + oh, ox + len / 2, h, is('windowSill'), 's')}
        {dashed(0, h + 50, ox, h + 50, is(k.off), 'o')}
      </>
    );
    openingAnchors.push(
      { key: k.len, x: ox + len / 2, y: Math.max(top - 35, 20) },
      { key: k.h, x: ox + len + 45, y: top + oh / 2 },
      ...(opening.isWin ? [{ key: 'windowSill' as Key, x: ox + len / 2, y: top + oh + opening.sill / 2 }] : []),
      { key: k.off, x: Math.max(ox / 2, 40), y: h + 50 },
    );
  }

  return {
    box: { x: -PAD, y: -PAD, w: w + PAD * 2, h: h + PAD * 2 },
    body: (
      <>
        <rect x={0} y={0} width={w} height={h} fill="var(--room-wall)" stroke="var(--ink)" strokeWidth={is('height') || is(lengthKey) ? 4 : 2} vectorEffect="non-scaling-stroke" />
        <line x1={-20} y1={h} x2={w + 20} y2={h} stroke="var(--ink)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        {dashed(0, -50, w, -50, is(lengthKey), 'len')}
        {dashed(-55, 0, -55, h, is('height'), 'h')}
        {openingBody}
        {onThisWall.map((f) => {
          const x = Math.min(f.offset ?? 0, w);
          if (f.kind === 'outlet') return <rect key={f.id} x={x - 7} y={floorY(38)} width={14} height={14} rx={3} fill="var(--bg)" stroke="var(--ink)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />;
          if (f.kind === 'radiator') return <rect key={f.id} x={x - RADIATOR / 2} y={floorY(75)} width={RADIATOR} height={60} fill="var(--surface-2)" stroke="var(--ink)" strokeWidth={1.2} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />;
          if (f.kind === 'window') return <rect key={f.id} x={x - EXTRA_WINDOW / 2} y={floorY(m.windowSill + m.windowHeight)} width={EXTRA_WINDOW} height={m.windowHeight} fill="var(--room-window)" stroke="var(--ink)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />;
          return null;
        })}
        {!opening && onThisWall.length === 0 && (
          <text x={w / 2} y={h / 2} textAnchor="middle" fontSize={18} fill="var(--ink-3)">
            Ingen vinduer, dører eller stikkontakter
          </text>
        )}
      </>
    ),
    anchors: [{ key: lengthKey, x: w / 2, y: -50 }, { key: 'height', x: -55, y: h / 2 }, ...openingAnchors],
  };
}

/**
 * «Mål»: drawings of the room where every measurement is an input field right on the drawing.
 * Tap a number and type; the drawing redraws as you go.
 */
export function MeasureEditor({ value, source, onChange }: { value: RoomMeasures; source: string; onChange: (m: RoomMeasures) => void }) {
  const [view, setView] = useState<View>('plan');
  const [active, setActive] = useState<Key | null>(null);
  // adding outlets, lights, windows, radiators: pick a tool, then tap the drawing
  const [tool, setTool] = useState<FixtureKind | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 340, h: 280 });

  // keep the active tab visible: scroll only the tab row, never the page
  useEffect(() => {
    const row = tabsRef.current;
    const tab = row?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (row && tab) row.scrollTo({ left: tab.offsetLeft - (row.clientWidth - tab.clientWidth) / 2, behavior: 'smooth' });
  }, [view]);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { box, body, anchors } = layout(view, value, active);
  // same maths as preserveAspectRatio="xMidYMid meet", so the inputs land on the drawing
  const scale = Math.min(size.w / box.w, size.h / box.h);
  const offX = (size.w - box.w * scale) / 2;
  const offY = (size.h - box.h * scale) / 2;
  const toPx = (x: number, y: number) => ({ left: offX + (x - box.x) * scale, top: offY + (y - box.y) * scale });

  const set = (key: Key, raw: string) => {
    const n = parseInt(raw.replace(/\D/g, ''), 10);
    onChange({ ...value, [key]: Number.isFinite(n) ? n : 0 });
  };

  const place = (e: MouseEvent<SVGSVGElement>) => {
    if (!tool || view !== 'plan') {
      setPicked(null);
      return;
    }
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const f: Fixture =
      tool === 'light'
        ? { id: uid('fx'), kind: 'light', x: Math.round(p.x), y: Math.round(p.y) }
        : { id: uid('fx'), kind: tool, ...nearestWall(value, p.x, p.y) };
    onChange({ ...value, fixtures: [...value.fixtures, f] });
    setTool(null);
  };

  const go = (v: View) => {
    setView(v);
    setTool(null);
    setPicked(null);
  };
  const step = (dir: 1 | -1) => {
    const i = VIEWS.findIndex((v) => v.id === view);
    go(VIEWS[(i + dir + VIEWS.length) % VIEWS.length].id);
  };

  const pickedFixture = value.fixtures.find((f) => f.id === picked);
  const counts = FIXTURES.map((t) => ({ ...t, n: value.fixtures.filter((f) => f.kind === t.kind).length })).filter((t) => t.n > 0);

  let caption: ReactNode;
  if (tool) caption = `${FIXTURES.find((t) => t.kind === tool)!.hint}.`;
  else if (pickedFixture)
    caption = (
      <span className="measure-picked">
        {FIXTURES.find((t) => t.kind === pickedFixture.kind)!.label} valgt
        <button
          type="button"
          className="btn btn-ghost source-btn"
          onClick={() => {
            onChange({ ...value, fixtures: value.fixtures.filter((f) => f.id !== picked) });
            setPicked(null);
          }}
        >
          Fjern
        </button>
      </span>
    );
  else if (active) caption = `${LABELS[active]} (cm)`;
  else caption = `${source}. Trykk på et mål i tegningen og skriv inn riktig verdi. Alle mål er i cm.`;

  return (
    <div className="measure">
      {/* the floor plan and every wall – swipe the tabs or use the arrows on the drawing */}
      <div className="measure-nav">
        <button type="button" className="measure-arrow" onClick={() => step(-1)} aria-label="Forrige tegning">
          ‹
        </button>
        <div className="measure-views" role="tablist" aria-label="Tegning" ref={tabsRef}>
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="tab"
              className="chip"
              aria-pressed={view === v.id}
              aria-selected={view === v.id}
              onClick={() => go(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button type="button" className="measure-arrow" onClick={() => step(1)} aria-label="Neste tegning">
          ›
        </button>
      </div>

      {view === 'plan' && (
        <div className="fixture-tools" role="group" aria-label="Legg til i rommet">
          {FIXTURES.map((t) => (
            <button key={t.kind} type="button" className="chip" aria-pressed={tool === t.kind} onClick={() => setTool(tool === t.kind ? null : t.kind)}>
              + {t.label}
            </button>
          ))}
        </div>
      )}

      <div className={'measure-plan' + (tool ? ' is-placing' : '')} ref={boxRef}>
        <svg
          ref={svgRef}
          viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          onClick={place}
          aria-label={tool ? FIXTURES.find((t) => t.kind === tool)!.hint : 'Tegning av rommet'}
        >
          {body}
          {view === 'plan' &&
            value.fixtures.map((f) => <FixtureSymbol key={f.id} f={f} m={value} selected={picked === f.id} onSelect={() => !tool && setPicked(f.id)} />)}
        </svg>
        {anchors.map((a) => (
          <input
            key={view + a.key}
            className={'measure-field' + (active === a.key ? ' is-active' : '')}
            style={toPx(a.x, a.y)}
            inputMode="numeric"
            value={value[a.key] || ''}
            onFocus={(e) => {
              setActive(a.key);
              setPicked(null);
              e.target.select();
            }}
            onBlur={() => setActive((k) => (k === a.key ? null : k))}
            onChange={(e) => set(a.key, e.target.value)}
            aria-label={`${LABELS[a.key]} i cm`}
          />
        ))}
      </div>

      {!rightWallFits(value) && (
        <div className="measure-warning" role="status">
          <span>
            Målene går ikke helt opp. Med de andre veggene blir veggen overfor døren ca. {expectedRightWall(value)} cm, ikke {value.wallRight} cm.
          </span>
          <button type="button" className="btn source-btn" onClick={() => onChange({ ...value, wallRight: expectedRightWall(value) })}>
            Bruk {expectedRightWall(value)}
          </button>
        </div>
      )}
      <p className="hint measure-caption">{caption}</p>

      {/* which way the door opens */}
      <div className="door-options">
        <span className="measure-group-title">Døren</span>
        <div className="door-row">
          <span>Åpnes</span>
          <div className="segmented" role="group" aria-label="Døren åpnes">
            <button aria-pressed={!value.doorOpensOut} onClick={() => onChange({ ...value, doorOpensOut: false })}>
              Innover
            </button>
            <button aria-pressed={value.doorOpensOut} onClick={() => onChange({ ...value, doorOpensOut: true })}>
              Utover
            </button>
          </div>
        </div>
        <div className="door-row">
          <span>Hengsler</span>
          <div className="segmented" role="group" aria-label="Hengsler">
            <button aria-pressed={value.doorHinge === 'start'} onClick={() => onChange({ ...value, doorHinge: 'start' })}>
              Mot vinduet
            </button>
            <button aria-pressed={value.doorHinge === 'end'} onClick={() => onChange({ ...value, doorHinge: 'end' })}>
              Bort fra vinduet
            </button>
          </div>
        </div>
      </div>

      {counts.length > 0 && (
        <p className="hint" style={{ margin: '6px 0 4px' }}>
          I rommet: {counts.map((c) => `${c.n} ${c.n === 1 ? c.label.toLowerCase() : c.plural}`).join(' · ')}
        </p>
      )}
    </div>
  );
}
