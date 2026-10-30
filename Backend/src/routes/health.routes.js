import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// Render health check gọi đường này, nên không phụ thuộc database.
router.get('/', (req, res) => res.json({ status: 'ok' }));

// Kiểm tra kết nối PostgreSQL
router.get('/db', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', database: 'up' });
});

export default router;
