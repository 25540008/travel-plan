import * as expenseService from '../services/expense.service.js';

export async function getBudget(req, res) {
  const { id } = req.valid.params;
  const result = await expenseService.getBudgetOverview(id, req.user.id);
  res.json(result);
}

export async function getExpenses(req, res) {
  const { id } = req.valid.params;
  const result = await expenseService.getExpenses(id, req.user.id);
  res.json(result);
}

export async function createExpense(req, res) {
  const { id } = req.valid.params;
  const result = await expenseService.createExpense(id, req.user.id, req.valid.body);
  res.status(201).json(result);
}

export async function updateExpense(req, res) {
  const { id, expenseId } = req.valid.params;
  const result = await expenseService.updateExpense(id, expenseId, req.user.id, req.valid.body);
  res.json(result);
}

export async function deleteExpense(req, res) {
  const { id, expenseId } = req.valid.params;
  const result = await expenseService.deleteExpense(id, expenseId, req.user.id);
  res.json(result);
}

export async function updateBudget(req, res) {
  const { id } = req.valid.params;
  const { budget } = req.valid.body;
  const result = await expenseService.updateBudget(id, req.user.id, budget);
  res.json(result);
}