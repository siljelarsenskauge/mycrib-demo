import { useEffect, useState } from 'react';
import { STAND, shownRooms } from '../stand';
import { Icon } from '../components/Icon';
import { BoardCard, InspoGrid, NewMoodboardSheet, ProductSheet, SavedGrid } from '../components/Inspo';
import { BottomSheet, Button, ConfirmDialog, IconButton, ListRow, navigate, SegmentedTabs } from '../components/ui';
import { boardScene, boardsOf, editBoards, inspoSrc, moreLike, PRODUCTS, sceneById, setBoardRoom, titleOf, type Product } from '../state/inspo';
import { useStore } from '../state/store';
import type { Moodboard } from '../state/types';

// «Images | Find more» tabs dropped (Synne 12.11): «Find more photos» is the main button instead. Kept behind a flag
const SHOW_BOARD_TABS = false;

type Sheet = null | 'menu' | 'rename' | 'room' | 'delete';

/** One moodboard: its images, and «Find more» with images like them. Everything else is behind the three dots (Synne 06.11). */
export function MoodboardScreen({ boardId, more = false }: { boardId: string; more?: boolean }) {
  const { state, update, showToast } = useStore();
  // the stand's moodboard trip: a board is open, so Home stops glowing (Synne 18.11)
  useEffect(() => {
    if (STAND)
      update((d) => {
        if (d.standTrip === 'boards') d.standTrip = undefined;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [name, setName] = useState('');
  const [removing, setRemoving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const board = boardsOf(state).find((b) => b.id === boardId);
  useEffect(() => {
    if (!board) navigate('/moodboards', true);
  }, [board]);
  if (!board) return null;
  const rooms = shownRooms(state.rooms).filter((r) => !r.archived);
  const used = rooms.filter((r) => board.roomIds.includes(r.id));
  const edit = (recipe: (b: Moodboard) => void) =>
    update((d) => {
      recipe(editBoards(d).find((x) => x.id === boardId)!);
    });
  const open = (id: string) => {
    if (removing) {
      edit((b) => {
        b.items = b.items.filter((x) => x !== id);
      });
      return;
    }
    const p = PRODUCTS.find((x) => x.id === id);
    if (p) setProduct(p);
    else navigate(sceneById(id) ? `/discover/${id}` : `/image/${id}`);
  };
  return (
    <div className="screen moodboard">
      <header className="topbar">
        <IconButton icon="chevron_left" label="Back" onClick={() => navigate(more ? `/moodboard/${boardId}` : '/moodboards')} />
        {removing ? (
          // clearly a field (Synne 12.11): a pencil and an outline, so it reads as «you can change the name»
          <label className="topbar-title-edit">
            <Icon name="edit" size={16} />
            <input className="topbar-title-input" aria-label="Moodboard name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        ) : (
          <h1 className="topbar-title-static">{board.name}</h1>
        )}
        {removing ? (
          <Button
            variant="text"
            size="small"
            onClick={() => {
              const n = name.trim();
              if (n && n !== board.name)
                edit((b) => {
                  b.name = n;
                });
              setRemoving(false);
            }}
          >
            Done
          </Button>
        ) : (
          <IconButton icon="more_horiz" label="More" onClick={() => setSheet('menu')} />
        )}
      </header>
      <div className="screen-scroll moodboard-scroll">
        {/* the same pills as the filters on Home: the big tabs are only for the top level */}
        {SHOW_BOARD_TABS && (
        <div className="inspo-chips moodboard-filters">
          <button className={'inspo-chip' + (!more ? ' is-active' : '')} aria-pressed={!more} onClick={() => navigate(`/moodboard/${boardId}`, true)}>
            Images
          </button>
          <button
            className={'inspo-chip' + (more ? ' is-active' : '')}
            aria-pressed={more}
            onClick={() => {
              setRemoving(false);
              navigate(`/moodboard/${boardId}/more`, true);
            }}
          >
            Find more
          </button>
        </div>
        )}
        {more ? (
          <InspoGrid items={moreLike(board)} onOpen={(i) => navigate(`/image/${i.id}`)} />
        ) : (
          <>
            {false && removing && <p className="sheet-lead moodboard-hint">Change the name at the top, or tap an image to remove it.</p>}
            {board.items.length ? (
              <div className="inspo-grid">
                {board.items.map((id) => (
                  <div key={id} className="inspo-tile">
                    <button className="inspo-tile-main moodboard-image" aria-label={removing ? `Remove ${titleOf(id)}` : titleOf(id)} onClick={() => open(id)}>
                      <img src={inspoSrc(id)} alt="" />
                      {removing && (
                        <span className="moodboard-remove">
                          <Icon name="close" size={14} />
                        </span>
                      )}
                    </button>
                  </div>
                ))}
                {/* the colours of the board, as one more tile (proposal 06.11) */}
                {!removing && (
                  <div className="inspo-tile">
                    <div className="palette-tile" role="img" aria-label={`Colours in ${board.name}`}>
                      {boardScene(board).palette.map((c) => (
                        <span key={c} style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // an empty board: three photos from Explore in different styles, fanned out like «Add photos» (Synne 19.11)
              <div className="nr-examples board-empty-fan">
                <div className="nr-examples-fan" aria-hidden>
                  <img src={inspoSrc('r_oak_kitchen')} alt="" />
                  <img src={inspoSrc('r_burgundy_sofa')} alt="" />
                  <img src={inspoSrc('r_blue_chairs')} alt="" />
                </div>
                <p>Save photos you like from Explore. The AI uses them as a reference when it helps with your rooms.</p>
              </div>
            )}
          </>
        )}
      </div>

      {!removing && (
        <>
          <span className="surface-fade" aria-hidden />
          <div className="moodboard-cta">
            {/* an empty moodboard points to Discover; otherwise a list of rooms, since it can be used in several (Synne 06.11) */}
            {board.items.length === 0 && !more ? (
              <Button block className={STAND && state.standBoard === boardId ? 'stand-ok-btn' : ''} onClick={() => navigate('/discover')}>
                Go to Explore
              </Button>
            ) : (
              // the main thing to do on a board is to fill it: «Find more photos» (Synne 12.11). «Add to room» is in the menu
              !more ? (
                <Button block onClick={() => navigate(`/moodboard/${boardId}/more`)}>
                  Find more photos
                </Button>
              ) : (
                // the suggested photos end in a way on to all of Explore (Synne 14.11)
                <Button block onClick={() => navigate('/discover')}>
                  Go to Explore
                </Button>
              )
            )}
          </div>
        </>
      )}

      {sheet === 'menu' && (
        <BottomSheet title={board.name} onClose={() => setSheet(null)}>
          {/* «Add to room» moved here from the bottom button (my proposal, 12.11) */}
          <ListRow
            divider={false}
            chevron={false}
            title={used.length === 0 ? 'Add to room' : used.length === 1 ? `Used in ${used[0].name}` : `Used in ${used.length} rooms`}
            leading={<Icon name="link" />}
            onClick={() => setSheet('room')}
          />
          {/* «Rename» and «Remove images» in one «Edit» (Synne 12.11): edit the name at the top, tap images to remove them */}
          <ListRow
            divider={false}
            chevron={false}
            title="Edit"
            leading={<Icon name="edit" />}
            onClick={() => {
              setName(board.name);
              setSheet(null);
              setRemoving(true);
              navigate(`/moodboard/${boardId}`, true);
            }}
          />
          <ListRow
            divider={false}
            chevron={false}
            title={board.archived ? 'Unarchive' : 'Archive'}
            leading={<Icon name="inventory" />}
            onClick={() => {
              edit((b) => {
                b.archived = !b.archived;
              });
              showToast(board.archived ? `${board.name} is back` : `${board.name} is archived`);
              setSheet(null);
              if (!board.archived) navigate('/moodboards');
            }}
          />
          <ListRow divider={false} chevron={false} title={<span className="text-danger">Delete</span>} leading={<span className="text-danger"><Icon name="delete" /></span>} onClick={() => setSheet('delete')} />
        </BottomSheet>
      )}
      {sheet === 'delete' && (
        <ConfirmDialog
          title={`Delete ${board.name}?`}
          text="The images stay in Discover."
          confirmLabel="Delete"
          onCancel={() => setSheet(null)}
          onConfirm={() => {
            edit((b) => {
              b.deleted = true;
              b.roomIds = [];
            });
            showToast(`${board.name} is deleted`);
            navigate('/moodboards');
          }}
        />
      )}
      {sheet === 'rename' && (
        <BottomSheet
          title="Rename moodboard"
          onClose={() => setSheet(null)}
          primary={{
            label: 'Save',
            disabled: !name.trim(),
            onClick: () => {
              edit((b) => {
                b.name = name.trim();
              });
              setSheet(null);
            },
          }}
        >
          <div className="field">
            <label className="field-label" htmlFor="mb-rename">
              Name
            </label>
            <input id="mb-rename" className="input" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </BottomSheet>
      )}
      {sheet === 'room' && (
        <BottomSheet title="Use in rooms" onClose={() => setSheet(null)} primary={{ label: 'Done', onClick: () => setSheet(null) }}>
          <div className="room-pick">
            {rooms.map((r) => {
              const on = board.roomIds.includes(r.id);
              return (
                <button
                  key={r.id}
                  className={'room-pick-card' + (on ? ' is-active' : '')}
                  aria-pressed={on}
                  onClick={() =>
                    update((d) => {
                      setBoardRoom(d, boardId, r.id, !on);
                    })
                  }
                >
                  <span className="room-pick-img">{r.image && <img src={r.image} alt="" />}</span>
                  <span className="room-pick-name">{r.name}</span>
                </button>
              );
            })}
          </div>
        </BottomSheet>
      )}
      {product && <ProductSheet product={product} onClose={() => setProduct(null)} />}
    </div>
  );
}

/** All moodboards (10.11): like «All rooms», with the saved images and the archived boards as tabs, so nothing is lost
 *  now that the filter chips on Home are hidden. */
export function MoodboardsScreen() {
  const { state } = useStore();
  const [tab, setTab] = useState<'boards' | 'saved' | 'archived'>('boards');
  const [creating, setCreating] = useState(false);
  const all = boardsOf(state);
  const list = all.filter((b) => (tab === 'archived' ? b.archived : !b.archived));
  return (
    <div className="screen">
      <header className="topbar">
        <IconButton icon="chevron_left" label="Back" onClick={() => history.back()} />
        <h1 className="topbar-title-static">Moodboards</h1>
        <IconButton icon="add" label="New moodboard" onClick={() => setCreating(true)} />
      </header>
      <div className="screen-scroll all-rooms-scroll">
        <SegmentedTabs
          className="all-rooms-tabs"
          tabs={[
            { id: 'boards', label: 'Moodboards' },
            { id: 'saved', label: 'Saved' },
            { id: 'archived', label: 'Archived' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'saved' ? (
          <SavedGrid />
        ) : list.length ? (
          <div className="board-grid">
            {list.map((b) => (
              <BoardCard key={b.id} board={b} />
            ))}
          </div>
        ) : (
          <p className="empty">{tab === 'archived' ? 'No archived moodboards.' : 'No moodboards yet.'}</p>
        )}
      </div>
      {creating && <NewMoodboardSheet onClose={() => setCreating(false)} />}
    </div>
  );
}
