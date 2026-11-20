// «If nature says it fits» (07.11): colour palettes taken from nature photos (public/nature), tried out in the living room.
// The AI is still scripted: each palette has its own reply, named colours and pre-made photos of the living room.
import type { PanoSource } from '../components/PanoramaView';

/** How brave: from the room as it is (Beige) to every surface in the palette (All in). */
export type BraveStep = 'beige' | 'touch' | 'statement' | 'allIn';
export const BRAVE_STEPS: { id: BraveStep; label: string }[] = [
  { id: 'beige', label: 'Beige' },
  { id: 'touch', label: 'A touch' },
  { id: 'statement', label: 'Statement' },
  { id: 'allIn', label: 'All in' },
];

export interface NatureColor {
  /** named after where it came from in the photo, not a colour code */
  name: string;
  hex: string;
  /** where it goes in the room */
  role: string;
}

export interface NaturePalette {
  id: string;
  name: string;
  /** the nature photo */
  photo: string;
  /** the photo has no plain nature shot (orchid): zoom in on the painting instead */
  focus?: { x: number; y: number; zoom: number };
  /** the AI's reply when the photo is sent */
  reply: string;
  colors: NatureColor[];
  /** pre-made photos of the living room; a step without a photo can't be chosen yet */
  steps: Partial<Record<Exclude<BraveStep, 'beige'>, { image: string; changes: string; pano?: PanoSource }>>;
}

const n = (file: string) => '/nature/' + encodeURIComponent(file);
// Each palette's first step is a 360° panorama of the living room in those colours (Synne 17.11, for the stand):
// full 2 : 1 photos (360° around, ±90° up and down), the view starts at the sofa in the middle of the photo.

export const NATURE_PALETTES: NaturePalette[] = [
  {
    id: 'orchid',
    name: 'Orchid',
    photo: n('orkide enda flere farger .jpg'),
    focus: { x: 35, y: 33, zoom: 3.2 },
    reply: 'This orchid puts deep plum right next to gold and pink. Here’s how that fits your living room:',
    colors: [
      { name: 'Orchid plum', hex: '#5e1a3a', role: 'Sofa' },
      { name: 'Petal pink', hex: '#c55a9a', role: 'Curtains' },
      { name: 'Petal gold', hex: '#e39a32', role: 'Accent' },
      { name: 'Stem olive', hex: '#6b6a2c', role: 'Contrast' },
    ],
    steps: {
      touch: { image: n('orkide .jpg'), changes: 'Cushions, throw and flowers in plum and orange. The sofa stays light.' },
      statement: { image: n('orkide mest rosa.jpg'), changes: 'Sofa → plum velvet. Curtains → petal pink.' },
      allIn: { image: n('orkide enda flere farger .jpg'), changes: 'Plum velvet sofa, olive curtains and an orange cushion as the accent.' },
    },
  },
  {
    id: 'fig',
    name: 'Fig',
    photo: n('fiken.jpg'),
    reply: 'Figs pair deep plum with warm coral. Here’s how that fits your living room:',
    colors: [
      { name: 'Fig cloth', hex: '#6e5677', role: 'Walls' },
      { name: 'Fig skin', hex: '#3d2a45', role: 'Cushions' },
      { name: 'Fig flesh', hex: '#c8503f', role: 'Accent' },
      { name: 'Pale rind', hex: '#e6dcc6', role: 'Sofa' },
    ],
    steps: {
      statement: { image: n('fiken stue.jpg'), changes: 'Walls → fig mauve. Cushions and throw → plum, with one coral cushion.', pano: { src: n('panorama fiken stand.jpg'), span: 360, lat: 90, yaw: 0 } },
    },
  },
  {
    id: 'avocado',
    name: 'Avocado',
    photo: n('avokado.jpg'),
    reply: 'Avocado goes from deep olive to soft yellow-green, with a warm brown pit. Here’s how that fits your living room:',
    colors: [
      { name: 'Avocado skin', hex: '#4b5a2a', role: 'Sofa' },
      { name: 'Avocado flesh', hex: '#cfcf86', role: 'Curtains' },
      { name: 'Pit brown', hex: '#6b3a24', role: 'Cushions' },
      { name: 'Linen', hex: '#ece4d6', role: 'Throw' },
    ],
    steps: {
      touch: { image: n('avokado .jpg'), changes: 'Green cushions, throw and curtains. The sofa stays light.' },
      statement: { image: n('avokado bilde .jpg'), changes: 'Sofa → olive velvet. Curtains → avocado green.', pano: { src: n('panorama avokado stand.jpg'), span: 360, lat: 90, yaw: 0 } },
    },
  },
  {
    id: 'coast',
    name: 'Coast',
    photo: n('costal.jpg'),
    reply: 'The coast mixes sea blue with moss green and white foam. Here’s how that fits your living room:',
    colors: [
      { name: 'Sea blue', hex: '#3f6f9a', role: 'Sofa' },
      { name: 'Moss', hex: '#4f6a3a', role: 'Curtains' },
      { name: 'Sea foam', hex: '#eef0ec', role: 'Cushions' },
      { name: 'Driftwood', hex: '#7a5a3c', role: 'Table' },
    ],
    steps: {
      allIn: {
        image: n('costal stue .jpg'),
        changes: 'Sofa → sea blue. Curtains → moss green. The coast on the wall.',
        // the whole living room in the coast palette, to look around in all the way (Synne 07.11). The photo is 3:1
        // (360° × ±60°, like the room's own). Its ends don't quite meet (fridge / TV wall), so they are faded together.
        // the stand version (Synne 17.11): a full 360° × 180° photo, starting at the sofa (was «panorama kyst.jpg», 3:1)
        pano: { src: n('panorama kyst stand.jpg'), span: 360, lat: 90, yaw: 0 },
      },
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    photo: n('lavendel .jpg'),
    reply: 'Lavender grows on sage-green stems. Here’s how that fits your living room:',
    colors: [
      { name: 'Sage stem', hex: '#8a9a78', role: 'Walls' },
      { name: 'Lavender', hex: '#8a72b8', role: 'Cushions' },
      { name: 'Leaf', hex: '#5e7a4a', role: 'Throw' },
      { name: 'Morning haze', hex: '#e9e4dc', role: 'Sofa' },
    ],
    steps: {
      statement: { image: n('Lavendelro i moderne stue.jpg'), changes: 'Walls → sage green. Cushions and flowers → lavender.', pano: { src: n('panorama lavendel stand.jpg'), span: 360, lat: 90, yaw: 0 } },
    },
  },
];

export const naturePalette = (id: string | undefined) => [...NATURE_PALETTES, AMETHYST].find((p) => p.id === id);

/** the first step that has a photo, after Beige: where the slider starts */
export function firstStep(p: NaturePalette): BraveStep {
  return (['statement', 'touch', 'allIn'] as const).find((s) => p.steps[s]) ?? 'beige';
}

/** the photo for a step. Beige is the least colourful photo with the colour taken out (shown with a filter). */
export function stepImage(p: NaturePalette, step: BraveStep): string {
  if (step !== 'beige' && p.steps[step]) return p.steps[step]!.image;
  return (p.steps.touch ?? p.steps.statement ?? p.steps.allIn)!.image;
}

export const stepLabel = (step: BraveStep) => BRAVE_STEPS.find((s) => s.id === step)!.label;

/**
 * «Amethyst Stone» (Synne 07.11): its own page, not the chat/360° flow of the cards above. Synne's own living room
 * in three levels of colour from the amethyst – her photos, as they are.
 */
export const AMETHYST: NaturePalette = {
  id: 'amethyst',
  name: 'Amethyst Stone',
  photo: n('steiiinnnnn.jpg'),
  reply: 'Amethyst glows in soft violet next to green agate. Here’s how that fits your living room:',
  colors: [
    { name: 'Amethyst', hex: '#8e6fb5', role: 'Sofa' },
    { name: 'Crystal', hex: '#d9cdea', role: 'Light' },
    { name: 'Agate green', hex: '#3f6b55', role: 'Art' },
    { name: 'Quartz rust', hex: '#c58a5e', role: 'Accent' },
  ],
  // the same room as lavender (Synne 17.11): the lavender panorama, opened in the room like the other photos
  steps: {
    statement: { image: n('Lavendelro i moderne stue.jpg'), changes: 'Sofa → sage green. Throw, cushions and lamp → violet.', pano: { src: n('panorama lavendel stand.jpg'), span: 360, lat: 90, yaw: 0 } },
  },
};

/** Amethyst on its own page, «How brave are you?» (07.11). Off since 17.11: it opens in the room like the others. */
export const AMETHYST_OWN_PAGE = false;

export const AMETHYST_LEVELS = [
  { id: 'beige', label: 'Beige', image: n('Synne sin stue .jpg') },
  { id: 'touch', label: 'A touch', image: n('stein 1.jpg') },
  { id: 'allIn', label: 'All in', image: n('stein 2.jpg') },
] as const;
