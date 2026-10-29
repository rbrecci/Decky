import type { ReactElement, ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ values: [] as any[], refs: [] as any[], index: 0, ri: 0, request: vi.fn(), respond: vi.fn(), change: vi.fn(), incoming: false }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useEffect: () => {}, useRef: (value: any) => h.refs[h.ri++] ??= { current: value }, useState: (value: any) => {
  const index = h.index++; if (!(index in h.values)) h.values[index] = value;
  return [h.values[index], (next: any) => { h.values[index] = typeof next === 'function' ? next(h.values[index]) : next; }];
} }));
vi.mock('expo-router', () => ({ router: { replace: vi.fn() }, useLocalSearchParams: () => ({ code: 'ABC234' }) }));
vi.mock('expo-linking', () => ({ createURL: () => 'decky://invite' }));
vi.mock('react-native-qrcode-svg', () => ({ default: 'QRCode' }));
vi.mock('react-native', () => ({ Share: { share: vi.fn() }, Platform: { OS: 'web' }, useWindowDimensions: () => ({width:390}), StyleSheet: { create: (value: any) => value }, Text: 'Text', View: 'View' }));
vi.mock('../../src/auth/AuthProvider', () => ({ useAuth: () => ({ userId: 'a' }) }));
vi.mock('../../src/game/api', () => ({ startMatch: vi.fn() }));
vi.mock('../../src/rooms/api', () => ({ changeSeat: h.change, requestSeatSwap: h.request, respondSeatSwap: h.respond, leaveRoom: vi.fn(), setHostMode: vi.fn(), setReady: vi.fn() }));
vi.mock('../../src/rooms/useRoom', () => ({ useRoom: () => ({ room: { id: 'room', hostUserId: 'a', gameMode: '1v1' }, seats: [{ userId: 'a', seat: 1, displayName: 'Ana' }, { userId: 'b', seat: 2, displayName: 'Bia' }], swaps: h.incoming ? [{ id: 'swap', fromUserId: 'b', toUserId: 'a', status: 'pending' }] : [], loaded: true, refresh: async () => {} }) }));
vi.mock('../../src/rooms/SeatPicker', () => ({ SeatPicker: 'SeatPicker' }));
vi.mock('../../src/ui/Button', () => ({ Button: 'Button' }));
vi.mock('../../src/ui/Dialog', () => ({ Dialog: 'Dialog' }));
vi.mock('../../src/ui/Notice', () => ({ Notice: 'Notice' }));
vi.mock('../../src/ui/Panel', () => ({ Panel: 'Panel' }));
vi.mock('../../src/ui/Screen', () => ({ Screen: 'Screen' }));
vi.mock('../../src/ui/Skeleton', () => ({ Skeleton: 'Skeleton', SkeletonBlock: 'SkeletonBlock' }));
import Lobby from '../../app/room/[code]';
function render() { h.index = 0; h.ri = 0; return Lobby(); }
function nodes(node: ReactNode): ReactElement<any>[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const el = node as ReactElement<any>; return [el, ...nodes(el.props.children)];
}
const dialog = (title: string) => nodes(render()).find(el => el.type === 'Dialog' && el.props.title === title)!;
beforeEach(() => { h.values = []; h.refs = []; h.incoming = false; vi.clearAllMocks(); h.request.mockResolvedValue(undefined); h.respond.mockResolvedValue('accepted'); });
it('selecionar posição ocupada pede consentimento antes de enviar', async () => {
  const picker = nodes(render()).find(el => el.type === 'SeatPicker')!;
  picker.props.onRequestSwap({ userId: 'b', seat: 2, displayName: 'Bia' });
  const popup = dialog('Enviar pedido de troca de lugar');
  expect(popup.props.open).toBe(true);
  expect(h.request).not.toHaveBeenCalled();
  popup.props.onConfirm();
  await vi.waitFor(() => expect(h.request).toHaveBeenCalledWith('room', 'b'));
  expect(h.change).not.toHaveBeenCalled();
});
it('cancelar envio não altera posições nem envia pedido', () => {
  nodes(render()).find(el => el.type === 'SeatPicker')!.props.onRequestSwap({ userId: 'b', displayName: 'Bia' });
  dialog('Enviar pedido de troca de lugar').props.onCancel();
  expect(dialog('Enviar pedido de troca de lugar').props.open).toBe(false);
  expect(h.request).not.toHaveBeenCalled();
});
it.each([true, false])('destinatário responde pelo servidor: %s', async accept => {
  h.incoming = true;
  const popup = dialog('Aceitar pedido de troca de lugar');
  expect(popup.props.open).toBe(true);
  expect(popup.props.message).toContain('Bia');
  if (accept) popup.props.onConfirm(); else popup.props.onCancel();
  await vi.waitFor(() => expect(h.respond).toHaveBeenCalledWith('swap', accept));
});
it('mantém erro de pedido visível dentro do popup e permite tentar novamente', async () => {
  h.request.mockRejectedValueOnce(new Error('swap_conflict'));
  nodes(render()).find(el => el.type === 'SeatPicker')!.props.onRequestSwap({ userId: 'b', displayName: 'Bia' });
  dialog('Enviar pedido de troca de lugar').props.onConfirm();
  await vi.waitFor(() => expect(dialog('Enviar pedido de troca de lugar').props.error).toContain('pedido de troca'));
  expect(dialog('Enviar pedido de troca de lugar').props.open).toBe(true);
});
