import { useEffect, useState, type CSSProperties } from 'react';
import { IconButton, navigate } from '../components/ui';
import { AMETHYST, AMETHYST_LEVELS } from '../state/nature';

/**
 * «Amethyst Stone» (Synne 07.11): the same living room with more or less colour from the amethyst.
 * «How brave are you?» – a slider with three levels; the photo changes as it moves, so they are easy to compare.
 */
export function AmethystScreen() {
  const [level, setLevel] = useState(0);
  const current = AMETHYST_LEVELS[level];

  // load all three photos at once, so moving the slider swaps straight away
  useEffect(() => {
    AMETHYST_LEVELS.forEach((l) => {
      const im = new Image();
      im.src = l.image;
    });
  }, []);

  return (
    <div className="screen amethyst">
      <header className="topbar">
        <IconButton icon="chevron_left" label="Back to My Space" onClick={() => navigate('/')} />
        <h1 className="topbar-title-static">{AMETHYST.name}</h1>
        <span className="topbar-spacer" />
      </header>
      <div className="screen-scroll amethyst-body">
        <h2 className="section-title amethyst-heading" id="amethyst-heading">
          How brave are you?
        </h2>

        {/* the three photos lie on top of each other; only the chosen one is visible */}
        <div className="amethyst-photo">
          {AMETHYST_LEVELS.map((l, i) => (
            <img key={l.id} src={l.image} alt={i === level ? `The living room, ${l.label}` : ''} aria-hidden={i !== level} className={i === level ? 'is-on' : ''} />
          ))}
        </div>

        <div className="amethyst-slider">
          <input
            type="range"
            min={0}
            max={AMETHYST_LEVELS.length - 1}
            step={1}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            aria-labelledby="amethyst-heading"
            aria-valuetext={current.label}
            style={{ '--amethyst-fill': `${(level / (AMETHYST_LEVELS.length - 1)) * 100}%` } as CSSProperties}
          />
          <div className="amethyst-stops">
            {AMETHYST_LEVELS.map((l, i) => (
              <button key={l.id} type="button" className={i === level ? 'is-on' : ''} aria-pressed={i === level} onClick={() => setLevel(i)}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
