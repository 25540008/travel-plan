import * as cloneService from '../services/clone.service.js';

export async function cloneTrip(req, res, next) {
  try {
    const { id } = req.valid.params;
    const startDate = req.valid.body?.startDate;
    const result = await cloneService.cloneTrip(id, req.user.id, startDate);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTrendingDestinations(req, res, next) {
  try {
    const result = await cloneService.getTrendingDestinations();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}