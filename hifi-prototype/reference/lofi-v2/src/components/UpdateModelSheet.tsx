import { useState } from 'react';
import type { Room } from '../state/types';
import { MeasureEditor, type RoomMeasures } from './MeasureEditor';
import { ModalSheet } from './ui';

export type ModelMethod = 'scan' | 'plan' | 'dims' | 'photos';

export const MODEL_METHODS: { id: ModelMethod; icon: string; label: string; sub: string; action: string }[] = [
  { id: 'scan', icon: '⌖', label: 'Scan rommet på nytt', sub: 'Gå rundt i rommet med kameraet', action: 'Start skanning' },
  { id: 'plan', icon: '▭', label: 'Last opp plantegning', sub: 'Bilde eller PDF av plantegningen', action: 'Velg plantegning' },
  { id: 'dims', icon: '↔', label: 'Juster mål', sub: 'Vegger, takhøyde, vindu og dør', action: 'Oppdater modellen' },
  { id: 'photos', icon: '▦', label: 'Last opp nye bilder', sub: 'Noen bilder fra ulike vinkler', action: 'Velg bilder' },
];

/** Simulated: choose how to update the room's 3D model. Furniture is kept. */
export function UpdateModelSheet({
  room,
  onUpdate,
  onClose,
}: {
  room: Room;
  onUpdate: (method: ModelMethod, measures: RoomMeasures) => void;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<ModelMethod | null>(null);
  const [measures, setMeasures] = useState<RoomMeasures>({
    width: room.width,
    depth: room.depth,
    wallRight: room.depth,
    wallBottom: room.width,
    height: room.height ?? 240,
    windowLength: room.window.length,
    windowOffset: room.window.offset,
    windowHeight: room.window.height ?? 90,
    windowSill: room.window.sill ?? 90,
    doorLength: room.door.length,
    doorOffset: room.door.offset,
    doorHeight: room.door.height ?? 195,
    doorOpensOut: !!room.door.opensOut,
    doorHinge: room.door.hinge ?? 'start',
    fixtures: room.fixtures ?? [],
  });
  const m = MODEL_METHODS.find((x) => x.id === method);

  if (!m) {
    return (
      <ModalSheet title="Oppdater 3D-modellen" onClose={onClose}>
        <p className="hint" style={{ marginBottom: 8 }}>
          Møblene dine beholdes. Bare selve rommet (vegger, mål, vindu og dør) bygges på nytt.
        </p>
        {MODEL_METHODS.map((x) => (
          <button key={x.id} className="row" onClick={() => setMethod(x.id)}>
            <span className="icon-btn" aria-hidden style={{ background: 'var(--surface)' }}>
              {x.icon}
            </span>
            <span className="row-main">
              <span className="row-title">{x.label}</span>
              <br />
              <span className="row-meta">{x.sub}</span>
            </span>
            <span className="chev">›</span>
          </button>
        ))}
      </ModalSheet>
    );
  }

  return (
    <ModalSheet
      title={m.label}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={() => setMethod(null)}>
            Tilbake
          </button>
          <button className="btn btn-primary" onClick={() => onUpdate(m.id, measures)}>
            {m.action}
          </button>
        </>
      }
    >
      {method === 'dims' ? (
        <MeasureEditor value={measures} source="Dagens mål for rommet" onChange={setMeasures} />
      ) : (
        <div className="fake-camera">
          {method === 'scan' && 'Kamerasøker (simulert)\nStå i et hjørne og gå sakte rundt langs veggene.'}
          {method === 'plan' && 'Bildebibliotek (simulert)\nPlantegning_oppdatert.pdf'}
          {method === 'photos' && 'Bildebibliotek (simulert)\n4 bilder valgt'}
        </div>
      )}
    </ModalSheet>
  );
}
