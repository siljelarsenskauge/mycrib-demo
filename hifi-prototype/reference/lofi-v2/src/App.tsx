import { navigate, useRoute } from './components/ui';
import { CreateRoomScreen } from './screens/CreateRoomScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { MoodboardScreen } from './screens/MoodboardScreen';
import { RoomScreen } from './screens/RoomScreen';
import { RoomSettingsScreen } from './screens/RoomSettingsScreen';
import { RoomsScreen } from './screens/RoomsScreen';
import { SnapshotScreen, VersionHistoryScreen } from './screens/VersionHistoryScreen';
import { useStore } from './state/store';

function Screen() {
  const [a, b, c, d] = useRoute();
  if (a === 'new-room') return <CreateRoomScreen />;
  if (a === 'profile') return <ProfileScreen />;
  if (a === 'room' && b) {
    if (c === 'settings') return <RoomSettingsScreen roomId={b} />;
    if (c === 'moodboard') return <MoodboardScreen roomId={b} />;
    if (c === 'history' && d) return <SnapshotScreen roomId={b} snapId={d} />;
    if (c === 'history') return <VersionHistoryScreen roomId={b} />;
    return <RoomScreen key={b} roomId={b} />;
  }
  if (a) navigate('/', true);
  return <RoomsScreen />;
}

export function App() {
  const { toast } = useStore();
  return (
    <div className="frame-outer">
      <main className="phone">
        <Screen />
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}
