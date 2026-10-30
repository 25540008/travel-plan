// Cấu hình chung của frontend. Đổi API_PROD khi đã có địa chỉ backend trên Render.
const API_PROD = 'https://travelplan-api.onrender.com/api';
const isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);

export const API_BASE = window.TRAVELPLAN_API_BASE || (isLocal ? 'http://localhost:3000/api' : API_PROD);

// Tên file của từng màn hình. Trang mới thêm vào đây để header, chuyển hướng dùng chung.
export const PAGES = {
  home: 'index.html',                    // Screen 1
  templates: 'lich-trinh-mau.html',      // Screen 2
  destinations: 'diem-den.html',         // Screen 3
  destinationDetail: 'diem-den-chi-tiet.html', // Screen 4 (?slug=)
  myTrips: 'chuyen-di-cua-toi.html',     // Screen 5
  createTrip: 'tao-chuyen.html',         // Screen 6
  trip: 'chuyen-di.html',                // Screen 7, 9 (?id=)
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
