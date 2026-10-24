import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { GameMode, Ranking } from '../src/contracts/types';
import { errorMessage } from '../src/lib/errors';
import { fetchRankings } from '../src/ranking/api';
import { eloForMmr } from '../src/ranking/elo';
import { Button } from '../src/ui/Button';
import { Notice } from '../src/ui/Notice';
import { Panel } from '../src/ui/Panel';
import { Screen } from '../src/ui/Screen';
import { colors, font, fonts, space } from '../src/ui/theme';

export default function RankingScreen() {
  const [gameMode, setGameMode] = useState<GameMode>('1v1');
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setRanking(null);
    fetchRankings(gameMode)
      .then((next) => { if (active) setRanking(next); })
      .catch((e) => { if (active) setError(errorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gameMode, attempt]));

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
      {loading ? <ActivityIndicator size="large" color={colors.gold} accessibilityLabel="Carregando ranking" /> : null}
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
                  <Text style={styles.myPoints}>{mine.points < 500 ? 'Anterior à V2' : eloForMmr(mine.points)} · {mine.points} MMR</Text>
                </View>
                <Text style={styles.name}>{mine.displayName}</Text>
                <Text style={styles.meta}>{mine.played} partidas · {mine.wins} vitórias · {mine.losses} derrotas</Text>
              </>
            ) : (
              <>
                <Text style={styles.myPoints}>Beta 1 · 500 MMR</Text>
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
                  <Text style={styles.points}>{entry.points < 500 ? 'Anterior à V2' : eloForMmr(entry.points)} · {entry.points} MMR</Text>
                </View>
                <Text style={styles.name}>{entry.displayName}{own ? ' (você)' : ''}</Text>
                <Text style={styles.meta}>{entry.played} partidas · {entry.wins} vitórias · {entry.losses} derrotas</Text>
              </Panel>
            );
          })}
          <Button label="Atualizar ranking" variant="secondary" onPress={() => setAttempt((n) => n + 1)} />
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
  position: { fontFamily: fonts.display, fontSize: font.title, color: colors.goldSoft },
  myPoints: { fontFamily: fonts.display, fontSize: font.title, color: colors.goldSoft },
  points: { fontSize: font.large, fontWeight: '800', color: colors.text },
  name: { fontSize: font.body, lineHeight: 25, fontWeight: '700', color: colors.text, flexShrink: 1 },
  meta: { fontSize: font.small, lineHeight: 22, color: colors.textMuted },
});
