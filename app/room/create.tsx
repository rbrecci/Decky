import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameMode, HostMode } from '../../src/contracts/types';
import { errorMessage } from '../../src/lib/errors';
import { createRoom } from '../../src/rooms/api';
import { Button } from '../../src/ui/Button';
import { Notice } from '../../src/ui/Notice';
import { Screen } from '../../src/ui/Screen';
import { colors, font, fonts, radius, shadow, space } from '../../src/ui/theme';

const OPTIONS: { mode: HostMode; glyph: string; title: string; devices: string }[] = [
  {
    mode: 'player',
    glyph: '♠',
    title: 'Vou jogar',
    devices: '4 celulares',
  },
  {
    mode: 'table',
    glyph: '◎',
    title: 'Este celular será a mesa',
    devices: '4 celulares + esta mesa',
  },
];

/** Criar sala: o dono escolhe se joga ou se o aparelho dele vira a mesa central. */
export default function CreateRoom() {
  const [gameMode, setGameMode] = useState<GameMode>('2v2');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const count = gameMode === '1v1' ? 2 : 4;
  const [creating, setCreating] = useState<HostMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(mode: HostMode) {
    if (creating) return;
    setCreating(mode);
    setError(null);
    try {
      const room = await createRoom(mode, gameMode, visibility);
      router.replace(`/room/${room.code}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCreating(null);
    }
  }

  return (
    <Screen title="Criar sala">
      <View style={styles.gameModes}>
        {(['1v1', '2v2'] as GameMode[]).map((mode) => (
          <Button key={mode} style={styles.flex} label={mode === '1v1' ? '1v1: Duelo' : '2v2: Duplas'} variant={gameMode === mode ? 'gold' : 'secondary'} disabled={!!creating} onPress={() => setGameMode(mode)} />
        ))}
      </View>
      <View style={styles.gameModes} accessibilityLabel="Visibilidade da sala">
        <Button label="Privada" style={styles.flex} variant={visibility === 'private' ? 'gold' : 'secondary'} disabled={!!creating} onPress={() => setVisibility('private')} />
        <Button label="Pública" style={styles.flex} variant={visibility === 'public' ? 'gold' : 'secondary'} disabled={!!creating} onPress={() => setVisibility('public')} />
      </View>
      {OPTIONS.map((option) => {
        const isCreating = creating === option.mode;
        return (
          <Pressable
            key={option.mode}
            onPress={() => create(option.mode)}
            disabled={!!creating}
            accessibilityRole="button"
            accessibilityLabel={`${option.title}. ${option.mode === 'player' ? `Você ocupa um dos ${count} lugares` : `Este aparelho fica no centro e mostra só a mesa. Os ${count} jogadores usam os próprios celulares`}`}
            accessibilityState={{ busy: isCreating, disabled: !!creating }}
            style={({ pressed }) => [styles.option, pressed && styles.pressed, creating && !isCreating && styles.faded]}
          >
            <View style={styles.optionHead}>
              <Text style={styles.glyph}>{option.glyph}</Text>
              <Text style={styles.optionTitle}>{option.title}</Text>
            </View>
            <Text style={styles.devices}>{option.devices.replaceAll('4', String(count))}</Text>
            <Text style={styles.description}>{option.mode === 'player' ? `Você ocupa um dos ${count} lugares` : `Este aparelho fica no centro e mostra só a mesa. Os ${count} jogadores usam os próprios celulares`}</Text>
            <View style={styles.ctaRow}>
              {isCreating ? <ActivityIndicator color={colors.redText} size="small" /> : null}
              <Text style={styles.cta}>{isCreating ? 'Criando sala…' : 'Criar assim ›'}</Text>
            </View>
          </Pressable>
        );
      })}
      <Notice kind="error" message={error} />
      <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gameModes: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  flex: { flex: 1, minWidth: 0 },
  option: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: space.md,
    gap: space.xs + 2,
    boxShadow: shadow.panel,
  },
  pressed: { backgroundColor: colors.surfaceRaised, borderColor: colors.goldDeep, transform: [{ scale: 0.99 }] },
  faded: { opacity: 0.45 },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  glyph: { fontSize: 22, color: colors.gold, width: 26, textAlign: 'center' },
  optionTitle: { fontFamily: fonts.display, fontSize: font.large, lineHeight: 30, color: colors.text, flexShrink: 1 },
  devices: {
    alignSelf: 'flex-start',
    fontSize: font.small - 2,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.goldSoft,
    borderColor: colors.goldDeep,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  description: { fontSize: font.body - 2, lineHeight: 23, color: colors.textMuted },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  cta: { fontSize: font.body - 1, fontWeight: '800', color: colors.redText },
});
