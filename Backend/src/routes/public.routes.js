// Các API công khai, không cần đăng nhập.
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { idParam } from '../utils/validators.js';
import * as tripService from '../services/trip.service.js';
import * as cloneController from '../controllers/clone.controller.js';
import * as destinationService from '../services/destination.service.js';

const router = Router();

// UC 18: GET /api/public/trips/:id — xem lịch trình được chia sẻ công khai (không có khoản chi).
router.get('/trips/:id', validate({ params: z.object({ id: idParam }) }), async (req, res) => {
  res.json(await tripService.getPublicTrip(req.valid.params.id));
});

// Screen 1: GET /api/public/trending-destinations (TP-60)
router.get('/trending-destinations', cloneController.getTrendingDestinations);

// Screen 1: GET /api/public/destinations?page=&size=&q= (danh sách điểm đến, ô gợi ý tìm kiếm)
const BAD_FORMAT = 'MSG 3|Giá trị không đúng định dạng.';
const emptyToUndefined = (v) => (v === '' ? undefined : v);
const destinationQuery = z.object({
  page: z.preprocess(emptyToUndefined, z.coerce.number({ error: BAD_FORMAT }).int(BAD_FORMAT).min(1, BAD_FORMAT).default(1)),
  size: z.preprocess(emptyToUndefined, z.coerce.number({ error: BAD_FORMAT }).int(BAD_FORMAT).min(1, BAD_FORMAT).max(100, BAD_FORMAT).default(12)),
  q: z.preprocess(emptyToUndefined, z.string({ error: BAD_FORMAT }).trim().max(100, BAD_FORMAT).optional()),
});
router.get('/destinations', validate({ query: destinationQuery }), async (req, res) => {
  res.json(await destinationService.listDestinations(req.valid.query));
});

export default router;
