import { useState } from 'react';
import { FurniturePreview, type CaptureMethod } from '../components/FurniturePreview';
import { IsoView3D } from '../components/IsoView3D';
import { MyFurnitureSheet } from '../components/PickerSheets';
import { PlusMenu } from '../components/PlusMenu';
import { fmtTime, ModalSheet, navigate } from '../components/ui';
import { useStore } from '../state/store';
import type { Attachment, Room } from '../state/types';

const MAX_PINNED = 4;

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.4 7.4 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.4 7.4 0 0 0 2.6-1.5l2.4 1 2-3.4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M6 2h6l-1 5 3 3H4l3-3zM9 10v6"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Overlay =
  | null
  | { kind: 'plus' }
  | { kind: 'capture'; method: CaptureMethod; initial?: Attachment }
  | { kind: 'library' }
  | { kind: 'pickRoom'; attachment: Attachment };

/** Forside: Rommene dine. The [+] lets the user quickly check a piece of furniture (e.g. in a store). */
export function RoomsScreen() {
  const { state, update, showToast } = useStore();
  const [overlay, setOverlay] = useState<Overlay>(null);

  const placeIn = (roomId: string, attachment: Attachment) => {
    update((d) => {
      d.activeChat[roomId] = null; // start a fresh chat for this furniture
      d.pending = { roomId, attachment };
    });
    navigate(`/room/${roomId}`);
  };

  const pinned = state.rooms.filter((r) => r.pinned).slice(0, MAX_PINNED);
  const others = state.rooms
    .filter((r) => !pinned.includes(r))
    .sort((a, b) => (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt));

  const togglePinned = (roomId: string) => {
    const room = state.rooms.find((x) => x.id === roomId)!;
    if (!room.pinned && pinned.length >= MAX_PINNED) {
      showToast(`Du kan feste maks ${MAX_PINNED} rom. Løsne et annet rom først.`);
      return;
    }
    update((d) => {
      const r = d.rooms.find((x) => x.id === roomId)!;
      r.pinned = !r.pinned;
    });
  };

  const roomCard = (r: Room, small = false) => (
    <div key={r.id} className={'room-card' + (small ? ' room-card-small' : '')}>
      <button className="room-card-main" onClick={() => navigate(`/room/${r.id}`)}>
        <span className="room-card-img">
          <IsoView3D room={r} items={r.furniture} mini />
        </span>
        <span className="room-card-name">{r.name}</span>
      </button>
      <button className="pin-btn" aria-pressed={!!r.pinned} onClick={() => togglePinned(r.id)} aria-label={r.pinned ? `Løsne ${r.name}` : `Fest ${r.name} øverst`}>
        <PinIcon filled={!!r.pinned} />
      </button>
    </div>
  );

  const captured = (a: Attachment) => {
    if (state.rooms.length === 1) placeIn(state.rooms[0].id, a);
    else setOverlay({ kind: 'pickRoom', attachment: a });
  };

  const chats = state.chats.filter((c) => c.messages.length > 0).sort((a, b) => b.updatedAt - a.updatedAt);
  const roomName = (id: string) => state.rooms.find((r) => r.id === id)?.name ?? '';
  const openChat = (roomId: string, chatId: string) => {
    update((d) => {
      d.activeChat[roomId] = chatId;
    });
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="screen" style={{ position: 'relative' }}>
      <header className="topbar">
        <h1 className="topbar-title" style={{ fontSize: 'var(--fs-xl)', fontWeight: 700 }}>
          Hei, {state.profile.name?.trim() || 'Synne'}!
        </h1>
        <button className="icon-btn" onClick={() => navigate('/profile')} aria-label="Profil og innstillinger" style={{ marginRight: 4 }}>
          <GearIcon />
        </button>
      </header>
      <div className="scroll" style={{ paddingBottom: 110 }}>
        <div className="home-section-head">
          <h2 className="home-heading">Rommene dine</h2>
          <button className="icon-btn new-room-btn" onClick={() => navigate('/new-room')} aria-label="Nytt rom" title="Nytt rom">
            +
          </button>
        </div>

        {/* up to 4 pinned rooms as a gallery */}
        {pinned.length > 0 ? (
          <div className="room-grid">{pinned.map((r) => roomCard(r))}</div>
        ) : (
          <p className="hint" style={{ margin: '0 4px 4px' }}>
            Fest opptil {MAX_PINNED} rom med nålen, så ligger de her.
          </p>
        )}

        {/* the rest as a carousel, most recently opened first */}
        {others.length > 0 && (
          <>
            <h3 className="panel-heading" style={{ margin: '22px 4px 8px' }}>
              {pinned.length > 0 ? 'Andre rom · sist åpnet' : 'Sist åpnet'}
            </h3>
            <div className="room-carousel">{others.map((r) => roomCard(r, true))}</div>
          </>
        )}

        {/* chat history across all rooms, newest first */}
        <h2 className="panel-heading" style={{ margin: '28px 4px 6px' }}>
          Chatter
        </h2>
        {chats.length === 0 && <p className="empty">Ingen chatter ennå.</p>}
        {chats.map((c) => (
          <button key={c.id} className="panel-item" onClick={() => openChat(c.roomId, c.id)}>
            <span className="panel-item-title">{c.title}</span>
            <span className="panel-item-meta">
              {roomName(c.roomId)} · {fmtTime(c.updatedAt)}
            </span>
          </button>
        ))}
      </div>

      {/* «Sjekk møbel» (camera with scan frame) – clearly different from «Nytt rom» in the top bar */}
      <button className="fab fab-scan" onClick={() => setOverlay({ kind: 'plus' })} aria-label="Sjekk et møbel: skann, ta bilde eller last opp">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
          <path d="M3 8V4.5A1.5 1.5 0 0 1 4.5 3H8M16 3h3.5A1.5 1.5 0 0 1 21 4.5V8M21 16v3.5a1.5 1.5 0 0 1-1.5 1.5H16M8 21H4.5A1.5 1.5 0 0 1 3 19.5V16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7.5 9.5h2l1-1.5h3l1 1.5h2v6h-9z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="12" cy="12.6" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span>Sjekk møbel</span>
      </button>

      {overlay?.kind === 'plus' && (
        <PlusMenu
          title="Sjekk et møbel"
          choices={['scan', 'upload', 'library']}
          onClose={() => setOverlay(null)}
          onPick={(c) => (c === 'library' ? setOverlay({ kind: 'library' }) : setOverlay({ kind: 'capture', method: c as CaptureMethod }))}
        />
      )}
      {overlay?.kind === 'library' && (
        <MyFurnitureSheet
          items={state.library}
          onClose={() => setOverlay(null)}
          onPick={(it) =>
            setOverlay({
              kind: 'capture',
              method: 'library',
              initial: { name: it.name, kind: it.kind, width: it.width, depth: it.depth, height: it.height, color: it.color, colorName: it.colorName, source: 'Mine møbler', product: it.product },
            })
          }
        />
      )}
      {overlay?.kind === 'capture' && (
        <FurniturePreview
          method={overlay.method}
          initial={overlay.initial}
          confirmLabel={state.rooms.length === 1 ? 'Se i rommet' : 'Velg rom'}
          onClose={() => setOverlay(null)}
          onAttach={captured}
        />
      )}
      {overlay?.kind === 'pickRoom' && (
        <ModalSheet title="Hvilket rom?" onClose={() => setOverlay(null)}>
          {state.rooms.map((r) => (
            <button key={r.id} className="card" onClick={() => placeIn(r.id, overlay.attachment)}>
              <span className="thumb" style={{ width: 80, height: 60 }}>
                <IsoView3D room={r} items={r.furniture} mini />
              </span>
              <span className="card-title" style={{ flex: 1 }}>
                {r.name}
              </span>
              <span className="chev">›</span>
            </button>
          ))}
        </ModalSheet>
      )}
    </div>
  );
}
