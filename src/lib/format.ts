export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {}
) {
  if (!date) return '';

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: opts.month ?? 'long',
      day: opts.day ?? 'numeric',
      year: opts.year ?? 'numeric',
      ...opts
    }).format(new Date(date));
  } catch {
    return '';
  }
}

/**
 * Formats a metric number with clean decimal precision (default max 2 decimals)
 * using Vietnamese locale (e.g. 17.799999999999997 -> '17,8', 1927.05 -> '1.927,05')
 */
export function formatMetricNumber(
  value: number | string | null | undefined,
  maxFractionDigits = 2
): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN', { maximumFractionDigits: maxFractionDigits });
}

export function formatWeight(value: number | string | null | undefined): string {
  return formatMetricNumber(value, 2);
}

export function formatVolume(value: number | string | null | undefined): string {
  return formatMetricNumber(value, 2);
}
