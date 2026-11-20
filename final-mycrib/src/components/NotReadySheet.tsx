// A room that isn't built in the prototype yet (Bedroom, Kitchen, Home Office, Hallway): instead of opening it,
// a sheet says so and offers the Living Room (Synne 04.11, she chose this over a «Coming soon» badge or an empty room).
import { useCallback } from 'react';
import { isRoomReady } from '../state/mutations';
import { useStore } from '../state/store';
import { STAND, STAND_HIDE_LIVING } from '../stand';
import { BottomSheet, navigate } from './ui';

const LIVING_ROOM = 'r_living';

/** Only the Living Room opens from a room card or the room switcher (Synne 17.11) – also rooms the user made herself.
 *  The others show a short message instead of the sheet. Set to false to go back to the 04.11 behaviour (the sheet,
 *  and rooms the user made open as usual). */
const ONLY_LIVING_ROOM = true;

/** Opens a room, or says it isn't ready yet if it isn't built. Returns whether the room was opened. */
export function useOpenRoom() {
  const { setNotReady, showToast } = useStore();
  return useCallback(
    (roomId: string, replace = false) => {
      // only the example rooms that aren't built stay shut – rooms the visitor makes open as usual (Synne 19.11)
      if (ONLY_LIVING_ROOM ? roomId === LIVING_ROOM || isRoomReady(roomId) : isRoomReady(roomId)) {
        navigate(`/room/${roomId}`, replace);
        return true;
      }
      if (ONLY_LIVING_ROOM) showToast(STAND && STAND_HIDE_LIVING ? 'This room isn’t ready in the prototype – try your own room' : 'Only the Living Room is ready in this prototype');
      else setNotReady(roomId);
      return false;
    },
    [setNotReady, showToast],
  );
}

export function NotReadySheet() {
  const { state, notReady, setNotReady } = useStore();
  const room = state.rooms.find((r) => r.id === notReady);
  if (!room) return null;
  const living = state.rooms.find((r) => r.id === LIVING_ROOM && !r.archived);
  const close = () => setNotReady(null);
  return (
    <BottomSheet
      title={room.name}
      onClose={close}
      primary={
        living
          ? {
              label: `Open ${living.name}`,
              onClick: () => {
                close();
                navigate(`/room/${living.id}`);
              },
            }
          : undefined
      }
    >
      <p className="sheet-intro">This room isn’t ready yet. In this prototype, only the {living?.name ?? 'Living Room'} is fully built.</p>
    </BottomSheet>
  );
}
