import { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';
import { colors, font, radius, space, TOUCH_MIN } from './theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  inputStyle?: StyleProp<TextStyle>;
  required?: boolean;
}

export function TextField({ label, error, inputStyle, onFocus, onBlur, required, ...input }: Props) {
  const [focused, setFocused] = useState(false);
  const webProps = Platform.OS === 'web' ? { required, 'aria-required': required, name: input.nativeID } : {};
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...webProps}
        accessibilityLabel={label}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.gold}
        cursorColor={colors.gold}
        keyboardAppearance="dark"
        style={[styles.input, focused && styles.inputFocused, error ? styles.inputError : null, inputStyle]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...input}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          ⚠ {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.xs + 2 },
  label: { fontSize: font.small, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.3 },
  input: {
    minHeight: TOUCH_MIN + 8,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: font.large - 2,
    color: colors.text,
    backgroundColor: colors.surfaceSunken,
  },
  inputFocused: { borderColor: colors.gold },
  inputError: { borderColor: colors.red },
  error: { fontSize: font.small, color: colors.redText, fontWeight: '600' },
});
