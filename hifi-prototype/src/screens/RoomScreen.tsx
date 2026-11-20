import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AddMenu } from '../components/AddMenu';
import { AddBoardSheet } from '../components/Inspo';
import { ChatSheet, type SheetState } from '../components/ChatSheet';
import { Composer } from '../components/Composer';
import { ContextChip, KIND_ICON } from '../components/ContextChip';
import { FurniturePreview, type CaptureMethod } from '../components/FurniturePreview';
import { FurnitureThumb } from '../components/FurnitureThumb';
import { Icon } from '../components/Icon';
import { IsoView3D } from '../components/IsoView3D';
import { MyFurnitureSheet } from '../components/PickerSheets';
import { BraveSheet, NaturePreview } from '../components/NaturePalette';
import { clampChair, DEFAULT_CHAIR, PanoramaView, type PanoCamera, type PanoChair } from '../components/PanoramaView';
import { NotScannedView, PhotoPages, ScanPill } from '../components/PhotoPages';
import { PlanView2D } from '../components/PlanView2D';
import { hasPanorama, RoomSwitcher, viewLabel, ViewMenu, type ViewMode } from '../components/RoomMenus';
import { ScanModelView } from '../components/ScanModelView';
import { SelectionTray } from '../components/SelectionTray';
import { SidePanel } from '../components/SidePanel';
import { FakeFiles, FakePhotoLibrary, FURNITURE_PHOTOS } from '../components/FakePickers';
import { MeasureWizard } from './MeasureWizard';
import { useOpenRoom } from '../components/NotReadySheet';
import { IconButton, Loading, navigate } from '../components/ui';
import { SaveVersionSheet, VersionSheet } from '../components/VersionSheets';
import { observation, runAI, wantsTableIdeas } from '../state/ai';
import { askExpert, expertInput, expertReady, logExpert, PROMPT_VERSION, splitOptions } from '../state/expert';
import { nok, suggestionsFor } from '../state/catalog';
import { clampToRoom } from '../state/geometry';
import { AMETHYST, firstStep, NATURE_PALETTES, naturePalette, stepLabel, type BraveStep, type NaturePalette } from '../state/nature';
import { openBrave } from '../state/nav';
import { NatureTab } from '../components/NavV3';
import {
  ensureChat,
  getRoom,
  pushUndo,
  chatForItem,
  placeScanned,
  rememberScan,
  restoreVersion,
  hasUnsavedChanges,
  saveVersion,
  setRoomItem,
  setVariant,
  suggestVersionName,
  swapItem,
  undoLast,
  redoLast,
  keepVersion,
  continueFrom,
  applyMeasurements,
} from '../state/mutations';
import { draft as rectDraft, floorPlanRoom, roomShape, scannedRoom } from '../state/measure';
import { uid } from '../state/seed';
import { boardFor, boardScene, boardsOf, inspoSrc, setBoardRoom } from '../state/inspo';
import { FIG_FINALS, FIG_REVEALS, FIG_FOLLOW_UPS, FIG_LINE, FIG_MOODS, FIG_USER_VIEWS, FIG_SCRIPT, FIG_SWATCH_LINES, FIG_VIEWS, FigAvatar, FigPeek, type FigMood } from '../components/FigPeek';
import { BEIGE, FIG_GREET_ROOM, FIG_HELLO, figColour, figGreeted, figReply, markFigGreeted } from '../components/FigGuide';
import { isStoryRoom, ALL_DONE, DOORS_LINE, MAIN_STORY, MOMENTS, NATURE_LINE, NATURE_NAMES, NATURE_OPTIONS, nextOptions, resetStand, STAND, STAND_HELLO, STAND_LOCK_ROOM, STAND_TABLES, standTableFor, START_OVER, TABLE_HINT, TABLE_PLACED } from '../stand';
import { MakeoverView, MAKEOVERS } from '../components/Makeover';
import { InspirationPicker } from '../components/InspirationPicker';
import { useStore } from '../state/store';
import type { Attachment, Furniture, Pin, Room } from '../state/types';
import { RoomScanScreen } from './RoomScanScreen';

type Overlay =
  | null
  | { kind: 'rooms' }
  | { kind: 'view' }
  | { kind: 'save' }
  | { kind: 'version'; id: string }
  | { kind: 'add' }
  | { kind: 'capture'; method: CaptureMethod; initial?: Attachment; swap?: boolean; photo?: string }
  | { kind: 'library' }
  | { kind: 'inspo' }
  | { kind: 'board' }
  | { kind: 'panel' }
  | { kind: 'photos'; swap: boolean }
  /** «How brave are you?» with a nature palette over the room (07.11) */
  | { kind: 'brave' };

const SHOW_NATURE_IN_ROOM = false;
// versions are kept automatically now (Synne 13.11); the «Save version» button is kept behind a flag
// the wand stays while writing, so only one thing changes – the clock becomes send (Synne 14.11: «gir det mening at pynte-knappen forsvinner?»). Was hidden 13.11.
const HIDE_WAND_WHILE_WRITING = false;
// how long the AI «builds» the room from an inspiration photo (Synne 14.11)
const MAKEOVER_MS = 7000;
// «Not scanned yet · Scan for 3D» on a room made from photos: removed, it only disturbed (Synne 14.11). Scanning is still in
// the 3D and floor plan views. Kept behind a flag
const SHOW_SCAN_PILL = false;
// the tapped furniture as a chip in the bar – Synne 14.11: «ikke vis det i chaten, vis det på møbelet». Kept behind a flag
const SHOW_SELECTED_CHIP = false;
const SHOW_SAVE_BUTTON = false;
// the swipe pill for versions (13.11) was replaced by the clock + a row of version cards; kept behind a flag
const SHOW_VERSION_PILL = false;

/** A question rather than a request (only used when Claude can answer). Claude answers every question, also about
 *  space, so the chat has one voice (Rathi 11.11); «can you rotate the table?» is a request. */
function isQuestion(text: string) {
  const t = text.trim().toLowerCase();
  if (/^(can|could|would) you\b|^kan du\b|^kunne du\b/.test(t)) return false;
  return /\?$/.test(t) || /^(what|which|how|why|would|should|could|can|do|does|is|are|hva|hvilk\w*|hvordan|hvorfor|vil|bør|kan|passer|er)\b/.test(t);
}

/** the table's distances in the chat: all of them after every move (Rathi 29.10), or only when it is tight (Synne 17.11) */
const SHOW_ALL_DISTANCES = false;
/** the suggested tables show in the row right away, without «More tables» (Synne 17.11) */
const SHOW_ALL_TABLES = true;
/** the «Using: <moodboard>» tag over the chat (off since Synne 18.11) */
const SHOW_BOARD_CHIP = false;
/** the «Show chat» pill over a closed chat (18.11); off since Synne 19.11 – the handle on the bar does it */
const SHOW_CHAT_PILL = false;
/** how long the room in colours from nature takes to be «made» (ms, Synne 19.11) */
const NATURE_GEN_MS = 4200;
/** the stand: Fig's doors in the chat after the sofa story (18.11); off since 19.11 – the «task done» popup offers them */
const SHOW_DOORS_IN_CHAT = false;
/** the fig peeking up behind the chat bar (off since Synne 18.11: «ligger litt i veien»); Fig stays the face in the chat */
const SHOW_FIG_PEEK = false;
/** the «Fig · Statement ✕» pill in a nature palette (off since Synne 18.11); undo takes the room back instead */
const SHOW_NATURE_PILL = false;
/** «Version 2 saved – find it under the clock» when the room changes (off since Silje 18.11); the dot on the clock stays */
const SHOW_VERSION_TOAST = false;
/** the tag over the chat with the item the talk is about, e.g. «Beige sofa with chaise ✕» (off since Synne 19.11);
 *  furniture tapped in the room still shows its tag */
const SHOW_MENTION_CHIP = false;
/** the tag over the chat with the furniture you tapped, e.g. «Dining table ✕» (off since Synne 19.11: «bare dropp denne»).
 *  The furniture still shows that it is chosen in the room */
const SHOW_SELECTED_CHIP_IN_CHAT = false;
/** Silje's ✕ at the top left while the room is in colours from nature (18.11); off since Synne 19.11 – undo takes the
 *  colours away, and the 360° menu stays where it is */
const SHOW_NATURE_X = false;
/** the side menu with chats and versions behind the ☰ (off since Synne 19.11): the button opens Room settings instead */
const SHOW_SIDE_PANEL = false;
/** the living room's cover on Home follows the room as it is now (Synne 19.11): a still of the 360° view in the sofa
 *  colour, rug and walls shown (public/rooms/living_<variant>.jpg), or the finished room. Not when the user picked a cover. */
const LIVING_VARIANTS = ['olive', 'burgundy', 'lilac', 'sage', 'teal', 'rose', 'rose-rug-burgundy', 'rose-rug-olive', 'rose-rug-stripes', 'rose-stripes-olive-walls', 'pimped'];
const LIVING_COVER = (variant: string | null) => `/rooms/living_${variant && LIVING_VARIANTS.includes(variant) ? variant : 'beige'}.jpg`;
/** the living room's 360° photos in «Får et sofabord plass?»: the original room with the beige sofa (Synne 19.11; was the
 *  dusty rose sofa earlier the same day). The task now comes right after «Lag ditt eget rom», before the sofa story */
const TABLE_ROOM_VIEW = '';
/** Fig's «Nå ser det ut som et hjem! …» with the two doors after Silje's sofa talk (off since Silje 18.11) */
const SHOW_DOORS_LINE = false;
/** the stand's suggestions above the field (17.11); off since 18.11 – the glow and Fig's doors show the way */
const STAND_CHIPS = false;
/** Silje's scripted fig talk after a sofa is scanned (her promo video, branch silje-video-fiken); off in the full app (Synne 18.11) */
const SILJE_FIG_TALK = true; // back in (Synne 18.11): it starts from + → Add furniture on Home, where the scan finds the sofa
/** closer than this to the sofa or the dining table, Fig says it is tight (cm) */
const TIGHT_SOFA_CM = 30;
const TIGHT_DINE_CM = 60;

export function RoomScreen({ roomId }: { roomId: string }) {
  const { state, update, showToast } = useStore();
  // the latest state, for answers that are worked out outside update() (Claude, Rathi 11.11)
  const stateRef = useRef(state);
  stateRef.current = state;
  const openRoom = useOpenRoom();
  const room = state.rooms.find((r) => r.id === roomId);
  const activeId = state.activeChat[roomId] ?? null;
  const chat = state.chats.find((c) => c.id === activeId);
  const roomChats = state.chats.filter((c) => c.roomId === roomId);

  // rooms open on the photo (Skarp · Stuen min – chat); 3D and 2D are in the view menu
  const [mode, setMode] = useState<ViewMode>('real');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  // the chat starts closed (only «Ask about the room …»); tapping the field or the handle opens it (Synne 04.11)
  const [sheet, setSheet] = useState<SheetState>('closed');
  // the «Try others» tray and the messages share the chat sheet – only one is shown at a time
  const [focus, setFocus] = useState<'chat' | 'tray'>('chat');
  const [overlay, setOverlay] = useState<Overlay>(null);
  // the puzzled fig peeks up after a sofa is scanned into the room (Silje 13.11, promo video)
  const [figPeek, setFigPeek] = useState(false);
  // the hello peek is short (Synne 17.11: the fig under the chat was in the way): Fig slides back down after a few
  // seconds and lives on as the face on the note and in the chat. Silje's video talk keeps its fig up.
  const [figLeaving, setFigLeaving] = useState(false);
  // the scripted talk with the fig (Silje 17.11): the index in FIG_SCRIPT of the user's next line, or null
  const [figTalk, setFigTalk] = useState<number | null>(null);
  const typingRef = useRef<number | null>(null);
  // the fig's face in Silje's talk (puzzled → happy → happier, Silje 17.11)
  const silijeMood = useRef<FigMood>('puzzled');
  // the stand: with colour dots under the fig's line, the field glows only after one has been tried (Synne 18.11)
  const [triedSwatch, setTriedSwatch] = useState(false);
  // a sofa colour was picked: the 360° view shows the living room with the sofa in that colour (Silje's photos); kept in a ref
  // so a 360° view that loads again (another view and back) gets it too
  // kept on the room (sofaView), so the room still has its colours when you come back, like the cover on Home (Synne 19.11)
  const sofaVariant = useRef<string | null>(room?.sofaView ?? null);
  // a room made from photos only can be scanned right from the room (pill, empty 3D/2D, the AI's answer)
  const [scanOpen, setScanOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [inspirations, setInspirations] = useState<Pin[]>([]);
  // a nature photo in the composer, from «If nature says it fits» on the home screen (07.11)
  const [natureId, setNatureId] = useState<string | null>(null);
  // the room shown in a nature palette (Synne 07.11): it stays until the user goes back to the original room.
  // It is kept beside the room, never in it, so the room itself (and «Recent rooms») is not changed.
  const natureView = state.natureView?.roomId === roomId ? state.natureView : null;
  const naturePal = naturePalette(natureView?.paletteId);
  const setNatureView = (v: { paletteId: string; step: BraveStep } | null) =>
    update((d) => {
      d.natureView = v ? { roomId, ...v } : undefined;
    });
  const [thinking, setThinking] = useState(false);
  const [natureMode, setNatureMode] = useState(false);
  // ✕ on a chip found from the text hides it until the text changes (Rathi 29.10)
  const [mentionOff, setMentionOff] = useState<string | null>(null);
  // the 360° photo view has its own test chair (as in Furnie); it is selected and moved separately from the 3D model
  const [panoChair, setPanoChair] = useState<PanoChair>(DEFAULT_CHAIR);
  const [panoSelected, setPanoSelected] = useState(false);
  const panoCamera = useRef<PanoCamera>({ yaw: 44 });
  // «Item photo» opens the same pretend photo library as «Create room» → «Add photos», with furniture photos (Synne 04.11)
  const pickPhoto = (swap: boolean) => setOverlay({ kind: 'photos', swap });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  // the chat sheet floats over the room view (like the Claude app); the view keeps clear of it via --sheet-h
  const screenRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // ---- Rathi (28.10): the living room's 360° and 3D are the measured views in public/furnie ----
  // They are pages in a frame. The app sends them the coffee table that stands in the room; they say when it is
  // tapped (it is then marked in the chat) or moved (the room is updated, so 2D and the AI use the new place).
  // a room the visitor scanned at the stand opens in Rathi's new 360° view too, not the old panorama (Synne 18.11)
  const useMine = (roomId === 'r_living' || !!room?.scannedAt) && (mode === 'real' || mode === '3d');
  const frameRef = useRef<HTMLIFrameElement>(null);
  const tableItem = room?.furniture.find((f) => f.kind === 'coffeetable') ?? null;
  const tableJson = JSON.stringify(tableItem);
  // what the 360° view shows now (sofa colour / rug / walls), so the same photos aren't sent twice
  const frameSofa = useRef<string>(room?.sofaView ?? '');
  const postFrame = (m: object) => {
    frameRef.current?.contentWindow?.postMessage(m, '*');
    if ((m as { type?: string }).type === 'mycrib:sofa') frameSofa.current = (m as { variant?: string }).variant ?? '';
    // a new sofa colour, rug or walls in the 360° view: the cover on Home shows it too (Synne 19.11)
    const v = (m as { type?: string; variant?: string }).type === 'mycrib:sofa' ? (m as { variant?: string }).variant : undefined;
    if (v !== undefined) {
      if (room && room.sofaView !== v)
        update((d) => {
          getRoom(d, roomId).sofaView = v;
        });
      setLivingCover(LIVING_COVER(v));
    }
  };
  const setLivingCover = (img: string) => {
    if (!isStoryRoom(state, roomId) || room?.coverOwn || room?.image === img) return;
    update((d) => {
      const r = getRoom(d, roomId);
      if (!r.coverOwn) r.image = img;
    });
  };
  const sendInsets = () => {
    const st = screenRef.current;
    if (!st) return;
    const box = st.getBoundingClientRect();
    const tools = st.querySelector('.stage-tools');
    const sh = sheetRef.current;
    const top = tools ? tools.getBoundingClientRect().bottom - box.top + 8 : 120;
    const row = st.querySelector('.stage-row');
    const bottom = row ? box.bottom - row.getBoundingClientRect().top : sh ? box.bottom - sh.getBoundingClientRect().top : 120;
    postFrame({ type: 'mycrib:insets', top: Math.round(top), bottom: Math.round(bottom) });
  };
  const nextOptionsRef = useRef<() => string[]>(() => []);
  const latest = useRef<{ table: Furniture | null; applyEdit: ((f: Furniture, label: string) => void) | null }>({ table: null, applyEdit: null });
  latest.current.table = tableItem;
  // after a swap from the carousel the view reports the new table's distances, for its chat (Rathi 29.10)
  const announce = useRef(false);
  useEffect(() => {
    if (useMine) postFrame({ type: 'mycrib:table', item: tableItem, announce: announce.current });
    announce.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMine, tableJson]);
  useEffect(() => {
    if (useMine && !selectedId) postFrame({ type: 'mycrib:deselect' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMine, selectedId]);
  useEffect(() => {
    if (!useMine) return;
    const onMsg = (e: MessageEvent) => {
      const m = e.data;
      if (!m || m.src !== 'furnie' || e.source !== frameRef.current?.contentWindow) return;
      const t = latest.current.table;
      if (m.type === 'mycrib:ready') {
        postFrame({ type: 'mycrib:table', item: t });
        if (sofaVariant.current) postFrame({ type: 'mycrib:sofa', variant: sofaVariant.current });
        sendInsets();
      }
      // the distances the view measured (sofa, rug, dining table) go into the chat as one note that is kept up to date
      // (a tap only marks the table – nothing is written in the chat, Rathi 29.10)
      if (m.dist && t && (m.type === 'mycrib:moved' || m.type === 'mycrib:measured')) {
        // Fig only speaks up when it gets tight, and says what it means (Synne 17.11: the list of distances after every
        // move was noise). Rathi's note with all the distances (29.10) is behind SHOW_ALL_DISTANCES.
        const sofa = Number(m.dist.sofa);
        const dine = Number(m.dist.dine);
        const tight = sofa < TIGHT_SOFA_CM || dine < TIGHT_DINE_CM;
        update((d) => {
          const open = d.chats.find((x) => x.id === d.activeChat[roomId]);
          const last = open?.messages[open.messages.length - 1];
          const lastIsNote = !!last && last.role === 'ai' && last.id.startsWith('m_measure_');
          let text: string | null = null;
          let mood: 'puzzled' | 'happy' = 'happy';
          if (SHOW_ALL_DISTANCES) text = `Distances for the ${t.name}: ${m.dist.sofa} cm to the sofa, ${m.dist.rug}, ${m.dist.dine} cm to the dining table.`;
          else if (tight) {
            mood = 'puzzled';
            text =
              sofa < TIGHT_SOFA_CM
                ? STAND ? `Litt trangt: bare ${sofa} cm til sofaen. Rundt 40 cm gjør det lett å komme forbi.` : `A bit tight: only ${sofa} cm to the sofa. About 40 cm makes it easy to get past.`
                : STAND ? `Litt trangt: bare ${dine} cm til spisebordet. Rundt 60 cm gir plass til å gå mellom dem.` : `A bit tight: only ${dine} cm to the dining table. About 60 cm leaves room to walk between them.`;
          } else if (lastIsNote) text = STAND ? 'Bedre! Nå er det plass til å komme forbi.' : 'Better. Now there’s room to get past.'; // only after a warning
          if (!text) return;
          // no chat open in the room: Fig starts one (the note was lost before)
          const c = open ?? ensureChat(d, roomId, 'Fig');
          if (lastIsNote && last) {
            // from a warning to «Better»: a new id, so it shows as a note again
            if (last.mood !== mood) last.id = uid('m_measure');
            last.text = text;
            last.mood = mood;
            last.createdAt = Date.now();
          } else c.messages.push({ id: uid('m_measure'), role: 'ai', text, mood, createdAt: Date.now() });
          // at the stand the note also offers what to try next (Synne 17.11)
          const note = c.messages[c.messages.length - 1];
          if (STAND && note) note.options = nextOptionsRef.current();
          c.updatedAt = Date.now();
        });
      }
      if (m.type === 'mycrib:select') {
        if (m.on && t) setSelectedId(t.id);
        else if (!m.on) setSelectedId(null);
      }
      if (m.type === 'mycrib:moved' && t && (m.x !== t.x || m.y !== t.y || m.rot !== t.rot))
        latest.current.applyEdit?.({ ...t, x: m.x, y: m.y, rot: m.rot === 90 ? 90 : 0 }, `Moved: ${t.name}`);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMine]);

  useLayoutEffect(() => {
    const sheetEl = sheetRef.current;
    const screenEl = screenRef.current;
    if (!sheetEl || !screenEl) return;
    const ro = new ResizeObserver(() => {
      screenEl.style.setProperty('--sheet-h', `${sheetEl.offsetHeight}px`);
      sendInsets();
    });
    ro.observe(sheetEl);
    return () => ro.disconnect();
  }, []);

  // remember when the room was opened; the first time, the room as it is becomes the starting point for «Save version»
  useEffect(() => {
    update((d) => {
      const r = d.rooms.find((x) => x.id === roomId);
      if (!r) return;
      r.lastOpenedAt = Date.now();
      if (!r.versionBase) r.versionBase = structuredClone(r.furniture);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // The view never changes by itself – only when the user picks another one (Synne 22.10).
  // (Before, an AI change or a request for measurements switched the photo to 2D/3D.)

  // Reset local UI when switching chat. If the page was refreshed while the AI was "thinking", answer now.
  // (a swap from the carousel opens the new table's chat and keeps it marked – Rathi 29.10)
  const keepSelection = useRef(false);
  const shownChat = useRef(activeId);
  useEffect(() => {
    if (!sendingRef.current && !keepSelection.current) setSelectedId(null);
    keepSelection.current = false;
    // another chat picked in the room opens it; opening the room itself does not
    // …but not when the chat was just started by sending a message (Synne 13.11: the chat opens only when asked)
    // the chat never opens by itself – not for a new chat from scan, a swap or a moodboard. It opens only when the user
    // taps the answer note or the handle; answers show as a short note (Synne 14.11)
    shownChat.current = activeId;
    const last = chat?.messages[chat.messages.length - 1];
    if (chat && last?.role === 'user' && !sendingRef.current) {
      setThinking(true);
      const t = window.setTimeout(() => {
        update((d) => {
          const c = d.chats.find((x) => x.id === chat.id);
          if (c && c.messages[c.messages.length - 1]?.role === 'user') runAI(d, roomId, chat.id, last.text, last.attachment);
        });
        setThinking(false);
      }, 1200);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // An item captured on the home screen: attach it to the input so the user can add a comment before sending
  const pending = state.pending?.roomId === roomId ? state.pending.attachment : null;
  const handoffDone = useRef(false);
  useEffect(() => {
    if (!pending || handoffDone.current) return;
    handoffDone.current = true;
    // The scanned item is placed in the room right away (no extra Send needed)
    // …and gets its own chat when it was scanned (each table has its own chat, Rathi 29.10).
    // A scanned table goes straight into the room, without anything in the chat (Rathi 29.10).
    if (pending.source === 'scan' && pending.kind === 'coffeetable') {
      update((d) => {
        d.pending = undefined;
        const r = getRoom(d, roomId);
        rememberScan(r, pending);
        placeScanned(r, pending, uid('f'));
        chatForItem(d, roomId, pending);
      });
      return;
    }
    // A scanned sofa also goes straight into the room, in the old sofa's place – with an empty chat and no message
    // or bubble: the room speaks for itself (Silje 13.11)
    if (pending.source === 'scan' && pending.kind === 'sofa') {
      update((d) => {
        d.pending = undefined;
        const r = getRoom(d, roomId);
        rememberScan(r, pending);
        const old = r.furniture.find((f) => f.kind === 'sofa' && !f.locked);
        if (old) swapItem(r, old.id, pending);
        else placeScanned(r, pending, uid('f'));
        d.activeChat[roomId] = null; // a new, empty chat
        // the room's cover now shows it with a sofa (it started as the empty room, Silje 13.11)
        // a new (beige) sofa: the room's colours start over
        r.sofaView = undefined;
        sofaVariant.current = null;
        if (isStoryRoom(d, roomId) && !r.coverOwn) r.image = LIVING_COVER('');
        if (STAND) {
          d.standSofa = true; // Home stops showing the way (Synne 18.11)
          if (d.standTrip === 'sofa') d.standTrip = undefined;
        }
      });
      // Silje's scripted fig talk for the video is not in the full app (Synne 18.11) – behind SILJE_FIG_TALK
      if (!SILJE_FIG_TALK) return;
      setFigPeek(true);
      // …and says its line in a new chat for the room, once it has popped up
      window.setTimeout(() => {
        // the new chat is marked as shown, so it doesn't open itself a second time
        const figChat = uid('c');
        shownChat.current = figChat;
        update((d) => {
          const c = ensureChat(d, roomId, 'Beige on beige?', figChat);
          c.messages.push({ id: uid('m'), role: 'ai', text: FIG_LINE, mood: 'puzzled', createdAt: Date.now() });
          c.updatedAt = Date.now();
        });
        // the fig's first line comes as the short note above the bar, not in an open chat (Synne 18.11, as the rule from
        // 13.11: the chat never opens by itself) – a tap on the note opens the chat, a tap in the field types the reply
        setFigTalk(1);
      }, 1300);
      return;
    }
    const cid = activeId ?? uid('c');
    update((d) => {
      d.pending = undefined;
      const c = pending.source === 'scan' ? chatForItem(d, roomId, pending).chat : ensureChat(d, roomId, pending.name || 'New chat', cid);
      c.messages.push({ id: uid('m'), role: 'user', text: '', attachment: pending, createdAt: Date.now() });
      c.updatedAt = Date.now();
      rememberScan(getRoom(d, roomId), pending);
      runAI(d, roomId, c.id, '', pending);
    });
    setFocus('chat');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fig says hello when the living room opens, once per visit (Synne 17.11): it peeks up behind the bar and its line
  // shows as the short note. The chat doesn't open by itself (Synne 13.11) – a tap on the note or on Fig opens it.
  // Not when the room was opened for something else (a scan, a nature photo, «How brave»).
  useEffect(() => {
    if (roomId !== FIG_GREET_ROOM || figGreeted() || state.pending || state.pendingNature || state.standAsk || openBrave.roomId === roomId) return;
    const t = window.setTimeout(() => {
      markFigGreeted();
      const cid = uid('c');
      update((d) => {
        d.activeChat[roomId] = null; // a new chat with Fig
        const c = ensureChat(d, roomId, 'Fig', cid);
        c.messages.push({ id: uid('m'), role: 'ai', ...(STAND ? STAND_HELLO : FIG_HELLO), createdAt: Date.now() });
        c.updatedAt = Date.now();
      });
      setFigPeek(true);
      window.setTimeout(() => setFigLeaving(true), 5200);
      window.setTimeout(() => {
        setFigPeek(false);
        setFigLeaving(false);
      }, 5650);
    }, 1400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // from Try nature (Create / Studio, 10.11): the room opens in the palette with «How brave are you?» showing
  useEffect(() => {
    if (openBrave.roomId !== roomId) return;
    openBrave.roomId = null;
    setMode('real');
    setSheet('closed');
    setOverlay({ kind: 'brave' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // «If nature says it fits» on the home screen: the room opens in that palette straight away, with the nature photos
  // open under it so another one is one tap away (Silje 18.11; before, the photo waited in the composer with a text)
  useEffect(() => {
    const p = state.pendingNature;
    if (!p || p.roomId !== roomId) return;
    update((d) => {
      d.pendingNature = undefined;
    });
    const pal = naturePalette(p.paletteId);
    if (pal) showNature(pal);
    setPanel('magic');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pendingNature]);

  if (!room) {
    return (
      <div className="screen placeholder-screen">
        <p>Couldn’t find the room.</p>
        <button className="text-link" onClick={() => navigate('/')}>
          Go to My Space
        </button>
      </div>
    );
  }

  // ---- versions kept automatically, older ones to the left (Synne 13.11) ----
  const versions = state.snapshots.filter((s) => s.roomId === roomId); // newest first
  const [versionIx, setVersionIx] = useState(0); // 0 = now, 1 = the newest older version, …
  const viewing = versionIx > 0 ? versions[versionIx - 1] : null;
  const [slideDir, setSlideDir] = useState<'' | 'left' | 'right'>('');
  // the bar's panel: + (add), the wand (nature colours) or versions – it opens above the field inside the bar (Synne's Figma 1004:15249)
  const [panel, setPanel] = useState<null | 'add' | 'magic' | 'history'>(null);
  // opening something else in the bar (versions, nature photos, +) lets go of the chosen furniture (Synne 14.11)
  const letGo = () => {
    setSelectedId(null);
    setPanoSelected(false);
  };
  const togglePanel = (p: 'add' | 'magic' | 'history') => {
    if (panel !== p) letGo();
    setPanel((x) => (x === p ? null : p));
  };
  // a tap anywhere outside the bar closes its panel (versions, nature photos) – Synne 13.11
  useEffect(() => {
    if (!panel) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('.chat-sheet-wrap') || t.closest('.compare')) return;
      setPanel(null);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [panel]);
  // writing: the field grows into a box with + and send inside (Synne's Figma 987:14820, 13.11)
  const [writing, setWriting] = useState(false);
  // compare: an older version on the left, now on the right, with a divider you drag (Synne 13.11)
  const [compare, setCompare] = useState(false);
  // floor plan or measurements for a room made from a photo (Synne 14.11)
  const [shapeFlow, setShapeFlow] = useState<null | 'files' | 'measure' | 'building'>(null);
  const buildShape = (recipe: (r: Room) => void, message: string) => {
    setShapeFlow('building');
    window.setTimeout(() => {
      update((d) => {
        const r = getRoom(d, roomId);
        recipe(r);
        r.unmeasured = undefined;
        r.updatedAt = Date.now();
      });
      setShapeFlow(null);
      showToast(message);
    }, 1600);
  };
  // a new version the user hasn't looked at yet: a dot on the clock (Synne 14.11)
  const [newVersion, setNewVersion] = useState(false);
  useEffect(() => { if (panel === 'history') setNewVersion(false); }, [panel]);
  // compare any two versions (Synne 13.11): the two chosen cards are marked; a tap on another card swaps out the one
  // chosen longest ago. The older of the two is on the left.
  const [pair, setPair] = useState<[number, number]>([1, 0]);
  const [pairSlot, setPairSlot] = useState(0);
  const pickCompare = (ix: number) => {
    if (pair.includes(ix)) return;
    const next: [number, number] = [...pair] as [number, number];
    next[pairSlot] = ix;
    setPair(next);
    setPairSlot((s) => 1 - s);
  };
  const startCompare = () => {
    if (compare) { setCompare(false); return; }
    setPair([versionIx > 0 ? versionIx : 1, 0]);
    setPairSlot(0);
    goVersion(0);
    setCompare(true);
  };
  const versionName = (ix: number) => (ix === 0 ? 'Now' : `Version ${versions.length - ix + 1}`);
  // compare belongs to the versions in the bar: closing the panel ends it
  useEffect(() => { if (panel !== 'history' && compare) setCompare(false); }, [panel]); // eslint-disable-line react-hooks/exhaustive-deps
  const goVersion = (ix: number) => {
    const next = Math.max(0, Math.min(versions.length, ix));
    if (next === versionIx) return;
    setSlideDir(next > versionIx ? 'left' : 'right');
    setVersionIx(next);
  };
  const items = viewing ? viewing.furniture : room.furniture;
  // the real 3D/360° view shows the table of the version you look at (Synne 13.11)
  const shownTable = JSON.stringify(items.find((f) => f.kind === 'coffeetable') ?? null);
  // looking at an older version: the 360° view shows it in its colours too (Synne 19.11); back to now, the room's own
  const shownSofa = viewing ? (viewing as { sofaView?: string }).sofaView ?? '' : room?.sofaView ?? '';
  useEffect(() => {
    // only when it differs from what the view already shows, so the photos don't load twice
    if (!useMine || frameSofa.current === shownSofa) return;
    frameRef.current?.contentWindow?.postMessage({ type: 'mycrib:sofa', variant: shownSofa }, '*');
    frameSofa.current = shownSofa;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMine, shownSofa]);
  useEffect(() => {
    if (useMine) postFrame({ type: 'mycrib:table', item: JSON.parse(shownTable) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMine, shownTable]);
  const selected = items.find((f) => f.id === selectedId) ?? null;

  // ---- Rathi (29.10): scanned items ----
  // Tapping a scanned item (in the room or in the carousel) only marks it. It shows up in the chat only when the user
  // writes about it: its name (e.g. «Telemark»), or «table»/«bord» when it is a table (not «dining table»/«spisebord»).
  const scanned = room.scanned ?? [];
  const standing = (a: Attachment) => items.find((f) => f.name === a.name && f.kind === a.kind);
  // suggested tables (Rathi 11.11): they show as icons in the row after the scanned tables once the user asks for them –
  // «More tables» in the row, or in the chat. They work like the scanned tables: a tap puts the table in front of the
  // sofa and opens its own chat, so a suggestion only comes into the chat when it is tapped.
  // all the tables show straight away, no «More tables» button (Synne 17.11); the button is behind SHOW_ALL_TABLES
  const ideas = suggestionsFor('coffeetable').filter((s) => !scanned.some((a) => a.name === s.name) && (SHOW_ALL_TABLES || !!room.showIdeas || !!standing(s)));
  const offered = [...scanned, ...ideas];
  const canAskForTables = !SHOW_ALL_TABLES && !room.showIdeas && scanned.some((a) => a.kind === 'coffeetable') && suggestionsFor('coffeetable').length > 0;
  const isScanned = (f: Furniture | null) => !!f && offered.some((a) => a.name === f.name && a.kind === f.kind);
  const mentioned = (() => {
    const t = draft.toLowerCase();
    if (!t.trim() || mentionOff === draft) return null;
    const inRoom = offered.map(standing).filter((f): f is Furniture => !!f);
    const byName = inRoom.find((f) => f.name.toLowerCase().split(/[^a-zæøå0-9]+/).some((w) => w.length >= 5 && !/^(table|tables|glass|smoked)$/.test(w) && t.includes(w)));
    if (byName) return byName;
    if (/dining|spise/.test(t)) return null;
    const generic = /\b(table|tables|coffee ?table|side ?tables?|nesting|glass|bord\w*|sidebord\w*|salongbord\w*|settbord\w*)\b/.test(t);
    if (!generic) return null;
    const tables = inRoom.filter((f) => f.kind === 'coffeetable');
    return tables.find((f) => f.id === selectedId) ?? tables[0] ?? null;
  })();
  // what the message is about: a non-scanned item that is marked (as before), or the scanned item the text names
  const chatItem = selected && !isScanned(selected) ? selected : mentioned;

  // the room's moodboard: the AI uses it as a reference here (Figma D7, F6)
  const roomBoard = boardFor(state, roomId);
  const addBoard = (boardId: string) => {
    setOverlay(null);
    const board = boardsOf(state).find((b) => b.id === boardId)!;
    update((d) => {
      setBoardRoom(d, boardId, roomId, true);
      const c = ensureChat(d, roomId, board.name);
      c.messages.push({
        id: uid('m'),
        role: 'ai',
        text: `Got it. «${board.name}» leans towards ${boardScene(board).mood}. I’ll use it in this room. Want an idea to start with?`,
        createdAt: Date.now(),
      });
      c.updatedAt = Date.now();
    });
  };
  const removeBoard = () =>
    update((d) => {
      if (roomBoard) setBoardRoom(d, roomBoard.id, roomId, false);
    });

  // «Using: <moodboard>» over the chat is off (Synne 18.11) – behind SHOW_BOARD_CHIP
  const boardChip = SHOW_BOARD_CHIP && roomBoard ? (
    <span className="context-chip">
      {roomBoard.items[0] && <img className="context-chip-photo" src={inspoSrc(roomBoard.items[0])} alt="" />}
      <span className="context-chip-name">Using: {roomBoard.name}</span>
      <button type="button" onClick={removeBoard} aria-label={`Remove ${roomBoard.name} from this room`}>
        <Icon name="close" size={14} />
      </button>
    </span>
  ) : undefined;

  /** The fig talk: a tap in the field types the user's next line by itself, letter by letter (Silje 17.11) */
  const typeFigLine = () => {
    if (draft || typingRef.current) return;
    const line = figTalk !== null ? FIG_SCRIPT[figTalk] : STAND && tableAsk ? TABLE_PROMPT : STAND && roomStep !== null ? ROOM_TALK[roomStep].me : null;
    if (!line) return;
    const letters = Array.from(line);
    let n = 0;
    typingRef.current = window.setInterval(() => {
      n++;
      setDraft(letters.slice(0, n).join(''));
      if (n >= letters.length && typingRef.current) {
        window.clearInterval(typingRef.current);
        typingRef.current = null;
      }
    }, 45);
  };
  /** The fig talk: the user's line is sent, and the fig answers with the next line of the script */
  const sendFigLine = () => {
    if (figTalk === null) return;
    if (typingRef.current) {
      window.clearInterval(typingRef.current);
      typingRef.current = null;
    }
    const mine = FIG_SCRIPT[figTalk];
    // some of the user's lines make the fig happier (Silje 17.11); the face goes on the fig's answers from here on
    if (FIG_MOODS[figTalk]) silijeMood.current = FIG_MOODS[figTalk];
    // the line names a colour: the room shows that one, whatever was tried last (Synne 18.11)
    const said = FIG_USER_VIEWS[figTalk];
    if (said) {
      sofaVariant.current = said;
      postFrame({ type: 'mycrib:sofa', variant: said });
    }
    const mood = silijeMood.current;
    const next = figTalk + 1;
    const cid = activeId ?? uid('c');
    update((d) => {
      const c = ensureChat(d, roomId, 'Beige on beige?', cid);
      c.messages.push({ id: uid('m'), role: 'user', text: mine, createdAt: Date.now() });
      c.updatedAt = Date.now();
    });
    setDraft('');
    setFigTalk(null);
    const final = FIG_FINALS[next];
    // the finished room in 360° (Silje 19.11)
    const reveal = FIG_REVEALS[next];
    setTriedSwatch(false);
    // the finished room (Synne 18.11): the chat folds away, the room is «made», and then the fig says its line
    setSheet(final || reveal ? 'closed' : 'open');
    setThinking(true);
    if (final || reveal) {
      setNatureView(null);
      setFinalLook(null);
    }
    if (final) setMakeover(final);
    // the pimped room in 360° is «made» like an AI image (Synne 19.11): it shows at once, blurred and pale, and sharpens
    // over a few seconds with a small label; Fig says its line when it is done
    if (reveal) {
      sofaVariant.current = reveal;
      postFrame({ type: 'mycrib:sofa', variant: reveal });
      setRevealGen(true);
      window.clearTimeout(revealTimer.current);
      revealTimer.current = window.setTimeout(() => setRevealGen(false), NATURE_GEN_MS);
    }
    window.setTimeout(() => {
      if (final) {
        setMakeover(null);
        setFinalLook(final.to);
      }
      const last = next === FIG_SCRIPT.length - 1;
      update((d) => {
        const c = ensureChat(d, roomId, 'Beige on beige?', cid);
        c.messages.push({ id: uid('m'), role: 'ai', text: FIG_SCRIPT[next], mood, swatches: FIG_SWATCH_LINES[next], createdAt: Date.now() });
        c.updatedAt = Date.now();
      });
      setThinking(false);
      // a line that shows the room in new colours, e.g. the olive walls (Silje 17.11)
      const view = FIG_VIEWS[next];
      if (view) {
        sofaVariant.current = view;
        postFrame({ type: 'mycrib:sofa', variant: view });
      }
      // after the colour dots the next line waits until the field is tapped, so all the colours can be tried first
      setFigTalk(last ? null : next + 1);
      // the stand (Synne 18.11): when Silje's talk is over, Fig opens the next doors – does a table fit, or nature
      if (last && STAND) {
        // time to read the line about the finished room before the doors come (Synne 18.11)
        // the story is done: the «task done» popup offers what's next (Synne 19.11) – Fig's doors in the chat are off
        // Silje 18.11 also turned the doors line off (SHOW_DOORS_LINE)
        if (SHOW_DOORS_IN_CHAT && SHOW_DOORS_LINE) {
          window.setTimeout(() => setThinking(true), 3800);
          window.setTimeout(() => {
            update((d) => {
              const c = ensureChat(d, roomId, 'Beige on beige?', cid);
              c.messages.push({ id: uid('m'), role: 'ai', ...DOORS_LINE(nextOptions(doneMoments).filter((x) => x !== START_OVER)), createdAt: Date.now() });
              c.updatedAt = Date.now();
            });
            setThinking(false);
          }, 5200);
        }
        setDoneMoments([...new Set([...doneMoments, MAIN_STORY.id])]);
      }
      // …and sometimes the fig has one more thing to say, a moment later
      const more = FIG_FOLLOW_UPS[next];
      if (more) {
        window.setTimeout(() => setThinking(true), 500);
        window.setTimeout(() => {
          update((d) => {
            const c = ensureChat(d, roomId, 'Beige on beige?', cid);
            c.messages.push({ id: uid('m'), role: 'ai', text: more, mood, createdAt: Date.now() });
            c.updatedAt = Date.now();
          });
          setThinking(false);
        }, 1700);
      }
    }, final ? MAKEOVER_MS : reveal ? NATURE_GEN_MS : 1400);
  };

  /** `ask`: an answer button under the expert's answer was tapped; it is sent as the user's message (Rathi 11.11) */
  // «Make my kitchen like this» with a photo from Explore: the AI «builds» the room from the photo, like an image being
  // generated in ChatGPT, and the room photo becomes the new kitchen (Synne 14.11). The old photo stays one swipe away.
  const [makeover, setMakeover] = useState<null | { from: string; to: string }>(null);
  // the finished room from the fig's talk, shown over the room until undo (Synne 18.11)
  const [finalLook, setFinalLook] = useState<string | null>(null);
  // the finished room is the cover while it shows; undone, the cover goes back to the 360° view's look (Synne 19.11)
  const coverSeen = useRef(false);
  useEffect(() => {
    if (!coverSeen.current) {
      coverSeen.current = true;
      if (!finalLook) return;
    }
    setLivingCover(finalLook ?? LIVING_COVER(sofaVariant.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalLook]);
  const [finalRedo, setFinalRedo] = useState<string | null>(null);
  const photoRoom = mode === 'real' && !hasPanorama(room) && room.photos.length > 0;
  // rooms made over before 14.11 had the new photo first: put it after the old one (old 1/2, new 2/2)
  useEffect(() => {
    const made = Object.values(MAKEOVERS);
    const ps = room.photos;
    const reordered = [...ps.filter((x) => !made.includes(x)), ...ps.filter((x) => made.includes(x))];
    if (reordered.join() !== ps.join())
      update((d) => {
        getRoom(d, roomId).photos = reordered;
      });
  }, [room.photos.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const startMakeover = (text: string, pin: Pin, to: string) => {
    const cid = activeId ?? uid('c');
    const from = room.photos[0];
    update((d) => {
      const c = ensureChat(d, roomId, text, cid);
      c.messages.push({ id: uid('m'), role: 'user', text, inspirations: [pin.title], createdAt: Date.now() });
      c.updatedAt = Date.now();
    });
    setDraft('');
    setInspirations([]);
    setSheet((x) => (x === 'full' ? x : 'closed'));
    inputRef.current?.blur();
    setPeek(null);
    setThinking(true);
    setMakeover({ from, to });
    window.setTimeout(() => {
      update((d) => {
        const r = getRoom(d, roomId);
        // the new room is added after the old one: the old stays 1/2, the new is 2/2 and is shown (Synne 14.11)
        r.photos = [...r.photos.filter((x) => x !== to), to];
        r.image = to;
        r.updatedAt = Date.now();
        const c = d.chats.find((x) => x.id === cid);
        c?.messages.push({
          id: uid('m'),
          role: 'ai',
          text: `Here is your ${room.name.toLowerCase()} like «${pin.title}»: deep olive fronts, dark stone and warm, low light. Swipe back for the old one.`,
          createdAt: Date.now(),
        });
      });
      setMakeover(null);
      setThinking(false);
    }, MAKEOVER_MS);
  };

  /** Fig's guided talk (Synne 17.11): the user's choice goes into the chat, Fig thinks a moment and answers with its
   *  next scripted line (and face). `then` runs when the answer is there. */
  const figSay = (userText: string, line0: ReturnType<typeof figColour>, then?: () => void, delay = 900) => {
    // at the stand, a finished step ends with the moments not tried yet (or the closing line)
    const line = STAND && line0.guide === 'done' ? (nextOptions(doneMoments)[0] === START_OVER ? { ...line0, text: `${line0.text} ${ALL_DONE.text}`, options: ALL_DONE.options } : { ...line0, options: nextOptions(doneMoments) }) : line0;
    const cid = activeId ?? uid('c');
    update((d) => {
      const c = ensureChat(d, roomId, 'Fig', cid);
      c.messages.push({ id: uid('m'), role: 'user', text: userText, createdAt: Date.now() });
      c.updatedAt = Date.now();
    });
    setThinking(true);
    window.setTimeout(() => {
      update((d) => {
        const c = d.chats.find((x) => x.id === cid);
        c?.messages.push({ id: uid('m'), role: 'ai', ...line, createdAt: Date.now() });
        if (c) c.updatedAt = Date.now();
      });
      setThinking(false);
      then?.();
    }, delay);
  };
  const lastFig = chat?.messages[chat.messages.length - 1];
  /** a button under Fig's last line: answered from the script instead of the AI */
  const figAnswer = (ask: string) => {
    if (!lastFig || lastFig.role !== 'ai' || !lastFig.guide || thinking) return false;
    const line = figReply(lastFig.guide, ask);
    if (!line) return false;
    figSay(ask, line);
    return true;
  };
  /** Fig's face: what it last said in this chat; Silje's talk (no face set) starts puzzled */
  const figMood: FigMood = [...(chat?.messages ?? [])].reverse().find((m) => m.role === 'ai' && m.mood)?.mood ?? 'puzzled';

  // ---- the stand (Synne 17.11): Fig leads through three moments ----
  const [doneMoments, setDoneMoments0] = useState<string[]>(state.standDone ?? []);
  // the trips tried are kept in the app too, so Home can tick them off (Synne 18.11)
  const setDoneMoments = (done: string[]) => {
    setDoneMoments0(done);
    update((d) => {
      d.standDone = done;
    });
  };
  // «Får et sofabord plass?» was tapped: + and its two ways to add a table show the way until a table is in (Synne 18.11)
  const [tableHint, setTableHint] = useState(false);
  // the table is in the chat field, waiting for a prompt (Synne 19.11)
  const [tableAsk, setTableAsk] = useState(false);
  const TABLE_PROMPT = 'Får dette bordet plass foran sofaen?';
  // «La naturen bestemme»: the wand glows until it is opened, then send glows once a photo is picked (Synne 19.11)
  const [natureHint, setNatureHint] = useState(false);
  // the room in colours from nature is being «made» (Synne 19.11)
  const [natureGen, setNatureGen] = useState(false);
  // the pimped room being «made» (Synne 19.11)
  const [revealGen, setRevealGen] = useState(false);
  const revealTimer = useRef<number>();
  const natureGenTimer = useRef<number>();
  // the next step is offered by the «task done» popup now (Synne 19.11), not as buttons in the chat
  nextOptionsRef.current = () => [];
  const resetTaps = useRef<number[]>([]);
  const tapToReset = () => {
    const now = Date.now();
    resetTaps.current = [...resetTaps.current.filter((t) => now - t < 900), now];
    if (resetTaps.current.length >= 3) resetStand();
  };
  /** a moment, from a button under Fig's line or a suggestion above the field */
  /** `quick`: a task started from the task list – Fig's line shows at once, with no «thinking» first (Synne 19.11) */
  const figMoment = (m: string, quick = false) => {
    if (thinking) return false;
    if (m === START_OVER) {
      resetStand();
      return true;
    }
    if (!(MOMENTS as readonly string[]).includes(m)) return false;
    // a trip is ticked off when it is done, not when it is picked (Synne 19.11)
    setNatureView(null); // back to the room itself
    setFinalLook(null);
    // moodboards and Explore, or a room of your own: on Home, where the way glows (Synne 18.11)
    if (m === MOMENTS[2] || m === MOMENTS[3]) {
      update((d) => {
        d.standTrip = m === MOMENTS[2] ? 'boards' : 'room';
      });
      navigate('/');
      return true;
    }
    if (m === MOMENTS[0]) {
      // the visitor adds the table themselves (Synne 18.11): + glows, then «Scan item» and «Camera roll»
      setTableHint(true);
      // the table goes into the living room with the dusty rose sofa, as it was in the sofa story (Synne 19.11)
      setMode('real');
      sofaVariant.current = TABLE_ROOM_VIEW;
      postFrame({ type: 'mycrib:sofa', variant: TABLE_ROOM_VIEW });
      figSay(m, TABLE_HINT, () => setSheet('closed'), quick ? 0 : 900);
    } else {
      setNatureHint(true);
      figSay(m, NATURE_LINE, () => setSheet('closed'), quick ? 0 : 900);
    }
    return true;
  };

  // a trip picked on Home's overview card starts when the living room opens (Synne 18.11) – and also when it is picked
  // while the living room is already open (Synne 19.11: «Får et sofabord plass?» from the task overview in the room did
  // nothing, since this only ran when the room opened). If Fig is busy saying something, it tries again a moment later.
  const askTimer = useRef<number | null>(null);
  const askRef = useRef<(ask: string, tries: number) => void>(() => {});
  askRef.current = (ask, tries) => {
    if (figMoment(ask, true) || tries <= 0) return;
    askTimer.current = window.setTimeout(() => askRef.current(ask, tries - 1), 500);
  };
  useEffect(() => {
    const ask = state.standAsk;
    if (!STAND || !ask) return;
    update((d) => {
      d.standAsk = undefined;
    });
    if (askTimer.current) window.clearTimeout(askTimer.current);
    // straight away, not after a pause: the 360° view loading in the same page could hold a timer back for seconds
    askRef.current(ask, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.standAsk]);
  useEffect(() => () => {
    if (askTimer.current) window.clearTimeout(askTimer.current);
  }, []);

  /** the stand: the table in the field is sent with the prompt – it goes into the room, and Fig answers (Synne 19.11) */
  const placeStandTable = (a: Attachment, text: string) => {
    const newId = uid('f');
    const done = [...new Set([...doneMoments, MOMENTS[0]])];
    keepSelection.current = true;
    setSelectedId(newId);
    setTableAsk(false);
    setAttachment(null);
    setDraft('');
    inputRef.current?.blur();
    setSheet('closed');
    update((d) => {
      const c = chatForItem(d, roomId, a).chat;
      c.messages.push({ id: uid('m'), role: 'user', text, attachment: a, createdAt: Date.now() });
    });
    setThinking(true);
    window.setTimeout(() => {
      update((d) => {
        const r = getRoom(d, roomId);
        rememberScan(r, a);
        placeScanned(r, a, newId);
        const c = chatForItem(d, roomId, a).chat;
        c.messages.push({ id: uid('m'), role: 'ai', ...TABLE_PLACED(a.name, []), createdAt: Date.now() });
      });
      setThinking(false);
      setDoneMoments(done);
    }, 1400);
  };

  // ---- the stand's room task (Synne 19.11): in the room you made, look around in 360°, then 3D and the floor plan ----
  const ownRoom = STAND && roomId === state.standRoom && !doneMoments.includes(MOMENTS[3]);
  const [seenModes, setSeenModes] = useState<ViewMode[]>([]);
  const ROOM_VIEWS: ViewMode[] = ['real', '3d', '2d'];
  const ROOM_DONE_VIEWS: ViewMode[] = ['3d', '2d'];
  // when 3D and the floor plan are seen, a tap in the field asks Fig about the room, and Fig answers (Silje 20.11)
  // a short talk (Silje 20.11): the task is done after the first answer, the rest can be gone through if one wants
  const [roomStep, setRoomStep] = useState<number | null>(null);
  const roomAsk = roomStep !== null;
  const ROOM_NUDGE = 'Bra! Trykk i feltet nederst og spør meg hva jeg synes om rommet.';
  const ROOM_TALK = [
    { me: 'Hva synes du om rommet mitt, Fig?', fig: 'Fin start! Det er god plass her, og vinduet gir fint lys. Vil du ha et tips?' },
    { me: 'Ja, gjerne!', fig: 'Prøv tryllestaven nede til venstre og hent farger fra naturen, eller legg til et møbel med +.' },
    { me: 'Hvilke farger passer i rommet?', fig: 'Lyse, varme vegger gjør rommet luftig, og litt grønt fra planter gir liv.' },
    { me: 'Takk, Fig!', fig: 'Bare hyggelig! Jeg er her når du vil pynte videre.' },
  ];
  const nextMode = ownRoom ? ROOM_VIEWS.find((m) => m !== mode && !seenModes.includes(m)) : undefined;
  // Fig says what to try, once, when the new room opens
  useEffect(() => {
    if (!ownRoom) return;
    const t = window.setTimeout(() => {
      update((d) => {
        d.activeChat[roomId] = null;
        const c = ensureChat(d, roomId, 'Fig', uid('c'));
        c.messages.push({ id: uid('m'), role: 'ai', text: 'Her er rommet ditt! Dra i bildet for å se deg rundt, og prøv 3D og plantegningen i menyen oppe til venstre.', mood: 'happy', createdAt: Date.now() });
      });
    }, 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // a view counts as seen as soon as it is opened; with 3D and the floor plan opened once each, the task is done
  // (Synne 19.11: was all three views, each for a few seconds)
  useEffect(() => {
    if (!ownRoom || seenModes.includes(mode)) return;
    const seen = [...seenModes, mode];
    setSeenModes(seen);
    // the last step of the task is asking Fig about the room (Silje 20.11): Fig says so, the task is done when it answers
    if (ROOM_DONE_VIEWS.every((m) => seen.includes(m)) && !roomAsk) {
      setRoomStep(0);
      // back to 360°, where the talk is (Silje 20.11), then Fig says what to do
      window.setTimeout(() => setMode('real'), 1200);
      window.setTimeout(() => {
        update((d) => {
          const c = ensureChat(d, roomId, 'Fig', d.activeChat[roomId] ?? uid('c'));
          c.messages.push({ id: uid('m'), role: 'ai', text: ROOM_NUDGE, mood: 'happy', createdAt: Date.now() });
          c.updatedAt = Date.now();
        });
      }, 1800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ownRoom, seenModes.join()]);

  const send = (ask?: string) => {
    if (STAND && !ask && tableAsk && attachment && attachment.kind === 'coffeetable') {
      placeStandTable(attachment, draft.trim() || TABLE_PROMPT);
      return;
    }
    // the question about a room of your own: Fig answers from the script (Silje 20.11)
    if (STAND && !ask && roomStep !== null && draft.trim() === ROOM_TALK[roomStep].me) {
      const step = roomStep;
      setRoomStep(step + 1 < ROOM_TALK.length ? step + 1 : null);
      setDraft('');
      setSheet('open');
      // one line and one answer finish the task; the talk can go on after it
      figSay(ROOM_TALK[step].me, { text: ROOM_TALK[step].fig, mood: 'happy' }, step === 0 ? () => setDoneMoments([...new Set([...doneMoments, MOMENTS[3]])]) : undefined);
      return;
    }
    if (STAND && ask && figMoment(ask)) return;
    // a nature photo named under Fig's line: straight into the room in those colours
    if (STAND && ask && lastFig?.guide === 'nature' && NATURE_NAMES.includes(ask)) {
      sendNature(ask, NATURE_OPTIONS[ask]);
      return;
    }
    if (ask && figAnswer(ask)) return;
    if (figTalk !== null && !ask) {
      sendFigLine();
      return;
    }
    const text = (ask ?? draft).trim();
    const att = ask ? null : attachment;
    const pins = ask ? [] : inspirations;
    const ctx = ask ? null : chatItem;
    const look = pins.find((p) => MAKEOVERS[p.id]);
    if (!ask && look && photoRoom && !thinking) {
      startMakeover(text || `Make my ${room.name.toLowerCase()} like this`, look, MAKEOVERS[look.id]);
      return;
    }
    if (natureId && !ask) {
      sendNature(text, natureId);
      return;
    }
    if (thinking || (!text && !att && pins.length === 0)) return;
    if (mode === 'real' && !useMine && !room.unmeasured && !att && pins.length === 0 && (panoSelected || /chair|stol/i.test(text))) {
      sendPano(text);
      return;
    }
    const cid = activeId ?? uid('c');
    // the scripted AI reads the user's text plus the hidden prompts behind the attached images
    const prompt = [text, ...pins.map((p) => p.prompt)].filter(Boolean).join('. ');
    update((d) => {
      const c = ensureChat(d, roomId, text || att?.name || pins[0]?.title || 'New chat', cid);
      c.messages.push({
        id: uid('m'),
        role: 'user',
        text,
        attachment: att ?? undefined,
        inspirations: pins.length ? pins.map((p) => p.title) : undefined,
        contextItem: ctx?.name,
        createdAt: Date.now(),
      });
      c.updatedAt = Date.now();
      if (att) rememberScan(getRoom(d, roomId), att);
    });
    if (!ask) {
      setDraft('');
      setMentionOff(null);
      setAttachment(null);
      setInspirations([]);
    }
    // after sending, the chat folds back to the field – it only opens when the user asks (Synne 13.11); the answer shows as a short note
    setSheet((s) => (s === 'full' ? s : 'closed'));
    setFocus('chat');
    setThinking(true);
    sendingRef.current = true;
    inputRef.current?.blur();
    // Claude answers questions and what the scripted AI doesn't understand – only where Claude is available
    // (inside a claude.ai artifact). Changes to the room are always made by ai.ts. (Rathi 11.11)
    const expert = expertReady() && !att && isQuestion(prompt) && !wantsTableIdeas(prompt);
    window.setTimeout(() => {
      const now = stateRef.current;
      const c0 = now.chats.find((x) => x.id === cid);
      // answer only once per user message
      if (!c0 || c0.messages[c0.messages.length - 1]?.role !== 'user') {
        sendingRef.current = false;
        setThinking(false);
        return;
      }
      // does the scripted AI change the room? (tried on a copy, so nothing changes yet) If it doesn't, Claude answers,
      // so the chat has one voice; ai.ts only makes changes and puts in the suggested tables (Rathi 11.11)
      const useExpert =
        expert ||
        (expertReady() &&
          !att &&
          !wantsTableIdeas(prompt) &&
          (() => {
            const copy = structuredClone(now);
            const room0 = JSON.stringify(copy.rooms.find((r) => r.id === roomId)?.furniture);
            const res = runAI(copy, roomId, cid, prompt, undefined, ctx?.id);
            return !!res.unhandled || JSON.stringify(copy.rooms.find((r) => r.id === roomId)?.furniture) === room0;
          })());
      if (!useExpert) {
        update((d) => {
          const c = d.chats.find((x) => x.id === cid);
          if (c && c.messages[c.messages.length - 1]?.role === 'user') runAI(d, roomId, cid, prompt, att ?? undefined, ctx?.id);
        });
        sendingRef.current = false;
        setThinking(false);
        return;
      }
      const mid = uid('m');
      // the answer options in [brackets] become buttons; while the answer streams they are kept out of the text
      const show = (raw: string, tier?: string, done = false) =>
        update((d) => {
          const c = d.chats.find((x) => x.id === cid);
          if (!c) return;
          const { text, options } = splitOptions(raw);
          let m = c.messages.find((x) => x.id === mid);
          if (!m) {
            m = { id: mid, role: 'ai', text, createdAt: Date.now() };
            c.messages.push(m);
          }
          m.text = text;
          m.by = { prompt: PROMPT_VERSION, tier };
          if (done && options.length) m.options = options;
          c.updatedAt = Date.now();
        });
      const input = expertInput(now, roomId, cid, ctx?.id);
      askExpert(input, (text) => {
        setThinking(false);
        show(text);
      })
        .then(({ text, tier }) => {
          show(text, tier, true);
          logExpert({ input, answer: text, tier, chat: c0.title });
        })
        .catch((e: { text?: string; code?: string }) => {
          logExpert({ input, answer: e?.text ?? '', chat: c0.title, error: e?.code ?? 'error' });
          // keep what Claude had written; with nothing written, the scripted AI answers as before
          if (e?.text && e.code !== 'refused') show(e.text, undefined, true);
          else
            update((d) => {
              const c = d.chats.find((x) => x.id === cid);
              if (c && c.messages[c.messages.length - 1]?.role === 'user') runAI(d, roomId, cid, prompt, undefined, ctx?.id);
            });
        })
        .finally(() => {
          sendingRef.current = false;
          setThinking(false);
        });
    }, expert ? 300 : 1100 + Math.random() * 700);
  };

  /** A nature photo in the chat: straight to the room in that palette – for the coast, the 360° panorama (Synne 07.11).
   *  No answer in the chat and no sheet in between.
   *  (Chats from before 07.11 still show the palette and «Show it in my room» under the AI's answer.) */
  const sendNature = (_text: string, paletteId: string) => {
    const p = naturePalette(paletteId);
    if (thinking || !p) return;
    setNatureHint(false);
    const doneNow = STAND && !doneMoments.includes(MOMENTS[1]) ? [...doneMoments, MOMENTS[1]] : doneMoments;
    if (doneNow !== doneMoments) setDoneMoments(doneNow);
    // the photo and the text also go into the chat, so the user can find them later (Synne 13.11)
    const text = _text || `Make my ${room.name.toLowerCase()} with inspiration from these colors`;
    const cid = activeId ?? uid('c');
    update((d) => {
      const c = ensureChat(d, roomId, text, cid);
      const now = Date.now();
      c.messages.push({ id: uid('m'), role: 'user', text, nature: p.id, createdAt: now });
      c.updatedAt = now;
    });
    // the room is «made» first – blurred, sharpening, like an AI image (Synne 19.11) – then Fig says it is there
    setNatureGen(true);
    window.setTimeout(() => setNatureGen(false), NATURE_GEN_MS);
    window.setTimeout(() => update((d) => {
      const c = ensureChat(d, roomId, text, cid);
      const now = Date.now();
      // at the stand Fig is pleased and offers what's next (Synne 17.11)
      const next = STAND ? nextOptions(doneNow) : undefined;
      const allDone = next?.[0] === START_OVER;
      c.messages.push({
        id: uid('m'),
        role: 'ai',
        text: STAND
          ? `Her er stua i farger fra ${(Object.keys(NATURE_OPTIONS).find((k) => NATURE_OPTIONS[k] === p.id) ?? (p.id === 'amethyst' ? 'ametyst' : p.name)).toLowerCase()}.${allDone && false ? ` ${ALL_DONE.text}` : ''}`
          : `Here is your ${room.name.toLowerCase()} in colours from ${p.name.toLowerCase()}.`,
        mood: STAND ? 'happier' : undefined,
        options: undefined,
        guide: STAND ? 'stand' : undefined,
        createdAt: now + 1,
      });
      c.updatedAt = now;
    }), NATURE_GEN_MS);
    setDraft('');
    setNatureId(null);
    inputRef.current?.blur();
    setOverlay(null);
    setMode('real');
    setSheet('closed');
    setFinalLook(null); // the colours from nature are shown on the room, not on the finished photo
    setNatureView({ paletteId: p.id, step: firstStep(p) });
  };

  /** A nature photo from the row: the room in that palette at once, no text in the field, no message to send and no
   *  line from Fig (Silje 18.11) */
  const showNature = (p: NaturePalette) => {
    setNatureRedo(null);
    setMode('real');
    setFinalLook(null);
    setNatureHint(false);
    // …«made» like an AI image: blurred, sharpening, with a small label (Synne 19.11)
    setNatureGen(true);
    window.clearTimeout(natureGenTimer.current);
    natureGenTimer.current = window.setTimeout(() => setNatureGen(false), NATURE_GEN_MS);
    // the stand: «La naturen bestemme» is done
    if (STAND && !doneMoments.includes(MOMENTS[1])) setDoneMoments([...doneMoments, MOMENTS[1]]);
    setNatureView({ paletteId: p.id, step: firstStep(p) });
  };

  /** Scripted answers for the chair in the 360° view (ported from Furnie's chatPano). */
  const panoReply = (t: string): string => {
    if (!panoChair.on) return 'There is no chair in the photo right now.';
    const y = (panoCamera.current.yaw * Math.PI) / 180;
    const fwd = { x: Math.sin(y), z: -Math.cos(y) };
    const right = { x: Math.cos(y), z: Math.sin(y) };
    const move = (dx: number, dz: number) => setPanoChair((c) => ({ ...c, ...clampChair(c.x + dx, c.z + dz) }));
    if (/remove|delete|take away|fjern|slett/.test(t)) {
      setPanoChair((c) => ({ ...c, on: false }));
      setPanoSelected(false);
      return 'Removed the chair from the photo.';
    }
    if (/rotate|turn|flip|roter|snu/.test(t)) {
      setPanoChair((c) => ({ ...c, flip: !c.flip }));
      return 'The chair is mirrored. In the photo it is a single picture, so it can’t turn freely – switch to 3D or 2D to rotate it exactly.';
    }
    if (/window|vindu/.test(t)) {
      setPanoChair((c) => ({ ...c, ...clampChair(fwd.x * 300, fwd.z * 300) }));
      return 'Placed the chair by the windows in the direction you’re looking.';
    }
    if (/left|venstre/.test(t)) return move(-right.x * 40, -right.z * 40), 'Moved the chair 40 cm to the left.';
    if (/right|høyre/.test(t)) return move(right.x * 40, right.z * 40), 'Moved the chair 40 cm to the right.';
    if (/closer|forward|towards me|nærmere|fram/.test(t)) return move(-fwd.x * 40, -fwd.z * 40), 'Moved the chair 40 cm closer.';
    if (/back|away|further|bak|lenger/.test(t)) return move(fwd.x * 40, fwd.z * 40), 'Moved the chair 40 cm further away.';
    return 'In the photo I can only move, turn or remove the test chair. Try «move the chair to the left» – or switch to 3D for the other furniture.';
  };

  const sendPano = (text: string) => {
    const cid = activeId ?? uid('c');
    update((d) => {
      const c = ensureChat(d, roomId, text, cid);
      c.messages.push({ id: uid('m'), role: 'user', text, contextItem: panoSelected ? 'Chair' : undefined, createdAt: Date.now() });
      c.updatedAt = Date.now();
    });
    setDraft('');
    // a full chat stays full when you send
    // after sending, the chat folds back to the field – it only opens when the user asks (Synne 13.11); the answer shows as a short note
    setSheet((s) => (s === 'full' ? s : 'closed'));
    setThinking(true);
    sendingRef.current = true;
    inputRef.current?.blur();
    window.setTimeout(() => {
      const answer = panoReply(text.toLowerCase());
      update((d) => {
        const c = d.chats.find((x) => x.id === cid);
        if (c) {
          c.messages.push({ id: uid('m'), role: 'ai', text: answer, createdAt: Date.now() });
          c.updatedAt = Date.now();
        }
      });
      sendingRef.current = false;
      setThinking(false);
    }, 900);
  };

  /** Dragging furniture changes the room right away */
  /** looking at an older version and changing something: carry on from that version (what you had is kept) */
  const continueIfOld = () => {
    if (!viewing) return;
    const id = viewing.id;
    update((d) => continueFrom(d, roomId, id));
    setVersionIx(0);
    setSlideDir('');
  };
  const applyEdit = (f: Furniture, label: string) => {
    continueIfOld();
    update((d) => {
      const r = getRoom(d, roomId);
      pushUndo(r, r.furniture, label);
      setRoomItem(r, clampToRoom(r, f));
      const c = chat && d.chats.find((x) => x.id === chat.id);
      if (c) {
        c.lastTargetId = f.id;
        c.highlightId = f.id;
      }
    });
  };
  latest.current.applyEdit = applyEdit;


  const pickChat = (id: string | null) => {
    update((d) => {
      d.activeChat[roomId] = id;
    });
    setOverlay(null);
  };

  /** One-tap swap from the tray (or the camera roll). Only speaks up if something gets tight. */
  const swapSelected = (a: Attachment) => {
    if (!selected) return;
    const next = clampToRoom(room, { ...selected, name: a.name, kind: a.kind, width: a.width, depth: a.depth, height: a.height, color: a.color, colorName: a.colorName, product: a.product, photo: a.photo });
    const note = observation(room, items.map((f) => (f.id === next.id ? next : f)), next).trim();
    update((d) => {
      swapItem(getRoom(d, roomId), selected.id, a);
    });
    if (note) showToast(note);
  };

  const trayOpen = !!selected && focus === 'tray' && !thinking;
  const lastUndo = room.undo?.[0];
  const nextRedo = room.redo?.[0];
  const redo = () => {
    update((d) => {
      redoLast(getRoom(d, roomId));
    });
    showToast(`Redone: ${nextRedo?.label.toLowerCase() ?? 'last change'}`);
  };
  // a version is kept automatically when something new comes in or is swapped – not when furniture is only moved
  // (Synne 13.11). Moving is saved with «Save this version» in the versions panel.
  const contentSig = (fs: Furniture[]) => JSON.stringify(fs.map((f) => [f.id, f.name, f.kind, f.color]).sort());
  const prevFurniture = useRef(room.furniture);
  // how the room looked just before the last change (Synne 19.11): a version shows its own photo
  const prevLook = useRef<{ image?: string; sofaView?: string }>({ image: room.image, sofaView: room.sofaView });
  useEffect(() => {
    const before = prevFurniture.current;
    prevFurniture.current = room.furniture;
    if (viewing || contentSig(before) === contentSig(room.furniture)) return;
    const look = prevLook.current;
    update((d) => keepVersion(d, roomId, before, false, look));
    // the user sees that a version was made: a short note, and a dot on the clock until they look (Synne 14.11)
    // (not at the stand: the clock is hidden there, Synne 17.11)
    if (SHOW_VERSION_TOAST && !STAND_LOCK_ROOM) showToast(`Version ${versions.length + 1} saved – find it under the clock`);
    setNewVersion(true);
  }, [room.furniture]); // eslint-disable-line react-hooks/exhaustive-deps
  // a new sofa colour, rug or walls in the room (Fig's talk) is a version too, with the photo of how it looked before
  useEffect(() => {
    const look = prevLook.current;
    prevLook.current = { image: room.image, sofaView: room.sofaView };
    if (viewing || (look.sofaView ?? '') === (room.sofaView ?? '')) return;
    update((d) => keepVersion(d, roomId, room.furniture, false, look));
    setNewVersion(true);
  }, [room.sofaView]); // eslint-disable-line react-hooks/exhaustive-deps
  // the room's look follows its photo (the furniture effect above runs first and reads the look before the change)
  useEffect(() => {
    if ((prevLook.current.sofaView ?? '') === (room.sofaView ?? '')) prevLook.current = { image: room.image, sofaView: room.sofaView };
  }, [room.image]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveNow = () => {
    update((d) => keepVersion(d, roomId, room.furniture, true));
    showToast(`Saved as version ${versions.length + 1}`);
  };
  // the AI's answer as a short note above the chat field, instead of opening the chat (Synne 13.11)
  const [peek, setPeek] = useState<string | null>(null);
  const [peekOut, setPeekOut] = useState(false);
  // the chat is open: the note it summed up is no longer needed
  useEffect(() => {
    if (sheet !== 'closed') setPeek(null);
  }, [sheet]);
  const lastMsg = chat?.messages[chat.messages.length - 1];
  const seenMsg = useRef(lastMsg?.id);
  useEffect(() => {
    if (!lastMsg || lastMsg.id === seenMsg.current) return;
    seenMsg.current = lastMsg.id;
    if (lastMsg.role !== 'ai' || sheet !== 'closed') return;
    setPeek(lastMsg.text);
    setPeekOut(false);
    // it slides softly away instead of vanishing (Synne 17.11: «veldig harde overganger»)
    const t = window.setTimeout(() => setPeekOut(true), 7000);
    const t2 = window.setTimeout(() => {
      setPeek(null);
      setPeekOut(false);
    }, 7350);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [lastMsg?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const undo = () => {
    update((d) => {
      undoLast(getRoom(d, roomId));
    });
    showToast(`Undone: ${lastUndo?.label.toLowerCase() ?? 'last change'}`);
  };

  // undo also takes the room back from the colours from nature, and redo brings them back (Synne 18.11: the
  // «Fig · Statement ✕» pill was in the way – «det er kanskje nok å bare trykke angre»)
  const [natureRedo, setNatureRedo] = useState<typeof natureView>(null);
  const undoAny = () => {
    if (finalLook) {
      setFinalRedo(finalLook);
      setFinalLook(null);
      return;
    }
    if (natureView) {
      setNatureRedo(natureView);
      setNatureView(null);
      setOverlay(null);
      return;
    }
    undo();
  };
  const redoAny = () => {
    if (!finalLook && finalRedo) {
      setFinalLook(finalRedo);
      setFinalRedo(null);
      return;
    }
    if (!natureView && natureRedo) {
      setNatureView(natureRedo);
      setNatureRedo(null);
      return;
    }
    redo();
  };

  const dismissHint = () =>
    update((d) => {
      d.hintSeen = true;
    });

  const deselect = () => {
    setSelectedId(null);
    setFocus('chat');
  };

  // the real 3D scan (Synne 20.10, «3D scan - stue») shows in 3D for the living room and for every room that has been
  // scanned – the same scan you saw in «Does this look right?» (Synne 23.10)
  const showScan = room.id === 'r_living' || !!room.scannedAt;
  const viewProps = {
    room,
    items,
    selectedId,
    highlightId: chat?.highlightId,
    onAnchor: setAnchor,
    // tapping an item marks it: the prompt is then about it, and «Try others» appears next to it
    onSelect: (id: string | null) => {
      setSelectedId(id);
      if (!id) setFocus('chat');
      if (id && !state.hintSeen) dismissHint();
    },
    onMove: (id: string, x: number, y: number) => {
      const f = items.find((i) => i.id === id);
      if (f) applyEdit({ ...f, x, y }, `Moved: ${f.name}`);
    },
  };

  const openVersion = overlay?.kind === 'version' ? versions.find((v) => v.id === overlay.id) : undefined;

  return (
    <div className={'screen room' + (mode === 'real' ? ' room-photo' : '')} ref={screenRef}>
      {/* Navigation/TopBar */}
      <header className={'topbar' + (overlay?.kind === 'rooms' ? ' has-menu' : '')}>
        {/* the stand (Synne 17.11): no way out of the living room; three quick taps on its name start over for the next visitor */}
        {STAND_LOCK_ROOM ? <span className="topbar-spacer" aria-hidden /> : <IconButton icon="chevron_left" label="Back to My Space" onClick={() => navigate('/')} />}
        <div className="menu-anchor topbar-title-wrap">
          {STAND_LOCK_ROOM ? (
            <button className="topbar-title is-static" aria-label={`${room.name}. Tap three times to start over.`} onClick={tapToReset}>
              <h1>{room.name}</h1>
            </button>
          ) : (
          <button className="topbar-title" aria-haspopup="menu" aria-expanded={overlay?.kind === 'rooms'} onClick={() => setOverlay({ kind: 'rooms' })}>
            <h1>{room.name}</h1>
            <Icon name="chevron_down" size={18} />
          </button>
          )}
          {overlay?.kind === 'rooms' && (
            <RoomSwitcher
              rooms={state.rooms}
              currentId={roomId}
              onClose={() => setOverlay(null)}
              onPick={(id) => {
                setOverlay(null);
                if (id !== roomId) openRoom(id);
              }}
            />
          )}
        </div>
        {STAND_LOCK_ROOM ? <span className="topbar-spacer" aria-hidden /> : SHOW_SIDE_PANEL ? (
          <IconButton icon="menu" label="Open menu: chats, versions and settings" onClick={() => setOverlay({ kind: 'panel' })} />
        ) : (
          // no side menu (Synne 19.11): the button goes straight to the room's settings
          <IconButton icon="settings" label="Room settings" onClick={() => navigate(`/room/${roomId}/settings`)} />
        )}
      </header>

      {/* Room view */}
      <div
        className="stage"
        // tapping the room (not its buttons) closes the chat to the slim pill (Synne 22.10)
        onPointerDownCapture={(e) => {
          if ((e.target as HTMLElement).closest('button, a, [role="menu"]')) return;
          setSheet('closed');
          if (sheetRef.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
        }}
      >
        <div key={versionIx} className={'stage-canvas' + (slideDir ? ' version-slide-' + slideDir : '')} hidden={!!naturePal}>
          {room.unmeasured && mode !== 'real' && <NotScannedView view={mode} onScan={() => setScanOpen(true)} onPlan={() => setShapeFlow('files')} onMeasure={() => setShapeFlow('measure')} />}
          {mode === '3d' && !showScan && !room.unmeasured && <IsoView3D {...viewProps} />}
          {mode === '2d' && !room.unmeasured && <PlanView2D {...viewProps} />}
          {mode === 'real' && !hasPanorama(room) && <PhotoPages photos={room.photos} start={Math.max(0, room.photos.indexOf(room.image ?? ''))} label={`Photos of ${room.name}. Swipe to see the next photo.`} />}
          {mode === 'real' && hasPanorama(room) && !useMine && !naturePal && (
            <PanoramaView
              label={`360° view of ${room.name}. Drag to look around.`}
              chair={panoChair}
              chairSelected={panoSelected}
              onSelectChair={setPanoSelected}
              onMoveChair={(x, z) => setPanoChair((c) => ({ ...c, x, z }))}
              cameraRef={panoCamera}
            />
          )}
        </div>
        {useMine && !naturePal && (
          <iframe
            key={mode}
            ref={frameRef}
            className={'measured-view' + (revealGen ? ' is-generating' : '')}
            src={mode === '3d' ? '/furnie/3d/index.html?embed=1' : '/furnie/360/index.html?embed=1'}
            aria-label={mode === '3d' ? `3D model of ${room.name}` : `360° view of ${room.name}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, display: 'block' }}
          />
        )}
        {mode === '3d' && showScan && !useMine && (
          // the real 3D scan of the living room (Synne 20.10); it replaces the Furnie model (public/furnie/3d.html) here.
          // It sits outside .stage-canvas: Safari sizes height:100% by that padded box.
          <ScanModelView src="/models/living-scan.glb" label={`3D scan of ${room.name}. Drag to look around.`} />
        )}

        <div className={'stage-tools' + (overlay?.kind === 'view' ? ' has-menu' : '')}>
          {naturePal && natureView && (SHOW_NATURE_X || SHOW_NATURE_PILL) ? (
            // an ✕ at the top left, always there while the room is in colours from nature, takes them away (Silje 18.11)
            !SHOW_NATURE_PILL ? (
              <IconButton
                icon="close"
                className="nature-close glass-chic"
                label="Remove the colours from nature"
                onClick={() => {
                  setOverlay(null);
                  setNatureRedo(natureView);
                  setNatureView(null);
                }}
              />
            ) : (
            // the palette version replaces the view menu: tap it for «How brave are you?», ✕ goes back to the original room
            <div className="nature-view-chip glass">
              <button className="nature-view-open" onClick={() => setOverlay({ kind: 'brave' })} aria-label={`${naturePal.name} palette, ${stepLabel(natureView.step)}. Change how brave`}>
                <Icon name="palette" size={18} />
                {naturePal.name} · {stepLabel(natureView.step)}
              </button>
              <IconButton icon="close" iconSize={18} label="Back to the original room" onClick={() => {
                setOverlay(null);
                setNatureView(null);
              }} />
            </div>
            )
          ) : (
          <div className="menu-anchor">
            <button className={'view-select glass' + (overlay?.kind === 'view' ? ' is-open' : '') + (nextMode && overlay?.kind !== 'view' ? ' stand-next' : '')} aria-haspopup="menu" aria-expanded={overlay?.kind === 'view'} onClick={() => setOverlay({ kind: 'view' })}>
              {viewLabel(mode, room)}
              <Icon name="chevron_down" size={16} />
            </button>
            {overlay?.kind === 'view' && (
              <ViewMenu
                next={nextMode}
                mode={mode}
                room={room}
                onClose={() => setOverlay(null)}
                onPick={(m) => {
                  setMode(m);
                  setOverlay(null);
                }}
              />
            )}
          </div>
          )}
          {/* only after a change, so it reads as «save this version», not «save the room» (Synne 04.11, from user tests) */}
          <div className="stage-right">
            {SHOW_SAVE_BUTTON && hasUnsavedChanges(room) && <IconButton className="stage-save" icon="save" label="Save version" variant="glass" onClick={() => setOverlay({ kind: 'save' })} />}
            {/* try nature photos here in the room, the same view as the Nature tab (Synne 11.11) */}
            {/* removed from the room (Synne 12.11): nature is tried in the Nature tab only. Kept behind a flag */}
            {SHOW_NATURE_IN_ROOM && (
              <button className="stage-nature glass" onClick={() => setNatureMode(true)}>
                <Icon name="palette" size={18} />
                Nature
              </button>
            )}
          </div>
        </div>
        {SHOW_SCAN_PILL && room.unmeasured && mode === 'real' && <ScanPill onScan={() => setScanOpen(true)} />}
        {/* the living room in a nature palette replaces the room view until the user goes back to the original */}
        {naturePal && natureView && (
          <div className={natureGen ? 'nature-gen' : 'nature-made'}>
            <NaturePreview palette={naturePal} step={natureView.step} />
          </div>
        )}
        {revealGen && (
          <span className="makeover-status nature-gen-status" role="status">
            <span className="makeover-text">{STAND ? 'Fig pimper stua di …' : 'Making your room …'}</span>
          </span>
        )}
        {natureGen && (
          <span className="makeover-status nature-gen-status" role="status">
            <span className="makeover-text">{STAND ? 'Fig lager stua i nye farger …' : 'Making your room in new colours …'}</span>
          </span>
        )}
        {makeover && <MakeoverView from={makeover.from} to={makeover.to} roomName={room.name} ms={MAKEOVER_MS} full={Object.values(FIG_FINALS).some((f) => f.to === makeover.to)} />}
        {!makeover && finalLook && (
          <div className="makeover is-final" role="img" aria-label={`${room.name}, finished`}>
            <span className="photo-page">
              <span className="makeover-frame">
                <img src={finalLook} alt="" />
              </span>
            </span>
          </div>
        )}

        {/* one-time hint, so people discover that items can be tapped and dragged */}
        {/* not at the stand: too much at once with the task done (Synne 19.11) */}
        {!STAND && !state.hintSeen && !selectedId && mode !== 'real' && !useMine && !room.unmeasured && !(mode === '3d' && showScan) && (
          <div className="coach" role="note">
            <Icon name="lightbulb" size={20} />
            <span>Tap an item to select it. Drag to move it.</span>
            <IconButton icon="close" label="Close tip" iconSize={18} onClick={dismissHint} />
          </div>
        )}

        {/* Room/FurnitureActions: next to the marked item */}
        {/* (not in 2D: «Try others» had nothing to use there – Rathi 29.10) */}
        {selected && mode !== 'real' && mode !== '2d' && !useMine && !(mode === '3d' && showScan) && !trayOpen && (
          <button
            className="furniture-actions glass"
            style={mode === '3d' && anchor ? { left: Math.min(Math.max(anchor.x, 70), 330), top: Math.max(anchor.y - 8, 60) } : undefined}
            onClick={() => setFocus('tray')}
          >
            <Icon name="swap" size={18} />
            Try others
          </button>
        )}

        {/* versions: the older one waits to the left – tap or swipe the tab, or use the arrows (Synne 13.11) */}
        {SHOW_VERSION_PILL && versions.length > 0 && (
          <VersionSwipe count={versions.length} index={versionIx} label={viewing?.label} onOlder={() => goVersion(versionIx + 1)} onNewer={() => goVersion(versionIx - 1)} onPick={goVersion} />
        )}
        {compare && <CompareView room={room} left={{ label: versionName(Math.max(...pair)), furniture: Math.max(...pair) === 0 ? room.furniture : versions[Math.max(...pair) - 1].furniture }} right={{ label: versionName(Math.min(...pair)), furniture: Math.min(...pair) === 0 ? room.furniture : versions[Math.min(...pair) - 1].furniture }} real={useMine ? (mode === '3d' ? '/furnie/3d/index.html?embed=1' : '/furnie/360/index.html?embed=1') : null} onClose={() => setCompare(false)} />}
        {/* a closed chat with a talk in it can always be opened, without waiting for the note (Synne 18.11) */}
        {/* «Show chat» is off (Synne 19.11): the handle on top of the bar opens the chat instead – behind SHOW_CHAT_PILL */}
        {SHOW_CHAT_PILL && !makeover && sheet === 'closed' && !peek && !thinking && !trayOpen && (chat?.messages.length ?? 0) > 0 && (
          <button type="button" className="chat-show glass-chic" onClick={() => setSheet('open')}>
            <Icon name="chevron_down" size={16} />
            Show chat
          </button>
        )}
        {/* the note only shows over a closed chat: open it any way (note, field, handle) and the note goes (Synne 18.11) */}
        {!makeover && sheet === 'closed' && (peek || thinking) && (
          <button className={'chat-peek glass-chic' + (peekOut ? ' is-leaving' : '') + (STAND && (lastMsg?.options?.length || lastMsg?.swatches?.length) ? ' stand-next' : '')} onClick={() => { setPeek(null); setSheet('open'); }} aria-label="Open the chat">
            <FigAvatar mood={thinking && !peek ? 'happy' : (lastMsg?.mood ?? 'happy')} size={44} className={'chat-peek-fig' + (thinking && !peek ? ' is-thinking' : '')} />
            <span>{thinking && !peek ? 'Fig is thinking …' : peek}</span>
          </button>
        )}
        {/* one thing at a time over the bar (Synne 17.11): undo/redo waits while Fig's note shows */}
        {!viewing && !(peek || thinking) && (lastUndo || nextRedo || natureView || natureRedo || finalLook || finalRedo) && (
          // undo, redo and the furniture scanned for this room, on one line (Rathi 29.10)
          <div className="stage-row">
            {(lastUndo || nextRedo || natureView || natureRedo || finalLook || finalRedo) && (
              <div className="undo-redo glass-chic" role="group" aria-label="Undo and redo">
                <IconButton icon="undo" label={finalLook ? 'Undo: the finished room' : natureView ? 'Undo: the colours from nature' : lastUndo ? `Undo: ${lastUndo.label}` : 'Nothing to undo'} disabled={!lastUndo && !natureView && !finalLook} onClick={undoAny} />
                <IconButton className="redo" icon="undo" label={!finalLook && finalRedo ? 'Redo: the finished room' : !natureView && natureRedo ? 'Redo: the colours from nature' : nextRedo ? `Redo: ${nextRedo.label}` : 'Nothing to redo'} disabled={!nextRedo && !(natureRedo && !natureView) && !(finalRedo && !finalLook)} onClick={redoAny} />
              </div>
            )}
          </div>
        )}
      </div>

      {SHOW_FIG_PEEK && figPeek && (
        <FigPeek
          leaving={figLeaving}
          mood={figMood}
          chatOpen={sheet !== 'closed'}
          onTap={() => {
            setPeek(null);
            setSheet((s) => (s === 'closed' ? 'open' : 'closed'));
          }}
        />
      )}
      {/* an invisible layer over the room while a panel is open: a tap on the room (also the 3D/360° frame) closes it */}
      {panel && <div className="panel-catcher" aria-hidden onPointerDown={() => setPanel(null)} />}
      <div onClickCapture={(e) => { if ((e.target as HTMLElement).tagName === 'TEXTAREA') typeFigLine(); }} onFocusCapture={(e) => { continueIfOld(); if ((e.target as HTMLElement).tagName === 'TEXTAREA') { setWriting(true); setPanel(null); typeFigLine(); } }} onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setWriting(false); }} className={(writing || draft ? 'is-writing ' : '') + (STAND && ((figTalk !== null && (!lastMsg?.swatches?.length || triedSwatch)) || tableAsk || roomAsk) && !draft && !thinking ? 'stand-type ' : '') + (STAND && tableHint && overlay?.kind !== 'add' ? 'stand-plus ' : '') + (STAND && natureHint && panel !== 'magic' && !natureId ? 'stand-wand ' : '') + (STAND && natureHint && natureId ? 'stand-send ' : '') + 'chat-sheet-wrap' + (sheet === 'full' && !trayOpen && (chat?.messages.length ?? 0) > 0 ? ' is-full' : '')} ref={sheetRef}>
      <ChatSheet
        chat={trayOpen ? undefined : chat}
        state={sheet}
        onState={setSheet}
        thinking={thinking}
        onReply={(t) => send(t)}
        onSwatch={(c) => {
          // Fig's guided talk (Synne 17.11, off in the full app): the colour goes into the chat and Fig reacts
          if (lastFig?.guide && !thinking) {
            const v = c.name === BEIGE.name ? null : c.variant ?? null;
            sofaVariant.current = v;
            postFrame({ type: 'mycrib:sofa', variant: v });
            if (v) setSheet('closed');
            figSay(c.name, figColour(c.name, room.challenge !== false));
            return;
          }
          // Silje's talk: the 360° view gets the photos with the sofa (or the carpet) in that colour; the chat stays open –
          // it can be closed with the fig (Silje 17.11)
          if (!c.variant) return;
          setTriedSwatch(true);
          sofaVariant.current = c.variant;
          postFrame({ type: 'mycrib:sofa', variant: c.variant });
        }}
        onAction={(a, paletteId) => {
          const p = naturePalette(paletteId);
          if (a === 'nature' && p) {
            if (natureView?.paletteId !== p.id) setNatureView({ paletteId: p.id, step: firstStep(p) });
            setMode('real');
            setSheet('closed');
            setOverlay({ kind: 'brave' });
          }
          else setScanOpen(true);
        }}
        context={
          mode === 'real' && !useMine ? (
            panoSelected && SHOW_SELECTED_CHIP_IN_CHAT ? <ContextChip name="Chair" kind="chair" onClear={() => setPanoSelected(false)} /> : boardChip
          ) : chatItem && (chatItem === selected ? SHOW_SELECTED_CHIP_IN_CHAT : SHOW_MENTION_CHIP) ? (
            <ContextChip name={chatItem.name} kind={chatItem.kind} photo={chatItem.photo} onClear={chatItem === selected ? deselect : () => setMentionOff(draft)} />
          ) : (
            boardChip
          )
        }
      >
        {trayOpen && selected && (
          <SelectionTray
            item={selected}
            library={state.library}
            onVariant={(color, colorName) => update((d) => setVariant(getRoom(d, roomId), selected.id, color, colorName))}
            onSwap={swapSelected}
            onCamera={() => pickPhoto(true)}
          />
        )}
        {/* the furniture you tapped, named in the bar, so it is clear what is chosen and what you can ask about (Synne 14.11) */}
        {SHOW_SELECTED_CHIP && !panel && !viewing && !!selected && (
          <div className="bar-selected" role="status">
            <span className="bar-selected-thumb"><FurnitureThumb item={selected} /></span>
            <span className="bar-selected-name">{selected.name}</span>
            <button type="button" className="bar-selected-x" aria-label={`Deselect ${selected.name}`} onClick={deselect}>
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
        {!panel && !viewing && !writing && !!selected && (selected.kind === 'coffeetable' || isScanned(selected)) && (offered.some(standing) || !!room.showIdeas) && (
          // suggestions live inside the bar, like versions and the nature photos (Synne 13.11)
          <div className="bar-panel bar-panel-ideas">
              <div className="scan-carousel" role="group" aria-label={`Furniture scanned for ${room.name}, and suggestions`}>
                {offered.map((a, i) => {
                  const f = standing(a);
                  const on = !!f && f.id === selectedId;
                  const idea = i >= scanned.length;
                  const what = idea && a.product ? `${a.product.store} ${a.product.model}, ${nok(a.product.price)}` : a.name;
                  const chip = (
                    <button
                      key={a.name}
                      className={'scan-chip' + (idea ? ' is-idea' : '') + (on ? ' is-selected' : '')}
                      title={idea ? `Suggested: ${what}` : undefined}
                      aria-label={f ? `${on ? 'Deselect' : 'Select'} ${what}` : `Put the ${idea ? 'suggested ' : ''}${a.name.toLowerCase()} in the room${idea ? ` (${what})` : ''}`}
                      aria-pressed={on}
                      onClick={() => {
                        // a table in the room is marked; another one takes its place in front of the sofa (Rathi 29.10)
                        if (f && on) return deselect();
                        if (!f) {
                          // another table: it takes the place in front of the sofa, its own chat opens, nothing is
                          // marked and nothing is written (no «Swapped» message – Rathi 29.10)
                          const newId = uid('f');
                          // the new table stays marked, so the suggestions stay while you try them (Synne 13.11)
                          keepSelection.current = true;
                          setSelectedId(newId);
                          update((d) => {
                            placeScanned(getRoom(d, roomId), a, newId);
                            chatForItem(d, roomId, a);
                          });
                          return;
                        }
                        setSelectedId(f.id);
                        if (useMine) postFrame({ type: 'mycrib:pick' });
                      }}
                    >
                      {a.photo ? (
                        <img src={a.photo} alt="" />
                      ) : idea ? (
                        <span className="scan-chip-thumb">
                          <FurnitureThumb item={a} />
                        </span>
                      ) : (
                        <Icon name={KIND_ICON[a.kind]} size={20} />
                      )}
                    </button>
                  );
                  // a thin line between the scanned items and the suggestions
                  return i === scanned.length && i > 0 ? (
                    <Fragment key={a.name}>
                      <span className="scan-ideas" aria-hidden />
                      {chip}
                    </Fragment>
                  ) : (
                    chip
                  );
                })}
                {canAskForTables && (
                  // the suggested tables come into the row; nothing is written in the chat, and the button goes away (Rathi 11.11)
                  <button
                    className="scan-more"
                    onClick={() =>
                      update((d) => {
                        getRoom(d, roomId).showIdeas = true;
                      })
                    }
                  >
                    <Icon name="table" size={20} />
                    More tables
                  </button>
                )}
              </div>
            </div>
        )}
        {panel && (
          <div className={'bar-panel' + (panel === 'magic' ? ' bar-panel-nature' : '')} role="group" aria-label={panel === 'add' ? 'Add' : panel === 'magic' ? 'Colours from nature' : 'Versions'}>
            {panel === 'history' && (
              <div className="version-panel">
                <VersionCarousel room={room} versions={versions} index={versionIx} onPick={(ix) => (compare ? pickCompare(ix) : goVersion(ix))} onSave={saveNow} compare={compare} pair={pair} canCompare={versions.length > 0} onCompare={startCompare} />
              </div>
            )}
            {panel === 'add' &&
              ([
                ['scan', 'scan_item', 'Scan item'],
                ['upload', 'image', 'Camera roll'],
                ['link', 'link', 'Product link'],
                ['library', 'inventory', 'My furniture'],
                ['moodboard', 'moodboard', 'Moodboard'],
              ] as const).map(([c, icon, label]) => (
                <button
                  key={c}
                  className="bar-tile"
                  onClick={() => {
                    setPanel(null);
                    if (c === 'moodboard') setOverlay({ kind: 'board' });
                    else if (c === 'library') setOverlay({ kind: 'library' });
                    else if (c === 'upload') pickPhoto(false);
                    else setOverlay({ kind: 'capture', method: c as CaptureMethod });
                  }}
                >
                  <Icon name={icon} size={22} />
                  <span>{label}</span>
                </button>
              ))}
            {/* a heading over the nature photos (Silje 17.11), over the cards in the versions' format (Synne 13.11) */}
            {panel === 'magic' && <h3 className="bar-panel-title">Colours from nature</h3>}
            {panel === 'magic' && (
              // the nature photos in the same format as the versions: a photo card with the name under it (Synne 13.11)
              <div className="version-row nature-row" role="listbox" aria-label="Colours from nature">
                {[...NATURE_PALETTES.filter((p) => p.id !== 'orchid'), AMETHYST].map((p) => (
                  <button
                    key={p.id}
                    role="option"
                    aria-selected={natureView?.paletteId === p.id}
                    className={'version-card' + (natureView?.paletteId === p.id ? ' is-on' : '')}
                    // straight into the room in these colours, and the row stays open to try the next one (Silje 18.11);
                    // tapping the chosen one again goes back to the room as it is
                    onClick={() => (natureView?.paletteId === p.id ? setNatureView(null) : showNature(p))}
                  >
                    <span className="version-card-img">
                      <img src={p.photo} alt="" />
                      <span className="version-card-label">
                        <span className="version-card-name">{p.name}</span>
                      </span>
                    </span>
                    {/* the photo's colours as a small strip under it (Synne 17.11) */}
                    <span className="nature-card-swatches nature-row-swatches" aria-hidden>
                      {p.colors.map((c) => (
                        <i key={c.name} style={{ background: c.hex }} />
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {/* a ready-made prompt once a photo from Explore is in the field (Synne 14.11) */}
        {!panel && !draft && inspirations.some((p) => MAKEOVERS[p.id]) && !thinking && (
          <div className="bar-suggest">
            <button
              type="button"
              className="bar-suggest-chip"
              onClick={() => {
                setDraft(`Make my ${room.name.toLowerCase()} like this`);
                inputRef.current?.focus();
              }}
            >
              <Icon name="wand_shine" size={14} />
              Make my {room.name.toLowerCase()} like this
            </button>
          </div>
        )}
        {/* the stand (Synne 17.11): what you can try, as suggestions above the field – the moments not tried yet */}
        {/* one thing at a time (Synne 17.11: «litt mye rot»): the next step only, and only after Fig's note has gone */}
        {STAND && STAND_CHIPS && !panel && !draft && !thinking && !peek && !trayOpen && !(selected && selected.kind === 'coffeetable') && nextOptions(doneMoments)[0] !== START_OVER && (
          <div className="bar-suggest stand-suggest" role="group" aria-label="Try next">
            {nextOptions(doneMoments).slice(0, 1).map((m) => (
              <button key={m} type="button" className="bar-suggest-chip" onClick={() => send(m)}>
                {m}
              </button>
            ))}
          </div>
        )}
        <Composer
          ref={inputRef}
          draft={draft}
          setDraft={(s) => {
            setDraft(s);
            if (trayOpen) setFocus('chat');
          }}
          attachment={attachment}
          onRemoveAttachment={() => setAttachment(null)}
          inspirations={inspirations}
          onRemoveInspiration={(id) => setInspirations((list) => list.filter((p) => p.id !== id))}
          nature={naturePalette(natureId ?? undefined) ?? null}
          onRemoveNature={() => setNatureId(null)}
          contextName={mode === 'real' && !useMine ? (panoSelected ? 'Chair' : null) : selected ? selected.name : null}
          // + opens the pop-up menu above it, as before (Synne 13.11)
          plusOpen={overlay?.kind === 'add'}
          onPlus={() => {
            setPanel(null);
            if (overlay?.kind !== 'add') letGo();
            setOverlay(overlay?.kind === 'add' ? null : { kind: 'add' });
          }}
          afterPlus={
            (!writing || !HIDE_WAND_WHILE_WRITING) && (
              <button type="button" className={'bar-btn' + (panel === 'magic' ? ' is-on' : '')} aria-label="Spice up the room with colours from nature" aria-expanded={panel === 'magic'} onClick={() => { setOverlay(null); togglePanel('magic'); }}>
                <Icon name="wand_shine" size={16} />
              </button>
            )
          }
          end={
            !writing && !STAND_LOCK_ROOM && <button type="button" className={'bar-btn' + (panel === 'history' ? ' is-on' : '') + (newVersion ? ' has-new' : '')} aria-label={newVersion ? 'Versions of the room – a new version was saved' : 'Versions of the room'} aria-expanded={panel === 'history'} onClick={() => { setOverlay(null); togglePanel('history'); }}>
              <Icon name="history" size={20} />
            </button>
          }
          onSend={() => send()}
          busy={thinking}
          showSend={writing || !!draft}
          // the scripted lines type themselves when the field is tapped: no keyboard on the phone (19.11). At the stand
          // never a keyboard in the chat, also in a room of your own (Silje 19.11) – the demo is scripted
          noKeyboard={STAND || figTalk !== null || (thinking && figPeek)}
        />
      </ChatSheet>
      </div>

      {/* the item is recognised from the first photo picked */}
      {overlay?.kind === 'photos' && (
        <FakePhotoLibrary
          // at the stand the camera roll has coffee tables only, each recognised as itself (Synne 18.11)
          photos={STAND ? STAND_TABLES.map((t) => t.photo!) : FURNITURE_PHOTOS}
          onClose={() => setOverlay(null)}
          onDone={(ps) => setOverlay({ kind: 'capture', method: 'upload', photo: ps[0], swap: overlay.swap })}
        />
      )}

      {/* Overlays */}
      {overlay?.kind === 'save' && (
        <SaveVersionSheet
          suggestion={suggestVersionName(room)}
          onClose={() => setOverlay(null)}
          onSave={(name) => {
            update((d) => saveVersion(d, roomId, name));
            setOverlay(null);
            showToast(`Saved «${name}»`);
          }}
        />
      )}
      {/* ✕ only closes the sheet: the palette version stays in the room view (Synne 07.11) */}
      {overlay?.kind === 'brave' && naturePal && natureView && (
        <BraveSheet
          palette={naturePal}
          step={natureView.step}
          onStep={(step) => setNatureView({ paletteId: naturePal.id, step })}
          onClose={() => setOverlay(null)}
          onSave={() => {
            const p = naturePal;
            const step = natureView.step;
            const name = `${p.name} · ${stepLabel(step)}`;
            update((d) => {
              // a version only; the room's furniture, photo and «updated» time are not touched
              saveVersion(d, roomId, name);
              d.snapshots[0].palette = { id: p.id, step };
            });
            setOverlay(null);
            showToast(`Saved «${name}»`);
          }}
        />
      )}
      {openVersion && (
        <VersionSheet
          room={room}
          version={openVersion}
          onClose={() => setOverlay(null)}
          onRestore={() => {
            update((d) => restoreVersion(d, roomId, openVersion.id));
            setOverlay(null);
            showToast(`Restored «${openVersion.label}»`);
          }}
        />
      )}
      {overlay?.kind === 'board' && <AddBoardSheet onAdd={addBoard} onClose={() => setOverlay(null)} />}
      {overlay?.kind === 'add' && (
        <AddMenu
          placement="above"
          anchor={screenRef.current?.querySelector<HTMLElement>('.composer-plus') ?? null}
          highlight={STAND && tableHint ? ['scan', 'upload'] : undefined}
          choices={STAND_LOCK_ROOM ? ['scan'] : ['scan', 'upload', 'link', 'inspiration']} /* Moodboard removed (13.11); Inspiration from Explore added (Synne 14.11); the stand: only scanning (17.11) */
          onClose={() => setOverlay(null)}
          onPick={(c) => {
            if (c === 'moodboard') setOverlay({ kind: 'board' });
            else if (c === 'inspiration') setOverlay({ kind: 'inspo' });
            else if (c === 'library') setOverlay({ kind: 'library' });
            else if (c === 'upload') pickPhoto(false);
            else setOverlay({ kind: 'capture', method: c as CaptureMethod });
          }}
        />
      )}
      {overlay?.kind === 'capture' && (
        <FurniturePreview
          method={overlay.method}
          initial={overlay.initial}
          photo={overlay.photo}
          photoItem={STAND && overlay.photo ? standTableFor(overlay.photo) : undefined}
          // at the stand «Scan item» in the room finds the coffee table, not the sofa (Synne 19.11)
          scanDemo={STAND ? 'tables' : undefined}
          confirmLabel={overlay.swap ? 'Try in room' : 'Add to room'}
          roomName={room.name}
          onClose={() => setOverlay(null)}
          onAttach={(a) => {
            setOverlay(null);
            if (overlay.swap) {
              swapSelected(a);
              return;
            }
            // a table scanned from + in the chat goes straight into the room, as after «Scan item» (Rathi 29.10)
            // …and at the stand also a table picked from the camera roll (Synne 18.11)
            // the stand (Synne 19.11): the table goes into the chat field first; the visitor writes (or taps to get) a
            // prompt, and the table is put in the room when it is sent – see placeStandTable
            if (STAND && (a.source === 'scan' || a.source === 'photo') && a.kind === 'coffeetable') {
              setTableHint(false);
              setTableAsk(true);
              setAttachment(a);
              return;
            }
            // a table scanned from + in the chat goes straight into the room, as after «Scan item» (Rathi 29.10)
            if (a.source === 'scan' && a.kind === 'coffeetable') {
              setSelectedId(null);
              update((d) => {
                const r = getRoom(d, roomId);
                rememberScan(r, a);
                placeScanned(r, a, uid('f'));
                chatForItem(d, roomId, a);
              });
              return;
            }
            setAttachment(a);
            window.setTimeout(() => inputRef.current?.focus(), 50);
          }}
        />
      )}
      {overlay?.kind === 'inspo' && (
        // from your moodboards or from Explore (Synne 19.11); a photo goes into the chat as the reference
        <InspirationPicker
          onClose={() => setOverlay(null)}
          onPick={(id, title) => {
            setInspirations((l) => (l.some((p) => p.id === id) ? l : [...l, { id, title, prompt: `Use «${title}» as the reference` }]));
            setOverlay(null);
          }}
        />
      )}
      {overlay?.kind === 'library' && (
        <MyFurnitureSheet
          items={state.library}
          onClose={() => setOverlay(null)}
          onPick={(it) =>
            setOverlay({
              kind: 'capture',
              method: 'library',
              initial: { name: it.name, kind: it.kind, width: it.width, depth: it.depth, height: it.height, color: it.color, colorName: it.colorName, source: 'My furniture', product: it.product },
            })
          }
        />
      )}
      {overlay?.kind === 'panel' && (
        <SidePanel
          room={room}
          chats={roomChats}
          activeChatId={activeId}
          versions={versions}
          onNewChat={() => pickChat(null)}
          onPickChat={(id) => pickChat(id)}
          onOpenVersion={(id) => setOverlay({ kind: 'version', id })}
          onSaveVersion={() => setOverlay({ kind: 'save' })}
          onSettings={() => navigate(`/room/${roomId}/settings`)}
          onClose={() => setOverlay(null)}
        />
      )}
      {/* a floor plan or measurements instead of a scan, from the 3D / floor plan view (Synne 14.11) */}
      {shapeFlow === 'files' && (
        <FakeFiles
          accept={['plan', 'pdf', 'photo']}
          onClose={() => setShapeFlow(null)}
          onPick={(f) =>
            buildShape((r) => {
              r.floorPlan = { name: f.name, at: Date.now() };
              Object.assign(r, roomShape(floorPlanRoom()));
              r.createdVia = [r.createdVia, 'plan'].filter(Boolean).join(', ');
            }, 'The floor plan is read – the room is in 3D now')
          }
        />
      )}
      {shapeFlow === 'measure' && (
        <MeasureWizard
          initial={rectDraft()}
          startStep={1}
          onClose={() => setShapeFlow(null)}
          onSave={(m) =>
            buildShape((r) => {
              applyMeasurements(r, m);
              r.createdVia = [r.createdVia, 'measure'].filter(Boolean).join(', ');
            }, 'Measurements saved – the room is in 3D now')
          }
        />
      )}
      {shapeFlow === 'building' && (
        <div className="scrim">
          <section className="sheet">
            <div className="sheet-body">
              <Loading text="Building the 3D model …" sub="From your floor plan or measurements" />
            </div>
          </section>
        </div>
      )}
      {scanOpen && (
        <RoomScanScreen
          roomName={room.name}
          onClose={() => setScanOpen(false)}
          onDone={() => {
            // after the scan the 3D model is the shared truth; the photos become reference for colours and materials
            update((d) => {
              const r = getRoom(d, roomId);
              Object.assign(r, roomShape(scannedRoom()));
              r.scannedAt = Date.now();
              r.unmeasured = undefined;
              r.createdVia = [r.createdVia, 'scan'].filter(Boolean).join(', ');
              r.updatedAt = Date.now();
            });
            setScanOpen(false);
            setMode('real');
            showToast('The room is scanned. Your photos now help with colours and materials.');
          }}
        />
      )}
      {natureMode && (
        <div className="nature-mode">
          <NatureTab roomId={roomId} onClose={() => setNatureMode(false)} />
        </div>
      )}
    </div>
  );
}

/**
 * Versions as pages (Synne 13.11). The room itself is busy (drag to rotate in 3D/360°, move furniture), so you swipe
 * on a small pill above the chat instead – like switching tabs in Safari on iPhone. Swipe right: older (it comes in
 * from the left). The dots show where you are: oldest left, «now» right.
 */
function VersionSwipe({ count, index, label, onOlder, onNewer, onPick }: { count: number; index: number; label?: string; onOlder: () => void; onNewer: () => void; onPick: (ix: number) => void }) {
  const x0 = useRef<number | null>(null);
  const moved = useRef(false);
  const dots = Array.from({ length: count + 1 }, (_, i) => count - i);
  return (
    <div
      className="version-pill glass-chic"
      role="group"
      aria-label="Versions of the room. Swipe right for older, left for newer."
      onPointerDown={(e) => {
        x0.current = e.clientX;
        moved.current = false;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerUp={(e) => {
        if (x0.current === null) return;
        const dx = e.clientX - x0.current;
        x0.current = null;
        if (dx > 24) (moved.current = true), onOlder();
        else if (dx < -24) (moved.current = true), onNewer();
      }}
    >
      <span className="version-pill-label">{label ?? 'Now'}</span>
      <span className="version-dots">
        {dots.map((ix) => (
          <button
            key={ix}
            aria-label={ix === 0 ? 'Now' : `Version ${count - ix + 1}`}
            aria-current={ix === index}
            className={'version-dot' + (ix === index ? ' is-on' : '')}
            onClick={() => !moved.current && onPick(ix)}
          />
        ))}
      </span>
    </div>
  );
}

/** The versions as a row of cards: a small 3D picture of the room, its name and date. Oldest left, «now» right. */
function VersionCarousel({ room, versions, index, onPick, onSave, compare, pair, canCompare, onCompare }: { room: Room; versions: { id: string; label: string; createdAt: number; furniture: Furniture[]; image?: string }[]; index: number; onPick: (ix: number) => void; onSave: () => void; compare: boolean; pair: [number, number]; canCompare: boolean; onCompare: () => void }) {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // start at «Now» (the two action cards stay just to its right)
    const now = row.current?.querySelector<HTMLElement>('.version-card.is-on');
    if (row.current && now) row.current.scrollLeft = now.offsetLeft - row.current.clientWidth + now.offsetWidth * 3 + 24;
  }, []);
  // short and on one line: «13 Nov · 09:34», or just the time today
  const when = (t: number) => {
    const d = new Date(t);
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === new Date().toDateString() ? `Today · ${time}` : `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${time}`;
  };
  const cards = [...versions.map((v, i) => ({ ix: i + 1, name: v.label, date: when(v.createdAt), items: v.furniture, image: v.image })).reverse(), { ix: 0, name: 'Now', date: 'Current', items: room.furniture, image: room.image }];
  return (
    <div className="version-row" ref={row} role="listbox" aria-label="Versions of the room">
      {cards.map((c, n) => {
        const on = compare ? pair.includes(c.ix) : c.ix === index;
        // in compare: which side the version is on
        const side = compare && on ? (c.ix === Math.max(...pair) ? 'Left' : 'Right') : null;
        return (
        <button key={c.ix} role="option" aria-selected={on} aria-label={side ? `${c.ix === 0 ? 'Now' : `Version ${n + 1}`}, ${side.toLowerCase()} side` : undefined} className={'version-card glass-chic' + (on ? ' is-on' : '')} onClick={() => onPick(c.ix)}>
          {side && <span className="version-card-side">{side === 'Left' ? 'L' : 'R'}</span>}
          <span className="version-card-img">
            {/* the real photo of the room (Synne 13.11) */}
            {/* each version with its own photo – how the room looked then (Synne 19.11) */}
            {(c.image ?? room.image) ? <img src={c.image ?? room.image} alt="" /> : <IsoView3D room={room} items={c.items} mini />}
            {/* the name on the photo, white on a soft shade, so it reads on any room (Synne 19.11) */}
            <span className="version-card-label">
              <span className="version-card-name">{c.ix === 0 ? 'Now' : `Version ${n + 1}`}</span>
              {/* «Today · 16:09» doesn't fit on the small photo: today only the time */}
              <span className="version-card-date">{c.date.startsWith('Today') ? c.date.replace(/^Today · /, '') : c.date.split(' · ')[0]}</span>
            </span>
          </span>
        </button>
        );
      })}
      {/* the two actions as cards at the end of the row, like the add and nature tiles (Synne 13.11) */}
      <button className="version-card version-tool" onClick={onSave}>
        <span className="version-tool-icon"><Icon name="save" size={20} /><span className="version-card-name">Save version</span></span>
      </button>
      <button className={'version-card version-tool' + (compare ? ' is-on' : '')} aria-pressed={compare} disabled={!canCompare} onClick={onCompare}>
        <span className="version-tool-icon"><Icon name="swap" size={20} /><span className="version-card-name">Compare</span></span>
      </button>
    </div>
  );
}

/** Two versions side by side (Synne 13.11): the older one on the left, now on the right, a divider you drag.
 *  In the living room it uses the real 3D/360° view twice, each told which table stands there. */
function CompareView({ room, left: older, right: newer, real, onClose }: { room: Room; left: { label: string; furniture: Furniture[] }; right: { label: string; furniture: Furniture[] }; real: string | null; onClose: () => void }) {
  const [x, setX] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const left = useRef<HTMLIFrameElement>(null);
  const right = useRef<HTMLIFrameElement>(null);
  const tableOf = (fs: Furniture[]) => fs.find((f) => f.kind === 'coffeetable') ?? null;
  useEffect(() => {
    if (!real) return;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== 'mycrib:ready') return;
      if (e.source === left.current?.contentWindow) left.current!.contentWindow!.postMessage({ type: 'mycrib:table', item: tableOf(older.furniture) }, '*');
      if (e.source === right.current?.contentWindow) right.current!.contentWindow!.postMessage({ type: 'mycrib:table', item: tableOf(newer.furniture) }, '*');
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [real, older, newer]); // eslint-disable-line react-hooks/exhaustive-deps
  // a new version picked while comparing: the open views change their table right away
  useEffect(() => {
    left.current?.contentWindow?.postMessage({ type: 'mycrib:table', item: tableOf(older.furniture) }, '*');
    right.current?.contentWindow?.postMessage({ type: 'mycrib:table', item: tableOf(newer.furniture) }, '*');
  }, [JSON.stringify(tableOf(older.furniture)), JSON.stringify(tableOf(newer.furniture))]); // eslint-disable-line react-hooks/exhaustive-deps
  const drag = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    setX(Math.max(5, Math.min(95, ((e.clientX - r.left) / r.width) * 100)));
  };
  const view = (fs: Furniture[], ref: React.RefObject<HTMLIFrameElement>) =>
    real ? <iframe ref={ref} src={real} title="Room" className="compare-frame" /> : room.image ? <img src={room.image} alt="" className="compare-frame" /> : <IsoView3D room={room} items={fs} mini />;
  return (
    <div className="compare" ref={box} onPointerMove={(e) => e.buttons && drag(e)} onPointerDown={drag}>
      <div className="compare-layer compare-layer-real">{view(newer.furniture, right)}</div>
      <div className="compare-layer compare-layer-real" style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }}>
        {view(older.furniture, left)}
      </div>
      <div className="compare-divider compare-divider-real" style={{ left: `${x}%` }} aria-hidden>
        <span className="compare-grip" />
      </div>
      <span className="compare-label compare-label-left">{older.label}</span>
      <span className="compare-label compare-label-right">{newer.label}</span>
      {/* a clear way out of compare (Synne 13.11) */}
      <button className="compare-close" aria-label="Stop comparing" onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
