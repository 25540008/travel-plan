import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { getOwnedTripOrThrow } from './tripAccess.service.js';

// UC 17 · B5: đặt ảnh thì xoá màu bìa và ngược lại. Tệp tải lên được đổi tên ngẫu nhiên.

const COVER_URL_PREFIX = '/uploads/covers/';
const coverDir = () => path.join(env.uploadDir, 'covers');

/** Chỉ xoá tệp do chính hệ thống lưu (đường dẫn /uploads/covers/...), không đụng tới link ảnh bên ngoài. */
async function removeOldUpload(coverImage) {
  if (!coverImage?.startsWith(COVER_URL_PREFIX)) return;
  // basename chặn kiểu "../" thoát khỏi thư mục ảnh bìa.
  await fs.rm(path.join(coverDir(), path.basename(coverImage)), { force: true }).catch(() => {});
}

const cover = (t) => ({ id: t.id, coverImage: t.coverImage ?? null, coverColor: t.coverColor ?? null });

/** PUT /api/trips/:id/cover: chọn màu hoặc dán link ảnh. */
export async function setCover(userId, tripId, { color, imageUrl }) {
  const trip = await getOwnedTripOrThrow(userId, tripId);
  const data = color ? { coverColor: color, coverImage: null } : { coverImage: imageUrl, coverColor: null };
  const updated = await prisma.trip.update({ where: { id: trip.id }, data });
  if (updated.coverImage !== trip.coverImage) await removeOldUpload(trip.coverImage);
  return cover(updated);
}

/** POST /api/trips/:id/cover/upload: lưu ảnh đã qua kiểm tra, tên tệp ngẫu nhiên. */
export async function uploadCover(userId, tripId, { buffer, ext }) {
  const trip = await getOwnedTripOrThrow(userId, tripId);
  const fileName = `${crypto.randomUUID()}.${ext}`;
  await fs.mkdir(coverDir(), { recursive: true });
  await fs.writeFile(path.join(coverDir(), fileName), buffer);

  let updated;
  try {
    updated = await prisma.trip.update({ where: { id: trip.id }, data: { coverImage: `${COVER_URL_PREFIX}${fileName}`, coverColor: null } });
  } catch (err) {
    await fs.rm(path.join(coverDir(), fileName), { force: true }).catch(() => {});
    throw err;
  }
  await removeOldUpload(trip.coverImage);
  return cover(updated);
}
