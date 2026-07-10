import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, isSameDay } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Minus, Plus, RotateCcw } from 'lucide-react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { z } from 'zod';

import { AppText, Button, Pill, Screen } from '@/components/ui';
import { MEETING_TYPE_LABELS, MOOD_CONFIG, REASONS } from '@/domain/constants';
import { mergeDateTimePart, type DateTimePart } from '@/domain/date-time';
import { MEETING_TYPES, MOODS, type Mood, type ReasonId } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, fonts, radius, spacing } from '@/theme/tokens';

const detailsSchema = z.object({
  title: z.string().trim().min(1, 'Give the meeting a short name').max(80, 'Keep the name under 80 characters'),
  durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(720, 'Duration must be under 12 hours'),
  meetingType: z.enum(MEETING_TYPES),
  peopleCount: z.number().int().min(1).max(999),
  note: z.string().max(500, 'Keep notes under 500 characters'),
});

type DetailsForm = z.infer<typeof detailsSchema>;

export default function LogMeetingScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { create, update, getById } = useAppData();
  const [step, setStep] = useState<1 | 2>(1);
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showPicker, setShowPicker] = useState<'date' | 'time' | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [reasonIds, setReasonIds] = useState<ReasonId[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(id));

  const { control, handleSubmit, reset, setValue, trigger, formState: { errors } } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { title: '', durationMinutes: 30, meetingType: 'standup', peopleCount: 2, note: '' },
  });

  useEffect(() => {
    if (!id) return;
    getById(id).then((meeting) => {
      if (!meeting) return;
      reset({ title: meeting.title, durationMinutes: meeting.durationMinutes, meetingType: meeting.meetingType, peopleCount: meeting.peopleCount, note: meeting.note });
      setOccurredAt(new Date(meeting.occurredAt));
      setMood(meeting.mood);
      setReasonIds(meeting.reasonIds);
    }).finally(() => setLoadingEdit(false));
  }, [getById, id, reset]);

  const duration = useWatch({ control, name: 'durationMinutes' });
  const peopleCount = useWatch({ control, name: 'peopleCount' });
  const meetingType = useWatch({ control, name: 'meetingType' });
  const pickerMaximum = new Date();
  const maximumTime = isSameDay(occurredAt, pickerMaximum) ? pickerMaximum : undefined;

  const next = async () => {
    if (await trigger()) setStep(2);
  };

  const toggleReason = (reasonId: ReasonId) => {
    setReasonIds((current) => current.includes(reasonId) ? current.filter((item) => item !== reasonId) : [...current, reasonId]);
  };

  const save = handleSubmit(async (details) => {
    if (!mood || saving) return;
    setSaving(true);
    try {
      const input = { ...details, occurredAt: occurredAt.toISOString(), mood, reasonIds };
      const meeting = id ? await update(id, input) : await create(input);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (meeting) router.replace({ pathname: '/result', params: { id: meeting.id, edited: id ? 'true' : 'false' } });
    } finally {
      setSaving(false);
    }
  });

  const onDateChange = (part: DateTimePart) => (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(null);
    if (event.type === 'dismissed' || !selected) return;
    setOccurredAt((current) => mergeDateTimePart(current, selected, part));
  };

  const useCurrentTime = () => {
    setShowPicker(null);
    setOccurredAt(new Date());
  };

  if (loadingEdit) return <Screen topSafe={false}><AppText>Loading meeting…</AppText></Screen>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <Screen topSafe={false}>
        <View style={styles.progressHeader}>
          <View>
            <AppText variant="label" style={{ color: colors.orange }}>Step {step} of 2</AppText>
            <AppText variant="display">{step === 1 ? 'Meeting details' : 'How did it land?'}</AppText>
          </View>
          <View style={styles.progress}><View style={styles.progressActive} /><View style={[styles.progressPart, step === 2 && styles.progressActive]} /></View>
        </View>

        {step === 1 ? (
          <View style={styles.form}>
            <Field label="Meeting name" error={errors.title?.message}>
              <Controller control={control} name="title" render={({ field: { value, onChange, onBlur } }) => (
                <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="e.g. Design review" placeholderTextColor={colors.lineDark} style={styles.input} autoFocus={!id} returnKeyType="done" />
              )} />
            </Field>

            <Field label="Duration" error={errors.durationMinutes?.message}>
              <View style={styles.pills}>{[15, 30, 45, 60].map((minutes) => <Pill key={minutes} label={`${minutes} min`} selected={duration === minutes} onPress={() => setValue('durationMinutes', minutes, { shouldValidate: true })} />)}</View>
              <View style={styles.counter}>
                <Pressable accessibilityRole="button" accessibilityLabel="Decrease duration" onPress={() => setValue('durationMinutes', Math.max(1, duration - 5), { shouldValidate: true })} style={styles.counterButton}><Minus size={18} color={colors.ink} /></Pressable>
                <View style={styles.counterValue}><Clock3 size={17} color={colors.orange} /><AppText variant="title">{duration} minutes</AppText></View>
                <Pressable accessibilityRole="button" accessibilityLabel="Increase duration" onPress={() => setValue('durationMinutes', Math.min(720, duration + 5), { shouldValidate: true })} style={styles.counterButton}><Plus size={18} color={colors.ink} /></Pressable>
              </View>
            </Field>

            <Field label="Meeting type">
              <View style={styles.pills}>{MEETING_TYPES.map((type) => <Pill key={type} label={MEETING_TYPE_LABELS[type]} selected={meetingType === type} onPress={() => setValue('meetingType', type)} />)}</View>
            </Field>

            <Field label="People in the room">
              <View style={styles.counter}>
                <Pressable accessibilityRole="button" accessibilityLabel="Decrease people count" onPress={() => setValue('peopleCount', Math.max(1, peopleCount - 1))} style={styles.counterButton}><Minus size={18} color={colors.ink} /></Pressable>
                <AppText variant="title">{peopleCount} {peopleCount === 1 ? 'person' : 'people'}</AppText>
                <Pressable accessibilityRole="button" accessibilityLabel="Increase people count" onPress={() => setValue('peopleCount', Math.min(999, peopleCount + 1))} style={styles.counterButton}><Plus size={18} color={colors.ink} /></Pressable>
              </View>
            </Field>

            <Field label="When it happened">
              <View style={styles.whenCard}>
                <View style={styles.whenHeader}>
                  <View style={styles.whenIcon}><CalendarDays size={20} color={colors.orange} /></View>
                  <View style={styles.whenCopy}>
                    <AppText variant="title">Meeting start</AppText>
                    <AppText variant="small" style={{ color: colors.inkSoft }}>Defaults to now. Choose any earlier date and time.</AppText>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Use current date and time" onPress={useCurrentTime} style={({ pressed }) => [styles.nowButton, pressed && styles.pressed]}>
                    <RotateCcw size={14} color={colors.orange} />
                    <AppText variant="small" style={styles.nowButtonText}>Now</AppText>
                  </Pressable>
                </View>

                {Platform.OS === 'ios' ? (
                  <View style={styles.pickerRows}>
                    <View style={styles.nativePickerRow}>
                      <View style={styles.pickerLabel}><CalendarDays size={17} color={colors.inkSoft} /><AppText>Date</AppText></View>
                      <DateTimePicker accessibilityLabel="Select meeting date" value={occurredAt} mode="date" maximumDate={pickerMaximum} onChange={onDateChange('date')} display="compact" themeVariant="dark" accentColor={colors.orange} />
                    </View>
                    <View style={styles.nativePickerRow}>
                      <View style={styles.pickerLabel}><Clock3 size={17} color={colors.inkSoft} /><AppText>Time</AppText></View>
                      <DateTimePicker accessibilityLabel="Select meeting time" value={occurredAt} mode="time" maximumDate={maximumTime} onChange={onDateChange('time')} display="compact" themeVariant="dark" accentColor={colors.orange} />
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.dateRow}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Change meeting date, currently ${format(occurredAt, 'MMMM d, yyyy')}`} onPress={() => setShowPicker('date')} style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}>
                        <CalendarDays size={18} color={colors.orange} />
                        <View><AppText variant="label" style={{ color: colors.inkSoft }}>Date</AppText><AppText>{format(occurredAt, 'MMM d, yyyy')}</AppText></View>
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Change meeting time, currently ${format(occurredAt, 'h:mm a')}`} onPress={() => setShowPicker('time')} style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}>
                        <Clock3 size={18} color={colors.orange} />
                        <View><AppText variant="label" style={{ color: colors.inkSoft }}>Time</AppText><AppText>{format(occurredAt, 'h:mm a')}</AppText></View>
                      </Pressable>
                    </View>
                    {showPicker ? <DateTimePicker value={occurredAt} mode={showPicker} maximumDate={showPicker === 'date' ? pickerMaximum : maximumTime} onChange={onDateChange(showPicker)} display="default" /> : null}
                  </>
                )}

                <View style={styles.whenSummary}>
                  <Clock3 size={14} color={colors.moss} />
                  <AppText variant="small" style={{ color: colors.inkSoft }}>Saved as {format(occurredAt, "EEEE, MMM d 'at' h:mm a")}</AppText>
                </View>
              </View>
            </Field>

            <Field label="Private note · optional" error={errors.note?.message}>
              <Controller control={control} name="note" render={({ field: { value, onChange, onBlur } }) => (
                <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Anything you want to remember…" placeholderTextColor={colors.lineDark} style={[styles.input, styles.note]} multiline textAlignVertical="top" />
              )} />
            </Field>

            <Button label="Continue to mood check" onPress={next} icon={<ChevronRight size={19} color={colors.white} />} />
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.question}>
              <AppText variant="title">How did this meeting leave you feeling?</AppText>
              <AppText style={{ color: colors.inkSoft }}>Choose the strongest signal you noticed afterward.</AppText>
              <View style={styles.moodGrid}>
                {MOODS.map((item) => {
                  const config = MOOD_CONFIG[item];
                  const selected = mood === item;
                  return (
                    <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setMood(item)} style={[styles.moodCard, config.score > 0 ? styles.moodPositive : config.score < 0 ? styles.moodNegative : styles.moodNeutral, selected && styles.moodSelected]}>
                      <AppText variant="label" style={{ color: selected ? colors.orange : config.score > 0 ? colors.moss : config.score < 0 ? colors.wine : colors.amber }}>{config.score > 0 ? `+${config.score}` : config.score}</AppText>
                      <AppText variant="title" style={{ color: selected ? colors.white : colors.ink }}>{config.label}</AppText>
                      {selected ? <Check size={17} color={colors.orange} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <ReasonGroup title="What worked?" reasonIds={reasonIds} sentiment="positive" onToggle={toggleReason} />
            <ReasonGroup title="What got in the way?" reasonIds={reasonIds} sentiment="negative" onToggle={toggleReason} />

            <View style={styles.actions}>
              <Button label="Back" variant="secondary" onPress={() => setStep(1)} icon={<ChevronLeft size={19} color={colors.ink} />} style={{ flex: 1 }} />
              <Button label={id ? 'Update meeting' : 'Save reflection'} onPress={save} disabled={!mood} loading={saving} style={{ flex: 2 }} />
            </View>
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <View style={styles.field}><AppText variant="label" style={{ color: colors.inkSoft }}>{label}</AppText>{children}{error ? <AppText variant="small" style={{ color: colors.wine }}>{error}</AppText> : null}</View>;
}

function ReasonGroup({ title, reasonIds, sentiment, onToggle }: { title: string; reasonIds: ReasonId[]; sentiment: 'positive' | 'negative'; onToggle: (id: ReasonId) => void }) {
  return (
    <View style={styles.question}>
      <AppText variant="title">{title}</AppText>
      <View style={styles.pills}>{REASONS.filter((reason) => reason.sentiment === sentiment).map((reason) => <Pill key={reason.id} label={reason.label} tone={sentiment} selected={reasonIds.includes(reason.id)} onPress={() => onToggle(reason.id)} />)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressHeader: { gap: spacing.md },
  progress: { flexDirection: 'row', gap: 6 },
  progressPart: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.line },
  progressActive: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.orange, shadowColor: colors.orange, shadowOpacity: 0.7, shadowRadius: 8 },
  form: { gap: spacing.xl },
  field: { gap: spacing.sm },
  input: { minHeight: 58, borderWidth: 1, borderColor: colors.lineDark, borderRadius: radius.md, backgroundColor: colors.surfaceGlass, paddingHorizontal: spacing.md, color: colors.ink, fontFamily: fonts.body, fontSize: 16 },
  note: { minHeight: 104, paddingTop: spacing.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  counter: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.lineDark, borderRadius: radius.md, backgroundColor: colors.surfaceGlass, paddingHorizontal: 8 },
  counterButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  counterValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  whenCard: { gap: spacing.md, borderWidth: 1, borderColor: colors.lineDark, borderRadius: radius.md, backgroundColor: colors.surfaceGlass, padding: spacing.md },
  whenHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  whenIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orangeSoft },
  whenCopy: { flex: 1, gap: 2 },
  nowButton: { minWidth: 64, minHeight: 44, paddingHorizontal: 11, borderWidth: 1, borderColor: 'rgba(255,121,88,0.30)', borderRadius: radius.round, backgroundColor: colors.orangeSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  nowButtonText: { color: colors.orange, fontFamily: fonts.bodyBold },
  pickerRows: { borderTopWidth: 1, borderTopColor: colors.line, borderBottomWidth: 1, borderBottomColor: colors.line },
  nativePickerRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  pickerLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateButton: { flex: 1, minHeight: 64, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: 'rgba(7,10,18,0.42)', flexDirection: 'row', alignItems: 'center', gap: 10 },
  whenSummary: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
  question: { gap: spacing.md },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moodCard: { width: '48%', minHeight: 104, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surfaceGlass, padding: spacing.md, gap: 5, justifyContent: 'space-between', shadowColor: colors.shadow, shadowOpacity: 0.18, shadowRadius: 12 },
  moodPositive: { backgroundColor: 'rgba(23,53,47,0.64)' },
  moodNegative: { backgroundColor: 'rgba(59,32,41,0.64)' },
  moodNeutral: { backgroundColor: 'rgba(58,48,32,0.60)' },
  moodSelected: { backgroundColor: colors.surfaceElevated, borderColor: colors.orange, borderWidth: 1.5, shadowColor: colors.orange, shadowOpacity: 0.28, shadowRadius: 16 },
  actions: { flexDirection: 'row', gap: 10 },
});
