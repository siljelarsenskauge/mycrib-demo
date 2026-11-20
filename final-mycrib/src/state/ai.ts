// Scripted "AI": simple keyword matching. Every rule changes the room directly and can be undone.
// Replies are deliberately short: say what changed, and only add an observation when it matters.
// Keywords are English, with the Norwegian words from the lo-fi kept as a fallback for Norwegian test users.
import { boardFor, boardScene } from './inspo';
import {
  blocksDoor,
  clampToRoom,
  findFreeSpot,
  placeOnOtherWall,
  tightestPassage,
  wallOf,
  WALL_PHRASE,
  type PlaceWall,
} from './geometry';
import { suggestionsFor } from './catalog';
import { getRoom, pushUndo, removeRoomItem, setRoomItem } from './mutations';
import { uid } from './seed';
import type { AppState, Attachment, Furniture, FurnitureKind, Room } from './types';

const DEFINITE: Record<FurnitureKind, string> = {
  sofa: 'the sofa',
  coffeetable: 'the coffee table',
  tvbench: 'the TV bench',
  diningtable: 'the dining table',
  chair: 'the chairs',
  bed: 'the bed',
  dresser: 'the dresser',
  armchair: 'the armchair',
  lamp: 'the lamp',
  shelf: 'the shelf',
  other: 'the item',
};
const def = (f: Furniture) => DEFINITE[f.kind];
const Cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const round5 = (n: number) => Math.round(n / 5) * 5;

const KEYWORDS: [string, FurnitureKind][] = [
  ['armchair', 'armchair'],
  ['lenestol', 'armchair'],
  ['coffee table', 'coffeetable'],
  ['salongbord', 'coffeetable'],
  ['dining table', 'diningtable'],
  ['spisebord', 'diningtable'],
  ['sofa', 'sofa'],
  ['couch', 'sofa'],
  ['chair', 'chair'],
  ['stol', 'chair'],
  ['tv', 'tvbench'],
  ['bed', 'bed'],
  ['seng', 'bed'],
  ['dresser', 'dresser'],
  ['kommode', 'dresser'],
  ['lamp', 'lamp'],
  ['lampe', 'lamp'],
  ['shelf', 'shelf'],
  ['hylle', 'shelf'],
  ['pouf', 'other'],
  ['puff', 'other'],
];

const COLORS: [RegExp, string, string][] = [
  [/zebra/, 'zebra', 'zebra'],
  [/dark ?brown|mørk ?brun|mørkebrun/, '#5b3a29', 'dark brown'],
  [/brown|brun/, '#8b5a3c', 'brown'],
  [/beige|sand/, '#d9c7a7', 'beige'],
  [/green|grønn/, '#6f8a6a', 'green'],
  [/blue|blå/, '#5a7290', 'blue'],
  [/black|svart/, '#2e2e2e', 'black'],
  [/white|hvit/, '#f2f0eb', 'white'],
  [/gr[ae]y|grå/, '#8a919c', 'grey'],
  [/terracotta|terrakotta|\bred\b|rød/, '#b5603f', 'terracotta'],
  [/yellow|mustard|gul|sennep/, '#d2a93f', 'mustard'],
  [/pink|rosa/, '#d9a5a0', 'pink'],
];

const REPLACEABLE: FurnitureKind[] = ['sofa', 'bed', 'diningtable', 'tvbench', 'coffeetable', 'dresser'];

export interface AIResult {
  showPlan?: boolean;
  /** none of the rules matched: the reply is the fallback text (Claude may answer instead, see expert.ts – Rathi 11.11) */
  unhandled?: boolean;
}

/** The answer when no rule matches. */
export const FALLBACK = 'I can’t help with that yet. Try adding, moving or changing an item.';

/** «Show me other tables», «What table would fit here?»: the user asks for coffee tables to try (Rathi 11.11). */
export function wantsTableIdeas(rawText: string) {
  const t = rawText.toLowerCase();
  // other furniture, or a question about the table that stands there (distances, moving, size): not this rule
  if (/dining|spise|bedside|natt|distance|measure|avstand|\bmål|space|plass|move|flytt|rotate|roter|smaller|bigger|mindre|større/.test(t)) return false;
  if (!/\b(coffee ?tables?|tables?|bord\w*|salongbord\w*|sofabord\w*)\b/.test(t)) return false;
  if (/\b(other|another|different|suggest\w*|recommend\w*|ideas?|options?|alternatives?|andre|annet|forslag|foreslå|anbefal\w*)\b/.test(t)) return true;
  if (/\bnew (coffee )?table|\bnytt? (salong|sofa)?bord/.test(t)) return true;
  // «which/what table …» asks for tables; «what do you think of this table» is about the one that stands there
  return /\b(show|which|what|vis|hvilk\w*)\b/.test(t) && !/\b(this|the|that|my) (coffee )?table|\bbordet\b/.test(t);
}

/** Only returns text when something is worth pointing out (narrow passage or blocked door). */
export function observation(room: Room, items: Furniture[], item: Furniture): string {
  if (blocksDoor(room, item)) return ` Note: ${def(item)} is in the way of the door.`;
  const p = tightestPassage(room, items, item);
  if (!p || !p.target) return '';
  const dist = round5(p.dist);
  if (dist < 80) return ` The walkway to ${def(p.target)} will be about ${dist} cm, which is a bit narrow (80 cm is recommended).`;
  return '';
}

export function runAI(
  d: AppState,
  roomId: string,
  chatId: string,
  rawText: string,
  attachment?: Attachment,
  contextItemId?: string,
): AIResult {
  const room = getRoom(d, roomId);
  const chat = d.chats.find((c) => c.id === chatId)!;
  const text = rawText.toLowerCase();
  const items = () => room.furniture;
  const has = (...words: string[]) => words.some((w) => text.includes(w));
  // the room before this answer – kept so the change can be undone
  const before = structuredClone(room.furniture);

  const reply = (msg: string, opts: { changed?: string; target?: Furniture; action?: 'scan' } = {}) => {
    chat.messages.push({ id: uid('m'), role: 'ai', text: msg, changed: !!opts.changed, action: opts.action, createdAt: Date.now() });
    if (opts.changed) pushUndo(room, before, opts.changed);
    if (opts.target) chat.lastTargetId = opts.target.id;
    chat.updatedAt = Date.now();
  };

  // a moodboard is connected and the user asks for ideas: answer from the board. A suggestion only, the room's views cannot repaint walls yet.
  const board = boardFor(d, roomId);
  if (board && /\b(yes|idea|ideas|suggest\w*|recommend\w*|inspire\w*|colou?rs?|style|forslag|idé\w*|farger?)\b/.test(text) && !/\b(make|change|add|remove|gjør|legg)\b/.test(text)) {
    reply(`Your board «${board.name}» keeps going back to ${boardScene(board).mood}. I’d start with the wall you look at most, and let one piece of furniture carry the strongest colour.`);
    return {};
  }

  // a room made from photos only (Figma 06H): the AI can talk about the photo, but it can't measure or place
  // furniture – it says so honestly and offers the scan in the same answer
  if (room.unmeasured) {
    if (has('fit', 'plass', 'room for', 'measure', 'mål', 'size', 'big', 'small', 'wide', 'cm', 'stor', 'liten'))
      reply('I can’t measure from a photo. Scan the room – it takes about a minute – and I’ll check that it fits.', { action: 'scan' });
    else
      reply(
        'From your photo: light walls, a wooden floor and soft daylight. Warm wood and textiles in sand or beige would suit the room. To try furniture in the room and check sizes, scan it first – it takes about a minute.',
        { action: 'scan' },
      );
    return {};
  }

  const change = (item: Furniture) => {
    setRoomItem(room, clampToRoom(room, item));
    chat.highlightId = item.id;
    return items().find((f) => f.id === item.id)!;
  };

  const remove = (item: Furniture) => removeRoomItem(room, item.id);

  const findTarget = (useLast = true): Furniture | undefined => {
    const list = items().filter((f) => !f.locked);
    if (contextItemId) {
      const c = list.find((f) => f.id === contextItemId);
      if (c) return c;
    }
    const recent = chat.lastTargetId;
    for (const [word, kind] of KEYWORDS) {
      if (text.includes(word)) {
        const matches = list.filter((f) => f.kind === kind);
        if (matches.length) return matches.find((m) => m.id === recent) ?? matches[0];
      }
    }
    return useLast ? list.find((f) => f.id === chat.lastTargetId) : undefined;
  };

  const placeNew = (src: Attachment) => {
    const list = items();
    let item: Furniture = {
      id: uid('f'),
      name: src.name,
      kind: src.kind,
      x: 0,
      y: 0,
      width: src.width,
      depth: src.depth,
      height: src.height,
      rot: 0,
      color: src.color,
      colorName: src.colorName,
      product: src.product,
      photo: src.photo,
    };
    const old = REPLACEABLE.includes(src.kind) ? list.find((f) => f.kind === src.kind) : undefined;
    let msg: string;
    if (old) {
      // keep the long side the same way as the item it replaces (e.g. the side tables lengthwise in the room) – Rathi 28.10
      const oldAlongY = (old.rot === 90) !== (old.depth > old.width);
      const newAlongY0 = item.depth > item.width;
      const rot: 0 | 90 = item.width === item.depth ? old.rot : oldAlongY === newAlongY0 ? 0 : 90;
      item = clampToRoom(room, { ...item, x: old.x, y: old.y, rot });
      remove(old);
      msg = `Replaced ${def(old)}.`;
    } else if (item.kind === 'coffeetable' && room.coffeeSpot) {
      // the living room has no table until one is scanned: it goes in front of the sofa, long side along it (Rathi 28.10)
      const rot: 0 | 90 = item.width > item.depth ? 90 : 0;
      const fw = rot === 90 ? item.depth : item.width;
      const fd = rot === 90 ? item.width : item.depth;
      item = clampToRoom(room, { ...item, rot, x: Math.round(room.coffeeSpot.x - fw / 2), y: Math.round(room.coffeeSpot.y - fd / 2) });
      msg = 'Placed in front of the sofa.';
    } else {
      item = findFreeSpot(room, list, item);
      const w = wallOf(room, item);
      msg = `Added ${w ? WALL_PHRASE[w] : 'in a free spot'}.`;
    }
    setRoomItem(room, item);
    chat.highlightId = item.id;
    const placed = items().find((f) => f.id === item.id)!;
    reply(msg + observation(room, items(), placed), { changed: old ? `Swapped: ${old.name} → ${src.name}` : `Added: ${src.name}`, target: placed });
  };

  // 1. Attachment: place the furniture
  if (attachment) {
    placeNew(attachment);
    return {};
  }

  // 1b. Other tables: the suggested coffee tables show as icons in the row next to the scanned tables; one comes into
  //     the chat only when it is tapped, like the scanned tables (Rathi 11.11)
  if (wantsTableIdeas(rawText)) {
    const ideas = suggestionsFor('coffeetable');
    if (ideas.length) {
      room.showIdeas = true;
      // in the user's language, like the interior expert (Rathi 11.11)
      const norwegian = /\b(vis|meg|andre|annet|bord\w*|hvilk\w*|passer|jeg|hva|forslag|foreslå)\b/.test(rawText.toLowerCase());
      reply(
        norwegian
          ? `Jeg har lagt ${ideas.length} salongbord fra IKEA ved siden av de skannede bordene. Trykk på et for å se det i rommet.`
          : `I’ve put ${ideas.length} coffee tables from IKEA next to your scanned tables. Tap one to see it in the room.`,
      );
      return {};
    }
  }

  // 2. Does it fit?
  if (has('fit', 'space', 'room for', 'measure', 'distance', 'passer', 'plass', 'mål', 'avstand')) {
    const t = findTarget() ?? items().find((f) => f.kind === 'sofa');
    if (!t) {
      reply('Tap the item you want to check.');
      return {};
    }
    chat.highlightId = t.id;
    chat.planRequest = Date.now();
    reply(`I’ve marked the distances on the floor plan.${observation(room, items(), t) || ' There is plenty of space around it.'}`, { target: t });
    return { showPlan: true };
  }

  // 3. Size
  const smaller = has('smaller', 'narrower', 'shorter', 'mindre', 'smalere', 'kortere');
  const bigger = has('bigger', 'larger', 'wider', 'longer', 'større', 'bredere', 'lengre');
  if (smaller || bigger) {
    const t = findTarget();
    if (t) {
      const width = Math.max(40, t.width + (smaller ? -20 : 20));
      const updated = change({ ...t, width, name: t.kind === 'sofa' ? (width < 200 ? 'Sofa, 2-seater' : 'Sofa, 3-seater') : t.name });
      reply(`${Cap(def(t))} is now ${width} cm wide.${observation(room, items(), updated)}`, { changed: `Resized: ${t.name}`, target: updated });
      return {};
    }
  }

  // 4. Rotate
  if (has('rotate', 'turn', 'roter', 'snu', 'vri')) {
    const t = findTarget();
    if (t) {
      const updated = change({ ...t, rot: t.rot === 0 ? 90 : 0 });
      reply(`Rotated 90°.${observation(room, items(), updated)}`, { changed: `Rotated: ${t.name}`, target: updated });
      return {};
    }
  }

  // 5. Move
  if (has('move', 'place', 'put', 'flytt', 'plasser')) {
    const t = findTarget();
    if (t) {
      const nudge: [string[], number, number, string][] = [
        [['left', 'venstre'], -30, 0, '30 cm to the left'],
        [['right', 'høyre'], 30, 0, '30 cm to the right'],
        [['forward', 'closer', 'fram', 'frem', 'nærmere'], 0, 30, '30 cm forward'],
        [['back', 'away', 'bak', 'tilbake'], 0, -30, '30 cm back'],
      ];
      const n = nudge.find(([w]) => has(...w));
      if (n && !has('wall', 'vegg')) {
        const updated = change({ ...t, x: t.x + n[1], y: t.y + n[2] });
        reply(`Moved ${n[3]}.${observation(room, items(), updated)}`, { changed: `Moved: ${t.name}`, target: updated });
        return {};
      }
      const only: PlaceWall[] | undefined = has('window', 'vindu') ? ['back'] : has('door', 'dør') ? ['left'] : undefined;
      const res = placeOnOtherWall(room, items(), t, only);
      if (res) {
        const updated = change(res.item);
        reply(`Moved ${WALL_PHRASE[res.wall]}.${observation(room, items(), updated)}`, { changed: `Moved: ${t.name}`, target: updated });
        return {};
      }
      reply(`No wall has room for ${def(t)} without moving other furniture.`, { target: t });
      return {};
    }
  }

  // 6. Colour
  const color = COLORS.find(([re]) => re.test(text));
  if (color) {
    const t = findTarget();
    if (t) {
      const updated = change({ ...t, color: color[1], colorName: color[2] });
      reply(`${Cap(def(t))} is now ${color[2]}.`, { changed: `New colour: ${t.name}`, target: updated });
      return {};
    }
  }

  // 7. Warmer
  if (has('warm', 'cosy', 'cozy', 'varm', 'koselig', 'lun')) {
    const t = findTarget(false) ?? items().find((f) => f.kind === 'sofa');
    const parts: string[] = [];
    let target: Furniture | undefined;
    if (t) {
      target = change({ ...t, color: '#b8754f', colorName: 'terracotta' });
      parts.push(`${def(t)} is terracotta`);
    }
    const lampSrc = d.library.find((l) => l.kind === 'lamp');
    if (lampSrc && !items().some((f) => f.kind === 'lamp')) {
      const lamp = findFreeSpot(room, items(), { ...lampSrc, id: uid('f'), x: 0, y: 0, rot: 0 });
      setRoomItem(room, lamp);
      parts.push('the floor lamp is added from My furniture');
    }
    reply(parts.length ? `${Cap(parts.join(', and '))}.` : 'The room already has warm colours and light.', { changed: parts.length ? 'Warmer look' : undefined, target });
    return {};
  }

  // 8. Remove
  if (has('remove', 'delete', 'take away', 'fjern', 'ta bort', 'slett')) {
    const t = findTarget();
    if (t) {
      remove(t);
      reply(`${Cap(def(t))} is removed.`, { changed: `Removed: ${t.name}` });
      return {};
    }
  }

  // 9. Items from My furniture ("add the armchair")
  const lib = d.library.find((l) => text.includes(l.name.toLowerCase()));
  if (lib && !items().some((f) => f.name === lib.name)) {
    placeNew({ ...lib, source: 'My furniture' });
    return {};
  }

  // 10. New sofa. «Thinking about a new sofa» → ask for a photo (as in Figma); «add a sofa» → a standard sofa.
  if (has('sofa', 'couch') && has('thinking', 'considering', 'looking for', 'new', 'vurderer', 'ny')) {
    reply('Great! Attach a photo of the sofa and I’ll place it in the room.');
    return {};
  }
  if (has('sofa', 'couch')) {
    placeNew({ name: 'Sofa, 3-seater', kind: 'sofa', width: 220, depth: 90, height: 80, color: '#8a919c', colorName: 'grey', source: 'standard' });
    return {};
  }

  // 11. Fallback
  reply(FALLBACK);
  return { unhandled: true };
}
