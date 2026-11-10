import prisma from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';

//CBR 8: Kiểm tra quyền sở hữu chuyến đi. Nếu không thuộc req.user -> 404
async function verifyTripOwner(tripId, userId) {
  const trip = await prisma.trip.findFirst({
    where: {
      id: Number(tripId),
      userId: Number(userId),
    },
  });
  if (!trip) {
    throw AppError.notFound('Chuyến đi không tồn tại hoặc bạn không có quyền truy cập');
  }
  return trip;
}

// Quy tắc kiểm tra ngày: Trong khoảng [startDate - 30 ngày, endDate + 7 ngày]
function validateExpenseDateRange(trip, expenseDateStr) {
  const expenseDate = new Date(`${expenseDateStr}T00:00:00Z`);
  const minDate = new Date(trip.startDate);
  minDate.setUTCDate(minDate.getUTCDate() - 30);

  const maxDate = new Date(trip.endDate);
  maxDate.setUTCDate(maxDate.getUTCDate() + 7);

  if (expenseDate < minDate || expenseDate > maxDate) {
    throw AppError.badRequest(
      'MSG 3',
      'Ngày chi tiêu phải nằm trong khoảng từ 30 ngày trước ngày đi đến 7 ngày sau ngày về'
    );
  }
}

//Quy tắc CBR 6: Xác định trạng thái ngân sách
function getBudgetStatus(spent, budget) {
  const ratio = budget > 0 ? (spent / budget) * 100 : 0;
  if (ratio < 90) {
    return {
      ratio: Number(ratio.toFixed(2)),
      statusText: 'Đang trong ngân sách',
      color: 'green',
      isOver: false,
      overAmount: 0,
    };
  } else if (ratio <= 100) {
    return {
      ratio: Number(ratio.toFixed(2)),
      statusText: 'Sắp hết quỹ',
      color: 'yellow',
      isOver: false,
      overAmount: 0,
    };
  } else {
    return {
      ratio: Number(ratio.toFixed(2)),
      statusText: 'Vượt ngân sách',
      color: 'red',
      isOver: true,
      overAmount: spent - budget,
    };
  }
}

// UC 24: Xem tổng quan ngân sách, biểu đồ, nhóm chi tiêu
export async function getBudgetOverview(tripId, userId) {
  const trip = await verifyTripOwner(tripId, userId);

  const expenses = await prisma.expense.findMany({
    where: { tripId: Number(tripId) },
    orderBy: { expenseDate: 'desc' },
  });

  const budget = Number(trip.budget || 0);
  const totalSpent = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const remaining = budget - totalSpent;
  const statusInfo = getBudgetStatus(totalSpent, budget);

  // Tính "Mỗi ngày còn tiêu được" và "Trung bình mỗi ngày"
  const now = new Date();
  const tripStart = new Date(trip.startDate);
  const tripEnd = new Date(trip.endDate);

  const totalTripDays = Math.max(1, Math.ceil((tripEnd - tripStart) / (1000 * 60 * 60 * 24)) + 1);
  let passedDays = 0;
  if (now > tripEnd) {
    passedDays = totalTripDays;
  } else if (now >= tripStart) {
    passedDays = Math.ceil((now - tripStart) / (1000 * 60 * 60 * 24));
  }
  const remainingDays = Math.max(1, totalTripDays - passedDays);

  const dailyRemainingBudget = remaining > 0 ? Number((remaining / remainingDays).toFixed(2)) : 0;
  const dailyAverageSpent = passedDays > 0 ? Number((totalSpent / passedDays).toFixed(2)) : 0;

  // Biểu đồ theo ngày: Trước chuyến, Từng ngày, Sau chuyến
  const chartByDate = {
    beforeTrip: 0,
    daily: {},
    afterTrip: 0,
  };

  for (const exp of expenses) {
    const expDate = new Date(exp.expenseDate);
    const amount = Number(exp.amount);
    const dateStr = exp.expenseDate.toISOString().split('T')[0];

    if (expDate < tripStart) {
      chartByDate.beforeTrip += amount;
    } else if (expDate > tripEnd) {
      chartByDate.afterTrip += amount;
    } else {
      chartByDate.daily[dateStr] = (chartByDate.daily[dateStr] || 0) + amount;
    }
  }

  // Biểu đồ theo loại: 6 loại sắp xếp giảm dần
  const categoryTotals = {
    TRANSPORT: 0,
    ACCOMMODATION: 0,
    FOOD: 0,
    SIGHTSEEING: 0,
    SHOPPING: 0,
    OTHER: 0,
  };

  expenses.forEach((e) => {
    if (categoryTotals[e.category] !== undefined) {
      categoryTotals[e.category] += Number(e.amount);
    }
  });

  const chartByCategory = Object.entries(categoryTotals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Nhóm danh sách theo ngày (ngày mới nhất trước)
  const groupedExpenses = {};
  for (const exp of expenses) {
    const d = exp.expenseDate.toISOString().split('T')[0];
    if (!groupedExpenses[d]) {
      groupedExpenses[d] = {
        date: d,
        totalAmount: 0,
        items: [],
      };
    }
    groupedExpenses[d].totalAmount += Number(exp.amount);
    groupedExpenses[d].items.push(exp);
  }

  return {
    overview: {
      budget,
      totalSpent,
      remaining,
      ...statusInfo,
      dailyRemainingBudget,
      dailyAverageSpent,
    },
    charts: {
      byDate: chartByDate,
      byCategory: chartByCategory,
    },
    groupedExpenses: Object.values(groupedExpenses),
  };
}

//UC 25: Lấy danh sách khoản chi
export async function getExpenses(tripId, userId) {
  await verifyTripOwner(tripId, userId);
  return prisma.expense.findMany({
    where: { tripId: Number(tripId) },
    orderBy: { expenseDate: 'desc' },
  });
}

//UC 25: Thêm khoản chi mới
export async function createExpense(tripId, userId, data) {
  const trip = await verifyTripOwner(tripId, userId);
  validateExpenseDateRange(trip, data.expenseDate);

  // Kiểm tra cảnh báo vượt ngân sách MSG 28
  const currentTotal = await prisma.expense.aggregate({
    where: { tripId: Number(tripId) },
    _sum: { amount: true },
  });
  const spentSoFar = Number(currentTotal._sum.amount || 0);
  const newTotal = spentSoFar + Number(data.amount);
  const isOverBudget = newTotal > Number(trip.budget || 0);

  const expense = await prisma.expense.create({
    data: {
      tripId: Number(tripId),
      description: data.description,
      amount: data.amount,
      category: data.category,
      expenseDate: new Date(`${data.expenseDate}T00:00:00Z`),
    },
  });

  return {
    expense,
    warning: isOverBudget ? 'MSG 28' : null,
  };
}

//UC 26: Cập nhật khoản chi
export async function updateExpense(tripId, expenseId, userId, data) {
  const trip = await verifyTripOwner(tripId, userId);

  const existing = await prisma.expense.findFirst({
    where: { id: Number(expenseId), tripId: Number(tripId) },
  });
  if (!existing) {
    throw AppError.notFound('Khoản chi không tồn tại');
  }

  if (data.expenseDate) {
    validateExpenseDateRange(trip, data.expenseDate);
  }

  const updateData = { ...data };
  if (data.expenseDate) {
    updateData.expenseDate = new Date(`${data.expenseDate}T00:00:00Z`);
  }

  return prisma.expense.update({
    where: { id: Number(expenseId) },
    data: updateData,
  });
}

/**
 * UC 26: Xóa khoản chi
 */
export async function deleteExpense(tripId, expenseId, userId) {
  await verifyTripOwner(tripId, userId);

  const existing = await prisma.expense.findFirst({
    where: { id: Number(expenseId), tripId: Number(tripId) },
  });
  if (!existing) {
    throw AppError.notFound('Khoản chi không tồn tại');
  }

  await prisma.expense.delete({
    where: { id: Number(expenseId) },
  });

  return { success: true, message: 'Đã xóa khoản chi thành công' };
}

//UC 27: Cập nhật ngân sách chuyến đi
export async function updateBudget(tripId, userId, budget) {
  await verifyTripOwner(tripId, userId);

  const updatedTrip = await prisma.trip.update({
    where: { id: Number(tripId) },
    data: { budget },
  });

  // Tính lại trạng thái theo CBR 6
  const total = await prisma.expense.aggregate({
    where: { tripId: Number(tripId) },
    _sum: { amount: true },
  });
  const spent = Number(total._sum.amount || 0);
  const statusInfo = getBudgetStatus(spent, Number(budget));

  return {
    budget: Number(updatedTrip.budget),
    totalSpent: spent,
    ...statusInfo,
  };
}