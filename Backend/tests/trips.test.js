import { jest } from '@jest/globals';
import { createFakePrisma, fakePrismaClientModule, vnDay } from './helpers/fakePrisma.js';

// Test cho TP-19: UC 13 Xem danh sách, UC 14 Tạo, UC 15 Sửa, UC 16 Xóa chuyến đi (+ CBR 1, 2, 4, 6, 8).
// Prisma được thay bằng bản trong bộ nhớ nên chạy được mà không cần PostgreSQL.

const { prisma, db, seed } = createFakePrisma();
jest.unstable_mockModule('@prisma/client', fakePrismaClientModule);
jest.unstable_mockModule('../src/lib/prisma.js', () => ({ default: prisma, prisma }));

const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { signToken } = await import('../src/utils/jwt.js');

const owner = { id: 1, role: 'USER' };
const stranger = { id: 2, role: 'USER' };
const as = (user) => `Bearer ${signToken(user)}`;
const get = (url, user = owner) => request(app).get(url).set('Authorization', as(user));
const post = (url, body, user = owner) => request(app).post(url).set('Authorization', as(user)).send(body);
const put = (url, body, user = owner) => request(app).put(url).set('Authorization', as(user)).send(body);
const del = (url, user = owner) => request(app).delete(url).set('Authorization', as(user));

const validTrip = {
  title: 'Đà Lạt cuối tuần',
  destination: 'Đà Lạt, Lâm Đồng',
  startDate: '2026-12-04',
  endDate: '2026-12-06',
  budget: 5000000,
};

const mkTrip = (over = {}) => seed.trip({ userId: owner.id, title: 'Chuyến', destination: 'Huế', startDate: new Date(`${vnDay(10)}T00:00:00Z`), endDate: new Date(`${vnDay(12)}T00:00:00Z`), ...over });
const day = (offset) => new Date(`${vnDay(offset)}T00:00:00Z`);

beforeEach(() => {
  db.trips = [];
  db.items = [];
  db.expenses = [];
  db.nextTripId = 1;
});

describe('xác thực', () => {
  it('mọi route /api/trips cần đăng nhập → 401 MSG 10', async () => {
    for (const [method, url] of [['get', '/api/trips'], ['post', '/api/trips'], ['get', '/api/trips/1'], ['put', '/api/trips/1'], ['delete', '/api/trips/1']]) {
      const res = await request(app)[method](url);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('MSG 10');
    }
  });
});

describe('POST /api/trips (UC 14)', () => {
  it('B7: tạo chuyến thuộc người dùng trong JWT → 201, trả ngày YYYY-MM-DD và ngân sách dạng số', async () => {
    const res = await post('/api/trips', validTrip);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 1,
      title: 'Đà Lạt cuối tuần',
      destination: 'Đà Lạt, Lâm Đồng',
      startDate: '2026-12-04',
      endDate: '2026-12-06',
      totalDays: 3,
      budget: 5000000,
      isPublic: false,
      description: null,
      coverImage: null,
      itemCount: 0,
      expenseCount: 0,
      spent: 0,
    });
    expect(db.trips[0].userId).toBe(owner.id);
  });

  it('nhận tọa độ và địa chỉ từ gợi ý Nominatim, kể cả khi gửi dạng chuỗi', async () => {
    const res = await post('/api/trips', { ...validTrip, address: 'Đà Lạt, Lâm Đồng, Việt Nam', latitude: '11.9404', longitude: 108.4583, description: '  Đi chơi  ', isPublic: true });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ address: 'Đà Lạt, Lâm Đồng, Việt Nam', latitude: 11.9404, longitude: 108.4583, description: 'Đi chơi', isPublic: true });
  });

  it('ngân sách gửi dạng chuỗi số vẫn nhận', async () => {
    const res = await post('/api/trips', { ...validTrip, budget: '2500000' });
    expect(res.status).toBe(201);
    expect(res.body.budget).toBe(2500000);
  });

  it('CBR 1: thiếu hết các ô bắt buộc → 400 MSG 29 theo từng trường', async () => {
    const res = await post('/api/trips', {});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 29');
    expect(res.body.errors.map((e) => [e.field, e.code])).toEqual([
      ['title', 'MSG 29'],
      ['destination', 'MSG 29'],
      ['startDate', 'MSG 29'],
      ['endDate', 'MSG 29'],
      ['budget', 'MSG 29'],
    ]);
    expect(db.trips).toHaveLength(0);
  });

  it('CBR 2: tên và điểm đến > 150 ký tự, mô tả > 1000 ký tự → MSG 30', async () => {
    const res = await post('/api/trips', { ...validTrip, title: 'a'.repeat(151), destination: 'b'.repeat(151), description: 'c'.repeat(1001) });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { field: 'title', code: 'MSG 30', message: 'Tên chuyến đi tối đa 150 ký tự.' },
      { field: 'destination', code: 'MSG 30', message: 'Điểm đến tối đa 150 ký tự.' },
      { field: 'description', code: 'MSG 30', message: 'Mô tả tối đa 1000 ký tự.' },
    ]);
    // đúng biên thì nhận
    expect((await post('/api/trips', { ...validTrip, title: 'a'.repeat(150), destination: 'b'.repeat(150), description: 'c'.repeat(1000) })).status).toBe(201);
  });

  it('CBR 2: ngày về trước ngày đi → 400 MSG 32 gắn vào ô endDate; cùng ngày thì hợp lệ', async () => {
    const res = await post('/api/trips', { ...validTrip, startDate: '2026-12-06', endDate: '2026-12-04' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 32');
    expect(res.body.errors).toEqual([{ field: 'endDate', code: 'MSG 32', message: 'Ngày về phải bằng hoặc sau ngày đi.' }]);
    const same = await post('/api/trips', { ...validTrip, startDate: '2026-12-06', endDate: '2026-12-06' });
    expect(same.status).toBe(201);
    expect(same.body.totalDays).toBe(1);
  });

  it('CBR 1: ngày sai định dạng hoặc không có thật → MSG 3', async () => {
    for (const bad of ['06/12/2026', '2026-02-30', 'abc']) {
      const res = await post('/api/trips', { ...validTrip, startDate: bad });
      expect(res.status).toBe(400);
      expect(res.body.errors.some((e) => e.field === 'startDate' && e.code === 'MSG 3')).toBe(true);
    }
  });

  it('CBR 2: ngân sách phải > 0 → MSG 33 (0, âm); chữ hoặc quá lớn → MSG 3', async () => {
    for (const bad of [0, -5, '0']) {
      const res = await post('/api/trips', { ...validTrip, budget: bad });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([{ field: 'budget', code: 'MSG 33', message: 'Ngân sách phải lớn hơn 0.' }]);
    }
    for (const bad of ['abc', '5tr', 1e15, true]) {
      const res = await post('/api/trips', { ...validTrip, budget: bad });
      expect(res.status).toBe(400);
      expect(res.body.errors[0]).toMatchObject({ field: 'budget', code: 'MSG 3' });
    }
  });

  it('nhiều lỗi cùng lúc → trả đủ danh sách (CBR 1), MSG 32 vẫn báo khi ô khác lỗi', async () => {
    const res = await post('/api/trips', { ...validTrip, title: '', startDate: '2026-12-06', endDate: '2026-12-04', budget: 0 });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => [e.field, e.code])).toEqual([
      ['title', 'MSG 29'],
      ['budget', 'MSG 33'],
      ['endDate', 'MSG 32'],
    ]);
  });

  it('tọa độ ngoài phạm vi hoặc isPublic sai kiểu → MSG 3', async () => {
    const res = await post('/api/trips', { ...validTrip, latitude: 91, longitude: 'abc', isPublic: 'yes' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => [e.field, e.code])).toEqual([
      ['latitude', 'MSG 3'],
      ['longitude', 'MSG 3'],
      ['isPublic', 'MSG 3'],
    ]);
  });

  it('JSON hỏng → 400 MSG 3', async () => {
    const res = await request(app).post('/api/trips').set('Authorization', as(owner)).set('Content-Type', 'application/json').send('{"title":');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 3');
  });
});

describe('GET /api/trips (UC 13)', () => {
  it('chỉ trả chuyến của chính người dùng (CBR 8), mới nhất trước', async () => {
    mkTrip({ title: 'Của tôi cũ', startDate: day(5), endDate: day(6) });
    mkTrip({ title: 'Của tôi mới', startDate: day(20), endDate: day(21) });
    mkTrip({ userId: stranger.id, title: 'Của người lạ' });
    const res = await get('/api/trips');
    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.title)).toEqual(['Của tôi mới', 'Của tôi cũ']);
  });

  it('chưa có chuyến nào → mảng rỗng (frontend hiện MSG 15)', async () => {
    const res = await get('/api/trips');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('CBR 4: nhãn trạng thái Còn x ngày / Mai đi rồi / Đang đi · ngày a/b / Đã đi', async () => {
    mkTrip({ title: 'Xa', startDate: day(19), endDate: day(21) });
    mkTrip({ title: 'Mai', startDate: day(1), endDate: day(2) });
    mkTrip({ title: 'Đang', startDate: day(-1), endDate: day(1) });
    mkTrip({ title: 'Xong', startDate: day(-9), endDate: day(-7) });
    const res = await get('/api/trips');
    const by = Object.fromEntries(res.body.map((t) => [t.title, t]));
    expect(by.Xa).toMatchObject({ status: 'UPCOMING', statusLabel: 'Còn 19 ngày', daysUntil: 19 });
    expect(by.Mai).toMatchObject({ status: 'UPCOMING', statusLabel: 'Mai đi rồi', daysUntil: 1 });
    expect(by['Đang']).toMatchObject({ status: 'ONGOING', statusLabel: 'Đang đi · ngày 2/3', currentDay: 2, totalDays: 3 });
    expect(by.Xong).toMatchObject({ status: 'PAST', statusLabel: 'Đã đi' });
  });

  it('CBR 4: ngày đi là hôm nay và ngày về là hôm nay đều là Đang đi; hôm sau ngày về là Đã đi', async () => {
    mkTrip({ title: 'Bắt đầu hôm nay', startDate: day(0), endDate: day(2) });
    mkTrip({ title: 'Kết thúc hôm nay', startDate: day(-2), endDate: day(0) });
    mkTrip({ title: 'Vừa xong', startDate: day(-3), endDate: day(-1) });
    const by = Object.fromEntries((await get('/api/trips')).body.map((t) => [t.title, t]));
    expect(by['Bắt đầu hôm nay'].statusLabel).toBe('Đang đi · ngày 1/3');
    expect(by['Kết thúc hôm nay'].statusLabel).toBe('Đang đi · ngày 3/3');
    expect(by['Vừa xong'].status).toBe('PAST');
  });

  it('lọc theo tab trạng thái (?status=), không phân biệt hoa thường; rỗng = Tất cả', async () => {
    mkTrip({ title: 'Sắp', startDate: day(5), endDate: day(6) });
    mkTrip({ title: 'Đang', startDate: day(-1), endDate: day(1) });
    mkTrip({ title: 'Xong', startDate: day(-9), endDate: day(-7) });
    expect((await get('/api/trips?status=UPCOMING')).body.map((t) => t.title)).toEqual(['Sắp']);
    expect((await get('/api/trips?status=ongoing')).body.map((t) => t.title)).toEqual(['Đang']);
    expect((await get('/api/trips?status=PAST')).body.map((t) => t.title)).toEqual(['Xong']);
    expect((await get('/api/trips?status=')).body).toHaveLength(3);
    const bad = await get('/api/trips?status=abc');
    expect(bad.status).toBe(400);
    expect(bad.body.errors[0]).toMatchObject({ field: 'status', code: 'MSG 3' });
  });

  it('tìm theo tên chuyến hoặc điểm đến, không phân biệt hoa thường và dấu', async () => {
    mkTrip({ title: 'Cuối tuần chill', destination: 'Đà Lạt' });
    mkTrip({ title: 'Biển xanh', destination: 'Phú Quốc' });
    expect((await get('/api/trips?q=da lat')).body.map((t) => t.title)).toEqual(['Cuối tuần chill']);
    expect((await get('/api/trips?q=BIỂN')).body.map((t) => t.title)).toEqual(['Biển xanh']);
    expect((await get('/api/trips?q=cuoi%20tuan')).body).toHaveLength(1);
    expect((await get('/api/trips?q=khongco')).body).toEqual([]);
  });

  it('thẻ chuyến có số hoạt động, số khoản chi và đã chi (CBR 6): trong ngân sách / sắp hết quỹ / vượt', async () => {
    const ok = mkTrip({ title: 'OK', budget: 1000000 });
    const warn = mkTrip({ title: 'Sắp hết', budget: 1000000 });
    const edge = mkTrip({ title: 'Đúng 90', budget: 1000000 });
    const full = mkTrip({ title: 'Đúng 100', budget: 1000000 });
    const over = mkTrip({ title: 'Vượt', budget: 1000000 });
    seed.item(ok.id, vnDay(10));
    seed.item(ok.id, vnDay(11));
    seed.expense(ok.id, 500000);
    seed.expense(warn.id, 950000);
    seed.expense(edge.id, 900000);
    seed.expense(full.id, 1000000);
    seed.expense(over.id, 700000);
    seed.expense(over.id, 600000);
    const by = Object.fromEntries((await get('/api/trips')).body.map((t) => [t.title, t]));
    expect(by.OK).toMatchObject({ itemCount: 2, expenseCount: 1, spent: 500000, budgetPercent: 50, budgetStatus: 'OK', budgetLabel: 'Đang trong ngân sách', overAmount: 0 });
    expect(by['Sắp hết']).toMatchObject({ budgetStatus: 'WARNING', budgetLabel: 'Sắp hết quỹ', budgetPercent: 95 });
    expect(by['Đúng 90'].budgetStatus).toBe('WARNING');
    expect(by['Đúng 100'].budgetStatus).toBe('WARNING');
    expect(by['Vượt']).toMatchObject({ expenseCount: 2, spent: 1300000, budgetStatus: 'OVER', budgetLabel: 'Vượt ngân sách', overAmount: 300000 });
  });
});

describe('GET /api/trips/:id', () => {
  it('chủ chuyến xem được, kèm số hoạt động và khoản chi cho popup xoá (MSG 24)', async () => {
    const trip = mkTrip();
    seed.item(trip.id, vnDay(10));
    seed.expense(trip.id, 100000);
    seed.expense(trip.id, 200000);
    const res = await get(`/api/trips/${trip.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: trip.id, itemCount: 1, expenseCount: 2, spent: 300000 });
  });

  it('CBR 8: chuyến của người khác, chuyến không có, id sai định dạng → đều 404', async () => {
    const trip = mkTrip();
    for (const url of [`/api/trips/${trip.id}`, '/api/trips/9999', '/api/trips/abc', '/api/trips/0', '/api/trips/-1']) {
      const res = await get(url, stranger);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    }
  });
});

describe('PUT /api/trips/:id (UC 15)', () => {
  it('B5: sửa chuyến → 200, trả dữ liệu mới; chỉ đổi tên thì outOfRangeCount = 0', async () => {
    const trip = mkTrip({ startDate: day(10), endDate: day(12) });
    const res = await put(`/api/trips/${trip.id}`, { title: 'Tên mới', destination: trip.destination, startDate: vnDay(10), endDate: vnDay(12), budget: 3000000 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: trip.id, title: 'Tên mới', budget: 3000000, outOfRangeCount: 0 });
    expect(db.trips[0].title).toBe('Tên mới');
  });

  it('không gửi mô tả/địa chỉ/tọa độ thì giữ nguyên; gửi null hoặc rỗng thì xoá', async () => {
    const trip = mkTrip({ description: 'Mô tả cũ', address: 'Địa chỉ cũ', latitude: 10.5, longitude: 106.5, startDate: day(10), endDate: day(12) });
    const base = { title: 'T', destination: 'D', startDate: vnDay(10), endDate: vnDay(12), budget: 1000 };
    const keep = await put(`/api/trips/${trip.id}`, base);
    expect(keep.body).toMatchObject({ description: 'Mô tả cũ', address: 'Địa chỉ cũ', latitude: 10.5, longitude: 106.5 });
    const clear = await put(`/api/trips/${trip.id}`, { ...base, description: '', address: null, latitude: null, longitude: '' });
    expect(clear.body).toMatchObject({ description: null, address: null, latitude: null, longitude: null });
  });

  it('B6: đổi ngày, hoạt động ngoài khoảng ngày mới KHÔNG bị xoá và được đếm cho MSG 23', async () => {
    const trip = mkTrip({ startDate: day(10), endDate: day(14) });
    seed.item(trip.id, vnDay(10));
    seed.item(trip.id, vnDay(12));
    seed.item(trip.id, vnDay(14));
    seed.item(trip.id, vnDay(14));
    const res = await put(`/api/trips/${trip.id}`, { title: 'T', destination: 'D', startDate: vnDay(10), endDate: vnDay(12), budget: 1000 });
    expect(res.status).toBe(200);
    expect(res.body.outOfRangeCount).toBe(2);
    expect(res.body.itemCount).toBe(4);
    expect(db.items).toHaveLength(4);
  });

  it('B6: dời ngày về phía trước, hoạt động ở ngày cũ nằm trước ngày đi mới cũng được đếm', async () => {
    const trip = mkTrip({ startDate: day(10), endDate: day(12) });
    seed.item(trip.id, vnDay(10));
    const res = await put(`/api/trips/${trip.id}`, { title: 'T', destination: 'D', startDate: vnDay(11), endDate: vnDay(13), budget: 1000 });
    expect(res.body.outOfRangeCount).toBe(1);
  });

  it('B4: dữ liệu sai → 400 như tạo mới, không sửa gì', async () => {
    const trip = mkTrip({ title: 'Giữ nguyên' });
    const res = await put(`/api/trips/${trip.id}`, { title: '', destination: 'D', startDate: '2026-12-06', endDate: '2026-12-04', budget: 0 });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.code)).toEqual(['MSG 29', 'MSG 33', 'MSG 32']);
    expect(db.trips[0].title).toBe('Giữ nguyên');
  });

  it('B2 / CBR 8: chuyến của người khác hoặc không có → 404, không sửa được', async () => {
    const trip = mkTrip({ title: 'Của chủ' });
    const body = { title: 'Bị sửa', destination: 'D', startDate: vnDay(10), endDate: vnDay(12), budget: 1000 };
    expect((await put(`/api/trips/${trip.id}`, body, stranger)).status).toBe(404);
    expect((await put('/api/trips/9999', body)).status).toBe(404);
    expect((await put('/api/trips/abc', body)).status).toBe(404);
    expect(db.trips[0].title).toBe('Của chủ');
  });
});

describe('DELETE /api/trips/:id (UC 16)', () => {
  it('B4: xoá chuyến → 204, hoạt động và khoản chi xoá theo', async () => {
    const trip = mkTrip();
    const other = mkTrip({ title: 'Giữ lại' });
    seed.item(trip.id, vnDay(10));
    seed.expense(trip.id, 1000);
    seed.item(other.id, vnDay(10));
    const res = await del(`/api/trips/${trip.id}`);
    expect(res.status).toBe(204);
    expect(db.trips.map((t) => t.title)).toEqual(['Giữ lại']);
    expect(db.items.map((i) => i.tripId)).toEqual([other.id]);
    expect(db.expenses).toHaveLength(0);
    expect((await get(`/api/trips/${trip.id}`)).status).toBe(404);
  });

  it('CBR 8: xoá chuyến của người khác, chuyến không có, id sai → 404 và không mất dữ liệu', async () => {
    const trip = mkTrip();
    seed.item(trip.id, vnDay(10));
    expect((await del(`/api/trips/${trip.id}`, stranger)).status).toBe(404);
    expect((await del('/api/trips/9999')).status).toBe(404);
    expect((await del('/api/trips/abc')).status).toBe(404);
    expect(db.trips).toHaveLength(1);
    expect(db.items).toHaveLength(1);
  });
});
