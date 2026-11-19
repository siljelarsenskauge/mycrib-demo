// Draft helpers: they mutate a cloned AppState inside store.update().
import { clampToRoom } from './geometry';
import { uid } from './seed';
import type { AppState, Attachment, Chat, Furniture, Pin, Room } from './types';

export const getRoom = (d: AppState, roomId: string) => d.rooms.find((r) => r.id === roomId)!;

export function activeChat(d: AppState, roomId: string): Chat | undefined {
  const id = d.activeChat[roomId];
  return id ? d.chats.find((c) => c.id === id) : undefined;
}

/** Return the active chat, creating a new one if the user is on «Ny chat». */
export function ensureChat(d: AppState, roomId: string, title: string, newId: string = uid('c')): Chat {
  const existing = activeChat(d, roomId);
  if (existing) return existing;
  const now = Date.now();
  const chat: Chat = {
    id: newId,
    roomId,
    title: title.length > 30 ? title.slice(0, 29).trimEnd() + '…' : title || 'Ny chat',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  d.chats.unshift(chat);
  d.activeChat[roomId] = chat.id;
  return chat;
}

/** Add or update a piece of furniture directly in the room. */
export function setRoomItem(room: Room, item: Furniture) {
  const i = room.furniture.findIndex((f) => f.id === item.id);
  if (i >= 0) room.furniture[i] = item;
  else room.furniture.push(item);
  room.updatedAt = Date.now();
}

export function removeRoomItem(room: Room, id: string) {
  room.furniture = room.furniture.filter((f) => f.id !== id);
  room.updatedAt = Date.now();
}

/** Save a pin to the room's moodboard, or remove it if it is already there. */
export function togglePin(room: Room, pin: Pin) {
  if (room.moodboard.some((p) => p.id === pin.id)) room.moodboard = room.moodboard.filter((p) => p.id !== pin.id);
  else room.moodboard.push({ id: pin.id, title: pin.title, prompt: pin.prompt });
}

/**
 * Swap a piece of furniture for another one (suggestion, Mine møbler or camera roll).
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
  });
  pushUndo(room, room.furniture, `Byttet ut: ${old.name} → ${src.name}`);
  setRoomItem(room, next);
  return next;
}

/** Switch to another colour that the product exists in. */
export function setVariant(room: Room, id: string, color: string, colorName: string) {
  const f = room.furniture.find((x) => x.id === id);
  if (!f || f.color === color) return;
  pushUndo(room, room.furniture, `Ny farge: ${f.name}`);
  setRoomItem(room, { ...f, color, colorName });
}

const UNDO_LIMIT = 20;

/** Remember the room as it was before a change, so «Angre» can bring it back. */
export function pushUndo(room: Room, before: Furniture[], label: string) {
  room.undo = [{ label, furniture: structuredClone(before) }, ...(room.undo ?? [])].slice(0, UNDO_LIMIT);
}

/** Undo the latest change. Returns its label, or null if there was nothing to undo. */
export function undoLast(room: Room): string | null {
  const [last, ...rest] = room.undo ?? [];
  if (!last) return null;
  room.furniture = last.furniture;
  room.undo = rest;
  room.updatedAt = Date.now();
  return last.label;
}

const dateLabel = (t: number) => new Date(t).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });

/** Suggested name for a saved version, e.g. «Sofa, 3-seter · 7. okt.» */
export function suggestVersionName(room: Room): string {
  // «Byttet ut: Sofa → Sofa, 3-seter» → «Sofa, 3-seter»
  const latest = room.undo?.[0]?.label.split(': ')[1]?.split(' → ').pop();
  return `${latest ?? room.name} · ${dateLabel(Date.now())}`;
}

/** The user chose to keep the room as it looks now. */
export function saveVersion(d: AppState, roomId: string, name: string, auto = false) {
  const room = getRoom(d, roomId);
  d.snapshots.unshift({ id: uid('s'), roomId, createdAt: Date.now(), label: name, furniture: structuredClone(room.furniture), auto });
}

/** Bring back a saved version. The current room is saved first, so nothing is lost. */
export function restoreVersion(d: AppState, roomId: string, snapId: string) {
  const room = getRoom(d, roomId);
  const snap = d.snapshots.find((s) => s.id === snapId)!;
  saveVersion(d, roomId, `Før gjenoppretting · ${dateLabel(Date.now())}`, true);
  pushUndo(room, room.furniture, `Gjenopprettet: ${snap.label}`);
  room.furniture = structuredClone(snap.furniture);
  room.updatedAt = Date.now();
}
