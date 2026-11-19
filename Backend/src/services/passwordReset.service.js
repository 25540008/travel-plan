import crypto from 'node:crypto';
import prisma from '../lib/prisma.js';
import { frontendUrl, sendPasswordResetMail } from '../utils/mailer.js';

// UC 4 · B6, B7: quên mật khẩu. Service chỉ làm việc với dữ liệu, không đụng tới req/res.

export const RESET_TTL_MS = 15 * 60 * 1000; // Link có hiệu lực 15 phút (BR 15)
const MSG_11 = 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu. Link có hiệu lực trong 15 phút.';

export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

/**
 * UC 4 · B6: nếu email tồn tại thì tạo token (32 byte ngẫu nhiên, chỉ lưu SHA-256), hủy token cũ chưa dùng, gửi ET 1.
 * Email không tồn tại thì không làm gì. Luôn trả MSG 11 để không lộ email có tài khoản hay không (BR 16).
 * Email gửi nền: không await, lỗi chỉ ghi log, người dùng vẫn thấy MSG 11.
 */
export async function requestPasswordReset({ email }) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, fullName: true, email: true },
  });

  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt } }),
    ]);

    const link = `${frontendUrl()}/dat-lai-mat-khau.html?token=${token}`;
    try {
      Promise.resolve(sendPasswordResetMail({ to: user.email, fullName: user.fullName, link })).catch((err) => {
        console.error('[mail] Gửi email đặt lại mật khẩu lỗi:', err?.message || err);
      });
    } catch (err) {
      console.error('[mail] Gửi email đặt lại mật khẩu lỗi:', err?.message || err);
    }
  }

  return { code: 'MSG 11', message: MSG_11 };
}
