import { MEETING_TYPE_LABELS } from './constants';
import { MEETING_TYPES, type CustomMeetingType, type DefaultMeetingType, type MeetingType } from './types';

export const MAX_CUSTOM_MEETING_TYPES = 16;
export const MEETING_TYPE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isDefaultMeetingType(type: string): type is DefaultMeetingType {
  return (MEETING_TYPES as readonly string[]).includes(type);
}

export function humanizeMeetingType(type: string): string {
  return type
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function meetingTypeLabel(type: MeetingType, customTypes: CustomMeetingType[] = []): string {
  if (isDefaultMeetingType(type)) return MEETING_TYPE_LABELS[type];
  const custom = customTypes.find((item) => item.id === type);
  if (custom) return custom.label;
  return humanizeMeetingType(type) || 'Other';
}

export function slugifyMeetingType(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function catalogMeetingTypes(customTypes: CustomMeetingType[]): { id: MeetingType; label: string; builtin: boolean }[] {
  const seen = new Set<string>();
  const catalog: { id: MeetingType; label: string; builtin: boolean }[] = [];

  for (const id of MEETING_TYPES) {
    seen.add(id);
    catalog.push({ id, label: MEETING_TYPE_LABELS[id], builtin: true });
  }
  for (const item of customTypes) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    catalog.push({ id: item.id, label: item.label, builtin: false });
  }
  return catalog;
}

export function parseCustomMeetingTypes(raw: string | null): CustomMeetingType[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>(MEETING_TYPES);
    const types: CustomMeetingType[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const record = item as { id?: unknown; label?: unknown };
      const id = typeof record.id === 'string' ? record.id.trim() : slugifyMeetingType(String(record.label ?? ''));
      const label = typeof record.label === 'string' ? record.label.trim() : '';
      if (!id || !label || !MEETING_TYPE_SLUG.test(id) || id.length > 40 || label.length > 32) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      types.push({ id, label });
      if (types.length >= MAX_CUSTOM_MEETING_TYPES) break;
    }
    return types;
  } catch {
    return [];
  }
}

export function addCustomMeetingType(current: CustomMeetingType[], label: string): CustomMeetingType[] {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Give the meeting type a short name.');
  if (trimmed.length > 32) throw new Error('Keep custom types under 32 characters.');
  const id = slugifyMeetingType(trimmed);
  if (!id || !MEETING_TYPE_SLUG.test(id)) throw new Error('Use letters or numbers in the type name.');
  if (isDefaultMeetingType(id) || current.some((item) => item.id === id || item.label.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error('That meeting type already exists.');
  }
  if (current.length >= MAX_CUSTOM_MEETING_TYPES) {
    throw new Error(`You can add up to ${MAX_CUSTOM_MEETING_TYPES} custom types.`);
  }
  return [...current, { id, label: trimmed }];
}

export function removeCustomMeetingType(current: CustomMeetingType[], id: string): CustomMeetingType[] {
  return current.filter((item) => item.id !== id);
}

export function mergeCustomMeetingTypes(current: CustomMeetingType[], incoming: CustomMeetingType[]): CustomMeetingType[] {
  const seen = new Set<string>([...MEETING_TYPES, ...current.map((item) => item.id)]);
  const next = [...current];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
    if (next.length >= MAX_CUSTOM_MEETING_TYPES) break;
  }
  return next;
}
