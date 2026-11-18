import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
import { signToken } from '../utils/jwt.js';
import crypto from 'node:crypto';
import { MSG } from '../utils/messages.js';

// Service chỉ làm việc với dữ liệu (Prisma, bcrypt, JWT), không đụng tới req/res.

const BCRYPT_COST = 10; // NFR 3
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 phút (UC 4 · B6)

// Băm giả để đăng nhập với email không tồn tại tốn thời gian tương đương (không lộ email có tài khoản hay không).
const DUMMY_HASH = bcrypt.hashSync('khong-phai-mat-khau-that', BCRYPT_COST);

const userSelect = { id: true, fullName: true, email: true, role: true, createdAt: true };

const toPublicUser = ({ id, fullName, email, role, createdAt }) => ({ id, fullName, email, role, createdAt });

/** So email không phân biệt hoa thường (UC 1 · B5). */
const findByEmail = (email) =>
  prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

const hashResetToken = (rawToken) =>
  crypto.createHash('sha256').update(String(rawToken)).digest('hex');

/** UC 1 · B5, B6: kiểm tra trùng email, băm mật khẩu, tạo user, cấp JWT. */
export async function register({ fullName, email, password }) {
  if (await findByEmail(email)) throw emailTaken();

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  let user;
  try {
    user = await prisma.user.create({ data: { fullName, email, passwordHash }, select: userSelect });
  } catch (err) {
    // Hai yêu cầu đăng ký cùng email chạy song song: ràng buộc unique của DB chặn bản thứ hai.
    if (err?.code === 'P2002') throw emailTaken();
    throw err;
  }
  return { token: signToken(user), user: toPublicUser(user) };
}

/** UC 2 · B6, B7: sai email hoặc sai mật khẩu đều trả MSG 6, không nói rõ cái nào sai. */
export async function login({ email, password }) {
  const user = await findByEmail(email);
  const matched = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !matched) throw new AppError(401, 'MSG 6');
  return { token: signToken(user), user: toPublicUser(user) };
}

/** GET /api/auth/me: tài khoản đã bị xoá nhưng token còn hạn → coi như hết phiên (401). */
export async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
  if (!user) throw AppError.unauthorized();
  return toPublicUser(user);
}

export async function forgotPassword(email, { onSendResetEmail } = {}) {
  const user = await findByEmail(email);
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MS);

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    if (typeof onSendResetEmail === 'function') {
      Promise.resolve()
        .then(() => onSendResetEmail({ user: toPublicUser(user), rawToken, expiresAt }))
        .catch((err) => console.error('[TP-11] Lỗi callback gửi email:', err));
    }
  }

  return {
    code: 'MSG 11',
    message: MSG['MSG 11'],
  };
}

export async function resetPassword({ token, password }) {
  const tokenHash = hashResetToken(token);
  const now = new Date();

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.usedAt !== null || record.expiresAt <= now) {
    throw AppError.badRequest('MSG 12', MSG['MSG 12']);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count === 0) {
      throw AppError.badRequest('MSG 12', MSG['MSG 12']);
    }
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
  });

  return {
    code: 'MSG 13',
    message: MSG['MSG 13'],
  };
}

function emailTaken() {
  return new AppError(409, 'MSG 7');
}
