import * as itineraryService from '../services/itinerary.service.js';

export async function getWeather(req, res, next) {
  try {
    const lat = req.valid?.query?.lat || req.query.lat;
    const lng = req.valid?.query?.lng || req.query.lng;
    const days = req.valid?.query?.days || req.query.days;
    const weather = await itineraryService.getWeather(lat, lng, days);
    return res.status(200).json(weather);
  } catch (err) {
    if (err.status === 502) {
      return res.status(502).json({ error: 'Service Unavailable' });
    }
    next(err);
  }
}

export async function getItinerary(req, res, next) {
  try {
    const id = req.params.id;
    const day = req.valid?.query?.day || req.query.day;
    const items = await itineraryService.getTripItinerary(id, req.user.id, day);
    return res.status(200).json({ items });
  } catch (err) {
    next(err);
  }
}

export async function createItineraryItem(req, res, next) {
  try {
    const id = req.params.id;
    const itemData = req.valid?.body || req.body;
    const created = await itineraryService.addItineraryItem(id, req.user.id, itemData);
    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function updateItineraryItem(req, res, next) {
  try {
    const id = req.params.id;
    const itemId = req.params.itemId;
    const updateData = req.valid?.body || req.body;
    const updated = await itineraryService.updateItineraryItem(id, itemId, req.user.id, updateData);
    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteItineraryItem(req, res, next) {
  try {
    const id = req.params.id;
    const itemId = req.params.itemId;
    await itineraryService.deleteItineraryItem(id, itemId, req.user.id);
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}