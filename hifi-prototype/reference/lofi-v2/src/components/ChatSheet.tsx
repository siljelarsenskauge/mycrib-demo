import { useEffect, useRef } from 'react';
import { dims } from '../state/geometry';
import type { Chat } from '../state/types';
import { FurnitureThumb } from './FurnitureThumb';

export type SheetState = 'closed' | 'open';

interface Props {
  chat: Chat | undefined;
  state: SheetState;
  heights: Record<SheetState, number>;
  onState: (s: SheetState) => void;
  thinking: boolean;
}

/** Small chat strip above the composer. The room is the main surface; the chat only shows text. */
export function ChatSheet({ chat, state, heights, onState, thinking }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const messages = chat?.messages ?? [];

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, thinking, state]);

  if (messages.length === 0 && !thinking) return null;

  return (
    <section className="chat-sheet" style={{ height: heights[state] }} aria-label="Chat">
      <button
        className="sheet-handle"
        onClick={() => onState(state === 'closed' ? 'open' : 'closed')}
        aria-label={state === 'closed' ? 'Vis chatten' : 'Skjul chatten'}
        aria-expanded={state === 'open'}
      >
        <span className="grabber" />
        {state === 'closed' && <span>Vis chat</span>}
      </button>
      {state === 'open' && (
        <div className="messages" ref={listRef}>
          {messages.map((m) => (
            <div key={m.id} className={'msg ' + (m.role === 'user' ? 'msg-user' : 'msg-ai')}>
              {m.attachment && (
                <div className="attach-chip msg-attach">
                  <span className="mini">
                    <FurnitureThumb item={m.attachment} />
                  </span>
                  <span className="txt">
                    {m.attachment.name}
                    <small>{dims(m.attachment)}</small>
                  </span>
                </div>
              )}
              {m.inspirations?.map((t) => (
                <div key={t} className="hint">
                  📌 {t}
                </div>
              ))}
              {m.contextItem && (
                <span className="tag-chip small">
                  <span className="tag-icon" aria-hidden>
                    ▢
                  </span>
                  <span className="tag-name">{m.contextItem}</span>
                </span>
              )}
              {m.text && <p>{m.text}</p>}
            </div>
          ))}
          {thinking && (
            <div className="msg msg-ai thinking" role="status">
              <span className="dots">
                <span />
                <span />
                <span />
              </span>
              tenker …
            </div>
          )}
        </div>
      )}
    </section>
  );
}
