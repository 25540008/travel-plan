// Quy tắc dùng chung cho chuyến đi: trạng thái chuyến (CBR 4), ngân sách (CBR 6), trùng giờ (CBR 7).
import { toDate } from './format.js';

const DAY_MS = 86_400_000;

/** Hôm nay theo giờ Việt Nam, dạng Date 00:00 giờ máy (để so với toDate('2026-10-23')). */
export function todayVN() {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  return toDate(s);
}

/** Số ngày từ a tới b (b - a), đã làm tròn theo ngày. */
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / DAY_MS);

/** Số ngày của chuyến: 23/10 → 25/10 = 3 */
export const tripDays = (trip) => daysBetween(trip.startDate, trip.endDate) + 1;

/** "2026-10-23" của một Date (giờ máy). */
export function isoDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * CBR 4. Trả { key: 'upcoming' | 'ongoing' | 'past', label, dayIndex, chip }.
 * dayIndex (1..n) chỉ có khi đang đi.
 */
export function tripStatus(trip, today = todayVN()) {
  const total = tripDays(trip);
  const untilStart = daysBetween(today, trip.startDate);
  if (untilStart > 0) {
    return {
      key: 'upcoming',
      label: untilStart === 1 ? 'Mai đi rồi' : `Còn ${untilStart} ngày`,
      chip: untilStart === 1 ? 'chip-coral' : 'chip-outline',
    };
  }
  if (daysBetween(today, trip.endDate) >= 0) {
    const dayIndex = -untilStart + 1;
    return { key: 'ongoing', label: `Đang đi · ngày ${dayIndex}/${total}`, chip: 'chip-dark', dayIndex };
  }
  return { key: 'past', label: 'Đã đi', chip: '' };
}

/** CBR 6. Trả { key: 'ok' | 'near' | 'over', label, percent, over }. */
export function budgetStatus(spent, budget) {
  const s = Number(spent) || 0;
  const b = Number(budget) || 0;
  const percent = b > 0 ? Math.round((s / b) * 100) : 0;
  if (b > 0 && s > b) return { key: 'over', label: 'Vượt ngân sách', percent, over: s - b };
  if (percent >= 90) return { key: 'near', label: 'Sắp hết quỹ', percent, over: 0 };
  return { key: 'ok', label: 'Đang trong ngân sách', percent, over: 0 };
}

/** "14:00:00" / ISO / Date → số phút trong ngày */
export function minutesOf(value) {
  const m = String(value).match(/(\d{2}):(\d{2})/);
  if (m && !(value instanceof Date)) return Number(m[1]) * 60 + Number(m[2]);
  const d = new Date(value);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/**
 * CBR 7: A, B trùng khi A.bắt đầu < B.kết thúc và B.bắt đầu < A.kết thúc.
 * items là hoạt động của cùng một ngày. Trả Map<item, item[] trùng với nó>.
 */
export function findOverlaps(items) {
  const result = new Map();
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (minutesOf(a.startTime) < minutesOf(b.endTime) && minutesOf(b.startTime) < minutesOf(a.endTime)) {
        result.set(a, [...(result.get(a) || []), b]);
        result.set(b, [...(result.get(b) || []), a]);
      }
    }
  }
  return result;
}

export function itemCount(trip) {
  return trip._count?.items ?? trip.itemCount ?? trip.items?.length ?? 0;
}

export function expenseCount(trip) {
  return trip._count?.expenses ?? trip.expenseCount ?? trip.expenses?.length ?? 0;
}

export function spentOf(trip) {
  if (trip.spent != null) return Number(trip.spent);
  if (trip.totalSpent != null) return Number(trip.totalSpent);
  return (trip.expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

/** Bỏ dấu, chữ thường: dùng cho ô tìm kiếm. */
export const normalizeText = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
