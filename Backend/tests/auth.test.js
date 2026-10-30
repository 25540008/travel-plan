import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Test cho UC 1 Đăng ký, UC 2 Đăng nhập, GET /api/auth/me (TP-09, TP-10).
// Prisma được thay bằng kho user trong bộ nhớ nên chạy được mà không cần PostgreSQL.
// Luồng DB thật được kiểm tra thêm ở tests/example.db.test.js trên CI.

const users = [];
let nextId = 1;
let failNextCreateWithP2002 = false;

const sameEmail = (a, b) => a.toLowerCase() === b.toLowerCase();
const pick = (u, select) => (select ? Object.fromEntries(Object.keys(select).map((k) => [k, u[k]])) : u);

const fakePrisma = {
  user: {
    findFirst: async ({ where }) => users.find((u) => sameEmail(u.email, where.email.equals)) ?? null,
    findUnique: async ({ where, select }) => {
      const u = users.find((x) => x.id === where.id);
      return u ? pick(u, select) : null;
    },
    create: async ({ data, select }) => {
      if (failNextCreateWithP2002) {
        failNextCreateWithP2002 = false;
        throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      }
      const u = { id: nextId++, role: 'USER', createdAt: new Date(), ...data };
      users.push(u);
      return pick(u, select);
    },
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
const { env } = await import('../src/config/env.js');

const validBody = {
  fullName: 'Nguyễn Văn A',
  email: 'a@example.com',
  password: 'matkhau1',
  confirmPassword: 'matkhau1',
};

// trust proxy = 1 nên mỗi test dùng một IP riêng qua X-Forwarded-For để bộ đếm đăng nhập sai không dính nhau.
let ipSeq = 0;
const freshIp = () => `10.0.0.${++ipSeq}`;

const register = (body, ip = freshIp()) =>
  request(app).post('/api/auth/register').set('X-Forwarded-For', ip).send(body);
const login = (body, ip = freshIp()) =>
  request(app).post('/api/auth/login').set('X-Forwarded-For', ip).send(body);

beforeEach(() => {
  users.length = 0;
  nextId = 1;
  failNextCreateWithP2002 = false;
});

describe('POST /api/auth/register (UC 1)', () => {
  it('B6: tạo tài khoản → 201, trả token + user, mật khẩu được băm BCrypt, JWT hạn 24 giờ', async () => {
    const res = await register(validBody);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ id: 1, fullName: 'Nguyễn Văn A', email: 'a@example.com', role: 'USER' });
    expect(res.body.user.createdAt).toBeTruthy();
    expect(res.body.user).not.toHaveProperty('passwordHash');

    expect(users[0].passwordHash).not.toBe('matkhau1');
    expect(users[0].passwordHash).toMatch(/^\$2[aby]\$10\$/); // BCrypt cost 10 (NFR 3)
    expect(await bcrypt.compare('matkhau1', users[0].passwordHash)).toBe(true);

    const payload = jwt.verify(res.body.token, env.jwtSecret);
    expect(payload.sub).toBe('1');
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
  });

  it('token nhận được dùng ngay được cho GET /api/auth/me', async () => {
    const { body } = await register(validBody);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.token}`);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ id: 1, fullName: 'Nguyễn Văn A', email: 'a@example.com' });
  });

  it('email được lưu dạng chữ thường và tên được trim', async () => {
    const res = await register({ ...validBody, fullName: '  Trần B  ', email: '  Tran.B@Example.COM ' });
    expect(res.status).toBe(201);
    expect(users[0]).toMatchObject({ fullName: 'Trần B', email: 'tran.b@example.com' });
  });

  it('thanh độ mạnh chỉ gợi ý: mật khẩu yếu nhưng đủ 6 ký tự vẫn tạo được', async () => {
    const res = await register({ ...validBody, password: '123456', confirmPassword: '123456' });
    expect(res.status).toBe(201);
  });

  it('B4: ô bắt buộc để trống → 400 MSG 29 theo từng trường', async () => {
    const res = await register({ fullName: ' ', email: '', password: '', confirmPassword: '' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 29');
    expect(res.body.errors).toEqual([
      { field: 'fullName', code: 'MSG 29', message: 'Vui lòng nhập họ và tên.' },
      { field: 'email', code: 'MSG 29', message: 'Vui lòng nhập email.' },
      { field: 'password', code: 'MSG 29', message: 'Vui lòng nhập mật khẩu.' },
    ]);
  });

  it('B4: thiếu hẳn trường trong body → 400 MSG 29', async () => {
    const res = await register({});
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => [e.field, e.code])).toEqual([
      ['fullName', 'MSG 29'],
      ['email', 'MSG 29'],
      ['password', 'MSG 29'],
      ['confirmPassword', 'MSG 29'],
    ]);
  });

  it('B4: họ tên > 100 ký tự và email > 150 ký tự → MSG 30', async () => {
    const res = await register({ ...validBody, fullName: 'a'.repeat(101), email: `${'a'.repeat(145)}@x.com` });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { field: 'fullName', code: 'MSG 30', message: 'Họ và tên tối đa 100 ký tự.' },
      { field: 'email', code: 'MSG 30', message: 'Email tối đa 150 ký tự.' },
    ]);
  });

  it('B4: email sai định dạng → 400 MSG 3', async () => {
    for (const bad of ['abc', 'a@', '@x.com', 'a b@x.com']) {
      const res = await register({ ...validBody, email: bad });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MSG 3');
      expect(res.body.errors[0].field).toBe('email');
    }
  });

  it('B4: mật khẩu ngắn hơn 6 hoặc dài hơn 100 ký tự → 400 MSG 4', async () => {
    for (const pw of ['12345', 'a'.repeat(101)]) {
      const res = await register({ ...validBody, password: pw, confirmPassword: pw });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MSG 4');
      expect(res.body.errors).toEqual([{ field: 'password', code: 'MSG 4', message: 'Mật khẩu phải từ 6 đến 100 ký tự.' }]);
    }
    // 6 và 100 ký tự đều hợp lệ (biên)
    expect((await register({ ...validBody, password: 'a'.repeat(6), confirmPassword: 'a'.repeat(6) })).status).toBe(201);
    expect((await register({ ...validBody, email: 'b@example.com', password: 'a'.repeat(100), confirmPassword: 'a'.repeat(100) })).status).toBe(201);
  });

  it('B4: nhập lại mật khẩu không khớp → 400 MSG 5 gắn vào ô confirmPassword', async () => {
    const res = await register({ ...validBody, confirmPassword: 'matkhau2' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 5');
    expect(res.body.errors).toEqual([{ field: 'confirmPassword', code: 'MSG 5', message: 'Mật khẩu nhập lại không khớp.' }]);
  });

  it('B4: nhiều lỗi cùng lúc → trả đủ danh sách theo trường (CBR 1)', async () => {
    const res = await register({ ...validBody, email: 'abc', confirmPassword: 'khac' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => [e.field, e.code])).toEqual([
      ['email', 'MSG 3'],
      ['confirmPassword', 'MSG 5'],
    ]);
    expect(users).toHaveLength(0);
  });

  it('B5: email đã có tài khoản (không phân biệt hoa thường) → 409 MSG 7', async () => {
    expect((await register(validBody)).status).toBe(201);
    const res = await register({ ...validBody, email: 'A@EXAMPLE.COM', fullName: 'Người khác' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ code: 'MSG 7', message: 'Email này đã có tài khoản. Đăng nhập luôn?' });
    expect(users).toHaveLength(1);
  });

  it('B5: trùng email với bản ghi cũ lưu chữ hoa vẫn bị chặn', async () => {
    users.push({ id: 99, fullName: 'Cũ', email: 'Old@Example.com', passwordHash: 'x', role: 'USER', createdAt: new Date() });
    const res = await register({ ...validBody, email: 'old@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MSG 7');
  });

  it('B5: hai yêu cầu song song cùng email, DB báo P2002 → vẫn 409 MSG 7', async () => {
    failNextCreateWithP2002 = true;
    const res = await register(validBody);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MSG 7');
  });

  it('JSON hỏng → 400 MSG 3', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 3');
  });
});

describe('POST /api/auth/login (UC 2)', () => {
  beforeEach(async () => {
    await register(validBody);
  });

  it('B6, B7: đúng email và mật khẩu → 200, trả token + user, JWT hạn 24 giờ', async () => {
    const res = await login({ email: 'a@example.com', password: 'matkhau1' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 1, fullName: 'Nguyễn Văn A', email: 'a@example.com', role: 'USER' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    const payload = jwt.verify(res.body.token, env.jwtSecret);
    expect(payload.sub).toBe('1');
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
  });

  it('email không phân biệt hoa thường và được trim', async () => {
    const res = await login({ email: '  A@Example.COM ', password: 'matkhau1' });
    expect(res.status).toBe(200);
  });

  it('B4: email trống → 400 MSG 1; mật khẩu trống → 400 MSG 2; cả hai trống → báo cả hai', async () => {
    const noEmail = await login({ email: '', password: 'x' });
    expect(noEmail.status).toBe(400);
    expect(noEmail.body.errors).toEqual([{ field: 'email', code: 'MSG 1', message: 'Vui lòng nhập email.' }]);

    const noPw = await login({ email: 'a@example.com', password: '' });
    expect(noPw.status).toBe(400);
    expect(noPw.body.errors).toEqual([{ field: 'password', code: 'MSG 2', message: 'Vui lòng nhập mật khẩu.' }]);

    const both = await login({});
    expect(both.status).toBe(400);
    expect(both.body.code).toBe('MSG 1');
    expect(both.body.errors.map((e) => e.code)).toEqual(['MSG 1', 'MSG 2']);
  });

  it('B6a: sai mật khẩu và sai email đều trả cùng một thông báo MSG 6 (401)', async () => {
    const wrongPw = await login({ email: 'a@example.com', password: 'saisai' });
    const wrongEmail = await login({ email: 'khong-co@example.com', password: 'matkhau1' });
    expect(wrongPw.status).toBe(401);
    expect(wrongEmail.status).toBe(401);
    expect(wrongPw.body).toEqual({ code: 'MSG 6', message: 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.' });
    expect(wrongEmail.body).toEqual(wrongPw.body);
  });

  it('B5a: quá 10 lần sai trên một IP → 429 MSG 9, kể cả khi lần sau nhập đúng', async () => {
    const ip = freshIp();
    for (let i = 0; i < 10; i++) {
      const res = await login({ email: 'a@example.com', password: 'sai' }, ip);
      expect(res.status).toBe(401);
    }
    const blocked = await login({ email: 'a@example.com', password: 'sai' }, ip);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ code: 'MSG 9', message: 'Bạn thử quá nhiều lần. Vui lòng thử lại sau 15 phút.' });

    const correctButBlocked = await login({ email: 'a@example.com', password: 'matkhau1' }, ip);
    expect(correctButBlocked.status).toBe(429);

    // IP khác không bị ảnh hưởng
    expect((await login({ email: 'a@example.com', password: 'matkhau1' })).status).toBe(200);
  });

  it('B5: đăng nhập đúng và lỗi trống (400) không bị tính vào giới hạn', async () => {
    const ip = freshIp();
    for (let i = 0; i < 9; i++) await login({ email: 'a@example.com', password: 'sai' }, ip);
    for (let i = 0; i < 5; i++) expect((await login({ email: '', password: '' }, ip)).status).toBe(400);
    for (let i = 0; i < 5; i++) expect((await login({ email: 'a@example.com', password: 'matkhau1' }, ip)).status).toBe(200);
    // mới sai 9 lần nên lần sai thứ 10 vẫn là 401, lần thứ 11 mới bị chặn
    expect((await login({ email: 'a@example.com', password: 'sai' }, ip)).status).toBe(401);
    expect((await login({ email: 'a@example.com', password: 'sai' }, ip)).status).toBe(429);
  });
});

describe('GET /api/auth/me', () => {
  it('có token hợp lệ → 200 thông tin tài khoản, không lộ passwordHash', async () => {
    const { body } = await register(validBody);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.token}`);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['createdAt', 'email', 'fullName', 'id', 'role']);
  });

  it('thiếu token → 401 MSG 10', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('MSG 10');
  });

  it('token sai chữ ký hoặc đã hết hạn → 401 MSG 10', async () => {
    const forged = jwt.sign({ sub: '1', role: 'USER' }, 'secret-khac');
    const expired = jwt.sign({ sub: '1', role: 'USER' }, env.jwtSecret, { expiresIn: -10 });
    for (const t of [forged, expired, 'abc']) {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${t}`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('MSG 10');
    }
  });

  it('token còn hạn nhưng tài khoản đã bị xoá → 401 MSG 10', async () => {
    const { body } = await register(validBody);
    users.length = 0;
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.token}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('MSG 10');
  });
});
