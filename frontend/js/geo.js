// Tìm địa điểm dùng chung (Screen 6, Screen 8).
// Có GOOGLE_MAPS_API_KEY (config.js) → Google Places API (New), Place.searchByText. Không có key hoặc Google lỗi
// → Nominatim theo SRS; Nominatim bị chặn (một số mạng / DNS chặn *.openstreetmap.org) → Photon (cũng dữ liệu OSM).
// Mọi nguồn đều trả cùng dạng Nominatim: { lat, lon, name, display_name, address: { city } }.
// Ảnh nền bản đồ nằm ở js/maps.js.
import { loadGoogleMaps } from './maps.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const PHOTON = 'https://photon.komoot.io/api/';

let nominatimDown = false; // Nominatim lỗi mạng một lần thì dùng Photon cho các lần sau trong trang
let googleDown = false;

const aborted = () => new DOMException('Đã huỷ', 'AbortError');

/** Kết quả Google Place → dạng Nominatim. Địa điểm là chính một thành phố/tỉnh thì city = tên của nó. */
function fromGooglePlace(p) {
  const comps = p.addressComponents || [];
  const comp = (type) => comps.find((c) => c.types?.includes(type))?.longText;
  const types = p.types || [];
  const isCity = types.includes('locality') || types.includes('administrative_area_level_1');
  const name = p.displayName || '';
  return {
    lat: String(p.location.lat()),
    lon: String(p.location.lng()),
    name,
    display_name: p.formattedAddress || name,
    address: { city: isCity ? name : comp('locality') || comp('administrative_area_level_2') || name },
  };
}

/** Google Places Text Search (tối đa 5, ưu tiên Việt Nam và quanh near). Không có key → null. */
async function searchGoogle(q, { near, signal }) {
  const gm = await loadGoogleMaps();
  if (!gm) return null;
  if (signal?.aborted) throw aborted();
  const { Place } = gm.places?.Place ? gm.places : await gm.importLibrary('places');
  const request = {
    textQuery: q,
    fields: ['displayName', 'formattedAddress', 'location', 'addressComponents', 'types'],
    language: 'vi',
    region: 'vn',
    maxResultCount: 5,
  };
  if (near) request.locationBias = { center: { lat: near.lat, lng: near.lng }, radius: 50000 };
  const { places = [] } = await Place.searchByText(request);
  if (signal?.aborted) throw aborted();
  return places.filter((p) => p.location).map(fromGooglePlace);
}

/** Kết quả Photon (GeoJSON) → cùng dạng với Nominatim: { lat, lon, name, display_name, address }. */
function fromPhoton(f) {
  const p = f.properties || {};
  const [lon, lat] = f.geometry?.coordinates || [];
  const parts = [p.name, p.street, p.district, p.city, p.county, p.state, p.country].filter(Boolean);
  const display = [...new Set(parts)].join(', ');
  return {
    lat: String(lat),
    lon: String(lon),
    name: p.name || p.city || p.state || '',
    display_name: display || p.name || '',
    // Kết quả là chính một thành phố / thị trấn thì tên của nó là "city" (để ô Điểm đến điền "Đà Lạt", không phải tên tỉnh).
    // Địa điểm khác (nhà ga, hồ...) không có city thì dùng chính tên của nó, không lấy tên tỉnh.
    address: { city: p.osm_key === 'place' ? p.name : p.city || p.name },
  };
}

async function searchNominatim(q, { near, signal, details }) {
  const params = new URLSearchParams({ format: 'jsonv2', limit: '5', countrycodes: 'vn', 'accept-language': 'vi', q });
  if (details) params.set('addressdetails', '1');
  if (near) params.set('viewbox', `${near.lng - 0.5},${near.lat + 0.5},${near.lng + 0.5},${near.lat - 0.5}`);
  const res = await fetch(`${NOMINATIM}?${params}`, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return (await res.json()).slice(0, 5);
}

async function searchPhoton(q, { near, signal }) {
  // Photon không lọc theo quốc gia: lấy dư rồi giữ kết quả ở Việt Nam.
  const params = new URLSearchParams({ q, limit: '10' });
  if (near) {
    params.set('lat', String(near.lat));
    params.set('lon', String(near.lng));
  }
  const res = await fetch(`${PHOTON}?${params}`, { signal });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data = await res.json();
  return (data.features || [])
    .filter((f) => !f.properties?.countrycode || f.properties.countrycode === 'VN')
    .slice(0, 5)
    .map(fromPhoton);
}

/**
 * Gợi ý địa điểm (tối đa 5). near = { lat, lng } để ưu tiên quanh điểm đến.
 * Trả mảng dạng Nominatim; AbortError được ném lại để nơi gọi bỏ qua.
 */
export async function searchPlaces(q, { near = null, signal, details = false } = {}) {
  if (!googleDown) {
    try {
      const res = await searchGoogle(q, { near, signal });
      if (res) return res;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      googleDown = true; // chưa bật Places API (New), hết hạn mức... → dùng OSM cho các lần sau
      console.warn('[geo] Google Places lỗi, chuyển sang Nominatim.', err);
    }
  }
  if (!nominatimDown) {
    try {
      return await searchNominatim(q, { near, signal, details });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      nominatimDown = true;
    }
  }
  return searchPhoton(q, { near, signal });
}
