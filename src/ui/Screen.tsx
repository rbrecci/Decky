import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Backdrop } from './Backdrop';
import { Button } from './Button';
import { RuledTitle } from './Ornament';
import { colors, fonts, space } from './theme';

interface Props {
  title?: string;
  /** Linha de apoio abaixo do título. */
  subtitle?: string;
  children: ReactNode;
  /** Conteúdo rolável (formulários e listas). */
  scroll?: boolean;
  fixedHeader?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  backLoading?: boolean;
  maxWidth?: number;
}

/** Moldura das telas fora da partida: salão escuro, área segura e título com filete dourado. */
export function Screen({ title, subtitle, children, scroll = true, fixedHeader, onBack, backLabel = 'Voltar', backDisabled, backLoading, maxWidth = 560 }: Props) {
  const hasBackHeader = !!onBack && fixedHeader == null;
  const header = fixedHeader ?? (onBack ? (
    <View style={styles.headerRow}>
      <View style={styles.headerCopy}>
        {title ? <RuledTitle style={styles.fixedTitle}>{title}</RuledTitle> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Button label={backLabel} variant="ghost" size="compact" onPress={onBack} disabled={backDisabled} loading={backLoading} style={styles.backButton} />
    </View>
  ) : null);

  const body = (
    <View style={[styles.content, { maxWidth }]}>
      {title && !hasBackHeader ? (
        <View style={styles.head}>
          <RuledTitle style={styles.title}>{title}</RuledTitle>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      <Backdrop />
      <SafeAreaView style={styles.flex}>
        {header ? <View style={[styles.fixedHeader, { maxWidth }]}>{header}</View> : null}
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {scroll ? (
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              // iOS: arrastar a tela para baixo recolhe o teclado acompanhando o dedo, como nos apps nativos.
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            >
              {body}
            </ScrollView>
          ) : (
            body
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { flex: 1, width: '100%', alignSelf: 'center', padding: space.lg, gap: space.md, minWidth: 0 },
  fixedHeader: { width: '100%', alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.sm, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  headerCopy: { flex: 1, minWidth: 0, gap: space.sm },
  fixedTitle: { fontFamily: fonts.display, fontSize: 30, lineHeight: 40, color: colors.text },
  backButton: { flexShrink: 0 },
  head: { gap: space.sm, marginBottom: space.xs },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 40, color: colors.text },
  subtitle: { fontSize: 16, color: colors.textMuted },
});
