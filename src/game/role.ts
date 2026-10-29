import type { MatchPlayer, MatchRole, MatchView } from '../contracts/types';

/**
 * Papel deste aparelho a partir do que o servidor entregou: jogador (está em match_players,
 * recebe a própria mão) ou mesa (é o table_user_id da partida). null = não pode ver a partida.
 */
export function resolveRole(userId: string | null, match: MatchView, players: MatchPlayer[]): MatchRole | null {
  // O papel vem de match_players (gravado pelo servidor), nunca de ter recebido uma mão.
  if (userId && players.some((p) => p.userId === userId)) return 'player';
  if (userId && match.tableUserId === userId) return 'table';
  if (userId && match.spectatorUserId === userId) return 'spectator';
  return null;
}

/**
 * Tela do jogador:
 * - 'split': sem mesa dedicada (4 aparelhos), a mesa pública fica em cima e a mão embaixo.
 * - 'hand': com mesa dedicada (5 aparelhos), a mesa completa existe só no aparelho da mesa;
 *   o jogador vê a própria mão, os controles e o essencial público (placar, vez, vira, truco).
 */
export type PlayerLayout = 'split' | 'hand';

export function playerLayout(match: Pick<MatchView, 'tableUserId'>): PlayerLayout {
  return match.tableUserId ? 'hand' : 'split';
}
