// Prisma giả lưu trong bộ nhớ, đủ cho các truy vấn của trip.service và tripCover.service.
// Dùng cho test không cần PostgreSQL. Không phải bản sao đầy đủ của Prisma: chỉ hỗ trợ đúng những lời gọi service đang dùng.

export function createFakePrisma() {
  const db = { trips: [], items: [], expenses: [], nextTripId: 1, nextItemId: 1, nextExpenseId: 1 };

  const byDateDesc = (a, b) => b.startDate - a.startDate || b.id - a.id;

  const inRange = (item, where) =>
    where.OR.some((c) => (c.activityDate.lt && item.activityDate < c.activityDate.lt) || (c.activityDate.gt && item.activityDate > c.activityDate.gt));

  const prisma = {
    trip: {
      findMany: async ({ where }) => db.trips.filter((t) => t.userId === where.userId).sort(byDateDesc).map((t) => ({ ...t })),
      findFirst: async ({ where }) => {
        const trip = db.trips.find((t) => t.id === where.id && t.userId === where.userId);
        return trip ? { ...trip } : null; // bản sao như Prisma thật, để sửa chuyến không làm đổi bản đã đọc trước đó
      },
      create: async ({ data }) => {
        const trip = {
          id: db.nextTripId++,
          description: null,
          address: null,
          latitude: null,
          longitude: null,
          coverImage: null,
          coverColor: 'purple',
          isPublic: false,
          createdAt: new Date(),
          ...data,
        };
        db.trips.push(trip);
        return { ...trip };
      },
      update: async ({ where, data }) => {
        const trip = db.trips.find((t) => t.id === where.id);
        Object.assign(trip, data);
        return { ...trip };
      },
      delete: async ({ where }) => {
        db.trips = db.trips.filter((t) => t.id !== where.id);
        db.items = db.items.filter((i) => i.tripId !== where.id);
        db.expenses = db.expenses.filter((e) => e.tripId !== where.id);
      },
    },
    itineraryItem: {
      groupBy: async ({ where }) => {
        const ids = where.tripId.in;
        return ids
          .map((tripId) => ({ tripId, n: db.items.filter((i) => i.tripId === tripId).length }))
          .filter((r) => r.n > 0)
          .map((r) => ({ tripId: r.tripId, _count: { _all: r.n } }));
      },
      count: async ({ where }) => db.items.filter((i) => i.tripId === where.tripId && inRange(i, where)).length,
    },
    expense: {
      groupBy: async ({ where }) => {
        const ids = where.tripId.in;
        return ids
          .map((tripId) => ({ tripId, rows: db.expenses.filter((e) => e.tripId === tripId) }))
          .filter((r) => r.rows.length > 0)
          .map((r) => ({ tripId: r.tripId, _count: { _all: r.rows.length }, _sum: { amount: r.rows.reduce((s, e) => s + e.amount, 0) } }));
      },
    },
  };

  /** Thêm nhanh dữ liệu mẫu cho test. */
  const seed = {
    trip: (data) => {
      const trip = {
        id: db.nextTripId++,
        description: null,
        address: null,
        latitude: null,
        longitude: null,
        coverImage: null,
        coverColor: 'purple',
        isPublic: false,
        createdAt: new Date(),
        budget: 1000000,
        ...data,
      };
      db.trips.push(trip);
      return trip;
    },
    item: (tripId, activityDate) => db.items.push({ id: db.nextItemId++, tripId, activityDate: new Date(`${activityDate}T00:00:00Z`) }),
    expense: (tripId, amount) => db.expenses.push({ id: db.nextExpenseId++, tripId, amount }),
  };

  return { prisma, db, seed };
}

/** Thay thế @prisma/client trong test (errorHandler cần Prisma.PrismaClientKnownRequestError). */
export const fakePrismaClientModule = () => ({
  PrismaClient: class {},
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
});

/** Ngày YYYY-MM-DD cách hôm nay (giờ VN) n ngày, để test trạng thái Sắp đi / Đang đi / Đã đi không phụ thuộc ngày chạy. */
export function vnDay(offsetDays = 0, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
