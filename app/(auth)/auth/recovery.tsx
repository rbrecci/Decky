import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { AuthForm, AuthSubmit } from '../../../src/auth/AuthForm';
import { signOut } from '../../../src/auth/AuthProvider';
import { authErrorMessage, hasRecoveryGrant, parseEmailToken, updateRecoveredPassword, verifyRecovery } from '../../../src/auth/flows';
import { validatePassword, validatePasswordConfirmation } from '../../../src/auth/validators';
import { Button } from '../../../src/ui/Button';
import { Notice } from '../../../src/ui/Notice';
import { Screen } from '../../../src/ui/Screen';
import { TextField } from '../../../src/ui/TextField';

export default function Recovery() {
  const params = useLocalSearchParams<{ token_hash?: string }>();
  const navigation = useNavigation();
  const [token, setToken] = useState(() => Platform.OS === 'web' && typeof window !== 'undefined'
    ? parseEmailToken(window.location.hash) ?? parseEmailToken(window.location.search)
    : typeof params.token_hash === 'string' ? parseEmailToken(`token_hash=${encodeURIComponent(params.token_hash)}`) : null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [logoutComplete, setLogoutComplete] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let mounted = true;
    // O primeiro efeito da rota precede os listeners do Router. Limpa depois desse commit.
    queueMicrotask(() => {
      if (!mounted) return;
      navigation.replaceParams({} as never);
      window.history.replaceState(window.history.state, '', window.location.pathname);
    });
    return () => { mounted = false; };
  }, [navigation]);

  async function submit() {
    if (busy.current) return;
    const invalid = validatePassword(password) ?? validatePasswordConfirmation(password, confirmation);
    setError(invalid);
    if (invalid) return;
    busy.current = true;
    setLoading(true);
    try {
      if (!hasRecoveryGrant()) {
        if (!token) throw new Error('recovery_required');
        await verifyRecovery(token);
        setToken(null);
      }
      setLogoutComplete(await updateRecoveredPassword(password, confirmation));
      setPassword('');
      setConfirmation('');
      setDone(true);
    } catch (next) { setError(authErrorMessage(next)); }
    finally { busy.current = false; setLoading(false); }
  }

  async function goToLogin() {
    try {
      if (!logoutComplete) await signOut();
      router.replace('/login');
    } catch (next) { setError(authErrorMessage(next)); }
  }

  if (done) return <Screen title="Senha atualizada" onBack={goToLogin} backLabel="Ir para o login">
    <Notice kind="success" message="Sua senha foi alterada. Entre com a nova senha." />
    {!logoutComplete ? <Notice kind="info" message="A senha foi salva, mas faltou encerrar a sessão anterior. Tente novamente abaixo quando a conexão voltar." /> : null}
    <Notice kind="error" message={error} />
  </Screen>;

  return <Screen title="Nova senha" onBack={() => router.replace('/login')} backDisabled={loading}>
    {!token && !hasRecoveryGrant() ? <Notice kind="error" message="Abra o link do e-mail ou solicite uma nova recuperação." /> : <>
      <Notice kind="info" message="A troca só ocorre ao confirmar abaixo. Não compartilhe este link." />
      <AuthForm onSubmit={submit}>
        <TextField required label="Nova senha (6+ caracteres, letras e números)" nativeID="new-password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" editable={!loading} />
        <TextField required label="Confirme a nova senha" nativeID="password-confirmation" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" editable={!loading} returnKeyType="done" onSubmitEditing={Platform.OS === 'web' ? undefined : submit} />
        <AuthSubmit label="Salvar nova senha" onPress={submit} loading={loading} />
      </AuthForm>
    </>}
    <Notice kind="error" message={error} />
    <Button label="Solicitar outro link" variant="secondary" onPress={() => router.replace('/forgot-password')} disabled={loading} />
  </Screen>;
}
