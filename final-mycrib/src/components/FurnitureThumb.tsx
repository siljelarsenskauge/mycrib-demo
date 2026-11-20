import { shade } from './roomShared';

const C = Math.cos(Math.PI / 6);
const S = 0.5;
const P = (x: number, y: number, z: number) => `${(x - y) * C},${(x + y) * S - z}`;

/** Picture of an item: the user's own photo if there is one, otherwise a small isometric block. */
export function FurnitureThumb({ item }: { item: { width: number; depth: number; height: number; color: string; photo?: string; shape?: 'round' } }) {
  if (item.photo) return <img className="thumb-photo" src={item.photo} alt="" />;
  const { width: w, depth: d, height: h } = item;
  const color = item.color === 'zebra' ? '#888888' : item.color; // full 6-digit hex, so shade() works
  if (item.shape === 'round') {
    // round items (the round coffee tables, Rathi 11.11): a short cylinder; a circle seen this way is an upright ellipse
    const r = (w + d) / 4;
    const rx = r * C * Math.SQRT2;
    const ry = r * S * Math.SQRT2;
    const cy = r * 2 * S;
    const ln = { stroke: 'rgba(17,17,17,0.35)', strokeWidth: 1.2, vectorEffect: 'non-scaling-stroke' as const };
    return (
      <svg viewBox={`${-rx - 10} ${cy - h - ry - 10} ${2 * rx + 20} ${h + 2 * ry + 20}`} width="100%" height="100%" aria-hidden>
        <ellipse cx={0} cy={cy} rx={rx} ry={ry} fill={shade(color, 0.3)} {...ln} />
        <rect x={-rx} y={cy - h} width={2 * rx} height={h} fill={shade(color, 0.3)} />
        <line x1={-rx} y1={cy - h} x2={-rx} y2={cy} {...ln} />
        <line x1={rx} y1={cy - h} x2={rx} y2={cy} {...ln} />
        <ellipse cx={0} cy={cy - h} rx={rx} ry={ry} fill={color} {...ln} />
      </svg>
    );
  }
  const minX = -d * C - 10;
  const maxX = w * C + 10;
  const minY = -h - 10;
  const maxY = (w + d) * S + 10;
  const line = { stroke: 'rgba(17,17,17,0.35)', strokeWidth: 1.2, vectorEffect: 'non-scaling-stroke' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} width="100%" height="100%" aria-hidden>
      <polygon points={[P(0, d, 0), P(w, d, 0), P(w, d, h), P(0, d, h)].join(' ')} fill={shade(color, 0.15)} {...line} />
      <polygon points={[P(w, 0, 0), P(w, d, 0), P(w, d, h), P(w, 0, h)].join(' ')} fill={shade(color, 0.3)} {...line} />
      <polygon points={[P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)].join(' ')} fill={color} {...line} />
    </svg>
  );
}
