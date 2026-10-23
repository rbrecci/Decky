import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { signOut, useAuth } from '../src/auth/AuthProvider';
import { Button } from '../src/ui/Button';
import { Logo } from '../src/ui/Logo';
import { Ornament } from '../src/ui/Ornament';
import { Screen } from '../src/ui/Screen';
import { colors, fonts, space } from '../src/ui/theme';

export default function Home() {
  const { displayName } = useAuth();

  return (
    <Screen>
      <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
        <Logo size={176} />
        <Text style={styles.greeting} accessibilityRole="header">
          Olá, {displayName}
        </Text>
        <Ornament width={240} />
        <Text style={styles.tagline}>TRUCO PAULISTA · DUELOS E DUPLAS</Text>
        <Text style={styles.ranked}>Toda partida nova vale Elo. Confira sua evolução no ranking.</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(350).delay(120)} style={styles.actions}>
        <Button
          label="Criar sala"
          caption="Você joga ou este celular vira a mesa"
          onPress={() => router.push('/room/create')}
        />
        <Button label="Entrar na sala" caption="Com o código de 6 letras" variant="dark" onPress={() => router.push('/room/join')} />
        <Button label="Histórico e notas" variant="secondary" onPress={() => router.push('/history')} />
        <Button label="Ranking" caption="Seu Elo no 1v1 e no 2v2" variant="gold" onPress={() => router.push('/ranking')} />
      </Animated.View>

      <View style={styles.footer}>
        <Button label="Sair da conta" variant="ghost" size="compact" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.md, paddingTop: space.md, paddingBottom: space.sm },
  greeting: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, color: colors.text, textAlign: 'center' },
  tagline: { fontSize: 12, letterSpacing: 2, color: colors.textFaint, textAlign: 'center', fontWeight: '600' },
  ranked: { fontSize: 14, lineHeight: 21, color: colors.textMuted, textAlign: 'center' },
  actions: { gap: space.sm + 4 },
  footer: { marginTop: 'auto', alignItems: 'center' },
});
