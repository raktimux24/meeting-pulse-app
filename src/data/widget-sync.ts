import { isSameDay } from 'date-fns';
import { Platform } from 'react-native';

import { MOOD_CONFIG } from '@/domain/constants';
import type { Meeting } from '@/domain/types';
import type { PulseWidgetProps } from '@/widgets/pulse-widget';

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function widgetPropsFor(meetings: Meeting[], pendingPulses: number, now = new Date()): PulseWidgetProps {
  const today = meetings
    .filter((meeting) => isSameDay(new Date(meeting.occurredAt), now))
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  const total = round(today.reduce((sum, meeting) => sum + meeting.impactScore, 0));
  const last = today[today.length - 1];
  return {
    scoreText: total > 0 ? `+${total}` : total < 0 ? `−${Math.abs(total)}` : '0',
    tone: !today.length ? 'empty' : total > 0 ? 'positive' : total < 0 ? 'negative' : 'neutral',
    meetingCount: today.length,
    lastMood: last ? MOOD_CONFIG[last.mood].label : '',
    pendingPulses,
  };
}

/** Pushes today's numbers to the home screen and Lock Screen widget. Does nothing off iOS. */
export function updatePulseWidget(props: PulseWidgetProps): void {
  if (Platform.OS !== 'ios') return;
  try {
    // Required lazily: the widget module needs the native expo-widgets module, which Expo Go lacks.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const widget = require('@/widgets/pulse-widget').default as { updateSnapshot: (value: PulseWidgetProps) => void };
    widget.updateSnapshot(props);
  } catch {
    // No widget extension in this build; nothing to update.
  }
}
