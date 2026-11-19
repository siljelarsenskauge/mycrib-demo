// The iPhone status bar while a sheet or menu is open (19.11). Opened from the home screen with status-bar-style
// «default», iOS paints the area behind the clock itself, in theme-color, so the dark layer (.scrim) can't reach it and a
// cream strip stayed at the top. While a dimming layer is open, theme-color gets the same dimmed colour: the cream
// (#f7f5ef) under --color-overlay-scrim (rgba(17, 17, 17, 0.16)) is #d2d1cb. The clock stays dark.
// Only from the home screen: in the browser and on a PC nothing changes.

const CREAM = '#f7f5ef';
const DIMMED = '#d2d1cb';

export function dimStatusBarWithOverlays() {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!standalone || !meta) return;

  const update = () => {
    const want = document.querySelector('.scrim:not(.scrim-modeless)') ? DIMMED : CREAM;
    if (meta.content !== want) meta.content = want;
  };
  new MutationObserver(update).observe(document.body, { childList: true, subtree: true });
  update();
}
