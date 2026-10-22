-- Modo de jogo escolhido na criacao e preservado durante a vida da sala.
alter table public.rooms
  add column game_mode text not null default '2v2' check (game_mode in ('1v1', '2v2'));

drop function public.create_room(text);


create or replace function public.create_room(p_host_mode text default 'player', p_game_mode text default '2v2')
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_room public.rooms;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if p_host_mode is null or p_host_mode not in ('player', 'table') then
    raise exception 'invalid_mode';
  end if;
  if p_game_mode is null or p_game_mode not in ('1v1', '2v2') then
    raise exception 'invalid_game_mode';
  end if;
  perform public.ensure_profile(v_user);

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where code = v_code);
  end loop;

  insert into public.rooms (code, host_user_id, host_mode, game_mode) values (v_code, v_user, p_host_mode, p_game_mode) returning * into v_room;
  -- No modo mesa o dono não ocupa lugar: os lugares ficam para os jogadores.
  if p_host_mode = 'player' then
    insert into public.room_players (room_id, user_id, seat) values (v_room.id, v_user, 1);
  end if;
  return v_room;
end;
$$;

create or replace function public.join_room(p_code text)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_room public.rooms;
  v_seat smallint;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  perform public.ensure_profile(v_user);

  -- Trava a sala: duas entradas simultâneas não disputam a mesma posição.
  select * into v_room from public.rooms where code = upper(trim(p_code)) for update;
  if not found then
    raise exception 'room_not_found';
  end if;
  -- O dono já pertence à sala, sentado (modo jogador) ou como mesa.
  if v_room.host_user_id = v_user
     or exists (select 1 from public.room_players where room_id = v_room.id and user_id = v_user) then
    raise exception 'already_in_room';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'room_started';
  end if;

  select s into v_seat
  from generate_series(1, case when v_room.game_mode = '1v1' then 2 else 4 end) as s
  where not exists (select 1 from public.room_players where room_id = v_room.id and seat = s)
  order by s
  limit 1;
  if v_seat is null then
    raise exception 'room_full';
  end if;

  insert into public.room_players (room_id, user_id, seat) values (v_room.id, v_user, v_seat);
  return v_room;
end;
$$;

create or replace function public.set_host_mode(p_room_id uuid, p_host_mode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_room public.rooms;
  v_seat smallint;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or v_room.host_user_id <> v_user then
    raise exception 'not_host';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'room_started';
  end if;
  if p_host_mode is null or p_host_mode not in ('player', 'table') then
    raise exception 'invalid_mode';
  end if;
  if p_host_mode = v_room.host_mode then
    return;
  end if;

  if p_host_mode = 'table' then
    delete from public.room_players where room_id = p_room_id and user_id = v_user;
  else
    select s into v_seat
    from generate_series(1, case when v_room.game_mode = '1v1' then 2 else 4 end) as s
    where not exists (select 1 from public.room_players where room_id = p_room_id and seat = s)
    order by s
    limit 1;
    if v_seat is null then
      raise exception 'room_full';
    end if;
    insert into public.room_players (room_id, user_id, seat) values (p_room_id, v_user, v_seat);
  end if;

  update public.rooms set host_mode = p_host_mode where id = p_room_id;
end;
$$;

create or replace function public.change_seat(p_room_id uuid, p_seat smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or not public.is_room_member(p_room_id) then
    raise exception 'room_not_found';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'room_started';
  end if;
  if p_seat is null or p_seat not between 1 and (case when v_room.game_mode = '1v1' then 2 else 4 end) then
    raise exception 'invalid_seat';
  end if;
  if exists (select 1 from public.room_players where room_id = p_room_id and seat = p_seat) then
    raise exception 'seat_taken';
  end if;

  update public.room_players
  set seat = p_seat, ready = false
  where room_id = p_room_id and user_id = auth.uid();
end;
$$;

create or replace function public.internal_start_match(
  p_room_id uuid,
  p_user_id uuid,
  p_state jsonb,
  p_hands jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
  v_match_id uuid;
  v_players integer;
  v_ready integer;
  v_required integer;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or not (
    v_room.host_user_id = p_user_id
    or exists (select 1 from public.room_players where room_id = p_room_id and user_id = p_user_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'room_not_found');
  end if;

  select id into v_match_id from public.matches where room_id = p_room_id and status = 'playing';
  if found then
    return jsonb_build_object('ok', true, 'matchId', v_match_id, 'existing', true);
  end if;

  if v_room.host_user_id <> p_user_id then
    return jsonb_build_object('ok', false, 'error', 'not_host');
  end if;

  if coalesce(p_state ->> 'gameMode', '2v2') <> v_room.game_mode then
    return jsonb_build_object('ok', false, 'error', 'invalid_game_mode');
  end if;
  v_required := case when v_room.game_mode = '1v1' then 2 else 4 end;

  select count(*), count(*) filter (where ready) into v_players, v_ready
  from public.room_players where room_id = p_room_id;
  if v_players <> v_required then
    return jsonb_build_object('ok', false, 'error', 'not_enough_players');
  end if;
  if v_ready <> v_required then
    return jsonb_build_object('ok', false, 'error', 'players_not_ready');
  end if;

  insert into public.matches (room_id, public_state, current_turn_seat, table_user_id)
  values (
    p_room_id,
    p_state,
    (p_state ->> 'currentTurnSeat')::smallint,
    case when v_room.host_mode = 'table' then v_room.host_user_id end
  )
  returning id into v_match_id;

  insert into public.match_players (match_id, user_id, seat)
  select v_match_id, user_id, seat from public.room_players where room_id = p_room_id;

  insert into private.private_hands (match_id, seat, user_id, cards)
  select v_match_id, seat, user_id, p_hands -> (seat - 1)
  from public.room_players where room_id = p_room_id;

  insert into public.match_events (match_id, actor_user_id, action, revision)
  values (v_match_id, p_user_id, 'start_match', 0);

  update public.rooms set status = 'playing' where id = p_room_id;

  return jsonb_build_object('ok', true, 'matchId', v_match_id, 'existing', false);
end;
$$;

create function public.internal_room_game_mode(p_room_id uuid, p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object('ok', true, 'gameMode', r.game_mode)
    from public.rooms r
    where r.id = p_room_id and (
      r.host_user_id = p_user_id
      or exists (select 1 from public.room_players where room_id = r.id and user_id = p_user_id)
    )
  ), jsonb_build_object('ok', false, 'error', 'room_not_found'));
$$;

revoke execute on function public.create_room(text, text) from public, anon, authenticated;
grant execute on function public.create_room(text, text) to authenticated;
revoke execute on function public.internal_room_game_mode(uuid, uuid) from public, anon, authenticated;
grant execute on function public.internal_room_game_mode(uuid, uuid) to service_role;
