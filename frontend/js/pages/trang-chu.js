// Screen 1 Trang chủ (UC 6 Tìm lịch trình từ Trang chủ).
// B2: gọi song song 3 API công khai, mỗi khối có skeleton riêng, khối nào lỗi thì ẩn khối đó.
// B3, B4: khung tìm kiếm 3 tab, chuyển trang với bộ lọc trên URL (ô trống thì bỏ tham số).
// Nút [Dùng lại] và tim (UC 11, 12) theo CBR 3: khách → đăng nhập; đã đăng nhập → Screen 2 xử lý thao tác.
import { pageUrl } from '../config.js';
import { get } from '../api.js';
import { isLoggedIn, redirectToLogin, takePendingAction } from '../auth.js';
import { MSG } from '../messages.js';
import { formatMoney, formatMoneyShort, formatDayMonth } from '../format.js';
import { coverHtml } from '../cover.js';
import { todayVN, isoDate, daysBetween, normalizeText, escapeHtml } from '../trip-utils.js';

const $ = (id) => document.getElementById(id);

document.querySelectorAll('[data-link]').forEach((a) => (a.href = pageUrl(a.dataset.link)));

/* ---------- Chuẩn hoá dữ liệu API (chịu được vài kiểu đặt tên của backend) ---------- */

/** Mảng kết quả từ [...] hoặc { items | data | content | results: [...] }. */
const listOf = (res) => (Array.isArray(res) ? res : res?.items || res?.data || res?.content || res?.results || []);

/** "Đà Lạt" → "da-lat" */
const slugify = (s) => normalizeText(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function toDestination(d) {
  const src = d.destination && typeof d.destination === 'object' ? { ...d.destination, ...d } : d;
  const name = src.name || src.destinationName || (typeof src.destination === 'string' ? src.destination : '') || '';
  return {
    name,
    slug: src.slug || slugify(name),
    province: src.province || src.region || '',
    imageUrl: src.imageUrl || src.image_url || src.coverImage || null,
    itineraryCount: src.itineraryCount ?? src.itinerary_count ?? src.tripCount ?? src.trip_count ?? src._count?.trips ?? null,
    fromPrice: src.fromPrice ?? src.from_price ?? null,
    tagline: src.tagline || src.shortDescription || '',
  };
}

/** Tên người tạo: 2 chữ cuối của họ tên (UC 7 · B2). */
const shortName = (full = '') => full.trim().split(/\s+/).slice(-2).join(' ');
const initialsOf = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase() || 'TP';

function toItinerary(t) {
  const dest = t.destinationRef || (typeof t.destination === 'object' ? t.destination : null);
  const destName = dest?.name || (typeof t.destination === 'string' ? t.destination : '') || '';
  const days = t.days ?? t.dayCount ?? (t.startDate && t.endDate ? daysBetween(t.startDate, t.endDate) + 1 : null);
  const author = t.user?.fullName || t.author?.fullName || t.authorName || t.ownerName || '';
  return {
    id: t.id,
    title: t.title || '',
    destination: destName,
    place: [destName, dest?.province || t.province].filter(Boolean).join(', '),
    coverImage: t.coverImage || t.cover_image || null,
    days,
    items: t.itemCount ?? t._count?.items ?? t.items?.length ?? null,
    tags: (t.tags || []).map((x) => (typeof x === 'string' ? x : x.name || x.label)).filter(Boolean),
    spots: (t.highlights || t.spots || []).map((x) => (typeof x === 'string' ? x : x.name)).filter(Boolean),
    author: shortName(author),
    cloneCount: t.cloneCount ?? t.clone_count ?? t._count?.clones ?? 0,
    cost: t.estimatedCost ?? t.estimated_cost ?? t.budget ?? null,
  };
}

/** Nhãn số ngày: 1 → "1 ngày", 3 → "3N2Đ" */
const daysLabel = (n) => (!n ? '' : n === 1 ? '1 ngày' : `${n}N${n - 1}Đ`);

/** Ẩn khối khi API lỗi (B2). */
const hideSection = (id) => ($(id).hidden = true);

/* ---------- Ngày mặc định ---------- */

/** Ngày gần nhất (kể cả hôm nay) rơi vào thứ weekday (0 = CN … 6 = T7). */
function nextWeekday(weekday, from = todayVN()) {
  const d = new Date(from);
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7));
  return d;
}

/* ---------- Khung tìm kiếm (B3, B4) ---------- */

const form = $('search-form');
const destInput = $('q-dest');
const startInput = $('q-start');
const suggestEl = $('dest-suggest');
let mode = 'templates';
let destinations = []; // dùng cho ô gợi ý
let pickedSlug = null; // slug của gợi ý đã chọn

const today = isoDate(todayVN());
startInput.min = today;
startInput.value = isoDate(nextWeekday(5)); // Thứ Sáu gần nhất

const SUBMIT_LABEL = { templates: 'Tìm lịch trình', destinations: 'Tìm điểm đến', create: 'Lên kế hoạch' };

form.querySelectorAll('[role="tab"]').forEach((tab) =>
  tab.addEventListener('click', () => {
    mode = tab.dataset.mode;
    form.querySelectorAll('[role="tab"]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    form.querySelectorAll('[data-hide-for]').forEach((f) => (f.hidden = f.dataset.hideFor.split(' ').includes(mode)));
    $('search-label').textContent = SUBMIT_LABEL[mode];
  }),
);

function renderSuggest() {
  const q = normalizeText(destInput.value.trim());
  const matches = q ? destinations.filter((d) => normalizeText(`${d.name} ${d.province}`).includes(q)).slice(0, 6) : [];
  suggestEl.innerHTML = matches
    .map(
      (d, i) => `<li role="option" id="sg-${i}" data-slug="${escapeHtml(d.slug)}" data-name="${escapeHtml(d.name)}">
        <strong>${escapeHtml(d.name)}</strong>${d.province ? `<span>${escapeHtml(d.province)}</span>` : ''}</li>`,
    )
    .join('');
  suggestEl.hidden = !matches.length;
  destInput.setAttribute('aria-expanded', String(!suggestEl.hidden));
}

function pick(li) {
  destInput.value = li.dataset.name;
  pickedSlug = li.dataset.slug;
  suggestEl.hidden = true;
  destInput.setAttribute('aria-expanded', 'false');
}

destInput.addEventListener('input', () => {
  pickedSlug = null;
  renderSuggest();
});
destInput.addEventListener('keydown', (e) => {
  const opts = [...suggestEl.querySelectorAll('li')];
  if (suggestEl.hidden || !opts.length) return;
  const cur = opts.findIndex((o) => o.getAttribute('aria-selected') === 'true');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const next = (cur + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
    opts.forEach((o, i) => o.setAttribute('aria-selected', String(i === next)));
    destInput.setAttribute('aria-activedescendant', opts[next].id);
  } else if (e.key === 'Enter' && cur >= 0) {
    e.preventDefault();
    pick(opts[cur]);
  } else if (e.key === 'Escape') {
    suggestEl.hidden = true;
  }
});
suggestEl.addEventListener('mousedown', (e) => {
  const li = e.target.closest('li');
  if (li) {
    e.preventDefault();
    pick(li);
  }
});
destInput.addEventListener('blur', () => (suggestEl.hidden = true));

/** Slug của điểm đến đang nhập: gợi ý đã chọn, hoặc khớp đúng tên, hoặc tự sinh từ chữ đã gõ. */
function destinationSlug(text) {
  if (pickedSlug) return pickedSlug;
  const hit = destinations.find((d) => normalizeText(d.name) === normalizeText(text));
  return hit ? hit.slug : slugify(text);
}

/** Đường dẫn nội bộ "/…/tao-chuyen.html?…" để làm next khi phải đăng nhập (CBR 3). */
const internalPath = (relUrl) => {
  const u = new URL(relUrl, location.href);
  return u.pathname + u.search;
};

/** Mở Screen 6, khách thì qua Screen 10 trước rồi quay lại (CBR 3). */
function goCreateTrip(params = {}) {
  const target = pageUrl('createTrip', Object.keys(params).length ? params : undefined);
  location.href = isLoggedIn() ? target : pageUrl('login', { next: internalPath(target), action: 'create' });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const dest = destInput.value.trim();
  const start = startInput.value && startInput.value >= today ? startInput.value : '';
  const days = $('q-days').value;
  const budgetMax = $('q-budget').value;

  if (mode === 'destinations') {
    location.href = pageUrl('destinations', dest ? { q: dest } : undefined);
    return;
  }
  if (mode === 'create') {
    const p = {};
    if (dest) p.destination = dest;
    if (start) p.start = start;
    if (days) p.days = days;
    goCreateTrip(p);
    return;
  }
  // B4: /lich-trinh-mau?destination=<slug>&start=<yyyy-mm-dd>&days=<n>&budgetMax=<số>
  const p = {};
  if (dest) p.destination = destinationSlug(dest);
  if (start) p.start = start;
  if (days) p.days = days;
  if (budgetMax) p.budgetMax = budgetMax;
  location.href = pageUrl('templates', Object.keys(p).length ? p : undefined);
});

/* ---------- Điểm đến được yêu thích ---------- */

function renderDestinations(list) {
  const top = list.slice(0, 5);
  if (!top.length) return hideSection('dest-section');
  $('dest-grid').innerHTML = top
    .map((d, i) => {
      const sub = [d.province, d.itineraryCount != null ? `${d.itineraryCount} lịch trình` : '', i === 0 ? d.tagline : '']
        .filter(Boolean)
        .join(' · ');
      return `
      <a class="dest-card${i === 0 ? ' dest-card-main' : ''}" href="${pageUrl('destinationDetail', { slug: d.slug })}">
        ${coverHtml({ coverImage: d.imageUrl, destination: d.name }, 'cover')}
        ${d.fromPrice ? `<span class="chip ${i === 0 ? 'chip-sun' : 'chip-outline'} dest-price">Từ ${formatMoneyShort(d.fromPrice)}</span>` : ''}
        <div class="dest-card-text">
          <h3>${escapeHtml(d.name)}</h3>
          ${sub ? `<p>${escapeHtml(sub)}</p>` : ''}
        </div>
      </a>`;
    })
    .join('');
  $('dest-grid').removeAttribute('aria-busy');
}

/* ---------- Cuối tuần này đi đâu ta? ---------- */

function renderWeekendLabel() {
  const sat = nextWeekday(6);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  const from = sat.getMonth() === sun.getMonth() ? formatDayMonth(sat).slice(0, 2) : formatDayMonth(sat);
  $('weekend-label').textContent = `Cuối tuần ${from} – ${formatDayMonth(sun)}`;
}

function renderTrending(list) {
  const top = list.slice(0, 6);
  if (!top.length) {
    hideSection('trend-section');
    return;
  }
  $('trend-list').innerHTML = top
    .map(
      (d, i) => `
      <li><a class="trend-item" href="${pageUrl('destinationDetail', { slug: d.slug })}">
        <span class="trend-rank">${i + 1}</span>
        ${coverHtml({ coverImage: d.imageUrl, destination: d.name }, 'trend-thumb')}
        <span class="trend-text"><strong>${escapeHtml(d.name)}</strong>
          ${d.itineraryCount != null ? `<span>${d.itineraryCount} chuyến đã lên kèo</span>` : ''}</span>
      </a></li>`,
    )
    .join('');
  $('trend-list').removeAttribute('aria-busy');

  // Nhãn "Đang hot cuối tuần này" lấy điểm đầu bảng.
  const first = top[0];
  const chip = $('hot-chip');
  $('hot-name').textContent = first.name;
  chip.href = pageUrl('destinationDetail', { slug: first.slug });
  chip.hidden = false;
}

/* ---------- Lịch trình hot từ cộng đồng ---------- */

function itineraryCardHtml(t) {
  const badge = [daysLabel(t.days), t.items != null ? `${t.items} hoạt động` : ''].filter(Boolean).join(' · ');
  const chips = (t.tags.length ? t.tags : t.spots).slice(0, 3);
  return `
    <article class="trip-card itin-card">
      <div class="trip-card-cover">
        ${coverHtml(t)}
        ${badge ? `<span class="chip chip-dark trip-card-status">${escapeHtml(badge)}</span>` : ''}
        <button type="button" class="itin-save" data-action="save" data-id="${t.id}" aria-label="Lưu lịch trình ${escapeHtml(t.title)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>
        </button>
      </div>
      <div class="trip-card-body">
        ${t.place ? `<p class="itin-place">◎ ${escapeHtml(t.place)}</p>` : ''}
        <h3>${escapeHtml(t.title)}</h3>
        ${chips.length ? `<p class="itin-tags">${chips.map((c) => `<span class="chip">${escapeHtml(c)}</span>`).join('')}</p>` : ''}
        <p class="itin-author">
          ${t.author ? `<span class="avatar avatar-sm" aria-hidden="true">${escapeHtml(initialsOf(t.author))}</span>bởi ${escapeHtml(t.author)} · ` : ''}
          ${t.cloneCount} người dùng lại
        </p>
        <div class="itin-foot">
          <div>${t.cost != null ? `<span class="meta">Chi phí dự kiến</span><strong>${formatMoney(t.cost)}</strong>` : ''}</div>
          <button type="button" class="btn btn-dark btn-sm" data-action="reuse" data-id="${t.id}">Dùng lại</button>
        </div>
      </div>
    </article>`;
}

function renderItineraries(list) {
  const grid = $('itin-grid');
  grid.removeAttribute('aria-busy');
  if (!list.length) {
    // Chưa có lịch trình công khai nào: MSG 14 kèm nút Tự lên kế hoạch (như B5a).
    grid.hidden = true;
    $('itin-empty').querySelector('p').textContent = MSG['MSG 14'];
    $('itin-empty').hidden = false;
    return;
  }
  grid.innerHTML = list.slice(0, 3).map(itineraryCardHtml).join('');
}

$('itin-empty-cta').addEventListener('click', (e) => {
  e.preventDefault();
  goCreateTrip();
});

/** UC 11 Dùng lại, UC 12 Lưu: khách → Screen 10 (CBR 3); thành viên → Screen 2 làm tiếp thao tác (TP-40). */
function runItineraryAction(action, id) {
  if (!isLoggedIn()) return redirectToLogin({ action, id });
  location.href = pageUrl('templates', { action, id });
}

$('itin-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (btn) runItineraryAction(btn.dataset.action, btn.dataset.id);
});

/* ---------- Đi theo kiểu của bạn ---------- */

const STYLES = [
  { icon: '≋', name: 'Biển', sub: 'Phú Quốc, Vũng Tàu', params: { tag: 'bien' }, tone: 'lake' },
  { icon: '⛰', name: 'Núi', sub: 'Sa Pa, Đà Lạt', params: { tag: 'nui' }, tone: 'pine' },
  { icon: '⌂', name: 'Phố cổ', sub: 'Hội An, Hà Nội', params: { tag: 'pho-co' }, tone: 'sun' },
  { icon: '♨', name: 'Ẩm thực', sub: 'Ăn sập phố', params: { tag: 'am-thuc' }, tone: 'coral' },
  { icon: '▤', name: 'Cuối tuần', sub: '2N1Đ gần thành phố', params: { days: 2 }, tone: 'violet' },
  { icon: '₫', name: 'Tiết kiệm', sub: 'Dưới 2 triệu', params: { budgetMax: 2000000 }, tone: 'lime' },
];

$('style-grid').innerHTML = STYLES.map(
  (s) => `
  <a class="style-tile style-${s.tone}" href="${pageUrl('templates', s.params)}">
    <span class="style-icon" aria-hidden="true">${s.icon}</span>
    <strong>${s.name}</strong><span>${s.sub}</span>
  </a>`,
).join('');

/* ---------- Khối kêu gọi ---------- */

$('cta-create').href = pageUrl('createTrip');
$('cta-create').addEventListener('click', (e) => {
  e.preventDefault();
  goCreateTrip();
});

/* ---------- Tải dữ liệu (B2) ---------- */

renderWeekendLabel();

// Đăng nhập xong quay lại đây với thao tác đang chờ (CBR 3).
const pending = takePendingAction();
if (pending && (pending.action === 'reuse' || pending.action === 'save') && pending.id) {
  runItineraryAction(pending.action, pending.id);
}

const opts = { auth: false, silent: true };
const [destRes, trendRes, itinRes] = await Promise.allSettled([
  get('/public/destinations?size=6', opts),
  get('/public/trending-destinations', opts),
  get('/public/itineraries?size=6', opts),
]);

if (destRes.status === 'fulfilled') {
  destinations = listOf(destRes.value).map(toDestination).filter((d) => d.name);
  renderDestinations(destinations);
} else hideSection('dest-section');

if (trendRes.status === 'fulfilled') renderTrending(listOf(trendRes.value).map(toDestination).filter((d) => d.name));
else hideSection('trend-section');

if (itinRes.status === 'fulfilled') renderItineraries(listOf(itinRes.value).map(toItinerary));
else hideSection('itin-section');

// Ô gợi ý cần đủ bảng destinations, không chỉ 6 mục của khối trên. Lỗi thì giữ danh sách đang có.
get('/public/destinations?size=100', opts)
  .then((res) => {
    const all = listOf(res).map(toDestination).filter((d) => d.name);
    if (all.length) destinations = all;
  })
  .catch(() => {});
