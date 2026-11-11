import { z } from 'zod';

const m = (code, text) => `${code}|${text}`;

export const cloneTripSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: m('MSG 3', 'ID chuyến đi không hợp lệ') }),
  }),
  body: z
    .object({
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: m('MSG 3', 'Ngày bắt đầu phải có dạng YYYY-MM-DD') })
        .optional(),
    })
    .optional(),
};