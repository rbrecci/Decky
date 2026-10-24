import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import type { MatchNote, MatchSummary } from '../../src/contracts/types';
import { deleteNote, fetchMyMatches, listNotes } from '../../src/history/api';
import { errorMessage } from '../../src/lib/errors';
import { Button } from '../../src/ui/Button';
import { Notice } from '../../src/ui/Notice';
import { RuledTitle } from '../../src/ui/Ornament';
import { Panel } from '../../src/ui/Panel';
import { Screen } from '../../src/ui/Screen';
import { usePagedList } from '../../src/ui/usePagedList';
import { colors, font, fonts, radius, space } from '../../src/ui/theme';

const formatDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function History() {
  const { userId } = useAuth();
  const matches = usePagedList(userId ?? '', fetchMyMatches);
  const notes = usePagedList(userId ?? '', listNotes);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function confirmDelete(note: MatchNote) {
    const removeNote = async () => {
      setDeleting(true); setError(null);
      try { await deleteNote(note.id); await notes.refresh(); }
      catch (e) { setError(errorMessage(e)); }
      finally { setDeleting(false); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Excluir nota?\n"${note.title}" será apagada. Não dá para desfazer.`)) void removeNote();
      return;
    }
    Alert.alert('Excluir nota?', `"${note.title}" será apagada. Não dá para desfazer.`, [
      { text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: removeNote },
    ]);
  }

  return (
    <Screen maxWidth={1000} fixedHeader={<View style={styles.header}>
      <RuledTitle style={styles.title}>Histórico</RuledTitle>
      <Button label="Voltar" variant="ghost" size="compact" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
    </View>}>
      <Notice kind="error" message={error} />
      <Text style={styles.section} accessibilityRole="header">Minhas notas</Text>
      {notes.loading ? <SkeletonCards label="Carregando notas" /> : null}
      <Notice kind="error" message={notes.error} />
      {notes.error ? <Button label="Tentar carregar notas novamente" variant="dark" onPress={() => void notes.refresh()} /> : null}
      {!notes.loading && !notes.error && notes.rows.length === 0 ? <Text style={styles.empty}>Nenhuma nota ainda. Crie uma a partir de uma partida abaixo.</Text> : null}
      {notes.rows.map((note) => <Panel key={note.id}>
        <Text style={styles.cardTitle}>{note.title}</Text>
        {note.notes ? <Text style={styles.cardBody}>{note.notes}</Text> : null}
        <Text style={styles.meta}>{note.match ? `Partida de ${formatDate(note.match.startedAt)} · ${note.match.gameMode} · ` : ''}editada {formatDate(note.updatedAt)}</Text>
        <View style={styles.row}>
          <Button label="Editar" variant="dark" size="compact" style={styles.flex} disabled={deleting} onPress={() => router.push({ pathname: '/history/note', params: { id: note.id } })} />
          <Button label="Excluir" variant="secondary" size="compact" style={styles.flex} disabled={deleting} onPress={() => confirmDelete(note)} />
        </View>
      </Panel>)}
      <Pagination page={notes.page} hasNext={notes.hasNext} loading={notes.loading || deleting} go={notes.go} label="notas" />

      <Text style={styles.section} accessibilityRole="header">Partidas</Text>
      {matches.loading ? <SkeletonCards label="Carregando partidas" /> : null}
      <Notice kind="error" message={matches.error} />
      {matches.error ? <Button label="Tentar carregar partidas novamente" variant="dark" onPress={() => void matches.refresh()} /> : null}
      {!matches.loading && !matches.error && matches.rows.length === 0 ? <Text style={styles.empty}>Você ainda não jogou nenhuma partida.</Text> : null}
      {matches.rows.map((match) => <MatchCard key={match.id} match={match} />)}
      <Pagination page={matches.page} hasNext={matches.hasNext} loading={matches.loading} go={matches.go} label="partidas" />
    </Screen>
  );
}

function MatchCard({ match }: { match: MatchSummary }) {
  const mine = match.myTeam === 'A' ? match.scoreA : match.scoreB;
  const theirs = match.myTeam === 'A' ? match.scoreB : match.scoreA;
  const result = match.status === 'playing' ? 'Em andamento' : match.winnerTeam === match.myTeam ? 'Vitória' : 'Derrota';
  const myPlayers = match.players.filter((p) => p.team === match.myTeam).map((p) => p.displayName).join(' e ');
  const opponents = match.players.filter((p) => p.team !== match.myTeam).map((p) => p.displayName).join(' e ');
  return <Panel tone={result === 'Vitória' ? 'accent' : 'default'}>
    <Text style={styles.meta}>{match.gameMode} · {match.ranked ? match.ratingRule === null ? 'Ranqueada anterior à V2' : 'Ranqueada' : 'Anterior ao ranking'}</Text>
    <View style={styles.rowBetween}>
      <Text style={[styles.cardTitle, result === 'Vitória' && styles.win]}>{result}</Text>
      <Text style={styles.score}>{match.gameMode === '1v1' ? 'Você' : 'Sua dupla'} {mine} × {theirs}</Text>
    </View>
    <Text style={styles.cardBody}>{match.gameMode === '1v1' ? 'Você' : 'Sua dupla'}: {myPlayers}</Text>
    <Text style={styles.cardBody}>{match.gameMode === '1v1' ? 'Adversário' : 'Adversários'}: {opponents}</Text>
    <Text style={styles.meta}>Início: {formatDate(match.startedAt)}</Text>
    {match.endedAt ? <Text style={styles.meta}>Fim: {formatDate(match.endedAt)}</Text> : null}
    {match.pointsBefore != null ? <Text style={styles.meta}>MMR antes da partida: {match.pointsBefore}</Text> : null}
    {match.ranked ? match.pointsDelta !== null && match.pointsAfter !== null ? <Text style={match.pointsDelta > 0 ? styles.win : styles.meta}>
      Variação de MMR: {match.pointsDelta > 0 ? '+' : ''}{match.pointsDelta} · MMR após a partida: {match.pointsAfter}
    </Text> : <Text style={styles.meta}>{match.status === 'playing' ? 'MMR calculado ao concluir a partida.' : 'MMR não disponível.'}</Text> : <Text style={styles.meta}>Não altera o ranking.</Text>}
    <Button label="Nova nota" variant="secondary" size="compact" onPress={() => router.push({ pathname: '/history/note', params: { matchId: match.id } })} />
  </Panel>;
}

function Pagination({ page, hasNext, loading, go, label }: { page: number; hasNext: boolean; loading: boolean; go: (page: number) => void; label: string }) {
  return <View style={styles.pagination} accessibilityLabel={`Paginação de ${label}`}>
    <Button label="Anterior" size="compact" variant="secondary" disabled={loading || page === 1} onPress={() => go(page - 1)} />
    <Text style={styles.meta} accessibilityLiveRegion="polite">Página {page}</Text>
    <Button label="Próxima" size="compact" variant="secondary" disabled={loading || !hasNext} onPress={() => go(page + 1)} />
  </View>;
}

function SkeletonCards({ label }: { label: string }) {
  return <View accessibilityLabel={label} accessibilityRole="progressbar" accessibilityState={{ busy: true }} style={{ gap: space.md }}>
    {[0, 1, 2, 3, 4].map((n) => <View key={n} style={styles.skeleton} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.skeletonLine, { width: '60%' }]} /><View style={styles.skeletonLine} /><View style={[styles.skeletonLine, { width: '40%' }]} />
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 40, color: colors.text },
  section: { fontFamily: fonts.display, fontSize: font.large, lineHeight: 30, color: colors.text, marginTop: space.sm },
  empty: { fontSize: font.body - 1, color: colors.textMuted },
  cardTitle: { fontSize: font.large - 2, fontWeight: '800', color: colors.text },
  win: { color: colors.goldSoft },
  score: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: font.large - 2, color: colors.text },
  cardBody: { fontSize: font.body - 1, lineHeight: 24, color: colors.text },
  meta: { fontSize: font.small - 1, color: colors.textMuted },
  row: { flexDirection: 'row', gap: space.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm },
  flex: { flex: 1 },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: space.sm },
  skeleton: { minHeight: 170, padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, gap: space.md, backgroundColor: colors.surface },
  skeletonLine: { height: 18, borderRadius: 5, backgroundColor: colors.line, width: '90%' },
});
