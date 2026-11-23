// UC 8, UC 9: GET /api/public/destinations và GET /api/public/destinations/{slug}. Không cần đăng nhập.
// Gắn tại /public/destinations trước publicRoutes nên thay bản tối thiểu cũ trong public.routes.js (giữ nguyên mọi trường cũ).
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import * as controller from '../controllers/destinationCatalog.controller.js';

const router = Router();

const BAD_FORMAT = 'MSG 3|Giá trị không đúng định dạng.';
const emptyToUndefined = (v) => (v === '' ? undefined : v);
const upper = (v) => (typeof v === 'string' ? v.trim().toUpperCase() : v);
const lower = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);

const int = () => z.coerce.number({ error: BAD_FORMAT }).int(BAD_FORMAT);

const listQuery = z.object({
  page: z.preprocess(emptyToUndefined, int().min(1, BAD_FORMAT).default(1)),
  size: z.preprocess(emptyToUndefined, int().min(1, BAD_FORMAT).max(100, BAD_FORMAT).default(12)),
  q: z.preprocess(emptyToUndefined, z.string({ error: BAD_FORMAT }).trim().max(100, BAD_FORMAT).optional()),
  region: z.preprocess((v) => upper(emptyToUndefined(v)), z.enum(['NORTH', 'CENTRAL', 'HIGHLANDS', 'SOUTH'], { error: BAD_FORMAT }).optional()),
  type: z.preprocess((v) => upper(emptyToUndefined(v)), z.enum(['BEACH', 'MOUNTAIN', 'CULTURE'], { error: BAD_FORMAT }).optional()),
  sort: z.preprocess((v) => lower(emptyToUndefined(v)), z.enum(['itineraries', 'name'], { error: BAD_FORMAT }).optional()),
});

// Slug sai định dạng cũng là "không tìm thấy" (validate trả 404 khi params sai).
const slugParams = z.object({ slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(160) });

router.get('/', validate({ query: listQuery }), controller.list);
router.get('/:slug', validate({ params: slugParams }), controller.detail);

export default router;
