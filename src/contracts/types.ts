// Contratos entre app e servidor (T-00).
// Os tipos do jogo vêm do motor, para existir uma única definição.
// `export type` é apagado na compilação: o app não carrega código do motor por aqui.
export type {
  ActionDeadline,
  Card,
  GameMode,
  GameAction,
  GameActionType,
  HandSummary,
  HandValue,
  PublicEvent,
  ProposalStatus,
  PublicGameState,
  PublicTableCard,
  Rank,
  Seat,
  Suit,
  TableCard,
  Team,
  TeamDecision,
  TeamProposal,
  TrickResult,
  TrucoRequest,
  TrucoResponse,
} from '../../supabase/functions/_shared/engine/types.ts';

import type { Card, GameMode, GameAction, PublicGameState, Seat, Team } from '../../supabase/functions/_shared/engine/types.ts';

export interface UserProfile {
  id: string;
  displayName: string;
}

export type RoomStatus = 'lobby' | 'playing' | 'finished';

/**
 * Papel do dono da sala, escolhido ao criar.
 * 'player': o dono ocupa um lugar e joga (4 aparelhos).
 * 'table': o dono não joga; o aparelho dele mostra só a mesa pública (5 aparelhos).
 */
export type HostMode = 'player' | 'table';

export interface Room {
  id: string;
  code: string;
  hostUserId: string;
  hostMode: HostMode;
  gameMode: GameMode;
  status: RoomStatus;
}

export interface RoomSeat {
  seat: Seat;
  team: Team;
  userId: string;
  displayName: string;
  ready: boolean;
}

export interface MatchPlayer {
  seat: Seat;
  team: Team;
  userId: string;
  displayName: string;
}

/** Estado público como o app recebe: projeção do motor mais a revisão do banco. */
export interface MatchView {
  matchId: string;
  roomId: string;
  /** Código da sala, para voltar ao lobby no fim. */
  roomCode: string | null;
  revision: number;
  state: PublicGameState;
  /** Aparelho que atua como mesa (modo 'table'); null quando o dono joga. */
  tableUserId: string | null;
}

/** Como este aparelho participa da partida: jogador com mão privada ou mesa só de leitura. */
export type MatchRole = 'player' | 'table';

/** Mão privada: só a do próprio usuário, via get_my_hand. */
export interface PrivateHand {
  revision: number;
  seat: Seat;
  cards: Card[];
  /** A carta que este jogador jogou escondida na vaza atual. Opcional: servidor antigo não manda. */
  covered?: Card | null;
  /** A carta marcada para jogada automática. Opcional: servidor antigo não manda. */
  autoCard?: Card | null;
}

/** Resposta de set_my_auto_card. */
export type AutoCardResult = { ok: true; autoCard: Card | null } | { ok: false; error: GameError };

/** Corpo enviado para a Edge Function submit-action. */
export interface ActionRequest {
  matchId: string;
  action: GameAction;
  expectedRevision: number;
  clientActionId: string;
}

export type GameError =
  | 'not_your_turn'
  | 'invalid_card'
  | 'illegal_action'
  | 'match_over'
  | 'too_early'
  | 'conflict'
  | 'not_member'
  | 'match_not_found'
  | 'not_authenticated'
  | 'bad_request'
  | 'server_error'
  | 'network_error';

/**
 * Resposta do submit-action. No sucesso pode vir o estado público já gravado e a mão de quem agiu
 * (a tela aplica na hora, sem esperar a releitura); numa ação repetida (mesmo clientActionId) ou num
 * servidor antigo, vem só a revisão e a tela relê.
 */
export type GameResult =
  | { ok: true; newRevision: number; state?: PublicGameState; hand?: PrivateHand; serverNow?: number }
  | { ok: false; error: GameError };

export type StartMatchResult = { ok: true; matchId: string } | { ok: false; error: string };

export interface MatchNote {
  id: string;
  matchId: string;
  title: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchSummary {
  id: string;
  status: 'playing' | 'finished';
  scoreA: number;
  scoreB: number;
  winnerTeam: Team | null;
  myTeam: Team;
  startedAt: string;
  endedAt: string | null;
}
