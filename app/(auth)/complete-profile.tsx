import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { signOut, useAuth } from '../../src/auth/AuthProvider';
import { AuthForm, AuthSubmit } from '../../src/auth/AuthForm';
import { authErrorMessage, saveDisplayName } from '../../src/auth/flows';
import { validateDisplayName } from '../../src/auth/validators';
import { Button } from '../../src/ui/Button';
import { Notice } from '../../src/ui/Notice';
import { Screen } from '../../src/ui/Screen';
import { TextField } from '../../src/ui/TextField';

export default function CompleteProfile() {
  const { session, refreshSession } = useAuth();
  const [name, setName] = useState(() => {
    const candidate: unknown = session?.user.user_metadata?.full_name;
    return typeof candidate === 'string' && !validateDisplayName(candidate) ? candidate.trim() : '';
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  async function submit() {
    if (busy.current || !session) return;
    const invalid = validateDisplayName(name);
    setError(invalid);
    if (invalid) return;
    busy.current = true;
    setLoading(true);
    try {
      await saveDisplayName(name);
      await refreshSession();
      router.replace('/');
    } catch (next) { setError(authErrorMessage(next)); }
    finally { busy.current = false; setLoading(false); }
  }

  async function exit() {
    try { await signOut(); router.replace('/login'); }
    catch (next) { setError(authErrorMessage(next)); }
  }

  if (!session) return <Screen title="Seu nome na mesa">
    <Button label="Entrar na conta" onPress={() => router.replace('/login')} />
  </Screen>;

  return <Screen title="Seu nome na mesa" subtitle="Escolha como os outros jogadores vão ver você.">
    <AuthForm onSubmit={submit}>
      <TextField required label="Nome" nativeID="display-name" autoComplete="nickname" value={name} onChangeText={setName} maxLength={20}
        editable={!loading} returnKeyType="done" onSubmitEditing={Platform.OS === 'web' ? undefined : submit} />
      <Notice kind="error" message={error} />
      <AuthSubmit label="Salvar e jogar" onPress={submit} loading={loading} />
    </AuthForm>
    <Button label="Sair da conta" variant="ghost" onPress={exit} disabled={loading} />
  </Screen>;
}
