import { Router } from 'express';
import { env } from '../config/env.js';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import tripRoutes from './trip.routes.js';
import tripCoverRoutes from './tripCover.routes.js';
import exampleRoutes from './example.routes.js';
import devRoutes from './dev.routes.js';
import itineraryRoutes from './itinerary.routes.js';
import publicItineraryRoutes from './publicItineraries.routes.js';
import publicRoutes from './public.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/trips/:id/cover', tripCoverRoutes);
router.use('/trips', tripRoutes);

// Gắn router của từng module tại đây, giữ đúng đường dẫn trong SRS mục 8.4, ví dụ:
// router.use('/trips', tripRoutes);
router.use('/', itineraryRoutes);
router.use('/public/itineraries', publicItineraryRoutes);
router.use('/public', publicRoutes);

if (!env.isProd) {
  router.use('/_example', exampleRoutes);
  router.use('/dev', devRoutes);
}

export default router;
