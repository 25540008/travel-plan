import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';
import { signToken } from '../src/utils/jwt.js';

// Cần DATABASE_URL trỏ tới PostgreSQL đã chạy migration (CI có sẵn). Không có thì bỏ qua.
const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb('route mẫu /api/_example/trips (auth + validate + Prisma)', () => {
  let owner;
  let stranger;

  beforeAll(async () => {
    const stamp = Date.now();
    owner = await prisma.user.create({ data: { fullName: 'Chủ chuyến', email: `owner-${stamp}@test.vn`, passwordHash: 'x' } });
    stranger = await prisma.user.create({ data: { fullName: 'Người lạ', email: `stranger-${stamp}@test.vn`, passwordHash: 'x' } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, stranger.id] } } });
    await prisma.$disconnect();
  });

  const as = (user) => `Bearer ${signToken(user)}`;

  it('tạo chuyến rồi xem lại được', async () => {
    const created = await request(app)
      .post('/api/_example/trips')
      .set('Authorization', as(owner))
      .send({ title: 'Đà Lạt', destination: 'Đà Lạt', startDate: '2026-10-23', endDate: '2026-10-25', budget: '5000000' });
    expect(created.status).toBe(201);
    expect(created.body.userId).toBe(owner.id);

    const list = await request(app).get('/api/_example/trips').set('Authorization', as(owner));
    expect(list.body.map((t) => t.id)).toContain(created.body.id);

    const detail = await request(app).get(`/api/_example/trips/${created.body.id}`).set('Authorization', as(owner));
    expect(detail.status).toBe(200);
  });

  it('ngày về trước ngày đi → 400 MSG 32', async () => {
    const res = await request(app)
      .post('/api/_example/trips')
      .set('Authorization', as(owner))
      .send({ title: 'Sai ngày', destination: 'Huế', startDate: '2026-10-25', endDate: '2026-10-23' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 32');
  });

  it('CBR 8: chuyến của người khác → 404', async () => {
    const trip = await prisma.trip.create({
      data: { userId: owner.id, title: 'Riêng tư', destination: 'Huế', startDate: new Date('2026-11-01'), endDate: new Date('2026-11-02') },
    });
    const res = await request(app).get(`/api/_example/trips/${trip.id}`).set('Authorization', as(stranger));
    expect(res.status).toBe(404);
    const bad = await request(app).get('/api/_example/trips/abc').set('Authorization', as(stranger));
    expect(bad.status).toBe(404);
  });
});
