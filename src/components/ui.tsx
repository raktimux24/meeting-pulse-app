import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Plus, Settings2 } from 'lucide-react-native';
import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '@/components/atmosphere';
import { Glow } from '@/components/glow';
import { PressableScale } from '@/components/motion';
import { formatSigned } from '@/domain/format';
import { colors, fonts, gradients, radius, spacing } from '@/theme/tokens';

export { formatSigned, Glow };

export function AppText({
  children,
  style,
  variant = 'body',
  numberOfLines,
  accessibilityLabel,
}: PropsWithChildren<{
  style?: StyleProp<TextStyle>;
  variant?: 'body' | 'small' | 'label' | 'lead' | 'title' | 'hero' | 'display';
  numberOfLines?: number;
  accessibilityLabel?: TextProps['accessibilityLabel'];
}>) {
  return (
    <Text style={[styles.text, textVariants[variant], style]} numberOfLines={numberOfLines} maxFontSizeMultiplier={1.35} accessibilityLabel={accessibilityLabel}>
      {children}
    </Text>
  );
}

const textVariants = StyleSheet.create({
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fonts.bodyBold, fontSize: 10, lineHeight: 13, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 23, letterSpacing: -0.3 },
  lead: { fontFamily: fonts.bodyMedium, fontSize: 17, lineHeight: 25 },
  // Line height leaves room above the numerals so big scores never touch their label.
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 52, letterSpacing: -1.6 },
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.8 },
});

export function Screen({
  children,
  scroll = true,
  contentStyle,
  topSafe = true,
}: PropsWithChildren<{ scroll?: boolean; contentStyle?: StyleProp<ViewStyle>; topSafe?: boolean }>) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(14));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 120, mass: 0.8, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  const content = (
    <Animated.View style={[styles.screenContent, contentStyle, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={topSafe ? ['top'] : []}>
      <StatusBar style="light" />
      <Atmosphere />
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
}

export function Header({ eyebrow, title, subtitle, onSettings, onLog, action }: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onSettings?: () => void;
  onLog?: () => void;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <View style={styles.eyebrowRow}><View style={styles.eyebrowDot} /><AppText variant="label" style={styles.eyebrow}>{eyebrow}</AppText></View>
        <AppText variant="display">{title}</AppText>
        {subtitle ? <AppText style={[styles.muted, styles.headerSubtitle]}>{subtitle}</AppText> : null}
      </View>
      {action ?? (
        <View style={styles.headerActions}>
          {onLog ? (
            <PressableScale accessibilityRole="button" accessibilityLabel="Log a meeting" hitSlop={8} onPress={onLog} scaleTo={0.92} style={styles.iconButton}>
              <Plus color={colors.ink} size={21} strokeWidth={1.8} />
            </PressableScale>
          ) : null}
          {onSettings ? (
            <PressableScale accessibilityRole="button" accessibilityLabel="Open settings" hitSlop={8} onPress={onSettings} scaleTo={0.92} style={styles.iconButton}>
              <Settings2 color={colors.ink} size={21} strokeWidth={1.8} />
            </PressableScale>
          ) : null}
        </View>
      )}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[styles.card, style]}>
      <View pointerEvents="none" style={styles.cardSheen} />
      {children}
    </View>
  );
}

export function GradientCard({ children, style, colors: gradientColors = gradients.glass }: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  colors?: readonly [string, string, ...string[]];
}>) {
  return (
    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.gradientCard, style]}>
      <View pointerEvents="none" style={styles.cardSheen} />
      {children}
    </LinearGradient>
  );
}

export function Button({ label, onPress, icon, iconPosition = 'leading', variant = 'primary', disabled, loading, style }: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  /** Put arrows that mean "go forward" after the label. */
  iconPosition?: 'leading' | 'trailing';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      haptic={variant === 'primary' ? 'light' : undefined}
      style={[styles.button, buttonVariants[variant], (disabled || loading) && styles.disabled, style]}
    >
      {variant === 'primary' ? <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.onAccent : colors.ink} /> : iconPosition === 'leading' ? icon : null}
      <AppText style={[styles.buttonText, variant === 'primary' && styles.buttonTextPrimary, variant === 'danger' && styles.buttonTextDanger]}>{label}</AppText>
      {!loading && iconPosition === 'trailing' ? icon : null}
    </PressableScale>
  );
}

const buttonVariants = StyleSheet.create({
  primary: { backgroundColor: colors.orange, borderColor: 'rgba(255,255,255,0.13)', shadowColor: colors.orange, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.26, shadowRadius: 20, elevation: 8, overflow: 'hidden' },
  secondary: { backgroundColor: colors.surfaceElevated, borderColor: colors.lineDark },
  danger: { backgroundColor: colors.wineSoft, borderColor: 'rgba(255,113,133,0.40)' },
  ghost: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.line },
});

export function Pill({ label, selected = false, onPress, tone = 'default' }: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'positive' | 'negative';
}) {
  const toneStyle = tone === 'positive' ? styles.pillPositive : tone === 'negative' ? styles.pillNegative : undefined;
  const textTone = tone === 'positive' ? colors.moss : tone === 'negative' ? colors.wine : colors.ink;
  return (
    <PressableScale accessibilityRole={onPress ? 'button' : undefined} accessibilityState={{ selected }} accessibilityLabel={`${label}${selected ? ', selected' : ''}`} onPress={onPress} disabled={!onPress} haptic="selection" scaleTo={0.94} style={[styles.pill, toneStyle, selected && styles.pillSelected]}>
      <AppText variant="small" style={{ color: selected ? colors.onAccent : textTone, fontFamily: selected ? fonts.bodyBold : fonts.bodyMedium }}>{label}</AppText>
    </PressableScale>
  );
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <AppText variant="label" style={styles.eyebrow}>{eyebrow}</AppText> : null}
        <AppText variant="title">{title}</AppText>
      </View>
      {action}
    </View>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <GradientCard style={styles.empty}>
      <View style={styles.emptyMark}><View style={styles.emptyMarkInner} /></View>
      <AppText variant="title" style={{ textAlign: 'center' }}>{title}</AppText>
      <AppText style={[styles.muted, { textAlign: 'center' }]}>{body}</AppText>
      {action}
    </GradientCard>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.statusBlock}>
      <ActivityIndicator color={colors.orange} />
      <AppText style={styles.muted}>{label}</AppText>
    </View>
  );
}

export function NotFoundState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <EmptyState title={title} body={body} action={action} />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
  scrollContent: { flexGrow: 1 },
  screenContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.lg },
  text: { color: colors.ink },
  muted: { color: colors.inkSoft },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  eyebrowDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.orange, shadowColor: colors.orange, shadowOpacity: 0.95, shadowRadius: 7 },
  eyebrow: { color: colors.orange },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  headerCopy: { flex: 1, gap: 10, paddingTop: 2 },
  headerSubtitle: { maxWidth: 300 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 },
  statusBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  iconButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,24,39,0.62)', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 5 },
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: colors.surfaceGlass, padding: spacing.lg, overflow: 'hidden', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.28, shadowRadius: 28, elevation: 6 },
  cardSheen: { position: 'absolute', top: 0, left: 18, right: 18, height: 1, backgroundColor: 'rgba(255,255,255,0.16)' },
  gradientCard: { overflow: 'hidden' },
  button: { minHeight: 52, borderRadius: radius.round, borderWidth: 1, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { fontFamily: fonts.bodyBold },
  // Dark text on coral: white on this coral is only 2.6:1 contrast.
  buttonTextPrimary: { color: colors.onAccent },
  buttonTextDanger: { color: colors.wine },
  disabled: { opacity: 0.4 },
  pill: { minHeight: 44, borderRadius: radius.round, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,24,39,0.72)' },
  pillPositive: { backgroundColor: colors.mossSoft, borderColor: 'rgba(114,230,192,0.30)' },
  pillNegative: { backgroundColor: colors.wineSoft, borderColor: 'rgba(255,113,133,0.30)' },
  pillSelected: { backgroundColor: colors.orange, borderColor: colors.orange },
  sectionTitle: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  emptyMark: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,121,88,0.55)', backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center', shadowColor: colors.orange, shadowOpacity: 0.4, shadowRadius: 22 },
  emptyMarkInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.orange, shadowColor: colors.orange, shadowOpacity: 0.95, shadowRadius: 9 },
});
