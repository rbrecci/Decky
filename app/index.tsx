import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { signOut, useAuth } from '../src/auth/AuthProvider';
import { errorMessage } from '../src/lib/errors';
import { IconButton } from '../src/ui/IconButton';
import { DECKY_PAGE } from '../src/updates/links';
import { Button } from '../src/ui/Button';
import { Logo } from '../src/ui/Logo';
import { Notice } from '../src/ui/Notice';
import { Ornament } from '../src/ui/Ornament';
import { Screen } from '../src/ui/Screen';
import { colors, fonts, space } from '../src/ui/theme';
import { UpdateNotice } from '../src/updates/UpdateNotice';

export default function Home() {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1024;
  const [pageError, setPageError] = useState<string | null>(null);
  const { displayName } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutPending = useRef(false);

  async function leave() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setLoggingOut(true);
    setLogoutError(null);
    try { await signOut(); }
    catch (error) { setLogoutError(errorMessage(error)); }
    finally { logoutPending.current = false; setLoggingOut(false); }
  }

  return (
    <Screen maxWidth={desktop ? 500 : 560} cornerActions={<>
      <IconButton label="Página do Decky" icon="globe" onPress={() => { setPageError(null); void Linking.openURL(DECKY_PAGE).catch(() => setPageError('Não foi possível abrir a página. Tente novamente.')); }} />
      <IconButton label="Sair da conta" icon="logout" loading={loggingOut} onPress={leave} />
    </>}>
      <Animated.View entering={FadeIn.duration(400)} style={[styles.hero, desktop && styles.heroDesktop]}>
        <Logo size={desktop ? 132 : 176} />
        <Text style={[styles.greeting, desktop && styles.greetingDesktop]} accessibilityRole="header">
          Olá, {displayName}
        </Text>
        <Ornament width={240} />
        <Text style={styles.tagline}>TRUCO PAULISTA · DUELOS E DUPLAS</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(350).delay(120)} style={[styles.actions, desktop && styles.actionsDesktop]}>
        <Button
          style={desktop ? styles.desktopAction : undefined}
          label="Criar sala"
          onPress={() => router.push('/room/create')}
        />
        <Button style={desktop ? styles.desktopAction : undefined} label="Entrar na sala" variant="dark" onPress={() => router.push('/room/join')} />
        <Button style={desktop ? styles.desktopAction : undefined} label="Histórico e notas" variant="secondary" onPress={() => router.push('/history')} />
        <Button style={desktop ? styles.desktopAction : undefined} label="Ranking" variant="gold" onPress={() => router.push('/ranking')} />
      </Animated.View>

      <View style={styles.footer}>
        <UpdateNotice showPageLink={false} />
        <Notice kind="error" message={pageError} />
        <Notice kind="error" message={logoutError} />

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroDesktop: { gap: 12, paddingTop: 20, paddingBottom: 20 },
  greetingDesktop: { fontSize: 26, lineHeight: 34 },
  actionsDesktop: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  desktopAction: { width: '48%', flexGrow: 1 },
  hero: { alignItems: 'center', gap: space.md, paddingTop: space.md, paddingBottom: space.sm },
  greeting: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, color: colors.text, textAlign: 'center' },
  tagline: { fontSize: 12, letterSpacing: 2, color: colors.textFaint, textAlign: 'center', fontWeight: '600' },
  actions: { gap: space.sm + 4 },
  footer: { marginTop: 'auto', alignItems: 'center' },
});
