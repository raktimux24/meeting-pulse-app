import { LinearGradient } from 'expo-linear-gradient';
import { useWindowDimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Pattern, Rect, Stop } from 'react-native-svg';

import { colors, gradients } from '@/theme/tokens';

export function Atmosphere() {
  const { width, height } = useWindowDimensions();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <LinearGradient colors={gradients.screen} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.orb, styles.orbCoral]} />
      <View style={[styles.orb, styles.orbIndigo]} />
      <View style={[styles.orb, styles.orbAmber]} />
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
  orb: { position: 'absolute', borderRadius: 999 },
  orbCoral: {
    width: 320,
    height: 320,
    right: -150,
    top: -130,
    backgroundColor: colors.orange,
    opacity: 0.16,
    shadowColor: colors.orange,
    shadowOpacity: 0.95,
    shadowRadius: 110,
  },
  orbIndigo: {
    width: 360,
    height: 360,
    left: -210,
    top: 280,
    backgroundColor: colors.navy,
    opacity: 0.14,
    shadowColor: colors.blue,
    shadowOpacity: 0.8,
    shadowRadius: 120,
  },
  orbAmber: {
    width: 220,
    height: 220,
    right: 40,
    bottom: 90,
    backgroundColor: colors.amber,
    opacity: 0.06,
    shadowColor: colors.amber,
    shadowOpacity: 0.7,
    shadowRadius: 70,
  },
  horizon: { position: 'absolute', top: 0, right: 0, width: '78%', height: 280 },
});
