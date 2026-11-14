import { useFonts } from 'expo-font';
import { Stack, ThemeProvider, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { migrateDatabase } from '@/data/database';
import { AppDataProvider, useAppData } from '@/providers/app-data-provider';
import { AnimatedSplash } from '@/components/animated-splash';
import { StackHeader } from '@/components/stack-header';
import { colors, fonts } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  dark: true,
  colors: {
    primary: colors.orange,
    background: colors.paper,
    card: colors.surface,
    text: colors.ink,
    border: colors.line,
    notification: colors.orange,
  },
  fonts: {
    regular: { fontFamily: fonts.body, fontWeight: '400' as const },
    medium: { fontFamily: fonts.bodyMedium, fontWeight: '500' as const },
    bold: { fontFamily: fonts.bodyBold, fontWeight: '700' as const },
    heavy: { fontFamily: fonts.bodyBold, fontWeight: '700' as const },
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular: require('@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf'),
    DMSans_500Medium: require('@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf'),
    DMSans_700Bold: require('@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf'),
    Newsreader_600SemiBold: require('@expo-google-fonts/newsreader/600SemiBold/Newsreader_600SemiBold.ttf'),
    Newsreader_600SemiBold_Italic: require('@expo-google-fonts/newsreader/600SemiBold_Italic/Newsreader_600SemiBold_Italic.ttf'),
  });

  // The native splash stays up until the fonts load. AnimatedSplash then takes over from it
  // (it hides the native splash itself) and fades out once the app data is ready.
  const [appReady, setAppReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const markReady = useCallback(() => setAppReady(true), []);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.root}>
      <ThemeProvider value={navigationTheme}>
        <Suspense fallback={<View style={styles.loading}><ActivityIndicator color={colors.orange} /></View>}>
          <SQLiteProvider databaseName="meeting-pulse.db" onInit={migrateDatabase} useSuspense>
            <AppDataProvider>
              <ReadySignal onReady={markReady} />
              <NotificationRouteObserver />
              <StatusBar style="light" />
              <Stack
              screenOptions={{
                contentStyle: { backgroundColor: colors.paper },
                headerStyle: { backgroundColor: colors.paper },
                headerShadowVisible: false,
                headerTintColor: colors.ink,
                headerTitleStyle: { fontFamily: fonts.bodyBold },
                animation: 'slide_from_right',
              }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="log" options={{ presentation: 'modal', header: () => <StackHeader title="Log a meeting" modal /> }} />
                <Stack.Screen name="quick-pulse" options={{ presentation: 'modal', header: () => <StackHeader title="Quick Pulse" modal /> }} />
                <Stack.Screen name="quick-pulses" options={{ header: () => <StackHeader title="Quick Pulses" /> }} />
                <Stack.Screen name="calendar-assist" options={{ header: () => <StackHeader title="Calendar Assist" /> }} />
                <Stack.Screen name="result" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="meeting/[id]" options={{ header: () => <StackHeader title="Meeting details" /> }} />
                <Stack.Screen name="settings" options={{ header: () => <StackHeader title="Settings" /> }} />
                <Stack.Screen name="report" options={{ presentation: 'modal', header: () => <StackHeader title="Weekly report" modal /> }} />
                <Stack.Screen name="team-experiment" options={{ presentation: 'modal', header: () => <StackHeader title="Team experiment" modal /> }} />
              </Stack>
            </AppDataProvider>
          </SQLiteProvider>
        </Suspense>
      </ThemeProvider>
      {splashDone ? null : <AnimatedSplash ready={appReady} onFinish={finishSplash} />}
    </View>
  );
}

/** Reports once the database is open and app data has loaded. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const { ready } = useAppData();
  useEffect(() => {
    if (ready) onReady();
  }, [onReady, ready]);
  return null;
}

function NotificationRouteObserver() {
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (url === '/quick-pulse') {
        router.push('/quick-pulse');
        void Notifications.clearLastNotificationResponseAsync();
      }
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification.request.content.data?.url === '/quick-pulse') {
        router.push('/quick-pulse');
        void Notifications.clearLastNotificationResponseAsync();
      }
    });
    return () => subscription.remove();
  }, [router]);
  return null;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.paper }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper } });
