// Partida: o app só envia intenções. Regras, sorteio e placar ficam no servidor.
import { FunctionsHttpError } from '@supabase/supabase-js';
import type {
  ActionRequest,
  AutoCardResult,
  Card,
  GameAction,
  GameError,
  GameResult,
  MatchPlayer,
  MatchView,
  PrivateHand,
  Seat,
  StartMatchResult,
  Team,
} from '../contracts/types';
import { newClientActionId } from '../lib/id';
import { supabase } from '../lib/supabase';

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // Erros 4xx/5xx da função ainda trazem { ok: false, error } no corpo.
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      if (payload && payload.ok === false) return payload as T;
    }
    return { ok: false, error: 'network_error' } as T;
  }
  return data as T;
}

export function startMatch(roomId: string): Promise<StartMatchResult> {
  return invoke<StartMatchResult>('start-match', { roomId });
}

/**
 * Envia uma ação. Em caso de falha de rede, reenvia com o mesmo clientActionId:
 * se a primeira chegou, o servidor reconhece e não duplica.
 */
export async function submitAction(
  matchId: string,
  action: GameAction,
  expectedRevision: number,
  clientActionId: string = newClientActionId(),
): Promise<GameResult> {
  const request: ActionRequest = { matchId, action, expectedRevision, clientActionId };
  let result = await invoke<GameResult>('submit-action', { ...request });
  for (let attempt = 1; attempt <= 2 && !result.ok && result.error === 'network_error'; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    result = await invoke<GameResult>('submit-action', { ...request });
  }
  return result;
}

export async function fetchMatch(matchId: string): Promise<MatchView | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('id, room_id, revision, public_state, table_user_id, rooms(code), match_spectators(user_id)')
    .eq('id', matchId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const room = data.rooms as unknown as { code: string } | null;
  return {
    matchId: data.id,
    roomId: data.room_id,
    roomCode: room?.code ?? null,
    revision: data.revision,
    state: data.public_state,
    tableUserId: data.table_user_id ?? null,
    spectatorUserId: (data.match_spectators as { user_id: string }[] | null)?.[0]?.user_id ?? null,
  };
}

/** Mão de quem chama. A mesa (e qualquer não jogador) recebe null: o servidor não tem mão para ela. */
export async function fetchMyHand(matchId: string): Promise<PrivateHand | null> {
  const { data, error } = await supabase.rpc('get_my_hand', { p_match_id: matchId });
  if (error) throw error;
  return (data as PrivateHand | null) ?? null;
}

/**
 * Marca (ou cancela, com null) a carta da própria mão para jogada automática. Não muda a revisão:
 * o servidor só guarda a marcação, em privado, e a joga quando a vez chegar.
 */
export async function setMyAutoCard(matchId: string, card: Card | null): Promise<AutoCardResult> {
  const { data, error } = await supabase.rpc('set_my_auto_card', { p_match_id: matchId, p_card: card });
  if (error) return { ok: false, error: 'network_error' };
  return data as AutoCardResult;
}

/** Relógio do servidor (epoch ms), para calcular a diferença com o relógio do aparelho. */
export async function fetchServerNow(): Promise<number> {
  const { data, error } = await supabase.rpc('server_now');
  if (error) throw error;
  return Number(data);
}

export async function fetchMatchPlayers(matchId: string): Promise<MatchPlayer[]> {
  const { data, error } = await supabase
    .from('match_players')
    .select('seat, team, user_id, profiles(display_name)')
    .eq('match_id', matchId)
    .order('seat');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    seat: row.seat as Seat,
    team: row.team as Team,
    userId: row.user_id,
    displayName: row.profiles?.display_name ?? 'Jogador',
  }));
}

export type { GameError };
