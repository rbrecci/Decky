import { memo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, LayoutAnimationConfig, ZoomIn } from 'react-native-reanimated';
import type { MatchPlayer, PublicGameState, Team } from '../../contracts/types';
import { Button } from '../../ui/Button';
import { colors, font, fonts, radius, space } from '../../ui/theme';
import { describeTrick, teamLabel, trucoName } from '../describe';

interface Props {
  state: PublicGameState;
  /** Dupla de quem olha; null na mesa central. */
  viewerTeam: Team | null;
  players: MatchPlayer[];
  large: boolean;
  onLeave: () => void;
  leaveLabel?: string;
}

/** Placar das duplas, valor da mão e vazas da mão atual. Só redesenha quando o estado público muda. */
export const ScoreBar = memo(function ScoreBar({ state, viewerTeam, players, large: requestedLarge, onLeave, leaveLabel = 'Voltar' }: Props) {
  // Para o jogador, "Nós" fica sempre à esquerda; na mesa, A à esquerda.
  // Tela estreita na visão neutra: "DUPLA A" não cabe ao lado do selo do valor e quebrava em duas
  // linhas; fica só a letra, junto do ponto da cor da dupla (o rótulo de acessibilidade segue completo).
  const { width } = useWindowDimensions();
  const large = requestedLarge && width >= 600;
  const label = (team: Team) => (viewerTeam === null && width < 360 ? team : teamLabel(team, viewerTeam, state.gameMode));
  const left: Team = viewerTeam ?? 'A';
  const right: Team = left === 'A' ? 'B' : 'A';
  const members = (team: Team) =>
    players
      .filter((p) => p.team === team)
      .map((p) => p.displayName)
      .join(' e ');

  // O nome curto do pedido preserva espaço para o controle de retorno. O valor atual continua
  // no rótulo de acessibilidade e no aviso do centro.
  const value = state.truco ? `${trucoName(state.truco.value)}?` : `Vale ${state.handValue}`;

  return (
    // Ao abrir a tela, o placar aparece parado; só os pontos que mudam depois entram animados.
    <LayoutAnimationConfig skipEntering>
      <View style={[styles.bar, large && styles.barLarge]}>
        <View
          style={styles.score}
          accessible
          accessibilityLabel={`Placar: ${teamLabel(left, viewerTeam, state.gameMode)} ${state.score[left]}, ${teamLabel(right, viewerTeam, state.gameMode)} ${state.score[right]}. Partida até 12.`}
        >
          <TeamScore team={left} label={label(left)} points={state.score[left]} names={large ? members(left) : null} large={large} />
          <Text style={[styles.x, large && styles.xLarge]}>×</Text>
          <TeamScore team={right} label={label(right)} points={state.score[right]} names={large ? members(right) : null} large={large} />
        </View>

        <View
          style={styles.hand}
          accessible
          accessibilityLabel={`Mão ${state.handNumber}, vale ${state.handValue}${
            state.truco ? `, pedido de ${trucoName(state.truco.value).toLowerCase()} aguardando resposta` : ''
          }. Vazas: ${
            state.trickResults.map((r) => describeTrick(r, viewerTeam, state.gameMode)).join(', ') || 'nenhuma'
          }`}
        >
          {/* Troca de valor (pedido, aceite, mão nova) entra com um leve salto: o aceite de truco aparece
              aqui também, como "Vale 6". Ao abrir a tela, aparece parado (skipEntering acima). */}
          <Animated.Text
            key={value}
            entering={ZoomIn.duration(260)}
            style={[styles.value, large && styles.valueLarge, state.truco && styles.valueTruco]}
            numberOfLines={1}
          >
            {value}
          </Animated.Text>
          <View style={styles.tricks}>
            {[0, 1, 2].map((i) => (
              <TrickDot key={i} result={state.trickResults[i]} viewerTeam={viewerTeam} large={large} />
            ))}
          </View>
        </View>
        <Button label={leaveLabel} variant="ghost" size="compact" onPress={onLeave} style={styles.backButton} />
      </View>
    </LayoutAnimationConfig>
  );
});

function TeamScore({ team, label, points, names, large }: { team: Team; label: string; points: number; names: string | null; large: boolean }) {
  return (
    <View style={styles.team}>
      <View style={styles.teamHead}>
        <View style={[styles.teamDot, { backgroundColor: team === 'A' ? colors.teamA : colors.teamB }]} />
        <Text style={[styles.teamLabel, large && styles.teamLabelLarge]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Animated.Text key={points} entering={FadeInDown.duration(260)} style={[styles.points, large && styles.pointsLarge]}>
        {points}
      </Animated.Text>
      {names ? (
        <Text style={styles.names} numberOfLines={1}>
          {names}
        </Text>
      ) : null}
    </View>
  );
}

function TrickDot({ result, viewerTeam, large }: { result: 'A' | 'B' | 'tie' | undefined; viewerTeam: Team | null; large: boolean }) {
  const size = large ? 26 : 18;
  let bg = 'transparent';
  let label = '';
  if (result === 'tie') {
    bg = colors.metal;
    label = '=';
  } else if (result) {
    bg = result === 'A' ? colors.teamA : colors.teamB;
    label = viewerTeam ? (result === viewerTeam ? 'N' : 'E') : result;
  }
  return (
    <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.dotText, result && styles.dotTextOn, large && { fontSize: 13 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
    paddingHorizontal: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  barLarge: { paddingVertical: space.sm },
  backButton: { flexShrink: 0 },
  score: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  // Nomes longos truncam dentro da coluna, preservando espaço para o retorno.
  team: { alignItems: 'center', minWidth: 44, flexShrink: 1 },
  teamHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  teamDot: { width: 8, height: 8, borderRadius: 4 },
  teamLabel: { color: colors.textMuted, fontSize: font.small - 2, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  teamLabelLarge: { fontSize: font.small },
  points: { fontFamily: fonts.displayHeavy, fontVariant: ['lining-nums'], color: colors.text, fontSize: 32, lineHeight: 40 },
  pointsLarge: { fontSize: 56, lineHeight: 68 },
  names: { color: colors.textFaint, fontSize: font.small - 2, maxWidth: 130, alignSelf: 'stretch', textAlign: 'center' },
  x: { fontFamily: fonts.display, color: colors.metalDark, fontSize: font.large },
  xLarge: { fontSize: font.title },
  hand: { alignItems: 'flex-end', gap: 5, minWidth: 84 },
  value: {
    color: colors.goldSoft,
    fontSize: font.small,
    fontWeight: '800',
    letterSpacing: 0.4,
    borderWidth: 1,
    borderColor: colors.goldDeep,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  valueLarge: { fontSize: font.large, paddingHorizontal: 12 },
  valueTruco: { color: colors.cream, backgroundColor: colors.redDeep, borderColor: colors.red },
  tricks: { flexDirection: 'row', gap: 4 },
  dot: { borderWidth: 1.5, borderColor: colors.metalDark, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  dotTextOn: { color: colors.ink },
});
