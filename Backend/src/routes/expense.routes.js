import express from 'express';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import * as controller from '../controllers/expense.controller.js';
import {
  tripIdParamSchema,
  tripExpenseIdParamSchema,
  createExpenseSchema,
  updateExpenseSchema,
  updateBudgetSchema,
} from '../middlewares/expense.validation.js';

const router = express.Router();

// UC 24: Xem tổng quan ngân sách
router.get(
  '/trips/:id/budget',
  auth,
  validate(tripIdParamSchema),
  controller.getBudget
);

// UC 27: Đổi ngân sách dự kiến
router.put(
  '/trips/:id/budget',
  auth,
  validate(updateBudgetSchema),
  controller.updateBudget
);


// UC 24 & UC 25: Danh sách khoản chi
router.get(
  '/trips/:id/expenses',
  auth,
  validate(tripIdParamSchema),
  controller.getExpenses
);

// UC 25: Thêm khoản chi
router.post(
  '/trips/:id/expenses',
  auth,
  validate(createExpenseSchema),
  controller.createExpense
);

// UC 26: Sửa khoản chi
router.put(
  '/trips/:id/expenses/:expenseId',
  auth,
  validate(updateExpenseSchema),
  controller.updateExpense
);

// UC 26: Xóa khoản chi
router.delete(
  '/trips/:id/expenses/:expenseId',
  auth,
  validate(tripExpenseIdParamSchema),
  controller.deleteExpense
);

export default router;