import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Panel } from './Panel';
import { colors, radius, space } from './theme';

export function Skeleton({ label, children, style }: { label: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacity = useSharedValue(1);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.55, { duration: 1000, reduceMotion: ReduceMotion.System }), -1, true, undefined, ReduceMotion.System);
    return () => cancelAnimation(opacity);
  }, [opacity]);

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }} aria-busy pointerEvents="none" style={style}>
      <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={[styles.content, pulse]}>
        {children}
      </Animated.View>
    </View>
  );
}

export function SkeletonBlock({ width = '100%', height = 16, style }: { width?: DimensionValue; height?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.block, { width, height }, style]} />;
}

export function SkeletonCards({ label, count = 3 }: { label: string; count?: number }) {
  return (
    <Skeleton label={label}>
      {Array.from({ length: count }, (_, index) => (
        <Panel key={index}>
          <SkeletonBlock width="55%" height={24} />
          <SkeletonBlock width="85%" />
          <SkeletonBlock width="65%" />
          <SkeletonBlock width="35%" height={14} />
        </Panel>
      ))}
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md },
  block: { backgroundColor: colors.line, borderRadius: radius.sm, maxWidth: '100%' },
});
