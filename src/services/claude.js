const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export async function callClaude({ systemPrompt, userText, images = [], model, maxTokens = 2500 }) {
  const content = [];
  for (const img of images) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: img.media_type, data: img.data },
    });
  }
  content.push({ type: 'text', text: userText });

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model || process.env.DEFAULT_MODEL || 'claude-opus-4-8',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw Object.assign(new Error(`Anthropic error ${res.status}: ${errText}`), { status: 502 });
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');
  return { text, usage: data.usage };
}

export function parseModelJson(text) {
  const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}
