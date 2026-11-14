import { CalendarDays, ChartNoAxesColumnIncreasing, History } from 'lucide-react-native';
import { Tabs } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors, fonts } from '@/theme/tokens';

/** Lifts and enlarges the icon of the active tab with a spring. */
function TabIcon({ focused, children }: { focused: boolean; children: ReactNode }) {
  const active = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    active.value = withSpring(focused ? 1 : 0, { damping: 12, stiffness: 220, mass: 0.6 });
  }, [active, focused]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + active.value * 0.14 }, { translateY: -1.5 * active.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: {
          height: 78,
          paddingTop: 8,
          paddingBottom: 12,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.06)',
          backgroundColor: 'rgba(8,12,20,0.94)',
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.36,
          shadowRadius: 22,
          elevation: 16,
        },
        tabBarItemStyle: { borderRadius: 16 },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.3 },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><CalendarDays size={size} color={color} strokeWidth={1.8} /></TabIcon> }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><ChartNoAxesColumnIncreasing size={size} color={color} strokeWidth={1.8} /></TabIcon> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><History size={size} color={color} strokeWidth={1.8} /></TabIcon> }} />
    </Tabs>
  );
}
