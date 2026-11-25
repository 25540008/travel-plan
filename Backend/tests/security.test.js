import { jest } from '@jest/globals';

process.env.CORS_ORIGINS = 'https://travelplan-fe.onrender.com';

const fakePrisma = { user: { findFirst: async () => null } };
jest.unstable_mockModule('../src/lib/prisma.js', () => ({ default: fakePrisma, prisma: fakePrisma }));

const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');

describe('TP-54: CORS và giới hạn đăng nhập sai', () => {
  it('chặn domain lạ bằng CORS (403)', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example.com');
    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('cho phép domain trong CORS_ORIGINS', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://travelplan-fe.onrender.com');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://travelplan-fe.onrender.com');
  });

  it('đăng nhập sai lần thứ 11 trong 15 phút → 429 MSG 9', async () => {
    const ip = '10.88.0.1';
    for (let i = 0; i < 10; i++) {
      const r = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'x@example.com', password: 'wrong' });
      expect(r.status).toBe(401);
    }
    const blocked = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: 'x@example.com', password: 'wrong' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('MSG 9');
  });
});