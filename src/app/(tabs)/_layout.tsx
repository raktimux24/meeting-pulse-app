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
          height: 86,
          paddingTop: 10,
          paddingBottom: 15,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          backgroundColor: 'rgba(17,24,39,0.96)',
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.30,
          shadowRadius: 20,
          elevation: 16,
        },
        tabBarItemStyle: { borderRadius: 18 },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11 },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} strokeWidth={1.8} /> }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: ({ color, size }) => <ChartNoAxesColumnIncreasing size={size} color={color} strokeWidth={1.8} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color, size }) => <History size={size} color={color} strokeWidth={1.8} /> }} />
    </Tabs>
  );
}
