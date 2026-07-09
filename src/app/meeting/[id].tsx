import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { Edit3, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, formatSigned, GradientCard, Pill, Screen } from '@/components/ui';
import { MEETING_TYPE_LABELS, MOOD_CONFIG, REASON_MAP } from '@/domain/constants';
import { getImpactLabel, getMeetingSuggestion } from '@/domain/scoring';
import type { Meeting } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, gradients, spacing } from '@/theme/tokens';

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, remove, revision } = useAppData();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  useEffect(() => { if (id) getById(id).then(setMeeting); }, [getById, id, revision]);

  if (!meeting) return <Screen topSafe={false}><AppText>Loading meeting…</AppText></Screen>;
  const tone = meeting.impactScore > 0 ? colors.moss : meeting.impactScore < 0 ? colors.wine : colors.amber;

  const confirmDelete = () => Alert.alert('Delete this meeting?', 'This reflection will be permanently removed.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await remove(meeting.id); router.back(); } },
  ]);

  return (
    <Screen topSafe={false}>
      <View style={styles.titleBlock}>
        <AppText variant="label" style={{ color: colors.orange }}>{MEETING_TYPE_LABELS[meeting.meetingType]} · {format(new Date(meeting.occurredAt), 'MMM d, h:mm a')}</AppText>
        <AppText variant="hero">{meeting.title}</AppText>
      </View>

      <GradientCard colors={meeting.impactScore >= 0 ? gradients.positive : gradients.negative} style={styles.scoreCard}>
        <View>
          <AppText variant="label" style={{ color: tone }}>Meeting impact</AppText>
          <AppText variant="hero" style={{ color: tone }}>{formatSigned(meeting.impactScore)}</AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="title">{getImpactLabel(meeting.impactScore)}</AppText>
          <AppText style={{ color: colors.inkSoft }}>{MOOD_CONFIG[meeting.mood].label}</AppText>
        </View>
      </GradientCard>

      <Card style={styles.details}>
        <Detail label="Duration" value={`${meeting.durationMinutes} minutes`} />
        <Detail label="People" value={`${meeting.peopleCount}`} />
        <Detail label="Type" value={MEETING_TYPE_LABELS[meeting.meetingType]} />
      </Card>

      <View style={styles.section}>
        <AppText variant="label" style={{ color: colors.inkSoft }}>What shaped it</AppText>
        <View style={styles.pills}>{meeting.reasonIds.length ? meeting.reasonIds.map((reasonId) => <Pill key={reasonId} label={REASON_MAP[reasonId].label} tone={REASON_MAP[reasonId].sentiment} />) : <AppText style={{ color: colors.inkSoft }}>No reasons selected.</AppText>}</View>
      </View>

      {meeting.note ? <Card style={styles.section}><AppText variant="label" style={{ color: colors.inkSoft }}>Private note</AppText><AppText>{meeting.note}</AppText></Card> : null}

      <Card style={styles.section}><AppText variant="label" style={{ color: tone }}>One thing to try</AppText><AppText variant="title">{getMeetingSuggestion(meeting)}</AppText></Card>

      <View style={styles.actions}>
        <Button label="Edit reflection" variant="secondary" onPress={() => router.push({ pathname: '/log', params: { id: meeting.id } })} icon={<Edit3 size={18} color={colors.ink} />} />
        <Button label="Delete meeting" variant="danger" onPress={confirmDelete} icon={<Trash2 size={18} color={colors.wine} />} />
      </View>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><AppText variant="small" style={{ color: colors.inkSoft }}>{label}</AppText><AppText variant="title">{value}</AppText></View>;
}

const styles = StyleSheet.create({
  titleBlock: { gap: 4 },
  scoreCard: { minHeight: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, borderColor: colors.lineDark },
  details: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  detail: { flex: 1, gap: 3 },
  section: { gap: spacing.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { gap: 10 },
});
