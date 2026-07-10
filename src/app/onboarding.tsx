import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { useAppData } from '@/providers/app-data-provider';
import { colors, fonts, gradients, radius, spacing } from '@/theme/tokens';

export default function OnboardingScreen() {
  const { completeOnboarding } = useAppData();
  const { fontScale, height } = useWindowDimensions();
  const compact = height < 800;
  const allowScrolling = height < 720 || fontScale > 1.15;

  const continueToApp = async () => {
    await completeOnboarding();
    router.replace('/(tabs)/today');
    setTimeout(() => router.push('/log'), 0);
  };

  return (
    <Screen scroll={allowScrolling} contentStyle={[styles.content, compact && styles.contentCompact]}>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}><View style={styles.brandDot} /></View>
        <AppText variant="label">Meeting Pulse</AppText>
      </View>

      <View style={[styles.heroVisual, compact && styles.heroVisualCompact]}>
        <View style={styles.visualGlow} />
        <View style={[styles.orbit, styles.orbitOuter]} />
        <View style={[styles.orbit, styles.orbitInner]} />
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scoreBubble}>
          <AppText variant="label" style={{ color: 'rgba(255,255,255,0.78)' }}>Live signal</AppText>
          <AppText variant="hero" style={{ color: colors.white, fontSize: 58, lineHeight: 62 }}>−6</AppText>
        </LinearGradient>
        <View style={styles.signalTag}><Sparkles size={15} color={colors.orange} /><AppText variant="small">No decision</AppText></View>
        <View style={styles.returnTag}><View style={styles.returnDot} /><AppText variant="small">Clarity −2</AppText></View>
      </View>

      <View style={styles.copy}>
        <AppText variant="hero" style={compact && styles.headingCompact}>Know what your meetings really cost.</AppText>
        <AppText style={[styles.subtitle, compact && styles.subtitleCompact]}>Your calendar tracks time. Meeting Pulse tracks the energy, clarity, and momentum behind it.</AppText>
      </View>

      <View style={[styles.privacyRow, compact && styles.privacyRowCompact]}>
        <LockKeyhole size={17} color={colors.moss} />
        <AppText variant="small" style={{ flex: 1, color: colors.inkSoft }}>Private by design. Your reflections stay on this device.</AppText>
      </View>

      <Button label="Track my first meeting" onPress={continueToApp} icon={<ArrowRight size={19} color={colors.white} />} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, justifyContent: 'space-between', paddingBottom: spacing.lg, gap: spacing.sm },
  contentCompact: { paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.xs },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.orange, backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center', shadowColor: colors.orange, shadowOpacity: 0.45, shadowRadius: 12 },
  brandDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange },
  heroVisual: { height: 260, alignItems: 'center', justifyContent: 'center', transform: [{ scale: 0.92 }] },
  heroVisualCompact: { height: 220, transform: [{ scale: 0.82 }] },
  visualGlow: { position: 'absolute', width: 230, height: 230, borderRadius: 115, backgroundColor: colors.orange, opacity: 0.13, shadowColor: colors.orange, shadowOpacity: 0.9, shadowRadius: 100 },
  orbit: { position: 'absolute', borderWidth: 1, borderColor: colors.lineDark, borderRadius: 999 },
  orbitOuter: { width: 278, height: 278 },
  orbitInner: { width: 198, height: 198 },
  scoreBubble: { width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center', shadowColor: colors.orange, shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.42, shadowRadius: 30, elevation: 12 },
  signalTag: { position: 'absolute', right: -2, top: 38, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.lineDark, borderRadius: radius.round, paddingHorizontal: 13, paddingVertical: 10, shadowColor: colors.shadow, shadowOpacity: 0.3, shadowRadius: 14 },
  returnTag: { position: 'absolute', left: 0, bottom: 35, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.lineDark, borderRadius: radius.round, paddingHorizontal: 13, paddingVertical: 10 },
  returnDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.wine, shadowColor: colors.wine, shadowOpacity: 0.8, shadowRadius: 8 },
  copy: { gap: spacing.sm },
  headingCompact: { fontSize: 37, lineHeight: 39 },
  subtitle: { color: colors.inkSoft, fontSize: 17, lineHeight: 26, fontFamily: fonts.body },
  subtitleCompact: { fontSize: 16, lineHeight: 23 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(114,230,192,0.07)', borderWidth: 1, borderColor: 'rgba(114,230,192,0.16)' },
  privacyRowCompact: { padding: 12 },
});
