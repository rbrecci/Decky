import { useEffect } from 'react';
import { AppState } from 'react-native';
import { heartbeatRoom } from './api';

/** A saída da tela não apaga a presença: reconexões têm 120 s de tolerância no servidor. */
export function useRoomPresence(roomId: string | null) {
  useEffect(() => {
    if (!roomId) return;
    let pending = false;
    const renew = async () => {
      if (pending || AppState.currentState === 'background') return;
      pending = true;
      try { await heartbeatRoom(roomId); }
      catch { /* O polling existente sinaliza falhas e relê a sala ao reconectar. */ }
      finally { pending = false; }
    };
    void renew();
    const timer = setInterval(renew, 20000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void renew(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [roomId]);
}
