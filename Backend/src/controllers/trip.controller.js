import * as tripService from '../services/trip.service.js';

// Controller đọc req.user / req.valid, gọi service, trả dữ liệu trực tiếp (không bọc { data }).

export async function list(req, res) {
  res.json(await tripService.listMyTrips(req.user.id, req.valid.query));
}

export async function create(req, res) {
  res.status(201).json(await tripService.createTrip(req.user.id, req.valid.body));
}

export async function detail(req, res) {
  res.json(await tripService.getMyTrip(req.user.id, req.valid.params.id));
}

export async function update(req, res) {
  res.json(await tripService.updateTrip(req.user.id, req.valid.params.id, req.valid.body));
}

export async function remove(req, res) {
  await tripService.deleteTrip(req.user.id, req.valid.params.id);
  res.status(204).end();
}
