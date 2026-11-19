// Interior style for a room: several styles can be picked (Synne 29.10), plus «Other…» for the user's own word.
// Used in «Create room» (Room details) and in Room settings.
import { useState } from 'react';
import { STYLES } from '../screens/ProfileScreens';

export function StyleChips({ value, onChange, labelledBy }: { value: string[]; onChange: (styles: string[]) => void; labelledBy: string }) {
  const picked = value.filter((s) => STYLES.includes(s));
  const own = value.find((s) => !STYLES.includes(s));
  // null = «Other…» is off; a string (also '') = the field is open
  const [other, setOther] = useState<string | null>(own ?? null);
  const emit = (p: string[], o: string | null) => onChange([...p, ...(o?.trim() ? [o.trim()] : [])]);
  return (
    <>
      <div className="chips" role="group" aria-labelledby={labelledBy}>
        {STYLES.map((s) => (
          <button key={s} className="chip" aria-pressed={picked.includes(s)} onClick={() => emit(picked.includes(s) ? picked.filter((x) => x !== s) : [...picked, s], other)}>
            {s}
          </button>
        ))}
        <button
          className="chip"
          aria-pressed={other !== null}
          onClick={() => {
            const next = other === null ? '' : null;
            setOther(next);
            emit(picked, next);
          }}
        >
          Other…
        </button>
      </div>
      {other !== null && (
        <input
          className="input nr-other"
          autoFocus
          placeholder="Your style, e.g. Warm minimal"
          aria-label="Your own interior style"
          value={other}
          onChange={(e) => {
            setOther(e.target.value);
            emit(picked, e.target.value);
          }}
        />
      )}
    </>
  );
}
