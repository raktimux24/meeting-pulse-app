import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';

/**
 * Picks up exactly where the native splash leaves off (same background, same mark, same size,
 * centred), then plays a short heartbeat: the mark beats twice, a signal ripples out from the ring
 * with each beat, and the wordmark rises in. Once the app data is ready it fades away.
 *
 * MARK_SIZE must match `imageWidth` for expo-splash-screen in app.json, and the ring radius below
 * must match assets/images/splash-mark.png, or the hand-off from the native splash will jump.
 */
export const MARK_SIZE = 140;
const RING_DIAMETER = 92; // ring centre-line diameter inside the 140pt mark
const BEAT_MS = 520; // one "lub-dub" cycle
const MIN_VISIBLE_MS = 1500; // long enough for two beats and the wordmark
const EXIT_MS = 420;

export function AnimatedSplash({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const reduceMotion = useReducedMotion();
  const [minTimeDone, setMinTimeDone] = useState(false);
  const exiting = useRef(false);

  const beat = useSharedValue(1);
  const rippleA = useSharedValue(0);
  const rippleB = useSharedValue(0);
  const word = useSharedValue(0);
  const exit = useSharedValue(0);

  // The overlay is drawn identically to the native splash, so it can be hidden without a fade.
  const handleLayout = () => SplashScreen.hide();

  useEffect(() => {
    if (reduceMotion) {
      word.value = 1;
      const timer = setTimeout(() => setMinTimeDone(true), 300);
      return () => clearTimeout(timer);
    }

    const pulse = withSequence(
      withTiming(1.09, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0.99, { duration: 110, easing: Easing.inOut(Easing.quad) }),
      withTiming(1.05, { duration: 100, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 190, easing: Easing.inOut(Easing.quad) }),
    );
    beat.value = withDelay(150, withSequence(pulse, withDelay(120, pulse)));

    const ripple = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    rippleA.value = withDelay(170, ripple);
    rippleB.value = withDelay(170 + BEAT_MS + 120, ripple);

    word.value = withDelay(420, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));

    const timer = setTimeout(() => setMinTimeDone(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [beat, reduceMotion, rippleA, rippleB, word]);

  useEffect(() => {
    if (!ready || !minTimeDone || exiting.current) return;
    exiting.current = true;
    const duration = reduceMotion ? 200 : EXIT_MS;
    exit.value = withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) });
    const timer = setTimeout(onFinish, duration + 20);
    return () => clearTimeout(timer);
  }, [exit, minTimeDone, onFinish, ready, reduceMotion]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: beat.value * (1 + exit.value * 0.18) }] }));
  const rippleAStyle = useAnimatedStyle(() => rippleFrame(rippleA.value));
  const rippleBStyle = useAnimatedStyle(() => rippleFrame(rippleB.value));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value * (1 - exit.value),
    transform: [{ translateY: (1 - word.value) * 14 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, overlayStyle]} onLayout={handleLayout} accessibilityLabel="Meeting Pulse is loading">
      <View style={styles.center}>
        <Animated.View style={[styles.ripple, rippleAStyle]} />
        <Animated.View style={[styles.ripple, rippleBStyle]} />
        <Animated.View style={markStyle}>
          <Image source={require('../../assets/images/splash-mark.png')} style={styles.mark} />
        </Animated.View>
        <Animated.View style={[styles.wordmark, wordStyle]}>
          <AppText style={styles.title}>Meeting Pulse</AppText>
          <AppText variant="label" style={styles.tagline}>Energy · Clarity · Momentum</AppText>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function rippleFrame(progress: number) {
  'worklet';
  return {
    opacity: progress === 0 ? 0 : 0.55 * (1 - progress),
    transform: [{ scale: 1 + progress * 1.7 }],
  };
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.paper, zIndex: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: MARK_SIZE, height: MARK_SIZE },
  ripple: {
    position: 'absolute',
    width: RING_DIAMETER,
    height: RING_DIAMETER,
    borderRadius: RING_DIAMETER / 2,
    borderWidth: 2,
    borderColor: colors.orange,
  },
  // Absolutely placed below the mark so the mark itself stays exactly centred, like the native splash.
  wordmark: { position: 'absolute', top: '50%', marginTop: MARK_SIZE / 2 + 18, alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.ink, letterSpacing: -0.4 },
  tagline: { color: colors.orange },
});
