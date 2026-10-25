import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { errorMessage } from '../lib/errors';

export function usePagedList<T>(key: string, load: (page: number) => Promise<T[]>) {
  const [location, setLocation] = useState({ key, page: 1 });
  const page = location.key === key ? location.page : 1;
  const [result, setResult] = useState<{ key: string; page: number; rows: T[]; loaded: boolean; loading: boolean; error: string | null }>({ key, page: 1, rows: [], loaded: false, loading: true, error: null });
  const generation = useRef(0);
  const reading = useRef(false);
  const context = useRef({ key, page });
  context.current = { key, page };
  const visible = result.key === key && result.page === page;
  const loading = !visible || result.loading;
  const hasData = visible && result.loaded;
  const initialLoading = loading && !hasData;
  const refreshing = loading && hasData;

  const refresh = useCallback(async () => {
    if (context.current.key !== key || context.current.page !== page) return;
    const request = ++generation.current;
    const current = () => generation.current === request && context.current.key === key && context.current.page === page;
    reading.current = true;
    setResult((previous) => ({
      key, page,
      rows: previous.key === key && previous.page === page ? previous.rows : [],
      loaded: previous.key === key && previous.page === page && previous.loaded,
      loading: true, error: null,
    }));
    try {
      const rows = await load(page);
      if (!current()) return;
      if (rows.length === 0 && page > 1) {
        setLocation({ key, page: page - 1 });
      } else {
        setResult({ key, page, rows, loaded: true, loading: false, error: null });
      }
    } catch (error) {
      if (current()) setResult((previous) => ({ ...previous, loading: false, error: errorMessage(error) }));
    } finally {
      if (current()) reading.current = false;
    }
  }, [key, page, load]);

  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { generation.current++; reading.current = false; };
  }, [refresh]));

  function go(next: number) {
    if (reading.current || loading || next < 1 || (next > page && result.rows.length <= 5)) return;
    reading.current = true;
    generation.current++;
    setLocation({ key, page: next });
  }

  return { page, rows: hasData ? result.rows.slice(0, 5) : [], hasNext: visible && result.rows.length > 5, loading, initialLoading, refreshing, error: visible ? result.error : null, go, refresh };
}
