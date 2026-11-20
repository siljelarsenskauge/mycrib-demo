import type { AppState, Attachment, FurnitureKind, Moodboard } from './types';

// Inspiration for the new direction (proposal, Figma «Forslag 2», sections 3 and 4). Photos are from Unsplash, in public/inspo/.

export interface NatureScene {
  id: string;
  name: string;
  /** what the AI «sees» in the image */
  reading: string;
  /** used in the AI's sentences: «Your board leans towards …» */
  mood: string;
  palette: string[];
}

export type RoomType = 'Living room' | 'Bedroom' | 'Kitchen' | 'Bathroom' | 'Hallway' | 'Dining room';
export type ProductType = 'Sofas' | 'Chairs' | 'Tables' | 'Lamps' | 'Beds' | 'Storage' | 'Bath';

export interface Inspo {
  id: string;
  title: string;
  room: RoomType;
  /** nature scenes this image matches */
  natures: string[];
  styles: string[];
  /** tile shape in the grid */
  ratio: string;
}

/** Simulated «from the web»: there is no backend. Photos are cropped from the room images, and the prices are made up. */
export interface Product {
  id: string;
  title: string;
  type: ProductType;
  kind: FurnitureKind;
  size: [number, number, number];
  color: string;
  colorName: string;
  price: number;
  natures: string[];
  styles: string[];
  ratio: string;
}

// Images chosen by Synne (06.11). Palettes are estimated from each image and adjusted by hand.
export const NATURE: NatureScene[] = [
  { id: 'n_plum_leaf', name: 'Plum leaf', reading: 'Dusty plum with a soft green glow.', mood: 'dusty plum and soft green', palette: ['#6b3f4f', '#996569', '#a8ad7a', '#d9c98a'] },
  { id: 'n_coleus', name: 'Coleus', reading: 'Raspberry and moss, all mixed up.', mood: 'raspberry pink against moss green', palette: ['#9f2f45', '#d2a08f', '#5f7a2e', '#d9d27a'] },
  { id: 'n_bark', name: 'Bark', reading: 'Dark, twisted, full of moss.', mood: 'dark wood and mossy green', palette: ['#1d1409', '#4a3620', '#4f5a22', '#9aae5a'] },
  { id: 'n_fig', name: 'Fig', reading: 'Deep purple with a blush inside.', mood: 'deep purple with a warm blush', palette: ['#2b2135', '#624b70', '#9b3a52', '#e9d6b8'] },
  { id: 'n_green_fig', name: 'Green fig', reading: 'Dark, glossy, ripe to the core.', mood: 'olive green and wine red', palette: ['#1c0e03', '#6a5722', '#8c1f33', '#d9d6a0'] },
  { id: 'n_lotus', name: 'Lotus', reading: 'Soft pink with fine, thin lines.', mood: 'soft pink and fine lines', palette: ['#7a8a4a', '#ae5b7a', '#d17797', '#f0b8df'] },
  { id: 'n_lily_pad', name: 'Lily pads', reading: 'Light, thin and see-through.', mood: 'pale green and airy layers', palette: ['#4f6a3c', '#929e6d', '#ccd4ce', '#f4f4ec'] },
  { id: 'n_blue_wing', name: 'Blue wing', reading: 'Powder blue held in warm brown.', mood: 'powder blue and warm brown', palette: ['#53311b', '#9a6a3f', '#9db8c4', '#e8e2d0'] },
  { id: 'n_fungus', name: 'Fungus', reading: 'Rings of rust, ochre and moss.', mood: 'rust, ochre and curved rings', palette: ['#4a2a1c', '#a2653e', '#cd7c39', '#6f7a2e'] },
  { id: 'n_red_leaf', name: 'Red leaf', reading: 'Oxblood with a silver shimmer.', mood: 'oxblood and a silvery green', palette: ['#3f1a1c', '#8a2a30', '#8f6e61', '#8fa08a'] },
  { id: 'n_owl_wing', name: 'Owl wing', reading: 'Dark brown with golden rings.', mood: 'dark brown and golden rings', palette: ['#1f100a', '#4b2d1d', '#d9a53a', '#e0d6b0'] },
  { id: 'n_teal_leaf', name: 'Teal leaf', reading: 'Teal and dusty rose, side by side.', mood: 'teal and dusty rose', palette: ['#1f5a55', '#6b978c', '#ad8787', '#d9a77a'] },
  { id: 'n_water', name: 'Shallow water', reading: 'Light moving over dark sand.', mood: 'dark sand and moving light', palette: ['#2e2f2b', '#6b4630', '#7f9aa0', '#dfe8e4'] },
  { id: 'n_ammonite', name: 'Ammonite', reading: 'Copper spirals with a pearl shine.', mood: 'copper spirals and a pearly shine', palette: ['#2f2812', '#744c27', '#b8702f', '#a8c0b0'] },
  { id: 'n_river', name: 'River', reading: 'Turquoise running through green.', mood: 'turquoise running through green', palette: ['#1c514a', '#348075', '#5a6739', '#b0b04a'] },
  { id: 'n_pistachio', name: 'Pistachio', reading: 'Lime green in a rosy brown shell.', mood: 'lime green and rosy brown', palette: ['#5b2e16', '#a77e45', '#7f4f6f', '#9cc23a'] },
  { id: 'n_protea', name: 'Dried flower', reading: 'Faded, burnt and still beautiful.', mood: 'faded, burnt browns', palette: ['#3e251a', '#856448', '#b8a56a', '#d9c8b0'] },
];

export const STYLES = ['Scandi', 'Japandi', 'Vintage', 'Bold'];
export const ROOM_TYPES: RoomType[] = ['Living room', 'Bedroom', 'Kitchen', 'Bathroom', 'Hallway', 'Dining room'];

// Room images chosen by Synne (06.11), plus two bedrooms from Unsplash. Matches and styles are judged by eye.
export const INSPO: Inspo[] = [
  // Synne's pick (IMG_0827, 14.11): first in Explore; «Make my kitchen like this» turns her kitchen into it
  { id: 'r_olive_stone_kitchen', title: 'Olive kitchen, dark stone island', room: 'Kitchen', natures: ['n_bark', 'n_ammonite', 'n_green_fig', 'n_river'], styles: ['Bold'], ratio: '2 / 3' },
  { id: 'r_green_kitchen', title: 'Curved green kitchen', room: 'Kitchen', natures: ['n_bark', 'n_river', 'n_teal_leaf', 'n_green_fig'], styles: ['Bold'], ratio: '3 / 4' },
  { id: 'r_oak_kitchen', title: 'Oak and grey stone', room: 'Kitchen', natures: ['n_protea', 'n_water', 'n_lily_pad', 'n_pistachio'], styles: ['Scandi', 'Japandi'], ratio: '3 / 4' },
  { id: 'r_marble_kitchen', title: 'Green stone island', room: 'Kitchen', natures: ['n_ammonite', 'n_river', 'n_bark', 'n_water'], styles: ['Bold'], ratio: '4 / 5' },
  { id: 'r_green_tiles', title: 'Green tiles, stone sink', room: 'Bathroom', natures: ['n_bark', 'n_river', 'n_teal_leaf', 'n_green_fig'], styles: ['Bold'], ratio: '3 / 4' },
  { id: 'r_amber_shower', title: 'Amber glass shower', room: 'Bathroom', natures: ['n_fungus', 'n_ammonite', 'n_owl_wing', 'n_protea'], styles: ['Bold'], ratio: '3 / 4' },
  { id: 'r_green_shower', title: 'Dark green shower', room: 'Bathroom', natures: ['n_bark', 'n_teal_leaf', 'n_green_fig', 'n_river'], styles: ['Vintage'], ratio: '3 / 4' },
  { id: 'r_plum_sink', title: 'Plum sink', room: 'Bathroom', natures: ['n_fig', 'n_plum_leaf', 'n_lotus', 'n_red_leaf'], styles: ['Vintage'], ratio: '4 / 5' },
  { id: 'r_green_hall', title: 'Ribbed green hallway', room: 'Hallway', natures: ['n_river', 'n_pistachio', 'n_coleus', 'n_red_leaf'], styles: ['Bold'], ratio: '3 / 4' },
  { id: 'r_olive_curtain', title: 'Olive curtains, dark wood', room: 'Hallway', natures: ['n_owl_wing', 'n_red_leaf', 'n_green_fig', 'n_pistachio'], styles: ['Vintage'], ratio: '4 / 5' },
  { id: 'r_plum_hall', title: 'Plum and olive hall', room: 'Hallway', natures: ['n_fig', 'n_plum_leaf', 'n_coleus', 'n_lily_pad'], styles: ['Bold', 'Vintage'], ratio: '4 / 5' },
  { id: 'r_fan_door', title: 'Plum door on olive', room: 'Hallway', natures: ['n_fig', 'n_plum_leaf', 'n_green_fig'], styles: ['Bold', 'Vintage'], ratio: '4 / 5' },
  { id: 'r_blue_lounge', title: 'Blue walls, burgundy chairs', room: 'Living room', natures: ['n_blue_wing', 'n_red_leaf', 'n_fig', 'n_lotus'], styles: ['Bold'], ratio: '3 / 4' },
  { id: 'r_burgundy_sofa', title: 'Burgundy curves', room: 'Living room', natures: ['n_red_leaf', 'n_fig', 'n_owl_wing', 'n_plum_leaf'], styles: ['Bold'], ratio: '3 / 4' },
  { id: 'r_brown_modular', title: 'Brown sofa, blue rug', room: 'Living room', natures: ['n_blue_wing', 'n_owl_wing', 'n_water'], styles: ['Scandi'], ratio: '3 / 4' },
  { id: 'r_blue_chairs', title: 'Blue chairs, zebra rug', room: 'Living room', natures: ['n_blue_wing', 'n_owl_wing', 'n_water', 'n_protea'], styles: ['Japandi'], ratio: '3 / 4' },
  { id: 'r_denim_sofa', title: 'Blue sofa in dark wood', room: 'Living room', natures: ['n_blue_wing', 'n_water', 'n_ammonite'], styles: ['Japandi'], ratio: '4 / 5' },
  { id: 'r_corduroy', title: 'Brown corduroy', room: 'Living room', natures: ['n_protea', 'n_pistachio', 'n_owl_wing'], styles: ['Scandi'], ratio: '3 / 4' },
  { id: 'r_linen_bed', title: 'Blue linen, brown pillows', room: 'Bedroom', natures: ['n_blue_wing', 'n_protea', 'n_water'], styles: ['Scandi'], ratio: '3 / 4' },
  { id: 'r_dark_bed', title: 'Black behind the bed', room: 'Bedroom', natures: ['n_water', 'n_bark', 'n_protea'], styles: ['Japandi'], ratio: '1 / 1' },
  { id: 'r_navy_bed', title: 'Navy and rust bedroom', room: 'Bedroom', natures: ['n_ammonite', 'n_blue_wing', 'n_red_leaf'], styles: ['Vintage'], ratio: '1 / 1' },
  { id: 'r_jungle_dining', title: 'Long table in the jungle', room: 'Dining room', natures: ['n_bark', 'n_lily_pad', 'n_protea', 'n_pistachio'], styles: ['Japandi', 'Vintage'], ratio: '4 / 5' },
];

/** an image that lives in its own folder in public/, not in public/inspo/ */
export interface DreamImage extends Inspo {
  src: string;
}

/** Silje's «dream room» images (public/dream room /, 18.11): only on the four dream room boards, not in Explore.
 *  Nature scenes and styles are judged from the names of the boards. */
const dream = (group: string, file: string, title: string, room: RoomType, natures: string[], styles: string[], w: number, h: number): DreamImage => ({
  id: `d_${group}_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
  title,
  room,
  natures,
  styles,
  ratio: `${w} / ${h}`,
  src: encodeURI(`/dream room /${file}`),
});
const FIG = ['n_fig', 'n_green_fig', 'n_plum_leaf'];
const AVOCADO = ['n_green_fig', 'n_bark', 'n_pistachio'];
const LAVENDER = ['n_lotus', 'n_plum_leaf', 'n_lily_pad'];
const COAST = ['n_water', 'n_blue_wing', 'n_lily_pad'];
export const DREAM: DreamImage[] = [
  dream('fig', 'moodboard fiken .png', 'Fig moodboard', 'Living room', FIG, ['Bold', 'Vintage'], 498, 786),
  dream('fig', 'bilde fiken .png', 'Fig wall art', 'Living room', FIG, ['Bold', 'Vintage'], 452, 540),
  dream('fig', 'fiken farger .png', 'Fig colours', 'Living room', FIG, ['Bold', 'Vintage'], 448, 568),
  dream('fig', 'lampe fiken .png', 'Fig lamp', 'Living room', FIG, ['Bold', 'Vintage'], 244, 468),
  dream('fig', 'moodboard 2 fiken .png', 'Fig moodboard 2', 'Living room', FIG, ['Bold', 'Vintage'], 490, 852),
  dream('fig', 'lampe 2 fiken .png', 'Fig lamp 2', 'Living room', FIG, ['Bold', 'Vintage'], 212, 426),
  dream('fig', 'lampe 3 fiken .png', 'Fig lamp 3', 'Living room', FIG, ['Bold', 'Vintage'], 426, 630),
  // Silje's cover for «Avocado» (18.11)
  dream('avocado', 'avkokadooooo .png', 'Avocado living room', 'Living room', AVOCADO, ['Scandi'], 774, 1000),
  dream('avocado', 'avokado sofa.png', 'Avocado sofa', 'Living room', AVOCADO, ['Scandi'], 604, 582),
  dream('avocado', 'stoler avokado.png', 'Avocado chairs', 'Living room', AVOCADO, ['Scandi'], 634, 640),
  dream('avocado', 'bord avokado.png', 'Avocado table', 'Living room', AVOCADO, ['Scandi'], 618, 530),
  dream('lavender', 'stue lavendel.png', 'Lavender living room', 'Living room', LAVENDER, ['Vintage'], 452, 512),
  dream('lavender', 'moodboard lavendel.png', 'Lavender moodboard', 'Living room', LAVENDER, ['Vintage'], 492, 840),
  dream('lavender', 'seng lavendel.png', 'Lavender bed', 'Bedroom', LAVENDER, ['Vintage'], 696, 490),
  dream('lavender', 'stue lavedel 2.png', 'Lavender living room 2', 'Living room', LAVENDER, ['Vintage'], 526, 586),
  dream('lavender', 'bord lavedel .png', 'Lavender table', 'Living room', LAVENDER, ['Vintage'], 420, 616),
  dream('lavender', 'lavenel lampe.png', 'Lavender lamp', 'Living room', LAVENDER, ['Vintage'], 418, 648),
  dream('lavender', 'lampe 2 lavendel.png', 'Lavender lamp 2', 'Living room', LAVENDER, ['Vintage'], 394, 524),
  dream('lavender', 'nattbord lavendel.png', 'Lavender bedside table', 'Bedroom', LAVENDER, ['Vintage'], 422, 530),
  dream('lavender', 'bilde lavedel .png', 'Lavender wall art', 'Living room', LAVENDER, ['Vintage'], 398, 246),
  dream('coast', 'stue kyst .png', 'Coastal living room', 'Living room', COAST, ['Japandi', 'Scandi'], 610, 744),
  dream('coast', 'seng kyst.png', 'Coastal bed', 'Bedroom', COAST, ['Japandi', 'Scandi'], 412, 652),
  dream('coast', 'stol nr 2 kyst.png', 'Coastal chair 2', 'Living room', COAST, ['Japandi', 'Scandi'], 1002, 1034),
  dream('coast', 'stol kyst.png', 'Coastal chair', 'Living room', COAST, ['Japandi', 'Scandi'], 372, 270),
  dream('coast', 'bord kyst.png', 'Coastal table', 'Living room', COAST, ['Japandi', 'Scandi'], 454, 282),
  dream('coast', 'lampe kyst.png', 'Coastal lamp', 'Living room', COAST, ['Japandi', 'Scandi'], 368, 428),
  dream('coast', 'lampe kyst 2.png', 'Coastal lamp 2', 'Living room', COAST, ['Japandi', 'Scandi'], 308, 600),
  // Silje's cover for «Pastel vibe» (18.11)
  dream('pastel', 'Bilde uten tittel.png', 'Pastel dining room', 'Dining room', ['n_lily_pad', 'n_lotus', 'n_pistachio'], ['Vintage'], 962, 1042),
];
const dreamIds = (group: string) => DREAM.filter((d) => d.id.startsWith(`d_${group}_`)).map((d) => d.id);
/** the boards with dream room images, first on MyCrib (Silje 18.11) */
export const DREAM_BOARD_IDS = ['b_sea', 'b_fig', 'b_pastel', 'b_avocado'];

export const PRODUCTS: Product[] = [
  { id: 'p_curve_sofa', title: 'Curved velvet sofa', type: 'Sofas', kind: 'sofa', size: [260, 100, 75], color: '#6e2a24', colorName: 'burgundy', price: 24990, natures: ['n_red_leaf', 'n_fig', 'n_owl_wing', 'n_plum_leaf'], styles: ['Bold'], ratio: '4 / 3' },
  { id: 'p_modular_sofa', title: 'Modular sofa, brown', type: 'Sofas', kind: 'sofa', size: [280, 100, 70], color: '#4a2a1e', colorName: 'dark brown', price: 32990, natures: ['n_owl_wing', 'n_protea', 'n_blue_wing', 'n_ammonite'], styles: ['Scandi', 'Vintage'], ratio: '4 / 3' },
  { id: 'p_denim_sofa', title: 'Soft sofa, dusty blue', type: 'Sofas', kind: 'sofa', size: [240, 100, 80], color: '#7f97a8', colorName: 'dusty blue', price: 18990, natures: ['n_blue_wing', 'n_water', 'n_ammonite'], styles: ['Japandi', 'Scandi'], ratio: '4 / 3' },
  { id: 'p_cord_sofa', title: 'Corduroy sofa, brown', type: 'Sofas', kind: 'sofa', size: [230, 95, 75], color: '#3f2419', colorName: 'dark brown', price: 15990, natures: ['n_protea', 'n_pistachio', 'n_owl_wing'], styles: ['Scandi'], ratio: '4 / 3' },
  { id: 'p_blue_chair', title: 'Dining chair, blue velvet', type: 'Chairs', kind: 'chair', size: [60, 58, 75], color: '#8fa6b8', colorName: 'light blue', price: 4990, natures: ['n_blue_wing', 'n_water', 'n_owl_wing'], styles: ['Japandi'], ratio: '1 / 1' },
  { id: 'p_round_chair', title: 'Round armchair, grey blue', type: 'Chairs', kind: 'armchair', size: [85, 85, 75], color: '#5c6a78', colorName: 'grey blue', price: 9990, natures: ['n_blue_wing', 'n_water', 'n_red_leaf'], styles: ['Bold', 'Japandi'], ratio: '1 / 1' },
  { id: 'p_swivel_chair', title: 'Swivel chair, burgundy', type: 'Chairs', kind: 'armchair', size: [80, 80, 72], color: '#5a1a2a', colorName: 'burgundy', price: 11990, natures: ['n_fig', 'n_red_leaf', 'n_plum_leaf', 'n_lotus'], styles: ['Bold', 'Vintage'], ratio: '1 / 1' },
  { id: 'p_stools', title: 'Bar stools, dark oak', type: 'Chairs', kind: 'chair', size: [40, 40, 70], color: '#3f2a1c', colorName: 'dark oak', price: 2490, natures: ['n_bark', 'n_green_fig', 'n_river', 'n_teal_leaf'], styles: ['Japandi', 'Scandi'], ratio: '1 / 1' },
  { id: 'p_stone_table', title: 'Round stone table', type: 'Tables', kind: 'coffeetable', size: [110, 110, 38], color: '#a8804f', colorName: 'travertine', price: 13990, natures: ['n_fungus', 'n_ammonite', 'n_protea', 'n_pistachio'], styles: ['Bold', 'Japandi'], ratio: '4 / 3' },
  { id: 'p_plum_console', title: 'Plum console table', type: 'Storage', kind: 'dresser', size: [110, 38, 82], color: '#4a1f3a', colorName: 'plum', price: 7990, natures: ['n_fig', 'n_plum_leaf', 'n_coleus', 'n_green_fig'], styles: ['Bold', 'Vintage'], ratio: '1 / 1' },
  { id: 'p_paper_lamp', title: 'Pleated pendant lamp', type: 'Lamps', kind: 'lamp', size: [70, 70, 60], color: '#e4dccb', colorName: 'off-white', price: 3490, natures: ['n_lily_pad', 'n_protea', 'n_blue_wing', 'n_lotus'], styles: ['Japandi', 'Scandi'], ratio: '1 / 1' },
  { id: 'p_linen_bed', title: 'Linen bedding, light blue', type: 'Beds', kind: 'bed', size: [160, 200, 45], color: '#a8c0d8', colorName: 'light blue', price: 1990, natures: ['n_blue_wing', 'n_water', 'n_protea'], styles: ['Scandi'], ratio: '1 / 1' },
  { id: 'p_stone_sink', title: 'Stone basin', type: 'Bath', kind: 'other', size: [60, 40, 15], color: '#d9d2c0', colorName: 'natural stone', price: 6490, natures: ['n_bark', 'n_lily_pad', 'n_river', 'n_teal_leaf'], styles: ['Bold', 'Japandi'], ratio: '4 / 3' },
];

/** images that share nature scenes, styles or the type of room with this one, closest first */
export function similarTo(item: Inspo): Inspo[] {
  const shared = (a: string[], b: string[]) => a.filter((x) => b.includes(x)).length;
  const score = (i: Inspo) => shared(i.natures, item.natures) * 2 + shared(i.styles, item.styles) + (i.room === item.room ? 2 : 0);
  return INSPO.filter((i) => i.id !== item.id).sort((a, b) => score(b) - score(a));
}

/** furniture that matches a room image, closest first */
export function productsFor(item: Inspo): Product[] {
  const score = (p: Product) => p.natures.filter((n) => item.natures.includes(n)).length * 2 + p.styles.filter((x) => item.styles.includes(x)).length;
  return PRODUCTS.filter((p) => score(p) > 1).sort((a, b) => score(b) - score(a));
}

/** a product as something that can be tried in a room */
export const toAttachment = (p: Product): Attachment => ({
  name: p.title,
  kind: p.kind,
  width: p.size[0],
  depth: p.size[1],
  height: p.size[2],
  color: p.color,
  colorName: p.colorName,
  source: 'Discover',
  photo: inspoSrc(p.id),
  product: { store: 'Online store', model: p.title, price: p.price, variants: [{ color: p.color, colorName: p.colorName }] },
});

export const inspoSrc = (id: string) => DREAM.find((d) => d.id === id)?.src ?? `/inspo/${id}.jpg`;
export const sceneById = (id: string) => NATURE.find((n) => n.id === id);
/** a room image from the feed or a dream room board */
export const inspoById = (id: string) => INSPO.find((i) => i.id === id) ?? DREAM.find((d) => d.id === id);
/** any saved image: a room from the feed, or a nature image */
export const titleOf = (id: string) => [...INSPO, ...DREAM, ...PRODUCTS].find((i) => i.id === id)?.title ?? sceneById(id)?.name ?? '';

/** images that were replaced may still be saved in a board */
const exists = (id: string) => !!titleOf(id);

// only two ready-made moodboards in this version, so it is easy to see how to make your own (Synne 11.11)
// MyCrib shows two boards: Fig and the blue/brown «Sea blue»; «Deep green» is hidden (Synne 12.11)
const SHOW_SEA_BLUE = true;
// «Deep green» is shown again, so «Your moodboards» has a few more pictures (Silje 17.11)
// the three dream room boards that were merged into Fig, Deep green and Sea blue (Silje 18.11), in case a browser saved them
// MyCrib shows only Sea blue and Fig (Silje 18.11); the other example boards are hidden, not deleted: take an id out to bring it back
const HIDDEN_BOARDS: string[] = ['b_dream_fig', 'b_dream_avocado', 'b_dream_coast', 'b_green', 'b_dream_lavender', 'b_oxblood', 'b_brown'];
const DEFAULT_BOARDS: Moodboard[] = [
  // Silje's dream rooms (18.11) are merged into the boards we had; the first photo is the one on the card on MyCrib.
  // Fig + Fig dream room: Fig's own cover stays
  { id: 'b_fig', name: 'Spicy inspo vibe', items: ['r_plum_hall', ...dreamIds('fig'), 'r_fan_door', 'r_plum_sink', 'n_fig'] },
  // Deep green + Avocado dream room: the green sofa on the card
  { id: 'b_green', name: 'Deep green', items: [...dreamIds('avocado'), 'r_green_tiles', 'r_green_kitchen', 'r_green_hall', 'n_bark'] },
  // Lavender dream room stays on its own
  { id: 'b_dream_lavender', name: 'Lavender dream room', items: dreamIds('lavender') },
  // Sea blue + Coast dream room: the coastal living room on the card
  // «Sea blue» (added 11.11) was hidden for a while: it sat right under the + on MyCrib (Synne 12.11). Flip SHOW_SEA_BLUE to hide it
  ...(SHOW_SEA_BLUE ? [{ id: 'b_sea', name: 'Inspo chill vibe', items: [...dreamIds('coast'), 'r_denim_sofa', 'r_linen_bed', 'r_blue_chairs', 'n_water'] }] : []),
  // «Pastel vibe»: Silje's pastel dining room on the card, then all the lavender images (Silje 18.11)
  { id: 'b_pastel', name: 'Pastel vibe', items: [...dreamIds('pastel'), ...dreamIds('lavender')] },
  // «Avocado»: all the avocado images, Silje's avocado living room on the card (Silje 18.11)
  { id: 'b_avocado', name: 'Avocado', items: dreamIds('avocado') },
  // two more example boards, so «Your moodboards» has more pictures (Silje 17.11) – photos already in the app
  { id: 'b_oxblood', name: 'Oxblood', items: ['r_burgundy_sofa', 'n_red_leaf', 'r_blue_lounge', 'r_navy_bed'] },
  { id: 'b_brown', name: 'Warm brown', items: ['r_corduroy', 'n_protea', 'r_brown_modular', 'r_dark_bed'] },
];

/** the boards, also in states saved before moodboards existed */
const allBoards = (s: AppState) => {
  const own = s.boards ?? [];
  // the example boards also show up in states saved before they were added
  const examples = DEFAULT_BOARDS.filter((b) => !own.some((x) => x.id === b.id));
  return [...own, ...examples].map(({ roomId, ...b }) => ({ ...b, roomIds: b.roomIds ?? (roomId ? [roomId] : []), items: b.items.filter(exists) }));
};
// Sea blue is also hidden when it is already saved in the browser (Synne 12.11)
export const boardsOf = (s: AppState) => allBoards(s).filter((b) => !b.deleted && (SHOW_SEA_BLUE || b.id !== 'b_sea') && !HIDDEN_BOARDS.includes(b.id));
export const editBoards = (d: AppState) => {
  d.boards = allBoards(d);
  return d.boards;
};

const STOP_WORDS = ['ideas', 'with', 'and', 'for', 'the', 'in', 'a'];

/** every word of the search must be found, so whole phrases work: «dark green bathroom» */
export const matches = (text: string, query: string) => {
  const t = text.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter((w) => w && !STOP_WORDS.includes(w)).every((w) => t.includes(w));
};
const moods = (natures: string[]) => natures.flatMap((n) => [sceneById(n)?.name, sceneById(n)?.mood]).join(' ');
export const roomText = (i: Inspo) => [i.title, i.room, ...i.styles, moods(i.natures)].join(' ');
export const productText = (p: Product) => [p.title, p.type, p.colorName, 'furniture', ...p.styles, moods(p.natures)].join(' ');

const SEARCHES = [
  'Dark green bathroom',
  'Moss green kitchen',
  'Burgundy living room',
  'Plum hallway ideas',
  'Japandi bedroom ideas',
  'Blue sofa living room',
  'Stone kitchen island',
  'Amber glass bathroom',
  'Vintage dark wood hallway',
  'Scandi brown sofa',
  'Copper and stone kitchen',
  'Velvet sofas',
];

/**
 * Simulated «for you» searches: the phrases whose images are closest to what the user has saved.
 * While typing, the phrases that contain the text.
 */
export function searchSuggestions(s: AppState, typed: string): string[] {
  const liked = allSaved(s).flatMap((id) => (sceneById(id) ? [id] : [...INSPO, ...DREAM, ...PRODUCTS].find((i) => i.id === id)?.natures ?? []));
  const score = (q: string) =>
    [...INSPO.filter((i) => matches(roomText(i), q)), ...PRODUCTS.filter((p) => matches(productText(p), q))].flatMap((i) => i.natures).filter((n) => liked.includes(n)).length;
  const t = typed.trim().toLowerCase();
  return SEARCHES.filter((q) => q.toLowerCase().includes(t))
    .sort((a, b) => score(b) - score(a))
    .slice(0, 6);
}

/** the moodboard a room uses */
export const boardFor = (s: AppState, roomId: string) => boardsOf(s).find((b) => b.roomIds.includes(roomId));

/** connect a board to a room, or take it away. A room can use several boards, and a board several rooms (Synne 14.11),
 *  so other boards are left alone (before 14.11 the room left any other board it used). */
export function setBoardRoom(d: AppState, boardId: string, roomId: string, on: boolean) {
  const b = editBoards(d).find((x) => x.id === boardId);
  if (!b) return;
  b.roomIds = (b.roomIds ?? []).filter((r) => r !== roomId);
  if (on) b.roomIds.push(roomId);
}

/** rooms that match a board but are not on it, closest first; an empty board shows everything */
export function moreLike(b: Moodboard): Inspo[] {
  const natures = b.items.flatMap((id) => (sceneById(id) ? [id] : [...INSPO, ...DREAM, ...PRODUCTS].find((i) => i.id === id)?.natures ?? []));
  const score = (i: Inspo) => i.natures.filter((n) => natures.includes(n)).length;
  if (!natures.length) return INSPO;
  return INSPO.filter((i) => !b.items.includes(i.id) && score(i) > 0).sort((x, y) => score(y) - score(x));
}

/** everything saved, on a board or not, newest first */
export const allSaved = (s: AppState) => [...new Set([...(s.saved ?? []), ...boardsOf(s).flatMap((b) => b.items)].filter(exists).reverse())];

/** the cover of a board (Figma, Synne 06.11): the nature image big, then two rooms */
export function boardCover(b: Moodboard): (string | undefined)[] {
  const nature = b.items.filter((id) => sceneById(id));
  const rest = b.items.filter((id) => !sceneById(id));
  const order = [...nature.slice(0, 1), ...rest, ...nature.slice(1)];
  return [order[0], order[1], order[2]];
}

/** the nature scene a board leans towards: the one most of its images match */
export function boardScene(b: Moodboard): NatureScene {
  const count = new Map<string, number>();
  const bump = (id: string) => count.set(id, (count.get(id) ?? 0) + 1);
  for (const id of b.items) {
    if (sceneById(id)) bump(id);
    [...INSPO, ...DREAM, ...PRODUCTS].find((i) => i.id === id)?.natures.forEach(bump);
  }
  const top = [...count].sort((x, y) => y[1] - x[1])[0]?.[0];
  return sceneById(top ?? '') ?? NATURE[0];
}
