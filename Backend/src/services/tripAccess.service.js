import prisma from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';

/**
 * CBR 8: mọi API /api/trips/** gọi hàm này trước. Chuyến không có hoặc không thuộc
 * người dùng trong JWT đều trả 404 để không lộ chuyến tồn tại.
 */
export async function getOwnedTripOrThrow(userId, tripId, options = {}) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId }, ...options });
  if (!trip) throw AppError.notFound('Không tìm thấy chuyến đi.');
  return trip;
}
