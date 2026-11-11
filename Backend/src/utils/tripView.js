// Tính các giá trị hiển thị của chuyến đi: trạng thái (CBR 4), ngân sách (CBR 6), định dạng ngày.
// Ngày trong DB là kiểu DATE (Prisma trả về 00:00 UTC), nên so sánh theo chuỗi YYYY-MM-DD cho khỏi lệch múi giờ.

const VN_TZ = 'Asia/Ho_Chi_Minh';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function todayVN(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: VN_TZ }).format(now);
}

/** Date (DATE trong DB) → "YYYY-MM-DD". */
export const toDateStr = (d) => d.toISOString().slice(0, 10);

const dayNumber = (s) => Date.parse(`${s}T00:00:00Z`) / DAY_MS;
const diffDays = (from, to) => Math.round(dayNumber(to) - dayNumber(from));

/**
 * CBR 4: Sắp đi (hôm nay < ngày đi), Đang đi (ngày đi ≤ hôm nay ≤ ngày về), Đã đi (hôm nay > ngày về).
 */
export function tripStatus(startDate, endDate, today = todayVN()) {
  const totalDays = diffDays(startDate, endDate) + 1;
  if (today < startDate) {
    const daysUntil = diffDays(today, startDate);
    return {
      status: 'UPCOMING',
      statusLabel: daysUntil === 1 ? 'Mai đi rồi' : `Còn ${daysUntil} ngày`,
      daysUntil,
      totalDays,
    };
  }
  if (today <= endDate) {
    const currentDay = diffDays(startDate, today) + 1;
    return { status: 'ONGOING', statusLabel: `Đang đi · ngày ${currentDay}/${totalDays}`, currentDay, totalDays };
  }
  return { status: 'PAST', statusLabel: 'Đã đi', totalDays };
}

/**
 * CBR 6: đã chi / ngân sách. < 90%: trong ngân sách; 90–100%: sắp hết quỹ; > 100%: vượt, kèm số tiền vượt.
 */
export function budgetStatus(spent, budget) {
  if (!(budget > 0)) {
    return { budgetPercent: 0, budgetStatus: spent > 0 ? 'OVER' : 'OK', budgetLabel: spent > 0 ? 'Vượt ngân sách' : 'Đang trong ngân sách', overAmount: Math.max(spent, 0) };
  }
  const budgetPercent = Math.round((spent / budget) * 1000) / 10;
  const ratio = spent / budget;
  if (ratio > 1) return { budgetPercent, budgetStatus: 'OVER', budgetLabel: 'Vượt ngân sách', overAmount: spent - budget };
  if (ratio >= 0.9) return { budgetPercent, budgetStatus: 'WARNING', budgetLabel: 'Sắp hết quỹ', overAmount: 0 };
  return { budgetPercent, budgetStatus: 'OK', budgetLabel: 'Đang trong ngân sách', overAmount: 0 };
}

const num = (v) => (v === null || v === undefined ? null : Number(v));

/** Dạng trả về cho frontend (Decimal → số, ngày → YYYY-MM-DD, kèm trạng thái và ngân sách). */
export function toTripView(trip, stats = {}, today = todayVN()) {
  const { itemCount = 0, expenseCount = 0, spent = 0 } = stats;
  const startDate = toDateStr(trip.startDate);
  const endDate = toDateStr(trip.endDate);
  const budget = Number(trip.budget);
  return {
    id: trip.id,
    title: trip.title,
    description: trip.description ?? null,
    destination: trip.destination,
    address: trip.address ?? null,
    latitude: num(trip.latitude),
    longitude: num(trip.longitude),
    startDate,
    endDate,
    budget,
    isPublic: trip.isPublic,
    coverImage: trip.coverImage ?? null,
    coverColor: trip.coverColor ?? null,
    createdAt: trip.createdAt,
    ...tripStatus(startDate, endDate, today),
    itemCount,
    expenseCount,
    spent,
    ...budgetStatus(spent, budget),
  };
}

/** Bỏ dấu, chữ thường: dùng để tìm "da lat" ra "Đà Lạt". */
export function normalizeText(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}
