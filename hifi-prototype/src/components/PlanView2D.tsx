import { useRef, useState, type PointerEvent } from 'react';
import { doorSwing, footprint, gaps, pairIgnored, type Gap } from '../state/geometry';
import type { Furniture } from '../state/types';
import { fillFor, fixturePoint, usePatternId, ZebraDefs, type RoomViewProps } from './roomShared';

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

/** Top-down floor plan with measurements. Furniture can be tapped and dragged. */
export function PlanView2D({ room, items, selectedId, highlightId, onSelect, onMove, mini }: RoomViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const pid = usePatternId();
  const W = room.width;
  const D = room.depth;
  // extra room on the left when the door swings outwards, so the arc isn't cut off
  const pad = mini ? (room.door.opensOut ? room.door.length + 4 : 12) : room.door.opensOut ? Math.max(56, room.door.length + 16) : 56;

  const toSvg = (e: PointerEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };

  const shown: Furniture[] = items.map((f) => (drag && drag.id === f.id ? { ...f, x: drag.x, y: drag.y } : f));

  const onDown = (e: PointerEvent, f: Furniture) => {
    if (mini || !onSelect || f.locked) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const p = toSvg(e);
    setDrag({ id: f.id, px: p.x, py: p.y, ox: f.x, oy: f.y, x: f.x, y: f.y, moved: false });
  };
  const onMoveEvt = (e: PointerEvent) => {
    if (!drag) return;
    const p = toSvg(e);
    const f = items.find((i) => i.id === drag.id)!;
    const r = footprint(f);
    const dx = p.x - drag.px;
    const dy = p.y - drag.py;
    const moved = drag.moved || Math.hypot(dx, dy) > 8;
    const snap = (v: number) => Math.round(v / 5) * 5;
    const x = Math.max(0, Math.min(W - r.w, snap(drag.ox + dx)));
    const y = Math.max(0, Math.min(D - r.d, snap(drag.oy + dy)));
    setDrag({ ...drag, x, y, moved });
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

  const focusId = drag?.id ?? selectedId ?? highlightId;
  const focus = shown.find((f) => f.id === focusId);
  const focusGaps: Gap[] = focus && !mini ? gaps(room, shown, focus) : [];

  const { window: win, door } = room;
  const label = mini ? 0 : 17;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`${-pad} ${-pad} ${W + pad * 2} ${D + pad * 2}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={onMoveEvt}
      onPointerUp={onUp}
      onPointerCancel={() => setDrag(null)}
      onClick={() => !drag && onSelect?.(null)}
      role="img"
      aria-label={`Floor plan of ${room.name}, ${W} × ${D} cm`}
    >
      <ZebraDefs id={pid} />
      {/* floor + walls */}
      <rect x={0} y={0} width={W} height={D} fill="var(--room-floor)" stroke="var(--room-line)" strokeWidth={mini ? 4 : 6} />

      {/* window */}
      {win.wall === 'back' ? (
        <g>
          <rect x={win.offset} y={-5} width={win.length} height={10} fill="var(--room-window)" stroke="var(--room-line)" strokeWidth={1.5} />
          <line x1={win.offset} x2={win.offset + win.length} y1={0} y2={0} stroke="var(--room-line)" strokeWidth={1} />
        </g>
      ) : (
        <g>
          <rect x={-5} y={win.offset} width={10} height={win.length} fill="var(--room-window)" stroke="var(--room-line)" strokeWidth={1.5} />
          <line y1={win.offset} y2={win.offset + win.length} x1={0} x2={0} stroke="var(--room-line)" strokeWidth={1} />
        </g>
      )}

      {/* door: opening + swing arc */}
      {door.wall === 'right' ? (
        <rect x={W - 5} y={door.offset} width={10} height={door.length} fill="var(--room-floor)" />
      ) : door.wall === 'left' ? (
        <g>
          <rect x={-5} y={door.offset} width={10} height={door.length} fill="var(--room-floor)" />
          <line {...doorSwing(door.offset, door.length, door.opensOut, door.hinge).leaf} stroke="var(--room-line)" strokeWidth={2} />
          <path d={doorSwing(door.offset, door.length, door.opensOut, door.hinge).arc} fill="none" stroke="var(--color-text-placeholder)" strokeWidth={1.2} strokeDasharray="4 4" />
        </g>
      ) : (
        <g>
          <rect x={door.offset} y={-5} width={door.length} height={10} fill="var(--room-floor)" />
          <line x1={door.offset} y1={0} x2={door.offset} y2={door.length} stroke="var(--room-line)" strokeWidth={2} />
          <path d={`M ${door.offset} ${door.length} A ${door.length} ${door.length} 0 0 0 ${door.offset + door.length} 0`} fill="none" stroke="var(--color-text-placeholder)" strokeWidth={1.2} strokeDasharray="4 4" />
        </g>
      )}

      {/* room dimensions */}
      {!mini && (
        <g fontSize={label} fill="var(--color-text-secondary)" fontWeight={500}>
          <line x1={0} x2={W} y1={-30} y2={-30} stroke="var(--color-text-placeholder)" strokeWidth={1} />
          <line x1={0} x2={0} y1={-36} y2={-24} stroke="var(--color-text-placeholder)" />
          <line x1={W} x2={W} y1={-36} y2={-24} stroke="var(--color-text-placeholder)" />
          <text x={W / 2} y={-38} textAnchor="middle">
            {W} cm
          </text>
          <line y1={0} y2={D} x1={-30} x2={-30} stroke="var(--color-text-placeholder)" strokeWidth={1} />
          <line y1={0} y2={0} x1={-36} x2={-24} stroke="var(--color-text-placeholder)" />
          <line y1={D} y2={D} x1={-36} x2={-24} stroke="var(--color-text-placeholder)" />
          <text x={-38} y={D / 2} textAnchor="middle" transform={`rotate(-90 ${-38} ${D / 2})`}>
            {D} cm
          </text>
          <text x={win.wall === 'back' ? win.offset + win.length / 2 : 14} y={win.wall === 'back' ? 22 : win.offset + win.length / 2} textAnchor={win.wall === 'back' ? 'middle' : 'start'} fontSize={13} fill="var(--color-text-placeholder)">
            window
          </text>
          {door.wall === 'right' ? (
            <text x={W - 10} y={door.offset + door.length / 2 + 4} textAnchor="end" fontSize={13} fill="var(--color-text-placeholder)">
              opening
            </text>
          ) : (
            <text x={door.wall === 'left' ? 10 : door.offset + 6} y={door.wall === 'left' ? door.offset + door.length + 18 : door.length + 18} fontSize={13} fill="var(--color-text-placeholder)">
              door
            </text>
          )}
        </g>
      )}

      {/* more openings without a door leaf (Rathi 28.10) */}
      {(room.openings ?? []).map((o, i) => {
        const vertical = o.wall === 'left' || o.wall === 'right';
        const x = o.wall === 'left' ? -5 : o.wall === 'right' ? W - 5 : o.offset;
        const y = o.wall === 'back' ? -5 : o.wall === 'front' ? D - 5 : o.offset;
        return (
          <g key={`op${i}`} pointerEvents="none">
            <rect x={x} y={y} width={vertical ? 10 : o.length} height={vertical ? o.length : 10} fill="var(--room-floor)" />
            {!mini && (
              <text
                x={vertical ? (o.wall === 'right' ? W - 10 : 10) : o.offset + o.length / 2}
                y={vertical ? o.offset + o.length / 2 + 4 : o.wall === 'front' ? D - 10 : 22}
                textAnchor={vertical ? (o.wall === 'right' ? 'end' : 'start') : 'middle'}
                fontSize={13}
                fill="var(--color-text-placeholder)"
              >
                opening
              </text>
            )}
          </g>
        );
      })}

      {/* outlets, lights, extra windows, radiators */}
      {(room.fixtures ?? []).map((f) => {
        const p = fixturePoint(room, f);
        const angle = (Math.atan2(p.uy, p.ux) * 180) / Math.PI;
        const s = mini ? 1.6 : 1;
        return (
          <g key={f.id} transform={`translate(${p.x} ${p.y}) rotate(${angle}) scale(${s})`} pointerEvents="none">
            {f.kind === 'outlet' && (
              <>
                <circle r={11} fill="var(--color-background-default)" stroke="var(--room-line)" strokeWidth={1.4} />
                <line x1={-3.5} y1={-4} x2={-3.5} y2={4} stroke="var(--room-line)" strokeWidth={1.4} />
                <line x1={3.5} y1={-4} x2={3.5} y2={4} stroke="var(--room-line)" strokeWidth={1.4} />
              </>
            )}
            {f.kind === 'light' && (
              <>
                <circle r={13} fill="var(--color-background-default)" stroke="var(--room-line)" strokeWidth={1.4} />
                <line x1={-9} y1={-9} x2={9} y2={9} stroke="var(--room-line)" strokeWidth={1.4} />
                <line x1={-9} y1={9} x2={9} y2={-9} stroke="var(--room-line)" strokeWidth={1.4} />
              </>
            )}
            {f.kind === 'window' && <rect x={-50} y={-5} width={100} height={10} fill="var(--room-window)" stroke="var(--room-line)" strokeWidth={1.5} />}
            {f.kind === 'radiator' && <rect x={-40} y={f.wall === 'front' || f.wall === 'right' ? -18 : 4} width={80} height={14} fill="var(--color-surface-default)" stroke="var(--room-line)" strokeWidth={1.2} strokeDasharray="4 3" />}
          </g>
        );
      })}

      {/* furniture */}
      {shown.map((f) => {
        const r = footprint(f);
        const isSel = f.id === selectedId || f.id === drag?.id;
        // a group (the corner sofa) is named once, on its first piece
        const showName = !mini && r.w >= 60 && r.d >= 30 && (!f.group || shown.find((g) => g.group === f.group)?.id === f.id);
        return (
          <g
            key={f.id}
            onPointerDown={(e) => onDown(e, f)}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: mini || f.locked ? 'default' : 'grab' }}
          >
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.d}
              rx={f.shape === 'round' ? r.w / 2 : f.group ? 2 : 4}
              ry={f.shape === 'round' ? r.d / 2 : f.group ? 2 : 4}
              fill={fillFor(f.color, pid)}
              stroke={isSel ? 'var(--color-text-primary)' : 'var(--room-line)'}
              strokeWidth={isSel ? 1.5 : 1}
              vectorEffect="non-scaling-stroke"
            />
            {isSel && <rect x={r.x - 3} y={r.y - 3} width={r.w + 6} height={r.d + 6} rx={f.shape === 'round' ? r.w / 2 + 3 : 6} ry={f.shape === 'round' ? r.d / 2 + 3 : 6} fill="none" stroke="var(--room-selected)" strokeWidth={6} vectorEffect="non-scaling-stroke" />}
            {showName && (
              <text x={r.x + r.w / 2} y={r.y + r.d / 2 + 6} textAnchor="middle" fontSize={16} fontWeight={600} fill="var(--color-text-primary)" pointerEvents="none" style={{ paintOrder: 'stroke' }} stroke="rgba(250,249,247,0.7)" strokeWidth={3}>
                {f.name}
              </text>
            )}
          </g>
        );
      })}

      {/* pieces of one element (the corner sofa): cover the line where they meet, so it reads as one */}
      {shown.flatMap((a, i) =>
        shown.slice(i + 1).flatMap((b) => {
          if (!a.group || a.group !== b.group) return [];
          const p = footprint(a);
          const q = footprint(b);
          const x0 = Math.max(p.x, q.x) + 1.5;
          const x1 = Math.min(p.x + p.w, q.x + q.w) - 1.5;
          const y0 = Math.max(p.y, q.y) + 1.5;
          const y1 = Math.min(p.y + p.d, q.y + q.d) - 1.5;
          const fill = fillFor(a.color, pid);
          const key = `seam-${a.id}-${b.id}`;
          if (Math.abs(p.y + p.d - q.y) < 1 || Math.abs(q.y + q.d - p.y) < 1) {
            const y = Math.abs(p.y + p.d - q.y) < 1 ? q.y : p.y;
            return x1 > x0 ? [<rect key={key} x={x0} y={y - 2} width={x1 - x0} height={4} fill={fill} pointerEvents="none" />] : [];
          }
          if (Math.abs(p.x + p.w - q.x) < 1 || Math.abs(q.x + q.w - p.x) < 1) {
            const x = Math.abs(p.x + p.w - q.x) < 1 ? q.x : p.x;
            return y1 > y0 ? [<rect key={key} x={x - 2} y={y0} width={4} height={y1 - y0} fill={fill} pointerEvents="none" />] : [];
          }
          return [];
        }),
      )}

      {/* distances for selected / highlighted item */}
      {focusGaps.map((g) => {
        const tight = !!g.target && g.dist < 80 && !pairIgnored(g.target, focus!);
        const mx = (g.x1 + g.x2) / 2;
        const my = (g.y1 + g.y2) / 2;
        const txt = `${Math.round(g.dist)} cm`;
        if (g.dist < 1) return null;
        return (
          <g key={g.dir} pointerEvents="none">
            <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke={tight ? 'var(--color-status-warning-text)' : 'var(--color-text-secondary)'} strokeWidth={1.5} strokeDasharray={tight ? undefined : '3 3'} vectorEffect="non-scaling-stroke" />
            <rect x={mx - 32} y={my - 12} width={64} height={24} rx={12} fill={tight ? 'var(--color-status-warning-background)' : 'var(--color-background-default)'} stroke={tight ? 'var(--color-status-warning-border)' : 'var(--color-border-default)'} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={mx} y={my + 5} textAnchor="middle" fontSize={13} fontWeight={500} fontFamily="var(--font-body)" fill={tight ? 'var(--color-status-warning-text)' : 'var(--color-text-primary)'}>
              {tight ? `⚠ ${txt}` : txt}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
