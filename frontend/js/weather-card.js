// UC 10 Xem thời tiết điểm đến (Screen 4): khối "Thời tiết hôm nay" và dự báo 7 ngày.
// Dùng: mountWeatherCard(document.getElementById('weather-card'), { lat, lng }).
// Open-Meteo lỗi hoặc quá hạn → ẩn cả khối, không hiện thông báo lỗi (UC 10 B4a, CBR 5).
import { get } from './api.js';
import { weatherIcon, wmoLabel } from './weather.js';
import { escapeHtml } from './trip-utils.js';

const DAYS = 7;
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const TIME_FORMAT = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });

/* Backend TP-26 trả weatherCode/description/precipitationProb; bản khác trả code/label/rainChance: nhận cả hai. */
const pick = (o, ...keys) => keys.map((k) => o?.[k]).find((v) => v != null);
function normalizeDay(d) {
  const code = pick(d, 'code', 'weatherCode');
  return {
    date: String(d.date).slice(0, 10),
    code,
    label: pick(d, 'label', 'description') || wmoLabel(code),
    tempMax: pick(d, 'tempMax'),
    tempMin: pick(d, 'tempMin'),
    rainChance: pick(d, 'rainChance', 'precipitationProb', 'precipitationProbability'),
  };
}

const deg = (n) => (n == null ? '–' : `${Math.round(n)}°`);
const pct = (n) => (n == null ? '–' : `${Math.round(n)}%`);

function weekday(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return WEEKDAY_SHORT[new Date(y, m - 1, d).getDay()];
}

function skeleton() {
  return '<div class="wx-card-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>';
}

function render(data) {
  const days = (data.daily || []).slice(0, DAYS).map(normalizeDay);
  const today = days[0] || {};
  const now = data.current;
  const code = now?.code ?? today.code;
  const label = now?.label || today.label || wmoLabel(code);
  const updated = data.updatedAt ? TIME_FORMAT.format(new Date(data.updatedAt)) : '';

  const hero = `
    <div class="wx-now">
      ${weatherIcon(code)}
      <div class="wx-now-main">
        <p class="wx-temp">${now ? deg(now.temperature) : deg(today.tempMax)}C</p>
        <p class="wx-label">${escapeHtml(label)}</p>
      </div>
      <ul class="wx-now-meta">
        ${now?.humidity != null ? `<li>Ẩm ${Math.round(now.humidity)}%</li>` : ''}
        ${now?.windSpeed != null ? `<li>Gió ${Math.round(now.windSpeed)} km/h</li>` : ''}
        <li>Mưa ${pct(now?.rainChance ?? today.rainChance)}</li>
      </ul>
    </div>`;

  const week = days
    .map(
      (d, i) => `
      <li${i === 0 ? ' class="is-today" aria-current="date"' : ''}>
        <span class="wx-day">${weekday(d.date)}</span>
        ${weatherIcon(d.code)}
        <strong>${deg(d.tempMax)}</strong>
        <span class="wx-low">${deg(d.tempMin)}</span>
        <span class="wx-rain">${pct(d.rainChance)}</span>
      </li>`,
    )
    .join('');

  return `
    <header class="wx-card-head">
      <h2>Thời tiết hôm nay</h2>
      ${updated ? `<span>Cập nhật ${updated}</span>` : ''}
    </header>
    ${hero}
    <ol class="wx-week">${week}</ol>
    <p class="wx-source">Nguồn: ${escapeHtml(data.source || 'Open-Meteo')}</p>`;
}

/** Gắn khối thời tiết vào container; trả true nếu hiển thị được, false nếu đã ẩn vì lỗi. */
export async function mountWeatherCard(container, { lat, lng }) {
  if (!container) return false;
  container.classList.add('wx-card');
  container.hidden = false;
  container.setAttribute('aria-busy', 'true');
  container.innerHTML = skeleton();
  try {
    const data = await get(`/public/weather?lat=${lat}&lng=${lng}&days=${DAYS}`, { auth: false, silent: true });
    if (!data?.daily?.length) throw new Error('empty');
    container.innerHTML = render(data);
    container.removeAttribute('aria-busy');
    return true;
  } catch {
    container.hidden = true;
    container.innerHTML = '';
    return false;
  }
}
