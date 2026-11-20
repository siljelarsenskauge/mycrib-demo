import { IconButton } from '../components/ui';

/** Screens that are not part of the first round (core flow). They exist in Figma and in the lo-fi. */
export function LaterScreen({ title, back }: { title: string; back: () => void }) {
  return (
    <div className="screen later">
      <header className="topbar">
        <IconButton icon="chevron_left" label="Back" onClick={back} />
        <h1 className="topbar-title-static">{title}</h1>
        <span className="topbar-spacer" />
      </header>
      <div className="later-body">
        <p className="later-title">Coming in the next round</p>
        <p className="later-text">This screen is designed in Figma, but not built yet. The first round covers the core flow.</p>
      </div>
    </div>
  );
}
