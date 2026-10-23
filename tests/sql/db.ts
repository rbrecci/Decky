// Banco de teste: Postgres em memória (PGlite) com o mínimo do Supabase simulado
// (schema auth, auth.uid(), papéis e publicação do Realtime) e as migrations reais aplicadas.
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'supabase', 'migrations');

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text not null,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth, public to anon, authenticated, service_role;
  create publication supabase_realtime;
`;

export interface TestDb {
  db: PGlite;
  /** Cria um usuário em auth.users (o trigger cria o perfil) e devolve o id. */
  createUser(name: string): Promise<string>;
  /** Executa como o papel authenticated, com auth.uid() = userId. */
  asUser<T = Record<string, unknown>>(userId: string, sql: string, params?: unknown[]): Promise<T[]>;
  /** Executa como service_role (o que a Edge Function faz). */
  asService<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export async function createTestDb(beforeMigration?: string): Promise<TestDb> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql') && (!beforeMigration || f < beforeMigration)).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
  }

  let counter = 0;

  async function runAs<T>(role: string, userId: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
    await db.exec(`set role ${role}`);
    try {
      const result = await db.query<T>(sql, params);
      return result.rows;
    } finally {
      await db.exec('reset role');
    }
  }

  return {
    db,
    async createUser(name) {
      counter += 1;
      const id = `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
      await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
        id,
        `${name.toLowerCase()}@teste.dev`,
        { display_name: name },
      ]);
      return id;
    },
    asUser: (userId, sql, params) => runAs('authenticated', userId, sql, params),
    asService: (sql, params) => runAs('service_role', null, sql, params),
  };
}
