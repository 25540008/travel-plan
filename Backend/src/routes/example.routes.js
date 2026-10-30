// ROUTE MẪU (chỉ bật khi không phải production): auth + validate + Prisma.
// Các thẻ BE sau chép cấu trúc này: routes/*.routes.js → controllers/*.controller.js → services/*.service.js
import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { requiredText, optionalText, dateOnly, money, idParam } from '../utils/validators.js';
import * as controller from '../controllers/example.controller.js';

const router = Router();

const createTripSchema = z.object({
  title: requiredText('Tên chuyến', 150),
  destination: requiredText('Điểm đến', 200),
  startDate: dateOnly('Ngày đi'),
  endDate: dateOnly('Ngày về'),
  budget: money('Ngân sách').default(0),
  description: optionalText('Mô tả', 1000),
});

router.use(auth);
router.get('/trips', controller.list);
router.post('/trips', validate({ body: createTripSchema }), controller.create);
router.get('/trips/:id', validate({ params: z.object({ id: idParam }) }), controller.detail);

export default router;
