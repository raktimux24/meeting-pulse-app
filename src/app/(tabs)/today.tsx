import { endOfDay, format, startOfDay } from 'date-fns';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MeetingCard } from '@/components/meeting-card';
import { UndoBar } from '@/components/undo-bar';
import { AppText, Button, EmptyState, formatSigned, GradientCard, Header, Screen, SectionTitle } from '@/components/ui';
import type { Meeting } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, fonts, gradients, spacing } from '@/theme/tokens';

export default function TodayScreen() {
  const { getRange, revision, intention, markIntentionTried } = useAppData();
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    getRange(startOfDay(new Date()), endOfDay(new Date())).then(setMeetings);
  }, [getRange, revision]);

  const pulse = Math.round(meetings.reduce((sum, meeting) => sum + meeting.impactScore, 0) * 10) / 10;
  const totalMinutes = meetings.reduce((sum, meeting) => sum + meeting.durationMinutes, 0);
  const positive = meetings.filter((meeting) => meeting.impactScore > 0).length;
  const negative = meetings.filter((meeting) => meeting.impactScore < 0).length;
  const neutral = meetings.length - positive - negative;
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

      {intention && !intention.tried ? (
        <GradientCard colors={gradients.glass} style={styles.intentionCard}>
          <AppText variant="label" style={{ color: colors.orange }}>This week’s intention</AppText>
          <AppText variant="title">{intention.text}</AppText>
          <Button label="I tried this" variant="secondary" onPress={() => { void markIntentionTried(); }} />
        </GradientCard>
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
            <View pointerEvents="none" style={styles.orbitOne} />
            <View pointerEvents="none" style={styles.orbitTwo} />
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

      <Button style={styles.logButton} label="Log a meeting" onPress={() => router.push({ pathname: '/log', params: { from: 'today' } })} icon={<Plus size={20} color={colors.white} />} />

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
  pulseCard: { gap: 18, overflow: 'hidden', paddingVertical: 20 },
  pulseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pulseCopy: { flex: 1, gap: 6, paddingRight: spacing.md, justifyContent: 'center' },
  pulseStage: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', marginRight: -4 },
  pulseDisc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
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
  logButton: { marginTop: 8 },
  list: { gap: spacing.md },
  intentionCard: { gap: spacing.md },
  heroGlow: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: colors.orange, opacity: 0.12, right: -28, top: -70, shadowColor: colors.orange, shadowOpacity: 0.9, shadowRadius: 70 },
  orbitOne: { position: 'absolute', width: 88, height: 88, borderRadius: 44, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)' },
  orbitTwo: { position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
});
