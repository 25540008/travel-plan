import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
import { signToken } from '../utils/jwt.js';

// Service chỉ làm việc với dữ liệu (Prisma, bcrypt, JWT), không đụng tới req/res.

const BCRYPT_COST = 10; // NFR 3

// Băm giả để đăng nhập với email không tồn tại tốn thời gian tương đương (không lộ email có tài khoản hay không).
const DUMMY_HASH = bcrypt.hashSync('khong-phai-mat-khau-that', BCRYPT_COST);

const userSelect = { id: true, fullName: true, email: true, role: true, createdAt: true };

const toPublicUser = ({ id, fullName, email, role, createdAt }) => ({ id, fullName, email, role, createdAt });

/** So email không phân biệt hoa thường (UC 1 · B5). */
const findByEmail = (email) =>
  prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

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

function emailTaken() {
  return new AppError(409, 'MSG 7');
}
