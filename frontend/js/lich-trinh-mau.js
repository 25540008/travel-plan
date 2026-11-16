// Screen 2 Lịch trình mẫu + bộ lọc (UC 7 Xem và lọc lịch trình mẫu; UC 6 B4–B5 khi đến từ Trang chủ). TP-39.
// Dữ liệu: GET /public/itineraries?page&size&destination&tag&days&budgetMax&sort (TP-36), GET /public/destinations (điểm đến nổi bật).
// [Dùng lại] và tim (UC 11, UC 12) dùng js/reuse-save.js (TP-40).
// Bộ lọc nằm trên URL: ?destination=<slug>&start=&days=&tag=MOUNTAIN,FOOD&budgetMax=&sort=. Ô để trống thì bỏ tham số.
import { get } from './api.js';
import { pageUrl } from './config.js';
import { MSG } from './messages.js';
import { formatMoney } from './format.js';
import { coverHtml } from './cover.js';
import { escapeHtml, normalizeText } from './trip-utils.js';
import { bindReuseSave, loadSaved, markSaved, runPendingAction } from './reuse-save.js';

const SIZE = 12; // UC 7 B2: mỗi trang 12 thẻ
const BUDGET_MAX = 5_000_000; // thanh kéo 1–5 triệu; kéo hết = không lọc ngân sách
const TAG_LABEL = {
  BEACH: 'Biển', MOUNTAIN: 'Núi, đồi', OLD_TOWN: 'Phố cổ', FOOD: 'Ẩm thực',
  COFFEE: 'Cà phê', TREKKING: 'Trekking', FRIENDS: 'Nhóm bạn', BUDGET: 'Tiết kiệm',
};

const $ = (id) => document.getElementById(id);
const state = { destination: '', start: '', days: '', tags: [], budgetMax: BUDGET_MAX, sort: 'popular', page: 1 };
let destinations = []; // để hiện tên có dấu của slug trên tiêu đề
let requestNo = 0;

document.querySelectorAll('[data-link]').forEach((a) => (a.href = pageUrl(a.dataset.link)));

const slugify = (s) => normalizeText(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const daysLabel = (n) => (Number(n) <= 1 ? '1 ngày' : `${n}N${n - 1}Đ`);
const destName = (slug) => destinations.find((d) => d.slug === slug)?.name || slug.replace(/-/g, ' ');

/* ---------- URL ↔ bộ lọc (B2, B4) ---------- */

function readUrl() {
  const p = new URLSearchParams(location.search);
  state.destination = p.get('destination') || '';
  state.start = p.get('start') || '';
  state.days = ['1', '2', '3', '4'].includes(p.get('days')) ? p.get('days') : Number(p.get('days')) > 4 ? '4' : '';
  state.tags = (p.get('tag') || '').split(',').map((s) => s.trim().toUpperCase()).filter((t) => TAG_LABEL[t]);
  const b = Number(p.get('budgetMax'));
  state.budgetMax = b > 0 ? Math.min(b, BUDGET_MAX) : BUDGET_MAX;
  state.sort = ['popular', 'newest', 'cheapest'].includes(p.get('sort')) ? p.get('sort') : 'popular';
  state.page = 1;
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.destination) p.set('destination', state.destination);
  if (state.start) p.set('start', state.start);
  if (state.days) p.set('days', state.days);
  if (state.tags.length) p.set('tag', state.tags.join(','));
  if (state.budgetMax < BUDGET_MAX) p.set('budgetMax', String(state.budgetMax));
  if (state.sort !== 'popular') p.set('sort', state.sort);
  const qs = p.toString();
  history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}`);
}

function syncUi() {
  $('inputDestination').value = state.destination ? destName(state.destination) : '';
  $('inputDeparture').value = state.start;
  $('inputDays').value = state.days;
  $('sortDropdown').value = state.sort;
  $('budgetRange').value = state.budgetMax;
  $('budgetMaxLabel').textContent = `${state.budgetMax / 1_000_000} triệu`.replace('.', ',');
  document.querySelectorAll('#tagsList input').forEach((cb) => (cb.checked = state.tags.includes(cb.value)));
  document.querySelectorAll('#daysOptions .days-pill').forEach((b) => b.classList.toggle('active', b.dataset.days === state.days));
  document.querySelectorAll('#destGrid .dest-card').forEach((c) => c.classList.toggle('active', c.dataset.slug === state.destination));
}

/* ---------- Thẻ lịch trình (B2) ---------- */

function cardHtml(t) {
  const steps = (t.previewDays || [])
    .slice(0, 3)
    .map(
      (d) => `<li class="step-item"><span class="step-day">Ngày ${d.day}</span>
        <span class="step-desc">${escapeHtml(d.activities.join(', ') || 'Tự do khám phá')}</span></li>`,
    )
    .join('');
  const tags = (t.tags || []).map((c) => TAG_LABEL[c]).filter(Boolean).slice(0, 3);
  return `
    <article class="plan-card">
      <div class="plan-thumbnail">
        ${coverHtml(t)}
        <span class="badge-pill">${escapeHtml(t.durationLabel || daysLabel(t.days))}</span>
        ${t.cloneCount >= 50 ? '<span class="badge-reuse">Được dùng lại nhiều</span>' : ''}
        <button type="button" class="plan-save" data-action="save" data-id="${t.id}" aria-pressed="false" aria-label="Lưu lịch trình ${escapeHtml(t.title)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>
        </button>
      </div>
      <div class="plan-details">
        <h3 class="plan-title">${escapeHtml(t.title)}</h3>
        ${tags.length ? `<p class="plan-tags">${tags.map((x) => `<span class="chip">${escapeHtml(x)}</span>`).join('')}</p>` : ''}
        <ul class="steps-list">${steps || '<li class="step-item"><span class="step-desc">Chưa có hoạt động</span></li>'}</ul>
        <div class="author-meta">bởi ${escapeHtml(t.creatorName || 'Cộng đồng')} · ${t.cloneCount} lượt dùng lại</div>
        <div class="card-footer">
          <div>
            <div class="price-caption">Chi phí dự kiến</div>
            <div class="price-number">${formatMoney(t.budget)}</div>
          </div>
          <button type="button" class="btn btn-dark btn-sm" data-action="reuse" data-id="${t.id}"
            data-title="${escapeHtml(t.title)}" data-days="${t.days}">Dùng lại</button>
        </div>
      </div>
    </article>`;
}

/** B5a: không có kết quả → MSG 14 + [Tự lên kế hoạch] mở Screen 6 điền sẵn điểm đến và ngày. */
function emptyHtml() {
  const p = {};
  if (state.destination) p.destination = destName(state.destination);
  if (state.start) p.start = state.start;
  if (state.days) p.days = state.days;
  const href = pageUrl('createTrip', Object.keys(p).length ? p : undefined);
  return `<div class="empty-state card plan-empty">
      <p>${escapeHtml(MSG['MSG 14'])}</p>
      <a class="btn btn-primary" href="${escapeHtml(href)}">Tự lên kế hoạch</a>
    </div>`;
}

function summary(total) {
  const parts = [];
  if (state.days) parts.push(state.days === '4' ? '4 ngày+' : daysLabel(Number(state.days)));
  if (state.tags.length) parts.push(state.tags.map((t) => TAG_LABEL[t]).join(', '));
  if (state.budgetMax < BUDGET_MAX) parts.push(`dưới ${String(state.budgetMax / 1_000_000).replace('.', ',')} triệu`);
  return `${total} lịch trình${parts.length ? ` · đang lọc ${parts.join(', ')}` : ''}`;
}

/* ---------- Tải danh sách (B2, B4, B6) ---------- */

async function load({ append = false } = {}) {
  const grid = $('cardsGrid');
  const more = $('btnLoadMore');
  const my = ++requestNo;
  const p = new URLSearchParams({ page: state.page, size: SIZE, sort: state.sort });
  if (state.destination) p.set('destination', state.destination);
  if (state.days) p.set('days', state.days);
  if (state.tags.length) p.set('tag', state.tags.join(','));
  if (state.budgetMax < BUDGET_MAX) p.set('budgetMax', state.budgetMax);

  $('headingTitle').textContent = state.destination ? `Lịch trình ${destName(state.destination)}` : 'Lịch trình mẫu';
  grid.setAttribute('aria-busy', 'true');
  more.disabled = true;
  try {
    const res = await get(`/public/itineraries?${p}`, { auth: false, silent: true });
    if (my !== requestNo) return; // đã có yêu cầu mới hơn
    const items = res.items || [];
    if (!append) grid.innerHTML = '';
    if (!items.length && !append) grid.innerHTML = emptyHtml();
    else grid.insertAdjacentHTML('beforeend', items.map(cardHtml).join(''));
    $('subSummary').textContent = summary(res.total ?? items.length);
    more.hidden = !res.hasMore; // B6: hết dữ liệu thì ẩn nút
    markSaved(grid);
  } catch (err) {
    if (my !== requestNo) return;
    if (!append) grid.innerHTML = '';
    grid.insertAdjacentHTML(
      'beforeend',
      `<div class="empty-state card plan-empty"><p>${escapeHtml(err.message)}</p>
        <button type="button" class="btn btn-secondary" data-retry>Thử lại</button></div>`,
    );
    if (append) state.page -= 1;
    $('subSummary').textContent = '';
    more.hidden = true;
  } finally {
    if (my === requestNo) {
      grid.removeAttribute('aria-busy');
      more.disabled = false;
    }
  }
}

/** Đổi bộ lọc → cập nhật URL, tải lại trang 1 (B4). */
function applyFilters() {
  state.page = 1;
  writeUrl();
  syncUi();
  load();
}

/* ---------- Điểm đến nổi bật ---------- */

async function loadDestinations() {
  try {
    const res = await get('/public/destinations?size=100', { auth: false, silent: true });
    destinations = res.items || [];
    const top = destinations.slice(0, 6);
    if (!top.length) throw new Error('empty');
    $('destGrid').innerHTML = top
      .map(
        (d) => `<a href="${escapeHtml(pageUrl('templates', { destination: d.slug }))}" class="dest-card" data-slug="${escapeHtml(d.slug)}">
          ${coverHtml({ coverImage: d.imageUrl, destination: d.name }, 'cover')}
          <div class="dest-info"><div class="dest-name">${escapeHtml(d.name)}</div>
          <div class="dest-count">${d.itineraryCount} lịch trình</div></div></a>`,
      )
      .join('');
  } catch {
    $('destSection').hidden = true;
  }
}

/* ---------- Sự kiện ---------- */

$('topSearchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('inputDestination').value.trim();
  const hit = destinations.find((d) => normalizeText(d.name) === normalizeText(text));
  state.destination = text ? hit?.slug || slugify(text) : '';
  state.start = $('inputDeparture').value;
  state.days = $('inputDays').value;
  applyFilters();
});

$('destGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.dest-card');
  if (!card) return;
  e.preventDefault();
  state.destination = state.destination === card.dataset.slug ? '' : card.dataset.slug;
  applyFilters();
});

$('tagsList').addEventListener('change', () => {
  state.tags = [...document.querySelectorAll('#tagsList input:checked')].map((el) => el.value);
  applyFilters();
});

$('daysOptions').addEventListener('click', (e) => {
  const btn = e.target.closest('.days-pill');
  if (!btn) return;
  state.days = state.days === btn.dataset.days ? '' : btn.dataset.days;
  applyFilters();
});

$('budgetRange').addEventListener('input', (e) => {
  $('budgetMaxLabel').textContent = `${String(e.target.value / 1_000_000).replace('.', ',')} triệu`;
});
$('budgetRange').addEventListener('change', (e) => {
  state.budgetMax = Number(e.target.value);
  applyFilters();
});

$('sortDropdown').addEventListener('change', (e) => {
  state.sort = e.target.value;
  applyFilters();
});

// [Xóa lọc] bỏ toàn bộ bộ lọc
$('btnResetFilter').addEventListener('click', () => {
  Object.assign(state, { destination: '', start: '', days: '', tags: [], budgetMax: BUDGET_MAX, sort: 'popular' });
  applyFilters();
});

$('btnLoadMore').addEventListener('click', () => {
  state.page += 1;
  load({ append: true });
});

$('cardsGrid').addEventListener('click', (e) => {
  if (e.target.closest('[data-retry]')) load();
});
bindReuseSave($('cardsGrid'));

/* ---------- Khởi động ---------- */

readUrl();
syncUi();
await Promise.all([loadDestinations(), loadSaved()]);
syncUi();
await load();
runPendingAction(); // đăng nhập xong quay lại với ?action=reuse|save&id= (CBR 3)
