import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import type { PublicGameState, Team } from '../../contracts/types';
import { Button } from '../../ui/Button';
import { Logo } from '../../ui/Logo';
import { RuledTitle } from '../../ui/Ornament';
import { colors, font, fonts, radius, shadow, space } from '../../ui/theme';
import { teamLabel } from '../describe';

interface Props {
  state: PublicGameState;
  /** Dupla de quem olha; null na mesa central. */
  viewerTeam: Team | null;
  onRoom: () => void;
  onHome: () => void;
  /** Só jogadores escrevem nota (a nota é ligada a uma partida que a pessoa jogou). */
  onNote?: () => void;
}

/** Fim de partida: dupla vencedora e próximos passos. */
export function FinishedOverlay({ state, viewerTeam, onRoom, onHome, onNote }: Props) {
  const winner = state.winnerTeam;
  const title =
    winner === null
      ? 'Partida encerrada'
      : viewerTeam === null
        ? `${teamLabel(winner, null, state.gameMode)} venceu!`
        : winner === viewerTeam
          ? state.gameMode === '1v1' ? 'Você venceu!' : 'Vocês venceram!'
          : state.gameMode === '1v1' ? 'O adversário venceu' : 'Eles venceram';
  const left: Team = viewerTeam ?? 'A';
  const right: Team = left === 'A' ? 'B' : 'A';

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.scroll}>
      <Animated.View entering={ZoomIn.duration(300)} style={styles.card} accessibilityViewIsModal>
        <Logo size={72} halo={false} />
        <RuledTitle style={styles.title} centered>{title}</RuledTitle>
        <Text style={styles.score}>
          {teamLabel(left, viewerTeam, state.gameMode)} {state.score[left]} × {state.score[right]} {teamLabel(right, viewerTeam, state.gameMode)}
        </Text>
        <Button label="Voltar para a sala" onPress={onRoom} />
        {onNote ? <Button label="Escrever nota sobre a partida" variant="dark" onPress={onNote} /> : null}
        <Button label="Início" variant="ghost" onPress={onHome} />
      </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.lg },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldDeep,
    padding: space.lg,
    gap: space.md,
    boxShadow: shadow.panel,
  },
  title: { fontFamily: fonts.display, fontSize: font.title + 4, lineHeight: 42, color: colors.text, textAlign: 'center' },
  score: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: font.large, color: colors.goldSoft, textAlign: 'center' },
});
