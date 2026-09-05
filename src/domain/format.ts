export function formatSigned(value: number) {
  const normalized = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return value > 0 ? `+${normalized}` : normalized;
}

export function originPath(from?: string | string[]): '/(tabs)/today' | '/(tabs)/history' | '/(tabs)/insights' {
  const value = Array.isArray(from) ? from[0] : from;
  if (value === 'history') return '/(tabs)/history';
  if (value === 'insights') return '/(tabs)/insights';
  return '/(tabs)/today';
}
