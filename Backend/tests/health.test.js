import request from 'supertest';
import app from '../src/app.js';

describe('GET /api/health', () => {
  it('trả 200 và status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('API không tồn tại trả 404 dạng JSON', async () => {
    const res = await request(app).get('/api/khong-co');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
