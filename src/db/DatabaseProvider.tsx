import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { initDatabase, type InitResult } from './init';
import type { Db } from './types';

interface DatabaseValue {
  db: Db;
  info: InitResult;
}

const DatabaseContext = createContext<DatabaseValue | null>(null);

type State =
  | { status: 'loading' }
  | { status: 'ready'; value: DatabaseValue }
  | { status: 'error'; error: unknown };

interface Props {
  open: () => Promise<Db>;
  children: ReactNode;
  renderLoading: () => ReactNode;
  renderError: (error: unknown, retry: () => void) => ReactNode;
}

/** Abre e inicializa SQLite una vez y comparte la conexión con toda la app. */
export function DatabaseProvider({ open, children, renderLoading, renderError }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await open();
        const info = await initDatabase(db);
        if (!cancelled) setState({ status: 'ready', value: { db, info } });
      } catch (error) {
        if (!cancelled) setState({ status: 'error', error });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  if (state.status === 'loading') return <>{renderLoading()}</>;
  if (state.status === 'error') return <>{renderError(state.error, retry)}</>;
  return <DatabaseContext.Provider value={state.value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): DatabaseValue {
  const value = useContext(DatabaseContext);
  if (!value) throw new Error('useDatabase debe usarse dentro de DatabaseProvider');
  return value;
}

export function useDb(): Db {
  return useDatabase().db;
}
