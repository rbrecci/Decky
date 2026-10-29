-- Presença com prazo no relógio do banco. Ausência não produz resultado nem MMR.
create table private.room_presence (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
alter table private.room_presence enable row level security;
revoke all on private.room_presence from public, anon, authenticated;
insert into private.room_presence(room_id, user_id)
select id, host_user_id from public.rooms
union select room_id, user_id from public.room_players;

create function private.track_room_presence()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'rooms' then
    insert into private.room_presence(room_id, user_id) values (new.id, new.host_user_id) on conflict do nothing;
    if tg_op = 'UPDATE' and old.host_user_id <> new.host_user_id then
      delete from private.room_presence where room_id = new.id and user_id = old.host_user_id
        and not exists (select 1 from public.room_players where room_id = new.id and user_id = old.host_user_id);
    end if;
  elsif tg_op = 'INSERT' then
    insert into private.room_presence(room_id, user_id) values (new.room_id, new.user_id) on conflict do nothing;
  else
    delete from private.room_presence where room_id = old.room_id and user_id = old.user_id
      and not exists (select 1 from public.rooms where id = old.room_id and host_user_id = old.user_id);
  end if;
  return null;
end;
$$;
create trigger room_presence_host after insert or update of host_user_id on public.rooms for each row execute function private.track_room_presence();
create trigger room_presence_players after insert or delete on public.room_players for each row execute function private.track_room_presence();

create function private.cleanup_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_room public.rooms; v_next uuid;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then return; end if;
  -- Preserva todos os assentos durante uma partida enquanto algum participante está ativo.
  if not exists (select 1 from private.room_presence where room_id = p_room_id and last_seen_at > now() - interval '120 seconds') then
    delete from public.rooms where id = p_room_id;
    return;
  end if;
  if v_room.status <> 'lobby' then return; end if;
  delete from public.room_players p where p.room_id = p_room_id and not exists (
    select 1 from private.room_presence presence where presence.room_id = p_room_id and presence.user_id = p.user_id and presence.last_seen_at > now() - interval '120 seconds'
  );
  if not exists (select 1 from private.room_presence where room_id = p_room_id and user_id = v_room.host_user_id and last_seen_at > now() - interval '120 seconds') then
    select user_id into v_next from public.room_players where room_id = p_room_id order by joined_at, user_id limit 1;
    if v_next is not null then
      update public.rooms set host_user_id = v_next, host_mode = 'player' where id = p_room_id;
    else
      delete from public.rooms where id = p_room_id;
    end if;
  end if;
end;
$$;

create function public.cleanup_abandoned_rooms()
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_maintenance boolean;
begin
  -- Serializa a varredura com a entrada/saída de manutenção.
  select maintenance into v_maintenance from private.app_settings where singleton for share;
  if v_maintenance then return; end if;
  -- Só disputa locks em salas candidatas; cleanup_room revalida o lease sob lock.
  for v_id in
    select r.id from public.rooms r
    where (r.status = 'lobby' and exists (
      select 1 from private.room_presence p where p.room_id = r.id and p.last_seen_at <= now() - interval '120 seconds'
    )) or not exists (
      select 1 from private.room_presence p where p.room_id = r.id and p.last_seen_at > now() - interval '120 seconds'
    )
    order by r.id for update of r skip locked
  loop perform private.cleanup_room(v_id); end loop;
end;
$$;

create function public.heartbeat_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_decky_available(auth.uid());
  perform 1 from public.rooms where id = p_room_id for update;
  if not found or not (public.is_room_member(p_room_id) or public.is_room_host(p_room_id)) then raise exception 'room_not_found'; end if;
  insert into private.room_presence(room_id, user_id, last_seen_at) values (p_room_id, auth.uid(), now())
    on conflict (room_id, user_id) do update set last_seen_at = excluded.last_seen_at;
end;
$$;

create or replace function public.get_public_rooms()
returns setof public.public_room_directory language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.assert_decky_available(auth.uid());
  perform public.cleanup_abandoned_rooms();
  return query select * from public.public_room_directory order by created_at desc, id desc;
end;
$$;
revoke execute on function private.track_room_presence(), private.cleanup_room(uuid), public.cleanup_abandoned_rooms(), public.heartbeat_room(uuid), public.get_public_rooms() from public, anon, authenticated;
grant execute on function public.heartbeat_room(uuid), public.get_public_rooms() to authenticated;
grant execute on function public.cleanup_abandoned_rooms() to service_role;

-- Supabase com pg_cron já habilitado: varredura mesmo sem clientes na descoberta.
-- Sem a extensão, get_public_rooms ainda remove salas abandonadas antes de responder.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $cron$select cron.schedule('decky-room-cleanup', '* * * * *', 'select public.cleanup_abandoned_rooms()')$cron$;
  end if;
end;
$$;

create index room_presence_expiry_idx on private.room_presence(last_seen_at, room_id);

create or replace function public.set_decky_maintenance(p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_previous boolean;
begin
  if p_enabled is null then raise exception 'invalid_maintenance'; end if;
  select maintenance into v_previous from private.app_settings where singleton for update;
  if v_previous and not p_enabled then
    -- A primeira consulta após a manutenção também respeita a janela de reconexão.
    update private.room_presence set last_seen_at = now();
  end if;
  update private.app_settings set maintenance = p_enabled where singleton;
end;
$$;