import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/AppError.js';

/**
 * UC 4 · B5 (BR 14): tối đa 3 yêu cầu cho một email trong 15 phút, vượt → 429 MSG 9.
 * Tính theo email (đã chuẩn hóa chữ thường ở bước validate) và tính cả email không tồn tại để không lộ email nào có tài khoản.
 * Bộ đếm nằm trong bộ nhớ (đủ cho một instance Render).
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  keyGenerator: (req) => `forgot:${req.valid?.body?.email ?? 'unknown'}`,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next) => next(new AppError(429, 'MSG 9')),
});
