import { useContext, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MenuDensityContext } from './menuDensity';
import { colors, radius, shadow, space } from './theme';

interface Props {
  children: ReactNode;
  /** 'accent' ganha contorno dourado (o item em destaque da tela). */
  tone?: 'default' | 'accent';
  style?: StyleProp<ViewStyle>;
}

/** Superfície grafite das telas: cartões de opção, código da sala, notas e partidas. */
export function Panel({ children, tone = 'default', style }: Props) {
  const dense = useContext(MenuDensityContext);
  return <View style={[styles.panel, dense && styles.dense, tone === 'accent' && styles.accent, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  dense: { padding: 14, borderRadius: radius.md },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: space.sm,
    boxShadow: shadow.panel,
  },
  accent: { borderColor: colors.goldDeep },
});
