import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
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

/**
 * Diverging bars: return grows up from the centre line, cost grows down, empty days stay empty.
 * Days are tappable when `onSelectDay` is passed.
 */
export function WeekChart({
  data,
  selectedDate,
  onSelectDay,
}: {
  data: { date?: string; label: string; score: number; count?: number }[];
  selectedDate?: string | null;
  onSelectDay?: (date: string) => void;
}) {
  const max = Math.max(1, ...data.map((item) => Math.abs(item.score)));
  // Older callers do not pass a count; treat any non-zero score as a logged day.
  const hasMeetings = (item: { score: number; count?: number }) => (item.count ?? (item.score !== 0 ? 1 : 0)) > 0;

  return (
    <View
      style={styles.container}
      accessible={!onSelectDay}
      accessibilityLabel={`Weekday pulse chart: ${data.map((day) => `${day.label} ${hasMeetings(day) ? formatSigned(day.score) : 'no meetings'}`).join(', ')}`}
    >
      {data.map((item, index) => {
        const height = Math.max(4, (Math.abs(item.score) / max) * HALF);
        const tone = item.score > 0 ? colors.moss : item.score < 0 ? colors.wine : colors.amber;
        const logged = hasMeetings(item);
        const selected = Boolean(item.date && selectedDate && item.date.slice(0, 10) === selectedDate.slice(0, 10));
        const content = (
          <>
            <View style={[styles.track, selected && styles.trackSelected]}>
              <View style={styles.half}>
                {logged && item.score > 0 ? <GrowBar height={height} index={index} style={[styles.bar, styles.barUp, { backgroundColor: tone }]} /> : null}
              </View>
              <View style={styles.baseline} />
              <View style={[styles.half, styles.halfDown]}>
                {logged && item.score < 0 ? <GrowBar height={height} index={index} style={[styles.bar, styles.barDown, { backgroundColor: tone }]} /> : null}
              </View>
              {logged && item.score === 0 ? <View style={[styles.evenDot, { backgroundColor: tone }]} /> : null}
            </View>
            <AppText variant="small" style={{ color: selected ? colors.orange : logged ? colors.ink : colors.inkSoft }}>{item.label}</AppText>
          </>
        );

        if (!onSelectDay || !item.date) {
          return <View key={`${item.label}-${index}`} style={styles.day}>{content}</View>;
        }

        return (
          <Pressable
            key={`${item.label}-${index}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${item.label} ${logged ? formatSigned(item.score) : 'no meetings'}${selected ? ', selected' : ''}`}
            onPress={() => onSelectDay(item.date!)}
            style={({ pressed }) => [styles.day, pressed && styles.pressed]}
          >
            {content}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  day: { flex: 1, alignItems: 'center', gap: 6 },
  track: { width: '100%', borderRadius: radius.sm, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 5, paddingVertical: 4, alignItems: 'stretch', justifyContent: 'center' },
  trackSelected: { borderColor: colors.orange },
  half: { height: HALF, justifyContent: 'flex-end' },
  halfDown: { justifyContent: 'flex-start' },
  baseline: { height: 1, backgroundColor: colors.lineDark, marginHorizontal: -5 },
  bar: { width: '100%' },
  barUp: { borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  barDown: { borderBottomLeftRadius: 6, borderBottomRightRadius: 6, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  evenDot: { position: 'absolute', alignSelf: 'center', width: 7, height: 7, borderRadius: 4 },
  pressed: { opacity: 0.8 },
});
