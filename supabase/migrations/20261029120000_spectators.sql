-- Descoberta também informa partidas públicas em andamento, sem projetar mãos.
alter table public.public_room_directory
  add column status text not null default 'lobby' check (status in ('lobby','playing')),
  add column match_id uuid references public.matches(id) on delete set null;

create or replace function private.sync_public_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.public_room_directory(id, code, host_name, game_mode, player_count, capacity, created_at, status, match_id)
  select r.id, r.code, p.display_name, r.game_mode,
    (select count(*) from public.room_players places where places.room_id = r.id),
    case when r.game_mode = '1v1' then 2 else 4 end, r.created_at, r.status, active.id
  from public.rooms r join public.profiles p on p.id = r.host_user_id
  left join public.matches active on active.room_id = r.id and active.status = 'playing'
  where r.id = p_room_id and r.visibility = 'public' and (r.status = 'lobby' or (r.status = 'playing' and active.id is not null))
  on conflict (id) do update set code = excluded.code, host_name = excluded.host_name, game_mode = excluded.game_mode,
    player_count = excluded.player_count, capacity = excluded.capacity, status = excluded.status, match_id = excluded.match_id;
  if not exists (
    select 1 from public.rooms r where r.id = p_room_id and r.visibility = 'public' and
      (r.status = 'lobby' or (r.status = 'playing' and exists (select 1 from public.matches where room_id = r.id and status = 'playing')))
  ) then delete from public.public_room_directory where id = p_room_id; end if;
end;
$$;
create function private.refresh_match_directory()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.sync_public_room(case when tg_op = 'DELETE' then old.room_id else new.room_id end);
  return null;
end;
$$;
create trigger match_directory_changed after insert or update of status, room_id or delete on public.matches for each row execute function private.refresh_match_directory();

create table public.match_spectators (
  match_id uuid not null references public.matches(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (match_id, user_id)
);
alter table public.match_spectators enable row level security;
create policy "espectador le propria inscricao" on public.match_spectators for select to authenticated
  using (user_id = auth.uid() and public.decky_access_allowed());
revoke all on public.match_spectators from public, anon, authenticated;
grant select on public.match_spectators to authenticated;

create or replace function public.is_match_viewer(p_match_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_match_member(p_match_id)
    or exists (select 1 from public.matches where id = p_match_id and table_user_id = auth.uid())
    or exists (select 1 from public.match_spectators spectator join public.rooms r on r.id = spectator.room_id
      where spectator.match_id = p_match_id and spectator.user_id = auth.uid() and r.visibility = 'public');
$$;
create function public.is_room_spectator(p_room_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.match_spectators s join public.rooms r on r.id = s.room_id
    where s.room_id = p_room_id and s.user_id = auth.uid() and r.visibility = 'public');
$$;
create policy "espectador le metadados da sala" on public.rooms for select to authenticated using (public.is_room_spectator(id));

create function public.join_spectator(p_room_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_room public.rooms; v_match uuid;
begin
  perform private.assert_decky_available(auth.uid());
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or v_room.visibility <> 'public' or v_room.status <> 'playing' then raise exception 'spectator_unavailable'; end if;
  select id into v_match from public.matches where room_id = p_room_id and status = 'playing';
  if not found then raise exception 'spectator_unavailable'; end if;
  insert into public.match_spectators(match_id, room_id, user_id) values (v_match, p_room_id, auth.uid()) on conflict do nothing;
  return v_match;
end;
$$;
create function public.leave_spectator(p_match_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_decky_available(auth.uid());
  delete from public.match_spectators where match_id = p_match_id and user_id = auth.uid();
end;
$$;
revoke execute on function private.refresh_match_directory(), public.is_room_spectator(uuid), public.join_spectator(uuid), public.leave_spectator(uuid) from public, anon, authenticated;
grant execute on function public.is_room_spectator(uuid), public.join_spectator(uuid), public.leave_spectator(uuid) to authenticated;
-- Reconstrói projeções de salas existentes, inclusive as partidas já em andamento.
do $$
declare v_room uuid;
begin
  for v_room in select id from public.rooms loop perform private.sync_public_room(v_room); end loop;
end;
$$;
