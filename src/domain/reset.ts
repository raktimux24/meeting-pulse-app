import type { Meeting } from './types';

/** A meeting at or below this score earns a reset suggestion on the result screen. */
export const RESET_THRESHOLD = -2;
export const RESET_MINUTES = 10;

export const RESET_STEPS = [
  'Stand up and walk for five minutes, away from the screen.',
  'Write down the one decision or next step, so it stops looping.',
  'Close the tabs and threads from that meeting before the next thing.',
];

export function shouldSuggestReset(meeting: Pick<Meeting, 'impactScore'>): boolean {
  return meeting.impactScore <= RESET_THRESHOLD;
}

export type TimeSlot = { startIso: string; durationMinutes: number };

export type BufferProposal = {
  startIso: string;
  minutes: number;
  /** How many meetings run back to back before this buffer. */
  chainCount: number;
  chainMinutes: number;
};

/**
 * Finds runs of two or more meetings with less than `bufferMinutes` between them, and proposes a buffer
 * right after each run, but only where the calendar is free for the whole buffer and the buffer is still
 * in the future. Only start times and durations are used.
 */
export function planBuffers(slots: TimeSlot[], now: Date, bufferMinutes: number): BufferProposal[] {
  const timed = slots
    .map((slot) => {
      const start = new Date(slot.startIso).getTime();
      return { start, end: start + slot.durationMinutes * 60_000 };
    })
    .filter((slot) => !Number.isNaN(slot.start))
    .sort((a, b) => a.start - b.start);

  const proposals: BufferProposal[] = [];
  let index = 0;
  while (index < timed.length) {
    const chainStart = timed[index].start;
    let chainEnd = timed[index].end;
    let count = 1;
    let next = index + 1;
    while (next < timed.length && timed[next].start - chainEnd < bufferMinutes * 60_000 && new Date(timed[next].start).toDateString() === new Date(chainEnd).toDateString()) {
      chainEnd = Math.max(chainEnd, timed[next].end);
      count += 1;
      next += 1;
    }

    const bufferEnd = chainEnd + bufferMinutes * 60_000;
    const overlaps = timed.some((slot) => slot.start < bufferEnd && slot.end > chainEnd);
    if (count >= 2 && chainEnd > now.getTime() && !overlaps) {
      proposals.push({
        startIso: new Date(chainEnd).toISOString(),
        minutes: bufferMinutes,
        chainCount: count,
        chainMinutes: Math.round((chainEnd - chainStart) / 60_000),
      });
    }
    index = next;
  }
  return proposals;
}
