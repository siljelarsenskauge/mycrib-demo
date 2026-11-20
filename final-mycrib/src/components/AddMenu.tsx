import { useEffect, type CSSProperties } from 'react';
import { Icon, type IconName } from './Icon';
import { phoneScale } from './ui';

export type AddChoice = 'scan' | 'upload' | 'link' | 'inspiration' | 'library' | 'room' | 'camera' | 'roll' | 'moodboard' | 'scanRoom' | 'plan' | 'measure' | 'photos';

// «Item photo», not «Photos», so it is never confused with «Room photos» in «Create room» (Synne 20.10)
const OPTIONS: Record<AddChoice, { icon: IconName; label: string }> = {
  scan: { icon: 'scan_item', label: 'Scan item' },
  upload: { icon: 'image', label: 'Camera roll' }, // was «Item photo» (Synne 18.11)
  link: { icon: 'link', label: 'Product link' },
  inspiration: { icon: 'moodboard', label: 'From inspiration' }, // was «Inspiration» (Synne 19.11)
  library: { icon: 'inventory', label: 'My furniture' },
  moodboard: { icon: 'moodboard', label: 'Moodboard' },
  // «Create room» from the + on Home (Synne 06.11)
  scanRoom: { icon: 'scan_room', label: 'Scan room' },
  plan: { icon: 'floor_plan', label: 'Upload floor plan' },
  measure: { icon: 'straighten', label: 'Enter measurements' },
  photos: { icon: 'image', label: 'Add a photo' }, // one photo per room for now (Synne 14.11)
  room: { icon: 'home', label: 'New room' },
  // «Add photos»: the camera or the camera roll, in the same menu instead of a page of its own (Synne 29.10)
  camera: { icon: 'photo_camera', label: 'Take photo' },
  roll: { icon: 'image', label: 'Choose from library' },
};

/**
 * Overlays/AddMenu (Style=Glass): a small menu that opens above the [+] in the chat (like ChatGPT), and under
 * «Add item» on the home screen. Synne 22.10: back to the menu – not a bottom sheet – in both places.
 */
export function AddMenu({
  choices,
  onPick,
  onClose,
  placement,
  anchor,
  overSheet,
  highlight,
}: {
  /** the choice that stands out, e.g. «Scan room» (Synne 06.11) */
  /** one or more choices that show the way (the stand, Synne 18.11) */
  highlight?: AddChoice | AddChoice[];
  /** opened from inside a bottom sheet: lies above it */
  overSheet?: boolean;
  choices: AddChoice[];
  onPick: (c: AddChoice) => void;
  onClose: () => void;
  placement: 'above' | 'anchor';
  /** the button the menu opens from: «anchor» opens under it, «above» right above it */
  anchor?: HTMLElement | null;
}) {
  // position under (or above) the button, inside the phone frame
  let style: CSSProperties | undefined;
  if (anchor) {
    const phone = anchor.closest('.phone')!.getBoundingClientRect();
    const r = anchor.getBoundingClientRect();
    const s = phoneScale();
    style =
      placement === 'anchor'
        ? { top: (r.bottom - phone.top) / s + 6, right: Math.max(16, (phone.right - r.right) / s) }
        : // above a wide button (e.g. a full-width «Add photos»): centred over it (Synne 29.10) – and over a button in
          // the middle (e.g. «Add furniture» in «Add»), so the menu stays inside the screen (Silje 13.11)
          r.width > phone.width / 2 || Math.abs(r.left + r.width / 2 - (phone.left + phone.width / 2)) < phone.width / 6
          ? { bottom: (phone.bottom - r.top) / s + 8, left: (r.left + r.width / 2 - phone.left) / s, translate: '-50% 0' }
          : // above the button; from a button in the right half it lines up with the right edge, so it stays on the screen
            r.left - phone.left > phone.width / 2
            ? { bottom: (phone.bottom - r.top) / s + 8, right: Math.max(8, (phone.right - r.right) / s) }
          : { bottom: (phone.bottom - r.top) / s + 8, left: Math.max(8, (r.left - phone.left) / s - 4) };
  }
  useEffect(() => {
    // Esc closes only the menu, not the bottom sheet it was opened from (captured first, then stopped)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div className={'menu-layer' + (overSheet ? ' menu-layer-over-sheet' : '')} onClick={onClose}>
      <div className={`add-menu glass add-menu-${placement}`} style={style} role="menu" aria-label="Add" onClick={(e) => e.stopPropagation()}>
        {choices.map((c) => (
          <button key={c} role="menuitem" className={'menu-item' + ((Array.isArray(highlight) ? highlight.includes(c) : c === highlight) ? ' is-highlight' : '')} onClick={() => onPick(c)}>
            <Icon name={OPTIONS[c].icon} size={22} />
            <span>{OPTIONS[c].label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
