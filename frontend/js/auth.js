// Lưu phiên đăng nhập và chuyển hướng theo CBR 3.
import { pageUrl } from './config.js';

const TOKEN_KEY = 'tp_token';
const USER_KEY = 'tp_user';

// UC 2 · BR 9: tick [Ghi nhớ đăng nhập] → localStorage, không tick → sessionStorage (mất khi đóng trình duyệt).
const read = (key) => localStorage.getItem(key) ?? sessionStorage.getItem(key);

export const getToken = () => read(TOKEN_KEY);

export function getUser() {
  try {
    return JSON.parse(read(USER_KEY));
  } catch {
    return null;
  }
}

export const isLoggedIn = () => Boolean(getToken());

/** Gọi sau khi đăng nhập/đăng ký: saveSession(res.token, res.user, { remember }). Mặc định lưu localStorage (UC 1 · BR 4). */
export function saveSession(token, user, { remember = true } = {}) {
  clearSession();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(user));
}

/** Cập nhật thông tin user (ví dụ sau GET /api/auth/me) ở đúng nơi đang giữ token. */
export function updateUser(user) {
  const store = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
  store.setItem(USER_KEY, JSON.stringify(user));
}

/** UC 3 · BR 11: xoá token ở cả localStorage và sessionStorage. */
export function clearSession() {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(TOKEN_KEY);
    store.removeItem(USER_KEY);
  }
}

/** next chỉ nhận đường dẫn nội bộ bắt đầu bằng "/" (không nhận "//evil.com"). */
export function safeNext(next) {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

const currentPath = () => location.pathname + location.search;

/** Sang Screen 10, mang theo trang hiện tại và thao tác đang làm (action, id). */
export function redirectToLogin({ action, id } = {}) {
  const params = { next: currentPath() };
  if (action) params.action = action;
  if (id) params.id = id;
  location.href = pageUrl('login', params);
}

/** Đặt đầu trang "Cần đăng nhập": khách sẽ bị đưa tới Screen 10. Trả true nếu đã đăng nhập. */
export function requireLogin(opts) {
  if (isLoggedIn()) return true;
  redirectToLogin(opts);
  return false;
}

/** Đặt đầu Screen 10, 11: đã đăng nhập thì sang Screen 5. */
export function redirectIfLoggedIn() {
  if (isLoggedIn()) location.replace(pageUrl('myTrips'));
}

/** Sau khi đăng nhập/đăng ký: về trang next (kèm action, id để trang đó tự làm tiếp), không có thì Screen 5. */
export function goAfterLogin() {
  const q = new URLSearchParams(location.search);
  const next = safeNext(q.get('next'));
  if (!next) return location.replace(pageUrl('myTrips'));
  const url = new URL(next, location.origin);
  for (const key of ['action', 'id']) if (q.get(key)) url.searchParams.set(key, q.get(key));
  location.replace(url.pathname + url.search);
}

/** Trên trang next: đọc thao tác đang chờ rồi xoá khỏi URL. Trả { action, id } hoặc null. */
export function takePendingAction() {
  const url = new URL(location.href);
  const action = url.searchParams.get('action');
  if (!action) return null;
  const id = url.searchParams.get('id');
  url.searchParams.delete('action');
  url.searchParams.delete('id');
  history.replaceState(null, '', url.pathname + url.search);
  return { action, id };
}
