import * as Application from 'expo-application';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { fetchRelease } from '../../site/release.js';
import type { Release } from '../../site/release.js';
import { Button } from '../ui/Button';
import { colors, space } from '../ui/theme';
import { createUpdateChecker } from './checker';

import { DECKY_PAGE as PAGE } from './links';
const installed = !__DEV__ && Platform.OS === 'android' && Application.applicationId === 'br.senai.decky' &&
  Application.nativeApplicationVersion && Application.nativeBuildVersion
  ? { version: Application.nativeApplicationVersion, buildNumber: Number(Application.nativeBuildVersion) } : null;
const checker = createUpdateChecker(installed, () => fetchRelease(`${PAGE}version.json`));

export function UpdateNotice({ showPageLink = true }: { showPageLink?: boolean }) {
  const [release, setRelease] = useState<Release | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const check = () => { void checker.check().then((value) => { if (active) setRelease(value); }); };
    check();
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') check(); });
    return () => { active = false; listener.remove(); };
  }, []);

  async function openPage() {
    setError(false);
    try { await Linking.openURL(PAGE); } catch { setError(true); }
  }
  return (
    <View style={styles.container}>
      {release && <View style={styles.notice} accessibilityLiveRegion="polite">
        <Text style={styles.title}>Atualização disponível</Text>
        <Button label="Ver atualização" variant="gold" size="compact" onPress={openPage} />
      </View>}
      {showPageLink ? <Button label="Página do Decky" variant="ghost" size="compact" onPress={openPage} /> : null}
      {error && <Text style={styles.error}>Não foi possível abrir a página. Tente novamente.</Text>}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: space.sm, alignItems: 'center' },
  notice: { alignSelf: 'stretch', gap: space.sm, padding: space.md, borderWidth: 1, borderColor: colors.goldDeep, borderRadius: 14 },
  title: { color: colors.goldSoft, fontSize: 16, textAlign: 'center' },
  error: { color: colors.redText, fontSize: 14, textAlign: 'center' },
});
