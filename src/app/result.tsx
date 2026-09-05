import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Check, Plus, RotateCcw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, LoadingState, NotFoundState, formatSigned, Screen } from '@/components/ui';
import { MOOD_CONFIG, REASON_MAP } from '@/domain/constants';
import { originPath } from '@/domain/format';
import { getDurationMultiplier, getImpactLabel, getMeetingSuggestion } from '@/domain/scoring';
import type { Meeting } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, gradients, radius, spacing } from '@/theme/tokens';

export default function ResultScreen() {
  const { id, edited, from } = useLocalSearchParams<{ id: string; edited?: string; from?: string }>();
  const { getById } = useAppData();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [missing, setMissing] = useState(!id);

  useEffect(() => {
    if (!id) return;
    getById(id).then((found) => {
      if (!found) setMissing(true);
      else setMeeting(found);
    });
  }, [getById, id]);

  if (missing) {
    return (
      <Screen>
        <NotFoundState
          title="This result is gone"
          body="The reflection could not be found on this device."
          action={<Button label="Back to Today" onPress={() => router.replace('/(tabs)/today')} />}
        />
      </Screen>
    );
  }

  if (!meeting) return <Screen><LoadingState label="Building your result…" /></Screen>;

  const positive = meeting.impactScore > 0;
  const neutral = meeting.impactScore === 0;
  const tone = positive ? colors.moss : neutral ? colors.amber : colors.wine;
  const moodBase = MOOD_CONFIG[meeting.mood].score;
  const multiplier = getDurationMultiplier(meeting.durationMinutes);
  const modifier = meeting.reasonIds.reduce((sum, reasonId) => sum + REASON_MAP[reasonId].modifier, 0);
  const home = originPath(from);

  return (
    <Screen contentStyle={styles.content}>
      <LinearGradient colors={gradients.primary} style={styles.doneMark}><Check color={colors.white} size={24} /></LinearGradient>
      <View style={styles.heading}>
        <AppText variant="label" style={{ color: colors.orange }}>{edited === 'true' ? 'Reflection updated' : 'Reflection captured'}</AppText>
        <AppText variant="display">{meeting.title}</AppText>
      </View>

      <LinearGradient colors={meeting.impactScore >= 0 ? gradients.positive : gradients.negative} style={[styles.scoreOrb, { borderColor: tone }]}>
        <View pointerEvents="none" style={[styles.orbGlow, { backgroundColor: tone, shadowColor: tone }]} />
        <AppText variant="label" style={{ color: tone }}>Meeting impact</AppText>
        <AppText variant="hero" style={{ color: tone, fontSize: 66, lineHeight: 70 }} accessibilityLabel={`${positive ? 'positive' : neutral ? 'neutral' : 'negative'} ${Math.abs(meeting.impactScore)} meeting impact`}>{formatSigned(meeting.impactScore)}</AppText>
        <AppText variant="title">{getImpactLabel(meeting.impactScore)}</AppText>
      </LinearGradient>

      <Card style={styles.explainer}>
        <AppText variant="label" style={{ color: colors.inkSoft }}>How this was calculated</AppText>
        <View style={styles.mathRow}>
          <MathPart value={`${moodBase > 0 ? '+' : ''}${moodBase}`} label={MOOD_CONFIG[meeting.mood].label} />
          <AppText variant="title">×</AppText>
          <MathPart value={`${multiplier}×`} label={`${meeting.durationMinutes} min`} />
          <AppText variant="title">+</AppText>
          <MathPart value={`${modifier > 0 ? '+' : ''}${modifier}`} label="Reasons" />
        </View>
      </Card>

      <Card style={[styles.coachCard, { borderColor: tone }]}>
        <AppText variant="label" style={{ color: tone }}>One thing to try</AppText>
        <AppText variant="title">{getMeetingSuggestion(meeting)}</AppText>
      </Card>

      <View style={styles.actions}>
        <Button label="Done" onPress={() => router.replace(home)} icon={<ArrowRight size={19} color={colors.white} />} />
        <Button label="View reflection" variant="secondary" onPress={() => router.replace({ pathname: '/meeting/[id]', params: { id: meeting.id, from: from ?? 'today' } })} />
        <Button label="Edit again" variant="ghost" onPress={() => router.replace({ pathname: '/log', params: { id: meeting.id, from: from ?? 'today' } })} icon={<RotateCcw size={18} color={colors.ink} />} />
        <Button label="Log another" variant="ghost" onPress={() => router.replace({ pathname: '/log', params: { from: from ?? 'today' } })} icon={<Plus size={19} color={colors.ink} />} />
      </View>
    </Screen>
  );
}

function MathPart({ value, label }: { value: string; label: string }) {
  return <View style={styles.mathPart}><AppText variant="title">{value}</AppText><AppText variant="small" style={{ color: colors.inkSoft }}>{label}</AppText></View>;
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingTop: spacing.xl },
  doneMark: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', shadowColor: colors.orange, shadowOpacity: 0.45, shadowRadius: 18 },
  heading: { alignItems: 'center', gap: 3 },
  scoreOrb: { width: 258, height: 258, borderRadius: 129, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 3, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.35, shadowRadius: 30, elevation: 10, overflow: 'hidden' },
  orbGlow: { position: 'absolute', width: 120, height: 120, borderRadius: 60, opacity: 0.10, shadowOpacity: 0.9, shadowRadius: 55 },
  explainer: { width: '100%', gap: spacing.md },
  mathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mathPart: { alignItems: 'center' },
  coachCard: { width: '100%', gap: spacing.sm, borderWidth: 1.5, borderRadius: radius.md },
  actions: { width: '100%', gap: 10 },
});
