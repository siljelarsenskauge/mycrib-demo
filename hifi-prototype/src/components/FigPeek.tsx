// The puzzled fig (Silje 13.11, promo video): after a beige sofa is scanned into the all-beige living room, a fig
// peeks up from behind the chat bar and has something to say – the app's idea in one look: take colour from nature.
// What it says is an ordinary AI message in the room's chat (see RoomScreen), so it shows above the chat bar like
// any answer and can be replied to.

/**
 * The conversation with the fig, for the promo video (Silje 17.11). It only looks like a conversation: the user's lines
 * are typed into the field by themselves when it is tapped, and the fig answers with the next line.
 * Even numbers are the fig, odd numbers the user.
 */
export const FIG_SCRIPT = [
  'Beige on beige? Jeg trodde du ville ha et fargerikt hjem?',
  'Men sofaen er på 70 %!',
  'Du sa FUCK BEIGE. Ikke 70 % OFF BEIGE.',
  'Okei da 😭 Hva foreslår du?',
  'La oss finne en farge på sofaen som faktisk matcher ditt moodboard',
  // after trying the colours, dusty rose is picked (Silje 17.11, the pitch). The talk with the fig is in Norwegian,
  // colour names too (Silje 17.11)
  'Jeg liker sofaen i støvet rosa!',
  'Jeg tenkte du kanskje ville like den. Vil du se på tepper som passer?',
  'Ja!',
  'Her er noen tepper som passer til den støvet rosa sofaen:',
  'Jeg liker det hvite med de svarte stripene, takk for at du fikk meg til å unngå alt det beige!',
  'Det er derfor jeg er her, men vi trenger mer farger enn dette også!',
  'Skeptisk, men vi kan jo prøve!',
  'Jeg liker det! Hva med deg?',
  // after the green walls the user asks to see the room finished (Synne 18.11), in Silje's words (19.11)
  'Ja! Kan jeg se en pimpet versjon av rommet?',
  'Klart! Her er rommet ditt, pimpet. Fortsatt ingenting beige!',
];
/** a line from the fig that shows the room finished as a flat image, «made» like an image in ChatGPT (Synne 18.11).
 *  Off since Silje 19.11: the finished room is her 360° panorama instead (FIG_REVEALS). It was
 *  14: { from: '/rooms/living_olive_rose.jpg', to: '/rooms/living_lighter.jpg' } */
export const FIG_FINALS: Record<number, { from: string; to: string }> = {};
/** a line from the fig that also changes the room: the 360° photos it shows (Silje 17.11). The olive walls are
 * Silje's image «Stue med mørke olivengrønne vegger» (dusty rose sofa, striped carpet). */
export const FIG_VIEWS: Record<number, string> = { 12: 'rose-stripes-olive-walls' };
/** a line from the fig that shows the finished room in 360°: the chat folds away so the room can be seen (Silje 19.11).
 *  «pimped» is Silje's panorama «panorama slitt», split into equi-a-pimped.jpg and equi-b-pimped.jpg */
export const FIG_REVEALS: Record<number, string> = { 14: 'pimped' };

/** the user's lines that pick a colour: the room shows it when the line is sent, whatever was tried last, so the room
 *  and the talk always match (Synne 18.11) */
export const FIG_USER_VIEWS: Record<number, string> = { 5: 'rose', 9: 'rose-rug-stripes' };

/** a second message from the fig right after a line, as its own bubble (Silje 17.11) */
export const FIG_FOLLOW_UPS: Record<number, string> = { 10: 'Hva med grønne vegger?' };

/** the user's line in FIG_SCRIPT that changes the fig's face, when it is sent (Silje 17.11): puzzled at first, happy
 *  when the dusty rose sofa is picked, happier still with the striped carpet */
export const FIG_MOODS: Record<number, FigMood> = { 5: 'happy', 9: 'happier' };

/** What the fig says first. */
export const FIG_LINE = FIG_SCRIPT[0];

export interface FigSwatch {
  name: string;
  /** the dot: a colour, or any CSS background (the striped carpet) */
  hex: string;
  /** the 360° photos: equi-a-<variant>.jpg and equi-b-<variant>.jpg in public/furnie/360 */
  variant?: string;
  /** the one the talk goes on with – it glows at the stand, so visitors end on it (Synne 18.11) */
  pick?: boolean;
}
/**
 * The sofa colours the fig offers (Silje 17.11). Each has the living room's 360° photos with the sofa in that colour:
 * public/furnie/360/equi-a-<variant>.jpg and equi-b-<variant>.jpg, split from Silje's ChatGPT images
 * (Furnie/hifi-prototype/public/ulike farger på sofa/). The dot is the sofa's colour in the photo.
 */
export const FIG_SWATCHES: FigSwatch[] = [
  { name: 'Olivengrønn', hex: '#81713c', variant: 'olive' },
  { name: 'Støvet rosa', hex: '#bc7b84', variant: 'rose', pick: true },
  { name: 'Burgunder', hex: '#64313c', variant: 'burgundy' },
  { name: 'Lilla', hex: '#cd9ebe', variant: 'lilac' },
  { name: 'Salviegrønn', hex: '#a8ad7b', variant: 'sage' },
  { name: 'Petrol', hex: '#27474c', variant: 'teal' },
];
/** The carpets the fig offers with the dusty rose sofa (Silje 17.11). Their photos are the room with the dusty rose sofa
 * and the carpet, split from Silje's ChatGPT images (Furnie/hifi-prototype/public/ulike farger på teppe/). */
export const FIG_RUGS: FigSwatch[] = [
  { name: 'Burgunder', hex: '#8a2f55', variant: 'rose-rug-burgundy' },
  { name: 'Olivengrønn', hex: '#6b7a3c', variant: 'rose-rug-olive' },
  { name: 'Svart-hvitt', hex: 'repeating-linear-gradient(90deg, #1f1a1a 0 4px, #f3eee6 4px 8px)', variant: 'rose-rug-stripes', pick: true },
];
/** which line of FIG_SCRIPT gets which colour dots */
export const FIG_SWATCH_LINES: Record<number, FigSwatch[]> = { 4: FIG_SWATCHES, 8: FIG_RUGS };

/** Fig, the interior agent (Synne 17.11): its name and three faces, cut out of Synne's fig photos (public/fig) */
export type FigMood = 'puzzled' | 'happy' | 'happier';
export const FIG_NAME = 'Fig';
export const FIG_FACES: Record<FigMood, string> = {
  puzzled: '/fig/fig-puzzled.png',
  happy: '/fig/fig-happy.png',
  happier: '/fig/fig-happier.png',
};
const FACE_LABEL: Record<FigMood, string> = { puzzled: 'Puzzled fig', happy: 'Happy fig', happier: 'Very happy fig' };

/** Fig's face in a small circle: next to its messages, in the chat's header and while it thinks */
export function FigAvatar({ mood = 'happy', size = 28, className = '' }: { mood?: FigMood; size?: number; className?: string }) {
  return (
    <span className={'fig-avatar ' + className} style={{ width: size, height: size }} aria-hidden>
      <img src={FIG_FACES[mood]} alt="" draggable={false} />
    </span>
  );
}

/** Tapping the fig opens the chat with what it said, and tapping it again closes the chat (Silje 17.11).
 *  Its face follows what Fig last said (Synne 17.11); Silje's talk starts puzzled. */
export function FigPeek({ chatOpen, onTap, mood = 'puzzled', leaving = false }: { chatOpen: boolean; onTap: () => void; mood?: FigMood; leaving?: boolean }) {
  return (
    <div className={'fig-peek' + (leaving ? ' is-leaving' : '')}>
      <button className="fig-peek-fig" onClick={onTap} aria-label={`${FACE_LABEL[mood]}. Tap to ${chatOpen ? 'close' : 'open'} the chat.`}>
        <img key={mood} src={FIG_FACES[mood]} alt="" draggable={false} />
        {/* the other faces are loaded up front, so a new face doesn't blink in (Silje 17.11) */}
        {Object.values(FIG_FACES).map((f) => (
          <link key={f} rel="preload" as="image" href={f} />
        ))}
      </button>
    </div>
  );
}
