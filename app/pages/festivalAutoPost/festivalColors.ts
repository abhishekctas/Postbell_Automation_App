export type CategoryToken = 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'primary';

export type StatusToken = 'selected' | 'active' | 'deactive';

/**
 * Vibrant, distinct colors for event bars — matched to the
 * reference panel. All work with white text.
 */
export const EVENT_COLORS: { main: string; dark: string; light: string; bg: string }[] = [
  { main: '#e74c3c', dark: '#c0392b', light: '#fadbd8', bg: '#e74c3c20' }, // red / crimson
  { main: '#2eaa77', dark: '#1e8c63', light: '#d0f0e0', bg: '#2eaa7720' }, // teal green
  { main: '#3b5bdb', dark: '#2b4acb', light: '#dbe4ff', bg: '#3b5bdb20' }, // indigo blue
  { main: '#4a4a4a', dark: '#333333', light: '#e0e0e0', bg: '#4a4a4a20' }, // charcoal
  { main: '#e67e22', dark: '#d35400', light: '#fdebd0', bg: '#e67e2220' }, // orange
  { main: '#8e44ad', dark: '#6c3483', light: '#e8daef', bg: '#8e44ad20' }, // purple
  { main: '#2980b9', dark: '#1a5276', light: '#d4e6f1', bg: '#2980b920' }, // blue
  { main: '#e84393', dark: '#c2185b', light: '#fce4ec', bg: '#e8439320' }, // pink
  { main: '#00897b', dark: '#00695c', light: '#b2dfdb', bg: '#00897b20' }, // dark teal
  { main: '#1565c0', dark: '#0d47a1', light: '#bbdefb', bg: '#1565c020' }, // royal blue
  { main: '#6c5ce7', dark: '#5b4cdb', light: '#e8e5fa', bg: '#6c5ce720' }, // violet
  { main: '#16a085', dark: '#117864', light: '#d1f2eb', bg: '#16a08520' }, // sea green
];

export const CATEGORY_TOKENS: CategoryToken[] = [
  'secondary',
  'info',
  'success',
  'warning',
  'error',
  'primary',
];

export const TOKEN_COLOR_MAP: Record<
  CategoryToken | 'grey',
  { main: string; light: string; dark: string; bg: string; contrastText: string }
> = {
  secondary: {
    main: '#2563EB',
    light: '#eff6ff',
    dark: '#1D4ED8',
    bg: 'rgba(37, 99, 235, 0.1)',
    contrastText: '#ffffff',
  },
  info: {
    main: '#0284c7',
    light: '#e0f2fe',
    dark: '#0369a1',
    bg: 'rgba(2, 132, 199, 0.1)',
    contrastText: '#ffffff',
  },
  success: {
    main: '#16a34a',
    light: '#dcfce7',
    dark: '#15803d',
    bg: 'rgba(22, 163, 74, 0.1)',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#d97706',
    light: '#fef3c7',
    dark: '#b45309',
    bg: 'rgba(217, 119, 6, 0.1)',
    contrastText: '#ffffff',
  },
  error: {
    main: '#dc2626',
    light: '#fee2e2',
    dark: '#b91c1c',
    bg: 'rgba(220, 38, 38, 0.1)',
    contrastText: '#ffffff',
  },
  primary: {
    main: '#2563EB',
    light: '#eff6ff',
    dark: '#1D4ED8',
    bg: 'rgba(37, 99, 235, 0.1)',
    contrastText: '#ffffff',
  },
  grey: {
    main: '#64748b',
    light: '#f1f5f9',
    dark: '#334155',
    bg: 'rgba(100, 116, 139, 0.1)',
    contrastText: '#ffffff',
  },
};

export const hashString = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const getCategoryToken = (category?: string | null, fallback?: string): CategoryToken => {
  const key = (category || fallback || 'general').toLowerCase().trim();
  if (!key) return 'secondary';
  return CATEGORY_TOKENS[hashString(key) % CATEGORY_TOKENS.length];
};

/**
 * Returns a vibrant event color based on category + name hash.
 * Guarantees wide color variety and white-safe contrast.
 */
export const getEventColor = (
  category?: string | null,
  name?: string | null
): { main: string; dark: string; light: string; bg: string; contrastText: string } => {
  const key = (category || name || 'general').toLowerCase().trim();
  const idx = hashString(key) % EVENT_COLORS.length;
  return { ...EVENT_COLORS[idx], contrastText: '#ffffff' };
};

export const STATUS_TOKEN_MAP: Record<StatusToken, CategoryToken | 'grey'> = {
  selected: 'success',
  active: 'info',
  deactive: 'grey',
};

export const STATUS_LABELS: Record<StatusToken, string> = {
  selected: 'Selected',
  active: 'Active',
  deactive: 'Deactive',
};

export const tokenColor = (
  token: CategoryToken | 'grey' | 'primary'
): { main: string; light: string; dark: string; bg: string; contrastText: string } => {
  return TOKEN_COLOR_MAP[token] || TOKEN_COLOR_MAP.secondary;
};
