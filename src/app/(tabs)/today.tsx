import { endOfDay, format, startOfDay } from 'date-fns';
import { ArrowUpRight, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { MeetingCard } from '@/components/meeting-card';
import { Rise, useRollingNumber } from '@/components/motion';
import { AppText, Button, EmptyState, formatSigned, Glow, GradientCard, Header, Screen, SectionTitle } from '@/components/ui';
import type { Meeting } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, fonts, gradients, spacing } from '@/theme/tokens';

export default function TodayScreen() {
  const { getRange, revision } = useAppData();
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    getRange(startOfDay(new Date()), endOfDay(new Date())).then(setMeetings);
  }, [getRange, revision]);

  const pulse = Math.round(meetings.reduce((sum, meeting) => sum + meeting.impactScore, 0) * 10) / 10;
  const totalMinutes = meetings.reduce((sum, meeting) => sum + meeting.durationMinutes, 0);
  const positive = meetings.filter((meeting) => meeting.impactScore > 0).length;
  const negative = meetings.filter((meeting) => meeting.impactScore < 0).length;
  const neutral = meetings.length - positive - negative;

  const pulseTone = pulse > 0 ? colors.moss : pulse < 0 ? colors.wine : colors.amber;
  const shownPulse = useRollingNumber(pulse);
  // Arrow swings to point up, level or down as the balance changes.
  const arrowTarget = pulse < 0 ? 90 : pulse === 0 ? 45 : 0;
  const arrowRotation = useSharedValue(arrowTarget);
  useEffect(() => {
    arrowRotation.value = withSpring(arrowTarget, { damping: 14, stiffness: 140 });
  }, [arrowRotation, arrowTarget]);
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${arrowRotation.value}deg` }] }));

  return (
    <Screen>
      <Header
        eyebrow={format(new Date(), 'EEEE · MMMM d')}
        title="Today’s pulse"
        subtitle={meetings.length ? 'A quick read on the cost and return of your meeting day.' : 'Notice the effect—not just the time.'}
        onSettings={() => router.push('/settings')}
      />

      <Rise>
      <GradientCard colors={gradients.hero} style={styles.pulseCard}>
        <View style={styles.pulseTop}>
          <View>
            <AppText variant="label" style={{ color: colors.orange }}>Energy balance</AppText>
            <AppText variant="hero" accessibilityLabel={`${pulse >= 0 ? 'positive' : 'negative'} ${Math.abs(pulse)} energy balance`}>
              {formatSigned(shownPulse)}
            </AppText>
          </View>
          <View style={styles.discWrap}>
            {/* Glow and rings are centred on the disc so they stay concentric with it. */}
            <Glow color={pulseTone} size={300} opacity={0.26} style={styles.discGlow} />
            <View pointerEvents="none" style={[styles.orbit, styles.orbitOuter]} />
            <View pointerEvents="none" style={[styles.orbit, styles.orbitInner]} />
            <View style={[styles.pulseDisc, { borderColor: pulseTone }]}>
            <Animated.View style={arrowStyle}>
              <ArrowUpRight size={25} color={colors.white} />
            </Animated.View>
            </View>
          </View>
        </View>
        <View style={styles.rule} />
        <View style={styles.metrics}>
          <Metric value={`${meetings.length}`} label="Meetings" />
          <Metric value={totalMinutes >= 60 ? `${(totalMinutes / 60).toFixed(totalMinutes % 60 ? 1 : 0)}h` : `${totalMinutes}m`} label="In calls" />
          <Metric value={`${positive}/${neutral}/${negative}`} label="Up · even · down" />
        </View>
      </GradientCard>
      </Rise>

      <Rise index={1}>
        <Button label="Log a meeting" onPress={() => router.push('/log')} icon={<Plus size={20} color={colors.onAccent} />} />
      </Rise>

      <View style={styles.list}>
        <SectionTitle eyebrow="Daily log" title={meetings.length ? `${meetings.length} reflection${meetings.length === 1 ? '' : 's'}` : 'Your meetings'} />
        {meetings.length ? (
          meetings.map((meeting, index) => (
            <Rise key={meeting.id} index={index + 2}>
              <MeetingCard meeting={meeting} onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: meeting.id } })} />
            </Rise>
          ))
        ) : (
          <EmptyState
            title="No signal yet"
            body="After your next meeting, take 20 seconds to capture how it changed your energy or clarity."
            action={<Button label="Log the first one" variant="secondary" onPress={() => router.push('/log')} />}
          />
        )}
      </View>
    </Screen>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="title" style={{ fontFamily: fonts.bodyBold }}>{value}</AppText>
      <AppText variant="small" style={{ color: colors.inkSoft }}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pulseCard: { gap: spacing.lg, overflow: 'hidden' },
  pulseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pulseDisc: { width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', shadowColor: colors.orange, shadowOpacity: 0.28, shadowRadius: 18 },
  rule: { height: 1, backgroundColor: colors.line },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  metric: { flex: 1, gap: 2 },
  list: { gap: spacing.md },
  discWrap: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  discGlow: { left: (58 - 300) / 2, top: (58 - 300) / 2 },
  orbit: { position: 'absolute', borderRadius: 999, borderWidth: 1 },
  orbitOuter: { width: 162, height: 162, left: (58 - 162) / 2, top: (58 - 162) / 2, borderColor: 'rgba(255,255,255,0.07)' },
  orbitInner: { width: 106, height: 106, left: (58 - 106) / 2, top: (58 - 106) / 2, borderColor: 'rgba(255,255,255,0.11)' },
});
