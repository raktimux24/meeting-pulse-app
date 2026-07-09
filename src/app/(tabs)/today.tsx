import { endOfDay, format, startOfDay } from 'date-fns';
import { ArrowUpRight, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MeetingCard } from '@/components/meeting-card';
import { AppText, Button, EmptyState, formatSigned, GradientCard, Header, Screen, SectionTitle } from '@/components/ui';
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

  return (
    <Screen>
      <Header
        eyebrow={format(new Date(), 'EEEE · MMMM d')}
        title="Today’s pulse"
        subtitle={meetings.length ? 'A quick read on the cost and return of your meeting day.' : 'Notice the effect—not just the time.'}
        onSettings={() => router.push('/settings')}
      />

      <GradientCard colors={gradients.hero} style={styles.pulseCard}>
        <View pointerEvents="none" style={styles.heroGlow} />
        <View pointerEvents="none" style={styles.orbitOne} />
        <View pointerEvents="none" style={styles.orbitTwo} />
        <View style={styles.pulseTop}>
          <View>
            <AppText variant="label" style={{ color: colors.orange }}>Energy balance</AppText>
            <AppText variant="hero" accessibilityLabel={`${pulse >= 0 ? 'positive' : 'negative'} ${Math.abs(pulse)} energy balance`}>
              {formatSigned(pulse)}
            </AppText>
          </View>
          <View style={[styles.pulseDisc, { borderColor: pulse > 0 ? colors.moss : pulse < 0 ? colors.wine : colors.amber }]}> 
            <ArrowUpRight size={25} color={colors.white} style={{ transform: [{ rotate: pulse < 0 ? '90deg' : pulse === 0 ? '45deg' : '0deg' }] }} />
          </View>
        </View>
        <View style={styles.rule} />
        <View style={styles.metrics}>
          <Metric value={`${meetings.length}`} label="Meetings" />
          <Metric value={totalMinutes >= 60 ? `${(totalMinutes / 60).toFixed(totalMinutes % 60 ? 1 : 0)}h` : `${totalMinutes}m`} label="In calls" />
          <Metric value={`${positive}/${neutral}/${negative}`} label="Up · even · down" />
        </View>
      </GradientCard>

      <Button label="Log a meeting" onPress={() => router.push('/log')} icon={<Plus size={20} color={colors.white} />} />

      <View style={styles.list}>
        <SectionTitle eyebrow="Daily log" title={meetings.length ? `${meetings.length} reflection${meetings.length === 1 ? '' : 's'}` : 'Your meetings'} />
        {meetings.length ? (
          meetings.map((meeting) => (
            <MeetingCard key={meeting.id} meeting={meeting} onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: meeting.id } })} />
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
  pulseCard: { minHeight: 236, gap: spacing.lg, overflow: 'hidden', justifyContent: 'space-between' },
  pulseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pulseDisc: { width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', shadowColor: colors.orange, shadowOpacity: 0.28, shadowRadius: 18 },
  rule: { height: 1, backgroundColor: colors.line },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  metric: { flex: 1, gap: 2 },
  list: { gap: spacing.md },
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: colors.orange, opacity: 0.11, right: -58, top: -70, shadowColor: colors.orange, shadowOpacity: 0.9, shadowRadius: 70 },
  orbitOne: { position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', right: -38, top: -42 },
  orbitTwo: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', right: -9, top: -11 },
});
