// Room settings, minimal and like «Room details» in «Create room» (Synne 27.10): the cover in the room card's shape, the
// name, one row for the measurements and one for the photos – you tap into them instead of seeing every method here –
// instructions for the AI (with «i»), interior style, and archive / delete at the bottom.
import { useState } from 'react';
import { Icon } from '../components/Icon';
import { BottomSheet, Button, IconButton, Loading, navigate } from '../components/ui';
import { applyMeasurements, getRoom } from '../state/mutations';
import { useStore } from '../state/store';
import type { Room } from '../state/types';
import { MeasureWizard } from './MeasureWizard';
import { area, draft, floorPlanRoom, m2, rectOf, roomShape, scannedRoom, wallCount } from '../state/measure';
import { filledFromLabel } from '../components/RoomSources';
import { PhotoPicker } from '../components/PhotoPicker';
import { FakeFiles, FakePhotoLibrary } from '../components/FakePickers';
import { IsoView3D } from '../components/IsoView3D';
import { StyleChips } from '../components/StyleChips';
import { RoomScanScreen } from './RoomScanScreen';
import { stitchPhotos } from '../state/stitch';
import { ROOM_PHOTO_MAX } from './NewRoomFlow';
import { MAKEOVERS } from '../components/Makeover';
import { ChallengeSwitch, connectedBoards, MoodboardRow, MoodboardSheet, NatureColours, setRoomBoards, syncNatureBoard, userBoards } from '../components/RoomExtras';


/** «Explore colours from nature» in Room settings (off since Synne 18.11) */
const SHOW_NATURE_IN_SETTINGS = false;

export function RoomSettingsScreen({ roomId }: { roomId: string }) {
  const { state, update, showToast } = useStore();
  const room = state.rooms.find((r) => r.id === roomId);
  const [name, setName] = useState(room?.name ?? '');
  const [instructions, setInstructions] = useState(room?.instructions ?? '');
  const [styles, setStyles] = useState<string[]>(room?.styles ?? (room?.style ? [room.style] : []));
  const [info, setInfo] = useState(false);
  // everything set when the room was made can be changed here too (Synne 14.11)
  const [challenge, setChallenge] = useState(!!room?.challenge);
  const [natures, setNatures] = useState<string[]>(room?.natures ?? []);
  const [boardIds, setBoardIds] = useState<string[]>(() => connectedBoards(state, roomId));
  const [boardDraft, setBoardDraft] = useState<string[]>([]);
  const myBoards = userBoards(state);
  const [flow, setFlow] = useState<null | 'scan' | 'measure' | 'building' | 'delete' | 'photos' | 'shape' | 'files' | 'cover' | 'boards'>(null);
  const [note, setNote] = useState<string | null>(null);

  if (!room) {
    navigate('/', true);
    return null;
  }

  const set = (recipe: (r: Room) => void) =>
    update((d) => {
      recipe(getRoom(d, roomId));
    });

  /** The «AI» rebuilds the 3D model for a moment before the change is shown. */
  const rebuild = (recipe: (r: Room) => void, message: string) => {
    setFlow('building');
    window.setTimeout(() => {
      set(recipe);
      setFlow(null);
      showToast(message);
    }, 1600);
  };

  // Seeded rooms were made by scanning but have no scan date, so fall back to when the model was built.
  const scannedAt = room.scannedAt ?? (/scan/i.test(room.createdVia ?? '') ? (room.modelUpdatedAt ?? room.updatedAt) : undefined);

  // a room made from photos only has no shape yet: the measuring tool starts from a blank rectangle
  const md = room.plan ?? (room.unmeasured ? draft() : rectOf(room.width, room.depth, room.height));
  const scanned = !!scannedAt;
  const hasPlan = !!room.floorPlan;
  // measurements typed in when the room was made stay «Entered by you», even if a scan or floor plan is added later
  const entered = /measure/i.test(room.createdVia ?? '');
  const source = room.measuresEdited ? 'Edited by you' : entered ? 'Entered by you' : filledFromLabel({ edited: false, scanned, hasPlan });

  const measured = !room.unmeasured;
  const nPhotos = room.photos.length;
  const shapeMeta = measured ? `${wallCount(md)} walls · ${m2(area(md))} m² · ${source.toLowerCase()}` : 'Not added yet';
  const photosMeta = nPhotos ? `${nPhotos} photo${nPhotos === 1 ? '' : 's'}` : 'None yet';

  const save = () => {
    update((d) => {
      const r = getRoom(d, roomId);
      r.name = name.trim() || r.name;
      r.instructions = instructions.trim();
      r.styles = styles.length ? styles : undefined;
      delete r.style;
      // stored as true / false, so «off» is remembered (the living room starts with it on, Synne 17.11)
      r.challenge = challenge;
      r.natures = natures.length ? natures : undefined;
      r.updatedAt = Date.now();
      setRoomBoards(d, roomId, boardIds);
      syncNatureBoard(d, roomId, r.name, natures);
    });
    showToast('Saved');
    navigate(`/room/${roomId}`);
  };

  const remove = () => {
    update((d) => {
      d.rooms = d.rooms.filter((r) => r.id !== roomId);
      d.chats = d.chats.filter((c) => c.roomId !== roomId);
      d.snapshots = d.snapshots.filter((s) => s.roomId !== roomId);
      delete d.activeChat[roomId];
    });
    showToast(`Deleted «${room.name}»`);
    navigate('/', true);
  };

  return (
    <div className="screen room-settings create-room">
      <header className="topbar">
        <IconButton icon="chevron_left" label="Back to the room" onClick={() => navigate(`/room/${roomId}`)} />
        <h1 className="topbar-title-static">Room settings</h1>
        <span className="topbar-spacer" />
      </header>
      <div className="screen-scroll create-scroll stack">
        <div className="nr-details">
          {/* the cover in the room card's shape (as in «Create room», Synne 27.10) */}
          <button className="nr-cover" onClick={() => setFlow('cover')} aria-label="Change the cover photo">
            {room.image ? <img src={room.image} alt="" /> : <IsoView3D room={room} items={room.furniture} mini />}
            <span className="nr-cover-change">Change photo</span>
          </button>
          <div className="field">
            <label className="field-label" htmlFor="rs-name">
              Name
            </label>
            <input id="rs-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>




          <div className="field">
            <div className="nr-label-row">
              <label className="field-label" htmlFor="rs-instructions">
                Instructions for the AI <span className="nr-optional">(optional)</span>
              </label>
              <IconButton icon="info" className="nr-info-btn" label="What are instructions for the AI?" iconSize={18} aria-expanded={info} onClick={() => setInfo((v) => !v)} />
            </div>
            {info && <p className="nr-info">Tell the AI what to keep in mind in this room – for example what to keep, what to avoid, or who lives there. The AI uses it in every chat about the room.</p>}
            <textarea id="rs-instructions" className="input textarea" rows={3} placeholder="E.g. We rent – no drilling. Keep the sofa." value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>

          <section className="nr-group" aria-labelledby="rs-style">
            <h3 className="field-label" id="rs-style">
              Interior style <span className="nr-optional">(optional)</span>
            </h3>
            <StyleChips value={styles} onChange={setStyles} labelledBy="rs-style" />
          </section>
          {myBoards.length > 0 && (
            <MoodboardRow
              boards={myBoards}
              selected={boardIds}
              onOpen={() => {
                setBoardDraft(boardIds);
                setFlow('boards');
              }}
            />
          )}
          {/* under the moodboards, as in Create room (Synne 14.11) */}
          <ChallengeSwitch value={challenge} onChange={setChallenge} />
          {/* not in Room settings either (Synne 18.11) – behind SHOW_NATURE_IN_SETTINGS */}
          {SHOW_NATURE_IN_SETTINGS && <NatureColours id="rs-nature" value={natures} onChange={setNatures} />}

          {/* the room itself, under its own heading at the end (Synne 28.10: «litt malplassert» between the name and
              the instructions); one row each – what to do with them is one tap further in (Synne 27.10) */}
          <section className="nr-group" aria-labelledby="rs-room">
            <h3 className="field-label" id="rs-room">
              The room
            </h3>
            <div className="rs-list">
              <button className="rs-row" onClick={() => setFlow('shape')}>
                <span className="rs-row-text">
                  <span>Measurements</span>
                  <small>{shapeMeta}</small>
                </span>
                <Icon name="chevron_right" size={20} />
              </button>
              <button className="rs-row" onClick={() => setFlow('photos')}>
                <span className="rs-row-text">
                  <span>Photos</span>
                  <small>{photosMeta}</small>
                </span>
                <Icon name="chevron_right" size={20} />
              </button>
            </div>
            {note && (
              <p className="group-footer" role="status">
                {note}
              </p>
            )}
          </section>
        </div>

        <div className="rs-bottom">
          <button
            className="rs-archive"
            onClick={() => {
              set((r) => {
                r.archived = !r.archived;
              });
              showToast(room.archived ? `«${room.name}» is back` : `Archived «${room.name}» – find it under All rooms`);
            }}
          >
            <Icon name="inventory" size={20} /> {room.archived ? 'Unarchive room' : 'Archive room'}
          </button>
          <button className="mf-remove" onClick={() => setFlow('delete')}>
            <Icon name="delete" size={20} /> Delete room
          </button>
        </div>
      </div>
      <footer className="create-foot">
        <Button block onClick={save}>
          Save
        </Button>
      </footer>

      {flow === 'scan' && (
        <RoomScanScreen
          roomName={room.name}
          onClose={() => setFlow(null)}
          onDone={() =>
            {
              const first = room.unmeasured;
              rebuild((r) => {
                r.scannedAt = Date.now();
                r.modelMethod = 'Scan';
                r.modelUpdatedAt = Date.now();
                if (first) {
                  Object.assign(r, roomShape(scannedRoom()));
                  r.unmeasured = undefined;
                }
              }, first ? 'The room is scanned. Your photos now help with colours and materials.' : 'The room is scanned');
              setNote(first ? null : room.measuresEdited ? 'Your own measurements are kept. The scan was used to check them.' : 'The AI compared the scan with your measurements – they match.');
            }
          }
        />
      )}
      {flow === 'measure' && (
        <MeasureWizard
          initial={md}
          startStep={room.unmeasured ? 1 : 3}
          onClose={() => setFlow(null)}
          onSave={(m) => {
            const first = room.unmeasured;
            const changed = !first && JSON.stringify(m) !== JSON.stringify(md);
            rebuild((r) => {
              applyMeasurements(r, m);
              if (first) {
                r.unmeasured = undefined;
                r.createdVia = [r.createdVia, 'measure'].filter(Boolean).join(', ');
              }
              if (changed) r.measuresEdited = true;
            }, changed ? 'The 3D model is updated with the new measurements' : 'Measurements saved');
            setNote(null);
          }}
        />
      )}
      {flow === 'building' && (
        <div className="scrim">
          <section className="sheet">
            <div className="sheet-body">
              <Loading text="Updating the 3D model …" sub="Your furniture stays where it is" />
            </div>
          </section>
        </div>
      )}
      {flow === 'files' && (
        <FakeFiles
          accept={['plan', 'pdf', 'photo']}
          onClose={() => setFlow(null)}
          onPick={(f) => {
            const first = room.unmeasured;
            rebuild((r) => {
              r.floorPlan = { name: f.name, at: Date.now() };
              if (first) {
                Object.assign(r, roomShape(floorPlanRoom()));
                r.unmeasured = undefined;
              }
            }, first ? 'The floor plan is read – the room is in 3D now' : 'The floor plan is read');
            setNote(first ? null : 'The AI compared the floor plan with your measurements – they match.');
          }}
        />
      )}
      {flow === 'cover' && (
        <FakePhotoLibrary
          max={1}
          onClose={() => setFlow(null)}
          onDone={(p) => {
            setFlow(null);
            if (p[0])
              set((r) => {
                r.image = p[0];
                r.coverOwn = true;
              });
          }}
        />
      )}
      {flow === 'shape' && (
        <BottomSheet title="Measurements" onClose={() => setFlow(null)}>
          <p className="nr-intro">{shapeMeta}</p>
          {/* the same three tiles as the + sheet (Synne 14.11: every sheet matches the one in Create room) */}
          <div className="plus-tiles">
            <button className="nr-tile" onClick={() => setFlow('measure')}>
              <Icon name="straighten" size={32} />
              <span>{measured ? 'Edit measurements' : 'Enter measurements'}</span>
            </button>
            <button className="nr-tile" onClick={() => setFlow('scan')}>
              <Icon name="scan_room" size={32} />
              <span>{scanned ? 'Scan again' : 'Scan room'}</span>
            </button>
            <button
              className="nr-tile"
              onClick={() => {
                setFlow('files');
              }}
            >
              <Icon name="floor_plan" size={32} />
              <span>{hasPlan ? 'Replace floor plan' : 'Upload floor plan'}</span>
            </button>
          </div>
        </BottomSheet>
      )}
      {flow === 'boards' && (
        <MoodboardSheet
          boards={myBoards}
          draft={boardDraft}
          setDraft={setBoardDraft}
          onClose={() => setFlow(null)}
          onDone={() => {
            setBoardIds(boardDraft);
            setFlow(null);
          }}
        />
      )}
      {flow === 'photos' && (
        <BottomSheet
          title="Photos"
          onClose={() => setFlow(null)}
          confirmLabel="Done"
          onConfirm={async () => {
            // a room has one photo: several are put together into one wide view (Synne 14.11); a made-over room stays
            // its own page after it
            const made = Object.values(MAKEOVERS);
            const own = room.photos.filter((x) => !made.includes(x));
            if (own.length > 1) {
              const one = await stitchPhotos(own);
              set((r) => {
                r.photos = [one, ...r.photos.filter((x) => made.includes(x))];
                if (!r.image || own.includes(r.image)) r.image = one;
              });
              showToast('Your photos are put together into one view');
            }
            setFlow(null);
          }}
        >
          <PhotoPicker
            max={ROOM_PHOTO_MAX + room.photos.filter((x) => Object.values(MAKEOVERS).includes(x)).length}
            photos={room.photos}
            onAdd={(t) =>
              set((r) => {
                r.photos = [...r.photos, ...t];
              })
            }
            onRemove={(i) =>
              set((r) => {
                r.photos = r.photos.filter((_, k) => k !== i);
              })
            }
          />
        </BottomSheet>
      )}
      {flow === 'delete' && (
        <BottomSheet title={`Delete ${room.name}?`} onClose={() => setFlow(null)}>
          <p className="sheet-intro">The room, its chats and saved versions are deleted. This can’t be undone.</p>
          <div className="button-row">
            <Button variant="secondary" onClick={() => setFlow(null)}>
              Cancel
            </Button>
            <Button className="btn-danger" onClick={remove}>
              Delete
            </Button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
