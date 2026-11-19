// The optional parts of a room (Synne 14.11), shared by «Room details» in Create room and by Room settings, so
// everything that can be set when a room is made can also be changed later: moodboards, colours from nature and
// «Challenge my style».
import type { AppState, Moodboard } from '../state/types';
import { boardCover, boardsOf, editBoards, inspoSrc, NATURE, titleOf } from '../state/inspo';
import { Icon } from './Icon';
import { BottomSheet } from './ui';
import { BoardCover } from './Inspo';

/** the board that holds a room's colours from nature – one per room, made and kept in step by syncNatureBoard */
export const natureBoardId = (roomId: string) => `nat_${roomId}`;

/** the moodboards the user made themselves (not the room's own nature board) */
export const userBoards = (s: AppState) => boardsOf(s).filter((b) => !b.id.startsWith('nat_'));

/** the user's moodboards connected to a room */
export const connectedBoards = (s: AppState, roomId: string) => userBoards(s).filter((b) => (b.roomIds ?? []).includes(roomId)).map((b) => b.id);

/** connect exactly these moodboards to the room (others are let go) */
export function setRoomBoards(d: AppState, roomId: string, ids: string[]) {
  for (const b of editBoards(d)) {
    if (b.id.startsWith('nat_')) continue;
    const on = ids.includes(b.id);
    const has = (b.roomIds ?? []).includes(roomId);
    if (on && !has) b.roomIds = [...(b.roomIds ?? []), roomId];
    if (!on && has) b.roomIds = (b.roomIds ?? []).filter((r) => r !== roomId);
  }
}

/** keep the room's nature board in step with the colours picked for it */
export function syncNatureBoard(d: AppState, roomId: string, roomName: string, natures: string[]) {
  const boards = editBoards(d);
  const id = natureBoardId(roomId);
  const b = boards.find((x) => x.id === id);
  const name = natures.length === 1 ? titleOf(natures[0]) : `Colours for ${roomName}`;
  if (!natures.length) {
    if (b) b.deleted = true;
    return;
  }
  if (b) {
    b.items = natures;
    b.name = name;
    b.deleted = false;
    b.roomIds = [roomId];
  } else boards.push({ id, name, items: natures, roomIds: [roomId] } as Moodboard);
}

/** «Challenge my style»: the interior expert now and then suggests something outside the user's usual style */
export function ChallengeSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={value} className="nr-switch-row" onClick={() => onChange(!value)}>
      <span className="nr-switch-text">
        <span className="nr-switch-title">Challenge my style</span>
        <span className="nr-switch-note">The interior expert now and then suggests something a little outside what you usually pick.</span>
      </span>
      <span className={'nr-switch' + (value ? ' is-on' : '')} aria-hidden>
        <span />
      </span>
    </button>
  );
}

/** «Connect a moodboard»: a row that opens the sheet with all the user's moodboards */
export function MoodboardRow({ boards, selected, onOpen }: { boards: Moodboard[]; selected: string[]; onOpen: () => void }) {
  const chosen = boards.filter((b) => selected.includes(b.id));
  return (
    <button type="button" className="nr-link-row" onClick={onOpen}>
      <span className="nr-link-thumbs" aria-hidden>
        {chosen.slice(0, 3).map((b) =>
          boardCover(b)[0] ? (
            <img key={b.id} src={inspoSrc(boardCover(b)[0]!)} alt="" />
          ) : (
            <span key={b.id} className="nr-link-empty">
              <Icon name="moodboard" size={16} />
            </span>
          ),
        )}
        {!chosen.length && <Icon name="moodboard" size={22} />}
      </span>
      <span className="nr-switch-text">
        <span className="nr-switch-title">{chosen.length ? 'Moodboards' : 'Connect a moodboard'}</span>
        <span className="nr-switch-note">{chosen.length ? chosen.map((b) => b.name).join(', ') : 'The AI uses it as a reference in this room.'}</span>
      </span>
      {/* a connect icon instead of an arrow (Synne 14.11) */}
      <span className="nr-link-icon" aria-hidden>
        <Icon name="link" size={20} />
      </span>
    </button>
  );
}

/** the sheet with all the user's moodboards; one or more can be picked */
export function MoodboardSheet({
  boards,
  draft,
  setDraft,
  onDone,
  onBack,
  onClose,
}: {
  boards: Moodboard[];
  draft: string[];
  setDraft: (ids: string[]) => void;
  onDone: () => void;
  onBack?: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      tall
      title="Connect moodboards"
      onBack={onBack}
      onClose={onClose}
      primary={{ label: draft.length > 1 ? `Connect ${draft.length} moodboards` : 'Connect', onClick: onDone }}
    >
      <div className="nr-boards" role="group" aria-label="Your moodboards">
        {boards.map((b) => {
          const on = draft.includes(b.id);
          return (
            <button key={b.id} type="button" className={'nr-board' + (on ? ' is-on' : '')} aria-pressed={on} onClick={() => setDraft(on ? draft.filter((x) => x !== b.id) : [...draft, b.id])}>
              <BoardCover board={b} />
              <span className="nr-board-name">{b.name}</span>
              <span className="nr-board-meta">
                {b.items.length} {b.items.length === 1 ? 'image' : 'images'}
              </span>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}

/** colours from nature: pick as many as you like */
export function NatureColours({ value, onChange, id, optional = true }: { value: string[]; onChange: (v: string[]) => void; id: string; optional?: boolean }) {
  return (
    <section className="nr-group" aria-labelledby={id}>
      <h3 className="field-label" id={id}>
        Explore colours from nature {optional && <span className="nr-optional">(optional)</span>}
      </h3>
      <div className="nature-strip nature-strip-small">
        {NATURE.map((n) => (
          <button key={n.id} type="button" className={'nature-pick' + (value.includes(n.id) ? ' is-active' : '')} aria-pressed={value.includes(n.id)} onClick={() => onChange(value.includes(n.id) ? value.filter((x) => x !== n.id) : [...value, n.id])}>
            <img src={inspoSrc(n.id)} alt="" />
            <span>{n.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
