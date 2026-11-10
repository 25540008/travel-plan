// Screen 6 Tạo / sửa chuyến đi (UC 14, UC 15).
// Tạo: POST /trips → MSG 22 trên Screen 7. Sửa (?id= hoặc ?edit=): PUT /trips/:id → MSG 23 nếu có hoạt động ra ngoài ngày mới.
// Điểm đến gợi ý từ Nominatim, dự phòng Photon (≥ 2 ký tự, tối đa 5). Hủy / rời trang khi đã sửa → MSG 25.
import { pageUrl } from '../config.js';
import { get, post, put } from '../api.js';
import { requireLogin } from '../auth.js';
import { msg } from '../messages.js';
import { formatDuration, formatMoney, formatDayMonth, toDate } from '../format.js';
import { coverHtml } from '../cover.js';
import { tripStatus, isoDate, todayVN, escapeHtml } from '../trip-utils.js';
import { searchPlaces, addBaseLayer } from '../geo.js';
import {
  toast, confirmDialog, validateInput, showFieldError, clearFieldError, applyServerErrors, setFlash,
} from '../ui.js';

const params = new URLSearchParams(location.search);
const editId = Number(params.get('id') || params.get('edit')) || null;

const $ = (id) => document.getElementById(id);
const form = $('trip-form');
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const state = {
  original: null, // dữ liệu lúc mở form, để biết có thay đổi chưa (MSG 25)
  place: null, // { address, latitude, longitude } khi chọn gợi ý
  start: null, // 'YYYY-MM-DD'
  end: null,
  month: null, // ngày 1 của tháng đầu trên lịch
  suggestedDays: null, // số ngày gợi ý khi mở từ Screen 4
  coverImage: null,
  coverColor: null,
  saving: false,
};

document.querySelectorAll('[data-link]').forEach((a) => (a.href = pageUrl(a.dataset.link)));

/* ---------- Tiền ---------- */

const parseMoney = (s) => Number(String(s).replace(/[^\d]/g, '')) || 0;
const formatMoneyInput = (n) => (n ? Math.round(n).toLocaleString('vi-VN') : '');

/* ---------- Giá trị form ---------- */

function values() {
  return {
    title: form.title.value.trim(),
    description: form.description.value.trim(),
    destination: form.destination.value.trim(),
    address: state.place?.address ?? null,
    latitude: state.place?.latitude ?? null,
    longitude: state.place?.longitude ?? null,
    startDate: state.start,
    endDate: state.end,
    budget: parseMoney(form.budget.value),
    isPublic: form.isPublic.checked,
  };
}

const isDirty = () => state.original !== null && JSON.stringify(values()) !== state.original;
const markClean = () => (state.original = JSON.stringify(values()));

/* ---------- Xem trước (UC 14 · B4) ---------- */

function renderPreview() {
  const v = values();
  const trip = {
    title: v.title || 'Tên chuyến đi',
    destination: v.destination || 'Điểm đến',
    startDate: v.startDate,
    endDate: v.endDate || v.startDate,
    coverImage: state.coverImage,
    coverColor: state.coverColor,
  };
  const hasDates = Boolean(v.startDate);
  const status = hasDates ? tripStatus(trip) : null;
  let dates = 'Chưa chọn ngày';
  if (hasDates) {
    dates = trip.startDate === trip.endDate
      ? formatDayMonth(trip.startDate)
      : `${formatDayMonth(trip.startDate)} – ${formatDayMonth(trip.endDate)}`;
  }
  $('preview').innerHTML = `
    <div class="trip-card">
      <div class="trip-card-cover">
        ${coverHtml(trip)}
        ${status ? `<span class="chip ${status.chip} trip-card-status">${status.label}</span>` : ''}
        ${hasDates ? `<span class="chip chip-outline trip-card-days">${formatDuration(trip.startDate, trip.endDate)}</span>` : ''}
      </div>
      <div class="trip-card-body">
        <h3>${escapeHtml(trip.title)}</h3>
        <p class="meta">${escapeHtml(trip.destination)} · ${dates}</p>
        <p class="trip-card-count">Ngân sách ${v.budget ? formatMoney(v.budget) : '—'} · ${v.isPublic ? 'Công khai' : 'Riêng tư'}</p>
      </div>
    </div>`;
}

/* ---------- Mô tả: bộ đếm x/1000 ---------- */

function renderCounter() {
  const n = form.description.value.length;
  const el = $('desc-count');
  el.textContent = `${n}/1000`;
  el.classList.toggle('is-over', n > 1000);
}

/* ---------- Lịch 2 tháng (CBR 2) ---------- */

function monthHtml(first) {
  const today = isoDate(todayVN());
  const lead = (first.getDay() + 6) % 7; // tuần bắt đầu từ T2
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => `<span class="dow">${d}</span>`);
  for (let i = 0; i < lead; i++) cells.push('<span></span>');
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = isoDate(new Date(first.getFullYear(), first.getMonth(), d));
    const cls = ['cal-day'];
    if (iso === today) cls.push('is-today');
    if (iso === state.start) cls.push('is-start');
    if (iso === state.end) cls.push('is-end');
    if (state.start && state.end && iso > state.start && iso < state.end) cls.push('in-range');
    const pressed = iso === state.start || iso === state.end;
    cells.push(`<button type="button" class="${cls.join(' ')}" data-date="${iso}" aria-pressed="${pressed}">${d}</button>`);
  }
  return `<div class="cal-month"><h3>Tháng ${first.getMonth() + 1}, ${first.getFullYear()}</h3><div class="cal-grid">${cells.join('')}</div></div>`;
}

function renderCalendar() {
  const m = state.month;
  const next = new Date(m.getFullYear(), m.getMonth() + 1, 1);
  $('cal-months').innerHTML = monthHtml(m) + monthHtml(next);
  form.startDate.value = state.start || '';
  form.endDate.value = state.end || '';
  const label = (iso) => `${WEEKDAY_SHORT[toDate(iso).getDay()]} ${formatDayMonth(iso)}`;
  let summary = 'Chọn ngày đi rồi ngày về';
  if (state.start && !state.end) summary = `${label(state.start)} → chọn ngày về`;
  if (state.start && state.end) summary = `${label(state.start)} → ${label(state.end)} · ${formatDuration(state.start, state.end)}`;
  $('date-summary').textContent = summary;
}

function pickDate(iso) {
  // Bấm ngày đi rồi ngày về. Đã đủ hai ngày, hoặc bấm ngày trước ngày đi → chọn lại từ đầu.
  if (!state.start || state.end || iso < state.start) {
    state.start = iso;
    state.end = null;
    // Mở từ Screen 4: ngày về = ngày đi + số ngày gợi ý − 1.
    if (state.suggestedDays) {
      const s = toDate(iso);
      state.end = isoDate(new Date(s.getFullYear(), s.getMonth(), s.getDate() + state.suggestedDays - 1));
    }
  } else {
    state.end = iso;
  }
  clearDateError();
  renderCalendar();
  renderPreview();
}

function showDateError(text) {
  $('date-error').textContent = text;
  $('calendar').classList.add('is-invalid');
}
function clearDateError() {
  $('date-error').textContent = '';
  $('calendar').classList.remove('is-invalid');
}

$('calendar').addEventListener('click', (e) => {
  const day = e.target.closest('[data-date]');
  if (day) return pickDate(day.dataset.date);
  const nav = e.target.closest('.cal-nav');
  if (!nav) return;
  const step = nav.classList.contains('cal-prev') ? -1 : 1;
  state.month = new Date(state.month.getFullYear(), state.month.getMonth() + step, 1);
  renderCalendar();
});

/* ---------- Điểm đến: gợi ý Nominatim (UC 14 · B3) ---------- */

const placeInput = form.destination;
const placeList = $('place-list');
let placeTimer = null;
let placeAbort = null;
let placeResults = [];
let pinMap = null;
let pinMarker = null;

function closePlaces() {
  placeList.hidden = true;
  placeInput.setAttribute('aria-expanded', 'false');
}

function shortName(r) {
  const a = r.address || {};
  return a.city || a.town || a.village || a.state || a.county || r.name || r.display_name.split(',')[0];
}

async function showPlaces(q) {
  placeAbort?.abort();
  placeAbort = new AbortController();
  try {
    placeResults = await searchPlaces(q, { signal: placeAbort.signal, details: true });
  } catch (err) {
    if (err.name === 'AbortError') return;
    placeResults = [];
  }
  placeList.innerHTML = placeResults.length
    ? placeResults
      .map((r, i) => `<li role="option" data-i="${i}" aria-selected="false"><strong>${escapeHtml(shortName(r))}</strong><span>${escapeHtml(r.display_name)}</span></li>`)
      .join('')
    : '<li class="place-empty">Không tìm thấy gợi ý. Bạn vẫn có thể lưu với tên đã gõ.</li>';
  placeList.hidden = false;
  placeInput.setAttribute('aria-expanded', 'true');
}

placeInput.addEventListener('input', () => {
  // Gõ lại thì bỏ toạ độ đã chọn, chỉ giữ tên điểm đến.
  if (state.place) setPlace(null);
  clearTimeout(placeTimer);
  const q = placeInput.value.trim();
  if (q.length < 2) return closePlaces();
  placeTimer = setTimeout(() => showPlaces(q), 350);
});

placeInput.addEventListener('keydown', (e) => {
  if (placeList.hidden) return;
  const items = [...placeList.querySelectorAll('[data-i]')];
  if (e.key === 'Escape') return closePlaces();
  if (!items.length) return;
  const cur = items.findIndex((li) => li.getAttribute('aria-selected') === 'true');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const next = (cur + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items.forEach((li, i) => li.setAttribute('aria-selected', String(i === next)));
  } else if (e.key === 'Enter' && cur >= 0) {
    e.preventDefault();
    choosePlace(placeResults[cur]);
  }
});

placeList.addEventListener('mousedown', (e) => {
  const li = e.target.closest('[data-i]');
  if (!li) return;
  e.preventDefault();
  choosePlace(placeResults[Number(li.dataset.i)]);
});

placeInput.addEventListener('blur', () => setTimeout(closePlaces, 150));

function choosePlace(r) {
  if (!r) return;
  placeInput.value = shortName(r).slice(0, 150);
  setPlace({ address: r.display_name.slice(0, 255), latitude: Number(r.lat), longitude: Number(r.lon) });
  clearFieldError(placeInput);
  closePlaces();
  renderPreview();
}

function setPlace(place) {
  state.place = place;
  const box = $('place-pin');
  if (!place || place.latitude == null || place.longitude == null) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const { latitude: lat, longitude: lng } = place;
  $('place-coords').textContent = `Đã ghim: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  $('place-gmaps').href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  if (!window.L) return;
  if (!pinMap) {
    pinMap = L.map('place-map', { scrollWheelZoom: false }).setView([lat, lng], 11);
    addBaseLayer(pinMap);
    pinMarker = L.marker([lat, lng]).addTo(pinMap);
  } else {
    pinMap.setView([lat, lng], 11);
    pinMarker.setLatLng([lat, lng]);
  }
  setTimeout(() => pinMap.invalidateSize(), 0);
}

/* ---------- Ngân sách ---------- */

function syncBudgetChips() {
  const n = parseMoney(form.budget.value);
  document.querySelectorAll('#budget-chips [data-amount]').forEach((b) => b.setAttribute('aria-selected', String(Number(b.dataset.amount) === n)));
}

form.budget.addEventListener('input', () => {
  // Giữ cả số 0 người dùng gõ để báo đúng MSG 33 (chứ không phải ô trống MSG 29).
  const digits = form.budget.value.replace(/[^\d]/g, '');
  form.budget.value = digits ? Number(digits).toLocaleString('vi-VN') : '';
  syncBudgetChips();
  renderPreview();
});

$('budget-chips').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-amount]');
  if (!chip) return;
  form.budget.value = formatMoneyInput(Number(chip.dataset.amount));
  clearFieldError(form.budget);
  syncBudgetChips();
  renderPreview();
});

/* ---------- Kiểm tra (CBR 1, CBR 2) ---------- */

function validateBudget() {
  if (!validateInput(form.budget)) return false;
  if (parseMoney(form.budget.value) <= 0) {
    showFieldError(form.budget, msg('MSG 33'));
    return false;
  }
  return true;
}

function validateDates() {
  if (!state.start) return showDateError(msg('MSG 29', { label: 'Ngày đi' })), false;
  if (!state.end) return showDateError(msg('MSG 29', { label: 'Ngày về' })), false;
  if (state.end < state.start) return showDateError(msg('MSG 32')), false;
  clearDateError();
  return true;
}

/** Kiểm tra cả form; lỗi hiện dưới từng ô, con trỏ nhảy tới ô lỗi đầu tiên. */
function validateAll() {
  const checks = [
    [form.title, () => validateInput(form.title)],
    [form.description, () => validateInput(form.description)],
    [form.destination, () => validateInput(form.destination)],
    [$('calendar'), validateDates],
    [form.budget, validateBudget],
  ];
  let first = null;
  for (const [el, check] of checks) if (!check() && !first) first = el;
  if (first) {
    first.scrollIntoView({ block: 'center' });
    first.focus({ preventScroll: true });
  }
  return !first;
}

form.title.addEventListener('blur', () => validateInput(form.title));
form.description.addEventListener('blur', () => validateInput(form.description));
form.destination.addEventListener('blur', () => setTimeout(() => validateInput(form.destination), 160));
form.budget.addEventListener('blur', validateBudget);
form.title.addEventListener('input', renderPreview);
// Đang báo lỗi mà người dùng sửa lại thì kiểm tra lại ngay để lỗi cũ không còn treo.
for (const input of [form.title, form.description, form.destination, form.budget]) {
  input.addEventListener('input', () => input.classList.contains('is-invalid') && (input === form.budget ? validateBudget() : validateInput(input)));
}
form.destination.addEventListener('input', renderPreview);
form.description.addEventListener('input', renderCounter);
form.isPublic.addEventListener('change', renderPreview);

/** Lỗi theo trường từ server (400 errors[]): lỗi ngày gắn vào lịch, còn lại gắn vào ô tương ứng. */
function applyErrors(errors = []) {
  const dateErr = errors.find((e) => e.field === 'startDate' || e.field === 'endDate');
  if (dateErr) showDateError(dateErr.message);
  const rest = errors.filter((e) => e !== dateErr && form.elements[e.field] && form.elements[e.field].type !== 'hidden');
  const attached = applyServerErrors(form, rest);
  if (!attached && dateErr) $('calendar').scrollIntoView({ block: 'center' });
  return attached || Boolean(dateErr);
}

/* ---------- Lưu (UC 14 · B6–B7, UC 15 · B4–B7) ---------- */

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (state.saving || !validateAll()) return;
  const v = values();
  const body = { ...v, description: v.description || null };
  const button = form.querySelector('[type="submit"]');
  state.saving = true;
  button.disabled = true;
  try {
    if (editId) {
      const updated = await put(`/trips/${editId}`, body);
      markClean();
      if (updated?.outOfRangeCount > 0) setFlash(msg('MSG 23', { x: updated.outOfRangeCount }), 'warning');
      else setFlash(msg('MSG 34'));
      location.href = pageUrl('trip', { id: editId });
    } else {
      const created = await post('/trips', body);
      markClean();
      setFlash(msg('MSG 22'));
      location.href = pageUrl('trip', { id: created.id });
    }
  } catch (err) {
    state.saving = false;
    if (err.status === 400 && applyErrors(err.errors)) return;
    if (err.status === 404) return showNotFound();
    if (err.status !== 401 && err.status > 0 && err.status < 500) toast(err.message || msg('MSG 18'), 'error');
  } finally {
    button.disabled = false;
  }
});

/* ---------- Hủy, rời trang (MSG 25) ---------- */

const backTarget = () => (editId ? pageUrl('trip', { id: editId }) : pageUrl('myTrips'));

async function leave(href) {
  if (isDirty() && !(await confirmDialog(msg('MSG 25'), { okText: 'Bỏ thay đổi', cancelText: 'Ở lại' }))) return;
  state.original = null; // không hỏi lại ở beforeunload
  location.href = href;
}

$('cancel-btn').addEventListener('click', () => leave(backTarget()));
$('back-link').addEventListener('click', (e) => {
  e.preventDefault();
  leave(e.currentTarget.href);
});
window.addEventListener('beforeunload', (e) => {
  if (!isDirty() || state.saving) return;
  e.preventDefault();
  e.returnValue = '';
});

/* ---------- Mở trang (UC 14 · B2, UC 15 · B2) ---------- */

function showNotFound() {
  document.querySelector('.trip-form-page').removeAttribute('aria-busy');
  form.hidden = true;
  $('not-found').hidden = false;
}

function fill(trip) {
  form.title.value = trip.title || '';
  form.description.value = trip.description || '';
  form.destination.value = trip.destination || '';
  form.budget.value = formatMoneyInput(Number(trip.budget));
  form.isPublic.checked = Boolean(trip.isPublic);
  state.start = trip.startDate ? String(trip.startDate).slice(0, 10) : null;
  state.end = trip.endDate ? String(trip.endDate).slice(0, 10) : null;
  state.coverImage = trip.coverImage || null;
  state.coverColor = trip.coverColor || null;
  if (state.start) {
    const s = toDate(state.start);
    state.month = new Date(s.getFullYear(), s.getMonth(), 1);
  }
  if (trip.latitude != null && trip.longitude != null) {
    setPlace({ address: trip.address || null, latitude: Number(trip.latitude), longitude: Number(trip.longitude) });
  } else if (trip.address) {
    state.place = { address: trip.address, latitude: null, longitude: null };
  }
}

/** Mở từ Screen 4 (?destination=slug): điền tên, địa chỉ, toạ độ và số ngày gợi ý của điểm đến. */
async function prefillDestination(slug) {
  try {
    const d = await get(`/public/destinations/${encodeURIComponent(slug)}`, { auth: false, silent: true });
    form.destination.value = d.name || '';
    if (d.latitude != null && d.longitude != null) {
      setPlace({ address: d.address || d.name, latitude: Number(d.latitude), longitude: Number(d.longitude) });
    }
    state.suggestedDays = Number(d.suggestedDays ?? d.suggested_days) || null;
  } catch {
    // Chưa có API điểm đến (Sprint 4) hoặc slug sai: chỉ điền tên theo slug.
    form.destination.value = slug.replace(/-/g, ' ').replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase());
  }
}

async function init() {
  const today = todayVN();
  state.month = new Date(today.getFullYear(), today.getMonth(), 1);

  if (editId) {
    document.title = 'Sửa chuyến đi · Travelplan';
    $('form-title').textContent = 'Sửa chuyến đi';
    $('back-link').textContent = '← Quay lại lịch trình chuyến';
    $('back-link').href = pageUrl('trip', { id: editId });
    try {
      fill(await get(`/trips/${editId}`));
    } catch (err) {
      if (err.status === 401) return;
      return showNotFound();
    }
  } else if (params.get('destination')) {
    await prefillDestination(params.get('destination'));
  }

  document.querySelector('.trip-form-page').removeAttribute('aria-busy');
  renderCounter();
  renderCalendar();
  syncBudgetChips();
  renderPreview();
  markClean();
}

if (requireLogin()) init();
