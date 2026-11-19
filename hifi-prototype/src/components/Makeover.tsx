// «Make my kitchen like this» (Synne 14.11): the AI «builds» the room from an inspiration photo. The new room appears
// the way an image is generated in ChatGPT – blurred at first, sharpening from the top down – while a short status line
// says what the AI is doing. Simulated: the result is a ready-made photo.

/** inspiration photo in Explore → the room after the makeover */
export const MAKEOVERS: Record<string, string> = {
  r_olive_stone_kitchen: '/rooms/my_kitchen_after.jpg',
};

export function MakeoverView({ from, to, roomName, ms, full = false }: { from: string; to: string; roomName: string; ms: number; /** the whole screen, not the photo's 3:4 frame (the fig's finished room, Synne 18.11) */ full?: boolean }) {
  // calm, like ChatGPT making an image (Synne 14.11: the first version looked «jalla»): the photo stays exactly where it
  // was, softens, and the new room fades in from the top with a soft edge – no hard line, no changing steps
  const label = `Creating your ${roomName.toLowerCase()}`;
  return (
    <div className={'makeover' + (full ? ' is-final' : '')} role="status" aria-live="polite" aria-label={label}>
      <span className="photo-page">
        <span className="makeover-frame" style={{ ['--mk-ms' as string]: `${ms}ms` }}>
          <img className="makeover-from" src={from} alt="" />
          <img className="makeover-to" src={to} alt="" />
          <span className="makeover-status">
            <span className="makeover-text">{label}</span>
          </span>
        </span>
      </span>
    </div>
  );
}
