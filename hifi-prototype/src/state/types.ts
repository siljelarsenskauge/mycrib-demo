import type { Measurements } from './measure';

export type FurnitureKind =
  | 'sofa'
  | 'coffeetable'
  | 'tvbench'
  | 'diningtable'
  | 'chair'
  | 'bed'
  | 'dresser'
  | 'armchair'
  | 'lamp'
  | 'shelf'
  | 'other';

export interface ColorVariant {
  color: string;
  colorName: string;
}

/** A real product the AI recognised (simulated), e.g. from JYSK. Lets the user switch between its colours. */
export interface ProductInfo {
  store: string;
  model: string;
  price: number;
  variants: ColorVariant[];
  /** the product page the AI found it on – shown as a link in «What the AI saw» */
  url?: string;
}

/** All measurements in cm. x/y = top-left corner of the footprint, seen from above. */
export interface Furniture {
  id: string;
  name: string;
  kind: FurnitureKind;
  x: number;
  y: number;
  /** B – the long side */
  width: number;
  /** D */
  depth: number;
  /** H */
  height: number;
  /** 90 = rotated, so the long side runs along the y-axis */
  rot: 0 | 90;
  color: string;
  colorName: string;
  product?: ProductInfo;
  /** a real photo of the item (the product photo from the scan, or a photo of the user's own item) – Rathi 28.10 */
  photo?: string;
  /** drawn as a circle/oval in the floor plan (round tables) – Rathi 28.10 */
  shape?: 'round';
  /** fixed in the room (kitchen, the sofa): can't be dragged or changed by the AI – Rathi 28.10 */
  locked?: boolean;
  /** pieces drawn as one element in the floor plan (the corner sofa: sofa + chaise longue) */
  group?: string;
}

/** 'right' is only used for an open passage without a door leaf (the real living room, Rathi 28.10). */
export type Wall = 'back' | 'left' | 'right';

/** Things in the room besides furniture, marked when the room is measured. */
export type FixtureKind = 'outlet' | 'light' | 'window' | 'radiator';
export type RoomWall = 'back' | 'left' | 'right' | 'front';

export interface Fixture {
  id: string;
  kind: FixtureKind;
  /** wall items (outlet, window, radiator): which wall and how far along it, cm */
  wall?: RoomWall;
  offset?: number;
  /** ceiling lights: position in the floor plan, cm */
  x?: number;
  y?: number;
}

export interface Opening {
  wall: Wall;
  /** distance along the wall, cm */
  offset: number;
  length: number;
  /** height of the opening, cm */
  height?: number;
  /** windows: distance from the floor to the bottom of the window, cm */
  sill?: number;
  /** doors: opens out of the room instead of into it */
  opensOut?: boolean;
  /** doors: hinges at the end nearest the window wall ('start') or the other end */
  hinge?: 'start' | 'end';
}

/** Simulated Pinterest image */
export interface Pin {
  id: string;
  title: string;
  /** what the AI is asked when the pin is used in a chat */
  prompt: string;
}

/** A moodboard: images saved from Discover. It can be connected to one room, and the AI then uses it there. */
export interface Moodboard {
  id: string;
  name: string;
  /** ids of images in state/inspo.ts */
  items: string[];
  /** the rooms it is used in; a room uses one moodboard at a time */
  roomIds?: string[];
  /** @deprecated one room; read through boardsOf() */
  roomId?: string;
  archived?: boolean;
  /** kept as a mark, so a deleted example board does not come back */
  deleted?: boolean;
}

export interface Room {
  id: string;
  name: string;
  width: number; // x
  depth: number; // y
  /** ceiling height in cm (the 3D view stays a cut-away, so this is shown as a number) */
  height?: number;
  window: Opening;
  door: Opening;
  /** where a coffee table goes when one is added (centre, cm) – Rathi 28.10 */
  coffeeSpot?: { x: number; y: number };
  /** furniture scanned for this room, newest first: round icons next to the undo button (Rathi 29.10) */
  scanned?: Attachment[];
  /** the user has asked for other tables («More tables» or the chat): the suggestions show in the row (Rathi 11.11) */
  showIdeas?: boolean;
  /** more openings without a door leaf (living room: bedroom by the balcony, hallway by the kitchen) – Rathi 28.10 */
  openings?: { wall: 'back' | 'left' | 'right' | 'front'; offset: number; length: number }[];
  furniture: Furniture[];
  /** the furniture as it was at the last saved or restored version, or when the room was first opened.
   *  «Save version» only shows when the room differs from this (Synne 04.11). */
  versionBase?: Furniture[];
  instructions: string;
  /** interior styles for the room – several can be picked (Synne 29.10): profile styles and/or the user's own word */
  styles?: string[];
  /** the interior expert may challenge the user's style now and then (Synne 14.11) */
  challenge?: boolean;
  /** colours from nature picked for the room; kept in step with its nature board (Synne 14.11) */
  natures?: string[];
  /** @deprecated one style (27.–29.10); read through roomStyles() */
  style?: string;
  photos: string[];
  moodboard: Pin[];
  /** outlets, lights, extra windows, radiators */
  fixtures?: Fixture[];
  /** cover photo on the home screen (path under /public) */
  image?: string;
  /** the user picked the cover photo themselves: it stays, and the cover no longer follows the room (Synne 19.11) */
  coverOwn?: boolean;
  /** the living room's 360° photos in a sofa colour / rug / walls from Fig's talk, kept when the room is left (Synne 19.11) */
  sofaView?: string;
  /** when the room was last scanned (simulated) */
  scannedAt?: number;
  /** the room as drawn in the measuring tool (polygon, doors, windows, details); width/depth are its bounding box */
  plan?: Measurements;
  /** created from photos only (Figma 06H): no shape yet, the photos are the view until the room is scanned */
  unmeasured?: boolean;
  /** the user has edited the measurements themselves (shown as «Edited by you») */
  measuresEdited?: boolean;
  /** the uploaded floor plan, if any */
  floorPlan?: { name: string; at: number };
  /** archived rooms are hidden from the home screen (still under «All rooms») */
  archived?: boolean;
  /** a filter on Home; no badge on the card (Synne 06.11) */
  pinned?: boolean;
  /** when the room was last opened (shown when picking a room for an item; doesn't change the order) */
  lastOpenedAt?: number;
  /** latest changes first; «Undo» pops from here */
  undo?: UndoStep[];
  /** steps that were undone, so they can be done again (Synne 13.11) */
  redo?: UndoStep[];
  createdVia: string;
  /** set when the 3D model is rebuilt from room settings */
  modelUpdatedAt?: number;
  modelMethod?: string;
  updatedAt: number;
}

export interface Attachment {
  name: string;
  kind: FurnitureKind;
  width: number;
  depth: number;
  height: number;
  color: string;
  colorName: string;
  source: string;
  product?: ProductInfo;
  /** small data-URL thumbnail when the user picked a real photo from the camera roll */
  photo?: string;
  /** sizes the AI only guessed (marked yellow until the user has checked them) */
  uncertain?: ('width' | 'depth' | 'height')[];
  /** flat things (rugs): only width and length, no height (Synne 22.10, 02D.9) */
  flat?: boolean;
  /** the sizes the product comes in (e.g. rugs); the scan chooses the closest one (02D.7) */
  sizes?: { width: number; depth: number }[];
  /** what the scan measured, when a product size was chosen from it */
  measured?: { width: number; depth: number };
  /** round items (the round oak table) are drawn as a circle in 2D – Rathi 29.10 */
  shape?: 'round';
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  attachment?: Attachment;
  contextItem?: string; // furniture name the user asked about
  inspirations?: string[]; // titles of attached Pinterest/moodboard images
  changed?: boolean; // AI changed the room
  /** a button under the AI's answer, e.g. «Scan the room» in a room made from photos */
  action?: 'scan' | 'nature';
  /** answer options from the interior expert, shown as buttons under the answer; a tap sends one (Rathi 11.11) */
  options?: string[];
  /** colour dots under an answer, e.g. the sofa colours the fig offers (Silje 17.11) */
  swatches?: { name: string; hex: string; variant?: string; pick?: boolean }[];
  /** who wrote an AI answer: Claude (with the prompt's version and the model tier), else the scripted ai.ts */
  by?: { prompt: string; tier?: string };
  /** a nature photo sent for colour inspiration (user), or the palette taken from it (AI) – see state/nature.ts */
  nature?: string;
  /** Fig's face on this answer (Synne 17.11): puzzled when it challenges, happy when it guides, happier at a bold choice */
  mood?: 'puzzled' | 'happy' | 'happier';
  /** a step in Fig's guided talk (components/FigGuide.ts) – the answer options and colour dots under it are scripted */
  guide?: string;
  createdAt: number;
}

export interface Chat {
  id: string;
  roomId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  lastTargetId?: string;
  highlightId?: string;
  /** set when the AI wants the user to look at the floor plan */
  planRequest?: number;
  /** the scanned item this chat is about: each table has its own chat (Rathi 29.10) */
  itemName?: string;
}

/** A version of the room the user chose to keep («Save version»). */
export interface Snapshot {
  id: string;
  roomId: string;
  createdAt: number;
  /** the name the user gave it (or the suggested one) */
  label: string;
  furniture: Furniture[];
  /** how the room looked then (Synne 19.11): the cover photo, and the sofa colour / rug / walls in the 360° view */
  image?: string;
  sofaView?: string;
  /** saved automatically, e.g. right before restoring another version */
  auto?: boolean;
  /** saved from «How brave are you?»: the nature palette and the step (07.11) */
  palette?: { id: string; step: 'beige' | 'touch' | 'statement' | 'allIn' };
}

export interface UndoStep {
  label: string;
  /** the furniture as it was before the change */
  furniture: Furniture[];
}

export interface Profile {
  name?: string;
  housing: string;
  livesWith: string;
  age: string;
  styles: string[];
  styleDescription?: string;
  pinterestConnected: boolean;
}

export interface LibraryItem {
  id: string;
  name: string;
  kind: FurnitureKind;
  width: number;
  depth: number;
  height: number;
  color: string;
  colorName: string;
  product?: ProductInfo;
}

export interface AppState {
  version: number;
  rooms: Room[];
  chats: Chat[];
  snapshots: Snapshot[];
  profile: Profile;
  library: LibraryItem[];
  /** roomId -> active chat id (null = new, empty chat) */
  activeChat: Record<string, string | null>;
  /** furniture captured from the home screen, waiting to be placed in a room */
  pending?: { roomId: string; attachment: Attachment };
  /** unset = the starting boards, see boardsOf() */
  boards?: Moodboard[];
  /** images saved without a moodboard */
  saved?: string[];
  /** the stand (Synne 18.11): the visitor has put the scanned sofa in the living room – Home stops showing the way */
  standSofa?: boolean;
  /** the stand: the side trips tried (shown with a tick on Home), the trip that glows on Home, and a trip to start in the
   *  living room when it opens (Synne 18.11) */
  standDone?: string[];
  standTrip?: 'boards' | 'room' | 'sofa';
  /** the moodboard the visitor made in the moodboard task: it is done when a photo is saved in it (Synne 19.11) */
  standBoard?: string;
  /** the room the visitor made in the room task: done when it has been seen in 360°, 3D and 2D (Synne 19.11) */
  standRoom?: string;
  standAsk?: string;
  /** a nature photo picked on the home screen, waiting in the room's chat (07.11) */
  pendingNature?: { roomId: string; paletteId: string };
  /** the room shown in a nature palette, until the user goes back to the original (07.11). Kept outside the room. */
  natureView?: { roomId: string; paletteId: string; step: 'beige' | 'touch' | 'statement' | 'allIn' };
  /** the one-time «tap/drag furniture» hint has been dismissed */
  hintSeen?: boolean;
}
