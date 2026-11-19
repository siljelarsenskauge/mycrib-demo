import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createSeed } from './seed';
import type { AppState } from './types';

const KEY = 'rom-prototype:v5';

function load(): AppState {
  const params = new URLSearchParams(window.location.search);
  if (params.has('reset')) {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    window.history.replaceState(null, '', window.location.pathname + '#/');
    return createSeed();
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === 5) return parsed;
    }
  } catch {
    /* ignore */
  }
  return createSeed();
}

interface Store {
  state: AppState;
  update: (recipe: (draft: AppState) => void) => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number>();

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const update = useCallback((recipe: (draft: AppState) => void) => {
    setState((prev) => {
      const draft = structuredClone(prev);
      recipe(draft);
      return draft;
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  return <Ctx.Provider value={{ state, update, toast, showToast }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
