// Small dropdown menus on the room screen: Navigation/RoomSwitcher and Navigation/ViewSelect (both Style=Glass).
// Each menu is rendered inside a wrapper around its button, so it always opens right below the button.
import { useEffect, type ReactNode } from 'react';
import type { Room } from '../state/types';
import { Icon, type IconName } from './Icon';

export type ViewMode = '3d' | '2d' | 'real';

/**
 * Enough photos to stitch a 360° panorama? Then the photo layer is called «360°», otherwise «Photo» (Synne 22.10).
 * In the prototype a room made from a few photos only (not scanned yet) shows them one by one; the others have a panorama.
 */
export const hasPanorama = (room: Room) => !room.unmeasured;

export const viewLabel = (mode: ViewMode, room: Room) => (mode === 'real' ? (hasPanorama(room) ? '360°' : 'Photo') : mode === '3d' ? '3D' : '2D');

const viewOptions = (room: Room): { id: ViewMode; icon: IconName; label: string }[] => [
  { id: 'real', icon: 'image', label: hasPanorama(room) ? '360° view' : 'Photo' },
  { id: '3d', icon: 'view_3d', label: '3D view' },
  { id: '2d', icon: 'floor_plan', label: 'Floor plan (2D)' },
];

const ROOM_ICON = (r: Room): IconName => (/bed/i.test(r.name) ? 'bed' : /kitchen|dining|office/i.test(r.name) ? 'table' : /hall/i.test(r.name) ? 'home' : 'sofa');

/** Invisible full-screen layer that closes the menu, plus the menu itself. */
function Dropdown({ label, className, onClose, children }: { label: string; className: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="menu-backdrop" onClick={onClose} />
      <div className={`dropdown glass ${className}`} role="menu" aria-label={label}>
        {children}
      </div>
    </>
  );
}

export function RoomSwitcher({ rooms, currentId, onPick, onClose }: { rooms: Room[]; currentId: string; onPick: (id: string) => void; onClose: () => void }) {
  return (
    <Dropdown label="Switch room" className="room-switcher" onClose={onClose}>
      {rooms.map((r) => (
        <button key={r.id} role="menuitemradio" aria-checked={r.id === currentId} className="menu-item" onClick={() => onPick(r.id)}>
          <Icon name={ROOM_ICON(r)} size={22} />
          <span>{r.name}</span>
          {r.id === currentId && <Icon name="check" size={20} />}
        </button>
      ))}
    </Dropdown>
  );
}

export function ViewMenu({ mode, room, onPick, onClose, next }: { mode: ViewMode; room: Room; onPick: (m: ViewMode) => void; onClose: () => void; /** the view to try next (the stand, Synne 19.11) */ next?: ViewMode }) {
  return (
    <Dropdown label="View" className="view-menu" onClose={onClose}>
      {viewOptions(room).map((o) => (
        <button key={o.id} role="menuitemradio" aria-checked={o.id === mode} className={'menu-item' + (o.id === next ? ' is-highlight' : '')} onClick={() => onPick(o.id)}>
          <Icon name={o.icon} size={22} />
          <span>{o.label}</span>
          {o.id === mode && <Icon name="check" size={20} />}
        </button>
      ))}
    </Dropdown>
  );
}
