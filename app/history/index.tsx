import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import type { MatchNote, MatchSummary } from '../../src/contracts/types';
import { deleteNote, fetchMyMatches, listNotes } from '../../src/history/api';
import { errorMessage } from '../../src/lib/errors';
import { Dialog } from '../../src/ui/Dialog';
import { Button } from '../../src/ui/Button';
import { Notice } from '../../src/ui/Notice';
import { Panel } from '../../src/ui/Panel';
import { Screen } from '../../src/ui/Screen';
import { SkeletonCards } from '../../src/ui/Skeleton';
import { usePagedList } from '../../src/ui/usePagedList';
import { colors, font, fonts, space } from '../../src/ui/theme';

const formatDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function History() {
  const { userId } = useAuth();
  const matches = usePagedList(userId ?? '', fetchMyMatches);
  const notes = usePagedList(userId ?? '', listNotes);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MatchNote | null>(null);
  const deletePending = useRef(false);

  function confirmDelete(note: MatchNote) { setError(null); setDeleteTarget(note); }
  async function removeNote() {
    if (!deleteTarget || deletePending.current) return;
    deletePending.current = true; setDeleting(true); setError(null);
    try { await deleteNote(deleteTarget.id); setDeleteTarget(null); await notes.refresh(); }
    catch (e) { setError(errorMessage(e)); }
    finally { deletePending.current = false; setDeleting(false); }
  }

  return (
    <Screen title="Histórico" maxWidth={1000} onBack={() => router.canGoBack() ? router.back() : router.replace('/')}>
      <Dialog open={!!deleteTarget} title="Excluir nota?" message={deleteTarget ? 'A nota "' + deleteTarget.title + '" será apagada. Não dá para desfazer.' : undefined}
        confirmLabel="Excluir" busy={deleting} error={error} onCancel={() => setDeleteTarget(null)} onConfirm={removeNote} />
      <Notice kind="error" message={error} />
      <Text style={styles.section} accessibilityRole="header">Minhas notas</Text>
      {notes.initialLoading ? <SkeletonCards label="Carregando notas" count={5} /> : null}
      <Notice kind="error" message={notes.error} />
      <Button label={notes.error ? 'Tentar carregar notas novamente' : 'Atualizar notas'} variant={notes.error ? 'dark' : 'secondary'} loading={notes.refreshing} disabled={notes.initialLoading || deleting} onPress={() => void notes.refresh()} />
      {!notes.initialLoading && !notes.error && notes.rows.length === 0 ? <Text style={styles.empty}>Nenhuma nota ainda. Crie uma a partir de uma partida abaixo.</Text> : null}
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
      {matches.initialLoading ? <SkeletonCards label="Carregando partidas" count={5} /> : null}
      <Notice kind="error" message={matches.error} />
      <Button label={matches.error ? 'Tentar carregar partidas novamente' : 'Atualizar partidas'} variant={matches.error ? 'dark' : 'secondary'} loading={matches.refreshing} disabled={matches.initialLoading} onPress={() => void matches.refresh()} />
      {!matches.initialLoading && !matches.error && matches.rows.length === 0 ? <Text style={styles.empty}>Você ainda não jogou nenhuma partida.</Text> : null}
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

const styles = StyleSheet.create({
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
});
