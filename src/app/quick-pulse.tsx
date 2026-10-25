import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Check, ChevronDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Pressable, View } from 'react-native';

import { AppText, Button, Pill, Screen } from '@/components/ui';
import { MOOD_CONFIG, REASONS } from '@/domain/constants';
import { MOODS, type Mood } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, radius, spacing } from '@/theme/tokens';

export default function QuickPulseScreen() {
  const { createQuickPulse, customReasons } = useAppData();
  const [mood, setMood] = useState<Mood | null>(null);
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const reasons = useMemo(() => {
    const sentiment = mood && MOOD_CONFIG[mood].score > 0 ? 'positive' : mood && MOOD_CONFIG[mood].score < 0 ? 'negative' : null;
    const all = [
      ...REASONS.map((reason) => ({ id: reason.id, label: reason.label, sentiment: reason.sentiment })),
      ...customReasons.filter((reason) => reason.active !== false),
    ].filter((reason) => !sentiment || reason.sentiment === sentiment);
    return showAll ? all : all.slice(0, 6);
  }, [customReasons, mood, showAll]);

  const save = async () => {
    if (!mood || !reasonId || saving) return;
    setSaving(true);
    try {
      await createQuickPulse({ occurredAt: new Date().toISOString(), mood, reasonId });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/today');
    } catch {
      Alert.alert('Could not save Quick Pulse', 'Nothing was lost. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen topSafe={false}>
      <View style={styles.intro}>
        <AppText variant="label" style={{ color: colors.orange }}>Ten-second capture</AppText>
        <AppText variant="display">Quick Pulse</AppText>
        <AppText style={{ color: colors.inkSoft }}>Capture the signal now. Add the meeting name and duration when you have space.</AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="title">How did it land?</AppText>
        <View style={styles.moodGrid}>
          {MOODS.map((item) => {
            const selected = mood === item;
            const config = MOOD_CONFIG[item];
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${config.label}${selected ? ', selected' : ''}`}
                onPress={() => { setMood(item); setReasonId(null); setShowAll(false); void Haptics.selectionAsync(); }}
                style={[styles.mood, selected && styles.moodSelected]}
              >
                <AppText variant="label" style={{ color: config.score > 0 ? colors.moss : config.score < 0 ? colors.wine : colors.amber }}>{config.score > 0 ? `+${config.score}` : config.score}</AppText>
                <AppText variant="title">{config.label}</AppText>
                {selected ? <Check size={17} color={colors.orange} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {mood ? (
        <View style={styles.section}>
          <View style={{ gap: 4 }}>
            <AppText variant="title">What was the strongest reason?</AppText>
            <AppText variant="small" style={{ color: colors.inkSoft }}>Choose one. You can add more when completing the reflection.</AppText>
          </View>
          <View style={styles.pills}>
            {reasons.map((reason) => <Pill key={reason.id} label={reason.label} selected={reasonId === reason.id} tone={reason.sentiment} onPress={() => setReasonId(reason.id)} />)}
          </View>
          {!showAll ? (
            <Button label="More reasons" variant="ghost" onPress={() => setShowAll(true)} icon={<ChevronDown size={18} color={colors.ink} />} />
          ) : null}
        </View>
      ) : null}

      <Button label="Save Quick Pulse" onPress={() => { void save(); }} disabled={!mood || !reasonId} loading={saving} />
      <AppText variant="small" style={styles.privacy}>Not scored yet · stored only on this device · excluded from insights until completed</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 6 },
  section: { gap: spacing.md },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mood: { width: '48%', minHeight: 88, padding: spacing.md, gap: 4, borderWidth: 1, borderColor: colors.lineDark, borderRadius: radius.md, backgroundColor: colors.surfaceGlass, justifyContent: 'space-between' },
  moodSelected: { borderColor: colors.orange, backgroundColor: colors.surfaceElevated },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  privacy: { color: colors.inkSoft, textAlign: 'center' },
});
