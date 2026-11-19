// Content/RoomCard with a long-press menu (Overlays/ContextMenu), like the iOS context menu:
// Pin/Unpin, Room details, Archive/Unarchive and Delete (asks first). Pinned rooms have no badge on the card, they are a filter on Home (Synne 06.11).
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { STAND } from '../stand';
import { isRoomReady } from '../state/mutations';
import { useStore } from '../state/store';
import type { Room } from '../state/types';
import { Icon, type IconName } from './Icon';
import { IsoView3D } from './IsoView3D';
import { useOpenRoom } from './NotReadySheet';
import { BottomSheet, Button, navigate, phoneScale } from './ui';

const MAX_PINNED = 4;
const LONG_PRESS_MS = 450;

export function RoomCard({ room, size = 'tall' }: { room: Room; size?: 'tall' | 'grid' }) {
  const [menu, setMenu] = useState<DOMRect | null>(null);
  const timer = useRef<number>();
  const start = useRef<{ x: number; y: number } | null>(null);
  const longPressed = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const openRoom = useOpenRoom();

  const open = () => {
    longPressed.current = true;
    navigator.vibrate?.(10);
    setMenu(cardRef.current!.getBoundingClientRect());
  };
  const onDown = (e: PointerEvent) => {
    longPressed.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    timer.current = window.setTimeout(open, LONG_PRESS_MS);
  };
  const cancel = () => window.clearTimeout(timer.current);
  const onMove = (e: PointerEvent) => {
    // scrolling the row is not a long press
    if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) cancel();
  };
  useEffect(() => cancel, []);

  return (
    <>
      {/* the stand (Synne 18.11): rooms that aren't built are dimmed, with «Coming soon» */}
      <div ref={cardRef} className={'room-card room-card-' + size + (STAND && !isRoomReady(room.id) ? ' is-dim' : '')} data-soon={STAND && !isRoomReady(room.id) ? 'Not ready' : undefined}>
        <button
          className="room-card-main"
          onPointerDown={onDown}
          onPointerUp={cancel}
          onPointerLeave={cancel}
          onPointerMove={onMove}
          onContextMenu={(e) => {
            e.preventDefault();
            cancel();
            open();
          }}
          onClick={() => {
            if (!longPressed.current) openRoom(room.id);
          }}
          aria-label={`${room.name}. Hold for more options`}
        >
          <span className="room-card-img">{room.image ? <img src={room.image} alt="" draggable={false} /> : <IsoView3D room={room} items={room.furniture} mini />}</span>
          <span className="room-card-name">{room.name}</span>
        </button>
      </div>
      {menu && <RoomMenu room={room} rect={menu} size={size} onClose={() => setMenu(null)} />}
    </>
  );
}

function RoomMenu({ room, rect, size, onClose }: { room: Room; rect: DOMRect; size: 'tall' | 'grid'; onClose: () => void }) {
  const { state, update, showToast } = useStore();
  const togglePin = () => {
    const pinned = state.rooms.filter((r) => r.pinned && !r.archived).length;
    if (!room.pinned && pinned >= MAX_PINNED) {
      showToast(`You can pin up to ${MAX_PINNED} rooms. Unpin another room first.`);
      return onClose();
    }
    set((r) => {
      r.pinned = !r.pinned;
    });
    showToast(room.pinned ? `Unpinned «${room.name}»` : `Pinned «${room.name}»`);
    onClose();
  };
  const [confirm, setConfirm] = useState(false);
  // screen px → CSS px inside the (possibly scaled) phone frame
  const s = phoneScale();
  const p = document.querySelector('.phone')!.getBoundingClientRect();
  const phone = { width: p.width / s, height: p.height / s };
  const card = { left: (rect.left - p.left) / s, top: (rect.top - p.top) / s, width: rect.width / s, height: rect.height / s };
  const left = card.left;
  // like iOS: if the card and the menu don't fit below each other, move the lifted card up
  const MENU_H = 236;
  const cardH = card.height * 1.06;
  const room4menu = phone.height - 24 - (card.top + cardH + 12 + MENU_H);
  const top = Math.max(64, card.top + Math.min(0, room4menu));
  const menuTop = top + cardH + 12;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (recipe: (r: Room) => void) =>
    update((d) => {
      const r = d.rooms.find((x) => x.id === room.id);
      if (r) recipe(r);
    });

  const toggleArchive = () => {
    set((r) => {
      r.archived = !r.archived;
    });
    showToast(room.archived ? `«${room.name}» is back` : `Archived «${room.name}» – find it under All rooms`);
    onClose();
  };
  const remove = () => {
    update((d) => {
      d.rooms = d.rooms.filter((r) => r.id !== room.id);
      d.chats = d.chats.filter((c) => c.roomId !== room.id);
      d.snapshots = d.snapshots.filter((s) => s.roomId !== room.id);
      delete d.activeChat[room.id];
    });
    showToast(`Deleted «${room.name}»`);
    onClose();
  };

  const items: { icon: IconName; label: string; run: () => void; danger?: boolean; divider?: boolean }[] = [
    { icon: 'pin', label: room.pinned ? 'Unpin' : 'Pin', run: togglePin, divider: true },
    { icon: 'edit', label: 'Room details', run: () => navigate(`/room/${room.id}/settings`), divider: true },
    { icon: 'inventory', label: room.archived ? 'Unarchive' : 'Archive', run: toggleArchive },
    { icon: 'delete', label: 'Delete', run: () => setConfirm(true), danger: true },
  ];

  if (confirm) {
    return (
      <BottomSheet title={`Delete ${room.name}?`} onClose={onClose}>
        <p className="sheet-intro">The room, its chats and saved versions are deleted. This can’t be undone.</p>
        <div className="button-row">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button className="btn-danger" onClick={remove}>
            Delete
          </Button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <div className="context-layer" onClick={onClose} onContextMenu={(e) => e.preventDefault()}>
      {/* the card, lifted above the dimmed screen */}
      <div className={'room-card room-card-' + size + ' room-card-lifted'} style={{ left, top, width: card.width }} aria-hidden>
        <span className="room-card-img">{room.image ? <img src={room.image} alt="" /> : <IsoView3D room={room} items={room.furniture} mini />}</span>
        <span className="room-card-name">{room.name}</span>
      </div>
      <div className="context-menu glass" role="menu" aria-label={`Options for ${room.name}`} style={{ top: menuTop, left: Math.min(Math.max(12, left), phone.width - 272) }} onClick={(e) => e.stopPropagation()}>
        {items.map((it) => (
          <div key={it.label}>
            <button role="menuitem" className={'menu-item' + (it.danger ? ' is-danger' : '')} onClick={it.run}>
              <Icon name={it.icon} size={22} />
              <span>{it.label}</span>
            </button>
            {it.divider && <hr className="context-divider" />}
          </div>
        ))}
      </div>
    </div>
  );
}
