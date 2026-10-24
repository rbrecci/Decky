import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { signOut, useAuth } from '../src/auth/AuthProvider';
import { errorMessage } from '../src/lib/errors';
import { Button } from '../src/ui/Button';
import { Logo } from '../src/ui/Logo';
import { Notice } from '../src/ui/Notice';
import { Ornament } from '../src/ui/Ornament';
import { Screen } from '../src/ui/Screen';
import { colors, fonts, space } from '../src/ui/theme';
import { UpdateNotice } from '../src/updates/UpdateNotice';

export default function Home() {
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
    <Screen>
      <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
        <Logo size={176} />
        <Text style={styles.greeting} accessibilityRole="header">
          Olá, {displayName}
        </Text>
        <Ornament width={240} />
        <Text style={styles.tagline}>TRUCO PAULISTA · DUELOS E DUPLAS</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(350).delay(120)} style={styles.actions}>
        <Button
          label="Criar sala"
          onPress={() => router.push('/room/create')}
        />
        <Button label="Entrar na sala" variant="dark" onPress={() => router.push('/room/join')} />
        <Button label="Histórico e notas" variant="secondary" onPress={() => router.push('/history')} />
        <Button label="Ranking" variant="gold" onPress={() => router.push('/ranking')} />
      </Animated.View>

      <View style={styles.footer}>
        <UpdateNotice />
        <Notice kind="error" message={logoutError} />
        <Button label="Sair da conta" variant="ghost" size="compact" loading={loggingOut} onPress={leave} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.md, paddingTop: space.md, paddingBottom: space.sm },
  greeting: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, color: colors.text, textAlign: 'center' },
  tagline: { fontSize: 12, letterSpacing: 2, color: colors.textFaint, textAlign: 'center', fontWeight: '600' },
  actions: { gap: space.sm + 4 },
  footer: { marginTop: 'auto', alignItems: 'center' },
});
