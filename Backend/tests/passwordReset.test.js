import { jest } from '@jest/globals';
import request from 'supertest';
import crypto from 'node:crypto';

// Test cho UC 4: POST /api/auth/forgot-password (TP-12).
// Prisma và hàm gửi email được thay bằng bản giả nên chạy được mà không cần PostgreSQL hay SMTP.

const users = [
  { id: 1, fullName: 'Nguyễn Văn An', email: 'an@example.com' },
  { id: 2, fullName: 'Lê Thị Bích', email: 'bich@example.com' },
];
let tokens = [];
let nextTokenId = 1;

const fakePrisma = {
  user: {
    findFirst: async ({ where }) => {
      const wanted = where.email.equals.toLowerCase();
      const u = users.find((x) => x.email.toLowerCase() === wanted);
      return u ? { ...u } : null;
    },
  },
  passwordResetToken: {
    deleteMany: ({ where }) => ({ op: 'delete', where }),
    create: ({ data }) => ({ op: 'create', data }),
  },
  // Chỉ chạy các thao tác dạng mảng {op, ...} do hai hàm trên trả về.
  $transaction: async (ops) => {
    for (const o of ops) {
      if (o.op === 'delete') tokens = tokens.filter((t) => !(t.userId === o.where.userId && t.usedAt === null));
      else tokens.push({ id: nextTokenId++, usedAt: null, createdAt: new Date(), ...o.data });
    }
  },
};

const sendMail = jest.fn(async () => {});

class FakeKnownError extends Error {}
jest.unstable_mockModule('@prisma/client', () => ({ PrismaClient: class {}, Prisma: { PrismaClientKnownRequestError: FakeKnownError } }));
jest.unstable_mockModule('../src/lib/prisma.js', () => ({ default: fakePrisma, prisma: fakePrisma }));
jest.unstable_mockModule('../src/utils/mailer.js', () => ({
  frontendUrl: () => 'http://localhost:8080',
  sendPasswordResetMail: (...args) => sendMail(...args),
  buildPasswordResetEmail: () => ({}),
}));

const { default: app } = await import('../src/app.js');
const { forgotPasswordLimiter } = await import('../src/middlewares/forgotPasswordLimiter.js');

const post = (body) => request(app).post('/api/auth/forgot-password').send(body);
const MSG_11 = 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu. Link có hiệu lực trong 15 phút.';
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
let n = 0;
const uniqueUnknown = () => `khong-co-${++n}-${Date.now()}@example.com`;

beforeEach(async () => {
  // Bộ đếm giới hạn nằm trong bộ nhớ, đặt lại để các test không ảnh hưởng nhau
  for (const u of users) await forgotPasswordLimiter.resetKey(`forgot:${u.email.toLowerCase()}`);
  tokens = [];
  sendMail.mockClear();
  sendMail.mockImplementation(async () => {});
});

describe('UC 4 · B6, B7: email tồn tại', () => {
  test('trả 200 MSG 11, lưu token đã băm hết hạn sau 15 phút và gửi email có link chứa token', async () => {
    const before = Date.now();
    const res = await post({ email: 'an@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'MSG 11', message: MSG_11 });

    expect(tokens).toHaveLength(1);
    const [row] = tokens;
    expect(row.userId).toBe(1);
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    const ttl = row.expiresAt.getTime() - before;
    expect(ttl).toBeGreaterThan(14 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(15 * 60 * 1000 + 2000);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const arg = sendMail.mock.calls[0][0];
    expect(arg).toMatchObject({ to: 'an@example.com', fullName: 'Nguyễn Văn An' });
    const m = arg.link.match(/^http:\/\/localhost:8080\/dat-lai-mat-khau\.html\?token=([0-9a-f]{64})$/);
    expect(m).not.toBeNull();
    // Chỉ lưu SHA-256, không lưu chuỗi gốc (32 byte = 64 ký tự hex)
    expect(row.tokenHash).toBe(sha(m[1]));
    expect(row.tokenHash).not.toBe(m[1]);
  });

  test('so email không phân biệt hoa thường', async () => {
    const res = await post({ email: 'AN@Example.COM' });
    expect(res.status).toBe(200);
    expect(tokens).toHaveLength(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  test('hủy token cũ chưa dùng của user, giữ token đã dùng và token của user khác', async () => {
    tokens = [
      { id: 100, userId: 1, tokenHash: 'a'.repeat(64), expiresAt: new Date(Date.now() + 60000), usedAt: null },
      { id: 101, userId: 1, tokenHash: 'b'.repeat(64), expiresAt: new Date(Date.now() + 60000), usedAt: new Date() },
      { id: 102, userId: 2, tokenHash: 'c'.repeat(64), expiresAt: new Date(Date.now() + 60000), usedAt: null },
    ];
    const res = await post({ email: 'an@example.com' });
    expect(res.status).toBe(200);
    const hashes = tokens.map((t) => t.tokenHash);
    expect(hashes).not.toContain('a'.repeat(64));
    expect(hashes).toContain('b'.repeat(64));
    expect(hashes).toContain('c'.repeat(64));
    expect(tokens.filter((t) => t.userId === 1 && t.usedAt === null)).toHaveLength(1);
  });

  test('hai lần yêu cầu cho cùng user cho hai token khác nhau', async () => {
    await post({ email: 'bich@example.com' });
    const first = sendMail.mock.calls[0][0].link;
    await post({ email: 'bich@example.com' });
    const second = sendMail.mock.calls[1][0].link;
    expect(first).not.toBe(second);
    expect(tokens.filter((t) => t.userId === 2)).toHaveLength(1); // chỉ còn token mới nhất
  });
});

describe('UC 4 · B6, B7: email không tồn tại', () => {
  test('vẫn trả 200 MSG 11 như thành công, không tạo token, không gửi email', async () => {
    const res = await post({ email: uniqueUnknown() });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'MSG 11', message: MSG_11 });
    expect(tokens).toHaveLength(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('phản hồi giống hệt nhau giữa email có và không có tài khoản (không lộ email)', async () => {
    const a = await post({ email: 'bich@example.com' });
    const b = await post({ email: uniqueUnknown() });
    expect(a.status).toBe(b.status);
    expect(a.body).toEqual(b.body);
  });
});

describe('UC 4 · B3: gửi email nền, lỗi gửi không lộ ra người dùng', () => {
  test('gửi email lỗi (Promise reject) vẫn trả 200 MSG 11 và ghi log', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    sendMail.mockImplementation(() => Promise.reject(new Error('SMTP down')));
    const res = await post({ email: 'an@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('MSG 11');
    await new Promise((r) => setTimeout(r, 20));
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.flat().join(' ')).toContain('SMTP down');
    spy.mockRestore();
  });

  test('hàm gửi email ném lỗi đồng bộ cũng không làm hỏng response', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    sendMail.mockImplementation(() => {
      throw new Error('Chưa cấu hình SMTP_HOST');
    });
    const res = await post({ email: 'bich@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('MSG 11');
    spy.mockRestore();
  });

  test('không chờ email gửi xong mới trả response', async () => {
    sendMail.mockImplementation(() => new Promise(() => {})); // không bao giờ xong
    const res = await post({ email: 'an@example.com' });
    expect(res.status).toBe(200);
  });
});

describe('UC 4 · B4: kiểm tra email (CBR 1)', () => {
  test('sai định dạng → 400 MSG 3 kèm lỗi theo trường', async () => {
    const res = await post({ email: 'khong-phai-email' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 3');
    expect(res.body.errors[0]).toMatchObject({ field: 'email', code: 'MSG 3' });
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('để trống hoặc thiếu trường → 400 MSG 29', async () => {
    const empty = await post({ email: '' });
    expect(empty.status).toBe(400);
    expect(empty.body.code).toBe('MSG 29');
    const missing = await post({});
    expect(missing.status).toBe(400);
    expect(missing.body.errors[0]).toMatchObject({ field: 'email', code: 'MSG 29' });
  });

  test('quá 150 ký tự → 400 MSG 30', async () => {
    const res = await post({ email: `${'a'.repeat(145)}@example.com` });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 30');
  });

  test('lỗi định dạng không bị tính vào giới hạn 3 lần', async () => {
    for (let i = 0; i < 5; i += 1) await post({ email: 'sai-dinh-dang' });
    const res = await post({ email: 'an@example.com' });
    expect(res.status).toBe(200);
  });
});

describe('UC 4 · B5 (BR 14): tối đa 3 yêu cầu cho một email trong 15 phút', () => {
  test('lần thứ 4 → 429 MSG 9 và không gửi thêm email', async () => {
    const email = 'limit-co-tk@example.com';
    users.push({ id: 9, fullName: 'Tài Khoản Thử', email });
    try {
      for (let i = 0; i < 3; i += 1) expect((await post({ email })).status).toBe(200);
      const res = await post({ email });
      expect(res.status).toBe(429);
      expect(res.body.code).toBe('MSG 9');
      expect(res.body.message).toBe('Bạn thử quá nhiều lần. Vui lòng thử lại sau 15 phút.');
      expect(sendMail).toHaveBeenCalledTimes(3);
    } finally {
      users.pop();
    }
  });

  test('email không tồn tại cũng bị giới hạn như email có tài khoản (không lộ email)', async () => {
    const email = uniqueUnknown();
    const statuses = [];
    for (let i = 0; i < 4; i += 1) statuses.push((await post({ email })).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  test('giới hạn tính theo email, không chặn email khác và không phân biệt hoa thường', async () => {
    const email = uniqueUnknown();
    for (let i = 0; i < 3; i += 1) await post({ email });
    expect((await post({ email: email.toUpperCase() })).status).toBe(429);
    expect((await post({ email: uniqueUnknown() })).status).toBe(200);
  });
});
