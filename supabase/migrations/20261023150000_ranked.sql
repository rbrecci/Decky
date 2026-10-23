-- O snapshot distingue partidas antigas das novas, que sempre valem Elo.
alter table public.matches
  add column ranked boolean not null default false,
  add column game_mode text not null default '2v2' check (game_mode in ('1v1', '2v2'));

update public.matches
set game_mode = coalesce(public_state ->> 'gameMode', '2v2');

-- Fechar uma sala nao pode apagar resultados nem notas das partidas anteriores.
alter table public.matches
  drop constraint matches_room_id_fkey,
  alter column room_id drop not null,
  add constraint matches_room_id_fkey foreign key (room_id) references public.rooms(id) on delete set null;

create table public.player_ratings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_mode text not null check (game_mode in ('1v1', '2v2')),
  points integer not null default 1000,
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  primary key (user_id, game_mode)
);

create table public.match_ratings (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  points_delta integer not null check (points_delta between -32 and 32),
  points_after integer not null,
  primary key (match_id, user_id)
);

alter table public.player_ratings enable row level security;
alter table public.match_ratings enable row level security;

create policy "jogador le o proprio Elo" on public.player_ratings
  for select to authenticated using (user_id = auth.uid());
create policy "jogador le a propria variacao" on public.match_ratings
  for select to authenticated using (user_id = auth.uid());

revoke all on public.player_ratings, public.match_ratings from public, anon, authenticated;
grant select on public.player_ratings, public.match_ratings to authenticated;

create function public.snapshot_match_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select r.game_mode into new.game_mode from public.rooms r where r.id = new.room_id;
    if not found then
      raise exception 'room_not_found';
    end if;
    new.ranked := true;
  elsif new.ranked is distinct from old.ranked or new.game_mode is distinct from old.game_mode then
    raise exception 'immutable_match_mode';
  end if;
  return new;
end;
$$;

create trigger ranked_match_snapshot
  before insert or update on public.matches
  for each row execute function public.snapshot_match_rating();

create function public.apply_match_rating()
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

  -- Calcula uma vez antes de alterar saldos, usando a media de cada equipe.
  v_win_delta := round(32 * (1 - 1 / (1 + power(10::numeric, (v_loser_average - v_winner_average) / 400))))::integer;
  for v_player in
    select p.user_id, p.team from public.match_players p where p.match_id = new.id order by p.user_id
  loop
    v_delta := case when v_player.team = new.winner_team then v_win_delta else -v_win_delta end;
    update public.player_ratings
    set points = points + v_delta,
        wins = wins + case when v_player.team = new.winner_team then 1 else 0 end,
        losses = losses + case when v_player.team <> new.winner_team then 1 else 0 end
    where user_id = v_player.user_id and game_mode = new.game_mode
    returning points into v_after;

    insert into public.match_ratings(match_id, user_id, points_delta, points_after)
    values (new.id, v_player.user_id, v_delta, v_after);
  end loop;
  return new;
end;
$$;

create trigger ranked_match_finished
  after update of status on public.matches
  for each row execute function public.apply_match_rating();

create function public.get_rankings(p_game_mode text default '1v1', p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_game_mode is null or p_game_mode not in ('1v1', '2v2') then raise exception 'invalid_game_mode'; end if;
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_limit'; end if;

  with standings as (
    select rank() over (order by r.points desc, r.wins desc, r.losses asc) as position,
           r.user_id, p.display_name, r.points, r.wins + r.losses as played, r.wins, r.losses
    from public.player_ratings r
    join public.profiles p on p.id = r.user_id
    where r.game_mode = p_game_mode and r.wins + r.losses > 0
  ), leaders as (
    select * from standings order by position, user_id limit p_limit
  )
  select jsonb_build_object(
    'entries', coalesce((select jsonb_agg(to_jsonb(l) order by l.position, l.user_id) from leaders l), '[]'::jsonb),
    'myEntry', (select to_jsonb(s) from standings s where s.user_id = auth.uid())
  ) into v_result;
  return v_result;
end;
$$;

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
  points_delta integer,
  points_after integer,
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
         m.started_at, m.ended_at, m.game_mode, m.ranked, rating.points_delta, rating.points_after,
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

revoke execute on function
  public.snapshot_match_rating(), public.apply_match_rating(),
  public.get_rankings(text, integer), public.get_my_match_history(integer, integer)
from public, anon, authenticated;
grant execute on function public.get_rankings(text, integer), public.get_my_match_history(integer, integer) to authenticated;
