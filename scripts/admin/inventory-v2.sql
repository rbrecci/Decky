-- Somente leitura. Executar como administrador no ambiente alvo antes do reset manual.
begin transaction isolation level repeatable read read only;
select statement_timestamp() as captured_at, current_database() as database,
       current_user as operator, current_setting('server_version') as postgres_version;
select schemaname, tablename from pg_tables
where schemaname in ('public', 'private', 'auth', 'storage', 'supabase_migrations')
order by schemaname, tablename;
select nspname as schema, nspowner::regrole as owner, nspacl::text as grants
from pg_namespace where nspname in ('public', 'private', 'auth', 'storage', 'supabase_migrations')
order by nspname;
select n.nspname as schema, c.relname as object, c.relkind as kind,
       c.relowner::regrole as owner, c.relacl::text as grants
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'private', 'auth', 'storage', 'supabase_migrations')
  and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f') order by 1, 2;
select n.nspname as schema, p.proname as function,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.proowner::regrole as owner, p.prosecdef as security_definer, p.proacl::text as grants
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private', 'auth', 'storage', 'supabase_migrations')
order by 1, 2, 3;
select rolname, rolcanlogin, rolsuper, rolbypassrls
from pg_roles where rolname !~ '^pg_' order by rolname;
select e.extname, e.extversion, n.nspname as schema
from pg_extension e join pg_namespace n on n.oid = e.extnamespace order by e.extname;
select pubname, puballtables, pubinsert, pubupdate, pubdelete, pubtruncate
from pg_publication order by pubname;
select pubname, schemaname, tablename from pg_publication_tables order by 1, 2, 3;
select conrelid::regclass as source_table, confrelid::regclass as target_table,
       conname, pg_get_constraintdef(oid) as definition
from pg_constraint where contype = 'f'
  and (connamespace in ('public'::regnamespace, 'private'::regnamespace,
                        'auth'::regnamespace, 'storage'::regnamespace, 'supabase_migrations'::regnamespace)
    or confrelid = 'auth.users'::regclass)
order by 1, 3;
select event_object_schema, event_object_table, trigger_name, action_statement
from information_schema.triggers
where event_object_schema in ('public', 'private', 'auth', 'storage', 'supabase_migrations')
order by 1, 2, 3;
select 'auth.users' as resource, count(*) from auth.users
union all select 'auth.identities', count(*) from auth.identities
union all select 'auth.sessions', count(*) from auth.sessions
union all select 'auth.refresh_tokens', count(*) from auth.refresh_tokens
union all select 'private.private_hands', count(*) from private.private_hands;
select 'public.profiles' as resource, count(*) from public.profiles
union all select 'public.rooms', count(*) from public.rooms
union all select 'public.room_players', count(*) from public.room_players
union all select 'public.matches', count(*) from public.matches
union all select 'public.match_players', count(*) from public.match_players
union all select 'public.match_events', count(*) from public.match_events
union all select 'public.match_notes', count(*) from public.match_notes
union all select 'public.player_ratings', count(*) from public.player_ratings
union all select 'public.match_ratings', count(*) from public.match_ratings
union all select 'public.public_room_directory', count(*) from public.public_room_directory;
select bucket_id, count(*) as objects from storage.objects group by bucket_id;
select id, public from storage.buckets order by id;
select maintenance from private.app_settings where singleton;
commit;
