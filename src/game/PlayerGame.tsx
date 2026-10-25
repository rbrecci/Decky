import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLegalActions } from '../../supabase/functions/_shared/engine/game.ts';
import type {
  ActionDeadline,
  AutoCardResult,
  Card,
  GameAction,
  GameResult,
  MatchPlayer,
  MatchView,
  PrivateHand,
  Seat,
} from '../contracts/types';
import { errorMessage } from '../lib/errors';
import type { ConnectionStatus } from '../lib/useLiveRefresh';
import { useScreenAwake } from '../lib/useScreenAwake';
import { colors, space } from '../ui/theme';
import { setMyAutoCard, submitAction } from './api';
import { expireActionId } from './deadline';
import { useDeadlineExpiry } from './useDeadlineExpiry';
import { useServerClock } from './useServerClock';
import { FinishedOverlay } from './components/FinishedOverlay';
import { HandPanel } from './components/HandPanel';
import { PlayerHud } from './components/PlayerHud';
import { ScoreBar } from './components/ScoreBar';
import { ConnectionBanner, StatusBanner } from './components/StatusBanner';
import { TableBoard } from './components/TableBoard';
import { proposalNote, seatTeam } from './describe';
import { playerLayout } from './role';
import { statusText } from './status';
import { useDealAnimation } from './useDealAnimation';
import { useTableCue } from './useTableCue';

interface Props {
  match: MatchView;
  hand: PrivateHand | null;
  players: MatchPlayer[];
  mySeat: Seat;
  connection: ConnectionStatus;
  refresh: () => Promise<void>;
  /**
   * Aplica na hora o estado e a mão que o servidor devolveu para a ação deste aparelho (ver `useMatch`).
   * Devolve false quando a resposta não trouxe estado; aí a tela relê. Ausente na fixture.
   */
  applyResult?: (result: GameResult) => boolean;
  /** Envio da ação. Padrão: a Edge Function submit-action. A fixture de desenvolvimento injeta um simulador local. */
  submit?: (matchId: string, action: GameAction, expectedRevision: number, clientActionId?: string) => Promise<GameResult>;
  /** Marca a jogada automática. Padrão: set_my_auto_card. A fixture injeta o simulador local. */
  setAutoCard?: (matchId: string, card: Card | null) => Promise<AutoCardResult>;
  /** Aplica a marcação confirmada na mão (ver `useMatch`). Ausente na fixture, que já redesenha sozinha. */
  applyAutoCard?: (card: Card | null) => void;
  /** Relógio do servidor. Padrão: server_now. A fixture usa o relógio do próprio aparelho. */
  fetchNow?: () => Promise<number>;
}

/**
 * Tela do jogador. A mão privada e os controles ficam sempre embaixo; o que vai em cima depende do modo:
 * - sem mesa dedicada: a mesa pública completa (TableBoard);
 * - com mesa dedicada: só o essencial público (PlayerHud). A mesa completa fica no aparelho da mesa.
 */
export function PlayerGame({
  match,
  hand,
  players,
  mySeat,
  connection,
  refresh,
  applyResult,
  submit = submitAction,
  setAutoCard = setMyAutoCard,
  applyAutoCard,
  fetchNow,
}: Props) {
  useScreenAwake();
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [handHeight, setHandHeight] = useState(320);
  const [scoreHeight, setScoreHeight] = useState(0);
  const wide = width >= 1000;
  const availableHeight = (viewportHeight ?? height) - insets.top - insets.bottom - scoreHeight;
  const topHeight = Math.max(0, 350 * Math.min(fontScale, 1.6) - scoreHeight, wide ? availableHeight - space.md * 2 : availableHeight - handHeight);
  const state = match.state;
  const deal = useDealAnimation(match.matchId, state);
  const cue = useTableCue(match, connection);
  const clock = useServerClock(fetchNow);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Trava síncrona: dois toques rápidos não chegam a enviar duas ações.
  const sending = useRef(false);
  const revision = useRef(match.revision);
  revision.current = match.revision;

  // Marcação em envio: aparece na hora e volta atrás se o servidor recusar.
  const [pendingAuto, setPendingAuto] = useState<{ card: Card | null } | null>(null);
  const autoCard = pendingAuto ? pendingAuto.card : (hand?.autoCard ?? null);

  async function chooseAutoCard(card: Card | null) {
    setPendingAuto({ card });
    try {
      const result = await setAutoCard(match.matchId, card);
      if (result.ok) applyAutoCard?.(result.autoCard);
      else setError(errorMessage(result.error));
    } finally {
      setPendingAuto(null);
    }
  }

  // Prazo vencido: este aparelho só avisa o servidor, que confere no relógio dele e aplica a regra.
  // Conflito ou "cedo demais" (outro aparelho chegou antes) não viram erro: só relê.
  const expire = useCallback(
    async (deadline: ActionDeadline) => {
      const result = await submit(match.matchId, { type: 'expire', at: deadline.at }, revision.current, expireActionId(deadline, mySeat));
      if (!applyResult?.(result)) await refresh();
    },
    [submit, match.matchId, mySeat, applyResult, refresh],
  );
  useDeadlineExpiry(state.status === 'playing' ? state.deadline : null, mySeat, clock.offset, expire);

  const layout = playerLayout(match);
  const myTeam = seatTeam(mySeat);
  const legal = useMemo(() => getLegalActions(state, mySeat), [state, mySeat]);
  const nameOf = (seat: Seat) =>
    seat === mySeat ? 'Você' : players.find((p) => p.seat === seat)?.displayName ?? `Lugar ${seat}`;

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 4500);
    return () => clearTimeout(timer);
  }, [error]);

  async function act(key: string, action: GameAction) {
    if (sending.current) return;
    sending.current = true;
    setBusy(key);
    setError(null);
    try {
      // O servidor valida vez, carta e truco; aqui só vai a intenção com a revisão que este aparelho viu.
      const sentAt = Date.now();
      const result = await submit(match.matchId, action, match.revision);
      if (result.ok && result.serverNow) clock.observe(result.serverNow, sentAt, Date.now());
      if (!result.ok) setError(errorMessage(result.error));
      // Com o estado na resposta, a tela de quem agiu atualiza sem esperar mais duas leituras.
      // Sem ele (erro, conflito, ação repetida), relê: o servidor continua sendo a fonte da verdade.
      if (!applyResult?.(result)) await refresh();
    } finally {
      sending.current = false;
      setBusy(null);
    }
  }

  // Estável: o placar (memo) não redesenha a cada toque na mão.
  const leaveTable = useCallback(() => {
    if (Platform.OS === 'web') {
      if (window.confirm('Sair da mesa?\nA partida continua. Para voltar, abra a sala de novo pelo código.')) router.replace('/');
      return;
    }
    Alert.alert('Sair da mesa?', 'A partida continua. Para voltar, abra a sala de novo pelo código.', [
      { text: 'Ficar', style: 'cancel' },
      { text: 'Sair', onPress: () => router.replace('/') },
    ]);
  }, []);

  return (
    <View onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)} style={[styles.screen, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View onLayout={(event) => setScoreHeight(event.nativeEvent.layout.height)} style={styles.fixedScore}>
        <ScoreBar state={state} viewerTeam={myTeam} players={players} large={false} onLeave={leaveTable} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.game, { minHeight: Math.max(availableHeight, 640 * Math.min(fontScale, 1.6) - scoreHeight) }, wide && styles.wide]}>
      <View style={[styles.top, { height: topHeight, flexGrow: wide ? 1 : 0 }]}>
        <ConnectionBanner status={connection} />
        {layout === 'split' ? (
          <TableBoard
            state={state}
            players={players}
            bottomSeat={mySeat}
            viewerSeat={mySeat}
            deal={deal}
            variant="compact"
            cue={cue}
            clockOffset={clock.offset}
            ownCovered={hand?.covered ?? null}
          />
        ) : (
          <PlayerHud state={state} players={players} mySeat={mySeat} deal={deal} cue={cue} />
        )}
        <StatusBanner
          status={statusText({ state, viewerSeat: mySeat, nameOf, canRespond: legal.respondTruco, phase: deal.phase })}
          large={false}
        />
      </View>

      <View onLayout={(event) => { if (!wide) setHandHeight(event.nativeEvent.layout.height); }} style={[styles.handArea, wide && styles.handAreaWide]}>
      <HandPanel
        state={state}
        hand={hand}
        mySeat={mySeat}
        legal={legal}
        deal={deal}
        busy={busy}
        error={error}
        // Mostrado junto com a fala na mesa ("Não!"), pelo mesmo tempo, e só na revisão que a gerou.
        note={cue && cue.revision === match.revision ? proposalNote(state.lastEvent, mySeat, nameOf) : null}
        players={players}
        onAct={act}
        bottomInset={insets.bottom}
        size={layout === 'hand' || wide ? 'large' : 'normal'}
        autoCard={autoCard}
        onAutoCard={chooseAutoCard}
        clockOffset={clock.offset}
      />
      </View>
      </ScrollView>

      {state.status === 'finished' ? (
        <FinishedOverlay
          state={state}
          viewerTeam={myTeam}
          onRoom={() => router.replace(match.roomCode ? `/room/${match.roomCode}` : '/')}
          onNote={() => router.push({ pathname: '/history/note', params: { matchId: match.matchId } })}
          onHome={() => router.replace('/')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  fixedScore: { width: '100%', maxWidth: 1800, alignSelf: 'center', paddingHorizontal: space.sm },
  game: { flexGrow: 1, width: '100%', maxWidth: 1800, alignSelf: 'center' },
  wide: { flexDirection: 'row', gap: space.md, padding: space.md, alignItems: 'stretch' },
  top: { flexShrink: 0, flexBasis: 'auto', minWidth: 0, paddingHorizontal: space.sm, paddingBottom: space.sm, gap: space.xs },
  handArea: { justifyContent: 'center' },
  handAreaWide: { width: '36%', maxWidth: 560 },
});
