import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';

describe('Kiểm thử API chuyến đi /api/trips/:id (TP-21 / UC 18)', () => {
  let tokenUserA;
  let tokenUserB;
  let userA;
  let tripUserA;

  beforeAll(async () => {
    // 1. Đăng nhập hoặc tạo User A (demo)
    let resA = await request(app).post('/api/auth/login').send({
      email: 'demo@travelplan.vn',
      password: 'Demo@123',
    });

    if (resA.status !== 200) {
      await request(app).post('/api/auth/register').send({
        fullName: 'Demo User',
        email: 'demo@travelplan.vn',
        password: 'Demo@123',
        confirmPassword: 'Demo@123',
      });
      resA = await request(app).post('/api/auth/login').send({
        email: 'demo@travelplan.vn',
        password: 'Demo@123',
      });
    }
    tokenUserA = resA.body.token;

    userA = await prisma.user.findFirst({
      where: { email: 'demo@travelplan.vn' },
    });

    // Tạo sẵn 1 chuyến đi thuộc về User A
    tripUserA = await prisma.trip.create({
      data: {
        title: 'Chuyến đi thử nghiệm',
        destination: 'Đà Lạt',
        startDate: new Date('2026-12-01'),
        endDate: new Date('2026-12-05'),
        budget: 5000000,
        isPublic: false, 
        userId: userA.id,
      },
    });

    // 2. Tạo User B để kiểm tra quyền CBR 8
    let resB = await request(app).post('/api/auth/login').send({
      email: 'user_b@travelplan.vn',
      password: 'Demo@123',
    });

    if (resB.status !== 200) {
      await request(app).post('/api/auth/register').send({
        fullName: 'User B',
        email: 'user_b@travelplan.vn',
        password: 'Demo@123',
        confirmPassword: 'Demo@123',
      });
      resB = await request(app).post('/api/auth/login').send({
        email: 'user_b@travelplan.vn',
        password: 'Demo@123',
      });
    }
    tokenUserB = resB.body.token;
  });

  afterAll(async () => {
    if (tripUserA?.id) {
      await prisma.trip.deleteMany({ where: { id: tripUserA.id } });
    }
    await prisma.$disconnect();
  });

  describe('GET /api/trips/:id', () => {
    it('Lấy chuyến đi thành công khi là chủ sở hữu (200)', async () => {
      console.log('>>> tripUserA:', tripUserA);
      console.log('>>> tokenUserA:', tokenUserA);
      const res = await request(app)
        .get(`/api/trips/${tripUserA.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', tripUserA.id);
    });

    it('CBR 8: Trả về 404 khi người dùng khác truy cập chuyến', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripUserA.id}`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/trips/:id (UC 18: Bật/tắt công khai)', () => {
    it('Cập nhật trạng thái public_trip thành công (200)', async () => {
      const res = await request(app)
        .put(`/api/trips/${tripUserA.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ public_trip: true });

      expect(res.status).toBe(200);
    });

    it('CBR 2: Báo lỗi 400 nếu ngân sách <= 0 (MSG 33)', async () => {
      const res = await request(app)
        .put(`/api/trips/${tripUserA.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ budget: 0 });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('MSG 33');
    });
  });
});