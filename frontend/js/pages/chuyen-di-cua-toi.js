// Screen 5 Chuyến đi của tôi (UC 13): danh sách, lọc theo trạng thái (CBR 4), tìm theo tên/điểm đến.
// UC 16 (xoá chuyến) nằm ở js/trip-delete.js; xoá xong quay về đây kèm MSG 19.
import { pageUrl } from '../config.js';
import { get } from '../api.js';
import { requireLogin, getUser } from '../auth.js';
import { MSG } from '../messages.js';
import { formatDayMonth, formatDuration } from '../format.js';
import { coverHtml } from '../cover.js';
import { showDeletedFlash } from '../trip-delete.js';
import { tripStatus, budgetStatus, itemCount, spentOf, normalizeText, escapeHtml } from '../trip-utils.js';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'upcoming', label: 'Sắp đi' },
  { key: 'ongoing', label: 'Đang đi' },
  { key: 'past', label: 'Đã đi' },
];

// Đang đi lên đầu, rồi sắp đi (gần nhất trước), cuối cùng đã đi (mới nhất trước).
const ORDER = { ongoing: 0, upcoming: 1, past: 2 };

const state = { trips: [], tab: 'all', q: '' };

const grid = document.getElementById('trip-grid');
const tabsEl = document.getElementById('tabs');
const empty = document.getElementById('empty');

document.querySelectorAll('[data-link]').forEach((a) => (a.href = pageUrl(a.dataset.link)));

/** Tên gọi: chữ cuối của họ tên ("Nguyễn Văn Dương" → "Dương"). */
const firstName = (fullName = '') => fullName.trim().split(/\s+/).at(-1) || 'bạn';

function renderGreeting() {
  const ongoing = state.trips.filter((t) => t.status.key === 'ongoing').length;
  const upcoming = state.trips.filter((t) => t.status.key === 'upcoming').length;
  document.getElementById('greeting').textContent =
    `Chào ${firstName(getUser()?.fullName)}, bạn có ${ongoing} chuyến đang đi và ${upcoming} chuyến sắp tới.`;
}

function renderTabs() {
  const count = (key) => (key === 'all' ? state.trips.length : state.trips.filter((t) => t.status.key === key).length);
  tabsEl.innerHTML = TABS.map(
    (t) => `<button type="button" role="tab" class="status-tab" data-tab="${t.key}" aria-selected="${t.key === state.tab}">
      ${t.label} · ${count(t.key)}</button>`,
  ).join('');
}

function cardHtml(trip) {
  const budget = budgetStatus(trip.spent, trip.budget);
  const dates =
    trip.startDate.slice(0, 10) === trip.endDate.slice(0, 10)
      ? formatDayMonth(trip.startDate)
      : `${formatDayMonth(trip.startDate)} – ${formatDayMonth(trip.endDate)}`;
  const days = formatDuration(trip.startDate, trip.endDate);
  return `
    <a class="trip-card" href="${pageUrl('trip', { id: trip.id })}">
      <div class="trip-card-cover">
        ${coverHtml(trip)}
        <span class="chip ${trip.status.chip} trip-card-status">${trip.status.label}</span>
        <span class="chip chip-outline trip-card-days">${days === '1N0Đ' ? '1 ngày' : days}</span>
      </div>
      <div class="trip-card-body">
        <h3>${escapeHtml(trip.title)}</h3>
        <p class="meta">${escapeHtml(trip.destination)} · ${dates}</p>
        <p class="trip-card-count">${trip.items} hoạt động</p>
        <div class="budget-line">
          <span>Ngân sách đã chi</span><strong>${budget.percent}%</strong>
        </div>
        <div class="progress progress-${budget.key}" role="progressbar" aria-label="Ngân sách đã chi"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(budget.percent, 100)}">
          <span style="width:${Math.min(budget.percent, 100)}%"></span>
        </div>
      </div>
    </a>`;
}

const newCardHtml = () => `
  <a class="trip-card trip-card-new" href="${pageUrl('createTrip')}">
    <span class="plus" aria-hidden="true">+</span>
    <span>Tạo chuyến mới</span>
  </a>`;

function renderGrid() {
  grid.removeAttribute('aria-busy');
  if (!state.trips.length) {
    grid.hidden = true;
    tabsEl.hidden = true;
    empty.hidden = false;
    empty.querySelector('p').textContent = MSG['MSG 15'];
    return;
  }
  const q = normalizeText(state.q.trim());
  const list = state.trips.filter(
    (t) =>
      (state.tab === 'all' || t.status.key === state.tab) &&
      (!q || normalizeText(t.title).includes(q) || normalizeText(t.destination).includes(q)),
  );
  grid.innerHTML =
    (list.length ? list.map(cardHtml).join('') : '<p class="meta grid-note">Không có chuyến nào khớp.</p>') + newCardHtml();
}

function render() {
  renderGreeting();
  renderTabs();
  renderGrid();
}

tabsEl.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-tab]');
  if (!tab) return;
  state.tab = tab.dataset.tab;
  renderTabs();
  renderGrid();
});

document.getElementById('search').addEventListener('input', (e) => {
  state.q = e.target.value;
  renderGrid();
});

async function load() {
  try {
    const trips = await get('/trips');
    state.trips = (trips || [])
      .map((t) => ({ ...t, status: tripStatus(t), items: itemCount(t), spent: spentOf(t) }))
      .sort((a, b) => {
        const byStatus = ORDER[a.status.key] - ORDER[b.status.key];
        if (byStatus) return byStatus;
        const diff = a.startDate.localeCompare(b.startDate);
        return a.status.key === 'past' ? -diff : diff;
      });
    render();
  } catch (err) {
    if (err.status === 401) return;
    grid.removeAttribute('aria-busy');
    grid.innerHTML = `<p class="meta grid-note">${escapeHtml(err.message)}</p>`;
  }
}

showDeletedFlash();

if (requireLogin()) load();
