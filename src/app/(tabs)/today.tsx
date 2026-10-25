import { endOfDay, endOfWeek, format, startOfDay, startOfWeek } from 'date-fns';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bolt, CalendarDays, ChartNoAxesCombined, ChevronDown, ChevronRight, ChevronUp, Plus, Settings2 } from 'lucide-react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MeetingCard } from '@/components/meeting-card';
import { UndoBar } from '@/components/undo-bar';
import { AppText, Button, Card, EmptyState, formatSigned, GradientCard, Header, Screen, SectionTitle } from '@/components/ui';
import { priorityBudgetMetric, summarizeBudget } from '@/domain/budget';
import { summarizeRecovery } from '@/domain/recovery';
import type { ExperimentResult, Meeting, QuickPulse } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, fonts, gradients, spacing } from '@/theme/tokens';

export default function TodayScreen() {
  const { getRange, getQuickPulses, revision, intention, markIntentionTried, reviewIntention, weekStartsOn, meetingBudget } = useAppData();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [weekMeetings, setWeekMeetings] = useState<Meeting[]>([]);
  const [quickPulses, setQuickPulses] = useState<QuickPulse[]>([]);
  const [showTools, setShowTools] = useState(false);

  useEffect(() => {
    getRange(startOfDay(new Date()), endOfDay(new Date())).then(setMeetings);
    getRange(startOfWeek(new Date(), { weekStartsOn }), endOfWeek(new Date(), { weekStartsOn })).then(setWeekMeetings);
    getQuickPulses().then(setQuickPulses);
  }, [getQuickPulses, getRange, revision, weekStartsOn]);

  const pulse = Math.round(meetings.reduce((sum, meeting) => sum + meeting.impactScore, 0) * 10) / 10;
  const totalMinutes = meetings.reduce((sum, meeting) => sum + meeting.durationMinutes, 0);
  const positive = meetings.filter((meeting) => meeting.impactScore > 0).length;
  const negative = meetings.filter((meeting) => meeting.impactScore < 0).length;
  const neutral = meetings.length - positive - negative;
  const recovery = summarizeRecovery(meetings, meetingBudget.preferredBufferMinutes ?? undefined);
  const budgetSummary = summarizeBudget(weekMeetings, meetingBudget);
  const budgetMetric = priorityBudgetMetric(budgetSummary);
  return (
    <Screen>
      <Header
        eyebrow={format(new Date(), 'EEEE · MMMM d')}
        title="Today’s pulse"
        subtitle={meetings.length ? 'A quick read on the cost and return of your meeting day.' : 'Notice the effect—not just the time.'}
        onLog={() => router.push({ pathname: '/log', params: { from: 'today' } })}
        onSettings={() => router.push('/settings')}
      />

      <UndoBar />

      <Card style={styles.toolsCard}>
        <View style={styles.toolsHeader}>
          <View style={{ flex: 1, gap: 3 }}>
            <AppText variant="label" style={{ color: colors.orange }}>Feature guide</AppText>
            <AppText variant="title">Find the deeper tools</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showTools ? 'Hide feature guide' : 'Explore feature guide'}
            accessibilityState={{ expanded: showTools }}
            onPress={() => setShowTools((value) => !value)}
            style={({ pressed }) => [styles.toolsToggle, pressed && styles.guidePressed]}
          >
            <AppText variant="small" style={styles.toolsToggleText}>{showTools ? 'Hide' : 'Explore'}</AppText>
            {showTools ? <ChevronUp size={16} color={colors.inkSoft} /> : <ChevronDown size={16} color={colors.inkSoft} />}
          </Pressable>
        </View>
        {showTools ? (
          <View style={styles.toolLinks}>
            <FeatureGuidePill
              title="Patterns & action kit"
              subtitle="Insights · recurring reviews"
              icon={<ChartNoAxesCombined size={19} color={colors.orange} />}
              onPress={() => router.push('/(tabs)/insights')}
            />
            <FeatureGuidePill
              title="Personal guardrails"
              subtitle="Settings · custom reasons"
              icon={<Settings2 size={19} color={colors.orange} />}
              onPress={() => router.push('/settings')}
            />
            <FeatureGuidePill
              title="Calendar Assist"
              subtitle="Bring scheduled meetings into view"
              icon={<CalendarDays size={19} color={colors.orange} />}
              onPress={() => router.push('/calendar-assist')}
            />
          </View>
        ) : (
          <AppText variant="small" style={{ color: colors.inkSoft }}>Patterns and action templates live in Insights. Guardrails, custom reasons, reminders, and Calendar Assist live in Settings.</AppText>
        )}
      </Card>

      {intention && !intention.tried ? (
        <GradientCard colors={gradients.glass} style={styles.intentionCard}>
          <AppText variant="label" style={{ color: colors.orange }}>This week’s intention</AppText>
          <AppText variant="title">{intention.text}</AppText>
          <Button label="I tried this" variant="secondary" onPress={() => { void markIntentionTried(); }} />
        </GradientCard>
      ) : null}

      {intention?.tried && !intention.result ? (
        <GradientCard colors={gradients.glass} style={styles.intentionCard}>
          <AppText variant="label" style={{ color: colors.orange }}>Experiment check-back</AppText>
          <AppText variant="title">Did this help?</AppText>
          <AppText style={{ color: colors.inkSoft }}>{intention.text}</AppText>
          <View style={styles.reviewActions}>
            {([
              ['helped', 'Yes'],
              ['somewhat', 'Somewhat'],
              ['no', 'No'],
              ['not-tried', 'Didn’t try'],
            ] as [ExperimentResult, string][]).map(([result, label]) => (
              <Button key={result} label={label} variant="secondary" onPress={() => { void reviewIntention(result); }} style={styles.reviewButton} />
            ))}
          </View>
          <AppText variant="small" style={{ color: colors.inkSoft }}>Your answer records your judgment; it does not claim the experiment caused a score change.</AppText>
        </GradientCard>
      ) : null}

      {intention?.result ? (
        <Card style={styles.signalCard}>
          <AppText variant="label" style={{ color: colors.moss }}>Experiment reviewed</AppText>
          <AppText variant="title">{experimentResultLabel(intention.result)}</AppText>
          <AppText style={{ color: colors.inkSoft }}>{intention.text}</AppText>
        </Card>
      ) : null}

      <View style={styles.captureActions}>
        <Button style={{ flex: 1 }} label="Quick Pulse" onPress={() => router.push('/quick-pulse')} icon={<Bolt size={20} color={colors.white} />} />
        <Button style={{ flex: 1 }} label="Full reflection" variant="secondary" onPress={() => router.push({ pathname: '/log', params: { from: 'today' } })} icon={<Plus size={20} color={colors.ink} />} />
      </View>

      {quickPulses.length ? (
        <Card style={styles.pendingCard}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="label" style={{ color: colors.amber }}>Finish later</AppText>
            <AppText variant="title">{quickPulses.length} Quick Pulse{quickPulses.length === 1 ? '' : 's'} waiting</AppText>
            <AppText style={{ color: colors.inkSoft }}>Add a name and duration before these signals enter your score and insights.</AppText>
          </View>
          <Button label="Review Quick Pulses" variant="secondary" onPress={() => router.push('/quick-pulses')} />
        </Card>
      ) : null}

      <GradientCard colors={gradients.hero} style={styles.pulseCard}>
        <View pointerEvents="none" style={styles.heroGlow} />
        <View style={styles.pulseTop}>
          <View style={styles.pulseCopy}>
            <AppText variant="label" style={{ color: colors.orange }}>Energy balance</AppText>
            <AppText variant="hero" accessibilityLabel={`${pulse >= 0 ? 'positive' : 'negative'} ${Math.abs(pulse)} energy balance`}>
              {formatSigned(pulse)}
            </AppText>
          </View>
          <View style={styles.pulseStage}>
            <View pointerEvents="none" style={[styles.orbit, styles.orbitOuter]} />
            <View pointerEvents="none" style={[styles.orbit, styles.orbitMid]} />
            <PulseDisc pulse={pulse} />
          </View>
        </View>
        <View style={styles.rule} />
        <View style={styles.metrics}>
          <Metric value={`${meetings.length}`} label="Meetings" />
          <View style={styles.metricRule} />
          <Metric value={totalMinutes >= 60 ? `${(totalMinutes / 60).toFixed(totalMinutes % 60 ? 1 : 0)}h` : `${totalMinutes}m`} label="In calls" />
          <View style={styles.metricRule} />
          <Metric value={`${positive}/${neutral}/${negative}`} label="Return mix" hint={`${positive} returned, ${neutral} neutral, ${negative} cost`} />
        </View>
      </GradientCard>

      {recovery.tightTransitions > 0 ? (
        <Card style={styles.signalCard}>
          <AppText variant="label" style={{ color: colors.orange }}>Recovery radar</AppText>
          <AppText variant="title">{recovery.tightTransitions} tight turnaround{recovery.tightTransitions === 1 ? '' : 's'} today</AppText>
          <AppText style={{ color: colors.inkSoft }}>Among meetings you logged, these started within {meetingBudget.preferredBufferMinutes ?? 15} minutes of the previous one.</AppText>
        </Card>
      ) : null}

      {budgetMetric ? (
        <Card style={styles.signalCard}>
          <AppText variant="label" style={{ color: budgetMetric.status === 'over' ? colors.wine : colors.amber }}>Personal guardrail</AppText>
          <AppText variant="title">{budgetMetric.status === 'over' ? 'Past' : 'Near'} your {budgetMetric.label.toLowerCase()} guardrail</AppText>
          <AppText style={{ color: colors.inkSoft }}>{formatBudgetValue(budgetMetric.current, budgetMetric.unit)} of {formatBudgetValue(budgetMetric.limit, budgetMetric.unit)} · based on meetings you logged.</AppText>
        </Card>
      ) : budgetSummary.enabled && budgetSummary.preferredBufferMinutes && budgetSummary.shortTransitions > 0 ? (
        <Card style={styles.signalCard}>
          <AppText variant="label" style={{ color: colors.amber }}>Preferred buffer</AppText>
          <AppText variant="title">{budgetSummary.shortTransitions} weekly transition{budgetSummary.shortTransitions === 1 ? '' : 's'} under {budgetSummary.preferredBufferMinutes} minutes</AppText>
          <AppText style={{ color: colors.inkSoft }}>Based on meetings you logged.</AppText>
        </Card>
      ) : null}

      <View style={styles.list}>
        <SectionTitle eyebrow="Daily log" title={meetings.length ? `${meetings.length} reflection${meetings.length === 1 ? '' : 's'}` : 'Your meetings'} />
        {meetings.length ? (
          meetings.map((meeting) => (
            <MeetingCard key={meeting.id} meeting={meeting} onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: meeting.id, from: 'today' } })} />
          ))
        ) : (
          <EmptyState
            title="No signal yet"
            body="After your next meeting, take 20 seconds to capture how it changed your energy or clarity."
            action={<Button label="Log the first one" variant="secondary" onPress={() => router.push({ pathname: '/log', params: { from: 'today' } })} />}
          />
        )}
      </View>
    </Screen>
  );
}

function FeatureGuidePill({ title, subtitle, icon, onPress }: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [styles.guidePill, pressed && styles.guidePressed]}
    >
      <View style={styles.guideIcon}>{icon}</View>
      <View style={styles.guideCopy}>
        <AppText style={styles.guideTitle}>{title}</AppText>
        <AppText variant="small" style={styles.guideSubtitle}>{subtitle}</AppText>
      </View>
      <ChevronRight size={18} color={colors.inkSoft} />
    </Pressable>
  );
}

function experimentResultLabel(result: ExperimentResult): string {
  if (result === 'helped') return 'You said it helped';
  if (result === 'somewhat') return 'You said it helped somewhat';
  if (result === 'no') return 'You said it did not help';
  return 'You did not try it this week';
}

function formatBudgetValue(value: number, unit: 'minutes' | 'meetings'): string {
  if (unit === 'meetings') return `${value}`;
  return value >= 60 ? `${Math.round((value / 60) * 10) / 10}h` : `${value}m`;
}

function PulseDisc({ pulse }: { pulse: number }) {
  const Icon = pulse > 0 ? ArrowUpRight : pulse < 0 ? ArrowDownRight : ArrowRight;
  const borderColor = pulse > 0 ? colors.moss : pulse < 0 ? colors.wine : colors.amber;

  return (
    <View style={[styles.pulseDisc, { borderColor }]} accessibilityElementsHidden>
      <View style={styles.pulseIconSlot}>
        <View style={styles.pulseIcon}>
          <Icon size={22} color={colors.white} strokeWidth={2.25} style={styles.pulseGlyph} />
        </View>
      </View>
    </View>
  );
}

function Metric({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <View style={styles.metric} accessibilityLabel={hint ?? `${value} ${label}`}>
      <AppText variant="title" style={styles.metricValue}>{value}</AppText>
      <AppText variant="small" numberOfLines={1} style={styles.metricLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pulseCard: { gap: 16, overflow: 'hidden', paddingVertical: 20 },
  pulseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  pulseCopy: { flex: 1, gap: 6, paddingRight: spacing.md },
  pulseStage: { width: 88, height: 88, position: 'relative' },
  orbit: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  orbitOuter: { top: 0, left: 0, width: 88, height: 88, borderRadius: 44 },
  orbitMid: { top: 8, left: 8, width: 72, height: 72, borderRadius: 36, borderColor: 'rgba(255,255,255,0.18)' },
  pulseDisc: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.orange,
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  pulseIconSlot: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseIcon: {
    width: 22,
    height: 22,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pulseGlyph: {
    width: 22,
    height: 22,
    position: 'relative',
  },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.10)' },
  metrics: { flexDirection: 'row', alignItems: 'flex-start' },
  metric: { flex: 1, minWidth: 0, gap: 4 },
  metricValue: { fontFamily: fonts.bodyBold, lineHeight: 22 },
  metricLabel: { color: colors.inkSoft },
  metricRule: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.10)', marginHorizontal: 12, alignSelf: 'stretch', minHeight: 36 },
  captureActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  toolsCard: { gap: spacing.md, paddingVertical: spacing.md },
  toolsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toolsToggle: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(255,255,255,0.035)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  toolsToggleText: { color: colors.ink, fontFamily: fonts.bodyBold },
  toolLinks: { gap: 10 },
  guidePill: { minHeight: 68, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(17,24,39,0.72)', paddingVertical: 11, paddingLeft: 12, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  guidePressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  guideIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orangeSoft, borderWidth: 1, borderColor: 'rgba(255,121,88,0.30)' },
  guideCopy: { flex: 1, gap: 2 },
  guideTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },
  guideSubtitle: { color: colors.inkSoft, lineHeight: 16 },
  list: { gap: spacing.md },
  intentionCard: { gap: spacing.md },
  reviewActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reviewButton: { minWidth: '47%', flexGrow: 1 },
  pendingCard: { gap: spacing.md },
  signalCard: { gap: spacing.sm },
  heroGlow: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: colors.orange, opacity: 0.12, right: -28, top: -70, shadowColor: colors.orange, shadowOpacity: 0.9, shadowRadius: 70 },
});
