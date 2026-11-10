import * as tripService from '../services/trip1.service.js';

export async function getTrip(req, res, next) {
  try {
    const trip = await tripService.getTripById(req.user.id, req.params.id);
    return res.status(200).json(trip);
  } catch (err) {
    next(err);
  }
}

export async function updateTrip(req, res, next) {
  try {
    const updated = await tripService.updateTrip(req.user.id, req.params.id, req.body);
    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteTrip(req, res, next) {
  try {
    const result = await tripService.deleteTrip(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}