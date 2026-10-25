import { PlayfairDisplay_700Bold, PlayfairDisplay_900Black, useFonts } from '@expo-google-fonts/playfair-display';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { Skeleton, SkeletonBlock } from '../src/ui/Skeleton';
import { colors, radius, space } from '../src/ui/theme';

function Loading() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg, padding: space.lg }}>
      <Skeleton label="Preparando o Decky" style={{ width: '100%', maxWidth: 512, alignSelf: 'center' }}>
        <SkeletonBlock width={152} height={152} style={{ alignSelf: 'center', borderRadius: radius.lg }} />
        <SkeletonBlock width="52%" height={32} style={{ alignSelf: 'center', marginBottom: space.lg }} />
        {[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} height={56} style={{ borderRadius: radius.md }} />)}
      </Skeleton>
    </View>
  );
}

function RootStack() {
  const { session, loading, recovery, needsProfile } = useAuth();

  if (loading) return <Loading />;

  // O convite e as telas de conta ficam acessíveis antes da sessão.
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="invite" />
      <Stack.Protected guard={!!session && !recovery && !needsProfile}>
        <Stack.Screen name="index" />
        <Stack.Screen name="room/create" />
        <Stack.Screen name="room/join" />
        <Stack.Screen name="room/[code]" />
        <Stack.Screen name="game/[matchId]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="history/index" />
        <Stack.Screen name="history/note" />
        <Stack.Screen name="ranking" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // Fonte dos títulos. Se falhar ao carregar, o app segue com a fonte do sistema.
  const [fontsLoaded, fontError] = useFonts({ PlayfairDisplay_700Bold, PlayfairDisplay_900Black });

  return (
    <AuthProvider>
      <StatusBar style="light" />
      {fontsLoaded || fontError ? <RootStack /> : <Loading />}
    </AuthProvider>
  );
}
