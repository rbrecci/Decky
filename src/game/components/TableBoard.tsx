import { memo, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  LayoutAnimationConfig,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { nextSeat } from '../../../supabase/functions/_shared/engine/cards.ts';
import { resolveTrick } from '../../../supabase/functions/_shared/engine/strength.ts';
import type { Card, MatchPlayer, PublicGameState, PublicTableCard, Seat } from '../../contracts/types';
import { Icon } from '../../ui/icons';
import { CARD_BACK, CARD_RATIO, cardRadius, PlayingCard } from '../../ui/PlayingCard';
import { surfaceMetrics } from '../../ui/shapes';
import { TableSurface } from '../../ui/TableSurface';
import { colors, font, radius, shadow } from '../../ui/theme';
import type { DealAnimation } from '../useDealAnimation';
import { activeTurnSeat, cardsLeft, initials, playedCardKey, shortName, seatTeam, tablePositions, teamLabel, type Side } from '../describe';
import { tableGeometry, type Rect, type TableVariant } from '../geometry';
import type { ShownCue } from '../useTableCue';
import { DealLayer } from './DealLayer';
import { SeatChip } from './SeatChip';
import { TrucoCallout } from './TrucoCallout';
import { ManilhaBadge, ViraCard } from './ViraCard';

const SIDES: Side[] = ['bottom', 'right', 'top', 'left'];

// A carta entra na mesa vindo do lado de quem a jogou.
const ENTERING = {
  bottom: FadeInDown.duration(280).withInitialValues({ opacity: 0, transform: [{ translateY: 70 }] }),
  top: FadeInUp.duration(280).withInitialValues({ opacity: 0, transform: [{ translateY: -70 }] }),
  left: FadeInLeft.duration(280).withInitialValues({ opacity: 0, transform: [{ translateX: -70 }] }),
  right: FadeInRight.duration(280).withInitialValues({ opacity: 0, transform: [{ translateX: 70 }] }),
} as const;

export interface TableBoardProps {
  state: PublicGameState;
  players: MatchPlayer[];
  /** Assento mostrado embaixo: o do jogador, ou o 1 na mesa central. */
  bottomSeat: Seat;
  /** Assento de quem olha; null na mesa central (visão neutra, sem "Você"). */
  viewerSeat: Seat | null;
  deal: DealAnimation;
  variant: TableVariant;
  /** Aviso da última ação confirmada: pedido/aceite de truco no centro, "Corro!" junto de quem falou. */
  cue: ShownCue | null;
  /** Relógio do servidor menos o do aparelho, para o filete do prazo nas etiquetas. */
  clockOffset?: number;
  /** A carta que quem olha jogou escondida (da própria mão privada): só ele a vê de face. */
  ownCovered?: Card | null;
}

/**
 * A mesa pública: quatro lugares, cartas jogadas na posição de quem jogou, baralho, vira e manilha.
 * Desenhada no celular dedicado à mesa e, quando não há mesa dedicada, na metade de cima do jogador.
 * Não recebe nem desenha mãos: só o que está em PublicGameState.
 *
 * `memo`: selecionar carta, enviar jogada ou mostrar erro mudam só a mão; a mesa redesenha apenas
 * quando o estado público, a fase da distribuição ou o aviso mudam.
 */
export const TableBoard = memo(function TableBoard(props: TableBoardProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (!size || Math.abs(size.w - width) > 1 || Math.abs(size.h - height) > 1) setSize({ w: width, h: height });
  }

  // O tampo (couro, trilho, feltro) é desenhado uma vez por tamanho; lugares e cartas ficam na área do feltro.
  const surface = props.variant === 'large' ? 'table' : 'compact';
  const metrics = size ? surfaceMetrics(size.w, size.h, surface) : null;
  const content = metrics?.content ?? null;

  return (
    <View style={styles.area} onLayout={onLayout}>
      {size && content ? (
        <>
          <TableSurface width={size.w} height={size.h} variant={surface} />
          <View style={[styles.abs, { left: content.x, top: content.y, width: content.w, height: content.h }]}>
            {/* Ao abrir a tela ou reconectar, as cartas que já estavam na mesa aparecem paradas;
                só as jogadas que chegam depois entram voando. */}
            <LayoutAnimationConfig skipEntering>
              <Board {...props} width={content.w} height={content.h} shape={metrics!.n} />
            </LayoutAnimationConfig>
          </View>
        </>
      ) : null}
    </View>
  );
});

function Board({
  state,
  players,
  bottomSeat,
  viewerSeat,
  deal,
  variant,
  cue,
  clockOffset = 0,
  ownCovered = null,
  width,
  height,
  shape,
}: TableBoardProps & { width: number; height: number; shape: number }) {
  const g = tableGeometry(width, height, variant, shape);
  const large = variant === 'large';
  const positions = tablePositions(bottomSeat, state.gameMode);
  const sides = SIDES.filter((side) => positions[side] !== undefined);
  const sideOf = (seat: Seat) => sides.find((s) => positions[s] === seat)!;
  const viewerTeam = viewerSeat ? seatTeam(viewerSeat) : null;
  const playing = state.status === 'playing';
  const dealing = deal.phase === 'intro' || deal.phase === 'dealing';
  // Mesma regra para a etiqueta e o espaço da carta (antes, com truco pendente, a etiqueta seguia
  // destacada e o espaço da carta não).
  const turnSeat = activeTurnSeat(state, dealing);

  // Entre vazas a mesa limpa; a última vaza fica esmaecida para todos verem o que caiu.
  // Na mão nova, ela só aparece durante a pausa antes de distribuir.
  const showingLast =
    state.tableCards.length === 0 && state.lastTrick !== null && (state.trickResults.length > 0 || deal.phase === 'intro');
  const cards: PublicTableCard[] = showingLast ? state.lastTrick!.cards : state.tableCards;
  // A vaza das cartas mostradas: a chave da escondida é a mesma enquanto ela é revelada.
  const trick = showingLast ? state.trickResults.length - 1 : state.trickResults.length;
  const winnerSeat = showingLast && state.lastTrick!.result !== 'tie' ? resolveTrick(state.lastTrick!.cards, state.manilhaRank).leadSeat : null;
  const tableSeats = state.tableCards.map((c) => c.seat);

  // Filete do prazo na etiqueta de quem decide: quem joga, ou quem responde ao truco pela dupla.
  const deadline = playing && !dealing ? (state.deadline ?? null) : null;
  const timerSeat =
    deadline?.kind === 'play' ? deadline.seat : deadline && state.truco ? nextSeat(state.truco.requestedBySeat, state.gameMode) : null;

  const displayName = (seat: Seat) => players.find((p) => p.seat === seat)?.displayName ?? `Lugar ${seat}`;
  const nameOf = (seat: Seat) => (seat === viewerSeat ? 'Você' : displayName(seat));

  return (
    <>
      <DeckStack rect={g.deck} />
      <ViraCard rect={g.vira} vira={state.vira} manilhaRank={state.manilhaRank} phase={deal.phase} />
      {deal.phase === 'done' && playing ? (
        <ManilhaBadge rect={g.manilha} manilhaRank={state.manilhaRank} large={large} />
      ) : null}

      {sides.map((side) => {
        const seat = positions[side]!;
        const played = cards.find((c) => c.seat === seat);
        const isTurn = turnSeat === seat;
        return (
          <PlayedSlot
            key={`slot-${side}`}
            rect={g.played[side]}
            side={side}
            played={played}
            trick={trick}
            ownCovered={seat === viewerSeat ? ownCovered : null}
            dimmed={showingLast}
            winner={winnerSeat === seat}
            waiting={isTurn}
          />
        );
      })}

      {sides.filter((side) => side !== 'bottom' || g.bottomChipVisible).map((side) => {
        const seat = positions[side]!;
        const left = cardsLeft(seat, state.trickResults.length, tableSeats, !playing);
        return (
          <SeatChip
            key={`chip-${side}`}
            rect={g.chips[side]}
            layout={g.chipLayout[side]}
            name={nameOf(seat)}
            initials={initials(displayName(seat))}
            team={seatTeam(seat)}
            teamText={teamLabel(seatTeam(seat), viewerTeam, state.gameMode)}
            isTurn={turnSeat === seat}
            // A própria mão aparece embaixo; durante a distribuição os versos chegam voando.
            cardsLeft={seat === viewerSeat || dealing ? null : left}
            large={large}
            timer={deadline && timerSeat === seat ? { deadline, offset: clockOffset } : null}
          />
        );
      })}

      {cue && cue.kind === 'speech' ? (
        <Bubble key={cue.revision} rect={g.chips[sideOf(cue.seat)]} side={sideOf(cue.seat)} text={cue.text} large={large} />
      ) : null}

      {/* Pedido e aceite de truco no palco do centro: cobre baralho e vira por alguns segundos,
          nunca as cartas jogadas nem as etiquetas. Fora da distribuição, que já ocupa o centro.
          O palco fica sempre montado, para o aviso que sai ainda fazer o fade de saída. */}
      <View pointerEvents="none" style={[styles.abs, { left: g.stage.x, top: g.stage.y, width: g.stage.w, height: g.stage.h }]}>
        {cue && cue.kind !== 'speech' && !dealing ? (
          <TrucoCallout
            key={cue.revision}
            cue={cue}
            name={shortName(nameOf(cue.seat))}
            width={g.stage.w}
            height={g.stage.h}
            from={sideOf(cue.seat)}
            large={large}
          />
        ) : null}
      </View>

      {deal.phase === 'dealing' && deal.run ? (
        <DealLayer
          geometry={g}
          dealerSeat={state.dealerSeat}
          sideOf={sideOf}
          run={deal.run}
          bottomTarget={viewerSeat ? 'edge' : 'chip'}
          height={height}
        />
      ) : null}
    </>
  );
}

/** Baralho fechado no centro da mesa, com o verso do Decky: um maço com espessura e sombra no feltro. */
function DeckStack({ rect }: { rect: Rect }) {
  return (
    <View
      style={[styles.abs, styles.deck, { left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: cardRadius(rect.w) }]}
      accessible
      accessibilityLabel="Baralho"
    >
      {[4, 2, 0].map((offset) => (
        <Image
          key={offset}
          source={CARD_BACK}
          style={[styles.deckCard, { left: -offset / 2, top: -offset, width: rect.w, height: rect.h, borderRadius: cardRadius(rect.w) }]}
        />
      ))}
    </View>
  );
}

// Cada lugar solta a carta com uma leve inclinação, como na mesa de verdade. Só gira: a carta não deforma.
const TILT: Record<Side, string> = { bottom: '-2deg', right: '4deg', top: '2.5deg', left: '-4deg' };

interface SlotProps {
  rect: Rect;
  side: Side;
  played: PublicTableCard | undefined;
  /** Vaza das cartas mostradas (chave da carta escondida). */
  trick: number;
  /** Carta escondida de quem olha: ele vê a face, esmaecida e com o selo do olho riscado. */
  ownCovered: Card | null;
  dimmed: boolean;
  winner: boolean;
  /** É a vez deste lugar: o espaço vazio pisca de leve. */
  waiting: boolean;
}

function PlayedSlot({ rect, side, played, trick, ownCovered, dimmed, winner, waiting }: SlotProps) {
  const box = { left: rect.x, top: rect.y, width: rect.w, height: rect.h };
  if (!played) {
    // Marcação impressa no feltro; na vez do lugar, ganha o contorno dourado.
    return <View style={[styles.abs, styles.emptySlot, waiting && styles.emptySlotTurn, box]} />;
  }
  return (
    // Chave só da carta: quando a vaza fecha, a carta continua montada (esmaece no lugar) em vez de
    // remontar. Antes a chave mudava com a vaza, as três primeiras piscavam e a quarta nem entrava voando.
    // A inclinação vai numa view interna: o `transform` do invólucro é da animação de entrada.
    <Animated.View key={playedCardKey(played, trick)} entering={ENTERING[side]} style={[styles.abs, box]}>
      <View style={{ transform: [{ rotate: TILT[side] }] }}>
        {played.hidden ? (
          <HiddenPlayed card={played.card} own={ownCovered} width={rect.w} dimmed={dimmed && !winner} winner={winner} />
        ) : (
          <PlayingCard card={played.card} width={rect.w} dimmed={dimmed && !winner} highlighted={winner} elevation="table" />
        )}
      </View>
      {winner ? (
        <Animated.View entering={ZoomIn.duration(220)} style={styles.winnerTag}>
          <Text style={styles.winnerText}>Venceu</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** Virada da carta escondida quando a vaza fecha (verso, achata, face), no ritmo da vira. */
const HIDDEN_FLIP_MS = 420;

/**
 * Carta jogada escondida. Enquanto a vaza está aberta, todos veem o verso (a carta nem chegou a este
 * aparelho); o dono vê a própria carta esmaecida, com o selo do olho riscado. Quando a vaza fecha e o
 * servidor revela a carta, ela vira uma vez. Montada já revelada (reconexão), aparece aberta, sem girar.
 */
function HiddenPlayed({
  card,
  own,
  width,
  dimmed,
  winner,
}: {
  card: Card | null;
  own: Card | null;
  width: number;
  dimmed: boolean;
  winner: boolean;
}) {
  // 0 = verso, 1 = face.
  const flip = useSharedValue(card ? 1 : 0);
  const revealed = card !== null;

  useEffect(() => {
    if (revealed) flip.value = withTiming(1, { duration: HIDDEN_FLIP_MS, easing: Easing.inOut(Easing.cubic) });
  }, [revealed, flip]);

  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    transform: [{ scaleX: Math.abs(Math.cos(flip.value * Math.PI)) }],
  }));
  const faceStyle = useAnimatedStyle(() => ({
    opacity: flip.value >= 0.5 ? 1 : 0,
    transform: [{ scaleX: Math.abs(Math.cos(flip.value * Math.PI)) }],
  }));

  if (!revealed && own) {
    return (
      <View accessible accessibilityLabel="Sua carta, jogada virada">
        <PlayingCard card={own} width={width} dimmed elevation="table" />
        <View pointerEvents="none" style={styles.hiddenSeal}>
          <Icon name="hidden" size={14} color={colors.goldSoft} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ width, height: width * CARD_RATIO }}>
      {/* Depois da revelação o verso fica invisível: o leitor de tela também deixa de anunciá-lo. */}
      <Animated.View style={[StyleSheet.absoluteFill, backStyle]} aria-hidden={revealed}>
        <PlayingCard faceDown width={width} elevation="table" />
      </Animated.View>
      {card ? (
        <Animated.View style={[StyleSheet.absoluteFill, faceStyle]}>
          <PlayingCard card={card} width={width} dimmed={dimmed} highlighted={winner} elevation="table" />
        </Animated.View>
      ) : null}
    </View>
  );
}

function Bubble({ rect, side, text, large }: { rect: Rect; side: Side; text: string; large: boolean }) {
  const h = large ? 38 : 30;
  // Do lado de dentro da etiqueta (rumo ao centro), sobre o espaço da carta de quem falou: assim a fala
  // fica sempre dentro do feltro. "Corro!" encerra a mão, então não esconde jogada em andamento.
  const top = side === 'bottom' ? rect.y - h - 4 : rect.y + rect.h + 4;
  const w = Math.max(rect.w * 0.8, Math.min(rect.w, 110));
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(14)}
      exiting={FadeOut.duration(180)}
      style={[styles.bubble, { left: rect.x + (rect.w - w) / 2, width: w, top, height: h }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.bubbleText, large && styles.bubbleTextLarge]} numberOfLines={1}>
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1 },
  abs: { position: 'absolute' },
  deckCard: { position: 'absolute', borderWidth: 1, borderColor: '#00000088' },
  deck: { boxShadow: shadow.card },
  emptySlot: { borderRadius: radius.sm, borderWidth: 1, borderColor: '#FFFFFF1F', backgroundColor: '#00000014' },
  emptySlotTurn: { borderColor: colors.gold, borderWidth: 2, boxShadow: shadow.turn },
  winnerTag: {
    position: 'absolute',
    bottom: -9,
    alignSelf: 'center',
    backgroundColor: colors.ink,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  winnerText: { color: colors.goldSoft, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  hiddenSeal: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.goldDeep,
  },
  // Balão no estilo do logo: creme, contorno quase preto e vermelho.
  bubble: {
    position: 'absolute',
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadow.card,
  },
  bubbleText: { color: colors.red, fontSize: font.body, fontWeight: '900' },
  bubbleTextLarge: { fontSize: font.large },
});

