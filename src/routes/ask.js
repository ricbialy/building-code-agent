import { Router } from 'express';
import { askSchema } from '../validation/schemas.js';
import { extractFacts } from '../services/extraction.js';
import { runAnalysisPipeline } from '../services/pipeline.js';

export const askRouter = Router();

askRouter.post('/', async (req, res, next) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }

  const { jurisdiction, question, images, mode, options } = parsed.data;

  try {
    // Extract structured facts from the freeform question text + images
    const extractedFacts = await extractFacts({
      text: question,
      images,
      model: options.model || process.env.EXTRACTION_MODEL,
    });

    const response = await runAnalysisPipeline({
      jurisdiction,
      question,
      facts: extractedFacts,
      images,
      mode,
      options,
    });

    res.json(response);
  } catch (err) {
    if (err.status === 502) return res.status(502).json({ error: 'Upstream model error' });
    next(err);
  }
});
