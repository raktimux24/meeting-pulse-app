import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * Shared motion primitives. Reanimated honours the system Reduce Motion setting by default,
 * so entering animations and springs here are skipped automatically when it is on.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const SPRING = { damping: 18, stiffness: 260, mass: 0.7 } as const;
const STAGGER_MS = 55;
const MAX_STAGGER_STEPS = 8;

/** Pressable that springs down slightly while held, with an optional light haptic on press. */
export function PressableScale({
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  haptic,
  scaleTo = 0.97,
  ...rest
}: PropsWithChildren<
  Omit<PressableProps, 'style' | 'children'> & {
    style?: StyleProp<ViewStyle>;
    haptic?: 'selection' | 'light';
    scaleTo?: number;
  }
>) {
  const pressed = useSharedValue(0);
  // Scale only: animating opacity here would override a caller's disabled or dimmed opacity.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => {
        pressed.value = withTiming(1, { duration: 90 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = withSpring(0, SPRING);
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic === 'selection') Haptics.selectionAsync().catch(() => undefined);
        if (haptic === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress?.(event);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Fades and rises into place. Pass `index` to stagger siblings. */
export function Rise({
  children,
  index = 0,
  delay = 0,
  style,
}: PropsWithChildren<{ index?: number; delay?: number; style?: StyleProp<ViewStyle> }>) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay + Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS)
        .duration(420)
        .easing(Easing.out(Easing.cubic))}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** Counts from the previously shown value to `value`. Returns `value` directly under Reduce Motion. */
export function useRollingNumber(value: number, { delay = 0, duration = 700 }: { delay?: number; duration?: number } = {}) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (reduceMotion) return;
    const from = current.current;
    let frame = 0;
    let startedAt = 0;
    const tick = () => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = progress === 1 ? value : Math.round((from + (value - from) * eased) * 10) / 10;
      current.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      startedAt = Date.now();
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [delay, duration, reduceMotion, value]);

  return reduceMotion ? value : display;
}
