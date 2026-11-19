import { useRef, useState } from 'react';
import { StandTasks } from '../components/StandDone';
import { Icon } from '../components/Icon';
import { AddMenu } from '../components/AddMenu';
import { BoardCard, NewMoodboardSheet, SavedGrid, SurfaceSwitch, navSlide } from '../components/Inspo';
import { FakePhotoLibrary, FURNITURE_PHOTOS } from '../components/FakePickers';
import { FurniturePreview, type CaptureMethod } from '../components/FurniturePreview';
import { IsoView3D } from '../components/IsoView3D';
import { useOpenRoom } from '../components/NotReadySheet';
import { NatureRow } from '../components/NaturePalette';
import { RoomCard } from '../components/RoomCard';
import { BottomSheet, navigate, SectionHeader } from '../components/ui';
import { boardsOf } from '../state/inspo';
import { AMETHYST, AMETHYST_OWN_PAGE, NATURE_PALETTES, type NaturePalette } from '../state/nature';
import { isRoomReady, recentFirst } from '../state/mutations';
import { useStore } from '../state/store';
import type { Attachment } from '../state/types';
import { HOME_VARIANTS, HomeVariant } from './HomeVariants';
import { NewRoomFlow } from './NewRoomFlow';
import { CreateBody, MineBody, RoomsBody, StudioBody } from '../components/NavSurfaces';
import { NAV } from '../state/nav';
import { MyCribTab, NatureTab } from '../components/NavV3';
import { MAIN_STORY, markStandWelcomed, MENU, MOMENTS, resetStand, STAND, standWelcomed, standHome, shownRooms } from '../stand';
import { FigAvatar } from '../components/FigPeek';
import { DiscoverContent } from './DiscoverScreen';

type Overlay =
  | null
  | { kind: 'plus' }
  | { kind: 'capture'; method: CaptureMethod; initial?: Attachment; photo?: string; resume?: Attachment }
  | { kind: 'pickRoom'; attachment: Attachment; method?: CaptureMethod }
  | { kind: 'newRoom'; start?: 'scan' | 'plan' | 'measure' | 'photos' }
  | { kind: 'newBoard' }
  | { kind: 'photos' };

/** HomeScreen (Synne's frames in Figma, 06.11): rooms and moodboards as two tabs, and one + for everything new. Chats live in each room's side panel. */
/** The filter chips on Home (All rooms / Pinned / Archived, Saved / Moodboards / Archived) are hidden for now, so the
 *  screen has less noise (Synne 10.11). The code is kept: set this to true to bring them back. */
const SHOW_FILTERS = false;
/** «stacked»: rooms and the vision under each other on one page (Synne 10.11). «tabs»: the two text tabs from 06.11, kept to switch back. */
const HOME_LAYOUT: 'stacked' | 'tabs' = 'stacked';

// the sand «Try nature in your room» card on Explore: removed by Synne (Figma comment 11.11), kept behind a flag
const SHOW_TRY_CARD = false;
/** the stand's tasks as a menu to pick from (19.11); replaced by steps in order with one «Start» (Synne 19.11) */
const SHOW_TASK_PICKER = false;


/** «Which room?» after scanning an item: a photo of the room as it is before the item goes in (Silje 13.11). */
const PICK_IMAGE: Record<string, string> = { r_living: '/rooms/living-empty.jpg' };

export function HomeScreen({ creating = false, tab = 'rooms', showSaved = false, variant, surface = 'home', seg = 'nature', natureId }: { creating?: boolean; tab?: 'rooms' | 'boards'; showSaved?: boolean; variant?: number; surface?: 'home' | 'creative' | 'nature'; seg?: 'nature' | 'discover'; natureId?: string }) {
  const { state, update } = useStore();
  // «Create room» opens as a sheet over the home screen (Synne 27.10); /new-room opens it straight away
  const [overlay, setOverlay] = useState<Overlay>(creating ? { kind: 'newRoom' } : null);

  const openRoom = useOpenRoom();
  // the stand (Synne 18.11): until the sofa is in the living room, the way there glows – + → Add furniture → Scan item
  /** start a side trip (Synne 18.11): table and nature start in the living room, boards and own room glow on Home */
  const startTrip = (id: string) => {
    // a moodboard: + → New moodboard glow, then Explore (Synne 19.11)
    if (id === MOMENTS[2] || id === MOMENTS[3])
      update((d) => {
        d.standTrip = id === MOMENTS[2] ? 'boards' : 'room';
      });
    else {
      update((d) => {
        d.standAsk = id;
      });
      navigate(`/room/${standHome(state)}`);
    }
  };
  /** the stand's menu (Synne 19.11): one line per choice, your own room first; what is done is greyed out */
  const isDone = (id: string) => (state.standDone ?? []).includes(id);
  const StandMenu = ({ first = false }: { first?: boolean }) => (
    <>
      {MENU.map((id, i) => {
        const done = isDone(id);
        return (
          <button
            key={id}
            type="button"
            className={'stand-trip' + (first && i === 0 && !done ? ' is-main' : '') + (done ? ' is-done' : '')}
            onClick={() => {
              markStandWelcomed();
              setWelcome(false);
              setTasksOpen(false);
              // the sofa story: + → Add furniture → Scan item glow, as before
              if (id !== MAIN_STORY.id) startTrip(id);
              else
                update((d) => {
                  d.standTrip = 'sofa';
                });
            }}
          >
            <span className="stand-trip-text">
              <strong>{id}</strong>
            </span>
            {done ? <Icon name="check" size={18} /> : <Icon name="chevron_right" size={18} />}
          </button>
        );
      })}
    </>
  );
  // the stand (Synne 19.11): Fig welcomes the visitor in a popup with a menu of what to try
  const [welcome, setWelcome] = useState(STAND && !creating && !standWelcomed());
  // «Oppgaver»: a small button over the app, not a card in it (Synne 19.11), opens the same menu again
  const [tasksOpen, setTasksOpen] = useState(false);
  const doneCount = MENU.filter((id) => (state.standDone ?? []).includes(id)).length;
  const showWay = STAND && !state.standSofa && state.standTrip === 'sofa';
  // a side trip picked: «Lag ditt eget rom» glows + → Create room → Scan room (Synne 18.11)
  const showRoom = STAND && state.standTrip === 'room';
  const showBoard = STAND && state.standTrip === 'boards';
  // the stand (Synne 17.11): three quick taps on «MyCrib» start the app over for the next visitor
  const resetTaps = useRef<number[]>([]);
  const tapToReset = () => {
    const now = Date.now();
    resetTaps.current = [...resetTaps.current.filter((t) => now - t < 900), now];
    if (resetTaps.current.length >= 3) resetStand();
  };
  const placeIn = (roomId: string, attachment: Attachment) => {
    if (!isRoomReady(roomId)) {
      setOverlay(null);
      openRoom(roomId);
      return;
    }
    update((d) => {
      d.activeChat[roomId] = null; // start a fresh chat for this item
      d.pending = { roomId, attachment };
    });
    navigate(`/room/${roomId}`);
  };

  const [plusMenu, setPlusMenu] = useState<{ kind: 'room' | 'furniture'; anchor: HTMLElement } | null>(null);
  const [roomFilter, setRoomFilter] = useState<'all' | 'pinned' | 'archived'>('all');
  const [archivedBoards, setArchivedBoards] = useState(false);
  const rooms = recentFirst(
    shownRooms(state.rooms).filter((r) => (roomFilter === 'archived' ? r.archived : !r.archived && (roomFilter === 'all' || r.pinned))),
  );
  const pickable = shownRooms(state.rooms).filter((r) => !r.archived).sort((a, b) => (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt));
  // «Which room?» at the stand: the room the tasks happen in is always there – also the hidden example living room when
  // the visitor hasn't made a room of their own (Synne 19.11)
  const storyRoom = STAND ? state.rooms.find((r) => r.id === standHome(state)) : undefined;
  const pickRooms = storyRoom && !pickable.includes(storyRoom) ? [storyRoom, ...pickable] : pickable;

  const boards = boardsOf(state).filter((b) => (archivedBoards ? b.archived : !b.archived));

  // Silje's «If nature says it fits» (07.11), merged into «The vision»: the nature photo goes to the living room's chat
  // at the stand: the visitor's own room once they have made one (Synne 19.11)
  const living = state.rooms.find((r) => r.id === (STAND ? standHome(state) : 'r_living') && !r.archived) ?? pickable[0];
  const tryNature = (p: NaturePalette) => {
    // «Amethyst Stone» has its own page, «How brave are you?»
    if (AMETHYST_OWN_PAGE && p.id === AMETHYST.id) return navigate('/nature/amethyst');
    if (!living) return;
    if (!isRoomReady(living.id)) return openRoom(living.id);
    // already shown in this palette: straight into the room, without the message again
    if (state.natureView?.roomId === living.id && state.natureView.paletteId === p.id) return navigate(`/room/${living.id}`);
    update((d) => {
      d.activeChat[living.id] = null;
      d.pendingNature = { roomId: living.id, paletteId: p.id };
    });
    navigate(`/room/${living.id}`);
  };

  // the page slides in from the side of the tab you came from, once, when it opens (Synne 11.11)
  const [slideIn] = useState(() => (navSlide.dir > 0 ? ' slide-from-right' : navSlide.dir < 0 ? ' slide-from-left' : ''));

  const captured = (a: Attachment) => {
    if (state.rooms.length === 1) placeIn(state.rooms[0].id, a);
    else setOverlay({ kind: 'pickRoom', attachment: a, method: overlay?.kind === 'capture' ? overlay.method : undefined });
  };

  return (
    <div className="screen home">
      <div className={'screen-scroll home-scroll' + slideIn}>
        {/* Nature has its own full-screen layout with the title on the photo (Synne 11.11) */}
        {surface !== 'nature' && (
          <header className="home-header">
            {surface === 'creative' ? <h1 className="nav-title">Discover your style</h1> : <h1 className="home-title" onClick={STAND ? tapToReset : undefined}>MyCrib</h1>}
            {/* the profile only on MyCrib, not on Explore and Nature (Synne 11.11) */}
            {/* a thin initial instead of the profile icon (Synne's Figma comment 11.11) */}
            {surface === 'home' && (
              <button className="home-avatar" aria-label="Profile and settings" onClick={() => navigate('/profile')}>
                {/* the profile photo (Silje 17.11, public/profilbilde) */}
                <img src="/profilbilde/blond-avatar.jpg" alt="" />
              </button>
            )}
          </header>
        )}
        {/* a quiet card into Nature, from Synne's Explore in Figma (874:15276, 11.11) */}
        {SHOW_TRY_CARD && surface === 'creative' && (
          <button className="explore-try-nature" onClick={() => navigate('/nature')}>
            Try nature in your room
          </button>
        )}

        {/* the two navigation concepts (Synne 10.11), see state/nav.ts */}
        {/* three tabs (Synne 11.11) */}
        {/* the stand (Synne 18.11): after the main story, an overview of what else there is to try, ticked off as you go */}
        {NAV === 'v3' ? (
          surface === 'creative' ? <DiscoverContent natureId={natureId} /> : surface === 'nature' ? <NatureTab /> : <MyCribTab rooms={rooms} onNewBoard={() => setOverlay({ kind: 'newBoard' })} />
        ) : surface === 'creative' ? (
          NAV === 'v1' ? <CreateBody natureId={natureId} /> : <StudioBody seg={seg} natureId={natureId} onNewBoard={() => setOverlay({ kind: 'newBoard' })} />
        ) : NAV === 'v1' ? (
          <MineBody rooms={rooms} onNewBoard={() => setOverlay({ kind: 'newBoard' })} />
        ) : NAV === 'v2' ? (
          <RoomsBody rooms={rooms} />
        ) : variant ? (
          <>
            {/* switch between the five proposals (merge test, 10.11) */}
            <nav className="hv-switch" aria-label="Proposals">
              {HOME_VARIANTS.map((name, i) => (
                <button key={i} aria-current={variant === i + 1} aria-label={`Proposal ${i + 1}: ${name}`} onClick={() => navigate(`/home/${i + 1}`, true)}>
                  {i + 1}
                </button>
              ))}
              <span className="hv-switch-name">{HOME_VARIANTS[variant - 1]}</span>
            </nav>
            <HomeVariant n={variant} rooms={rooms} tryNature={tryNature} />
          </>
        ) : HOME_LAYOUT === 'stacked' ? (
          <>
            {/* rooms and the vision on one page, one after the other (Synne 10.11, inspired by Silje's home) */}
            {/* «Recent rooms» with «All rooms», as on the home screen before 06.11 (Synne 10.11) */}
            <section className="home-block home-block-rooms" aria-label="Recent rooms">
              <SectionHeader title="Recent rooms" link="All rooms" onLink={() => navigate('/rooms')} />
              {rooms.length ? (
                <div className="room-row home-room-row">
                  {rooms.map((r) => (
                    <RoomCard key={r.id} room={r} />
                  ))}
                </div>
              ) : (
                <p className="empty">No rooms yet. Tap + to make one.</p>
              )}
            </section>
            <section className="home-block" aria-labelledby="home-vision">
              <h2 id="home-vision" className="home-block-title">The vision</h2>
            {living && (
              <section className="vision-nature" aria-label="If nature says it fits, then it fits">
                <h2 className="group-heading">Try nature in your room</h2>
                <NatureRow palettes={[...NATURE_PALETTES, AMETHYST]} onPick={tryNature} />
              </section>
            )}
            {SHOW_FILTERS && <Filters
              value={showSaved ? 'saved' : archivedBoards ? 'archived' : 'all'}
              onChange={(v) => {
                setArchivedBoards(v === 'archived');
                // in the address, so Back from an image returns to the saved images
                navigate(v === 'saved' ? '/moodboards/saved' : '/moodboards', true);
              }}
              options={[
                ['saved', 'Saved'],
                ['all', 'Moodboards'],
                ['archived', 'Archived'],
              ]}
            />}
            {showSaved ? (
              <SavedGrid />
            ) : (
              <div className="board-grid">
                {boards.map((b) => (
                  <BoardCard key={b.id} board={b} />
                ))}
              </div>
            )}
            {!showSaved && boards.length === 0 && <p className="empty">{archivedBoards ? 'No archived moodboards.' : 'No moodboards yet. Tap + to make one.'}</p>}
            </section>
          </>
        ) : (
          <>
        {/* big text with a line under the active tab (Figma V1, Synne 06.11) */}
        <div className="text-tabs" role="tablist" aria-label="Show">
          <button role="tab" aria-selected={tab === 'rooms'} onClick={() => navigate('/', true)}>
            Your rooms
          </button>
          <button role="tab" aria-selected={tab === 'boards'} onClick={() => navigate('/moodboards', true)}>
            The vision
          </button>
        </div>
            {tab === 'rooms' ? (
              <>
            {SHOW_FILTERS && <Filters
              value={roomFilter}
              onChange={setRoomFilter}
              options={[
                ['all', 'All rooms'],
                ['pinned', 'Pinned'],
                ['archived', 'Archived'],
              ]}
            />}
            {rooms.length ? (
              <div className="room-grid">
                {rooms.map((r) => (
                  <RoomCard key={r.id} room={r} size="grid" />
                ))}
              </div>
            ) : (
              <p className="empty">{roomFilter === 'pinned' ? 'No pinned rooms yet. Hold on a room to pin it.' : roomFilter === 'archived' ? 'No archived rooms.' : 'No rooms yet. Tap + to make one.'}</p>
            )}
              </>
            ) : (
              <>
            {living && (
              <section className="vision-nature" aria-label="If nature says it fits, then it fits">
                <h2 className="group-heading">Try nature in your room</h2>
                <NatureRow palettes={[...NATURE_PALETTES, AMETHYST]} onPick={tryNature} />
              </section>
            )}
            {SHOW_FILTERS && <Filters
              value={showSaved ? 'saved' : archivedBoards ? 'archived' : 'all'}
              onChange={(v) => {
                setArchivedBoards(v === 'archived');
                // in the address, so Back from an image returns to the saved images
                navigate(v === 'saved' ? '/moodboards/saved' : '/moodboards', true);
              }}
              options={[
                ['saved', 'Saved'],
                ['all', 'Moodboards'],
                ['archived', 'Archived'],
              ]}
            />}
            {showSaved ? (
              <SavedGrid />
            ) : (
              <div className="board-grid">
                {boards.map((b) => (
                  <BoardCard key={b.id} board={b} />
                ))}
              </div>
            )}
            {!showSaved && boards.length === 0 && <p className="empty">{archivedBoards ? 'No archived moodboards.' : 'No moodboards yet. Tap + to make one.'}</p>}
              </>
            )}
          </>
        )}
      </div>

      {/* no + on Nature: it is a tool, and + would cover «Save as version» (11.11) */}
      {(welcome || tasksOpen) && surface === 'home' && (
        <BottomSheet
          label={welcome ? 'Velkommen til MyCrib' : 'Oppgaver'}
          onClose={() => {
            markStandWelcomed();
            setWelcome(false);
            setTasksOpen(false);
          }}
        >
          {/* the steps in order, one button to start (Synne 19.11) – was a menu to pick from */}
          {SHOW_TASK_PICKER && <StandMenu first />}
          <StandTasks
            welcome={welcome}
            onClose={() => {
              markStandWelcomed();
              setWelcome(false);
              setTasksOpen(false);
            }}
          />
        </BottomSheet>
      )}
      {STAND && !welcome && !tasksOpen && surface === 'home' && (
        <button type="button" className="stand-tasks-btn" onClick={() => setTasksOpen(true)} aria-label={`Oppgaver, ${doneCount} av ${MENU.length} ferdig`}>
          <FigAvatar mood="happy" size={26} />
          Oppgaver
          <span className="stand-tasks-count">
            {doneCount}/{MENU.length}
          </span>
        </button>
      )}
      {surface !== 'nature' && <button className={'home-fab' + (showWay || showRoom || showBoard ? ' stand-next' : '')} aria-label="Add" aria-expanded={overlay?.kind === 'plus'} onClick={() => {
          setPlusMenu(null);
          setOverlay({ kind: 'plus' });
        }}>
        <Icon name="add" />
      </button>}
      <SurfaceSwitch active={surface === 'creative' ? 'discover' : surface === 'nature' ? 'nature' : 'home'} />

      {/* «Item photo»: the same pretend photo library as «Create room» → «Add photos», with furniture photos (Synne 04.11).
          The item is recognised from the first photo picked */}
      {overlay?.kind === 'photos' && (
        <FakePhotoLibrary photos={FURNITURE_PHOTOS} onClose={() => setOverlay(null)} onDone={(ps) => setOverlay({ kind: 'capture', method: 'upload', photo: ps[0] })} />
      )}

      {overlay?.kind === 'newBoard' && <NewMoodboardSheet onClose={() => setOverlay(null)} />}
      {/* + opens three big boxes, and a box opens a glass menu (Synne 06.11) */}
      {overlay?.kind === 'plus' && (
        <BottomSheet title="Add" onClose={() => setOverlay(null)}>
          <div className="plus-tiles">
            <button className={'nr-tile' + (showRoom ? ' stand-next' : '')} aria-haspopup="menu" aria-expanded={plusMenu?.kind === 'room'} onClick={(e) => setPlusMenu({ kind: 'room', anchor: e.currentTarget })}>
              <Icon name="home" size={32} />
              <span>Create room</span>
            </button>
            <button className={'nr-tile' + (showWay ? ' stand-next' : '')} aria-haspopup="menu" aria-expanded={plusMenu?.kind === 'furniture'} onClick={(e) => setPlusMenu({ kind: 'furniture', anchor: e.currentTarget })}>
              <Icon name="scan_camera" size={32} />
              <span>Add furniture</span>
            </button>
            <button className={'nr-tile' + (showBoard ? ' stand-next' : '')} onClick={() => setOverlay({ kind: 'newBoard' })}>
              <Icon name="moodboard" size={32} />
              <span>New moodboard</span>
            </button>
          </div>
        </BottomSheet>
      )}
      {overlay?.kind === 'plus' && plusMenu && (
        <AddMenu
          overSheet
          placement="above"
          anchor={plusMenu.anchor}
          choices={plusMenu.kind === 'room' ? ['scanRoom', 'plan', 'measure', 'photos'] : ['scan', 'upload', 'link']}
          highlight={plusMenu.kind === 'room' ? 'scanRoom' : showWay ? 'scan' : undefined}
          onClose={() => setPlusMenu(null)}
          onPick={(c) => {
            setPlusMenu(null);
            // the room trip is under way: Home stops glowing
            if (STAND && state.standTrip === 'room') update((d) => { d.standTrip = undefined; });
            if (c === 'scanRoom') setOverlay({ kind: 'newRoom', start: 'scan' });
            else if (c === 'plan' || c === 'measure' || c === 'photos') setOverlay({ kind: 'newRoom', start: c });
            else if (c === 'upload') setOverlay({ kind: 'photos' });
            else setOverlay({ kind: 'capture', method: c as CaptureMethod });
          }}
        />
      )}
      {overlay?.kind === 'capture' && (
        <FurniturePreview
          method={overlay.method}
          initial={overlay.initial}
          resume={overlay.resume}
          photo={overlay.photo}
          // + → Add furniture finds the beige sofa: Silje's talk with the fig starts when it lands in the living room (Synne 18.11)
          scanDemo="sofa"
          confirmLabel={state.rooms.length === 1 ? 'See in room' : 'Choose room'}
          onClose={() => setOverlay(null)}
          onAttach={captured}
        />
      )}
      {overlay?.kind === 'newRoom' && (
        <NewRoomFlow
          start={overlay.start}
          onClose={() => {
            setOverlay(null);
            if (creating) navigate('/', true);
          }}
        />
      )}
      {overlay?.kind === 'pickRoom' && (
        <BottomSheet
          title="Which room?"
          // back to «What the AI saw», with the same item (Synne 19.11)
          onBack={overlay.method ? () => setOverlay({ kind: 'capture', method: overlay.method!, resume: overlay.attachment }) : undefined}
          onClose={() => setOverlay(null)}
        >
          {/* big photos, so you can tell the rooms apart at a glance (Synne 22.10) */}
          <div className="room-pick">
            {pickRooms.map((r) => (
              // the stand: the living room shows the way, the rooms that aren't built are dimmed (Synne 18.11)
              <button key={r.id} className={'room-pick-card' + (STAND ? (r.id === standHome(state) ? ' stand-next' : ' is-dim') : '')} disabled={STAND && r.id !== standHome(state)} data-soon={STAND && r.id !== standHome(state) ? 'Not ready' : undefined} onClick={() => placeIn(r.id, overlay.attachment)}>
                {/* the living room without its sofa: you are about to put furniture into it (Silje 13.11) */}
                <span className="room-pick-img">{r.image ? <img src={PICK_IMAGE[r.id] ?? r.image} alt="" /> : <IsoView3D room={r} items={r.furniture} mini />}</span>
                <span className="room-pick-name">{r.name}</span>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function Filters<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="inspo-chips home-filters">
      {options.map(([id, label]) => (
        <button key={id} className={'inspo-chip' + (value === id ? ' is-active' : '')} aria-pressed={value === id} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}
