import { useContext } from 'react';
import { MenuDensityContext } from './menuDensity';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './icons';
import { colors, font, radius, shadow, space, TOUCH_MIN } from './theme';

/**
 * - primary: laca vermelha do logo (ação principal da tela);
 * - dark: grafite com contorno metálico (ação importante, secundária);
 * - secondary: contorno discreto, sem preenchimento;
 * - gold: bronze, para a ação de destaque da mesa (uso raro);
 * - ghost: só texto (sair, cancelar).
 */
type Variant = 'primary' | 'secondary' | 'dark' | 'gold' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  /** Texto extra para leitores de tela. */
  hint?: string;
  /** 'compact' para fileiras de ações lado a lado (mantém o alvo de toque mínimo). */
  size?: 'normal' | 'compact';
  /**
   * Ícone da ação. No 'compact' fica em cima do rótulo: cabe em três botões lado a lado
   * mesmo no iPhone SE, sem quebrar palavra. No 'normal', à esquerda.
   */
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading, hint, size = 'normal', icon, style }: Props) {
  const dense = useContext(MenuDensityContext);
  const inactive = disabled || loading;
  const palette = VARIANTS[variant];
  const compact = size === 'compact';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      aria-disabled={!!inactive}
      aria-busy={!!loading}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        dense && styles.dense,
        compact && icon && styles.compactIcon,
        { backgroundColor: palette.bg, borderColor: palette.border },
        palette.raised && !inactive && styles.raised,
        pressed && { backgroundColor: palette.pressed, transform: [{ scale: 0.98 }] },
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={[styles.texts, icon && !compact && styles.inline]}>
          {icon ? <Icon name={icon} size={compact ? 18 : 20} color={palette.text} /> : null}
          <Text
            style={[styles.label, compact && styles.labelCompact, dense && styles.denseLabel, compact && icon && styles.labelIcon, { color: palette.text }]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { bg: string; pressed: string; text: string; border: string; raised: boolean }> = {
  primary: { bg: '#A80E27', pressed: colors.redDeep, text: colors.cream, border: '#D0263F', raised: true },
  dark: { bg: colors.surfaceRaised, pressed: colors.surface, text: colors.text, border: colors.lineStrong, raised: true },
  secondary: { bg: 'transparent', pressed: '#FFFFFF0F', text: colors.text, border: colors.line, raised: false },
  gold: { bg: '#2A2216', pressed: '#1E1810', text: colors.goldSoft, border: colors.gold, raised: true },
  ghost: { bg: 'transparent', pressed: '#FFFFFF0F', text: colors.textMuted, border: 'transparent', raised: false },
};

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH_MIN + 10,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dense: { minHeight: 44, paddingVertical: 6, paddingHorizontal: 16 },
  denseLabel: { fontSize: 16 },
  raised: { boxShadow: shadow.button },
  compact: { minHeight: TOUCH_MIN + 4, paddingHorizontal: space.sm, paddingVertical: space.xs },
  texts: { alignItems: 'center', gap: 2, minWidth: 0, flexShrink: 1 },
  inline: { flexDirection: 'row', gap: space.sm },
  label: { fontSize: font.body + 1, fontWeight: '700', letterSpacing: 0.3, textAlign: 'center', flexShrink: 1 },
  labelCompact: { fontSize: font.body - 1, fontWeight: '800', letterSpacing: 0 },
  // Com ícone em cima: rótulo um pouco menor e menos recuo, para "Pedir TRUCO" e "Escolha a carta"
  // caberem numa linha nos três botões lado a lado de um iPhone SE (375 pt).
  compactIcon: { paddingHorizontal: space.xs + 2 },
  labelIcon: { fontSize: font.body - 3 },
  // 0,5 mantém o rótulo legível (contraste ~4,5:1 sobre o painel): o botão parado também informa.
  disabled: { opacity: 0.5 },
});
