import { useSQLiteContext } from 'expo-sqlite';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { reminderSupported, syncDailyReminder } from '@/data/reminder';
import { parseCustomMeetingTypes } from '@/domain/meeting-types';
import { DEFAULT_REMINDER, parseReminderPrefs } from '@/domain/reminder-prefs';
import {
  createMeeting,
  deleteAllData,
  deleteMeeting,
  getAllMeetings,
  getMeetingById,
  getMeetingsByRange,
  getSetting,
  importMeetings,
  restoreMeeting,
  searchMeetings,
  setSetting,
  updateMeeting,
} from '@/data/repository';
import { intentionForWeek, parseIntention } from '@/domain/intention';
import type { CustomMeetingType, Meeting, MeetingInput, ReminderPrefs, WeeklyIntention } from '@/domain/types';

type AppDataContextValue = {
  ready: boolean;
  onboardingComplete: boolean;
  weekStartsOn: 0 | 1;
  revision: number;
  pendingUndo: Meeting | null;
  intention: WeeklyIntention | null;
  reminder: ReminderPrefs;
  customMeetingTypes: CustomMeetingType[];
  completeOnboarding: () => Promise<void>;
  changeWeekStart: (value: 0 | 1) => Promise<void>;
  create: (input: MeetingInput) => ReturnType<typeof createMeeting>;
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
  saveIntention: (text: string, weekStart: Date) => Promise<void>;
  markIntentionTried: () => Promise<void>;
  clearIntention: () => Promise<void>;
  saveReminder: (prefs: ReminderPrefs) => Promise<void>;
  saveCustomMeetingTypes: (types: CustomMeetingType[]) => Promise<void>;
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
  const [customMeetingTypes, setCustomMeetingTypes] = useState<CustomMeetingType[]>([]);

  useEffect(() => {
    Promise.all([
      getSetting(db, 'onboarding_complete'),
      getSetting(db, 'week_starts_on'),
      getSetting(db, 'weekly_intention'),
      getSetting(db, 'daily_reminder'),
      getSetting(db, 'custom_meeting_types'),
    ])
      .then(async ([onboarding, weekStart, intentionValue, reminderValue, customTypesValue]) => {
        setOnboardingComplete(onboarding === 'true');
        setWeekStartsOn(weekStart === '0' ? 0 : 1);
        setIntention(parseIntention(intentionValue));
        const nextReminder = parseReminderPrefs(reminderValue);
        setReminder(nextReminder);
        setCustomMeetingTypes(parseCustomMeetingTypes(customTypesValue));
        if (nextReminder.enabled && reminderSupported()) {
          await syncDailyReminder(nextReminder).catch(() => undefined);
        }
      })
      .finally(() => setReady(true));
  }, [db]);

  const bump = useCallback(() => setRevision((value) => value + 1), []);

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
      customMeetingTypes,
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
          setCustomMeetingTypes([]);
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
      saveIntention: async (text, weekStart) => {
        await persistIntention({ text: text.trim(), weekStartIso: weekStart.toISOString(), tried: false });
      },
      markIntentionTried: async () => {
        if (!intention) return;
        await persistIntention({ ...intention, tried: true });
      },
      clearIntention: async () => {
        await persistIntention(null);
      },
      saveReminder: async (prefs) => {
        await syncDailyReminder(prefs);
        await setSetting(db, 'daily_reminder', JSON.stringify(prefs));
        setReminder(prefs);
      },
      saveCustomMeetingTypes: async (types) => {
        await setSetting(db, 'custom_meeting_types', JSON.stringify(types));
        setCustomMeetingTypes(types);
      },
    }),
    [bump, customMeetingTypes, db, intention, onboardingComplete, pendingUndo, persistIntention, ready, reminder, revision, weekStartsOn],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside AppDataProvider');
  return context;
}
