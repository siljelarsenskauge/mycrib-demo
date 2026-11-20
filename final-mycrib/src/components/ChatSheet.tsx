import { useEffect, useLayoutEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import { dims } from '../state/geometry';
import { naturePalette } from '../state/nature';
import type { Chat } from '../state/types';
import { FigAvatar, FIG_NAME } from './FigPeek';
import { FurnitureThumb } from './FurnitureThumb';
import { NaturePhoto, PaletteChips } from './NaturePalette';
import { Icon } from './Icon';
import { Button, IconButton, phoneScale } from './ui';

/** closed = only the composer pill · open = a short chat over the room · full = almost the whole screen */
const OPEN_ON_FOCUS = false;
/** Fig's face next to each of its messages (17.11); off since Synne 18.11 – the face is in the header only */
const FIG_ON_MESSAGES = false;

export type SheetState = 'closed' | 'open' | 'full';

interface Props {
  chat: Chat | undefined;
  state: SheetState;
  onState: (s: SheetState) => void;
  thinking: boolean;
  /** shown at the top of the sheet: the ContextChip for the marked item */
  context?: ReactNode;
  /** the composer sits inside the sheet, like in Figma */
  children: ReactNode;
  /** a button under an AI answer was tapped (e.g. «Scan the room», or «Show it in my room» with a nature palette) */
  onAction?: (action: 'scan' | 'nature', paletteId?: string) => void;
  /** an answer option under the expert's last answer was tapped: it is sent as the user's message (Rathi 11.11) */
  onReply?: (text: string) => void;
  /** a colour dot under the last answer was tapped */
  onSwatch?: (swatch: { name: string; hex: string; variant?: string; pick?: boolean }) => void;
}

/**
 * Chat/ChatSheet (Style=Glass): the bottom part of the room screen. The room stays the main surface,
 * so the message list is short (about 1/5 of the screen). The handle can be tapped or dragged (Synne 22.10):
 * drag up for a full chat that stops just under the status bar, drag down to make it smaller or close it.
 * X closes it (Synne 04.11): only the composer is left, and writing there opens the chat again.
 */
export function ChatSheet({ chat, state, onState, thinking, context, children, onAction, onReply, onSwatch }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const messages = chat?.messages ?? [];
  const hasMessages = messages.length > 0 || thinking;
  // a new, empty chat – or a closed one – shows only the slim composer pill (like ChatGPT, Synne 22.10)
  const closed = hasMessages && state === 'closed';
  const bare = (!hasMessages || closed) && !context;

  const sheetRef = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; t: number; h: number; max: number; moved: boolean } | null>(null);
  // the height before a state change, so the sheet can glide to its new height instead of jumping
  const fromHeight = useRef<number | null>(null);

  // also when the newest answer grows while it is written, and when its answer options appear (Rathi 11.11)
  const last = messages[messages.length - 1];
  // the header's face follows what Fig said last
  const headMood = [...messages].reverse().find((m) => m.role === 'ai' && m.mood)?.mood ?? 'happy';
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, thinking, state, last?.text, last?.options?.length]);
  // the chat is at most a third of the screen (Synne 19.11): when the list gets smaller – the field grows with a typed
  // line, the sheet glides open – it stays at the bottom, so the newest message and its colour dots show
  useEffect(() => {
    const el = listRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasMessages, state]);

  useLayoutEffect(() => {
    const el = sheetRef.current;
    const from = fromHeight.current;
    fromHeight.current = null;
    if (!el || from === null) return;
    el.style.height = '';
    // heights in CSS px inside the phone frame, which can be scaled down on desktop (Silje's useFitPhone)
    const to = el.getBoundingClientRect().height / phoneScale();
    if (Math.abs(to - from) < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // open 250 ms, close 150 ms – closing gets out of the way faster (motion tokens, Synne 17.11)
    el.animate([{ height: `${from}px`, overflow: 'hidden' }, { height: `${to}px`, overflow: 'hidden' }], {
      duration: to > from ? 250 : 150,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
  }, [state]);

  const go = (next: SheetState) => {
    const el = sheetRef.current;
    if (next === state) {
      if (el) el.style.height = '';
      return;
    }
    if (el) fromHeight.current = el.getBoundingClientRect().height / phoneScale();
    onState(next);
  };

  // the full sheet reaches up to the top of the top bar, i.e. just under the status bar / Dynamic Island
  const maxHeight = (el: HTMLElement) => {
    const top = el.closest('.room')?.querySelector('.topbar')?.getBoundingClientRect().top ?? 0;
    return (el.getBoundingClientRect().bottom - top) / phoneScale() - 4;
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    const el = sheetRef.current;
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, t: e.timeStamp, h: el.getBoundingClientRect().height / phoneScale(), max: maxHeight(el), moved: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    const el = sheetRef.current;
    if (!d || !el) return;
    const dy = (e.clientY - d.y) / phoneScale();
    if (!d.moved && Math.abs(dy) < 6) return;
    d.moved = true;
    // a closed chat has nothing to stretch – it opens when the finger is lifted
    if (state === 'closed') return;
    el.classList.add('is-dragging');
    el.style.height = `${Math.min(d.max, Math.max(56, d.h - dy))}px`;
  };

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    sheetRef.current?.classList.remove('is-dragging');
    if (!d) return;
    if (!d.moved) {
      go(state === 'closed' ? 'open' : state === 'full' ? 'open' : 'closed');
      return;
    }
    const dy = e.clientY - d.y;
    // a quick flick counts even if it is short
    const flick = Math.abs(dy) / Math.max(1, e.timeStamp - d.t) > 0.5;
    const up = dy < -48 || (flick && dy < 0);
    const down = dy > 48 || (flick && dy > 0);
    if (state === 'closed') go(dy < -240 ? 'full' : up ? 'open' : 'closed');
    else if (state === 'open') go(up ? 'full' : down ? 'closed' : 'open');
    else go(down ? (d.h - dy < 160 ? 'closed' : 'open') : 'full');
  };

  return (
    <section
      ref={sheetRef}
      className={'chat-sheet glass' + (bare ? ' chat-sheet-empty' : '') + (state === 'full' && hasMessages ? ' is-full' : '')}
      aria-label="Chat"
      // writing in a closed chat brings the conversation back (the handle opens it itself on tap –
      // reacting to its focus too would open and then close it again)
      // typing does not open the old messages; the handle or the answer note does (Synne 13.11)
      onFocus={(e) => OPEN_ON_FOCUS && closed && !(e.target as HTMLElement).closest('.chat-sheet-handle') && onState('open')}
    >
      {hasMessages && (
        <button
          className={'chat-sheet-handle' + (closed ? ' is-floating' : '')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
            sheetRef.current?.classList.remove('is-dragging');
            if (sheetRef.current) sheetRef.current.style.height = '';
          }}
          onKeyDown={(e) => {
            // keyboard: arrow up/down moves between closed, open and full
            const order: SheetState[] = ['closed', 'open', 'full'];
            const i = order.indexOf(state);
            if (e.key === 'ArrowUp' && i < 2) go(order[i + 1]);
            else if (e.key === 'ArrowDown' && i > 0) go(order[i - 1]);
            else if (e.key === 'Enter' || e.key === ' ') go(state === 'closed' ? 'open' : state === 'full' ? 'open' : 'closed');
            else return;
            e.preventDefault();
          }}
          aria-label={state === 'closed' ? 'Show the chat. Drag up for more.' : 'Resize the chat. Drag up or down.'}
          aria-expanded={state !== 'closed'}
        >
          <span />
        </button>
      )}
      {/* X closes the chat, also from full screen; «Ask about the room …» stays and brings it back (Synne 04.11) */}
      {/* no X in the chat (Silje 17.11): it closes with the handle, a swipe down, or a tap on the fig.
          The X is back at the top right, next to Fig (Silje 18.11) */}
      {context && <div className="chat-sheet-context">{context}</div>}
      {/* who you are chatting with: Fig, the interior agent (Synne 17.11) */}
      {hasMessages && state !== 'closed' && (
        <div className="fig-head">
          <FigAvatar mood={headMood} size={44} className="fig-head-fig" />
          <span className="fig-head-text">
            <strong>{FIG_NAME}</strong>
            <small>Your interior expert</small>
          </span>
          <IconButton icon="close" iconSize={18} className="fig-head-close" label="Close the chat" onClick={() => onState('closed')} />
        </div>
      )}
      {hasMessages && state !== 'closed' && (
        <div className="chat-messages" ref={listRef}>
          {messages.map((m, i) => {
            const nature = naturePalette(m.nature);
            return (
            <div key={m.id} className={'chat-bubble ' + (m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai' + (FIG_ON_MESSAGES ? ' is-fig' : ''))}>
              {/* Fig's face next to the first of its messages in a row, with the face that fits what it says */}
              {/* Fig's face only in the header now, not next to each message (Synne 18.11) – behind FIG_ON_MESSAGES */}
              {FIG_ON_MESSAGES && m.role === 'ai' && messages[i - 1]?.role !== 'ai' && <FigAvatar mood={m.mood ?? 'happy'} className="chat-fig" />}
              {m.attachment && (
                <span className="chat-attachment">
                  <span className="chat-attachment-img">
                    <FurnitureThumb item={m.attachment} />
                  </span>
                  <span className="chat-attachment-text">
                    {m.attachment.name}
                    <small>{dims(m.attachment)}</small>
                  </span>
                </span>
              )}
              {nature && m.role === 'user' && <NaturePhoto palette={nature} className="chat-nature-photo" />}
              {m.inspirations?.map((t) => (
                <span key={t} className="chat-inspiration">
                  <Icon name="moodboard" size={16} /> {t}
                </span>
              ))}
              {m.text && <p>{m.text}</p>}
              {m.options && onReply && i === messages.length - 1 && !thinking && (
                // the expert's answer options (prompt v3.4): only under the newest answer (Rathi 11.11)
                <div className="chat-options" role="group" aria-label="Answer">
                  {m.options.map((o) => (
                    <Button key={o} variant="secondary" size="small" onClick={() => onReply(o)}>
                      {o}
                    </Button>
                  ))}
                </div>
              )}
              {m.swatches && onSwatch && i === messages.length - 1 && !thinking && (
                <div className="chat-swatches" role="group" aria-label="Colour">
                  {m.swatches.map((c) => (
                    <button key={c.name} type="button" className={'chat-swatch' + (c.pick ? ' is-pick' : '')} onClick={() => onSwatch(c)}>
                      {/* the colour itself is content (the sofa's colour), not a UI colour */}
                      <i style={{ background: c.hex }} aria-hidden />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {m.action === 'scan' && onAction && (
                <Button variant="secondary" size="small" icon="scan_room" className="chat-action" onClick={() => onAction('scan')}>
                  Scan the room · about 1 min
                </Button>
              )}
              {nature && m.role === 'ai' && <PaletteChips palette={nature} />}
              {m.action === 'nature' && nature && onAction && (
                <Button variant="secondary" size="small" icon="palette" className="chat-action" onClick={() => onAction('nature', nature.id)}>
                  Show it in my room
                </Button>
              )}
            </div>
            );
          })}
          {thinking && (
            <div className={'chat-bubble chat-bubble-ai chat-thinking' + (FIG_ON_MESSAGES ? ' is-fig' : '')} role="status">
              {/* Fig wobbles while it thinks, instead of the three dots (Synne 17.11) */}
              {FIG_ON_MESSAGES && <FigAvatar mood="happy" className="chat-fig is-thinking" />}
              <p>{FIG_NAME} is thinking …</p>
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
