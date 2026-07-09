import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { colors, fonts, gradients } from '@/theme/tokens';

export function StackHeader({ title, modal = false }: { title: string; modal?: boolean }) {
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/today');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar style="light" />
      <LinearGradient colors={gradients.screen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel={modal ? 'Close' : 'Go back'} hitSlop={8} onPress={goBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          {modal ? <X size={21} color={colors.ink} /> : <ChevronLeft size={23} color={colors.ink} />}
        </Pressable>
        <AppText style={styles.title}>{title}</AppText>
        <View style={styles.spacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.line },
  bar: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.lineDark, backgroundColor: colors.surfaceGlass, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bodyBold, fontSize: 16 },
  spacer: { width: 44, height: 44 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
});
