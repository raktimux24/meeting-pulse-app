import { useSQLiteContext } from 'expo-sqlite';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { saveMoodToHealth } from '@/data/health';
import { syncNudges } from '@/data/nudges';
import { reminderSupported, syncDailyReminder } from '@/data/reminder';
import { updatePulseWidget, widgetPropsFor } from '@/data/widget-sync';
import { DEFAULT_NUDGES, parseNudgePrefs } from '@/domain/nudges';
import { parseCustomMeetingTypes } from '@/domain/meeting-types';
import { parseCustomReasons } from '@/domain/custom-reasons';
import { parseSeriesReviews } from '@/domain/series-reviews';
import { DEFAULT_MEETING_BUDGET, parseMeetingBudget } from '@/domain/budget';
import { DEFAULT_REMINDER, parseReminderPrefs } from '@/domain/reminder-prefs';
import {
  completeQuickPulseMeeting,
  createMeeting,
  createQuickPulse as createQuickPulseRecord,
  deleteAllData,
  deleteMeeting,
  deleteQuickPulse,
  getAllMeetings,
  getAllQuickPulses,
  getMeetingById,
  getQuickPulseById,
  getMeetingsByRange,
  getSetting,
  importMeetings,
  restoreMeeting,
  searchMeetings,
  setSetting,
  updateMeeting,
} from '@/data/repository';
import { intentionForWeek, parseIntention } from '@/domain/intention';
import type { CustomMeetingType, CustomReason, ExperimentResult, Meeting, MeetingBudgetPrefs, MeetingInput, Mood, NudgePrefs, QuickPulse, ReminderPrefs, SeriesReview, WeeklyIntention } from '@/domain/types';

type AppDataContextValue = {
  ready: boolean;
  onboardingComplete: boolean;
  weekStartsOn: 0 | 1;
  revision: number;
  pendingUndo: Meeting | null;
  intention: WeeklyIntention | null;
  reminder: ReminderPrefs;
  nudges: NudgePrefs;
  healthSync: boolean;
  meetingBudget: MeetingBudgetPrefs;
  customMeetingTypes: CustomMeetingType[];
  customReasons: CustomReason[];
  seriesReviews: SeriesReview[];
  completeOnboarding: () => Promise<void>;
  changeWeekStart: (value: 0 | 1) => Promise<void>;
  create: (input: MeetingInput) => ReturnType<typeof createMeeting>;
  completeQuickPulse: (id: string, input: MeetingInput) => ReturnType<typeof completeQuickPulseMeeting>;
  update: (id: string, input: MeetingInput) => ReturnType<typeof updateMeeting>;
  remove: (id: string) => Promise<void>;
  undoRemove: () => Promise<void>;
  clearUndo: () => void;
  removeAll: (options?: { preferences?: boolean }) => Promise<void>;
  importData: (inputs: MeetingInput[], mode: 'merge' | 'replace') => Promise<number>;
  getById: (id: string) => ReturnType<typeof getMeetingById>;
  getRange: (start: Date, end: Date) => ReturnType<typeof getMeetingsByRange>;
  getAll: () => ReturnType<typeof getAllMeetings>;
  search: (query: string) => ReturnType<typeof searchMeetings>;
  createQuickPulse: (input: { occurredAt: string; mood: Mood; reasonId: string | null; durationMinutes?: number | null }) => Promise<QuickPulse>;
  getQuickPulse: (id: string) => Promise<QuickPulse | null>;
  getQuickPulses: () => Promise<QuickPulse[]>;
  removeQuickPulse: (id: string) => Promise<void>;
  saveIntention: (text: string, weekStart: Date, source?: { insightId: string; templateId: string }) => Promise<void>;
  markIntentionTried: () => Promise<void>;
  reviewIntention: (result: ExperimentResult) => Promise<void>;
  clearIntention: () => Promise<void>;
  saveReminder: (prefs: ReminderPrefs) => Promise<void>;
  saveNudges: (prefs: NudgePrefs) => Promise<number>;
  /** Re-plans after-meeting check-ins from the calendar. Safe to call often. */
  refreshNudges: () => Promise<number>;
  saveHealthSync: (enabled: boolean) => Promise<void>;
  saveMeetingBudget: (prefs: MeetingBudgetPrefs) => Promise<void>;
  saveCustomMeetingTypes: (types: CustomMeetingType[]) => Promise<void>;
  saveCustomReasons: (reasons: CustomReason[]) => Promise<void>;
  saveSeriesReviews: (reviews: SeriesReview[]) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [ready, setReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(1);
  const [revision, setRevision] = useState(0);
  const [pendingUndo, setPendingUndo] = useState<Meeting | null>(null);
  const [intention, setIntention] = useState<WeeklyIntention | null>(null);
  const [reminder, setReminder] = useState<ReminderPrefs>(DEFAULT_REMINDER);
  const [nudges, setNudges] = useState<NudgePrefs>(DEFAULT_NUDGES);
  const [healthSync, setHealthSync] = useState(false);
  const [meetingBudget, setMeetingBudget] = useState<MeetingBudgetPrefs>(DEFAULT_MEETING_BUDGET);
  const [customMeetingTypes, setCustomMeetingTypes] = useState<CustomMeetingType[]>([]);
  const [customReasons, setCustomReasons] = useState<CustomReason[]>([]);
  const [seriesReviews, setSeriesReviews] = useState<SeriesReview[]>([]);

  useEffect(() => {
    Promise.all([
      getSetting(db, 'onboarding_complete'),
      getSetting(db, 'week_starts_on'),
      getSetting(db, 'weekly_intention'),
      getSetting(db, 'daily_reminder'),
      getSetting(db, 'custom_meeting_types'),
      getSetting(db, 'meeting_budget'),
      getSetting(db, 'custom_reasons'),
      getSetting(db, 'series_reviews'),
      getSetting(db, 'meeting_nudges'),
      getSetting(db, 'health_sync'),
    ])
      .then(async ([onboarding, weekStart, intentionValue, reminderValue, customTypesValue, meetingBudgetValue, customReasonsValue, seriesReviewsValue, nudgesValue, healthValue]) => {
        setOnboardingComplete(onboarding === 'true');
        setWeekStartsOn(weekStart === '0' ? 0 : 1);
        setIntention(parseIntention(intentionValue));
        const nextReminder = parseReminderPrefs(reminderValue);
        setReminder(nextReminder);
        setCustomMeetingTypes(parseCustomMeetingTypes(customTypesValue));
        setMeetingBudget(parseMeetingBudget(meetingBudgetValue));
        setCustomReasons(parseCustomReasons(customReasonsValue));
        setSeriesReviews(parseSeriesReviews(seriesReviewsValue));
        const nextNudges = parseNudgePrefs(nudgesValue);
        setNudges(nextNudges);
        setHealthSync(healthValue === 'true');
        if (nextReminder.enabled && reminderSupported()) {
          await syncDailyReminder(nextReminder).catch(() => undefined);
        }
        if (nextNudges.enabled) void syncNudges(nextNudges).catch(() => undefined);
      })
      .finally(() => setReady(true));
  }, [db]);

  const bump = useCallback(() => setRevision((value) => value + 1), []);

  // Keep the home screen and Lock Screen widget in step with today's meetings.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    Promise.all([getMeetingsByRange(db, start, new Date(start.getTime() + 86_400_000 - 1)), getAllQuickPulses(db)])
      .then(([today, pulses]) => { if (!cancelled) updatePulseWidget(widgetPropsFor(today, pulses.length, now)); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [db, ready, revision]);

  const shareMood = useCallback((mood: Mood, occurredAt: string, durationMinutes?: number | null) => {
    if (healthSync) void saveMoodToHealth(mood, occurredAt, durationMinutes);
  }, [healthSync]);

  const persistIntention = useCallback(async (next: WeeklyIntention | null) => {
    if (next) await setSetting(db, 'weekly_intention', JSON.stringify(next));
    else await setSetting(db, 'weekly_intention', '');
    setIntention(next);
  }, [db]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      ready,
      onboardingComplete,
      weekStartsOn,
      revision,
      pendingUndo,
      intention: intentionForWeek(intention, new Date(), weekStartsOn),
      reminder,
      nudges,
      healthSync,
      meetingBudget,
      customMeetingTypes,
      customReasons,
      seriesReviews,
      completeOnboarding: async () => {
        await setSetting(db, 'onboarding_complete', 'true');
        setOnboardingComplete(true);
      },
      changeWeekStart: async (next) => {
        await setSetting(db, 'week_starts_on', String(next));
        setWeekStartsOn(next);
        bump();
      },
      create: async (input) => {
        const meeting = await createMeeting(db, input);
        shareMood(meeting.mood, meeting.occurredAt, meeting.durationMinutes);
        bump();
        return meeting;
      },
      completeQuickPulse: async (id, input) => {
        const meeting = await completeQuickPulseMeeting(db, id, input);
        bump();
        return meeting;
      },
      update: async (id, input) => {
        const meeting = await updateMeeting(db, id, input);
        bump();
        return meeting;
      },
      remove: async (id) => {
        const meeting = await getMeetingById(db, id);
        await deleteMeeting(db, id);
        setPendingUndo(meeting);
        bump();
      },
      undoRemove: async () => {
        if (!pendingUndo) return;
        await restoreMeeting(db, pendingUndo);
        setPendingUndo(null);
        bump();
      },
      clearUndo: () => setPendingUndo(null),
      removeAll: async (options) => {
        await deleteAllData(db, options);
        setPendingUndo(null);
        if (options?.preferences) {
          setOnboardingComplete(false);
          setWeekStartsOn(1);
          setIntention(null);
          setReminder(DEFAULT_REMINDER);
          setNudges(DEFAULT_NUDGES);
          setHealthSync(false);
          void syncNudges(DEFAULT_NUDGES).catch(() => undefined);
          setMeetingBudget(DEFAULT_MEETING_BUDGET);
          setCustomMeetingTypes([]);
          setCustomReasons([]);
          setSeriesReviews([]);
          await syncDailyReminder(DEFAULT_REMINDER).catch(() => undefined);
        }
        bump();
      },
      importData: async (inputs, mode) => {
        const count = await importMeetings(db, inputs, mode);
        bump();
        return count;
      },
      getById: (id) => getMeetingById(db, id),
      getRange: (start, end) => getMeetingsByRange(db, start, end),
      getAll: () => getAllMeetings(db),
      search: (query) => searchMeetings(db, query),
      createQuickPulse: async (input) => {
        const pulse = await createQuickPulseRecord(db, input);
        shareMood(pulse.mood, pulse.occurredAt, pulse.durationMinutes);
        bump();
        return pulse;
      },
      getQuickPulse: (id) => getQuickPulseById(db, id),
      getQuickPulses: () => getAllQuickPulses(db),
      removeQuickPulse: async (id) => {
        await deleteQuickPulse(db, id);
        bump();
      },
      saveIntention: async (text, weekStart, source) => {
        await persistIntention({
          text: text.trim(),
          weekStartIso: weekStart.toISOString(),
          tried: false,
          sourceInsightId: source?.insightId,
          experimentTemplateId: source?.templateId,
        });
      },
      markIntentionTried: async () => {
        if (!intention) return;
        await persistIntention({ ...intention, tried: true });
      },
      reviewIntention: async (result) => {
        if (!intention) return;
        await persistIntention({ ...intention, tried: true, result, reviewedAt: new Date().toISOString() });
      },
      clearIntention: async () => {
        await persistIntention(null);
      },
      saveReminder: async (prefs) => {
        await syncDailyReminder(prefs);
        await setSetting(db, 'daily_reminder', JSON.stringify(prefs));
        setReminder(prefs);
      },
      saveNudges: async (prefs) => {
        const count = await syncNudges(prefs);
        await setSetting(db, 'meeting_nudges', JSON.stringify(prefs));
        setNudges(prefs);
        return count;
      },
      refreshNudges: () => syncNudges(nudges).catch(() => 0),
      saveHealthSync: async (enabled) => {
        await setSetting(db, 'health_sync', enabled ? 'true' : 'false');
        setHealthSync(enabled);
      },
      saveMeetingBudget: async (prefs) => {
        const next = parseMeetingBudget(JSON.stringify(prefs));
        await setSetting(db, 'meeting_budget', JSON.stringify(next));
        setMeetingBudget(next);
        bump();
      },
      saveCustomMeetingTypes: async (types) => {
        await setSetting(db, 'custom_meeting_types', JSON.stringify(types));
        setCustomMeetingTypes(types);
      },
      saveCustomReasons: async (reasons) => {
        const next = parseCustomReasons(JSON.stringify(reasons));
        await setSetting(db, 'custom_reasons', JSON.stringify(next));
        setCustomReasons(next);
      },
      saveSeriesReviews: async (reviews) => {
        const next = parseSeriesReviews(JSON.stringify(reviews));
        await setSetting(db, 'series_reviews', JSON.stringify(next));
        setSeriesReviews(next);
      },
    }),
    [bump, customMeetingTypes, customReasons, db, healthSync, intention, meetingBudget, nudges, onboardingComplete, pendingUndo, persistIntention, ready, reminder, revision, seriesReviews, shareMood, weekStartsOn],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside AppDataProvider');
  return context;
}
