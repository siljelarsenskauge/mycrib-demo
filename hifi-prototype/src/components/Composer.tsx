import { forwardRef, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { NaturePalette } from '../state/nature';
import type { Attachment, Pin } from '../state/types';
import { NaturePhoto } from './NaturePalette';
import { FurnitureThumb } from './FurnitureThumb';
import { inspoSrc, titleOf } from '../state/inspo';
import { Icon } from './Icon';

interface Props {
  draft: string;
  setDraft: (s: string) => void;
  attachment: Attachment | null;
  onRemoveAttachment: () => void;
  inspirations: Pin[];
  onRemoveInspiration: (id: string) => void;
  /** a nature photo for colour inspiration (07.11) */
  nature?: NaturePalette | null;
  onRemoveNature?: () => void;
  /** name of the marked item – changes the placeholder */
  contextName: string | null;
  plusOpen: boolean;
  /** buttons after + (the magic wand) and at the right end when there is nothing to send (versions) – Synne's Figma 1004:15313 */
  afterPlus?: ReactNode;
  end?: ReactNode;
  onPlus: () => void;
  onSend: () => void;
  busy: boolean;
  /** show the send button while writing, also before there is text (Synne's Figma 987:14820, 13.11) */
  showSend?: boolean;
}

/** Chat/Composer: [+] [Ask about the room …] [↑]. With an attachment it grows into a card (State=WithAttachment). */
/** the field is small, so the placeholder names the thing by its last word: «Vittsjö coffee table» → «table» (Synne 14.11) */
const shortName = (name: string) => name.split(",")[0].trim().split(/\s+/).pop()!.toLowerCase();

export const Composer = forwardRef<HTMLTextAreaElement, Props>(function Composer(p, ref) {
  const canSend = !p.busy && (p.draft.trim().length > 0 || !!p.attachment || p.inspirations.length > 0 || !!p.nature);
  const hasAttachments = !!p.attachment || p.inspirations.length > 0 || !!p.nature;
  // the field grows with the text (up to the CSS max-height) and is one slim line when empty
  const own = useRef<HTMLTextAreaElement | null>(null);
  const [multiline, setMultiline] = useState(false);
  useLayoutEffect(() => {
    const el = own.current;
    if (!el) return;
    // an empty field takes its height from the CSS (one line), so it never keeps a height measured in another layout
    if (!p.draft) {
      el.style.height = '';
      setMultiline(false);
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    // once the text needs two lines it stays a box until the field is empty, so the layout doesn't flip back and forth
    // when the box gets wider (Synne 14.11)
    setMultiline((was) => was || el.scrollHeight > 44);
  }, [p.draft]);
  // the box changed width (two lines, or a photo): measure the height again so no empty lines are left over
  useLayoutEffect(() => {
    const el = own.current;
    if (!el || !p.draft) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [multiline, hasAttachments]); // eslint-disable-line react-hooks/exhaustive-deps
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) p.onSend();
    }
  };
  return (
    <form
      className={'composer' + (hasAttachments ? ' composer-with-attachment' : '') + (multiline ? ' is-multiline' : '')}
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) p.onSend();
      }}
    >
      <div className="composer-row">
        <button type="button" className="composer-plus" onClick={p.onPlus} aria-label="Add an item or a photo" aria-expanded={p.plusOpen}>
          <Icon name="add" size={24} />
        </button>
        {p.afterPlus}
        <label className="sr-only" htmlFor="composer-input">
          Message
        </label>
        {/* the photo sits inside the white field, above the text, so the two read as one message (Synne 13.11) */}
        <div className="composer-field">
          {hasAttachments && (
            <div className="composer-attachments">
              {p.attachment && (
                <span className="attachment">
                  <span className="attachment-img">
                    <FurnitureThumb item={p.attachment} />
                  </span>
                  <button type="button" className="attachment-remove" onClick={p.onRemoveAttachment} aria-label={`Remove ${p.attachment.name}`}>
                    <Icon name="close" size={14} />
                  </button>
                </span>
              )}
              {p.nature && (
                <span className="attachment">
                  <span className="attachment-img attachment-nature">
                    <NaturePhoto palette={p.nature} />
                  </span>
                  <button type="button" className="attachment-remove" onClick={p.onRemoveNature} aria-label={`Remove ${p.nature.name} photo`}>
                    <Icon name="close" size={14} />
                  </button>
                </span>
              )}
              {p.inspirations.map((pin) => (
                <span key={pin.id} className="attachment">
                  <span className="attachment-img attachment-pin">
                    {/* a photo from Explore shows as itself (Synne 14.11) */}
                    {titleOf(pin.id) ? <img src={inspoSrc(pin.id)} alt="" /> : <Icon name="image" size={22} />}
                  </span>
                  <button type="button" className="attachment-remove" onClick={() => p.onRemoveInspiration(pin.id)} aria-label={`Remove ${pin.title}`}>
                    <Icon name="close" size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <textarea
            id="composer-input"
            ref={(el) => {
              own.current = el;
              if (typeof ref === 'function') ref(el);
              else if (ref) ref.current = el;
            }}
            className="composer-input"
            rows={1}
            placeholder={hasAttachments ? 'Add a comment (optional)' : p.contextName ? `Ask about the ${shortName(p.contextName)} …` : 'Ask about the room …'}
            value={p.draft}
            onChange={(e) => p.setDraft(e.target.value)}
            onKeyDown={onKey}
          />
        </div>
        {/* the send button only appears when there is something to send (like ChatGPT) */}
        {!(canSend || p.busy || p.showSend) && p.end}
        {(canSend || p.busy || p.showSend) && (
          <button type="submit" className="composer-send" disabled={!canSend} aria-label="Send">
            <Icon name="arrow_up" size={18} />
          </button>
        )}
      </div>
    </form>
  );
});
