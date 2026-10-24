import { createElement, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Button } from '../ui/Button';
import { colors, radius, space, TOUCH_MIN } from '../ui/theme';

export function AuthForm({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) {
  if (Platform.OS === 'web') {
    return createElement('form', {
      onSubmit: (event: { preventDefault: () => void }) => { event.preventDefault(); onSubmit(); },
      style: { display: 'flex', flexDirection: 'column', gap: space.md, width: '100%' },
    }, children);
  }
  return <View style={{ gap: space.md }}>{children}</View>;
}

export function AuthSubmit({ label, onPress, loading, disabled }: {
  label: string; onPress: () => void; loading?: boolean; disabled?: boolean;
}) {
  if (Platform.OS === 'web') {
    return createElement('button', {
      type: 'submit', disabled: loading || disabled, 'aria-busy': !!loading,
      style: {
        minHeight: TOUCH_MIN + 10, padding: `${space.sm}px ${space.lg}px`, borderRadius: radius.md,
        background: '#A80E27', color: colors.cream, border: '1.5px solid #D0263F',
        font: '700 17px system-ui, sans-serif', cursor: loading || disabled ? 'default' : 'pointer',
        opacity: loading || disabled ? 0.5 : 1,
      },
    }, loading ? 'Aguarde...' : label);
  }
  return <Button label={label} onPress={onPress} loading={loading} disabled={disabled} />;
}
