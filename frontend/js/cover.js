// Ảnh bìa minh hoạ của chuyến khi chưa có ảnh tải lên (Screen 5, 7).
// Chọn cảnh theo điểm đến: núi rừng, biển, phố cổ, ruộng bậc thang.
import { API_BASE } from './config.js';
import { normalizeText, escapeHtml } from './trip-utils.js';

const SCENES = {
  mountain: ['da lat', 'ha giang', 'moc chau', 'tam dao', 'bao loc', 'kon tum', 'pleiku', 'buon ma thuot'],
  terrace: ['sa pa', 'sapa', 'mu cang chai', 'y ty', 'hoang su phi', 'ninh binh', 'cao bang'],
  sea: ['phu quoc', 'vung tau', 'quy nhon', 'con dao', 'ha long', 'nha trang', 'mui ne', 'phan thiet', 'cat ba', 'da nang', 'phu yen', 'ly son'],
  town: ['hoi an', 'hue', 'ha noi', 'sai gon', 'ho chi minh', 'can tho'],
};

export function sceneOf(destination = '') {
  const d = normalizeText(destination);
  for (const [scene, keys] of Object.entries(SCENES)) if (keys.some((k) => d.includes(k))) return scene;
  return 'mountain';
}

const SVG = {
  mountain: `
    <rect width="400" height="160" fill="#f3c9a0"/>
    <circle cx="300" cy="44" r="28" fill="#fbe3c4"/>
    <path d="M0 84 Q80 60 160 80 T320 70 T400 76 V160 H0Z" fill="#b8c9b4"/>
    <path d="M0 104 Q100 84 200 100 T400 96 V160 H0Z" fill="#8fae94"/>
    <ellipse cx="190" cy="118" rx="40" ry="5" fill="#cfe1e8"/>
    <path d="M0 126 Q120 112 240 124 T400 120 V160 H0Z" fill="#4f7d63"/>
    <path d="M30 160 L42 110 L54 160Z M70 160 L80 124 L90 160Z M320 160 L332 106 L344 160Z M360 160 L368 128 L376 160Z" fill="#244a3c"/>`,
  terrace: `
    <rect width="400" height="160" fill="#dfe8ec"/>
    <path d="M0 80 L70 30 L130 70 L200 24 L280 72 L340 36 L400 64 V160 H0Z" fill="#a9b9bf"/>
    <path d="M0 92 Q200 76 400 90 V160 H0Z" fill="#c9c46a"/>
    <path d="M0 106 Q200 92 400 104 V160 H0Z" fill="#b4b04e"/>
    <path d="M0 120 Q200 106 400 118 V160 H0Z" fill="#d9b44a"/>
    <path d="M0 134 Q200 120 400 132 V160 H0Z" fill="#c29a35"/>
    <path d="M0 148 Q200 136 400 146 V160 H0Z" fill="#a9822b"/>
    <path d="M290 112 L306 100 L322 112 V124 H290Z" fill="#7b4a2c"/>`,
  sea: `
    <rect width="400" height="160" fill="#f6a985"/>
    <circle cx="200" cy="84" r="34" fill="#ffd27a"/>
    <rect y="84" width="400" height="56" fill="#3c8fb0"/>
    <path d="M150 100 H250 M170 108 H230" stroke="#ffd27a" stroke-width="2"/>
    <path d="M0 140 Q200 128 400 140 V160 H0Z" fill="#f4dcae"/>
    <path d="M60 160 Q66 110 80 74" stroke="#5b3b23" stroke-width="5" fill="none"/>
    <path d="M80 74 q-30 -6 -44 14 M80 74 q26 -14 46 4 M80 74 q-8 -22 -30 -26 M80 74 q14 -20 36 -18" stroke="#1f5c45" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M300 120 l10 -14 v14z" fill="#fff"/><path d="M296 120 h20 l-3 4 h-14z" fill="#10302e"/>`,
  town: `
    <rect width="400" height="160" fill="#3b2f63"/>
    <path d="M0 20 Q100 34 200 18 T400 22" stroke="#f2c25b" stroke-width="1" fill="none"/>
    <circle cx="60" cy="26" r="7" fill="#e5533b"/><circle cx="150" cy="28" r="7" fill="#f2c25b"/><circle cx="250" cy="22" r="7" fill="#e5533b"/><circle cx="340" cy="25" r="7" fill="#f2c25b"/>
    <g fill="#e6b53c"><rect x="0" y="60" width="72" height="80"/><rect x="80" y="50" width="72" height="90"/><rect x="160" y="62" width="72" height="78"/><rect x="240" y="50" width="72" height="90"/><rect x="320" y="58" width="80" height="82"/></g>
    <g fill="#5c2b1f"><rect x="18" y="96" width="16" height="44"/><rect x="100" y="96" width="16" height="44"/><rect x="180" y="100" width="16" height="40"/><rect x="262" y="96" width="16" height="44"/><rect x="344" y="98" width="16" height="42"/></g>
    <g fill="#fbe3a0"><rect x="44" y="78" width="14" height="12"/><rect x="124" y="74" width="14" height="12"/><rect x="204" y="80" width="14" height="12"/><rect x="286" y="74" width="14" height="12"/><rect x="368" y="78" width="14" height="12"/></g>
    <rect y="140" width="400" height="20" fill="#2a2347"/>`,
};

/** Đường dẫn ảnh bìa đầy đủ (ảnh do backend lưu có thể là "/uploads/..."). */
export function coverImageUrl(path) {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  const origin = API_BASE.replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** HTML ảnh bìa: ảnh thật nếu có, không thì cảnh minh hoạ. */
export function coverHtml(trip, className = 'cover') {
  const url = coverImageUrl(trip.coverImage);
  if (url) return `<img class="${className}" src="${escapeHtml(url)}" alt="">`;
  const scene = sceneOf(trip.destination);
  return `<svg class="${className}" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${SVG[scene]}</svg>`;
}
