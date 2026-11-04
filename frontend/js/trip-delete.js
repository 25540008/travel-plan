// UC 16 Xóa chuyến đi: popup MSG 24 → DELETE /api/trips/:id → quay về Screen 5 kèm MSG 19.
// Nút thùng rác ở Screen 7 gọi deleteTrip(trip, số hoạt động).
import { pageUrl } from './config.js';
import { get, del } from './api.js';
import { msg } from './messages.js';
import { toast, confirmDialog } from './ui.js';
import { itemCount, expenseCount } from './trip-utils.js';

const FLASH_KEY = 'tp_flash';

/** Trả về false nếu người dùng bấm Hủy hoặc xoá lỗi; xoá xong thì chuyển trang luôn. */
export async function deleteTrip(trip, items = itemCount(trip)) {
  let expenses = expenseCount(trip);
  // Chi tiết chuyến chưa kèm số khoản chi thì hỏi API ngân sách; lỗi thì coi như 0.
  if (trip._count?.expenses == null && trip.expenseCount == null && !trip.expenses) {
    expenses = await get(`/trips/${trip.id}/expenses`, { silent: true })
      .then((list) => list?.length ?? 0)
      .catch(() => 0);
  }
  const ok = await confirmDialog(msg('MSG 24', { name: trip.title, x: items, y: expenses }), { okText: 'Xóa', danger: true });
  if (!ok) return false;
  try {
    await del(`/trips/${trip.id}`);
    sessionStorage.setItem(FLASH_KEY, msg('MSG 19'));
    location.href = pageUrl('myTrips');
    return true;
  } catch (err) {
    // 401 và lỗi mạng/5xx đã được api.js xử lý (chuyển đăng nhập / toast chung).
    if (err.status !== 401 && err.status > 0 && err.status < 500) toast(err.message, 'error');
    return false;
  }
}

/** Screen 5 gọi khi mở trang: hiện MSG 19 nếu vừa xoá chuyến. */
export function showDeletedFlash() {
  const text = sessionStorage.getItem(FLASH_KEY);
  if (!text) return;
  sessionStorage.removeItem(FLASH_KEY);
  toast(text, 'success');
}
