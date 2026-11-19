// The stand version (Synne 17.11): the prototype as judges and visitors try it at the stand after the pitch.
// One path in the living room, led by Fig, with three moments – «Will it fit?», «Dare more than beige» and «If nature
// says it fits». Everything that can't be tried here is hidden (not deleted): set STAND to false to get the full app.
import type { Attachment, Message } from './state/types';
import { NESTING_TABLES } from './components/ItemScan';
import { suggestionsFor } from './state/catalog';
import { ROUND_OAK } from './state/seed';
import { KEY } from './state/store';

export const STAND = true;
// the stand's look (the glow on what to do next, dimmed rooms) is switched on with a class on <html> (Synne 18.11)
if (STAND && typeof document !== 'undefined') document.documentElement.classList.add('stand-on');
/** only the living room, no way out (first try, 17.11). Off: visitors try the whole app (Synne 17.11: «de skal jo teste
 *  hele appen»); Fig still guides in the living room, with the suggestions and the reset. */
export const STAND_LOCK_ROOM = false;
export const STAND_ROOM = 'r_living';
/** the example living room is hidden at the stand (Synne 19.11): the visitor makes their own as the first step.
 *  Hidden, not deleted – it stays in the app's data, and comes back with false */
export const STAND_HIDE_LIVING = true;
/** the rooms the app lists (Home, All rooms, «Which room?», moodboards …), without the hidden example living room */
export const shownRooms = <T extends { id: string }>(rooms: T[]) => (STAND && STAND_HIDE_LIVING ? rooms.filter((r) => r.id !== 'r_living') : rooms);
/** the room the tasks happen in (Synne 19.11): the room the visitor made in «Lag ditt eget rom», once there is one –
 *  the table, the sofa and nature then all go there – otherwise the example living room */
export const standHome = (s: { standRoom?: string; rooms: { id: string; archived?: boolean }[] }) =>
  s.standRoom && s.rooms.some((r) => r.id === s.standRoom && !r.archived) ? s.standRoom : 'r_living';
/** is this the room the tasks happen in (the example living room, or the visitor's own) */
export const isStoryRoom = (s: { standRoom?: string }, roomId: string) => roomId === 'r_living' || roomId === s.standRoom;

/** the doors Fig opens after Silje's sofa talk (Synne 18.11), in Norwegian like her talk: does a coffee table fit
 *  (size), and the whole room in colours from nature (exploring). The label is what the user «says» when tapping it. */
export const MOMENTS = ['Får et sofabord plass?', 'La naturen bestemme', 'Lag et moodboard', 'Lag ditt eget rom'] as const;
/** the main story, first in the welcome menu (Synne 19.11) */
export const MAIN_STORY = { id: 'Legg til en sofa', hint: '' };
/** the order in the welcome menu and on Home (Synne 19.11): your own room first, then the sofa story, then the rest */
// the coffee table right after your own room, so the two go together (Synne 19.11)
export const MENU = ['Lag ditt eget rom', 'Får et sofabord plass?', 'Legg til en sofa', 'La naturen bestemme', 'Lag et moodboard'];
/** the welcome popup shows once per visit; the reset clears it */
const WELCOMED = 'mycrib-stand-welcomed';
export const standWelcomed = () => {
  try {
    return sessionStorage.getItem(WELCOMED) === '1';
  } catch {
    return true;
  }
};
export const markStandWelcomed = () => {
  try {
    sessionStorage.setItem(WELCOMED, '1');
  } catch {
    /* ignore */
  }
};
/** the side trips after the main story (Synne 18.11), as the overview card on Home shows them */
export const TRIPS: { id: (typeof MOMENTS)[number]; hint: string }[] = [
  { id: MOMENTS[0], hint: 'Legg til et bord og se om det får plass' },
  { id: MOMENTS[1], hint: 'Hele stua i farger fra fiken, lavendel eller kyst' },
  { id: MOMENTS[2], hint: 'Bla i moodboards og finn inspirasjon' },
  { id: MOMENTS[3], hint: 'Skann et rom og se det i 360°' },
];
export type Moment = (typeof MOMENTS)[number];
/** the last button, for the next visitor */
export const START_OVER = 'Start på nytt';

type Line = Pick<Message, 'text' | 'mood' | 'options' | 'swatches' | 'guide'>;

/** when the living room is opened straight from Home, before the sofa: Fig points back to the start */
export const STAND_HELLO: Line = {
  text: 'Hei, jeg er Fig, interiøreksperten din. Legg til en sofa med + på forsiden, eller prøv noe av dette:',
  mood: 'happy',
  options: [...MOMENTS],
  guide: 'stand',
};

/** after Silje's talk (the olive walls): the next doors */
export const DOORS_LINE = (rest: string[]): Line => ({
  text: 'Nå ser det ut som et hjem! Hva vil du prøve nå?',
  mood: 'happy',
  options: rest,
  guide: 'stand',
});

/** the camera roll in the room at the stand: coffee tables only, each recognised as itself (Synne 18.11) */
export const STAND_TABLES: Attachment[] = [
  { ...NESTING_TABLES, source: 'photo' },
  { ...ROUND_OAK, source: 'photo' },
  ...suggestionsFor('coffeetable')
    .filter((t) => t.photo)
    .map((t) => ({ ...t, source: 'photo' })),
];
export const standTableFor = (photo: string) => STAND_TABLES.find((t) => t.photo === photo);

/** «Får et sofabord plass?»: Fig shows how to add one – + glows, then «Scan item» and «Camera roll» */
export const TABLE_HINT: Line = {
  text: 'Legg til et sofabord: trykk på + og skann et bord, eller velg et bilde fra kamerarullen. Spør meg så om det får plass.',
  mood: 'happy',
  guide: 'stand',
};
/** when the table is in the room */
export const TABLE_PLACED = (name: string, rest: string[]): Line => ({
  text: `Ja, det får plass! Her står det foran sofaen. Dra det rundt, så sier jeg fra hvis det blir trangt.${name ? '' : ''}`,
  mood: 'happy',
  options: rest.length ? rest : undefined,
  guide: 'stand',
});

export const TABLE_LINE = (rest: string[]): Line => ({
  text: 'Her er et rundt eikebord foran sofaen. Dra det rundt i rommet, så sier jeg fra hvis det blir trangt.',
  mood: 'happy',
  options: rest.length ? rest : undefined,
  guide: 'stand',
});

/** the nature photos as buttons: the label → the palette in state/nature.ts */
export const NATURE_OPTIONS: Record<string, string> = { Fiken: 'fig', Lavendel: 'lavender', Kyst: 'coast', Avokado: 'avocado' };
export const NATURE_NAMES = Object.keys(NATURE_OPTIONS);
export const NATURE_LINE: Line = {
  // the wand glows; the nature photos are picked there, not as buttons hidden in the chat (Synne 19.11)
  text: 'Hvis naturen sier at noe passer, så passer det! Trykk på tryllestaven og velg et bilde fra naturen, så gjør jeg stua om i fargene.',
  mood: 'happy',
  guide: 'nature',
};

/** what Fig says when both doors are tried */
export const ALL_DONE: Line = {
  text: 'Det er MyCrib: ditt eget rom, ekte mål, og et lite dytt til å tørre mer enn beige.',
  mood: 'happier',
  options: [START_OVER],
  guide: 'stand',
};

/** the next step under one of Fig's lines: the doors not tried yet, or «Start på nytt» */
export const nextOptions = (done: string[]) => {
  const rest = MOMENTS.filter((m) => !done.includes(m));
  return rest.length ? [...rest] : [START_OVER];
};

/** a fresh start for the next visitor: the saved app and Fig's «hello» are cleared, the living room opens again */
export function resetStand() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  window.location.hash = STAND_LOCK_ROOM ? `#/room/${STAND_ROOM}` : '#/';
  window.location.reload();
}
