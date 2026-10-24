import { describe, expect, it } from 'vitest';
import { createQrReadGate, parseRoomQr } from '../../src/qr/code';

describe('QR de convite Decky', () => {
  it('aceita código e os links que o lobby gera na web e no APK', () => {
    for (const value of [' k7m2qx ', 'decky://invite?code=K7M2QX', 'decky:///invite?code=k7m2qx', 'https://decky-brecci.expo.app/invite?code=K7M2QX']) {
      expect(parseRoomQr(value)).toBe('K7M2QX');
    }
  });
  it('recusa destino externo, protocolo ativo, rota errada e parâmetro ambíguo', () => {
    for (const value of ['https://evil.test/invite?code=K7M2QX', 'javascript:alert(1)', 'https://decky-brecci.expo.app.evil.test/invite?code=K7M2QX', 'https://decky-brecci.expo.app/other?code=K7M2QX', 'decky://invite?code=K7M2QX&code=ABCDEF', 'decky://invite?code=K7M2QX&next=https://evil.test', 'decky://invite?code=000000', 'K7M2QX<script>']) {
      expect(parseRoomQr(value)).toBeNull();
    }
  });
  it('trava frames repetidos até a entrada falhar e o usuário escolher tentar de novo', () => {
    const gate = createQrReadGate();
    expect(gate.accept('inválido')).toBeNull();
    expect(gate.accept('K7M2QX')).toBe('K7M2QX');
    expect(gate.accept('K7M2QX')).toBeNull();
    expect(gate.accept('ABCDEF')).toBeNull();
    gate.reset();
    expect(gate.accept('ABCDEF')).toBe('ABCDEF');
  });
});
