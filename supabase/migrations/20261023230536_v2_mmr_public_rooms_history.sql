-- V2: migration aditiva de dados e contratos. Não executa o reset de lançamento.
alter table public.player_ratings alter column points set default 500;
-- Saldos legados não são reescritos. A constraint vale para toda nova escrita;
-- validar o histórico da constraint depois da virada de dados aprovada.
alter table public.player_ratings add constraint player_ratings_mmr_floor check (points >= 500) not valid;
alter table public.match_ratings drop constraint match_ratings_points_delta_check;
alter table public.match_ratings
  add constraint match_ratings_points_delta_check check (points_delta between -55 and 55),
  add column points_before integer,
  add column nominal_delta integer,
  add column rating_rule text,
  add column winner_average numeric,
  add column loser_average numeric,
  add constraint match_ratings_v2_audit check (rating_rule is null or (rating_rule = 'decky-v2-step5' and points_before is not null and nominal_delta is not null and winner_average is not null and loser_average is not null and points_after >= 500 and points_after - points_before = points_delta and abs(nominal_delta) between 5 and 55));

create function public.initialize_profile_ratings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.player_ratings(user_id, game_mode, points)
  values (new.id, '1v1', 500), (new.id, '2v2', 500)
  on conflict (user_id, game_mode) do nothing;
  return new;
end;
$$;
create trigger profile_initial_ratings after insert on public.profiles
  for each row execute function public.initialize_profile_ratings();
insert into public.player_ratings(user_id, game_mode, points)
select p.id, mode, 500 from public.profiles p cross join (values ('1v1'), ('2v2')) as modes(mode)
on conflict (user_id, game_mode) do nothing;

create function public.mmr_win_delta(p_winner numeric, p_loser numeric)
returns integer language sql immutable strict set search_path = '' as $$
  select greatest(5, 10 + sign(p_loser - p_winner)::integer * 5 * least(9, ceil(greatest(0, abs(p_loser - p_winner) - 100) / 100))::integer);
$$;

create or replace function public.apply_match_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_winner_average numeric;
  v_loser_average numeric;
  v_win_delta integer;
  v_delta integer;
  v_after integer;
  v_before integer;
  v_player record;
begin
  if not new.ranked or old.status <> 'playing' or new.status <> 'finished' then
    return new;
  end if;

  -- A mesma ordem de locks evita ciclos quando salas diferentes compartilham jogadores.
  insert into public.player_ratings(user_id, game_mode)
  select p.user_id, new.game_mode
  from public.match_players p where p.match_id = new.id
  order by p.user_id
  on conflict (user_id, game_mode) do nothing;

  perform r.user_id
  from public.player_ratings r
  join public.match_players p on p.user_id = r.user_id and p.match_id = new.id
  where r.game_mode = new.game_mode
  order by r.user_id
  for update of r;

  select avg(r.points) filter (where p.team = new.winner_team),
         avg(r.points) filter (where p.team <> new.winner_team)
  into v_winner_average, v_loser_average
  from public.match_players p
  join public.player_ratings r on r.user_id = p.user_id and r.game_mode = new.game_mode
  where p.match_id = new.id;

  if v_winner_average is null or v_loser_average is null then
    raise exception 'invalid_ranked_result';
  end if;

  v_win_delta := public.mmr_win_delta(v_winner_average, v_loser_average);
  for v_player in
    select p.user_id, p.team, r.points from public.match_players p join public.player_ratings r on r.user_id = p.user_id and r.game_mode = new.game_mode where p.match_id = new.id order by p.user_id
  loop
    v_delta := case when v_player.team = new.winner_team then v_win_delta else -v_win_delta end;
    v_before := v_player.points;
    update public.player_ratings
    set points = greatest(500, points + v_delta),
        wins = wins + case when v_player.team = new.winner_team then 1 else 0 end,
        losses = losses + case when v_player.team <> new.winner_team then 1 else 0 end
    where user_id = v_player.user_id and game_mode = new.game_mode
    returning points into v_after;

    insert into public.match_ratings(match_id, user_id, points_before, points_delta, points_after, nominal_delta, rating_rule, winner_average, loser_average)
    values (new.id, v_player.user_id, v_before, v_after - v_before, v_after, v_delta, 'decky-v2-step5', v_winner_average, v_loser_average);
  end loop;
  return new;
end;
$$;


alter table public.rooms add column visibility text not null default 'private' check (visibility in ('private', 'public'));
drop function public.create_room(text, text);
create or replace function public.create_room(p_host_mode text default 'player', p_game_mode text default '2v2', p_visibility text default 'private')
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
  if p_visibility is null or p_visibility not in ('private', 'public') then raise exception 'invalid_visibility'; end if;
  perform public.ensure_profile(v_user);

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where code = v_code);
  end loop;

  insert into public.rooms (code, host_user_id, host_mode, game_mode, visibility) values (v_code, v_user, p_host_mode, p_game_mode, p_visibility) returning * into v_room;
  -- No modo mesa o dono não ocupa lugar: os lugares ficam para os jogadores.
  if p_host_mode = 'player' then
    insert into public.room_players (room_id, user_id, seat) values (v_room.id, v_user, 1);
  end if;
  return v_room;
end;
$$;


-- Projeção de descoberta: nenhuma mão, participante ou sala privada chega neste canal.
create table public.public_room_directory (
  id uuid primary key references public.rooms(id) on delete cascade,
  code text not null,
  host_name text not null,
  game_mode text not null check (game_mode in ('1v1', '2v2')),
  player_count integer not null check (player_count >= 0),
  capacity integer not null check (capacity in (2, 4)),
  created_at timestamptz not null
);
create index public_room_directory_order_idx on public.public_room_directory(created_at desc, id desc);
alter table public.public_room_directory enable row level security;
create policy "descoberta publica autenticada" on public.public_room_directory for select to authenticated using ((select auth.uid()) is not null);
revoke all on public.public_room_directory from public, anon, authenticated;
grant select on public.public_room_directory to authenticated;
alter publication supabase_realtime add table public.public_room_directory;

create function private.sync_public_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.public_room_directory(id, code, host_name, game_mode, player_count, capacity, created_at)
  select r.id, r.code, p.display_name, r.game_mode,
         (select count(*) from public.room_players places where places.room_id = r.id),
         case when r.game_mode = '1v1' then 2 else 4 end, r.created_at
  from public.rooms r join public.profiles p on p.id = r.host_user_id
  where r.id = p_room_id and r.visibility = 'public' and r.status = 'lobby'
  on conflict (id) do update set code = excluded.code, host_name = excluded.host_name,
    game_mode = excluded.game_mode, player_count = excluded.player_count, capacity = excluded.capacity;
  if not exists (select 1 from public.rooms where id = p_room_id and visibility = 'public' and status = 'lobby') then
    delete from public.public_room_directory where id = p_room_id;
  end if;
end;
$$;

create function private.refresh_public_room_directory()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_room record;
begin
  if tg_table_name = 'profiles' then
    for v_room in select id from public.rooms where host_user_id = new.id and visibility = 'public' and status = 'lobby'
    loop perform private.sync_public_room(v_room.id); end loop;
  else
    if tg_table_name = 'rooms' then
      v_id := case when tg_op = 'DELETE' then old.id else new.id end;
    else
      v_id := case when tg_op = 'DELETE' then old.room_id else new.room_id end;
    end if;
    perform private.sync_public_room(v_id);
  end if;
  return null;
end;
$$;
create trigger room_directory_changed after insert or update or delete on public.rooms for each row execute function private.refresh_public_room_directory();
create trigger room_directory_players_changed after insert or update or delete on public.room_players for each row execute function private.refresh_public_room_directory();
create trigger room_directory_host_changed after update of display_name on public.profiles for each row execute function private.refresh_public_room_directory();

create function public.get_public_rooms()
returns setof public.public_room_directory language sql stable security invoker set search_path = '' as $$
  select * from public.public_room_directory order by created_at desc, id desc;
$$;

create function public.set_my_display_name(p_display_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_name text := trim(p_display_name); v_user uuid := auth.uid();
begin
  if v_user is null or not exists (select 1 from auth.users where id = v_user) then raise exception 'not_authenticated'; end if;
  if v_name is null or char_length(v_name) not between 2 and 20 or v_name ~ '[[:cntrl:]<>]' then raise exception 'invalid_display_name'; end if;
  update public.profiles set display_name = v_name where id = v_user;
  update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('display_name', v_name) where id = v_user;
end;
$$;

drop function public.get_my_match_history(integer, integer);
create function public.get_my_match_history(p_limit integer default 50, p_offset integer default 0)
returns table (
  id uuid,
  status text,
  score_a smallint,
  score_b smallint,
  winner_team text,
  my_team text,
  started_at timestamptz,
  ended_at timestamptz,
  game_mode text,
  ranked boolean,
  points_before integer,
  points_delta integer,
  points_after integer,
  rating_rule text,
  players jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_limit'; end if;
  if p_offset is null or p_offset < 0 then raise exception 'invalid_offset'; end if;
  return query
  select m.id, m.status, m.score_a, m.score_b, m.winner_team, mine.team,
         m.started_at, m.ended_at, m.game_mode, m.ranked, rating.points_before, rating.points_delta, rating.points_after, rating.rating_rule,
         (select jsonb_agg(jsonb_build_object('seat', p.seat, 'team', p.team, 'user_id', p.user_id, 'display_name', profile.display_name) order by p.seat)
          from public.match_players p
          join public.profiles profile on profile.id = p.user_id
          where p.match_id = m.id)
  from public.match_players mine
  join public.matches m on m.id = mine.match_id
  left join public.match_ratings rating on rating.match_id = m.id and rating.user_id = mine.user_id
  where mine.user_id = auth.uid()
  order by m.started_at desc, m.id desc
  limit p_limit offset p_offset;
end;
$$;


create index match_notes_page_idx on public.match_notes(author_user_id, created_at desc, id desc);
create function public.get_my_notes_page(p_limit integer default 6, p_offset integer default 0)
returns table(id uuid, match_id uuid, title text, notes text, created_at timestamptz, updated_at timestamptz, match jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_limit'; end if;
  if p_offset is null or p_offset < 0 then raise exception 'invalid_offset'; end if;
  return query
  select n.id, n.match_id, n.title, n.notes, n.created_at, n.updated_at,
    jsonb_build_object('id', m.id, 'status', m.status, 'score_a', m.score_a, 'score_b', m.score_b,
      'winner_team', m.winner_team, 'my_team', mine.team, 'started_at', m.started_at, 'ended_at', m.ended_at,
      'game_mode', m.game_mode, 'ranked', m.ranked, 'points_before', rating.points_before,
      'points_delta', rating.points_delta, 'points_after', rating.points_after, 'rating_rule', rating.rating_rule,
      'players', (select jsonb_agg(jsonb_build_object('seat', p.seat, 'team', p.team, 'user_id', p.user_id, 'display_name', profile.display_name) order by p.seat)
        from public.match_players p join public.profiles profile on profile.id = p.user_id where p.match_id = m.id))
  from public.match_notes n
  join public.matches m on m.id = n.match_id
  join public.match_players mine on mine.match_id = m.id and mine.user_id = auth.uid()
  left join public.match_ratings rating on rating.match_id = m.id and rating.user_id = mine.user_id
  where n.author_user_id = auth.uid()
  order by n.created_at desc, n.id desc limit p_limit offset p_offset;
end;
$$;

revoke execute on function public.initialize_profile_ratings(), public.mmr_win_delta(numeric,numeric),
  private.sync_public_room(uuid), private.refresh_public_room_directory(), public.create_room(text,text,text),
  public.get_public_rooms(), public.set_my_display_name(text), public.get_my_match_history(integer,integer), public.get_my_notes_page(integer,integer)
from public, anon, authenticated;
grant execute on function public.create_room(text,text,text), public.get_public_rooms(), public.set_my_display_name(text),
  public.get_my_match_history(integer,integer), public.get_my_notes_page(integer,integer) to authenticated;

-- Guarda da virada. Desligada por padrão; só a operação administrativa pode alterá-la.
create table private.app_settings (
  singleton boolean primary key default true check (singleton),
  maintenance boolean not null default false
);
insert into private.app_settings(singleton, maintenance) values (true, false);
alter table private.app_settings enable row level security;
revoke all on private.app_settings from public, anon, authenticated;

create function private.assert_decky_available(p_user_id uuid default auth.uid())
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then raise exception 'not_authenticated'; end if;
  if (select maintenance from private.app_settings where singleton) then raise exception 'maintenance'; end if;
  return true;
end;
$$;
create function public.set_decky_maintenance(p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_enabled is null then raise exception 'invalid_maintenance'; end if;
  update private.app_settings set maintenance = p_enabled where singleton;
end;
$$;
create function public.decky_access_allowed()
returns boolean language sql stable security definer set search_path = '' as $$
  select not (select maintenance from private.app_settings where singleton)
    and exists (select 1 from auth.users where id = auth.uid());
$$;
revoke execute on function private.assert_decky_available(uuid), public.set_decky_maintenance(boolean), public.decky_access_allowed() from public, anon, authenticated;
grant execute on function public.set_decky_maintenance(boolean) to service_role;
grant execute on function public.decky_access_allowed() to authenticated;

-- Políticas restritivas também fecham leituras/escritas diretas de clientes anteriores.
do $$
declare v_table text;
begin
  foreach v_table in array array['profiles','rooms','room_players','matches','match_players','match_events','match_notes','player_ratings','match_ratings','public_room_directory']
  loop
    execute format('create policy "decky active access" on public.%I as restrictive for all to authenticated using (public.decky_access_allowed()) with check (public.decky_access_allowed())', v_table);
  end loop;
end;
$$;

-- Reutiliza os corpos das RPCs aplicadas, preservando contratos e permissões.
-- A guarda deve rodar antes de qualquer consulta de uma função que ignora RLS.
do $$
declare v_function record; v_definition text; v_identity text;
begin
  for v_function in
    select p.oid, p.proname from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    join pg_catalog.pg_language l on l.oid = p.prolang
    where n.nspname = 'public' and l.lanname = 'plpgsql'
      and p.proname in ('create_room','join_room','set_host_mode','change_seat','set_ready','leave_room','set_my_auto_card',
        'internal_start_match','internal_get_match','internal_commit_action','get_rankings','get_my_match_history','get_my_notes_page','set_my_display_name','initialize_profile_ratings')
  loop
    v_identity := case when v_function.proname like 'internal_%' then 'p_user_id'
      when v_function.proname = 'initialize_profile_ratings' then 'new.id' else 'auth.uid()' end;
    v_definition := pg_catalog.pg_get_functiondef(v_function.oid);
    v_definition := regexp_replace(v_definition, '\mbegin\M', 'begin' || chr(10) || '  perform private.assert_decky_available(' || v_identity || ');', 'i');
    execute v_definition;
  end loop;
end;
$$;

create or replace function public.ensure_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_decky_available(p_user_id);
  insert into public.profiles (id, display_name)
  select u.id, left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), split_part(u.email, '@', 1)), 40)
  from auth.users u
  where u.id = p_user_id
  on conflict (id) do nothing;
end;
$$;

create or replace function public.get_my_hand(p_match_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_decky_available(auth.uid());
  return (select jsonb_build_object(
    'revision', m.revision,
    'seat', h.seat,
    'cards', h.cards,
    'covered', h.covered,
    'autoCard', h.auto_card
  )
  from private.private_hands h
  join public.matches m on m.id = h.match_id
  where h.match_id = p_match_id and h.user_id = auth.uid());
end;
$$;

create or replace function public.internal_room_game_mode(p_room_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_decky_available(p_user_id);
  return (select coalesce((
    select jsonb_build_object('ok', true, 'gameMode', r.game_mode)
    from public.rooms r
    where r.id = p_room_id and (
      r.host_user_id = p_user_id
      or exists (select 1 from public.room_players where room_id = r.id and user_id = p_user_id)
    )
  ), jsonb_build_object('ok', false, 'error', 'room_not_found')));
end;
$$;

create or replace function public.get_public_rooms()
returns setof public.public_room_directory language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.decky_access_allowed() then raise exception 'maintenance_or_inactive_account'; end if;
  return query select * from public.public_room_directory order by created_at desc, id desc;
end;
$$;

revoke execute on function public.ensure_profile(uuid), public.get_my_hand(uuid), public.internal_room_game_mode(uuid,uuid) from public, anon, authenticated;
grant execute on function public.get_my_hand(uuid) to authenticated;
grant execute on function public.internal_room_game_mode(uuid,uuid) to service_role;
