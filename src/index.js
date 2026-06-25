import express from 'express';
import { healthRouter } from './routes/health.js';
import { analyzeRouter } from './routes/analyze.js';
import { askRouter } from './routes/ask.js';
import { authenticate } from './middleware/auth.js';
import { limiter } from './middleware/rateLimit.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '20mb' }));
app.use(limiter);

app.use('/v1/health', healthRouter);
app.use('/v1/analyze', authenticate, analyzeRouter);
app.use('/v1/ask', authenticate, askRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Building code agent listening on :${port}`));
