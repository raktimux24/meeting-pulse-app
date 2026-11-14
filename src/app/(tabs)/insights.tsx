import { addWeeks, differenceInCalendarWeeks, endOfWeek, format, isSameWeek, startOfWeek, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';

import { PressableScale, Rise, useRollingNumber } from '@/components/motion';
import { WeekChart } from '@/components/week-chart';
import { AppText, Button, Card, EmptyState, formatSigned, Glow, GradientCard, Header, Screen, SectionTitle } from '@/components/ui';
import { MEETING_TYPE_LABELS, REASON_MAP } from '@/domain/constants';
import { summarizeWeek } from '@/domain/insights';
import type { Meeting } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, fonts, gradients, radius, spacing } from '@/theme/tokens';

export default function InsightsScreen() {
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  // Which way the user last moved, so the new week slides in from that side.
  const [direction, setDirection] = useState<'back' | 'forward'>('back');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const { getRange, revision, weekStartsOn } = useAppData();
  const start = useMemo(() => startOfWeek(weekAnchor, { weekStartsOn }), [weekAnchor, weekStartsOn]);
  const end = useMemo(() => endOfWeek(weekAnchor, { weekStartsOn }), [weekAnchor, weekStartsOn]);

  useEffect(() => {
    getRange(start, end).then(setMeetings);
  }, [end, getRange, revision, start]);

  const summary = useMemo(() => summarizeWeek(meetings, start, end), [end, meetings, start]);
  const isCurrentWeek = isSameWeek(weekAnchor, new Date(), { weekStartsOn });
  const pulseTone = summary.pulseTone === 'positive' ? colors.moss : summary.pulseTone === 'negative' ? colors.wine : colors.amber;
  const shownPulse = useRollingNumber(summary.weeklyPulse);
  const weeksAgo = differenceInCalendarWeeks(new Date(), weekAnchor, { weekStartsOn });
  const weekLabel = isCurrentWeek ? 'This week' : weeksAgo === 1 ? 'Last week' : `${weeksAgo} weeks ago`;

  return (
    <Screen>
      <Header eyebrow="Pattern finder" title="Weekly signal" subtitle="Turn soft reactions into practical changes." onSettings={() => router.push('/settings')} />

      <View style={styles.weekNav}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Previous week" haptic="selection" scaleTo={0.9} onPress={() => { setDirection('back'); setWeekAnchor((date) => subWeeks(date, 1)); }} style={styles.navButton}>
          <ChevronLeft size={20} color={colors.ink} />
        </PressableScale>
        <View style={{ alignItems: 'center' }}>
          <AppText variant="small" style={{ color: colors.inkSoft }}>{weekLabel}</AppText>
          <AppText style={{ fontFamily: fonts.bodyBold }}>{format(start, 'MMM d')} – {format(end, 'MMM d')}</AppText>
        </View>
        <PressableScale accessibilityRole="button" accessibilityLabel="Next week" haptic="selection" scaleTo={0.9} disabled={isCurrentWeek} onPress={() => { setDirection('forward'); setWeekAnchor((date) => addWeeks(date, 1)); }} style={[styles.navButton, isCurrentWeek && { opacity: 0.25 }]}>
          <ChevronRight size={20} color={colors.ink} />
        </PressableScale>
      </View>

      {summary.meetingCount ? (
        <Animated.View key={start.toISOString()} entering={(direction === 'back' ? FadeInLeft : FadeInRight).duration(320)} style={styles.week}>
          <GradientCard colors={gradients.hero} style={styles.heroCard}>
            <Glow color={pulseTone} size={360} opacity={0.24} style={{ right: -160, top: -170 }} />
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <AppText variant="label" style={{ color: pulseTone }}>Meeting pulse</AppText>
                <AppText variant="hero" style={{ color: pulseTone }}>{formatSigned(shownPulse)}</AppText>
                <AppText variant="title">{summary.classification}</AppText>
              </View>
              <View style={styles.countBlock}>
                <AppText variant="display">{summary.meetingCount}</AppText>
                <AppText variant="small" style={{ color: colors.inkSoft }}>{summary.meetingCount === 1 ? 'meeting' : 'meetings'}</AppText>
                <AppText variant="small" style={{ color: colors.inkSoft }}>{(summary.totalMinutes / 60).toFixed(1)} hours</AppText>
              </View>
            </View>
            <WeekChart data={summary.weekdayScores} />
            <View style={styles.balanceRow}>
              <Balance value={summary.positiveCount} label="Returned" color={colors.moss} />
              <Balance value={summary.neutralCount} label="Neutral" color={colors.amber} />
              <Balance value={summary.negativeCount} label="Cost" color={colors.wine} />
            </View>
          </GradientCard>

          <Button label="Create shareable report" onPress={() => router.push({ pathname: '/report', params: { start: start.toISOString() } })} icon={<Share2 size={19} color={colors.onAccent} />} />

          {summary.hasEnoughSignal ? <View style={styles.snapshot}>
            <SectionTitle eyebrow="At a glance" title="What shaped the week" />
            <View style={styles.snapshotGrid}>
              <Snapshot index={0} label="Most useful" value={summary.mostUsefulType ? MEETING_TYPE_LABELS[summary.mostUsefulType] : 'No clear leader'} tone="positive" />
              <Snapshot index={1} label="Most draining" value={summary.mostDrainingType ? MEETING_TYPE_LABELS[summary.mostDrainingType] : 'No clear drag'} tone="negative" />
              <Snapshot index={2} label="Top friction" value={summary.topNegativeReason ? REASON_MAP[summary.topNegativeReason].label : 'None repeated'} tone="negative" />
              <Snapshot index={3} label="Best pattern" value={summary.bestPattern} tone="positive" />
            </View>
          </View> : null}

          <View style={styles.insights}>
            <SectionTitle eyebrow="Coach’s notes" title="What the week is telling you" />
            {summary.insights.map((insight, index) => (
              <Rise key={insight.id} index={index} delay={240}>
              <Card style={styles.insightCard}>
                <View style={[styles.insightNumber, { backgroundColor: insight.tone === 'positive' ? colors.mossSoft : insight.tone === 'negative' ? colors.wineSoft : colors.amberSoft }]}>
                  <AppText variant="label">0{index + 1}</AppText>
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <AppText variant="label" style={{ color: colors.orange }}>{insight.eyebrow}</AppText>
                  <AppText variant="title">{insight.title}</AppText>
                  <AppText style={{ color: colors.inkSoft }}>{insight.body}</AppText>
                </View>
              </Card>
              </Rise>
            ))}
          </View>
        </Animated.View>
      ) : (
        isCurrentWeek ? (
        <EmptyState title="This week is quiet" body="Log a meeting to begin building your weekly signal. Three reflections are enough to surface the first pattern." action={<Button label="Log a meeting" variant="secondary" onPress={() => router.push('/log')} />} />
      ) : (
        <EmptyState title="No meetings logged" body={`Nothing was recorded for ${format(start, 'MMM d')} – ${format(end, 'MMM d')}. You can still add a past meeting by choosing its date when you log it.`} action={<Button label="Log a past meeting" variant="secondary" onPress={() => router.push('/log')} />} />
      )
      )}
    </Screen>
  );
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
  navButton: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.lineDark, backgroundColor: colors.surfaceGlass, alignItems: 'center', justifyContent: 'center', shadowColor: colors.shadow, shadowOpacity: 0.25, shadowRadius: 12 },
  heroCard: { gap: spacing.lg, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  countBlock: { alignItems: 'flex-end', paddingBottom: 4 },
  balanceRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, shadowOpacity: 0.6, shadowRadius: 7 },
  snapshot: { gap: spacing.md },
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  week: { gap: spacing.lg },
  snapshotCell: { flexBasis: '45%', flexGrow: 1 },
  snapshotCard: { flex: 1, minHeight: 124, padding: spacing.md, justifyContent: 'space-between', gap: spacing.md, borderRadius: radius.md, borderColor: colors.lineDark },
  insights: { gap: spacing.md },
  insightCard: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  insightNumber: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});
