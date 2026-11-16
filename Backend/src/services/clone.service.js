import prisma from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';

function getNextSaturday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
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
      clones: true,
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

  let newStart;
  if (requestedStartDate) {
    newStart = new Date(`${requestedStartDate}T00:00:00Z`);
  } else {
    newStart = getNextSaturday();
  }
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

export async function getTrendingDestinations() {
  const destinations = await prisma.destination.findMany({
    take: 8,
    include: {
      trips: {
        where: { isPublic: true },
        select: { id: true, budget: true, clones: { select: { id: true } } },
      },
    },
  });

  const ranked = destinations.map((dest) => {
    let minBudget = null;
    let totalClones = 0;

    dest.trips.forEach((tr) => {
      const b = Number(tr.budget || 0);
      if (b > 0 && (minBudget === null || b < minBudget)) {
        minBudget = b;
      }
      totalClones += tr.clones.length;
    });

    let fromPriceText = 'Từ 1,5 triệu';
    if (minBudget !== null) {
      const inMillion = (minBudget / 1000000).toFixed(1).replace('.0', '');
      fromPriceText = `Từ ${inMillion} triệu`;
    }

    return {
      id: dest.id,
      name: dest.name,
      address: dest.address,
      imageUrl: dest.imageUrl,
      description: dest.description,
      fromPrice: fromPriceText,
      totalTrips: dest.trips.length,
      score: dest.trips.length * 2 + totalClones * 3,
    };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}