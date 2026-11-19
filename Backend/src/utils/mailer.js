import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Gửi email qua SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS). Dùng Gmail App Password hoặc Brevo đều được.
// Hàm gửi trả Promise; nơi gọi KHÔNG await trong route và phải .catch để ghi log (SRS 7 · Máy chủ SMTP).

let transporter;

function getTransporter() {
  if (!process.env.SMTP_HOST) throw new Error('Chưa cấu hình SMTP_HOST, không gửi được email.');
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Địa chỉ frontend để dựng link trong email. Ưu tiên FRONTEND_URL, rồi origin CORS đầu tiên. */
export function frontendUrl() {
  const base = process.env.FRONTEND_URL || env.corsOrigins[0] || 'http://localhost:8080';
  return base.replace(/\/+$/, '');
}

/** ET 1 (SRS 8.2): nội dung HTML và text của email đặt lại mật khẩu. */
export function buildPasswordResetEmail({ fullName, link }) {
  const name = fullName || 'bạn';
  const subject = '[Travelplan] Đặt lại mật khẩu của bạn';
  const text = [
    `Chào ${name},`,
    '',
    'Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Travelplan.',
    `Bấm vào đây để đặt mật khẩu mới: ${link}`,
    'Link có hiệu lực trong 15 phút và chỉ dùng được một lần.',
    'Nếu bạn không yêu cầu, hãy bỏ qua email này; mật khẩu của bạn vẫn giữ nguyên.',
    '',
    'Thân mến,',
    'Travelplan',
    '',
    'Đây là email tự động, vui lòng không trả lời.',
  ].join('\n');
  const html = `<!doctype html>
<html lang="vi"><body style="margin:0;padding:24px;background:#f4f5f0;font-family:Arial,Helvetica,sans-serif;color:#10302e">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
    <p style="margin:0 0 16px">Chào ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px">Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Travelplan.</p>
    <p style="margin:0 0 24px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#d9512c;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">Đặt mật khẩu mới</a></p>
    <p style="margin:0 0 16px">Nút có hiệu lực trong <strong>15 phút</strong> và chỉ dùng được một lần.</p>
    <p style="margin:0 0 16px">Nếu bạn không yêu cầu, hãy bỏ qua email này; mật khẩu của bạn vẫn giữ nguyên.</p>
    <p style="margin:0 0 16px">Thân mến,<br>Travelplan</p>
    <p style="margin:0;font-size:12px;color:#6b7a78">Đây là email tự động, vui lòng không trả lời.</p>
  </div>
</body></html>`;
  return { subject, text, html };
}

/** Gửi ET 1 tới người dùng. Ném lỗi khi SMTP lỗi; nơi gọi bắt bằng .catch. */
export async function sendPasswordResetMail({ to, fullName, link }) {
  const { subject, text, html } = buildPasswordResetEmail({ fullName, link });
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@travelplan.vn';
  await getTransporter().sendMail({ from: `Travelplan <${from}>`, to, subject, text, html });
}
