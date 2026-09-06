import { format, isSameDay, startOfMonth } from 'date-fns';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { MeetingCard } from '@/components/meeting-card';
import { UndoBar } from '@/components/undo-bar';
import { AppText, Button, EmptyState, Header, Pill, Screen, formatSigned } from '@/components/ui';
import { meetingTypeLabel } from '@/domain/meeting-types';
import type { Meeting, MeetingType } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, fonts, radius, spacing } from '@/theme/tokens';

type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative';

export default function HistoryScreen() {
  const { search, revision, customMeetingTypes } = useAppData();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [query, setQuery] = useState('');
  const [sentiment, setSentiment] = useState<SentimentFilter>('all');
  const [type, setType] = useState<MeetingType | 'all'>('all');

  useEffect(() => { search(query).then(setMeetings); }, [query, revision, search]);

  const availableTypes = useMemo(() => [...new Set(meetings.map((meeting) => meeting.meetingType))], [meetings]);
  const filtersActive = sentiment !== 'all' || type !== 'all' || query.trim().length > 0;
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

  const resetFilters = () => {
    setSentiment('all');
    setType('all');
    setQuery('');
  };

  return (
    <Screen>
      <Header
        eyebrow="Your archive"
        title="Meeting history"
        subtitle="Look back without reliving every detail."
        onLog={() => router.push({ pathname: '/log', params: { from: 'history' } })}
        onSettings={() => router.push('/settings')}
      />
      <UndoBar />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by meeting name"
        placeholderTextColor={colors.lineDark}
        style={styles.search}
        accessibilityLabel="Search meetings by name"
        returnKeyType="search"
      />

      <View style={styles.filters}>
        <AppText variant="label" style={{ color: colors.inkSoft }}>Impact</AppText>
        <View style={styles.pills}>
          {(['all', 'positive', 'neutral', 'negative'] as const).map((item) => <Pill key={item} label={item[0].toUpperCase() + item.slice(1)} selected={sentiment === item} onPress={() => setSentiment(item)} />)}
        </View>
        {availableTypes.length ? <AppText variant="label" style={{ color: colors.inkSoft, marginTop: spacing.sm }}>Meeting type</AppText> : null}
        <View style={styles.pills}>
          {availableTypes.length ? <Pill label="All types" selected={type === 'all'} onPress={() => setType('all')} /> : null}
          {availableTypes.map((item) => <Pill key={item} label={meetingTypeLabel(item, customMeetingTypes)} selected={type === item} onPress={() => setType(item)} />)}
        </View>
        {filtersActive ? <Button label="Reset filters" variant="ghost" onPress={resetFilters} /> : null}
      </View>

      {groups.length ? groups.map((group, index) => {
        const monthStart = startOfMonth(group.date);
        const showMonth = index === 0 || startOfMonth(groups[index - 1]!.date).getTime() !== monthStart.getTime();
        const dayPulse = Math.round(group.meetings.reduce((sum, meeting) => sum + meeting.impactScore, 0) * 10) / 10;
        return (
          <View key={group.date.toISOString()} style={styles.group}>
            {showMonth ? <AppText variant="label" style={{ color: colors.orange }}>{format(group.date, 'MMMM yyyy')}</AppText> : null}
            <View style={styles.dateRow}>
              <AppText variant="title">{format(group.date, 'EEEE')}</AppText>
              <AppText variant="small" style={{ color: colors.inkSoft }}>{format(group.date, 'MMMM d')} · {formatSigned(dayPulse)}</AppText>
            </View>
            {group.meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: meeting.id, from: 'history' } })} />)}
          </View>
        );
      }) : (
        <EmptyState
          title={meetings.length || filtersActive ? 'No matching meetings' : 'Your archive is empty'}
          body={meetings.length || filtersActive ? 'Try changing the filters or search to widen the view.' : 'Logged meetings will collect here, grouped by day.'}
          action={filtersActive ? <Button label="Reset filters" variant="secondary" onPress={resetFilters} /> : <Button label="Log a meeting" variant="secondary" onPress={() => router.push({ pathname: '/log', params: { from: 'history' } })} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { minHeight: 52, borderWidth: 1, borderColor: colors.lineDark, borderRadius: radius.md, backgroundColor: colors.surfaceGlass, paddingHorizontal: spacing.md, color: colors.ink, fontFamily: fonts.body, fontSize: 16 },
  filters: { gap: spacing.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  group: { gap: spacing.md },
  dateRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 8 },
});
