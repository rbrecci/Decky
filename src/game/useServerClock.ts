import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetchServerNow } from './api';
import { clockOffset } from './deadline';

/** Abaixo disso a diferença nova não redesenha a tela: o relógio já está bom. */
const OFFSET_TOLERANCE_MS = 250;

/**
 * Diferença entre o relógio do servidor e o do aparelho. Lida ao montar e ao voltar do segundo plano
 * (o relógio do aparelho pode ter mudado); `observe` aproveita o `serverNow` das respostas de jogada.
 * Com ela, a contagem é a mesma em todos os aparelhos, e uma reconexão mostra o tempo que falta certo.
 */
export function useServerClock(fetchNow: () => Promise<number> = fetchServerNow) {
  const [offset, setOffset] = useState(0);
  const [calibrated, setCalibrated] = useState(false);
  const pending = useRef<Promise<void> | null>(null);

  const observe = useCallback((serverNow: number, sentAt: number, receivedAt: number) => {
    const next = clockOffset(sentAt, receivedAt, serverNow);
    if (!Number.isFinite(next)) return;
    setCalibrated(true);
    setOffset((current) => (Math.abs(current - next) > OFFSET_TOLERANCE_MS ? next : current));
  }, []);

  const sync = useCallback((): Promise<void> => {
    if (pending.current) return pending.current;
    const run = async () => {
      const sentAt = Date.now();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const deadline = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('clock_timeout')), 10000);
        });
        observe(await Promise.race([fetchNow(), deadline]), sentAt, Date.now());
      } catch {
        // Mantém a calibração anterior. A primeira leitura pode ser repetida pelo botão de tentativa.
      } finally { clearTimeout(timer); pending.current = null; }
    };
    pending.current = run();
    return pending.current;
  }, [fetchNow, observe]);

  useEffect(() => {
    sync();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') sync();
    });
    return () => subscription.remove();
  }, [sync]);

  return { offset, observe, calibrated, sync };
}
