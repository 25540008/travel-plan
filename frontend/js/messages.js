// Bảng thông báo dùng chung (SRS 8.1), giống Backend/src/utils/messages.js.
export const MSG = {
  'MSG 1': 'Vui lòng nhập email.',
  'MSG 2': 'Vui lòng nhập mật khẩu.',
  'MSG 3': 'Giá trị không đúng định dạng.',
  'MSG 4': 'Mật khẩu phải từ 6 đến 100 ký tự.',
  'MSG 5': 'Mật khẩu nhập lại không khớp.',
  'MSG 6': 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.',
  'MSG 7': 'Email này đã có tài khoản. Đăng nhập luôn?',
  'MSG 8': 'Giờ kết thúc phải sau giờ bắt đầu.',
  'MSG 9': 'Bạn thử quá nhiều lần. Vui lòng thử lại sau 15 phút.',
  'MSG 10': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'MSG 11': 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu. Link có hiệu lực trong 15 phút.',
  'MSG 12': 'Link đặt lại mật khẩu đã hết hạn hoặc đã được dùng.',
  'MSG 13': 'Đã đổi mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.',
  'MSG 14': 'Chưa có lịch trình phù hợp. Bạn có muốn tự lên kế hoạch?',
  'MSG 15': 'Bạn chưa có chuyến đi nào. Tạo chuyến đầu tiên nhé!',
  'MSG 16': 'Ảnh phải là JPG, PNG hoặc WebP và không quá 5 MB.',
  'MSG 17': 'Đã chép link chia sẻ.',
  'MSG 18': 'Chưa lưu được, thử lại nhé.',
  'MSG 19': 'Đã xóa chuyến đi.',
  'MSG 20': 'Tạo tài khoản thành công. Chào mừng bạn đến với Travelplan!',
  'MSG 21': 'Đã thêm hoạt động.',
  'MSG 22': 'Đã tạo chuyến đi.',
  'MSG 25': 'Bạn có muốn bỏ các thay đổi chưa lưu?',
  'MSG 26': 'Bạn có chắc muốn đăng xuất?',
  'MSG 27': 'Bạn có chắc muốn xóa mục này?',
  'MSG 31': 'Đã tạo bản sao, bạn có thể sửa thoải mái.',
  'MSG 32': 'Ngày về phải bằng hoặc sau ngày đi.',
  'MSG 33': 'Ngân sách phải lớn hơn 0.',
  'MSG 34': 'Đã lưu thay đổi.',
  NETWORK: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
  SERVER_ERROR: 'Hệ thống đang bận, vui lòng thử lại sau.',
};

/** Thông báo có tham số: msg('MSG 24', { name: 'Đà Lạt', x: 3, y: 2 }) */
export function msg(code, p = {}) {
  switch (code) {
    case 'MSG 23': return `Có ${p.x} hoạt động nằm ngoài ngày mới, đã chuyển vào nhóm Ngoài lịch.`;
    case 'MSG 24': return `Xóa chuyến "${p.name}"? ${p.x} hoạt động và ${p.y} khoản chi sẽ bị xóa vĩnh viễn.`;
    case 'MSG 28': return `Khoản này làm vượt ngân sách ${p.x}đ. Vẫn lưu?`;
    case 'MSG 29': return `Vui lòng nhập ${String(p.label).toLowerCase()}.`;
    case 'MSG 30': return `${p.label} tối đa ${p.max} ký tự.`;
    default: return MSG[code] || code;
  }
}
