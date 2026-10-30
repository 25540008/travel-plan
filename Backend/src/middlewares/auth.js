import { AppError } from '../utils/AppError.js';
import { verifyToken } from '../utils/jwt.js';

function readToken(req) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/** Bắt buộc đăng nhập: đọc Bearer JWT, gắn req.user = { id, role }. Thiếu/sai/hết hạn → 401 MSG 10. */
export function auth(req, res, next) {
  const token = readToken(req);
  if (!token) return next(AppError.unauthorized());
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(AppError.unauthorized());
  }
}

/** Không bắt buộc đăng nhập (trang công khai): có token hợp lệ thì gắn req.user, không thì bỏ qua. */
export function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      // token hỏng ở trang công khai: coi như khách
    }
  }
  next();
}

/** Dùng sau auth: requireRole('ADMIN'). */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
}
