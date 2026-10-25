import { addDays, endOfDay, format, startOfDay } from 'date-fns';
import { router } from 'expo-router';
import { CalendarDays, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Screen } from '@/components/ui';
import { calendarAssistAvailable, loadCalendarSlots, type CalendarSlot } from '@/data/calendar-assist';
import { colors, spacing } from '@/theme/tokens';

export default function CalendarAssistScreen() {
  const [slots, setSlots] = useState<CalendarSlot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const available = calendarAssistAvailable();

  const readCalendar = async () => {
    setLoading(true);
    try {
      const result = await loadCalendarSlots(startOfDay(new Date()), endOfDay(addDays(new Date(), 1)));
      if (result.permission !== 'granted') {
        Alert.alert('Calendar access is off', 'Nothing was read. You can enable calendar access later in system settings.');
        return;
      }
      setSlots(result.slots);
    } catch {
      Alert.alert('Calendar unavailable', 'Meeting Pulse could not read local meeting times. No calendar data was stored.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen topSafe={false}>
      <View style={styles.intro}>
        <AppText variant="label" style={{ color: colors.orange }}>Optional local assist</AppText>
        <AppText variant="display">Use times, not meeting content.</AppText>
        <AppText style={{ color: colors.inkSoft }}>Calendar Assist reads the next two days only after you tap below. It extracts start time and duration, then discards event titles, attendees, notes, locations, and calendar IDs.</AppText>
      </View>

      <Card style={styles.privacyCard}>
        <ShieldCheck size={24} color={colors.moss} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="title">Nothing is imported automatically</AppText>
          <AppText style={{ color: colors.inkSoft }}>Choose a time slot to open a reflection. Meeting Pulse stores nothing until you explicitly save it.</AppText>
        </View>
      </Card>

      {!available ? (
        <EmptyState title="A development build is required" body="Calendar access is not available in Expo Go or the web preview. The rest of Meeting Pulse continues to work without it." />
      ) : slots == null ? (
        <Button label="Allow and preview time slots" onPress={() => { void readCalendar(); }} loading={loading} icon={<CalendarDays size={19} color={colors.white} />} />
      ) : slots.length ? (
        <View style={styles.list}>
          <AppText variant="label" style={{ color: colors.orange }}>Available meeting-shaped slots</AppText>
          {slots.map((slot) => (
            <Card key={`${slot.startIso}-${slot.durationMinutes}`} style={styles.slot}>
              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="title">{format(new Date(slot.startIso), 'EEE, MMM d · h:mm a')}</AppText>
                <AppText style={{ color: colors.inkSoft }}>{slot.durationMinutes} minutes · title and attendees hidden</AppText>
              </View>
              <Button label="Reflect" variant="secondary" onPress={() => router.push({ pathname: '/log', params: { from: 'today', calendarStart: slot.startIso, calendarDuration: String(slot.durationMinutes) } })} />
            </Card>
          ))}
          <Button label="Refresh local slots" variant="ghost" onPress={() => { void readCalendar(); }} loading={loading} />
        </View>
      ) : (
        <EmptyState title="No meeting-shaped slots found" body="No non-all-day calendar events between 5 minutes and 12 hours were found for today or tomorrow." action={<Button label="Refresh" variant="secondary" onPress={() => { void readCalendar(); }} />} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 6 },
  privacyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.mossSoft },
  list: { gap: spacing.md },
  slot: { gap: spacing.md },
});
