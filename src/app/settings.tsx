import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { Database, Download, Info, LockKeyhole, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Pill, Screen, SectionTitle } from '@/components/ui';
import { makeDemoMeetings } from '@/data/fixtures';
import { useAppData } from '@/providers/app-data-provider';
import { colors, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const { getAll, removeAll, create, weekStartsOn, changeWeekStart } = useAppData();
  const [working, setWorking] = useState(false);

  const exportData = async () => {
    setWorking(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'This device cannot open the system share sheet.');
        return;
      }
      const meetings = await getAll();
      const file = new File(Paths.cache, `meeting-pulse-${format(new Date(), 'yyyy-MM-dd')}.json`);
      file.create({ overwrite: true, intermediates: true });
      file.write(JSON.stringify({ exportedAt: new Date().toISOString(), weekStartsOn, meetings }, null, 2));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export Meeting Pulse data', UTI: 'public.json' });
    } catch {
      Alert.alert('Export failed', 'Your data is still safe. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const confirmDeleteAll = () => Alert.alert(
    'Delete every reflection?',
    'All meeting history will be permanently removed from this device. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete all', style: 'destructive', onPress: async () => { await removeAll(); Alert.alert('Data deleted', 'Your meeting history is now empty.'); } },
    ],
  );

  const loadDemo = async () => {
    setWorking(true);
    try {
      for (const meeting of makeDemoMeetings()) await create(meeting);
      Alert.alert('Demo week added', 'Open Insights and navigate to last week to see the full story.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Screen topSafe={false}>
      <View style={styles.intro}>
        <AppText variant="label" style={{ color: colors.orange }}>Your workspace</AppText>
        <AppText variant="display">Settings & privacy</AppText>
        <AppText style={{ color: colors.inkSoft }}>The app works offline and never sends your meeting reflections to a server.</AppText>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="Calendar" title="Week display" />
        <Card style={styles.preference}>
          <View style={{ flex: 1, gap: 4 }}><AppText variant="title">Week starts on</AppText><AppText style={{ color: colors.inkSoft }}>Used for Insights and weekly reports.</AppText></View>
          <View style={styles.pills}>
            <Pill label="Mon" selected={weekStartsOn === 1} onPress={() => changeWeekStart(1)} />
            <Pill label="Sun" selected={weekStartsOn === 0} onPress={() => changeWeekStart(0)} />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="Method" title="How scoring works" />
        <Card style={styles.methodCard}>
          <View style={styles.iconDisc}><Info size={20} color={colors.orange} /></View>
          <View style={{ flex: 1, gap: 5 }}><AppText variant="title">Mood × duration + reasons</AppText><AppText style={{ color: colors.inkSoft }}>A meeting’s stored score combines how it left you feeling, how long it ran, and the signals you selected. The score is not a clinical or performance assessment.</AppText></View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="Your data" title="Private and portable" />
        <Card style={styles.privacyCard}>
          <LockKeyhole size={23} color={colors.moss} />
          <View style={{ flex: 1, gap: 4 }}><AppText variant="title">Stored only on this device</AppText><AppText style={{ color: colors.inkSoft }}>No account, analytics, cloud sync, or network request is required.</AppText></View>
        </Card>
        <Button label="Export data as JSON" variant="secondary" onPress={exportData} loading={working} icon={<Download size={18} color={colors.ink} />} />
        <Button label="Delete all meeting data" variant="danger" onPress={confirmDeleteAll} icon={<Trash2 size={18} color={colors.wine} />} />
      </View>

      {__DEV__ ? (
        <View style={styles.section}>
          <SectionTitle eyebrow="Development only" title="Portfolio fixtures" />
          <Button label="Load last week’s demo data" variant="ghost" onPress={loadDemo} disabled={working} icon={<Database size={18} color={colors.ink} />} />
        </View>
      ) : null}

      <View style={styles.footer}>
        <AppText variant="label">Meeting Pulse</AppText>
        <AppText variant="small" style={{ color: colors.inkSoft }}>Version {Constants.expoConfig?.version ?? '1.0.0'} · Local-first workplace reflection</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 5 },
  section: { gap: spacing.md },
  preference: { gap: spacing.md },
  pills: { flexDirection: 'row', gap: 8 },
  methodCard: { flexDirection: 'row', gap: spacing.md },
  iconDisc: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  privacyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.mossSoft },
  footer: { alignItems: 'center', gap: 4, paddingTop: spacing.lg },
});
