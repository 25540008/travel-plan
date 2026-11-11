import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { requiredText, dateOnly, idParam } from '../utils/validators.js';
import { MSG, required, tooLong } from '../utils/messages.js';
import * as controller from '../controllers/trip.controller.js';
import * as cloneController from '../controllers/clone.controller.js';

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
const tripFields = z.object({
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
  // Liên kết tới điểm đến có sẵn (Screen 4); null = bỏ liên kết. Id không tồn tại → 400 MSG 3 (errorHandler, P2003).
  destinationId: z.number({ error: BAD_FORMAT }).int(BAD_FORMAT).positive(BAD_FORMAT).nullable().optional(),
});

const endAfterStart = {
  path: ['endDate'],
  error: m('MSG 32', MSG['MSG 32']),
  // Vẫn báo MSG 32 khi ô khác có lỗi, miễn hai ngày đều hợp lệ.
  when: ({ value, issues }) =>
    value?.startDate instanceof Date &&
    value?.endDate instanceof Date &&
    !issues.some((i) => i.path[0] === 'startDate' || i.path[0] === 'endDate'),
};

// UC 14: tạo chuyến cần đủ các trường bắt buộc (CBR 1 + CBR 2).
const tripBody = tripFields.refine((v) => v.endDate >= v.startDate, endAfterStart);

// UC 15 + UC 18: sửa chuyến chỉ gửi trường cần đổi (ví dụ popup Chia sẻ chỉ gửi { isPublic }).
// Trường đã gửi vẫn kiểm tra như khi tạo; nếu chỉ đổi một trong hai ngày, service so với ngày còn lại trong DB.
const tripPatchBody = tripFields
  .partial()
  .refine((v) => !(v.startDate && v.endDate) || v.endDate >= v.startDate, endAfterStart);

const idParams = z.object({ id: idParam });

// TP-21 (Hà): PUT nhận thêm tên trường dạng snake_case / cũ để client cũ vẫn chạy:
// public_trip, publicTrip → isPublic; start_date → startDate; end_date → endDate; destination_id → destinationId.
// Tên chuẩn (camelCase) được ưu tiên nếu client gửi cả hai.
const LEGACY_KEYS = {
  public_trip: 'isPublic',
  publicTrip: 'isPublic',
  start_date: 'startDate',
  end_date: 'endDate',
  destination_id: 'destinationId',
};

function acceptLegacyKeys(req, res, next) {
  const body = req.body;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    for (const [legacy, key] of Object.entries(LEGACY_KEYS)) {
      if (!(legacy in body)) continue;
      if (body[key] === undefined) body[key] = body[legacy];
      delete body[legacy];
    }
  }
  next();
}

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

router.use(auth);
router.get('/', validate({ query: listQuery }), controller.list);
router.post('/', validate({ body: tripBody }), controller.create);
router.get('/:id', validate({ params: idParams }), controller.detail);
router.put('/:id', acceptLegacyKeys, validate({ params: idParams, body: tripPatchBody }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);
router.post('/:id/clone', auth, validate(cloneTripSchema), cloneController.cloneTrip);
export default router;
