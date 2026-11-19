import { PIN_CATALOG, toPin } from './pins';
import type { AppState, Furniture, FurnitureKind } from './types';

export const KIND_COLORS: Record<FurnitureKind, [string, string]> = {
  sofa: ['#8a919c', 'grå'],
  coffeetable: ['#c9b79c', 'lys eik'],
  tvbench: ['#6b6b6b', 'mørk grå'],
  diningtable: ['#b89b74', 'eik'],
  chair: ['#d3c7b3', 'lys tre'],
  bed: ['#e0dad0', 'offwhite'],
  dresser: ['#a68b6d', 'valnøtt'],
  armchair: ['#b08d6a', 'konjakk'],
  lamp: ['#e6d49c', 'messing'],
  shelf: ['#9a8a78', 'tre'],
  other: ['#a0a0a0', 'grå'],
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

export function createSeed(): AppState {
  const now = Date.now();

  const livingFurniture: Furniture[] = [
    makeFurniture('f_sofa', 'Sofa', 'sofa', 20, 215, 200, 85, 80),
    makeFurniture('f_ctable', 'Salongbord', 'coffeetable', 70, 110, 100, 60, 45),
    makeFurniture('f_tv', 'TV-benk', 'tvbench', 40, 0, 160, 40, 50),
    makeFurniture('f_dtable', 'Spisebord', 'diningtable', 300, 170, 160, 90, 75),
    makeFurniture('f_ch1', 'Stol', 'chair', 320, 120, 45, 45, 85),
    makeFurniture('f_ch2', 'Stol', 'chair', 395, 120, 45, 45, 85),
    makeFurniture('f_ch3', 'Stol', 'chair', 320, 265, 45, 45, 85),
    makeFurniture('f_ch4', 'Stol', 'chair', 395, 265, 45, 45, 85),
  ];

  const bedroomFurniture: Furniture[] = [
    makeFurniture('f_bed', 'Seng', 'bed', 40, 0, 180, 200, 50),
    makeFurniture('f_dresser', 'Kommode', 'dresser', 270, 305, 100, 45, 80),
  ];

  return {
    version: 5,
    rooms: [
      {
        id: 'r_living',
        name: 'Stuen min',
        width: 500,
        depth: 400,
        window: { wall: 'back', offset: 280, length: 140 },
        door: { wall: 'left', offset: 310, length: 85 },
        furniture: livingFurniture,
        instructions: '',
        photos: ['Stue mot vinduet', 'Stue mot døren'],
        moodboard: PIN_CATALOG.filter((p) => ['p_warm', 'p_leather', 'p_reading'].includes(p.id)).map(toPin),
        createdVia: 'Scan rom',
        updatedAt: now - 2 * DAY,
        lastOpenedAt: now - 1 * HOUR,
        pinned: true,
      },
      {
        id: 'r_bedroom',
        name: 'Soverom',
        width: 400,
        depth: 350,
        window: { wall: 'back', offset: 250, length: 110 },
        door: { wall: 'left', offset: 245, length: 85 },
        furniture: bedroomFurniture,
        instructions: '',
        photos: [],
        moodboard: [],
        createdVia: 'Skriv inn mål',
        updatedAt: now - 9 * DAY,
        lastOpenedAt: now - 3 * DAY,
      },
    ],
    chats: [
      {
        id: 'c_curtains',
        roomId: 'r_living',
        title: 'Gardiner',
        createdAt: now - 1 * DAY,
        updatedAt: now - 1 * DAY,
        messages: [
          {
            id: 'm1',
            role: 'user',
            text: 'Hvilke gardiner passer til vinduet i stuen?',
            createdAt: now - 1 * DAY,
          },
          {
            id: 'm2',
            role: 'ai',
            text: 'Vinduet er 140 cm bredt. En stang på ca. 190 cm gjør at gardinene kan henge litt utenfor vinduet.',
            createdAt: now - 1 * DAY + 2000,
          },
        ],
      },
    ],
    snapshots: [
      {
        id: 's_living0',
        roomId: 'r_living',
        createdAt: now - 2 * DAY,
        label: 'Opprinnelig rom',
        furniture: livingFurniture,
      },
      {
        id: 's_bedroom0',
        roomId: 'r_bedroom',
        createdAt: now - 9 * DAY,
        label: 'Opprinnelig rom',
        furniture: bedroomFurniture,
      },
    ],
    profile: {
      name: 'Synne',
      housing: 'Leilighet',
      livesWith: 'Samboer',
      age: '25–34',
      styles: ['Skandinavisk'],
      pinterestConnected: false,
    },
    library: [
      { id: 'l_armchair', name: 'Lenestol', kind: 'armchair', width: 80, depth: 85, height: 95, color: '#b08d6a', colorName: 'konjakk' },
      { id: 'l_lamp', name: 'Gulvlampe', kind: 'lamp', width: 40, depth: 40, height: 160, color: '#e6d49c', colorName: 'messing' },
      { id: 'l_shelf', name: 'Bokhylle', kind: 'shelf', width: 80, depth: 30, height: 200, color: '#9a8a78', colorName: 'tre' },
      { id: 'l_pouf', name: 'Puff', kind: 'other', width: 50, depth: 50, height: 45, color: '#c4b5a0', colorName: 'sand' },
    ],
    activeChat: { r_living: null, r_bedroom: null },
  };
}
