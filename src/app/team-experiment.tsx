import { useLocalSearchParams } from 'expo-router';
import { Share2, ShieldCheck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, NotFoundState, Screen } from '@/components/ui';
import { buildTeamExperiment } from '@/domain/team-experiments';
import { useAppData } from '@/providers/app-data-provider';
import { colors, spacing } from '@/theme/tokens';

export default function TeamExperimentScreen() {
  const { insightId, start } = useLocalSearchParams<{ insightId?: string; start?: string }>();
  const { saveIntention } = useAppData();
  const [sharing, setSharing] = useState(false);
  const experiment = useMemo(() => buildTeamExperiment(insightId ?? ''), [insightId]);
  const weekStart = useMemo(() => {
    const parsed = start ? new Date(start) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [start]);

  if (!experiment || !insightId) {
    return (
      <Screen topSafe={false}>
        <NotFoundState title="No safe template for this note" body="Choose a supported Coach’s Note to create a team experiment." />
      </Screen>
    );
  }

  const shareExperiment = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await Share.share({ message: experiment.text });
    } catch {
      Alert.alert('Could not share', 'The privacy-safe experiment is still available here.');
    } finally {
      setSharing(false);
    }
  };

  const pinPrivately = async () => {
    await saveIntention(experiment.text, weekStart, { insightId, templateId: experiment.id });
    Alert.alert('Pinned privately', 'This experiment is now your intention for the week. Nothing was shared.');
  };

  return (
    <Screen topSafe={false}>
      <View style={styles.intro}>
        <AppText variant="label" style={{ color: colors.orange }}>Share-safe team experiment</AppText>
        <AppText variant="display">{experiment.title}</AppText>
        <AppText style={{ color: colors.inkSoft }}>A neutral suggestion generated from a reviewed template—not from your meeting details.</AppText>
      </View>

      <Card style={styles.experimentCard}>
        <AppText variant="label" style={{ color: colors.orange }}>Preview</AppText>
        <AppText variant="title">{experiment.text}</AppText>
      </Card>

      <Card style={styles.privacyCard}>
        <ShieldCheck size={24} color={colors.moss} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="title">Private details stay private</AppText>
          <AppText style={{ color: colors.inkSoft }}>This text contains no score, mood, meeting names, private notes, custom meeting types, or attendee details.</AppText>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button label="Share experiment" onPress={() => { void shareExperiment(); }} loading={sharing} icon={<Share2 size={19} color={colors.white} />} />
        <Button label="Pin privately for this week" variant="secondary" onPress={() => { void pinPrivately(); }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 5 },
  experimentCard: { gap: spacing.md, paddingVertical: spacing.xl },
  privacyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.mossSoft },
  actions: { gap: 10 },
});
