import type { Chat, Room, Snapshot } from '../state/types';
import { IsoView3D } from './IsoView3D';
import { fmtTime } from './ui';

const VERSIONS_SHOWN = 3;

/**
 * Side panel from the right (like the ChatGPT/Claude sidebar):
 * «Ny chat», chat history, saved versions and room settings.
 */
export function RoomPanel({
  room,
  chats,
  activeChatId,
  versions,
  onNewChat,
  onPickChat,
  onOpenVersion,
  onAllVersions,
  onSettings,
  onMoodboard,
  onClose,
}: {
  room: Room;
  chats: Chat[];
  activeChatId: string | null;
  versions: Snapshot[];
  onNewChat: () => void;
  onPickChat: (id: string) => void;
  onOpenVersion: (id: string) => void;
  onAllVersions: () => void;
  onSettings: () => void;
  onMoodboard: () => void;
  onClose: () => void;
}) {
  const sortedChats = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
  const sortedVersions = [...versions].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="panel-wrap panel-wrap-right" onClick={onClose}>
      <nav className="panel panel-right" aria-label={`Meny for ${room.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="topbar">
          <h2 className="topbar-title">{room.name}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Lukk meny">
            ✕
          </button>
        </div>

        <div className="scroll panel-scroll">
          <button className="panel-new" onClick={onNewChat}>
            <span aria-hidden>✎</span> Ny chat
          </button>

          <h3 className="panel-heading">Chatter</h3>
          {activeChatId === null && (
            <div className="panel-item" aria-current="true">
              Ny chat
            </div>
          )}
          {sortedChats.map((c) => (
            <button key={c.id} className="panel-item" aria-current={c.id === activeChatId} onClick={() => onPickChat(c.id)}>
              <span className="panel-item-title">{c.title}</span>
              <span className="panel-item-meta">{fmtTime(c.updatedAt)}</span>
            </button>
          ))}
          {sortedChats.length === 0 && <p className="empty">Ingen tidligere chatter.</p>}

          <h3 className="panel-heading">Lagrede versjoner</h3>
          {sortedVersions.slice(0, VERSIONS_SHOWN).map((s) => (
            <button key={s.id} className="panel-item panel-version" onClick={() => onOpenVersion(s.id)}>
              <span className="panel-thumb">
                <IsoView3D room={room} items={s.furniture} mini />
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="panel-item-title">{s.label}</span>
                <span className="panel-item-meta">{fmtTime(s.createdAt)}</span>
              </span>
            </button>
          ))}
          {sortedVersions.length > VERSIONS_SHOWN && (
            <button className="panel-link" onClick={onAllVersions}>
              Se alle ({sortedVersions.length})
            </button>
          )}
        </div>

        <div className="panel-foot">
          <button className="panel-item" onClick={onMoodboard}>
            <span aria-hidden>▦</span> Moodboard ({room.moodboard.length})
          </button>
          <button className="panel-item" onClick={onSettings}>
            <span aria-hidden>⚙</span> Rominnstillinger
          </button>
        </div>
      </nav>
    </div>
  );
}
