import NodeCache from 'node-cache';
import { AppError } from '../utils/AppError.js';
import { wmoInfo } from '../utils/wmo.js';

// UC 10, UC 19, CBR 5: thời tiết lấy từ Open-Meteo qua backend để frontend không gọi thẳng.
export const MAX_FORECAST_DAYS = 16; // Open-Meteo dự báo tối đa 16 ngày; xa hơn frontend ghi "Chưa có dự báo"
const TIMEOUT_MS = 3000; // quá 3 giây coi như lỗi (UC 10 B4)
const HOURS = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00']; // dải thời tiết theo giờ của Screen 7

const cache = new NodeCache({ stdTTL: 1800, checkperiod: 120, useClones: false }); // cache 30 phút (UC 10 B2)

export const clearWeatherCache = () => cache.flushAll();

/** Làm tròn 2 chữ số thập phân; số âm gần 0 không để lại "-0". */
const round2 = (n) => Math.round(Number(n) * 100) / 100;

function unavailable() {
  return new AppError(502, 'WEATHER_UNAVAILABLE', 'Không lấy được dữ liệu thời tiết.');
}

async function fetchForecast(lat, lng, days, timeoutMs) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    hourly: 'temperature_2m,weather_code,precipitation_probability',
    timezone: 'Asia/Ho_Chi_Minh',
    forecast_days: String(days),
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Gọn lại dữ liệu Open-Meteo cho frontend: current, daily (mỗi ngày), hourly (6 mốc mỗi 3 giờ). */
function shape(data) {
  const daily = data.daily.time.map((date, i) => {
    const code = data.daily.weather_code[i];
    return {
      date,
      code,
      ...wmoInfo(code),
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      rainChance: data.daily.precipitation_probability_max[i],
    };
  });

  const hourly = [];
  (data.hourly?.time ?? []).forEach((time, i) => {
    if (!HOURS.includes(time.slice(11, 16))) return;
    const code = data.hourly.weather_code[i];
    hourly.push({
      time,
      code,
      label: wmoInfo(code).label,
      temp: data.hourly.temperature_2m[i],
      rainChance: data.hourly.precipitation_probability[i],
    });
  });

  const cur = data.current;
  const current = cur
    ? {
        time: cur.time,
        code: cur.weather_code,
        ...wmoInfo(cur.weather_code),
        temperature: cur.temperature_2m,
        humidity: cur.relative_humidity_2m,
        windSpeed: cur.wind_speed_10m,
        rainChance: daily[0]?.rainChance ?? null,
      }
    : null;

  return { source: 'Open-Meteo', updatedAt: new Date().toISOString(), current, daily, hourly };
}

/**
 * Thời tiết theo toạ độ. Cùng toạ độ (làm tròn 2 số lẻ) và cùng số ngày trong 30 phút thì lấy từ cache.
 * Open-Meteo lỗi, trả sai dạng hoặc quá thời gian → AppError 502 (frontend ẩn khối thời tiết, không báo lỗi).
 */
export async function getWeather(lat, lng, days = 7, { timeoutMs = TIMEOUT_MS } = {}) {
  const rLat = round2(lat);
  const rLng = round2(lng);
  const key = `${rLat},${rLng},${days}`;

  const cached = cache.get(key);
  if (cached) return cached;

  let result;
  try {
    result = shape(await fetchForecast(rLat, rLng, days, timeoutMs));
  } catch {
    throw unavailable();
  }
  cache.set(key, result);
  return result;
}
