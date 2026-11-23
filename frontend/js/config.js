// Cấu hình chung của frontend. Đổi API_PROD khi đã có địa chỉ backend trên Render.
const API_PROD = 'https://travelplan-api.onrender.com/api';
const isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);

export const API_BASE = window.TRAVELPLAN_API_BASE || (isLocal ? 'http://localhost:3000/api' : API_PROD);

// Google Maps (bản đồ Screen 4, 6, 7 và tìm địa điểm Screen 6, 8). Để trống → dùng OpenStreetMap + Nominatim như cũ.
// Key trình duyệt lấy ở Google Cloud Console, bật "Maps JavaScript API" và "Places API (New)",
// giới hạn key theo HTTP referrer (localhost, domain Render) vì key này lộ ra phía trình duyệt.
// Có thể đặt tạm không sửa file: <script>window.TRAVELPLAN_GOOGLE_MAPS_KEY = '...'</script> trước các script module.
export const GOOGLE_MAPS_API_KEY = window.TRAVELPLAN_GOOGLE_MAPS_KEY || '';
// Map ID (Google Cloud → Map Management) cho marker kiểu mới; 'DEMO_MAP_ID' dùng được khi phát triển.
export const GOOGLE_MAPS_MAP_ID = window.TRAVELPLAN_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

// Tên file của từng màn hình. Trang mới thêm vào đây để header, chuyển hướng dùng chung.
export const PAGES = {
  home: 'index.html',                    // Screen 1
  templates: 'lich-trinh-mau.html',      // Screen 2
  destinations: 'diem-den.html',         // Screen 3
  destinationDetail: 'diem-den-chi-tiet.html', // Screen 4 (?slug=)
  myTrips: 'chuyen-di-cua-toi.html',     // Screen 5
  createTrip: 'tao-chuyen.html',         // Screen 6
  trip: 'chuyen-di.html',                // Screen 7, 9 (?id=)
  share: 'chia-se.html',                 // Link chia sẻ công khai (UC 18, ?id=)
  login: 'dang-nhap.html',               // Screen 10
  register: 'dang-ky.html',              // Screen 11
  forgotPassword: 'quen-mat-khau.html',  // Screen 12
  resetPassword: 'dat-lai-mat-khau.html',
};

/**
 * Link tới một màn hình, ví dụ pageUrl('trip', { id: 3 }) → "chuyen-di.html?id=3".
 * Link tương đối (mọi trang nằm cùng thư mục frontend/) nên chạy được cả ở gốc site lẫn thư mục con như XAMPP htdocs.
 */
export function pageUrl(name, params) {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  return `${PAGES[name]}${qs}`;
}
