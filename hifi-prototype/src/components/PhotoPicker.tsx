// «Add photos» (Synne 29.10): no page of its own for the choice – a small menu (like «Add item») with «Take photo» and
// «Choose from library». Once photos are added they are shown under «Added · n», each with a remove button, and an
// «Add» cell opens the same menu again.
import { useEffect, useState } from 'react';
import { AddMenu } from './AddMenu';
import { FakeCamera, FakePhotoLibrary, photoPos } from './FakePickers';
import { Icon } from './Icon';

/** The camera / camera-roll menu. `open(button)` shows the menu over that button. For the user test the camera and the
 *  library are simulated iOS screens (FakePickers, Synne 29.10), so the photos are the same for everyone. */
/** `max`: how many photos can be picked at once (a room has one photo, Synne 14.11) */
export function usePhotoSource(onAdd: (photos: string[]) => void, max = 20) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState<null | 'camera' | 'roll'>(null);
  // the button stays marked while its menu is open, so it is clear which button the menu belongs to (Synne 29.10)
  useEffect(() => {
    if (!anchor) return;
    anchor.setAttribute('aria-expanded', 'true');
    return () => anchor.setAttribute('aria-expanded', 'false');
  }, [anchor]);
  const done = (photos: string[]) => {
    setOpen(null);
    if (photos.length) onAdd(photos.slice(-max));
  };
  const element = (
    <>
      {anchor && (
        <AddMenu
          placement="above"
          overSheet
          anchor={anchor}
          choices={['camera', 'roll']}
          onClose={() => setAnchor(null)}
          onPick={(c) => {
            setAnchor(null);
            setOpen(c === 'camera' ? 'camera' : 'roll');
          }}
        />
      )}
      {open === 'camera' && <FakeCamera onDone={done} onClose={() => setOpen(null)} />}
      {open === 'roll' && <FakePhotoLibrary max={max} onDone={done} onClose={() => setOpen(null)} />}
    </>
  );
  return { open: (el: HTMLElement) => setAnchor(el), element };
}

export function PhotoPicker({ photos, onAdd, onRemove, max = 20 }: { photos: string[]; onAdd: (thumbs: string[]) => void; onRemove: (i: number) => void; max?: number }) {
  const source = usePhotoSource(onAdd, max);
  return (
    <section className="nr-group" aria-labelledby="pp-added">
      {photos.length > 0 && (
        <h3 className="field-label" id="pp-added">
          {max === 1 ? 'Photo' : `Added · ${photos.length}`}
        </h3>
      )}
      <div className="photo-grid-3">
        {photos.map((src, i) => (
          <div key={i} className="photo-thumb">
            {src.startsWith('data:') || src.startsWith('/') ? (
              <img src={src} style={photoPos(src)} alt={`Photo ${i + 1}`} />
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
        {photos.length < max && (
          <button className="photo-thumb-add" aria-haspopup="menu" onClick={(e) => source.open(e.currentTarget)}>
            <Icon name="add" size={22} />
            Add
          </button>
        )}
      </div>
      {source.element}
    </section>
  );
}
