// Bảng thông báo dùng chung (SRS 8.1). Frontend có bản sao trong frontend/js/messages.js.
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
  'MSG 12': 'Link đặt lại mật khẩu đã hết hạn hoặc đã được dùng.',
  'MSG 16': 'Ảnh phải là JPG, PNG hoặc WebP và không quá 5 MB.',
  'MSG 32': 'Ngày về phải bằng hoặc sau ngày đi.',
  'MSG 33': 'Ngân sách phải lớn hơn 0.',
};

/** MSG 29: "Vui lòng nhập <tên trường>." */
export const required = (label) => `Vui lòng nhập ${label.toLowerCase()}.`;

/** MSG 30: "<Tên trường> tối đa <n> ký tự." */
export const tooLong = (label, max) => `${label} tối đa ${max} ký tự.`;
