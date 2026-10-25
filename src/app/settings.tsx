import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { Database, Download, Gauge, Info, LockKeyhole, Plus, Trash2, Upload } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, Card, Pill, Screen, SectionTitle } from '@/components/ui';
import { makeDemoMeetings } from '@/data/fixtures';
import { reminderSupported, sendTestReminder } from '@/data/reminder';
import { MEETING_TYPE_LABELS } from '@/domain/constants';
import { addCustomReason, mergeCustomReasons, removeCustomReason } from '@/domain/custom-reasons';
import { parseExportJson, type ImportPreview } from '@/domain/import-export';
import { addCustomMeetingType, mergeCustomMeetingTypes, removeCustomMeetingType } from '@/domain/meeting-types';
import { formatReminderHour, REMINDER_HOURS } from '@/domain/reminder-prefs';
import { MEETING_TYPES, type MeetingBudgetPrefs, type ReasonSentiment } from '@/domain/types';
import { upsertSeriesReview } from '@/domain/series-reviews';
import { useAppData } from '@/providers/app-data-provider';
import { colors, fonts, radius, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const {
    getAll,
    getQuickPulses,
    createQuickPulse,
    removeAll,
    create,
    importData,
    weekStartsOn,
    changeWeekStart,
    reminder,
    saveReminder,
    meetingBudget,
    saveMeetingBudget,
    customMeetingTypes,
    saveCustomMeetingTypes,
    customReasons,
    saveCustomReasons,
    seriesReviews,
    saveSeriesReviews,
  } = useAppData();
  const [working, setWorking] = useState(false);
  const [typeDraft, setTypeDraft] = useState('');
  const [reasonDraft, setReasonDraft] = useState('');
  const [reasonSentiment, setReasonSentiment] = useState<ReasonSentiment>('negative');

  const exportData = async () => {
    setWorking(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'This device cannot open the system share sheet.');
        return;
      }
      const meetings = await getAll();
      const quickPulses = await getQuickPulses();
      const file = new File(Paths.cache, `meeting-pulse-${format(new Date(), 'yyyy-MM-dd')}.json`);
      file.create({ overwrite: true, intermediates: true });
      file.write(JSON.stringify({ exportedAt: new Date().toISOString(), weekStartsOn, customMeetingTypes, customReasons, meetingBudget, seriesReviews, quickPulses, meetings }, null, 2));
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
      if (!preview.imported && !preview.quickPulses.length) {
        Alert.alert('Nothing to import', preview.skipped ? `${preview.skipped} row${preview.skipped === 1 ? '' : 's'} could not be read.` : 'This file has no reflections or Quick Pulses.');
        return;
      }
      const importSummary = [
        preview.imported ? `${preview.imported} reflection${preview.imported === 1 ? '' : 's'}` : null,
        preview.quickPulses.length ? `${preview.quickPulses.length} Quick Pulse${preview.quickPulses.length === 1 ? '' : 's'}` : null,
      ].filter(Boolean).join(' and ');
      Alert.alert(
        `Import ${importSummary}?`,
        `${preview.skipped ? `${preview.skipped} invalid row${preview.skipped === 1 ? '' : 's'} will be skipped. ` : ''}Merge keeps what you have. Replace removes current reflections and pending Quick Pulses first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Merge', onPress: () => { void finishImport(preview, 'merge'); } },
          { text: 'Replace', style: 'destructive', onPress: () => { void finishImport(preview, 'replace'); } },
        ],
      );
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Please choose a Meeting Pulse export.');
    } finally {
      setWorking(false);
    }
  };

  const finishImport = async (preview: ImportPreview, mode: 'merge' | 'replace') => {
    setWorking(true);
    try {
      const count = await importData(preview.meetings, mode);
      for (const pulse of preview.quickPulses) await createQuickPulse(pulse);
      const nextTypes = mode === 'replace' ? preview.customMeetingTypes : mergeCustomMeetingTypes(customMeetingTypes, preview.customMeetingTypes);
      await saveCustomMeetingTypes(nextTypes);
      const nextReasons = mode === 'replace' ? preview.customReasons : mergeCustomReasons(customReasons, preview.customReasons);
      await saveCustomReasons(nextReasons);
      const nextSeries = mode === 'replace'
        ? preview.seriesReviews
        : preview.seriesReviews.reduce((current, item) => upsertSeriesReview(current, item), seriesReviews);
      await saveSeriesReviews(nextSeries);
      if (mode === 'replace' && preview.weekStartsOn != null) await changeWeekStart(preview.weekStartsOn);
      if (mode === 'replace' && preview.meetingBudget) await saveMeetingBudget(preview.meetingBudget);
      Alert.alert('Import complete', `${count} reflection${count === 1 ? '' : 's'} and ${preview.quickPulses.length} Quick Pulse${preview.quickPulses.length === 1 ? '' : 's'} ${mode === 'replace' ? 'replaced your archive' : 'were added'}.`);
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

  const addReason = async () => {
    try {
      const next = addCustomReason(customReasons, reasonDraft, reasonSentiment);
      await saveCustomReasons(next);
      setReasonDraft('');
    } catch (error) {
      Alert.alert('Could not add reason', error instanceof Error ? error.message : 'Please try a shorter name.');
    }
  };

  const removeReason = (id: string) => {
    Alert.alert('Remove this reason?', 'Existing reflections keep the label. It will no longer appear as a logging shortcut.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { void saveCustomReasons(removeCustomReason(customReasons, id)); } },
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

  const updateBudget = (patch: Partial<MeetingBudgetPrefs>) => {
    void saveMeetingBudget({ ...meetingBudget, ...patch });
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
        <SectionTitle eyebrow="Personal guardrails" title="Your meeting budget" />
        <Card style={styles.budgetIntro}>
          <Gauge size={23} color={colors.orange} />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="title">Based only on meetings you log</AppText>
            <AppText style={{ color: colors.inkSoft }}>Choose private weekly guardrails. They never affect your score or appear in shared reports.</AppText>
          </View>
          <View style={styles.pills}>
            <Pill label="Off" selected={!meetingBudget.enabled} onPress={() => updateBudget({ enabled: false })} />
            <Pill label="On" selected={meetingBudget.enabled} onPress={() => updateBudget({ enabled: true })} />
          </View>
        </Card>
        {meetingBudget.enabled ? (
          <Card style={styles.budgetControls}>
            <BudgetNumberControl
              key={`weekly-${meetingBudget.weeklyMinutes ?? 'none'}`}
              label="Weekly logged meeting time"
              value={meetingBudget.weeklyMinutes}
              options={[{ label: '5h', value: 300 }, { label: '8h', value: 480 }, { label: '10h', value: 600 }]}
              unit="minutes"
              onChange={(weeklyMinutes) => updateBudget({ weeklyMinutes })}
            />
            <BudgetNumberControl
              key={`cost-${meetingBudget.maxCostMeetings ?? 'none'}`}
              label="High-cost meetings"
              value={meetingBudget.maxCostMeetings}
              options={[{ label: '2', value: 2 }, { label: '3', value: 3 }, { label: '5', value: 5 }]}
              unit="meetings"
              onChange={(maxCostMeetings) => updateBudget({ maxCostMeetings })}
            />
            <BudgetNumberControl
              key={`block-${meetingBudget.maxBlockMinutes ?? 'none'}`}
              label="Longest consecutive meeting block"
              value={meetingBudget.maxBlockMinutes}
              options={[{ label: '60m', value: 60 }, { label: '90m', value: 90 }, { label: '120m', value: 120 }]}
              unit="minutes"
              onChange={(maxBlockMinutes) => updateBudget({ maxBlockMinutes })}
            />
            <View style={styles.budgetControl}>
              <AppText variant="title">Preferred buffer</AppText>
              <AppText variant="small" style={{ color: colors.inkSoft }}>Counts transitions between logged meetings that are shorter than this.</AppText>
              <View style={styles.pills}>
                <Pill label="Not set" selected={meetingBudget.preferredBufferMinutes == null} onPress={() => updateBudget({ preferredBufferMinutes: null })} />
                {([10, 15, 30] as const).map((value) => <Pill key={value} label={`${value}m`} selected={meetingBudget.preferredBufferMinutes === value} onPress={() => updateBudget({ preferredBufferMinutes: value })} />)}
              </View>
            </View>
          </Card>
        ) : null}
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
        <SectionTitle eyebrow="Your language" title="Private custom reasons" />
        <Card style={styles.typesCard}>
          <AppText style={{ color: colors.inkSoft }}>Custom reasons stay local and appear in logging. They do not change the score; only built-in reasons have score modifiers.</AppText>
          {customReasons.some((reason) => reason.active !== false) ? (
            <View style={styles.customList}>
              {customReasons.filter((reason) => reason.active !== false).map((reason) => (
                <View key={reason.id} style={styles.customRow}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <AppText variant="title">{reason.label}</AppText>
                    <AppText variant="small" style={{ color: reason.sentiment === 'positive' ? colors.moss : colors.wine }}>{reason.sentiment === 'positive' ? 'What worked' : 'What got in the way'}</AppText>
                  </View>
                  <Pill label="Remove" tone="negative" onPress={() => removeReason(reason.id)} />
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.pills}>
            <Pill label="What worked" selected={reasonSentiment === 'positive'} tone="positive" onPress={() => setReasonSentiment('positive')} />
            <Pill label="What got in the way" selected={reasonSentiment === 'negative'} tone="negative" onPress={() => setReasonSentiment('negative')} />
          </View>
          <View style={styles.typeComposer}>
            <TextInput
              value={reasonDraft}
              onChangeText={setReasonDraft}
              placeholder="e.g. Wrong level of detail"
              placeholderTextColor={colors.lineDark}
              style={styles.typeInput}
              maxLength={32}
              returnKeyType="done"
              onSubmitEditing={() => { void addReason(); }}
              accessibilityLabel="New custom reason"
            />
            <Button label="Add reason" variant="secondary" onPress={() => { void addReason(); }} icon={<Plus size={16} color={colors.ink} />} />
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
                ? 'A single on-device prompt. Off by default. It does not require calendar access.'
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
        <SectionTitle eyebrow="Optional assist" title="Calendar time slots" />
        <Card style={styles.preference}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="title">Read only when you ask</AppText>
            <AppText style={{ color: colors.inkSoft }}>Preview start times and durations for today and tomorrow. Titles, attendees, notes, locations, and calendar IDs are discarded.</AppText>
          </View>
        </Card>
        <Button label="Open Calendar Assist" variant="secondary" onPress={() => router.push('/calendar-assist')} />
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

function BudgetNumberControl({ label, value, options, unit, onChange }: {
  label: string;
  value: number | null;
  options: { label: string; value: number }[];
  unit: 'minutes' | 'meetings';
  onChange: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState(value?.toString() ?? '');
  const commit = () => {
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed) || parsed <= 0) onChange(null);
    else onChange(Math.round(parsed));
  };
  return (
    <View style={styles.budgetControl}>
      <AppText variant="title">{label}</AppText>
      <View style={styles.pills}>
        <Pill label="Not set" selected={value == null} onPress={() => onChange(null)} />
        {options.map((option) => <Pill key={option.value} label={option.label} selected={value === option.value} onPress={() => onChange(option.value)} />)}
      </View>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="number-pad"
        placeholder={`Custom ${unit}`}
        placeholderTextColor={colors.lineDark}
        style={styles.thresholdInput}
        accessibilityLabel={`${label}, custom ${unit}`}
        maxLength={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 5 },
  section: { gap: spacing.md },
  preference: { gap: spacing.md },
  budgetIntro: { gap: spacing.md },
  budgetControls: { gap: spacing.xl },
  budgetControl: { gap: spacing.sm },
  thresholdInput: { minHeight: 48, borderWidth: 1, borderColor: colors.lineDark, borderRadius: radius.md, backgroundColor: colors.surfaceGlass, paddingHorizontal: spacing.md, color: colors.ink, fontFamily: fonts.body, fontSize: 16 },
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
