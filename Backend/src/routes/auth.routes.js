// UC 1 Đăng ký, UC 2 Đăng nhập, GET /me. UC 3 Đăng xuất chỉ xoá token ở client (JWT không lưu phía server).
import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { loginLimiter } from '../middlewares/rateLimit.js';
import { requiredText, email } from '../utils/validators.js';
import * as controller from '../controllers/auth.controller.js';

const router = Router();

// Message có dạng "<mã MSG>|<nội dung>" để middleware validate tách ra code và message.
const m = (code, text) => `${code}|${text}`;
const lower = (s) => s.toLowerCase();

const passwordField = z
  .string({ error: m('MSG 29', 'Vui lòng nhập mật khẩu.') })
  .min(1, m('MSG 29', 'Vui lòng nhập mật khẩu.'))
  .pipe(z.string().min(6, m('MSG 4', 'Mật khẩu phải từ 6 đến 100 ký tự.')).max(100, m('MSG 4', 'Mật khẩu phải từ 6 đến 100 ký tự.')));

// UC 1 · B4: CBR 1 + các quy tắc riêng. Mật khẩu không trim; thanh độ mạnh chỉ gợi ý nên không chặn ở đây.
const registerSchema = z
  .object({
    fullName: requiredText('Họ và tên', 100),
    email: email('Email').transform(lower),
    password: passwordField,
    confirmPassword: z.string({ error: m('MSG 29', 'Vui lòng nhập lại mật khẩu.') }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    error: m('MSG 5', 'Mật khẩu nhập lại không khớp.'),
    // Vẫn báo MSG 5 khi ô khác có lỗi, miễn là hai ô mật khẩu đều là chuỗi hợp lệ về kiểu.
    when: ({ value, issues }) =>
      typeof value?.password === 'string' &&
      typeof value?.confirmPassword === 'string' &&
      !issues.some((i) => i.path[0] === 'confirmPassword'),
  });

// UC 2 · B4: chỉ kiểm tra trống (MSG 1, MSG 2); sai định dạng email cũng chỉ ra MSG 6 ở bước xác thực.
const loginSchema = z.object({
  email: z
    .string({ error: m('MSG 1', 'Vui lòng nhập email.') })
    .trim()
    .min(1, m('MSG 1', 'Vui lòng nhập email.'))
    .transform(lower),
  password: z
    .string({ error: m('MSG 2', 'Vui lòng nhập mật khẩu.') })
    .min(1, m('MSG 2', 'Vui lòng nhập mật khẩu.')),
});

router.post('/register', validate({ body: registerSchema }), controller.register);
router.post('/login', validate({ body: loginSchema }), loginLimiter, controller.login);
router.get('/me', auth, controller.me);

export default router;
