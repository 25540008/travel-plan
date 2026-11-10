// Thời tiết cho Screen 7 (CBR 5): gọi /public/weather (TP-27), lỗi thì trả null để trang ẩn khối thời tiết.
import { get } from './api.js';
import { minutesOf } from './trip-utils.js';

const HOURS = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
const RAIN_ALERT = 60;
/** CBR 5: Open-Meteo dự báo tối đa 16 ngày tới. */
export const FORECAST_DAYS = 16;

/** Mã WMO → chữ tiếng Việt (SRS Phụ lục 8.3, rút gọn). */
export function wmoLabel(code) {
  const c = Number(code);
  if (c === 0) return 'Nắng';
  if (c <= 2) return 'Ít mây';
  if (c === 3) return 'Nhiều mây';
  if (c <= 48) return 'Sương mù';
  if (c <= 57) return 'Mưa phùn';
  if (c <= 67 || (c >= 80 && c <= 82)) return 'Mưa rào';
  if (c <= 77 || c === 85 || c === 86) return 'Tuyết';
  if (c >= 95) return 'Dông';
  return 'Nhiều mây';
}

const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  partly: '<path d="M8 3v1.5M3.5 8H2M4.3 4.3l1 1"/><path d="M5.6 10.6A3.5 3.5 0 1 1 11.4 7"/><path d="M17 18H8a4 4 0 1 1 1-7.9A5 5 0 0 1 18.6 11 3.5 3.5 0 0 1 17 18z"/>',
  cloud: '<path d="M17.5 19H8a5 5 0 1 1 1.2-9.9A6 6 0 0 1 20.6 11a4 4 0 0 1-3.1 8z"/>',
  rain: '<path d="M17.5 15H8a5 5 0 1 1 1.2-9.9A6 6 0 0 1 20.6 7a4 4 0 0 1-3.1 8z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
};

export function weatherIcon(code) {
  const c = Number(code);
  const key = c === 0 ? 'sun' : c <= 2 ? 'partly' : c <= 48 ? 'cloud' : 'rain';
  return `<svg class="wx-icon" viewBox="0 0 24 24" aria-label="${wmoLabel(c)}" role="img">${ICONS[key]}</svg>`;
}

/* Đọc được cả dạng đã gọn của backend lẫn dạng gốc Open-Meteo (mảng song song). */
function zip(block) {
  if (Array.isArray(block)) return block;
  if (!block?.time) return [];
  return block.time.map((_, i) => Object.fromEntries(Object.entries(block).map(([k, arr]) => [k, Array.isArray(arr) ? arr[i] : arr])));
}

const pick = (o, ...keys) => keys.map((k) => o[k]).find((v) => v != null);

export function normalizeWeather(raw) {
  const daily = {};
  for (const d of zip(raw?.daily)) {
    const date = String(pick(d, 'date', 'time')).slice(0, 10);
    const code = pick(d, 'code', 'weatherCode', 'weather_code', 'weathercode');
    daily[date] = {
      code,
      label: d.label || wmoLabel(code),
      tempMin: pick(d, 'tempMin', 'temperature_2m_min'),
      tempMax: pick(d, 'tempMax', 'temperature_2m_max'),
      rainChance: pick(d, 'rainChance', 'precipitationProbability', 'precipitation_probability_max'),
    };
  }
  const hourly = {};
  for (const h of zip(raw?.hourly)) {
    const t = String(pick(h, 'time', 'datetime'));
    const date = t.slice(0, 10);
    const time = t.slice(11, 16);
    if (!HOURS.includes(time)) continue;
    (hourly[date] ||= []).push({
      time,
      code: pick(h, 'code', 'weatherCode', 'weather_code', 'weathercode'),
      temp: pick(h, 'temp', 'temperature', 'temperature_2m'),
      rainChance: pick(h, 'rainChance', 'precipitationProbability', 'precipitation_probability'),
    });
  }
  return Object.keys(daily).length || Object.keys(hourly).length ? { daily, hourly } : null;
}

export async function loadWeather(lat, lng) {
  try {
    const raw = await get(`/public/weather?lat=${lat}&lng=${lng}&days=${FORECAST_DAYS}`, { auth: false, silent: true });
    return normalizeWeather(raw);
  } catch {
    return null;
  }
}

// Hoạt động ngoài trời: đoán theo tên/địa điểm vì bảng itinerary_items chưa có cột riêng.
const OUTDOOR = /(đồi|thác|hồ|biển|bãi|đảo|núi|đèo|rừng|vườn|công viên|chợ|dạo|săn mây|trekking|leo|tắm|cánh đồng|ruộng|đồi chè|cắm trại|picnic|chèo|lặn|đạp xe|phố đi bộ)/i;
export const isOutdoor = (item) => OUTDOOR.test(`${item.activity} ${item.location || ''}`);

/** Giờ mưa ≥ 60% (ô 3 tiếng) trùng hoạt động ngoài trời → { hour, item } đầu tiên, không có thì null. */
export function findRainWarning(hours, items) {
  for (const hour of hours) {
    if ((hour.rainChance ?? 0) < RAIN_ALERT) continue;
    const from = minutesOf(hour.time);
    const to = from + 180;
    const item = items.find((it) => isOutdoor(it) && minutesOf(it.startTime) < to && from < minutesOf(it.endTime));
    if (item) return { hour, item };
  }
  return null;
}
