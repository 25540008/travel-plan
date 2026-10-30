// Gọi API: gắn JWT, chuẩn hoá lỗi, 401 → MSG 10 rồi về đăng nhập (CBR 3), lỗi mạng → toast đỏ.
import { API_BASE } from './config.js';
import { MSG } from './messages.js';
import { getToken, clearSession, redirectToLogin } from './auth.js';
import { toast, alertDialog } from './ui.js';

/** Lỗi trả về từ API: status, code ("MSG 7"...), message, errors [{ field, code, message }] */
export class ApiError extends Error {
  constructor(status, body = {}) {
    super(body.message || MSG[body.code] || MSG.SERVER_ERROR);
    this.status = status;
    this.code = body.code;
    this.errors = body.errors || [];
  }
}

let sessionExpiredShown = false;

async function handleUnauthorized() {
  clearSession();
  if (sessionExpiredShown) return;
  sessionExpiredShown = true;
  await alertDialog(MSG['MSG 10']);
  redirectToLogin();
}

/**
 * api('/trips'), api('/trips', { method: 'POST', body: {...} })
 * Thành công trả dữ liệu JSON; lỗi ném ApiError (trừ 401 đã được xử lý chung).
 * Tuỳ chọn: auth (mặc định true, gắn token nếu có), silent (không tự hiện toast lỗi mạng/500).
 */
export async function api(path, { method = 'GET', body, auth = true, silent = false, headers = {} } = {}) {
  const token = auth ? getToken() : null;
  const isForm = body instanceof FormData;
  const opts = {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  };

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, opts);
  } catch {
    if (!silent) toast(MSG.NETWORK, 'error');
    throw new ApiError(0, { code: 'NETWORK', message: MSG.NETWORK });
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.ok) return data;

  // Có gửi token mà bị 401 → phiên hết hạn. Không có token (ví dụ sai mật khẩu ở form đăng nhập) để trang tự xử lý.
  if (res.status === 401 && token) {
    await handleUnauthorized();
  }
  const err = new ApiError(res.status, data || {});
  if (res.status >= 500 && !silent) toast(err.message, 'error');
  throw err;
}

export const get = (path, opts) => api(path, { ...opts, method: 'GET' });
export const post = (path, body, opts) => api(path, { ...opts, method: 'POST', body });
export const put = (path, body, opts) => api(path, { ...opts, method: 'PUT', body });
export const del = (path, opts) => api(path, { ...opts, method: 'DELETE' });
