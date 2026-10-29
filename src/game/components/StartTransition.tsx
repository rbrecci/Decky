import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Rank } from '../../contracts/types';
import { PlayingCard } from '../../ui/PlayingCard';
import { colors, fonts, space } from '../../ui/theme';

function RisingCard({ index, height, width }: { index: number; height: number; width: number }) {
  const progress = useSharedValue(0);
  useEffect(() => { progress.value = withTiming(1, { duration: 3000 + index * 90, easing: Easing.linear }); }, [progress,index]);
  const motion = useAnimatedStyle(() => ({ opacity: (1-progress.value)*0.6, transform: [{ translateY: (height+130)*(1-progress.value)-130 }, { rotate: `${(index%2 ? -1 : 1)*18}deg` }] }));
  return <Animated.View pointerEvents="none" style={[styles.floating, {left:(index+0.4)*width/8},motion]}><PlayingCard width={42+(index%3)*10} faceDown /></Animated.View>;
}

/** Substitui a tela durante a transição, impedindo ações e foco em controles da partida. */
export function StartTransition({ rank }: {rank: Rank}) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  return <View style={styles.screen} accessibilityViewIsModal>
    {!reducedMotion ? <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({length:8},(_,index) => <RisingCard key={index} index={index} width={width} height={height} />)}
    </View> : null}
    <Text style={styles.title}>A partida vai começar</Text>
    <Animated.View key={rank} entering={reducedMotion ? undefined : FadeIn.duration(180)} accessibilityLiveRegion="polite" accessibilityLabel={rank === 'A' ? 'Um' : rank}>
      <PlayingCard card={{ rank, suit:'espadas' }} width={Math.min(150,width*0.3)} />
    </Animated.View>
    <Text style={styles.note}>Prepare suas cartas</Text>
  </View>;
}
const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center',gap:space.lg,overflow:'hidden'},
  title:{fontFamily:fonts.display,fontSize:26,color:colors.text,textAlign:'center',paddingHorizontal:space.md},
  note:{fontSize:15,color:colors.textMuted},
  floating:{position:'absolute',top:0},
});
