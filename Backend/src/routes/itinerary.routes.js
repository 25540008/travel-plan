import express from 'express';
import * as itineraryController from '../controllers/itinerary.controller.js';
import { validate } from '../middlewares/validate.js';
import { auth as authMiddleware } from '../middlewares/auth.js';
import {
  weatherSchema,
  getItinerarySchema,
  createItinerarySchema,
  updateItinerarySchema,
  deleteItinerarySchema,
} from '../middlewares/itinerary.validation.js';

const router = express.Router();

// GET /api/public/weather?lat=&lng=&days=
router.get(
  '/public/weather',
  validate(weatherSchema),
  itineraryController.getWeather
);

// GET & POST /api/trips/:id/itinerary
router.get(
  '/trips/:id/itinerary',
  authMiddleware,
  validate(getItinerarySchema),
  itineraryController.getItinerary
);

router.post(
  '/trips/:id/itinerary',
  authMiddleware,
  validate(createItinerarySchema),
  itineraryController.createItineraryItem
);

// PUT & DELETE /api/trips/:id/itinerary/:itemId
router.put(
  '/trips/:id/itinerary/:itemId',
  authMiddleware,
  validate(updateItinerarySchema),
  itineraryController.updateItineraryItem
);

router.delete(
  '/trips/:id/itinerary/:itemId',
  authMiddleware,
  validate(deleteItinerarySchema),
  itineraryController.deleteItineraryItem
);

export default router;