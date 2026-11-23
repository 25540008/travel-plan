import { Router } from 'express';
import { z } from 'zod';
import { auth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { requiredText, optionalText, money, idParam } from '../utils/validators.js';
import { MSG, required, tooLong } from '../utils/messages.js';
import { REGIONS, CATEGORIES, SPOT_CATEGORIES, COST_CATEGORIES } from '../services/destinationCatalog.service.js';
import * as controller from '../controllers/adminDestination.controller.js';

const router = Router();
const m = (code, text) => `${code}|${text}`;
const BAD_FORMAT = m('MSG 3', MSG['MSG 3']);

const slugField = requiredText('Slug', 160).pipe(
  z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, m('MSG 3', 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang.')),
);

const requiredCoord = (label, min, max) =>
  z.unknown().superRefine((v, ctx) => {
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
      ctx.addIssue({ code: 'custom', message: m('MSG 29', required(label)) });
      return;
    }
    const n = Number(String(v).trim());
    if (!Number.isFinite(n) || n < min || n > max) {
      ctx.addIssue({ code: 'custom', message: m('MSG 3', `${label} phải từ ${min} đến ${max}.`) });
    }
  }).transform((v) => Number(String(v).trim()));

const optionalCoord = (label, min, max) =>
  z.unknown().superRefine((v, ctx) => {
    if (v === undefined || v === null || v === '') return;
    const n = Number(String(v).trim());
    if (!Number.isFinite(n) || n < min || n > max) {
      ctx.addIssue({ code: 'custom', message: m('MSG 3', `${label} phải từ ${min} đến ${max}.`) });
    }
  }).transform((v) => (v === undefined || v === null || v === '' ? undefined : Number(String(v).trim()))).optional();

const bestMonthsField = z
  .array(
    z.coerce.number({ error: BAD_FORMAT }).int(BAD_FORMAT).min(1, m('MSG 3', 'Tháng đẹp phải từ 1 đến 12.')).max(12, m('MSG 3', 'Tháng đẹp phải từ 1 đến 12.')),
    { error: BAD_FORMAT },
  )
  .max(12, BAD_FORMAT)
  .transform((arr) => [...new Set(arr)].sort((a, b) => a - b));

const spotBody = z.object({
  name: requiredText('Tên địa điểm', 150),
  category: z.enum(Object.keys(SPOT_CATEGORIES), { error: BAD_FORMAT }).default('SIGHTSEEING'),
  description: optionalText('Mô tả', 500),
  imageUrl: optionalText('Link ảnh', 500),
  latitude: optionalCoord('Vĩ độ', -90, 90),
  longitude: optionalCoord('Kinh độ', -180, 180),
  sortOrder: z.coerce.number({ error: BAD_FORMAT }).int(BAD_FORMAT).min(0, BAD_FORMAT).optional(),
});

const costBody = z.object({
  category: z.enum(Object.keys(COST_CATEGORIES), { error: BAD_FORMAT }),
  amount: money('Chi phí tham khảo'),
  note: optionalText('Ghi chú', 255),
  sortOrder: z.coerce.number({ error: BAD_FORMAT }).int(BAD_FORMAT).min(0, BAD_FORMAT).optional(),
});

const destinationFields = z.object({
  name: requiredText('Tên điểm đến', 150),
  slug: slugField,
  province: requiredText('Tỉnh / Thành phố', 100),
  region: z.enum(Object.keys(REGIONS), { error: m('MSG 29', required('Vùng miền')) }),
  category: z.enum(Object.keys(CATEGORIES), { error: BAD_FORMAT }).optional(),
  address: optionalText('Địa chỉ', 255),
  description: z.string({ error: BAD_FORMAT }).trim().max(2000, m('MSG 30', tooLong('Mô tả', 2000))).optional(),
  imageUrl: optionalText('Link ảnh', 500),
  isFeatured: z.boolean({ error: BAD_FORMAT }).optional(),
  latitude: requiredCoord('Vĩ độ', -90, 90),
  longitude: requiredCoord('Kinh độ', -180, 180),
  bestMonths: bestMonthsField.optional().default([]),
  tags: z.array(z.string().trim().min(1)).optional(),
  spots: z.array(spotBody).optional(),
  costs: z.array(costBody).optional(),
});

const destinationUpdateBody = destinationFields
  .partial()
  .refine((v) => Object.keys(v).length > 0, { error: m('MSG 3', 'Cần ít nhất một trường để cập nhật.') });

const destParams = z.object({ id: idParam });
const spotParams = z.object({ id: idParam, spotId: idParam });
const costParams = z.object({ id: idParam, costId: idParam });

router.use(auth, requireRole('CONTENT_ADMIN'));

router.post('/', validate({ body: destinationFields }), controller.createDestination);
router.put('/:id', validate({ params: destParams, body: destinationUpdateBody }), controller.updateDestination);
router.delete('/:id', validate({ params: destParams }), controller.deleteDestination);

router.post('/:id/spots', validate({ params: destParams, body: spotBody }), controller.createSpot);
router.put('/:id/spots/:spotId', validate({ params: spotParams, body: spotBody.partial() }), controller.updateSpot);
router.delete('/:id/spots/:spotId', validate({ params: spotParams }), controller.deleteSpot);

router.post('/:id/costs', validate({ params: destParams, body: costBody }), controller.createCost);
router.put('/:id/costs/:costId', validate({ params: costParams, body: costBody.partial() }), controller.updateCost);
router.delete('/:id/costs/:costId', validate({ params: costParams }), controller.deleteCost);

export default router;