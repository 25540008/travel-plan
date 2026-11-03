import multer from 'multer';
import { AppError } from '../utils/AppError.js';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (UC 17 · B4)

const receive = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } }).any();

/** Đọc multipart/form-data vào bộ nhớ. Quá 5 MB, nhiều tệp, hoặc tên trường lạ → 400 MSG 16. Tên trường: "image" (hoặc "file"). */
export function receiveImage(req, res, next) {
  receive(req, res, (err) => {
    if (err instanceof multer.MulterError) return next(AppError.badRequest('MSG 16'));
    if (err) return next(err);
    req.file = req.files?.[0];
    next();
  });
}

/** Nhận dạng ảnh theo nội dung tệp (không tin đuôi tệp hay Content-Type). Trả { ext } hoặc null. */
export function detectImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png' };
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return { ext: 'webp' };
  return null;
}

/** UC 17 · B4: chỉ nhận JPG, PNG, WebP. Sai → MSG 16. Gắn req.imageType cho bước lưu. */
export function requireValidImage(req, res, next) {
  const type = detectImageType(req.file?.buffer);
  if (!type) return next(AppError.badRequest('MSG 16'));
  req.imageType = type;
  next();
}
