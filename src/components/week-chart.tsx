import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, formatSigned } from './ui';
import { colors, radius, spacing } from '@/theme/tokens';

export function WeekChart({
  data,
  selectedDate,
  onSelectDay,
}: {
  data: { date?: string; label: string; score: number }[];
  selectedDate?: string | null;
  onSelectDay?: (date: string) => void;
}) {
  const max = Math.max(1, ...data.map((item) => Math.abs(item.score)));
  return (
    <View style={styles.container} accessible={!onSelectDay} accessibilityLabel={`Weekday pulse chart: ${data.map((day) => `${day.label} ${formatSigned(day.score)}`).join(', ')}`}>
      {data.map((item, index) => {
        const height = Math.max(5, (Math.abs(item.score) / max) * 54);
        const positive = item.score >= 0;
        const selected = Boolean(item.date && selectedDate && item.date.slice(0, 10) === selectedDate.slice(0, 10));
        const content = (
          <>
            <View style={styles.track}>
              <View style={[styles.bar, { height, backgroundColor: positive ? colors.moss : colors.wine }]} />
            </View>
            <AppText variant="small" style={{ color: selected ? colors.orange : colors.inkSoft }}>{item.label}</AppText>
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
            accessibilityLabel={`${item.label} ${formatSigned(item.score)}${selected ? ', selected' : ''}`}
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
  container: { height: 98, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end', justifyContent: 'space-between' },
  day: { flex: 1, alignItems: 'center', gap: 6 },
  track: { width: '100%', height: 66, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 4, paddingBottom: 4 },
  bar: { width: '100%', borderRadius: 7, shadowColor: colors.moss, shadowOpacity: 0.35, shadowRadius: 8 },
  pressed: { opacity: 0.8 },
});
