import { Router } from 'express';
import { askGemini } from '../services/gemini.js';

const router = Router();

// Kiểm tra Gemini (cần GEMINI_API_KEY trong .env)
router.post('/gemini-test', async (req, res) => {
  const text = await askGemini(req.body?.prompt || 'Xin chào');
  res.json({ text });
});

export default router;
