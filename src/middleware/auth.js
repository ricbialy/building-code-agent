export function authenticate(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Missing Authorization header' });
  const keys = (process.env.SERVICE_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);
  if (!keys.includes(token)) return res.status(401).json({ error: 'Invalid API key' });
  next();
}
