// The scan screens in direction A (Synne 29.10, Figma 06S.A): only the camera, a glass X and «Simulated» at the top,
// a short hint in a glass pill, and one big round wine-red button at the bottom – like a camera's shutter. While
// scanning, the progress runs round the button and it becomes a pause button. Used by «Scan room», «Scan item» and
// the price tag scan.
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/** The short help text under the top bar. `ok` puts a ✓ in front (something is recorded), `warn` a warning sign. */
export function ScanHint({ children, ok, warn }: { children: ReactNode; ok?: boolean; warn?: boolean }) {
  return (
    <div className={'scan-hint' + (warn ? ' is-warn' : '')} role="status">
      {ok && <Icon name="check" size={16} />}
      {warn && <Icon name="warning" size={16} />}
      <span>{children}</span>
    </div>
  );
}

const R = 44;
const C = 2 * Math.PI * R;

/** The big round button. `running` shows a stop square; otherwise `icon`. The ring around it shows `pct`. */
export function ScanShutter({
  pct,
  running,
  icon,
  label,
  ariaLabel,
  disabled,
  onClick,
  side,
  onRescan,
}: {
  pct: number;
  running: boolean;
  icon: IconName;
  label: string;
  ariaLabel: string;
  disabled?: boolean;
  onClick: () => void;
  /** e.g. «Finish» next to the button while a scan is paused */
  side?: ReactNode;
  /** when the scan is finished: a round «Scan again» button to the left (Synne 29.10) */
  onRescan?: () => void;
}) {
  return (
    <div className="scan-bottom">
      <div className="scan-shutter-row">
        <button className={'scan-shutter' + (running ? ' is-running' : '') + (pct > 0 ? ' has-progress' : '')} aria-label={ariaLabel} disabled={disabled} onClick={onClick}>
          <svg className="scan-ring" viewBox="0 0 96 96" aria-hidden>
            <circle cx="48" cy="48" r={R} className="scan-ring-track" />
            <circle cx="48" cy="48" r={R} className="scan-ring-fill" strokeDasharray={C} strokeDashoffset={C - (C * Math.min(100, pct)) / 100} />
          </svg>
          <span className="scan-shutter-core">{running ? <span className="scan-stop" /> : <Icon name={icon} size={28} />}</span>
        </button>
        {onRescan && (
          <button className="scan-rescan" aria-label="Scan again" onClick={onRescan}>
            <Icon name="replay" size={24} />
          </button>
        )}
        {side && <div className="scan-side">{side}</div>}
      </div>
      <span className="scan-label" aria-hidden>
        {label}
      </span>
    </div>
  );
}
