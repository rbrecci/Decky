// Histórico: partidas jogadas (só leitura) e notas pessoais (CRUD com RLS por autor).
import type { MatchNote, MatchPlayer, MatchSummary } from '../contracts/types';
import { supabase } from '../lib/supabase';

interface MatchHistoryRow {
  id: string;
  status: MatchSummary['status'];
  score_a: number;
  score_b: number;
  winner_team: MatchSummary['winnerTeam'];
  my_team: MatchSummary['myTeam'];
  started_at: string;
  ended_at: string | null;
  game_mode: MatchSummary['gameMode'];
  ranked: boolean;
  points_delta: number | null;
  points_after: number | null;
  points_before?: number | null;
  rating_rule?: string | null;
  players: { seat: MatchPlayer['seat']; team: MatchPlayer['team']; user_id: string; display_name: string }[];
}

const toMatch = (row: MatchHistoryRow): MatchSummary => ({
    id: row.id,
    status: row.status,
    scoreA: row.score_a,
    scoreB: row.score_b,
    winnerTeam: row.winner_team,
    myTeam: row.my_team,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    gameMode: row.game_mode,
    ranked: row.ranked,
    pointsDelta: row.points_delta,
    pointsAfter: row.points_after,
    pointsBefore: row.points_before ?? null,
    ratingRule: row.rating_rule ?? null,
    players: row.players.map((player) => ({
      seat: player.seat, team: player.team, userId: player.user_id, displayName: player.display_name,
    })),
  });

function pageOffset(page: number): number {
  if (!Number.isSafeInteger(page) || page < 1) throw new RangeError('invalid_page');
  return (page - 1) * 5;
}

export async function fetchMyMatches(page = 1): Promise<MatchSummary[]> {
  const { data, error } = await supabase.rpc('get_my_match_history', { p_limit: 6, p_offset: pageOffset(page) });
  if (error) throw error;
  return ((data ?? []) as MatchHistoryRow[]).map(toMatch);
}

interface NoteRow {
  id: string;
  match_id: string;
  title: string;
  notes: string;
  created_at: string;
  updated_at: string;
  match?: MatchHistoryRow;
}

const toNote = (row: NoteRow): MatchNote => ({
  id: row.id,
  matchId: row.match_id,
  title: row.title,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...(row.match ? { match: toMatch(row.match) } : {}),
});

const NOTE_COLUMNS = 'id, match_id, title, notes, created_at, updated_at';

export async function listNotes(page = 1): Promise<MatchNote[]> {
  const { data, error } = await supabase.rpc('get_my_notes_page', { p_limit: 6, p_offset: pageOffset(page) });
  if (error) throw error;
  return ((data ?? []) as NoteRow[]).map(toNote);
}

export async function getNote(id: string): Promise<MatchNote | null> {
  const { data, error } = await supabase.from('match_notes').select(NOTE_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toNote(data as NoteRow) : null;
}

export async function createNote(matchId: string, title: string, notes: string): Promise<MatchNote> {
  const { data, error } = await supabase
    .from('match_notes')
    .insert({ match_id: matchId, title: title.trim(), notes: notes.trim() })
    .select(NOTE_COLUMNS)
    .single();
  if (error) throw error;
  return toNote(data as NoteRow);
}

export async function updateNote(id: string, title: string, notes: string): Promise<MatchNote> {
  const { data, error } = await supabase
    .from('match_notes')
    .update({ title: title.trim(), notes: notes.trim() })
    .eq('id', id)
    .select(NOTE_COLUMNS)
    .single();
  if (error) throw error;
  return toNote(data as NoteRow);
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('match_notes').delete().eq('id', id);
  if (error) throw error;
}

export function validateNoteTitle(title: string): string | null {
  const length = title.trim().length;
  if (length === 0) return 'Dê um título para a nota.';
  if (length > 80) return 'Use no máximo 80 caracteres.';
  return null;
}
