// UC 17 Đổi ảnh bìa: PUT /api/trips/:id/cover (màu hoặc link) và POST /api/trips/:id/cover/upload (tải tệp).
import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { receiveImage, requireValidImage } from '../middlewares/upload.js';
import { getOwnedTripOrThrow } from '../services/tripAccess.service.js';
import { idParam } from '../utils/validators.js';
import { MSG, tooLong } from '../utils/messages.js';
import * as controller from '../controllers/tripCover.controller.js';

const router = Router({ mergeParams: true });

const m = (code, text) => `${code}|${text}`;
const BAD_FORMAT = m('MSG 3', MSG['MSG 3']);

const isHttpUrl = (s) => {
  try {
    return ['http:', 'https:'].includes(new URL(s).protocol);
  } catch {
    return false;
  }
};

// Màu: tên (purple, pine...) hoặc mã #RRGGBB, tối đa 30 ký tự (cột cover_color).
const colorField = z
  .string({ error: BAD_FORMAT })
  .trim()
  .max(30, m('MSG 30', tooLong('Màu bìa', 30)))
  .regex(/^(#[0-9a-fA-F]{6}|[a-zA-Z][a-zA-Z0-9-]*)$/, BAD_FORMAT)
  .optional();

const imageUrlField = z
  .string({ error: BAD_FORMAT })
  .trim()
  .max(500, m('MSG 30', tooLong('Link ảnh', 500)))
  .refine(isHttpUrl, BAD_FORMAT)
  .optional();

// Phải gửi đúng một trong hai: color hoặc imageUrl.
const coverBody = z
  .object({ color: colorField, imageUrl: imageUrlField })
  .refine((v) => Boolean(v.color) !== Boolean(v.imageUrl), {
    path: ['imageUrl'],
    error: m('MSG 3', 'Chọn một màu hoặc dán một link ảnh.'),
    when: ({ issues }) => issues.length === 0,
  });

const idParams = z.object({ id: idParam });

/** CBR 8: kiểm tra chuyến thuộc người dùng TRƯỚC khi nhận tệp, để người lạ nhận 404 chứ không phải lỗi tệp. */
async function ownTrip(req, res, next) {
  await getOwnedTripOrThrow(req.user.id, req.valid.params.id);
  next();
}

router.use(auth);
router.put('/', validate({ params: idParams, body: coverBody }), controller.setCover);
router.post('/upload', validate({ params: idParams }), ownTrip, receiveImage, requireValidImage, controller.upload);

export default router;
