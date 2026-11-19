// Try nature as a preview (my proposal, 11.11): the room is shown in a nature palette, but it is not changed.
// Hold the photo to see the room as it is now. «Save as version» keeps it in the room's versions; nothing else changes.
import { useState } from 'react';
import { BraveSheet, NaturePreview } from '../components/NaturePalette';
import { IconButton, navigate } from '../components/ui';
import { saveVersion } from '../state/mutations';
import { firstStep, naturePalette, stepLabel, type BraveStep } from '../state/nature';
import { useStore } from '../state/store';

export function TryNatureScreen({ paletteId, roomId }: { paletteId: string; roomId: string }) {
  const { state, update, showToast } = useStore();
  const palette = naturePalette(paletteId);
  const room = state.rooms.find((r) => r.id === roomId);
  const [step, setStep] = useState<BraveStep>(palette ? firstStep(palette) : 'beige');
  const [holding, setHolding] = useState(false);
  const [sheet, setSheet] = useState(true);
  if (!palette || !room) {
    navigate('/discover', true);
    return null;
  }
  const back = () => (history.length > 1 ? history.back() : navigate('/discover'));
  return (
    <div className="screen try-screen">
      <div
        className="try-stage"
        onPointerDown={() => setHolding(true)}
        onPointerUp={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
        onPointerCancel={() => setHolding(false)}
        aria-label="Hold to see the room as it is now"
      >
        <NaturePreview palette={palette} step={step} />
        {/* holding shows the real photo of the room, so you see what you have now */}
        {holding && room.image && <img className="try-now" src={room.image} alt={`${room.name} as it is now`} />}
      </div>
      <header className="try-top">
        <IconButton icon="close" label="Close preview" variant="glass" onClick={back} />
        <span className="try-label glass">{holding ? `${room.name} now` : `Preview · ${room.name} is not changed`}</span>
      </header>
      {!sheet && (
        <button className="try-reopen glass" onClick={() => setSheet(true)}>
          How brave are you?
        </button>
      )}
      <p className="try-hold glass" aria-hidden>
        Hold to see it as it is now
      </p>
      {sheet && (
        <BraveSheet
          palette={palette}
          step={step}
          onStep={setStep}
          onClose={() => setSheet(false)}
          onSave={() => {
            const name = `${palette.name} · ${stepLabel(step)}`;
            update((d) => {
              // a version only: the room's furniture, photo and «updated» time are not touched
              saveVersion(d, room.id, name);
              d.snapshots[0].palette = { id: palette.id, step };
            });
            showToast(`Saved «${name}» in ${room.name}'s versions`);
            setSheet(false);
          }}
        />
      )}
    </div>
  );
}
