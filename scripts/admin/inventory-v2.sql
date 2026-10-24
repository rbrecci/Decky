-- Somente leitura. Executar como administrador no ambiente alvo antes do reset manual.
select current_database() as database, current_user as operator;
select schemaname, tablename from pg_tables
where schemaname in ('public', 'private', 'auth', 'storage')
order by schemaname, tablename;
select conrelid::regclass as source_table, confrelid::regclass as target_table,
       conname, pg_get_constraintdef(oid) as definition
from pg_constraint where contype = 'f'
  and (connamespace in ('public'::regnamespace, 'private'::regnamespace)
    or confrelid = 'auth.users'::regclass)
order by 1, 3;
select event_object_schema, event_object_table, trigger_name, action_statement
from information_schema.triggers
where event_object_schema in ('public', 'private', 'auth')
order by 1, 2, 3;
select 'auth.users' as resource, count(*) from auth.users
union all select 'auth.identities', count(*) from auth.identities
union all select 'auth.sessions', count(*) from auth.sessions
union all select 'auth.refresh_tokens', count(*) from auth.refresh_tokens
union all select 'private.private_hands', count(*) from private.private_hands;
select bucket_id, count(*) as objects from storage.objects group by bucket_id;
select id, public from storage.buckets order by id;
select maintenance from private.app_settings where singleton;
