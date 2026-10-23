import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import type { MatchNote, MatchSummary } from '../../src/contracts/types';
import { deleteNote, fetchMyMatches, listNotes } from '../../src/history/api';
import { errorMessage } from '../../src/lib/errors';
import { Button } from '../../src/ui/Button';
import { Notice } from '../../src/ui/Notice';
import { Panel } from '../../src/ui/Panel';
import { Screen } from '../../src/ui/Screen';
import { colors, font, fonts, space } from '../../src/ui/theme';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function History() {
  const { userId } = useAuth();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [notes, setNotes] = useState<MatchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {
      const [m, n] = await Promise.all([fetchMyMatches(userId), listNotes()]);
      setMatches(m);
      setNotes(n);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // READ: recarrega sempre que a tela volta ao foco (depois de criar ou editar).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmDelete(note: MatchNote) {
    const removeNote = async () => {
      try {
        await deleteNote(note.id);
        setInfo('Nota excluída.');
        await load();
      } catch (e) {
        setError(errorMessage(e));
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Excluir nota?\n"${note.title}" será apagada. Não dá para desfazer.`)) void removeNote();
      return;
    }
    Alert.alert('Excluir nota?', `"${note.title}" será apagada. Não dá para desfazer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: removeNote,
      },
    ]);
  }

  const matchById = new Map(matches.map((m) => [m.id, m]));

  return (
    <Screen title="Histórico" subtitle="Suas partidas e as notas que você escreveu.">
      <Notice kind="error" message={error} />
      <Notice kind="success" message={info} />

      <Text style={styles.section} accessibilityRole="header">
        Minhas notas
      </Text>
      {!loading && notes.length === 0 ? (
        <Text style={styles.empty}>Nenhuma nota ainda. Crie uma a partir de uma partida abaixo.</Text>
      ) : null}
      {notes.map((note) => {
        const match = matchById.get(note.matchId);
        return (
          <Panel key={note.id}>
            <Text style={styles.cardTitle}>{note.title}</Text>
            {note.notes ? <Text style={styles.cardBody}>{note.notes}</Text> : null}
            <Text style={styles.meta}>
              {match ? `Partida de ${formatDate(match.startedAt)} · ` : ''}editada {formatDate(note.updatedAt)}
            </Text>
            <View style={styles.row}>
              <Button
                label="Editar"
                variant="dark"
                size="compact"
                style={styles.flex}
                onPress={() => router.push({ pathname: '/history/note', params: { id: note.id } })}
              />
              <Button label="Excluir" variant="secondary" size="compact" style={styles.flex} onPress={() => confirmDelete(note)} />
            </View>
          </Panel>
        );
      })}

      <Text style={styles.section} accessibilityRole="header">
        Minhas partidas
      </Text>
      {!loading && matches.length === 0 ? <Text style={styles.empty}>Você ainda não jogou nenhuma partida.</Text> : null}
      {matches.map((match) => {
        const mine = match.myTeam === 'A' ? match.scoreA : match.scoreB;
        const theirs = match.myTeam === 'A' ? match.scoreB : match.scoreA;
        const result =
          match.status === 'playing' ? 'Em andamento' : match.winnerTeam === match.myTeam ? 'Vitória' : 'Derrota';
        return (
          <Panel key={match.id} tone={result === 'Vitória' ? 'accent' : 'default'}>
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, result === 'Vitória' && styles.win]}>{result}</Text>
              <Text style={styles.score}>
                Nós {mine} × {theirs} Eles
              </Text>
            </View>
            <Text style={styles.meta}>{formatDate(match.startedAt)}</Text>
            <Button
              label="Nova nota"
              variant="secondary"
              size="compact"
              onPress={() => router.push({ pathname: '/history/note', params: { matchId: match.id } })}
            />
          </Panel>
        );
      })}

      <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.display, fontSize: font.large, lineHeight: 30, color: colors.text, marginTop: space.sm },
  empty: { fontSize: font.body - 1, color: colors.textMuted },
  cardTitle: { fontSize: font.large - 2, fontWeight: '800', color: colors.text },
  win: { color: colors.goldSoft },
  score: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: font.large - 2, color: colors.text },
  cardBody: { fontSize: font.body - 1, lineHeight: 24, color: colors.text },
  meta: { fontSize: font.small - 1, color: colors.textFaint },
  row: { flexDirection: 'row', gap: space.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm },
  flex: { flex: 1 },
});
