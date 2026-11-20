import { useState } from 'react';
import { FurniturePreview } from '../components/FurniturePreview';
import { LibraryList } from '../components/PickerSheets';
import { Loading, TopBar } from '../components/ui';
import { uid } from '../state/seed';
import { useStore } from '../state/store';
import type { LibraryItem } from '../state/types';

const STYLES = ['Skandinavisk', 'Moderne', 'Minimalistisk', 'Industriell', 'Boho', 'Klassisk', 'Japandi'];

/** Min profil: om deg, interiørstil, moodboard, Mine møbler */
export function ProfileScreen() {
  const { state, update, showToast } = useStore();
  const p = state.profile;
  const [connecting, setConnecting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LibraryItem | null>(null);

  const set = (k: 'name' | 'housing' | 'livesWith' | 'age', v: string) =>
    update((d) => {
      d.profile[k] = v;
    });
  const toggleStyle = (s: string) =>
    update((d) => {
      d.profile.styles = d.profile.styles.includes(s) ? d.profile.styles.filter((x) => x !== s) : [...d.profile.styles, s];
    });

  const connect = () => {
    setConnecting(true);
    window.setTimeout(() => {
      update((d) => {
        d.profile.pinterestConnected = true;
      });
      setConnecting(false);
      showToast('Pinterest er koblet til (simulert).');
    }, 1500);
  };

  return (
    <div className="screen" style={{ position: 'relative' }}>
      <TopBar title="Profil og innstillinger" back="/" />
      <div className="scroll">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          Om deg
        </h2>
        <div className="field">
          <label htmlFor="pname">Navn</label>
          <input id="pname" className="input" value={p.name ?? ''} placeholder="Synne" onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="housing">Boforhold</label>
          <select id="housing" className="input" value={p.housing} onChange={(e) => set('housing', e.target.value)}>
            {['Leilighet', 'Rekkehus', 'Enebolig', 'Hybel', 'Annet'].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="with">Hvem bor du med?</label>
          <select id="with" className="input" value={p.livesWith} onChange={(e) => set('livesWith', e.target.value)}>
            {['Alene', 'Samboer', 'Familie med barn', 'Venner/kollektiv', 'Annet'].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="age">Alder</label>
          <select id="age" className="input" value={p.age} onChange={(e) => set('age', e.target.value)}>
            {['Under 25', '25–34', '35–44', '45–54', '55+'].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>

        <h2 className="section-title">Interiørstil</h2>
        <div className="chips">
          {STYLES.map((s) => (
            <button key={s} className="chip" aria-pressed={p.styles.includes(s)} onClick={() => toggleStyle(s)}>
              {s}
            </button>
          ))}
        </div>

        <h2 className="section-title">Pinterest</h2>
        {p.pinterestConnected ? (
          <>
            <p className="hint" style={{ marginBottom: 8 }}>
              Koblet til Pinterest · 3 tavler: Stue, Soverom, Farger
            </p>
            <div className="pins">
              {['Stue', 'Soverom', 'Farger'].map((b) => (
                <div key={b} className="placeholder-img" style={{ height: 80 }}>
                  {b}
                </div>
              ))}
            </div>
            <button
              className="btn btn-ghost"
              onClick={() =>
                update((d) => {
                  d.profile.pinterestConnected = false;
                })
              }
            >
              Koble fra
            </button>
          </>
        ) : (
          <button className="btn btn-block" onClick={connect}>
            Koble til Pinterest
          </button>
        )}

        <h2 className="section-title">Mine møbler</h2>
        <LibraryList items={state.library} onPick={setEditing} />
        <button className="btn btn-block" style={{ marginTop: 12, borderStyle: 'dashed' }} onClick={() => setAdding(true)}>
          + Legg til møbel
        </button>
      </div>

      {connecting && <Loading text="Kobler til Pinterest …" sub="Simulert" />}
      {(adding || editing) && (
        <FurniturePreview
          method={editing ? 'library' : 'photo'}
          confirmLabel={editing ? 'Lagre' : 'Lagre i Mine møbler'}
          initial={editing ? { ...editing, source: 'Mine møbler' } : undefined}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onAttach={(a) => {
            update((d) => {
              if (editing) {
                const it = d.library.find((x) => x.id === editing.id)!;
                Object.assign(it, { name: a.name, width: a.width, depth: a.depth, height: a.height });
              } else {
                d.library.push({ id: uid('l'), name: a.name, kind: a.kind, width: a.width, depth: a.depth, height: a.height, color: a.color, colorName: a.colorName, product: a.product });
              }
            });
            showToast(editing ? 'Møbelet er oppdatert.' : 'Møbelet er lagret i Mine møbler.');
            setAdding(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
