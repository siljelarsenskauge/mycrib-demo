import { forwardRef, type KeyboardEvent } from 'react';
import { dims } from '../state/geometry';
import type { Attachment, Pin } from '../state/types';
import { FurnitureThumb } from './FurnitureThumb';

interface Props {
  draft: string;
  setDraft: (s: string) => void;
  attachment: Attachment | null;
  onRemoveAttachment: () => void;
  /** name of the marked furniture; the prompt is about it */
  contextName: string | null;
  /** what shows above the input while a piece is marked: the chat or its colours/suggestions */
  panel?: 'chat' | 'tray';
  onPanel?: (p: 'chat' | 'tray') => void;
  inspirations: Pin[];
  onRemoveInspiration: (id: string) => void;
  onPlus: () => void;
  onSend: () => void;
  busy: boolean;
}

/** AI input fixed at the bottom: [+] [Skriv hva du vil gjøre …] [send] */
export const Composer = forwardRef<HTMLTextAreaElement, Props>(function Composer(p, ref) {
  const canSend = !p.busy && (p.draft.trim().length > 0 || !!p.attachment || p.inspirations.length > 0);
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) p.onSend();
    }
  };
  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) p.onSend();
      }}
    >
      {/* which piece of furniture the chat is about right now */}
      {p.contextName && (
        <p className="context-line" aria-live="polite">
          <span className="context-dot" aria-hidden />
          <span className="context-text">
            Gjelder: <strong>{p.contextName}</strong>
          </span>
          {p.onPanel && (
            <span className="segmented panel-toggle" role="group" aria-label="Vis chat eller forslag">
              <button type="button" aria-pressed={p.panel === 'chat'} onClick={() => p.onPanel!('chat')}>
                Chat
              </button>
              <button type="button" aria-pressed={p.panel === 'tray'} onClick={() => p.onPanel!('tray')}>
                Forslag
              </button>
            </span>
          )}
        </p>
      )}
      {(p.attachment || p.inspirations.length > 0) && (
        <div className="attach-chips">
          {p.attachment && (
            <span className="attach-chip">
              <span className="mini">
                <FurnitureThumb item={p.attachment} />
              </span>
              <span className="txt">
                {p.attachment.name}
                <small>{dims(p.attachment)}</small>
              </span>
              <button type="button" className="x" onClick={p.onRemoveAttachment} aria-label="Fjern vedlegg">
                ✕
              </button>
            </span>
          )}
          {p.inspirations.map((pin) => (
            <span key={pin.id} className="attach-chip">
              <span className="mini placeholder-img" />
              <span className="txt">
                Inspirasjon
                <small>{pin.title}</small>
              </span>
              <button type="button" className="x" onClick={() => p.onRemoveInspiration(pin.id)} aria-label={`Fjern ${pin.title}`}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="composer-row">
        <button type="button" className="round-btn" onClick={p.onPlus} aria-label="Legg til møbel eller bilde">
          +
        </button>
        <label className="sr-only" htmlFor="composer-input">
          Skriv hva du vil gjøre
        </label>
        <textarea
          id="composer-input"
          ref={ref}
          className="composer-input"
          rows={1}
          placeholder={p.attachment ? 'Legg til en melding (valgfritt) …' : p.contextName ? 'Hva vil du endre?' : 'Skriv hva du vil gjøre …'}
          value={p.draft}
          onChange={(e) => p.setDraft(e.target.value)}
          onKeyDown={onKey}
        />
        <button type="submit" className="round-btn primary" disabled={!canSend} aria-label="Send">
          ↑
        </button>
      </div>
    </form>
  );
});
