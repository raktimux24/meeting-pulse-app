import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
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
 * On iOS the native splash is assets/images/splash-screen.png: the app background with the mark,
 * drawn for a 440 x 956 pt screen and scaled to cover. This overlay draws splash-background.png the
 * same way and scales the mark by the same factor, so nothing moves at the hand-off. On Android the
 * native splash can only show the mark on a solid colour, so the background fades in instead.
 * Regenerate the images with `python3 scripts/render-splash.py`.
 *
 * MARK_SIZE must match `imageWidth` in app.json and the size used by the render script.
 */
export const MARK_SIZE = 140;
const ARTBOARD = { width: 440, height: 956 }; // the screen size splash-screen.png is drawn for
const RING_DIAMETER = 92; // ring centre-line diameter inside the 140pt mark
const FULL_SCREEN_NATIVE_SPLASH = Platform.OS === 'ios';
const BEAT_MS = 520; // one "lub-dub" cycle
const MIN_VISIBLE_MS = 1500; // long enough for two beats and the wordmark
const EXIT_MS = 420;

export function AnimatedSplash({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  // Same maths as the native image view's aspect-fill.
  const scale = FULL_SCREEN_NATIVE_SPLASH ? Math.max(width / ARTBOARD.width, height / ARTBOARD.height) : 1;
  const markSize = MARK_SIZE * scale;
  const ringSize = RING_DIAMETER * scale;
  const [minTimeDone, setMinTimeDone] = useState(false);
  const exiting = useRef(false);

  const beat = useSharedValue(1);
  const rippleA = useSharedValue(0);
  const rippleB = useSharedValue(0);
  const word = useSharedValue(0);
  const exit = useSharedValue(0);
  const backdrop = useSharedValue(FULL_SCREEN_NATIVE_SPLASH ? 1 : 0);

  // The overlay is drawn identically to the native splash, so it can be hidden without a fade.
  const handleLayout = () => SplashScreen.hide();

  useEffect(() => {
    backdrop.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) });
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
  }, [backdrop, beat, reduceMotion, rippleA, rippleB, word]);

  useEffect(() => {
    if (!ready || !minTimeDone || exiting.current) return;
    exiting.current = true;
    const duration = reduceMotion ? 200 : EXIT_MS;
    exit.value = withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) });
    const timer = setTimeout(onFinish, duration + 20);
    return () => clearTimeout(timer);
  }, [exit, minTimeDone, onFinish, ready, reduceMotion]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: beat.value * (1 + exit.value * 0.18) }] }));
  const rippleAStyle = useAnimatedStyle(() => rippleFrame(rippleA.value));
  const rippleBStyle = useAnimatedStyle(() => rippleFrame(rippleB.value));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value * (1 - exit.value),
    transform: [{ translateY: (1 - word.value) * 14 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, overlayStyle]} onLayout={handleLayout} accessibilityLabel="Meeting Pulse is loading">
      <Animated.Image
        source={require('../../assets/images/splash-background.png')}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { width, height }, backdropStyle]}
      />
      <View style={styles.center}>
        <Animated.View style={[styles.ripple, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }, rippleAStyle]} />
        <Animated.View style={[styles.ripple, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }, rippleBStyle]} />
        <Animated.View style={markStyle}>
          <Image source={require('../../assets/images/splash-mark.png')} style={{ width: markSize, height: markSize }} />
        </Animated.View>
        <Animated.View style={[styles.wordmark, { marginTop: markSize / 2 + 18 }, wordStyle]}>
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
  ripple: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.orange,
  },
  // Absolutely placed below the mark so the mark itself stays exactly centred, like the native splash.
  wordmark: { position: 'absolute', top: '50%', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.ink, letterSpacing: -0.4 },
  tagline: { color: colors.orange },
});
