import { jest } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFakePrisma, fakePrismaClientModule } from './helpers/fakePrisma.js';

// Test cho TP-20: UC 17 Đổi ảnh bìa (PUT /api/trips/:id/cover, POST /api/trips/:id/cover/upload).
// Prisma giả trong bộ nhớ; ảnh tải lên ghi vào thư mục tạm.

const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-cover-'));
process.env.UPLOAD_DIR = uploadDir;

const { prisma, db, seed } = createFakePrisma();
jest.unstable_mockModule('@prisma/client', fakePrismaClientModule);
jest.unstable_mockModule('../src/lib/prisma.js', () => ({ default: prisma, prisma }));

const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { signToken } = await import('../src/utils/jwt.js');

const owner = { id: 1, role: 'USER' };
const stranger = { id: 2, role: 'USER' };
const as = (user) => `Bearer ${signToken(user)}`;

// Tệp mẫu: chỉ cần đúng chữ ký đầu tệp (magic bytes), phần sau là byte tuỳ ý.
const pad = (head, size = 64) => Buffer.concat([Buffer.from(head), Buffer.alloc(Math.max(0, size - head.length), 1)]);
const JPEG = pad([0xff, 0xd8, 0xff, 0xe0]);
const PNG = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WEBP'), Buffer.alloc(40, 1)]);

const coverFiles = () => (fs.existsSync(path.join(uploadDir, 'covers')) ? fs.readdirSync(path.join(uploadDir, 'covers')) : []);
const mkTrip = (over = {}) =>
  seed.trip({ userId: owner.id, title: 'Chuyến', destination: 'Huế', startDate: new Date('2026-12-04T00:00:00Z'), endDate: new Date('2026-12-06T00:00:00Z'), ...over });
const upload = (id, buf, { name = 'anh.jpg', field = 'image', user = owner } = {}) =>
  request(app).post(`/api/trips/${id}/cover/upload`).set('Authorization', as(user)).attach(field, buf, name);
const putCover = (id, body, user = owner) => request(app).put(`/api/trips/${id}/cover`).set('Authorization', as(user)).send(body);

beforeEach(() => {
  db.trips = [];
  db.nextTripId = 1;
  fs.rmSync(path.join(uploadDir, 'covers'), { recursive: true, force: true });
});
afterAll(() => fs.rmSync(uploadDir, { recursive: true, force: true }));

describe('xác thực', () => {
  it('thiếu token → 401 MSG 10', async () => {
    expect((await request(app).put('/api/trips/1/cover').send({ color: 'pine' })).status).toBe(401);
    expect((await request(app).post('/api/trips/1/cover/upload')).status).toBe(401);
  });
});

describe('PUT /api/trips/:id/cover (chọn màu hoặc dán link)', () => {
  it('B5: chọn màu → lưu màu và xoá ảnh', async () => {
    const trip = mkTrip({ coverImage: 'https://example.com/a.jpg', coverColor: null });
    const res = await putCover(trip.id, { color: 'pine' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: trip.id, coverImage: null, coverColor: 'pine' });
    expect(db.trips[0]).toMatchObject({ coverImage: null, coverColor: 'pine' });
  });

  it('nhận mã màu #RRGGBB', async () => {
    const trip = mkTrip();
    const res = await putCover(trip.id, { color: '#2f6b5c' });
    expect(res.status).toBe(200);
    expect(res.body.coverColor).toBe('#2f6b5c');
  });

  it('B5: dán link ảnh http/https → lưu ảnh và xoá màu', async () => {
    const trip = mkTrip({ coverColor: 'purple' });
    const res = await putCover(trip.id, { imageUrl: '  https://images.example.com/da-lat.jpg?w=800 ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: trip.id, coverImage: 'https://images.example.com/da-lat.jpg?w=800', coverColor: null });
  });

  it('link không phải http/https hoặc sai định dạng → 400 MSG 3', async () => {
    const trip = mkTrip();
    for (const bad of ['javascript:alert(1)', 'ftp://x.com/a.jpg', 'data:image/png;base64,AAAA', 'abc', '//x.com/a.jpg']) {
      const res = await putCover(trip.id, { imageUrl: bad });
      expect(res.status).toBe(400);
      expect(res.body.errors[0]).toMatchObject({ field: 'imageUrl', code: 'MSG 3' });
    }
  });

  it('link > 500 ký tự hoặc màu > 30 ký tự → MSG 30', async () => {
    const trip = mkTrip();
    const longUrl = await putCover(trip.id, { imageUrl: `https://x.com/${'a'.repeat(500)}` });
    expect(longUrl.status).toBe(400);
    expect(longUrl.body.errors[0]).toMatchObject({ field: 'imageUrl', code: 'MSG 30' });
    const longColor = await putCover(trip.id, { color: 'a'.repeat(31) });
    expect(longColor.status).toBe(400);
    expect(longColor.body.errors[0]).toMatchObject({ field: 'color', code: 'MSG 30' });
  });

  it('màu có ký tự lạ → 400 MSG 3', async () => {
    const trip = mkTrip();
    for (const bad of ['red;drop', '#12', 'a b', '<b>']) {
      const res = await putCover(trip.id, { color: bad });
      expect(res.status).toBe(400);
      expect(res.body.errors[0]).toMatchObject({ field: 'color', code: 'MSG 3' });
    }
  });

  it('không gửi gì hoặc gửi cả màu lẫn link → 400 MSG 3, không đổi gì', async () => {
    const trip = mkTrip({ coverColor: 'purple' });
    expect((await putCover(trip.id, {})).status).toBe(400);
    const both = await putCover(trip.id, { color: 'pine', imageUrl: 'https://x.com/a.jpg' });
    expect(both.status).toBe(400);
    expect(both.body.code).toBe('MSG 3');
    expect(db.trips[0]).toMatchObject({ coverColor: 'purple', coverImage: null });
  });

  it('CBR 8: chuyến của người khác, không có, id sai → 404 và không đổi ảnh bìa', async () => {
    const trip = mkTrip({ coverColor: 'purple' });
    expect((await putCover(trip.id, { color: 'pine' }, stranger)).status).toBe(404);
    expect((await putCover(9999, { color: 'pine' })).status).toBe(404);
    expect((await putCover('abc', { color: 'pine' })).status).toBe(404);
    expect(db.trips[0].coverColor).toBe('purple');
  });
});

describe('POST /api/trips/:id/cover/upload (tải ảnh)', () => {
  it.each([
    ['JPG', JPEG, 'jpg', 'anh.jpg'],
    ['PNG', PNG, 'png', 'anh.png'],
    ['WebP', WEBP, 'webp', 'anh.webp'],
  ])('B4, B5: nhận %s → tên ngẫu nhiên, lưu đường dẫn, xoá màu bìa', async (label, buf, ext, name) => {
    const trip = mkTrip({ coverColor: 'purple' });
    const res = await upload(trip.id, buf, { name });
    expect(res.status).toBe(200);
    expect(res.body.coverColor).toBeNull();
    expect(res.body.coverImage).toMatch(new RegExp(`^/uploads/covers/[0-9a-f-]{36}\\.${ext}$`));
    expect(res.body.coverImage).not.toContain(name.replace(`.${ext}`, ''));
    const saved = path.join(uploadDir, 'covers', path.basename(res.body.coverImage));
    expect(fs.readFileSync(saved).equals(buf)).toBe(true);
    expect(db.trips[0]).toMatchObject({ coverImage: res.body.coverImage, coverColor: null });
  });

  it('ảnh tải lên truy cập được qua /uploads và cho phép trang khác origin nhúng', async () => {
    const trip = mkTrip();
    const { body } = await upload(trip.id, PNG, { name: 'a.png' });
    const res = await request(app).get(body.coverImage);
    expect(res.status).toBe(200);
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('chấp nhận cả tên trường "file"', async () => {
    const trip = mkTrip();
    expect((await upload(trip.id, JPEG, { field: 'file' })).status).toBe(200);
  });

  it('B4a: kiểm tra nội dung chứ không tin đuôi tệp: file .jpg thực chất là văn bản hoặc exe → 400 MSG 16', async () => {
    const trip = mkTrip();
    for (const fake of [Buffer.from('<script>alert(1)</script>'.repeat(5)), Buffer.from('MZ\x90\x00'.repeat(20)), Buffer.from('GIF89a'.repeat(10))]) {
      const res = await upload(trip.id, fake, { name: 'anh.jpg' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ code: 'MSG 16', message: 'Ảnh phải là JPG, PNG hoặc WebP và không quá 5 MB.' });
    }
    expect(coverFiles()).toHaveLength(0);
    expect(db.trips[0].coverImage).toBeNull();
  });

  it('B4a: tệp rỗng hoặc quá ngắn → 400 MSG 16', async () => {
    const trip = mkTrip();
    expect((await upload(trip.id, Buffer.alloc(0), { name: 'rong.jpg' })).status).toBe(400);
    expect((await upload(trip.id, Buffer.from([0xff, 0xd8, 0xff]), { name: 'ngan.jpg' })).status).toBe(400);
  });

  it('B4a: không gửi tệp → 400 MSG 16', async () => {
    const trip = mkTrip();
    const res = await request(app).post(`/api/trips/${trip.id}/cover/upload`).set('Authorization', as(owner)).field('note', 'khong co tep');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 16');
  });

  it('B4: tối đa 5 MB: đúng 5 MB nhận, vượt 5 MB → 400 MSG 16', async () => {
    const trip = mkTrip();
    const five = pad([0xff, 0xd8, 0xff, 0xe0], 5 * 1024 * 1024);
    expect((await upload(trip.id, five)).status).toBe(200);
    const over = pad([0xff, 0xd8, 0xff, 0xe0], 5 * 1024 * 1024 + 1);
    const res = await upload(trip.id, over);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 16');
  });

  it('gửi nhiều tệp một lúc → 400 MSG 16', async () => {
    const trip = mkTrip();
    const res = await request(app).post(`/api/trips/${trip.id}/cover/upload`).set('Authorization', as(owner)).attach('image', JPEG, 'a.jpg').attach('image', PNG, 'b.png');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 16');
  });

  it('B5: tải ảnh mới thì xoá tệp ảnh cũ do hệ thống lưu; đặt màu cũng xoá tệp cũ', async () => {
    const trip = mkTrip();
    const first = await upload(trip.id, JPEG);
    const second = await upload(trip.id, PNG, { name: 'b.png' });
    expect(coverFiles()).toEqual([path.basename(second.body.coverImage)]);
    expect(first.body.coverImage).not.toBe(second.body.coverImage);
    const color = await putCover(trip.id, { color: 'pine' });
    expect(color.status).toBe(200);
    expect(coverFiles()).toHaveLength(0);
  });

  it('đổi sang link ngoài thì xoá tệp đã tải lên; link ngoài không bị đụng tới', async () => {
    const trip = mkTrip();
    await upload(trip.id, JPEG);
    expect(coverFiles()).toHaveLength(1);
    const res = await putCover(trip.id, { imageUrl: 'https://x.com/a.jpg' });
    expect(res.status).toBe(200);
    expect(coverFiles()).toHaveLength(0);
    expect((await upload(trip.id, JPEG)).status).toBe(200);
    expect(coverFiles()).toHaveLength(1);
  });

  it('CBR 8: chuyến của người khác, không có, id sai → 404 (kể cả khi tệp sai), không ghi tệp', async () => {
    const trip = mkTrip();
    expect((await upload(trip.id, JPEG, { user: stranger })).status).toBe(404);
    expect((await upload(trip.id, Buffer.from('khong phai anh'), { user: stranger })).status).toBe(404);
    expect((await upload(9999, JPEG)).status).toBe(404);
    expect((await upload('abc', JPEG)).status).toBe(404);
    expect(coverFiles()).toHaveLength(0);
    expect(db.trips[0].coverImage).toBeNull();
  });
});
