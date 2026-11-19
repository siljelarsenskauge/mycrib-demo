// All moodboards (Synne's Figma comment 11.11): the overview the link on MyCrib opens, as a bento board like on MyCrib.
import { BoardBento } from '../components/NavV3';
import { IconButton, navigate } from '../components/ui';

export function AllBoardsScreen() {
  return (
    <div className="screen all-rooms">
      <header className="topbar">
        <IconButton icon="chevron_left" label="Back" onClick={() => navigate('/')} />
        <h1 className="topbar-title-static">All moodboards</h1>
        <span className="topbar-spacer" aria-hidden />
      </header>
      <div className="screen-scroll all-rooms-scroll">
        <BoardBento grid />
      </div>
    </div>
  );
}
