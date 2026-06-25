import { callClaude, parseModelJson } from './claude.js';

const EXTRACTION_PROMPT = `You are a building document fact extractor.
Given any images and/or text, extract structured facts relevant to a building code question.
Return ONLY a JSON object:
{
  "extracted_facts": {
    "<fact_name>": "<value>"
  }
}
Include only facts you can clearly read. Do not invent values.`;

export async function extractFacts({ text, images, model }) {
  if (!images?.length && !text) return {};
  const userText = text
    ? `Extract building code relevant facts from the following:\n${text}`
    : 'Extract building code relevant facts from the attached images.';

  const { text: raw } = await callClaude({
    systemPrompt: EXTRACTION_PROMPT,
    userText,
    images,
    model: model || process.env.EXTRACTION_MODEL || 'claude-haiku-4-5',
    maxTokens: 800,
  });

  try {
    const parsed = parseModelJson(raw);
    return parsed.extracted_facts || {};
  } catch {
    return {};
  }
}
