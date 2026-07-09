import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Settings2 } from 'lucide-react-native';
import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
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

import { colors, fonts, gradients, radius, spacing } from '@/theme/tokens';

export function AppText({
  children,
  style,
  variant = 'body',
  numberOfLines,
  accessibilityLabel,
}: PropsWithChildren<{
  style?: StyleProp<TextStyle>;
  variant?: 'body' | 'small' | 'label' | 'title' | 'hero' | 'display';
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
  hero: { fontFamily: fonts.display, fontSize: 43, lineHeight: 44, letterSpacing: -1.5 },
  display: { fontFamily: fonts.display, fontSize: 33, lineHeight: 36, letterSpacing: -0.9 },
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
      <LinearGradient colors={gradients.screen} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.ambientOrb, styles.ambientOrbCoral]} />
      <View pointerEvents="none" style={[styles.ambientOrb, styles.ambientOrbBlue]} />
      <View pointerEvents="none" style={styles.gridOverlay} />
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
        <View style={styles.eyebrowRow}><View style={styles.eyebrowDot} /><AppText variant="label" style={styles.eyebrow}>{eyebrow}</AppText></View>
        <AppText variant="display">{title}</AppText>
        {subtitle ? <AppText style={styles.muted}>{subtitle}</AppText> : null}
      </View>
      {action ?? (onSettings ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Open settings" hitSlop={8} onPress={onSettings} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Settings2 color={colors.ink} size={21} strokeWidth={1.8} />
        </Pressable>
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

export function Button({ label, onPress, icon, variant = 'primary', disabled, loading, style }: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, buttonVariants[variant], (disabled || loading) && styles.disabled, pressed && styles.pressed, style]}
    >
      {variant === 'primary' ? <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.white : colors.ink} /> : icon}
      <AppText style={[styles.buttonText, variant === 'primary' && styles.buttonTextPrimary, variant === 'danger' && styles.buttonTextDanger]}>{label}</AppText>
    </Pressable>
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
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityState={{ selected }} onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.pill, toneStyle, selected && styles.pillSelected, pressed && styles.pressed]}>
      <AppText variant="small" style={{ color: selected ? colors.white : textTone, fontFamily: fonts.bodyMedium }}>{label}</AppText>
    </Pressable>
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
  const normalized = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return value > 0 ? `+${normalized}` : normalized;
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
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  headerCopy: { flex: 1, gap: 4 },
  iconButton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.lineDark, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceGlass, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 5 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.975 }] },
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceGlass, padding: spacing.lg, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 24, elevation: 6 },
  gradientCard: { overflow: 'hidden' },
  button: { minHeight: 56, borderRadius: radius.round, borderWidth: 1, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonText: { fontFamily: fonts.bodyBold },
  buttonTextPrimary: { color: colors.white },
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
  ambientOrb: { position: 'absolute', borderRadius: 999, opacity: 0.13 },
  ambientOrbCoral: { width: 290, height: 290, backgroundColor: colors.orange, right: -175, top: -100, shadowColor: colors.orange, shadowOpacity: 0.9, shadowRadius: 90 },
  ambientOrbBlue: { width: 330, height: 330, backgroundColor: colors.blue, left: -245, top: 310, shadowColor: colors.blue, shadowOpacity: 0.75, shadowRadius: 100 },
  gridOverlay: { position: 'absolute', width: '140%', height: '120%', left: '-20%', top: '-10%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.018)', transform: [{ rotate: '-8deg' }] },
});
