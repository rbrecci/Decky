import { ActivityIndicator, Image, Pressable, StyleSheet, Text } from 'react-native';

export function GoogleButton({ onPress, disabled, loading }: { onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return <Pressable
    accessibilityRole="button" accessibilityLabel="Entrar com Google"
    accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
    disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [styles.button, pressed && { backgroundColor: '#E8EAED' }, (disabled || loading) && { opacity: 0.5 }]}
  >
    {loading ? <ActivityIndicator color="#1F1F1F" /> : <Image source={require('../../assets/google-g.png')} style={styles.logo} accessibilityElementsHidden importantForAccessibility="no" />}
    <Text style={styles.label}>Entrar com Google</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, borderWidth: 1, borderColor: '#747775', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  logo: { width: 20, height: 20 },
  label: { color: '#1F1F1F', fontSize: 14, fontWeight: '500' },
});
