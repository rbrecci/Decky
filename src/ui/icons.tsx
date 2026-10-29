// Ícones vetoriais do Decky, desenhados com react-native-svg (já usado na mesa): sem fonte de
// ícones nem imagem, nítidos em qualquer densidade de tela, iguais no Android e no iOS.
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Contorno de uma estrela de `points` pontas centrada em (cx, cy). */
export function starPath(cx: number, cy: number, outer: number, inner: number, points = 5): string {
  const step = Math.PI / points;
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = i * step - Math.PI / 2;
    parts.push(`${i === 0 ? 'M' : 'L'}${(cx + r * Math.cos(angle)).toFixed(2)} ${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return `${parts.join(' ')} Z`;
}

/** Estrela dourada de 5 pontas no quadrado 24 x 24 (selo da manilha). */
export const STAR_24 = starPath(12, 12.6, 10.5, 4.4);

export type IconName = 'play' | 'raise' | 'fold' | 'accept' | 'no' | 'hidden' | 'bolt' | 'globe' | 'logout' | 'refresh';

/** Relâmpago da jogada automática (24 x 24). */
export const BOLT_24 = 'M13.5 2.5 L5.5 13.5 H11 L10 21.5 L18.5 10 H13 Z';

interface Props {
  name: IconName;
  size?: number;
  color: string;
}

/**
 * - play: carta subindo para a mesa (jogar a carta escolhida);
 * - raise: duas setas para cima (pedir truco, aumentar a aposta);
 * - fold: bandeira branca (correr, desistir da mão);
 * - accept: visto (aceitar o truco, confirmar a decisão da dupla);
 * - no: xis (recusar ou desistir de um pedido da dupla);
 * - hidden: olho riscado (jogar a carta escondida);
 * - bolt: relâmpago (jogada automática).
 */
export function Icon({ name, size = 18, color }: Props) {
  return (
    // Decorativo: quem usa (o botão) já é um único elemento acessível, com o rótulo da ação.
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'globe' ? <>
        <Circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="1.8"/>
        <Path d="M3 12H21 M12 3C7 7 7 17 12 21 M12 3C17 7 17 17 12 21" fill="none" stroke={color} strokeWidth="1.7"/>
      </> : name === 'logout' ? <Path d="M9 4H4V20H9 M9 12H21 M17 8L21 12L17 16" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
        : name === 'refresh' ? <Path d="M20 7V3 M20 7H16 M20 7A9 9 0 1 0 21 14" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
        : name === 'play' ? (
        <>
          <Rect x="6" y="9" width="12" height="13" rx="2" fill="none" stroke={color} strokeWidth="2" />
          <Path d="M12 2.5 L16.5 7 M12 2.5 L7.5 7 M12 2.5 V14" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : name === 'raise' ? (
        <Path d="M6 12.5 L12 6.5 L18 12.5 M6 18.5 L12 12.5 L18 18.5" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      ) : name === 'fold' ? (
        <>
          <Path d="M5.5 21.5 V3" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Path d="M6.5 4 C9.5 2.5 12 5.5 15 4.5 C16.5 4 17.5 3.5 19 3.5 V12.5 C17.5 12.5 16.5 13 15 13.5 C12 14.5 9.5 11.5 6.5 13 Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        </>
      ) : name === 'hidden' ? (
        <>
          <Path d="M2.5 12 C5 7.5 8.5 5.5 12 5.5 C15.5 5.5 19 7.5 21.5 12 C19 16.5 15.5 18.5 12 18.5 C8.5 18.5 5 16.5 2.5 12 Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <Circle cx="12" cy="12" r="3" fill="none" stroke={color} strokeWidth="2" />
          <Path d="M4 20 L20 4" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        </>
      ) : name === 'bolt' ? (
        <Path d={BOLT_24} fill={color} />
      ) : name === 'no' ? (
        <Path d="M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
      ) : (
        <Path d="M4.5 12.5 L9.5 17.5 L19.5 6.5" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </Svg>
  );
}
