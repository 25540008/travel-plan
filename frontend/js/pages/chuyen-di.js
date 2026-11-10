// Screen 7 Lịch trình chuyến (UC 19) và nút Xóa chuyến (UC 16).
// Dữ liệu: GET /trips/:id, GET /trips/:id/itinerary, GET /public/weather (lỗi thời tiết → ẩn khối, CBR 5).
import { pageUrl } from '../config.js';
import { get } from '../api.js';
import { requireLogin } from '../auth.js';
import { toDate, formatTime, formatDuration } from '../format.js';
import { coverHtml } from '../cover.js';
import { weatherIcon, loadWeather, findRainWarning, FORECAST_DAYS } from '../weather.js';
import { deleteTrip } from '../trip-delete.js';
import { showFlash } from '../ui.js';
import {
  todayVN, tripDays, tripStatus, daysBetween, isoDate, minutesOf, findOverlaps, escapeHtml,
} from '../trip-utils.js';

const WEEKDAY = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const OFF_SCHEDULE = 'off';
const MOTORBIKE_KMH = 25;

const params = new URLSearchParams(location.search);
const tripId = Number(params.get('id'));

const state = { trip: null, items: [], days: [], selected: 1, weather: null, rainItemId: null };

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const dayMonth = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
const itemDate = (item) => String(item.activityDate).slice(0, 10);

document.querySelectorAll('[data-link]').forEach((a) => (a.href = pageUrl(a.dataset.link)));

/* ---------- Dữ liệu ---------- */

function buildDays() {
  const start = toDate(state.trip.startDate);
  const total = tripDays(state.trip);
  state.days = Array.from({ length: total }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = isoDate(date);
    const items = state.items.filter((it) => itemDate(it) === iso);
    return { index: i + 1, date, iso, items };
  });
  const inside = new Set(state.days.map((d) => d.iso));
  state.offItems = state.items.filter((it) => !inside.has(itemDate(it)));
}

/** UC 19 B3: ?day= nếu hợp lệ, đang trong chuyến → hôm nay, ngoài ra ngày 1. */
function initialDay() {
  const q = params.get('day');
  if (q === OFF_SCHEDULE && state.offItems.length) return OFF_SCHEDULE;
  const n = Number(q);
  if (n >= 1 && n <= state.days.length) return n;
  const status = tripStatus(state.trip);
  return status.key === 'ongoing' ? status.dayIndex : 1;
}

const sortByTime = (items) => [...items].sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime));

/* ---------- Khoảng cách ---------- */

const hasCoords = (o) => o && o.latitude != null && o.longitude != null && !Number.isNaN(Number(o.latitude));

function distanceKm(a, b) {
  const R = 6371;
  const toRad = (x) => (Number(x) * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const formatKm = (km) => (km < 10 ? km.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : Math.round(km).toString());

/* ---------- Phần đầu trang ---------- */

function renderHead() {
  const t = state.trip;
  document.title = `${t.title} · Travelplan`;
  $('hero').querySelector('.hero-cover')?.remove();
  $('hero').insertAdjacentHTML('afterbegin', coverHtml(t, 'hero-cover'));
  const status = tripStatus(t);
  $('chips').innerHTML =
    `<span class="chip ${status.chip || ''}">${status.label}</span>` +
    (t.isPublic ? '<span class="chip chip-lake">Đang chia sẻ công khai</span>' : '');
  $('trip-title').textContent = t.title;
  const s = toDate(t.startDate);
  const e = toDate(t.endDate);
  const place = t.address || t.destination;
  $('trip-meta').textContent =
    `${place} · ${WEEKDAY_SHORT[s.getDay()]} ${dayMonth(s)} – ${WEEKDAY_SHORT[e.getDay()]} ${dayMonth(e)}/${e.getFullYear()} · ${formatDuration(t.startDate, t.endDate)}`;
  $('edit-link').href = pageUrl('createTrip', { id: t.id });
}

/* ---------- Cột ngày ---------- */

function dayWeatherHtml(iso) {
  const d = state.weather?.daily?.[iso];
  if (!d) {
    // CBR 5: ngày xa hơn 16 ngày tới → "Chưa có dự báo" (chỉ khi dịch vụ thời tiết đang chạy được).
    const ahead = daysBetween(todayVN(), iso);
    return state.weather && ahead >= FORECAST_DAYS ? '<span class="day-weather day-weather-none">Chưa có dự báo</span>' : '';
  }
  const temp = d.tempMin != null && d.tempMax != null ? `${Math.round(d.tempMin)} – ${Math.round(d.tempMax)}°C` : '';
  const rain = d.rainChance != null && d.rainChance >= 20 ? `mưa ${d.rainChance}%` : (d.label || '').toLowerCase();
  return `<span class="day-weather">${weatherIcon(d.code)} ${[temp, rain].filter(Boolean).join(' · ')}</span>`;
}

function renderDayList() {
  const today = isoDate(todayVN());
  const html = state.days.map((d) => {
    const isToday = d.iso === today;
    return `
      <button type="button" class="day-item" data-day="${d.index}" aria-current="${state.selected === d.index ? 'true' : 'false'}">
        <strong>Ngày ${d.index}${isToday ? ' · Hôm nay' : ''}</strong>
        <span>${WEEKDAY_SHORT[d.date.getDay()]} ${dayMonth(d.date)} · ${d.items.length} hoạt động</span>
        ${dayWeatherHtml(d.iso)}
      </button>`;
  });
  if (state.offItems.length) {
    html.push(`
      <button type="button" class="day-item day-item-off" data-day="${OFF_SCHEDULE}" aria-current="${state.selected === OFF_SCHEDULE}">
        <strong>Ngoài lịch · ${state.offItems.length}</strong>
        <span>Hoạt động cần đổi ngày</span>
      </button>`);
  }
  $('day-list').innerHTML = html.join('');
}

/* ---------- Thời tiết theo giờ + cảnh báo mưa ---------- */

function renderWeather(day, items) {
  const box = $('weather-box');
  const hours = day ? state.weather?.hourly?.[day.iso] : null;
  state.rainItemId = null;
  if (!hours?.length) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  $('hourly').innerHTML = hours
    .map(
      (h) => `<li>
        <span class="meta">${h.time}</span>
        ${weatherIcon(h.code)}
        <strong>${Math.round(h.temp)}°</strong>
        <span class="rain">${h.rainChance ?? 0}%</span>
      </li>`,
    )
    .join('');

  const warn = findRainWarning(hours, items);
  state.rainItemId = warn?.item.id ?? null;
  const alert = $('rain-alert');
  alert.hidden = !warn;
  if (!warn) return;
  const part = minutesOf(warn.hour.time) >= 12 * 60 ? 'Chiều nay' : 'Sáng nay';
  const when = day.iso === isoDate(todayVN()) ? part : `Ngày ${day.index}`;
  alert.innerHTML = `
    ${weatherIcon(61)}
    <div>
      <strong>${when} có thể mưa (${warn.hour.rainChance}%) từ ${warn.hour.time}</strong>
      <p>${escapeHtml(warn.item.activity)} là hoạt động ngoài trời. Nên mang áo mưa hoặc đổi sang giờ khác.</p>
    </div>
    <button type="button" class="link" data-action="edit-item" data-item="${warn.item.id}">Đổi giờ</button>`;
}

/* ---------- Timeline ---------- */

function renderTimeline(items, isOffSchedule) {
  const overlaps = findOverlaps(items);
  const timeline = $('timeline');
  if (!items.length) {
    timeline.innerHTML = `<li class="timeline-empty meta">Chưa có hoạt động nào trong ngày này. Bấm "Thêm hoạt động" để bắt đầu.</li>`;
    return;
  }
  timeline.innerHTML = items
    .map((item, i) => {
      const clash = overlaps.get(item);
      const next = items[i + 1];
      let travel = '';
      if (next && hasCoords(item) && hasCoords(next)) {
        const km = distanceKm(item, next);
        travel = `<p class="travel meta">Xe máy · ${Math.max(5, Math.round((km / MOTORBIKE_KMH) * 60))} phút</p>`;
      }
      const offDate = isOffSchedule ? `<span class="meta">${dayMonth(toDate(item.activityDate))}</span>` : '';
      return `
        <li class="tl-item${clash ? ' is-clash' : ''}${item.id === state.rainItemId ? ' is-rain' : ''}" data-item="${item.id}">
          <div class="tl-time"><strong>${formatTime(item.startTime)}</strong><span>${formatTime(item.endTime)}</span>${offDate}</div>
          <span class="tl-dot">${i + 1}</span>
          <div class="tl-body">
            <article class="tl-card">
              <div class="tl-card-head">
                <div>
                  <h3>${escapeHtml(item.activity)}</h3>
                  ${item.location ? `<p class="meta">${escapeHtml(item.location)}</p>` : ''}
                </div>
                <div class="item-menu">
                  <button type="button" class="item-menu-btn" aria-label="Thao tác" aria-haspopup="true" aria-expanded="false">⋯</button>
                  <ul class="item-menu-list" hidden>
                    <li><button type="button" data-action="edit-item" data-item="${item.id}">Sửa</button></li>
                    <li><button type="button" data-action="delete-item" data-item="${item.id}">Xóa</button></li>
                  </ul>
                </div>
              </div>
              ${item.note ? `<p class="tl-note">${escapeHtml(item.note)}</p>` : ''}
              ${clash
                ? `<p class="tl-clash">⚠ Trùng giờ với ${clash
                  .map((c) => `${escapeHtml(c.activity)} (${formatTime(c.startTime)} – ${formatTime(c.endTime)})`)
                  .join(', ')}</p>`
                : ''}
            </article>
            ${travel}
          </div>
        </li>`;
    })
    .join('');
}

/* ---------- Bản đồ (Leaflet + OpenStreetMap) ---------- */

let map;
let mapLayer;

function renderMap(items) {
  const points = items.filter(hasCoords).map((it) => [Number(it.latitude), Number(it.longitude)]);
  const t = state.trip;
  const link = $('gmaps-link');
  if (points.length) {
    link.href = `https://www.google.com/maps/dir/${points.map((p) => p.join(',')).join('/')}`;
  } else {
    link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.address || t.destination)}`;
  }

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distanceKm({ latitude: points[i - 1][0], longitude: points[i - 1][1] }, { latitude: points[i][0], longitude: points[i][1] });
  }
  $('map-distance').textContent = points.length > 1
    ? `Tổng quãng đường ≈ ${formatKm(total)} km`
    : points.length ? '' : 'Hoạt động chưa có toạ độ trên bản đồ';

  if (!window.L) {
    $('map').hidden = true;
    return;
  }
  if (!map) {
    map = window.L.map('map', { scrollWheelZoom: false, attributionControl: true });
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(map);
  }
  mapLayer?.remove();
  mapLayer = window.L.layerGroup().addTo(map);

  if (points.length) {
    points.forEach((p, i) => {
      window.L.marker(p, {
        icon: window.L.divIcon({ className: 'map-pin', html: `<span>${i + 1}</span>`, iconSize: [26, 26] }),
      }).addTo(mapLayer);
    });
    if (points.length > 1) window.L.polyline(points, { color: '#10302e', weight: 3, dashArray: '2 8', lineCap: 'round' }).addTo(mapLayer);
    map.fitBounds(points, { padding: [30, 30], maxZoom: 15 });
  } else if (hasCoords(t)) {
    const center = [Number(t.latitude), Number(t.longitude)];
    window.L.circleMarker(center, { radius: 8, color: '#d9512c', fillOpacity: 0.9 }).addTo(mapLayer);
    map.setView(center, 12);
  } else {
    map.setView([16.0, 107.5], 5);
  }
  setTimeout(() => map.invalidateSize(), 0);
}

/* ---------- Ghép lại ---------- */

function selectedItems() {
  if (state.selected === OFF_SCHEDULE) return sortByTime(state.offItems);
  return sortByTime(state.days[state.selected - 1].items);
}

function renderDay() {
  const items = selectedItems();
  const isOff = state.selected === OFF_SCHEDULE;
  const day = isOff ? null : state.days[state.selected - 1];
  if (isOff) {
    $('day-title').textContent = `Ngoài lịch · ${items.length} hoạt động`;
    $('day-meta').textContent = 'Các hoạt động này nằm ngoài ngày đi – ngày về. Sửa để chuyển sang một ngày trong chuyến.';
  } else {
    $('day-title').textContent = `Ngày ${day.index} · ${WEEKDAY[day.date.getDay()]} ${dayMonth(day.date)}`;
    $('day-meta').textContent = items.length
      ? `${items.length} hoạt động · từ ${formatTime(items[0].startTime)} đến ${formatTime(
        items.reduce((max, it) => (minutesOf(it.endTime) > minutesOf(max.endTime) ? it : max)).endTime,
      )}`
      : 'Chưa có hoạt động';
  }
  renderWeather(day, items);
  renderTimeline(items, isOff);
  renderMap(items);
}

function selectDay(value, { push = true } = {}) {
  state.selected = value;
  renderDayList();
  renderDay();
  if (push) {
    const url = new URL(location.href);
    url.searchParams.set('day', value);
    history.replaceState(null, '', url.pathname + url.search);
  }
}

/* ---------- Sự kiện ---------- */

const findItem = (id) => state.items.find((it) => String(it.id) === String(id));

function emit(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(`trip:${name}`, { detail: { trip: state.trip, ...detail } }));
}

document.addEventListener('click', (e) => {
  const day = e.target.closest('[data-day]');
  if (day) return selectDay(day.dataset.day === OFF_SCHEDULE ? OFF_SCHEDULE : Number(day.dataset.day));

  const menuBtn = e.target.closest('.item-menu-btn');
  document.querySelectorAll('.item-menu-list').forEach((l) => {
    if (!menuBtn || l !== menuBtn.nextElementSibling) {
      l.hidden = true;
      l.previousElementSibling.setAttribute('aria-expanded', 'false');
    }
  });
  if (menuBtn) {
    const list = menuBtn.nextElementSibling;
    list.hidden = !list.hidden;
    menuBtn.setAttribute('aria-expanded', String(!list.hidden));
    return;
  }

  const btn = e.target.closest('[data-action]');
  if (!btn || !state.trip) return;
  const action = btn.dataset.action;
  if (action === 'delete') return deleteTrip(state.trip, state.items.length);
  if (action === 'add-item') {
    const date = state.selected === OFF_SCHEDULE ? state.days[0].iso : state.days[state.selected - 1].iso;
    return emit('add-item', { date });
  }
  if (action === 'edit-item' || action === 'delete-item') return emit(action, { item: findItem(btn.dataset.item) });
  if (action === 'cover' || action === 'share') return emit(action);
});

document.querySelectorAll('.trip-tab').forEach((tab) =>
  tab.addEventListener('click', () => {
    const isBudget = tab.dataset.tab === 'budget';
    document.querySelectorAll('.trip-tab').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    $('panel-itinerary').hidden = isBudget;
    $('panel-budget').hidden = !isBudget;
    if (!isBudget) map?.invalidateSize();
    emit('tab', { tab: tab.dataset.tab });
  }),
);

/* ---------- Tải trang ---------- */

function showNotFound(text) {
  document.querySelector('.trip-page').removeAttribute('aria-busy');
  $('hero').hidden = true;
  $('trip-head').hidden = true;
  $('panel-itinerary').hidden = true;
  const box = $('not-found');
  box.hidden = false;
  box.querySelector('p').textContent = text;
}

async function loadItems() {
  if (Array.isArray(state.trip.items)) return state.trip.items;
  // API trả { items: [...] } (TP-26); vẫn nhận mảng trần cho chắc.
  const data = await get(`/trips/${tripId}/itinerary`);
  return Array.isArray(data) ? data : data?.items || [];
}

async function load({ keepDay = false } = {}) {
  try {
    state.trip = await get(`/trips/${tripId}`);
    state.items = await loadItems();
  } catch (err) {
    if (err.status === 401) return;
    return showNotFound(err.status === 404 ? 'Không tìm thấy chuyến đi.' : err.message);
  }
  document.querySelector('.trip-page').removeAttribute('aria-busy');
  buildDays();
  renderHead();
  if (!keepDay) {
    state.selected = initialDay();
  } else if (state.selected !== OFF_SCHEDULE && state.selected > state.days.length) {
    state.selected = 1;
  }
  selectDay(state.selected, { push: false });

  // Thời tiết tải sau, lỗi thì bỏ qua (CBR 5)
  if (!state.weather && hasCoords(state.trip)) {
    const daysAhead = daysBetween(todayVN(), state.trip.endDate);
    if (daysAhead >= 0 && daysBetween(todayVN(), state.trip.startDate) < FORECAST_DAYS) {
      state.weather = await loadWeather(state.trip.latitude, state.trip.longitude);
      if (state.weather) {
        renderDayList();
        renderDay();
      }
    }
  }
}

document.addEventListener('trip:reload', () => load({ keepDay: true }));

if (!tripId) showNotFound('Không tìm thấy chuyến đi.');
else if (requireLogin()) {
  showFlash(); // MSG 22 / MSG 23 / MSG 34 sau khi lưu ở Screen 6
  load();
}
