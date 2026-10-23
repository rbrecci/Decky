import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import type { Seat } from '../../contracts/types';
import { PlayingCard } from '../../ui/PlayingCard';
import { DEAL_TIMING, dealBoundaries, dealOrder, type DealRun } from '../deal';
import type { Side } from '../describe';
import { center, type TableGeometry } from '../geometry';

interface Props {
  geometry: TableGeometry;
  dealerSeat: Seat;
  /** Lado da tela de cada assento. */
  sideOf: (seat: Seat) => Side;
  run: DealRun;
  /** Destino das cartas do lado de baixo: a etiqueta (mesa) ou a borda inferior, rumo à mão (jogador). */
  bottomTarget: 'chip' | 'edge';
  height: number;
}

/**
 * Cartas voando do baralho até cada lugar, na ordem real da distribuição.
 * Puramente visual: o servidor já distribuiu; isto só conta a história na tela.
 */
export function DealLayer({ geometry, dealerSeat, sideOf, run, bottomTarget, height }: Props) {
  const steps = useMemo(() => dealOrder(dealerSeat, run.gameMode), [dealerSeat, run.gameMode]);
  // Se a tela foi remontada no meio da distribuição, continua do ponto em que estava.
  const offset = Math.max(0, Date.now() - run.startedAt - dealBoundaries(run.intro, run.gameMode).dealing);
  const from = center(geometry.deck);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {steps.map((step, i) => {
        if (step.delay + DEAL_TIMING.flight <= offset) return null;
        const side = sideOf(step.seat);
        const chip = geometry.chips[side];
        const to =
          side === 'bottom' && bottomTarget === 'edge' ? { x: chip.x + chip.w / 2, y: height + geometry.card.h / 2 } : center(chip);
        return (
          <FlyingCard
            key={i}
            from={from}
            to={to}
            delay={Math.max(0, step.delay - offset)}
            width={geometry.deck.w}
            height={geometry.deck.h}
            // Leve inclinação diferente por volta, como cartas de verdade.
            spin={(step.round - 1) * 8 + (side === 'left' || side === 'right' ? 90 : 0)}
          />
        );
      })}
    </View>
  );
}

interface FlyingProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  delay: number;
  width: number;
  height: number;
  spin: number;
}

function FlyingCard({ from, to, delay, width, height, spin }: FlyingProps) {
  const t = useSharedValue(0);
  // O atraso vale o da montagem: re-renders do pai (que recalculam o deslocamento) não reiniciam o voo.
  const [startDelay] = useState(delay);

  useEffect(() => {
    t.value = withDelay(startDelay, withTiming(1, { duration: DEAL_TIMING.flight, easing: Easing.out(Easing.cubic) }));
  }, [startDelay, t]);

  const style = useAnimatedStyle(() => {
    const p = t.value;
    return {
      // Fica escondida no baralho até sair, e some ao pousar no lugar.
      opacity: p === 0 ? 0 : p > 0.85 ? (1 - p) / 0.15 : 1,
      transform: [
        { translateX: from.x - width / 2 + (to.x - from.x) * p },
        { translateY: from.y - height / 2 + (to.y - from.y) * p },
        { rotate: `${spin * p}deg` },
        { scale: 1 - 0.35 * p },
      ],
    };
  });

  return (
    <Animated.View style={[styles.card, { width, height }, style]}>
      <PlayingCard faceDown width={width} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', left: 0, top: 0 },
});
