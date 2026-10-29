import { useEffect, useRef } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from './Button';
import { Notice } from './Notice';
import { colors, fonts, radius, space } from './theme';

interface Props {
  open: boolean;
  title: string;
  message?: string;
  error?: string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  value?: string;
  onChangeValue?: (value: string) => void;
  inputLabel?: string;
}

/** Modal compartilhado: captura de foco no web e barreira de interação nativa. */
export function Dialog({ open, title, message, error, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', busy, onConfirm, onCancel, value, onChangeValue, inputLabel = 'Texto' }: Props) {
  const cancel = useRef(onCancel);
  cancel.current = onCancel;
  const blocked = useRef(busy);
  blocked.current = busy;
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="decky-dialog"] button, [data-testid="decky-dialog"] [tabindex="0"], [data-testid="decky-dialog"] input')).filter(node => !node.hasAttribute('disabled') && node.getAttribute('aria-disabled') !== 'true');
    const timer = setTimeout(() => focusables()[0]?.focus(), 50);
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!blocked.current) cancel.current(); }
      if (event.key === 'Tab') {
        const items = focusables();
        const index = items.indexOf(document.activeElement as HTMLElement);
        if (!items.length) { event.preventDefault(); return; }
        if (event.shiftKey && index <= 0) { event.preventDefault(); items[items.length - 1].focus(); }
        else if (!event.shiftKey && (index < 0 || index === items.length - 1)) { event.preventDefault(); items[0].focus(); }
      }
    };
    document.addEventListener('keydown', key, true);
    return () => { clearTimeout(timer); document.removeEventListener('keydown', key, true); if (previous?.isConnected) previous.focus(); };
  }, [open]);
  return <Modal visible={open} accessibilityLabel={title} transparent animationType="fade" onRequestClose={() => { if (!busy) onCancel(); }}>
    <View style={styles.scrim}>
      <View testID="decky-dialog" accessibilityViewIsModal style={styles.dialog}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {onChangeValue ? <TextInput accessibilityLabel={inputLabel} autoFocus value={value} onChangeText={onChangeValue} editable={!busy} maxLength={2000} onSubmitEditing={onConfirm} style={styles.input} /> : null}
          <Notice kind="error" message={error} />
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="secondary" disabled={busy} onPress={onCancel} style={styles.action} />
            <Button label={confirmLabel} loading={busy} onPress={onConfirm} style={styles.action} />
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center', padding: space.md },
  dialog: { width: '100%', maxWidth: 440, maxHeight: '90%', borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong },
  content: { padding: space.lg, gap: space.md },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 32, color: colors.text },
  message: { fontSize: 16, lineHeight: 24, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  action: { flex: 1, minWidth: 120 },
  input: { color: colors.text, backgroundColor: colors.surfaceSunken, borderColor: colors.lineStrong, borderWidth: 1, borderRadius: radius.sm, padding: space.md, fontSize: 16 },
});
