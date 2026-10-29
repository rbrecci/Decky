import { useContext, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './icons';
import { MenuDensityContext } from './menuDensity';
import { colors, radius } from './theme';
interface Props { label:string; icon:IconName; onPress:()=>void; loading?:boolean; disabled?:boolean; tooltipAlign?:'start'|'end'; }

/** Ação compacta com nome acessível, foco visível e tooltip no desktop. */
export function IconButton({label,icon,onPress,loading,disabled,tooltipAlign='start'}:Props) {
  const dense=useContext(MenuDensityContext);
  const [hovered,setHovered]=useState(false),[focused,setFocused]=useState(false);
  const inactive=!!(loading||disabled),active=hovered||focused;
  return <View style={styles.container}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:inactive,busy:!!loading}}
      aria-disabled={inactive} aria-busy={!!loading} disabled={inactive} onPress={onPress}
      onHoverIn={()=>setHovered(true)} onHoverOut={()=>setHovered(false)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
      style={({pressed})=>[styles.button,dense&&styles.dense,active&&styles.active,pressed&&styles.pressed,inactive&&styles.disabled]}>
      {loading?<ActivityIndicator color={colors.goldSoft}/>:<Icon name={icon} size={21} color={active?colors.goldSoft:colors.textMuted}/>}
    </Pressable>
    {active&&Platform.OS==='web'?<View pointerEvents="none" style={[styles.tooltip,tooltipAlign==='end'&&styles.tooltipEnd]}><Text style={styles.tooltipText}>{label}</Text></View>:null}
  </View>;
}
const styles=StyleSheet.create({
 container:{position:'relative',alignSelf:'flex-start',zIndex:2},
 button:{width:48,height:48,borderRadius:radius.sm,borderWidth:1,borderColor:colors.line,alignItems:'center',justifyContent:'center',backgroundColor:colors.surfaceSunken},
 dense:{width:44,height:44},active:{borderColor:colors.gold,backgroundColor:colors.surfaceRaised},pressed:{backgroundColor:colors.surface},disabled:{opacity:0.5},
 tooltip:{position:'absolute',top:'100%',left:0,marginTop:6,minWidth:140,paddingHorizontal:10,paddingVertical:7,borderRadius:6,backgroundColor:colors.surfaceRaised,borderWidth:1,borderColor:colors.lineStrong},
 tooltipEnd:{left:'auto',right:0},
 tooltipText:{fontSize:13,color:colors.text},
});
