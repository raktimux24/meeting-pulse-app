import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { AppText, formatSigned } from './ui';
import { colors, radius, spacing } from '@/theme/tokens';

const HALF = 30;

function GrowBar({ height, index, style }: { height: number; index: number; style: StyleProp<ViewStyle> }) {
  const grown = useSharedValue(0);
  useEffect(() => {
    grown.value = withDelay(index * 50, withSpring(height, { damping: 16, stiffness: 160, mass: 0.8 }));
  }, [grown, height, index]);
  const animatedStyle = useAnimatedStyle(() => ({ height: grown.value }));
  return <Animated.View style={[style, animatedStyle]} />;
}

/** Diverging bars: return grows up from the centre line, cost grows down, empty days stay empty. */
export function WeekChart({ data }: { data: { label: string; score: number; count: number }[] }) {
  const max = Math.max(1, ...data.map((item) => Math.abs(item.score)));
  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`Weekday pulse chart: ${data.map((d) => `${d.label} ${d.count ? formatSigned(d.score) : 'no meetings'}`).join(', ')}`}
    >
      {data.map((item, index) => {
        const height = Math.max(4, (Math.abs(item.score) / max) * HALF);
        const tone = item.score > 0 ? colors.moss : item.score < 0 ? colors.wine : colors.amber;
        return (
          <View key={`${item.label}-${index}`} style={styles.day}>
            <View style={styles.track}>
              <View style={styles.half}>
                {item.count && item.score > 0 ? <GrowBar height={height} index={index} style={[styles.bar, styles.barUp, { backgroundColor: tone }]} /> : null}
              </View>
              <View style={styles.baseline} />
              <View style={[styles.half, styles.halfDown]}>
                {item.count && item.score < 0 ? <GrowBar height={height} index={index} style={[styles.bar, styles.barDown, { backgroundColor: tone }]} /> : null}
              </View>
              {item.count && item.score === 0 ? <View style={[styles.evenDot, { backgroundColor: tone }]} /> : null}
            </View>
            <AppText variant="small" style={{ color: item.count ? colors.ink : colors.inkSoft }}>{item.label}</AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  day: { flex: 1, alignItems: 'center', gap: 6 },
  track: { width: '100%', borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 5, paddingVertical: 4, alignItems: 'stretch', justifyContent: 'center' },
  half: { height: HALF, justifyContent: 'flex-end' },
  halfDown: { justifyContent: 'flex-start' },
  baseline: { height: 1, backgroundColor: colors.lineDark, marginHorizontal: -5 },
  bar: { width: '100%' },
  barUp: { borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  barDown: { borderBottomLeftRadius: 6, borderBottomRightRadius: 6, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  evenDot: { position: 'absolute', alignSelf: 'center', width: 7, height: 7, borderRadius: 4 },
});
