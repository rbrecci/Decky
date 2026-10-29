-- Ajusta o instante sob lock na RPC de início. Chamada repetida continua devolvendo a partida existente.
do $$
declare v_definition text;
begin
  select pg_get_functiondef('public.internal_start_match(uuid,uuid,jsonb,jsonb)'::regprocedure) into v_definition;
  v_definition := replace(v_definition,
    '  insert into public.matches (room_id, public_state, current_turn_seat, table_user_id)',
    $patch$
  if p_state ? 'startsAt' then
    declare v_start double precision := public.server_now() + 4000;
            v_shift double precision;
    begin
      v_shift := v_start - (p_state ->> 'startsAt')::double precision;
      p_state := jsonb_set(p_state, '{startsAt}', to_jsonb(v_start));
      p_state := jsonb_set(p_state, '{deadline,startsAt}', to_jsonb((p_state #>> '{deadline,startsAt}')::double precision + v_shift));
      p_state := jsonb_set(p_state, '{deadline,at}', to_jsonb((p_state #>> '{deadline,at}')::double precision + v_shift));
    end;
  end if;
  insert into public.matches (room_id, public_state, current_turn_seat, table_user_id)$patch$);
  execute v_definition;

  select pg_get_functiondef('public.set_my_auto_card(uuid,jsonb)'::regprocedure) into v_definition;
  v_definition := replace(v_definition, '  if v_match.status <> ''playing'' then', $patch$
  if (v_match.public_state ->> 'startsAt')::double precision > public.server_now() then
    return jsonb_build_object('ok', false, 'error', 'too_early');
  end if;
  if v_match.status <> 'playing' then$patch$);
  execute v_definition;
end;
$$;
