import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components/ui';
import { useAppData } from '@/providers/app-data-provider';
import { colors, fonts, gradients, radius, spacing } from '@/theme/tokens';

export default function OnboardingScreen() {
  const { completeOnboarding, onboardingComplete } = useAppData();
  const { fontScale, height } = useWindowDimensions();
  const compact = height < 800;
  const allowScrolling = height < 720 || fontScale > 1.15;
  const [page, setPage] = useState<1 | 2>(1);
  const replaying = onboardingComplete;

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
            <View style={styles.visualGlow} />
            <View style={[styles.orbit, styles.orbitHalo]} />
            <View style={[styles.orbit, styles.orbitOuter]} />
            <View style={[styles.orbit, styles.orbitMid]} />
            <View style={[styles.orbit, styles.orbitInner]} />
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scoreBubble}>
              <AppText variant="label" style={styles.liveLabel}>Live signal</AppText>
              <View style={styles.scoreValue} accessibilityLabel="negative 6 live signal">
                <AppText style={styles.scoreSign}>−</AppText>
                <AppText style={styles.scoreNumber}>6</AppText>
              </View>
            </LinearGradient>
            <View style={styles.signalTag}>
              <View style={styles.tagIcon}><Sparkles size={13} color={colors.orange} /></View>
              <AppText variant="small">No decision</AppText>
            </View>
            <View style={styles.returnTag}>
              <View style={styles.tagIcon}><View style={styles.returnDot} /></View>
              <AppText variant="small">Clarity −2</AppText>
            </View>
          </View>

          <View style={styles.copy}>
            <AppText variant="hero" style={compact && styles.headingCompact}>Know what your meetings really cost.</AppText>
            <AppText style={[styles.subtitle, compact && styles.subtitleCompact]}>Your calendar tracks time. Meeting Pulse tracks the energy, clarity, and momentum behind it.</AppText>
          </View>
        </>
      ) : (
        <View style={styles.copy}>
          <AppText variant="hero" style={compact && styles.headingCompact}>A score, not a verdict.</AppText>
          <AppText style={[styles.subtitle, compact && styles.subtitleCompact]}>Mood × duration + the reasons you tap. Weekly notes are simple rules on this device—not a model, and not a performance review.</AppText>
          <Card style={styles.example}>
            <AppText variant="label" style={{ color: colors.orange }}>Example</AppText>
            <AppText variant="title">Clear (+2) × 30 min (1.2×) + Clear outcome (+2) = +4.4</AppText>
            <AppText style={{ color: colors.inkSoft }}>Three reflections are enough to surface the first weekly pattern.</AppText>
          </Card>
        </View>
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
        <Button label="How the score works" onPress={() => setPage(2)} icon={<ArrowRight size={19} color={colors.white} />} />
      ) : (
        <View style={styles.actions}>
          <Button label={replaying ? 'Back to the app' : 'Track my first meeting'} onPress={() => finish(!replaying)} icon={<ArrowRight size={19} color={colors.white} />} />
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
  visualGlow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: colors.orange, opacity: 0.14, shadowColor: colors.orange, shadowOpacity: 0.9, shadowRadius: 90 },
  orbit: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 999 },
  orbitHalo: { width: 248, height: 248 },
  orbitOuter: { width: 214, height: 214 },
  orbitMid: { width: 180, height: 180 },
  orbitInner: { width: 148, height: 148 },
  scoreBubble: { width: 136, height: 136, borderRadius: 68, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 2, shadowColor: colors.orange, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.4, shadowRadius: 28, elevation: 12 },
  liveLabel: { color: 'rgba(255,255,255,0.78)' },
  scoreValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, paddingRight: 4 },
  scoreSign: { color: colors.white, fontFamily: fonts.display, fontSize: 40, lineHeight: 54, width: 20, textAlign: 'center', marginTop: -1 },
  scoreNumber: { color: colors.white, fontFamily: fonts.display, fontSize: 52, lineHeight: 54, letterSpacing: -1.4 },
  signalTag: { position: 'absolute', right: 18, top: 40, minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: radius.round, paddingHorizontal: 12, paddingVertical: 8, overflow: 'hidden', shadowColor: colors.shadow, shadowOpacity: 0.28, shadowRadius: 12 },
  returnTag: { position: 'absolute', left: 18, bottom: 44, minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: radius.round, paddingHorizontal: 12, paddingVertical: 8, overflow: 'hidden' },
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
