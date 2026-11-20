import { BRAVE_STEPS, naturePalette, stepImage, stepLabel, type BraveStep, type NaturePalette } from '../state/nature';
import type { Snapshot } from '../state/types';
import { DEFAULT_CHAIR, PanoramaView } from './PanoramaView';
import { BottomSheet } from './ui';

/**
 * «If nature says it fits» (07.11): colour from nature photos, tried out in the living room.
 * A (chat): a nature photo is sent, the AI answers with the palette. B (this sheet): «How brave are you?» over the room.
 */

/** The nature photo. The orchid has no plain nature shot, so it zooms in on the painting in the room photo. */
export function NaturePhoto({ palette, className = '' }: { palette: NaturePalette; className?: string }) {
  const f = palette.focus;
  return (
    <span className={'nature-photo ' + className}>
      <img
        src={palette.photo}
        alt=""
        style={f ? { objectPosition: `${f.x}% ${f.y}%`, transform: `scale(${f.zoom})`, transformOrigin: `${f.x}% ${f.y}%` } : undefined}
      />
    </span>
  );
}

/** The palette as small named dots: «● Fig skin · Cushions» */
export function PaletteChips({ palette, roles = true }: { palette: NaturePalette; roles?: boolean }) {
  return (
    <ul className="palette-chips" aria-label={`${palette.name} palette`}>
      {palette.colors.map((c) => (
        <li key={c.name} className="palette-chip">
          {/* the swatch shows the colour the palette is about – it is content, not a UI colour, so it isn't a token */}
          <i style={{ background: c.hex }} aria-hidden />
          <span>
            {c.name}
            {roles && <small> · {c.role}</small>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The room in the chosen step, over the room view while the sheet is open. Beige is the photo with the colour taken out. */
export function NaturePreview({ palette, step }: { palette: NaturePalette; step: BraveStep }) {
  // a step with a panorama can be explored: drag to look around (Synne 07.11)
  const pano = step !== 'beige' ? palette.steps[step]?.pano : undefined;
  if (pano)
    return (
      <div className="nature-preview nature-preview-pano">
        <PanoramaView
          key={pano.src}
          source={pano}
          label={`The living room in the ${palette.name} palette, ${stepLabel(step)}. Drag to look around.`}
          chair={{ ...DEFAULT_CHAIR, on: false }}
          chairSelected={false}
          onSelectChair={() => {}}
          onMoveChair={() => {}}
        />
      </div>
    );
  return (
    <div className="nature-preview">
      <img key={step} src={stepImage(palette, step)} alt={`The living room, ${palette.name} palette`} className={step === 'beige' ? 'is-beige' : ''} />
    </div>
  );
}

/** Overlays/BraveSheet: «How brave are you?» – four steps from Beige to All in, and «Save as version». */
export function BraveSheet({
  palette,
  step,
  onStep,
  onSave,
  onClose,
}: {
  palette: NaturePalette;
  step: BraveStep;
  onStep: (s: BraveStep) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const changes = step === 'beige' ? 'Light and neutral, the way most living rooms look today.' : palette.steps[step]?.changes;
  return (
    // modeless: the room above the sheet stays usable, so the 360° view can be dragged while the sheet is open
    <BottomSheet title={`${palette.name} palette`} onClose={onClose} primary={{ label: 'Save as version', onClick: onSave }} modeless>
      <div className="brave">
        <div className="brave-source">
          <NaturePhoto palette={palette} className="nature-photo-small" />
          <PaletteChips palette={palette} roles={false} />
        </div>
        <h3 className="group-heading" id="brave-heading">
          How brave are you?
        </h3>
        <div className="brave-steps" role="radiogroup" aria-labelledby="brave-heading">
          {BRAVE_STEPS.map((s, i) => {
            const ready = s.id === 'beige' || !!palette.steps[s.id];
            const on = s.id === step;
            const passed = BRAVE_STEPS.findIndex((x) => x.id === step) >= i;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!ready}
                className={'brave-step' + (on ? ' is-on' : '') + (passed ? ' is-passed' : '')}
                onClick={() => onStep(s.id)}
              >
                <span className="brave-dot" aria-hidden />
                <span className="brave-label">{s.label}</span>
              </button>
            );
          })}
        </div>
        <p className="brave-changes" aria-live="polite">
          {changes}
        </p>
      </div>
    </BottomSheet>
  );
}

/** Home: «If nature says it fits» – a row of nature photos. Tapping one opens the living room with the photo in the chat. */
export function NatureRow({ palettes, onPick }: { palettes: NaturePalette[]; onPick: (p: NaturePalette) => void }) {
  return (
    <div className="room-row">
      {palettes.map((p) => (
        <button key={p.id} className="nature-card" onClick={() => onPick(p)} aria-label={p.steps && Object.keys(p.steps).length ? `${p.name}: try this palette in your living room` : `${p.name}: see how brave you are`}>
          <NaturePhoto palette={p} className="nature-card-img" />
          <span className="nature-card-swatches" aria-hidden>
            {p.colors.map((c) => (
              <i key={c.name} style={{ background: c.hex }} />
            ))}
          </span>
          <span className="room-card-name">{p.name}</span>
        </button>
      ))}
    </div>
  );
}

/** A version saved from «How brave are you?» is shown with its photo, in lists and in the version sheet. */
export function PaletteVersionImage({ version }: { version: Snapshot }) {
  const p = naturePalette(version.palette?.id);
  if (!p || !version.palette) return null;
  const step = version.palette.step;
  return <img src={stepImage(p, step)} alt="" className={'version-nature' + (step === 'beige' ? ' is-beige' : '')} />;
}
