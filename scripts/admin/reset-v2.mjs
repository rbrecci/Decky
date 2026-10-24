import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

export function validateTarget({ url, project, confirm }) {
  if (!/^[a-z]{20}$/.test(project ?? '') || url !== `https://${project}.supabase.co`) throw new Error('target_mismatch');
  if (confirm !== `DECKY_V2_RESET_${project}`) throw new Error('confirmation_required');
}

export async function executeReset(admin, record) {
  await admin.maintenance();
  record('maintenance_on', {});
  record('inventory_before', await admin.inventory());
  await admin.clearStorage();
  record('storage_done', {});
  await admin.deleteUsers();
  record('auth_done', {});
  await admin.clearGame();
  record('game_done', {});
  const remaining = await admin.inventory();
  if (Object.values(remaining).some((count) => count !== 0)) throw new Error('remaining_data');
  record('complete_maintenance_on', remaining);
}

const TABLES = ['profiles', 'rooms', 'room_players', 'matches', 'match_players', 'match_events', 'match_notes', 'player_ratings', 'match_ratings', 'public_room_directory'];

function assertResult(result, operation) {
  if (result.error) throw new Error(`${operation}_failed`);
  return result.data;
}

export function createResetAdmin(client, approvedBuckets) {
  async function inventory() {
    const counts = {};
    for (const table of TABLES) {
      const result = await client.from(table).select('*', { count: 'exact', head: true });
      assertResult(result, 'inventory');
      if (!Number.isSafeInteger(result.count)) throw new Error('inventory_count_missing');
      counts[table] = result.count;
    }
    const users = assertResult(await client.auth.admin.listUsers({ page: 1, perPage: 1 }), 'users_inventory');
    counts.users = users.total ?? users.users.length;
    return counts;
  }
  async function clearStorage() {
    const buckets = assertResult(await client.storage.listBuckets(), 'buckets_inventory');
    for (const name of approvedBuckets) {
      if (!buckets.some((bucket) => bucket.id === name)) throw new Error('approved_bucket_missing');
      // emptyBucket preserva a infraestrutura; só buckets de usuários aprovados podem ser limpos.
      assertResult(await client.storage.emptyBucket(name), 'storage_cleanup');
      const entries = assertResult(await client.storage.from(name).list('', { limit: 1 }), 'storage_verify');
      if (entries.length) throw new Error('storage_not_empty');
    }
    // Nenhum bucket desconhecido é apagado. O inventário SQL precisa classificá-los antes.
  }
  async function deleteUsers() {
    for (;;) {
      const result = assertResult(await client.auth.admin.listUsers({ page: 1, perPage: 100 }), 'users_list');
      if (!result.users.length) return;
      for (const user of result.users) {
        assertResult(await client.auth.admin.deleteUser(user.id, false), 'user_delete');
      }
    }
  }
  async function clearGame() {
    for (const table of ['matches', 'rooms', 'profiles']) {
      assertResult(await client.from(table).delete().not('id', 'is', null), 'game_cleanup');
    }
  }
  return { inventory, clearStorage, deleteUsers, clearGame,
    maintenance: async () => { assertResult(await client.rpc('set_decky_maintenance', { p_enabled: true }), 'maintenance'); } };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Uso: node scripts/admin/reset-v2.mjs --project REF [--execute --confirm DECKY_V2_RESET_REF] [--user-buckets a,b]');
    console.log('Sem --execute: somente inventário. Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente administrativo.');
    return;
  }
  const value = (name) => args[args.indexOf(name) + 1];
  const project = args.includes('--project') ? value('--project') : '';
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const execute = args.includes('--execute');
  validateTarget({ url, project, confirm: execute ? value('--confirm') : `DECKY_V2_RESET_${project}` });
  if (!key || !(key.startsWith('sb_secret_') || key.startsWith('eyJ'))) throw new Error('admin_key_missing');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const buckets = args.includes('--user-buckets') ? value('--user-buckets').split(',').filter(Boolean) : [];
  const admin = createResetAdmin(client, buckets);
  const file = resolve('.expo', 'validation-v2', `reset-${project}.jsonl`);
  mkdirSync(dirname(file), { recursive: true });
  const record = (step, counts) => {
    const line = JSON.stringify({ time: new Date().toISOString(), project, step, counts });
    appendFileSync(file, `${line}\n`, { encoding: 'utf8', mode: 0o600 });
    console.log(line);
  };
  if (!execute) { record('dry_run', await admin.inventory()); return; }
  try { await executeReset(admin, record); }
  catch { record('failed_maintenance_remains_on', {}); throw new Error('reset_interrupted'); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
