import { addWeeks, endOfWeek, format, isSameDay, isSameWeek, startOfWeek, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MeetingCard } from '@/components/meeting-card';
import { UndoBar } from '@/components/undo-bar';
import { WeekChart } from '@/components/week-chart';
import { AppText, Button, Card, EmptyState, formatSigned, GradientCard, Header, Pill, Screen, SectionTitle } from '@/components/ui';
import { REASON_MAP } from '@/domain/constants';
import { meetingTypeLabel } from '@/domain/meeting-types';
import { summarizeWeek, weekOverWeekDelta } from '@/domain/insights';
import { summarizeBudget } from '@/domain/budget';
import { summarizeRecovery } from '@/domain/recovery';
import { getRecurringSeries } from '@/domain/series';
import { SERIES_DECISION_LABELS, upsertSeriesReview } from '@/domain/series-reviews';
import { buildTeamExperiment, listActionKit } from '@/domain/team-experiments';
import { summarizeTimePatterns } from '@/domain/time-patterns';
import { SERIES_DECISIONS, type Meeting, type SeriesDecision, type SeriesPulse } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, gradients, radius, spacing } from '@/theme/tokens';

export default function InsightsScreen() {
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [previousMeetings, setPreviousMeetings] = useState<Meeting[]>([]);
  const [seriesMeetings, setSeriesMeetings] = useState<Meeting[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [patternWeeks, setPatternWeeks] = useState<4 | 8 | 12>(8);
  const [showLongerPatterns, setShowLongerPatterns] = useState(false);
  const [showActionKit, setShowActionKit] = useState(false);
  const { getRange, revision, weekStartsOn, saveIntention, customMeetingTypes, meetingBudget, seriesReviews, saveSeriesReviews } = useAppData();
  const start = useMemo(() => startOfWeek(weekAnchor, { weekStartsOn }), [weekAnchor, weekStartsOn]);
  const end = useMemo(() => endOfWeek(weekAnchor, { weekStartsOn }), [weekAnchor, weekStartsOn]);
  const previousStart = useMemo(() => startOfWeek(subWeeks(start, 1), { weekStartsOn }), [start, weekStartsOn]);
  const previousEnd = useMemo(() => endOfWeek(subWeeks(start, 1), { weekStartsOn }), [start, weekStartsOn]);
  const seriesStart = useMemo(() => startOfWeek(subWeeks(start, patternWeeks - 1), { weekStartsOn }), [patternWeeks, start, weekStartsOn]);

  useEffect(() => {
    getRange(start, end).then(setMeetings);
    getRange(previousStart, previousEnd).then(setPreviousMeetings);
    getRange(seriesStart, end).then(setSeriesMeetings);
  }, [end, getRange, previousEnd, previousStart, revision, seriesStart, start]);

  const summary = useMemo(() => summarizeWeek(meetings, start, end), [end, meetings, start]);
  const previousSummary = useMemo(() => summarizeWeek(previousMeetings, previousStart, previousEnd), [previousEnd, previousMeetings, previousStart]);
  const delta = weekOverWeekDelta(summary, previousSummary);
  const recovery = useMemo(() => summarizeRecovery(summary.meetings, meetingBudget.preferredBufferMinutes ?? undefined), [meetingBudget.preferredBufferMinutes, summary.meetings]);
  const budget = useMemo(() => summarizeBudget(summary.meetings, meetingBudget), [meetingBudget, summary.meetings]);
  const series = useMemo(() => getRecurringSeries(seriesMeetings).slice(0, 3), [seriesMeetings]);
  const timePatterns = useMemo(() => summarizeTimePatterns(seriesMeetings), [seriesMeetings]);
  const actionKit = useMemo(() => listActionKit(), []);
  const isCurrentWeek = isSameWeek(weekAnchor, new Date(), { weekStartsOn });
  const pulseTone = summary.weeklyPulse > 0 ? colors.moss : summary.weeklyPulse < 0 ? colors.wine : colors.amber;
  const dayMeetings = selectedDay
    ? summary.meetings.filter((meeting) => isSameDay(new Date(meeting.occurredAt), new Date(selectedDay)))
    : [];

  const emptyCopy = isCurrentWeek
    ? { title: 'This week is still building', body: 'Log a meeting to begin building your weekly signal. Three reflections are enough to surface the first pattern.' }
    : { title: 'This week was quiet', body: 'No reflections were captured in this week. Jump back to now, or log one if you want the pattern later.' };

  const reviewSeries = async (item: SeriesPulse, decision: SeriesDecision) => {
    await saveSeriesReviews(upsertSeriesReview(seriesReviews, {
      key: item.key,
      title: item.title,
      meetingType: item.meetingType,
      decision,
      updatedAt: new Date().toISOString(),
    }));
  };

  return (
    <Screen>
      <Header
        eyebrow="Pattern finder"
        title="Weekly signal"
        subtitle="Turn soft reactions into practical changes."
        onLog={() => router.push({ pathname: '/log', params: { from: 'insights' } })}
        onSettings={() => router.push('/settings')}
      />
      <UndoBar />

      <View style={styles.weekNav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous week" onPress={() => { setSelectedDay(null); setWeekAnchor((date) => subWeeks(date, 1)); }} style={styles.navButton}>
          <ChevronLeft size={20} color={colors.ink} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <AppText variant="small" style={{ color: colors.inkSoft }}>{isCurrentWeek ? 'This week' : format(start, 'MMM d')}</AppText>
          <AppText style={{ fontFamily: 'DMSans_700Bold' }}>{format(start, 'MMM d')} – {format(end, 'MMM d')}</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Next week" disabled={isCurrentWeek} onPress={() => { setSelectedDay(null); setWeekAnchor((date) => addWeeks(date, 1)); }} style={[styles.navButton, isCurrentWeek && { opacity: 0.25 }]}>
          <ChevronRight size={20} color={colors.ink} />
        </Pressable>
      </View>
      {!isCurrentWeek ? <Button label="Jump to this week" variant="ghost" onPress={() => { setSelectedDay(null); setWeekAnchor(new Date()); }} /> : null}

      {summary.meetingCount ? (
        <>
          <GradientCard colors={gradients.hero} style={styles.heroCard}>
            <View pointerEvents="none" style={[styles.heroGlow, { backgroundColor: pulseTone, shadowColor: pulseTone }]} />
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <AppText variant="label" style={{ color: pulseTone }}>Meeting pulse</AppText>
                <AppText variant="hero" style={{ color: pulseTone }}>{formatSigned(summary.weeklyPulse)}</AppText>
                <AppText variant="title">{summary.classification}</AppText>
                {delta ? (
                  <AppText variant="small" style={{ color: colors.inkSoft }}>
                    {formatSigned(delta.delta)} vs last week · was {delta.previousClassification}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.countBlock}>
                <AppText variant="display">{summary.meetingCount}</AppText>
                <AppText variant="small" style={{ color: colors.inkSoft }}>meetings</AppText>
                <AppText variant="small" style={{ color: colors.inkSoft }}>{(summary.totalMinutes / 60).toFixed(1)} hours</AppText>
              </View>
            </View>
            <WeekChart
              data={summary.weekdayScores}
              selectedDate={selectedDay}
              onSelectDay={(date) => setSelectedDay((current) => current === date ? null : date)}
            />
            <View style={styles.balanceRow}>
              <Balance value={summary.positiveCount} label="Returned" color={colors.moss} />
              <Balance value={summary.neutralCount} label="Neutral" color={colors.amber} />
              <Balance value={summary.negativeCount} label="Cost" color={colors.wine} />
            </View>
          </GradientCard>

          {dayMeetings.length ? (
            <View style={styles.snapshot}>
              <SectionTitle eyebrow="Selected day" title={format(new Date(selectedDay!), 'EEEE, MMM d')} />
              {dayMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: meeting.id, from: 'insights' } })} />
              ))}
            </View>
          ) : null}

          <Button label="Create shareable report" onPress={() => router.push({ pathname: '/report', params: { start: start.toISOString() } })} icon={<Share2 size={19} color={colors.white} />} />

          <View style={styles.snapshot}>
            <SectionTitle eyebrow="Recovery radar" title="How tightly the week was packed" />
            <Card style={styles.recoveryCard}>
              {summary.meetingCount >= 2 ? (
                <>
                  <View style={styles.recoveryMetrics}>
                    <RecoveryMetric value={`${recovery.tightTransitions}`} label={`Within ${meetingBudget.preferredBufferMinutes ?? 15}m`} />
                    <RecoveryMetric value={formatMinutes(recovery.longestBlockMinutes)} label="Longest block" />
                    <RecoveryMetric value={`${recovery.denseBlockCount}`} label="3+ meeting blocks" />
                  </View>
                  <AppText style={{ color: colors.inkSoft }}>
                    {recovery.comparisonReady
                      ? `Among meetings you logged, buffered sessions averaged ${formatSigned(recovery.averageDifference ?? 0)} points better than tight turnarounds.`
                      : 'This describes spacing between meetings you logged. More repeated transitions are needed before comparing impact.'}
                  </AppText>
                </>
              ) : (
                <AppText style={{ color: colors.inkSoft }}>Log meeting start times and durations to see how tight turnarounds land.</AppText>
              )}
            </Card>
          </View>

          {budget.enabled && (budget.metrics.length || budget.preferredBufferMinutes) ? (
            <View style={styles.snapshot}>
              <SectionTitle eyebrow="Personal guardrails" title="Your logged meeting budget" />
              <Card style={styles.budgetCard}>
                {budget.metrics.map((item) => (
                  <View key={item.id} style={styles.budgetRow}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <AppText variant="title">{item.label}</AppText>
                      <AppText variant="small" style={{ color: colors.inkSoft }}>{formatBudgetValue(item.current, item.unit)} of {formatBudgetValue(item.limit, item.unit)}</AppText>
                    </View>
                    <AppText variant="label" style={{ color: item.status === 'over' ? colors.wine : item.status === 'near' ? colors.amber : colors.moss }}>{item.status === 'over' ? 'Past' : item.status === 'near' ? 'Near' : 'Within'}</AppText>
                  </View>
                ))}
                {budget.preferredBufferMinutes ? <AppText style={{ color: colors.inkSoft }}>{budget.shortTransitions} transition{budget.shortTransitions === 1 ? '' : 's'} under your preferred {budget.preferredBufferMinutes}-minute buffer.</AppText> : null}
                <AppText variant="small" style={{ color: colors.inkSoft }}>Based only on meetings you logged. These guardrails never change your score.</AppText>
              </Card>
            </View>
          ) : null}

          {series.length ? (
            <View style={styles.snapshot}>
              <SectionTitle eyebrow="Recurring review" title="Same meeting, over time" />
              {series.map((item) => (
                <Card key={item.key} style={styles.seriesCard}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="label" style={{ color: item.average < 0 ? colors.wine : colors.moss }}>{meetingTypeLabel(item.meetingType, customMeetingTypes)} · {item.count} logs</AppText>
                    <AppText variant="title">{item.title}</AppText>
                    <AppText style={{ color: colors.inkSoft }}>{patternWeeks}-week average {formatSigned(item.average)}{item.trend == null ? '' : ` · recent trend ${formatSigned(item.trend)}`}</AppText>
                  </View>
                  <AppText variant="small" style={{ color: colors.inkSoft }}>What should happen to this recurring format?</AppText>
                  <View style={styles.pills}>
                    {SERIES_DECISIONS.map((decision) => (
                      <Pill
                        key={decision}
                        label={SERIES_DECISION_LABELS[decision]}
                        selected={seriesReviews.find((review) => review.key === item.key)?.decision === decision}
                        onPress={() => { void reviewSeries(item, decision); }}
                      />
                    ))}
                  </View>
                  {(() => {
                    const decision = seriesReviews.find((review) => review.key === item.key)?.decision;
                    return decision && decision !== 'keep' ? (
                      <Button label="Prepare a safe message" variant="secondary" onPress={() => router.push({ pathname: '/team-experiment', params: { insightId: `series-${decision}`, start: start.toISOString() } })} />
                    ) : null;
                  })()}
                </Card>
              ))}
            </View>
          ) : null}

          <View style={styles.snapshot}>
            <SectionTitle eyebrow="Longer view" title="When meetings tend to land well" />
            <AppText style={{ color: colors.inkSoft }}>Compare weekday and time-of-day signals across several weeks without adding another permanent dashboard.</AppText>
            <Button label={showLongerPatterns ? 'Hide longer view' : 'Explore longer patterns'} variant="secondary" onPress={() => setShowLongerPatterns((value) => !value)} />
            {showLongerPatterns ? (
              <>
                <View style={styles.pills}>
                  {([4, 8, 12] as const).map((weeks) => <Pill key={weeks} label={`${weeks} weeks`} selected={patternWeeks === weeks} onPress={() => setPatternWeeks(weeks)} />)}
                </View>
                <Card style={styles.patternCard}>
                  <AppText variant="label" style={{ color: colors.orange }}>Weekday pattern</AppText>
                  <View style={styles.patternGrid}>
                    {timePatterns.weekdays.map((bucket) => <PatternMetric key={bucket.id} label={bucket.label} count={bucket.count} average={bucket.average} />)}
                  </View>
                  <AppText variant="label" style={{ color: colors.orange }}>Time of day</AppText>
                  <View style={styles.daypartGrid}>
                    {timePatterns.dayparts.map((bucket) => <PatternMetric key={bucket.id} label={bucket.label} count={bucket.count} average={bucket.average} />)}
                  </View>
                  <AppText variant="small" style={{ color: colors.inkSoft }}>Averages appear after three logged meetings in a bucket. They describe a pattern, not a cause.</AppText>
                </Card>
              </>
            ) : null}
          </View>

          <View style={styles.snapshot}>
            <SectionTitle eyebrow="Action kit" title="A small next move" />
            <AppText style={{ color: colors.inkSoft }}>Reviewed templates only. Nothing is sent until you use the system share sheet.</AppText>
            <Button label={showActionKit ? 'Hide action kit' : 'Open action kit'} variant="secondary" onPress={() => setShowActionKit((value) => !value)} />
            {showActionKit ? (
              <View style={styles.actionGrid}>
                {actionKit.map((item) => (
                  <Card key={item.id} style={styles.actionCard}>
                    <AppText variant="title">{item.title}</AppText>
                    <AppText variant="small" style={{ color: colors.inkSoft }}>{item.text}</AppText>
                    <Button label="Preview" variant="ghost" onPress={() => router.push({ pathname: '/team-experiment', params: { insightId: item.id, start: start.toISOString() } })} />
                  </Card>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.snapshot}>
            <SectionTitle eyebrow="At a glance" title="What shaped the week" />
            <View style={styles.snapshotGrid}>
              <Snapshot label="Most useful" value={summary.mostUsefulType ? meetingTypeLabel(summary.mostUsefulType, customMeetingTypes) : 'No clear leader'} tone="positive" />
              <Snapshot label="Most draining" value={summary.mostDrainingType ? meetingTypeLabel(summary.mostDrainingType, customMeetingTypes) : 'No clear drag'} tone="negative" />
              <Snapshot label="Top friction" value={summary.topNegativeReason ? REASON_MAP[summary.topNegativeReason].label : 'None repeated'} tone="negative" />
              <Snapshot label="Best pattern" value={summary.bestPattern} tone="positive" />
            </View>
          </View>

          <View style={styles.insights}>
            <SectionTitle eyebrow="Coach’s notes" title="What to change next" />
            <AppText style={{ color: colors.inkSoft }}>These notes come from simple rules on this device, not a model or a manager score.</AppText>
            {summary.insights.map((insight, index) => (
              <Card key={insight.id} style={styles.insightCard}>
                <View style={[styles.insightNumber, { backgroundColor: insight.tone === 'positive' ? colors.mossSoft : insight.tone === 'negative' ? colors.wineSoft : colors.amberSoft }]}>
                  <AppText variant="label">0{index + 1}</AppText>
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <AppText variant="label" style={{ color: colors.orange }}>{insight.eyebrow}</AppText>
                  <AppText variant="title">{insight.title}</AppText>
                  <AppText style={{ color: colors.inkSoft }}>{insight.body}</AppText>
                  <Button
                    label="Pin as this week’s intention"
                    variant="ghost"
                    onPress={() => { void saveIntention(insight.body, start); }}
                  />
                  {buildTeamExperiment(insight.id) ? (
                    <Button
                      label="Turn into a team experiment"
                      variant="secondary"
                      onPress={() => router.push({ pathname: '/team-experiment', params: { insightId: insight.id, start: start.toISOString() } })}
                    />
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : (
        <EmptyState
          title={emptyCopy.title}
          body={emptyCopy.body}
          action={<Button label="Log a meeting" variant="secondary" onPress={() => router.push({ pathname: '/log', params: { from: 'insights' } })} />}
        />
      )}
    </Screen>
  );
}

function RecoveryMetric({ value, label }: { value: string; label: string }) {
  return <View style={styles.recoveryMetric}><AppText variant="display">{value}</AppText><AppText variant="small" style={{ color: colors.inkSoft }}>{label}</AppText></View>;
}

function PatternMetric({ label, count, average }: { label: string; count: number; average: number | null }) {
  const color = average == null ? colors.inkSoft : average > 0 ? colors.moss : average < 0 ? colors.wine : colors.amber;
  return (
    <View style={styles.patternMetric} accessibilityLabel={`${label}, ${count} logged meetings${average == null ? ', more data needed' : `, average ${formatSigned(average)}`}`}>
      <AppText variant="label" style={{ color: colors.inkSoft }}>{label}</AppText>
      <AppText variant="title" style={{ color }}>{average == null ? '—' : formatSigned(average)}</AppText>
      <AppText variant="small" style={{ color: colors.inkSoft }}>{count} logs</AppText>
    </View>
  );
}

function formatMinutes(minutes: number): string {
  return minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10}h` : `${minutes}m`;
}

function formatBudgetValue(value: number, unit: 'minutes' | 'meetings'): string {
  return unit === 'minutes' ? formatMinutes(value) : `${value}`;
}

function Balance({ value, label, color }: { value: number; label: string; color: string }) {
  return <View style={styles.balance}><View style={[styles.dot, { backgroundColor: color, shadowColor: color }]} /><AppText variant="small">{value} {label}</AppText></View>;
}

function Snapshot({ label, value, tone }: { label: string; value: string; tone: 'positive' | 'negative' }) {
  return (
    <Card style={[styles.snapshotCard, { backgroundColor: tone === 'positive' ? colors.mossSoft : colors.wineSoft }]}>
      <AppText variant="label" style={{ color: tone === 'positive' ? colors.moss : colors.wine }}>{label}</AppText>
      <AppText variant="title">{value}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(17,24,39,0.62)', alignItems: 'center', justifyContent: 'center', shadowColor: colors.shadow, shadowOpacity: 0.25, shadowRadius: 12 },
  heroCard: { minHeight: 320, gap: spacing.md, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  countBlock: { alignItems: 'flex-end', paddingBottom: 4 },
  balanceRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, shadowOpacity: 0.6, shadowRadius: 7 },
  snapshot: { gap: spacing.md },
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  snapshotCard: { width: '48%', minHeight: 140, padding: spacing.md, justifyContent: 'space-between', gap: spacing.md, borderRadius: radius.md, borderColor: colors.lineDark },
  insights: { gap: spacing.md },
  insightCard: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  insightNumber: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  seriesCard: { gap: spacing.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recoveryCard: { gap: spacing.md },
  recoveryMetrics: { flexDirection: 'row', gap: spacing.sm },
  recoveryMetric: { flex: 1, gap: 3 },
  budgetCard: { gap: spacing.md },
  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  heroGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, opacity: 0.10, right: -95, top: -92, shadowOpacity: 0.9, shadowRadius: 90 },
  patternCard: { gap: spacing.md },
  patternGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  daypartGrid: { flexDirection: 'row', gap: 8 },
  patternMetric: { minWidth: 72, flex: 1, gap: 3, padding: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: 'rgba(7,10,18,0.38)' },
  actionGrid: { gap: 10 },
  actionCard: { gap: spacing.sm, padding: spacing.md },
});
