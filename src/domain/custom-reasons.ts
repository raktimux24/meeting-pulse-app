import { REASON_IDS, type CustomReason, type ReasonSentiment } from './types';

export const MAX_CUSTOM_REASONS = 12;

function slugify(label: string): string {
  return `custom-${label.trim().toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32)}`;
}

export function parseCustomReasons(raw: string | null): CustomReason[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>(REASON_IDS);
    const result: CustomReason[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const candidate = item as Partial<CustomReason>;
      const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
      const id = typeof candidate.id === 'string' ? candidate.id.trim() : slugify(label);
      const sentiment: ReasonSentiment | null = candidate.sentiment === 'positive' || candidate.sentiment === 'negative' ? candidate.sentiment : null;
      if (!label || label.length > 32 || !id.startsWith('custom-') || seen.has(id) || !sentiment) continue;
      seen.add(id);
      result.push({ id, label, sentiment, ...(candidate.active === false ? { active: false } : {}) });
      if (result.length >= MAX_CUSTOM_REASONS) break;
    }
    return result;
  } catch {
    return [];
  }
}

export function addCustomReason(current: CustomReason[], label: string, sentiment: ReasonSentiment): CustomReason[] {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Give the reason a short name.');
  if (trimmed.length > 32) throw new Error('Keep custom reasons under 32 characters.');
  const id = slugify(trimmed);
  const existingIndex = current.findIndex((item) => item.id === id || item.label.toLowerCase() === trimmed.toLowerCase());
  if (existingIndex >= 0 && current[existingIndex].active === false) {
    return current.map((item, index) => index === existingIndex ? { ...item, label: trimmed, sentiment, active: true } : item);
  }
  if (id === 'custom-' || existingIndex >= 0) {
    throw new Error('That reason already exists.');
  }
  if (current.filter((item) => item.active !== false).length >= MAX_CUSTOM_REASONS) throw new Error(`You can add up to ${MAX_CUSTOM_REASONS} custom reasons.`);
  return [...current, { id, label: trimmed, sentiment }];
}

export function removeCustomReason(current: CustomReason[], id: string): CustomReason[] {
  return current.map((item) => item.id === id ? { ...item, active: false } : item);
}

export function mergeCustomReasons(current: CustomReason[], incoming: CustomReason[]): CustomReason[] {
  const seen = new Set([...REASON_IDS, ...current.map((item) => item.id)]);
  const result = [...current];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
    if (result.filter((reason) => reason.active !== false).length >= MAX_CUSTOM_REASONS) break;
  }
  return result;
}
