import { format } from 'date-fns';
import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, LoadingState, Screen } from '@/components/ui';
import { MOOD_CONFIG, REASON_MAP } from '@/domain/constants';
import type { QuickPulse } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, spacing } from '@/theme/tokens';

export default function QuickPulsesScreen() {
  const { getQuickPulses, removeQuickPulse, revision, customReasons } = useAppData();
  const [pulses, setPulses] = useState<QuickPulse[] | null>(null);

  useEffect(() => { getQuickPulses().then(setPulses); }, [getQuickPulses, revision]);

  const confirmRemove = (pulse: QuickPulse) => Alert.alert(
    'Discard this Quick Pulse?',
    'This incomplete signal has not affected your score or insights.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { void removeQuickPulse(pulse.id); } },
    ],
  );

  if (!pulses) return <Screen topSafe={false}><LoadingState label="Loading Quick Pulses…" /></Screen>;

  return (
    <Screen topSafe={false}>
      <View style={styles.intro}>
        <AppText variant="label" style={{ color: colors.orange }}>Finish later</AppText>
        <AppText variant="display">Pending Quick Pulses</AppText>
        <AppText style={{ color: colors.inkSoft }}>These are private drafts. Complete one to add its signal to your history and insights.</AppText>
      </View>
      {pulses.length ? pulses.map((pulse) => {
        const reason = pulse.reasonId
          ? REASON_MAP[pulse.reasonId as keyof typeof REASON_MAP] ?? customReasons.find((item) => item.id === pulse.reasonId)
          : null;
        return (
          <Card key={pulse.id} style={styles.card}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="label" style={{ color: colors.amber }}>{format(new Date(pulse.occurredAt), 'EEE, MMM d · h:mm a')}</AppText>
              <AppText variant="title">{MOOD_CONFIG[pulse.mood].label}</AppText>
              <AppText style={{ color: colors.inkSoft }}>{reason?.label ?? 'No reason selected'}</AppText>
            </View>
            <View style={styles.actions}>
              <Button label="Complete reflection" variant="secondary" onPress={() => router.push({ pathname: '/log', params: { from: 'today', pulseId: pulse.id } })} />
              <Button label="Discard" variant="ghost" onPress={() => confirmRemove(pulse)} icon={<Trash2 size={17} color={colors.wine} />} />
            </View>
          </Card>
        );
      }) : (
        <EmptyState title="No pending pulses" body="Quick Pulses that still need a name and duration will appear here." action={<Button label="Capture a Quick Pulse" variant="secondary" onPress={() => router.push('/quick-pulse')} />} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 6 },
  card: { gap: spacing.md },
  actions: { gap: 8 },
});
