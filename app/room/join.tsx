import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { errorCode, errorMessage } from '../../src/lib/errors';
import { joinRoom } from '../../src/rooms/api';
import { Button } from '../../src/ui/Button';
import { Notice } from '../../src/ui/Notice';
import { Screen } from '../../src/ui/Screen';
import { TextField } from '../../src/ui/TextField';
import { colors, font } from '../../src/ui/theme';

const CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

export default function JoinRoom() {
  const { code: linkedCode } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(() => linkedCode?.toUpperCase() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (linkedCode) setCode(linkedCode.toUpperCase());
  }, [linkedCode]);

  async function submit() {
    const normalized = code.trim().toUpperCase();
    if (!CODE_REGEX.test(normalized)) {
      setError('O código tem 6 letras e números (sem 0, O, 1 ou I).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await joinRoom(normalized);
      router.replace(`/room/${normalized}`);
    } catch (e) {
      // Já estava na sala: só volta para ela.
      if (errorCode(e) === 'already_in_room') router.replace(`/room/${normalized}`);
      else setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Entrar na sala" subtitle="Peça o código para quem criou a sala.">
      <TextField
        label="Código da sala"
        value={code}
        onChangeText={(text) => setCode(text.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        placeholder="K7M2QX"
        inputStyle={styles.code}
        onSubmitEditing={submit}
      />
      <Notice kind="error" message={error} />
      <Button label="Entrar" onPress={submit} loading={loading} />
      <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: font.huge - 4, fontWeight: '800', letterSpacing: 6, textAlign: 'center', color: colors.goldSoft },
});
