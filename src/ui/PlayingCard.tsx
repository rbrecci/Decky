import { memo, useId } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { Card, Suit } from '../contracts/types';
import { cardImage } from './cardImages';
import { STAR_24 } from './icons';
import { colors, shadow } from './theme';

const SUIT_NAMES: Record<Suit, string> = { ouros: 'ouros', espadas: 'espadas', copas: 'copas', paus: 'paus' };
const RANK_NAMES: Record<string, string> = { Q: 'dama', J: 'valete', K: 'rei', A: 'ás' };

/** Nome falado da carta, para leitores de tela e textos ("7 de ouros", "ás de espadas"). */
export function cardLabel(card: Card): string {
  return `${RANK_NAMES[card.rank] ?? card.rank} de ${SUIT_NAMES[card.suit]}`;
}

/** Proporção das imagens das cartas (faces e verso, 500 x 726). */
export const CARD_RATIO = 726 / 500;

/**
 * Raio do canto, proporcional à largura: acompanha o canto desenhado na própria arte (~4,4%),
 * então a moldura não deixa cunha de papel nem corta o filete da carta em nenhum tamanho.
 */
export const cardRadius = (width: number) => Math.max(3, Math.round(width * 0.045));

/**
 * Verso das cartas do Decky (baralho fechado, cartas dos outros jogadores e distribuição).
 * Gerado de `assets/Fundo-Carta-Vermelho.png` por `scripts/build_cards.py`, em 500 x 726 como as faces.
 * O original (1024 x 1536, 2,2 MB) era decodificado em até ~25 imagens ao mesmo tempo na distribuição.
 */
export const CARD_BACK = require('../../assets/cards/back.png');

interface Props {
  card?: Card;
  /** Largura em pontos; a altura segue a proporção da carta. */
  width: number;
  faceDown?: boolean;
  /** Carta vencedora da vaza na mesa (contorno dourado). */
  highlighted?: boolean;
  /** Manilha na mão do jogador: contorno e halo dourados e o selo com a estrela no canto. */
  manilha?: boolean;
  /** Carta escolhida na mão, aguardando confirmação. */
  selected?: boolean;
  /** Marcada para jogada automática: contorno e brilho azul-aço (o selo fica no painel da mão). */
  auto?: boolean;
  /** Com `selected`: a jogada pode ser confirmada agora (contorno vermelho aceso; senão, metálico). */
  ready?: boolean;
  dimmed?: boolean;
  /** Sombra de apoio: 'table' para carta pousada no feltro, 'lifted' para a carta erguida na mão. */
  elevation?: 'none' | 'table' | 'lifted';
  onPress?: () => void;
  disabled?: boolean;
  hint?: string;
}

export function PlayingCard({
  card,
  width,
  faceDown,
  highlighted,
  manilha,
  selected,
  auto,
  ready,
  dimmed,
  elevation = 'none',
  onPress,
  disabled,
  hint,
}: Props) {
  const height = width * CARD_RATIO;
  const face = !faceDown && card ? card : null;
  const corner = cardRadius(width);
  const shadows = [
    elevation === 'lifted' ? shadow.cardLifted : elevation === 'table' ? shadow.card : null,
    manilha && face ? shadow.manilha : null,
    auto ? shadow.auto : null,
    selected && ready ? shadow.ready : null,
  ].filter(Boolean);
  const label = face
    ? `${cardLabel(face)}${manilha ? ', manilha' : ''}${auto ? ', jogada automática' : ''}`
    : 'carta virada';

  // A sombra fica num invólucro: no quadro de dentro o `overflow: hidden` (cantos da imagem) a cortaria.
  const image = (
    <View style={[{ borderRadius: corner }, shadows.length > 0 && { boxShadow: shadows.join(', ') }, dimmed && styles.dimmed]}>
      <View
        style={[
          styles.frame,
          { width, height, borderRadius: corner, backgroundColor: face ? colors.paper : colors.ink },
          highlighted && styles.highlighted,
          manilha && face && styles.manilha,
          auto && styles.auto,
          selected && (ready ? styles.selectedReady : styles.selectedWaiting),
        ]}
      >
        <Image source={face ? cardImage(face) : CARD_BACK} style={styles.image} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
      {manilha && face ? <ManilhaSeal cardWidth={width} /> : null}
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label}>
        {image}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      aria-pressed={!!selected}
      style={({ pressed }) => [pressed && !disabled && styles.pressed]}
    >
      {image}
    </Pressable>
  );
}

/** Tamanho do selo para uma carta de `cardWidth`: legível na mão pequena, discreto na grande. */
export const sealSize = (cardWidth: number) => Math.round(Math.min(34, Math.max(18, cardWidth * 0.26)));

/**
 * Selo da manilha: medalha escura com aro e estrela dourados, presa ao canto superior direito,
 * metade para fora da carta. Fica fora da arte (não cobre valor nem naipe) e a estrela marca a
 * manilha pela forma, não só pela cor.
 */
export const ManilhaSeal = memo(function ManilhaSeal({ cardWidth }: { cardWidth: number }) {
  const size = sealSize(cardWidth);
  const id = `seal${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View
      pointerEvents="none"
      style={[styles.seal, { width: size, height: size, borderRadius: size / 2, top: -size * 0.34, right: -size * 0.34 }]}
    >
      <Svg width={size * 0.78} height={size * 0.78} viewBox="0 0 24 24">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.goldLight} />
            <Stop offset="0.55" stopColor={colors.goldBright} />
            <Stop offset="1" stopColor={colors.gold} />
          </LinearGradient>
        </Defs>
        <Path d={STAR_24} fill={`url(#${id})`} stroke={colors.goldDeep} strokeWidth="0.8" strokeLinejoin="round" />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#00000066',
  },
  image: { width: '100%', height: '100%' },
  highlighted: { borderWidth: 3, borderColor: colors.gold },
  manilha: { borderWidth: 2, borderColor: colors.goldBright },
  auto: { borderWidth: 3, borderColor: colors.auto },
  selectedReady: { borderWidth: 3, borderColor: colors.red },
  selectedWaiting: { borderWidth: 3, borderColor: colors.metal },
  dimmed: { opacity: 0.5 },
  pressed: { transform: [{ translateY: -10 }] },
  seal: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.goldBright,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.6)',
  },
});
