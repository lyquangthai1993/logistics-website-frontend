export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getThisMonthRange() {
  const now = new Date();
  return {
    from: toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toLocalDateString(now)
  };
}

export function getLastMonthRange() {
  const now = new Date();
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    from: toLocalDateString(firstOfLastMonth),
    to: toLocalDateString(lastOfLastMonth)
  };
}

export function getLast7DaysRange() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  return {
    from: toLocalDateString(from),
    to: toLocalDateString(now)
  };
}

export function getTodayRange() {
  const t = toLocalDateString(new Date());
  return { from: t, to: t };
}

export function formatDateVi(iso?: string | null): string {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
}

export type DatePreset = 'today' | '7days' | 'thisMonth' | 'lastMonth' | 'custom';
