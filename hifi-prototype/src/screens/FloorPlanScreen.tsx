// Floor plan for a room: shows the room drawn from above, the uploaded file, and lets the user replace or delete it.
import { useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { PlanView2D } from '../components/PlanView2D';
import { Button, fmtDay, IconButton, Loading, navigate } from '../components/ui';
import { getRoom } from '../state/mutations';
import { useStore } from '../state/store';

export function FloorPlanScreen({ roomId }: { roomId: string }) {
  const { state, update, showToast } = useStore();
  const room = state.rooms.find((r) => r.id === roomId);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!room) {
    navigate('/', true);
    return null;
  }
  const back = () => navigate(`/room/${roomId}/settings`);

  return (
    <div className="screen floor-plan">
      <header className="topbar">
        <IconButton icon="chevron_left" label="Back to room settings" onClick={back} />
        <h1 className="topbar-title-static">Floor plan</h1>
        <span className="topbar-spacer" />
      </header>
      <div className="screen-scroll create-scroll stack">
        <div className="plan-card plan-card-tall">
          <PlanView2D room={room} items={room.furniture} />
        </div>
        <p className="field-help plan-caption">The room as the AI understands it, {room.width} × {room.depth} cm.</p>

        {room.floorPlan ? (
          <>
            <h2 className="overline">Current file</h2>
            <div className="source-row">
              <span className="source-icon">
                <Icon name="floor_plan" size={22} />
              </span>
              <span className="source-text">
                <strong>{room.floorPlan.name}</strong>
                <span>Uploaded {fmtDay(room.floorPlan.at).toLowerCase()} · used in the 3D model</span>
              </span>
            </div>
          </>
        ) : (
          <p className="empty">No floor plan uploaded. The room is built from the scan or the measurements.</p>
        )}

        <Button block icon="upload" className="plan-upload" onClick={() => fileRef.current?.click()}>
          {room.floorPlan ? 'Upload new floor plan' : 'Upload floor plan'}
        </Button>
        <p className="hint">
          <Icon name="lightbulb" size={16} />
          Image or PDF. The new one replaces the current one, and the AI reads the measurements again.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setReading(true);
            window.setTimeout(() => {
              update((d) => {
                const r = getRoom(d, roomId);
                r.floorPlan = { name: f.name, at: Date.now() };
                r.modelUpdatedAt = Date.now();
              });
              setReading(false);
              showToast('The floor plan is read – 4 walls, 1 door, 1 window');
            }, 1600);
          }}
        />

        {room.floorPlan && (
          <button
            className="text-button is-danger centered"
            onClick={() => {
              update((d) => {
                getRoom(d, roomId).floorPlan = undefined;
              });
              showToast('Floor plan deleted');
            }}
          >
            <Icon name="delete" size={20} /> Delete floor plan
          </button>
        )}
      </div>
      {reading && (
        <div className="scrim">
          <section className="sheet">
            <div className="sheet-body">
              <Loading text="AI is reading the floor plan …" sub="Finding walls, doors and windows" />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
