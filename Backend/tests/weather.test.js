import { jest } from '@jest/globals';
import request from 'supertest';

// Test cho UC 10 Xem thời tiết điểm đến (GET /api/public/weather) và kiểm tra dữ liệu hoạt động (TP-27).
// fetch và Prisma đều được thay bằng bản giả: không gọi Open-Meteo thật, không cần PostgreSQL.

class FakeKnownError extends Error {}
jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: class {},
  Prisma: { PrismaClientKnownRequestError: FakeKnownError },
}));
const fakePrisma = {};
jest.unstable_mockModule('../src/lib/prisma.js', () => ({ default: fakePrisma, prisma: fakePrisma }));

const { default: app } = await import('../src/app.js');
const { getWeather, clearWeatherCache } = await import('../src/services/weather.service.js');
const { wmoInfo } = await import('../src/utils/wmo.js');

/** Dữ liệu giống Open-Meteo: `days` ngày bắt đầu từ 2026-11-10, mỗi ngày 24 giờ. */
function openMeteoBody(days = 3) {
  const dates = Array.from({ length: days }, (_, i) => `2026-11-${String(10 + i).padStart(2, '0')}`);
  const hours = dates.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`));
  return {
    current: { time: '2026-11-10T10:00', temperature_2m: 22.5, relative_humidity_2m: 80, weather_code: 2, wind_speed_10m: 7.2 },
    daily: {
      time: dates,
      weather_code: dates.map((_, i) => [0, 63, 95][i % 3]),
      temperature_2m_max: dates.map(() => 27),
      temperature_2m_min: dates.map(() => 17),
      precipitation_probability_max: dates.map((_, i) => 10 + i * 30),
    },
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, i) => 15 + (i % 24)),
      weather_code: hours.map(() => 3),
      precipitation_probability: hours.map((_, i) => i % 24),
    },
  };
}

const okResponse = (body) => ({ ok: true, status: 200, json: async () => body });
let fetchMock;

beforeEach(() => {
  clearWeatherCache();
  fetchMock = jest.fn(async () => okResponse(openMeteoBody(3)));
  global.fetch = fetchMock;
});

const calledUrl = (n = 0) => new URL(fetchMock.mock.calls[n][0]);

describe('GET /api/public/weather', () => {
  test('khách xem được; gọi Open-Meteo đúng tham số và trả dữ liệu rút gọn', async () => {
    const res = await request(app).get('/api/public/weather?lat=11.94&lng=108.45&days=3');
    expect(res.status).toBe(200);

    const url = calledUrl();
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('11.94');
    expect(url.searchParams.get('longitude')).toBe('108.45');
    expect(url.searchParams.get('timezone')).toBe('Asia/Ho_Chi_Minh');
    expect(url.searchParams.get('forecast_days')).toBe('3');
    expect(url.searchParams.get('daily')).toBe('weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
    expect(url.searchParams.get('hourly')).toContain('precipitation_probability');

    expect(res.body.source).toBe('Open-Meteo');
    expect(new Date(res.body.updatedAt).toString()).not.toBe('Invalid Date');
    expect(res.body.daily).toHaveLength(3);
    expect(res.body.daily[0]).toEqual({
      date: '2026-11-10',
      code: 0,
      label: 'Trời quang',
      icon: 'sun',
      tempMax: 27,
      tempMin: 17,
      rainChance: 10,
    });
    expect(res.body.daily[1]).toMatchObject({ code: 63, label: 'Mưa vừa', rainChance: 40 });
    expect(res.body.daily[2]).toMatchObject({ code: 95, label: 'Dông', rainChance: 70 });
  });

  test('thời tiết hiện tại có nhiệt độ, mô tả, độ ẩm, gió, khả năng mưa (UC 10 B5)', async () => {
    const res = await request(app).get('/api/public/weather?lat=11.94&lng=108.45&days=3');
    expect(res.body.current).toMatchObject({
      temperature: 22.5,
      humidity: 80,
      windSpeed: 7.2,
      label: 'Ít mây',
      rainChance: 10,
    });
  });

  test('theo giờ: chỉ 6 mốc 06:00 đến 21:00 mỗi 3 giờ cho mỗi ngày', async () => {
    const res = await request(app).get('/api/public/weather?lat=11.94&lng=108.45&days=3');
    expect(res.body.hourly).toHaveLength(18);
    expect(res.body.hourly.slice(0, 6).map((h) => h.time.slice(11))).toEqual(['06:00', '09:00', '12:00', '15:00', '18:00', '21:00']);
    expect(res.body.hourly[1]).toEqual({ time: '2026-11-10T09:00', code: 3, label: 'Nhiều mây', temp: 24, rainChance: 9 });
  });

  test('không truyền days thì mặc định 7 ngày', async () => {
    fetchMock.mockResolvedValue(okResponse(openMeteoBody(7)));
    const res = await request(app).get('/api/public/weather?lat=10.8&lng=106.7');
    expect(res.status).toBe(200);
    expect(calledUrl().searchParams.get('forecast_days')).toBe('7');
  });

  describe('cache 30 phút (UC 10 B2)', () => {
    test('gọi lại cùng toạ độ không gọi Open-Meteo lần nữa', async () => {
      const a = await request(app).get('/api/public/weather?lat=11.94&lng=108.45&days=3');
      const b = await request(app).get('/api/public/weather?lat=11.94&lng=108.45&days=3');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(b.body).toEqual(a.body);
    });

    test('toạ độ làm tròn 2 số lẻ trùng nhau thì dùng chung cache', async () => {
      await request(app).get('/api/public/weather?lat=11.941&lng=108.449&days=3');
      await request(app).get('/api/public/weather?lat=11.944&lng=108.452&days=3');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(calledUrl().searchParams.get('latitude')).toBe('11.94'); // gửi toạ độ đã làm tròn
    });

    test('khác toạ độ hoặc khác số ngày thì gọi lại', async () => {
      await request(app).get('/api/public/weather?lat=11.94&lng=108.45&days=3');
      await request(app).get('/api/public/weather?lat=11.95&lng=108.45&days=3');
      await request(app).get('/api/public/weather?lat=11.94&lng=108.45&days=5');
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('Open-Meteo lỗi → 502, frontend ẩn khối thời tiết (UC 10 B4a)', () => {
    test('Open-Meteo trả mã lỗi', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
      const res = await request(app).get('/api/public/weather?lat=11.94&lng=108.45&days=3');
      expect(res.status).toBe(502);
      expect(res.body.code).toBe('WEATHER_UNAVAILABLE');
    });

    test('lỗi mạng', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      const res = await request(app).get('/api/public/weather?lat=11.94&lng=108.45&days=3');
      expect(res.status).toBe(502);
    });

    test('dữ liệu trả về sai dạng', async () => {
      fetchMock.mockResolvedValue(okResponse({ hello: 'world' }));
      const res = await request(app).get('/api/public/weather?lat=11.94&lng=108.45&days=3');
      expect(res.status).toBe(502);
    });

    test('lỗi không bị lưu vào cache: lần sau gọi lại được', async () => {
      fetchMock.mockRejectedValueOnce(new Error('boom'));
      const bad = await request(app).get('/api/public/weather?lat=11.94&lng=108.45&days=3');
      expect(bad.status).toBe(502);
      const good = await request(app).get('/api/public/weather?lat=11.94&lng=108.45&days=3');
      expect(good.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    test('quá thời gian chờ thì huỷ yêu cầu và trả lỗi 502', async () => {
      fetchMock.mockImplementation(
        (url, { signal }) =>
          new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
          }),
      );
      await expect(getWeather(11.94, 108.45, 3, { timeoutMs: 20 })).rejects.toMatchObject({ status: 502, code: 'WEATHER_UNAVAILABLE' });
    });
  });

  describe('kiểm tra tham số (400, MSG 3), không gọi Open-Meteo', () => {
    test.each([
      ['lat=abc&lng=108'],
      ['lat=&lng=108'],
      ['lng=108'],
      ['lat=91&lng=108'],
      ['lat=-91&lng=108'],
      ['lat=11&lng=181'],
      ['lat=11&lng=-181'],
      ['lat=11'],
      ['lat=11&lng=108&days=0'],
      ['lat=11&lng=108&days=17'],
      ['lat=11&lng=108&days=abc'],
      ['lat=11&lng=108&days=2.5'],
    ])('%s', async (qs) => {
      const res = await request(app).get(`/api/public/weather?${qs}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MSG 3');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    test('giá trị biên hợp lệ: lat -90, lng 180, days 16', async () => {
      fetchMock.mockResolvedValue(okResponse(openMeteoBody(16)));
      const res = await request(app).get('/api/public/weather?lat=-90&lng=180&days=16');
      expect(res.status).toBe(200);
      expect(res.body.daily).toHaveLength(16);
    });
  });
});

describe('Bảng mã WMO (SRS Phụ lục 8.3, CBR 5)', () => {
  test.each([
    [0, 'Trời quang'],
    [1, 'Ít mây'],
    [2, 'Ít mây'],
    [3, 'Nhiều mây'],
    [45, 'Sương mù'],
    [48, 'Sương mù'],
    [51, 'Mưa phùn'],
    [53, 'Mưa phùn'],
    [55, 'Mưa phùn'],
    [61, 'Mưa nhẹ'],
    [80, 'Mưa nhẹ'],
    [63, 'Mưa vừa'],
    [81, 'Mưa vừa'],
    [65, 'Mưa to'],
    [82, 'Mưa to'],
    [95, 'Dông'],
    [96, 'Dông'],
    [99, 'Dông'],
  ])('mã %i → %s', (code, label) => {
    expect(wmoInfo(code).label).toBe(label);
  });

  test('mã không có trong bảng dùng nhãn mặc định, chuỗi số vẫn đọc được', () => {
    expect(wmoInfo(71).label).toBe('Nhiều mây');
    expect(wmoInfo(undefined).label).toBe('Nhiều mây');
    expect(wmoInfo('63').label).toBe('Mưa vừa');
  });
});
