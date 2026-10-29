-- Ordem comum às operações da sala: sala -> partida -> projeções públicas.
-- A consulta inicial de room_id é MVCC; ela não bloqueia a partida antes da sala.
do $$
declare v_definition text;
        v_match_lock text := '  select * into v_match from public.matches where id = p_match_id for update;';
begin
  select pg_get_functiondef('public.internal_commit_action(uuid,uuid,integer,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,text)'::regprocedure) into v_definition;
  if position(v_match_lock in v_definition) = 0 then raise exception 'commit_lock_patch_failed'; end if;
  v_definition := replace(v_definition, v_match_lock, $patch$
  perform 1 from public.rooms
  where id = (select room_id from public.matches where id = p_match_id)
  for update;
  select * into v_match from public.matches where id = p_match_id for update;$patch$);
  execute v_definition;
end;
$$;
