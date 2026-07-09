import { useSQLiteContext } from 'expo-sqlite';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { createMeeting, deleteAllData, deleteMeeting, getAllMeetings, getMeetingById, getMeetingsByRange, getSetting, setSetting, updateMeeting } from '@/data/repository';
import type { MeetingInput } from '@/domain/types';

type AppDataContextValue = {
  ready: boolean;
  onboardingComplete: boolean;
  weekStartsOn: 0 | 1;
  revision: number;
  completeOnboarding: () => Promise<void>;
  changeWeekStart: (value: 0 | 1) => Promise<void>;
  create: (input: MeetingInput) => ReturnType<typeof createMeeting>;
  update: (id: string, input: MeetingInput) => ReturnType<typeof updateMeeting>;
  remove: (id: string) => Promise<void>;
  removeAll: () => Promise<void>;
  getById: (id: string) => ReturnType<typeof getMeetingById>;
  getRange: (start: Date, end: Date) => ReturnType<typeof getMeetingsByRange>;
  getAll: () => ReturnType<typeof getAllMeetings>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [ready, setReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(1);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    Promise.all([getSetting(db, 'onboarding_complete'), getSetting(db, 'week_starts_on')])
      .then(([onboarding, weekStart]) => {
        setOnboardingComplete(onboarding === 'true');
        setWeekStartsOn(weekStart === '0' ? 0 : 1);
      })
      .finally(() => setReady(true));
  }, [db]);

  const bump = useCallback(() => setRevision((value) => value + 1), []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      ready,
      onboardingComplete,
      weekStartsOn,
      revision,
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
        await deleteMeeting(db, id);
        bump();
      },
      removeAll: async () => {
        await deleteAllData(db);
        bump();
      },
      getById: (id) => getMeetingById(db, id),
      getRange: (start, end) => getMeetingsByRange(db, start, end),
      getAll: () => getAllMeetings(db),
    }),
    [bump, db, onboardingComplete, ready, revision, weekStartsOn],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside AppDataProvider');
  return context;
}
