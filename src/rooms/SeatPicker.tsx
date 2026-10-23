import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import type { GameMode, RoomSeat, Seat } from '../contracts/types';
import { PlayerAvatar, TeamTag } from '../game/components/PlayerIdentity';
import { initials, seatTeam } from '../game/describe';
import { FeltPanel } from '../ui/TableSurface';
import { colors, font, radius, space } from '../ui/theme';

// Grade em volta da mesa: parceiros ficam na diagonal (1 e 3, 2 e 4).
const SEAT_MIN_H = 112;
const GRID: Seat[][] = [
  [1, 2],
  [4, 3],
];

interface Props {
  seats: RoomSeat[];
  gameMode?: GameMode;
  /** Lugar de quem olha (null para a mesa central, que não senta). */
  mySeat: Seat | null;
  hostId: string | undefined;
  disabled: boolean;
  /** Quem olha pode sentar (a mesa central só vê os lugares). */
  canSit: boolean;
  onSit: (seat: Seat) => void;
}

/**
 * Lugares da sala sobre a bandeja de feltro. Cada lugar mostra avatar (ficha com as iniciais na cor da
 * dupla), nome, dupla e se está pronto. Os marcadores (você, dono da sala) são selos na linha da dupla,
 * logo abaixo do nome: ficam junto de quem marcam e um nome longo não os esconde nas reticências.
 * Antes eles tinham uma linha própria embaixo, que sobrava vazia em quem não tinha selo e deixava
 * "VOCÊ" solto no pé do cartão.
 * A bandeja tem cantos de raio fixo e recuo próprio: nenhum lugar encosta no aro, em qualquer tela.
 */
export function SeatPicker({ gameMode = '2v2', seats, mySeat, hostId, disabled, canSit, onSit }: Props) {
  const [gridW, setGridW] = useState<number | null>(null);
  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (gridW === null || Math.abs(gridW - w) > 1) setGridW(w);
  }
  // Caixa estreita (celular pequeno): avatar em cima e nome centralizado com a largura toda,
  // como nas etiquetas laterais da mesa. Ao lado, o nome ficava com poucos caracteres por linha.
  const narrow = gridW !== null && (gridW - space.sm) / 2 < 150;

  return (
    <FeltPanel>
      <Text style={styles.teams}>{gameMode === '1v1' ? '1v1: um jogador de cada lado' : 'Dupla A: lugares 1 e 3 · Dupla B: lugares 2 e 4'}</Text>
      <View style={styles.grid} onLayout={onLayout}>
        {(gameMode === '1v1' ? [[1, 2] as Seat[]] : GRID).map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((seat) => (
              <SeatBox
                key={seat}
                seat={seat}
                gameMode={gameMode}
                player={seats.find((s) => s.seat === seat)}
                isMe={mySeat === seat}
                narrow={narrow}
                hostId={hostId}
                disabled={disabled}
                canSit={canSit}
                onSit={() => onSit(seat)}
              />
            ))}
          </View>
        ))}
      </View>
    </FeltPanel>
  );
}

interface SeatBoxProps {
  gameMode: GameMode;
  seat: Seat;
  player: RoomSeat | undefined;
  isMe: boolean;
  narrow: boolean;
  hostId: string | undefined;
  disabled: boolean;
  canSit: boolean;
  onSit: () => void;
}

function SeatBox({ gameMode, seat, player, isMe, narrow, hostId, disabled, canSit, onSit }: SeatBoxProps) {
  const team = seatTeam(seat);
  const teamColor = team === 'A' ? colors.teamA : colors.teamB;
  const label = gameMode === '1v1' ? `Jogador ${team}` : `Dupla ${team}`;
  const header = `Lugar ${seat}, ${label}`;

  if (!player) {
    // Mesma estrutura do lugar ocupado (cabeçalho com o estado, marca no lugar do avatar, "Livre" no
    // lugar do nome e a dupla embaixo): os quatro cartões ficam com a mesma altura e o mesmo alinhamento.
    const hint = (
      <Text style={[styles.freeHint, narrow && styles.center]} numberOfLines={1}>
        {canSit ? 'Toque para sentar' : 'Aguardando jogador'}
      </Text>
    );
    return (
      <Pressable
        style={({ pressed }) => [styles.seat, styles.seatFree, pressed && styles.seatPressed]}
        onPress={onSit}
        disabled={disabled || !canSit}
        accessibilityRole="button"
        accessibilityLabel={`${header}, livre.${canSit ? ' Toque para sentar aqui' : ' Aguardando jogador'}`}
      >
        <View style={[styles.headerRow, narrow && styles.headerRowNarrow]}>
          <Text style={[styles.seatHeader, styles.seatHeaderTaken]} numberOfLines={1}>
            LUGAR {seat}
          </Text>
        </View>
        <View style={[styles.identity, narrow && styles.identityNarrow]}>
          <View style={[styles.freeMark, { borderColor: teamColor, width: narrow ? 36 : 40, height: narrow ? 36 : 40 }]}>
            <Text style={[styles.freePlus, { color: teamColor }]}>+</Text>
          </View>
          <View style={[styles.texts, narrow ? styles.textsNarrow : styles.textsWide]}>
            <Text style={[styles.name, styles.free, narrow && styles.center]} numberOfLines={1}>
              Livre
            </Text>
            <View style={[styles.meta, narrow && styles.metaNarrow]}>
              <TeamTag team={team} text={label} large />
            </View>
          </View>
        </View>
        {hint}
      </Pressable>
    );
  }

  const isHost = player.userId === hostId;
  const ready = (
    <Text style={[styles.ready, narrow && styles.center, { color: player.ready ? colors.success : colors.textFaint }]} numberOfLines={1}>
      {player.ready ? '✓ Pronto' : '… Aguardando'}
    </Text>
  );
  return (
    <View
      style={[styles.seat, isMe && styles.seatMe]}
      accessible
      accessibilityLabel={`${header}, ${player.displayName}${isMe ? ', você' : ''}${isHost ? ', dono da sala' : ''}, ${
        player.ready ? 'pronto' : 'aguardando'
      }`}
    >
      <View style={[styles.headerRow, narrow && styles.headerRowNarrow]}>
        <Text style={[styles.seatHeader, styles.seatHeaderTaken]} numberOfLines={1}>
          LUGAR {seat}
        </Text>
      </View>
      <View style={[styles.identity, narrow && styles.identityNarrow]}>
        <PlayerAvatar initials={initials(player.displayName)} team={team} size={narrow ? 36 : 40} active={false} />
        <View style={[styles.texts, narrow ? styles.textsNarrow : styles.textsWide]}>
          {/* Na sala sobra altura: nome longo quebra em até duas linhas antes das reticências. */}
          <Text style={[styles.name, narrow && styles.center]} numberOfLines={2} ellipsizeMode="tail">
            {player.displayName}
          </Text>
          <View style={[styles.meta, narrow && styles.metaNarrow]}>
            <TeamTag team={team} text={label} large />
            {isMe ? <Text style={[styles.tag, styles.tagMe]}>VOCÊ</Text> : null}
            {isHost ? <Text style={[styles.tag, styles.tagHost]}>DONO</Text> : null}
          </View>
        </View>
      </View>
      {ready}
    </View>
  );
}

const styles = StyleSheet.create({
  teams: { fontSize: font.small - 1, color: colors.textMuted, textAlign: 'center', marginBottom: space.sm },
  grid: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  // Altura mínima igual para todos (os dois da mesma fileira esticam juntos); o conteúdo fica
  // centralizado, com o mesmo recuo e o mesmo espaço entre blocos em qualquer estado.
  seat: {
    flex: 1,
    minWidth: 0,
    minHeight: SEAT_MIN_H,
    backgroundColor: '#0D0E10E6',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.sm + 2,
    justifyContent: 'center',
    gap: space.sm,
    overflow: 'hidden',
  },
  seatFree: {
    borderStyle: 'dashed',
    borderColor: colors.metalDark,
    backgroundColor: '#00000040',
  },
  seatPressed: { backgroundColor: '#FFFFFF14' },
  seatMe: { borderColor: colors.gold, backgroundColor: '#1C1810F0' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerRowNarrow: { justifyContent: 'center' },
  seatHeader: { fontSize: font.small - 3, fontWeight: '800', letterSpacing: 0.3 },
  seatHeaderTaken: { color: colors.textFaint, letterSpacing: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  identityNarrow: { flexDirection: 'column', gap: 4 },
  texts: { minWidth: 0, gap: 1 },
  textsWide: { flex: 1 },
  // Sem `flex: 0`: no web ele zera a altura do bloco.
  textsNarrow: { alignSelf: 'stretch', alignItems: 'center' },
  center: { textAlign: 'center' },
  name: { fontSize: font.body - 1, lineHeight: 21, fontWeight: '800', color: colors.text },
  // Dupla e selos na mesma linha, logo abaixo do nome; quebram para a linha de baixo se não couberem.
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 3, marginTop: 2 },
  metaNarrow: { justifyContent: 'center' },
  tag: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tagMe: { color: colors.ink, backgroundColor: colors.gold },
  tagHost: { color: colors.goldSoft, borderWidth: 1, borderColor: colors.goldDeep },
  ready: { fontSize: font.small - 2, fontWeight: '700' },
  freeMark: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freePlus: { fontSize: 20, lineHeight: 22, fontWeight: '700' },
  free: { color: colors.textMuted, fontWeight: '700' },
  freeHint: { fontSize: font.small - 2, color: colors.textFaint },
});
