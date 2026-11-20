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
    if (mini || !onSelect) return;
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
      aria-label={`Plantegning av ${room.name}, ${W} × ${D} cm`}
    >
      <ZebraDefs id={pid} />
      {/* floor + walls */}
      <rect x={0} y={0} width={W} height={D} fill="var(--room-floor)" stroke="var(--ink)" strokeWidth={mini ? 4 : 6} />

      {/* window */}
      {win.wall === 'back' ? (
        <g>
          <rect x={win.offset} y={-5} width={win.length} height={10} fill="var(--room-window)" stroke="var(--ink)" strokeWidth={1.5} />
          <line x1={win.offset} x2={win.offset + win.length} y1={0} y2={0} stroke="var(--ink)" strokeWidth={1} />
        </g>
      ) : (
        <g>
          <rect x={-5} y={win.offset} width={10} height={win.length} fill="var(--room-window)" stroke="var(--ink)" strokeWidth={1.5} />
          <line y1={win.offset} y2={win.offset + win.length} x1={0} x2={0} stroke="var(--ink)" strokeWidth={1} />
        </g>
      )}

      {/* door: opening + swing arc */}
      {door.wall === 'left' ? (
        <g>
          <rect x={-5} y={door.offset} width={10} height={door.length} fill="var(--room-floor)" />
          <line {...doorSwing(door.offset, door.length, door.opensOut, door.hinge).leaf} stroke="var(--ink)" strokeWidth={2} />
          <path d={doorSwing(door.offset, door.length, door.opensOut, door.hinge).arc} fill="none" stroke="var(--ink-3)" strokeWidth={1.2} strokeDasharray="4 4" />
        </g>
      ) : (
        <g>
          <rect x={door.offset} y={-5} width={door.length} height={10} fill="var(--room-floor)" />
          <line x1={door.offset} y1={0} x2={door.offset} y2={door.length} stroke="var(--ink)" strokeWidth={2} />
          <path d={`M ${door.offset} ${door.length} A ${door.length} ${door.length} 0 0 0 ${door.offset + door.length} 0`} fill="none" stroke="var(--ink-3)" strokeWidth={1.2} strokeDasharray="4 4" />
        </g>
      )}

      {/* room dimensions */}
      {!mini && (
        <g fontSize={label} fill="var(--ink-2)" fontWeight={500}>
          <line x1={0} x2={W} y1={-30} y2={-30} stroke="var(--ink-3)" strokeWidth={1} />
          <line x1={0} x2={0} y1={-36} y2={-24} stroke="var(--ink-3)" />
          <line x1={W} x2={W} y1={-36} y2={-24} stroke="var(--ink-3)" />
          <text x={W / 2} y={-38} textAnchor="middle">
            {W} cm
          </text>
          <line y1={0} y2={D} x1={-30} x2={-30} stroke="var(--ink-3)" strokeWidth={1} />
          <line y1={0} y2={0} x1={-36} x2={-24} stroke="var(--ink-3)" />
          <line y1={D} y2={D} x1={-36} x2={-24} stroke="var(--ink-3)" />
          <text x={-38} y={D / 2} textAnchor="middle" transform={`rotate(-90 ${-38} ${D / 2})`}>
            {D} cm
          </text>
          <text x={win.wall === 'back' ? win.offset + win.length / 2 : 14} y={win.wall === 'back' ? 22 : win.offset + win.length / 2} textAnchor={win.wall === 'back' ? 'middle' : 'start'} fontSize={13} fill="var(--ink-3)">
            vindu
          </text>
          <text x={door.wall === 'left' ? 10 : door.offset + 6} y={door.wall === 'left' ? door.offset + door.length + 18 : door.length + 18} fontSize={13} fill="var(--ink-3)">
            dør
          </text>
        </g>
      )}

      {/* outlets, lights, extra windows, radiators */}
      {(room.fixtures ?? []).map((f) => {
        const p = fixturePoint(room, f);
        const angle = (Math.atan2(p.uy, p.ux) * 180) / Math.PI;
        const s = mini ? 1.6 : 1;
        return (
          <g key={f.id} transform={`translate(${p.x} ${p.y}) rotate(${angle}) scale(${s})`} pointerEvents="none">
            {f.kind === 'outlet' && (
              <>
                <circle r={11} fill="var(--bg)" stroke="var(--ink)" strokeWidth={1.4} />
                <line x1={-3.5} y1={-4} x2={-3.5} y2={4} stroke="var(--ink)" strokeWidth={1.4} />
                <line x1={3.5} y1={-4} x2={3.5} y2={4} stroke="var(--ink)" strokeWidth={1.4} />
              </>
            )}
            {f.kind === 'light' && (
              <>
                <circle r={13} fill="var(--bg)" stroke="var(--ink)" strokeWidth={1.4} />
                <line x1={-9} y1={-9} x2={9} y2={9} stroke="var(--ink)" strokeWidth={1.4} />
                <line x1={-9} y1={9} x2={9} y2={-9} stroke="var(--ink)" strokeWidth={1.4} />
              </>
            )}
            {f.kind === 'window' && <rect x={-50} y={-5} width={100} height={10} fill="var(--room-window)" stroke="var(--ink)" strokeWidth={1.5} />}
            {f.kind === 'radiator' && <rect x={-40} y={f.wall === 'front' || f.wall === 'right' ? -18 : 4} width={80} height={14} fill="var(--surface-2)" stroke="var(--ink)" strokeWidth={1.2} strokeDasharray="4 3" />}
          </g>
        );
      })}

      {/* furniture */}
      {shown.map((f) => {
        const r = footprint(f);
        const isSel = f.id === selectedId || f.id === drag?.id;
        const showName = !mini && r.w >= 60 && r.d >= 30;
        return (
          <g
            key={f.id}
            onPointerDown={(e) => onDown(e, f)}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: mini ? 'default' : 'grab' }}
          >
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.d}
              rx={4}
              fill={fillFor(f.color, pid)}
              stroke="var(--ink)"
              strokeWidth={isSel ? 3.5 : 1}
              vectorEffect="non-scaling-stroke"
            />
            {isSel && <rect x={r.x - 5} y={r.y - 5} width={r.w + 10} height={r.d + 10} rx={8} fill="none" stroke="var(--ink)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
            {showName && (
              <text x={r.x + r.w / 2} y={r.y + r.d / 2 + 6} textAnchor="middle" fontSize={16} fontWeight={600} fill={f.color === 'zebra' ? '#d00' : 'var(--ink)'} pointerEvents="none" style={{ paintOrder: 'stroke' }} stroke="rgba(255,255,255,0.7)" strokeWidth={3}>
                {f.name}
              </text>
            )}
          </g>
        );
      })}

      {/* distances for selected / highlighted item */}
      {focusGaps.map((g) => {
        const tight = !!g.target && g.dist < 80 && !pairIgnored(g.target, focus!);
        const mx = (g.x1 + g.x2) / 2;
        const my = (g.y1 + g.y2) / 2;
        const txt = `${Math.round(g.dist)} cm`;
        if (g.dist < 1) return null;
        return (
          <g key={g.dir} pointerEvents="none">
            <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray={tight ? undefined : '3 3'} markerEnd="" vectorEffect="non-scaling-stroke" />
            <rect x={mx - 30} y={my - 12} width={60} height={22} rx={11} fill={tight ? 'var(--ink)' : 'var(--bg)'} stroke="var(--ink)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={mx} y={my + 4} textAnchor="middle" fontSize={13} fontWeight={700} fill={tight ? 'var(--on-primary)' : 'var(--ink)'}>
              {txt}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
