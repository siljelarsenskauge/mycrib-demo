import { useState } from 'react';
import { shownRooms } from '../stand';
import { RoomCard } from '../components/RoomCard';
import { IconButton, navigate, SegmentedTabs } from '../components/ui';
import { recentFirst } from '../state/mutations';
import { useStore } from '../state/store';
import { NewRoomFlow } from './NewRoomFlow';
import { AddMenu } from '../components/AddMenu';

/** All rooms: «Your rooms» and «Archived» as tabs. Hold on a room for more options. */
export function AllRoomsScreen() {
  const { state } = useStore();
  const [tab, setTab] = useState<'rooms' | 'archived'>('rooms');
  // the method is picked in the same pop-up menu as from the + sheet (Synne 14.11)
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [creating, setCreating] = useState<null | 'scan' | 'plan' | 'measure' | 'photos'>(null);
  const byRecent = recentFirst(shownRooms(state.rooms));
  const active = byRecent.filter((r) => !r.archived);
  const archived = byRecent.filter((r) => r.archived);
  const list = tab === 'rooms' ? active : archived;
  return (
    <div className="screen all-rooms">
      <header className="topbar">
        <IconButton icon="chevron_left" label="Back" onClick={() => navigate('/')} />
        <h1 className="topbar-title-static">All rooms</h1>
        {/* a new room can be made from here too (Synne 26.10) */}
        <IconButton icon="add" label="Create room" aria-haspopup="menu" aria-expanded={!!menu} onClick={(e) => setMenu(e.currentTarget)} />
      </header>
      <div className="screen-scroll all-rooms-scroll">
        <SegmentedTabs
          className="all-rooms-tabs"
          tabs={[
            { id: 'rooms', label: 'Your rooms' },
            { id: 'archived', label: `Archived${archived.length ? ` (${archived.length})` : ''}` },
          ]}
          value={tab}
          onChange={setTab}
        />
        {list.length ? (
          <div key={tab} className={'room-grid ' + (tab === 'archived' ? 'slide-from-right' : 'slide-from-left')}>
            {list.map((r) => (
              <RoomCard key={r.id} room={r} size="grid" />
            ))}
          </div>
        ) : (
          <p key={tab} className={'empty ' + (tab === 'archived' ? 'slide-from-right' : 'slide-from-left')}>{tab === 'rooms' ? 'No rooms yet.' : 'No archived rooms. Hold on a room to archive it.'}</p>
        )}
      </div>
      {menu && (
        <AddMenu
          anchor={menu}
          placement="anchor"
          choices={['scanRoom', 'plan', 'measure', 'photos']}
          highlight="scanRoom"
          onClose={() => setMenu(null)}
          onPick={(c) => {
            setMenu(null);
            setCreating(c === 'scanRoom' ? 'scan' : (c as 'plan' | 'measure' | 'photos'));
          }}
        />
      )}
      {creating && <NewRoomFlow start={creating} onClose={() => setCreating(null)} />}
    </div>
  );
}
