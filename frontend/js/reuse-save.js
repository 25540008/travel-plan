// UC 11 Dùng lại lịch trình mẫu + UC 12 Lưu / bỏ lưu, dùng chung cho Screen 1, 2 (và Screen 4 sau này). TP-40.
// Viết lại từ bản của Phượng (tp40-dung-lai-luu.js) để gọi API thật của TP-60, TP-37 qua js/api.js:
//   POST /trips/:id/clone { startDate } → { trip, messageCode: 'MSG 31' }
//   GET /me/saved?itemType=TRIP, POST /me/saved { itemType, itemId } (bấm lại = bỏ lưu)
// CBR 3: khách bấm Dùng lại / Lưu → Screen 10 với action=reuse|save&id=, đăng nhập xong quay lại và tự làm tiếp (runPendingAction).
//
// Cách dùng trên trang:
//   <button data-action="reuse" data-id="12" data-title="Đà Lạt chill" data-days="3">Dùng lại</button>
//   <button data-action="save" data-id="12" aria-pressed="false">♡</button>
//   bindReuseSave(container); markSaved(container); runPendingAction();
import { get, post } from './api.js';
import { pageUrl } from './config.js';
import { MSG } from './messages.js';
import { isLoggedIn, redirectToLogin, takePendingAction } from './auth.js';
import { toast, setFlash } from './ui.js';
import { escapeHtml } from './trip-utils.js';

const DAY_MS = 86_400_000;
const VN_OFFSET_MS = 7 * 3_600_000;
const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** Thứ Bảy gần nhất theo giờ Việt Nam (hôm nay là thứ Bảy thì lấy tuần sau), dạng "YYYY-MM-DD". Khớp backend. */
export function nextSaturdayIso(now = new Date()) {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  const today = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate());
  const diff = (6 - vn.getUTCDay() + 7) % 7 || 7;
  return new Date(today + diff * DAY_MS).toISOString().slice(0, 10);
}

const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const label = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAY[d.getUTCDay()]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
};
const todayIso = () => new Date(Date.now() + VN_OFFSET_MS).toISOString().slice(0, 10);

/* ---------- UC 11: popup chọn ngày bắt đầu (B3) rồi chép chuyến (B5, B6) ---------- */

function reusePopup({ id, title, days }) {
  const n = Math.max(1, Number(days) || 1);
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <form class="modal reuse-modal" role="dialog" aria-modal="true" aria-labelledby="reuse-title" novalidate>
      <h2 id="reuse-title">Dùng lại lịch trình</h2>
      <p class="reuse-name"><strong>${escapeHtml(title || 'Lịch trình')}</strong> · ${n} ngày</p>
      <div class="field">
        <label for="reuse-start">Ngày bắt đầu</label>
        <input class="input" type="date" id="reuse-start" required>
      </div>
      <div class="field">
        <label for="reuse-end">Ngày kết thúc</label>
        <input class="input" id="reuse-end" readonly tabindex="-1">
      </div>
      <p class="field-error" id="reuse-error" role="alert"></p>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" data-act="cancel">Hủy</button>
        <button type="submit" class="btn btn-primary" data-act="ok">Tạo chuyến của tôi</button>
      </div>
    </form>`;
  document.body.append(backdrop);

  const start = backdrop.querySelector('#reuse-start');
  const end = backdrop.querySelector('#reuse-end');
  const error = backdrop.querySelector('#reuse-error');
  const ok = backdrop.querySelector('[data-act="ok"]');
  const previousFocus = document.activeElement;
  start.min = todayIso();
  start.value = nextSaturdayIso();
  const syncEnd = () => (end.value = start.value ? label(addDays(start.value, n - 1)) : '');
  syncEnd();

  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    previousFocus?.focus?.();
  };
  const onKey = (e) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('mousedown', (e) => e.target === backdrop && close());
  backdrop.querySelector('[data-act="cancel"]').addEventListener('click', close);
  start.addEventListener('input', () => {
    error.textContent = '';
    syncEnd();
  });

  backdrop.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!start.value) {
      error.textContent = 'Vui lòng chọn Ngày bắt đầu.';
      return start.focus();
    }
    ok.disabled = true;
    ok.textContent = 'Đang tạo…';
    try {
      const res = await post(`/trips/${id}/clone`, { startDate: start.value });
      const newId = res?.trip?.id ?? res?.id;
      setFlash(res?.message || MSG['MSG 31']); // MSG 31 hiện trên Screen 7 của chuyến mới
      location.href = pageUrl('trip', { id: newId });
    } catch (err) {
      if (err.status === 401) return;
      error.textContent = err.status === 404 ? 'Lịch trình này không còn công khai.' : err.message;
      ok.disabled = false;
      ok.textContent = 'Tạo chuyến của tôi';
    }
  });
  start.focus();
}

/** Bấm [Dùng lại]: khách → Screen 10 (CBR 3); thành viên → popup chọn ngày. */
export function reuseTrip(card) {
  if (!isLoggedIn()) return redirectToLogin({ action: 'reuse', id: card.id });
  reusePopup(card);
}

/* ---------- UC 12: lưu / bỏ lưu ---------- */

const savedIds = new Set();

function paint(btn, saved) {
  btn.classList.toggle('is-saved', saved);
  btn.setAttribute('aria-pressed', String(saved));
  if (btn.dataset.label !== undefined) btn.lastChild.textContent = saved ? ' Đã lưu' : ' Lưu';
}

/** Tô tim cho các nút data-action="save" đã lưu (gọi sau khi render thẻ). */
export function markSaved(root = document) {
  root.querySelectorAll('[data-action="save"]').forEach((b) => paint(b, savedIds.has(String(b.dataset.id))));
}

/** Tải danh sách đã lưu của thành viên (khách bỏ qua). Lỗi thì coi như chưa lưu gì. */
export async function loadSaved() {
  if (!isLoggedIn()) return savedIds;
  try {
    const list = await get('/me/saved?itemType=TRIP', { silent: true });
    savedIds.clear();
    (Array.isArray(list) ? list : []).forEach((x) => savedIds.add(String(x.itemId)));
  } catch {
    /* bỏ qua */
  }
  return savedIds;
}

/** Bấm tim: B3 tô ngay rồi gọi API; B4a lỗi → bỏ tô, MSG 18. */
export async function toggleSave(btn, { force } = {}) {
  const id = String(btn.dataset.id);
  if (!isLoggedIn()) return redirectToLogin({ action: 'save', id });
  if (btn.dataset.busy) return;
  const was = savedIds.has(id);
  if (force === true && was) return; // sau khi đăng nhập (action=save) chỉ lưu, không bỏ lưu mục đã lưu từ trước
  btn.dataset.busy = '1';
  paint(btn, !was);
  try {
    const res = await post('/me/saved', { itemType: 'TRIP', itemId: Number(id) }, { silent: true });
    if (res?.saved) savedIds.add(id);
    else savedIds.delete(id);
    document.querySelectorAll(`[data-action="save"][data-id="${CSS.escape(id)}"]`).forEach((b) => paint(b, savedIds.has(id)));
  } catch (err) {
    paint(btn, was);
    if (err.status !== 401) toast(MSG['MSG 18'], 'error');
  } finally {
    delete btn.dataset.busy;
  }
}

/** Gắn sự kiện cho mọi nút Dùng lại / Lưu bên trong root (thẻ được render lại vẫn chạy). */
export function bindReuseSave(root) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="reuse"], [data-action="save"]');
    if (!btn || !root.contains(btn)) return;
    e.preventDefault();
    if (btn.dataset.action === 'save') return toggleSave(btn);
    reuseTrip({ id: btn.dataset.id, title: btn.dataset.title, days: btn.dataset.days });
  });
}

/** Đăng nhập xong quay lại trang với ?action=reuse|save&id= → tự làm tiếp thao tác (UC 11 B2a, UC 12 B2a). */
export async function runPendingAction() {
  const pending = takePendingAction();
  if (!pending?.id || !isLoggedIn()) return;
  if (pending.action === 'save') {
    const btn = document.querySelector(`[data-action="save"][data-id="${CSS.escape(pending.id)}"]`);
    if (btn) return toggleSave(btn, { force: true });
    // Thẻ không có trên trang (ví dụ đã lọc khác): gọi thẳng API
    if (savedIds.has(String(pending.id))) return;
    try {
      await post('/me/saved', { itemType: 'TRIP', itemId: Number(pending.id) }, { silent: true });
      savedIds.add(String(pending.id));
      toast('Đã lưu lịch trình.');
    } catch {
      toast(MSG['MSG 18'], 'error');
    }
    return;
  }
  if (pending.action === 'reuse') {
    const btn = document.querySelector(`[data-action="reuse"][data-id="${CSS.escape(pending.id)}"]`);
    if (btn) return reuseTrip({ id: pending.id, title: btn.dataset.title, days: btn.dataset.days });
    try {
      const t = await get(`/public/trips/${pending.id}`, { auth: false, silent: true });
      const days = Math.round((Date.parse(t.endDate) - Date.parse(t.startDate)) / DAY_MS) + 1;
      reuseTrip({ id: pending.id, title: t.title, days });
    } catch {
      toast('Lịch trình này không còn công khai.', 'error');
    }
  }
}
