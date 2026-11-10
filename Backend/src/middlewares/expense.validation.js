import { z } from 'zod';
import { requiredText } from '../utils/validators.js';

const m = (code, text) => `${code}|${text}`;

export const expenseCategories = [
  'TRANSPORT',
  'ACCOMMODATION',
  'FOOD',
  'SIGHTSEEING',
  'SHOPPING',
  'OTHER',
];

// Param :id (tripId)
export const tripIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: m('MSG 3', 'ID chuyến đi không hợp lệ') }),
  }),
};

// Param :id và :expenseId
export const tripExpenseIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: m('MSG 3', 'ID chuyến đi không hợp lệ') }),
    expenseId: z.string().regex(/^\d+$/, { message: m('MSG 3', 'ID khoản chi không hợp lệ') }),
  }),
};

// UC 25: Thêm khoản chi
export const createExpenseSchema = {
  params: tripIdParamSchema.params,
  body: z.object({
    description: requiredText('Mô tả', 200),
    amount: z.coerce
      .number({ error: m('MSG 3', 'Số tiền phải là số') })
      .positive({ message: m('MSG 3', 'Số tiền phải lớn hơn 0') }),
    category: z.enum(expenseCategories, {
      error: m('MSG 3', 'Loại chi tiêu không hợp lệ'),
    }),
    expenseDate: z
      .string({ error: m('MSG 29', 'Vui lòng chọn ngày chi tiêu') })
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: m('MSG 3', 'Ngày không đúng định dạng YYYY-MM-DD') }),
  }),
};

// UC 26: Sửa khoản chi
export const updateExpenseSchema = {
  params: tripExpenseIdParamSchema.params,
  body: z.object({
    description: z
      .string()
      .trim()
      .max(200, { message: m('MSG 30', 'Mô tả tối đa 200 ký tự') })
      .optional(),
    amount: z.coerce
      .number({ error: m('MSG 3', 'Số tiền phải là số') })
      .positive({ message: m('MSG 3', 'Số tiền phải lớn hơn 0') })
      .optional(),
    category: z.enum(expenseCategories, {
      error: m('MSG 3', 'Loại chi tiêu không hợp lệ'),
    }).optional(),
    expenseDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: m('MSG 3', 'Ngày không đúng định dạng YYYY-MM-DD') })
      .optional(),
  }),
};

// UC 27: Sửa ngân sách (tối đa 15 chữ số, > 0)
export const updateBudgetSchema = {
  params: tripIdParamSchema.params,
  body: z.object({
    budget: z.coerce
      .number({ error: m('MSG 3', 'Ngân sách phải là số') })
      .positive({ message: m('MSG 33', 'Ngân sách phải lớn hơn 0.') })
      .max(999999999999999, { message: m('MSG 30', 'Ngân sách tối đa 15 chữ số.') }),
  }),
};