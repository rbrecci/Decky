import { Image, type ImageSourcePropType } from 'react-native';
import { eloForMmr } from './elo';

const images: Record<string, ImageSourcePropType> = {
  'Beta 1': require('../../assets/ranks/beta-1.png'),
  'Beta 2': require('../../assets/ranks/beta-2.png'),
  'Beta 3': require('../../assets/ranks/beta-3.png'),
  'Delta 1': require('../../assets/ranks/delta-1.png'),
  'Delta 2': require('../../assets/ranks/delta-2.png'),
  'Delta 3': require('../../assets/ranks/delta-3.png'),
  'Alfa 1': require('../../assets/ranks/alfa-1.png'),
  'Alfa 2': require('../../assets/ranks/alfa-2.png'),
  'Alfa 3': require('../../assets/ranks/alfa-3.png'),
  'Sigma 1': require('../../assets/ranks/sigma-1.png'),
  'Sigma 2': require('../../assets/ranks/sigma-2.png'),
  'Sigma 3': require('../../assets/ranks/sigma-3.png'),
  Omega: require('../../assets/ranks/omega.png'),
};

export function EloBadge({ points, size = 44 }: { points: number; size?: number }) {
  if (points < 500) return null;

  return <Image
    source={images[eloForMmr(points)]}
    resizeMode="contain"
    style={{ width: size, height: size, flexShrink: 0 }}
    accessible={false}
    accessibilityElementsHidden
    importantForAccessibility="no"
    aria-hidden
  />;
}
