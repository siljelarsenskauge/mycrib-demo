import { useState } from 'react';
import { PinGrid, PinterestExplore } from '../components/Moodboard';
import { TopBar } from '../components/ui';
import { getRoom, togglePin } from '../state/mutations';
import { useStore } from '../state/store';
import type { Pin } from '../state/types';

/** Moodboard per room: saved inspiration, plus simulated Pinterest to find more. */
export function MoodboardScreen({ roomId }: { roomId: string }) {
  const { state, update } = useStore();
  const room = state.rooms.find((r) => r.id === roomId);
  const [tab, setTab] = useState<'board' | 'explore'>(room && room.moodboard.length ? 'board' : 'explore');
  if (!room) return null;
  const saved = new Set(room.moodboard.map((p) => p.id));
  const toggle = (p: Pin) => update((d) => togglePin(getRoom(d, roomId), p));

  return (
    <div className="screen">
      <TopBar title={`Moodboard · ${room.name}`} back={`/room/${roomId}`} />
      <div className="scroll">
        <div className="tabs" role="tablist" style={{ marginTop: -16 }}>
          <button role="tab" aria-selected={tab === 'board'} onClick={() => setTab('board')}>
            Lagret ({room.moodboard.length})
          </button>
          <button role="tab" aria-selected={tab === 'explore'} onClick={() => setTab('explore')}>
            Utforsk Pinterest
          </button>
        </div>
        {tab === 'board' ? (
          <>
            <p className="hint" style={{ marginBottom: 10 }}>
              Lagre og fjern bilder med bokmerket. Bruk dem i chatten via [+] → Inspirasjon.
            </p>
            <PinGrid pins={room.moodboard} savedIds={saved} onToggleSave={toggle} empty="Moodboardet er tomt. Finn bilder under «Utforsk Pinterest»." />
          </>
        ) : (
          <PinterestExplore savedIds={saved} onToggleSave={toggle} />
        )}
      </div>
    </div>
  );
}
