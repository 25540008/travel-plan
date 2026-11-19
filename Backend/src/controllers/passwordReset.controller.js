import * as passwordResetService from '../services/passwordReset.service.js';

export async function forgotPassword(req, res) {
  res.json(await passwordResetService.requestPasswordReset(req.valid.body));
}
