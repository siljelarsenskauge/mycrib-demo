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
}

export type Wall = 'back' | 'left';

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

export interface Room {
  id: string;
  name: string;
  width: number; // x
  depth: number; // y
  /** ceiling height in cm (the 3D view stays a cut-away, so this is shown as a number) */
  height?: number;
  window: Opening;
  door: Opening;
  furniture: Furniture[];
  instructions: string;
  photos: string[];
  moodboard: Pin[];
  /** outlets, lights, extra windows, radiators */
  fixtures?: Fixture[];
  /** pinned rooms are shown first on the home screen */
  pinned?: boolean;
  /** when the room was last opened; sorts the carousel on the home screen */
  lastOpenedAt?: number;
  /** latest changes first; «Angre» pops from here */
  undo?: UndoStep[];
  createdVia: string;
  /** set when the 3D model is rebuilt from Rominnstillinger */
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
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  attachment?: Attachment;
  contextItem?: string; // furniture name the user asked about
  inspirations?: string[]; // titles of attached Pinterest/moodboard images
  changed?: boolean; // AI changed the room
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
}

/** A version of the room the user chose to keep («Lagre versjon»). */
export interface Snapshot {
  id: string;
  roomId: string;
  createdAt: number;
  /** the name the user gave it (or the suggested one) */
  label: string;
  furniture: Furniture[];
  /** saved automatically, e.g. right before restoring another version */
  auto?: boolean;
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
  /** the one-time «tap/drag furniture» hint has been dismissed */
  hintSeen?: boolean;
}
