import { afterEach, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: { rpc: h.rpc } }));
import { heartbeatRoom } from '../../src/rooms/api';
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
it('aborta renovação presa e permite outra tentativa', async () => {
  vi.useFakeTimers();
  let signal!: AbortSignal;
  h.rpc.mockReturnValueOnce({ abortSignal: (value: AbortSignal) => { signal = value; return new Promise(() => {}); } });
  const pending = heartbeatRoom('room');
  const rejected = expect(pending).rejects.toThrow('room_heartbeat_timeout');
  await vi.advanceTimersByTimeAsync(10000);
  await rejected;
  expect(signal.aborted).toBe(true);
  h.rpc.mockReturnValueOnce({ abortSignal: () => Promise.resolve({ error: null }) });
  await expect(heartbeatRoom('room')).resolves.toBeUndefined();
});
