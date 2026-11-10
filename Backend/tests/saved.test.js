import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';
import { signToken } from '../src/utils/jwt.js';

describe('UC 12: Lưu / bỏ lưu (/api/me/saved) [TP-37]', () => {
  let user1, user2;
  let token1, token2;
  let publicTrip, privateTrip, destination;

  beforeAll(async () => {
    // 1. Tạo 2 người dùng phục vụ kiểm thử
    user1 = await prisma.user.upsert({
      where: { email: 'saved_user1@travelplan.vn' },
      update: {},
      create: {
        fullName: 'Người Dùng 1',
        email: 'saved_user1@travelplan.vn',
        passwordHash: 'dummy_hash',
      },
    });

    user2 = await prisma.user.upsert({
      where: { email: 'saved_user2@travelplan.vn' },
      update: {},
      create: {
        fullName: 'Người Dùng 2',
        email: 'saved_user2@travelplan.vn',
        passwordHash: 'dummy_hash',
      },
    });

    token1 = signToken({ id: user1.id, role: user1.role });
    token2 = signToken({ id: user2.id, role: user2.role });

    // 2. Tạo điểm đến test
    destination = await prisma.destination.create({
      data: {
        name: 'Đà Nẵng',
        address: 'Đà Nẵng, Việt Nam',
        description: 'Thành phố đáng sống',
      },
    });

    // 3. Tạo chuyến đi công khai của user2
    publicTrip = await prisma.trip.create({
      data: {
        userId: user2.id,
        title: 'Chuyến đi công khai',
        destination: 'Đà Nẵng',
        startDate: new Date('2026-11-20'),
        endDate: new Date('2026-11-23'),
        isPublic: true,
      },
    });

    // 4. Tạo chuyến đi riêng tư của user2
    privateTrip = await prisma.trip.create({
      data: {
        userId: user2.id,
        title: 'Chuyến đi riêng tư',
        destination: 'Đà Nẵng',
        startDate: new Date('2026-11-20'),
        endDate: new Date('2026-11-23'),
        isPublic: false,
      },
    });
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.savedItem.deleteMany({
      where: { userId: { in: [user1.id, user2.id] } },
    });
    if (publicTrip) await prisma.trip.delete({ where: { id: publicTrip.id } });
    if (privateTrip) await prisma.trip.delete({ where: { id: privateTrip.id } });
    if (destination) await prisma.destination.delete({ where: { id: destination.id } });
    await prisma.$disconnect();
  });

  describe('CBR 3: Yêu cầu đăng nhập', () => {
    it('Chưa đăng nhập gọi API trả về 401', async () => {
      const res = await request(app).get('/api/me/saved');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/me/saved (Lưu / Bỏ lưu)', () => {
    it('Lưu một điểm đến thành công (200, saved: true)', async () => {
      const res = await request(app)
        .post('/api/me/saved')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          itemType: 'DESTINATION',
          itemId: destination.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.saved).toBe(true);
      expect(res.body.data).toHaveProperty('id');
    });

    it('BR 40: Bấm lại khi đã lưu -> tự động bỏ lưu (200, saved: false)', async () => {
      const res = await request(app)
        .post('/api/me/saved')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          itemType: 'DESTINATION',
          itemId: destination.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.saved).toBe(false);
    });

    it('Lưu một chuyến đi công khai thành công', async () => {
      const res = await request(app)
        .post('/api/me/saved')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          itemType: 'TRIP',
          itemId: publicTrip.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.saved).toBe(true);
    });

    it('Lỗi khi cố lưu chuyến đi riêng tư của người khác (trả về 400 MSG 18)', async () => {
      const res = await request(app)
        .post('/api/me/saved')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          itemType: 'TRIP',
          itemId: privateTrip.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MSG 18');
    });

    it('Lỗi validate khi itemType không hợp lệ (400 MSG 3)', async () => {
      const res = await request(app)
        .post('/api/me/saved')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          itemType: 'INVALID_TYPE',
          itemId: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MSG 3');
    });
  });

  describe('GET /api/me/saved (Xem danh sách đã lưu)', () => {
    it('Lấy danh sách các mục đã lưu thành công kèm chi tiết', async () => {
      const res = await request(app)
        .get('/api/me/saved')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('details');
    });
  });

  describe('DELETE /api/me/saved (Xóa khỏi danh sách lưu)', () => {
    it('Bỏ lưu mục qua query param thành công', async () => {
      const res = await request(app)
        .delete(`/api/me/saved?itemType=TRIP&itemId=${publicTrip.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.saved).toBe(false);
    });

    it('Bỏ lưu mục chưa từng lưu trả về 404 MSG 18', async () => {
      const res = await request(app)
        .delete(`/api/me/saved?itemType=TRIP&itemId=${publicTrip.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('MSG 18');
    });
  });
});
