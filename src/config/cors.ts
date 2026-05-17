const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'https://taskflow-ten-delta.vercel.app',
];

function normalizeClientUrl(raw?: string): string | undefined {
  if (!raw) return undefined;

  let value = raw.trim();

  // Fix common copy-paste mistakes from hosting dashboards
  value = value.replace(/^CLIENT_URL=/i, '');
  value = value.replace(/^https:https:\/\//i, 'https://');
  value = value.replace(/\/+$/, '');

  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    value = `https://${value}`;
  }

  try {
    return new URL(value).origin;
  } catch {
    console.warn(`Invalid CLIENT_URL ignored: ${raw}`);
    return undefined;
  }
}

export function getAllowedOrigins(): string[] {
  const fromEnv = normalizeClientUrl(process.env.CLIENT_URL);
  const origins = new Set(DEFAULT_ORIGINS);

  if (fromEnv) {
    origins.add(fromEnv);
  }

  return [...origins];
}
