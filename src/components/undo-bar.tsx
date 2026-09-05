import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useAppData } from '@/providers/app-data-provider';
import { colors, radius, spacing } from '@/theme/tokens';

export function UndoBar() {
  const { pendingUndo, undoRemove, clearUndo } = useAppData();

  useEffect(() => {
    if (!pendingUndo) return;
    const timer = setTimeout(() => clearUndo(), 8000);
    return () => clearTimeout(timer);
  }, [clearUndo, pendingUndo]);

  if (!pendingUndo) return null;

  return (
    <View style={styles.bar} accessibilityLiveRegion="polite">
      <AppText style={{ flex: 1 }}>Reflection deleted.</AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="Undo delete" onPress={() => { void undoRemove(); }} style={styles.button}>
        <AppText variant="label" style={{ color: colors.orange }}>Undo</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: colors.surfaceElevated,
  },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});
