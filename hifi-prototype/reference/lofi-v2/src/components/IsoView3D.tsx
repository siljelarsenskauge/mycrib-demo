import { useRef, useState, type PointerEvent } from 'react';
import { footprint } from '../state/geometry';
import type { Furniture } from '../state/types';
import { fillFor, usePatternId, ZebraDefs, type RoomViewProps } from './roomShared';

const C = Math.cos(Math.PI / 6);
const S = 0.5;
/** wall height when the room has no measured ceiling height */
const DEFAULT_WALL_H = 200;

const P = (x: number, y: number, z: number): [number, number] => [(x - y) * C, (x + y) * S - z];
/** Screen (svg) delta → floor-plane delta, the inverse of P at z = 0 */
const toFloor = (dsx: number, dsy: number) => ({ dx: (dsx / C + dsy / S) / 2, dy: (dsy / S - dsx / C) / 2 });
const poly = (pts: [number, number, number][]) => pts.map(([x, y, z]) => P(x, y, z).join(',')).join(' ');

interface Drag {
  id: string;
  px: number;
  py: number;
  ox: number;
  oy: number;
  x: number;
  y: number;
  moved: boolean;
}

/** "3D" = isometric drawing: floor, two walls, window, door and furniture as blocks. Blocks can be dragged along the floor. */
export function IsoView3D({ room, items, selectedId, onSelect, onMove, mini }: RoomViewProps) {
  const pid = usePatternId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const toSvg = (e: PointerEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  const onDown = (e: PointerEvent, f: Furniture) => {
    if (mini || !onSelect) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const p = toSvg(e);
    setDrag({ id: f.id, px: p.x, py: p.y, ox: f.x, oy: f.y, x: f.x, y: f.y, moved: false });
  };
  const onMoveEvt = (e: PointerEvent) => {
    if (!drag) return;
    const p = toSvg(e);
    const { dx, dy } = toFloor(p.x - drag.px, p.y - drag.py);
    const r = footprint(items.find((i) => i.id === drag.id)!);
    const snap = (v: number) => Math.round(v / 5) * 5;
    const moved = drag.moved || Math.hypot(p.x - drag.px, p.y - drag.py) > 8;
    setDrag({
      ...drag,
      moved,
      x: Math.max(0, Math.min(room.width - r.w, snap(drag.ox + dx))),
      y: Math.max(0, Math.min(room.depth - r.d, snap(drag.oy + dy))),
    });
  };
  const onUp = () => {
    if (!drag) return;
    if (drag.moved && (drag.x !== drag.ox || drag.y !== drag.oy)) {
      onSelect?.(drag.id);
      onMove?.(drag.id, drag.x, drag.y);
    } else {
      onSelect?.(drag.id); // tapping a marked piece keeps it marked (and reopens its tray)
    }
    setDrag(null);
  };
  const shown = items.map((f) => (drag && drag.id === f.id ? { ...f, x: drag.x, y: drag.y } : f));
  const W = room.width;
  const D = room.depth;
  const pad = mini ? 10 : 30;
  const minX = -D * C - pad;
  const maxX = W * C + pad;
  const wallH = room.height ?? DEFAULT_WALL_H;
  const minY = -wallH - (mini ? 10 : 40);
  const maxY = (W + D) * S + pad;

  const sorted = [...shown].sort((a, b) => {
    const ra = footprint(a);
    const rb = footprint(b);
    return ra.x + ra.w / 2 + ra.y + ra.d / 2 - (rb.x + rb.w / 2 + rb.y + rb.d / 2);
  });

  const { window: win, door } = room;
  const winLow = win.sill ?? 90;
  const winHigh = winLow + (win.height ?? 90);
  const doorHigh = door.height ?? 195;
  const grid: number[] = [];
  for (let i = 100; i < Math.max(W, D); i += 100) grid.push(i);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      onPointerMove={onMoveEvt}
      onPointerUp={onUp}
      onPointerCancel={() => setDrag(null)}
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      preserveAspectRatio="xMidYMid meet"
      onClick={() => !drag && onSelect?.(null)}
      role="img"
      aria-label={`3D-visning av ${room.name}`}
    >
      <ZebraDefs id={pid} />
      {/* floor */}
      <polygon points={poly([[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]])} fill="var(--room-floor)" stroke="var(--ink)" strokeWidth={1.5} />
      {!mini &&
        grid.map((g) => (
          <g key={g} stroke="var(--line)" strokeWidth={0.8}>
            {g < W && <polyline points={poly([[g, 0, 0], [g, D, 0]])} />}
            {g < D && <polyline points={poly([[0, g, 0], [W, g, 0]])} />}
          </g>
        ))}
      {/* back wall (y = 0) */}
      <polygon points={poly([[0, 0, 0], [W, 0, 0], [W, 0, wallH], [0, 0, wallH]])} fill="var(--room-wall)" stroke="var(--ink)" strokeWidth={1.5} />
      {/* left wall (x = 0) */}
      <polygon points={poly([[0, 0, 0], [0, D, 0], [0, D, wallH], [0, 0, wallH]])} fill="var(--room-wall-side)" stroke="var(--ink)" strokeWidth={1.5} />

      {/* window */}
      {win.wall === 'back' ? (
        <polygon points={poly([[win.offset, 0, winLow], [win.offset + win.length, 0, winLow], [win.offset + win.length, 0, winHigh], [win.offset, 0, winHigh]])} fill="var(--room-window)" stroke="var(--ink)" strokeWidth={1.5} />
      ) : (
        <polygon points={poly([[0, win.offset, winLow], [0, win.offset + win.length, winLow], [0, win.offset + win.length, winHigh], [0, win.offset, winHigh]])} fill="var(--room-window)" stroke="var(--ink)" strokeWidth={1.5} />
      )}
      {/* door */}
      {door.wall === 'left' ? (
        <polygon points={poly([[0, door.offset, 0], [0, door.offset + door.length, 0], [0, door.offset + door.length, doorHigh], [0, door.offset, doorHigh]])} fill="var(--bg)" stroke="var(--ink)" strokeWidth={1.5} />
      ) : (
        <polygon points={poly([[door.offset, 0, 0], [door.offset + door.length, 0, 0], [door.offset + door.length, 0, doorHigh], [door.offset, 0, doorHigh]])} fill="var(--bg)" stroke="var(--ink)" strokeWidth={1.5} />
      )}

      {/* outlets and extra windows on the two visible walls */}
      {(room.fixtures ?? [])
        .filter((f) => (f.kind === 'outlet' || f.kind === 'window') && (f.wall === 'back' || f.wall === 'left'))
        .map((f) => {
          const o = f.offset ?? 0;
          const along = (a: number, z: number): [number, number, number] => (f.wall === 'back' ? [a, 0, z] : [0, a, z]);
          const [a0, a1, z0, z1] = f.kind === 'outlet' ? [o - 6, o + 6, 25, 37] : [o - 50, o + 50, winLow, winHigh];
          return (
            <polygon
              key={f.id}
              points={poly([along(a0, z0), along(a1, z0), along(a1, z1), along(a0, z1)])}
              fill={f.kind === 'outlet' ? 'var(--bg)' : 'var(--room-window)'}
              stroke="var(--ink)"
              strokeWidth={1.2}
            />
          );
        })}

      {/* furniture blocks */}
      {sorted.map((f) => {
        const r = footprint(f);
        const { x, y, w, d } = r;
        const h = f.height;
        const isSel = f.id === selectedId || f.id === drag?.id;
        const stroke = {
          stroke: 'var(--ink)',
          strokeWidth: isSel ? 3.5 : 1,
          strokeLinejoin: 'round' as const,
          vectorEffect: 'non-scaling-stroke' as const,
        };
        return (
          <g
            key={f.id}
            onPointerDown={(e) => onDown(e, f)}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: mini ? 'default' : 'grab' }}
          >
            <polygon points={poly([[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, h], [x, y + d, h]])} fill={fillFor(f.color, pid, 0.15)} {...stroke} />
            <polygon points={poly([[x + w, y, 0], [x + w, y + d, 0], [x + w, y + d, h], [x + w, y, h]])} fill={fillFor(f.color, pid, 0.3)} {...stroke} />
            <polygon points={poly([[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]])} fill={fillFor(f.color, pid)} {...stroke} />
          </g>
        );
      })}

      {/* labels above blocks */}
      {!mini &&
        sorted.map((f) => {
          const r = footprint(f);
          const [cx, cy] = P(r.x + r.w / 2, r.y + r.d / 2, f.height);
          if (f.id === selectedId || f.id === drag?.id)
            return (
              <text key={'n' + f.id} x={cx} y={cy - 12} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--ink)" stroke="var(--bg)" strokeWidth={4} style={{ paintOrder: 'stroke' }} pointerEvents="none">
                {f.name}
              </text>
            );
          return null;
        })}
    </svg>
  );
}
