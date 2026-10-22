import { memo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import type { MatchPlayer, PublicGameState, Seat } from '../../contracts/types';
import { FeltPanel } from '../../ui/TableSurface';
import { colors, font, radius, shadow, space } from '../../ui/theme';
import { initials, seatSummaries, seatTeam, shortName, teamLabel, type SeatSummary } from '../describe';
import type { DealAnimation } from '../useDealAnimation';
import type { ShownCue } from '../useTableCue';
import { HandPips, PlayerAvatar, TeamTag, TurnTag } from './PlayerIdentity';
import { TrucoCallout } from './TrucoCallout';
import { ManilhaBadge, ViraCard } from './ViraCard';

interface Props {
  state: PublicGameState;
  players: MatchPlayer[];
  mySeat: Seat;
  deal: DealAnimation;
  cue: ShownCue | null;
}

const VIRA_W = 58;
const VIRA_H = VIRA_W * (726 / 500);
const BADGE = { w: 96, h: 46 };
const AVATAR = 34;

/**
 * O essencial público para o jogador quando há celular dedicado à mesa (modo 'table').
 * A mesa completa (cartas jogadas na posição de cada um, baralho, distribuição) fica só no aparelho
 * da mesa; aqui ficam vira e manilha (para reconhecer as próprias manilhas), quem joga agora, quem já
 * jogou nesta vaza e os avisos de truco. Nenhuma carta jogada ou de mão alheia é desenhada.
 */
export const PlayerHud = memo(function PlayerHud({ state, players, mySeat, deal, cue }: Props) {
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);
  const dealing = deal.phase === 'intro' || deal.phase === 'dealing';
  const displayName = (seat: Seat) => players.find((p) => p.seat === seat)?.displayName ?? `Lugar ${seat}`;
  const nameOf = (seat: Seat) => (seat === mySeat ? 'Você' : displayName(seat));
  const seats = seatSummaries(state, mySeat, nameOf, dealing);
  const myTeam = seatTeam(mySeat);
  // Primeira linha: a nossa dupla (eu e o parceiro); segunda: a outra dupla, na ordem em que jogam.
  const rows = state.gameMode === '1v1' ? [seats] : [
    [seats[0], seats[2]],
    [seats[1], seats[3]],
  ];

  function onStageLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (!stage || Math.abs(stage.w - width) > 1 || Math.abs(stage.h - height) > 1) setStage({ w: width, h: height });
  }

  // Pedido e aceite aparecem ao lado da vira, no lugar da dica; "Corro!" fica junto de quem falou.
  const callout = cue && cue.kind !== 'speech' && !dealing ? cue : null;

  return (
    <FeltPanel style={styles.wrap}>
      <View style={styles.viraRow}>
        <View style={{ width: VIRA_W, height: VIRA_H }}>
          <ViraCard rect={{ x: 0, y: 0, w: VIRA_W, h: VIRA_H }} vira={state.vira} manilhaRank={state.manilhaRank} phase={deal.phase} />
        </View>
        <View style={{ width: BADGE.w, height: BADGE.h }}>
          {deal.phase === 'done' && state.status === 'playing' ? (
            <ManilhaBadge rect={{ x: 0, y: 0, ...BADGE }} manilhaRank={state.manilhaRank} large />
          ) : null}
        </View>
        <View style={styles.stage} onLayout={onStageLayout}>
          {callout ? null : (
            <Animated.Text entering={FadeIn.duration(200)} style={styles.hint}>
              As cartas jogadas aparecem na mesa central.
            </Animated.Text>
          )}
          {callout && stage ? (
            <TrucoCallout
              key={callout.revision}
              cue={callout}
              name={shortName(nameOf(callout.seat))}
              width={stage.w}
              height={stage.h}
              from={null}
              large={false}
            />
          ) : null}
        </View>
      </View>

      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((s) => (
            <SeatPill
              key={s.seat}
              seat={s}
              initials={initials(displayName(s.seat))}
              teamText={teamLabel(s.team, myTeam, state.gameMode)}
              speech={cue && cue.kind === 'speech' && cue.seat === s.seat ? cue : null}
              showCards={s.seat !== mySeat && !dealing}
            />
          ))}
        </View>
      ))}
    </FeltPanel>
  );
});

interface PillProps {
  seat: SeatSummary;
  initials: string;
  teamText: string;
  speech: Extract<ShownCue, { kind: 'speech' }> | null;
  showCards: boolean;
}

function SeatPill({ seat, initials: letters, teamText, speech, showCards }: PillProps) {
  const label = `${seat.name}, ${teamText}${seat.isTurn ? ', é a vez' : ''}${seat.played ? ', já jogou nesta vaza' : ''}${
    showCards ? `, ${seat.cardsLeft} ${seat.cardsLeft === 1 ? 'carta' : 'cartas'} na mão` : ''
  }`;
  return (
    <View style={[styles.pill, seat.isTurn && styles.pillTurn]} accessible accessibilityLabel={label}>
      <View style={styles.avatarBox}>
        <PlayerAvatar initials={letters} team={seat.team} size={AVATAR} active={seat.isTurn} />
        {seat.isTurn ? <TurnTag size={AVATAR} /> : null}
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, seat.isTurn && styles.nameTurn]} numberOfLines={1} ellipsizeMode="tail">
          {seat.name}
        </Text>
        <View style={styles.meta}>
          <TeamTag team={seat.team} text={teamText} large />
          {showCards ? <HandPips left={seat.cardsLeft} large /> : null}
          {seat.played ? <Text style={styles.played}>✓ jogou</Text> : null}
        </View>
      </View>
      {speech ? (
        <Animated.View
          key={speech.revision}
          entering={ZoomIn.springify().damping(14)}
          exiting={FadeOut.duration(180)}
          style={styles.bubble}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.bubbleText} numberOfLines={1}>
            {speech.text}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: space.sm },
  viraRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: VIRA_H },
  stage: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  hint: { color: colors.textMuted, fontSize: font.small - 2, fontWeight: '600' },
  row: { flexDirection: 'row', gap: space.sm },
  pill: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: '#0B0B0DE6',
  },
  pillTurn: { backgroundColor: '#1C1810F2', borderColor: colors.gold, boxShadow: shadow.turn },
  avatarBox: { alignItems: 'center' },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { color: colors.text, fontSize: font.body - 2, lineHeight: 20, fontWeight: '800' },
  nameTurn: { color: colors.goldSoft },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  played: { color: colors.success, fontSize: 11, fontWeight: '800' },
  // Balão no estilo do logo: creme, contorno quase preto e vermelho.
  bubble: {
    position: 'absolute',
    right: 6,
    top: 6,
    bottom: 6,
    justifyContent: 'center',
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: 8,
    boxShadow: shadow.card,
  },
  bubbleText: { color: colors.red, fontSize: font.small, fontWeight: '900' },
});
