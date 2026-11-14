import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Check, Plus, RotateCcw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Rise, useRollingNumber } from '@/components/motion';
import { AppText, Button, Card, formatSigned, Glow, LoadingState, NotFoundState, Screen } from '@/components/ui';
import { MOOD_CONFIG } from '@/domain/constants';
import { originPath } from '@/domain/format';
import { answeredOutcomeCount, INTENDED_OUTCOME_LABELS, OUTCOME_STATUS_LABELS } from '@/domain/outcomes';
import { getImpactLabel, getMeetingSuggestion, getScoreBreakdown } from '@/domain/scoring';
import type { Meeting } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, gradients, radius, spacing } from '@/theme/tokens';

const ORB_SIZE = 258;
const RING_STROKE = 2;
const RING_RADIUS = (ORB_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
  return <ResultContent meeting={meeting} edited={edited === 'true'} from={from} />;
}

function ResultContent({ meeting, edited, from }: { meeting: Meeting; edited: boolean; from?: string }) {
  const positive = meeting.impactScore > 0;
  const neutral = meeting.impactScore === 0;
  const tone = positive ? colors.moss : neutral ? colors.amber : colors.wine;
  const { moodBase, multiplier, reasons: modifier, outcomes: outcomePoints } = getScoreBreakdown(meeting.mood, meeting.durationMinutes, meeting.reasonIds, meeting);
  const hasOutcomeAnswers = answeredOutcomeCount(meeting) > 0 || Boolean(meeting.intendedOutcome && meeting.intendedOutcomeMet);
  const home = originPath(from);

  // The payoff moment: the ring draws, then the score counts up inside it.
  const shownScore = useRollingNumber(meeting.impactScore, { delay: 350, duration: 900 });
  const ringOffset = useSharedValue(RING_LENGTH);
  useEffect(() => {
    ringOffset.value = withDelay(250, withTiming(0, { duration: 1000, easing: Easing.out(Easing.cubic) }));
  }, [ringOffset]);
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: ringOffset.value }));

  return (
    <Screen contentStyle={styles.content}>
      <Animated.View entering={ZoomIn.duration(380)}>
        <LinearGradient colors={gradients.primary} style={styles.doneMark}><Check color={colors.onAccent} size={24} strokeWidth={2.6} /></LinearGradient>
      </Animated.View>
      <Rise delay={80} style={styles.heading}>
        <AppText variant="label" style={{ color: colors.orange }}>{edited ? 'Reflection updated' : 'Reflection captured'}</AppText>
        <AppText variant="display" style={{ textAlign: 'center' }}>{meeting.title}</AppText>
      </Rise>

      <Animated.View entering={ZoomIn.delay(160).duration(520).easing(Easing.out(Easing.back(1.4)))} style={styles.orbWrap}>
        <LinearGradient colors={meeting.impactScore >= 0 ? gradients.positive : gradients.negative} style={styles.scoreOrb}>
          <Glow color={tone} size={300} opacity={0.22} />
          <AppText variant="label" style={{ color: tone }}>Meeting impact</AppText>
          <AppText variant="hero" style={{ color: tone, fontSize: 66, lineHeight: 76 }} accessibilityLabel={`${positive ? 'positive' : neutral ? 'neutral' : 'negative'} ${Math.abs(meeting.impactScore)} meeting impact`}>{formatSigned(shownScore)}</AppText>
          <AppText variant="title">{getImpactLabel(meeting.impactScore)}</AppText>
        </LinearGradient>
        <Svg pointerEvents="none" width={ORB_SIZE} height={ORB_SIZE} style={styles.ring}>
          <Circle cx={ORB_SIZE / 2} cy={ORB_SIZE / 2} r={RING_RADIUS} stroke={tone} strokeOpacity={0.18} strokeWidth={RING_STROKE} fill="none" />
          <AnimatedCircle
            cx={ORB_SIZE / 2}
            cy={ORB_SIZE / 2}
            r={RING_RADIUS}
            stroke={tone}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={RING_LENGTH}
            animatedProps={ringProps}
          />
        </Svg>
      </Animated.View>

      <Rise delay={700} style={styles.full}>
        <Card style={styles.explainer}>
          <AppText variant="label" style={{ color: colors.inkSoft }}>How this was calculated</AppText>
          <View style={styles.mathRow}>
            <MathPart value={formatSigned(moodBase)} label={MOOD_CONFIG[meeting.mood].label} />
            <AppText variant="title" style={styles.operator}>×</AppText>
            <MathPart value={`${multiplier}`} label={`${meeting.durationMinutes} min`} />
            <AppText variant="title" style={styles.operator}>+</AppText>
            <MathPart value={formatSigned(modifier)} label="Reasons" />
            {hasOutcomeAnswers ? (
              <>
                <AppText variant="title" style={styles.operator}>+</AppText>
                <MathPart value={formatSigned(outcomePoints)} label="Outcomes" />
              </>
            ) : null}
            <AppText variant="title" style={styles.operator}>=</AppText>
            <MathPart value={formatSigned(meeting.impactScore)} label="Impact" />
          </View>
        </Card>
      </Rise>

      {answeredOutcomeCount(meeting) ? (
        <Rise delay={760} style={styles.full}>
          <Card style={styles.outcomeCard}>
            <AppText variant="label" style={{ color: colors.inkSoft }}>Outcome check</AppText>
            {meeting.decisionStatus ? <OutcomeLine label="Decision made" value={OUTCOME_STATUS_LABELS[meeting.decisionStatus]} /> : null}
            {meeting.ownershipStatus ? <OutcomeLine label="Ownership clear" value={OUTCOME_STATUS_LABELS[meeting.ownershipStatus]} /> : null}
            {meeting.nextStepStatus ? <OutcomeLine label="Next step clear" value={OUTCOME_STATUS_LABELS[meeting.nextStepStatus]} /> : null}
          </Card>
        </Rise>
      ) : null}

      {meeting.intendedOutcome ? (
        <Rise delay={790} style={styles.full}>
          <Card style={styles.outcomeCard}>
            <AppText variant="label" style={{ color: colors.inkSoft }}>Intended outcome · private</AppText>
            <AppText variant="lead">{meeting.intendedOutcome}</AppText>
            {meeting.intendedOutcomeMet ? <OutcomeLine label="Produced" value={INTENDED_OUTCOME_LABELS[meeting.intendedOutcomeMet]} /> : null}
          </Card>
        </Rise>
      ) : null}

      <Rise delay={820} style={styles.full}>
        <Card style={styles.coachCard}>
          <AppText variant="label" style={{ color: tone }}>One thing to try</AppText>
          <AppText variant="lead">{getMeetingSuggestion(meeting)}</AppText>
        </Card>
      </Rise>

      <Rise delay={940} style={styles.actions}>
        <Button label="Done" onPress={() => router.replace(home)} iconPosition="trailing" icon={<ArrowRight size={19} color={colors.onAccent} />} />
        <Button label="View reflection" variant="secondary" onPress={() => router.replace({ pathname: '/meeting/[id]', params: { id: meeting.id, from: from ?? 'today' } })} />
        <Button label="Edit again" variant="ghost" onPress={() => router.replace({ pathname: '/log', params: { id: meeting.id, from: from ?? 'today' } })} icon={<RotateCcw size={18} color={colors.ink} />} />
        <Button label="Log another" variant="ghost" onPress={() => router.replace({ pathname: '/log', params: { from: from ?? 'today' } })} icon={<Plus size={19} color={colors.ink} />} />
      </Rise>
    </Screen>
  );
}

function MathPart({ value, label }: { value: string; label: string }) {
  return <View style={styles.mathPart}><AppText variant="title">{value}</AppText><AppText variant="small" style={{ color: colors.inkSoft }}>{label}</AppText></View>;
}

function OutcomeLine({ label, value }: { label: string; value: string }) {
  return <View style={styles.outcomeLine}><AppText style={{ color: colors.inkSoft }}>{label}</AppText><AppText variant="title">{value}</AppText></View>;
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingTop: spacing.xl },
  full: { width: '100%' },
  doneMark: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', shadowColor: colors.orange, shadowOpacity: 0.45, shadowRadius: 18 },
  heading: { alignItems: 'center', gap: 3 },
  orbWrap: { width: ORB_SIZE, height: ORB_SIZE, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.35, shadowRadius: 30, elevation: 10 },
  scoreOrb: { width: ORB_SIZE, height: ORB_SIZE, borderRadius: ORB_SIZE / 2, alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden' },
  // Rotated so the ring starts drawing from the top.
  ring: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  explainer: { gap: spacing.md },
  outcomeCard: { gap: spacing.sm },
  outcomeLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  mathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mathPart: { alignItems: 'center' },
  operator: { color: colors.inkSoft },
  coachCard: { gap: spacing.sm, borderRadius: radius.md },
  actions: { width: '100%', gap: 10 },
});
