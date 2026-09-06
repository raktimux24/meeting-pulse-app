import { CalendarDays, ChartNoAxesColumnIncreasing, History } from 'lucide-react-native';
import { Tabs } from 'expo-router';

import { colors, fonts } from '@/theme/tokens';

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
      <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} strokeWidth={1.8} /> }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: ({ color, size }) => <ChartNoAxesColumnIncreasing size={size} color={color} strokeWidth={1.8} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color, size }) => <History size={size} color={color} strokeWidth={1.8} /> }} />
    </Tabs>
  );
}
