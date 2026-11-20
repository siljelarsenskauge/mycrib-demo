// Interior style – the one settings sub-page (the rest of Settings is inline on SettingsScreen).
import { Icon } from '../components/Icon';
import { IconButton, navigate } from '../components/ui';
import { useStore } from '../state/store';

export const STYLES = ['Scandinavian', 'Minimalist', 'Industrial', 'Boho', 'Classic', 'Japandi', 'Modern', 'Vintage'];

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="screen settings-page">
      <header className="topbar">
        <IconButton icon="chevron_left" label="Back to settings" onClick={() => navigate('/profile')} />
        <h1 className="topbar-title-static">{title}</h1>
        <span className="topbar-spacer" />
      </header>
      <div className="screen-scroll settings-scroll">{children}</div>
    </div>
  );
}

export function InteriorStyleScreen() {
  const { state, update } = useStore();
  const { styles, styleDescription = '' } = state.profile;
  // Saved as you go, like the rest of Settings.
  const toggle = (s: string) =>
    update((d) => {
      d.profile.styles = styles.includes(s) ? styles.filter((x) => x !== s) : [...styles, s];
    });
  return (
    <Page title="Interior style">
      <section aria-labelledby="g-styles">
        <h2 className="group-heading" id="g-styles">
          Styles you like
        </h2>
        <div className="chips">
          {STYLES.map((s) => (
            <button key={s} className="chip" aria-pressed={styles.includes(s)} onClick={() => toggle(s)}>
              <Icon name={styles.includes(s) ? 'check' : 'add'} size={16} />
              {s}
            </button>
          ))}
        </div>
        <p className="group-footer">Choose as many as you want. The AI uses them when it suggests furniture and colours.</p>
      </section>
      <section aria-labelledby="g-words">
        <h2 className="group-heading" id="g-words">
          In your own words
        </h2>
        <textarea
          aria-labelledby="g-words"
          className="group group-textarea"
          rows={4}
          placeholder="E.g. «warm colours, a lot of wood and plants, not too minimal»"
          value={styleDescription}
          onChange={(e) =>
            update((d) => {
              d.profile.styleDescription = e.target.value;
            })
          }
        />
      </section>
    </Page>
  );
}
