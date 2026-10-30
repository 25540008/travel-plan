import { MSG } from './messages.js';

/**
 * Lỗi nghiệp vụ trả về cho frontend dạng { code, message, errors? }.
 * Ví dụ: throw new AppError(409, 'MSG 7') hoặc AppError.notFound().
 */
export class AppError extends Error {
  constructor(status, code, message, errors) {
    super(message || MSG[code] || code);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }

  static badRequest(code = 'MSG 3', message, errors) {
    return new AppError(400, code, message, errors);
  }

  static unauthorized() {
    return new AppError(401, 'MSG 10');
  }

  static forbidden() {
    return new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
  }

  // CBR 8: dữ liệu không thuộc người dùng cũng trả 404 để không lộ là có tồn tại.
  static notFound(message = 'Không tìm thấy dữ liệu.') {
    return new AppError(404, 'NOT_FOUND', message);
  }
}
