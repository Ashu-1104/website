function trimTrailingZero(value: string) {
  return value.replace(/\.0$/, '');
}

export function formatCompactNumber(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs < 1000) return `${value}`;

  const formatWithSuffix = (divisor: number, suffix: string) => {
    const scaled = abs / divisor;
    const rounded = Math.round(scaled * 10) / 10;
    return `${sign}${trimTrailingZero(rounded.toFixed(1))}${suffix}`;
  };

  if (abs < 1_000_000) {
    const scaled = Math.round((abs / 1000) * 10) / 10;
    if (scaled >= 1000) return formatWithSuffix(1_000_000, 'm');
    return `${sign}${trimTrailingZero(scaled.toFixed(1))}k`;
  }

  if (abs < 1_000_000_000) {
    const scaled = Math.round((abs / 1_000_000) * 10) / 10;
    if (scaled >= 1000) return formatWithSuffix(1_000_000_000, 'b');
    return `${sign}${trimTrailingZero(scaled.toFixed(1))}m`;
  }

  return formatWithSuffix(1_000_000_000, 'b');
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatTimeAgo(dateInput: string | Date, now: Date = new Date()): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return '';

  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);

  const minutes = Math.round(seconds / 60);
  const hours = Math.round(seconds / 3600);
  const days = Math.round(seconds / 86400);
  const weeks = Math.round(days / 7);
  const months = Math.round(days / 30);
  const years = Math.round(days / 365);

  if (Math.abs(seconds) < 60) return rtf.format(seconds, 'second');
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  if (Math.abs(days) < 7) return rtf.format(days, 'day');
  if (Math.abs(weeks) < 5) return rtf.format(weeks, 'week');
  if (Math.abs(months) < 12) return rtf.format(months, 'month');
  return rtf.format(years, 'year');
}

