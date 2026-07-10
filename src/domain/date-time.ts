export type DateTimePart = 'date' | 'time';

export function mergeDateTimePart(current: Date, selected: Date, part: DateTimePart, maximum = new Date()): Date {
  const next = new Date(current);

  if (part === 'date') {
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  } else {
    next.setHours(selected.getHours(), selected.getMinutes());
  }

  next.setSeconds(0, 0);
  return next.getTime() > maximum.getTime() ? new Date(maximum) : next;
}
