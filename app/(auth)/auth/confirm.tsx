import { router, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { authErrorMessage, confirmEmail, parseEmailToken } from '../../../src/auth/flows';
import { Button } from '../../../src/ui/Button';
import { Notice } from '../../../src/ui/Notice';
import { Screen } from '../../../src/ui/Screen';

export default function ConfirmEmail() {
  const navigation = useNavigation();
  const [token, setToken] = useState(() => Platform.OS === 'web' && typeof window !== 'undefined'
    ? parseEmailToken(window.location.hash) ?? parseEmailToken(window.location.search) : null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      navigation.replaceParams({} as never);
      window.history.replaceState(window.history.state, '', window.location.pathname);
    });
    return () => { mounted = false; };
  }, [navigation]);

  async function confirm() {
    if (busy.current || !token) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try { await confirmEmail(token); setToken(null); setDone(true); }
    catch (next) { setError(authErrorMessage(next)); }
    finally { busy.current = false; setLoading(false); }
  }

  return <Screen title={done ? 'E-mail confirmado' : 'Confirme seu e-mail'} onBack={() => router.replace('/login')} backDisabled={loading}>
    <Notice kind={done ? 'success' : 'info'} message={done ? 'Seu e-mail foi confirmado. Você já pode entrar.' : token ? 'Toque abaixo para confirmar seu endereço no Decky.' : 'Abra o link do e-mail. Se expirou, solicite o reenvio no cadastro ou login.'} />
    <Notice kind="error" message={error} />
    {token ? <Button label="Confirmar e-mail" onPress={confirm} loading={loading} /> : null}
  </Screen>;
}
