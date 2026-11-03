import * as coverService from '../services/tripCover.service.js';

export async function setCover(req, res) {
  res.json(await coverService.setCover(req.user.id, req.valid.params.id, req.valid.body));
}

export async function upload(req, res) {
  res.json(await coverService.uploadCover(req.user.id, req.valid.params.id, { buffer: req.file.buffer, ext: req.imageType.ext }));
}
