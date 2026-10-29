import { StartTransition } from '../../src/game/components/StartTransition';
import { startCardAt } from '../../src/game/startTransition';
import { useServerClock } from '../../src/game/useServerClock';
import { useRerenderAt } from '../../src/lib/useRerenderAt';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { leaveSpectator } from '../../src/rooms/api';
import { useAuth } from '../../src/auth/AuthProvider';
import { PlayerGame } from '../../src/game/PlayerGame';
import { TableGame } from '../../src/game/TableGame';
import { useMatch } from '../../src/game/useMatch';
import { Button } from '../../src/ui/Button';
import { Notice } from '../../src/ui/Notice';
import { Screen } from '../../src/ui/Screen';
import { Skeleton, SkeletonBlock } from '../../src/ui/Skeleton';
import { colors, radius, space } from '../../src/ui/theme';

/**
 * Partida. O papel deste aparelho vem do servidor: quem está em match_players joga
 * (com mão privada); o table_user_id da partida vê a mesa central, sem mão.
 */
export default function Game() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { userId } = useAuth();
  const { match, hand, players, role, loaded, notFound, connection, refresh, applyResult, applyAutoCard } = useMatch(
    matchId,
    userId,
  );

  const clock = useServerClock();
  const startsAt = match?.state.startsAt;
  useRerenderAt(clock.calibrated && startsAt ? [startsAt-2000-clock.offset,startsAt-1000-clock.offset,startsAt-clock.offset] : []);
  const startRank = clock.calibrated ? startCardAt(startsAt,Date.now()+clock.offset) : null;

  if (!loaded) {
    return <GameLoading reconnecting={connection === 'reconnecting'} retry={refresh} />;
  }

  if (notFound || !match || !role) {
    return (
      <Screen title="Partida indisponível" onBack={() => router.replace('/')}>
        <Notice kind="info" message="Esta partida não existe ou você não participa dela." />
      </Screen>
    );
  }

  if (startsAt && !clock.calibrated) {
    return <GameLoading reconnecting retry={async () => { await Promise.all([refresh(), clock.sync()]); }} />;
  }

  if (startRank) return <StartTransition rank={startRank} />;

  if (role === 'spectator') {
    return <TableGame match={match} players={players} connection={connection} spectator onExit={async home => { await leaveSpectator(match.matchId); router.replace(home ? '/' : '/room/join'); }} />;
  }

  if (role === 'table') {
    return <TableGame match={match} players={players} connection={connection} />;
  }

  const mySeat = hand?.seat ?? players.find((p) => p.userId === userId)?.seat;
  if (!mySeat) {
    return <GameLoading reconnecting={connection === 'reconnecting'} retry={refresh} />;
  }

  return (
    <PlayerGame
      match={match}
      hand={hand}
      players={players}
      mySeat={mySeat}
      connection={connection}
      refresh={refresh}
      applyResult={applyResult}
      applyAutoCard={applyAutoCard}
    />
  );
}

function GameLoading({ reconnecting, retry }: { reconnecting: boolean; retry: () => Promise<void> }) {
  return (
    <Screen maxWidth={960}>
      <Skeleton label="Carregando partida" style={styles.loading}>
        <View style={styles.score}>
          <SkeletonBlock width="36%" height={64} />
          <SkeletonBlock width="36%" height={64} />
        </View>
        <SkeletonBlock width="45%" height={18} style={{ alignSelf: 'center' }} />
        <SkeletonBlock height={240} style={{ borderRadius: 72, backgroundColor: colors.surfaceRaised, marginVertical: space.md }} />
        <SkeletonBlock width="70%" height={24} style={{ alignSelf: 'center' }} />
        <SkeletonBlock height={88} style={{ borderRadius: radius.md }} />
      </Skeleton>
      {reconnecting ? <>
        <Notice kind="info" message="Não foi possível carregar a partida. Tentando reconectar..." />
        <Button label="Tentar novamente" variant="secondary" onPress={() => void retry()} />
      </> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { width: '100%', maxWidth: 900, alignSelf: 'center', marginVertical: 'auto' },
  score: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
});
