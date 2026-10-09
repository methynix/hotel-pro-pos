import { DependencyList, Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../utils/format';

interface AsyncData<T> {
  data: T;
  setData: Dispatch<SetStateAction<T>>;
  /** True only for the first load; reloads keep the current data on screen. */
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useAsyncData<T>(loader: () => Promise<T>, initial: T, deps: DependencyList = []): AsyncData<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps);

  const reload = useCallback(async () => {
    const requestId = ++latest.current;
    try {
      const result = await load();
      if (requestId === latest.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (requestId === latest.current) setError(errorMessage(err, 'Failed to load data'));
    } finally {
      if (requestId === latest.current) setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  return { data, setData, loading, error, reload };
}
