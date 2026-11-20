// The interior expert (Claude) in the chat – Rathi 11.11.
// The scripted AI (ai.ts) still makes every change in the room, so a demo can't end up in a strange state.
// Claude only answers what ai.ts doesn't understand (advice, taste, free questions), and only where Claude is
// available: inside a claude.ai artifact (the «sample» capability). Everywhere else – the group's app on
// localhost – window.claude doesn't exist and the chat works exactly as before.
import { tightestPassage } from './geometry';
import type { AppState, Chat, Furniture, Room } from './types';

type Sample = (
  input: string | { role: 'user' | 'assistant'; content: string }[],
  options?: { onText?: (u: { text: string; delta: string }) => void; signal?: AbortSignal; cache?: boolean; modelTier?: 'quick' | 'default' | 'complex' },
) => Promise<{ text: string; truncated: boolean }>;

let sample: Sample | null = null;
let gone = false;

// look for Claude once, when the app starts; nothing is asked of the viewer until the first question
try {
  const claude = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
  claude
    ?.use?.('sample')
    .then((s) => {
      if (typeof s === 'function') sample = s as Sample;
    })
    .catch(() => {});
} catch {
  /* not inside an artifact */
}

/** Can Claude answer here? (false on localhost, before Claude is ready, and after the viewer said no) */
export const expertReady = () => !!sample && !gone;

/** The prompt's version, saved with every answer (Rathi 11.11). v3.4 = v3.3 from the Stueplanlegger (09.10), fitted to
 *  MyCrib's chat: walkways instead of the rug, other questions answered freely, answers and headings in the user's
 *  language; kept in Norwegian, so it can be compared with v3.3. v3.5 = the same, but the profile is the styles the user
 *  picked (in the profile and for the room), not the moodboard, which the app doesn't show. */
export const PROMPT_VERSION = 'v3.5 (MyCrib)';

const RULES = `Du er KI-interiøreksperten i MyCrib, en romplanlegger. Du hjelper folk
som innreder sin første bolig med å vurdere om et møbel passer i rommet.

DU FÅR
- ROMDATA: mål, møbler med mål, farge og plassering, og avstander.
  Tallene er regnet ut av appen og er riktige.
- Stilene brukeren har valgt, i profilen og for rommet (brukerens smak).
- Hvilket bord chatten handler om, og de siste meldingene.

NÅR BRUKEREN SPØR HVA DU SYNES OM ET MØBEL
Svar med nøyaktig tre punkter, én kort setning hver (maks 20 ord):
• Plass: om størrelse og plassering fungerer (gangvei 80 cm er
  komfortabelt, under 60 cm er trangt). Ikke oppgi hvor mange cm
  møbelet bør flyttes.
• Stil: om farge, materiale og form passer rommet og stilene.
• Tips: ett konkret forslag hvis noe kan bli bedre.
  eller
• Spørsmål: … [alternativ] [alternativ] [alternativ]

NÅR VALGET AVVIKER FRA PROFILEN
Profilen er et utgangspunkt, ikke en fasit. Smaken kan utvikle seg, så
du skal ikke bestemme hva brukeren velger. Men vær ærlig:
- I Stil sier du nøytralt og konkret hva som avviker (farge, mønster,
  materiale), uten å rose eller kritisere avviket.
- Plass vurderes som ellers, uavhengig av stilen.
- Bytt ut Tips med et kort spørsmål om hvordan brukeren tenker om
  valget, med tre alternativer i hakeparenteser. Hvert alternativ skal
  bare kunne forstås på én måte og er skrevet som noe brukeren selv sier:
  [Jeg valgte det for å prøve noe nytt] [Jeg er usikker]
  [Vis meg andre bord]
- Ikke påstå noe som ikke står i informasjonen, for eksempel om pris.
Hvis møbelet passer med profilen, bruker du Tips som vanlig.

ANDRE SPØRSMÅL
Svar med høyst tre korte setninger, etter de samme prinsippene.
Du kan ikke endre rommet selv. Si hva brukeren kan skrive
(«flytt bordet til venstre», «roter bordet»), eller at de kan trykke
på et møbel og dra det.

TONE OG FORMAT
Vennlig og enkel. Svaret vises på mobil og skal kunne leses på noen
sekunder. Svar på brukerens språk, også overskriftene og alternativene
(på engelsk: Space, Style, Tip, Question, og for eksempel
[I chose it to try something new] [I'm not sure] [Show me other tables]).
Skriv bare overskriftene, ikke forklaringene i parentes. Ikke skriv noe
før eller etter punktene. Ingen annen formatering.`;

const cm = (n: number) => `${Math.round(n)} cm`;

function describeItem(room: Room, items: Furniture[], f: Furniture) {
  const w = f.rot === 90 ? f.depth : f.width;
  const d = f.rot === 90 ? f.width : f.depth;
  const p = f.product ? `, ${f.product.store} ${f.product.model} (${f.product.price} NOK)` : '';
  const near = tightestPassage(room, items, f);
  const gap = near?.target ? `, closest: ${cm(near.dist)} to the ${near.target.name.toLowerCase()}` : '';
  return `- ${f.name} (${f.kind}${f.shape === 'round' ? ', round' : ''}), ${f.width} × ${f.depth} × ${f.height} cm, ${f.colorName}${p}; at x ${cm(f.x)}–${cm(f.x + w)}, y ${cm(f.y)}–${cm(f.y + d)}${f.locked ? ', fixed' : ''}${gap}`;
}

/** Everything Claude gets to know about the room – the same facts the user sees in 2D, 3D and 360. */
function roomData(d: AppState, room: Room, chat: Chat, focus?: Furniture) {
  const items = room.furniture;
  const styles = room.styles ?? (room.style ? [room.style] : []);
  const profileStyles = d.profile?.styles ?? [];
  const lines = [
    `Room: ${room.name}, ${room.width} × ${room.depth} cm${room.height ? `, ceiling ${room.height} cm` : ''}. x runs left to right, y from the window wall (y 0) into the room.`,
    `Window: ${room.window.wall} wall, ${room.window.length} cm wide${room.window.sill === 0 ? ' (balcony door)' : ''}. Door: ${room.door.wall} wall.`,
    // only what the user has chosen and can see: the styles in the profile and for this room. The moodboard is left
    // out until the app shows it (Rathi 11.11: the living room's example pins were nowhere to be seen)
    profileStyles.length ? `Styles in the user's profile: ${profileStyles.join(', ')}.` : '',
    styles.length ? `Styles for this room: ${styles.join(', ')}.` : '',
    !profileStyles.length && !styles.length ? 'The user has not picked any styles.' : '',
    room.instructions ? `The user's own notes: ${room.instructions}` : '',
    room.challenge ? 'The user wants to be challenged: now and then suggest one thing a little outside their usual style, and say briefly why it could work. Keep it a suggestion, never push.' : '',
    'Furniture now:',
    ...items.map((f) => describeItem(room, items, f)),
    chat.itemName ? `This chat is about: ${chat.itemName}.` : '',
    focus ? `The user has marked: ${focus.name}.` : '',
    d.library.length ? `The user's own furniture (not in the room): ${d.library.map((l) => `${l.name} ${l.width} × ${l.depth} cm, ${l.colorName}`).join('; ')}.` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

/** The question for Claude, built from the app's state (call inside update(), where the state is current). */
export function expertInput(d: AppState, roomId: string, chatId: string, focusId?: string) {
  const room = d.rooms.find((r) => r.id === roomId)!;
  const chat = d.chats.find((c) => c.id === chatId)!;
  const focus = focusId ? room.furniture.find((f) => f.id === focusId) : undefined;
  // the last few turns, so a follow-up question makes sense (Claude remembers nothing between calls)
  const turns = chat.messages
    .filter((m) => m.text.trim())
    .slice(-8)
    .map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('assistant' as const), content: m.text }));
  while (turns.length && turns[0].role === 'assistant') turns.shift();
  const intro = `${RULES}\n\nROMDATA\n${roomData(d, room, chat, focus)}`;
  return [{ role: 'user' as const, content: intro }, ...turns];
}

/** Ask Claude. Streams the answer to onText; throws when there is no answer (the caller then uses ai.ts's reply).
 *  Resolves with the answer and the model tier that answered (saved with the answer). */
export async function askExpert(input: ReturnType<typeof expertInput>, onText: (text: string) => void) {
  if (!sample || gone) throw new Error('no expert');
  try {
    const res = (await sample(input, { cache: false, onText: ({ text }) => onText(text) })) as { text: string; modelTierApplied?: string };
    return { text: res.text, tier: res.modelTierApplied };
  } catch (e) {
    const code = (e as { code?: string })?.code;
    // the viewer said no, or Claude isn't available for this account: don't ask again in this view
    if (code && ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) gone = true;
    throw e;
  }
}

/** The answer options in [brackets] become buttons under the answer; the text keeps the rest. While the answer is
 *  still being written, an unfinished «[…» at the end is hidden too. */
export function splitOptions(raw: string): { text: string; options: string[] } {
  const options: string[] = [];
  let text = raw.replace(/\[([^\[\]\n]{2,80})\]/g, (_m, o: string) => {
    options.push(o.trim());
    return '';
  });
  text = text.replace(/\[[^\]\n]*$/, '');
  text = text
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .trim();
  return { text, options: options.length >= 2 ? options : [] };
}

// ---- the log (Rathi 11.11): every answer from Claude, with its input, the prompt's version and the model tier, kept in
// the artifact's own database, so the answers from everyone who tests the copy can be read afterwards. Those the copy is
// shared with as Contributor or more can write and read it (a viewer only can't log). Where there is no database
// (localhost, not signed in), nothing is logged.
type Db = { collection: (p: string) => { add: (d: Record<string, unknown>) => Promise<unknown> } };
let db: Promise<Db | null> | null = null;
const session = Math.random().toString(36).slice(2, 10);
export function logExpert(entry: { input: ReturnType<typeof expertInput>; answer: string; tier?: string; chat: string; error?: string }) {
  try {
    const claude = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
    if (!claude?.use) return;
    db ??= claude.use('db').then((x) => (x as Db) ?? null).catch(() => null);
    db.then((d) =>
      d?.collection('logs').add({
        at: new Date().toISOString(),
        session,
        prompt: PROMPT_VERSION,
        tier: entry.tier ?? null,
        chat: entry.chat,
        // the room data and the conversation as Claude got them (the standing instructions are the prompt version)
        input: entry.input.map((t, i) => (i === 0 ? { role: t.role, content: t.content.slice(t.content.indexOf('ROMDATA')) } : t)),
        answer: entry.answer,
        error: entry.error ?? null,
      }),
    ).catch(() => {});
  } catch {
    /* no log */
  }
}
