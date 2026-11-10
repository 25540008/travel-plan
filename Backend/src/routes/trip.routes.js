import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { requiredText, dateOnly, idParam } from '../utils/validators.js';
import { MSG, required, tooLong } from '../utils/messages.js';
import * as controller from '../controllers/trip.controller.js';

const router = Router();

// Message có dạng "<mã MSG>|<nội dung>" để middleware validate tách ra code và message.
const m = (code, text) => `${code}|${text}`;
const BAD_FORMAT = m('MSG 3', MSG['MSG 3']);
const MAX_MONEY = 9_999_999_999_999; // cột Decimal(15, 2)

/** Chuỗi không bắt buộc, tối đa max ký tự (MSG 30). Không gửi = giữ nguyên; gửi null hoặc rỗng = xoá. */
const nullableText = (label, max) =>
  z
    .string({ error: BAD_FORMAT })
    .trim()
    .max(max, m('MSG 30', tooLong(label, max)))
    .nullish()
    .transform((v) => (v === '' ? null : v));

/** Vĩ độ, kinh độ (từ gợi ý Nominatim): nhận số hoặc chuỗi số; không gửi = giữ nguyên, null hoặc rỗng = xoá. */
const coordinate = (min, max) =>
  z
    .unknown()
    .superRefine((v, ctx) => {
      if (v === undefined || v === null || v === '') return;
      const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.trim()) : NaN;
      if (!Number.isFinite(n) || n < min || n > max) ctx.addIssue({ code: 'custom', message: BAD_FORMAT });
    })
    .transform((v) => (v === null || v === '' ? null : Number(String(v).trim())))
    .optional();

function parseMoney(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim())) return Number(v.trim());
  return NaN;
}

/** CBR 2: [Ngân sách] bắt buộc (MSG 29), phải là số (MSG 3) và > 0 (MSG 33). */
const budgetField = z
  .unknown()
  .superRefine((v, ctx) => {
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
      ctx.addIssue({ code: 'custom', message: m('MSG 29', required('Ngân sách dự kiến')) });
      return;
    }
    const n = parseMoney(v);
    if (!Number.isFinite(n) || n > MAX_MONEY) ctx.addIssue({ code: 'custom', message: BAD_FORMAT });
    else if (n <= 0) ctx.addIssue({ code: 'custom', message: m('MSG 33', MSG['MSG 33']) });
  })
  .transform(parseMoney);

// CBR 1 + CBR 2. Dùng chung cho tạo (UC 14) và sửa (UC 15), vì Screen 6 là một form cho cả hai.
const tripBody = z
  .object({
    title: requiredText('Tên chuyến đi', 150),
    destination: requiredText('Điểm đến', 150),
    startDate: dateOnly('Ngày đi'),
    endDate: dateOnly('Ngày về'),
    budget: budgetField,
    description: nullableText('Mô tả', 1000),
    address: nullableText('Địa chỉ', 255),
    latitude: coordinate(-90, 90),
    longitude: coordinate(-180, 180),
    isPublic: z.boolean({ error: BAD_FORMAT }).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    path: ['endDate'],
    error: m('MSG 32', MSG['MSG 32']),
    // Vẫn báo MSG 32 khi ô khác có lỗi, miễn hai ngày đều hợp lệ.
    when: ({ value, issues }) =>
      value?.startDate instanceof Date &&
      value?.endDate instanceof Date &&
      !issues.some((i) => i.path[0] === 'startDate' || i.path[0] === 'endDate'),
  });

const idParams = z.object({ id: idParam });

// Danh sách: ?status=UPCOMING|ONGOING|PAST (bỏ trống = Tất cả) và ?q= (tìm theo tên chuyến hoặc điểm đến, không phân biệt dấu).
const listQuery = z.object({
  status: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string({ error: BAD_FORMAT })
      .trim()
      .transform((s) => s.toUpperCase())
      .pipe(z.enum(['UPCOMING', 'ONGOING', 'PAST'], { error: BAD_FORMAT }))
      .optional(),
  ),
  q: z
    .string({ error: BAD_FORMAT })
    .trim()
    .max(150, m('MSG 30', tooLong('Từ khoá', 150)))
    .optional()
    .transform((v) => v || undefined),
});

const tripIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'MSG 3|ID không hợp lệ' }),
  }),
};

// 2. Schema cho PUT /api/trips/:id (truyền dưới dạng { params: ..., body: ... })
const updateTripSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'MSG 3|ID không hợp lệ' }),
  }),
  body: z.object({
    title: z.string().max(150, { message: 'MSG 30|Tên chuyến đi tối đa 150 ký tự' }).optional(),
    description: z.string().max(1000, { message: 'MSG 30|Mô tả tối đa 1000 ký tự' }).optional(),
    destination: z.string().max(150, { message: 'MSG 30|Điểm đến tối đa 150 ký tự' }).optional(),
    // CBR 2: Ngân sách > 0, nếu <= 0 trả về MSG 33
    budget: z.number().positive({ message: 'MSG 33|Ngân sách phải lớn hơn 0' }).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    public_trip: z.boolean().optional(),
    publicTrip: z.boolean().optional(),
    isPublic: z.boolean().optional(),
  }).refine((data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.end_date) >= new Date(data.start_date);
    }
    return true;
  }, {
    message: 'MSG 32|Ngày về phải bằng hoặc sau ngày đi',
    path: ['end_date'],
  }),
};

router.get('/:id', auth, validate(tripIdParamSchema), tripController.getTrip);
router.put('/:id', auth, validate(updateTripSchema), tripController.updateTrip);
router.delete('/:id', auth, validate(tripIdParamSchema), tripController.deleteTrip);
router.use(auth);
router.get('/', validate({ query: listQuery }), controller.list);
router.post('/', validate({ body: tripBody }), controller.create);
router.get('/:id', validate({ params: idParams }), controller.detail);
router.put('/:id', validate({ params: idParams, body: tripBody }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);

export default router;
