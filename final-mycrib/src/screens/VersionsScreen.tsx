// Saved versions: the list, and one version with «Restore this version» (asks first; the current room is saved first).
import { useState } from 'react';
import { PaletteVersionImage } from '../components/NaturePalette';
import { FurnitureThumb } from '../components/FurnitureThumb';
import { IsoView3D } from '../components/IsoView3D';
import { PlanView2D } from '../components/PlanView2D';
import { Button, ConfirmDialog, fmtDay, IconButton, ListRow, navigate, SegmentedTabs } from '../components/ui';
import { dims } from '../state/geometry';
import { restoreVersion } from '../state/mutations';
import { useStore } from '../state/store';

export function VersionsScreen({ roomId }: { roomId: string }) {
  const { state } = useStore();
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) {
    navigate('/', true);
    return null;
  }
  const versions = state.snapshots.filter((s) => s.roomId === roomId).sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div className="screen versions">
      <header className="topbar">
        <IconButton icon="chevron_left" label="Back to the room" onClick={() => navigate(`/room/${roomId}`)} />
        <h1 className="topbar-title-static">Saved versions</h1>
        <span className="topbar-spacer" />
      </header>
      <div className="screen-scroll create-scroll stack">
        {versions.length === 0 && <p className="empty">No saved versions yet. Use the save button in the room to keep a version.</p>}
        {versions.map((s) => (
          <ListRow
            key={s.id}
            title={s.label}
            meta={`${fmtDay(s.createdAt)}${s.auto ? ' · automatic' : ''}`}
            leading={
              <span className="list-thumb">
                {s.palette ? <PaletteVersionImage version={s} /> : <IsoView3D room={room} items={s.furniture} mini />}
              </span>
            }
            onClick={() => navigate(`/room/${roomId}/history/${s.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

export function VersionScreen({ roomId, versionId }: { roomId: string; versionId: string }) {
  const { state, update, showToast } = useStore();
  const room = state.rooms.find((r) => r.id === roomId);
  const version = state.snapshots.find((s) => s.id === versionId);
  const [mode, setMode] = useState<'3d' | '2d'>('3d');
  const [confirm, setConfirm] = useState(false);
  if (!room || !version) {
    navigate(room ? `/room/${roomId}/history` : '/', true);
    return null;
  }
  const restore = () => {
    update((d) => restoreVersion(d, roomId, versionId));
    showToast(`Restored «${version.label}»`);
    navigate(`/room/${roomId}`);
  };
  return (
    <div className="screen version">
      <header className="topbar">
        <IconButton icon="chevron_left" label="Back to saved versions" onClick={() => navigate(`/room/${roomId}/history`)} />
        <h1 className="topbar-title-static">{version.label}</h1>
        <span className="topbar-spacer" />
      </header>
      <div className="screen-scroll create-scroll stack">
        <div className="version-view">
          <SegmentedTabs
            className="version-tabs"
            label="View"
            tabs={[
              { id: '3d', label: '3D' },
              { id: '2d', label: '2D' },
            ]}
            value={mode}
            onChange={setMode}
          />
          <div className="version-canvas">{mode === '3d' ? <IsoView3D room={room} items={version.furniture} mini /> : <PlanView2D room={room} items={version.furniture} />}</div>
        </div>
        <p className="field-help">Saved {fmtDay(version.createdAt).toLowerCase()}{version.auto ? ' · automatic' : ''}</p>
        <Button block onClick={() => setConfirm(true)} className="version-restore">
          Restore this version
        </Button>
        <h2 className="overline">Furniture in this version</h2>
        {version.furniture.length === 0 && <p className="empty">No furniture.</p>}
        {version.furniture.map((f) => (
          <ListRow
            key={f.id}
            title={f.name}
            meta={`${dims(f)} · ${f.colorName}`}
            leading={
              <span className="list-thumb">
                <FurnitureThumb item={f} />
              </span>
            }
          />
        ))}
      </div>
      {confirm && (
        <ConfirmDialog
          title={`Restore «${version.label}»?`}
          text="The room as it is now is saved first as «Before restore»."
          confirmLabel="Restore"
          onConfirm={restore}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}
