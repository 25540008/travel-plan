import { jest } from '@jest/globals';
import request from 'supertest';

// Test cho UC 8, UC 9: GET /api/public/destinations và /api/public/destinations/{slug} (TP-43).
// Prisma được thay bằng dữ liệu trong bộ nhớ nên chạy được mà không cần PostgreSQL.

const day = (s) => new Date(`${s}T00:00:00Z`);
const time = (hhmm) => new Date(`1970-01-01T${hhmm}:00Z`);

const destinations = [
  { id: 1, name: 'Đà Lạt', slug: 'da-lat', province: 'Lâm Đồng', region: 'HIGHLANDS', category: 'MOUNTAIN', address: 'Lâm Đồng, Việt Nam', description: 'Thành phố ngàn hoa', imageUrl: null, isFeatured: true, latitude: 11.94, longitude: 108.45, bestMonths: [11, 12, 1, 2, 3], specialMonths: [11, 12], specialNote: 'Hoa dã quỳ', avgTempByMonth: [16, 17, 18, 19, 19, 19, 18, 18, 18, 18, 17, 16], tags: ['Săn mây'], travelFromHcm: '6–7 giờ đi xe', suggestedDays: '3–4 ngày', costSource: 'Giá tham khảo 2026' },
  { id: 2, name: 'Hội An', slug: 'hoi-an', province: 'Quảng Nam', region: 'CENTRAL', category: 'CULTURE', address: 'Quảng Nam, Việt Nam', description: 'Phố cổ', imageUrl: null, isFeatured: true, latitude: 15.88, longitude: 108.33, bestMonths: [2, 3, 4, 5, 6, 7, 8], specialMonths: [], specialNote: null, avgTempByMonth: [], tags: [], travelFromHcm: null, suggestedDays: null, costSource: null },
  { id: 3, name: 'Phú Quốc', slug: 'phu-quoc', province: 'Kiên Giang', region: 'SOUTH', category: 'BEACH', address: 'Kiên Giang, Việt Nam', description: 'Đảo ngọc', imageUrl: null, isFeatured: false, latitude: 10.29, longitude: 103.98, bestMonths: [11, 12, 1, 2, 3, 4], specialMonths: [], specialNote: null, avgTempByMonth: [], tags: [], travelFromHcm: null, suggestedDays: null, costSource: null },
  { id: 4, name: 'Vũng Tàu', slug: 'vung-tau', province: 'Bà Rịa - Vũng Tàu', region: 'SOUTH', category: 'BEACH', address: 'Bà Rịa - Vũng Tàu, Việt Nam', description: 'Biển gần Sài Gòn', imageUrl: null, isFeatured: false, latitude: 10.35, longitude: 107.08, bestMonths: [11, 12, 1, 2, 3, 4], specialMonths: [], specialNote: null, avgTempByMonth: [], tags: [], travelFromHcm: null, suggestedDays: null, costSource: null },
  { id: 5, name: 'Sa Pa', slug: 'sa-pa', province: 'Lào Cai', region: 'NORTH', category: 'MOUNTAIN', address: 'Lào Cai, Việt Nam', description: 'Thành phố trong sương', imageUrl: null, isFeatured: false, latitude: 22.34, longitude: 103.84, bestMonths: [3, 4, 5, 9, 10], specialMonths: [], specialNote: null, avgTempByMonth: [], tags: [], travelFromHcm: null, suggestedDays: null, costSource: null },
  // Dữ liệu cũ chưa có slug, vùng, loại; không có tọa độ
  { id: 6, name: 'Quy Nhơn Cũ', slug: null, province: null, region: null, category: null, address: 'Bình Định, Việt Nam', description: null, imageUrl: null, isFeatured: false, latitude: null, longitude: null, bestMonths: [], specialMonths: [], specialNote: null, avgTempByMonth: [], tags: [], travelFromHcm: null, suggestedDays: null, costSource: null },
];

const spots = [
  { id: 1, destinationId: 1, name: 'Hồ Xuân Hương', category: 'SIGHTSEEING', description: 'Hồ trung tâm', imageUrl: null, latitude: 11.9437, longitude: 108.4425, sortOrder: 1 },
  { id: 2, destinationId: 1, name: 'Chợ đêm Đà Lạt', category: 'FOOD', description: 'Ăn tối', imageUrl: null, latitude: null, longitude: null, sortOrder: 2 },
  { id: 3, destinationId: 1, name: 'Dinh Bảo Đại', category: 'CULTURE', description: 'Biệt thự vua', imageUrl: null, latitude: null, longitude: null, sortOrder: 3 },
  { id: 4, destinationId: 1, name: 'Thác Datanla', category: 'TREKKING', description: 'Thác', imageUrl: null, latitude: null, longitude: null, sortOrder: 4 },
];
const costs = [
  { id: 1, destinationId: 1, category: 'TRANSPORT', amount: 600000, note: 'Khứ hồi', sortOrder: 1 },
  { id: 2, destinationId: 1, category: 'LODGING', amount: 600000, note: '2 đêm', sortOrder: 2 },
  { id: 3, destinationId: 1, category: 'FOOD', amount: 900000, note: null, sortOrder: 3 },
  { id: 4, destinationId: 1, category: 'TICKETS', amount: 250000, note: null, sortOrder: 4 },
];

const users = { 1: { fullName: 'Nguyễn Văn An' }, 2: { fullName: 'Lê Thị Bích Ngọc' } };
const base = { coverImage: null, coverColor: 'purple', isPublic: true };
const trips = [
  { ...base, id: 10, userId: 1, destinationId: 1, title: 'Đà Lạt săn mây', destination: 'Đà Lạt', startDate: day('2026-10-23'), endDate: day('2026-10-25'), budget: 2000000, createdAt: new Date('2026-10-01T00:00:00Z') },
  { ...base, id: 11, userId: 2, destinationId: null, title: 'Một ngày ở Đà Lạt', destination: 'đà lạt', startDate: day('2026-10-10'), endDate: day('2026-10-10'), budget: 800000, createdAt: new Date('2026-10-09T00:00:00Z') },
  { ...base, id: 12, userId: 1, destinationId: 1, title: 'Đà Lạt 4 ngày', destination: 'Đà Lạt', startDate: day('2026-11-01'), endDate: day('2026-11-04'), budget: 4000000, createdAt: new Date('2026-10-12T00:00:00Z') },
  { ...base, id: 13, userId: 2, destinationId: 1, title: 'Đà Lạt cuối tuần', destination: 'Đà Lạt', startDate: day('2026-11-07'), endDate: day('2026-11-08'), budget: 1500000, createdAt: new Date('2026-10-14T00:00:00Z') },
  { ...base, id: 14, userId: 1, destinationId: 1, title: 'Chuyến riêng tư', destination: 'Đà Lạt', startDate: day('2026-10-23'), endDate: day('2026-10-25'), budget: 100000, isPublic: false, createdAt: new Date('2026-10-15T00:00:00Z') },
  { ...base, id: 20, userId: 2, destinationId: 2, title: 'Hội An phố cổ', destination: 'Hội An', startDate: day('2026-11-01'), endDate: day('2026-11-02'), budget: 3000000, createdAt: new Date('2026-10-05T00:00:00Z') },
];
const cloneCounts = { 10: 2, 11: 5, 12: 0, 13: 1 };

const items = [
  { tripId: 10, activityDate: day('2026-10-24'), startTime: time('05:00'), activity: 'Săn mây đồi Đa Phú', location: null },
  { tripId: 10, activityDate: day('2026-10-23'), startTime: time('17:00'), activity: 'Dạo hồ Xuân Hương', location: 'Chợ đêm Đà Lạt' },
  { tripId: 11, activityDate: day('2026-10-10'), startTime: time('09:00'), activity: 'Cà phê', location: 'Hồ Xuân Hương' },
  { tripId: 11, activityDate: day('2026-10-10'), startTime: time('12:00'), activity: 'Ăn trưa', location: 'Quán A' },
  { tripId: 12, activityDate: day('2026-11-01'), startTime: time('08:00'), activity: 'Tham quan Dinh Bảo Đại', location: null },
  { tripId: 14, activityDate: day('2026-10-23'), startTime: time('08:00'), activity: 'Hoạt động của chuyến riêng', location: 'Hồ Xuân Hương' },
  { tripId: 20, activityDate: day('2026-11-01'), startTime: time('09:00'), activity: 'Dạo phố cổ', location: 'Hội An' },
];

const norm = (s) => String(s ?? '').toLowerCase();
const tripMatches = (t, cond) => {
  if (cond.isPublic !== undefined && t.isPublic !== cond.isPublic) return false;
  if (cond.OR) {
    return cond.OR.some((c) => (c.destinationId !== undefined && t.destinationId === c.destinationId) || (c.destination?.equals !== undefined && norm(t.destination) === norm(c.destination.equals)));
  }
  return true;
};

const fakePrisma = {
  destination: {
    findMany: async ({ where, select, include } = {}) => {
      let rows = destinations;
      if (where && 'slug' in where && where.slug === null) rows = rows.filter((d) => d.slug === null);
      if (where?.id?.not !== undefined) rows = rows.filter((d) => d.id !== where.id.not);
      return rows.map((d) => {
        const out = select ? Object.fromEntries(Object.keys(select).filter((k) => k !== 'trips').map((k) => [k, d[k]])) : { ...d };
        if (select?.trips) out.trips = trips.filter((t) => (t.destinationId === d.id || norm(t.destination) === norm(d.name)) && t.isPublic).map((t) => ({ budget: t.budget }));
        if (include?.spots) out.spots = spots.filter((s) => s.destinationId === d.id).sort((a, b) => a.sortOrder - b.sortOrder);
        if (include?.costs) out.costs = costs.filter((c) => c.destinationId === d.id).sort((a, b) => a.sortOrder - b.sortOrder);
        return out;
      });
    },
    findFirst: async ({ where, include }) => {
      const d = destinations.find((x) => x.slug === where.slug);
      if (!d) return null;
      return { ...d, spots: include?.spots ? spots.filter((s) => s.destinationId === d.id) : undefined, costs: include?.costs ? costs.filter((c) => c.destinationId === d.id) : undefined };
    },
  },
  trip: {
    findMany: async ({ where }) =>
      trips
        .filter((t) => tripMatches(t, where))
        .map((t) => ({ ...t, user: users[t.userId], _count: { clones: cloneCounts[t.id] ?? 0 } })),
  },
  itineraryItem: {
    findMany: async ({ where }) => {
      let r = items;
      if (where.tripId?.in) r = items.filter((i) => where.tripId.in.includes(i.tripId));
      else if (where.trip) r = items.filter((i) => tripMatches(trips.find((t) => t.id === i.tripId), where.trip));
      const key = (i) => `${new Date(i.activityDate).toISOString()}|${i.startTime ?? ''}`;
      return [...r].sort((a, b) => key(a).localeCompare(key(b)));
    },
  },
};

class FakeKnownError extends Error {}
jest.unstable_mockModule('@prisma/client', () => ({ PrismaClient: class {}, Prisma: { PrismaClientKnownRequestError: FakeKnownError } }));
jest.unstable_mockModule('../src/lib/prisma.js', () => ({ default: fakePrisma, prisma: fakePrisma }));

const { default: app } = await import('../src/app.js');
const { formatMonths } = await import('../src/services/destinationCatalog.service.js');

const list = (qs = '') => request(app).get(`/api/public/destinations${qs}`);
const detail = (slug) => request(app).get(`/api/public/destinations/${slug}`);
const names = (res) => res.body.items.map((d) => d.name);

/** Giả lập ngày hiện tại theo giờ Việt Nam (giữa tháng để không lệch múi giờ). */
function setMonth(month) {
  jest.spyOn(Date, 'now').mockReturnValue(new Date(`2026-${String(month).padStart(2, '0')}-15T05:00:00Z`).getTime());
}
afterEach(() => jest.restoreAllMocks());

describe('formatMonths', () => {
  test.each([
    [[11, 12, 1, 2, 3], 'Tháng 11 – 3'],
    [[4], 'Tháng 4'],
    [[3, 4, 9, 10], 'Tháng 3 – 4, 9 – 10'],
    [[12, 1], 'Tháng 12 – 1'],
    [[2, 3, 4, 5, 6, 7, 8], 'Tháng 2 – 8'],
    [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'Quanh năm'],
    [[], ''],
    [[5, 5, 13, 0], 'Tháng 5'],
  ])('%j → "%s"', (months, label) => {
    expect(formatMonths(months)).toBe(label);
  });
});

describe('GET /api/public/destinations (UC 8)', () => {
  beforeEach(() => setMonth(12));

  test('trả danh sách phân trang, giữ các trường cũ của Screen 1', async () => {
    const res = await list('?size=2');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, size: 2, total: 6, hasMore: true });
    expect(res.body.items).toHaveLength(2);
    const dl = res.body.items.find((d) => d.slug === 'da-lat');
    expect(dl).toMatchObject({ id: 1, name: 'Đà Lạt', province: 'Lâm Đồng', tagline: 'Thành phố ngàn hoa', itineraryCount: 4, fromPrice: 800000 });
  });

  test('thứ tự mặc định: nổi bật trước, rồi nhiều lịch trình', async () => {
    const res = await list();
    expect(names(res).slice(0, 2)).toEqual(['Đà Lạt', 'Hội An']);
  });

  test('điểm đến chưa có slug/tỉnh/vùng vẫn có slug từ tên và tỉnh từ địa chỉ', async () => {
    const res = await list('?q=quy%20nhon');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ slug: 'quy-nhon-cu', province: 'Bình Định', region: null, itineraryCount: 0, fromPrice: null, isFeatured: false });
  });

  describe('tìm kiếm (BR 30)', () => {
    test('theo tên, không phân biệt dấu và hoa thường', async () => {
      expect(names(await list('?q=DA%20LAT'))).toEqual(['Đà Lạt']);
      expect(names(await list('?q=%C4%91%C3%A0%20l%E1%BA%A1t'))).toEqual(['Đà Lạt']);
    });
    test('theo tỉnh', async () => {
      expect(names(await list('?q=lam%20dong'))).toEqual(['Đà Lạt']);
      expect(names(await list('?q=quang%20nam'))).toEqual(['Hội An']);
    });
    test('theo vùng', async () => {
      expect(names(await list('?q=mien%20trung'))).toEqual(['Hội An']);
      expect(names(await list('?q=Tây%20Nguyên'))).toEqual(['Đà Lạt']);
    });
    test('không có kết quả → danh sách rỗng, vẫn 200', async () => {
      const res = await list('?q=khongcogi');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ items: [], total: 0, hasMore: false });
    });
  });

  describe('lọc (BR 31)', () => {
    test('chip vùng', async () => {
      expect(names(await list('?region=SOUTH')).sort()).toEqual(['Phú Quốc', 'Vũng Tàu']);
      expect(names(await list('?region=north'))).toEqual(['Sa Pa']);
    });
    test('chip loại', async () => {
      expect(names(await list('?type=BEACH')).sort()).toEqual(['Phú Quốc', 'Vũng Tàu']);
      expect((await list('?type=MOUNTAIN')).body.total).toBe(2);
    });
    test('kết hợp vùng và loại', async () => {
      expect(names(await list('?region=HIGHLANDS&type=MOUNTAIN'))).toEqual(['Đà Lạt']);
      expect((await list('?region=SOUTH&type=MOUNTAIN')).body.total).toBe(0);
    });
    test('số lượng trên chip vùng áp dụng tìm kiếm và loại nhưng không áp dụng chính chip vùng', async () => {
      const all = await list('?region=NORTH');
      expect(all.body.regionCounts).toEqual({ ALL: 6, NORTH: 1, CENTRAL: 1, HIGHLANDS: 1, SOUTH: 2 });
      const beach = await list('?type=BEACH&region=CENTRAL');
      expect(beach.body.regionCounts).toEqual({ ALL: 2, NORTH: 0, CENTRAL: 0, HIGHLANDS: 0, SOUTH: 2 });
    });
    test('giá trị rỗng như không lọc', async () => {
      const res = await list('?region=&type=&sort=&q=&page=&size=');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(6);
    });
  });

  describe('sắp xếp (BR 31)', () => {
    test('nhiều lịch trình nhất', async () => {
      const res = await list('?sort=itineraries');
      expect(names(res)[0]).toBe('Đà Lạt'); // 4 lịch trình công khai
      expect(names(res)[1]).toBe('Hội An'); // 1 lịch trình
    });
    test('tên A–Z theo tiếng Việt', async () => {
      const res = await list('?sort=name');
      expect(names(res)).toEqual(['Đà Lạt', 'Hội An', 'Phú Quốc', 'Quy Nhơn Cũ', 'Sa Pa', 'Vũng Tàu']);
    });
  });

  describe('theo mùa (BR 28, BR 29)', () => {
    test('tháng 12: 3 điểm đến có tháng 12 hoặc tháng 1, điểm đến đang vào mùa trước', async () => {
      setMonth(12);
      const res = await list();
      expect(res.body.seasonal.months).toEqual([12, 1]);
      expect(res.body.seasonal.title).toBe('Tháng 12, 1 nên đi đâu?');
      expect(res.body.seasonal.items.map((d) => d.name)).toEqual(['Đà Lạt', 'Phú Quốc', 'Vũng Tàu']);
    });
    test('tháng 9: điểm đến có tháng 9 hoặc 10 (Sa Pa), không thêm điểm không thuộc mùa', async () => {
      setMonth(9);
      const res = await list();
      expect(res.body.seasonal.months).toEqual([9, 10]);
      expect(res.body.seasonal.items.map((d) => d.name)).toEqual(['Sa Pa']);
    });
    test('tháng 10: Sa Pa đang vào mùa nên đứng trước điểm chỉ vào mùa tháng sau (Đà Lạt tháng 11)', async () => {
      setMonth(10);
      const res = await list();
      expect(res.body.seasonal.items.map((d) => d.name).slice(0, 2)).toEqual(['Sa Pa', 'Đà Lạt']);
    });
    test('nhãn "Đang vào mùa" chỉ khi tháng hiện tại thuộc [Tháng đẹp]', async () => {
      setMonth(12);
      const dec = (await list()).body.items;
      expect(dec.find((d) => d.name === 'Đà Lạt')).toMatchObject({ inSeason: true, seasonLabel: 'Đang vào mùa', bestTime: 'Tháng 11 – 3' });
      expect(dec.find((d) => d.name === 'Sa Pa')).toMatchObject({ inSeason: false, seasonLabel: null });
      setMonth(4);
      const apr = (await list()).body.items;
      expect(apr.find((d) => d.name === 'Đà Lạt').seasonLabel).toBeNull();
      expect(apr.find((d) => d.name === 'Sa Pa').seasonLabel).toBe('Đang vào mùa');
    });
    test('dùng tháng theo giờ Việt Nam (23h ngày 30/11 UTC đã là tháng 12)', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-11-30T20:00:00Z').getTime());
      const res = await list();
      expect(res.body.seasonal.months).toEqual([12, 1]);
    });
  });

  describe('kiểm tra tham số (400, MSG 3)', () => {
    test.each(['?size=abc', '?size=0', '?size=101', '?page=0', '?page=1.5', '?region=ABC', '?type=SPACE', '?sort=random', `?q=${'a'.repeat(101)}`])(
      '%s → 400 MSG 3',
      async (qs) => {
        const res = await list(qs);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MSG 3');
        expect(res.body.errors?.length).toBeGreaterThan(0);
      },
    );
  });
});

describe('GET /api/public/destinations/{slug} (UC 9)', () => {
  beforeEach(() => setMonth(12));

  test('trả đủ các khối của Screen 4 (BR 32)', async () => {
    const res = await detail('da-lat');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(expect.arrayContaining(['id', 'name', 'slug', 'description', 'tags', 'quickInfo', 'spots', 'sampleItineraries', 'costs', 'nearby', 'bestTimeChart', 'breadcrumb', 'latitude', 'longitude']));
    expect(res.body).toMatchObject({ id: 1, name: 'Đà Lạt', slug: 'da-lat', province: 'Lâm Đồng', regionLabel: 'Tây Nguyên', categoryLabel: 'Núi rừng', inSeason: true, latitude: 11.94, longitude: 108.45 });
    expect(res.body.breadcrumb.map((b) => b.label)).toEqual(['Điểm đến', 'Tây Nguyên', 'Lâm Đồng']);
  });

  test('5 thẻ thông tin nhanh: đẹp nhất, nhiệt độ, từ TP.HCM, đi mấy ngày, lịch trình', async () => {
    const res = await detail('da-lat');
    expect(res.body.quickInfo).toEqual({ bestTime: 'Tháng 11 – 3', temperature: '16–19°C', fromHcm: '6–7 giờ đi xe', suggestedDays: '3–4 ngày', itineraryCount: 4 });
  });

  test('điểm đến thiếu dữ liệu: nhiệt độ và nhãn null, các mảng rỗng, không lỗi', async () => {
    const res = await detail('hoi-an');
    expect(res.status).toBe(200);
    expect(res.body.quickInfo).toMatchObject({ temperature: null, fromHcm: null, suggestedDays: null, itineraryCount: 1 });
    expect(res.body.spots).toEqual([]);
    expect(res.body.costs).toMatchObject({ items: [], totalPerPerson: 0, source: null });
  });

  test('địa điểm nên ghé: loại, số lịch trình có ghé (chỉ chuyến công khai), ngoài trời theo loại', async () => {
    const { spots: list_ } = (await detail('da-lat')).body;
    expect(list_.map((s) => s.name)).toEqual(['Hồ Xuân Hương', 'Chợ đêm Đà Lạt', 'Dinh Bảo Đại', 'Thác Datanla']);
    const byName = Object.fromEntries(list_.map((s) => [s.name, s]));
    expect(byName['Hồ Xuân Hương']).toMatchObject({ category: 'SIGHTSEEING', categoryLabel: 'Ngắm cảnh', latitude: 11.9437, longitude: 108.4425, outdoor: true });
    expect(byName['Hồ Xuân Hương'].itineraryCount).toBe(2); // chuyến 10 (dạo hồ) và 11; chuyến riêng tư 14 không tính
    expect(byName['Chợ đêm Đà Lạt']).toMatchObject({ categoryLabel: 'Ăn uống', outdoor: false, itineraryCount: 1 });
    expect(byName['Dinh Bảo Đại']).toMatchObject({ categoryLabel: 'Văn hóa', outdoor: false, itineraryCount: 1 });
    expect(byName['Thác Datanla']).toMatchObject({ categoryLabel: 'Trekking', outdoor: true, itineraryCount: 0 });
  });

  test('3 lịch trình mẫu: nhiều lượt dùng lại nhất, bỏ chuyến riêng tư, kèm chặng chính', async () => {
    const { sampleItineraries: s } = (await detail('da-lat')).body;
    expect(s.map((t) => t.id)).toEqual([11, 10, 13]);
    expect(s[0]).toMatchObject({ title: 'Một ngày ở Đà Lạt', days: 1, durationLabel: '1 ngày', budget: 800000, cloneCount: 5, creatorName: 'Bích Ngọc' });
    expect(s[1]).toMatchObject({ durationLabel: '3N2Đ', creatorName: 'Văn An', highlights: ['Dạo hồ Xuân Hương', 'Săn mây đồi Đa Phú'] });
    expect(s.every((t) => t.id !== 14)).toBe(true);
    expect(s).toHaveLength(3);
  });

  test('chi phí tham khảo 3N2Đ: từng khoản, tổng mỗi người và nguồn tính', async () => {
    const { costs: c } = (await detail('da-lat')).body;
    expect(c.trip).toBe('3N2Đ');
    expect(c.items.map((i) => [i.label, i.amount])).toEqual([['Xe khách', 600000], ['Homestay', 600000], ['Ăn uống', 900000], ['Vé tham quan', 250000]]);
    expect(c.totalPerPerson).toBe(2350000);
    expect(c.source).toBe('Giá tham khảo 2026');
  });

  test('điểm đến gần đó: 3 điểm gần nhất, bỏ chính nó và điểm không có tọa độ', async () => {
    const { nearby } = (await detail('da-lat')).body;
    expect(nearby).toHaveLength(3);
    expect(nearby.map((n) => n.slug)).toEqual(['vung-tau', 'hoi-an', 'phu-quoc']);
    expect(nearby.every((n) => n.slug !== 'da-lat' && n.slug !== 'quy-nhon-cu')).toBe(true);
    expect(nearby[0]).toMatchObject({ name: 'Vũng Tàu', distanceKm: expect.any(Number), travelHours: expect.any(Number) });
    expect(nearby[0].distanceKm).toBeLessThan(nearby[1].distanceKm);
  });

  test('điểm đến không có tọa độ thì không có điểm đến gần đó', async () => {
    const res = await detail('quy-nhon-cu');
    expect(res.status).toBe(200);
    expect(res.body.nearby).toEqual([]);
  });

  test('biểu đồ 12 tháng: mùa đặc biệt, đẹp nhất, còn lại vẫn đi được', async () => {
    const { bestTimeChart } = (await detail('da-lat')).body;
    expect(bestTimeChart.months).toHaveLength(12);
    const level = (m) => bestTimeChart.months.find((x) => x.month === m).level;
    expect([level(11), level(12)]).toEqual(['SPECIAL', 'SPECIAL']);
    expect([level(1), level(2), level(3)]).toEqual(['BEST', 'BEST', 'BEST']);
    expect([level(4), level(7), level(10)]).toEqual(['OK', 'OK', 'OK']);
    expect(bestTimeChart.months[0].avgTemp).toBe(16);
    expect(bestTimeChart.specialNote).toBe('Hoa dã quỳ');
  });

  test('điểm đến chưa có cột slug tìm được theo slug của tên', async () => {
    const res = await detail('quy-nhon-cu');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 6, slug: 'quy-nhon-cu', province: 'Bình Định' });
  });

  test('slug không tồn tại → 404 (UC 9 · B2a)', async () => {
    const res = await detail('khong-co');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  test.each(['Da-Lat', 'da_lat', 'da--lat', '-da-lat', 'da%20lat'])('slug sai định dạng "%s" → 404', async (slug) => {
    expect((await detail(slug)).status).toBe(404);
  });
});
