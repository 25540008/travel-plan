// Screen 4 Chi tiết điểm đến (UC 9 Xem chi tiết điểm đến, UC 10 Xem thời tiết điểm đến). TP-46.
// Đường dẫn: diem-den-chi-tiet.html?slug=da-lat
//
// API dùng:
//   GET /api/public/destinations/{slug}        chi tiết điểm đến (TP-43, dữ liệu TP-42). 404 → trang Không tìm thấy (UC 9 B2a).
//   GET /api/public/weather?lat=&lng=&days=7   thời tiết (TP-27). Lỗi → ẩn khối thời tiết, không báo lỗi (UC 10 B4a).
//   GET /api/public/itineraries?destination=   3 lịch trình mẫu + tổng số (TP-36).
//   GET /api/public/destinations?size=100      tính "Điểm đến gần đó" khi API chi tiết chưa trả nearby.
//   GET/POST /api/me/saved (itemType DESTINATION) nút Lưu (UC 12, TP-37).
//
// Dạng dữ liệu mong đợi từ GET /api/public/destinations/{slug} (theo model của TP-42). Trường thiếu thì khối tương ứng tự ẩn;
// đọc được cả camelCase lẫn snake_case, lat/lng lẫn latitude/longitude:
// {
//   id, slug, name, province, region,                  // region: "Miền Bắc" | "Miền Trung" | "Tây Nguyên" | "Miền Nam"
//   summary, description, tags: [string], coverUrl,
//   lat, lng,
//   bestMonths: [12, 1, 2, 3, 4],                      // tháng đẹp nhất
//   specialMonths?: { months: [11], label: "Mùa hoa dã quỳ" },
//   avgTempByMonth: [16, 17, ...] hoặc { "1": 16, ... }, // 12 tháng, °C
//   suggestedDays?: 3,
//   spots: [{ id, name, type: "SIGHTSEEING"|"FOOD"|"CULTURE", label?, note, lat, lng, imageUrl?, itineraryCount? }],
//   costs: [{ item, min, max }],                       // chi phí tham khảo cho 1 người
//   costNote?, nearby?: [{ slug, name, distanceKm, travelTime? }]
// }
import { get, post } from '../api.js';
import { pageUrl } from '../config.js';
import { MSG } from '../messages.js';
import { isLoggedIn, redirectToLogin, takePendingAction } from '../auth.js';
import { toast } from '../ui.js';
import { escapeHtml, normalizeText } from '../trip-utils.js';
import { formatMoney } from '../format.js';
import { coverHtml } from '../cover.js';
import { weatherIcon, wmoLabel } from '../weather.js';
import { createMap } from '../maps.js';
import { bindReuseSave, loadSaved, markSaved, runPendingAction } from '../reuse-save.js';

const $ = (id) => document.getElementById(id);
const slug = (new URLSearchParams(location.search).get('slug') || '').trim().toLowerCase();

const HCM = { lat: 10.7769, lng: 106.7009 };
const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const SPOT_TYPES = {
  SIGHTSEEING: 'Ngắm cảnh',
  FOOD: 'Ăn uống',
  CULTURE: 'Văn hóa',
};

/* ---------- Chuẩn hoá dữ liệu ---------- */

const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const arr = (v) => (Array.isArray(v) ? v : []);
const monthsOf = (v) => [...new Set(arr(v).map(Number).filter((m) => m >= 1 && m <= 12))];

function tempsOf(v) {
  if (Array.isArray(v)) return v.slice(0, 12).map(num);
  if (v && typeof v === 'object') return Array.from({ length: 12 }, (_, i) => num(v[i + 1] ?? v[String(i + 1)]));
  return [];
}

function spotType(t = '') {
  const key = String(t).toUpperCase();
  if (SPOT_TYPES[key]) return key;
  const n = normalizeText(t);
  if (/an uong|am thuc|food/.test(n)) return 'FOOD';
  if (/van hoa|lich su|culture|di tich|chua/.test(n)) return 'CULTURE';
  return 'SIGHTSEEING';
}

function normalizeSpot(s, i) {
  const type = spotType(s.type);
  return {
    id: s.id ?? i + 1,
    name: s.name || '',
    type,
    label: s.label || (SPOT_TYPES[String(s.type).toUpperCase()] ? SPOT_TYPES[type] : s.type) || SPOT_TYPES[type],
    note: s.note || s.description || '',
    lat: num(s.lat ?? s.latitude),
    lng: num(s.lng ?? s.longitude),
    imageUrl: s.imageUrl || s.image_url || null,
    itineraryCount: num(s.itineraryCount ?? s.itinerary_count),
  };
}

export function normalizeDestination(d) {
  const special = d.specialMonths ?? d.special_months;
  return {
    id: d.id,
    slug: d.slug || slug,
    name: d.name || '',
    province: d.province || (d.address ? d.address.split(',')[0].trim() : ''),
    region: d.region || '',
    tagline: d.summary || d.tagline || '',
    description: d.description || d.summary || '',
    tags: arr(d.tags).filter(Boolean),
    imageUrl: d.coverUrl || d.cover_url || d.imageUrl || d.image_url || null,
    lat: num(d.lat ?? d.latitude),
    lng: num(d.lng ?? d.longitude),
    bestMonths: monthsOf(d.bestMonths ?? d.best_months),
    specialMonths: monthsOf(Array.isArray(special) ? special : special?.months),
    specialLabel: (!Array.isArray(special) && special?.label) || d.specialLabel || 'Mùa đặc biệt',
    avgTemp: tempsOf(d.avgTempByMonth ?? d.avg_temp_by_month),
    suggestedDays: num(d.suggestedDays ?? d.suggested_days),
    spots: arr(d.spots).map(normalizeSpot).filter((s) => s.name),
    costs: arr(d.costs)
      .map((c) => ({ item: c.item || c.name, min: num(c.min ?? c.amount), max: num(c.max ?? c.min ?? c.amount) }))
      .filter((c) => c.item && c.min != null),
    costNote: d.costNote || d.cost_note || '',
    nearby: arr(d.nearby),
  };
}

/* ---------- Tiện ích ---------- */

const durationLabel = (days) => (days <= 1 ? '1 ngày' : `${days}N${days - 1}Đ`);

function distanceKm(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Ước lượng đường bộ (≈ 1,35 lần đường chim bay, 45 km/h) → "3 giờ xe". */
function roadTime(km) {
  const h = (km * 1.35) / 45;
  if (h < 1) return `${Math.max(15, Math.round((h * 60) / 15) * 15)} phút xe`;
  return `${Math.round(h)} giờ xe`;
}

/** Ước lượng bay thẳng (30 phút cất hạ cánh + 800 km/h) → "50 phút bay", "1 giờ 20 bay". */
function flightTime(km) {
  const m = Math.round((30 + (km / 800) * 60) / 5) * 5;
  return m < 60 ? `${m} phút bay` : `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60}` : ''} bay`;
}

/** [12,1,2,3,4] → "Tháng 12 – 4"; [3,4,9] → "Tháng 3 – 4, 9". */
export function monthRangeLabel(months) {
  if (!months.length) return '';
  if (months.length === 12) return 'Quanh năm';
  const set = new Set(months);
  const starts = [...set].filter((m) => !set.has(m === 1 ? 12 : m - 1)).sort((a, b) => a - b);
  const runs = starts.map((s) => {
    let e = s;
    while (set.has(e === 12 ? 1 : e + 1)) e = e === 12 ? 1 : e + 1;
    return s === e ? `${s}` : `${s} – ${e}`;
  });
  return `Tháng ${runs.join(', ')}`;
}

const currentMonth = () => new Date(Date.now() + 7 * 3_600_000).getUTCMonth() + 1; // giờ Việt Nam

const ICON = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  temp: '<path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0z"/>',
  bus: '<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 11h16M8 20v-3M16 20v-3"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;

/* ---------- Trạng thái trang ---------- */

function showNotFound(text) {
  $('dd-loading').hidden = true;
  $('dd-content').hidden = true;
  const box = $('dd-notfound');
  if (text) {
    box.querySelector('h1').textContent = text.title;
    box.querySelector('.meta').textContent = text.body;
    box.querySelector('.dd-notfound-code').textContent = text.code;
  }
  box.querySelectorAll('[data-href]').forEach((a) => (a.href = pageUrl(a.dataset.href)));
  box.hidden = false;
  $('dest-page').removeAttribute('aria-busy');
  document.title = 'Không tìm thấy điểm đến · Travelplan';
}

function hideSection(id) {
  $(id).hidden = true;
  const tab = document.querySelector(`#dd-tabs a[href="#${id}"]`);
  if (tab) tab.hidden = true;
}

/* ---------- Hero, thông tin nhanh, mô tả ---------- */

function renderHero(d) {
  document.title = `${d.name} · Điểm đến · Travelplan`;
  $('dd-hero-art').innerHTML = coverHtml({ coverImage: d.imageUrl, destination: d.name }, 'dd-hero-img');
  const crumbs = [`<a href="${pageUrl('destinations')}">Điểm đến</a>`];
  if (d.region) crumbs.push(`<a href="${pageUrl('destinations', { region: d.region })}">${escapeHtml(d.region)}</a>`);
  if (d.province && normalizeText(d.province) !== normalizeText(d.name)) crumbs.push(`<span>${escapeHtml(d.province)}</span>`);
  $('dd-breadcrumb').innerHTML = crumbs.join('<span aria-hidden="true"> / </span>');
  $('dd-name').textContent = d.name;
  $('dd-tagline').textContent = d.tagline;
  $('dd-tagline').hidden = !d.tagline;
  document.querySelectorAll('.js-name').forEach((el) => (el.textContent = d.name));
  $('dd-create').textContent = `＋ Tạo chuyến tới ${d.name}`;
  // UC 14: Screen 6 điền sẵn điểm đến; Screen 6 tự chặn khách (CBR 3) và quay lại sau khi đăng nhập.
  $('dd-create').href = pageUrl('createTrip', { destination: d.slug });

  $('dd-desc').textContent = d.description;
  $('dd-desc').hidden = !d.description;
  $('dd-tags').innerHTML = d.tags.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('');
}

function renderFacts(d, itin) {
  const facts = [];
  const now = currentMonth();

  if (d.bestMonths.length) {
    const inSeason = d.bestMonths.includes(now);
    facts.push({ icon: 'sun', label: 'Đẹp nhất', value: monthRangeLabel(d.bestMonths), sub: inSeason ? 'Đang vào mùa' : 'Thời tiết đẹp, ít mưa', hot: inSeason });
  }

  const temps = d.avgTemp.filter((t) => t != null);
  if (temps.length) {
    const lo = Math.round(Math.min(...temps));
    const hi = Math.round(Math.max(...temps));
    const sub = lo < 20 ? 'Se lạnh, mang áo khoác' : hi >= 30 ? 'Nắng nóng, mang kem chống nắng' : 'Dễ chịu quanh năm';
    facts.push({ icon: 'temp', label: 'Nhiệt độ', value: lo === hi ? `${lo}°C` : `${lo} – ${hi}°C`, sub });
  }

  if (d.lat != null && d.lng != null) {
    const km = distanceKm(HCM, d);
    if (km > 5) {
      const road = Math.round((km * 1.35) / 10) * 10;
      const ways = [];
      if (road <= 450) ways.push(roadTime(km).replace('xe', 'xe khách'));
      if (km >= 150) ways.push(flightTime(km));
      facts.push({ icon: 'bus', label: 'Từ TP.HCM', value: `~${road.toLocaleString('vi-VN')} km`, sub: ways.join(' · ') });
    }
  }

  const days = itin.popularDays || d.suggestedDays;
  if (days) {
    facts.push({ icon: 'cal', label: 'Đi mấy ngày', value: durationLabel(days), sub: itin.popularDays ? 'Phổ biến nhất trong lịch trình' : 'Gợi ý cho lần đầu' });
  }

  if (itin.total != null) {
    facts.push({ icon: 'list', label: 'Lịch trình', value: `${itin.total.toLocaleString('vi-VN')} chuyến`, sub: 'Cộng đồng chia sẻ công khai' });
  }

  $('dd-facts').innerHTML = facts
    .map(
      (f) => `
      <li class="dd-fact${f.hot ? ' is-hot' : ''}">
        <span class="dd-fact-icon">${icon(f.icon)}</span>
        <div>
          <span class="dd-fact-label">${f.label}</span>
          <strong>${escapeHtml(f.value)}</strong>
          ${f.sub ? `<span class="dd-fact-sub">${escapeHtml(f.sub)}</span>` : ''}
        </div>
      </li>`,
    )
    .join('');
  $('dd-facts').hidden = !facts.length;
}

/* ---------- Địa điểm nên ghé (UC 9 B4, B5) ---------- */

const spotScene = (s, d) => (s.type === 'SIGHTSEEING' ? d.name : 'hoi an');

function renderSpots(d) {
  if (!d.spots.length) return hideSection('dia-diem');
  const spots = [...d.spots].sort((a, b) => (b.itineraryCount ?? -1) - (a.itineraryCount ?? -1));
  $('dd-spots').innerHTML = spots
    .map(
      (s) => `
      <article class="dd-spot" data-type="${s.type}">
        <div class="dd-spot-cover">
          ${coverHtml({ coverImage: s.imageUrl, destination: spotScene(s, d) }, 'cover')}
          <span class="chip chip-outline dd-spot-type">${escapeHtml(s.label)}</span>
        </div>
        <div class="dd-spot-body">
          <h3>${escapeHtml(s.name)}</h3>
          ${s.note ? `<p class="meta">${escapeHtml(s.note)}</p>` : ''}
          ${s.itineraryCount != null ? `<p class="dd-spot-count">Có trong ${s.itineraryCount} lịch trình</p>` : ''}
          <button type="button" class="btn btn-secondary btn-sm" data-action="add-spot" data-id="${escapeHtml(s.id)}">＋ Thêm vào chuyến</button>
        </div>
      </article>`,
    )
    .join('');

  const filter = $('dd-spot-filter');
  filter.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-type]');
    if (!chip) return;
    filter.querySelectorAll('[data-type]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    let shown = 0;
    $('dd-spots').querySelectorAll('.dd-spot').forEach((card) => {
      card.hidden = !!chip.dataset.type && card.dataset.type !== chip.dataset.type;
      if (!card.hidden) shown += 1;
    });
    $('dd-spots-empty').hidden = shown > 0;
  });

  $('dd-spots').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="add-spot"]');
    if (btn) addSpot(d, btn.dataset.id);
  });
}

/**
 * UC 23 Thêm địa điểm gợi ý vào chuyến (TP-47, Screen 4 → Screen 8). Khách → Screen 10 (CBR 3).
 * Thành viên: phát sự kiện "travelplan:add-spot" để TP-47 gắn popup chọn chuyến; chưa có ai xử lý thì báo tạm.
 */
function addSpot(d, spotId) {
  if (!isLoggedIn()) return redirectToLogin({ action: 'addSpot', id: spotId });
  const spot = d.spots.find((s) => String(s.id) === String(spotId));
  if (!spot) return;
  const ev = new CustomEvent('travelplan:add-spot', { detail: { destination: d, spot }, cancelable: true });
  if (document.dispatchEvent(ev)) toast('Chức năng Thêm vào chuyến đang được hoàn thiện.', 'warning');
}

/* ---------- Lịch trình mẫu ---------- */

function stopsOf(t) {
  const acts = arr(t.previewDays).flatMap((day) => arr(day.activities));
  return acts.slice(0, 4).join(' → ');
}

function renderItineraries(d, itin) {
  const list = itin.items.slice(0, 3);
  const all = $('dd-itin-all');
  if (itin.total > list.length) {
    all.href = pageUrl('templates', { destination: d.slug });
    all.textContent = `Xem cả ${itin.total} lịch trình →`;
    all.hidden = false;
  }
  if (itin.failed) {
    $('dd-itins').innerHTML = '<p class="meta dd-empty">Chưa tải được lịch trình mẫu.</p>';
    return;
  }
  if (!list.length) {
    $('dd-itins').innerHTML = `
      <div class="dd-itin-empty card">
        <p>Chưa có lịch trình công khai nào ở ${escapeHtml(d.name)}. Bạn lên kế hoạch và chia sẻ đầu tiên nhé!</p>
        <a class="btn btn-primary btn-sm" href="${pageUrl('createTrip', { destination: d.slug })}">Tạo chuyến tới ${escapeHtml(d.name)}</a>
      </div>`;
    return;
  }
  $('dd-itins').innerHTML = list
    .map((t) => {
      const stops = stopsOf(t);
      const budget = Number(t.budget) || 0;
      return `
      <article class="dd-itin">
        <a class="dd-itin-cover" href="${pageUrl('share', { id: t.id })}" tabindex="-1" aria-hidden="true">${coverHtml(t, 'cover')}</a>
        <div class="dd-itin-body">
          <p class="dd-itin-meta"><span class="chip chip-dark">${escapeHtml(t.durationLabel || durationLabel(t.days || 1))}</span>
            ${t.creatorName ? `bởi ${escapeHtml(t.creatorName)} · ` : ''}${t.cloneCount ?? 0} lượt dùng lại</p>
          <h3><a href="${pageUrl('share', { id: t.id })}">${escapeHtml(t.title)}</a></h3>
          ${stops ? `<p class="meta dd-itin-stops">${escapeHtml(stops)}</p>` : ''}
        </div>
        <div class="dd-itin-cost">
          ${budget > 0 ? `<span class="meta">Chi phí dự kiến</span><strong>${formatMoney(budget)}</strong>` : ''}
        </div>
        <button type="button" class="btn btn-dark btn-sm" data-action="reuse" data-id="${t.id}"
          data-title="${escapeHtml(t.title)}" data-days="${t.days ?? 1}">Dùng lại</button>
      </article>`;
    })
    .join('');
}

async function loadItineraries(d) {
  try {
    const res = await get(`/public/itineraries?destination=${encodeURIComponent(d.slug)}&size=50&sort=popular`, { auth: false, silent: true });
    const items = arr(res?.items);
    const count = new Map();
    items.forEach((t) => t.days && count.set(t.days, (count.get(t.days) || 0) + 1));
    const popularDays = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null;
    return { items, total: num(res?.total) ?? items.length, popularDays };
  } catch {
    return { items: [], total: null, popularDays: null, failed: true };
  }
}

/* ---------- Thời điểm nên đi ---------- */

function renderMonths(d) {
  if (!d.bestMonths.length && !d.specialMonths.length) return hideSection('thoi-diem');
  const now = currentMonth();
  const kinds = new Set();
  $('dd-months').innerHTML = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const kind = d.specialMonths.includes(m) ? 'special' : d.bestMonths.includes(m) ? 'best' : 'ok';
    kinds.add(kind);
    const text = { best: 'đẹp nhất', ok: 'vẫn đi được', special: d.specialLabel }[kind];
    const temp = d.avgTemp[i] != null ? `, khoảng ${Math.round(d.avgTemp[i])}°C` : '';
    return `<li class="dd-month is-${kind}${m === now ? ' is-now' : ''}" title="Tháng ${m}: ${escapeHtml(text)}${temp}">
      <span class="dd-month-bar"></span><span class="dd-month-label">T${m}</span>
      <span class="visually-hidden">: ${escapeHtml(text)}${temp}</span></li>`;
  }).join('');
  const legend = [
    ['best', 'Mùa đẹp nhất'],
    ['ok', 'Ngoài mùa, vẫn đi được'],
    ['special', d.specialLabel],
  ];
  $('dd-legend').innerHTML = legend
    .filter(([k]) => kinds.has(k))
    .map(([k, label]) => `<li><span class="dd-swatch is-${k}" aria-hidden="true"></span>${escapeHtml(label)}</li>`)
    .join('');
}

/* ---------- UC 10 Thời tiết ---------- */

function weatherTip(daily) {
  const rainy = daily.filter((x) => (x.rainChance ?? 0) >= 60);
  const minTemp = Math.min(...daily.map((x) => x.tempMin).filter((t) => t != null));
  const tips = [];
  if (rainy.length) {
    const days = rainy.slice(0, 2).map((x) => (x === daily[0] ? 'Hôm nay' : WEEKDAY[new Date(`${x.date}T00:00:00Z`).getUTCDay()])).join(', ');
    tips.push(`${days} có khả năng mưa cao, nhớ mang áo mưa và xếp hoạt động trong nhà vào buổi chiều.`);
  }
  if (Number.isFinite(minTemp) && minTemp < 18) tips.push(`Sáng sớm và tối se lạnh (thấp nhất ${Math.round(minTemp)}°), mang thêm áo khoác.`);
  if (!tips.length) tips.push('Tuần này trời khá đẹp, hợp đi chơi ngoài trời.');
  return tips.join(' ');
}

async function renderWeather(d) {
  if (d.lat == null || d.lng == null) return hideSection('thoi-tiet'); // Điều kiện trước: điểm đến có toạ độ
  let w;
  try {
    w = await get(`/public/weather?lat=${d.lat}&lng=${d.lng}&days=7`, { auth: false, silent: true });
  } catch {
    return hideSection('thoi-tiet'); // B4a: lỗi / quá 3 giây → ẩn, không báo lỗi
  }
  const daily = arr(w?.daily).slice(0, 7);
  const cur = w?.current;
  if (!cur && !daily.length) return hideSection('thoi-tiet');

  if (cur) {
    const label = cur.label || wmoLabel(cur.code);
    $('wx-now').innerHTML = `
      ${weatherIcon(cur.code)}
      <div class="dd-wx-temp"><strong>${Math.round(cur.temperature)}°C</strong><span>${escapeHtml(label)}</span></div>
      <dl class="dd-wx-stats">
        ${cur.humidity != null ? `<div><dt>Ẩm</dt><dd>${Math.round(cur.humidity)}%</dd></div>` : ''}
        ${cur.windSpeed != null ? `<div><dt>Gió</dt><dd>${Math.round(cur.windSpeed)} km/h</dd></div>` : ''}
        ${cur.rainChance != null ? `<div><dt>Mưa</dt><dd>${Math.round(cur.rainChance)}%</dd></div>` : ''}
      </dl>`;
  } else {
    $('wx-now').hidden = true;
  }

  $('wx-days').innerHTML = daily
    .map((x, i) => {
      const wd = i === 0 ? 'Nay' : WEEKDAY[new Date(`${x.date}T00:00:00Z`).getUTCDay()];
      return `<li${i === 0 ? ' class="is-today"' : ''}>
        <span class="dd-wx-wd">${wd}</span>${weatherIcon(x.code)}
        <strong>${Math.round(x.tempMax)}°</strong><span class="dd-wx-lo">${Math.round(x.tempMin)}°</span>
        <span class="dd-wx-rain">${x.rainChance ?? 0}%</span>
        <span class="visually-hidden">${escapeHtml(x.label || wmoLabel(x.code))}</span></li>`;
    })
    .join('');

  if (daily.length) {
    $('wx-tip').textContent = weatherTip(daily);
    $('wx-tip').hidden = false;
  }
  const updated = w.updatedAt || cur?.time;
  if (updated) {
    const t = new Date(updated.length <= 16 ? `${updated}:00+07:00` : updated);
    if (!Number.isNaN(t.getTime())) {
      $('wx-updated').textContent = `Cập nhật ${t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}`;
    }
  }
  $('thoi-tiet').hidden = false;
}

/* ---------- Bản đồ ---------- */

async function renderMap(d) {
  const pins = d.spots.filter((s) => s.lat != null && s.lng != null);
  if (!pins.length && (d.lat == null || d.lng == null)) return;
  const c = d.lat != null ? d : pins[0];
  $('dd-map-card').hidden = false;
  const view = await createMap($('dd-map'), { center: [c.lat, c.lng], zoom: 12 });
  if (!view) {
    $('dd-map-card').hidden = true;
    return;
  }
  if (pins.length) {
    view.showPins(
      pins.map((s, i) => ({
        lat: s.lat,
        lng: s.lng,
        label: i + 1,
        title: s.name,
        popup: `<strong>${escapeHtml(s.name)}</strong>${s.note ? `<br>${escapeHtml(s.note)}` : ''}`,
      })),
      { pinClass: 'dd-pin', maxZoom: 14 },
    );
  } else {
    view.setView([d.lat, d.lng], 12);
  }
  $('dd-map-link').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${d.name}, Việt Nam`)}`;
}

/* ---------- Chi phí tham khảo ---------- */

function renderCosts(d) {
  if (!d.costs.length) return;
  const days = d.suggestedDays || 3;
  $('dd-costs-title').textContent = `Chi phí tham khảo ${durationLabel(days)}`;
  let total = 0;
  $('dd-costs-body').innerHTML = d.costs
    .map((c) => {
      total += (c.min + c.max) / 2;
      const value = c.min === c.max ? formatMoney(c.min) : `${formatMoney(c.min)} – ${formatMoney(c.max)}`;
      return `<tr><th scope="row">${escapeHtml(c.item)}</th><td>${value}</td></tr>`;
    })
    .join('');
  $('dd-costs-total').textContent = `~${formatMoney(Math.round(total / 10000) * 10000)}`;
  $('dd-costs-note').textContent = d.costNote || 'Ước tính cho 1 người, đi từ TP.HCM.';
  $('dd-costs').hidden = false;
}

/* ---------- Điểm đến gần đó ---------- */

async function renderNearby(d) {
  let list = d.nearby
    .map((n) => ({ slug: n.slug, name: n.name, km: num(n.distanceKm ?? n.distance_km), time: n.travelTime || n.travel_time || '', imageUrl: n.imageUrl || n.coverUrl || null }))
    .filter((n) => n.slug && n.name);

  if (!list.length && d.lat != null && d.lng != null) {
    try {
      const res = await get('/public/destinations?size=100', { auth: false, silent: true });
      list = arr(res?.items)
        .map((x) => ({ slug: x.slug, name: x.name, lat: num(x.latitude ?? x.lat), lng: num(x.longitude ?? x.lng), imageUrl: x.imageUrl || null }))
        .filter((x) => x.slug && x.slug !== d.slug && x.lat != null && x.lng != null)
        .map((x) => ({ ...x, km: distanceKm(d, x) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 3);
    } catch {
      list = [];
    }
  }
  if (!list.length) return;
  $('dd-nearby-list').innerHTML = list
    .slice(0, 3)
    .map((n) => {
      const km = n.km != null ? `${Math.round(n.km * 1.35).toLocaleString('vi-VN')} km` : '';
      const time = n.time || (n.km != null ? (n.km * 1.35 > 450 ? flightTime(n.km) : roadTime(n.km)) : '');
      return `<li><a href="${pageUrl('destinationDetail', { slug: n.slug })}">
        ${coverHtml({ coverImage: n.imageUrl, destination: n.name }, 'dd-nearby-thumb')}
        <span><strong>${escapeHtml(n.name)}</strong><span class="meta">${[km, time].filter(Boolean).join(' · ')}</span></span>
      </a></li>`;
    })
    .join('');
  $('dd-nearby').hidden = false;
}

/* ---------- Lưu điểm đến (UC 12) ---------- */

function paintSave(saved) {
  const btn = $('dd-save');
  btn.classList.toggle('is-saved', saved);
  btn.setAttribute('aria-pressed', String(saved));
  btn.querySelector('.dd-save-label').textContent = saved ? 'Đã lưu' : 'Lưu';
}

async function initSave(d) {
  const btn = $('dd-save');
  if (d.id == null) return (btn.hidden = true);
  let saved = false;
  if (isLoggedIn()) {
    try {
      const list = await get('/me/saved?itemType=DESTINATION', { silent: true });
      saved = arr(list).some((x) => String(x.itemId) === String(d.id));
    } catch {
      /* coi như chưa lưu */
    }
  }
  paintSave(saved);

  const toggle = async ({ onlySave = false } = {}) => {
    if (!isLoggedIn()) return redirectToLogin({ action: 'saveDestination', id: d.id });
    if (btn.dataset.busy || (onlySave && saved)) return;
    btn.dataset.busy = '1';
    paintSave(!saved);
    try {
      const res = await post('/me/saved', { itemType: 'DESTINATION', itemId: Number(d.id) }, { silent: true });
      saved = res?.saved ?? !saved;
      paintSave(saved);
      toast(saved ? 'Đã lưu điểm đến.' : 'Đã bỏ lưu điểm đến.');
    } catch (err) {
      paintSave(saved);
      if (err.status !== 401) toast(MSG['MSG 18'], 'error');
    } finally {
      delete btn.dataset.busy;
    }
  };
  btn.addEventListener('click', () => toggle());
  return toggle;
}

/* ---------- Tab neo (UC 9 B4) ---------- */

function initTabs() {
  const tabs = [...document.querySelectorAll('#dd-tabs a')];
  const setActive = (id) => tabs.forEach((a) => (a.getAttribute('href') === `#${id}` ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  tabs.forEach((a) =>
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target || target.hidden) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', a.getAttribute('href'));
      setActive(target.id);
    }),
  );
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => entries.filter((en) => en.isIntersecting).forEach((en) => setActive(en.target.id)),
      { rootMargin: '-40% 0px -55% 0px' },
    );
    tabs.forEach((a) => {
      const el = document.querySelector(a.getAttribute('href'));
      if (el) io.observe(el);
    });
  }
}

/* ---------- Khởi động ---------- */

async function init() {
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return showNotFound();

  let d;
  try {
    d = normalizeDestination(await get(`/public/destinations/${encodeURIComponent(slug)}`, { auth: false, silent: true }));
  } catch (err) {
    if (err.status === 404 || err.status === 400) return showNotFound(); // UC 9 B2a
    return showNotFound({ code: '!', title: 'Chưa tải được điểm đến', body: 'Có lỗi khi kết nối máy chủ. Bạn thử tải lại trang sau ít phút nhé.' });
  }

  renderHero(d);
  renderSpots(d);
  renderMonths(d);
  renderCosts(d);
  $('dd-loading').hidden = true;
  $('dd-content').hidden = false;
  $('dest-page').removeAttribute('aria-busy');
  renderMap(d); // sau khi khung hiện để bản đồ đo được kích thước
  initTabs();

  const [itin, toggleSave] = await Promise.all([loadItineraries(d), initSave(d), renderWeather(d), renderNearby(d)]);
  renderFacts(d, itin);
  renderItineraries(d, itin);
  bindReuseSave($('dd-itins'));
  await loadSaved();
  markSaved($('dd-itins'));

  // CBR 3: đăng nhập xong quay lại và tự làm tiếp thao tác
  const action = new URLSearchParams(location.search).get('action');
  if (action === 'saveDestination' || action === 'addSpot') {
    const pending = takePendingAction();
    if (!isLoggedIn()) return;
    if (pending.action === 'saveDestination' && toggleSave) toggleSave({ onlySave: true });
    if (pending.action === 'addSpot') addSpot(d, pending.id);
  } else {
    runPendingAction();
  }
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}

init();
