import prisma from '../lib/prisma.js';
import { getOwnedTripOrThrow } from './tripAccess.service.js';

// Service chỉ làm việc với dữ liệu (Prisma), không đụng tới req/res.

export function listMyTrips(userId) {
  return prisma.trip.findMany({
    where: { userId },
    orderBy: { startDate: 'desc' },
    select: { id: true, title: true, destination: true, startDate: true, endDate: true, budget: true },
  });
}

export function createTrip(userId, data) {
  return prisma.trip.create({ data: { ...data, userId } });
}

export function getMyTrip(userId, tripId) {
  return getOwnedTripOrThrow(userId, tripId);
}
