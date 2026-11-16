import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { toSlug } from '../utils/slug.js';

// MSG 14 chưa có trong utils/messages.js (file chung) nên giữ tại đây.
const MSG_14 = 'Chưa có lịch trình phù hợp. Bạn có muốn tự lên kế hoạch?';
// Bảng trips ở Sprint 2 chưa có cột tags. Khi nhóm thêm cột này vào schema, lọc/hiển thị tag tự bật.
const TAGS_SUPPORTED = Boolean(Prisma?.TripScalarFieldEnum?.tags);

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CANDIDATES = 1000; // số chuyến công khai tối đa xét một lần (đủ cho quy mô đồ án)
const PREVIEW_DAYS = 3; // thẻ hiện 3 ngày đầu tiên của lịch trình
const PREVIEW_ACTIVITIES = 3; // mỗi ngày hiện tối đa 3 hoạt động

const iso = (d) => new Date(d).toISOString().slice(0, 10);
const dayNumber = (start, date) => Math.round((new Date(date) - new Date(start)) / DAY_MS) + 1;

/** "Nguyễn Văn An" → "Văn An": thẻ chỉ hiện 2 chữ cuối của họ tên. */
function shortName(fullName = '') {
  return fullName.trim().split(/\s+/).slice(-2).join(' ');
}

/** 1 ngày → "1 ngày"; n ngày → "nNn-1Đ" (3 ngày → "3N2Đ"). */
function durationLabel(days) {
  return days <= 1 ? '1 ngày' : `${days}N${days - 1}Đ`;
}

/** CBR: lọc điểm đến theo slug (da-lat). Slug không khớp điểm đến nào thì tìm theo chữ trong tên chuyến. */
async function destinationFilter(slug) {
  const all = await prisma.destination.findMany({ select: { id: true, name: true } });
  const matched = all.filter((d) => toSlug(d.name) === slug);
  if (!matched.length) {
    return { destination: { contains: slug.replace(/-/g, ' '), mode: 'insensitive' } };
  }
  return {
    OR: [
      { destinationId: { in: matched.map((d) => d.id) } },
      ...matched.map((d) => ({ destination: { equals: d.name, mode: 'insensitive' } })),
    ],
  };
}

const SORTERS = {
  popular: (a, b) => b.cloneCount - a.cloneCount || b.createdAt - a.createdAt || b.id - a.id,
  newest: (a, b) => b.createdAt - a.createdAt || b.id - a.id,
  cheapest: (a, b) => a.budget - b.budget || b.id - a.id,
};

/** Với mỗi chuyến trong trang: 3 ngày đầu có hoạt động, mỗi ngày tối đa 3 hoạt động. Hoạt động ngoài khoảng ngày bị bỏ qua. */
async function loadPreviews(trips) {
  if (!trips.length) return new Map();
  const items = await prisma.itineraryItem.findMany({
    where: { tripId: { in: trips.map((t) => t.id) } },
    select: { tripId: true, activityDate: true, startTime: true, activity: true },
    orderBy: [{ activityDate: 'asc' }, { startTime: 'asc' }],
  });
  const byTrip = new Map(trips.map((t) => [t.id, { trip: t, days: new Map(), count: 0 }]));
  for (const it of items) {
    const entry = byTrip.get(it.tripId);
    if (!entry) continue;
    entry.count += 1;
    const n = dayNumber(entry.trip.startDate, it.activityDate);
    if (n < 1 || n > entry.trip.days) continue;
    if (!entry.days.has(n)) entry.days.set(n, { day: n, date: iso(it.activityDate), activities: [] });
    const bucket = entry.days.get(n);
    if (bucket.activities.length < PREVIEW_ACTIVITIES) bucket.activities.push(it.activity);
  }
  return byTrip;
}

/**
 * UC 6, UC 7: lịch trình công khai (trip.isPublic) kèm bộ lọc và phân trang.
 * Trả { items, page, size, total, hasMore }; không có kết quả thì thêm code/message MSG 14 để frontend hiện trạng thái rỗng.
 */
export async function listPublicItineraries({ page, size, destination, tag, days, budgetMax, sort }) {
  const where = { isPublic: true };
  if (budgetMax !== undefined) where.budget = { lte: budgetMax };
  if (TAGS_SUPPORTED && tag?.length) where.tags = { hasSome: tag };
  if (destination) Object.assign(where, await destinationFilter(destination));

  const rows = await prisma.trip.findMany({
    where,
    select: {
      id: true,
      title: true,
      destination: true,
      coverImage: true,
      coverColor: true,
      startDate: true,
      endDate: true,
      budget: true,
      ...(TAGS_SUPPORTED ? { tags: true } : {}),
      createdAt: true,
      user: { select: { fullName: true } },
      _count: { select: { clones: true } },
    },
    take: MAX_CANDIDATES,
  });

  // Số ngày tính từ ngày đi đến ngày về nên lọc ở đây thay vì trong SQL.
  let trips = rows.map((t) => ({
    ...t,
    budget: Number(t.budget),
    cloneCount: t._count?.clones ?? 0,
    days: Math.round((new Date(t.endDate) - new Date(t.startDate)) / DAY_MS) + 1,
  }));
  if (days !== undefined) trips = trips.filter((t) => (days >= 4 ? t.days >= 4 : t.days === days));

  trips.sort(SORTERS[sort]);

  const total = trips.length;
  const pageTrips = trips.slice((page - 1) * size, page * size);
  const previews = await loadPreviews(pageTrips);

  const result = {
    items: pageTrips.map((t) => {
      const p = previews.get(t.id);
      return {
        id: t.id,
        title: t.title,
        destination: t.destination,
        coverImage: t.coverImage,
        coverColor: t.coverColor,
        tags: t.tags ?? [],
        days: t.days,
        durationLabel: durationLabel(t.days),
        budget: t.budget,
        cloneCount: t.cloneCount,
        creatorName: shortName(t.user?.fullName),
        itemCount: p?.count ?? 0,
        previewDays: [...(p?.days.values() ?? [])].sort((a, b) => a.day - b.day).slice(0, PREVIEW_DAYS),
        createdAt: t.createdAt,
      };
    }),
    page,
    size,
    total,
    hasMore: page * size < total,
  };

  if (total === 0) {
    result.code = 'MSG 14';
    result.message = MSG_14;
  }
  return result;
}
