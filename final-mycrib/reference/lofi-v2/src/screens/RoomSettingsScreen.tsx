import { useState } from 'react';
import { IsoView3D } from '../components/IsoView3D';
import { PlanView2D } from '../components/PlanView2D';
import { fmtTime, Loading, navigate, TopBar } from '../components/ui';
import type { RoomMeasures } from '../components/MeasureEditor';
import { MODEL_METHODS, UpdateModelSheet, type ModelMethod } from '../components/UpdateModelSheet';
import { clampToRoom } from '../state/geometry';
import { getRoom } from '../state/mutations';
import { useStore } from '../state/store';

/** Rominnstillinger: 3D-modell, plantegning og mål, bilder, moodboard, instrukser */
export function RoomSettingsScreen({ roomId }: { roomId: string }) {
  const { state, update, showToast } = useStore();
  const room = state.rooms.find((r) => r.id === roomId);
  const [instructions, setInstructions] = useState(room?.instructions ?? '');
  const [name, setName] = useState(room?.name ?? '');
  const [updating, setUpdating] = useState(false);
  const [building, setBuilding] = useState(false);
  if (!room) return null;

  /** Simulated rebuild of the room model. Furniture is kept, but pulled inside the new walls. */
  const updateModel = (method: ModelMethod, m: RoomMeasures) => {
    setUpdating(false);
    setBuilding(true);
    const label = MODEL_METHODS.find((x) => x.id === method)!.label;
    window.setTimeout(() => {
      update((d) => {
        const r = getRoom(d, roomId);
        if (method === 'dims') {
          // the room model is still a rectangle, so it uses the longest of the opposite walls
          r.width = Math.max(200, Math.min(1200, Math.max(m.width, m.wallBottom) || r.width));
          r.depth = Math.max(200, Math.min(1200, Math.max(m.depth, m.wallRight) || r.depth));
          r.height = m.height || r.height;
          r.window.length = Math.min(m.windowLength || r.window.length, r.width - 20);
          r.window.offset = Math.max(0, Math.min(r.width - r.window.length, m.windowOffset));
          r.door.length = Math.min(m.doorLength || r.door.length, r.depth - 20);
          r.door.offset = Math.max(0, Math.min(r.depth - r.door.length, m.doorOffset));
          r.window.height = m.windowHeight;
          r.window.sill = m.windowSill;
          r.door.height = m.doorHeight;
          r.door.opensOut = m.doorOpensOut;
          r.door.hinge = m.doorHinge;
          r.fixtures = m.fixtures;
          r.furniture = r.furniture.map((f) => clampToRoom(r, f));
        }
        r.modelUpdatedAt = Date.now();
        r.modelMethod = label;
        r.updatedAt = Date.now();
      });
      setBuilding(false);
      showToast('3D-modellen er oppdatert.');
    }, 2300);
  };

  const save = () => {
    update((d) => {
      const r = d.rooms.find((x) => x.id === roomId)!;
      r.instructions = instructions.trim();
      r.name = name.trim() || r.name;
    });
    showToast('Rominnstillingene er lagret.');
  };

  return (
    <div className="screen" style={{ position: 'relative' }}>
      <TopBar title="Rominnstillinger" back={`/room/${roomId}`} />
      <div className="scroll">
        <div className="field">
          <label htmlFor="rname">Navn</label>
          <input id="rname" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <h2 className="section-title">3D-modell</h2>
        <div style={{ height: 190, border: '1px solid var(--line)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}>
          <IsoView3D room={room} items={room.furniture} mini />
        </div>
        <p className="hint" style={{ margin: '8px 0 10px' }}>
          {room.modelUpdatedAt
            ? `Sist oppdatert ${fmtTime(room.modelUpdatedAt).toLowerCase()} med «${room.modelMethod}»`
            : `Laget med «${room.createdVia}»`}
        </p>
        <button className="btn btn-block" onClick={() => setUpdating(true)}>
          ⟳ Oppdater 3D-modellen
        </button>

        <h2 className="section-title">Plantegning og mål</h2>
        <div style={{ height: 220, border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
          <PlanView2D room={room} items={room.furniture} />
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          {room.width} × {room.depth} cm{room.height ? ` · takhøyde ${room.height} cm` : ''} · 1 vindu · 1 dør
        </p>

        <h2 className="section-title">Bilder av rommet</h2>
        <div className="pins">
          {room.photos.map((p, i) => (
            <div key={i} className="placeholder-img" style={{ height: 90 }}>
              {p}
            </div>
          ))}
          <button
            className="btn"
            style={{ height: 90, borderStyle: 'dashed' }}
            onClick={() =>
              update((d) => {
                const r = d.rooms.find((x) => x.id === roomId)!;
                r.photos.push(`Bilde ${r.photos.length + 1}`);
              })
            }
          >
            + Legg til bilde
          </button>
        </div>

        <h2 className="section-title">Moodboard</h2>
        <button className="row" onClick={() => navigate(`/room/${roomId}/moodboard`)}>
          <span className="row-main">
            <span className="row-title">Moodboard for {room.name}</span>
            <br />
            <span className="row-meta">{room.moodboard.length} bilder lagret</span>
          </span>
          <span className="chev">›</span>
        </button>

        <h2 className="section-title">Instrukser for rommet</h2>
        <div className="field">
          <label htmlFor="instr">Hva bør AI-en vite om dette rommet?</label>
          <textarea
            id="instr"
            className="input"
            placeholder="F.eks. «Jeg liker varme, rolige rom» eller «Vi har en hund som trenger plass»"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-block" onClick={save}>
          Lagre
        </button>
      </div>

      {updating && <UpdateModelSheet room={room} onUpdate={updateModel} onClose={() => setUpdating(false)} />}
      {building && <Loading text="AI oppdaterer rommodellen …" sub="Møblene dine beholdes" />}
    </div>
  );
}
