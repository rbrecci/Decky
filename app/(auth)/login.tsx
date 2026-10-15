import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { signIn } from '../../src/auth/AuthProvider';
import { validateEmail } from '../../src/auth/validators';
import { errorMessage } from '../../src/lib/errors';
import { Button } from '../../src/ui/Button';
import { Logo } from '../../src/ui/Logo';
import { Notice } from '../../src/ui/Notice';
import { Ornament } from '../../src/ui/Ornament';
import { Screen } from '../../src/ui/Screen';
import { TextField } from '../../src/ui/TextField';
import { colors, font, fonts, space } from '../../src/ui/theme';

export default function Login() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    // REGEX antes de qualquer chamada ao servidor. No login a senha só precisa estar preenchida:
    // a regra de formato vale no cadastro, e a mensagem de erro não revela qual campo falhou.
    const next = { email: validateEmail(email), password: password ? null : 'Informe a senha.' };
    setErrors(next);
    setServerError(null);
    if (next.email || next.password) return;

    setLoading(true);
    try {
      await signIn(email, password);
      router.replace(code ? { pathname: '/invite', params: { code } } : '/');
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Logo size={180} />
        <Text style={styles.subtitle}>Truco Paulista sem baralho na mesa</Text>
        <Ornament width={220} />
      </View>
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="nome@email.com"
      />
      <TextField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        placeholder="Digite sua senha"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Notice kind="error" message={serverError} />
      <Button label="Entrar" onPress={submit} loading={loading} />
      <Button label="Criar conta" variant="secondary" onPress={() => router.push(code ? { pathname: '/register', params: { code } } : '/register')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  subtitle: { fontFamily: fonts.display, fontSize: font.body + 1, color: colors.textMuted, textAlign: 'center' },
});
