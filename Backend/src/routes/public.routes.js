// Các API công khai, không cần đăng nhập.
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { idParam } from '../utils/validators.js';
import * as tripService from '../services/trip.service.js';

const router = Router();

// UC 18: GET /api/public/trips/:id — xem lịch trình được chia sẻ công khai (không có khoản chi).
router.get('/trips/:id', validate({ params: z.object({ id: idParam }) }), async (req, res) => {
  res.json(await tripService.getPublicTrip(req.valid.params.id));
});

export default router;
