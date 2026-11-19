import { shade } from './roomShared';

const C = Math.cos(Math.PI / 6);
const S = 0.5;
const P = (x: number, y: number, z: number) => `${(x - y) * C},${(x + y) * S - z}`;

/** Small isometric block used as a "photo" of a recognised furniture item. */
export function FurnitureThumb({ item }: { item: { width: number; depth: number; height: number; color: string } }) {
  const { width: w, depth: d, height: h } = item;
  const color = item.color === 'zebra' ? '#888888' : item.color; // full 6-digit hex, so shade() works
  const minX = -d * C - 10;
  const maxX = w * C + 10;
  const minY = -h - 10;
  const maxY = (w + d) * S + 10;
  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} width="100%" height="100%" aria-hidden>
      <polygon points={[P(0, d, 0), P(w, d, 0), P(w, d, h), P(0, d, h)].join(' ')} fill={shade(color, 0.15)} stroke="#1a1a1a" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <polygon points={[P(w, 0, 0), P(w, d, 0), P(w, d, h), P(w, 0, h)].join(' ')} fill={shade(color, 0.3)} stroke="#1a1a1a" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <polygon points={[P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)].join(' ')} fill={color} stroke="#1a1a1a" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
