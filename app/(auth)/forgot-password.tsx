import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { AuthForm, AuthSubmit } from '../../src/auth/AuthForm';
import { authErrorMessage, mailCooldownSeconds, requestPasswordRecovery } from '../../src/auth/flows';
import { validateEmail } from '../../src/auth/validators';
import { useRerenderAt } from '../../src/lib/useRerenderAt';
import { Button } from '../../src/ui/Button';
import { Notice } from '../../src/ui/Notice';
import { Screen } from '../../src/ui/Screen';
import { TextField } from '../../src/ui/TextField';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableAt, setAvailableAt] = useState(0);
  const busy = useRef(false);
  useRerenderAt([availableAt]);
  const cooling = mailCooldownSeconds('recovery', email) > 0;

  async function submit() {
    if (busy.current || cooling) return;
    const invalid = validateEmail(email);
    setError(invalid);
    if (invalid) return;
    busy.current = true;
    setLoading(true);
    setSent(false);
    try {
      await requestPasswordRecovery(email);
      setSent(true);
    } catch (next) { setError(authErrorMessage(next)); }
    finally {
      setAvailableAt(Date.now() + mailCooldownSeconds('recovery', email) * 1000);
      busy.current = false;
      setLoading(false);
    }
  }

  return <Screen title="Recuperar senha">
    <AuthForm onSubmit={submit}>
      <TextField required label="E-mail" nativeID="recovery-email" value={email} onChangeText={setEmail}
        editable={!loading} autoComplete="email" autoCapitalize="none" autoCorrect={false}
        inputMode="email" keyboardType="email-address" returnKeyType="send"
        onSubmitEditing={Platform.OS === 'web' ? undefined : submit} />
      <Notice kind="error" message={error} />
      <Notice kind="success" message={sent ? 'Se houver uma conta para este e-mail, você receberá as instruções de recuperação.' : null} />
      <AuthSubmit label={cooling ? 'Aguarde um minuto para reenviar' : 'Enviar recuperação'} onPress={submit} loading={loading} disabled={cooling} />
    </AuthForm>
    <Notice kind="info" message="O link abre no navegador e também funciona em outro aparelho. Para a senha da sua conta Google, use a recuperação do próprio Google." />
    <Button label="Voltar ao login" variant="secondary" onPress={() => router.replace('/login')} />
  </Screen>;
}
