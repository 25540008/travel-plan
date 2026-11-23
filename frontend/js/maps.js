// Bản đồ dùng chung cho Screen 4, 6, 7.
// Có GOOGLE_MAPS_API_KEY (config.js) → Google Maps JavaScript API. Không có key, key sai hoặc tải lỗi
// → tự quay về Leaflet + OpenStreetMap như trước, để bản chạy local / chưa cấu hình key vẫn có bản đồ.
//
// Cách dùng:
//   const view = await createMap(el, { center: [lat, lng], zoom: 11 });   // null nếu không tải được bản đồ nào
//   view.showPins([{ lat, lng, label: '1', title, popup }], { pinClass: 'map-pin', route: true, maxZoom: 15 });
//   view.showMarker([lat, lng], 11);   // ghim thường (Screen 6)
//   view.showDot([lat, lng], 12);      // chấm tròn tâm điểm đến (Screen 7 khi chưa có hoạt động)
//   view.setView([lat, lng], zoom); view.clear();
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from './config.js';

const LOAD_TIMEOUT_MS = 8000;
const ROUTE_COLOR = '#10302e';

let googlePromise = null;
let leafletPromise = null;
let googleAuthFailed = false;

/** Tải Google Maps JS API một lần (kèm thư viện marker, places). Trả google.maps hoặc null. */
export function loadGoogleMaps() {
  if (!GOOGLE_MAPS_API_KEY || googleAuthFailed) return Promise.resolve(null);
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  googlePromise ||= new Promise((resolve) => {
    const cb = '__travelplanGmapsReady';
    const timer = setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
    window[cb] = () => {
      clearTimeout(timer);
      resolve(window.google?.maps?.Map ? window.google.maps : null);
    };
    // Key sai / chưa bật API / sai referrer: Google gọi hàm này. Lần tạo bản đồ sau sẽ dùng Leaflet.
    window.gm_authFailure = () => {
      googleAuthFailed = true;
      console.warn('[maps] Google Maps từ chối API key, chuyển sang OpenStreetMap.');
      handles.forEach((h) => h.fallbackToLeaflet());
    };
    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      v: 'weekly',
      language: 'vi',
      region: 'VN',
      libraries: 'marker,places',
      loading: 'async',
      callback: cb,
    });
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    s.async = true;
    s.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    document.head.append(s);
  });
  return googlePromise;
}

/** Tải Leaflet từ CDN khi cần (không còn nhúng sẵn trong HTML). Trả window.L hoặc null. */
function loadLeaflet() {
  if (window.L?.map) return Promise.resolve(window.L);
  leafletPromise ||= new Promise((resolve) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.crossOrigin = '';
    document.head.append(css);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.crossOrigin = '';
    s.onload = () => resolve(window.L || null);
    s.onerror = () => resolve(null);
    document.head.append(s);
  });
  return leafletPromise;
}

const pinElement = (className, label) => {
  const el = document.createElement('div');
  el.className = className;
  el.innerHTML = `<span>${label}</span>`;
  return el;
};

/* ---------- Google Maps ---------- */

class GoogleMapView {
  constructor(gm, el, { center, zoom }) {
    this.provider = 'google';
    this.gm = gm;
    this.map = new gm.Map(el, {
      center: { lat: center[0], lng: center[1] },
      zoom,
      mapId: GOOGLE_MAPS_MAP_ID, // AdvancedMarkerElement cần mapId
      gestureHandling: 'cooperative', // cuộn trang không bị bản đồ "bắt" (giống scrollWheelZoom: false)
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      clickableIcons: false,
    });
    this.overlays = [];
    this.info = null;
  }

  clear() {
    this.overlays.forEach((o) => (o.setMap ? o.setMap(null) : (o.map = null)));
    this.overlays = [];
    this.info?.close();
  }

  setView([lat, lng], zoom) {
    this.map.setCenter({ lat, lng });
    this.map.setZoom(zoom);
  }

  marker(position, content, title) {
    const m = new this.gm.marker.AdvancedMarkerElement({ map: this.map, position, content, title: title || '' });
    this.overlays.push(m);
    return m;
  }

  showPins(points, { pinClass = 'map-pin', route = false, maxZoom = 15 } = {}) {
    this.clear();
    if (!points.length) return;
    const bounds = new this.gm.LatLngBounds();
    points.forEach((p, i) => {
      const pos = { lat: p.lat, lng: p.lng };
      bounds.extend(pos);
      const m = this.marker(pos, pinElement(pinClass, p.label ?? i + 1), p.title);
      if (p.popup) {
        m.addListener('click', () => {
          this.info ||= new this.gm.InfoWindow();
          this.info.setContent(p.popup);
          this.info.open({ map: this.map, anchor: m });
        });
      }
    });
    if (route && points.length > 1) {
      // Nét đứt như bản Leaflet: đường trong suốt + ký hiệu chấm lặp lại
      const line = new this.gm.Polyline({
        map: this.map,
        path: points.map((p) => ({ lat: p.lat, lng: p.lng })),
        strokeOpacity: 0,
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: ROUTE_COLOR, scale: 3 }, offset: '0', repeat: '12px' }],
      });
      this.overlays.push(line);
    }
    if (points.length === 1) return this.setView([points[0].lat, points[0].lng], Math.min(13, maxZoom));
    this.map.fitBounds(bounds, 30);
    this.gm.event.addListenerOnce(this.map, 'idle', () => {
      if (this.map.getZoom() > maxZoom) this.map.setZoom(maxZoom);
    });
  }

  showMarker([lat, lng], zoom) {
    this.clear();
    this.marker({ lat, lng }); // ghim đỏ mặc định của Google
    this.setView([lat, lng], zoom);
  }

  showDot([lat, lng], zoom) {
    this.clear();
    this.marker({ lat, lng }, pinElement('map-dot', ''));
    this.setView([lat, lng], zoom);
  }

  resize() {
    /* Google tự đo lại khi khung đổi kích thước */
  }
}

/* ---------- Leaflet (dự phòng) ---------- */

/** Thêm ảnh nền bản đồ OSM; tile lỗi liên tục (mạng chặn) thì đổi sang Esri World Street Map. */
function addBaseLayer(map) {
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


class LeafletMapView {
  constructor(L, el, { center, zoom }) {
    this.provider = 'leaflet';
    this.L = L;
    this.map = L.map(el, { scrollWheelZoom: false, attributionControl: true }).setView(center, zoom);
    addBaseLayer(this.map);
    this.layer = L.layerGroup().addTo(this.map);
  }

  clear() {
    this.layer.clearLayers();
  }

  setView(center, zoom) {
    this.map.setView(center, zoom);
    this.resize();
  }

  showPins(points, { pinClass = 'map-pin', route = false, maxZoom = 15 } = {}) {
    const { L } = this;
    this.clear();
    if (!points.length) return;
    const latlngs = points.map((p) => [p.lat, p.lng]);
    points.forEach((p, i) => {
      const m = L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: pinClass, html: `<span>${p.label ?? i + 1}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
        title: p.title || '',
      }).addTo(this.layer);
      if (p.popup) m.bindPopup(p.popup);
    });
    if (route && latlngs.length > 1) L.polyline(latlngs, { color: ROUTE_COLOR, weight: 3, dashArray: '2 8', lineCap: 'round' }).addTo(this.layer);
    if (latlngs.length === 1) this.map.setView(latlngs[0], Math.min(13, maxZoom));
    else this.map.fitBounds(latlngs, { padding: [30, 30], maxZoom });
    this.resize();
  }

  showMarker(center, zoom) {
    this.clear();
    this.L.marker(center).addTo(this.layer);
    this.setView(center, zoom);
  }

  showDot(center, zoom) {
    this.clear();
    this.L.circleMarker(center, { radius: 8, color: '#d9512c', fillOpacity: 0.9 }).addTo(this.layer);
    this.setView(center, zoom);
  }

  resize() {
    setTimeout(() => this.map.invalidateSize(), 0);
  }
}

/**
 * Vỏ bọc trả cho trang: ghi lại lệnh vẽ cuối cùng để nếu Google từ chối key sau khi đã vẽ (gm_authFailure)
 * thì dựng lại bằng Leaflet trong cùng khung và vẽ lại, trang không phải xử lý gì thêm.
 */
const handles = new Set();

class MapHandle {
  constructor(el, opts, view) {
    this.el = el;
    this.opts = opts;
    this.view = view;
    this.last = null;
    if (view.provider === 'google') handles.add(this);
  }

  get provider() {
    return this.view.provider;
  }

  run(method, args) {
    this.last = { method, args };
    return this.view[method](...args);
  }

  showPins(...a) { return this.run('showPins', a); }
  showMarker(...a) { return this.run('showMarker', a); }
  showDot(...a) { return this.run('showDot', a); }
  setView(...a) { return this.run('setView', a); }
  clear() { return this.run('clear', []); }
  resize() { return this.view.resize(); }

  async fallbackToLeaflet() {
    handles.delete(this);
    const L = await loadLeaflet();
    this.el.replaceChildren();
    if (!L) {
      this.el.hidden = true;
      return;
    }
    this.view = new LeafletMapView(L, this.el, this.opts);
    if (this.last) this.view[this.last.method](...this.last.args);
  }
}

/** Tạo bản đồ trong el. Google trước, lỗi thì Leaflet; không tải được gì thì trả null (trang ẩn khung bản đồ). */
export async function createMap(el, { center = [16.0, 107.5], zoom = 5 } = {}) {
  const opts = { center, zoom };
  const gm = await loadGoogleMaps();
  if (gm && !googleAuthFailed) {
    try {
      if (!gm.marker?.AdvancedMarkerElement) await gm.importLibrary?.('marker');
      return new MapHandle(el, opts, new GoogleMapView(gm, el, opts));
    } catch (err) {
      console.warn('[maps] Không tạo được Google Maps, chuyển sang OpenStreetMap.', err);
    }
  }
  const L = await loadLeaflet();
  return L ? new MapHandle(el, opts, new LeafletMapView(L, el, opts)) : null;
}
