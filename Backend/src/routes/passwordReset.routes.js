// UC 4 Quên mật khẩu: POST /api/auth/forgot-password (gắn cùng tiền tố /auth với auth.routes.js).
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { forgotPasswordLimiter } from '../middlewares/forgotPasswordLimiter.js';
import { email } from '../utils/validators.js';
import * as controller from '../controllers/passwordReset.controller.js';

const router = Router();

// UC 4 · B4: email bắt buộc (MSG 29) và đúng định dạng (MSG 3). So email không phân biệt hoa thường.
const forgotPasswordSchema = z.object({
  email: email('Email').transform((s) => s.toLowerCase()),
});

router.post('/forgot-password', validate({ body: forgotPasswordSchema }), forgotPasswordLimiter, controller.forgotPassword);

export default router;
