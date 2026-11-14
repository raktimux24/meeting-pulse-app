import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Settings2 } from 'lucide-react-native';
import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useId, useState } from 'react';
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
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { PressableScale } from '@/components/motion';
import { colors, fonts, gradients, radius, spacing } from '@/theme/tokens';

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
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 15, letterSpacing: 1.35, textTransform: 'uppercase' },
  title: { fontFamily: fonts.bodyBold, fontSize: 20, lineHeight: 25, letterSpacing: -0.2 },
  lead: { fontFamily: fonts.bodyMedium, fontSize: 17, lineHeight: 25 },
  hero: { fontFamily: fonts.display, fontSize: 43, lineHeight: 50, letterSpacing: -1.5 },
  display: { fontFamily: fonts.display, fontSize: 33, lineHeight: 36, letterSpacing: -0.9 },
});

/** Soft radial glow. Fades to transparent, so it never shows a hard edge. */
export function Glow({ color, size, opacity = 0.22, style }: {
  color: string;
  size: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

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
      <LinearGradient colors={gradients.screen} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFill} />
      <Glow color={colors.orange} size={560} opacity={0.2} style={{ right: -300, top: -240 }} />
      <Glow color={colors.blue} size={640} opacity={0.16} style={{ left: -420, top: 220 }} />
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
}

export function Header({ eyebrow, title, subtitle, onSettings, action }: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onSettings?: () => void;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <View style={styles.eyebrowRow}><View style={styles.eyebrowDot} /><AppText variant="label" style={[styles.eyebrow, styles.eyebrowInRow]}>{eyebrow}</AppText></View>
        <AppText variant="display">{title}</AppText>
        {subtitle ? <AppText style={styles.muted}>{subtitle}</AppText> : null}
      </View>
      {action ?? (onSettings ? (
        <PressableScale accessibilityRole="button" accessibilityLabel="Open settings" hitSlop={8} onPress={onSettings} style={styles.iconButton} scaleTo={0.92}>
          <Settings2 color={colors.ink} size={21} strokeWidth={1.8} />
        </PressableScale>
      ) : null)}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function GradientCard({ children, style, colors: gradientColors = gradients.glass }: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  colors?: readonly [string, string, ...string[]];
}>) {
  return <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.gradientCard, style]}>{children}</LinearGradient>;
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
    <PressableScale accessibilityRole={onPress ? 'button' : undefined} accessibilityState={{ selected }} onPress={onPress} disabled={!onPress} haptic="selection" scaleTo={0.94} style={[styles.pill, toneStyle, selected && styles.pillSelected]}>
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

export function formatSigned(value: number) {
  const magnitude = Math.abs(value);
  const normalized = Number.isInteger(magnitude) ? magnitude.toString() : magnitude.toFixed(1);
  // U+2212 is a true minus sign; a hyphen is too short and sits low in the serif.
  return value > 0 ? `+${normalized}` : value < 0 ? `\u2212${normalized}` : normalized;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
  scrollContent: { flexGrow: 1 },
  screenContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  text: { color: colors.ink },
  muted: { color: colors.inkSoft },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.orange, shadowColor: colors.orange, shadowOpacity: 0.9, shadowRadius: 8 },
  eyebrow: { color: colors.orange, marginBottom: 6 },
  eyebrowInRow: { marginBottom: 0 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  headerCopy: { flex: 1, gap: 4 },
  iconButton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.lineDark, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceGlass, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 5 },
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceGlass, padding: spacing.lg, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 24, elevation: 6 },
  gradientCard: { overflow: 'hidden' },
  button: { minHeight: 56, borderRadius: radius.round, borderWidth: 1, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonText: { fontFamily: fonts.bodyBold },
  buttonTextPrimary: { color: colors.onAccent },
  buttonTextDanger: { color: colors.wine },
  disabled: { opacity: 0.4 },
  pill: { minHeight: 44, borderRadius: radius.round, borderWidth: 1, borderColor: colors.lineDark, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,33,54,0.80)' },
  pillPositive: { backgroundColor: colors.mossSoft, borderColor: 'rgba(114,230,192,0.30)' },
  pillNegative: { backgroundColor: colors.wineSoft, borderColor: 'rgba(255,113,133,0.30)' },
  pillSelected: { backgroundColor: colors.orange, borderColor: colors.orange },
  sectionTitle: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  emptyMark: { width: 68, height: 68, borderRadius: 34, borderWidth: 1, borderColor: colors.orange, backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center', shadowColor: colors.orange, shadowOpacity: 0.35, shadowRadius: 22 },
  emptyMarkInner: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.orange, shadowColor: colors.orange, shadowOpacity: 0.9, shadowRadius: 9 },
});
