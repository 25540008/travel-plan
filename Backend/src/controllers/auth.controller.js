import * as authService from '../services/auth.service.js';
import { frontendUrl, sendPasswordResetMail } from '../utils/mailer.js';

// Controller đọc req.user / req.valid, gọi service, trả dữ liệu trực tiếp (không bọc { data }).

export async function register(req, res) {
  const { fullName, email, password } = req.valid.body;
  res.status(201).json(await authService.register({ fullName, email, password }));
}

export async function login(req, res) {
  res.json(await authService.login(req.valid.body));
}

export async function me(req, res) {
  res.json(await authService.getMe(req.user.id));
}

// UC 4 · B6 (TP-12): gửi ET 1 chứa link đặt lại mật khẩu. Service gọi callback ở nền, lỗi SMTP chỉ ghi log.
const sendResetEmail = ({ user, rawToken }) =>
  sendPasswordResetMail({
    to: user.email,
    fullName: user.fullName,
    link: `${frontendUrl()}/dat-lai-mat-khau.html?token=${rawToken}`,
  });

export async function forgotPassword(req, res) {
  res.json(await authService.forgotPassword(req.valid.body.email, { onSendResetEmail: sendResetEmail }));
}

export async function resetPassword(req, res) {
  const { token, password } = req.valid.body;
  res.json(await authService.resetPassword({ token, password }));
}
