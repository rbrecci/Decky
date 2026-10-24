// Salas: toda escrita passa por RPC no servidor; aqui só chamadas e leituras.
import type { GameMode, HostMode, PublicRoom, Room, RoomSeat, RoomVisibility, Seat, Team } from '../contracts/types';
import { supabase } from '../lib/supabase';

interface RoomRow {
  id: string;
  code: string;
  host_user_id: string;
  host_mode: HostMode;
  game_mode: GameMode;
  visibility?: RoomVisibility;
  status: Room['status'];
}

const toRoom = (row: RoomRow): Room => ({
  id: row.id,
  code: row.code,
  hostUserId: row.host_user_id,
  // Salas criadas antes do modo mesa não têm a coluna preenchida na leitura antiga.
  hostMode: row.host_mode ?? 'player',
  gameMode: row.game_mode ?? '2v2',
  visibility: row.visibility ?? 'private',
  status: row.status,
});

export async function createRoom(hostMode: HostMode = 'player', gameMode: GameMode = '2v2', visibility: RoomVisibility = 'private'): Promise<Room> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('room_create_timeout'));
    }, 15000);
  });

  try {
    const { data, error } = await Promise.race([
      supabase.rpc('create_room', { p_host_mode: hostMode, p_game_mode: gameMode, p_visibility: visibility }).abortSignal(controller.signal),
      deadline,
    ]);
    if (error) throw error;
    return toRoom(data as RoomRow);
  } finally {
    clearTimeout(timer);
  }
}

export async function joinRoom(code: string): Promise<Room> {
  const { data, error } = await supabase.rpc('join_room', { p_code: code });
  if (error) throw error;
  return toRoom(data as RoomRow);
}

export async function changeSeat(roomId: string, seat: Seat): Promise<void> {
  const { error } = await supabase.rpc('change_seat', { p_room_id: roomId, p_seat: seat });
  if (error) throw error;
}

/** Só o dono, no lobby: sentar para jogar ('player') ou liberar o lugar e ser a mesa ('table'). */
export async function setHostMode(roomId: string, hostMode: HostMode): Promise<void> {
  const { error } = await supabase.rpc('set_host_mode', { p_room_id: roomId, p_host_mode: hostMode });
  if (error) throw error;
}

export async function setReady(roomId: string, ready: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_ready', { p_room_id: roomId, p_ready: ready });
  if (error) throw error;
}

export async function leaveRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_room', { p_room_id: roomId });
  if (error) throw error;
}

export async function fetchRoomByCode(code: string): Promise<Room | null> {
  const { data, error } = await supabase.from('rooms').select('id, code, host_user_id, host_mode, game_mode, visibility, status').eq('code', code).maybeSingle();
  if (error) throw error;
  return data ? toRoom(data as RoomRow) : null;
}

export async function fetchPublicRooms(): Promise<PublicRoom[]> {
  const { data, error } = await supabase.rpc('get_public_rooms');
  if (error) throw error;
  return (data ?? []).map((row: { id: string; code: string; host_name: string; game_mode: GameMode; player_count: number; capacity: number }) => ({
    id: row.id, code: row.code, hostName: row.host_name, gameMode: row.game_mode,
    playerCount: row.player_count, capacity: row.capacity,
  }));
}

export async function fetchSeats(roomId: string): Promise<RoomSeat[]> {
  const { data, error } = await supabase
    .from('room_players')
    .select('seat, team, ready, user_id, profiles(display_name)')
    .eq('room_id', roomId)
    .order('seat');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    seat: row.seat as Seat,
    team: row.team as Team,
    ready: row.ready,
    userId: row.user_id,
    displayName: row.profiles?.display_name ?? 'Jogador',
  }));
}

/** Partida em andamento da sala, se houver (para levar o lobby direto à mesa). */
export async function fetchActiveMatchId(roomId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('id')
    .eq('room_id', roomId)
    .eq('status', 'playing')
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}
