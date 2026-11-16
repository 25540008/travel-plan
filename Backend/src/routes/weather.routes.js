import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { getWeather, MAX_FORECAST_DAYS } from '../services/weather.service.js';

// UC 10, CBR 5: GET /api/public/weather?lat=&lng=&days=
const emptyToUndefined = (v) => (v === '' ? undefined : v);
const coord = (label, min, max) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `MSG 3|${label} không đúng định dạng.` })
      .min(min, `MSG 3|${label} phải từ ${min} đến ${max}.`)
      .max(max, `MSG 3|${label} phải từ ${min} đến ${max}.`),
  );

const weatherSchema = {
  query: z.object({
    lat: coord('Vĩ độ', -90, 90),
    lng: coord('Kinh độ', -180, 180),
    // Open-Meteo chỉ dự báo tới 16 ngày; để trống = 7 ngày
    days: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ error: 'MSG 3|Số ngày không đúng định dạng.' })
        .int('MSG 3|Số ngày không đúng định dạng.')
        .min(1, `MSG 3|Số ngày phải từ 1 đến ${MAX_FORECAST_DAYS}.`)
        .max(MAX_FORECAST_DAYS, `MSG 3|Số ngày phải từ 1 đến ${MAX_FORECAST_DAYS}.`)
        .default(7),
    ),
  }),
};

const router = express.Router();

router.get('/', validate(weatherSchema), async (req, res, next) => {
  try {
    const { lat, lng, days } = req.valid.query;
    return res.status(200).json(await getWeather(lat, lng, days));
  } catch (err) {
    next(err); // Open-Meteo lỗi → AppError 502, frontend ẩn khối thời tiết
  }
});

export default router;
