import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../src/auth/AuthProvider';
import { Button } from '../src/ui/Button';
import { Notice } from '../src/ui/Notice';
import { Screen } from '../src/ui/Screen';
import { Skeleton, SkeletonBlock } from '../src/ui/Skeleton';

const CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

export default function Invite() {
  const { code: linkedCode } = useLocalSearchParams<{ code?: string }>();
  const { session } = useAuth();
  const code = linkedCode?.trim().toUpperCase() ?? '';
  const valid = CODE_REGEX.test(code);

  useEffect(() => {
    if (session && valid) router.replace({ pathname: '/room/join', params: { code } });
  }, [session, valid, code]);

  if (!valid) {
    return (
      <Screen title="Convite inválido" onBack={() => router.replace('/')}>
        <Notice kind="error" message="O link da sala não contém um código válido." />
      </Screen>
    );
  }

  if (session) return <Screen title="Abrindo sala...">
    <Skeleton label="Abrindo sala">
      <SkeletonBlock width="65%" height={20} />
      <SkeletonBlock width="45%" />
    </Skeleton>
  </Screen>;

  return (
    <Screen title="Entrar na sala" subtitle={`Código ${code}`}>
      <Notice kind="info" message="Entre na sua conta ou crie uma para participar." />
      <Button label="Entrar na conta" onPress={() => router.push({ pathname: '/login', params: { code } })} />
      <Button label="Criar conta" variant="secondary" onPress={() => router.push({ pathname: '/register', params: { code } })} />
    </Screen>
  );
}
