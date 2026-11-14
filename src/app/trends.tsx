import { addMonths, format, isSameDay, isSameMonth, subMonths } from 'date-fns';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/motion';
import { AppText, Card, EmptyState, formatSigned, LoadingState, Screen, SectionTitle, Button } from '@/components/ui';
import { meetingTypeLabel } from '@/domain/meeting-types';
import { getHitRateByMonth, getMonthPixels, getQuarterTrends, summarizeMonth, type PixelDay } from '@/domain/trends';
import type { Meeting } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, fonts, radius, spacing } from '@/theme/tokens';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function TrendsScreen() {
  const { getAll, revision, weekStartsOn, customMeetingTypes } = useAppData();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  useEffect(() => { getAll().then(setMeetings); }, [getAll, revision]);

  const pixels = useMemo(() => (meetings ? getMonthPixels(meetings, month, weekStartsOn) : []), [meetings, month, weekStartsOn]);
  const monthSummary = useMemo(() => summarizeMonth(pixels), [pixels]);
  const quarter = useMemo(() => getQuarterTrends(meetings ?? [], new Date()), [meetings]);
  const hitByMonth = useMemo(() => getHitRateByMonth(meetings ?? [], quarter.monthStarts), [meetings, quarter.monthStarts]);
  const isThisMonth = isSameMonth(month, new Date());
  const weekdayLetters = weekStartsOn === 1 ? [...WEEKDAY_LETTERS.slice(1), WEEKDAY_LETTERS[0]] : WEEKDAY_LETTERS;
  const selectedMeetings = selected && meetings ? meetings.filter((meeting) => isSameDay(new Date(meeting.occurredAt), selected)) : [];
  const maxAbs = Math.max(1, ...quarter.types.flatMap((type) => type.months.map((value) => Math.abs(value ?? 0))));

  if (!meetings) return <Screen topSafe={false}><LoadingState label="Gathering your months…" /></Screen>;

  if (!meetings.length) {
    return (
      <Screen topSafe={false}>
        <EmptyState title="Nothing to chart yet" body="Log a few meetings and this view fills in, one day at a time." action={<Button label="Log a meeting" variant="secondary" onPress={() => router.push('/log')} />} />
      </Screen>
    );
  }

  return (
    <Screen topSafe={false}>
      <View style={styles.intro}>
        <AppText variant="label" style={{ color: colors.orange }}>Beyond one week</AppText>
        <AppText variant="display">Your months, at a glance</AppText>
        <AppText style={{ color: colors.inkSoft }}>Each square is a day, coloured by the total impact of the meetings you logged.</AppText>
      </View>

      <View style={styles.section}>
        <View style={styles.monthNav}>
          <PressableScale accessibilityRole="button" accessibilityLabel="Previous month" haptic="selection" scaleTo={0.9} onPress={() => { setSelected(null); setMonth((value) => subMonths(value, 1)); }} style={styles.navButton}>
            <ChevronLeft size={20} color={colors.ink} />
          </PressableScale>
          <AppText style={{ fontFamily: fonts.bodyBold }}>{format(month, 'MMMM yyyy')}</AppText>
          <PressableScale accessibilityRole="button" accessibilityLabel="Next month" haptic="selection" scaleTo={0.9} disabled={isThisMonth} onPress={() => { setSelected(null); setMonth((value) => addMonths(value, 1)); }} style={[styles.navButton, isThisMonth && { opacity: 0.25 }]}>
            <ChevronRight size={20} color={colors.ink} />
          </PressableScale>
        </View>

        <Card style={styles.pixelCard}>
          <View style={styles.grid}>
            {weekdayLetters.map((letter, index) => <AppText key={`${letter}-${index}`} variant="small" style={styles.weekday}>{letter}</AppText>)}
            {pixels.map((day) => (
              <Pixel key={day.date.toISOString()} day={day} selected={Boolean(selected && isSameDay(selected, day.date))} onPress={() => setSelected((current) => (current && isSameDay(current, day.date) ? null : day.date))} />
            ))}
          </View>
          <View style={styles.legend}>
            <Legend color={colors.moss} label="Returned" />
            <Legend color={colors.amber} label="Even" />
            <Legend color={colors.wine} label="Cost" />
            <Legend color="rgba(255,255,255,0.06)" label="Nothing logged" />
          </View>
          <View style={styles.summaryRow}>
            <Summary value={`${monthSummary.loggedDays}`} label="days logged" />
            <Summary value={`${monthSummary.positiveDays}`} label="good days" color={colors.moss} />
            <Summary value={`${monthSummary.negativeDays}`} label="costly days" color={colors.wine} />
            <Summary value={formatSigned(monthSummary.total)} label="month total" color={monthSummary.total > 0 ? colors.moss : monthSummary.total < 0 ? colors.wine : colors.amber} />
          </View>
        </Card>

        {selected ? (
          <Card style={styles.dayCard}>
            <AppText variant="label" style={{ color: colors.orange }}>{format(selected, 'EEEE, MMM d')}</AppText>
            {selectedMeetings.length ? selectedMeetings.map((meeting) => (
              <PressableScale key={meeting.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: meeting.id, from: 'insights' } })} style={styles.dayRow}>
                <AppText style={{ flex: 1 }} numberOfLines={1}>{meeting.title}</AppText>
                <AppText variant="title" style={{ color: meeting.impactScore > 0 ? colors.moss : meeting.impactScore < 0 ? colors.wine : colors.amber }}>{formatSigned(meeting.impactScore)}</AppText>
              </PressableScale>
            )) : <AppText style={{ color: colors.inkSoft }}>No meetings logged this day.</AppText>}
          </Card>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="Quarterly trends" title="How each meeting type is moving" />
        <AppText style={{ color: colors.inkSoft }}>Average impact per meeting, by month. A type needs logs in two months to show a change.</AppText>
        {quarter.types.length ? (
          <Card style={styles.quarterCard}>
            <View style={styles.quarterHeader}>
              <View style={{ flex: 1 }} />
              {quarter.monthLabels.map((label) => <AppText key={label} variant="label" style={styles.quarterCell}>{label}</AppText>)}
              <AppText variant="label" style={styles.changeCell}>Change</AppText>
            </View>
            {quarter.types.map((type) => (
              <View key={type.meetingType} style={styles.quarterRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText numberOfLines={1}>{meetingTypeLabel(type.meetingType, customMeetingTypes)}</AppText>
                  <AppText variant="small" style={{ color: colors.inkSoft }}>{type.count} {type.count === 1 ? 'log' : 'logs'}</AppText>
                </View>
                {type.months.map((value, index) => <Bar key={quarter.monthLabels[index]} value={value} maxAbs={maxAbs} />)}
                <AppText variant="title" style={[styles.changeCell, { color: type.change == null ? colors.inkSoft : type.change > 0 ? colors.moss : type.change < 0 ? colors.wine : colors.amber }]}>
                  {type.change == null ? '—' : formatSigned(type.change)}
                </AppText>
              </View>
            ))}
            {hitByMonth.some((value) => value != null) ? (
              <View style={[styles.quarterRow, styles.hitRow]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText>Outcome hit rate</AppText>
                  <AppText variant="small" style={{ color: colors.inkSoft }}>Produced what it was for</AppText>
                </View>
                {hitByMonth.map((value, index) => (
                  <AppText key={quarter.monthLabels[index]} variant="title" style={[styles.quarterCell, { color: value == null ? colors.inkSoft : value >= 60 ? colors.moss : value >= 40 ? colors.amber : colors.wine }]}>
                    {value == null ? '—' : `${value}%`}
                  </AppText>
                ))}
                <View style={styles.changeCell} />
              </View>
            ) : null}
          </Card>
        ) : (
          <Card><AppText style={{ color: colors.inkSoft }}>No meetings in the last three months yet.</AppText></Card>
        )}
      </View>
    </Screen>
  );
}

function pixelColor(total: number | null): string {
  if (total == null) return 'rgba(255,255,255,0.06)';
  if (total > 0) return total >= 6 ? colors.moss : 'rgba(114,227,189,0.55)';
  if (total < 0) return total <= -6 ? colors.wine : 'rgba(255,107,129,0.55)';
  return colors.amber;
}

function Pixel({ day, selected, onPress }: { day: PixelDay; selected: boolean; onPress: () => void }) {
  const label = `${format(day.date, 'MMMM d')}, ${day.total == null ? 'nothing logged' : `${day.count} meeting${day.count === 1 ? '' : 's'}, total ${formatSigned(day.total)}`}`;
  return (
    <View style={styles.pixelCell}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={!day.inMonth}
        haptic="selection"
        scaleTo={0.9}
        onPress={onPress}
        style={[styles.pixel, { backgroundColor: pixelColor(day.total), opacity: day.inMonth ? 1 : 0.18 }, selected && styles.pixelSelected]}
      >
        <AppText variant="small" style={{ color: day.total != null && day.total !== 0 ? colors.paper : colors.inkSoft, fontSize: 10 }}>{format(day.date, 'd')}</AppText>
      </PressableScale>
    </View>
  );
}

function Bar({ value, maxAbs }: { value: number | null; maxAbs: number }) {
  const height = value == null ? 0 : Math.max(3, (Math.abs(value) / maxAbs) * 22);
  const color = value == null ? colors.inkSoft : value > 0 ? colors.moss : value < 0 ? colors.wine : colors.amber;
  return (
    <View style={styles.quarterCell} accessibilityLabel={value == null ? 'no logs' : `average ${formatSigned(value)}`}>
      <View style={styles.barTrack}>
        {value == null ? null : <View style={[styles.bar, { height, backgroundColor: color }, value >= 0 ? { bottom: 24 } : { top: 24 }]} />}
        <View style={styles.barAxis} />
      </View>
      <AppText variant="small" style={{ color, textAlign: 'center' }}>{value == null ? '—' : formatSigned(value)}</AppText>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: color }]} /><AppText variant="small" style={{ color: colors.inkSoft }}>{label}</AppText></View>;
}

function Summary({ value, label, color = colors.ink }: { value: string; label: string; color?: string }) {
  return <View style={styles.summary}><AppText variant="title" style={{ color }}>{value}</AppText><AppText variant="small" style={{ color: colors.inkSoft }}>{label}</AppText></View>;
}

const styles = StyleSheet.create({
  intro: { gap: 6 },
  section: { gap: spacing.md },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(17,24,39,0.62)', alignItems: 'center', justifyContent: 'center' },
  pixelCard: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: colors.inkSoft, marginBottom: 6 },
  pixelCell: { width: `${100 / 7}%`, padding: 3 },
  pixel: { aspectRatio: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  pixelSelected: { borderWidth: 2, borderColor: colors.ink },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 3 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  summary: { flex: 1, gap: 2 },
  dayCard: { gap: spacing.sm },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 },
  quarterCard: { gap: spacing.md },
  quarterHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quarterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hitRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.md },
  quarterCell: { width: 54, alignItems: 'center', textAlign: 'center', color: colors.inkSoft },
  changeCell: { width: 56, textAlign: 'right' },
  barTrack: { width: 14, height: 48, position: 'relative' },
  bar: { position: 'absolute', left: 0, right: 0, borderRadius: 3 },
  barAxis: { position: 'absolute', left: -6, right: -6, top: 24, height: 1, backgroundColor: colors.line },
  radius: { borderRadius: radius.sm },
});
