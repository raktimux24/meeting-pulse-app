import { addDays, addWeeks, differenceInCalendarWeeks, endOfDay, endOfWeek, format, isSameDay, isSameWeek, startOfDay, startOfWeek, subWeeks } from 'date-fns';
import { CalendarClock, CalendarRange, ChevronLeft, ChevronRight, MessageSquareText, Share2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';

import { MeetingCard } from '@/components/meeting-card';
import { PressableScale, Rise, useRollingNumber } from '@/components/motion';
import { UndoBar } from '@/components/undo-bar';
import { WeekChart } from '@/components/week-chart';
import { AppText, Button, Card, EmptyState, formatSigned, Glow, GradientCard, Header, Pill, Screen, SectionTitle } from '@/components/ui';
import { addCalendarHolds, BUFFER_EVENT_TITLE, calendarAssistAvailable, loadCalendarSlots } from '@/data/calendar-assist';
import { REASON_MAP } from '@/domain/constants';
import { planBuffers } from '@/domain/reset';
import { getHitRateByType, getOutcomeHitRate } from '@/domain/trends';
import { getSeriesVerdicts, VERDICT_WEEKS, verdictMessage, type SeriesVerdict } from '@/domain/verdicts';
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
import { colors, fonts, gradients, radius, spacing } from '@/theme/tokens';

export default function InsightsScreen() {
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  // Which way the user last moved, so the new week slides in from that side.
  const [direction, setDirection] = useState<'back' | 'forward'>('back');
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
  const verdictStart = useMemo(() => startOfWeek(subWeeks(start, VERDICT_WEEKS - 1), { weekStartsOn }), [start, weekStartsOn]);
  const verdicts = useMemo(() => {
    const recent = seriesMeetings.filter((meeting) => new Date(meeting.occurredAt) >= verdictStart);
    return new Map(getSeriesVerdicts(recent).map((verdict) => [verdict.key, verdict]));
  }, [seriesMeetings, verdictStart]);
  const hitRate = useMemo(() => getOutcomeHitRate(seriesMeetings), [seriesMeetings]);
  const hitRateByType = useMemo(() => getHitRateByType(seriesMeetings).slice(0, 3), [seriesMeetings]);
  const [protecting, setProtecting] = useState(false);
  const timePatterns = useMemo(() => summarizeTimePatterns(seriesMeetings), [seriesMeetings]);
  const actionKit = useMemo(() => listActionKit(), []);
  const isCurrentWeek = isSameWeek(weekAnchor, new Date(), { weekStartsOn });
  // Tone follows the same thresholds as the week label, so colour and words agree.
  const pulseTone = summary.pulseTone === 'positive' ? colors.moss : summary.pulseTone === 'negative' ? colors.wine : colors.amber;
  const shownPulse = useRollingNumber(summary.weeklyPulse);
  const weeksAgo = differenceInCalendarWeeks(new Date(), weekAnchor, { weekStartsOn });
  const weekLabel = isCurrentWeek ? 'This week' : weeksAgo === 1 ? 'Last week' : `${weeksAgo} weeks ago`;
  const dayMeetings = selectedDay
    ? summary.meetings.filter((meeting) => isSameDay(new Date(meeting.occurredAt), new Date(selectedDay)))
    : [];

  const emptyCopy = isCurrentWeek
    ? { title: 'This week is still building', body: 'Log a meeting to begin building your weekly signal. Three reflections are enough to surface the first pattern.' }
    : { title: 'This week was quiet', body: 'No reflections were captured in this week. Jump back to now, or log one if you want the pattern later.' };

  const shareVerdict = async (verdict: SeriesVerdict, decision: SeriesDecision) => {
    await Share.share({ message: verdictMessage(verdict, decision) }).catch(() => undefined);
  };

  /** Finds back-to-back runs in tomorrow's calendar and offers to hold a buffer after each one. */
  const protectTomorrow = async () => {
    setProtecting(true);
    try {
      const tomorrow = addDays(new Date(), 1);
      const result = await loadCalendarSlots(startOfDay(tomorrow), endOfDay(tomorrow));
      if (result.permission !== 'granted') {
        Alert.alert('Calendar access is off', 'Nothing was read or added. You can allow calendar access in system settings.');
        return;
      }
      const bufferMinutes = meetingBudget.preferredBufferMinutes ?? 15;
      const proposals = planBuffers(result.slots, new Date(), bufferMinutes);
      if (!proposals.length) {
        Alert.alert('Tomorrow already breathes', `No back-to-back runs with a free ${bufferMinutes}-minute gap after them were found.`);
        return;
      }
      const lines = proposals.map((item) => `• ${format(new Date(item.startIso), 'h:mm a')} after ${item.chainCount} meetings in a row`).join('\n');
      Alert.alert(
        `Add ${proposals.length} buffer${proposals.length === 1 ? '' : 's'} tomorrow?`,
        `${bufferMinutes}-minute holds marked busy in your default calendar:\n${lines}`,
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Add buffers',
            onPress: () => {
              void addCalendarHolds(proposals.map((item) => ({ startIso: item.startIso, minutes: item.minutes, title: BUFFER_EVENT_TITLE, notes: `Recovery after ${item.chainCount} back-to-back meetings. Added by Meeting Pulse.` })))
                .then((count) => Alert.alert('Buffers added', `${count} hold${count === 1 ? '' : 's'} added to tomorrow.`))
                .catch((error: unknown) => Alert.alert('Nothing was added', error instanceof Error ? error.message : 'Please try again.'));
            },
          },
        ],
      );
    } catch {
      Alert.alert('Calendar unavailable', 'Meeting Pulse could not read tomorrow’s meeting times.');
    } finally {
      setProtecting(false);
    }
  };

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
        <PressableScale accessibilityRole="button" accessibilityLabel="Previous week" haptic="selection" scaleTo={0.9} onPress={() => { setDirection('back'); setSelectedDay(null); setWeekAnchor((date) => subWeeks(date, 1)); }} style={styles.navButton}>
          <ChevronLeft size={20} color={colors.ink} />
        </PressableScale>
        <View style={{ alignItems: 'center' }}>
          <AppText variant="small" style={{ color: colors.inkSoft }}>{weekLabel}</AppText>
          <AppText style={{ fontFamily: fonts.bodyBold }}>{format(start, 'MMM d')} – {format(end, 'MMM d')}</AppText>
        </View>
        <PressableScale accessibilityRole="button" accessibilityLabel="Next week" haptic="selection" scaleTo={0.9} disabled={isCurrentWeek} onPress={() => { setDirection('forward'); setSelectedDay(null); setWeekAnchor((date) => addWeeks(date, 1)); }} style={[styles.navButton, isCurrentWeek && { opacity: 0.25 }]}>
          <ChevronRight size={20} color={colors.ink} />
        </PressableScale>
      </View>
      {!isCurrentWeek ? <Button label="Jump to this week" variant="ghost" onPress={() => { setDirection('forward'); setSelectedDay(null); setWeekAnchor(new Date()); }} /> : null}

      {summary.meetingCount ? (
        <Animated.View key={start.toISOString()} entering={(direction === 'back' ? FadeInLeft : FadeInRight).duration(320)} style={styles.week}>
          <GradientCard colors={gradients.hero} style={styles.heroCard}>
            <Glow color={pulseTone} size={360} opacity={0.24} style={{ right: -160, top: -170 }} />
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <AppText variant="label" style={{ color: pulseTone }}>Meeting pulse</AppText>
                <AppText variant="hero" style={{ color: pulseTone }}>{formatSigned(shownPulse)}</AppText>
                <AppText variant="title">{summary.classification}</AppText>
                {delta ? (
                  <AppText variant="small" style={{ color: colors.inkSoft }}>
                    {formatSigned(delta.delta)} vs last week · was {delta.previousClassification}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.countBlock}>
                <AppText variant="display">{summary.meetingCount}</AppText>
                <AppText variant="small" style={{ color: colors.inkSoft }}>{summary.meetingCount === 1 ? 'meeting' : 'meetings'}</AppText>
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

          <Button label="Create shareable report" onPress={() => router.push({ pathname: '/report', params: { start: start.toISOString() } })} icon={<Share2 size={19} color={colors.onAccent} />} />

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
            {calendarAssistAvailable() ? (
              <Button label="Protect tomorrow’s buffers" variant="secondary" loading={protecting} onPress={() => { void protectTomorrow(); }} icon={<CalendarClock size={18} color={colors.ink} />} />
            ) : null}
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
                  {(() => {
                    const verdict = verdicts.get(item.key);
                    if (!verdict) return null;
                    const verdictTone = verdict.totalImpact < 0 ? colors.wine : colors.moss;
                    return (
                      <View style={[styles.verdict, { borderColor: verdictTone }]}>
                        <AppText variant="label" style={{ color: verdictTone }}>Verdict · last {VERDICT_WEEKS} weeks</AppText>
                        <AppText variant="title">
                          {verdict.totalImpact < 0 ? 'Cost' : 'Returned'} {formatSigned(verdict.totalImpact)} across {verdict.hours} {verdict.hours === 1 ? 'hour' : 'hours'}
                        </AppText>
                        <AppText style={{ color: colors.inkSoft }}>Suggested: {SERIES_DECISION_LABELS[verdict.suggestion]}. {verdict.because}</AppText>
                      </View>
                    );
                  })()}
                  <AppText variant="small" style={{ color: colors.inkSoft }}>What should happen to this recurring format?</AppText>
                  <View style={styles.pills}>
                    {SERIES_DECISIONS.map((decision) => (
                      <Pill
                        key={decision}
                        label={`${SERIES_DECISION_LABELS[decision]}${verdicts.get(item.key)?.suggestion === decision ? ' · suggested' : ''}`}
                        selected={seriesReviews.find((review) => review.key === item.key)?.decision === decision}
                        onPress={() => { void reviewSeries(item, decision); }}
                      />
                    ))}
                  </View>
                  {(() => {
                    const decision = seriesReviews.find((review) => review.key === item.key)?.decision;
                    const verdict = verdicts.get(item.key);
                    const messageDecision = decision ?? verdict?.suggestion;
                    return (
                      <>
                        {verdict && messageDecision && messageDecision !== 'keep' ? (
                          <Button label="Send the organizer a note" variant="secondary" onPress={() => { void shareVerdict(verdict, messageDecision); }} icon={<MessageSquareText size={18} color={colors.ink} />} />
                        ) : null}
                        {decision && decision !== 'keep' ? (
                          <Button label="Prepare a safe message" variant="ghost" onPress={() => router.push({ pathname: '/team-experiment', params: { insightId: `series-${decision}`, start: start.toISOString() } })} />
                        ) : null}
                      </>
                    );
                  })()}
                </Card>
              ))}
            </View>
          ) : null}

          {hitRate.withIntent ? (
            <View style={styles.snapshot}>
              <SectionTitle eyebrow="Outcome hit rate" title="Did meetings produce what they were for?" />
              <Card style={styles.hitCard}>
                {hitRate.rate != null ? (
                  <>
                    <View style={styles.hitTop}>
                      <AppText variant="hero" style={{ color: hitRate.rate >= 60 ? colors.moss : hitRate.rate >= 40 ? colors.amber : colors.wine }}>{hitRate.rate}%</AppText>
                      <AppText style={{ flex: 1, color: colors.inkSoft }}>of {hitRate.answered} meeting{hitRate.answered === 1 ? '' : 's'} with an intended outcome produced it over the last {patternWeeks} weeks. Partly counts as half.</AppText>
                    </View>
                    {hitRateByType.length ? hitRateByType.map((item) => (
                      <View key={item.meetingType} style={styles.budgetRow}>
                        <AppText style={{ flex: 1 }}>{meetingTypeLabel(item.meetingType, customMeetingTypes)}</AppText>
                        <AppText variant="small" style={{ color: colors.inkSoft }}>{item.answered} answered</AppText>
                        <AppText variant="title" style={{ color: (item.rate ?? 0) >= 60 ? colors.moss : (item.rate ?? 0) >= 40 ? colors.amber : colors.wine, minWidth: 48, textAlign: 'right' }}>{item.rate}%</AppText>
                      </View>
                    )) : null}
                  </>
                ) : (
                  <AppText style={{ color: colors.inkSoft }}>You wrote {hitRate.withIntent} intended outcome{hitRate.withIntent === 1 ? '' : 's'}. Answer “Did it produce it?” in the outcome check to see your hit rate.</AppText>
                )}
              </Card>
            </View>
          ) : null}

          <View style={styles.snapshot}>
            <SectionTitle eyebrow="Longer view" title="When meetings tend to land well" />
            <Button label="Month in pixels and quarterly trends" variant="secondary" onPress={() => router.push('/trends')} icon={<CalendarRange size={18} color={colors.ink} />} />
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

          {/* Hidden until there are enough meetings to call anything a pattern. */}
          {summary.hasEnoughSignal ? <View style={styles.snapshot}>
            <SectionTitle eyebrow="At a glance" title="What shaped the week" />
            <View style={styles.snapshotGrid}>
              <Snapshot index={0} label="Most useful" value={summary.mostUsefulType ? meetingTypeLabel(summary.mostUsefulType, customMeetingTypes) : 'No clear leader'} tone="positive" />
              <Snapshot index={1} label="Most draining" value={summary.mostDrainingType ? meetingTypeLabel(summary.mostDrainingType, customMeetingTypes) : 'No clear drag'} tone="negative" />
              <Snapshot index={2} label="Top friction" value={summary.topNegativeReason ? REASON_MAP[summary.topNegativeReason].label : 'None repeated'} tone="negative" />
              <Snapshot index={3} label="Best pattern" value={summary.bestPattern} tone="positive" />
            </View>
          </View> : null}

          <View style={styles.insights}>
            <SectionTitle eyebrow="Coach’s notes" title="What to change next" />
            <AppText style={{ color: colors.inkSoft }}>These notes come from simple rules on this device, not a model or a manager score.</AppText>
            {summary.insights.map((insight, index) => (
              <Rise key={insight.id} index={index} delay={200}>
              <Card style={styles.insightCard}>
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
              </Rise>
            ))}
          </View>
        </Animated.View>
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
      <AppText variant="small" style={{ color: colors.inkSoft }}>{count} {count === 1 ? 'log' : 'logs'}</AppText>
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

function Snapshot({ label, value, tone, index }: { label: string; value: string; tone: 'positive' | 'negative'; index: number }) {
  return (
    <Rise index={index} delay={160} style={styles.snapshotCell}>
      <Card style={[styles.snapshotCard, { backgroundColor: tone === 'positive' ? colors.mossSoft : colors.wineSoft }]}>
        <AppText variant="label" style={{ color: tone === 'positive' ? colors.moss : colors.wine }}>{label}</AppText>
        <AppText variant="title">{value}</AppText>
      </Card>
    </Rise>
  );
}

const styles = StyleSheet.create({
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(17,24,39,0.62)', alignItems: 'center', justifyContent: 'center', shadowColor: colors.shadow, shadowOpacity: 0.25, shadowRadius: 12 },
  week: { gap: spacing.lg },
  heroCard: { gap: spacing.md, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  countBlock: { alignItems: 'flex-end', paddingBottom: 4 },
  balanceRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, shadowOpacity: 0.6, shadowRadius: 7 },
  snapshot: { gap: spacing.md },
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  // flex columns so the grid reaches the right margin (48% + a fixed gap fell 4pt short).
  snapshotCell: { flexBasis: '45%', flexGrow: 1 },
  snapshotCard: { flex: 1, minHeight: 124, padding: spacing.md, justifyContent: 'space-between', gap: spacing.md, borderRadius: radius.md, borderColor: colors.lineDark },
  insights: { gap: spacing.md },
  insightCard: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  insightNumber: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  seriesCard: { gap: spacing.sm },
  verdict: { gap: 4, padding: spacing.sm, borderLeftWidth: 2, borderRadius: radius.sm, backgroundColor: 'rgba(7,10,18,0.38)' },
  hitCard: { gap: spacing.md },
  hitTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recoveryCard: { gap: spacing.md },
  recoveryMetrics: { flexDirection: 'row', gap: spacing.sm },
  recoveryMetric: { flex: 1, gap: 3 },
  budgetCard: { gap: spacing.md },
  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  patternCard: { gap: spacing.md },
  patternGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  daypartGrid: { flexDirection: 'row', gap: 8 },
  patternMetric: { minWidth: 72, flex: 1, gap: 3, padding: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: 'rgba(7,10,18,0.38)' },
  actionGrid: { gap: 10 },
  actionCard: { gap: spacing.sm, padding: spacing.md },
});
