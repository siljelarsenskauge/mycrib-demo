import { Icon, type IconName } from '../components/Icon';
import { IconButton, navigate } from '../components/ui';
import { useStore } from '../state/store';

const HOUSING = ['Apartment', 'Terraced house', 'House', 'Bedsit', 'Other'];
const LIVES_WITH = ['Alone', 'Partner', 'Family with children', 'Friends', 'Other'];
const AGES = ['Under 25', '25–34', '35–44', '45–54', '55+'];

/** Not part of the prototype – shown muted so the app feels complete without dead ends in tests. */
const COMING_SOON: { icon: IconName; title: string }[] = [
  { icon: 'person', title: 'Residents' },
  { icon: 'home', title: 'Home' },
  { icon: 'settings', title: 'App settings' },
];

type Field = 'housing' | 'livesWith' | 'age';

/** Settings as one grouped iOS-style list. Changes are saved as you go – no Save button. */
export function SettingsScreen() {
  const { state, update } = useStore();
  const p = state.profile;
  const name = p.name?.trim() || 'Synne';
  const set = (patch: Partial<typeof p>) =>
    update((d) => {
      Object.assign(d.profile, patch);
    });

  const selectRow = (field: Field, label: string, options: string[]) => (
    <label className="group-row">
      <span className="group-label">{label}</span>
      <span className="group-value">
        {p[field]}
        <Icon name="chevron_down" size={18} />
      </span>
      <select className="group-select" aria-label={label} value={p[field]} onChange={(e) => set({ [field]: e.target.value })}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="screen settings">
      <header className="topbar">
        <IconButton icon="chevron_left" label="Back" onClick={() => navigate('/')} />
        <h1 className="topbar-title-static">Settings</h1>
        <span className="topbar-spacer" />
      </header>
      <div className="screen-scroll settings-scroll">
        <section className="card profile-card">
          <span className="avatar" aria-hidden>
            <img src="/profilbilde/blond-avatar.jpg" alt="" />
          </span>
          <span className="profile-text">
            <strong>{name}</strong>
            <span>
              {p.housing} · {state.rooms.length} rooms
            </span>
          </span>
        </section>

        <section aria-labelledby="g-about">
          <h2 className="group-heading" id="g-about">
            About you
          </h2>
          <div className="group">
            <label className="group-row">
              <span className="group-label">Name</span>
              <input className="group-input" value={p.name ?? ''} placeholder="Your name" onChange={(e) => set({ name: e.target.value })} />
            </label>
            {selectRow('housing', 'Home type', HOUSING)}
            {selectRow('livesWith', 'Lives with', LIVES_WITH)}
            {selectRow('age', 'Age', AGES)}
          </div>
          <p className="group-footer">The AI uses this to give advice that fits your home, for example durable fabrics if you live with children.</p>
        </section>

        <section aria-labelledby="g-style">
          <h2 className="group-heading" id="g-style">
            Style
          </h2>
          <div className="group">
            <button className="group-row" onClick={() => navigate('/profile/style')}>
              <span className="group-label">Interior style</span>
              <span className="group-value group-value-truncate">{p.styles.length ? p.styles.join(', ') : 'Not chosen'}</span>
              <Icon name="chevron_right" size={20} />
            </button>
          </div>
        </section>

        <section aria-labelledby="g-more">
          <h2 className="group-heading" id="g-more">
            More
          </h2>
          <div className="group">
            {COMING_SOON.map((r) => (
              <div key={r.title} className="group-row is-muted" aria-disabled="true">
                <Icon name={r.icon} size={20} />
                <span className="group-label">{r.title}</span>
                <span className="group-value">Coming soon</span>
              </div>
            ))}
          </div>
        </section>

        <p className="settings-version">MyCrib · version 0.1 (prototype)</p>
      </div>
    </div>
  );
}
