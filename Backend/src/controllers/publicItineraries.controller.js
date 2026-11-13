import * as service from '../services/publicItineraries.service.js';

export async function list(req, res) {
  res.json(await service.listPublicItineraries(req.valid.query));
}
