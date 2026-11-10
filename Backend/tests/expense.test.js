import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';
import { signToken } from '../src/utils/jwt.js';

describe('Quản lý Ngân sách và Khoản chi [TP-32]', () => {
  let user1, user2;
  let token1, token2;
  let tripUser1;
  let expenseItem;

  beforeAll(async () => {
    // Tạo 2 người dùng phục vụ kiểm tra phân quyền CBR 8
    user1 = await prisma.user.upsert({
      where: { email: 'budget_user1@travelplan.vn' },
      update: {},
      create: {
        fullName: 'Chủ Chuyến Đi',
        email: 'budget_user1@travelplan.vn',
        passwordHash: 'dummy_hash',
      },
    });

    user2 = await prisma.user.upsert({
      where: { email: 'budget_user2@travelplan.vn' },
      update: {},
      create: {
        fullName: 'Người Dùng Khác',
        email: 'budget_user2@travelplan.vn',
        passwordHash: 'dummy_hash',
      },
    });

    token1 = signToken({ id: user1.id, role: user1.role });
    token2 = signToken({ id: user2.id, role: user2.role });

    // Tạo chuyến đi mẫu
    tripUser1 = await prisma.trip.create({
      data: {
        userId: user1.id,
        title: 'Chuyến đi Hà Nội - Sapa',
        destination: 'Sapa',
        startDate: new Date('2026-12-01T00:00:00Z'),
        endDate: new Date('2026-12-05T00:00:00Z'),
        budget: 5000000,
      },
    });
  });

  afterAll(async () => {
    if (tripUser1?.id) {
      await prisma.expense.deleteMany({ where: { tripId: tripUser1.id } });
      await prisma.trip.delete({ where: { id: tripUser1.id } });
    }
    await prisma.$disconnect();
  });

  describe('CBR 8: Kiểm tra quyền truy cập chuyến đi', () => {
    it('Chuyến của người khác trả về 404', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripUser1.id}/budget`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(404);
    });

    it('ID chuyến đi không phải số trả về 404', async () => {
      const res = await request(app)
        .get('/api/trips/invalid_id/budget')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
    });
  });

  describe('UC 25: Thêm khoản chi (POST /api/trips/:id/expenses)', () => {
    it('Thêm khoản chi hợp lệ thành công (201)', async () => {
      const res = await request(app)
        .post(`/api/trips/${tripUser1.id}/expenses`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          description: 'Vé xe khách khứ hồi',
          amount: 1000000,
          category: 'TRANSPORT',
          expenseDate: '2026-12-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.expense).toHaveProperty('id');
      expect(res.body.warning).toBeNull();
      expenseItem = res.body.expense;
    });

    it('Cảnh báo MSG 28 khi khoản chi làm vượt ngân sách nhưng vẫn cho lưu', async () => {
      const res = await request(app)
        .post(`/api/trips/${tripUser1.id}/expenses`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          description: 'Khách sạn 5 sao',
          amount: 6000000, // Tổng thành 7.000.000 > 5.000.000 ngân sách
          category: 'ACCOMMODATION',
          expenseDate: '2026-12-02',
        });

      expect(res.status).toBe(201);
      expect(res.body.warning).toBe('MSG 28');
    });

    it('Báo lỗi 400 MSG 3 khi ngày chi ngoài khoảng [startDate - 30 ngày, endDate + 7 ngày]', async () => {
      const res = await request(app)
        .post(`/api/trips/${tripUser1.id}/expenses`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          description: 'Chi tiêu quá sớm',
          amount: 200000,
          category: 'OTHER',
          expenseDate: '2026-10-01', // Trước hơn 30 ngày
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MSG 3');
    });

    it('Báo lỗi 400 MSG 3 khi số tiền <= 0', async () => {
      const res = await request(app)
        .post(`/api/trips/${tripUser1.id}/expenses`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          description: 'Khoản chi lỗi',
          amount: 0,
          category: 'FOOD',
          expenseDate: '2026-12-02',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MSG 3');
    });
  });

  describe('UC 24: Xem tổng quan ngân sách (GET /api/trips/:id/budget)', () => {
    it('Trả về tổng quan, biểu đồ và danh sách phân nhóm ngày', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripUser1.id}/budget`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('overview');
      expect(res.body).toHaveProperty('charts');
      expect(res.body).toHaveProperty('groupedExpenses');
      expect(res.body.overview.statusText).toBe('Vượt ngân sách'); // Vì đã chi 7tr > 5tr
    });
  });

  describe('UC 26: Sửa & Xóa khoản chi (PUT/DELETE /api/trips/:id/expenses/:expenseId)', () => {
    it('Sửa thông tin khoản chi thành công (200)', async () => {
      const res = await request(app)
        .put(`/api/trips/${tripUser1.id}/expenses/${expenseItem.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          description: 'Vé xe Limousine giường nằm',
          amount: 1200000,
        });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Vé xe Limousine giường nằm');
      expect(Number(res.body.amount)).toBe(1200000);
    });

    it('Xóa khoản chi thành công (200)', async () => {
      const res = await request(app)
        .delete(`/api/trips/${tripUser1.id}/expenses/${expenseItem.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('UC 27: Sửa ngân sách (PUT /api/trips/:id/budget)', () => {
    it('Cập nhật ngân sách thành công và tính lại trạng thái theo CBR 6', async () => {
      const res = await request(app)
        .put(`/api/trips/${tripUser1.id}/budget`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ budget: 10000000 });

      expect(res.status).toBe(200);
      expect(res.body.budget).toBe(10000000);
      expect(res.body.statusText).toBe('Đang trong ngân sách');
    });

    it('Báo lỗi 400 MSG 33 khi ngân sách <= 0', async () => {
      const res = await request(app)
        .put(`/api/trips/${tripUser1.id}/budget`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ budget: 0 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MSG 33');
    });
  });
});