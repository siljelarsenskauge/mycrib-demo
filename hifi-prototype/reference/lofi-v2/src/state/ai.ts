// Scripted "AI": simple keyword matching. Every rule changes the room directly and saves a version.
// Replies are deliberately short: say what changed, and only add an observation when it matters.
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
import { getRoom, pushUndo, removeRoomItem, setRoomItem } from './mutations';
import { uid } from './seed';
import type { AppState, Attachment, Furniture, FurnitureKind, Room } from './types';

const DEFINITE: Record<FurnitureKind, string> = {
  sofa: 'sofaen',
  coffeetable: 'salongbordet',
  tvbench: 'TV-benken',
  diningtable: 'spisebordet',
  chair: 'spisestolene',
  bed: 'sengen',
  dresser: 'kommoden',
  armchair: 'lenestolen',
  lamp: 'lampen',
  shelf: 'hyllen',
  other: 'møbelet',
};
const def = (f: Furniture) => DEFINITE[f.kind];
const Cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const round5 = (n: number) => Math.round(n / 5) * 5;

const KEYWORDS: [string, FurnitureKind][] = [
  ['lenestol', 'armchair'],
  ['salongbord', 'coffeetable'],
  ['spisebord', 'diningtable'],
  ['sofa', 'sofa'],
  ['stol', 'chair'],
  ['tv', 'tvbench'],
  ['seng', 'bed'],
  ['kommode', 'dresser'],
  ['lampe', 'lamp'],
  ['hylle', 'shelf'],
  ['puff', 'other'],
];

const COLORS: [RegExp, string, string][] = [
  [/zebra/, 'zebra', 'zebra'],
  [/mørk ?brun|mørkebrun/, '#5b3a29', 'mørk brun'],
  [/brun/, '#8b5a3c', 'brun'],
  [/beige|sand/, '#d9c7a7', 'beige'],
  [/grønn/, '#6f8a6a', 'grønn'],
  [/blå/, '#5a7290', 'blå'],
  [/svart/, '#2e2e2e', 'svart'],
  [/hvit/, '#f2f0eb', 'hvit'],
  [/grå/, '#8a919c', 'grå'],
  [/terrakotta|rød/, '#b5603f', 'terrakotta'],
  [/gul|sennep/, '#d2a93f', 'sennepsgul'],
  [/rosa/, '#d9a5a0', 'rosa'],
];

const REPLACEABLE: FurnitureKind[] = ['sofa', 'bed', 'diningtable', 'tvbench', 'coffeetable', 'dresser'];

export interface AIResult {
  showPlan?: boolean;
}

/** Only returns text when something is worth pointing out (narrow passage or blocked door). */
export function observation(room: Room, items: Furniture[], item: Furniture): string {
  if (blocksDoor(room, item)) return ` Obs: ${def(item)} står i slaget til døren.`;
  const p = tightestPassage(room, items, item);
  if (!p || !p.target) return '';
  const dist = round5(p.dist);
  if (dist < 80) return ` Gangsonen mot ${def(p.target)} blir ca. ${dist} cm, som er litt smalt (anbefalt er 80 cm).`;
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

  const reply = (msg: string, opts: { changed?: string; target?: Furniture } = {}) => {
    chat.messages.push({ id: uid('m'), role: 'ai', text: msg, changed: !!opts.changed, createdAt: Date.now() });
    if (opts.changed) pushUndo(room, before, opts.changed);
    if (opts.target) chat.lastTargetId = opts.target.id;
    chat.updatedAt = Date.now();
  };

  const change = (item: Furniture) => {
    setRoomItem(room, clampToRoom(room, item));
    chat.highlightId = item.id;
    return items().find((f) => f.id === item.id)!;
  };

  const remove = (item: Furniture) => removeRoomItem(room, item.id);

  const findTarget = (useLast = true): Furniture | undefined => {
    const list = items();
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
    };
    const old = REPLACEABLE.includes(src.kind) ? list.find((f) => f.kind === src.kind) : undefined;
    let msg: string;
    if (old) {
      item = clampToRoom(room, { ...item, x: old.x, y: old.y, rot: old.rot });
      remove(old);
      msg = `Byttet ut den gamle ${def(old)}.`;
    } else {
      item = findFreeSpot(room, list, item);
      const w = wallOf(room, item);
      msg = `Lagt til ${w ? WALL_PHRASE[w] : 'på en ledig plass'}.`;
    }
    setRoomItem(room, item);
    chat.highlightId = item.id;
    const placed = items().find((f) => f.id === item.id)!;
    reply(msg + observation(room, items(), placed), { changed: old ? `Byttet ut: ${old.name} → ${src.name}` : `Lagt til: ${src.name}`, target: placed });
  };

  // 1. Attachment: place the furniture
  if (attachment) {
    placeNew(attachment);
    return {};
  }

  // 2. Does it fit?
  if (has('passer', 'plass', 'får', 'mål', 'avstand')) {
    const t = findTarget() ?? items().find((f) => f.kind === 'sofa');
    if (!t) {
      reply('Trykk på møbelet du vil sjekke.');
      return {};
    }
    chat.highlightId = t.id;
    chat.planRequest = Date.now();
    reply(`Avstandene er vist i plantegningen.${observation(room, items(), t) || ' Det er god plass rundt.'}`, { target: t });
    return { showPlan: true };
  }

  // 3. Size
  const smaller = has('mindre', 'smalere', 'kortere');
  const bigger = has('større', 'bredere', 'lengre');
  if (smaller || bigger) {
    const t = findTarget();
    if (t) {
      const width = Math.max(40, t.width + (smaller ? -20 : 20));
      const updated = change({ ...t, width, name: t.kind === 'sofa' ? (width < 200 ? 'Sofa, 2-seter' : 'Sofa, 3-seter') : t.name });
      reply(`${Cap(def(t))} er nå ${width} cm bred.${observation(room, items(), updated)}`, { changed: `Endret størrelse: ${t.name}`, target: updated });
      return {};
    }
  }

  // 4. Move
  // Rotate
  if (has('roter', 'snu', 'vri')) {
    const t = findTarget();
    if (t) {
      const updated = change({ ...t, rot: t.rot === 0 ? 90 : 0 });
      reply(`Rotert 90°.${observation(room, items(), updated)}`, { changed: `Rotert: ${t.name}`, target: updated });
      return {};
    }
  }

  if (has('flytt', 'plasser')) {
    const t = findTarget();
    if (t) {
      const nudge: [string[], number, number, string][] = [
        [['venstre'], -30, 0, '30 cm til venstre'],
        [['høyre'], 30, 0, '30 cm til høyre'],
        [['fram', 'frem', 'nærmere'], 0, 30, '30 cm fram'],
        [['bak', 'tilbake', 'inn'], 0, -30, '30 cm bakover'],
      ];
      const n = nudge.find(([w]) => has(...w));
      if (n && !has('vegg')) {
        const updated = change({ ...t, x: t.x + n[1], y: t.y + n[2] });
        reply(`Flyttet ${n[3]}.${observation(room, items(), updated)}`, { changed: `Flyttet: ${t.name}`, target: updated });
        return {};
      }
      const only: PlaceWall[] | undefined = has('vindu') ? ['back'] : has('dør') ? ['left'] : undefined;
      const res = placeOnOtherWall(room, items(), t, only);
      if (res) {
        const updated = change(res.item);
        reply(`Flyttet ${WALL_PHRASE[res.wall]}.${observation(room, items(), updated)}`, { changed: `Flyttet: ${t.name}`, target: updated });
        return {};
      }
      reply(`Ingen vegg har plass til ${def(t)} uten å flytte andre møbler.`, { target: t });
      return {};
    }
  }

  // 5. Colour
  const color = COLORS.find(([re]) => re.test(text));
  if (color) {
    const t = findTarget();
    if (t) {
      const updated = change({ ...t, color: color[1], colorName: color[2] });
      reply(`${Cap(def(t))} er nå ${color[2]}.`, { changed: `Ny farge: ${t.name}`, target: updated });
      return {};
    }
  }

  // 6. Warmer
  if (has('varm', 'koselig', 'lun')) {
    const t = findTarget(false) ?? items().find((f) => f.kind === 'sofa');
    const parts: string[] = [];
    let target: Furniture | undefined;
    if (t) {
      target = change({ ...t, color: '#b8754f', colorName: 'terrakotta' });
      parts.push(`${def(t)} er terrakotta`);
    }
    const lampSrc = d.library.find((l) => l.kind === 'lamp');
    if (lampSrc && !items().some((f) => f.kind === 'lamp')) {
      const lamp = findFreeSpot(room, items(), { ...lampSrc, id: uid('f'), x: 0, y: 0, rot: 0 });
      setRoomItem(room, lamp);
      parts.push('gulvlampen er hentet fra Mine møbler');
    }
    reply(parts.length ? `${Cap(parts.join(', og '))}.` : 'Rommet har allerede varme farger og lys.', { changed: parts.length ? 'Varmere uttrykk' : undefined, target });
    return {};
  }

  // 7. Remove
  if (has('fjern', 'ta bort', 'slett')) {
    const t = findTarget();
    if (t) {
      remove(t);
      reply(`${Cap(def(t))} er fjernet.`, { changed: `Fjernet: ${t.name}` });
      return {};
    }
  }

  // 8. Library items ("legg til lenestolen")
  const lib = d.library.find((l) => text.includes(l.name.toLowerCase()));
  if (lib && !items().some((f) => f.name === lib.name)) {
    placeNew({ ...lib, source: 'Mine møbler' });
    return {};
  }

  // 9. New sofa
  if (has('sofa')) {
    placeNew({ name: 'Sofa, 3-seter', kind: 'sofa', width: 220, depth: 90, height: 80, color: '#8a919c', colorName: 'grå', source: 'standard' });
    return {};
  }

  // 10. Fallback
  reply('Det kan jeg ikke hjelpe med ennå. Prøv å legge til, flytte eller endre et møbel.');
  return {};
}
