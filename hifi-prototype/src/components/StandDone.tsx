// The stand (Synne 19.11): when a task is done, a popup says so and offers the next one. It watches the tasks done
// (state.standDone) wherever they are finished – the room, Create room, a moodboard – and comes up a moment later,
// so the visitor first sees the result.
import { useEffect, useRef, useState } from 'react';
import { MAIN_STORY, MENU, MOMENTS, resetStand, STAND, standHome } from '../stand';
import { useStore } from '../state/store';
import { FigAvatar } from './FigPeek';
import { Icon } from './Icon';
import { BottomSheet, Button, navigate } from './ui';

/** the small banner at the top (19.11); replaced by a bigger popup in the middle of the screen (Synne 19.11) */
const SHOW_BANNER = false;
/** the big popup in the middle (19.11); replaced by the done pill – the visitor may not feel done exploring (Synne 19.11) */
const SHOW_DIALOG = false;

/** how long to let the result show before the popup (ms): the table can be dragged first, the nature room looked at */
// the banner doesn't block anything, so it can come soon after the result shows
// shorter since Synne 19.11 («popper opp litt seint»): just long enough to see the result
const DELAY: Record<string, number> = { [MOMENTS[0]]: 1200, [MOMENTS[1]]: 1500, [MOMENTS[2]]: 1000, [MOMENTS[3]]: 900, [MAIN_STORY.id]: 1800 };

/** start a task from anywhere: the table and nature start in the living room, the others show the way on Home */
export function useStartTask() {
  const { state, update } = useStore();
  return (id: string) => {
    if (id === MOMENTS[0] || id === MOMENTS[1]) {
      update((d) => {
        d.standAsk = id;
      });
      navigate(`/room/${standHome(state)}`);
      return;
    }
    update((d) => {
      d.standTrip = id === MOMENTS[2] ? 'boards' : id === MOMENTS[3] ? 'room' : 'sofa';
      // «Legg til en sofa»: the coffee table from the step before is taken out of the room again, so the sofa story
      // doesn't show two tables – Silje's room photos have their own (Synne 19.11)
      if (id === MAIN_STORY.id) {
        const r = d.rooms.find((x) => x.id === standHome(d));
        if (r) r.furniture = r.furniture.filter((f) => f.kind !== 'coffeetable' || f.locked);
      }
    });
    navigate('/');
  };
}

/** the stand's task list (Synne 19.11): not a menu to pick from – it shows how far the visitor is, and one button
 *  starts the next task. «Utforsk selv» closes it, so the app can be tried freely. Used on Home (welcome, «Oppgaver»)
 *  and when a task is done (the pill). */
export function StandTasks({ title, text, onClose, welcome = false }: { title?: string; text?: string; onClose: () => void; welcome?: boolean }) {
  const { state } = useStore();
  const startTask = useStartTask();
  const done = state.standDone ?? [];
  const next = MENU.find((id) => !done.includes(id));
  const count = MENU.length - MENU.filter((id) => !done.includes(id)).length;
  return (
    <>
      <div className="stand-welcome">
        <FigAvatar mood="happy" size={72} />
        <h2 className="stand-welcome-title">{title ?? (welcome ? 'Velkommen til MyCrib!' : next ? 'Oppgaver' : 'Du har prøvd alt!')}</h2>
        <p className="stand-welcome-text">
          {text ?? (welcome ? 'Fem små oppgaver viser deg appen.' : next ? `${count} av ${MENU.length} ferdig.` : `${count} av ${MENU.length} ferdig. Takk for at du testet MyCrib.`)}
        </p>
      </div>
      <ol className="stand-trips stand-trips-sheet stand-steps" aria-label="Oppgavene">
        {MENU.map((id, i) => {
          const isDone = done.includes(id);
          return (
            <li key={id} className={'stand-trip stand-step' + (id === next ? ' is-next' : '') + (isDone ? ' is-done' : '')} aria-current={id === next ? 'step' : undefined}>
              <span className="stand-step-no" aria-hidden>
                {isDone ? <Icon name="check" size={14} /> : i + 1}
              </span>
              <span className="stand-trip-text">
                <strong>{id}</strong>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="stand-steps-foot">
        {next ? (
          <Button
            block
            onClick={() => {
              onClose();
              startTask(next);
            }}
          >
            {count === 0 ? 'Start' : 'Neste oppgave'}
          </Button>
        ) : (
          <Button block onClick={resetStand}>
            Start på nytt
          </Button>
        )}
        {next && (
          <Button variant="text" block onClick={onClose}>
            Utforsk selv
          </Button>
        )}
      </div>
    </>
  );
}

export function StandDone() {
  const { state, update } = useStore();
  // the moodboard task is done when a photo is saved in the board the visitor made (Synne 19.11)
  const ownItems = state.standBoard ? (state.boards ?? []).find((b) => b.id === state.standBoard)?.items.length ?? 0 : 0;
  useEffect(() => {
    if (STAND && ownItems > 0 && !(state.standDone ?? []).includes(MOMENTS[2]))
      update((d) => {
        d.standDone = [...new Set([...(d.standDone ?? []), MOMENTS[2]])];
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownItems]);
  // first a small banner that doesn't stop anything – the visitor can go on trying – and the menu when it is tapped
  const [menuOpen, setMenuOpen] = useState(false);
  const startTask = useStartTask();
  const done = state.standDone ?? [];
  const seen = useRef<string[]>(done);
  const [justDone, setJustDone] = useState<string | null>(null);
  useEffect(() => {
    if (!STAND) return;
    const fresh = done.find((id) => !seen.current.includes(id));
    seen.current = done;
    if (!fresh) return;
    const t = window.setTimeout(() => setJustDone(fresh), DELAY[fresh] ?? 3000);
    return () => window.clearTimeout(t);
  }, [done.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!STAND || !justDone) return null;
  const left = MENU.filter((id) => !done.includes(id));
  const close = () => {
    setJustDone(null);
    setMenuOpen(false);
  };
  // the done pill (Synne 19.11): a clear sign that the task is done, at the top where it blocks nothing. It stays until
  // tapped, so going on to explore is fine; a tap starts the next task (or the menu, when everything is tried)
  if (!menuOpen && !SHOW_BANNER && !SHOW_DIALOG)
    return (
      <button
        type="button"
        className="stand-done-pill"
        aria-label={left.length ? `Oppgaven «${justDone}» er fullført. Trykk for neste oppgave.` : 'Du har prøvd alt. Trykk for å starte på nytt.'}
        // the overview of the tasks opens, so the visitor picks the next one themselves (Synne 19.11)
        onClick={() => setMenuOpen(true)}
      >
        <span className="stand-done-check" aria-hidden>
          <Icon name="check" size={16} />
        </span>
        <span className="stand-done-pill-text">
          <strong>{left.length ? 'Oppgave fullført' : 'Alt er prøvd!'}</strong>
          <small>
            {left.length ? 'Neste oppgave' : 'Start på nytt'}
            <Icon name="chevron_right" size={14} />
          </small>
        </span>
      </button>
    );
  // the popup in the middle: Fig, «Bra jobba!», and «Neste oppgave» starts the next task in the menu's order
  if (!menuOpen && !SHOW_BANNER)
    return (
      <div className="scrim scrim-center stand-done-scrim" onClick={close}>
        <section className="dialog stand-done-dialog" role="alertdialog" aria-modal="true" aria-label="Oppgaven er ferdig" onClick={(e) => e.stopPropagation()}>
          <FigAvatar mood="happy" size={88} />
          <h2 className="stand-welcome-title">{left.length ? 'Bra jobba!' : 'Du har prøvd alt!'}</h2>
          <p className="stand-welcome-text">
            «{justDone}» er ferdig.{left.length ? ` Neste: «${left[0]}».` : ' Takk for at du testet MyCrib.'}
          </p>
          {left.length ? (
            <>
              <Button
                block
                onClick={() => {
                  const next = left[0];
                  close();
                  startTask(next);
                }}
              >
                Neste oppgave
              </Button>
              <Button variant="text" block onClick={() => setMenuOpen(true)}>
                Velg en annen
              </Button>
            </>
          ) : (
            <Button block onClick={resetStand}>
              Start på nytt
            </Button>
          )}
        </section>
      </div>
    );
  if (!menuOpen)
    return (
      <div className="stand-done-banner" role="status">
        <FigAvatar mood="happy" size={30} />
        <span className="stand-done-text">
          <strong>«{justDone}» er ferdig!</strong>
          <small>{left.length ? 'Prøv mer, eller gå videre' : 'Du har prøvd alt'}</small>
        </span>
        <button type="button" className="stand-done-next" onClick={() => setMenuOpen(true)}>
          {left.length ? 'Neste oppgave' : 'Ferdig'}
        </button>
        <button type="button" className="stand-done-x" aria-label="Lukk" onClick={close}>
          <Icon name="close" size={14} />
        </button>
      </div>
    );
  return (
    <BottomSheet label="Oppgaven er ferdig" onClose={close}>
      <StandTasks title={left.length ? 'Bra jobba!' : 'Du har prøvd alt!'} onClose={close} />
    </BottomSheet>
  );
}
