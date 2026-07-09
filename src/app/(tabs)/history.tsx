import { format, isSameDay } from 'date-fns';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MeetingCard } from '@/components/meeting-card';
import { AppText, EmptyState, Header, Pill, Screen } from '@/components/ui';
import { MEETING_TYPE_LABELS } from '@/domain/constants';
import type { Meeting, MeetingType } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, spacing } from '@/theme/tokens';

type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative';

export default function HistoryScreen() {
  const { getAll, revision } = useAppData();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [sentiment, setSentiment] = useState<SentimentFilter>('all');
  const [type, setType] = useState<MeetingType | 'all'>('all');

  useEffect(() => { getAll().then(setMeetings); }, [getAll, revision]);

  const availableTypes = useMemo(() => [...new Set(meetings.map((meeting) => meeting.meetingType))], [meetings]);
  const filtered = meetings.filter((meeting) => {
    const sentimentMatch = sentiment === 'all' || (sentiment === 'positive' && meeting.impactScore > 0) || (sentiment === 'neutral' && meeting.impactScore === 0) || (sentiment === 'negative' && meeting.impactScore < 0);
    return sentimentMatch && (type === 'all' || meeting.meetingType === type);
  });
  const groups = filtered.reduce<{ date: Date; meetings: Meeting[] }[]>((result, meeting) => {
    const date = new Date(meeting.occurredAt);
    const group = result.find((item) => isSameDay(item.date, date));
    if (group) group.meetings.push(meeting);
    else result.push({ date, meetings: [meeting] });
    return result;
  }, []);

  return (
    <Screen>
      <Header eyebrow="Your archive" title="Meeting history" subtitle="Look back without reliving every detail." onSettings={() => router.push('/settings')} />

      <View style={styles.filters}>
        <AppText variant="label" style={{ color: colors.inkSoft }}>Impact</AppText>
        <View style={styles.pills}>
          {(['all', 'positive', 'neutral', 'negative'] as const).map((item) => <Pill key={item} label={item[0].toUpperCase() + item.slice(1)} selected={sentiment === item} onPress={() => setSentiment(item)} />)}
        </View>
        {availableTypes.length ? <AppText variant="label" style={{ color: colors.inkSoft, marginTop: spacing.sm }}>Meeting type</AppText> : null}
        <View style={styles.pills}>
          {availableTypes.length ? <Pill label="All types" selected={type === 'all'} onPress={() => setType('all')} /> : null}
          {availableTypes.map((item) => <Pill key={item} label={MEETING_TYPE_LABELS[item]} selected={type === item} onPress={() => setType(item)} />)}
        </View>
      </View>

      {groups.length ? groups.map((group) => (
        <View key={group.date.toISOString()} style={styles.group}>
          <View style={styles.dateRow}>
            <AppText variant="title">{format(group.date, 'EEEE')}</AppText>
            <AppText variant="small" style={{ color: colors.inkSoft }}>{format(group.date, 'MMMM d, yyyy')}</AppText>
          </View>
          {group.meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: meeting.id } })} />)}
        </View>
      )) : <EmptyState title={meetings.length ? 'No matching meetings' : 'Your archive is empty'} body={meetings.length ? 'Try changing the filters to widen the view.' : 'Logged meetings will collect here, grouped by day.'} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { gap: spacing.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  group: { gap: spacing.md },
  dateRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 8 },
});
