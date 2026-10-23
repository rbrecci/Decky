import type { GameMode, Ranking, RankingEntry } from '../contracts/types';
import { supabase } from '../lib/supabase';

interface RankingRow {
  position: number;
  user_id: string;
  display_name: string;
  points: number;
  played: number;
  wins: number;
  losses: number;
}

const toEntry = (row: RankingRow): RankingEntry => ({
  position: row.position,
  userId: row.user_id,
  displayName: row.display_name,
  points: row.points,
  played: row.played,
  wins: row.wins,
  losses: row.losses,
});

export async function fetchRankings(gameMode: GameMode): Promise<Ranking> {
  const { data, error } = await supabase.rpc('get_rankings', { p_game_mode: gameMode, p_limit: 50 });
  if (error) throw error;
  const ranking = data as { entries: RankingRow[]; myEntry: RankingRow | null };
  return {
    entries: ranking.entries.map(toEntry),
    myEntry: ranking.myEntry ? toEntry(ranking.myEntry) : null,
  };
}
