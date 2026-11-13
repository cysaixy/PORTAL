const dateFmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const formatDate = (d?: string | Date | null) => (d ? dateFmt.format(new Date(d)) : '—');
export const formatDateTime = (d?: string | Date | null) => (d ? dateTimeFmt.format(new Date(d)) : '—');

/** "2026-06-15T00:00:00.000Z" → "2026-06-15" for <input type="date"> */
export const toDateInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export function timeAgo(d: string | Date) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

export const personName = (p?: { firstName: string; lastName: string } | null) => (p ? `${p.firstName} ${p.lastName}` : '—');
export const sortName = (p?: { firstName: string; lastName: string } | null) => (p ? `${p.lastName}, ${p.firstName}` : '—');

export const score = (n?: number | null) => (n === null || n === undefined ? '—' : Number.isInteger(n) ? String(n) : n.toFixed(2));

export const plural = (n: number, word: string, pluralWord = `${word}s`) => `${n.toLocaleString()} ${n === 1 ? word : pluralWord}`;
