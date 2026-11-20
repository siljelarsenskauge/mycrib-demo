import type { Pin } from './types';

/** Simulated Pinterest catalogue. Prompts are written so they hit the scripted AI rules. */
export const PIN_CATALOG: (Pin & { tags: string })[] = [
  { id: 'p_warm', title: 'Varm skandinavisk stue', prompt: 'Gjør rommet varmere, som på inspirasjonsbildet', tags: 'stue varm skandinavisk lys tre' },
  { id: 'p_leather', title: 'Mørk brun skinnsofa', prompt: 'Gjør sofaen mørk brun', tags: 'sofa skinn brun mørk' },
  { id: 'p_zebra', title: 'Sofa i zebra-mønster', prompt: 'Gjør sofaen zebra', tags: 'sofa mønster zebra statement' },
  { id: 'p_airy', title: 'Lys og luftig', prompt: 'Gjør sofaen beige', tags: 'lys beige luftig minimalistisk' },
  { id: 'p_green', title: 'Grønn velursofa', prompt: 'Gjør sofaen grønn', tags: 'sofa grønn velur farge' },
  { id: 'p_blue', title: 'Rolig blått', prompt: 'Gjør sofaen blå', tags: 'blå rolig sofa farge' },
  { id: 'p_reading', title: 'Lesekrok med lenestol', prompt: 'Legg til lenestolen', tags: 'lenestol lesekrok hjørne' },
  { id: 'p_lamp', title: 'Gulvlampe i messing', prompt: 'Legg til gulvlampe', tags: 'lampe lys messing gulvlampe' },
  { id: 'p_shelf', title: 'Bokhylle som romdeler', prompt: 'Legg til bokhylle', tags: 'hylle bokhylle oppbevaring' },
  { id: 'p_terra', title: 'Terrakotta og tre', prompt: 'Gjør sofaen terrakotta', tags: 'terrakotta varm jordfarger' },
  { id: 'p_black', title: 'Svart og grafisk', prompt: 'Gjør sofaen svart', tags: 'svart grafisk moderne kontrast' },
  { id: 'p_japandi', title: 'Japandi soverom', prompt: 'Gjør rommet varmere', tags: 'japandi soverom rolig tre seng' },
];

export const toPin = ({ id, title, prompt }: Pin): Pin => ({ id, title, prompt });
