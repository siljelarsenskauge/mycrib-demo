// Simulated product catalogue: what the AI "recognises" from photos, and what it suggests as alternatives.
import type { Attachment, ColorVariant, FurnitureKind, ProductInfo } from './types';

const v = (color: string, colorName: string): ColorVariant => ({ color, colorName });

const SOFA_COLORS = [v('#9da3ab', 'lys grå'), v('#2e2e2e', 'svart'), v('zebra', 'zebra'), v('#5b3a29', 'mørk brun')];

export const VEDBY: ProductInfo = { store: 'JYSK', model: 'VEDBY', price: 6999, variants: SOFA_COLORS };

/** The sofa from the main test flow: «Sofa, 3-seter, 220 × 90 × 80 cm», recognised as a JYSK product. */
export const SOFA_VEDBY: Attachment = {
  name: 'Sofa, 3-seter',
  kind: 'sofa',
  width: 220,
  depth: 90,
  height: 80,
  color: '#9da3ab',
  colorName: 'lys grå',
  source: 'bilde',
  product: VEDBY,
};

const item = (
  name: string,
  kind: FurnitureKind,
  width: number,
  depth: number,
  height: number,
  product: ProductInfo,
): Attachment => ({ name, kind, width, depth, height, color: product.variants[0].color, colorName: product.variants[0].colorName, source: 'forslag', product });

/** Alternatives the AI can suggest, per furniture type. */
export const SUGGESTIONS: Attachment[] = [
  { ...SOFA_VEDBY, source: 'forslag' },
  item('Sofa, 2-seter', 'sofa', 180, 85, 78, { store: 'JYSK', model: 'KARE', price: 4499, variants: [v('#d9c7a7', 'beige'), v('#6f8a6a', 'grønn'), v('#2e2e2e', 'svart')] }),
  item('Sofa, 3-seter', 'sofa', 200, 88, 82, { store: 'IKEA', model: 'LANDSKRONA', price: 7495, variants: [v('#5a7290', 'blå'), v('#8a919c', 'grå'), v('#5b3a29', 'mørk brun')] }),
  item('Sofa med sjeselong', 'sofa', 240, 155, 80, { store: 'Bohus', model: 'MILANO', price: 12990, variants: [v('#9da3ab', 'lys grå'), v('#b5603f', 'terrakotta')] }),
  item('Sofa, 3-seter', 'sofa', 210, 92, 85, { store: 'Skeidar', model: 'OSLO', price: 9990, variants: [v('#d9c7a7', 'beige'), v('#2e2e2e', 'svart'), v('#6f8a6a', 'grønn')] }),
  item('Modulsofa', 'sofa', 230, 95, 70, { store: 'IKEA', model: 'SÖDERHAMN', price: 8995, variants: [v('#f2f0eb', 'offwhite'), v('#8a919c', 'grå')] }),
  item('Lenestol', 'armchair', 75, 80, 90, { store: 'JYSK', model: 'ULLERUP', price: 1999, variants: [v('#b08d6a', 'konjakk'), v('#2e2e2e', 'svart'), v('zebra', 'zebra')] }),
  item('Lenestol', 'armchair', 70, 76, 98, { store: 'IKEA', model: 'STRANDMON', price: 2995, variants: [v('#6f8a6a', 'grønn'), v('#d9c7a7', 'beige')] }),
  item('Lenestol', 'armchair', 82, 84, 76, { store: 'Bohus', model: 'BOLLA', price: 5490, variants: [v('#d9c7a7', 'bouclé'), v('#5b3a29', 'mørk brun')] }),
  item('Salongbord, rundt', 'coffeetable', 80, 80, 42, { store: 'JYSK', model: 'GADBJERG', price: 1299, variants: [v('#c9b79c', 'lys eik'), v('#2e2e2e', 'svart')] }),
  item('Salongbord', 'coffeetable', 110, 55, 40, { store: 'IKEA', model: 'LISTERBY', price: 1995, variants: [v('#b89b74', 'eik'), v('#5b3a29', 'brunbeiset')] }),
  item('Salongbord, ovalt', 'coffeetable', 120, 65, 38, { store: 'Bohus', model: 'NOVA', price: 3490, variants: [v('#2e2e2e', 'svart'), v('#b89b74', 'eik')] }),
  item('Spisebord', 'diningtable', 140, 80, 75, { store: 'JYSK', model: 'ROSKILDE', price: 2999, variants: [v('#b89b74', 'eik'), v('#f2f0eb', 'hvit')] }),
  item('TV-benk', 'tvbench', 180, 40, 45, { store: 'IKEA', model: 'BESTÅ', price: 2495, variants: [v('#6b6b6b', 'mørk grå'), v('#f2f0eb', 'hvit')] }),
  item('Seng', 'bed', 160, 200, 45, { store: 'JYSK', model: 'GOLD F110', price: 8999, variants: [v('#e0dad0', 'offwhite'), v('#8a919c', 'grå')] }),
  item('Kommode', 'dresser', 80, 40, 90, { store: 'JYSK', model: 'LIMFJORDEN', price: 1799, variants: [v('#a68b6d', 'valnøtt'), v('#f2f0eb', 'hvit')] }),
  item('Spisestol', 'chair', 47, 52, 82, { store: 'IKEA', model: 'ODGER', price: 799, variants: [v('#d3c7b3', 'lys tre'), v('#2e2e2e', 'svart')] }),
];

export const suggestionsFor = (kind: FurnitureKind) => SUGGESTIONS.filter((s) => s.kind === kind);

export const kr = (n: number) => `${n.toLocaleString('nb-NO')} kr`;
