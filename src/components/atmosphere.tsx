import { LinearGradient } from 'expo-linear-gradient';
import { useWindowDimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Pattern, Rect, Stop } from 'react-native-svg';

import { Glow } from '@/components/glow';
import { colors, gradients } from '@/theme/tokens';

export function Atmosphere() {
  const { width, height } = useWindowDimensions();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <LinearGradient colors={gradients.screen} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} />
      {/* Radial gradients instead of solid discs, so the glows have no visible edge. */}
      <Glow color={colors.orange} size={620} opacity={0.22} style={{ right: -300, top: -280 }} />
      <Glow color={colors.navy} size={680} opacity={0.17} style={{ left: -380, top: 140 }} />
      <Glow color={colors.amber} size={420} opacity={0.07} style={{ right: -60, bottom: -10 }} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="pulseDots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
            <Circle cx="1.15" cy="1.15" r="0.75" fill="rgba(247,248,252,0.055)" />
          </Pattern>
          <SvgGradient id="pulseVignette" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.paper} stopOpacity="0.22" />
            <Stop offset="0.38" stopColor={colors.paper} stopOpacity="0" />
            <Stop offset="1" stopColor={colors.paper} stopOpacity="0.55" />
          </SvgGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#pulseDots)" />
        {[-8, 54, 118, 186].map((offset) => (
          <Line
            key={offset}
            x1={width * 0.08}
            y1={offset + 36}
            x2={width * 0.92}
            y2={offset + 92}
            stroke="rgba(255,255,255,0.028)"
            strokeWidth="1"
          />
        ))}
        <Rect width={width} height={height} fill="url(#pulseVignette)" />
      </Svg>
      <LinearGradient
        colors={['rgba(255,121,88,0.16)', 'rgba(255,121,88,0.03)', 'transparent']}
        locations={[0, 0.42, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.55 }}
        style={styles.horizon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  horizon: { position: 'absolute', top: 0, right: 0, width: '78%', height: 280 },
});
