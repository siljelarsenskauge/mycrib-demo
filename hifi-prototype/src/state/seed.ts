import { PIN_CATALOG, toPin } from './pins';
import type { AppState, Attachment, Furniture, FurnitureKind, Room } from './types';

/** The round oak table «scanned earlier» for the living room (the SketchUp model rundt_bord.json, Ø 87 × 37 cm) – Rathi 29.10 */
export const ROUND_OAK: Attachment = {
  name: 'Round oak table',
  kind: 'coffeetable',
  width: 87,
  depth: 87,
  height: 37,
  color: '#a0764e',
  colorName: 'oak',
  source: 'scan',
  photo: '/scan/round-oak-table.png',
  shape: 'round',
};

export const KIND_COLORS: Record<FurnitureKind, [string, string]> = {
  sofa: ['#8a919c', 'grey'],
  coffeetable: ['#c9b79c', 'light oak'],
  tvbench: ['#6b6b6b', 'dark grey'],
  diningtable: ['#b89b74', 'oak'],
  chair: ['#d3c7b3', 'light wood'],
  bed: ['#e0dad0', 'off-white'],
  dresser: ['#a68b6d', 'walnut'],
  armchair: ['#b08d6a', 'cognac'],
  lamp: ['#e6d49c', 'brass'],
  shelf: ['#9a8a78', 'wood'],
  other: ['#a0a0a0', 'grey'],
};

let counter = 0;
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export function makeFurniture(
  id: string,
  name: string,
  kind: FurnitureKind,
  x: number,
  y: number,
  width: number,
  depth: number,
  height: number,
  rot: 0 | 90 = 0,
): Furniture {
  const [color, colorName] = KIND_COLORS[kind];
  return { id, name, kind, x, y, width, depth, height, rot, color, colorName };
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Small rooms that only exist so the home screen looks like a real home. */
function simpleRoom(id: string, name: string, image: string, width: number, depth: number, furniture: Furniture[], openedAgo: number): Room {
  const now = Date.now();
  return {
    id,
    name,
    image,
    width,
    depth,
    window: { wall: 'back', offset: Math.round(width / 2), length: 100 },
    door: { wall: 'left', offset: depth - 100, length: 85 },
    furniture,
    instructions: '',
    photos: [],
    moodboard: [],
    createdVia: 'Scan room',
    updatedAt: now - openedAgo,
    lastOpenedAt: now - openedAgo,
  };
}

export function createSeed(): AppState {
  const now = Date.now();

  // The real living room in the 360° photo and the 3D scan, from the measured model (rom.json, «Stue B1»).
  // Seen from above: the balcony door at the top (back wall), the sofa wall on the left, the bedroom on the right,
  // the kitchen along the wall nearest you. Positions marked «estimated» in rom.json: the chairs and the dining table.
  const livingFurniture: Furniture[] = [
    // the corner sofa is one element, fixed in the room (as in the 360° photo and the 3D model)
    { ...makeFurniture('f_sofa', 'Sofa', 'sofa', 0, 32, 188, 93, 78, 90), group: 'sofa', locked: true },
    { ...makeFurniture('f_chaise', 'Chaise longue', 'sofa', 0, 220, 213, 82, 78), group: 'sofa', locked: true },
    { ...makeFurniture('f_tv', 'TV on stand', 'tvbench', 400, 129, 145, 40, 110, 90), locked: true },
    // the chairs stand a little under the table (drawn first, so the table lies over them)
    makeFurniture('f_ch1', 'Chair', 'chair', 246, 72, 45, 45, 85),
    makeFurniture('f_ch2', 'Chair', 'chair', 313, 140, 45, 45, 85),
    makeFurniture('f_ch3', 'Chair', 'chair', 381, 72, 45, 45, 85),
    { ...makeFurniture('f_dtable', 'Dining table', 'diningtable', 276, 35, 120, 120, 75), shape: 'round' },
    makeFurniture('f_lamp', 'Floor lamp', 'lamp', 3, 0, 30, 30, 160),
    { ...makeFurniture('f_kitchen', 'Kitchen', 'other', 0, 383, 275, 60, 90), locked: true },
  ];

  const bedroomFurniture: Furniture[] = [
    makeFurniture('f_bed', 'Bed', 'bed', 40, 0, 180, 200, 50),
    makeFurniture('f_dresser', 'Dresser', 'dresser', 270, 305, 100, 45, 80),
  ];

  return {
    version: 6,
    rooms: [
      {
        id: 'r_living',
        name: 'Living Room',
        image: '/rooms/living.jpg',
        pinned: true,
        width: 440,
        depth: 443,
        height: 249,
        // the balcony door (glass, floor to 240 cm) and the opening to the bedroom by the hallway
        window: { wall: 'back', offset: 80, length: 240, sill: 0, height: 240 },
        door: { wall: 'right', offset: 303, length: 90 },
        // no table in front of the sofa until one is scanned; it then goes where the glass tables stand in the photo
        coffeeSpot: { x: 150, y: 143 },
        // tables scanned for this room earlier (the carousel next to undo); none of them stands in the room at the start
        scanned: [ROUND_OAK],
        openings: [
          { wall: 'right', offset: 10, length: 90 }, // to the bedroom by the balcony (the TV stands between the two)
          { wall: 'front', offset: 290, length: 150 }, // to the hallway, next to the fridge
        ],
        furniture: livingFurniture,
        instructions: '',
        photos: ['Living room towards the window', 'Living room towards the door'],
        moodboard: PIN_CATALOG.filter((p) => ['p_warm', 'p_leather', 'p_reading'].includes(p.id)).map(toPin),
        createdVia: 'Scan room',
        updatedAt: now - 2 * DAY,
        lastOpenedAt: now - 1 * HOUR,
      },
      {
        id: 'r_bedroom',
        name: 'Bedroom',
        image: '/rooms/bedroom.jpg',
        pinned: true,
        width: 400,
        depth: 350,
        window: { wall: 'back', offset: 250, length: 110 },
        door: { wall: 'left', offset: 245, length: 85 },
        furniture: bedroomFurniture,
        instructions: '',
        photos: [],
        moodboard: [],
        createdVia: 'Enter measurements',
        // «Recent rooms»: Living Room, Dining area, Kitchen, Bedroom (Silje 17.11)
        updatedAt: now - 5 * DAY,
        lastOpenedAt: now - 5 * DAY,
      },
      { ...simpleRoom('r_kitchen', 'Kitchen', '/rooms/kitchen.jpg', 350, 300, [makeFurniture('f_ktable', 'Dining table', 'diningtable', 120, 140, 120, 80, 75)], 4 * DAY) },
      simpleRoom('r_office', 'Home Office', '/rooms/office.jpg', 300, 280, [makeFurniture('f_desk', 'Desk', 'other', 30, 0, 140, 70, 75), makeFurniture('f_oshelf', 'Bookshelf', 'shelf', 210, 0, 80, 30, 200)], 3 * DAY),
    ],
    chats: [
      {
        id: 'c_sofa',
        roomId: 'r_living',
        title: 'New sofa',
        createdAt: now - 2 * HOUR,
        updatedAt: now - 2 * HOUR,
        messages: [
          { id: 'm_s1', role: 'user', text: 'I’m thinking about a new sofa', createdAt: now - 2 * HOUR },
          { id: 'm_s2', role: 'ai', text: 'Great! Attach a photo of the sofa and I’ll place it in the room.', createdAt: now - 2 * HOUR + 2000 },
        ],
      },
      {
        id: 'c_curtains',
        roomId: 'r_living',
        title: 'Curtains',
        createdAt: now - 1 * DAY,
        updatedAt: now - 1 * DAY,
        messages: [
          { id: 'm1', role: 'user', text: 'Which curtains would suit the living room window?', createdAt: now - 1 * DAY },
          {
            id: 'm2',
            role: 'ai',
            text: 'The balcony door is about 240 cm wide. A rod of about 290 cm lets the curtains hang a little outside it on both sides.',
            createdAt: now - 1 * DAY + 2000,
          },
        ],
      },
      {
        id: 'c_bed',
        roomId: 'r_bedroom',
        title: 'Bed and nightstand',
        createdAt: now - 3 * DAY,
        updatedAt: now - 3 * DAY,
        messages: [
          { id: 'm3', role: 'user', text: 'Is there room for a nightstand next to the bed?', createdAt: now - 3 * DAY },
          { id: 'm4', role: 'ai', text: 'Yes. There is about 40 cm between the bed and the wall, enough for a small nightstand.', createdAt: now - 3 * DAY + 2000 },
        ],
      },
    ],
    snapshots: [
      { id: 's_living0', roomId: 'r_living', createdAt: now - 2 * DAY, label: 'Original room', furniture: livingFurniture, image: '/rooms/living_beige.jpg' },
      { id: 's_bedroom0', roomId: 'r_bedroom', createdAt: now - 9 * DAY, label: 'Original room', furniture: bedroomFurniture },
    ],
    profile: {
      name: 'Synne',
      housing: 'Apartment',
      livesWith: 'Partner',
      age: '25–34',
      styles: ['Scandinavian'],
      pinterestConnected: false,
    },
    library: [
      { id: 'l_armchair', name: 'Armchair', kind: 'armchair', width: 80, depth: 85, height: 95, color: '#b08d6a', colorName: 'cognac' },
      { id: 'l_lamp', name: 'Floor lamp', kind: 'lamp', width: 40, depth: 40, height: 160, color: '#e6d49c', colorName: 'brass' },
      { id: 'l_shelf', name: 'Bookshelf', kind: 'shelf', width: 80, depth: 30, height: 200, color: '#9a8a78', colorName: 'wood' },
      { id: 'l_pouf', name: 'Pouf', kind: 'other', width: 50, depth: 50, height: 45, color: '#c4b5a0', colorName: 'sand' },
    ],
    activeChat: { r_living: null, r_bedroom: null },
  };
}
