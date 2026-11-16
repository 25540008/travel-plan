import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';

describe('GET /api/public/destinations (Screen 1)', () => {
  let dest;
  beforeAll(async () => {
    dest = await prisma.destination.create({
      data: { name: 'Quy Nhơn Test', address: 'Bình Định, Việt Nam', isFeatured: true },
    });
  });
  afterAll(async () => {
    await prisma.destination.delete({ where: { id: dest.id } });
    await prisma.$disconnect();
  });

  it('trả danh sách có slug, phân trang theo size', async () => {
    const res = await request(app).get('/api/public/destinations?size=2');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeLessThanOrEqual(2);
    expect(res.body).toHaveProperty('hasMore');
    expect(res.body.items[0]).toHaveProperty('slug');
  });

  it('tìm theo tên không phân biệt dấu', async () => {
    const res = await request(app).get('/api/public/destinations?q=quy%20nhon');
    expect(res.status).toBe(200);
    const hit = res.body.items.find((d) => d.id === dest.id);
    expect(hit.slug).toBe('quy-nhon-test');
    expect(hit.province).toBe('Bình Định');
    expect(hit.itineraryCount).toBe(0);
    expect(hit.fromPrice).toBeNull();
  });

  it('size sai trả 400 MSG 3', async () => {
    const res = await request(app).get('/api/public/destinations?size=abc');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 3');
  });
});
