import * as Linking from 'expo-linking';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../../../src/auth/AuthProvider';
import { authErrorMessage, completeOAuthCallback, getOAuthRedirect } from '../../../src/auth/flows';
import { validateDisplayName } from '../../../src/auth/validators';
import { supabase } from '../../../src/lib/supabase';
import { Button } from '../../../src/ui/Button';
import { Notice } from '../../../src/ui/Notice';
import { Screen } from '../../../src/ui/Screen';
import { colors } from '../../../src/ui/theme';

export default function OAuthCallback() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const navigation = useNavigation();
  const linkedUrl = Linking.useURL();
  const { refreshSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [callbackUrl] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.href;
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      for (const part of Array.isArray(value) ? value : [value]) query.append(key, part);
    }
    return `${getOAuthRedirect()}?${query}`;
  });

  useEffect(() => {
    let active = true;
    if (Platform.OS === 'web') queueMicrotask(() => {
      if (!active) return;
      navigation.replaceParams({} as never);
      window.history.replaceState(window.history.state, '', window.location.pathname);
    });
    async function complete() {
      await completeOAuthCallback(callbackUrl || linkedUrl || '');
      await refreshSession();
      const { data } = await supabase.auth.getUser();
      const name = data.user?.user_metadata?.display_name;
      if (active) router.replace(typeof name === 'string' && !validateDisplayName(name) ? '/' : '/complete-profile');
    }
    void complete().catch((next) => { if (active) setError(authErrorMessage(next)); });
    return () => { active = false; };
    // O callback é capturado uma vez antes da limpeza da URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callbackUrl]);

  return <Screen title="Entrando com Google">
    {error ? <>
      <Notice kind="error" message={error} />
      <Button label="Voltar ao login" onPress={() => router.replace('/login')} />
    </> : <ActivityIndicator color={colors.gold} accessibilityLabel="Concluindo autenticação" />}
  </Screen>;
}
