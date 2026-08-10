export const buildDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const startOfDay = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
};

export const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
};

export const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

export const startOfWeek = (date: Date): Date => {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 is Sunday
  d.setDate(d.getDate() - day);
  return d;
};

export const endOfWeek = (date: Date): Date => {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  d.setHours(23, 59, 59, 999);
  return d;
};

export const eachDayOfInterval = ({ start, end }: { start: Date; end: Date }): Date[] => {
  const days: Date[] = [];
  const current = startOfDay(start);
  const endTime = end.getTime();

  while (current.getTime() <= endTime) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

export const addMonths = (date: Date, count: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + count);
  return result;
};

export const addYears = (date: Date, count: number): Date => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + count);
  return result;
};

export const isSameMonth = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
};

export const isToday = (date: Date): Date | boolean => {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

export const isBefore = (d1: Date, d2: Date): boolean => {
  return d1.getTime() < d2.getTime();
};

export const isPastDay = (date: Date): boolean => {
  return isBefore(startOfDay(date), startOfDay(new Date()));
};

export const isPastDate = (input: Date | string): boolean => {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return false;
  return isBefore(startOfDay(d), startOfDay(new Date()));
};

export const startOfYear = (date: Date): Date => {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const formatMonthYear = (date: Date): string => {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatYear = (date: Date): string => {
  return `${date.getFullYear()}`;
};

export const formatMonthName = (date: Date): string => {
  return MONTH_NAMES[date.getMonth()];
};

export const formatDayHeader = (date: Date): string => {
  return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

export const formatDisplayDate = (dateStr?: string | Date): string => {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

export const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 0) {
    const absDays = Math.abs(days);
    if (absDays === 1) return 'Tomorrow';
    if (absDays <= 7) return `In ${absDays} days`;
    if (absDays <= 30) return `In ${Math.ceil(absDays / 7)} weeks`;
    return `In ${Math.ceil(absDays / 30)} months`;
  }
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};
