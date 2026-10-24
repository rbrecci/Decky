import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated as RNAnimated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutUp,
  LayoutAnimationConfig,
  LinearTransition,
  useAnimatedStyle,
  withSpring,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import type { LegalActions } from '../../../supabase/functions/_shared/engine/game.ts';
import type { Card, GameAction, MatchPlayer, PrivateHand, PublicGameState, Rank, Seat, TeamProposal } from '../../contracts/types';
import { useRerenderAt } from '../../lib/useRerenderAt';
import { Button } from '../../ui/Button';
import { Icon, type IconName } from '../../ui/icons';
import { Notice } from '../../ui/Notice';
import { CARD_RATIO, cardLabel, PlayingCard, sealSize } from '../../ui/PlayingCard';
import { colors, font, radius, shadow, space, TOUCH_MIN } from '../../ui/theme';
import { autoDragThreshold, canArmAuto, startsAutoDrag } from '../autoPlay';
import { trucoControls, type Control, type ControlId } from '../controls';
import { isMine } from '../deadline';
import { DeadlineBar } from './DeadlineBar';
import { initials, seatTeam, shortName } from '../describe';
import { arrivedCards, landingMoments, type DealRun } from '../deal';
import { cardKey as keyOf, manilhaReveals, revealMoments, revealProgress, showsManilha, type ManilhaReveal as Reveal } from '../manilha';
import type { DealAnimation } from '../useDealAnimation';
import { ManilhaReveal } from './ManilhaReveal';
import { PlayerAvatar } from './PlayerIdentity';

const NO_MOMENTS: number[] = [];

const CONTROL_ICONS: Record<ControlId, IconName> = {
  request: 'raise',
  raise: 'raise',
  accept: 'accept',
  refuse: 'fold',
  fold: 'fold',
  confirm: 'accept',
  reject: 'no',
  cancel: 'no',
};

/** Recuo lateral do painel: menor sem mesa dedicada, para a mão ganhar largura. */
const panelPadding = (size: 'normal' | 'large') => (size === 'large' ? space.md : space.sm + 4);
const HAND_GAP = space.sm;

/**
 * Largura de cada carta da mão. Três cartas lado a lado na largura do painel, limitadas por uma fração
 * da altura da tela (para a mesa continuar com espaço) e por um teto.
 * - 'normal' (sem mesa dedicada: a mesa fica em cima): até 124 pt e 14% da altura. Antes eram 112 pt e
 *   13%, e a mão ficava apertada; num celular de 390 x 844 a carta passa de ~110 para ~118 pt.
 * - 'large' (com mesa dedicada: a mão ocupa a tela): sem mudança.
 */
export function handCardWidth(width: number, height: number, size: 'normal' | 'large'): number {
  const large = size === 'large';
  const fromWidth = (width - panelPadding(size) * 2 - HAND_GAP * 2) / 3;
  return Math.min(large ? 150 : 124, fromWidth, height * (large ? 0.21 : 0.14));
}

/**
 * Quantas cartas da própria mão já "chegaram" na distribuição animada. Calculado no render
 * (o primeiro quadro da mão nova já sai sem cartas) e redesenhado só quando uma carta pousa.
 */
function useArrivedCards(deal: DealAnimation, dealing: boolean, dealerSeat: Seat, mySeat: Seat): number {
  const run = dealing ? deal.run : null;
  useRerenderAt(run ? landingMoments(run, dealerSeat, mySeat) : NO_MOMENTS);
  return arrivedCards(run, dealerSeat, mySeat, Date.now());
}

/**
 * Plano das revelações de manilha desta distribuição. Fica fixo depois de feito com a mão recebida:
 * jogar uma manilha no meio da sequência não reescalona as outras (não corta nem repete efeito).
 * Só é refeito quando muda a distribuição ou a vira, ou quando a mão chega depois do estado novo.
 */
function useManilhaReveals(run: DealRun | null, cards: Card[], manilhaRank: Rank): Reveal[] {
  const plan = useRef<{ run: DealRun | null; rank: Rank; dealt: number; reveals: Reveal[] } | null>(null);
  const current = plan.current;
  if (!current || current.run !== run || current.rank !== manilhaRank || (current.dealt === 0 && cards.length > 0)) {
    plan.current = { run, rank: manilhaRank, dealt: cards.length, reveals: manilhaReveals(run, cards, manilhaRank) };
  }
  const reveals = plan.current!.reveals;
  useRerenderAt(reveals.length > 0 ? revealMoments(reveals) : NO_MOMENTS);
  return reveals;
}

interface Props {
  state: PublicGameState;
  hand: PrivateHand | null;
  mySeat: Seat;
  legal: LegalActions;
  deal: DealAnimation;
  /** Chave da ação em envio (desabilita tudo e mostra carregando no botão certo). */
  busy: string | null;
  error: string | null;
  /** Aviso curto da dupla (o parceiro recusou o pedido, o pedido deixou de valer). */
  note: string | null;
  players: MatchPlayer[];
  onAct: (key: string, action: GameAction) => void;
  /** Área segura de baixo (barra de gestos), somada ao espaçamento do painel. */
  bottomInset: number;
  /** 'large' quando a mão ocupa a tela (modo com mesa dedicada): cartas maiores. */
  size?: 'normal' | 'large';
  /** Carta marcada para jogada automática (a do servidor ou a escolha em envio). */
  autoCard?: Card | null;
  /** Marca (ou cancela, com null) a jogada automática. Ausente: o gesto fica desligado. */
  onAutoCard?: (card: Card | null) => void;
  /** Relógio do servidor menos o do aparelho, para a contagem do prazo. */
  clockOffset?: number;
}

/**
 * Metade de baixo da tela do jogador: as três cartas privadas e os controles.
 * Fluxo da carta: tocar seleciona (a carta sobe e ganha borda), confirmar envia ao servidor.
 * Tocar de novo na carta selecionada também confirma.
 *
 * Manilhas: contorno, halo e selo com estrela na própria carta, calculados com a mão privada (que só
 * este aparelho recebe) e a manilha pública. Ao receber a mão, cada manilha ganha uma revelação
 * especial depois que a vira abre; ela não bloqueia a jogada e não se repete (ver `manilhaReveals`).
 */
export function HandPanel({
  state,
  hand,
  mySeat,
  legal,
  deal,
  busy,
  error,
  note,
  players,
  onAct,
  bottomInset,
  size = 'normal',
  autoCard = null,
  onAutoCard,
  clockOffset = 0,
}: Props) {
  const { width, height } = useWindowDimensions();
  const [panelWidth, setPanelWidth] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // Jogar a próxima carta escondida (D-20). Desliga sozinho quando deixa de valer e depois da jogada.
  const [hiddenMode, setHiddenMode] = useState(false);
  useEffect(() => {
    if (!legal.playHidden) setHiddenMode(false);
  }, [legal.playHidden]);

  const cards = hand?.cards ?? [];
  const dealing = deal.phase === 'intro' || deal.phase === 'dealing';
  const canPlay = legal.playCard && !busy && !dealing;
  const { mode, controls } = trucoControls(state, legal, mySeat);
  const selectedCard = cards.find((c) => keyOf(c) === selected) ?? null;

  // A seleção some quando a carta sai da mão (jogada aceita ou mão nova) ou quando surge um pedido de truco.
  useEffect(() => {
    if (selected && !cards.some((c) => keyOf(c) === selected)) setSelected(null);
  }, [cards, selected]);
  useEffect(() => {
    if (state.truco) setSelected(null);
  }, [state.truco]);

  const cardW = handCardWidth(panelWidth ?? width, height, size);
  const reveals = useManilhaReveals(deal.run, cards, state.manilhaRank);
  const now = Date.now();

  // Jogada automática: arrastar a carta para cima, fora da própria vez. O limite segue o tamanho da carta.
  const armable = !!onAutoCard && !busy && canArmAuto(state, legal, dealing);
  const autoKey = autoCard ? keyOf(autoCard) : null;
  const dragThreshold = autoDragThreshold(cardW * CARD_RATIO);
  // A contagem que importa para quem olha: a própria vez, ou a resposta da própria dupla ao truco.
  const myDeadline =
    state.status === 'playing' && !dealing && state.deadline && isMine(state.deadline, mySeat) ? state.deadline : null;

  function playCard(card: Card) {
    const action: GameAction = hiddenMode ? { type: 'play_card', card, hidden: true } : { type: 'play_card', card };
    onAct(`card-${keyOf(card)}`, action);
    setHiddenMode(false);
  }

  function tapCard(card: Card) {
    if (dealing || busy) return;
    const key = keyOf(card);
    if (selected === key && canPlay) {
      playCard(card);
      return;
    }
    setSelected(selected === key ? null : key);
  }

  function press(control: Control) {
    onAct(control.id, control.action);
  }

  const arrived = useArrivedCards(deal, dealing, state.dealerSeat, mySeat);

  return (
    <View onLayout={(event) => setPanelWidth(event.nativeEvent.layout.width)} style={[styles.panel, { paddingBottom: space.sm + bottomInset, paddingHorizontal: panelPadding(size) }]}>
      <Notice kind="error" message={error} />

      {/* Abrir a tela ou reconectar não refaz a entrada das cartas que já estavam na mão. */}
      <LayoutAnimationConfig skipEntering>
        <View
          // Em cima, espaço para a carta escolhida subir e para o selo da manilha, que sai do canto.
          style={[styles.hand, { minHeight: cardW * CARD_RATIO + space.xs, paddingTop: Math.max(18, sealSize(cardW) * 0.34 + 12) }]}
          accessibilityLabel="Suas cartas"
        >
          {cards.slice(0, arrived).map((card) => {
            const key = keyOf(card);
            const isSelected = key === selected;
            const reveal = reveals.find((r) => r.key === key);
            const manilha = showsManilha(card, state.manilhaRank, deal.phase, reveal, now);
            const revealing = revealProgress(reveal, now);
            return (
              // A animação de layout fica no invólucro; o deslocamento da seleção vai na view de dentro,
              // para o Reanimated não sobrescrever o `transform` (aviso "may be overwritten by a layout animation").
              <Animated.View
                key={`${state.handNumber}-${key}`}
                entering={dealing ? FadeInDown.duration(260) : FadeIn.duration(200)}
                exiting={FadeOutUp.duration(220)}
                layout={LinearTransition.duration(200)}
              >
                <LiftOnSelect selected={isSelected}>
                  <AutoDrag
                    enabled={armable}
                    threshold={dragThreshold}
                    onArm={() => onAutoCard?.(key === autoKey ? null : card)}
                  >
                    {(armed) => (
                      <>
                        <PlayingCard
                          card={card}
                          width={cardW}
                          selected={isSelected}
                          ready={canPlay}
                          manilha={manilha}
                          auto={key === autoKey || armed}
                          dimmed={busy === `card-${key}`}
                          elevation={isSelected || armed ? 'lifted' : 'table'}
                          disabled={dealing || !!busy}
                          onPress={() => tapCard(card)}
                          hint={cardHint(isSelected, canPlay, armable, key === autoKey)}
                        />
                        {revealing !== null ? <ManilhaReveal cardWidth={cardW} from={revealing} /> : null}
                        {key === autoKey ? (
                          <AutoSeal cardWidth={cardW} disabled={!onAutoCard || !!busy} onCancel={() => onAutoCard?.(null)} />
                        ) : null}
                        {armed ? (
                          <Animated.View entering={FadeIn.duration(120)} pointerEvents="none" style={styles.armHint}>
                            <Text style={styles.armHintText} allowFontScaling={false}>
                              {key === autoKey ? 'CANCELAR' : 'AUTOMÁTICA'}
                            </Text>
                          </Animated.View>
                        ) : null}
                      </>
                    )}
                  </AutoDrag>
                </LiftOnSelect>
              </Animated.View>
            );
          })}
          {hand && cards.length === 0 && state.status === 'playing' ? (
            <Text style={styles.empty}>Sem cartas nesta mão. Aguarde a próxima.</Text>
          ) : null}
        </View>
      </LayoutAnimationConfig>

      <Notice kind="info" message={note} />

      {/* Faixa fixa do prazo (e do botão de carta escondida): a altura não muda quando o prazo aparece. */}
      <View style={styles.timerRow}>
        <DeadlineBar
          deadline={myDeadline}
          offset={clockOffset}
          variant="strip"
          label={myDeadline?.kind === 'truco' ? 'Responder ao truco' : 'Sua vez'}
        />
        {mode === 'play' ? (
          <HiddenToggle
            active={hiddenMode}
            enabled={legal.playHidden && !busy && !dealing}
            onToggle={() => setHiddenMode((on) => !on)}
          />
        ) : null}
      </View>

      {mode === 'proposal_confirm' || mode === 'proposal_sent' ? (
        // Decisão da dupla: quem já confirmou (avatares) e o que falta fazer, na mesma altura da fileira
        // de botões, para a mesa não mudar de tamanho. O que está em jogo vai no banner de status.
        <View style={styles.row} accessibilityLabel="Decisão da dupla">
          <ProposalMembers proposal={state.proposal!} mySeat={mySeat} players={players} />
          {controls.map((c) => (
            <Button key={c.id} label={c.label} hint={c.hint} icon={CONTROL_ICONS[c.id]} variant={c.variant} size="compact"
              style={c.id === 'confirm' ? styles.play : styles.grow} loading={busy === c.id} disabled={!!busy} onPress={() => press(c)} />
          ))}
        </View>
      ) : mode === 'proposal_other' ? (
        <WaitingLine text="A outra dupla está decidindo…" />
      ) : mode === 'respond' ? (
        <View style={styles.row} accessibilityLabel="Responder ao pedido de truco">
          {controls.map((c) => (
            <Button key={c.id} label={c.label} hint={c.hint} icon={CONTROL_ICONS[c.id]} variant={c.variant} size="compact" style={styles.grow}
              loading={busy === c.id} disabled={!!busy} onPress={() => press(c)} />
          ))}
        </View>
      ) : mode === 'waiting_answer' ? (
        <WaitingLine text={state.gameMode === '1v1' ? 'Pedido feito. Aguardando o adversário responder…' : 'Pedido feito. Aguardando a outra dupla responder…'} />
      ) : mode === 'play' ? (
        // Correr à esquerda, longe do polegar; jogar à direita, maior e preenchido: é a ação principal.
        <View style={styles.row}>
          {[...controls].reverse().map((c) => (
            <Button key={c.id} label={c.label} hint={c.hint} icon={CONTROL_ICONS[c.id]} variant={c.variant} size="compact"
              style={c.id === 'fold' ? styles.fold : styles.truco}
              loading={busy === c.id} disabled={!!busy || dealing} onPress={() => press(c)} />
          ))}
          <Button
            label={playLabel(dealing, legal.playCard, selectedCard, hiddenMode)}
            hint={
              selectedCard
                ? `Joga ${cardLabel(selectedCard)} na mesa${hiddenMode ? ', virada para baixo' : ''}`
                : 'Toque numa carta da mão para escolher'
            }
            icon={hiddenMode ? 'hidden' : 'play'}
            variant="primary"
            size="compact"
            style={styles.play}
            disabled={!selectedCard || !canPlay}
            loading={!!selectedCard && busy === `card-${keyOf(selectedCard)}`}
            onPress={() => selectedCard && playCard(selectedCard)}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Quem da dupla já confirmou o pedido: avatar com visto dourado para quem confirmou (quem pediu conta
 * como a primeira confirmação) e contorno apagado para quem ainda não respondeu, mais "1 de 2".
 */
function ProposalMembers({ proposal, mySeat, players }: { proposal: TeamProposal; mySeat: Seat; players: MatchPlayer[] }) {
  const partnerSeat = (((proposal.proposedBy + 1) % 4) + 1) as Seat;
  const nameOf = (seat: Seat) => players.find((p) => p.seat === seat)?.displayName ?? `Lugar ${seat}`;
  const label = (seat: Seat) => (seat === mySeat ? 'você' : shortName(nameOf(seat)));
  const members: { seat: Seat; done: boolean }[] = [
    { seat: proposal.proposedBy, done: true },
    { seat: partnerSeat, done: false },
  ];
  return (
    <View
      style={styles.members}
      accessible
      accessibilityLabel={`Confirmações da dupla: 1 de 2. ${label(proposal.proposedBy)} confirmou; falta ${label(partnerSeat)}.`}
    >
      <View style={styles.memberRow}>
        {members.map((m) => (
          <View key={m.seat} style={[styles.member, !m.done && styles.memberWaiting]}>
            <PlayerAvatar initials={initials(nameOf(m.seat))} team={seatTeam(m.seat)} size={26} active={m.done} />
            <View style={[styles.memberMark, m.done ? styles.memberDone : styles.memberPending]}>
              <Text style={[styles.memberMarkText, !m.done && styles.memberMarkPending]} allowFontScaling={false}>
                {m.done ? '✓' : '…'}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.memberCount} allowFontScaling={false}>
        1 DE 2
      </Text>
    </View>
  );
}

/** Linha de espera com a altura da fileira de botões: trocar de modo não muda o tamanho do painel. */
function WaitingLine({ text }: { text: string }) {
  return (
    <View style={styles.waitingBox} accessibilityLiveRegion="polite">
      <Text style={styles.waiting} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

/** O rótulo do botão de jogar diz por que ele está parado, em vez de só ficar apagado. */
function playLabel(dealing: boolean, myTurn: boolean, selected: Card | null, hidden: boolean): string {
  if (dealing) return 'Distribuindo…';
  if (!myTurn) return 'Aguarde a vez';
  if (!selected) return 'Escolha a carta';
  return hidden ? 'Jogar virada' : 'Jogar';
}

function cardHint(selected: boolean, canPlay: boolean, armable: boolean, isAuto: boolean): string {
  if (isAuto) return 'Marcada para jogar sozinha na sua vez. Arraste para cima ou toque no selo para cancelar';
  if (selected) return canPlay ? 'Selecionada. Toque de novo ou em Jogar para confirmar' : 'Selecionada. Espere a sua vez para jogar';
  return armable ? 'Toque para selecionar. Arraste para cima para jogar sozinha na sua vez' : 'Toque para selecionar';
}

/**
 * Arrastar a carta para cima marca a jogada automática. A carta segue o dedo (um `Animated.Value`,
 * sem redesenhar a mão a cada movimento); só a passagem pelo limite muda estado, uma vez. Soltar além
 * do limite marca (ou cancela, na carta já marcada); antes dele, a carta volta com uma mola curta.
 * O gesto só começa com movimento claramente vertical para cima, então o toque continua selecionando.
 */
function AutoDrag({
  enabled,
  threshold,
  onArm,
  children,
}: {
  enabled: boolean;
  threshold: number;
  onArm: () => void;
  children: (armed: boolean) => ReactNode;
}) {
  const y = useRef(new RNAnimated.Value(0)).current;
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const latest = useRef({ enabled, threshold, onArm });
  latest.current = { enabled, threshold, onArm };

  const responder = useMemo(() => {
    const setCrossed = (crossed: boolean) => {
      if (crossed === armedRef.current) return;
      armedRef.current = crossed;
      setArmed(crossed);
    };
    const settle = () => {
      setCrossed(false);
      RNAnimated.spring(y, { toValue: 0, useNativeDriver: Platform.OS !== 'web', damping: 16, stiffness: 260 }).start();
    };
    const claim = (_: unknown, g: { dx: number; dy: number }) => latest.current.enabled && startsAutoDrag(g.dx, g.dy);
    return PanResponder.create({
      onMoveShouldSetPanResponder: claim,
      onMoveShouldSetPanResponderCapture: claim,
      // Durante o gesto, a rolagem e os toques não tomam a carta do dedo.
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        const limit = latest.current.threshold;
        y.setValue(Math.max(-limit * 1.5, Math.min(0, g.dy)));
        setCrossed(-g.dy >= limit);
      },
      onPanResponderRelease: () => {
        if (armedRef.current) latest.current.onArm();
        settle();
      },
      onPanResponderTerminate: settle,
    });
  }, [y]);

  return (
    <RNAnimated.View {...responder.panHandlers} style={{ transform: [{ translateY: y }] }}>
      {children(armed)}
    </RNAnimated.View>
  );
}

/**
 * Selo da jogada automática: medalha azul-aço com relâmpago no canto superior esquerdo (a manilha usa
 * o direito), metade para fora da carta. Fica enquanto a marcação existir; tocar nele cancela.
 */
function AutoSeal({ cardWidth, disabled, onCancel }: { cardWidth: number; disabled: boolean; onCancel: () => void }) {
  const size = sealSize(cardWidth);
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(12)}
      exiting={ZoomOut.duration(160)}
      style={[styles.autoSeal, { width: size, height: size, borderRadius: size / 2, top: -size * 0.34, left: -size * 0.34 }]}
    >
      <Pressable
        onPress={onCancel}
        disabled={disabled}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Cancelar jogada automática"
        style={styles.autoSealPress}
      >
        <Icon name="bolt" size={size * 0.62} color={colors.auto} />
      </Pressable>
    </Animated.View>
  );
}

/** Liga a próxima jogada como carta escondida. Só a partir da 2ª vaza, na própria vez (o servidor confere). */
function HiddenToggle({ active, enabled, onToggle }: { active: boolean; enabled: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={!enabled}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      accessibilityRole="switch"
      accessibilityLabel="Jogar virada"
      accessibilityHint={enabled ? 'A próxima carta vai para a mesa virada para baixo' : 'Só a partir da 2ª vaza, na sua vez'}
      accessibilityState={{ checked: active, disabled: !enabled }}
      style={[styles.hiddenToggle, active && styles.hiddenToggleOn, !enabled && styles.hiddenToggleOff]}
    >
      <Icon name="hidden" size={14} color={active ? colors.ink : colors.goldSoft} />
      <Text style={[styles.hiddenToggleText, active && styles.hiddenToggleTextOn]} allowFontScaling={false}>
        VIRADA
      </Text>
    </Pressable>
  );
}

/**
 * A carta escolhida sobe com uma mola curta. A animação fica numa view interna: o invólucro de fora
 * tem a animação de layout (entrada, saída e reordenação), que é dona do `transform` dela.
 */
function LiftOnSelect({ selected, children }: { selected: boolean; children: ReactNode }) {
  const lift = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(selected ? -16 : 0, { damping: 16, stiffness: 260 }) }],
  }));
  return <Animated.View style={[styles.slot, lift]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  // Bandeja de couro na frente do jogador: grafite, filete metálico em cima e luz vindo da mesa.
  panel: {
    backgroundColor: colors.surface,
    paddingTop: space.sm,
    gap: space.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.lineStrong,
    boxShadow: '0px -8px 18px rgba(0, 0, 0, 0.55)',
  },
  hand: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: HAND_GAP },
  slot: { alignItems: 'center' },
  empty: { fontSize: font.body, color: colors.textMuted, alignSelf: 'center', textAlign: 'center' },
  row: { flexDirection: 'row', gap: space.sm },
  grow: { flex: 1 },
  truco: { flex: 1.1 },
  fold: { flex: 0.8 },
  play: { flex: 1.4 },
  waitingBox: { height: TOUCH_MIN + 4, justifyContent: 'center' },
  waiting: { fontSize: font.body - 2, lineHeight: 21, color: colors.goldSoft, fontWeight: '700', textAlign: 'center' },
  members: {
    flex: 0.9,
    minHeight: TOUCH_MIN + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldDeep,
    backgroundColor: '#1C1810',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  memberRow: { flexDirection: 'row', gap: 6 },
  member: { alignItems: 'center' },
  memberWaiting: { opacity: 0.55 },
  memberMark: {
    position: 'absolute',
    right: -4,
    bottom: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  memberDone: { backgroundColor: colors.gold, borderColor: colors.ink },
  memberPending: { backgroundColor: colors.surface, borderColor: colors.lineStrong },
  memberMarkText: { color: colors.ink, fontSize: 9, lineHeight: 11, fontWeight: '900' },
  memberMarkPending: { color: colors.textMuted },
  memberCount: { color: colors.goldSoft, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8 },
  timerRow: { minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  hiddenToggle: {
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.goldDeep,
    backgroundColor: colors.surfaceRaised,
  },
  hiddenToggleOn: { backgroundColor: colors.gold, borderColor: colors.goldSoft },
  hiddenToggleOff: { opacity: 0.4 },
  hiddenToggleText: { color: colors.goldSoft, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  hiddenToggleTextOn: { color: colors.ink },
  autoSeal: {
    position: 'absolute',
    backgroundColor: colors.autoDeep,
    borderWidth: 1.5,
    borderColor: colors.auto,
    boxShadow: shadow.auto,
  },
  autoSealPress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  armHint: {
    position: 'absolute',
    top: -24,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.autoDeep,
    borderWidth: 1,
    borderColor: colors.auto,
  },
  armHintText: { color: colors.auto, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
});
