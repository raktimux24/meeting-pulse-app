export function formatSigned(value: number) {
  const magnitude = Math.abs(value);
  const normalized = Number.isInteger(magnitude) ? magnitude.toString() : magnitude.toFixed(1);
  // U+2212 is a true minus sign; a hyphen is too short and sits low in the serif.
  return value > 0 ? `+${normalized}` : value < 0 ? `\u2212${normalized}` : normalized;
}

export function originPath(from?: string | string[]): '/(tabs)/today' | '/(tabs)/history' | '/(tabs)/insights' {
  const value = Array.isArray(from) ? from[0] : from;
  if (value === 'history') return '/(tabs)/history';
  if (value === 'insights') return '/(tabs)/insights';
  return '/(tabs)/today';
}
