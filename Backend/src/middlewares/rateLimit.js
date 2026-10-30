import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/AppError.js';

/**
 * UC 2 · B5 / NFR 4: tối đa 10 lần đăng nhập sai trên một IP trong 15 phút.
 * Chỉ tính các lần trả 401 (sai email/mật khẩu); đăng nhập đúng hoặc lỗi 400 không bị tính.
 * Vượt giới hạn → 429 MSG 9. Bộ đếm nằm trong bộ nhớ (đủ cho một instance Render).
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) => res.statusCode !== 401,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next) => next(new AppError(429, 'MSG 9')),
});
