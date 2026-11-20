// «From inspiration» in the room's + menu (Synne 19.11): two tabs, so it is clear where a photo comes from – your own
// moodboards (what you collected) or Explore (all the inspiration photos). A photo goes into the chat field as the
// reference, as before.
import { useState } from 'react';
import { boardsOf, inspoSrc, titleOf } from '../state/inspo';
import { useStore } from '../state/store';
import { DiscoverContent } from '../screens/DiscoverScreen';
import { BoardCover } from './Inspo';
import { Icon } from './Icon';
import { BottomSheet, SegmentedTabs } from './ui';

export function InspirationPicker({ onPick, onClose }: { onPick: (id: string, title: string) => void; onClose: () => void }) {
  const { state } = useStore();
  const boards = boardsOf(state).filter((b) => !b.archived && b.items.length > 0);
  const [tab, setTab] = useState<'boards' | 'explore'>(boards.length ? 'boards' : 'explore');
  const [boardId, setBoardId] = useState<string | null>(null);
  const board = boards.find((b) => b.id === boardId);
  return (
    <BottomSheet tall title={board ? board.name : 'From inspiration'} onBack={board ? () => setBoardId(null) : undefined} onClose={onClose}>
      {!board && (
        <SegmentedTabs
          label="From"
          tabs={[
            { id: 'boards', label: 'My moodboards' },
            { id: 'explore', label: 'Explore' },
          ]}
          value={tab}
          onChange={setTab}
        />
      )}
      {tab === 'boards' && !board && (
        <div className="nr-boards inspo-pick-boards" role="list">
          {boards.map((b) => (
            <button key={b.id} type="button" className="nr-board" onClick={() => setBoardId(b.id)}>
              <BoardCover board={b} />
              <span className="nr-board-name">{b.name}</span>
              <span className="nr-board-meta">
                {b.items.length} {b.items.length === 1 ? 'image' : 'images'}
              </span>
            </button>
          ))}
          {!boards.length && (
            <p className="inspo-pick-empty">
              <Icon name="moodboard" size={22} />
              No moodboards with photos yet. Find some in Explore.
            </p>
          )}
        </div>
      )}
      {board && (
        <div className="inspo-pick-photos">
          {board.items.map((id) => (
            <button key={id} type="button" className="inspo-pick-photo" onClick={() => onPick(id, titleOf(id) || board.name)} aria-label={titleOf(id) || 'Photo'}>
              <img src={inspoSrc(id)} alt="" />
            </button>
          ))}
        </div>
      )}
      {tab === 'explore' && !board && (
        <div className="inspo-picker">
          <DiscoverContent natureStrip={false} onPick={onPick} />
        </div>
      )}
    </BottomSheet>
  );
}
