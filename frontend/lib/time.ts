const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatRelative(date: string | number | Date) {
  const target = new Date(date);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);

  const divisions = [
    { amount: 60, unit: 'seconds' as const },
    { amount: 60, unit: 'minutes' as const },
    { amount: 24, unit: 'hours' as const },
    { amount: 7, unit: 'days' as const },
    { amount: 4.34524, unit: 'weeks' as const },
    { amount: 12, unit: 'months' as const },
    { amount: Number.POSITIVE_INFINITY, unit: 'years' as const },
  ];

  let duration = diffSeconds;
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }

  return target.toLocaleString();
}

