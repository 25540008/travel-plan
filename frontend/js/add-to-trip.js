// UC 23 Thêm địa điểm vào chuyến đi, dùng ở Screen 4 (mỗi địa điểm có nút [Thêm vào chuyến]). TP-47.
//   1. Khách chưa đăng nhập → Screen 10 với next, action=add-to-trip, id=<spotId> (CBR 3); đăng nhập xong quay lại và tự mở popup.
//   2. Popup chọn chuyến (chỉ "Sắp đi" / "Đang đi") và ngày.
//   3. Sang Screen 7 của chuyến đó, mở sẵn popup Screen 8 đã điền tên, địa chỉ, toạ độ, ghi chú.
//      Lưu bằng POST /trips/:id/itinerary có sẵn, Screen 7 hiện MSG 21.
//
// Cách dùng trên Screen 4:
//   <button type="button" class="btn btn-secondary" data-add-to-trip data-spot-id="12">+ Thêm vào chuyến</button>
//   import { bindAddToTrip, runPendingAddToTrip } from './add-to-trip.js';
//   const spotById = (id) => detail.spots.find((s) => String(s.id) === String(id));
//   bindAddToTrip(document, spotById);   // bắt click, kể cả nút render sau
//   runPendingAddToTrip(spotById);       // sau khi vẽ xong danh sách địa điểm
import { get } from './api.js';
import { pageUrl } from './config.js';
import { isLoggedIn, redirectToLogin, takePendingAction } from './auth.js';
import { escapeHtml, tripStatus, todayVN, daysBetween } from './trip-utils.js';
import { toDate } from './format.js';

export const ACTION = 'add-to-trip';
const STORAGE_KEY = 'tp_add_spot';
const WEEKDAY = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const pad = (n) => String(n).padStart(2, '0');

/** Các ngày của chuyến: [{ iso, label: "Ngày 1 · Thứ Bảy 21/11" }]. */
export function tripDayOptions(trip) {
  const start = toDate(trip.startDate);
  const n = daysBetween(trip.startDate, trip.endDate) + 1;
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return {
      iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      label: `Ngày ${i + 1} · ${WEEKDAY[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
    };
  });
}

/** Dữ liệu điền sẵn cho Screen 8 từ một địa điểm của Screen 4 (UC 23 B5). */
export function spotToPrefill(spot) {
  const lat = Number(spot.latitude);
  const lng = Number(spot.longitude);
  const has = spot.latitude != null && spot.longitude != null && Number.isFinite(lat) && Number.isFinite(lng);
  return {
    activity: String(spot.name || '').slice(0, 200),
    location: String(spot.address || spot.name || '').slice(0, 200),
    note: String(spot.description || '').slice(0, 1000),
    latitude: has ? lat : null,
    longitude: has ? lng : null,
    // [Ngoài trời] tự bật với Ngắm cảnh và Trekking
    outdoor: spot.outdoor ?? ['SIGHTSEEING', 'TREKKING'].includes(spot.category),
  };
}

/** Screen 7 gọi khi mở trang: trả { date, prefill } nếu có địa điểm đang chờ thêm vào đúng chuyến này, rồi xoá đi. */
export function takePendingSpot(tripId) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const data = JSON.parse(raw);
    return Number(data.tripId) === Number(tripId) ? data : null;
  } catch {
    return null;
  }
}

function openPicker(spot, trips) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const empty = !trips.length;
  backdrop.innerHTML = `
    <form class="modal add-trip-modal" role="dialog" aria-modal="true" aria-labelledby="add-trip-title" novalidate>
      <h2 id="add-trip-title">Thêm vào chuyến</h2>
      <p class="add-trip-spot"><strong>${escapeHtml(spot.name)}</strong></p>
      ${empty
        ? `<p class="meta">Bạn chưa có chuyến nào sắp đi hoặc đang đi.</p>
           <div class="modal-actions">
             <button type="button" class="btn btn-secondary" data-act="cancel">Đóng</button>
             <a class="btn btn-primary" href="${pageUrl('createTrip')}">Tạo chuyến mới</a>
           </div>`
        : `<div class="field">
             <label for="add-trip-trip">Chuyến đi</label>
             <select class="input" id="add-trip-trip">
               ${trips.map((t) => `<option value="${t.id}">${escapeHtml(t.name)} · ${escapeHtml(t.status.label)}</option>`).join('')}
             </select>
           </div>
           <div class="field">
             <label for="add-trip-day">Ngày</label>
             <select class="input" id="add-trip-day"></select>
           </div>
           <div class="modal-actions">
             <button type="button" class="btn btn-secondary" data-act="cancel">Hủy</button>
             <button type="submit" class="btn btn-primary">Tiếp tục</button>
           </div>`}
    </form>`;
  document.body.append(backdrop);
  const previousFocus = document.activeElement;

  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    previousFocus?.focus?.();
  };
  const onKey = (e) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('mousedown', (e) => e.target === backdrop && close());
  backdrop.addEventListener('click', (e) => e.target.closest('[data-act="cancel"]') && close());
  if (empty) return backdrop.querySelector('[data-act="cancel"]').focus();

  const tripSelect = backdrop.querySelector('#add-trip-trip');
  const daySelect = backdrop.querySelector('#add-trip-day');
  const fillDays = () => {
    const trip = trips.find((t) => String(t.id) === tripSelect.value);
    const days = tripDayOptions(trip);
    daySelect.innerHTML = days.map((d) => `<option value="${d.iso}">${escapeHtml(d.label)}</option>`).join('');
    // Đang đi → mặc định hôm nay
    const today = todayVN();
    if (days.some((d) => d.iso === today)) daySelect.value = today;
  };
  tripSelect.addEventListener('change', fillDays);
  fillDays();
  tripSelect.focus();

  backdrop.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ tripId: Number(tripSelect.value), date: daySelect.value, prefill: spotToPrefill(spot) }));
    } catch {
      /* trình duyệt chặn sessionStorage: vẫn sang Screen 7, chỉ mất phần điền sẵn */
    }
    location.href = pageUrl('trip', { id: tripSelect.value });
  });
}

/** Mở popup chọn chuyến cho một địa điểm. Chưa đăng nhập → Screen 10 (CBR 3). */
export async function openAddToTrip(spot) {
  if (!spot) return;
  if (!isLoggedIn()) return redirectToLogin({ action: ACTION, id: spot.id });
  let trips;
  try {
    trips = ((await get('/trips')) || [])
      .map((t) => ({ ...t, status: tripStatus(t) }))
      .filter((t) => t.status.key === 'upcoming' || t.status.key === 'ongoing')
      .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  } catch (err) {
    if (err.status === 401) return;
    return; // api.js đã báo lỗi mạng / 5xx
  }
  openPicker(spot, trips);
}

export function bindAddToTrip(root, getSpot) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-to-trip]');
    if (!btn) return;
    e.preventDefault();
    openAddToTrip(getSpot(btn.dataset.spotId));
  });
}

/** Sau khi đăng nhập quay lại Screen 4 (?action=add-to-trip&id=): tự mở popup cho địa điểm đó. */
export function runPendingAddToTrip(getSpot) {
  const pending = takePendingAction();
  if (!pending || pending.action !== ACTION || !isLoggedIn()) return;
  openAddToTrip(getSpot(pending.id));
}
