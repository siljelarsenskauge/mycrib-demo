// Small read-only drawing of a measured room (polygon, doors and windows) – used on the «room's shape» card.
import { box, isMissing, outlinePath, offsetOf, wall, wallCount, wallLen, wallName, type Measurements } from '../state/measure';

export function PlanThumb({ md, size = 72 }: { md: Measurements; size?: number }) {
  const b = box(md);
  const w = Math.max(1, b.x1 - b.x0);
  const h = Math.max(1, b.y1 - b.y0);
  const pad = Math.max(w, h) * 0.12;
  const sw = Math.max(w, h) / 22;
  const n = wallCount(md);
  return (
    <svg className="plan-thumb" width={size} height={size} viewBox={`${b.x0 - pad} ${b.y0 - pad} ${w + pad * 2} ${h + pad * 2}`} aria-hidden>
      <path d={outlinePath(md)} fill="var(--color-background-default)" stroke="var(--color-text-primary)" strokeWidth={sw} strokeLinejoin="round" />
      {md.opens
        .filter((o) => o.wall < n)
        .map((o) => {
          const wl = wall(md, o.wall);
          const s = offsetOf(md, o);
          const a = { x: wl.a.x + wl.ux * s, y: wl.a.y + wl.uy * s };
          const e = { x: wl.a.x + wl.ux * (s + o.w), y: wl.a.y + wl.uy * (s + o.w) };
          return <line key={o.id} x1={a.x} y1={a.y} x2={e.x} y2={e.y} stroke={o.type === 'door' ? 'var(--color-background-default)' : 'var(--color-action-secondary)'} strokeWidth={sw * 1.1} />;
        })}
    </svg>
  );
}

/** Larger read-only drawing for «Does this look right?» (Figma 06D.4): the room on a grid, with each wall's letter and length. */
export function PlanPreview({ md, ratio = 354 / 220 }: { md: Measurements; ratio?: number }) {
  const b = box(md);
  const w = Math.max(1, b.x1 - b.x0);
  const h = Math.max(1, b.y1 - b.y0);
  // pad the drawing to the card's shape, so the labels (in %) land on the right spot
  let vw = w * 1.5;
  let vh = h * 1.5;
  if (vw / vh < ratio) vw = vh * ratio;
  else vh = vw / ratio;
  const x0 = b.x0 + w / 2 - vw / 2;
  const y0 = b.y0 + h / 2 - vh / 2;
  const cx = b.x0 + w / 2;
  const cy = b.y0 + h / 2;
  const sw = vw / 90;
  const n = wallCount(md);
  const labels = Array.from({ length: n }, (_, i) => i)
    .filter((i) => !isMissing(md, i))
    .map((i) => {
      const wl = wall(md, i);
      const mx = (wl.a.x + wl.b.x) / 2;
      const my = (wl.a.y + wl.b.y) / 2;
      let nx = wl.uy;
      let ny = -wl.ux;
      if ((mx - cx) * nx + (my - cy) * ny < 0) [nx, ny] = [-nx, -ny];
      const off = vw * 0.08;
      return { i, left: ((mx + nx * off - x0) / vw) * 100, top: ((my + ny * off - y0) / vh) * 100, text: `${wallName(md, i)}  ${wallLen(md, i)}` };
    });
  return (
    <div className="plan-preview" style={{ aspectRatio: String(ratio) }}>
      <svg viewBox={`${x0} ${y0} ${vw} ${vh}`} width="100%" height="100%" aria-hidden>
        <path d={outlinePath(md)} fill="var(--color-surface-input)" stroke="var(--color-text-primary)" strokeWidth={sw} strokeLinejoin="round" />
        {md.opens
          .filter((o) => o.wall < n)
          .map((o) => {
            const wl = wall(md, o.wall);
            const s = offsetOf(md, o);
            const a = { x: wl.a.x + wl.ux * s, y: wl.a.y + wl.uy * s };
            const e = { x: wl.a.x + wl.ux * (s + o.w), y: wl.a.y + wl.uy * (s + o.w) };
            return <line key={o.id} x1={a.x} y1={a.y} x2={e.x} y2={e.y} stroke={o.type === 'door' ? 'var(--color-surface-input)' : 'var(--color-action-secondary)'} strokeWidth={sw * 1.2} />;
          })}
      </svg>
      {labels.map((l) => (
        <span key={l.i} className="plan-preview-label" style={{ left: `${l.left}%`, top: `${l.top}%` }}>
          {l.text}
        </span>
      ))}
    </div>
  );
}
