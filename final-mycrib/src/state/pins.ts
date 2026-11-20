import type { Pin } from './types';

/** Simulated Pinterest catalogue. Prompts are written so they hit the scripted AI rules. */
export const PIN_CATALOG: (Pin & { tags: string })[] = [
  { id: 'p_warm', title: 'Warm Scandinavian living room', prompt: 'Make the room warmer, like the inspiration photo', tags: 'living room warm scandinavian light wood' },
  { id: 'p_leather', title: 'Dark brown leather sofa', prompt: 'Make the sofa dark brown', tags: 'sofa leather brown dark' },
  { id: 'p_zebra', title: 'Zebra print sofa', prompt: 'Make the sofa zebra', tags: 'sofa pattern zebra statement' },
  { id: 'p_airy', title: 'Light and airy', prompt: 'Make the sofa beige', tags: 'light beige airy minimalist' },
  { id: 'p_green', title: 'Green velvet sofa', prompt: 'Make the sofa green', tags: 'sofa green velvet colour' },
  { id: 'p_blue', title: 'Calm blue', prompt: 'Make the sofa blue', tags: 'blue calm sofa colour' },
  { id: 'p_reading', title: 'Reading nook with armchair', prompt: 'Add the armchair', tags: 'armchair reading nook corner' },
  { id: 'p_lamp', title: 'Brass floor lamp', prompt: 'Add the floor lamp', tags: 'lamp light brass floor lamp' },
  { id: 'p_shelf', title: 'Bookshelf as room divider', prompt: 'Add the bookshelf', tags: 'shelf bookshelf storage' },
  { id: 'p_terra', title: 'Terracotta and wood', prompt: 'Make the sofa terracotta', tags: 'terracotta warm earth tones' },
  { id: 'p_black', title: 'Black and graphic', prompt: 'Make the sofa black', tags: 'black graphic modern contrast' },
  { id: 'p_japandi', title: 'Japandi bedroom', prompt: 'Make the room warmer', tags: 'japandi bedroom calm wood bed' },
];

export const toPin = ({ id, title, prompt }: Pin): Pin => ({ id, title, prompt });
