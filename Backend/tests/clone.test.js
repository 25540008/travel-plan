import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';
import { signToken } from '../src/utils/jwt.js';

describe('UC 11: Dùng lại lịch trình (Clone) & Xếp hạng điểm đến [TP-60]', () => {
  let userOwner, userCloner, tokenCloner;
  let publicTrip, privateTrip, destination;

  beforeAll(async () => {
    // 1. Tạo users
    userOwner = await prisma.user.upsert({
      where: { email: 'owner_clone@travelplan.vn' },
      update: {},
      create: {
        fullName: 'Chủ Lịch Trình',
        email: 'owner_clone@travelplan.vn',
        passwordHash: 'dummy_hash',
      },
    });

    userCloner = await prisma.user.upsert({
      where: { email: 'user_clone@travelplan.vn' },
      update: {},
      create: {
        fullName: 'Người Dùng Clone',
        email: 'user_clone@travelplan.vn',
        passwordHash: 'dummy_hash',
      },
    });

    tokenCloner = signToken({ id: userCloner.id, role: userCloner.role });

    // 2. Tạo điểm đến
    destination = await prisma.destination.create({
      data: {
        name: 'Nha Trang',
        address: 'Khánh Hòa, Việt Nam',
        description: 'Thành phố biển xinh đẹp',
        imageUrl: 'https://images.unsplash.com/nhatrang.jpg',
      },
    });

    // 3. Tạo chuyến đi công khai (dùng items thay vì itineraryItems)
    publicTrip = await prisma.trip.create({
      data: {
        userId: userOwner.id,
        destinationId: destination.id,
        title: 'Nha Trang Biển Gọi 3N2Đ',
        destination: 'Nha Trang',
        startDate: new Date('2026-10-10T00:00:00Z'),
        endDate: new Date('2026-10-12T00:00:00Z'),
        budget: 3500000,
        isPublic: true,
        items: {
          create: [
            {
              activityDate: new Date('2026-10-10T00:00:00Z'),
              startTime: new Date('1970-01-01T08:00:00Z'),
              endTime: new Date('1970-01-01T11:00:00Z'),
              activity: 'Tắm biển Bãi Dài',
            },
            {
              activityDate: new Date('2026-10-11T00:00:00Z'),
              startTime: new Date('1970-01-01T14:00:00Z'),
              endTime: new Date('1970-01-01T17:00:00Z'),
              activity: 'Đi VinWonders',
            },
          ],
        },
        expenses: {
          create: [
            {
              description: 'Tiền phòng khách sạn',
              amount: 1200000,
              category: 'ACCOMMODATION',
              expenseDate: new Date('2026-10-10T00:00:00Z'),
            },
          ],
        },
      },
    });

    // 4. Tạo chuyến đi riêng tư của userOwner
    privateTrip = await prisma.trip.create({
      data: {
        userId: userOwner.id,
        title: 'Chuyến Đi Kín Đáo',
        destination: 'Nha Trang',
        startDate: new Date('2026-10-10T00:00:00Z'),
        endDate: new Date('2026-10-12T00:00:00Z'),
        isPublic: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.itineraryItem.deleteMany({
      where: { trip: { clonedFromId: publicTrip.id } },
    });
    await prisma.trip.deleteMany({
      where: { clonedFromId: publicTrip.id },
    });

    if (publicTrip) {
      await prisma.itineraryItem.deleteMany({ where: { tripId: publicTrip.id } });
      await prisma.expense.deleteMany({ where: { tripId: publicTrip.id } });
      await prisma.trip.delete({ where: { id: publicTrip.id } });
    }
    if (privateTrip) await prisma.trip.delete({ where: { id: privateTrip.id } });
    if (destination) await prisma.destination.delete({ where: { id: destination.id } });
    await prisma.$disconnect();
  });

  describe('POST /api/trips/:id/clone (UC 11)', () => {
    it('Chưa đăng nhập trả về 401', async () => {
      const res = await request(app).post(`/api/trips/${publicTrip.id}/clone`);
      expect(res.status).toBe(401);
    });

    it('CBR 8: Clone chuyến đi riêng tư của người khác trả về 404', async () => {
      const res = await request(app)
        .post(`/api/trips/${privateTrip.id}/clone`)
        .set('Authorization', `Bearer ${tokenCloner}`);

      expect(res.status).toBe(404);
    });

    it('Clone chuyến đi công khai thành công (201, MSG 31, chép hoạt động, không chép chi phí)', async () => {
      const res = await request(app)
        .post(`/api/trips/${publicTrip.id}/clone`)
        .set('Authorization', `Bearer ${tokenCloner}`)
        .send({ startDate: '2026-12-05' });

      expect(res.status).toBe(201);
      expect(res.body.messageCode).toBe('MSG 31');
      expect(res.body.trip).toHaveProperty('id');
      expect(res.body.trip.userId).toBe(userCloner.id);
      expect(res.body.trip.clonedFromId).toBe(publicTrip.id);
      expect(res.body.trip.isPublic).toBe(false);

      const newTripId = res.body.trip.id;

      const copiedItems = await prisma.itineraryItem.findMany({
        where: { tripId: newTripId },
        orderBy: { activityDate: 'asc' },
      });
      expect(copiedItems.length).toBe(2);
      expect(copiedItems[0].activity).toBe('Tắm biển Bãi Dài');
      expect(copiedItems[0].activityDate.toISOString().startsWith('2026-12-05')).toBe(true);
      expect(copiedItems[1].activityDate.toISOString().startsWith('2026-12-06')).toBe(true);

      const copiedExpenses = await prisma.expense.findMany({
        where: { tripId: newTripId },
      });
      expect(copiedExpenses.length).toBe(0);
    });
  });

  describe('GET /api/public/trending-destinations (Screen 1)', () => {
    it('Lấy danh sách điểm đến thịnh hành thành công', async () => {
      const res = await request(app).get('/api/public/trending-destinations');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(8);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('name');
        expect(res.body[0]).toHaveProperty('fromPrice');
      }
    });
  });
});