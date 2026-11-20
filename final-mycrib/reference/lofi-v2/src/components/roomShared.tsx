import { useId } from 'react';
import type { Fixture, Furniture, Room } from '../state/types';

export interface RoomViewProps {
  room: Room;
  items: Furniture[];
  selectedId?: string | null;
  highlightId?: string;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  mini?: boolean;
}

export function shade(hex: string, amount: number): string {
  if (!hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 - amount))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function usePatternId() {
  return 'zebra' + useId().replace(/[^a-zA-Z0-9]/g, '');
}

export function fillFor(color: string, patternId: string, amount = 0) {
  if (color === 'zebra') return `url(#${patternId}${amount > 0.2 ? 'd' : ''})`;
  return shade(color, amount);
}

export function ZebraDefs({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <rect width="16" height="16" fill="#f4f4f4" />
        <rect width="7" height="16" fill="#1e1e1e" />
      </pattern>
      <pattern id={id + 'd'} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <rect width="16" height="16" fill="#bdbdbd" />
        <rect width="7" height="16" fill="#111" />
      </pattern>
    </defs>
  );
}

/** Position of a fixture in the (rectangular) room, plus the direction of its wall. */
export function fixturePoint(room: Room, f: Fixture) {
  const W = room.width;
  const D = room.depth;
  if (f.kind === 'light') return { x: f.x ?? W / 2, y: f.y ?? D / 2, ux: 1, uy: 0 };
  const o = f.offset ?? 0;
  switch (f.wall) {
    case 'left':
      return { x: 0, y: Math.min(o, D), ux: 0, uy: 1 };
    case 'right':
      return { x: W, y: Math.min(o, D), ux: 0, uy: 1 };
    case 'front':
      return { x: Math.min(o, W), y: D, ux: 1, uy: 0 };
    default:
      return { x: Math.min(o, W), y: 0, ux: 1, uy: 0 };
  }
}
