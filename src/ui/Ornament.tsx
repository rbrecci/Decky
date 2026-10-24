import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { colors, space } from './theme';

const SUITS = [
  { glyph: '♠', red: false },
  { glyph: '♥', red: true },
  { glyph: '♦', red: true },
  { glyph: '♣', red: false },
];

/** Filete metálico com os quatro naipes, como a gravação de uma mesa. Decorativo: oculto para leitores de tela. */
export function Ornament({ width = 260 }: { width?: number }) {
  return (
    <View style={[styles.row, { width }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.line} />
      {SUITS.map((s) => (
        <Text key={s.glyph} style={[styles.suit, { color: s.red ? colors.red : colors.metal }]}>
          {s.glyph}
        </Text>
      ))}
      <View style={styles.line} />
    </View>
  );
}

/** Filete curto dourado sob títulos. */
export function TitleRule({ width }: { width: number }) {
  return <View style={[styles.rule, { width }]} accessibilityElementsHidden importantForAccessibility="no" />;
}

export function RuledTitle({ children, style, centered = false }: { children: string; style?: StyleProp<TextStyle>; centered?: boolean }) {
  const [width, setWidth] = useState(0);
  return (
    <View style={{ alignItems: centered ? 'center' : 'flex-start', gap: space.sm, flexShrink: 1, maxWidth: '100%' }}>
      <Text accessibilityRole="header" style={[{ alignSelf: centered ? 'center' : 'flex-start', flexShrink: 1 }, style]}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>{children}</Text>
      <TitleRule width={width} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: space.sm },
  line: { flex: 1, height: 1, backgroundColor: colors.lineStrong },
  suit: { fontSize: 15, lineHeight: 18 },
  rule: { height: 2, borderRadius: 1, backgroundColor: colors.gold, opacity: 0.85 },
});
