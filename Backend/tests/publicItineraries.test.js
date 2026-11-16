import { jest } from '@jest/globals';
import request from 'supertest';

// Test cho UC 6, UC 7: GET /api/public/itineraries (TP-36).
// Prisma được thay bằng dữ liệu trong bộ nhớ nên chạy được mà không cần PostgreSQL.

const day = (s) => new Date(`${s}T00:00:00Z`);
const time = (hhmm) => new Date(`1970-01-01T${hhmm}:00Z`);

const destinations = [
  { id: 1, name: 'Đà Lạt' },
  { id: 2, name: 'Hội An' },
  { id: 3, name: 'Phú Quốc' },
];

const users = { 1: { fullName: 'Nguyễn Văn An' }, 2: { fullName: 'Lê Thị Bích Ngọc' } };

const baseTrip = { coverImage: null, coverColor: 'purple', isPublic: true, tags: [], clonedFromId: null };
const trips = [
  // id 1: 3N2Đ Đà Lạt, 2 triệu, 2 lượt dùng lại
  { ...baseTrip, id: 1, userId: 1, destinationId: 1, title: 'Đà Lạt săn mây', destination: 'Đà Lạt', startDate: day('2026-10-23'), endDate: day('2026-10-25'), budget: 2000000, tags: ['MOUNTAIN', 'COFFEE'], createdAt: new Date('2026-10-01T00:00:00Z') },
  // id 2: 2N1Đ Hội An, 3 triệu, 5 lượt dùng lại
  { ...baseTrip, id: 2, userId: 2, destinationId: 2, title: 'Hội An phố cổ', destination: 'Hội An', startDate: day('2026-11-01'), endDate: day('2026-11-02'), budget: 3000000, tags: ['FOOD'], createdAt: new Date('2026-10-05T00:00:00Z') },
  // id 3: 1 ngày Đà Lạt (gõ tay, không gắn điểm đến), 800 nghìn
  { ...baseTrip, id: 3, userId: 2, destinationId: null, title: 'Một ngày ở Đà Lạt', destination: 'đà lạt', startDate: day('2026-10-10'), endDate: day('2026-10-10'), budget: 800000, tags: ['COFFEE'], createdAt: new Date('2026-10-09T00:00:00Z') },
  // id 4: 5N4Đ Phú Quốc, 5 triệu
  { ...baseTrip, id: 4, userId: 1, destinationId: 3, title: 'Phú Quốc nghỉ dưỡng', destination: 'Phú Quốc', startDate: day('2026-12-01'), endDate: day('2026-12-05'), budget: 5000000, tags: ['BEACH'], createdAt: new Date('2026-10-07T00:00:00Z') },
  // id 5: chuyến riêng tư, không được lộ ra
  { ...baseTrip, id: 5, userId: 1, destinationId: 1, title: 'Chuyến riêng', destination: 'Đà Lạt', startDate: day('2026-10-23'), endDate: day('2026-10-25'), budget: 1000000, isPublic: false, createdAt: new Date('2026-10-08T00:00:00Z') },
];
// Số lượt dùng lại = số chuyến có cloned_from_id trỏ tới
const cloneCounts = { 1: 2, 2: 5 };

const items = [
  { tripId: 1, activityDate: day('2026-10-24'), startTime: time('05:00'), activity: 'Săn mây đồi Đa Phú' },
  { tripId: 1, activityDate: day('2026-10-23'), startTime: time('14:00'), activity: 'Nhận phòng homestay' },
  { tripId: 1, activityDate: day('2026-10-23'), startTime: time('06:00'), activity: 'Xe khách Sài Gòn → Đà Lạt' },
  { tripId: 1, activityDate: day('2026-10-25'), startTime: time('08:00'), activity: 'Mua đặc sản' },
  { tripId: 1, activityDate: day('2026-10-30'), startTime: time('08:00'), activity: 'Hoạt động ngoài lịch' },
  { tripId: 2, activityDate: day('2026-11-01'), startTime: time('09:00'), activity: 'Dạo phố cổ' },
];

const lower = (s) => String(s).toLowerCase();

function matches(trip, where) {
  if (where.isPublic !== undefined && trip.isPublic !== where.isPublic) return false;
  if (where.budget?.lte !== undefined && Number(trip.budget) > where.budget.lte) return false;
  if (where.tags?.hasSome && !where.tags.hasSome.some((t) => trip.tags.includes(t))) return false;
  if (where.destination?.contains && !lower(trip.destination).includes(lower(where.destination.contains))) return false;
  if (where.OR) {
    const ok = where.OR.some(
      (c) =>
        (c.destinationId?.in && c.destinationId.in.includes(trip.destinationId)) ||
        (c.destination?.equals && lower(trip.destination) === lower(c.destination.equals)),
    );
    if (!ok) return false;
  }
  return true;
}

let lastTripQuery;
const fakePrisma = {
  destination: { findMany: async () => destinations.map((d) => ({ ...d })) },
  trip: {
    findMany: async ({ where, take }) => {
      lastTripQuery = { where, take };
      return trips.filter((t) => matches(t, where)).map((t) => ({
        id: t.id,
        title: t.title,
        destination: t.destination,
        coverImage: t.coverImage,
        coverColor: t.coverColor,
        startDate: t.startDate,
        endDate: t.endDate,
        budget: String(t.budget), // Prisma trả Decimal, service phải đổi sang số
        tags: t.tags,
        createdAt: t.createdAt,
        user: users[t.userId],
        _count: { clones: cloneCounts[t.id] ?? 0 },
      }));
    },
  },
  itineraryItem: {
    findMany: async ({ where }) =>
      items
        .filter((i) => where.tripId.in.includes(i.tripId))
        .sort((a, b) => a.activityDate - b.activityDate || a.startTime - b.startTime),
  },
};

class FakeKnownError extends Error {}
jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: class {},
  Prisma: { PrismaClientKnownRequestError: FakeKnownError, TripScalarFieldEnum: { tags: 'tags' } },
}));
jest.unstable_mockModule('../src/lib/prisma.js', () => ({ default: fakePrisma, prisma: fakePrisma }));

const { default: app } = await import('../src/app.js');

const get = (qs = '') => request(app).get(`/api/public/itineraries${qs}`);
const ids = (res) => res.body.items.map((t) => t.id);

describe('GET /api/public/itineraries', () => {
  test('khách (không token) xem được, chỉ thấy chuyến công khai, mặc định xếp Phổ biến nhất', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([2, 1, 3, 4]); // 5 lượt, 2 lượt, rồi 0 lượt thì chuyến mới hơn đứng trước
    expect(res.body).toMatchObject({ page: 1, size: 12, total: 4, hasMore: false });
    expect(res.body.code).toBeUndefined();
  });

  test('thẻ có đủ dữ liệu và không lộ thông tin riêng tư', async () => {
    const res = await get('?destination=da-lat&days=3');
    expect(res.status).toBe(200);
    const card = res.body.items[0];
    expect(card).toMatchObject({
      id: 1,
      title: 'Đà Lạt săn mây',
      destination: 'Đà Lạt',
      days: 3,
      durationLabel: '3N2Đ',
      budget: 2000000,
      cloneCount: 2,
      creatorName: 'Văn An',
      tags: ['MOUNTAIN', 'COFFEE'],
      itemCount: 5,
    });
    expect(typeof card.budget).toBe('number');
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/userId|email|passwordHash|Nguyễn/);
  });

  test('creatorName lấy 2 chữ cuối của họ tên', async () => {
    const res = await get('?destination=hoi-an');
    expect(res.body.items[0].creatorName).toBe('Bích Ngọc');
  });

  test('3 ngày đầu tiên: hoạt động xếp theo giờ, bỏ hoạt động ngoài khoảng ngày', async () => {
    const res = await get('?destination=da-lat&days=3');
    const { previewDays } = res.body.items[0];
    expect(previewDays).toEqual([
      { day: 1, date: '2026-10-23', activities: ['Xe khách Sài Gòn → Đà Lạt', 'Nhận phòng homestay'] },
      { day: 2, date: '2026-10-24', activities: ['Săn mây đồi Đa Phú'] },
      { day: 3, date: '2026-10-25', activities: ['Mua đặc sản'] },
    ]);
  });

  test('chuyến không có hoạt động vẫn trả về với previewDays rỗng', async () => {
    const res = await get('?destination=phu-quoc');
    expect(res.body.items[0]).toMatchObject({ id: 4, itemCount: 0, previewDays: [], durationLabel: '5N4Đ' });
  });

  describe('lọc', () => {
    test('theo điểm đến (slug không dấu) khớp cả chuyến gắn điểm đến lẫn chuyến gõ tay', async () => {
      const res = await get('?destination=da-lat');
      expect(ids(res).sort()).toEqual([1, 3]);
      expect(ids(await get('?destination=DA-LAT')).sort()).toEqual([1, 3]);
    });

    test('slug không khớp điểm đến nào → tìm theo chữ trong tên điểm đến của chuyến', async () => {
      const res = await get('?destination=sai-gon');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
      expect(lastTripQuery.where.destination).toEqual({ contains: 'sai gon', mode: 'insensitive' });
    });

    test('theo tag, chọn nhiều là điều kiện HOẶC (dấu phẩy hoặc lặp tham số, không phân biệt hoa thường)', async () => {
      expect(ids(await get('?tag=FOOD')).sort()).toEqual([2]);
      expect(ids(await get('?tag=food,beach')).sort()).toEqual([2, 4]);
      expect(ids(await get('?tag=FOOD&tag=BEACH')).sort()).toEqual([2, 4]);
    });

    test.each([
      [1, [3]],
      [2, [2]],
      [3, [1]],
      [4, [4]], // "4 ngày+"
      [9, [4]],
    ])('theo số ngày days=%i', async (n, expected) => {
      expect(ids(await get(`?days=${n}`))).toEqual(expected);
    });

    test('theo ngân sách tối đa (bao gồm đúng mức)', async () => {
      expect(ids(await get('?budgetMax=2000000')).sort()).toEqual([1, 3]);
      expect(ids(await get('?budgetMax=799999'))).toEqual([]);
    });

    test('kết hợp nhiều bộ lọc', async () => {
      const res = await get('?destination=da-lat&tag=COFFEE&days=1&budgetMax=1000000');
      expect(ids(res)).toEqual([3]);
    });

    test('tham số để trống coi như không lọc', async () => {
      const res = await get('?destination=&tag=&days=&budgetMax=&sort=&page=&size=');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(4);
    });
  });

  describe('sắp xếp', () => {
    test('popular: lượt dùng lại giảm dần', async () => expect(ids(await get('?sort=popular'))).toEqual([2, 1, 3, 4]));
    test('newest: mới tạo nhất trước', async () => expect(ids(await get('?sort=newest'))).toEqual([3, 4, 2, 1]));
    test('cheapest: ngân sách tăng dần', async () => expect(ids(await get('?sort=cheapest'))).toEqual([3, 1, 2, 4]));
    test('không phân biệt hoa thường', async () => expect(ids(await get('?sort=CHEAPEST'))).toEqual([3, 1, 2, 4]));
  });

  describe('phân trang', () => {
    test('size và page; hasMore tắt ở trang cuối', async () => {
      const p1 = await get('?size=3&page=1');
      expect(ids(p1)).toEqual([2, 1, 3]);
      expect(p1.body).toMatchObject({ page: 1, size: 3, total: 4, hasMore: true });
      const p2 = await get('?size=3&page=2');
      expect(ids(p2)).toEqual([4]);
      expect(p2.body).toMatchObject({ page: 2, total: 4, hasMore: false });
    });

    test('trang vượt quá dữ liệu: danh sách rỗng, không phải trạng thái rỗng MSG 14', async () => {
      const res = await get('?page=9');
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(4);
      expect(res.body.hasMore).toBe(false);
      expect(res.body.code).toBeUndefined();
    });
  });

  describe('không có kết quả (UC 6 B5a)', () => {
    test('trả 200 kèm MSG 14 để frontend hiện nút Tự lên kế hoạch', async () => {
      const res = await get('?budgetMax=100');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        items: [],
        total: 0,
        hasMore: false,
        code: 'MSG 14',
        message: 'Chưa có lịch trình phù hợp. Bạn có muốn tự lên kế hoạch?',
      });
    });

    test('tag không tồn tại cũng là kết quả rỗng, không phải lỗi', async () => {
      const res = await get('?tag=KHONG_CO');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe('MSG 14');
    });
  });

  describe('kiểm tra dữ liệu đầu vào (400, MSG 3)', () => {
    test.each([
      ['page=0'],
      ['page=abc'],
      ['page=1.5'],
      ['size=0'],
      ['size=51'],
      ['days=0'],
      ['days=abc'],
      ['budgetMax=0'],
      ['budgetMax=-5'],
      ['budgetMax=abc'],
      ['sort=random'],
      ['destination=Đà Lạt'],
      ['destination=da--lat'],
      ['tag=a-b'],
    ])('%s', async (qs) => {
      const res = await get(`?${qs}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MSG 3');
      expect(res.body.errors[0].field.split('.')[0]).toBe(qs.split('=')[0]);
    });
  });
});
