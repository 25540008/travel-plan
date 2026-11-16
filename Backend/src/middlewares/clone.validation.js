import { z } from 'zod';
import { idParam } from '../utils/validators.js';

const m = (code, text) => `${code}|${text}`;

// POST /api/trips/:id/clone  body { startDate?: 'YYYY-MM-DD' } (UC 11 B3). Không gửi = thứ Bảy gần nhất.
export const cloneTripSchema = {
  params: z.object({ id: idParam }),
  body: z
    .object({
      startDate: z.preprocess(
        (v) => (v === '' || v === null ? undefined : v),
        z
          .string({ error: m('MSG 3', 'Ngày bắt đầu phải có dạng YYYY-MM-DD') })
          .pipe(z.iso.date(m('MSG 3', 'Ngày bắt đầu không hợp lệ')))
          .transform((s) => new Date(`${s}T00:00:00Z`))
          .optional(),
      ),
    })
    .optional(),
};
