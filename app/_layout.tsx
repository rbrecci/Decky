import { PlayfairDisplay_700Bold, PlayfairDisplay_900Black, useFonts } from '@expo-google-fonts/playfair-display';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { colors } from '../src/ui/theme';

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.gold} />
    </View>
  );
}

function RootStack() {
  const { session, loading } = useAuth();

  if (loading) return <Loading />;

  // O convite e as telas de conta ficam acessíveis antes da sessão.
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="invite" />
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" />
        <Stack.Screen name="room/create" />
        <Stack.Screen name="room/join" />
        <Stack.Screen name="room/[code]" />
        <Stack.Screen name="game/[matchId]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="history/index" />
        <Stack.Screen name="history/note" />
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
