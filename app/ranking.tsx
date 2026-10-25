import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/auth/AuthProvider';
import type { GameMode, Ranking } from '../src/contracts/types';
import { errorMessage } from '../src/lib/errors';
import { fetchRankings } from '../src/ranking/api';
import { EloBadge } from '../src/ranking/EloBadge';
import { eloForMmr } from '../src/ranking/elo';
import { Button } from '../src/ui/Button';
import { Notice } from '../src/ui/Notice';
import { Panel } from '../src/ui/Panel';
import { Screen } from '../src/ui/Screen';
import { Skeleton, SkeletonBlock } from '../src/ui/Skeleton';
import { colors, font, fonts, space } from '../src/ui/theme';

export default function RankingScreen() {
  const { userId } = useAuth();
  const [gameMode, setGameMode] = useState<GameMode>('1v1');
  const key = `${userId}:${gameMode}`;
  const [result, setResult] = useState<{ key: string; ranking: Ranking | null; loading: boolean; error: string | null }>({ key, ranking: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setResult((current) => ({ key, ranking: current.key === key ? current.ranking : null, loading: true, error: null }));
    fetchRankings(gameMode)
      .then((ranking) => { if (active) setResult({ key, ranking, loading: false, error: null }); })
      .catch((e) => {
        if (active) setResult((current) => ({ key, ranking: current.key === key ? current.ranking : null, loading: false, error: errorMessage(e) }));
      });
    return () => { active = false; };
  }, [key, gameMode, attempt]));

  const ranking = result.key === key ? result.ranking : null;
  const loading = result.key !== key || result.loading;
  const error = result.key === key ? result.error : null;
  const mine = ranking?.myEntry;

  return (
    <Screen title="Ranking" maxWidth={840}>
      <View style={styles.modes}>
        {(['1v1', '2v2'] as GameMode[]).map((mode) => (
          <Button
            key={mode}
            label={mode === '1v1' ? '1v1: Duelo' : '2v2: Duplas'}
            variant={gameMode === mode ? 'gold' : 'secondary'}
            style={styles.flex}
            onPress={() => setGameMode(mode)}
          />
        ))}
      </View>
      {loading && !ranking ? <Skeleton label="Carregando ranking">
        <Panel tone="accent">
          <SkeletonBlock width="62%" height={28} />
          <View style={styles.row}>
            <SkeletonBlock width={48} height={34} />
            <View style={[styles.eloRow, styles.skeletonElo]}><SkeletonBlock width={64} height={64} /><SkeletonBlock width="50%" height={34} /></View>
          </View>
          <SkeletonBlock width="48%" height={22} />
          <SkeletonBlock width="82%" height={18} />
        </Panel>
        <SkeletonBlock width="66%" height={28} />
        {[0, 1, 2].map((row) => <Panel key={row}>
          <View style={styles.row}>
            <SkeletonBlock width={48} height={30} />
            <View style={[styles.eloRow, styles.skeletonElo]}><SkeletonBlock width={44} height={44} /><SkeletonBlock width="52%" height={25} /></View>
          </View>
          <SkeletonBlock width="48%" height={22} />
          <SkeletonBlock width="82%" height={18} />
        </Panel>)}
      </Skeleton> : null}
      <Notice kind="error" message={error} />
      {error ? <Button label="Tentar novamente" variant="dark" onPress={() => setAttempt((n) => n + 1)} /> : null}

      {ranking ? (
        <>
          <Panel tone="accent">
            <Text style={styles.section} accessibilityRole="header">Minha classificação · {gameMode}</Text>
            {mine ? (
              <>
                <View style={styles.row}>
                  <Text style={styles.position}>#{mine.position}</Text>
                  <View style={styles.eloRow}>
                    <EloBadge points={mine.points} size={64} />
                    <Text style={[styles.myPoints, styles.eloText]}>{mine.points < 500 ? 'Anterior à V2' : eloForMmr(mine.points)} · {mine.points} MMR</Text>
                  </View>
                </View>
                <Text style={styles.name}>{mine.displayName}</Text>
                <Text style={styles.meta}>{mine.played} partidas · {mine.wins} vitórias · {mine.losses} derrotas</Text>
              </>
            ) : (
              <>
                <View style={styles.eloRow}>
                  <EloBadge points={500} size={64} />
                  <Text style={[styles.myPoints, styles.eloText]}>Beta 1 · 500 MMR</Text>
                </View>
                <Text style={styles.meta}>0 partidas · sem posição. Conclua uma partida de {gameMode} para entrar neste ranking.</Text>
              </>
            )}
          </Panel>

          <Text style={styles.section} accessibilityRole="header">Primeiros 50 jogadores · {gameMode}</Text>
          {ranking.entries.length === 0 ? <Text style={styles.meta}>Ninguém concluiu uma partida neste ranking ainda.</Text> : null}
          {ranking.entries.map((entry) => {
            const own = entry.userId === mine?.userId;
            return (
              <Panel key={entry.userId} tone={own ? 'accent' : 'default'}>
                <View style={styles.row}>
                  <Text style={styles.position}>#{entry.position}</Text>
                  <View style={styles.eloRow}>
                    <EloBadge points={entry.points} />
                    <Text style={[styles.points, styles.eloText]}>{entry.points < 500 ? 'Anterior à V2' : eloForMmr(entry.points)} · {entry.points} MMR</Text>
                  </View>
                </View>
                <Text style={styles.name}>{entry.displayName}{own ? ' (você)' : ''}</Text>
                <Text style={styles.meta}>{entry.played} partidas · {entry.wins} vitórias · {entry.losses} derrotas</Text>
              </Panel>
            );
          })}
          <Button label="Atualizar ranking" variant="secondary" loading={loading} onPress={() => setAttempt((n) => n + 1)} />
        </>
      ) : null}
      <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  section: { fontFamily: fonts.display, fontSize: font.large, lineHeight: 30, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm },
  eloRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1, minWidth: 0, maxWidth: '100%' },
  eloText: { flexShrink: 1, minWidth: 0 },
  skeletonElo: { flex: 1, justifyContent: 'flex-end' },
  position: { fontFamily: fonts.display, fontSize: font.title, color: colors.goldSoft },
  myPoints: { fontFamily: fonts.display, fontSize: font.title, color: colors.goldSoft },
  points: { fontSize: font.large, fontWeight: '800', color: colors.text },
  name: { fontSize: font.body, lineHeight: 25, fontWeight: '700', color: colors.text, flexShrink: 1 },
  meta: { fontSize: font.small, lineHeight: 22, color: colors.textMuted },
});
