// Tìm địa điểm và ảnh nền bản đồ dùng chung (Screen 6, Screen 7, Screen 8).
// Mặc định dùng Nominatim và tile OpenStreetMap theo SRS. Một số mạng / DNS chặn *.openstreetmap.org,
// khi đó tự chuyển sang Photon (cũng dữ liệu OSM) và tile Esri (không cần API key) để chức năng vẫn chạy.

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const PHOTON = 'https://photon.komoot.io/api/';

let nominatimDown = false; // Nominatim lỗi mạng một lần thì dùng Photon cho các lần sau trong trang

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

/** Thêm ảnh nền bản đồ OSM; tile lỗi liên tục (mạng chặn) thì đổi sang Esri World Street Map. */
export function addBaseLayer(map) {
  const L = window.L;
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
  let errors = 0;
  let switched = false;
  osm.on('tileerror', () => {
    errors += 1;
    if (switched || errors < 2) return;
    switched = true;
    map.removeLayer(osm);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles © Esri',
    }).addTo(map);
  });
  osm.addTo(map);
  return map;
}
