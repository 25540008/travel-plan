import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError.js';

export function notFound(req, res, next) {
  next(AppError.notFound(`Không có API ${req.method} ${req.originalUrl}`));
}

function normalize(err) {
  if (err instanceof AppError) return err;
  // JSON gửi lên bị lỗi cú pháp
  if (err.type === 'entity.parse.failed') return AppError.badRequest('MSG 3');
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return AppError.notFound();
    if (err.code === 'P2002') return new AppError(409, 'CONFLICT', 'Dữ liệu đã tồn tại.');
  }
  return null;
}

export function errorHandler(err, req, res, next) {
  const appErr = normalize(err);
  if (!appErr) {
    console.error(err);
    return res.status(500).json({ code: 'SERVER_ERROR', message: 'Hệ thống đang bận, vui lòng thử lại sau.' });
  }
  const body = { code: appErr.code, message: appErr.message };
  if (appErr.errors) body.errors = appErr.errors;
  res.status(appErr.status).json(body);
}
