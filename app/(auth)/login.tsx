import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { signIn, useAuth } from '../../src/auth/AuthProvider';
import { AuthForm, AuthSubmit } from '../../src/auth/AuthForm';
import { ConfirmationResend } from '../../src/auth/ConfirmationResend';
import { authErrorMessage, signInWithGoogle } from '../../src/auth/flows';
import { GoogleButton } from '../../src/auth/GoogleButton';
import { validateEmail } from '../../src/auth/validators';
import { Button } from '../../src/ui/Button';
import { Logo } from '../../src/ui/Logo';
import { Notice } from '../../src/ui/Notice';
import { Ornament } from '../../src/ui/Ornament';
import { Screen } from '../../src/ui/Screen';
import { TextField } from '../../src/ui/TextField';
import { colors, font, fonts, space } from '../../src/ui/theme';

export default function Login() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { session, needsProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (session) router.replace(needsProfile ? '/complete-profile' : code ? { pathname: '/invite', params: { code } } : '/');
  }, [session, needsProfile, code]);

  async function submit() {
    if (busy.current) return;
    // REGEX antes de qualquer chamada ao servidor. No login a senha só precisa estar preenchida:
    // a regra de formato vale no cadastro, e a mensagem de erro não revela qual campo falhou.
    const next = { email: validateEmail(email), password: password ? null : 'Informe a senha.' };
    setErrors(next);
    setServerError(null);
    if (next.email || next.password) return;

    busy.current = true;
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      setServerError(authErrorMessage(error));
      setShowResend(!!error && typeof error === 'object' && 'code' in error && error.code === 'email_not_confirmed');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  async function google() {
    if (busy.current) return;
    busy.current = true;
    setGoogleLoading(true);
    setServerError(null);
    try {
      const result = await signInWithGoogle();
      if (result === 'cancelled') setServerError('Entrada com Google cancelada. Você pode tentar novamente.');
    } catch (error) {
      setServerError(authErrorMessage(error));
    } finally {
      busy.current = false;
      setGoogleLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Logo size={180} />
        <Text style={styles.subtitle}>Truco Paulista sem baralho na mesa</Text>
        <Ornament width={220} />
      </View>
      <AuthForm onSubmit={submit}>
      <TextField
        required
        nativeID="email"
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="username"
        inputMode="email"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="nome@email.com"
      />
      <TextField
        required
        nativeID="current-password"
        label="Senha"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        placeholder="Digite sua senha"
        returnKeyType="go"
        onSubmitEditing={Platform.OS === 'web' ? undefined : submit}
      />
      <Notice kind="error" message={serverError} />
      <AuthSubmit label="Entrar" onPress={submit} loading={loading} disabled={googleLoading} />
      </AuthForm>
      <Button label="Esqueci minha senha" variant="ghost" onPress={() => router.push('/forgot-password')} disabled={loading || googleLoading} />
      {showResend ? <ConfirmationResend email={email} /> : null}
      <GoogleButton onPress={google} loading={googleLoading} disabled={loading} />
      <Button label="Criar conta" variant="secondary" onPress={() => router.push(code ? { pathname: '/register', params: { code } } : '/register')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  subtitle: { fontFamily: fonts.display, fontSize: font.body + 1, color: colors.textMuted, textAlign: 'center' },
});
