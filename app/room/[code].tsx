import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { Platform, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../src/auth/AuthProvider';
import type { HostMode, RoomSeat } from '../../src/contracts/types';
import { startMatch } from '../../src/game/api';
import { errorMessage } from '../../src/lib/errors';
import { changeSeat, leaveRoom, setHostMode, setReady, requestSeatSwap, respondSeatSwap } from '../../src/rooms/api';
import { SeatPicker } from '../../src/rooms/SeatPicker';
import { useRoom } from '../../src/rooms/useRoom';
import { Button } from '../../src/ui/Button';
import { Dialog } from '../../src/ui/Dialog';
import { Notice } from '../../src/ui/Notice';
import { Panel } from '../../src/ui/Panel';
import { Screen } from '../../src/ui/Screen';
import { Skeleton, SkeletonBlock } from '../../src/ui/Skeleton';
import { colors, font, fonts, space } from '../../src/ui/theme';

export default function Lobby() {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1024;
  const { code } = useLocalSearchParams<{ code: string }>();
  const { userId } = useAuth();
  const { room, seats, swaps, activeMatchId, gone, loaded, connection, refresh } = useRoom(code);
  const actionPending = useRef(false);
  const [swapTarget, setSwapTarget] = useState<RoomSeat | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Partida começou (por este aparelho ou pelo dono): todos vão para a mesa.
  useEffect(() => {
    if (activeMatchId) router.replace(`/game/${activeMatchId}`);
  }, [activeMatchId]);

  const me = seats.find((s) => s.userId === userId);
  const isHost = !!room && room.hostUserId === userId;
  const tableMode = room?.hostMode === 'table';
  const incoming = swaps.find(s => s.toUserId === userId && s.status === 'pending');
  const outgoing = swaps.find(s => s.fromUserId === userId);
  const feedback = outgoing ? ({ pending: 'Pedido de troca enviado. Aguardando resposta.', accepted: 'Troca de lugar aceita.', rejected: 'Seu pedido de troca foi recusado.', expired: 'Seu pedido de troca expirou.', cancelled: 'Seu pedido de troca foi cancelado.' }[outgoing.status]) : null;
  const capacity = room?.gameMode === '1v1' ? 2 : 4;
  const allReady = seats.length === capacity && seats.every((s) => s.ready);

  async function run(key: string, action: () => Promise<unknown>) {
    if (actionPending.current) return false;
    actionPending.current = true;
    setBusy(key);
    setError(null);
    try {
      await action();
      await refresh();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      actionPending.current = false;
      setBusy(null);
    }
  }

  async function handleStart() {
    if (!room) return;
    setBusy('start');
    setError(null);
    const result = await startMatch(room.id);
    setBusy(null);
    if (result.ok) router.replace(`/game/${result.matchId}`);
    else setError(errorMessage(result.error));
  }

  async function handleLeave() {
    if (!room || await run('leave', () => leaveRoom(room.id))) router.replace('/');
  }

  // No modo mesa o dono não ocupa lugar, mas continua na sala.
  if (loaded && (gone || (!me && !isHost))) {
    return (
      <Screen title="Sala indisponível" onBack={() => router.replace('/')}>
        <Notice kind="info" message="Esta sala não existe mais ou você não está nela." />
      </Screen>
    );
  }

  if (!loaded || activeMatchId) {
    return (
      <Screen title="Sala" maxWidth={840} onBack={() => router.replace('/')}>
        <Skeleton label={activeMatchId ? 'Abrindo a partida' : 'Carregando sala'}>
          <Panel style={styles.codeBox}>
            <SkeletonBlock width="40%" height={14} style={{ alignSelf: 'center' }} />
            <SkeletonBlock width="60%" height={48} style={{ alignSelf: 'center' }} />
            <SkeletonBlock width={192} height={192} style={{ alignSelf: 'center' }} />
            <SkeletonBlock height={44} />
          </Panel>
          <Panel>
            <SkeletonBlock width="65%" height={24} />
            <SkeletonBlock height={40} />
          </Panel>
          <SkeletonBlock height={144} />
          <SkeletonBlock height={56} />
        </Skeleton>
        {connection === 'reconnecting' ? <>
          <Notice kind="info" message="Não foi possível carregar a sala. Tentando reconectar..." />
          <Button label="Tentar novamente" variant="secondary" onPress={() => void refresh()} />
        </> : null}
      </Screen>
    );
  }

  return (
    <Screen title="Sala" maxWidth={840} onBack={handleLeave} backLabel="Sair" backLoading={busy === 'leave'}>
      <Panel tone="accent" style={[styles.codeBox, desktop && styles.codeBoxDesktop]}>
        <View style={[styles.codeTexts, desktop && styles.codeTextsDesktop]}>
        <Text style={styles.codeLabel}>CÓDIGO DA SALA</Text>
        {room ? <Text style={styles.codeLabel}>{room.visibility === 'public' ? 'PÚBLICA' : 'PRIVADA'}</Text> : null}
        <Text style={styles.code} accessibilityLabel={`Código ${code?.split('').join(' ')}`} selectable>
          {code}
        </Text>
        </View>
        {code ? (
          <View style={styles.qrCode} accessible accessibilityLabel={`QR code para entrar na sala ${code}`}>
            <QRCode value={Linking.createURL('invite', { queryParams: { code } })} size={desktop ? 112 : 176} />
          </View>
        ) : null}
        <Button
          label="Compartilhar código"
          variant="dark"
          size="compact"
          onPress={() => Share.share({ message: `Vem jogar truco no Decky! Código da sala: ${code}` })}
        />
      </Panel>

      {connection === 'reconnecting' ? <Notice kind="info" message="Reconectando..." /> : null}

      {room ? (
        <ModeBox
          mode={room.hostMode}
          capacity={capacity}
          gameMode={room.gameMode}
          isHost={isHost}
          busy={busy === 'mode'}
          disabled={!!busy}
          onSwitch={(mode) => run('mode', () => setHostMode(room.id, mode))}
        />
      ) : null}

      <SeatPicker
        seats={seats}
        gameMode={room?.gameMode}
        mySeat={me?.seat ?? null}
        hostId={room?.hostUserId}
        disabled={!!busy}
        // A mesa não senta: para ela, lugar livre só mostra que falta jogador.
        canSit={!!me}
        onRequestSwap={setSwapTarget}
        onSit={(seat) => room && run(`seat-${seat}`, () => changeSeat(room.id, seat))}
      />

      <Notice kind="error" message={error} />
      <Notice kind="info" message={feedback} />
      <Dialog open={!!swapTarget && !incoming} title="Enviar pedido de troca de lugar" error={error} message={swapTarget ? `Trocar de lugar com ${swapTarget.displayName}?` : undefined}
        confirmLabel="Enviar" busy={busy === 'swap-send'} onCancel={() => setSwapTarget(null)}
        onConfirm={() => { if (room && swapTarget) void run('swap-send', () => requestSeatSwap(room.id, swapTarget.userId)).then(ok => { if (ok) setSwapTarget(null); }); }} />
      <Dialog open={!!incoming} title="Aceitar pedido de troca de lugar" error={error}
        message={`${seats.find(s => s.userId === incoming?.fromUserId)?.displayName ?? 'Outro jogador'} quer trocar de lugar com você. O pedido vale por 30 segundos.`}
        confirmLabel="Aceitar" cancelLabel="Negar" busy={busy === 'swap-response'}
        onCancel={() => { if (incoming) void run('swap-response', () => respondSeatSwap(incoming.id, false)); }}
        onConfirm={() => { if (incoming) void run('swap-response', () => respondSeatSwap(incoming.id, true)); }} />

      {me ? (
        <Button
          label={me.ready ? 'Não estou pronto' : 'Estou pronto'}
          variant={me.ready ? 'secondary' : 'dark'}
          loading={busy === 'ready'}
          onPress={() => room && run('ready', () => setReady(room.id, !me.ready))}
        />
      ) : null}

      {isHost ? (
        <Button
          label={
            allReady
              ? 'Iniciar partida'
              : seats.length < capacity
                ? `Aguardando jogadores (${seats.length}/${capacity})`
                : `Iniciar (${seats.filter((s) => s.ready).length}/${capacity} prontos)`
          }
          disabled={!allReady}
          loading={busy === 'start'}
          onPress={handleStart}
        />
      ) : (
        <Text style={styles.waiting}>
          {tableMode ? 'Aguardando a mesa (quem criou a sala) iniciar.' : 'Aguardando quem criou a sala iniciar.'}
        </Text>
      )}

    </Screen>
  );
}

interface ModeBoxProps {
  mode: HostMode;
  capacity: number;
  gameMode: string;
  isHost: boolean;
  busy: boolean;
  disabled: boolean;
  onSwitch: (mode: HostMode) => void;
}

/** Mostra como a sala funciona (dono joga ou é a mesa) e, para o dono, permite trocar no lobby. */
function ModeBox({ capacity, gameMode, mode, isHost, busy, disabled, onSwitch }: ModeBoxProps) {
  const table = mode === 'table';
  const title = table
    ? isHost
      ? 'Este celular é a mesa'
      : 'Mesa central ativa'
    : isHost
      ? 'Você joga nesta sala'
      : 'Quem criou a sala também joga';
  const description = table
    ? isHost
      ? `Ele mostra só a mesa e o placar, sem cartas de ninguém. Os ${capacity} lugares são dos jogadores.`
      : 'O celular de quem criou a sala mostra a mesa no centro. Sua mão aparece só no seu celular.'
    : `${capacity} celulares: cada um mostra a mesa em cima e a própria mão embaixo.`;

  return (
    <Panel tone={table ? 'accent' : 'default'}>
      <View accessible={!isHost} accessibilityLabel={`${title}. ${description}`} style={styles.modeTexts}>
        <Text style={styles.modeKicker}>{gameMode.toUpperCase()} · {table ? `MODO MESA · ${capacity + 1} APARELHOS` : `MODO JOGADOR · ${capacity} APARELHOS`}</Text>
        <Text style={[styles.modeTitle, table && styles.modeTitleTable]}>{title}</Text>
        <Text style={styles.modeText}>{description}</Text>
      </View>
      {isHost ? (
        <Button
          label={table ? 'Trocar: quero jogar' : 'Trocar: este celular será a mesa'}
          variant={table ? 'secondary' : 'gold'}
          size="compact"
          loading={busy}
          disabled={disabled}
          onPress={() => onSwitch(table ? 'player' : 'table')}
        />
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  codeBoxDesktop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  codeTexts: { gap: space.xs },
  codeTextsDesktop: { flex: 1 },
  codeBox: { alignItems: 'stretch' },
  codeLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
  code: { color: colors.text, fontSize: font.huge, fontWeight: '800', letterSpacing: 5, textAlign: 'center' },
  qrCode: { alignSelf: 'center', padding: space.sm, backgroundColor: '#FFFFFF' },
  modeTexts: { gap: space.xs },
  modeKicker: { fontSize: font.tiny, fontWeight: '700', letterSpacing: 1.4, color: colors.textFaint },
  modeTitle: { fontFamily: fonts.display, fontSize: font.large - 2, lineHeight: 28, color: colors.text },
  modeTitleTable: { color: colors.goldSoft },
  modeText: { fontSize: font.small, lineHeight: 21, color: colors.textMuted },
  waiting: { fontSize: font.body - 1, color: colors.textMuted, textAlign: 'center' },
});
