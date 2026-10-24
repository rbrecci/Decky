type Counts = Record<string, number>;
type Admin = { maintenance(): Promise<unknown>; inventory(): Promise<Counts>; clearStorage(): Promise<unknown>; deleteUsers(): Promise<unknown>; clearGame(): Promise<unknown> };
export function validateTarget(value: { url: string | undefined; project: string; confirm: string }): void;
export function executeReset(admin: Admin, record: (step: string, counts: Counts) => void): Promise<void>;
export function createResetAdmin(client: import('@supabase/supabase-js').SupabaseClient, approvedBuckets: string[]): Admin;
