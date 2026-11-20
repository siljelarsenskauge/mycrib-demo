// The camera shows Rathi's new 360° photo of the living room (furnie/360/equi-a + equi-b as one 4 : 1 strip,
// public/pano/room-scan.jpg, Synne 17.11), not the old room-pano.jpg.
// «Scan room» – ported 1:1 from the group prototype Furnie (reference/Furnie-main, «SKANN ROM», rsOpen/rsTick/rsStart/rsPause).
// The camera pans around the room (the 360° photo, 2560 × 640 like Furnie's four faces), a mesh grows, a scan line
// sweeps, points rise, a chip says how many walls are recorded and a small floor plan is drawn. The scan is simulated:
// +0.9 % every 110 ms. The controls follow direction A (Synne 29.10, Figma 06S.A): a hint in a glass pill and one big
// round button – Start / Pause / Continue / Use the scan.
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { ScanHint, ScanShutter } from '../components/ScanControls';

/** the photo is 4 : 1 (like Furnie's four 640 px faces); it fills the camera view's height */
const RATIO = 4;
const PTS: [number, number][] = [[22, 58], [70, 64], [48, 72], [16, 40], [82, 46], [36, 80], [60, 52], [28, 66], [76, 76], [52, 60], [12, 74], [88, 62]];

export function RoomScanScreen({ onDone, onClose, roomName }: { onDone: () => void; onClose: () => void; roomName?: string }) {
  const [pct, setPct] = useState(0);
  const [run, setRun] = useState(false);
  const timer = useRef<number | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const [viewH, setViewH] = useState(640);
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewH(Math.max(640, el.clientHeight)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!run) return;
    timer.current = window.setTimeout(() => {
      setPct((p) => {
        // twice as fast as Furnie's scan (Synne 18.11: «halvparten av tiden») – about 6 s instead of 12
        const n = Math.min(100, p + 1.8);
        if (n >= 100) setRun(false);
        return n;
      });
    }, 110);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [run, pct]);

  const done = pct >= 100;
  const walls = pct >= 90 ? 4 : pct >= 68 ? 3 : pct >= 44 ? 2 : pct >= 20 ? 1 : 0;
  const stripW = viewH * RATIO;
  const panX = Math.round(-(pct / 100) * stripW);
  const meshOp = run || done ? Math.min(0.55, 0.12 + pct / 160) : pct > 0 ? 0.25 : 0;
  const pts = pct > 3 ? PTS.slice(0, Math.min(PTS.length, Math.floor(pct / 8))) : [];
  const paused = !run && pct > 0 && !done;
  const hint = done
    ? 'The room is recorded'
    : paused
      ? 'Paused – tap to continue'
      : run && pct >= 85
        ? 'Recording floor and ceiling'
        : run && walls > 0
          ? `Wall ${walls} of 4 recorded`
          : 'Walk slowly around the room';
  const label = done ? 'Use the scan' : run ? `${Math.round(pct)} %` : paused ? `Paused · ${Math.round(pct)} %` : 'Start scanning';
  const action = () => (done ? onDone() : setRun(!run));

  return (
    <div className="screen-overlay rs" role="dialog" aria-modal="true" aria-label="Scan room">
      <div className="rs-view" ref={viewRef} aria-label={roomName?.trim() || 'New room'}>
        <div className={'rs-strip-wrap' + (run ? ' is-running' : '')} style={{ height: viewH, marginTop: -viewH / 2 }}>
          <div className="rs-strip" style={{ height: viewH, transform: `translateX(${panX}px)` }}>
            <img src="/pano/room-scan.jpg" alt="" draggable={false} style={{ width: stripW, height: viewH }} />
            <img src="/pano/room-scan.jpg" alt="" draggable={false} style={{ width: stripW, height: viewH }} />
          </div>
        </div>
        <div className="rs-mesh" style={{ opacity: meshOp, backgroundPosition: `${panX}px 0` }} />
        {run && <div className="rs-line" />}
        {pts.map(([x, y], i) => (
          <span key={i} className="rs-pt" style={{ left: `${x}%`, top: `${y}%` }} />
        ))}
        <div className="rs-corners" aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="rs-shade" />
        <div className="rs-top">
          <button className="rs-round" aria-label="Cancel scanning" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
          <span className="rs-pill">Simulated</span>
        </div>
        <ScanHint ok={done || (run && walls > 0 && pct < 85)}>{hint}</ScanHint>
        <ScanShutter
          pct={pct}
          running={run}
          icon={done ? 'check' : 'scan_room'}
          label={label}
          ariaLabel={done ? 'Use the scan' : run ? 'Pause scanning' : paused ? 'Continue scanning' : 'Start scanning'}
          onClick={action}
          onRescan={
            done
              ? () => {
                  setPct(0);
                  setRun(false);
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
