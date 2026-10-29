-- A unicidade segue imediata fora da RPC de troca.
alter table public.room_players drop constraint room_players_room_id_seat_key;
alter table public.room_players add constraint room_players_room_id_seat_key unique (room_id, seat) deferrable initially immediate;

create table public.seat_swap_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  from_seat smallint not null,
  to_seat smallint not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','expired','cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 seconds',
  check (from_user_id <> to_user_id and from_seat <> to_seat)
);
create index seat_swaps_pending_idx on public.seat_swap_requests(room_id, expires_at) where status = 'pending';
alter table public.seat_swap_requests enable row level security;
create policy "trocas visiveis aos envolvidos" on public.seat_swap_requests for select to authenticated
  using (public.decky_access_allowed() and public.is_room_member(room_id) and auth.uid() in (from_user_id, to_user_id));
revoke all on public.seat_swap_requests from public, anon, authenticated;
grant select on public.seat_swap_requests to authenticated;
alter publication supabase_realtime add table public.seat_swap_requests;

create function private.cancel_seat_swaps()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'rooms' then
    if new.status <> 'lobby' or new.host_mode <> old.host_mode then
      update public.seat_swap_requests set status = 'cancelled' where room_id = new.id and status = 'pending';
    end if;
  else
    update public.seat_swap_requests set status = 'cancelled'
      where room_id = old.room_id and status = 'pending' and old.user_id in (from_user_id, to_user_id);
  end if;
  return null;
end;
$$;
create trigger cancel_swaps_room after update of status, host_mode on public.rooms for each row execute function private.cancel_seat_swaps();
create trigger cancel_swaps_player_removed after delete on public.room_players for each row execute function private.cancel_seat_swaps();
create trigger cancel_swaps_player_moved after update of seat on public.room_players for each row when (old.seat is distinct from new.seat) execute function private.cancel_seat_swaps();

create function public.request_seat_swap(p_room_id uuid, p_target_user_id uuid)
returns public.seat_swap_requests language plpgsql security definer set search_path = '' as $$
declare v_room public.rooms; v_from smallint; v_to smallint; v_swap public.seat_swap_requests;
begin
  perform private.assert_decky_available(auth.uid());
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or not public.is_room_member(p_room_id) then raise exception 'invalid_swap'; end if;
  if v_room.status <> 'lobby' then raise exception 'room_started'; end if;
  select seat into v_from from public.room_players where room_id = p_room_id and user_id = auth.uid();
  select seat into v_to from public.room_players where room_id = p_room_id and user_id = p_target_user_id;
  if v_to is null or p_target_user_id = auth.uid() then raise exception 'invalid_swap'; end if;
  if exists (select 1 from private.room_presence where room_id = p_room_id and user_id in (auth.uid(), p_target_user_id) and last_seen_at <= now() - interval '120 seconds') then raise exception 'player_disconnected'; end if;
  update public.seat_swap_requests set status = 'expired' where room_id = p_room_id and status = 'pending' and expires_at <= now();
  if exists (select 1 from public.seat_swap_requests where room_id = p_room_id and status = 'pending'
    and (from_user_id in (auth.uid(), p_target_user_id) or to_user_id in (auth.uid(), p_target_user_id))) then raise exception 'swap_conflict'; end if;
  insert into public.seat_swap_requests(room_id, from_user_id, to_user_id, from_seat, to_seat)
    values (p_room_id, auth.uid(), p_target_user_id, v_from, v_to) returning * into v_swap;
  return v_swap;
end;
$$;

create function public.respond_seat_swap(p_request_id uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare v_swap public.seat_swap_requests; v_room public.rooms;
begin
  perform private.assert_decky_available(auth.uid());
  select * into v_swap from public.seat_swap_requests where id = p_request_id;
  if not found then raise exception 'swap_unavailable'; end if;
  if v_swap.to_user_id <> auth.uid() then raise exception 'not_swap_recipient'; end if;
  select * into v_room from public.rooms where id = v_swap.room_id for update;
  select * into v_swap from public.seat_swap_requests where id = p_request_id for update;
  if v_swap.status <> 'pending' or v_room.status <> 'lobby' or p_accept is null then raise exception 'swap_unavailable'; end if;
  if v_swap.expires_at <= now() then
    update public.seat_swap_requests set status = 'expired' where id = p_request_id;
    return 'expired';
  end if;
  if (select count(*) from public.room_players where room_id = v_swap.room_id
    and ((user_id = v_swap.from_user_id and seat = v_swap.from_seat) or (user_id = v_swap.to_user_id and seat = v_swap.to_seat))) <> 2
    or (select count(*) from private.room_presence where room_id = v_swap.room_id and user_id in (v_swap.from_user_id, v_swap.to_user_id) and last_seen_at > now() - interval '120 seconds') <> 2 then
    update public.seat_swap_requests set status = 'cancelled' where id = p_request_id;
    return 'cancelled';
  end if;
  update public.seat_swap_requests set status = case when p_accept then 'accepted' else 'rejected' end where id = p_request_id;
  if p_accept then
    set constraints public.room_players_room_id_seat_key deferred;
    update public.room_players set seat = case when user_id = v_swap.from_user_id then v_swap.to_seat else v_swap.from_seat end, ready = false
      where room_id = v_swap.room_id and user_id in (v_swap.from_user_id, v_swap.to_user_id);
    set constraints public.room_players_room_id_seat_key immediate;
  end if;
  return case when p_accept then 'accepted' else 'rejected' end;
end;
$$;

create function public.get_seat_swaps(p_room_id uuid)
returns setof public.seat_swap_requests language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_decky_available(auth.uid());
  if not public.is_room_member(p_room_id) then return; end if;
  -- O lock comum impede inverter a ordem com a aceitação e com início/saída.
  perform 1 from public.rooms where id = p_room_id for update;
  update public.seat_swap_requests set status = 'expired' where room_id = p_room_id and status = 'pending' and expires_at <= now();
  return query select * from public.seat_swap_requests where room_id = p_room_id and auth.uid() in (from_user_id, to_user_id) order by created_at desc, id desc limit 20;
end;
$$;
revoke execute on function private.cancel_seat_swaps(), public.request_seat_swap(uuid,uuid), public.respond_seat_swap(uuid,boolean), public.get_seat_swaps(uuid) from public, anon, authenticated;
grant execute on function public.request_seat_swap(uuid,uuid), public.respond_seat_swap(uuid,boolean), public.get_seat_swaps(uuid) to authenticated;
