import prisma from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';

function parseTimeString(hhmm) {
  return new Date(`1970-01-01T${hhmm}:00Z`);
}

function formatTimeString(dateObj) {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Decimal (Prisma) → số, hoặc null khi chưa có toạ độ. */
const toCoord = (v) => (v == null ? null : Number(v));

function parseId(id) {
  if (!id || id === 'undefined' || isNaN(Number(id))) {
    throw AppError.notFound();
  }
  return Number(id);
}

async function verifyTripOwnership(tripId, userId) {
  const tId = parseId(tripId);
  const uId = parseId(userId);

  const trip = await prisma.trip.findUnique({
    where: { id: tId },
  });

  if (!trip || Number(trip.userId) !== uId) {
    throw AppError.notFound();
  }
  return trip;
}

function detectOverlaps(items) {
  return items.map((item) => {
    const overlappingWith = items.filter(
      (other) =>
        other.id !== item.id &&
        item.startTime < other.endTime &&
        other.startTime < item.endTime
    );

    return {
      ...item,
      isOverlapped: overlappingWith.length > 0,
      overlappingTitles: overlappingWith.map((o) => o.activity),
      warning:
        overlappingWith.length > 0
          ? `Trùng giờ với ${overlappingWith.map((o) => `${o.activity} (${o.startTime} - ${o.endTime})`).join(', ')}`
          : null,
    };
  });
}

export async function getTripItinerary(tripId, userId, queryDate) {
  const tId = parseId(tripId);
  await verifyTripOwnership(tId, userId);

  const whereCondition = { tripId: tId };
  if (queryDate) {
    whereCondition.activityDate = new Date(`${queryDate}T00:00:00Z`);
  }

  const rawItems = await prisma.itineraryItem.findMany({
    where: whereCondition,
    orderBy: [
      { activityDate: 'asc' },
      { startTime: 'asc' },
    ],
  });

  const formattedItems = rawItems.map((item) => ({
    id: item.id,
    tripId: item.tripId,
    activityDate: item.activityDate.toISOString().split('T')[0],
    startTime: formatTimeString(item.startTime),
    endTime: formatTimeString(item.endTime),
    activity: item.activity,
    location: item.location,
    note: item.note,
    latitude: toCoord(item.latitude),
    longitude: toCoord(item.longitude),
    createdAt: item.createdAt,
  }));

  const groupedByDate = {};
  formattedItems.forEach((item) => {
    if (!groupedByDate[item.activityDate]) groupedByDate[item.activityDate] = [];
    groupedByDate[item.activityDate].push(item);
  });

  let enrichedItems = [];
  Object.keys(groupedByDate).forEach((dateKey) => {
    enrichedItems = enrichedItems.concat(detectOverlaps(groupedByDate[dateKey]));
  });

  return enrichedItems;
}

export async function addItineraryItem(tripId, userId, data) {
  const tId = parseId(tripId);
  await verifyTripOwnership(tId, userId);

  const targetDate = new Date(`${data.activityDate}T00:00:00Z`);
  const startTimeObj = parseTimeString(data.startTime);
  const endTimeObj = parseTimeString(data.endTime);

  const newItem = await prisma.itineraryItem.create({
    data: {
      tripId: tId,
      activityDate: targetDate,
      startTime: startTimeObj,
      endTime: endTimeObj,
      activity: data.activity,
      location: data.location ?? null,
      note: data.note ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    },
  });

  const sameDayItems = await prisma.itineraryItem.findMany({
    where: {
      tripId: tId,
      activityDate: targetDate,
      id: { not: newItem.id },
    },
  });

  const formattedSameDay = sameDayItems.map((it) => ({
    ...it,
    startTime: formatTimeString(it.startTime),
    endTime: formatTimeString(it.endTime),
  }));

  const overlappingWith = formattedSameDay.filter(
    (o) => data.startTime < o.endTime && o.startTime < data.endTime
  );

  return {
    id: newItem.id,
    tripId: newItem.tripId,
    activityDate: data.activityDate,
    startTime: data.startTime,
    endTime: data.endTime,
    activity: newItem.activity,
    location: newItem.location,
    note: newItem.note,
    latitude: toCoord(newItem.latitude),
    longitude: toCoord(newItem.longitude),
    messageCode: 'MSG 21',
    warning:
      overlappingWith.length > 0
        ? `Trùng giờ với ${overlappingWith.map((o) => `${o.activity} (${o.startTime} - ${o.endTime})`).join(', ')}`
        : null,
  };
}

export async function updateItineraryItem(tripId, itemId, userId, updateData) {
  const tId = parseId(tripId);
  const itId = parseId(itemId);

  await verifyTripOwnership(tId, userId);

  const existing = await prisma.itineraryItem.findUnique({
    where: { id: itId },
  });

  if (!existing || Number(existing.tripId) !== tId) {
    throw AppError.notFound();
  }

  const startTimeStr = updateData.startTime ?? formatTimeString(existing.startTime);
  const endTimeStr = updateData.endTime ?? formatTimeString(existing.endTime);
  if (endTimeStr <= startTimeStr) {
    throw AppError.badRequest('MSG 8', 'Giờ kết thúc phải sau giờ bắt đầu.');
  }

  const payload = {};
  if (updateData.activityDate) payload.activityDate = new Date(`${updateData.activityDate}T00:00:00Z`);
  if (updateData.startTime) payload.startTime = parseTimeString(updateData.startTime);
  if (updateData.endTime) payload.endTime = parseTimeString(updateData.endTime);
  if (updateData.activity !== undefined) payload.activity = updateData.activity;
  if (updateData.location !== undefined) payload.location = updateData.location;
  if (updateData.note !== undefined) payload.note = updateData.note;
  if (updateData.latitude !== undefined) payload.latitude = updateData.latitude;
  if (updateData.longitude !== undefined) payload.longitude = updateData.longitude;

  const updated = await prisma.itineraryItem.update({
    where: { id: itId },
    data: payload,
  });

  return {
    id: updated.id,
    tripId: updated.tripId,
    activityDate: updated.activityDate.toISOString().split('T')[0],
    startTime: formatTimeString(updated.startTime),
    endTime: formatTimeString(updated.endTime),
    activity: updated.activity,
    location: updated.location,
    note: updated.note,
    latitude: toCoord(updated.latitude),
    longitude: toCoord(updated.longitude),
    messageCode: 'MSG 34',
  };
}

export async function deleteItineraryItem(tripId, itemId, userId) {
  const tId = parseId(tripId);
  const itId = parseId(itemId);

  await verifyTripOwnership(tId, userId);

  const existing = await prisma.itineraryItem.findUnique({
    where: { id: itId },
  });

  if (!existing || Number(existing.tripId) !== tId) {
    throw AppError.notFound();
  }

  await prisma.itineraryItem.delete({
    where: { id: itId },
  });

  return { success: true };
}
