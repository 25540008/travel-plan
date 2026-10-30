import { z } from 'zod';
import { required, tooLong } from './messages.js';

// Mỗi message có dạng "<mã MSG>|<nội dung>" để middleware validate tách ra code và message.
const m = (code, text) => `${code}|${text}`;

/** Chuỗi bắt buộc, tự trim. MSG 29 khi trống, MSG 30 khi quá dài. */
export const requiredText = (label, max) =>
  z
    .string({ error: m('MSG 29', required(label)) })
    .trim()
    .min(1, m('MSG 29', required(label)))
    .max(max, m('MSG 30', tooLong(label, max)));

/** Chuỗi không bắt buộc; chuỗi rỗng coi như không nhập. */
export const optionalText = (label, max) =>
  z
    .string({ error: m('MSG 3', 'Giá trị không đúng định dạng.') })
    .trim()
    .max(max, m('MSG 30', tooLong(label, max)))
    .optional()
    .transform((v) => (v ? v : undefined));

export const email = (label = 'Email') =>
  requiredText(label, 150).pipe(z.email(m('MSG 3', 'Giá trị không đúng định dạng.')));

/** Ngày dạng YYYY-MM-DD. */
export const dateOnly = (label) =>
  requiredText(label, 10).pipe(
    z.iso.date(m('MSG 3', 'Giá trị không đúng định dạng.')).transform((s) => new Date(`${s}T00:00:00Z`)),
  );

/** Số tiền >= 0 (nhận cả số và chuỗi số). */
export const money = (label) =>
  z.coerce
    .number({ error: m('MSG 3', 'Giá trị không đúng định dạng.') })
    .refine(Number.isFinite, m('MSG 3', 'Giá trị không đúng định dạng.'))
    .min(0, m('MSG 3', `${label} không được âm.`));

/** Id trên URL, ví dụ /api/trips/:id. Id sai định dạng trả 404 giống id không tồn tại. */
export const idParam = z.coerce.number().int().positive();
