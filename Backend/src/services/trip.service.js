import prisma from '../lib/prisma.js';
import { getOwnedTripOrThrow } from './tripAccess.service.js';
import { normalizeText, toDateStr, toTripView } from '../utils/tripView.js';

// Service chỉ làm việc với dữ liệu (Prisma), không đụng tới req/res.
// Mọi hàm nhận userId từ JWT và kiểm tra chuyến thuộc người đó (CBR 8, không thuộc → 404).

/** Số hoạt động, số khoản chi và tổng đã chi của các chuyến, gom bằng 2 câu truy vấn (không N+1). */
async function loadStats(tripIds) {
  const stats = new Map(tripIds.map((id) => [id, { itemCount: 0, expenseCount: 0, spent: 0 }]));
  if (!tripIds.length) return stats;
  const [items, expenses] = await Promise.all([
    prisma.itineraryItem.groupBy({ by: ['tripId'], where: { tripId: { in: tripIds } }, _count: { _all: true } }),
    prisma.expense.groupBy({ by: ['tripId'], where: { tripId: { in: tripIds } }, _count: { _all: true }, _sum: { amount: true } }),
  ]);
  for (const r of items) stats.get(r.tripId).itemCount = r._count._all;
  for (const r of expenses) {
    const s = stats.get(r.tripId);
    s.expenseCount = r._count._all;
    s.spent = Number(r._sum.amount ?? 0);
  }
  return stats;
}

/** UC 13: danh sách chuyến của người dùng; lọc theo trạng thái (CBR 4) và tìm theo tên chuyến hoặc điểm đến. */
export async function listMyTrips(userId, { status, q } = {}) {
  const trips = await prisma.trip.findMany({ where: { userId }, orderBy: [{ startDate: 'desc' }, { id: 'desc' }] });
  const stats = await loadStats(trips.map((t) => t.id));
  let views = trips.map((t) => toTripView(t, stats.get(t.id)));
  if (status) views = views.filter((v) => v.status === status);
  if (q) {
    const needle = normalizeText(q);
    views = views.filter((v) => normalizeText(v.title).includes(needle) || normalizeText(v.destination).includes(needle));
  }
  return views;
}

/** UC 14 · B7: lưu chuyến thuộc người dùng trong JWT. */
export async function createTrip(userId, data) {
  const trip = await prisma.trip.create({ data: { ...withoutUndefined(data), userId } });
  return toTripView(trip);
}

/** Xem một chuyến (kèm số hoạt động và khoản chi để popup xoá MSG 24 hiển thị). */
export async function getMyTrip(userId, tripId) {
  const trip = await getOwnedTripOrThrow(userId, tripId);
  const stats = await loadStats([trip.id]);
  return toTripView(trip, stats.get(trip.id));
}

/**
 * UC 15: sửa chuyến. Trường không gửi thì giữ nguyên; description, address, latitude, longitude gửi null để xoá.
 * Khi đổi ngày, hoạt động nằm ngoài khoảng ngày mới KHÔNG bị xoá (hiển thị ở nhóm "Ngoài lịch"),
 * và outOfRangeCount cho frontend hiện MSG 23.
 */
export async function updateTrip(userId, tripId, data) {
  const current = await getOwnedTripOrThrow(userId, tripId);
  const updated = await prisma.trip.update({ where: { id: current.id }, data: withoutUndefined(data) });

  const datesChanged = toDateStr(current.startDate) !== toDateStr(updated.startDate) || toDateStr(current.endDate) !== toDateStr(updated.endDate);
  const outOfRangeCount = datesChanged
    ? await prisma.itineraryItem.count({
        where: { tripId: updated.id, OR: [{ activityDate: { lt: updated.startDate } }, { activityDate: { gt: updated.endDate } }] },
      })
    : 0;

  const stats = await loadStats([updated.id]);
  return { ...toTripView(updated, stats.get(updated.id)), outOfRangeCount };
}

/** UC 16: xoá chuyến. Hoạt động và khoản chi xoá theo (cascade trong DB); chuyến đã sao chép từ chuyến này giữ nguyên. */
export async function deleteTrip(userId, tripId) {
  const trip = await getOwnedTripOrThrow(userId, tripId);
  await prisma.trip.delete({ where: { id: trip.id } });
}

function withoutUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
