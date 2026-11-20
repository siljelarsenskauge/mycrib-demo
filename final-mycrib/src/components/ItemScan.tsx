// Scan item (Figma 02D, Synne 22.10): walk around the item, then «What the AI saw».
// What the AI finds is simulated. A small demo menu on «Simulated» lets the test leader choose what it «finds»,
// so every case in 02D can be shown: found online, not found online, a rug with several sizes, a flat rug.
// Also here: the price tag scan (only offered when the AI is unsure) and «Not this item?».
import { useEffect, useState } from 'react';
import type { Attachment } from '../state/types';
import { Icon } from './Icon';
import { ScanHint, ScanShutter } from './ScanControls';
import { BottomSheet, Button } from './ui';

export const TEST_LINK = 'https://www.trademax.no/møbler/bord/konsollbord-avlastningsbord/settbord/telemark-sidebord-36-cm-bruntonet-glass-p3426865';

/** The Telemark side tables, found online (Synne 22.10: real photo, 70 × 42 × 42 cm). */
export const NESTING_TABLES: Attachment = {
  name: 'Telemark Sidetable',
  kind: 'coffeetable',
  width: 70,
  depth: 42,
  height: 42,
  color: '#6b5b4e',
  colorName: 'smoked glass',
  source: 'scan',
  photo: '/scan/nesting-tables-product.jpg',
  product: {
    store: '',
    model: 'Telemark Sidetable',
    price: 1999,
    variants: [
      { color: '#6b5b4e', colorName: 'smoked brown' },
      { color: '#3a3a3a', colorName: 'smoked grey' },
    ],
    url: TEST_LINK,
  },
};

/** The beige sofa with chaise, scanned in a store (Silje 13.11: replaces the tables as the scan demo). */
export const BEIGE_SOFA: Attachment = {
  name: 'Beige sofa with chaise',
  kind: 'sofa',
  width: 290,
  depth: 160,
  height: 70,
  color: '#e6dccb',
  colorName: 'beige',
  source: 'scan',
  photo: '/beige-sofa/beige-sofa-5.png',
  product: {
    store: '',
    model: 'Beige sofa with chaise',
    price: 12999,
    variants: [
      { color: '#e6dccb', colorName: 'beige' },
      { color: '#8c8a84', colorName: 'grey' },
    ],
    url: 'https://www.bohus.no/',
  },
};

/** The sofa when it isn't found in any shop: the size is still measured. */
const SOFA_NOT_FOUND: Attachment = { ...BEIGE_SOFA, name: 'Beige sofa', product: undefined };

/** Other sofas the AI thought it might be («Not this item?»): three beige sofas from the same series (Synne 19.11).
 *  The green and the brown sofa from before are hidden behind SHOW_OLD_SOFA_MATCHES. */
const SHOW_OLD_SOFA_MATCHES = false;
const bohusSofa = (name: string, photo: string, width: number, depth: number, price: number, colorName = 'beige', color = '#e6dccb'): Attachment => ({
  name,
  kind: 'sofa',
  width,
  depth,
  height: 70,
  color,
  colorName,
  source: 'scan',
  photo,
  product: { store: '', model: name, price, variants: [{ color, colorName }], url: 'https://www.bohus.no/' },
});
const SOFA_MATCHES: Attachment[] = [
  bohusSofa('Beige 3-seat sofa', '/beige-sofa/match-sofa-3seat.jpg', 240, 100, 9999),
  bohusSofa('Corner sofa, chaise right', '/beige-sofa/match-sofa-corner-right.jpg', 290, 160, 13999, 'greige', '#cfc4b6'),
  bohusSofa('Corner sofa, chaise left', '/beige-sofa/match-sofa-corner-left.jpg', 290, 160, 13999),
];
const OLD_SOFA_MATCHES: Attachment[] = [
  { name: 'Green velvet sofa', kind: 'sofa', width: 220, depth: 95, height: 80, color: '#5f6e4f', colorName: 'green', source: 'scan', photo: '/furniture-photos/grønn sofa.png', product: { store: '', model: 'Green velvet sofa', price: 9999, variants: [{ color: '#5f6e4f', colorName: 'green' }] } },
  { name: 'Dark brown sofa', kind: 'sofa', width: 230, depth: 95, height: 78, color: '#4a3a2e', colorName: 'dark brown', source: 'scan', photo: '/furniture-photos/mørkebrun sofa.png', product: { store: '', model: 'Dark brown sofa', price: 11499, variants: [{ color: '#4a3a2e', colorName: 'dark brown' }] } },
];

/** The same tables, but not found in any shop: the size is still measured. */
const TABLES_NOT_FOUND: Attachment = { ...NESTING_TABLES, name: 'Glass side tables', product: undefined };

/** A wool rug found online in three sizes; the scan picks the closest one. Flat, so no height. */
const RUG_FOUND: Attachment = {
  name: 'Wool rug',
  kind: 'other',
  width: 200,
  depth: 300,
  height: 1,
  flat: true,
  color: '#a89a86',
  colorName: 'natural',
  source: 'scan',
  photo: '/scan/rug-product.jpg',
  sizes: [
    { width: 160, depth: 230 },
    { width: 200, depth: 300 },
    { width: 240, depth: 340 },
  ],
  measured: { width: 198, depth: 297 },
  product: { store: '', model: 'Wool rug', price: 2499, variants: [{ color: '#a89a86', colorName: 'natural' }], url: 'https://www.bohus.no/' },
};

/** The rug when it isn't found online: width and length from the scan. */
const RUG_NOT_FOUND: Attachment = { ...RUG_FOUND, name: 'Rug', width: 198, depth: 297, sizes: undefined, measured: undefined, product: undefined };

/** Other things the AI thought it might be («Not this item?»). Photos from Synne's Figma (02D.2). */
export const OTHER_MATCHES: Attachment[] = [
  { name: 'Clear glass nesting set', kind: 'coffeetable', width: 60, depth: 40, height: 45, color: '#cfd8d6', colorName: 'clear glass', source: 'scan', photo: '/scan/match-clear-nesting.jpg', product: { store: '', model: 'Clear glass nesting set', price: 1499, variants: [{ color: '#cfd8d6', colorName: 'clear' }] } },
  { name: 'Smoked glass side table', kind: 'coffeetable', width: 40, depth: 40, height: 55, color: '#555555', colorName: 'smoked glass', source: 'scan', photo: '/scan/match-smoked-side.jpg', product: { store: '', model: 'Smoked glass side table', price: 899, variants: [{ color: '#555555', colorName: 'smoked' }] } },
  { name: 'Bent glass table, 3 pcs', kind: 'coffeetable', width: 110, depth: 55, height: 42, color: '#d8dedd', colorName: 'clear glass', source: 'scan', photo: '/scan/match-bent-table.jpg', product: { store: '', model: 'Bent glass table, 3 pcs', price: 2299, variants: [{ color: '#d8dedd', colorName: 'clear' }] } },
];

/** What the test leader can make the scan «find». */
type Demo = { id: string; label: string; item: Attachment; camera: string; views?: string[]; /** a real photo that fills the whole screen, as if you stand there with the phone: its size, where the item is (x, % of the width), and the item's outline in the photo's pixels. `box`, `ring` and `spread` are then % of the photo */ full?: { w: number; h: number; focus: number; outline: string }; box: [number, number, number, number]; ring: [number, number, number]; spread: [number, number, number, number] };
/** the beige sofa in the store, as you see it through the phone while scanning (Silje 18.11). It replaces the product
 *  photos from each side (/beige-sofa/beige-sofa-5, -1, -4, -2.png as `views`), which can be put back */
const SOFA_STORE = encodeURI('/beige sofa/sofa langt frA.jpg');
/** «sofa langt fra» (Silje 18.11): the whole sofa fits on the screen, with a line drawn around it while scanning */
const SOFA_FULL = {
  w: 1199,
  h: 1312,
  focus: 47.3,
  outline: 'M259 785 L257.5 702.5 L305 674 L310 668 L440 663 L555 660 L632.5 651 L702.5 663 L812.5 675 L826 695 L826 736 L875 752.5 L874 809 L770 831 L705 816 L580 807.5 L362.5 822.5 L350 826 L315 826 Z',
};
const DEMOS: Demo[] = [
  { id: 'sofa', label: 'Sofa – found online', item: BEIGE_SOFA, camera: SOFA_STORE, full: SOFA_FULL, box: [20, 49, 55, 15], ring: [61, 31, 6], spread: [23, 51, 48, 11] },
  { id: 'sofa-nf', label: 'Sofa – not found online', item: SOFA_NOT_FOUND, camera: SOFA_STORE, full: SOFA_FULL, box: [20, 49, 55, 15], ring: [61, 31, 6], spread: [23, 51, 48, 11] },
  { id: 'tables', label: 'Side tables – found online', item: NESTING_TABLES, camera: '/scan/nesting-tables.jpg', box: [15.5, 40, 67, 21], ring: [59.5, 38, 6], spread: [23, 43, 54, 14] },
  { id: 'tables-nf', label: 'Side tables – not found online', item: TABLES_NOT_FOUND, camera: '/scan/nesting-tables.jpg', box: [15.5, 40, 67, 21], ring: [59.5, 38, 6], spread: [23, 43, 54, 14] },
  { id: 'rug', label: 'Rug – found, 3 sizes', item: RUG_FOUND, camera: '/scan/rug.jpg', box: [19, 37, 62, 28], ring: [66, 41, 5.5], spread: [22, 40, 56, 22] },
  { id: 'rug-nf', label: 'Rug – not found online', item: RUG_NOT_FOUND, camera: '/scan/rug.jpg', box: [19, 37, 62, 28], ring: [66, 41, 5.5], spread: [22, 40, 56, 22] },
];
// the coffee table (the side tables) is what a scan finds by default again (Synne 17.11); Silje's beige sofa for the fig
// video is still in the test leader's menu on «Simulated»
let lastDemo = 'tables';

const SIDES = ['front', 'right side', 'back', 'left side'];
const TICKS = 48;
const rnd = (i: number, k: number) => {
  const a = Math.sin(i * k) * 43758.5453;
  return a - Math.floor(a);
};

/**
 * Walk around the item, in the same style as «Scan room». The front and the ends are enough (Synne 22.10: a sofa
 * against a wall in a store) – you can finish from halfway; before that the scan is «incomplete» (02D.8).
 */
export function ScanScreen({ roomName, onDone, onClose, onTag, onEnter, startDemo }: { roomName: string; onDone: (a: Attachment) => void; onClose: () => void; onTag: (a: Attachment) => void; onEnter: (a: Attachment) => void; /** what the scan finds this time, e.g. the sofa from «Add furniture» (Synne 18.11) */ startDemo?: string }) {
  const [demoId, setDemoId] = useState(startDemo ?? lastDemo);
  // «Not this item?» offers matches of the same kind: remember what this scan is, also when it started on the sofa (19.11)
  useEffect(() => {
    lastDemo = demoId;
  }, [demoId]);
  const [menu, setMenu] = useState(false);
  const [pct, setPct] = useState(0);
  const [run, setRun] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const demo = DEMOS.find((d) => d.id === demoId)!;
  // load every side of the item up front, so the picture doesn't flicker when it changes
  useEffect(() => {
    demo.views?.forEach((v) => {
      new Image().src = v;
    });
  }, [demo]);
  useEffect(() => {
    if (!run) return;
    const t = window.setTimeout(() => {
      setPct((p) => {
        const n = Math.min(100, p + 1);
        if (n >= 100) setRun(false);
        return n;
      });
    }, 30); // about 3 s for the whole item (was 50 ms, 5 s – Silje 17.11: a bit faster for the pitch)
    return () => window.clearTimeout(t);
  }, [run, pct]);

  const done = pct >= 100;
  const enough = pct >= 50;
  const ang = (pct / 100) * Math.PI * 2;
  const side = SIDES[Math.min(3, Math.floor(pct / 25))];
  const covered = Math.round((pct / 100) * TICKS);
  const camera = { transform: `perspective(900px) translateX(${(Math.sin(ang) * 14).toFixed(1)}px) rotateY(${(Math.sin(ang) * 9).toFixed(1)}deg) scale(${(1.06 + Math.cos(ang) * 0.025).toFixed(3)})` };
  const [cy, rx, ry] = demo.ring;
  const [bx, by, bw, bh] = demo.box;
  const [sx, sy, sw, sh] = demo.spread;
  const points = Array.from({ length: 42 }, (_, i) => [sx + rnd(i, 12.9898) * sw, sy + rnd(i, 78.233) * sh]);
  // the ring is in the middle of the screen, or around the item in a full photo
  const cx = demo.full?.focus ?? 50;
  const dot = { x: cx + Math.sin(ang) * rx, y: cy + Math.cos(ang) * ry };
  const paused = !run && pct > 0 && !done;
  // direction A (Synne 29.10, Figma 06S.A): one hint in a glass pill and one big round button
  const hint = incomplete
    ? 'Couldn’t measure the depth'
    : done
      ? 'All sides captured'
      : paused
        ? enough
          ? 'Against a wall? The front and ends are enough'
          : 'Paused – tap to continue'
        : run && pct >= 25
          ? enough
            ? 'Front and ends captured'
            : 'Front captured'
          : run
            ? `Walk around the item · ${side}`
            : 'Walk slowly around the item';
  const label = done ? 'Use the scan' : run ? `${pct} %` : paused ? `Paused · ${pct} %` : 'Start scanning';
  // the scan's ring, dots and frame: over the screen, or over the store photo
  const overlay = (
    <>
      <svg className="is-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {Array.from({ length: TICKS }, (_, i) => {
          const t = (i / TICKS) * Math.PI * 2;
          const x1 = cx + Math.sin(t) * rx, y1 = cy + Math.cos(t) * ry;
          const x2 = cx + Math.sin(t) * (rx + 3), y2 = cy + Math.cos(t) * (ry + 1.2);
          // the back half (top of the ring) is optional – drawn quieter
          const back = Math.cos(t) < -0.2;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={(i < covered ? 'is-on' : '') + (back ? ' is-back' : '')} vectorEffect="non-scaling-stroke" />;
        })}
        {!demo.full && <rect x={bx} y={by} width={bw} height={bh} className={'is-box' + (done || (paused && enough) ? ' is-locked' : '')} vectorEffect="non-scaling-stroke" />}
      </svg>
      {/* no points on the store photo, only the line round the sofa (Silje 18.11) */}
      {!demo.full && points.slice(0, Math.floor((pct / 100) * points.length)).map(([x, y], i) => (
        <span key={i} className="rs-pt is-pt" style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
      {run && <span className="is-you" style={{ left: `${dot.x}%`, top: `${dot.y}%` }} aria-hidden />}
    </>
  );
  const restart = () => {
    setIncomplete(false);
    setPct(0);
    setRun(false);
  };

  return (
    <div className={'screen-overlay rs is-item' + (demo.full ? ' is-store' : '')} role="dialog" aria-modal="true" aria-label="Scan item">
      <div className="rs-view">
        {demo.full ? (
          // the store photo, with the ring and a line around the item on top of it (Silje 18.11)
          <div className={'is-camera is-full' + (run ? ' is-running' : '')} style={camera}>
            <div className="is-photo" style={{ aspectRatio: `${demo.full.w} / ${demo.full.h}`, translate: `-${demo.full.focus}% 0` }}>
              <img src={demo.camera} alt="" draggable={false} />
              <svg className={'is-outline' + (done || (paused && enough) ? ' is-locked' : '')} viewBox={`0 0 ${demo.full.w} ${demo.full.h}`} aria-hidden>
                <path d={demo.full.outline} pathLength={100} style={{ strokeDashoffset: 100 - pct }} />
              </svg>
              {overlay}
            </div>
          </div>
        ) : (
          <>
            <div className={'is-camera' + (run ? ' is-running' : '')} style={camera}>
              <img src={demo.views ? demo.views[Math.min(3, Math.floor(pct / 25))] : demo.camera} alt="" draggable={false} />
            </div>
            <div className="is-floor" aria-hidden style={{ ['--is-cy' as string]: `${cy}%` }} />
            {overlay}
          </>
        )}
        <div className="rs-shade" />
        <div className="rs-top">
          <button className="rs-round" aria-label="Cancel scanning" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
          {/* Wizard of Oz: the test leader chooses what the scan «finds» */}
          <button className="rs-pill is-demo" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            Simulated ▾
          </button>
          {menu && (
            <div className="is-demo-menu" role="menu" aria-label="What the scan finds">
              {DEMOS.map((d) => (
                <button
                  key={d.id}
                  role="menuitemradio"
                  aria-checked={d.id === demoId}
                  onClick={() => {
                    setDemoId(d.id);
                    lastDemo = d.id;
                    setMenu(false);
                    restart();
                  }}
                >
                  {d.label}
                  {d.id === demoId && <Icon name="check" size={16} />}
                </button>
              ))}
            </div>
          )}
        </div>
        <ScanHint ok={!incomplete && (done || (run && pct >= 25))} warn={incomplete}>
          {hint}
        </ScanHint>
        {incomplete ? (
          // nothing more to scan: a light sheet with the other ways to get the size (02D.8)
          <div className="scan-sheet">
            <p>It may be rolled up, stacked or against a wall. Get the exact size another way:</p>
            <Button block icon="scan_camera" onClick={() => onTag(demo.item)}>
              Scan the price tag
            </Button>
            <div className="scan-sheet-row">
              <Button variant="text" onClick={() => onEnter(demo.item)}>
                Enter the size
              </Button>
              <Button variant="text" onClick={restart}>
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <ScanShutter
            pct={pct}
            running={run}
            icon={done ? 'check' : 'scan_item'}
            label={label}
            ariaLabel={done ? 'Use the scan' : run ? 'Pause scanning' : paused ? 'Continue scanning' : 'Start scanning'}
            onClick={() => (done ? onDone(demo.item) : setRun(!run))}
            onRescan={done ? restart : undefined}
            side={
              paused && (
                <button className="scan-finish" onClick={() => (enough ? onDone(demo.item) : setIncomplete(true))}>
                  Finish
                </button>
              )
            }
          />
        )}
      </div>
    </div>
  );
}

/** What a price tag says about an item: the found product, with its exact size. */
export function fromTag(a: Attachment, fallback: Attachment): Attachment {
  const real = a.flat ? RUG_FOUND : a.kind === 'sofa' && a.photo?.startsWith('/beige-sofa/') ? BEIGE_SOFA : a.kind === 'coffeetable' ? NESTING_TABLES : fallback;
  return { ...real, photo: a.photo ?? real.photo, source: 'tag', uncertain: undefined };
}

/** Scan the price tag (02D.4): the camera reads name, size, price and article number. */
export function TagScanScreen({ item, onUse, onClose }: { item: Attachment; onUse: () => void; onClose: () => void }) {
  const [read, setRead] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setRead(true), 1600);
    return () => window.clearTimeout(t);
  }, []);
  const size = item.flat ? `B ${item.width} × L ${item.depth} cm` : `B ${item.width} × D ${item.depth} × H ${item.height} cm`;
  return (
    <div className="screen-overlay rs is-tag" role="dialog" aria-modal="true" aria-label="Scan the price tag">
      <div className="rs-view">
        <div className="is-tag-bg" style={{ backgroundImage: `url(${item.photo})` }} aria-hidden />
        <div className="is-tag-card" aria-hidden>
          <strong>{(item.product?.model ?? item.name).toUpperCase()}</strong>
          <span>{item.colorName}</span>
          <span>{size}</span>
          <b>{item.product ? `${item.product.price.toLocaleString('nb-NO')},-` : ''}</b>
          <small>Art.nr. 3426865</small>
        </div>
        <div className="rs-corners is-tag-frame">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="rs-top">
          <button className="rs-round" aria-label="Cancel" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
          <span className="rs-pill">Simulated</span>
        </div>
        <ScanHint ok={read}>{read ? 'Found: size, price and article no.' : 'Hold the tag inside the frame'}</ScanHint>
        <ScanShutter pct={read ? 100 : 0} running={false} icon="check" label={read ? 'Use the tag' : 'Reading …'} ariaLabel="Use the tag" disabled={!read} onClick={onUse} />
      </div>
    </div>
  );
}

/** «Not this item?» (02D.2), simpler (Synne 19.11): the other matches, then «Scan again» as one quiet button.
 *  «Keep my scan, no product» and «It’s the right item» are hidden behind SHOW_KEEP (X closes the sheet). */
const SHOW_KEEP = false;
export function NotThisItemSheet({ scanned, onPick, onRescan, onKeep, onClose }: { scanned: boolean; onPick: (a: Attachment) => void; onRescan: () => void; onKeep: () => void; onClose: () => void }) {
  return (
    <BottomSheet title="Not this item?" onClose={onClose} closeRight>
      <p className="nt-lead">Pick the right one:</p>
      <div className="nt-matches">
        {(lastDemo.startsWith('sofa') ? [...SOFA_MATCHES, ...(SHOW_OLD_SOFA_MATCHES ? OLD_SOFA_MATCHES : [])] : OTHER_MATCHES).map((m) => (
          <button key={m.name} className="nt-match" onClick={() => onPick(m)}>
            <img src={m.photo} alt="" />
            <span>{m.name}</span>
            <small>{m.product!.price.toLocaleString('nb-NO')} NOK</small>
          </button>
        ))}
      </div>
      <Button variant="outlined" block icon="scan_item" onClick={onRescan}>
        Scan again
      </Button>
      {SHOW_KEEP && scanned && (
        <Button variant="text" block onClick={onKeep}>
          Keep my scan, no product
        </Button>
      )}
    </BottomSheet>
  );
}
