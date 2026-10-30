import * as authService from '../services/auth.service.js';

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
