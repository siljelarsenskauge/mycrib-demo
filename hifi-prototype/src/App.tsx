import { useEffect } from 'react';
import { navigate, useRoute } from './components/ui';
import { HomeScreen } from './screens/HomeScreen';
import { AllRoomsScreen } from './screens/AllRoomsScreen';
import { AllBoardsScreen } from './screens/AllBoardsScreen';
import { ImageScreen } from './screens/ImageScreen';
import { MoodboardScreen } from './screens/MoodboardScreen';
import { TryNatureScreen } from './screens/TryNatureScreen';
import { LaterScreen } from './screens/LaterScreen';
import { AmethystScreen } from './screens/AmethystScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { RoomScreen } from './screens/RoomScreen';
import { RoomSettingsScreen } from './screens/RoomSettingsScreen';
import { FloorPlanScreen } from './screens/FloorPlanScreen';
import { VersionScreen, VersionsScreen } from './screens/VersionsScreen';
import { InteriorStyleScreen } from './screens/ProfileScreens';
import { useStore } from './state/store';
import { useFitPhone } from './components/useFitPhone';
import { NotReadySheet } from './components/NotReadySheet';
import { isRoomReady } from './state/mutations';
import { STAND_LOCK_ROOM, STAND_ROOM } from './stand';
import { StandDone } from './components/StandDone';

const LATER: Record<string, string> = {
  profile: 'Profile and settings',
};

function Screen() {
  const [a, b, c, d] = useRoute();
  // the stand version (Synne 17.11): only the living room – every other address opens it
  if (STAND_LOCK_ROOM && !(a === 'room' && b === STAND_ROOM && !c)) {
    navigate(`/room/${STAND_ROOM}`, true);
    return <RoomScreen key={STAND_ROOM} roomId={STAND_ROOM} />;
  }
  if (a === 'room' && b) {
    // a link straight to a room that isn't ready: the home screen with «… isn't ready yet» (Synne 04.11)
    if (!c && !isRoomReady(b)) return <NotReadyRedirect roomId={b} />;
    if (c === 'settings' && d === 'plan') return <FloorPlanScreen roomId={b} />;
    if (c === 'settings') return <RoomSettingsScreen key={b} roomId={b} />;
    if (c === 'history' && d) return <VersionScreen key={d} roomId={b} versionId={d} />;
    if (c === 'history') return <VersionsScreen roomId={b} />;
    return <RoomScreen key={b} roomId={b} />;
  }
  // «Create room» as a sheet over the home screen (Synne 27.10, Figma 06R). Silje's CreateRoomScreen (24.10) is kept but not in use.
  if (a === 'new-room') return <HomeScreen creating />;
  if (a === 'rooms') return <AllRoomsScreen />;
  if (a === 'boards') return <AllBoardsScreen />;
  // five home proposals, merge test (10.11)
  if (a === 'home' && b) return <HomeScreen key={b} variant={Math.min(5, Math.max(1, Number(b) || 1))} />;
  // Discover lives inside the creative tab: «Create» (V1) or «Studio» (V2), see state/nav.ts (10.11)
  if (a === 'discover') return <HomeScreen key="creative" surface="creative" seg="discover" natureId={b} />;
  if (a === 'studio') return <HomeScreen key="creative" surface="creative" seg="nature" />;
  if (a === 'image' && b) return <ImageScreen key={b} id={b} natureId={c} />;
  // moodboards live on My Crib (Synne 11.11)
  if (a === 'moodboards') return <HomeScreen />;
  // try a nature palette in a room, as a preview (11.11)
  if (a === 'try' && b && c) return <TryNatureScreen paletteId={b} roomId={c} />;
  if (a === 'moodboard' && b) return <MoodboardScreen key={b} boardId={b} more={c === 'more'} />;
  // Silje's «How brave are you?» page (07.11); her own Discover (/nature) is replaced by Discover in the merge
  if (a === 'nature' && b === 'amethyst') return <AmethystScreen />;
  // Nature is part of Explore now (Synne 14.11): /nature opens Explore
  if (a === 'nature') return <HomeScreen key="creative" surface="creative" />;
  if (a === 'profile' && !b) return <SettingsScreen />;
  if (a === 'profile' && b === 'style') return <InteriorStyleScreen />;
  if (a === 'profile') {
    navigate('/profile', true);
    return <SettingsScreen />;
  }
  if (a && LATER[a]) return <LaterScreen title={LATER[a]} back={() => navigate('/')} />;
  if (a) navigate('/', true);
  return <HomeScreen />;
}

function NotReadyRedirect({ roomId }: { roomId: string }) {
  const { setNotReady } = useStore();
  useEffect(() => {
    setNotReady(roomId);
    navigate('/', true);
  }, [roomId, setNotReady]);
  return null;
}

/** Status bar and home indicator are only drawn in the desktop phone frame. */
function StatusBar() {
  return (
    <div className="status-bar" aria-hidden>
      <span>9:41</span>
      <span className="status-battery" />
    </div>
  );
}

export function App() {
  const { toast } = useStore();
  useFitPhone();
  return (
    <div className="frame-outer">
      <main className="phone">
        <StatusBar />
        <Screen />
        <NotReadySheet />
        <StandDone />
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
        <span className="home-indicator" aria-hidden />
      </main>
    </div>
  );
}
