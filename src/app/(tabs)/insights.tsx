import { addWeeks, endOfWeek, format, isSameWeek, startOfWeek, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { WeekChart } from '@/components/week-chart';
import { AppText, Button, Card, EmptyState, formatSigned, GradientCard, Header, Screen, SectionTitle } from '@/components/ui';
import { MEETING_TYPE_LABELS, REASON_MAP } from '@/domain/constants';
import { summarizeWeek } from '@/domain/insights';
import type { Meeting } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, gradients, radius, spacing } from '@/theme/tokens';

export default function InsightsScreen() {
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const { getRange, revision, weekStartsOn } = useAppData();
  const start = useMemo(() => startOfWeek(weekAnchor, { weekStartsOn }), [weekAnchor, weekStartsOn]);
  const end = useMemo(() => endOfWeek(weekAnchor, { weekStartsOn }), [weekAnchor, weekStartsOn]);

  useEffect(() => {
    getRange(start, end).then(setMeetings);
  }, [end, getRange, revision, start]);

  const summary = useMemo(() => summarizeWeek(meetings, start, end), [end, meetings, start]);
  const isCurrentWeek = isSameWeek(weekAnchor, new Date(), { weekStartsOn });
  const pulseTone = summary.weeklyPulse > 0 ? colors.moss : summary.weeklyPulse < 0 ? colors.wine : colors.amber;

  return (
    <Screen>
      <Header eyebrow="Pattern finder" title="Weekly signal" subtitle="Turn soft reactions into practical changes." onSettings={() => router.push('/settings')} />

      <View style={styles.weekNav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous week" onPress={() => setWeekAnchor((date) => subWeeks(date, 1))} style={styles.navButton}>
          <ChevronLeft size={20} color={colors.ink} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <AppText variant="small" style={{ color: colors.inkSoft }}>{isCurrentWeek ? 'This week' : format(start, 'MMM d')}</AppText>
          <AppText style={{ fontFamily: 'DMSans_700Bold' }}>{format(start, 'MMM d')} – {format(end, 'MMM d')}</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Next week" disabled={isCurrentWeek} onPress={() => setWeekAnchor((date) => addWeeks(date, 1))} style={[styles.navButton, isCurrentWeek && { opacity: 0.25 }]}>
          <ChevronRight size={20} color={colors.ink} />
        </Pressable>
      </View>

      {summary.meetingCount ? (
        <>
          <GradientCard colors={gradients.hero} style={styles.heroCard}>
            <View pointerEvents="none" style={[styles.heroGlow, { backgroundColor: pulseTone, shadowColor: pulseTone }]} />
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <AppText variant="label" style={{ color: pulseTone }}>Meeting pulse</AppText>
                <AppText variant="hero" style={{ color: pulseTone }}>{formatSigned(summary.weeklyPulse)}</AppText>
                <AppText variant="title">{summary.classification}</AppText>
              </View>
              <View style={styles.countBlock}>
                <AppText variant="display">{summary.meetingCount}</AppText>
                <AppText variant="small" style={{ color: colors.inkSoft }}>meetings</AppText>
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

          <Button label="Create shareable report" onPress={() => router.push({ pathname: '/report', params: { start: start.toISOString() } })} icon={<Share2 size={19} color={colors.white} />} />

          <View style={styles.snapshot}>
            <SectionTitle eyebrow="At a glance" title="What shaped the week" />
            <View style={styles.snapshotGrid}>
              <Snapshot label="Most useful" value={summary.mostUsefulType ? MEETING_TYPE_LABELS[summary.mostUsefulType] : 'No clear leader'} tone="positive" />
              <Snapshot label="Most draining" value={summary.mostDrainingType ? MEETING_TYPE_LABELS[summary.mostDrainingType] : 'No clear drag'} tone="negative" />
              <Snapshot label="Top friction" value={summary.topNegativeReason ? REASON_MAP[summary.topNegativeReason].label : 'None repeated'} tone="negative" />
              <Snapshot label="Best pattern" value={summary.bestPattern} tone="positive" />
            </View>
          </View>

          <View style={styles.insights}>
            <SectionTitle eyebrow="Coach’s notes" title="What to change next" />
            {summary.insights.map((insight, index) => (
              <Card key={insight.id} style={styles.insightCard}>
                <View style={[styles.insightNumber, { backgroundColor: insight.tone === 'positive' ? colors.mossSoft : insight.tone === 'negative' ? colors.wineSoft : colors.amberSoft }]}>
                  <AppText variant="label">0{index + 1}</AppText>
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <AppText variant="label" style={{ color: colors.orange }}>{insight.eyebrow}</AppText>
                  <AppText variant="title">{insight.title}</AppText>
                  <AppText style={{ color: colors.inkSoft }}>{insight.body}</AppText>
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : (
        <EmptyState title="This week is quiet" body="Log a meeting to begin building your weekly signal. Three reflections are enough to surface the first pattern." action={<Button label="Log a meeting" variant="secondary" onPress={() => router.push('/log')} />} />
      )}
    </Screen>
  );
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
  navButton: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.lineDark, backgroundColor: colors.surfaceGlass, alignItems: 'center', justifyContent: 'center', shadowColor: colors.shadow, shadowOpacity: 0.25, shadowRadius: 12 },
  heroCard: { minHeight: 340, gap: spacing.lg, overflow: 'hidden' },
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
  heroGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, opacity: 0.10, right: -95, top: -92, shadowOpacity: 0.9, shadowRadius: 90 },
});
