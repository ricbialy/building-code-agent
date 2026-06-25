import { Router } from 'express';
import { analyzeSchema } from '../validation/schemas.js';
import { runAnalysisPipeline } from '../services/pipeline.js';

export const analyzeRouter = Router();

analyzeRouter.post('/', async (req, res, next) => {
  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }

  try {
    const response = await runAnalysisPipeline(parsed.data);
    res.json(response);
  } catch (err) {
    if (err.status === 502) return res.status(502).json({ error: 'Upstream model error' });
    next(err);
  }
});
