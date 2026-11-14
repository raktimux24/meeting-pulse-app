import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn } from 'react-native-reanimated';

import { Rise } from '@/components/motion';
import { AppText, Button, Card, Glow, Screen } from '@/components/ui';
import { useAppData } from '@/providers/app-data-provider';
import { colors, fonts, gradients, radius, spacing } from '@/theme/tokens';

export default function OnboardingScreen() {
  const { completeOnboarding, onboardingComplete } = useAppData();
  const { fontScale, height } = useWindowDimensions();
  const compact = height < 800;
  const allowScrolling = height < 720 || fontScale > 1.15;
  const [page, setPage] = useState<1 | 2>(1);
  const replaying = onboardingComplete;

  // A slow breath on the score and its rings; Reanimated skips it under Reduce Motion.
  const breath = useSharedValue(0);
  useEffect(() => {
    breath.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breath]);
  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.035 }] }));
  const haloStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.05 }], opacity: 1 - breath.value * 0.45 }));
  const innerStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + (1 - breath.value) * 0.04 }] }));
  const tagUpStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -4 * breath.value }] }));
  const tagDownStyle = useAnimatedStyle(() => ({ transform: [{ translateY: 4 * breath.value }] }));

  const finish = async (openLog: boolean) => {
    if (!replaying) await completeOnboarding();
    router.replace('/(tabs)/today');
    if (openLog) setTimeout(() => router.push({ pathname: '/log', params: { from: 'today' } }), 0);
  };

  return (
    <Screen scroll={allowScrolling} contentStyle={[styles.content, compact && styles.contentCompact]}>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}><View style={styles.brandDot} /></View>
        <AppText variant="label">Meeting Pulse</AppText>
      </View>

      {page === 1 ? (
        <>
          <View style={[styles.heroVisual, compact && styles.heroVisualCompact]}>
            <Glow color={colors.orange} size={420} opacity={0.3} />
            <Animated.View style={[styles.orbit, styles.orbitHalo, haloStyle]} />
            <View style={[styles.orbit, styles.orbitOuter]} />
            <View style={[styles.orbit, styles.orbitMid]} />
            <Animated.View style={[styles.orbit, styles.orbitInner, innerStyle]} />
            <Animated.View entering={ZoomIn.duration(520).easing(Easing.out(Easing.back(1.5)))} style={bubbleStyle}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scoreBubble}>
              <AppText variant="label" style={styles.liveLabel}>Live signal</AppText>
              <View style={styles.scoreValue} accessibilityLabel="negative 6 live signal">
                <AppText style={styles.scoreSign}>−</AppText>
                <AppText style={styles.scoreNumber}>6</AppText>
              </View>
            </LinearGradient>
            </Animated.View>
            <View pointerEvents="none" style={styles.tagRing}>
              <Animated.View entering={FadeIn.delay(700).duration(400)} style={[styles.signalTag, tagUpStyle]}>
                <View style={styles.tagIcon}><Sparkles size={13} color={colors.orange} /></View>
                <AppText variant="small">No decision</AppText>
              </Animated.View>
              <Animated.View entering={FadeIn.delay(950).duration(400)} style={[styles.returnTag, tagDownStyle]}>
                <View style={styles.tagIcon}><View style={styles.returnDot} /></View>
                <AppText variant="small">Clarity −2</AppText>
              </Animated.View>
            </View>
          </View>

          <Rise delay={250} style={styles.copy}>
            <AppText variant="hero" style={compact && styles.headingCompact}>Know what your meetings really cost.</AppText>
            <AppText style={[styles.subtitle, compact && styles.subtitleCompact]}>Your calendar tracks time. Meeting Pulse tracks the energy, clarity, and momentum behind it.</AppText>
          </Rise>
        </>
      ) : (
        <Rise style={styles.copy}>
          <AppText variant="hero" style={compact && styles.headingCompact}>A score, not a verdict.</AppText>
          <AppText style={[styles.subtitle, compact && styles.subtitleCompact]}>Mood × duration, plus the reasons you tap and whether the meeting got its outcome. Weekly notes are simple rules on this device—not a model, and not a performance review.</AppText>
          <Card style={styles.example}>
            <AppText variant="label" style={{ color: colors.orange }}>Example</AppText>
            <AppText variant="title">Clear (+2) × 30 min (1.2×) + Clear outcome (+2) = +4.4</AppText>
            <AppText style={{ color: colors.inkSoft }}>Three reflections are enough to surface the first weekly pattern.</AppText>
          </Card>
        </Rise>
      )}

      <View style={[styles.privacyRow, compact && styles.privacyRowCompact]}>
        <LockKeyhole size={17} color={colors.moss} />
        <AppText variant="small" style={{ flex: 1, color: colors.inkSoft }}>Private by design. Your reflections stay on this device.</AppText>
      </View>

      <View style={styles.pager} accessibilityRole="tablist">
        <View style={[styles.dot, page === 1 && styles.dotActive]} />
        <View style={[styles.dot, page === 2 && styles.dotActive]} />
      </View>

      {page === 1 ? (
        <Button label="How the score works" onPress={() => setPage(2)} iconPosition="trailing" icon={<ArrowRight size={19} color={colors.onAccent} />} />
      ) : (
        <View style={styles.actions}>
          <Button label={replaying ? 'Back to the app' : 'Track my first meeting'} onPress={() => finish(!replaying)} iconPosition="trailing" icon={<ArrowRight size={19} color={colors.onAccent} />} />
          {!replaying ? <Button label="Explore first" variant="ghost" onPress={() => finish(false)} /> : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, justifyContent: 'space-between', paddingBottom: spacing.lg, gap: spacing.sm },
  contentCompact: { paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.xs },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.orange, backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center', shadowColor: colors.orange, shadowOpacity: 0.45, shadowRadius: 12 },
  brandDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange },
  heroVisual: { height: 276, width: '100%', alignItems: 'center', justifyContent: 'center' },
  heroVisualCompact: { height: 236 },
  orbit: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 999 },
  orbitHalo: { width: 248, height: 248 },
  orbitOuter: { width: 214, height: 214 },
  orbitMid: { width: 180, height: 180 },
  orbitInner: { width: 148, height: 148 },
  scoreBubble: { width: 136, height: 136, borderRadius: 68, alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: colors.orange, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.4, shadowRadius: 28, elevation: 12 },
  liveLabel: { color: colors.onAccent, opacity: 0.72 },
  scoreValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, paddingLeft: 3 },
  scoreSign: { color: colors.onAccent, fontFamily: fonts.display, fontSize: 42, lineHeight: 52, marginRight: -4, marginTop: 3 },
  scoreNumber: { color: colors.onAccent, fontFamily: fonts.display, fontSize: 50, lineHeight: 52, letterSpacing: -1.2 },
  tagRing: { position: 'absolute', width: 214, height: 214 },
  signalTag: { position: 'absolute', right: -38, top: 16, minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: radius.round, paddingHorizontal: 12, paddingVertical: 8, shadowColor: colors.shadow, shadowOpacity: 0.28, shadowRadius: 12 },
  returnTag: { position: 'absolute', left: -34, bottom: 22, minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: radius.round, paddingHorizontal: 12, paddingVertical: 8 },
  tagIcon: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  returnDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.wine },
  copy: { gap: spacing.sm },
  headingCompact: { fontSize: 37, lineHeight: 39 },
  subtitle: { color: colors.inkSoft, fontSize: 17, lineHeight: 26, fontFamily: fonts.body },
  subtitleCompact: { fontSize: 16, lineHeight: 23 },
  example: { gap: spacing.sm, marginTop: spacing.sm },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(114,230,192,0.07)', borderWidth: 1, borderColor: 'rgba(114,230,192,0.16)' },
  privacyRowCompact: { padding: 12 },
  pager: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lineDark },
  dotActive: { backgroundColor: colors.orange, width: 18 },
  actions: { gap: 10 },
});
