import 'dotenv/config';
import path from 'node:path';

const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
  throw new Error('Thiếu biến môi trường JWT_SECRET');
}

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-doi-truoc-khi-deploy',
  // Thư mục lưu ảnh bìa tải lên (UC 17). Trên Render đĩa tạm sẽ mất khi deploy lại, cần gắn Disk hoặc dùng dịch vụ lưu ảnh.
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  // Danh sách origin cách nhau bởi dấu phẩy; để trống = cho phép mọi origin (chỉ nên dùng khi dev).
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
