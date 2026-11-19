// The two navigation concepts (Synne 10.11, Figma «14 · Hvor bor rom, moodboards …»), see state/nav.ts.
// V1: Mine (rooms + moodboards) | Create (try nature + Discover).  V2: Rooms (rooms + chats) | Studio (moodboards, then Try nature | Discover).
import { useState } from 'react';
import { DiscoverContent } from '../screens/DiscoverScreen';
import { Icon } from './Icon';
import { BoardCard } from './Inspo';
import { useOpenRoom } from './NotReadySheet';
import { RoomCard } from './RoomCard';
import { fmtShort, navigate, SectionHeader } from './ui';
import { boardsOf } from '../state/inspo';
import { isRoomReady } from '../state/mutations';
import { AMETHYST, AMETHYST_LEVELS, AMETHYST_OWN_PAGE, firstStep, NATURE_PALETTES, stepImage, type NaturePalette } from '../state/nature';
import { openBrave } from '../state/nav';
import { useStore } from '../state/store';
import type { Room } from '../state/types';

/** «New moodboard» as the first card, so making one is always where the moodboards are */
function NewBoardCard({ onClick }: { onClick: () => void }) {
  return (
    <button className="board-card nav-new-board" onClick={onClick}>
      <span className="board-cover nav-new-board-box">
        <Icon name="add" size={28} />
      </span>
      <span className="board-card-name">New moodboard</span>
    </button>
  );
}

function useBoards() {
  const { state } = useStore();
  return boardsOf(state).filter((b) => !b.archived);
}

/**
 * Try nature: the living room big, in the palette picked below. One tap opens the room in that palette,
 * with «How brave are you?» (Silje's idea, 07.11) – no chat and no moodboard needed.
 */
export function TryNature() {
  const { state, update } = useStore();
  const openRoom = useOpenRoom();
  // Orchid is left out here: its photo is a living room with an orchid painting, so it doesn't read as nature (10.11)
  const palettes = [...NATURE_PALETTES.filter((p) => p.id !== 'orchid'), AMETHYST];
  const [picked, setPicked] = useState<NaturePalette>(palettes[0]);
  const living = state.rooms.find((r) => r.id === 'r_living' && !r.archived);
  if (!living) return null;
  const isAmethyst = AMETHYST_OWN_PAGE && picked.id === AMETHYST.id;
  const preview = isAmethyst ? AMETHYST_LEVELS[AMETHYST_LEVELS.length - 1].image : stepImage(picked, firstStep(picked));
  const open = () => {
    if (isAmethyst) return navigate('/nature/amethyst');
    if (!isRoomReady(living.id)) return openRoom(living.id);
    update((d) => {
      d.natureView = { roomId: living.id, paletteId: picked.id, step: firstStep(picked) };
    });
    openBrave.roomId = living.id;
    navigate(`/room/${living.id}`);
  };
  return (
    <section className="try-nature" aria-label="Try nature in your room">
      <button className="try-nature-hero" onClick={open} aria-label={`Open ${living.name} in ${picked.name}`}>
        <img src={preview} alt="" />
        <span className="try-nature-room glass">
          {living.image && <img src={living.image} alt="" />}
          {living.name}
        </span>
        <span className="try-nature-open glass">
          Try {picked.name} in my room
          <Icon name="chevron_right" size={18} />
        </span>
      </button>
      <div className="try-nature-strip" role="radiogroup" aria-label="Nature photos">
        {palettes.map((p) => (
          <button key={p.id} role="radio" aria-checked={picked.id === p.id} aria-label={p.name} className={'try-nature-pick' + (picked.id === p.id ? ' is-on' : '')} onClick={() => setPicked(p)}>
            <img src={p.photo} alt="" />
          </button>
        ))}
      </div>
      <p className="try-nature-hint">Pick a photo from nature. Your room changes with it.</p>
    </section>
  );
}

/** V1 «Mine»: your rooms in a row, your moodboards in a grid */
export function MineBody({ rooms, onNewBoard }: { rooms: Room[]; onNewBoard: () => void }) {
  const boards = useBoards();
  return (
    <>
      <section className="home-block home-block-rooms" aria-label="Your rooms">
        <SectionHeader title="Your rooms" link="All" onLink={() => navigate('/rooms')} />
        <div className="room-row home-room-row">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      </section>
      <section className="home-block nav-boards" aria-label="Your moodboards">
        <SectionHeader title="Your moodboards" />
        <div className="board-grid">
          <NewBoardCard onClick={onNewBoard} />
          {boards.map((b) => (
            <BoardCard key={b.id} board={b} />
          ))}
        </div>
      </section>
    </>
  );
}

/** V1 «Create»: try nature on top, Discover under it */
export function CreateBody({ natureId }: { natureId?: string }) {
  return (
    <>
      <SectionHeader title="Try nature in your room" />
      <TryNature />
      <div className="nav-discover">
        <SectionHeader title="Discover" />
        <DiscoverContent natureId={natureId} />
      </div>
    </>
  );
}

/** V2 «Rooms»: your rooms in a grid, and the latest chats */
export function RoomsBody({ rooms }: { rooms: Room[] }) {
  const { state, update } = useStore();
  const openRoom = useOpenRoom();
  const chats = [...state.chats]
    .filter((c) => c.messages.length && state.rooms.some((r) => r.id === c.roomId && !r.archived))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 4);
  return (
    <>
      <section className="home-block home-block-rooms" aria-label="Your rooms">
        <SectionHeader title="Your rooms" link="All" onLink={() => navigate('/rooms')} />
        {/* a row, so the chats are visible without scrolling */}
        <div className="room-row home-room-row">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      </section>
      <section className="home-block" aria-label="Chats">
        <SectionHeader title="Chats" />
        {chats.length === 0 && <p className="empty">No chats yet. Open a room and ask about it.</p>}
        <ul className="nav-chats">
          {chats.map((c) => {
            const room = state.rooms.find((r) => r.id === c.roomId)!;
            const last = c.messages[c.messages.length - 1];
            return (
              <li key={c.id}>
                <button
                  className="nav-chat"
                  onClick={() => {
                    if (isRoomReady(room.id))
                      update((d) => {
                        d.activeChat[room.id] = c.id;
                      });
                    openRoom(room.id);
                  }}
                >
                  <span className="nav-chat-img">{room.image && <img src={room.image} alt="" />}</span>
                  <span className="nav-chat-text">
                    <span className="nav-chat-title">{room.name}</span>
                    <span className="nav-chat-last">{last?.text || c.title}</span>
                  </span>
                  <span className="nav-chat-time">{fmtShort(c.updatedAt)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

/** V2 «Studio»: your moodboards always on top, then Try nature | Discover */
export function StudioBody({ seg, natureId, onNewBoard }: { seg: 'nature' | 'discover'; natureId?: string; onNewBoard: () => void }) {
  const boards = useBoards();
  return (
    <>
      <section className="home-block nav-studio-boards" aria-label="Your moodboards">
        <SectionHeader title="Your moodboards" link="All" onLink={() => navigate('/moodboards')} />
        <div className="room-row home-room-row nav-board-row">
          <NewBoardCard onClick={onNewBoard} />
          {boards.map((b) => (
            <BoardCard key={b.id} board={b} />
          ))}
        </div>
      </section>
      <div className="nav-seg" role="tablist" aria-label="Studio">
        <button role="tab" aria-selected={seg === 'nature'} onClick={() => navigate('/studio', true)}>
          Try nature
        </button>
        <button role="tab" aria-selected={seg === 'discover'} onClick={() => navigate('/discover', true)}>
          Discover
        </button>
      </div>
      {seg === 'nature' ? <TryNature /> : <DiscoverContent natureId={natureId} />}
    </>
  );
}
