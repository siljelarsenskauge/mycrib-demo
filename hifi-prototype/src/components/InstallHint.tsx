import { useEffect, useState, type CSSProperties } from 'react';

// Full screen on the phone (Rathi 17.11). A web page can't hide the browser by itself on an iPhone, but added to the
// home screen, MyCrib opens as its own app without the address bar, like a Figma prototype in the Figma app.
// This card shows only on a phone in the browser, and can be skipped. Opened from the home screen, the app starts
// from the beginning (start_url in public/manifest.webmanifest has ?reset=1).

type InstallPrompt = Event & { prompt: () => Promise<void> };

const SKIP_KEY = 'mycrib-install-hint';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function isPhone() {
  return window.matchMedia('(pointer: coarse)').matches && Math.min(window.innerWidth, window.innerHeight) < 600;
}
function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}
function skipped() {
  try {
    return sessionStorage.getItem(SKIP_KEY) === 'skip';
  } catch {
    return false;
  }
}

const overlay: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 24, background: '#faf9f7', color: '#111', fontFamily: 'inherit',
};
const card: CSSProperties = { width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' };
const steps: CSSProperties = { margin: 0, paddingLeft: 20, textAlign: 'left', lineHeight: 1.5, fontSize: 15, alignSelf: 'stretch' };
const primary: CSSProperties = { width: '100%', height: 48, border: 0, borderRadius: 999, background: '#111', color: '#fff', fontSize: 16, fontWeight: 600 };
const secondary: CSSProperties = { border: 0, background: 'none', color: '#555', fontSize: 15, padding: 8, textDecoration: 'underline' };

export function InstallHint() {
  const [show, setShow] = useState(() => isPhone() && !isStandalone() && !skipped());
  const [install, setInstall] = useState<InstallPrompt | null>(null);

  // Android (Chrome): the browser can show its own «Install app» dialog from a button
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!show) return null;

  const skip = () => {
    try {
      sessionStorage.setItem(SKIP_KEY, 'skip');
    } catch {
      /* private browsing: just close */
    }
    setShow(false);
  };

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-labelledby="install-title">
      <div style={card}>
        <img src="/mycrib-icon-192.png" alt="" width={72} height={72} style={{ borderRadius: 16 }} />
        <h2 id="install-title" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
          Open MyCrib in full screen
        </h2>
        <p style={{ margin: 0, color: '#555', fontSize: 15 }}>Add it to your home screen, and it opens like an app, without the browser.</p>
        {isIOS() ? (
          <ol style={steps}>
            <li>Tap Share in Safari (under ⋯ if you don't see it)</li>
            <li>Choose «Add to Home Screen»</li>
            <li>Open MyCrib from your home screen</li>
          </ol>
        ) : install ? (
          <button
            style={primary}
            onClick={async () => {
              await install.prompt();
              skip();
            }}
          >
            Install MyCrib
          </button>
        ) : (
          <ol style={steps}>
            <li>Open the menu ⋮ in Chrome</li>
            <li>Choose «Add to Home screen» or «Install app»</li>
            <li>Open MyCrib from your home screen</li>
          </ol>
        )}
        <button style={secondary} onClick={skip}>
          Continue in the browser
        </button>
      </div>
    </div>
  );
}
