// Các popup trên Screen 7, bắt sự kiện do js/pages/chuyen-di.js phát ra:
//   trip:cover       → UC 17 Đổi ảnh bìa (TP-24): chọn màu, dán link hoặc tải ảnh (JPG/PNG/WebP ≤ 5 MB, MSG 16)
//   trip:share       → UC 18 Chia sẻ công khai (TP-24): công tắc công khai + chép link (MSG 17)
//   trip:add-item    → UC 20 Thêm hoạt động (TP-29, Screen 8)
//   trip:edit-item   → UC 21 Sửa hoạt động (TP-29, Screen 8)
//   trip:delete-item → UC 22 Xóa hoạt động (TP-30, MSG 27)
// Lưu xong phát trip:reload để Screen 7 tải lại.
import { pageUrl } from './config.js';
import { get, post, put, del } from './api.js';
import { msg } from './messages.js';
import { toast, confirmDialog, showFieldError, clearFieldError, validateInput } from './ui.js';
import { COVER_COLORS, coverColorValue } from './cover.js';
import { escapeHtml, minutesOf } from './trip-utils.js';
import { toDate, formatTime } from './format.js';

const MAX_BYTES = 5 * 1024 * 1024;
const WEEKDAY = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const pad = (n) => String(n).padStart(2, '0');
const reload = () => document.dispatchEvent(new Event('trip:reload'));
const showApiError = (err) => {
  // 401 và lỗi mạng / 5xx đã được api.js xử lý chung.
  if (err.status !== 401 && err.status > 0 && err.status < 500) toast(err.message || msg('MSG 18'), 'error');
};

/* ---------- Khung popup dùng chung ---------- */

/**
 * Mở popup có tiêu đề và nút đóng (×, Esc, bấm nền). onClose() trả false để giữ popup lại.
 * Trả { el, close }; close(true) đóng luôn không hỏi.
 */
function openSheet({ title, body, className = '', onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop sheet-backdrop';
  backdrop.innerHTML = `
    <div class="modal sheet ${className}" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <div class="sheet-head">
        <h2 id="sheet-title"></h2>
        <button type="button" class="sheet-close" data-close aria-label="Đóng">×</button>
      </div>
      <div class="sheet-body">${body}</div>
    </div>`;
  backdrop.querySelector('#sheet-title').textContent = title;
  const previousFocus = document.activeElement;

  const close = async (force = false) => {
    if (!force && onClose && (await onClose()) === false) return;
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    previousFocus?.focus?.();
  };
  // Esc đóng popup, trừ khi đang có popup xác nhận (MSG 25) mở phía trên.
  const onKey = (e) => {
    if (e.key === 'Escape' && !document.querySelector('.modal-backdrop:not(.sheet-backdrop)')) close();
  };
  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);
  backdrop.querySelector('input:not([type=hidden]):not([hidden]), select, textarea, .sheet-body button')?.focus();
  return { el: backdrop.querySelector('.sheet'), close };
}

/* ---------- UC 17 Đổi ảnh bìa (TP-24) ---------- */

/** Nhận dạng ảnh theo nội dung tệp (giống backend), không tin đuôi tệp. */
async function isRealImage(file) {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (from, to) => String.fromCharCode(...b.slice(from, to));
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && ascii(1, 4) === 'PNG';
  const webp = ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
  return jpg || png || webp;
}

function openCover({ trip }) {
  const current = coverColorValue(trip.coverColor) ? trip.coverColor : null;
  const swatches = Object.entries(COVER_COLORS)
    .map(([name, hex]) => `<button type="button" class="swatch" data-color="${name}" style="background:${hex}" aria-label="Màu ${name}" aria-pressed="${name === current}"></button>`)
    .join('');
  const link = /^https?:/.test(trip.coverImage || '') ? trip.coverImage : '';
  const { el, close } = openSheet({
    title: 'Ảnh bìa',
    className: 'cover-sheet',
    body: `
      <div class="seg" role="tablist">
        <button type="button" role="tab" data-mode="upload" aria-selected="true">Tải ảnh</button>
        <button type="button" role="tab" data-mode="link" aria-selected="false">Dán link</button>
        <button type="button" role="tab" data-mode="color" aria-selected="false">Chọn màu</button>
      </div>
      <div data-pane="upload">
        <label class="dropzone">
          <input type="file" name="image" accept="image/jpeg,image/png,image/webp" hidden>
          <strong>Chọn ảnh từ máy</strong>
          <span class="meta">JPG, PNG hoặc WebP, tối đa 5 MB</span>
          <span class="meta file-name"></span>
        </label>
      </div>
      <div data-pane="link" hidden>
        <div class="field">
          <label for="cover-url">Link ảnh</label>
          <input class="input" id="cover-url" type="url" placeholder="https://..." value="${escapeHtml(link)}">
        </div>
      </div>
      <div data-pane="color" hidden>
        <div class="swatches">${swatches}</div>
      </div>
      <p class="field-error cover-error" role="alert"></p>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" data-close>Hủy</button>
        <button type="button" class="btn btn-primary" data-save>Lưu</button>
      </div>`,
  });

  let mode = 'upload';
  let file = null;
  let color = current;
  const errorBox = el.querySelector('.cover-error');
  const showError = (text) => (errorBox.textContent = text);

  el.querySelector('.seg').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-mode]');
    if (!tab) return;
    mode = tab.dataset.mode;
    el.querySelectorAll('[data-mode]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    el.querySelectorAll('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== mode));
    showError('');
  });

  el.querySelector('input[type=file]').addEventListener('change', async (e) => {
    file = e.target.files[0] || null;
    el.querySelector('.file-name').textContent = file ? file.name : '';
    showError('');
    // B4: báo MSG 16 ngay khi chọn tệp sai; server vẫn kiểm tra lại.
    if (file && (file.size > MAX_BYTES || !(await isRealImage(file)))) showError(msg('MSG 16'));
  });

  el.querySelector('.swatches').addEventListener('click', (e) => {
    const sw = e.target.closest('[data-color]');
    if (!sw) return;
    color = sw.dataset.color;
    el.querySelectorAll('.swatch').forEach((s) => s.setAttribute('aria-pressed', String(s === sw)));
    showError('');
  });

  el.querySelector('[data-save]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    showError('');
    try {
      if (mode === 'upload') {
        if (!file) return showError('Vui lòng chọn ảnh.');
        if (file.size > MAX_BYTES || !(await isRealImage(file))) return showError(msg('MSG 16'));
        const fd = new FormData();
        fd.append('image', file);
        btn.disabled = true;
        await post(`/trips/${trip.id}/cover/upload`, fd);
      } else if (mode === 'link') {
        const url = el.querySelector('#cover-url').value.trim();
        if (!url) return showError(msg('MSG 29', { label: 'Link ảnh' }));
        if (!/^https?:\/\/\S+$/i.test(url)) return showError(msg('MSG 3'));
        btn.disabled = true;
        await put(`/trips/${trip.id}/cover`, { imageUrl: url });
      } else {
        if (!color) return showError('Vui lòng chọn một màu.');
        btn.disabled = true;
        await put(`/trips/${trip.id}/cover`, { color });
      }
      close(true);
      toast(msg('MSG 34'));
      reload();
    } catch (err) {
      if (err.status === 400) showError(err.code === 'MSG 16' ? msg('MSG 16') : err.message);
      else showApiError(err);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---------- UC 18 Chia sẻ công khai (TP-24) ---------- */

const shareUrl = (trip) => new URL(pageUrl('share', { id: trip.id }), location.href).href;

function openShare({ trip }) {
  const { el } = openSheet({
    title: 'Chia sẻ chuyến đi',
    className: 'share-sheet',
    body: `
      <label class="switch-row">
        <span>
          <strong>Công khai lịch trình</strong>
          <span class="meta">Ai có link đều xem được lịch trình. Khoản chi không bao giờ được chia sẻ.</span>
        </span>
        <input type="checkbox" role="switch" class="switch" ${trip.isPublic ? 'checked' : ''}>
      </label>
      <div class="field share-link">
        <label for="share-url">Link chia sẻ</label>
        <div class="share-link-row">
          <input class="input" id="share-url" readonly value="${escapeHtml(shareUrl(trip))}">
          <button type="button" class="btn btn-dark" data-copy>Chép link</button>
        </div>
        <p class="meta share-hint"></p>
      </div>`,
  });

  const toggle = el.querySelector('.switch');
  const copyBtn = el.querySelector('[data-copy]');
  const input = el.querySelector('#share-url');
  const sync = () => {
    // B2: link chỉ chép được khi chuyến đang công khai.
    copyBtn.disabled = !toggle.checked;
    input.disabled = !toggle.checked;
    el.querySelector('.share-hint').textContent = toggle.checked ? '' : 'Bật công khai để chép link.';
  };
  sync();

  toggle.addEventListener('change', async () => {
    const want = toggle.checked;
    toggle.disabled = true;
    try {
      const updated = await put(`/trips/${trip.id}`, { isPublic: want });
      trip.isPublic = updated.isPublic;
      reload();
    } catch (err) {
      toggle.checked = !want;
      showApiError(err);
    } finally {
      toggle.disabled = false;
      sync();
    }
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(input.value);
    } catch {
      input.select();
      document.execCommand?.('copy');
    }
    toast(msg('MSG 17'), 'success', 3000);
  });
}

/* ---------- UC 20, UC 21 Thêm / sửa hoạt động (TP-29, Screen 8) ---------- */

const PERIODS = [
  { label: 'Sáng sớm', from: 5 },
  { label: 'Sáng', from: 7 },
  { label: 'Trưa', from: 11 },
  { label: 'Chiều', from: 13 },
  { label: 'Tối', from: 18 },
];
const DURATIONS = [
  { label: '+30 phút', min: 30 },
  { label: '+1 giờ', min: 60 },
  { label: '+2 giờ', min: 120 },
  { label: '+3 giờ', min: 180 },
];

const toHHMM = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const clampMin = (min) => Math.max(0, Math.min(23 * 60 + 45, min));
const roundTo15 = (min) => Math.round(min / 15) * 15;
const dayOf = (it) => String(it.activityDate).slice(0, 10);

function tripDates(trip) {
  const s = toDate(trip.startDate);
  const n = Math.round((toDate(trip.endDate) - s) / 86_400_000) + 1;
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i);
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { iso, label: `Ngày ${i + 1} · ${WEEKDAY[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}` };
  });
}

/** "Bánh xe" giờ – phút: giờ 00–23, phút bước 15. */
function timeWheel(name, label) {
  const hours = Array.from({ length: 24 }, (_, h) => `<option value="${pad(h)}">${pad(h)}</option>`).join('');
  const mins = ['00', '15', '30', '45'].map((m) => `<option value="${m}">${m}</option>`).join('');
  return `
    <div class="time-wheel">
      <span class="meta">${label}</span>
      <div class="time-wheel-row">
        <select class="input" name="${name}H" aria-label="${label}: giờ">${hours}</select>
        <span>:</span>
        <select class="input" name="${name}M" aria-label="${label}: phút">${mins}</select>
      </div>
    </div>`;
}

async function openItem({ trip, item = null, date }) {
  const isEdit = Boolean(item);
  const days = tripDates(trip);
  let allItems = [];
  try {
    const data = await get(`/trips/${trip.id}/itinerary`, { silent: true });
    allItems = Array.isArray(data) ? data : data?.items || [];
  } catch {
    // Không tải được danh sách thì bỏ qua cảnh báo trùng giờ phía client (server vẫn trả warning).
  }
  const sameDay = (iso) => allItems.filter((it) => dayOf(it) === iso && (!item || it.id !== item.id));

  const dayIso = isEdit ? dayOf(item) : date;
  const offSchedule = isEdit && !days.some((d) => d.iso === dayIso);
  const dayOptions = [
    ...(offSchedule ? [{ iso: dayIso, label: `Ngoài lịch · ${dayIso.slice(8, 10)}/${dayIso.slice(5, 7)}` }] : []),
    ...days,
  ]
    .map((d) => `<option value="${d.iso}" ${d.iso === dayIso ? 'selected' : ''}>${escapeHtml(d.label)}</option>`)
    .join('');
  const dayLabel = days.find((d) => d.iso === dayIso)?.label || dayIso;

  let dirty = false;
  const { el, close } = openSheet({
    title: isEdit ? 'Sửa hoạt động' : 'Thêm hoạt động',
    className: 'item-sheet',
    // Đóng khi đã sửa → MSG 25.
    onClose: async () => !dirty || confirmDialog(msg('MSG 25'), { okText: 'Bỏ thay đổi', cancelText: 'Ở lại' }),
    body: `
      <form class="item-form" novalidate>
        ${isEdit
          ? `<div class="field"><label for="item-date">Ngày</label><select class="input" id="item-date" name="activityDate">${dayOptions}</select></div>`
          : `<p class="meta item-day">${escapeHtml(dayLabel)}</p><input type="hidden" name="activityDate" value="${dayIso}">`}
        <div class="field">
          <label for="item-name">Tên hoạt động</label>
          <input class="input" id="item-name" name="activity" required data-maxlength="200" placeholder="Ví dụ: Cà phê ngắm đồi">
        </div>
        <div class="field">
          <span class="field-label">Giờ</span>
          <div class="quick-chips" data-periods>
            ${PERIODS.map((p) => `<button type="button" class="status-tab" data-from="${p.from}">${p.label}</button>`).join('')}
          </div>
          <div class="time-pair">
            ${timeWheel('start', 'Bắt đầu')}
            ${timeWheel('end', 'Kết thúc')}
          </div>
          <div class="field-error time-error" role="alert"></div>
          <div class="quick-chips" data-durations>
            <span class="meta">Thời lượng</span>
            ${DURATIONS.map((d) => `<button type="button" class="status-tab" data-min="${d.min}">${d.label}</button>`).join('')}
          </div>
          <p class="clash-warn" hidden></p>
        </div>
        <div class="field place-field">
          <label for="item-place">Địa điểm</label>
          <input class="input" id="item-place" name="location" data-maxlength="200" autocomplete="off" placeholder="Tìm địa điểm (từ 2 ký tự)">
          <ul class="place-list" hidden role="listbox"></ul>
        </div>
        <div class="field">
          <label for="item-note">Ghi chú</label>
          <textarea class="input" id="item-note" name="note" data-maxlength="1000" rows="2" placeholder="Đặt bàn trước, mang áo khoác..."></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-close>Hủy</button>
          ${isEdit ? '' : '<button type="button" class="btn btn-secondary" data-save-more>Lưu &amp; thêm tiếp</button>'}
          <button type="submit" class="btn btn-primary">${isEdit ? 'Lưu thay đổi' : 'Lưu hoạt động'}</button>
        </div>
      </form>`,
  });

  const form = el.querySelector('.item-form');
  const getTime = (name) => minutesOf(`${form[`${name}H`].value}:${form[`${name}M`].value}`);
  const setTime = (name, min) => {
    const v = toHHMM(clampMin(roundTo15(min)));
    form[`${name}H`].value = v.slice(0, 2);
    form[`${name}M`].value = v.slice(3);
  };

  // B2: điền sẵn. Thêm: bắt đầu = giờ kết thúc của hoạt động cuối ngày (chưa có → 08:00), kết thúc = bắt đầu + 1 giờ.
  if (isEdit) {
    form.activity.value = item.activity || '';
    form.location.value = item.location || '';
    form.note.value = item.note || '';
    setTime('start', minutesOf(formatTime(item.startTime)));
    setTime('end', minutesOf(formatTime(item.endTime)));
  } else {
    const ends = sameDay(dayIso).map((it) => minutesOf(formatTime(it.endTime)));
    const start = ends.length ? Math.max(...ends) : 8 * 60;
    setTime('start', start);
    setTime('end', start + 60);
  }

  const timeError = el.querySelector('.time-error');
  const clashBox = el.querySelector('.clash-warn');

  /** MSG 8 khi kết thúc ≤ bắt đầu; CBR 7 cảnh báo trùng giờ nhưng vẫn cho lưu. */
  function checkTimes() {
    const s = getTime('start');
    const e = getTime('end');
    const ok = e > s;
    timeError.textContent = ok ? '' : msg('MSG 8');
    el.querySelectorAll('.time-wheel select').forEach((sel) => sel.classList.toggle('is-invalid', !ok));
    const clash = ok
      ? sameDay(form.activityDate.value).filter((o) => s < minutesOf(formatTime(o.endTime)) && minutesOf(formatTime(o.startTime)) < e)
      : [];
    clashBox.hidden = !clash.length;
    clashBox.textContent = clash.length
      ? `⚠ Trùng giờ với ${clash.map((c) => `${c.activity} (${formatTime(c.startTime)} – ${formatTime(c.endTime)})`).join(', ')}. Bạn vẫn có thể lưu.`
      : '';
    return ok;
  }
  checkTimes();

  form.addEventListener('input', () => (dirty = true));
  form.addEventListener('change', (e) => {
    dirty = true;
    if (e.target.closest('.time-wheel') || e.target.name === 'activityDate') checkTimes();
  });

  el.querySelector('[data-periods]').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-from]');
    if (!chip) return;
    const duration = Math.max(getTime('end') - getTime('start'), 60);
    setTime('start', Number(chip.dataset.from) * 60);
    setTime('end', Number(chip.dataset.from) * 60 + duration);
    dirty = true;
    checkTimes();
  });
  el.querySelector('[data-durations]').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-min]');
    if (!chip) return;
    setTime('end', getTime('start') + Number(chip.dataset.min));
    dirty = true;
    checkTimes();
  });

  // Toạ độ của địa điểm đã chọn từ gợi ý (để ghim trên bản đồ ngày). Gõ lại tay thì bỏ toạ độ.
  let coords = isEdit && item.latitude != null && item.longitude != null
    ? { latitude: Number(item.latitude), longitude: Number(item.longitude) }
    : null;
  bindPlaceSearch(form.location, el.querySelector('.place-list'), trip, (picked) => (coords = picked));
  for (const f of [form.activity, form.location, form.note]) f.addEventListener('blur', () => validateInput(f));
  form.activity.addEventListener('input', () => clearFieldError(form.activity));

  async function save({ more = false } = {}) {
    const invalid = [form.activity, form.location, form.note].filter((f) => !validateInput(f));
    const timesOk = checkTimes();
    if (invalid.length) return invalid[0].focus();
    if (!timesOk) return form.startH.focus();
    const body = {
      activityDate: form.activityDate.value,
      activity: form.activity.value.trim(),
      startTime: toHHMM(getTime('start')),
      endTime: toHHMM(getTime('end')),
      location: form.location.value.trim() || null,
      note: form.note.value.trim() || null,
      latitude: form.location.value.trim() ? coords?.latitude ?? null : null,
      longitude: form.location.value.trim() ? coords?.longitude ?? null : null,
    };
    const buttons = el.querySelectorAll('.modal-actions .btn');
    buttons.forEach((b) => (b.disabled = true));
    try {
      if (isEdit) {
        await put(`/trips/${trip.id}/itinerary/${item.id}`, body);
        toast(msg('MSG 34'));
      } else {
        allItems.push(await post(`/trips/${trip.id}/itinerary`, body));
        toast(msg('MSG 21'));
      }
      reload();
      dirty = false;
      if (!more) return close(true);
      // B7: Lưu & thêm tiếp → giữ popup, xoá tên và ghi chú, bắt đầu = kết thúc vừa lưu.
      const end = getTime('end');
      form.activity.value = '';
      form.note.value = '';
      form.location.value = '';
      coords = null;
      setTime('start', end);
      setTime('end', end + 60);
      checkTimes();
      form.activity.focus();
    } catch (err) {
      if (err.status === 400) {
        const errors = err.errors?.length ? err.errors : [{ field: '', code: err.code, message: err.message }];
        for (const fe of errors) {
          if (fe.field === 'endTime' || fe.field === 'startTime' || fe.code === 'MSG 8') timeError.textContent = fe.message;
          else if (form.elements[fe.field] && form.elements[fe.field].type !== 'hidden') showFieldError(form.elements[fe.field], fe.message);
          else toast(fe.message, 'error');
        }
      } else if (err.status === 404) {
        toast('Không tìm thấy hoạt động này.', 'error');
        close(true);
        reload();
      } else {
        showApiError(err);
      }
    } finally {
      buttons.forEach((b) => (b.disabled = false));
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    save();
  });
  el.querySelector('[data-save-more]')?.addEventListener('click', () => save({ more: true }));
}

/**
 * Gợi ý địa điểm Nominatim cho ô Địa điểm (≥ 2 ký tự, tối đa 5), ưu tiên quanh điểm đến của chuyến.
 * onPick({ latitude, longitude }) khi chọn một gợi ý; onPick(null) khi người dùng gõ lại tay.
 */
function bindPlaceSearch(input, list, trip, onPick = () => {}) {
  let timer = null;
  let ctrl = null;
  let results = [];
  const hide = () => (list.hidden = true);
  const lat = Number(trip.latitude);
  const lng = Number(trip.longitude);
  const near = trip.latitude != null && trip.longitude != null ? `&viewbox=${lng - 0.5},${lat + 0.5},${lng + 0.5},${lat - 0.5}` : '';
  const nameOf = (r) => r.name || r.display_name.split(',')[0];

  input.addEventListener('input', () => {
    onPick(null);
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) return hide();
    timer = setTimeout(async () => {
      ctrl?.abort();
      ctrl = new AbortController();
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=vn&accept-language=vi${near}&q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal },
        );
        results = res.ok ? (await res.json()).slice(0, 5) : [];
      } catch (err) {
        if (err.name === 'AbortError') return;
        results = [];
      }
      if (!results.length) return hide();
      list.innerHTML = results
        .map((r, i) => `<li role="option" data-i="${i}"><strong>${escapeHtml(nameOf(r))}</strong><span>${escapeHtml(r.display_name)}</span></li>`)
        .join('');
      list.hidden = false;
    }, 350);
  });
  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('[data-i]');
    if (!li) return;
    e.preventDefault();
    const r = results[Number(li.dataset.i)];
    input.value = nameOf(r).slice(0, 200);
    onPick({ latitude: Number(r.lat), longitude: Number(r.lon) });
    clearFieldError(input);
    hide();
  });
  input.addEventListener('blur', () => setTimeout(hide, 150));
}

/* ---------- UC 22 Xóa hoạt động (TP-30) ---------- */

async function deleteItem({ trip, item }) {
  if (!item) return;
  if (!(await confirmDialog(msg('MSG 27'), { okText: 'Xóa', danger: true }))) return;
  try {
    await del(`/trips/${trip.id}/itinerary/${item.id}`);
  } catch (err) {
    // Đã bị xoá ở nơi khác (404) thì vẫn tải lại cho khớp.
    if (err.status !== 404) return showApiError(err);
  }
  reload();
}

/* ---------- Gắn sự kiện ---------- */

document.addEventListener('trip:cover', (e) => openCover(e.detail));
document.addEventListener('trip:share', (e) => openShare(e.detail));
document.addEventListener('trip:add-item', (e) => openItem(e.detail));
document.addEventListener('trip:edit-item', (e) => e.detail.item && openItem(e.detail));
document.addEventListener('trip:delete-item', (e) => deleteItem(e.detail));
