import { useEffect, useState } from 'react';
import { PaletteVersionImage } from './NaturePalette';
import type { Chat, Room, Snapshot } from '../state/types';
import { IsoView3D } from './IsoView3D';
import { fmtDay, IconButton, ListRow, SegmentedTabs } from './ui';

type Tab = 'chats' | 'versions';
// versions live under the clock in the chat bar now (Synne 14.11), so the menu shows only the chats; kept behind a flag
const SHOW_VERSIONS_TAB = false;

/**
 * Overlays/SidePanel: from the right, like the ChatGPT/Claude sidebar. Chats and saved versions are two tabs at the
 * bottom with a [+] beside them (like the Anara app, Synne 22.10); [+] starts a new chat or saves a version.
 * All versions are listed. Room settings sit behind the gear in the header. Tap outside to close.
 */
export function SidePanel({
  room,
  chats,
  activeChatId,
  versions,
  onNewChat,
  onPickChat,
  onOpenVersion,
  onSaveVersion,
  onSettings,
  onClose,
}: {
  room: Room;
  chats: Chat[];
  activeChatId: string | null;
  versions: Snapshot[];
  onNewChat: () => void;
  onPickChat: (id: string) => void;
  onOpenVersion: (id: string) => void;
  onSaveVersion: () => void;
  onSettings: () => void;
  onClose: () => void;
}) {
  // Versions is the default tab, and stands first (Synne 26.10)
  const [tab, setTab] = useState<Tab>(SHOW_VERSIONS_TAB ? 'versions' : 'chats');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sortedChats = [...chats].filter((c) => c.messages.length > 0).sort((a, b) => b.updatedAt - a.updatedAt);
  const sortedVersions = [...versions].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="scrim scrim-panel" onClick={onClose}>
      <nav className="side-panel" aria-label={`Menu for ${room.name}`} onClick={(e) => e.stopPropagation()}>
        <header className="side-panel-head">
          <h2>{room.name}</h2>
          <IconButton icon="settings" label="Room settings" iconSize={22} onClick={onSettings} />
        </header>

        {/* tabs at the top, under the room name (Synne 23.10, proposal A); the main action stays at the bottom */}
        {SHOW_VERSIONS_TAB ? (
        <div className="side-tabs-row">
          <SegmentedTabs
            tabs={[
              { id: 'versions', label: 'Versions' },
              { id: 'chats', label: 'Chats' },
            ]}
            value={tab}
            onChange={setTab}
            idPrefix="side-tab"
            controls="side-panel-list"
          />
        </div>
        ) : (
          <h3 className="group-heading side-panel-label">Chats</h3>
        )}

        <div className="side-panel-scroll" role={SHOW_VERSIONS_TAB ? 'tabpanel' : undefined} id="side-panel-list" aria-labelledby={SHOW_VERSIONS_TAB ? `side-tab-${tab}` : undefined}>
          {tab === 'chats' ? (
            <>
              {activeChatId === null && (
                <div className="list-row list-row-compact" aria-current="true">
                  <span className="list-row-text">
                    <span className="list-row-title">New chat</span>
                  </span>
                </div>
              )}
              {sortedChats.map((c) => (
                <ListRow key={c.id} compact divider={false} title={c.title} selected={c.id === activeChatId} onClick={() => onPickChat(c.id)} />
              ))}
              {sortedChats.length === 0 && activeChatId !== null && <p className="empty">No earlier chats.</p>}
            </>
          ) : (
            <>
              {sortedVersions.map((s) => (
                <ListRow
                  key={s.id}
                  divider={false}
                  title={s.label}
                  meta={fmtDay(s.createdAt)}
                  leading={
                    <span className="list-thumb">
                      {s.palette ? <PaletteVersionImage version={s} /> : <IsoView3D room={room} items={s.furniture} mini />}
                    </span>
                  }
                  onClick={() => onOpenVersion(s.id)}
                />
              ))}
              {sortedVersions.length === 0 && <p className="empty">No saved versions yet.</p>}
            </>
          )}
        </div>

        <div className="side-panel-foot">
          <IconButton
            icon={tab === 'chats' ? 'new_chat' : 'save'}
            variant="glass"
            label={tab === 'chats' ? 'New chat' : 'Save this version'}
            onClick={tab === 'chats' ? onNewChat : onSaveVersion}
          />
        </div>
      </nav>
    </div>
  );
}
