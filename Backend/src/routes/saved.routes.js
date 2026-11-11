import express from 'express';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import * as controller from '../controllers/saved.controller.js';
import {
  saveItemBodySchema,
  deleteSavedItemSchema,
  getSavedItemsSchema,
} from '../middlewares/saved.validation.js';

const router = express.Router();

// GET /api/me/saved
router.get(
  '/',
  auth,
  validate(getSavedItemsSchema),
  controller.getSaved
);

// POST /api/me/saved
router.post(
  '/',
  auth,
  validate(saveItemBodySchema),
  controller.toggleSave
);

// DELETE /api/me/saved
router.delete(
  '/',
  auth,
  validate(deleteSavedItemSchema),
  controller.removeSave
);

export default router;