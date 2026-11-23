import prisma from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
import { toSlug } from '../utils/slug.js';

// UC 8 Xem danh sách điểm đến, UC 9 Xem chi tiết điểm đến (TP-43).

export const REGIONS = { NORTH: 'Miền Bắc', CENTRAL: 'Miền Trung', HIGHLANDS: 'Tây Nguyên', SOUTH: 'Miền Nam' };
export const CATEGORIES = { BEACH: 'Biển đảo', MOUNTAIN: 'Núi rừng', CULTURE: 'Văn hóa, di sản' };
export const SPOT_CATEGORIES = { SIGHTSEEING: 'Ngắm cảnh', FOOD: 'Ăn uống', CULTURE: 'Văn hóa', TREKKING: 'Trekking' };
export const COST_CATEGORIES = { TRANSPORT: 'Xe khách', LODGING: 'Homestay', FOOD: 'Ăn uống', TICKETS: 'Vé tham quan' };

const SEASON_LABEL = 'Đang vào mùa'; // BR 29
const SEASON_PICKS = 3; // BR 28: khối "Tháng x, y nên đi đâu?" lấy 3 điểm đến
const SAMPLE_ITINERARIES = 3; // BR 32: 3 lịch trình mẫu
const NEARBY = 3; // BR 32: 3 điểm đến gần đó
const NEARBY_SPEED_KMH = 45; // ước tính thời gian đi giữa hai điểm đến
const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const catalogCache = new Map();

const num = (v) => (v == null ? null : Number(v));

/** Tháng hiện tại theo giờ Việt Nam (1–12). */
export function currentMonthVN() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCMonth() + 1;
}

/** [11, 12, 1, 2, 3] → "Tháng 11 – 3"; [4] → "Tháng 4"; [3, 4, 9, 10] → "Tháng 3 – 4, 9 – 10". Tháng 12 nối liền tháng 1. */
export function formatMonths(months = []) {
  const set = [...new Set(months)].filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b);
  if (!set.length) return '';
  if (set.length === 12) return 'Quanh năm';
  const has = new Set(set);
  // Bắt đầu một đoạn ở tháng mà tháng trước nó (vòng tròn) không thuộc danh sách.
  const starts = set.filter((m) => !has.has(m === 1 ? 12 : m - 1));
  const runs = starts.map((start) => {
    let end = start;
    while (has.has(end === 12 ? 1 : end + 1)) end = end === 12 ? 1 : end + 1;
    return start === end ? `${start}` : `${start} – ${end}`;
  });
  return `Tháng ${runs.join(', ')}`;
}

const provinceOf = (d) => d.province || (d.address ? d.address.split(',')[0].trim() : '');
const slugOf = (d) => d.slug || toSlug(d.name);

/** Hình thức điểm đến dùng chung cho thẻ ở danh sách (Screen 1, Screen 3) và mục "điểm đến gần đó". */
function toCard(d, month) {
  const budgets = (d.trips ?? []).map((t) => Number(t.budget)).filter((b) => b > 0);
  const best = d.bestMonths ?? [];
  const inSeason = best.includes(month);
  return {
    id: d.id,
    name: d.name,
    slug: slugOf(d),
    province: provinceOf(d),
    region: d.region ?? null,
    regionLabel: d.region ? (REGIONS[d.region] ?? null) : null,
    category: d.category ?? null,
    categoryLabel: d.category ? (CATEGORIES[d.category] ?? null) : null,
    address: d.address,
    tagline: d.description,
    imageUrl: d.imageUrl,
    isFeatured: d.isFeatured,
    latitude: num(d.latitude),
    longitude: num(d.longitude),
    itineraryCount: (d.trips ?? []).length,
    fromPrice: budgets.length ? Math.min(...budgets) : null,
    tags: d.tags ?? [],
    bestMonths: best,
    bestTime: formatMonths(best),
    inSeason,
    seasonLabel: inSeason ? SEASON_LABEL : null,
  };
}

const POPULAR = (a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.itineraryCount - a.itineraryCount || a.id - b.id;
const SORTERS = {
  // Mặc định (không truyền sort): điểm đến nổi bật trước rồi tới nhiều lịch trình, giữ nguyên thứ tự cũ của Screen 1.
  popular: POPULAR,
  itineraries: (a, b) => b.itineraryCount - a.itineraryCount || POPULAR(a, b),
  name: (a, b) => a.name.localeCompare(b.name, 'vi') || a.id - b.id,
};

/**
 * UC 8: GET /api/public/destinations?page=&size=&q=&region=&type=&sort=
 * - q (BR 30): tìm theo tên, tỉnh hoặc vùng, không phân biệt dấu và hoa thường.
 * - region, type (BR 31): chip vùng và chip loại; regionCounts là số lượng trên từng chip vùng (đã áp q và type).
 * - seasonal (BR 28): 3 điểm đến có tháng hiện tại hoặc tháng sau nằm trong [Tháng đẹp].
 */
export async function listDestinations({ page, size, q, region, type, sort }) {
  const month = currentMonthVN();
  const cacheKey = JSON.stringify({ month, page, size, q, region, type, sort });
  const cached = catalogCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  
  const rows = await prisma.destination.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      province: true,
      region: true,
      category: true,
      address: true,
      description: true,
      imageUrl: true,
      isFeatured: true,
      latitude: true,
      longitude: true,
      bestMonths: true,
      tags: true,
      trips: { where: { isPublic: true }, select: { budget: true } },
    },
  });

  const keyword = q ? toSlug(q) : '';
  const cards = rows.map((d) => toCard(d, month));

  const matchesText = (d) => !keyword || toSlug(`${d.name} ${d.province} ${d.regionLabel ?? ''}`).includes(keyword);
  const matchesType = (d) => !type || d.category === type;
  const base = cards.filter((d) => matchesText(d) && matchesType(d));

  const regionCounts = { ALL: base.length, NORTH: 0, CENTRAL: 0, HIGHLANDS: 0, SOUTH: 0 };
  for (const d of base) if (d.region && d.region in regionCounts) regionCounts[d.region] += 1;

  const all = base.filter((d) => !region || d.region === region).sort(SORTERS[sort ?? 'popular']);
  const total = all.length;

  const next = (month % 12) + 1;
  const seasonal = cards
    .filter((d) => d.bestMonths.includes(month) || d.bestMonths.includes(next))
    .sort((a, b) => Number(b.inSeason) - Number(a.inSeason) || POPULAR(a, b))
    .slice(0, SEASON_PICKS);

  const result = {
    items: all.slice((page - 1) * size, page * size),
    page,
    size,
    total,
    hasMore: page * size < total,
    regionCounts,
    seasonal: { months: [month, next], title: `Tháng ${month}, ${next} nên đi đâu?`, items: seasonal },
  };
  catalogCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;  
}

const shortName = (full = '') => full.trim().split(/\s+/).slice(-2).join(' ');
const durationLabel = (days) => (days <= 1 ? '1 ngày' : `${days}N${days - 1}Đ`);

function haversineKm(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Tìm điểm đến theo slug. Điểm đến chưa có cột slug (dữ liệu cũ) khớp theo slug của tên. */
async function findBySlug(slug) {
  const include = { spots: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }, costs: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } };
  const direct = await prisma.destination.findFirst({ where: { slug }, include });
  if (direct) return direct;
  const legacy = await prisma.destination.findMany({ where: { slug: null }, include });
  return legacy.find((d) => toSlug(d.name) === slug) ?? null;
}

async function loadSampleItineraries(destination) {
  const trips = await prisma.trip.findMany({
    where: {
      isPublic: true,
      OR: [{ destinationId: destination.id }, { destination: { equals: destination.name, mode: 'insensitive' } }],
    },
    select: {
      id: true,
      title: true,
      coverImage: true,
      coverColor: true,
      startDate: true,
      endDate: true,
      budget: true,
      createdAt: true,
      user: { select: { fullName: true } },
      _count: { select: { clones: true } },
    },
    take: 200,
  });
  const top = trips
    .map((t) => ({ ...t, cloneCount: t._count?.clones ?? 0, days: Math.round((new Date(t.endDate) - new Date(t.startDate)) / DAY_MS) + 1 }))
    .sort((a, b) => b.cloneCount - a.cloneCount || b.createdAt - a.createdAt || b.id - a.id)
    .slice(0, SAMPLE_ITINERARIES);
  if (!top.length) return { total: trips.length, items: [] };

  const items = await prisma.itineraryItem.findMany({
    where: { tripId: { in: top.map((t) => t.id) } },
    select: { tripId: true, activityDate: true, startTime: true, activity: true },
    orderBy: [{ activityDate: 'asc' }, { startTime: 'asc' }],
  });
  const stops = new Map();
  for (const it of items) {
    const list = stops.get(it.tripId) ?? [];
    if (list.length < 3) list.push(it.activity);
    stops.set(it.tripId, list);
  }
  return {
    total: trips.length,
    items: top.map((t) => ({
      id: t.id,
      title: t.title,
      coverImage: t.coverImage,
      coverColor: t.coverColor,
      days: t.days,
      durationLabel: durationLabel(t.days),
      budget: Number(t.budget),
      cloneCount: t.cloneCount,
      creatorName: shortName(t.user?.fullName),
      highlights: stops.get(t.id) ?? [],
    })),
  };
}

/** Số lịch trình công khai có ghé từng địa điểm: hoạt động có tên hoặc địa điểm chứa tên địa điểm nên ghé. */
async function countSpotVisits(destination) {
  if (!destination.spots.length) return new Map();
  const items = await prisma.itineraryItem.findMany({
    where: { trip: { isPublic: true, OR: [{ destinationId: destination.id }, { destination: { equals: destination.name, mode: 'insensitive' } }] } },
    select: { tripId: true, activity: true, location: true },
  });
  const counts = new Map();
  for (const spot of destination.spots) {
    const key = toSlug(spot.name);
    const trips = new Set(items.filter((it) => toSlug(`${it.activity} ${it.location ?? ''}`).includes(key)).map((it) => it.tripId));
    counts.set(spot.id, trips.size);
  }
  return counts;
}

async function loadNearby(destination) {
  if (destination.latitude == null || destination.longitude == null) return [];
  const origin = { latitude: Number(destination.latitude), longitude: Number(destination.longitude) };
  const others = await prisma.destination.findMany({
    where: { id: { not: destination.id } },
    select: { id: true, name: true, slug: true, province: true, address: true, imageUrl: true, latitude: true, longitude: true },
  });
  return others
    .filter((d) => d.latitude != null && d.longitude != null)
    .map((d) => ({ d, km: haversineKm(origin, { latitude: Number(d.latitude), longitude: Number(d.longitude) }) }))
    .sort((a, b) => a.km - b.km || a.d.id - b.d.id)
    .slice(0, NEARBY)
    .map(({ d, km }) => {
      const hours = Math.round((km / NEARBY_SPEED_KMH) * 10) / 10;
      return { id: d.id, name: d.name, slug: slugOf(d), province: provinceOf(d), imageUrl: d.imageUrl, distanceKm: Math.round(km), travelHours: hours, travelLabel: `${hours.toLocaleString('vi-VN')} giờ` };
    });
}

/** Biểu đồ 12 tháng (BR 32): BEST = khô đẹp nhất, OK = mưa chiều vẫn đi được, SPECIAL = mùa đặc biệt (ví dụ hoa dã quỳ). */
function buildBestTimeChart(d) {
  const temps = d.avgTempByMonth ?? [];
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const level = (d.specialMonths ?? []).includes(month) ? 'SPECIAL' : (d.bestMonths ?? []).includes(month) ? 'BEST' : 'OK';
    return { month, level, avgTemp: temps.length === 12 ? temps[i] : null };
  });
}

/**
 * UC 9: GET /api/public/destinations/{slug}. Không có điểm đến → 404 (UC 9 · B2a, trang Không tìm thấy).
 * Trả đủ dữ liệu cho Screen 4 (BR 32): thông tin nhanh, địa điểm nên ghé, 3 lịch trình mẫu, chi phí 3N2Đ, điểm đến gần đó, biểu đồ thời điểm.
 */
export async function getDestinationBySlug(slug) {
  const d = await findBySlug(slug);
  if (!d) throw AppError.notFound('Không tìm thấy điểm đến.');

  const month = currentMonthVN();
  const [samples, visits, nearby] = await Promise.all([loadSampleItineraries(d), countSpotVisits(d), loadNearby(d)]);

  const costItems = d.costs.map((c) => ({ category: c.category, label: COST_CATEGORIES[c.category] ?? c.category, amount: Number(c.amount), note: c.note }));
  const temps = (d.avgTempByMonth ?? []).filter((t) => Number.isFinite(t));
  const regionLabel = d.region ? (REGIONS[d.region] ?? null) : null;
  const province = provinceOf(d);

  return {
    id: d.id,
    name: d.name,
    slug: slugOf(d),
    province,
    region: d.region ?? null,
    regionLabel,
    category: d.category ?? null,
    categoryLabel: d.category ? (CATEGORIES[d.category] ?? null) : null,
    breadcrumb: [{ label: 'Điểm đến', slug: null }, ...(regionLabel ? [{ label: regionLabel, slug: null }] : []), ...(province ? [{ label: province, slug: null }] : [])],
    address: d.address,
    description: d.description,
    tags: d.tags ?? [],
    imageUrl: d.imageUrl,
    latitude: num(d.latitude),
    longitude: num(d.longitude),
    inSeason: (d.bestMonths ?? []).includes(month),
    quickInfo: {
      bestTime: formatMonths(d.bestMonths),
      temperature: temps.length ? `${Math.min(...temps)}–${Math.max(...temps)}°C` : null,
      fromHcm: d.travelFromHcm ?? null,
      suggestedDays: d.suggestedDays ?? null,
      itineraryCount: samples.total,
    },
    spots: d.spots.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      categoryLabel: SPOT_CATEGORIES[s.category] ?? s.category,
      description: s.description,
      imageUrl: s.imageUrl,
      latitude: num(s.latitude),
      longitude: num(s.longitude),
      itineraryCount: visits.get(s.id) ?? 0,
      // UC 23 B5: [Ngoài trời] tự bật nếu loại là Ngắm cảnh hoặc Trekking
      outdoor: s.category === 'SIGHTSEEING' || s.category === 'TREKKING',
    })),
    sampleItineraries: samples.items,
    costs: {
      trip: '3N2Đ',
      items: costItems,
      totalPerPerson: costItems.reduce((sum, c) => sum + c.amount, 0),
      source: d.costSource ?? null,
    },
    nearby,
    bestTimeChart: { months: buildBestTimeChart(d), specialNote: d.specialNote ?? null },
  };
}
