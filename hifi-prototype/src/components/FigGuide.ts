// Fig, the interior agent in the chat (Synne 17.11). Fig guides the user a little: it says hello when the living room
// opens, offers a few answers as buttons, shows sofa colours as dots, and reacts with one of three faces – puzzled
// when it challenges («Beige on beige?»), happy when it guides, happier at a bold choice. Scripted, like the rest of
// the AI. Silje's scripted talk for the video (FigPeek.tsx, after a sofa is scanned) is kept as it is.
import type { Message } from '../state/types';
import { FIG_SWATCHES } from './FigPeek';

/** Fig says hello once per visit (browser session) to the living room */
export const FIG_GREET_ROOM = 'r_living';
const GREETED = 'mycrib-fig-greeted';
export const figGreeted = () => {
  try {
    return sessionStorage.getItem(GREETED) === '1';
  } catch {
    return true;
  }
};
export const markFigGreeted = () => {
  try {
    sessionStorage.setItem(GREETED, '1');
  } catch {
    /* ignore */
  }
};

/** the room's own beige sofa, first among the colours (it has no photo variant: the 360° shows the original) */
export const BEIGE = { name: 'Beige', hex: '#e6dccb' };
const COLOURS = FIG_SWATCHES.map(({ name, hex, variant }) => ({ name, hex, variant }));

type Line = Pick<Message, 'text' | 'mood' | 'options' | 'swatches' | 'guide'>;

/** Fig's guided talk (buttons, sofa colours, «Beige on beige?») – off in the full app (Synne 18.11): Fig says hello when
 *  the living room opens, and is otherwise the face on the answers and in the chat */
export const FIG_GUIDE = false;

export const FIG_HELLO: Line = FIG_GUIDE
  ? {
      text: 'Hi, I’m Fig. I’ve had a look at your living room. Shall we add some colour?',
      mood: 'happy',
      options: ['Yes, show me', 'Just looking'],
      guide: 'hello',
    }
  : { text: 'Hi, I’m Fig, your interior expert. Ask me anything about your living room.', mood: 'happy' };

/** Fig's answer to a button under its last line; null when the text isn't one of Fig's buttons */
export function figReply(step: string | undefined, answer: string): Line | null {
  if (step === 'hello' && answer === 'Yes, show me')
    return {
      text: 'Let’s start with the sofa, the biggest surface in the room. These colours fit your living room. Tap one to see it:',
      mood: 'happy',
      swatches: [BEIGE, ...COLOURS],
      guide: 'sofa',
    };
  if (step === 'hello' && answer === 'Just looking') return { text: 'Of course. Tap me when you want ideas.', mood: 'happy', guide: 'done' };
  if (step === 'challenge' && answer === 'Okay, challenge me')
    return { text: 'Good. Try one of these. They are all in your moodboard:', mood: 'happy', swatches: COLOURS, guide: 'sofa' };
  if (step === 'challenge' && answer === 'I like beige')
    return { text: 'Fair enough, it’s your home. Beige it is, and I’ll keep it calm from here.', mood: 'happy', guide: 'done' };
  return null;
}

/** Fig's answer to a sofa colour. `challenge`: the room's «Challenge my style» */
export function figColour(name: string, challenge: boolean): Line {
  if (name === BEIGE.name)
    return challenge
      ? { text: 'Beige on beige? Your moodboard says plum.', mood: 'puzzled', options: ['Okay, challenge me', 'I like beige'], guide: 'challenge' }
      : { text: 'Beige it is. Calm and easy to live with.', mood: 'happy', guide: 'done' };
  return { text: `Bold choice! ${name} suits your room.`, mood: 'happier', guide: 'done' };
}
