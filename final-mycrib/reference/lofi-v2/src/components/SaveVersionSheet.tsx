import { useState } from 'react';
import type { Room } from '../state/types';
import { IsoView3D } from './IsoView3D';
import { ModalSheet } from './ui';

/** «Lagre versjon»: keep the room as it looks now. The name is optional. */
export function SaveVersionSheet({
  room,
  suggestion,
  onSave,
  onOpenList,
  onClose,
}: {
  room: Room;
  suggestion: string;
  onSave: (name: string) => void;
  onOpenList: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  return (
    <ModalSheet
      title="Lagre versjon"
      onClose={onClose}
      footer={
        <button className="btn btn-primary" onClick={() => onSave(name.trim() || suggestion)}>
          Lagre
        </button>
      }
    >
      <div style={{ height: 150, background: 'var(--surface)', borderRadius: 'var(--radius)', marginBottom: 14 }}>
        <IsoView3D room={room} items={room.furniture} mini />
      </div>
      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(name.trim() || suggestion);
        }}
      >
        <label htmlFor="version-name">Navn (valgfritt)</label>
        <input id="version-name" className="input" placeholder={suggestion} value={name} onChange={(e) => setName(e.target.value)} />
      </form>
      <p className="hint">
        Rommet lagres slik det ser ut nå, så du trygt kan utforske videre.{' '}
        <button className="btn-ghost" style={{ border: 0, padding: 0, background: 'none', textDecoration: 'underline' }} onClick={onOpenList}>
          Se lagrede versjoner
        </button>
      </p>
    </ModalSheet>
  );
}
