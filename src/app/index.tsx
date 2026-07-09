import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAppData } from '@/providers/app-data-provider';
import { colors } from '@/theme/tokens';

export default function IndexScreen() {
  const { ready, onboardingComplete } = useAppData();
  if (!ready) {
    return <View style={styles.loading}><ActivityIndicator color={colors.orange} /></View>;
  }
  return <Redirect href={onboardingComplete ? '/(tabs)/today' : '/onboarding'} />;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper } });
