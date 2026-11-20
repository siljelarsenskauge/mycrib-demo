import { useState } from 'react';
import type { Room, Snapshot } from '../state/types';
import { IsoView3D } from './IsoView3D';
import { PaletteVersionImage } from './NaturePalette';
import { BottomSheet, fmtDay } from './ui';

/** «Save version»: keep the room as it looks now. The name is optional. */
export function SaveVersionSheet({ suggestion, onSave, onClose }: { suggestion: string; onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const save = () => onSave(name.trim() || suggestion);
  return (
    <BottomSheet
      title="Save version"
      onClose={onClose}
      primary={{ label: 'Save version', onClick: save }}
    >
      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="field-label" htmlFor="version-name">
          Name (optional)
        </label>
        <input id="version-name" className="input" placeholder={suggestion} value={name} onChange={(e) => setName(e.target.value)} />
        <span className="field-help">Saved in the side panel under «Versions»</span>
      </form>
    </BottomSheet>
  );
}

/** A saved version: look at it and restore it. The current room is saved first, so nothing is lost. */
export function VersionSheet({ room, version, onRestore, onClose }: { room: Room; version: Snapshot; onRestore: () => void; onClose: () => void }) {
  return (
    <BottomSheet
      title={version.label}
      onClose={onClose}
      primary={{ label: 'Restore this version', onClick: onRestore }}
    >
      <div className="preview-img preview-img-large">
        {/* a version saved from «How brave are you?» shows the living room in that palette (07.11) */}
        {version.palette ? (
          <PaletteVersionImage version={version} />
        ) : (
          <IsoView3D room={room} items={version.furniture} mini />
        )}
      </div>
      <p className="field-help">
        Saved {fmtDay(version.createdAt).toLowerCase()}. When you restore it, the room as it is now is saved first.
      </p>
    </BottomSheet>
  );
}
