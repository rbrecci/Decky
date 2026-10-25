import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import type { PublicRoom } from '../../src/contracts/types';
import { errorCode, errorMessage } from '../../src/lib/errors';
import { useLiveRefresh } from '../../src/lib/useLiveRefresh';
import { fetchPublicRooms, joinRoom } from '../../src/rooms/api';
import { RoomScanner } from '../../src/qr/RoomScanner';
import { Button } from '../../src/ui/Button';
import { Notice } from '../../src/ui/Notice';
import { Screen } from '../../src/ui/Screen';
import { Panel } from '../../src/ui/Panel';
import { Skeleton, SkeletonBlock } from '../../src/ui/Skeleton';
import { TextField } from '../../src/ui/TextField';
import { colors, font } from '../../src/ui/theme';

const CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

export default function JoinRoom() {
  const { code: linkedCode } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(() => linkedCode?.toUpperCase() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { userId } = useAuth();
  const identity = useRef(userId);
  identity.current = userId;
  const [listing, setListing] = useState<{ userId: string | null; rooms: PublicRoom[] } | null>(null);
  const [listStatus, setListStatus] = useState<{ userId: string | null; loading: boolean; error: string | null }>({ userId, loading: true, error: null });
  const sending = useRef(false);
  const { refreshNow } = useLiveRefresh(userId ? `public-rooms:${userId}` : null, [{ table: 'public_room_directory' }], async () => {
    try {
      const rooms = await fetchPublicRooms();
      if (identity.current !== userId) return;
      setListing({ userId, rooms });
      setListStatus({ userId, loading: false, error: null });
    } catch (e) {
      if (identity.current === userId) setListStatus({ userId, loading: false, error: errorMessage(e) });
      throw e;
    }
  });
  const rooms = listing?.userId === userId ? listing.rooms : [];
  const listLoading = listStatus.userId !== userId || listStatus.loading;
  const listError = listStatus.userId === userId ? listStatus.error : null;

  useEffect(() => {
    if (linkedCode) setCode(linkedCode.toUpperCase());
  }, [linkedCode]);

  async function enter(value: string): Promise<boolean> {
    if (sending.current) return false;
    const normalized = value.trim().toUpperCase();
    if (!CODE_REGEX.test(normalized)) {
      setError('O código tem 6 letras e números (sem 0, O, 1 ou I).');
      return false;
    }
    sending.current = true;
    setLoading(true);
    setError(null);
    try {
      await joinRoom(normalized);
      router.replace(`/room/${normalized}`);
      return true;
    } catch (e) {
      // Já estava na sala: só volta para ela.
      if (errorCode(e) === 'already_in_room') { router.replace(`/room/${normalized}`); return true; }
      setError(errorMessage(e));
      void refreshNow();
      return false;
    } finally {
      sending.current = false;
      setLoading(false);
    }
  }
  const submit = () => enter(code);

  return (
    <Screen title="Entrar na sala" maxWidth={840} onBack={() => router.back()}>
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
      <RoomScanner onJoin={async (value) => { setCode(value); return enter(value); }} />
      <Text style={styles.section} accessibilityRole="header">Salas públicas</Text>
      <Notice kind="error" message={listError} />
      {listLoading ? <Skeleton label="Carregando salas públicas">
        {[0, 1, 2].map((row) => <Panel key={row}>
          <SkeletonBlock width="56%" height={23} />
          <SkeletonBlock width="72%" height={19} />
          <SkeletonBlock height={48} />
        </Panel>)}
      </Skeleton> : null}
      {!listLoading && !listError && rooms.length === 0 ? <Text style={styles.meta}>Nenhuma sala pública disponível.</Text> : null}
      {rooms.map((room) => <Panel key={room.id}>
        <Text style={styles.host}>{room.hostName}</Text>
        <Text style={styles.meta}>{room.gameMode === '1v1' ? 'Duelo' : 'Duplas'} · {room.playerCount}/{room.capacity} jogadores</Text>
        <Button label={room.playerCount >= room.capacity ? 'Sala cheia' : 'Entrar na sala'} variant="dark" disabled={loading || room.playerCount >= room.capacity} onPress={() => void enter(room.code)} />
      </Panel>)}
      <Button label="Atualizar salas" variant="secondary" disabled={listLoading} onPress={() => void refreshNow()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: font.huge - 4, fontWeight: '800', letterSpacing: 6, textAlign: 'center', color: colors.goldSoft },
  section: { fontSize: 24, color: colors.text, marginTop: 16 },
  host: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { fontSize: 15, color: colors.textMuted },
});
