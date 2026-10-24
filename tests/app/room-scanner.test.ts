import type { ReactElement, ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

const camera = vi.hoisted(() => ({
  values: [] as unknown[], refs: [] as { current: unknown }[], stateIndex: 0, refIndex: 0,
  effects: [] as (() => unknown)[], get: vi.fn(), request: vi.fn(), available: vi.fn(),
  platform: 'web', appState: 'active', onAppState: null as ((state: string) => void) | null,
}));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = camera.stateIndex++;
    if (!(index in camera.values)) camera.values[index] = initial;
    return [camera.values[index], (value: unknown) => { camera.values[index] = value; }];
  },
  useRef: (value: unknown) => camera.refs[camera.refIndex++] ??= { current: value },
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => unknown) => { camera.effects.push(effect); },
}));
vi.mock('expo-camera', async () => {
  const { createPermissionHook } = await import('../../node_modules/expo-modules-core/src/PermissionsHook');
  return {
    CameraView: Object.assign(() => null, { isAvailableAsync: camera.available }),
    useCameraPermissions: createPermissionHook({ getMethod: camera.get, requestMethod: camera.request }),
  };
});
vi.mock('expo-router', () => ({ useFocusEffect: vi.fn() }));
vi.mock('react-native', () => ({
  AppState: {
    get currentState() { return camera.appState; },
    addEventListener: (_event: string, listener: (state: string) => void) => {
      camera.onAppState = listener; return { remove: vi.fn() };
    },
  }, Linking: { openSettings: vi.fn() },
  Modal: 'Modal', Platform: { get OS() { return camera.platform; } }, ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles }, Text: 'Text', View: 'View',
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('../../src/ui/Button', () => ({ Button: 'Button' }));
vi.mock('../../src/ui/Notice', () => ({ Notice: 'Notice' }));
vi.mock('../../src/ui/Ornament', () => ({ RuledTitle: 'RuledTitle' }));
import { RoomScanner } from '../../src/qr/RoomScanner';
import { CameraView } from 'expo-camera';

function render() {
  camera.stateIndex = 0; camera.refIndex = 0; camera.effects = [];
  const tree = RoomScanner({ onJoin: vi.fn(async () => true) });
  camera.effects.forEach((effect) => effect());
  return tree;
}
function findButton(node: ReactNode, label: string): ReactElement<{ onPress: () => void }> | null {
  if (!node || typeof node !== 'object' || !('props' in node)) return null;
  const element = node as ReactElement<{ label?: string; children?: ReactNode }>;
  if (element.props.label === label) return element as ReturnType<typeof findButton>;
  for (const child of [element.props.children].flat()) {
    const found = findButton(child, label); if (found) return found;
  }
  return null;
}
function findElement(node: ReactNode, type: unknown): ReactElement<Record<string, unknown>> | null {
  if (!node || typeof node !== 'object' || !('props' in node)) return null;
  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.type === type) return element as ReturnType<typeof findElement>;
  for (const child of [element.props.children].flat()) {
    const found = findElement(child, type); if (found) return found;
  }
  return null;
}
function appState(state: string) { camera.appState = state; camera.onAppState?.(state); }
beforeEach(() => {
  camera.values = []; camera.refs = []; vi.resetAllMocks();
  camera.platform = 'web'; camera.appState = 'active'; camera.onAppState = null;
  camera.get.mockResolvedValue({ granted: false, canAskAgain: true, status: 'undetermined', expires: 'never' });
  camera.request.mockResolvedValue({ granted: false, canAskAgain: true, status: 'denied', expires: 'never' });
  camera.available.mockResolvedValue(true);
  vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
});
it('abrir a tela de entrada não consulta nem solicita câmera antes da ação do usuário', async () => {
  render(); await Promise.resolve();
  expect(camera.get).not.toHaveBeenCalled();
  expect(camera.request).not.toHaveBeenCalled();
});
it('somente o botão do leitor solicita câmera e trata recusa da permissão', async () => {
  findButton(render(), 'Ler QR code')!.props.onPress();
  await vi.waitFor(() => expect(camera.request).toHaveBeenCalledOnce());
  await vi.waitFor(() => expect(JSON.stringify(render())).toContain('Permita a câmera para ler o QR.'));
});
it('falha de permissão no leitor mantém fechar e entrada manual sem rejeição não tratada', async () => {
  camera.request.mockRejectedValueOnce(new Error('NotSupportedError'));
  findButton(render(), 'Ler QR code')!.props.onPress();
  await vi.waitFor(() => expect(JSON.stringify(render())).toContain('Câmera indisponível.'));
  expect(findButton(render(), 'Fechar')).not.toBeNull();
});
for (const granted of [true, false]) {
  for (const resumeFirst of [true, false]) {
    it(`diálogo Android ${granted ? 'concedido' : 'negado'} preserva leitor com retorno active ${resumeFirst ? 'antes' : 'depois'} da resposta`, async () => {
      camera.platform = 'android';
      let finish!: (permission: unknown) => void;
      camera.request.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
      findButton(render(), 'Ler QR code')!.props.onPress();
      await vi.waitFor(() => expect(camera.request).toHaveBeenCalledOnce());
      appState('background');
      expect(findElement(render(), 'Modal')!.props.visible).toBe(true);
      expect(findElement(render(), CameraView)).toBeNull();
      if (resumeFirst) appState('active');
      finish({ granted, canAskAgain: true, status: granted ? 'granted' : 'denied', expires: 'never' });
      await Promise.resolve(); await Promise.resolve();
      if (!resumeFirst) {
        expect(findElement(render(), CameraView)).toBeNull();
        appState('active');
      }
      await vi.waitFor(() => {
        const tree = render();
        expect(findElement(tree, 'Modal')!.props.visible).toBe(true);
        if (granted) expect(findElement(tree, CameraView)).not.toBeNull();
        else expect(JSON.stringify(tree)).toContain('Permita a câmera para ler o QR.');
      });
    });
  }
}
it('background durante leitura fecha o modal, desmonta a câmera e não reabre no retorno', async () => {
  camera.platform = 'android';
  camera.request.mockResolvedValueOnce({ granted: true, canAskAgain: true, status: 'granted', expires: 'never' });
  findButton(render(), 'Ler QR code')!.props.onPress();
  await vi.waitFor(() => expect(findElement(render(), CameraView)).not.toBeNull());
  appState('background');
  expect(findElement(render(), 'Modal')!.props.visible).toBe(false);
  expect(findElement(render(), CameraView)).toBeNull();
  appState('active');
  expect(findElement(render(), 'Modal')!.props.visible).toBe(false);
  expect(findElement(render(), CameraView)).toBeNull();
});
