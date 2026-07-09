import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { migrateDatabase } from '@/data/database';
import { AppDataProvider } from '@/providers/app-data-provider';
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

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <Suspense fallback={<View style={styles.loading}><ActivityIndicator color={colors.orange} /></View>}>
        <SQLiteProvider databaseName="meeting-pulse.db" onInit={migrateDatabase} useSuspense>
          <AppDataProvider>
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
              <Stack.Screen name="result" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="meeting/[id]" options={{ header: () => <StackHeader title="Meeting details" /> }} />
              <Stack.Screen name="settings" options={{ header: () => <StackHeader title="Settings" /> }} />
              <Stack.Screen name="report" options={{ presentation: 'modal', header: () => <StackHeader title="Weekly report" modal /> }} />
            </Stack>
          </AppDataProvider>
        </SQLiteProvider>
      </Suspense>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper } });
