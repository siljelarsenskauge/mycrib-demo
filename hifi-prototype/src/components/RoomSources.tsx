// Shared parts of «New room» and «Room settings» so the two always look and work the same (Synne 18.10):
// the measurements card, the «way» cards (choose one / add more), and the photo slots (3 per row).
import { area, m2, wallCount, type Measurements } from '../state/measure';
import { Icon, type IconName } from './Icon';
import { PlanThumb } from './PlanThumb';
import { Button } from './ui';

/** The room's measurements as one card: small floor plan, where they came from, and «Edit». */
export function MeasurementsCard({ md, source, onEdit }: { md: Measurements; source: string; onEdit: () => void }) {
  const doors = md.opens.filter((o) => o.type === 'door').length;
  const wins = md.opens.length - doors;
  return (
    <div className="shape-card">
      <PlanThumb md={md} />
      <span className="shape-text">
        <span className="shape-source">{source}</span>
        <strong>
          {wallCount(md)} walls · {m2(area(md))} m²
        </strong>
        <span>
          {[doors && `${doors} door${doors > 1 ? 's' : ''}`, wins && `${wins} window${wins > 1 ? 's' : ''}`, md.ceil ? `ceiling ${md.ceil} cm` : 'ceiling height not set']
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      <Button variant="secondary" size="small" icon="edit" onClick={onEdit}>
        Edit
      </Button>
    </div>
  );
}

/** Proposal D (Figma 376:2790): the recommended way first – a large scan card with its own button – then the other two. */
export function ChooseShape({ onScan, onPlan, onEnter }: { onScan: () => void; onPlan: () => void; onEnter: () => void }) {
  return (
    <>
      <div className="scan-hero">
        <div className="scan-hero-top">
          <span className="scan-hero-icon" aria-hidden>
            <Icon name="view_3d" size={28} />
          </span>
          <span className="scan-hero-text">
            <span className="way-badge">Recommended · about 1 minute</span>
            <strong>Scan the room</strong>
          </span>
        </div>
        <p>Walk around with your camera. The AI finds walls, doors, windows and ceiling height.</p>
        <Button variant="secondary" icon="scan_room" block onClick={onScan}>
          Start scanning
        </Button>
      </div>
      <h3 className="group-heading or-heading">Or</h3>
      <div className="other-ways-group">
        <button className="other-way" onClick={onPlan}>
          <Icon name="floor_plan" size={22} />
          <span className="way-text">
            <strong>Upload a floor plan</strong>
            <span>The AI reads the walls</span>
          </span>
          <Icon name="add" size={20} />
        </button>
        <button className="other-way" onClick={onEnter}>
          <Icon name="straighten" size={22} />
          <span className="way-text">
            <strong>Enter measurements</strong>
            <span>Draw the room yourself</span>
          </span>
          <Icon name="add" size={20} />
        </button>
      </div>
    </>
  );
}

/** One way to get the room's shape. `extra` = an optional addition after the first one (dashed, quieter). */
export function WayCard({ icon, title, meta, onClick, badge, extra }: { icon: IconName; title: string; meta: string; onClick: () => void; badge?: string; extra?: boolean }) {
  return (
    <button className={'way-card' + (extra ? ' is-extra' : '')} onClick={onClick}>
      <span className="source-icon">
        <Icon name={icon} size={22} />
      </span>
      <span className="way-text">
        <strong>
          {title}
          {badge && <span className="way-badge">{badge}</span>}
        </strong>
        <span>{meta}</span>
      </span>
      <Icon name="add" size={20} />
    </button>
  );
}

/** One way to create the room (Synne 23.10): the whole card is the button and goes straight to the method.
 *  `note` is a small grey text with a dot, right after the title. */
export function MethodCard({ icon, title, note, onClick }: { icon: IconName; title: string; note?: string; onClick: () => void }) {
  return (
    <button className="way-card method-card" onClick={onClick}>
      <span className="source-icon">
        <Icon name={icon} size={22} />
      </span>
      <span className="method-title">
        <strong>{title}</strong>
        {note && <span className="method-note">{note}</span>}
      </span>
      <Icon name="chevron_right" size={20} />
    </button>
  );
}

/** «Add more (optional)»: the ways that are left, each saying why it is not needed. */
export function AddMoreWays({ scanned, hasPlan, onScan, onPlan }: { scanned: boolean; hasPlan: boolean; onScan: () => void; onPlan: () => void }) {
  if (scanned && hasPlan) return null;
  return (
    <>
      <h3 className="group-heading add-more-heading">
        Add more <span className="heading-optional">(optional)</span>
      </h3>
      <div className="way-list">
        {!scanned && (
          <WayCard
            icon="view_3d"
            title="Scan the room"
            meta={hasPlan ? 'Not needed. Adds the ceiling height and what the floor plan doesn’t show.' : 'Not needed. Makes the measurements more accurate.'}
            onClick={onScan}
            extra
          />
        )}
        {!hasPlan && (
          <WayCard
            icon="floor_plan"
            title="Floor plan"
            meta={scanned ? 'Not needed – your scan already has the walls. Add it only to double-check the lengths.' : 'Not needed. The AI can use it to check your measurements.'}
            onClick={onPlan}
            extra
          />
        )}
      </div>
    </>
  );
}

/** Photos: empty slots show where they go and fill up in the same grid (max 3 per row). */
export function PhotoSlots({ photos, onAdd, onRemove, compact }: { photos: string[]; onAdd: () => void; onRemove: (i: number) => void; compact?: boolean }) {
  return (
    <>
      <div className="photo-grid-3">
        {photos.map((src, i) => (
          <div key={i} className="photo-thumb">
            {src.startsWith('data:') || src.startsWith('/') ? (
              <img src={src} alt={`Photo ${i + 1}`} />
            ) : (
              <span className="photo-thumb-label" title={src}>
                <Icon name="image" size={22} />
              </span>
            )}
            <button className="photo-thumb-remove" aria-label={`Remove photo ${i + 1}`} onClick={() => onRemove(i)}>
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
        <button className="photo-thumb-add" onClick={onAdd}>
          <Icon name="add" size={22} />
          Add
        </button>
        {!compact && Array.from({ length: Math.max(0, 2 - photos.length) }, (_, i) => (
          <button key={'empty' + i} className="photo-slot" aria-label="Add photos" onClick={onAdd}>
            <Icon name="image" size={22} />
          </button>
        ))}
      </div>
    </>
  );
}

/** Where the measurements came from, shown on the card. */
export const filledFromLabel = (o: { edited: boolean; scanned: boolean; hasPlan: boolean }) =>
  o.edited ? 'Edited by you' : o.scanned && o.hasPlan ? 'Filled in from your scan and floor plan' : o.scanned ? 'Filled in from your scan' : o.hasPlan ? 'Filled in from your floor plan' : 'Entered by you';

/** One way to add the room (Figma 06K B): green when added, «Recommended» tag, or «Not needed –» in the text. */
export interface Way {
  icon: IconName;
  title: string;
  meta: string;
  onClick: () => void;
  /** added: green with a «Check»/«Add» button; recommended: an ordinary row with a «Recommended» tag */
  state?: 'added' | 'recommended';
  action?: string;
}

export function WayRow({ icon, title, meta, onClick, state, action }: Way) {
  return (
    <button type="button" className={'cr-way' + (state ? ` is-${state}` : '')} onClick={onClick}>
      <Icon name={state === 'added' ? 'check' : icon} size={24} />
      <span className="cr-way-text">
        <span className="cr-way-title">
          {title}
          {state === 'recommended' && <span className="tag tag-accent">Recommended</span>}
        </span>
        <span className="cr-way-meta">{meta}</span>
      </span>
      {state === 'added' ? (
        <span className="cr-way-action">{action ?? 'Check'}</span>
      ) : (
        <Icon name="chevron_right" size={20} />
      )}
    </button>
  );
}
