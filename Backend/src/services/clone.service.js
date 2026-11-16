import prisma from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Ho_Chi_Minh, không có giờ mùa hè

/** Thứ Bảy gần nhất theo giờ Việt Nam (hôm nay là thứ Bảy thì lấy thứ Bảy tuần sau), dạng Date 00:00 UTC như cột @db.Date. */
export function nextSaturday(now = new Date()) {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  const today = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate());
  const diff = (6 - vn.getUTCDay() + 7) % 7 || 7;
  return new Date(today + diff * DAY_MS);
}

export async function cloneTrip(originalTripId, userId, requestedStartDate) {
  const tripId = Number(originalTripId);
  const currentUserId = Number(userId);

  const originalTrip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      items: {
        orderBy: [{ activityDate: 'asc' }, { startTime: 'asc' }],
      },
    },
  });

  if (!originalTrip) {
    throw AppError.notFound('Chuyến đi không tồn tại');
  }

  if (!originalTrip.isPublic && originalTrip.userId !== currentUserId) {
    throw AppError.notFound('Chuyến đi không tồn tại hoặc không được phép sao chép');
  }

  const origStart = new Date(originalTrip.startDate);
  const origEnd = new Date(originalTrip.endDate);
  const durationMs = origEnd.getTime() - origStart.getTime();

  // startDate đã được validate (YYYY-MM-DD hợp lệ) và đổi sang Date ở clone.validation.js
  const newStart = requestedStartDate ?? nextSaturday();
  const newEnd = new Date(newStart.getTime() + durationMs);
  const offsetTime = newStart.getTime() - origStart.getTime();

  const newTrip = await prisma.$transaction(async (tx) => {
    const createdTrip = await tx.trip.create({
      data: {
        userId: currentUserId,
        destinationId: originalTrip.destinationId,
        title: originalTrip.title,
        destination: originalTrip.destination,
        address: originalTrip.address,
        latitude: originalTrip.latitude,
        longitude: originalTrip.longitude,
        startDate: newStart,
        endDate: newEnd,
        budget: originalTrip.budget,
        description: originalTrip.description,
        coverImage: originalTrip.coverImage,
        coverColor: originalTrip.coverColor,
        tags: originalTrip.tags,
        isPublic: false,
        clonedFromId: originalTrip.id,
        aiItinerary: originalTrip.aiItinerary,
      },
    });

    if (originalTrip.items && originalTrip.items.length > 0) {
      const itemsToCreate = originalTrip.items.map((item) => {
        const origItemDate = new Date(item.activityDate);
        const newItemDate = new Date(origItemDate.getTime() + offsetTime);

        return {
          tripId: createdTrip.id,
          activityDate: newItemDate,
          startTime: item.startTime,
          endTime: item.endTime,
          activity: item.activity,
          location: item.location,
          note: item.note,
          latitude: item.latitude,
          longitude: item.longitude,
        };
      });

      await tx.itineraryItem.createMany({
        data: itemsToCreate,
      });
    }

    return createdTrip;
  });

  return {
    trip: newTrip,
    messageCode: 'MSG 31',
    message: 'Đã tạo bản sao, bạn có thể sửa thoải mái.',
  };
}

const TRENDING_LIMIT = 8;
const TRENDING_WINDOW_DAYS = 7;

/**
 * Screen 1 "Cuối tuần này đi đâu ta?": xếp hạng TẤT CẢ điểm đến theo số chuyến công khai mới tạo
 * và số lượt dùng lại trong 7 ngày gần nhất, rồi mới lấy 8 mục đầu.
 * fromPrice = ngân sách thấp nhất của chuyến công khai (số VND, null nếu chưa có) để frontend tự định dạng "Từ x triệu".
 */
export async function getTrendingDestinations(now = new Date()) {
  const since = new Date(now.getTime() - TRENDING_WINDOW_DAYS * DAY_MS);
  const destinations = await prisma.destination.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      imageUrl: true,
      description: true,
      trips: {
        where: { isPublic: true },
        select: {
          budget: true,
          createdAt: true,
          clones: { where: { createdAt: { gte: since } }, select: { id: true } },
        },
      },
    },
  });

  const ranked = destinations.map((dest) => {
    const budgets = dest.trips.map((t) => Number(t.budget)).filter((b) => b > 0);
    const recentTrips = dest.trips.filter((t) => t.createdAt >= since).length;
    const recentClones = dest.trips.reduce((sum, t) => sum + t.clones.length, 0);
    return {
      id: dest.id,
      name: dest.name,
      address: dest.address,
      imageUrl: dest.imageUrl,
      description: dest.description,
      fromPrice: budgets.length ? Math.min(...budgets) : null,
      itineraryCount: dest.trips.length,
      recentTrips,
      recentClones,
      score: recentTrips * 2 + recentClones * 3,
    };
  });

  // Hoà điểm thì điểm đến có nhiều lịch trình công khai hơn đứng trước, rồi theo id cho ổn định.
  ranked.sort((a, b) => b.score - a.score || b.itineraryCount - a.itineraryCount || a.id - b.id);
  return ranked.slice(0, TRENDING_LIMIT);
}
