// Simulated product catalogue: what the AI "recognises" from photos, and what it suggests as alternatives.
import type { Attachment, ColorVariant, FurnitureKind, ProductInfo } from './types';

const v = (color: string, colorName: string): ColorVariant => ({ color, colorName });

const SOFA_COLORS = [v('#9da3ab', 'light grey'), v('#2e2e2e', 'black'), v('#e8e2d6', 'off-white'), v('#5b3a29', 'dark brown')];

export const VEDBY: ProductInfo = { store: 'JYSK', model: 'VEDBY', price: 4999, variants: SOFA_COLORS };

/** The sofa from the main test flow: «Sofa, 3-seater, 220 × 90 × 80 cm», recognised as a JYSK product. */
export const SOFA_VEDBY: Attachment = {
  name: 'Sofa, 3-seater',
  kind: 'sofa',
  width: 220,
  depth: 90,
  height: 80,
  color: '#9da3ab',
  colorName: 'light grey',
  source: 'photo',
  product: VEDBY,
};

const item = (
  name: string,
  kind: FurnitureKind,
  width: number,
  depth: number,
  height: number,
  product: ProductInfo,
): Attachment => ({ name, kind, width, depth, height, color: product.variants[0].color, colorName: product.variants[0].colorName, source: 'suggestion', product });

/** Alternatives the AI can suggest, per furniture type. */
export const SUGGESTIONS: Attachment[] = [
  { ...SOFA_VEDBY, source: 'suggestion' },
  item('Sofa, 3-seater', 'sofa', 210, 92, 85, { store: 'IKEA', model: 'KIVIK', price: 6495, variants: [v('#d9c7a7', 'beige'), v('#2e2e2e', 'black'), v('#6f8a6a', 'green')] }),
  item('Sofa, 2-seater', 'sofa', 180, 85, 78, { store: 'JYSK', model: 'KARE', price: 4499, variants: [v('#d9c7a7', 'beige'), v('#6f8a6a', 'green'), v('#2e2e2e', 'black')] }),
  item('Sofa, 3-seater', 'sofa', 200, 88, 82, { store: 'IKEA', model: 'LANDSKRONA', price: 7495, variants: [v('#5a7290', 'blue'), v('#8a919c', 'grey'), v('#5b3a29', 'dark brown')] }),
  item('Sofa with chaise', 'sofa', 240, 155, 80, { store: 'Bohus', model: 'MILANO', price: 12990, variants: [v('#9da3ab', 'light grey'), v('#b5603f', 'terracotta')] }),
  item('Modular sofa', 'sofa', 230, 95, 70, { store: 'IKEA', model: 'SÖDERHAMN', price: 8995, variants: [v('#f2f0eb', 'off-white'), v('#8a919c', 'grey')] }),
  item('Armchair', 'armchair', 75, 80, 90, { store: 'JYSK', model: 'ULLERUP', price: 1999, variants: [v('#b08d6a', 'cognac'), v('#2e2e2e', 'black'), v('zebra', 'zebra')] }),
  item('Armchair', 'armchair', 70, 76, 98, { store: 'IKEA', model: 'STRANDMON', price: 2995, variants: [v('#6f8a6a', 'green'), v('#d9c7a7', 'beige')] }),
  item('Armchair', 'armchair', 82, 84, 76, { store: 'Bohus', model: 'BOLLA', price: 5490, variants: [v('#d9c7a7', 'bouclé'), v('#5b3a29', 'dark brown')] }),
  // real coffee tables from IKEA, picked by Rathi for the suggestions next to the scanned tables (sizes and prices from
  // ikea.com/no, 11.11.2026). The photo is the product photo, cut out; each has its own model in 3D and 360.
  { ...item('Tonstad coffee table', 'coffeetable', 84, 82, 35, { store: 'IKEA', model: 'TONSTAD', price: 1995, url: 'https://www.ikea.com/no/no/p/tonstad-bord-eikefiner-10489311/', variants: [v('#c49a62', 'oak veneer')] }), photo: '/products/tonstad.png' },
  { ...item('Vittsjö coffee table', 'coffeetable', 75, 75, 45, { store: 'IKEA', model: 'VITTSJÖ', price: 799, url: 'https://www.ikea.com/no/no/p/vittsjoe-bord-lys-beige-glass-30604348/', variants: [v('#d9d1c1', 'light beige/glass')] }), photo: '/products/vittsjo.png', shape: 'round' },
  { ...item('Holmerud coffee table', 'coffeetable', 90, 55, 40, { store: 'IKEA', model: 'HOLMERUD', price: 799, url: 'https://www.ikea.com/no/no/p/holmerud-bord-mork-brun-00541418/', variants: [v('#4b3b30', 'dark brown')] }), photo: '/products/holmerud.png' },
  item('Dining table', 'diningtable', 140, 80, 75, { store: 'JYSK', model: 'ROSKILDE', price: 2999, variants: [v('#b89b74', 'oak'), v('#f2f0eb', 'white')] }),
  item('TV bench', 'tvbench', 180, 40, 45, { store: 'IKEA', model: 'BESTÅ', price: 2495, variants: [v('#6b6b6b', 'dark grey'), v('#f2f0eb', 'white')] }),
  item('Bed', 'bed', 160, 200, 45, { store: 'JYSK', model: 'GOLD F110', price: 8999, variants: [v('#e0dad0', 'off-white'), v('#8a919c', 'grey')] }),
  item('Dresser', 'dresser', 80, 40, 90, { store: 'JYSK', model: 'LIMFJORDEN', price: 1799, variants: [v('#a68b6d', 'walnut'), v('#f2f0eb', 'white')] }),
  item('Dining chair', 'chair', 47, 52, 82, { store: 'IKEA', model: 'ODGER', price: 799, variants: [v('#d3c7b3', 'light wood'), v('#2e2e2e', 'black')] }),
];

export const suggestionsFor = (kind: FurnitureKind) => SUGGESTIONS.filter((s) => s.kind === kind);

export const nok = (n: number) => `${n.toLocaleString('nb-NO')} NOK`;
