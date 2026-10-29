import { useCallback, useRef, useState } from 'react';
import { useRoomPresence } from '../rooms/useRoomPresence';
import type { Card, GameResult, MatchPlayer, PrivateHand } from '../contracts/types';
import { useLiveRefresh, type RefreshHint } from '../lib/useLiveRefresh';
import { fetchMatch, fetchMatchPlayers, fetchMyHand } from './api';
import { EMPTY_MATCH_DATA, mergeMatchData, needsHandRead, readFromResult, withAutoCard, type MatchData } from './matchData';

export type { MatchData };

/**
 * Estado público da partida (Realtime em `matches`) e, para jogadores, a própria mão (get_my_hand).
 * A mão nunca chega por Realtime: é buscada sempre que a revisão muda. A mesa central nunca recebe mão;
 * o servidor devolve null para quem não é jogador, e este hook nem chega a pedir.
 */
export function useMatch(matchId: string | undefined, userId: string | null) {
  const [data, setData] = useState<MatchData>(EMPTY_MATCH_DATA);
  useRoomPresence(data.role === 'player' || data.role === 'table' ? data.match?.roomId ?? null : null);
  const latest = useRef(data);
  latest.current = data;
  const handRevision = useRef<number | null>(null);
  const playersCache = useRef<MatchPlayer[] | null>(null);

  const refresh = useCallback(async ({ changed }: RefreshHint = { changed: false }) => {
    if (!matchId) return;
    // Aviso de mudança do Realtime: a mão quase certamente mudou junto. Busca estado e mão ao mesmo
    // tempo (uma ida ao servidor a menos). No polling, a mão só é buscada se a revisão mudou, para não
    // dobrar as leituras a cada 4 s.
    const isKnownPlayer = !!playersCache.current?.some((p) => p.userId === userId);
    const [match, early] = await Promise.all([
      fetchMatch(matchId),
      changed && isKnownPlayer ? fetchMyHand(matchId) : Promise.resolve(undefined),
    ]);
    if (!match) {
      setData((d) => (d.loaded && d.notFound ? d : { ...d, loaded: true, notFound: true }));
      return;
    }

    if (!playersCache.current) playersCache.current = await fetchMatchPlayers(matchId);
    const players = playersCache.current;
    const isPlayer = players.some((p) => p.userId === userId);

    let hand: PrivateHand | null | undefined = early;
    if (needsHandRead(isPlayer, handRevision.current, match.revision, early)) hand = await fetchMyHand(matchId);
    if (hand !== undefined) handRevision.current = hand?.revision ?? null;

    // Leitura igual à anterior (polling, Realtime repetido) não redesenha a partida.
    setData((d) => mergeMatchData(d, { match, players, hand }, userId));
  }, [matchId, userId]);

  const { status, refreshNow } = useLiveRefresh(
    matchId ? `match:${matchId}` : null,
    matchId ? [{ table: 'matches', filter: `id=eq.${matchId}` }] : [],
    refresh,
  );

  /**
   * Aplica o resultado de uma ação deste aparelho. Devolve false quando a resposta não trouxe o estado
   * (ação repetida, servidor antigo); quem chamou então relê.
   */
  const applyResult = useCallback(
    (result: GameResult): boolean => {
      // Decide com o estado atual (ref): o atualizador do setState pode rodar só no próximo render.
      if (!readFromResult(latest.current, result)) return false;
      setData((d) => {
        const read = readFromResult(d, result);
        return read ? mergeMatchData(d, read, userId) : d;
      });
      // A mão veio junto: a próxima leitura com esta revisão não precisa buscá-la de novo.
      if (result.ok && result.hand) handRevision.current = result.hand.revision;
      return true;
    },
    [userId],
  );

  /** Aplica a marcação de jogada automática que o servidor confirmou (a revisão não muda com ela). */
  const applyAutoCard = useCallback((autoCard: Card | null) => setData((d) => withAutoCard(d, autoCard)), []);

  return { ...data, connection: status, refresh: refreshNow, applyResult, applyAutoCard };
}
