// Định dạng hiển thị theo CBR 9.
const DAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const pad = (n) => String(n).padStart(2, '0');

/** Nhận Date hoặc chuỗi "2026-10-23" / ISO. Ngày thuần được đọc theo giờ địa phương để không lệch ngày. */
export function toDate(value) {
  if (value instanceof Date) return value;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

/** 3500000 → "3.500.000đ" */
export function formatMoney(amount) {
  return `${Math.round(Number(amount) || 0).toLocaleString('vi-VN')}đ`;
}

/** 2200000 → "2,2tr", 850000 → "850k" */
export function formatMoneyShort(amount) {
  const n = Number(amount) || 0;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}k`;
  return formatMoney(n);
}

/** → "T6, 23/10/2026" */
export function formatDate(value) {
  const d = toDate(value);
  return `${DAY_SHORT[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** → "23/10" */
export function formatDayMonth(value) {
  const d = toDate(value);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** "14:00:00", "1970-01-01T14:00:00.000Z" hoặc Date → "14:00" (giờ 24h) */
export function formatTime(value) {
  const s = String(value);
  const m = s.match(/(\d{2}):(\d{2})/);
  if (m && !(value instanceof Date)) return `${m[1]}:${m[2]}`;
  const d = toDate(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Số ngày đêm: 23/10 → 25/10 = "3N2Đ" */
export function formatDuration(start, end) {
  const days = Math.round((toDate(end) - toDate(start)) / 86_400_000) + 1;
  return `${days}N${Math.max(days - 1, 0)}Đ`;
}
