import request from 'supertest';
import app from '../src/app.js';
import { signToken } from '../src/utils/jwt.js';

// Các test này không cần database: auth và validate chặn trước khi gọi Prisma.
const token = signToken({ id: 1, role: 'USER' });

describe('middleware auth', () => {
  it('thiếu token → 401 MSG 10', async () => {
    const res = await request(app).get('/api/_example/trips');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'MSG 10', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
  });

  it('token sai → 401 MSG 10', async () => {
    const res = await request(app).get('/api/_example/trips').set('Authorization', 'Bearer abc');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('MSG 10');
  });
});

describe('middleware validate', () => {
  const post = (body) =>
    request(app).post('/api/_example/trips').set('Authorization', `Bearer ${token}`).send(body);

  it('ô bắt buộc trống → 400 MSG 29 theo từng trường', async () => {
    const res = await post({ title: '  ', destination: 'Đà Lạt', startDate: '2026-10-23', endDate: '2026-10-25' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 29');
    expect(res.body.errors).toEqual([{ field: 'title', code: 'MSG 29', message: 'Vui lòng nhập tên chuyến.' }]);
  });

  it('vượt độ dài → MSG 30, sai định dạng ngày → MSG 3', async () => {
    const res = await post({ title: 'a'.repeat(151), destination: 'Đà Lạt', startDate: '23/10/2026', endDate: '2026-10-25' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { field: 'title', code: 'MSG 30', message: 'Tên chuyến tối đa 150 ký tự.' },
      { field: 'startDate', code: 'MSG 3', message: 'Giá trị không đúng định dạng.' },
    ]);
  });

  it('JSON hỏng → 400 MSG 3', async () => {
    const res = await request(app)
      .post('/api/_example/trips')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send('{"title":');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MSG 3');
  });
});
