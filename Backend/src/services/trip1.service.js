import prisma from '../lib/prisma.js';
import { getOwnedTripOrThrow } from './tripAccess.service.js';

// GET /api/trips/:id
export async function getTripById(userId, tripId) {
  return await getOwnedTripOrThrow(userId, Number(tripId));
}

// PUT /api/trips/:id (UC 15, UC 18)
export async function updateTrip(userId, tripId, updateData) {
  const numericId = Number(tripId);
  await getOwnedTripOrThrow(userId, numericId);

  const dataToUpdate = {};
  if (updateData.title !== undefined) dataToUpdate.title = updateData.title;
  if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
  if (updateData.destination !== undefined) dataToUpdate.destination = updateData.destination;
  if (updateData.destinationId !== undefined) dataToUpdate.destinationId = updateData.destinationId;
  if (updateData.destination_id !== undefined) dataToUpdate.destinationId = updateData.destination_id;
  if (updateData.start_date !== undefined) dataToUpdate.startDate = new Date(updateData.start_date);
  if (updateData.end_date !== undefined) dataToUpdate.endDate = new Date(updateData.end_date);
  if (updateData.budget !== undefined) dataToUpdate.budget = updateData.budget;

  if (updateData.public_trip !== undefined) dataToUpdate.isPublic = Boolean(updateData.public_trip);
  if (updateData.publicTrip !== undefined) dataToUpdate.isPublic = Boolean(updateData.publicTrip);
  if (updateData.isPublic !== undefined) dataToUpdate.isPublic = Boolean(updateData.isPublic);

  const updated = await prisma.trip.update({
    where: { id: numericId },
    data: dataToUpdate,
  });

  return updated;
}

// DELETE /api/trips/:id (UC 16, BR 54)
export async function deleteTrip(userId, tripId) {
  const numericId = Number(tripId);
  await getOwnedTripOrThrow(userId, numericId);

  // BR 54: Xóa cascade dữ liệu con liên quan
  await prisma.$transaction([
    prisma.itineraryItem.deleteMany({ where: { tripId: numericId } }),
    prisma.expense.deleteMany({ where: { tripId: numericId } }),
    prisma.trip.delete({ where: { id: numericId } }),
  ]);

  return { message: 'Đã xóa chuyến đi.' };
}