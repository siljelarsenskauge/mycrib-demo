// Five proposals for the home screen (10.11), to compare how much inspiration sits next to the everyday tools.
// Only in the merge test. Open them at /#/home/1 … /#/home/5. Nothing here is decided.
import { BoardCard } from '../components/Inspo';
import { NatureRow, NaturePhoto } from '../components/NaturePalette';
import { useOpenRoom } from '../components/NotReadySheet';
import { RoomCard } from '../components/RoomCard';
import { Button, navigate, SectionHeader } from '../components/ui';
import { boardFor, boardScene, boardsOf } from '../state/inspo';
import { AMETHYST, NATURE_PALETTES, type NaturePalette } from '../state/nature';
import { useStore } from '../state/store';
import type { Room } from '../state/types';

export const HOME_VARIANTS = [
  'Continue where you left off',
  'One nature image a day',
  'Calm rows',
  'The vision first',
  'Inspiration inside the rooms',
];

interface Props {
  n: number;
  rooms: Room[];
  tryNature: (p: NaturePalette) => void;
}

export function HomeVariant({ n, rooms, tryNature }: Props) {
  const { state } = useStore();
  const openRoom = useOpenRoom();
  const boards = boardsOf(state).filter((b) => !b.archived);
  const palettes = [...NATURE_PALETTES, AMETHYST];
  const last = [...rooms].sort((a, b) => (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt))[0];

  const roomRow = (list: Room[]) => (
    <div className="room-row home-room-row">
      {list.map((r) => (
        <RoomCard key={r.id} room={r} />
      ))}
    </div>
  );
  const boardRow = (
    <div className="room-row home-room-row hv-board-row">
      {boards.map((b) => (
        <BoardCard key={b.id} board={b} />
      ))}
    </div>
  );

  // 1 · Continue: the last room big, then a few ideas picked for that room
  if (n === 1)
    return (
      <>
        {last && (
          <button className="hv-hero" onClick={() => openRoom(last.id)} aria-label={`Continue with ${last.name}`}>
            <span className="hv-hero-img">{last.image && <img src={last.image} alt="" />}</span>
            <span className="hv-hero-text">
              <span className="hv-kicker">Continue</span>
              <span className="hv-hero-name">{last.name}</span>
            </span>
          </button>
        )}
        <section className="hv-block">
          <SectionHeader title="Recent rooms" link="All rooms" onLink={() => navigate('/rooms')} />
          {roomRow(rooms.filter((r) => r.id !== last?.id))}
        </section>
        <section className="hv-block">
          <SectionHeader title={`Ideas for your ${last?.name.toLowerCase() ?? 'room'}`} link="More" onLink={() => navigate('/discover')} />
          <NatureRow palettes={palettes.slice(0, 3)} onPick={tryNature} />
        </section>
        <section className="hv-block">
          <SectionHeader title="Your moodboards" link="See all" onLink={() => navigate('/moodboards')} />
          {boardRow}
        </section>
      </>
    );

  // 2 · One nature image a day: a single, calm dose of inspiration on top
  if (n === 2) {
    const today = palettes[new Date().getDate() % NATURE_PALETTES.length];
    return (
      <>
        <section className="hv-daily">
          <span className="hv-kicker">Today’s nature</span>
          <button className="hv-daily-img" onClick={() => tryNature(today)} aria-label={`${today.name}: try it in your living room`}>
            <NaturePhoto palette={today} />
          </button>
          <div className="hv-daily-row">
            <div>
              <h2 className="hv-daily-name">{today.name}</h2>
              <span className="hv-swatches" aria-hidden>
                {today.colors.map((c) => (
                  <i key={c.name} style={{ background: c.hex }} />
                ))}
              </span>
            </div>
            <Button variant="primary" size="small" onClick={() => tryNature(today)}>
              Try in my room
            </Button>
          </div>
        </section>
        <section className="hv-block">
          <SectionHeader title="Recent rooms" link="All rooms" onLink={() => navigate('/rooms')} />
          {roomRow(rooms)}
        </section>
        <section className="hv-block">
          <SectionHeader title="Your moodboards" link="See all" onLink={() => navigate('/moodboards')} />
          {boardRow}
        </section>
      </>
    );
  }

  // 3 · Calm rows: everything gets the same small heading and one row each; the big grid lives in Discover
  if (n === 3)
    return (
      <>
        <section className="hv-block">
          <SectionHeader title="Recent rooms" link="All rooms" onLink={() => navigate('/rooms')} />
          {roomRow(rooms)}
        </section>
        <section className="hv-block">
          <SectionHeader title="Your moodboards" link="See all" onLink={() => navigate('/moodboards')} />
          {boardRow}
        </section>
        <section className="hv-block">
          <SectionHeader title="Try nature in your room" link="Discover" onLink={() => navigate('/discover')} />
          <NatureRow palettes={palettes} onPick={tryNature} />
        </section>
      </>
    );

  // 4 · The vision first: rooms shrink to small circles, the moodboards fill the page
  if (n === 4)
    return (
      <>
        <div className="hv-circles" aria-label="Your rooms">
          {rooms.map((r) => (
            <button key={r.id} className="hv-circle" onClick={() => openRoom(r.id)}>
              <span className="hv-circle-img">{r.image && <img src={r.image} alt="" />}</span>
              <span className="hv-circle-name">{r.name}</span>
            </button>
          ))}
          <button className="hv-circle" onClick={() => navigate('/rooms')}>
            <span className="hv-circle-img hv-circle-all">All</span>
            <span className="hv-circle-name">All rooms</span>
          </button>
        </div>
        <section className="hv-block">
          <h2 className="home-block-title">The vision</h2>
          <div className="board-grid hv-board-grid">
            {boards.map((b) => (
              <BoardCard key={b.id} board={b} />
            ))}
          </div>
        </section>
        <section className="hv-block">
          <SectionHeader title="Try nature in your room" />
          <NatureRow palettes={palettes} onPick={tryNature} />
        </section>
      </>
    );

  // 5 · Inspiration inside the rooms: one card per room, showing the vision it uses (or an invitation to find one)
  return (
    <>
      <section className="hv-block">
        <SectionHeader title="Your rooms" link="All rooms" onLink={() => navigate('/rooms')} />
        <div className="hv-room-list">
          {rooms.map((r) => {
            const b = boardFor(state, r.id);
            const scene = b ? boardScene(b) : null;
            return (
              <div key={r.id} className="hv-room">
                <button className="hv-room-main" onClick={() => openRoom(r.id)} aria-label={`Open ${r.name}`}>
                  <span className="hv-room-img">{r.image && <img src={r.image} alt="" />}</span>
                  <span className="hv-room-name">{r.name}</span>
                </button>
                {b && scene ? (
                  <button className="hv-room-vision" onClick={() => navigate(`/moodboard/${b.id}`)}>
                    <span className="hv-swatches" aria-hidden>
                      {scene.palette.map((c) => (
                        <i key={c} style={{ background: c }} />
                      ))}
                    </span>
                    Vision: {b.name}
                  </button>
                ) : (
                  <button className="hv-room-vision is-empty" onClick={() => navigate('/discover')}>
                    + Find a vision for this room
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <button className="hv-discover-card" onClick={() => navigate('/discover')}>
        <span className="hv-kicker">Need ideas?</span>
        <span className="hv-discover-title">Explore nature and rooms in Discover</span>
      </button>
    </>
  );
}
