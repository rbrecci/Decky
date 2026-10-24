import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { errorMessage } from '../lib/errors';

export function usePagedList<T>(key: string, load: (page: number) => Promise<T[]>) {
  const [location, setLocation] = useState({ key, page: 1 });
  const page = location.key === key ? location.page : 1;
  const [result, setResult] = useState<{ key: string; page: number; rows: T[]; loading: boolean; error: string | null }>({ key, page: 1, rows: [], loading: true, error: null });
  const generation = useRef(0);
  const reading = useRef(false);
  const visible = result.key === key && result.page === page;
  const loading = !visible || result.loading;

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    reading.current = true;
    setResult({ key, page, rows: [], loading: true, error: null });
    try {
      const rows = await load(page);
      if (generation.current !== request) return;
      if (rows.length === 0 && page > 1) {
        setLocation({ key, page: page - 1 });
      } else {
        setResult({ key, page, rows, loading: false, error: null });
      }
    } catch (error) {
      if (generation.current === request) setResult({ key, page, rows: [], loading: false, error: errorMessage(error) });
    } finally {
      if (generation.current === request) reading.current = false;
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

  return { page, rows: visible && !loading ? result.rows.slice(0, 5) : [], hasNext: visible && result.rows.length > 5, loading, error: visible ? result.error : null, go, refresh };
}
