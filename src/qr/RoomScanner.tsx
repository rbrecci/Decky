import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../ui/Button';
import { Notice } from '../ui/Notice';
import { RuledTitle } from '../ui/Ornament';
import { colors, fonts, space } from '../ui/theme';
import { createQrReadGate, parseRoomQr } from './code';

export function RoomScanner({ onJoin }: { onJoin: (code: string) => Promise<boolean> }) {
  const [permission, requestPermission] = useCameraPermissions({ get: false });
  const [open, setOpen] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const gate = useRef(createQrReadGate());
  const opening = useRef(false);
  const active = useRef(true);

  function close() { opening.current = false; setOpen(false); setReady(false); }
  useFocusEffect(useCallback(() => {
    active.current = true;
    return () => { active.current = false; close(); };
  }, []));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
      // O diálogo de permissão pode suspender a Activity Android enquanto a resposta ainda está pendente.
      if (state !== 'active' && !opening.current) close();
    });
    if (Platform.OS === 'web') {
      const hide = () => { if (document.visibilityState === 'hidden') close(); };
      document.addEventListener('visibilitychange', hide);
      return () => { subscription.remove(); document.removeEventListener('visibilitychange', hide); };
    }
    return () => subscription.remove();
  }, []);

  async function start() {
    if (opening.current) return;
    opening.current = true;
    setError(null); setPaused(false); gate.current.reset(); setOpen(true);
    try {
      if (Platform.OS === 'web') {
        if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('unavailable');
        if (!await CameraView.isAvailableAsync()) throw new Error('unavailable');
      }
      const granted = permission?.granted ? permission : await requestPermission();
      if (!opening.current || !active.current) return;
      if (granted.granted) setReady(true);
      else setError(granted.canAskAgain ? 'Permita a câmera para ler o QR. Você também pode digitar o código.' : 'Câmera bloqueada. Libere a permissão nas configurações do aparelho ou navegador, ou digite o código.');
    } catch {
      if (active.current) setError('Câmera indisponível. No navegador, use HTTPS e confira a permissão. A entrada por código continua disponível.');
    } finally { opening.current = false; }
  }

  async function read(data: string) {
    if (paused || busy) return;
    const code = gate.current.accept(data);
    if (!code) { if (!parseRoomQr(data)) setError('Este QR não é um convite Decky válido. Aponte para outro QR.'); return; }
    setPaused(true); setBusy(true); setError(null); setReady(false);
    try {
      const joined = await onJoin(code);
      if (joined) close();
      else setError('Não foi possível entrar nesta sala. Tente ler outro QR ou digite o código.');
    } finally { if (active.current) setBusy(false); }
  }

  return <>
    <Button label="Ler QR code" variant="dark" onPress={() => void start()} />
    <Modal visible={open} animationType="fade" onRequestClose={close}>
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <RuledTitle style={styles.title}>Ler QR code</RuledTitle>
          <Text style={styles.text}>Aponte para o QR code da sala.</Text>
          {ready && appActive && !paused ? <View style={styles.frame}>
            <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => void read(data)}
              onMountError={() => { setReady(false); setError('Não foi possível abrir a câmera. Confira a permissão ou digite o código.'); }} />
          </View> : null}
          <Notice kind="error" message={error} />
          {error || paused ? <Button label="Tentar novamente" variant="dark" loading={busy} onPress={() => void start()} /> : null}
          {permission && !permission.granted && !permission.canAskAgain && Platform.OS !== 'web' ? <Button label="Abrir configurações" variant="secondary" onPress={() => void Linking.openSettings()} /> : null}
          <Button label="Fechar" variant="secondary" onPress={close} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, padding: space.lg, gap: space.md, width: '100%', maxWidth: 640, alignSelf: 'center' },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 30 },
  text: { color: colors.textMuted, fontSize: 16 },
  frame: { width: '100%', aspectRatio: 1, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.gold },
});
