// UC 6 Tìm lịch trình từ Trang chủ, UC 7 Xem và lọc lịch trình mẫu. Công khai, không cần đăng nhập.
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { MSG } from '../utils/messages.js';
import * as controller from '../controllers/publicItineraries.controller.js';

const router = Router();

const BAD_FORMAT = `MSG 3|${MSG['MSG 3']}`;
const emptyToUndefined = (v) => (v === '' ? undefined : v);

/** Số nguyên trong khoảng [min, max]; để trống thì dùng mặc định (hoặc bỏ qua nếu không có mặc định). */
const intParam = (min, max, fallback) => {
  const base = z.coerce.number({ error: BAD_FORMAT }).int(BAD_FORMAT).min(min, BAD_FORMAT).max(max, BAD_FORMAT);
  return z.preprocess(emptyToUndefined, fallback === undefined ? base.optional() : base.default(fallback));
};

/** ?tag=BEACH,FOOD hoặc ?tag=BEACH&tag=FOOD → ['BEACH', 'FOOD'] (chọn nhiều, điều kiện HOẶC). */
const tagList = z.preprocess(
  (v) => {
    if (v === undefined || v === '') return undefined;
    const parts = (Array.isArray(v) ? v : [v]).flatMap((s) => String(s).split(','));
    return parts.map((s) => s.trim().toUpperCase()).filter(Boolean);
  },
  z
    .array(z.string().regex(/^[A-Z0-9_]{1,30}$/, BAD_FORMAT), { error: BAD_FORMAT })
    .max(10, BAD_FORMAT)
    .optional(),
);

const listQuery = z.object({
  page: intParam(1, 10000, 1),
  size: intParam(1, 50, 12), // Screen 2: 12 thẻ mỗi trang; Trang chủ gọi size=6
  destination: z.preprocess(
    emptyToUndefined,
    z
      .string({ error: BAD_FORMAT })
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, BAD_FORMAT)
      .max(100, BAD_FORMAT)
      .optional(),
  ),
  tag: tagList,
  // 1, 2, 3 = đúng số ngày; từ 4 trở lên = "4 ngày+"
  days: intParam(1, 365),
  budgetMax: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: BAD_FORMAT })
      .refine(Number.isFinite, BAD_FORMAT)
      .positive(BAD_FORMAT)
      .max(9_999_999_999_999, BAD_FORMAT)
      .optional(),
  ),
  sort: z.preprocess(
    (v) => (v === '' ? undefined : typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.enum(['popular', 'newest', 'cheapest'], { error: BAD_FORMAT }).default('popular'),
  ),
});

router.get('/', validate({ query: listQuery }), controller.list);

export default router;
