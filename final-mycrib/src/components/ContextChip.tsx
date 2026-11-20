import type { FurnitureKind } from '../state/types';
import { Icon, type IconName } from './Icon';

export const KIND_ICON: Record<FurnitureKind, IconName> = {
  sofa: 'sofa',
  armchair: 'sofa',
  coffeetable: 'table',
  diningtable: 'table',
  tvbench: 'table',
  chair: 'sofa',
  bed: 'bed',
  dresser: 'inventory',
  lamp: 'floor_lamp',
  shelf: 'inventory',
  other: 'inventory',
};

/** Chat/ContextChip: which item the prompt is about. ✕ clears the selection. */
export function ContextChip({ name, kind, photo, onClear }: { name: string; kind: FurnitureKind; photo?: string; onClear: () => void }) {
  return (
    <span className="context-chip">
      {photo ? <img className="context-chip-photo" src={photo} alt="" /> : <Icon name={KIND_ICON[kind]} size={16} />}
      <span className="context-chip-name">{name}</span>
      <button type="button" onClick={onClear} aria-label={`Deselect ${name}`}>
        <Icon name="close" size={14} />
      </button>
    </span>
  );
}
