// Xem lịch trình qua link chia sẻ (UC 18). Không cần đăng nhập; chuyến đã tắt công khai → báo không tồn tại.
import { pageUrl } from '../config.js';
import { get } from '../api.js';
import { coverHtml } from '../cover.js';
import { formatMoney, formatTime, formatDuration, toDate } from '../format.js';
import { escapeHtml } from '../trip-utils.js';

const WEEKDAY = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const pad = (n) => String(n).padStart(2, '0');
const dm = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
const $ = (id) => document.getElementById(id);
const id = Number(new URLSearchParams(location.search).get('id'));

document.querySelectorAll('[data-link]').forEach((a) => (a.href = pageUrl(a.dataset.link)));

function notFound() {
  document.querySelector('.trip-page').removeAttribute('aria-busy');
  $('hero').hidden = true;
  $('trip-head').hidden = true;
  $('not-found').hidden = false;
}

function itemHtml(it) {
  return `<li>
    <strong>${formatTime(it.startTime)} – ${formatTime(it.endTime)}</strong>
    <div>
      <h3>${escapeHtml(it.activity)}</h3>
      ${it.location ? `<p class="meta">${escapeHtml(it.location)}</p>` : ''}
      ${it.note ? `<p>${escapeHtml(it.note)}</p>` : ''}
    </div>
  </li>`;
}

async function load() {
  let t;
  try {
    t = await get(`/public/trips/${id}`, { auth: false, silent: true });
  } catch {
    return notFound();
  }
  document.querySelector('.trip-page').removeAttribute('aria-busy');
  document.title = `${t.title} · Travelplan`;
  $('hero').innerHTML = coverHtml(t, 'hero-cover');
  $('trip-title').textContent = t.title;
  const s = toDate(t.startDate);
  const e = toDate(t.endDate);
  $('trip-meta').textContent = [
    t.address || t.destination,
    `${dm(s)} – ${dm(e)}/${e.getFullYear()} · ${formatDuration(t.startDate, t.endDate)}`,
    `Ngân sách dự kiến ${formatMoney(t.budget)}`,
    `Lên kế hoạch bởi ${t.ownerName}`,
  ].join(' · ');
  $('trip-desc').textContent = t.description || '';

  $('days').innerHTML = Array.from({ length: t.totalDays }, (_, i) => {
    const d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i);
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const items = t.items.filter((it) => it.activityDate === iso);
    return `
      <section class="card shared-day">
        <h2>Ngày ${i + 1} · ${WEEKDAY[d.getDay()]} ${dm(d)}</h2>
        ${items.length ? `<ol class="shared-list">${items.map(itemHtml).join('')}</ol>` : '<p class="meta">Chưa có hoạt động.</p>'}
      </section>`;
  }).join('');
}

if (!id) notFound();
else load();
