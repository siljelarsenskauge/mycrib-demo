import { useState } from 'react';
import { IsoView3D } from '../components/IsoView3D';
import { PlanView2D } from '../components/PlanView2D';
import { fmtTime, navigate, TopBar } from '../components/ui';
import { dims } from '../state/geometry';
import { restoreVersion } from '../state/mutations';
import { useStore } from '../state/store';

/** Lagrede versjoner: versions the user chose to keep with «Lagre versjon» */
export function VersionHistoryScreen({ roomId }: { roomId: string }) {
  const { state } = useStore();
  const room = state.rooms.find((r) => r.id === roomId);
  const snaps = state.snapshots.filter((s) => s.roomId === roomId).sort((a, b) => b.createdAt - a.createdAt);
  if (!room) return null;
  return (
    <div className="screen">
      <TopBar title="Lagrede versjoner" back={`/room/${roomId}`} />
      <div className="scroll">
        <p className="hint" style={{ marginBottom: 8 }}>
          Lagre en versjon med «Lagre versjon» i rommet når du er fornøyd, og gjenopprett den senere hvis du ombestemmer deg.
        </p>
        {snaps.map((s) => (
          <button key={s.id} className="row" onClick={() => navigate(`/room/${roomId}/history/${s.id}`)}>
            <span className="thumb" style={{ width: 64, height: 50 }}>
              <IsoView3D room={room} items={s.furniture} mini />
            </span>
            <span className="row-main">
              <span className="row-title">
                {s.label}
                {s.auto && <span className="version-tag">automatisk</span>}
              </span>
              <br />
              <span className="row-meta">{fmtTime(s.createdAt)}</span>
            </span>
            <span className="chev">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SnapshotScreen({ roomId, snapId }: { roomId: string; snapId: string }) {
  const { state, update, showToast } = useStore();
  const [mode, setMode] = useState<'3d' | '2d'>('3d');
  const [confirming, setConfirming] = useState(false);
  const room = state.rooms.find((r) => r.id === roomId);
  const snap = state.snapshots.find((s) => s.id === snapId);
  if (!room || !snap) return null;
  const view = { room, items: snap.furniture };

  const restore = () => {
    update((d) => restoreVersion(d, roomId, snapId));
    showToast(`Gjenopprettet «${snap.label}». Rommet slik det var, er lagret automatisk.`);
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="screen" style={{ position: 'relative' }}>
      <TopBar title={snap.label} back={`/room/${roomId}/history`} />
      <div className="room-stage" style={{ flex: '0 0 46%' }}>
        <div className="stage-canvas">{mode === '3d' ? <IsoView3D {...view} /> : <PlanView2D {...view} />}</div>
        <div className="stage-tools">
          <div className="segmented" role="group" aria-label="Visning">
            <button aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>
              3D
            </button>
            <button aria-pressed={mode === '2d'} onClick={() => setMode('2d')}>
              2D
            </button>
          </div>
        </div>
      </div>
      <div className="scroll" style={{ borderTop: '1px solid var(--line)' }}>
        <p className="row-meta">Lagret {fmtTime(snap.createdAt).toLowerCase()}</p>
        <div className="version-actions">
          <button className="btn btn-primary" onClick={() => setConfirming(true)}>
            Gjenopprett denne versjonen
          </button>
        </div>
        <h2 className="section-title">Møbler i denne versjonen</h2>
        {snap.furniture.length === 0 && <p className="empty">Ingen møbler.</p>}
        {snap.furniture.map((f) => (
          <div key={f.id} className="row" style={{ minHeight: 44 }}>
            <span className="row-main">{f.name}</span>
            <span className="row-meta">{dims(f)}</span>
          </div>
        ))}
      </div>

      {confirming && (
        <div className="dialog-wrap" onClick={() => setConfirming(false)}>
          <div className="dialog" role="alertdialog" aria-labelledby="restore-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="restore-title">Gjenopprette «{snap.label}»?</h2>
            <p className="hint">Rommet slik det ser ut nå, lagres automatisk først, så du kan gå tilbake til det senere.</p>
            <div className="actions">
              <button className="btn" onClick={() => setConfirming(false)}>
                Avbryt
              </button>
              <button className="btn btn-primary" onClick={restore}>
                Gjenopprett
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
