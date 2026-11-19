// Draft helpers: they mutate a cloned AppState inside store.update().
import { clampToRoom, footprint } from './geometry';
import { uid } from './seed';
import { toRoomSize, type Measurements } from './measure';
import type { AppState, Attachment, Chat, Furniture, Pin, Room } from './types';

export const getRoom = (d: AppState, roomId: string) => d.rooms.find((r) => r.id === roomId)!;

export function activeChat(d: AppState, roomId: string): Chat | undefined {
  const id = d.activeChat[roomId];
  return id ? d.chats.find((c) => c.id === id) : undefined;
}

/** Return the active chat, creating a new one if the user is on «New chat». */
export function ensureChat(d: AppState, roomId: string, title: string, newId: string = uid('c')): Chat {
  const existing = activeChat(d, roomId);
  if (existing) return existing;
  const now = Date.now();
  const chat: Chat = {
    id: newId,
    roomId,
    title: title.length > 30 ? title.slice(0, 29).trimEnd() + '…' : title || 'New chat',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  d.chats.unshift(chat);
  d.activeChat[roomId] = chat.id;
  return chat;
}

/** Example rooms that aren't built in the prototype yet: they borrow the Living Room's 360° photo, so they don't open
 *  (Synne 04.11). Rooms the user creates open as usual. */
const NOT_READY = ['r_bedroom', 'r_kitchen', 'r_office', 'r_hallway'];
export const isRoomReady = (roomId: string) => !NOT_READY.includes(roomId);

/** Recent rooms first: the latest created or saved edit (`updatedAt`). Opening a room doesn't move it. */
export const recentFirst = (rooms: Room[]) => [...rooms].sort((a, b) => b.updatedAt - a.updatedAt);

/** Add or update a piece of furniture directly in the room. */
export function setRoomItem(room: Room, item: Furniture) {
  const i = room.furniture.findIndex((f) => f.id === item.id);
  if (i >= 0 && room.furniture[i].locked) return; // fixed items stay put (Rathi 28.10)
  if (i >= 0) room.furniture[i] = item;
  else room.furniture.push(item);
  room.updatedAt = Date.now();
}

/** Keep a scanned item in the room's list (the carousel next to undo); the same item scanned again moves to the front. */
export function rememberScan(room: Room, att: Attachment) {
  if (att.source !== 'scan') return;
  room.scanned = [att, ...(room.scanned ?? []).filter((a) => a.name !== att.name)];
}

/** Tap on a scanned item that isn't in the room: it takes the place of the one of the same kind (same centre), or goes
 *  to the room's coffee spot; long side along the sofa. Can be undone. (Rathi 29.10) */
export function placeScanned(room: Room, att: Attachment, id: string): Furniture {
  const old = room.furniture.find((f) => f.kind === att.kind && !f.locked);
  const o = old ? footprint(old) : null;
  const cx = o ? o.x + o.w / 2 : (room.coffeeSpot?.x ?? room.width / 2);
  const cy = o ? o.y + o.d / 2 : (room.coffeeSpot?.y ?? room.depth / 2);
  const rot: 0 | 90 = att.width > att.depth ? 90 : 0;
  const fw = rot === 90 ? att.depth : att.width;
  const fd = rot === 90 ? att.width : att.depth;
  const next = clampToRoom(room, {
    id,
    name: att.name,
    kind: att.kind,
    x: Math.round(cx - fw / 2),
    y: Math.round(cy - fd / 2),
    width: att.width,
    depth: att.depth,
    height: att.height,
    rot,
    color: att.color,
    colorName: att.colorName,
    product: att.product,
    photo: att.photo,
    shape: att.shape,
  });
  pushUndo(room, room.furniture, old ? `Swapped: ${old.name} → ${att.name}` : `Added: ${att.name}`);
  if (old) room.furniture = room.furniture.filter((f) => f.id !== old.id);
  setRoomItem(room, next);
  return next;
}

/** The chat about one scanned item; made (empty) if there is none yet, and made the room's active chat. (Rathi 29.10) */
export function chatForItem(d: AppState, roomId: string, att: Attachment): { chat: Chat; created: boolean } {
  let chat = d.chats.find((c) => c.roomId === roomId && c.itemName === att.name);
  const created = !chat;
  if (!chat) {
    const now = Date.now();
    chat = { id: uid('c'), roomId, title: att.name, createdAt: now, updatedAt: now, messages: [], itemName: att.name };
    d.chats.unshift(chat);
  }
  d.activeChat[roomId] = chat.id;
  return { chat, created };
}

export function removeRoomItem(room: Room, id: string) {
  room.furniture = room.furniture.filter((f) => f.id !== id || f.locked);
  room.updatedAt = Date.now();
}

/** Save a pin to the room's moodboard, or remove it if it is already there. */
export function togglePin(room: Room, pin: Pin) {
  if (room.moodboard.some((p) => p.id === pin.id)) room.moodboard = room.moodboard.filter((p) => p.id !== pin.id);
  else room.moodboard.push({ id: pin.id, title: pin.title, prompt: pin.prompt });
}

/**
 * Swap a piece of furniture for another one (suggestion, My furniture or camera roll).
 * It keeps the same id and position, so the selection and placement stay put.
 */
export function swapItem(room: Room, id: string, src: Attachment): Furniture | null {
  const old = room.furniture.find((f) => f.id === id);
  if (!old) return null;
  const next = clampToRoom(room, {
    ...old,
    name: src.name,
    kind: src.kind,
    width: src.width,
    depth: src.depth,
    height: src.height,
    color: src.color,
    colorName: src.colorName,
    product: src.product,
    photo: src.photo,
  });
  pushUndo(room, room.furniture, `Swapped: ${old.name} → ${src.name}`);
  setRoomItem(room, next);
  return next;
}

/** Switch to another colour that the product exists in. */
export function setVariant(room: Room, id: string, color: string, colorName: string) {
  const f = room.furniture.find((x) => x.id === id);
  if (!f || f.color === color) return;
  pushUndo(room, room.furniture, `New colour: ${f.name}`);
  setRoomItem(room, { ...f, color, colorName });
}

const UNDO_LIMIT = 20;

/** Remember the room as it was before a change, so «Undo» can bring it back. */
export function pushUndo(room: Room, before: Furniture[], label: string) {
  room.undo = [{ label, furniture: structuredClone(before) }, ...(room.undo ?? [])].slice(0, UNDO_LIMIT);
  // a new change makes the undone steps meaningless
  room.redo = [];
}

/** Undo the latest change. Returns its label, or null if there was nothing to undo. */
export function undoLast(room: Room): string | null {
  const [last, ...rest] = room.undo ?? [];
  if (!last) return null;
  room.redo = [{ label: last.label, furniture: structuredClone(room.furniture) }, ...(room.redo ?? [])].slice(0, UNDO_LIMIT);
  room.furniture = last.furniture;
  room.undo = rest;
  room.updatedAt = Date.now();
  return last.label;
}

/** Do an undone step again (Synne 13.11: undo and redo, two arrows). */
export function redoLast(room: Room): string | null {
  const [next, ...rest] = room.redo ?? [];
  if (!next) return null;
  room.undo = [{ label: next.label, furniture: structuredClone(room.furniture) }, ...(room.undo ?? [])].slice(0, UNDO_LIMIT);
  room.furniture = next.furniture;
  room.redo = rest;
  room.updatedAt = Date.now();
  return next.label;
}

/**
 * Versions are kept automatically (Synne 13.11): the first change in a visit keeps the room as it was before, as a
 * version to the left. No «Save version» button.
 */
export function keepVersionBefore(d: AppState, roomId: string) {
  const room = getRoom(d, roomId);
  const before = room.versionBase ?? room.furniture;
  d.snapshots.unshift({ id: uid('s'), roomId, createdAt: Date.now(), label: dateLabel(Date.now()), furniture: structuredClone(before), auto: true });
  room.versionBase = structuredClone(room.furniture);
}

/** Keep a version of the room (Synne 13.11): automatic when something new comes in, or saved by the user. */
export function keepVersion(d: AppState, roomId: string, furniture: Furniture[], saved = false, look?: { image?: string; sofaView?: string }) {
  const t = Date.now();
  const time = new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const room = d.rooms.find((r) => r.id === roomId);
  // how the room looked: given for the moment before a change, otherwise the room as it is now (Synne 19.11)
  const seen = look ?? { image: room?.image, sofaView: room?.sofaView };
  d.snapshots.unshift({ id: uid('s'), roomId, createdAt: t, label: saved ? `Saved · ${time}` : `${dateLabel(t)} · ${time}`, furniture: structuredClone(furniture), auto: !saved, image: seen.image, sofaView: seen.sofaView });
}

/** Continue from an older version: the room now looks like it (what you had is kept as a version first). */
export function continueFrom(d: AppState, roomId: string, snapId: string) {
  const room = getRoom(d, roomId);
  const snap = d.snapshots.find((s) => s.id === snapId)!;
  d.snapshots.unshift({ id: uid('s'), roomId, createdAt: Date.now(), label: dateLabel(Date.now()), furniture: structuredClone(room.furniture), auto: true });
  pushUndo(room, room.furniture, `Went back to ${snap.label}`);
  room.furniture = structuredClone(snap.furniture);
  room.versionBase = structuredClone(snap.furniture);
  room.updatedAt = Date.now();
}

const dateLabel = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Suggested name for a saved version, e.g. «Sofa, 3-seater · 7 Oct» */
export function suggestVersionName(room: Room): string {
  // «Swapped: Sofa → Sofa, 3-seater» → «Sofa, 3-seater»
  const latest = room.undo?.[0]?.label.split(': ')[1]?.split(' → ').pop();
  return `${latest ?? room.name} · ${dateLabel(Date.now())}`;
}

/** Changes since the last saved version (or since the room was first opened): only then is «Save version» shown. */
export const hasUnsavedChanges = (room: Room) => !!room.versionBase && JSON.stringify(room.versionBase) !== JSON.stringify(room.furniture);

/** The user chose to keep the room as it looks now. */
export function saveVersion(d: AppState, roomId: string, name: string, auto = false) {
  const room = getRoom(d, roomId);
  d.snapshots.unshift({ id: uid('s'), roomId, createdAt: Date.now(), label: name, furniture: structuredClone(room.furniture), auto });
  // a version the user saved is the new starting point; the automatic one before a restore is not
  if (!auto) room.versionBase = structuredClone(room.furniture);
}

/** Bring back a saved version. The current room is saved first, so nothing is lost. */
export function restoreVersion(d: AppState, roomId: string, snapId: string) {
  const room = getRoom(d, roomId);
  const snap = d.snapshots.find((s) => s.id === snapId)!;
  saveVersion(d, roomId, `Before restore · ${dateLabel(Date.now())}`, true);
  pushUndo(room, room.furniture, `Restored: ${snap.label}`);
  room.furniture = structuredClone(snap.furniture);
  room.versionBase = structuredClone(snap.furniture);
  room.updatedAt = Date.now();
}

/** New measurements for the room (from the measuring tool or a scan). The 3D/2D views use the bounding box. */
export function applyMeasurements(room: Room, m: Measurements) {
  const size = toRoomSize(m);
  room.plan = m;
  room.width = Math.max(150, Math.min(1500, size.width));
  room.depth = Math.max(150, Math.min(1500, size.depth));
  if (size.height) room.height = size.height;
  if (size.window) room.window.length = size.window.length;
  room.window.length = Math.min(room.window.length, room.width - 20);
  room.window.offset = Math.round(Math.max(0, Math.min(room.width - room.window.length, size.window ? size.window.center - room.window.length / 2 : room.window.offset)));
  if (size.door) room.door.length = size.door.length;
  room.door.length = Math.min(room.door.length, room.depth - 20);
  room.door.offset = Math.round(Math.max(0, Math.min(room.depth - room.door.length, size.door ? size.door.center - room.door.length / 2 : room.door.offset)));
  room.furniture = room.furniture.map((f) => clampToRoom(room, f));
  room.modelUpdatedAt = Date.now();
  room.updatedAt = Date.now();
}
