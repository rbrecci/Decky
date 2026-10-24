import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchPlayer, MatchView, Seat } from '../contracts/types';
import type { ConnectionStatus } from '../lib/useLiveRefresh';
import { useScreenAwake } from '../lib/useScreenAwake';
import { colors, font, space } from '../ui/theme';
import { FinishedOverlay } from './components/FinishedOverlay';
import { ScoreBar } from './components/ScoreBar';
import { ConnectionBanner, StatusBanner } from './components/StatusBanner';
import { TableBoard } from './components/TableBoard';
import { statusText } from './status';
import { useDealAnimation } from './useDealAnimation';
import { useServerClock } from './useServerClock';
import { useTableCue } from './useTableCue';

interface Props {
  match: MatchView;
  players: MatchPlayer[];
  connection: ConnectionStatus;
  /** Relógio do servidor. Padrão: server_now. A fixture usa o relógio do próprio aparelho. */
  fetchNow?: () => Promise<number>;
}

/**
 * Modo mesa: o celular do dono vira a mesa central, só com informações públicas.
 * Não tem mão nem botões de jogo; o servidor recusa ações deste aparelho.
 */
export function TableGame({ match, players, connection, fetchNow }: Props) {
  // Só mostra o prazo; quem pede a expiração são os jogadores (a mesa não joga).
  const clock = useServerClock(fetchNow);
  useScreenAwake();
  const insets = useSafeAreaInsets();
  // Placar e banner grandes só em aparelho alto: no celular baixo eles roubavam a altura da mesa
  // e as cartas caíam para o tamanho mínimo.
  const { height, fontScale } = useWindowDimensions();
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const roomy = height >= 720;
  const state = match.state;
  const deal = useDealAnimation(match.matchId, state);
  const cue = useTableCue(match, connection);
  const nameOf = (seat: Seat) => players.find((p) => p.seat === seat)?.displayName ?? `Lugar ${seat}`;

  const leaveTable = useCallback(() => {
    if (Platform.OS === 'web') {
      if (window.confirm('Sair da mesa?\nA partida continua nos celulares dos jogadores. Você pode abrir a mesa de novo pela sala.')) router.replace('/');
      return;
    }
    Alert.alert('Sair da mesa?', 'A partida continua nos celulares dos jogadores. Você pode abrir a mesa de novo pela sala.', [
      { text: 'Ficar', style: 'cancel' },
      { text: 'Sair', onPress: () => router.replace('/') },
    ]);
  }, []);

  return (
    <View
      onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom + space.xs,
          paddingLeft: insets.left + space.sm,
          paddingRight: insets.right + space.sm,
        },
      ]}
    >
      <ScrollView contentContainerStyle={[styles.content, { minHeight: Math.max((viewportHeight ?? height) - insets.top - insets.bottom, 600 * Math.min(fontScale, 1.6)) }]}>
      <ScoreBar state={state} viewerTeam={null} players={players} large={roomy} onLeave={leaveTable} />
      <ConnectionBanner status={connection} />
      <StatusBanner status={statusText({ state, viewerSeat: null, nameOf, canRespond: false, phase: deal.phase })} large={roomy} />
      <TableBoard state={state} players={players} bottomSeat={1} viewerSeat={null} deal={deal} variant="large" cue={cue} clockOffset={clock.offset} />
      <Text style={styles.footer} numberOfLines={1}>
        Mesa{match.roomCode ? ` · sala ${match.roomCode}` : ''} · mostra só o que é público
      </Text>
      </ScrollView>

      {state.status === 'finished' ? (
        <FinishedOverlay
          state={state}
          viewerTeam={null}
          onRoom={() => router.replace(match.roomCode ? `/room/${match.roomCode}` : '/')}
          onHome={() => router.replace('/')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, gap: space.sm },
  content: { flexGrow: 1, width: '100%', maxWidth: 1800, alignSelf: 'center', gap: space.sm, paddingBottom: space.md },
  footer: { color: colors.textFaint, fontSize: font.small - 3, letterSpacing: 0.6, textAlign: 'center' },
});
