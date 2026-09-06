import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { Database, Download, Info, LockKeyhole, Plus, Trash2, Upload } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, Card, Pill, Screen, SectionTitle } from '@/components/ui';
import { makeDemoMeetings } from '@/data/fixtures';
import { reminderSupported, sendTestReminder } from '@/data/reminder';
import { MEETING_TYPE_LABELS } from '@/domain/constants';
import { parseExportJson } from '@/domain/import-export';
import { addCustomMeetingType, mergeCustomMeetingTypes, removeCustomMeetingType } from '@/domain/meeting-types';
import { formatReminderHour, REMINDER_HOURS } from '@/domain/reminder-prefs';
import { MEETING_TYPES } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, fonts, radius, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const { getAll, removeAll, create, importData, weekStartsOn, changeWeekStart, reminder, saveReminder, customMeetingTypes, saveCustomMeetingTypes } = useAppData();
  const [working, setWorking] = useState(false);
  const [typeDraft, setTypeDraft] = useState('');

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
      file.write(JSON.stringify({ exportedAt: new Date().toISOString(), weekStartsOn, customMeetingTypes, meetings }, null, 2));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export Meeting Pulse data', UTI: 'public.json' });
    } catch {
      Alert.alert('Export failed', 'Your data is still safe. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const importFromFile = async () => {
    setWorking(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets[0]) return;
      const text = await new File(picked.assets[0].uri).text();
      const preview = parseExportJson(text);
      if (!preview.imported) {
        Alert.alert('Nothing to import', preview.skipped ? `${preview.skipped} row${preview.skipped === 1 ? '' : 's'} could not be read.` : 'This file has no meetings.');
        return;
      }
      Alert.alert(
        `Import ${preview.imported} meeting${preview.imported === 1 ? '' : 's'}?`,
        `${preview.skipped ? `${preview.skipped} invalid row${preview.skipped === 1 ? '' : 's'} will be skipped. ` : ''}Merge keeps what you have. Replace removes current reflections first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Merge', onPress: () => { void finishImport(preview.meetings, preview.customMeetingTypes, 'merge'); } },
          { text: 'Replace', style: 'destructive', onPress: () => { void finishImport(preview.meetings, preview.customMeetingTypes, 'replace'); } },
        ],
      );
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Please choose a Meeting Pulse export.');
    } finally {
      setWorking(false);
    }
  };

  const finishImport = async (
    meetings: Parameters<typeof importData>[0],
    incomingTypes: typeof customMeetingTypes,
    mode: 'merge' | 'replace',
  ) => {
    setWorking(true);
    try {
      const count = await importData(meetings, mode);
      const nextTypes = mode === 'replace' ? incomingTypes : mergeCustomMeetingTypes(customMeetingTypes, incomingTypes);
      await saveCustomMeetingTypes(nextTypes);
      Alert.alert('Import complete', `${count} reflection${count === 1 ? '' : 's'} ${mode === 'replace' ? 'replaced your archive' : 'were added'}.`);
    } catch {
      Alert.alert('Import failed', 'Your existing data is still on this device.');
    } finally {
      setWorking(false);
    }
  };

  const confirmDelete = () => Alert.alert(
    'Delete data on this device?',
    'Choose how much to remove. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Meetings only', style: 'destructive', onPress: async () => { await removeAll(); Alert.alert('Data deleted', 'Your meeting history is now empty.'); } },
      { text: 'Meetings and preferences', style: 'destructive', onPress: async () => { await removeAll({ preferences: true }); Alert.alert('Workspace reset', 'Meetings and preferences were cleared.'); } },
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

  const toggleReminder = async (enabled: boolean) => {
    try {
      await saveReminder({ ...reminder, enabled });
    } catch (error) {
      Alert.alert('Reminder not set', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const addType = async () => {
    try {
      const next = addCustomMeetingType(customMeetingTypes, typeDraft);
      await saveCustomMeetingTypes(next);
      setTypeDraft('');
    } catch (error) {
      Alert.alert('Could not add type', error instanceof Error ? error.message : 'Please try a shorter name.');
    }
  };

  const removeType = (id: string) => {
    Alert.alert('Remove this type?', 'Existing reflections keep the name. It will no longer appear as a shortcut.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { void saveCustomMeetingTypes(removeCustomMeetingType(customMeetingTypes, id)); } },
    ]);
  };

  const previewReminder = async () => {
    try {
      await sendTestReminder();
      Alert.alert('Test sent', 'You should see a notification in a couple of seconds.');
    } catch (error) {
      Alert.alert('Could not send test', error instanceof Error ? error.message : 'Please try again.');
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
        <SectionTitle eyebrow="Week display" title="How weeks are grouped" />
        <Card style={styles.preference}>
          <View style={{ flex: 1, gap: 4 }}><AppText variant="title">Week starts on</AppText><AppText style={{ color: colors.inkSoft }}>Used for Insights and weekly reports.</AppText></View>
          <View style={styles.pills}>
            <Pill label="Mon" selected={weekStartsOn === 1} onPress={() => changeWeekStart(1)} />
            <Pill label="Sun" selected={weekStartsOn === 0} onPress={() => changeWeekStart(0)} />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="Your catalog" title="Meeting types" />
        <Card style={styles.typesCard}>
          <AppText style={{ color: colors.inkSoft }}>Defaults stay. Add the formats you actually run.</AppText>
          <View style={styles.pills}>
            {MEETING_TYPES.map((type) => <Pill key={type} label={MEETING_TYPE_LABELS[type]} />)}
          </View>
          {customMeetingTypes.length ? (
            <View style={styles.customList}>
              {customMeetingTypes.map((type) => (
                <View key={type.id} style={styles.customRow}>
                  <AppText variant="title">{type.label}</AppText>
                  <Pill label="Remove" tone="negative" onPress={() => removeType(type.id)} />
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.typeComposer}>
            <TextInput
              value={typeDraft}
              onChangeText={setTypeDraft}
              placeholder="e.g. Design critique"
              placeholderTextColor={colors.lineDark}
              style={styles.typeInput}
              maxLength={32}
              returnKeyType="done"
              onSubmitEditing={() => { void addType(); }}
              accessibilityLabel="New meeting type name"
            />
            <Button label="Add type" variant="secondary" onPress={() => { void addType(); }} icon={<Plus size={16} color={colors.ink} />} />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="Habit" title="End-of-day reminder" />
        <Card style={styles.preference}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="title">Local reminder</AppText>
            <AppText style={{ color: colors.inkSoft }}>
              {reminderSupported()
                ? 'A single on-device prompt. Off by default. No calendar is read.'
                : 'Reminders need the iOS or Android app. The web preview can store the preference, but it cannot schedule a notification.'}
            </AppText>
          </View>
          {reminderSupported() ? (
            <View style={styles.pills}>
              <Pill label="Off" selected={!reminder.enabled} onPress={() => { void toggleReminder(false); }} />
              <Pill label="On" selected={reminder.enabled} onPress={() => { void toggleReminder(true); }} />
            </View>
          ) : (
            <AppText variant="small" style={{ color: colors.amber }}>Available on device only</AppText>
          )}
        </Card>
        {reminderSupported() && reminder.enabled ? (
          <>
            <View style={styles.pills}>
              {REMINDER_HOURS.map((hour) => (
                <Pill
                  key={hour}
                  label={formatReminderHour(hour)}
                  selected={reminder.hour === hour}
                  onPress={() => { void saveReminder({ enabled: true, hour, minute: 0 }); }}
                />
              ))}
            </View>
            <Button label="Send a test notification" variant="ghost" onPress={() => { void previewReminder(); }} />
          </>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="Method" title="How scoring works" />
        <Card style={styles.methodCard}>
          <View style={styles.iconDisc}><Info size={20} color={colors.orange} /></View>
          <View style={{ flex: 1, gap: 5 }}>
            <AppText variant="title">Mood × duration + reasons</AppText>
            <AppText style={{ color: colors.inkSoft }}>A meeting’s stored score combines how it left you feeling, how long it ran, and the signals you selected. Weekly notes are rule-based on this device. The score is not a clinical or performance assessment.</AppText>
          </View>
        </Card>
        <Card style={styles.exampleCard}>
          <AppText variant="label" style={{ color: colors.orange }}>Worked example</AppText>
          <AppText variant="title">Clear (+2) × 30 min (1.2×) + Clear outcome (+2) = +4.4</AppText>
          <AppText style={{ color: colors.inkSoft }}>Longer meetings amplify the mood. Reasons nudge the result up or down. That is the whole model.</AppText>
        </Card>
        <Button label="Replay the scoring tour" variant="ghost" onPress={() => router.push('/onboarding')} />
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="Your data" title="Private and portable" />
        <Card style={styles.privacyCard}>
          <LockKeyhole size={23} color={colors.moss} />
          <View style={{ flex: 1, gap: 4 }}><AppText variant="title">Stored only on this device</AppText><AppText style={{ color: colors.inkSoft }}>No account, analytics, cloud sync, or network request is required. Export and import are how you move a backup yourself.</AppText></View>
        </Card>
        <Button label="Export data as JSON" variant="secondary" onPress={exportData} loading={working} icon={<Download size={18} color={colors.ink} />} />
        <Button label="Import data from JSON" variant="secondary" onPress={importFromFile} loading={working} icon={<Upload size={18} color={colors.ink} />} />
        <Button label="Delete data on this device" variant="danger" onPress={confirmDelete} icon={<Trash2 size={18} color={colors.wine} />} />
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
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typesCard: { gap: spacing.md },
  customList: { gap: spacing.sm },
  customRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  typeComposer: { gap: spacing.sm },
  typeInput: { minHeight: 52, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: radius.md, backgroundColor: 'rgba(7,10,18,0.42)', paddingHorizontal: spacing.md, color: colors.ink, fontFamily: fonts.body, fontSize: 16 },
  methodCard: { flexDirection: 'row', gap: spacing.md },
  exampleCard: { gap: spacing.sm },
  iconDisc: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  privacyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.mossSoft },
  footer: { alignItems: 'center', gap: 4, paddingTop: spacing.lg },
});
