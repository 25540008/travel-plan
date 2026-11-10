import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';
import { signToken } from '../src/utils/jwt.js';

describe('Itinerary APIs [TP-26]', () => {
  let user1;
  let user2;
  let token1;
  let token2;
  let testTrip;
  let createdItemId;

  beforeAll(async () => {
    // 1. Tạo 2 user
    user1 = await prisma.user.upsert({
      where: { email: 'user1_test@travelplan.vn' },
      update: {},
      create: {
        fullName: 'Chủ Chuyến Đi',
        email: 'user1_test@travelplan.vn',
        passwordHash: 'dummy_hash',
      },
    });

    user2 = await prisma.user.upsert({
      where: { email: 'user2_test@travelplan.vn' },
      update: {},
      create: {
        fullName: 'Người Dùng Khác',
        email: 'user2_test@travelplan.vn',
        passwordHash: 'dummy_hash',
      },
    });

    // 2. Ký token chuẩn theo đúng cách của hệ thống
    token1 = signToken({ id: user1.id, role: user1.role });
    token2 = signToken({ id: user2.id, role: user2.role });

    // 3. Tạo chuyến đi test
    testTrip = await prisma.trip.create({
      data: {
        userId: user1.id,
        title: 'Chuyến Đi Đà Lạt',
        destination: 'Đà Lạt',
        startDate: new Date('2026-10-23T00:00:00Z'),
        endDate: new Date('2026-10-25T00:00:00Z'),
        budget: 5000000,
      },
    });
  });

  afterAll(async () => {
    if (testTrip) {
      await prisma.itineraryItem.deleteMany({ where: { tripId: testTrip.id } });
      await prisma.trip.delete({ where: { id: testTrip.id } });
    }
    await prisma.$disconnect();
  });

  describe('GET /api/public/weather', () => {
    it('trả về 200 khi tham số lat, lng hợp lệ', async () => {
      const res = await request(app).get('/api/public/weather?lat=11.94&lng=108.45&days=3');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('daily');
    });

    it('trả về 400 MSG 3 khi lat/lng không phải là số', async () => {
      const res = await request(app).get('/api/public/weather?lat=abc&lng=108.45');
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MSG 3');
    });
  });

  describe('CBR 8: Bảo vệ quyền dữ liệu chuyến đi', () => {
    it('trả về 404 khi truy cập chuyến đi của người khác', async () => {
      const res = await request(app)
        .get(`/api/trips/${testTrip.id}/itinerary`)
        .set('Authorization', `Bearer ${token2}`);
      expect(res.status).toBe(404);
    });

    it('trả về 404 khi tripId trên params không hợp lệ', async () => {
      const res = await request(app)
        .get('/api/trips/not-a-number/itinerary')
        .set('Authorization', `Bearer ${token1}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/trips/:id/itinerary', () => {
    it('thêm thành công hoạt động hợp lệ', async () => {
      const res = await request(app)
        .post(`/api/trips/${testTrip.id}/itinerary`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          activityDate: '2026-10-24',
          startTime: '05:00',
          endTime: '08:00',
          activity: 'Săn mây đồi Đa Phú',
          location: 'Đồi Đa Phú',
        });

      expect(res.status).toBe(201);
      expect(res.body.messageCode).toBe('MSG 21');
      expect(res.body).toHaveProperty('id');
      createdItemId = res.body.id;
    });

    it('trả về 400 MSG 8 khi endTime <= startTime', async () => {
      const res = await request(app)
        .post(`/api/trips/${testTrip.id}/itinerary`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          activityDate: '2026-10-24',
          startTime: '09:00',
          endTime: '08:00',
          activity: 'Cà phê view đồi',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MSG 8');
    });

    it('trả về 400 MSG 29 khi thiếu tên hoạt động', async () => {
      const res = await request(app)
        .post(`/api/trips/${testTrip.id}/itinerary`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          activityDate: '2026-10-24',
          startTime: '09:00',
          endTime: '11:00',
          activity: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MSG 29');
    });

    it('CBR 7: vẫn lưu thành công nhưng có trường warning cảnh báo trùng giờ', async () => {
      const res = await request(app)
        .post(`/api/trips/${testTrip.id}/itinerary`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          activityDate: '2026-10-24',
          startTime: '06:00',
          endTime: '07:30',
          activity: 'Ăn sáng sớm',
        });

      expect(res.status).toBe(201);
      expect(res.body.warning).toContain('Trùng giờ');
    });
  });

  describe('PUT & DELETE /api/trips/:id/itinerary/:itemId', () => {
    it('sửa hoạt động thành công', async () => {
      const targetId = createdItemId || (await prisma.itineraryItem.findFirst({ where: { tripId: testTrip.id } }))?.id;

      const res = await request(app)
        .put(`/api/trips/${testTrip.id}/itinerary/${targetId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ activity: 'Săn mây đồi Đa Phú (Đã cập nhật)' });

      expect(res.status).toBe(200);
      expect(res.body.activity).toBe('Săn mây đồi Đa Phú (Đã cập nhật)');
    });

    it('xóa hoạt động thành công', async () => {
      const targetId = createdItemId || (await prisma.itineraryItem.findFirst({ where: { tripId: testTrip.id } }))?.id;

      const res = await request(app)
        .delete(`/api/trips/${testTrip.id}/itinerary/${targetId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
