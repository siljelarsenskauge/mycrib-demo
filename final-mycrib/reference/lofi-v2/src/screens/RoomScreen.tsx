import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { RoomPanel } from '../components/RoomPanel';
import { SelectionTray } from '../components/SelectionTray';
import { SwapSheet } from '../components/SwapSheet';
import { ChatSheet, type SheetState } from '../components/ChatSheet';
import { Composer } from '../components/Composer';
import { FurniturePreview, type CaptureMethod } from '../components/FurniturePreview';
import { IsoView3D } from '../components/IsoView3D';
import { InspirationSheet, MyFurnitureSheet } from '../components/PickerSheets';
import { PlanView2D } from '../components/PlanView2D';
import { PlusMenu } from '../components/PlusMenu';
import { SaveVersionSheet } from '../components/SaveVersionSheet';
import { navigate } from '../components/ui';
import { observation, runAI } from '../state/ai';
import { clampToRoom } from '../state/geometry';
import { ensureChat, getRoom, pushUndo, saveVersion, setRoomItem, setVariant, suggestVersionName, swapItem, togglePin, undoLast } from '../state/mutations';
import { uid } from '../state/seed';
import { useStore } from '../state/store';
import type { Attachment, Furniture, Pin } from '../state/types';

function SaveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden>
      <path d="M3 2h8l2 2v10H3z M5 2v4h6V2 M5 14v-4h6v4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

type Overlay =
  | null
  | { kind: 'save' }
  | { kind: 'plus' }
  | { kind: 'capture'; method: CaptureMethod; initial?: Attachment }
  | { kind: 'inspiration'; title?: string }
  | { kind: 'library' }
  | { kind: 'panel' }
  | { kind: 'swap' };

export function RoomScreen({ roomId }: { roomId: string }) {
  const { state, update, showToast } = useStore();
  const room = state.rooms.find((r) => r.id === roomId);
  const activeId = state.activeChat[roomId] ?? null;
  const chat = state.chats.find((c) => c.id === activeId);
  const roomChats = state.chats.filter((c) => c.roomId === roomId);

  const [mode, setMode] = useState<'3d' | '2d'>('3d');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>('closed');
  // the furniture tray and the chat share the space above the input – only one is open at a time
  const [focus, setFocus] = useState<'chat' | 'tray'>('chat');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [inspirations, setInspirations] = useState<Pin[]>([]);
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const screenRef = useRef<HTMLDivElement>(null);
  const [screenH, setScreenH] = useState(760);

  useLayoutEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScreenH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // AI asked to show measurements → switch to the floor plan
  const planRequest = chat?.planRequest;
  // remember when the room was opened (sorts the carousel on the home screen)
  useEffect(() => {
    update((d) => {
      const r = d.rooms.find((x) => x.id === roomId);
      if (r) r.lastOpenedAt = Date.now();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (planRequest) setMode('2d');
  }, [planRequest]);

  // Reset local UI when switching chat. If the page was refreshed while the AI was
  // "thinking", the last message has no answer yet – answer it now.
  useEffect(() => {
    // a chat created by sending a message keeps the current selection
    if (!sendingRef.current) setSelectedId(null);
    setSheet(chat && chat.messages.length ? 'open' : 'closed');
    const last = chat?.messages[chat.messages.length - 1];
    if (chat && last?.role === 'user' && !sendingRef.current) {
      setThinking(true);
      const t = window.setTimeout(() => {
        update((d) => {
          const c = d.chats.find((x) => x.id === chat.id);
          if (c && c.messages[c.messages.length - 1]?.role === 'user') runAI(d, roomId, chat.id, last.text, last.attachment);
        });
        setThinking(false);
      }, 1200);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Furniture captured from the home screen: attach it to the input so the user can add a prompt before sending
  const pending = state.pending?.roomId === roomId ? state.pending.attachment : null;
  const handoffDone = useRef(false);
  useEffect(() => {
    if (!pending || handoffDone.current) return;
    handoffDone.current = true;
    update((d) => {
      d.pending = undefined;
    });
    setAttachment(pending);
    window.setTimeout(() => inputRef.current?.focus(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!room) {
    return (
      <div className="screen">
        <div className="scroll">
          <p>Fant ikke rommet.</p>
          <button className="btn" onClick={() => navigate('/')}>
            Til forsiden
          </button>
        </div>
      </div>
    );
  }

  const items = room.furniture;
  const selected = items.find((f) => f.id === selectedId) ?? null;

  // The chat stays secondary: at most ~1/5 of the screen
  const heights: Record<SheetState, number> = {
    closed: 36,
    open: Math.round(screenH * 0.2),
  };

  const chatIdForWrite = () => activeId ?? uid('c');

  const send = () => {
    const text = draft.trim();
    const att = attachment;
    const pins = inspirations;
    const ctx = selected;
    if (thinking || (!text && !att && pins.length === 0)) return;
    const cid = chatIdForWrite();
    // the scripted AI reads the user's text plus the hidden prompts behind the attached images
    const prompt = [text, ...pins.map((p) => p.prompt)].filter(Boolean).join('. ');
    update((d) => {
      const c = ensureChat(d, roomId, text || att?.name || pins[0]?.title || 'Ny chat', cid);
      c.messages.push({
        id: uid('m'),
        role: 'user',
        text,
        attachment: att ?? undefined,
        inspirations: pins.length ? pins.map((p) => p.title) : undefined,
        contextItem: ctx?.name,
        createdAt: Date.now(),
      });
      c.updatedAt = Date.now();
    });
    setDraft('');
    setAttachment(null);
    setInspirations([]);
    setSheet('open');
    setFocus('chat');
    setThinking(true);
    sendingRef.current = true;
    inputRef.current?.blur();
    window.setTimeout(() => {
      update((d) => {
        const c = d.chats.find((x) => x.id === cid);
        // answer only once per user message
        if (c && c.messages[c.messages.length - 1]?.role === 'user') runAI(d, roomId, cid, prompt, att ?? undefined, ctx?.id);
      });
      sendingRef.current = false;
      setThinking(false);
    }, 1100 + Math.random() * 700);
  };

  /** Dragging furniture in the room view changes the room right away */
  const applyEdit = (f: Furniture, label: string) => {
    update((d) => {
      const r = getRoom(d, roomId);
      pushUndo(r, r.furniture, label);
      setRoomItem(r, clampToRoom(r, f));
      const c = chat && d.chats.find((x) => x.id === chat.id);
      if (c) {
        c.lastTargetId = f.id;
        c.highlightId = f.id;
      }
    });
  };

  const pickChat = (id: string | null) => {
    update((d) => {
      d.activeChat[roomId] = id;
    });
    setOverlay(null);
  };

  /** One-tap swap from the selection tray (or the camera roll). Only speaks up if something gets tight. */
  const swapSelected = (a: Attachment) => {
    if (!selected) return;
    const next = clampToRoom(room, { ...selected, name: a.name, kind: a.kind, width: a.width, depth: a.depth, height: a.height, color: a.color, colorName: a.colorName, product: a.product });
    const note = observation(room, items.map((f) => (f.id === next.id ? next : f)), next).trim();
    update((d) => {
      swapItem(getRoom(d, roomId), selected.id, a);
    });
    if (note) showToast(note);
  };

  const trayOpen = !!selected && focus === 'tray' && !thinking;
  const lastUndo = room.undo?.[0];
  const undo = () => {
    update((d) => {
      undoLast(getRoom(d, roomId));
    });
    showToast(`Angret: ${lastUndo?.label.toLowerCase() ?? 'siste endring'}`);
  };

  const saveCurrent = (name: string) => {
    update((d) => saveVersion(d, roomId, name));
    setOverlay(null);
    showToast(`Lagret ✓ «${name}»`);
  };

  const dismissHint = () =>
    update((d) => {
      d.hintSeen = true;
    });

  const viewProps = {
    room,
    items,
    selectedId,
    highlightId: chat?.highlightId,
    // tapping a piece of furniture marks it; the prompt is then about it, and [+] becomes «bytt»
    onSelect: (id: string | null) => {
      setSelectedId(id);
      // marking only selects; «Chat | Forslag» by «Gjelder» switches to colours and suggestions. Unmarking closes them.
      if (!id) setFocus('chat');
      if (id && !state.hintSeen) dismissHint();
    },
    onMove: (id: string, x: number, y: number) => {
      const f = items.find((i) => i.id === id);
      if (f) applyEdit({ ...f, x, y }, `Flyttet: ${f.name}`);
    },
  };

  return (
    <div className="screen" ref={screenRef} style={{ position: 'relative' }}>
      {/* Top bar */}
      <header className="topbar">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label="Tilbake til rommene dine">
          ←
        </button>
        <h1 className="topbar-title" style={{ textAlign: 'center', paddingLeft: 0 }}>
          {room.name}
        </h1>
        <button className="icon-btn" onClick={() => setOverlay({ kind: 'panel' })} aria-label="Åpne meny: chatter, versjoner og innstillinger">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
            <rect x="3" y="4" width="16" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path d="M13.5 4v14" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </button>
      </header>

      {/* Room view */}
      <div className="room-stage">
        <div className="stage-canvas">{mode === '3d' ? <IsoView3D {...viewProps} /> : <PlanView2D {...viewProps} />}</div>

        <div className="stage-tools">
          <div className="segmented" role="group" aria-label="Visning">
            <button aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>
              3D
            </button>
            <button aria-pressed={mode === '2d'} onClick={() => setMode('2d')}>
              2D
            </button>
          </div>
          <button className="round-btn stage-save" onClick={() => setOverlay({ kind: 'save' })} aria-label="Lagre versjon" title="Lagre versjon">
            <SaveIcon />
          </button>
        </div>

        {/* one-time hint so people discover that furniture can be tapped and dragged */}
        {!state.hintSeen && !selectedId && (
          <div className="coach" role="note">
            <span>Trykk på et møbel for å markere det. Dra for å flytte det.</span>
            <button onClick={dismissHint} aria-label="Lukk tips">
              ✕
            </button>
          </div>
        )}

        {lastUndo && (
          <div className="stage-bottom">
            <button className="round-btn undo-btn" onClick={undo} aria-label={`Angre: ${lastUndo.label}`} title="Angre">
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
                <path d="M7 4 3 8l4 4M3 8h9a5 5 0 0 1 0 10H9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* in swap mode the chat is hidden completely; the «bytt» button brings it back */}
      {!trayOpen && (
        <ChatSheet
          chat={chat}
          state={sheet}
          heights={heights}
          onState={(s) => {
            setSheet(s);
            if (s === 'open') setFocus('chat');
          }}
          thinking={thinking}
        />
      )}

      {trayOpen && selected && (
        <SelectionTray
          item={selected}
          library={state.library}
          onVariant={(color, colorName) => update((d) => setVariant(getRoom(d, roomId), selected.id, color, colorName))}
          onSwap={swapSelected}
          onCamera={() => setOverlay({ kind: 'swap' })}
        />
      )}

      <Composer
        ref={inputRef}
        draft={draft}
        setDraft={setDraft}
        attachment={attachment}
        onRemoveAttachment={() => setAttachment(null)}
        contextName={selected?.name ?? null}
        panel={trayOpen ? 'tray' : 'chat'}
        onPanel={setFocus}
        inspirations={inspirations}
        onRemoveInspiration={(id) => setInspirations((list) => list.filter((p) => p.id !== id))}
        onPlus={() => setOverlay({ kind: 'plus' })}
        onSend={() => send()}
        busy={thinking}
      />

      {/* Overlays */}
      {overlay?.kind === 'swap' && selected && (
        <SwapSheet
          current={selected}
          onClose={() => setOverlay(null)}
          onSwap={(a) => {
            swapSelected(a);
            setOverlay(null);
          }}
        />
      )}
      {overlay?.kind === 'save' && (
        <SaveVersionSheet
          room={room}
          suggestion={suggestVersionName(room)}
          onSave={saveCurrent}
          onOpenList={() => navigate(`/room/${roomId}/history`)}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === 'plus' && (
        <PlusMenu
          onClose={() => setOverlay(null)}
          onPick={(c) => {
            if (c === 'inspiration') setOverlay({ kind: 'inspiration' });
            else if (c === 'library') setOverlay({ kind: 'library' });
            else setOverlay({ kind: 'capture', method: c });
          }}
        />
      )}
      {overlay?.kind === 'capture' && (
        <FurniturePreview
          method={overlay.method}
          initial={overlay.initial}
          onClose={() => setOverlay(null)}
          onAttach={(a) => {
            setAttachment(a);
            setOverlay(null);
            window.setTimeout(() => inputRef.current?.focus(), 50);
          }}
        />
      )}
      {overlay?.kind === 'inspiration' && (
        <InspirationSheet
          title={overlay.title}
          roomName={room.name}
          moodboard={room.moodboard}
          onToggleSave={(p) => update((d) => togglePin(getRoom(d, roomId), p))}
          onClose={() => setOverlay(null)}
          onAdd={(pins) => {
            setInspirations((list) => [...list, ...pins.filter((p) => !list.some((x) => x.id === p.id))]);
            setOverlay(null);
            window.setTimeout(() => inputRef.current?.focus(), 50);
          }}
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
      {overlay?.kind === 'panel' && (
        <RoomPanel
          room={room}
          chats={roomChats}
          activeChatId={activeId}
          versions={state.snapshots.filter((s) => s.roomId === roomId)}
          onNewChat={() => pickChat(null)}
          onPickChat={(id) => pickChat(id)}
          onOpenVersion={(id) => navigate(`/room/${roomId}/history/${id}`)}
          onAllVersions={() => navigate(`/room/${roomId}/history`)}
          onSettings={() => navigate(`/room/${roomId}/settings`)}
          onMoodboard={() => setOverlay({ kind: 'inspiration', title: 'Moodboard' })}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  );
}
