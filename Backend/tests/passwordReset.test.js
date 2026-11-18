import { jest } from '@jest/globals';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

const users = [];
const resetTokens = [];
let nextUserId = 1;
let nextTokenId = 1;

const sameEmail = (a, b) => a.toLowerCase() === b.toLowerCase();

const fakePrisma = {
  user: {
    findFirst: async ({ where }) => users.find((u) => sameEmail(u.email, where.email.equals)) ?? null,
    findUnique: async ({ where }) => users.find((u) => u.id === where.id) ?? null,
    update: async ({ where, data }) => {
      const u = users.find((x) => x.id === where.id);
      Object.assign(u, data);
      return { ...u };
    },
  },
  passwordResetToken: {
    create: async ({ data }) => {
      const row = { id: nextTokenId++, usedAt: null, createdAt: new Date(), ...data };
      resetTokens.push(row);
      return { ...row };
    },
    findUnique: async ({ where }) => {
      const row = resetTokens.find((t) => t.tokenHash === where.tokenHash);
      return row ? { ...row } : null;
    },
    updateMany: async ({ where, data }) => {
      let count = 0;
      for (const t of resetTokens) {
        if (where.id !== undefined && t.id !== where.id) continue;
        if (where.userId !== undefined && t.userId !== where.userId) continue;
        if (where.usedAt === null && t.usedAt !== null) continue;
        if (where.expiresAt?.gt && !(t.expiresAt > where.expiresAt.gt)) continue;
        Object.assign(t, data);
        count += 1;
      }
      return { count };
    },
  },
  $transaction: async (arg) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg(fakePrisma);
  },
};

class FakeKnownError extends Error {}
jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: class {},
  Prisma: { PrismaClientKnownRequestError: FakeKnownError },
}));
jest.unstable_mockModule('../src/lib/prisma.js', () => ({ default: fakePrisma, prisma: fakePrisma }));

const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

async function seedUser(email = 'ha@travelplan.vn', plainPassword = 'oldPassword1') {
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const user = { id: nextUserId++, fullName: 'Đoàn Ngọc Hà', email, passwordHash, role: 'USER', createdAt: new Date() };
  users.push(user);
  return user;
}

beforeEach(() => {
  users.length = 0;
  resetTokens.length = 0;
  nextUserId = 1;
  nextTokenId = 1;
});

describe('POST /api/auth/forgot-password (UC 4)', () => {
  it('B4: email trống → 400 MSG 29, email sai định dạng → 400 MSG 3', async () => {
    const emptyRes = await request(app).post('/api/auth/forgot-password').send({ email: '   ' });
    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body.code).toBe('MSG 29');

    const badRes = await request(app).post('/api/auth/forgot-password').send({ email: 'email-khong-hop-le' });
    expect(badRes.status).toBe(400);
    expect(badRes.body.code).toBe('MSG 3');
  });

  it('B6, B7: email tồn tại → tạo token SHA-256 hạn 15 phút và trả 200 MSG 11', async () => {
    const user = await seedUser('user1@travelplan.vn');

    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'User1@TravelPlan.vn' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('MSG 11');

    expect(resetTokens).toHaveLength(1);
    const saved = resetTokens[0];
    expect(saved.userId).toBe(user.id);
    expect(saved.usedAt).toBeNull();
    expect(saved.tokenHash).toMatch(/^[a-f0-9]{64}$/);

    const ttlMs = saved.expiresAt.getTime() - saved.createdAt.getTime();
    expect(ttlMs).toBeGreaterThanOrEqual(14 * 60 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(16 * 60 * 1000);
  });

  it('B6: yêu cầu mới tự động hủy các token cũ chưa dùng của user', async () => {
    await seedUser('user2@travelplan.vn');

    await request(app).post('/api/auth/forgot-password').send({ email: 'user2@travelplan.vn' });
    await request(app).post('/api/auth/forgot-password').send({ email: 'user2@travelplan.vn' });

    expect(resetTokens).toHaveLength(2);
    expect(resetTokens[0].usedAt).not.toBeNull();
    expect(resetTokens[1].usedAt).toBeNull();
  });

  it('B6, B7: email không tồn tại vẫn trả 200 MSG 11 và không tạo bản ghi token', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'khongtontai@travelplan.vn' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('MSG 11');
    expect(resetTokens).toHaveLength(0);
  });

  it('B5: vượt quá 3 lần / email / 15 phút → 429 MSG 9', async () => {
    const target = 'spam@travelplan.vn';
    for (let i = 0; i < 3; i += 1) {
      const ok = await request(app).post('/api/auth/forgot-password').send({ email: target });
      expect(ok.status).toBe(200);
    }
    const blocked = await request(app).post('/api/auth/forgot-password').send({ email: target });
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('MSG 9');
  });
});

describe('POST /api/auth/reset-password (UC 5)', () => {
  it('B5: mật khẩu ngoài 6–100 ký tự → 400 MSG 4; mật khẩu nhập lại không khớp → 400 MSG 5', async () => {
    const shortRes = await request(app).post('/api/auth/reset-password').send({
      token: 'any-token',
      password: '123',
      confirmPassword: '123',
    });
    expect(shortRes.status).toBe(400);
    expect(shortRes.body.code).toBe('MSG 4');

    const mismatchRes = await request(app).post('/api/auth/reset-password').send({
      token: 'any-token',
      password: 'newPassword123',
      confirmPassword: 'otherPassword123',
    });
    expect(mismatchRes.status).toBe(400);
    expect(mismatchRes.body.code).toBe('MSG 5');
  });

  it('B2: token thiếu, không tồn tại hoặc đã hết hạn → 400 MSG 12', async () => {
    const user = await seedUser('expired@travelplan.vn');
    const expiredRaw = 'a'.repeat(64);
    resetTokens.push({
      id: nextTokenId++,
      userId: user.id,
      tokenHash: sha256(expiredRaw),
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      createdAt: new Date(Date.now() - 16 * 60 * 1000),
    });

    const missingRes = await request(app).post('/api/auth/reset-password').send({
      token: '',
      password: 'newPassword123',
      confirmPassword: 'newPassword123',
    });
    expect(missingRes.status).toBe(400);
    expect(missingRes.body.code).toBe('MSG 12');

    const invalidRes = await request(app).post('/api/auth/reset-password').send({
      token: 'b'.repeat(64),
      password: 'newPassword123',
      confirmPassword: 'newPassword123',
    });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.code).toBe('MSG 12');

    const expRes = await request(app).post('/api/auth/reset-password').send({
      token: expiredRaw,
      password: 'newPassword123',
      confirmPassword: 'newPassword123',
    });
    expect(expRes.status).toBe(400);
    expect(expRes.body.code).toBe('MSG 12');
  });

  it('B6: đặt lại mật khẩu thành công → 200 MSG 13, băm BCrypt, đăng nhập được và token bị hủy (dùng 1 lần)', async () => {
    const user = await seedUser('resetok@travelplan.vn', 'oldPassword1');
    const rawToken = 'c'.repeat(64);
    resetTokens.push({
      id: nextTokenId++,
      userId: user.id,
      tokenHash: sha256(rawToken),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      usedAt: null,
      createdAt: new Date(),
    });

    const res = await request(app).post('/api/auth/reset-password').send({
      token: rawToken,
      password: 'newPassword123',
      confirmPassword: 'newPassword123',
    });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('MSG 13');
    expect(resetTokens[0].usedAt).not.toBeNull();
    expect(await bcrypt.compare('newPassword123', users[0].passwordHash)).toBe(true);

    // Đăng nhập bằng mật khẩu mới thành công
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'resetok@travelplan.vn',
      password: 'newPassword123',
    });
    expect(loginRes.status).toBe(200);

    // Dùng lại token lần 2 → 400 MSG 12
    const reuseRes = await request(app).post('/api/auth/reset-password').send({
      token: rawToken,
      password: 'anotherPassword123',
      confirmPassword: 'anotherPassword123',
    });
    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.code).toBe('MSG 12');
  });
});