// A room made from photos only (Figma 06H): the photos are the room view until the room is scanned.
// PhotoPages: one photo per page, swipe between them («1 / 2»). NotScannedView: 3D and 2D before the scan.
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Button } from './ui';

/** `start`: the page shown first – the room's current photo, e.g. 2/2 after a makeover (Synne 14.11) */
export function PhotoPages({ photos, label, start = 0 }: { photos: string[]; label: string; start?: number }) {
  const [page, setPage] = useState(start);
  const [wide, setWide] = useState<Record<number, boolean>>({});
  // a photo added at the end (e.g. the room after a makeover) is shown straight away
  const track = useRef<HTMLDivElement>(null);
  const count = useRef(photos.length);
  useEffect(() => {
    const el = track.current;
    if (el && photos.length > count.current) el.scrollTo({ left: el.clientWidth * (photos.length - 1) });
    count.current = photos.length;
  }, [photos.length]);
  // open on the current photo
  useEffect(() => {
    const el = track.current;
    if (el && start > 0) el.scrollTo({ left: el.clientWidth * start });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);
  return (
    <div className="photo-pages" aria-label={label}>
      <div
        ref={track}
        className="photo-pages-track"
        onScroll={(e) => {
          const el = e.currentTarget;
          setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {photos.map((src, i) => (
          // each photo whole, in its own format (a phone photo is 3:4), between the top bar and the chat bar – not
          // cropped to fill the screen (Synne 14.11)
          // a wide photo (several put together) fills the height and is dragged sideways to see the whole room
          <span key={i} className={'photo-page' + (wide[i] ? ' is-wide' : '')}>
            <img
              src={src}
              alt={`Photo ${i + 1} of ${photos.length}`}
              draggable={false}
              onLoad={(e) => {
                const im = e.currentTarget;
                const w = im.naturalWidth / im.naturalHeight > 1.4;
                setWide((m) => (m[i] === w ? m : { ...m, [i]: w }));
                // start in the middle of a wide photo
                if (w) requestAnimationFrame(() => { const pg = im.parentElement; if (pg) pg.scrollLeft = (pg.scrollWidth - pg.clientWidth) / 2; });
              }}
            />
          </span>
        ))}
      </div>
      {photos.length > 1 && (
        <span className="photo-pages-pager glass" aria-hidden>
          {page + 1} / {photos.length}
        </span>
      )}
    </div>
  );
}

/** «Not scanned yet · Scan for 3D» – stays at the top of the photo view, but takes little space. */
export function ScanPill({ onScan }: { onScan: () => void }) {
  return (
    <button className="scan-pill glass" onClick={onScan}>
      <Icon name="scan_room" size={18} />
      Not scanned yet · Scan for 3D
      <Icon name="chevron_right" size={16} />
    </button>
  );
}

/** One black «Start scanning», the other two ways as text buttons under it (Synne 14.11; the rule from «Create room») */
export function NotScannedView({ view, onScan, onPlan, onMeasure }: { view: '3d' | '2d'; onScan: () => void; onPlan?: () => void; onMeasure?: () => void }) {
  return (
    <div className="not-scanned">
      <span className="not-scanned-icon" aria-hidden>
        <Icon name={view === '3d' ? 'view_3d' : 'floor_plan'} size={28} />
      </span>
      <h2>{view === '3d' ? 'See the room in 3D' : 'See the floor plan'}</h2>
      <p>Scan the room with your phone – about 1 minute – or add a floor plan or the measurements. Then I can check that furniture fits.</p>
      <Button size="small" icon="scan_room" onClick={onScan}>
        Start scanning
      </Button>
      {(onPlan || onMeasure) && (
        <div className="not-scanned-more">
          {onPlan && (
            <Button size="small" variant="text" onClick={onPlan}>
              Upload floor plan
            </Button>
          )}
          {onMeasure && (
            <Button size="small" variant="text" onClick={onMeasure}>
              Enter measurements
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
