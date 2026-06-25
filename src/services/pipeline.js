import { v4 as uuidv4 } from 'uuid';
import { callClaude, parseModelJson } from './claude.js';
import { extractFacts } from './extraction.js';
import { resolveEdition } from './editions.js';
import { retrieveCodeChunks } from './retrieval.js';
import { SYSTEM_PROMPT } from '../prompts/system.js';

const DISCLAIMER =
  'Advisory only. Not a code determination. Confirm with the Authority Having Jurisdiction and the engineer of record before procurement or construction.';

export async function runAnalysisPipeline({
  jurisdiction,
  code_edition,
  as_of_date,
  question,
  facts = {},
  images = [],
  mode,
  options = {},
}) {
  const requestId = `req_${uuidv4().replace(/-/g, '').slice(0, 20)}`;

  // 1. Resolve code edition
  const { edition, label: editionLabel } = code_edition
    ? { edition: code_edition, label: code_edition }
    : resolveEdition(jurisdiction, as_of_date);

  // 2. Extract facts from images (if any)
  let mergedFacts = { ...facts };
  if (images.length) {
    const imageFacts = await extractFacts({
      images,
      model: options.model || process.env.EXTRACTION_MODEL,
    });
    for (const [k, v] of Object.entries(imageFacts)) {
      if (mergedFacts[k] === undefined || mergedFacts[k] === null) {
        mergedFacts[k] = `${v} (source: image)`;
      }
    }
  }

  // 3. Retrieve code chunks
  const chunks = await retrieveCodeChunks({
    question,
    facts: mergedFacts,
    edition,
    jurisdiction,
  });

  // 4. Build user message
  const userMessage = buildUserMessage({
    jurisdiction,
    editionLabel,
    asOfDate: as_of_date || new Date().toISOString().slice(0, 10),
    mode,
    question,
    facts: mergedFacts,
    chunks,
  });

  // 5. Call Claude (with one JSON-parse retry)
  const modelConfig = {
    systemPrompt: SYSTEM_PROMPT,
    userText: userMessage,
    images,
    model: options.model || process.env.DEFAULT_MODEL || 'claude-opus-4-8',
    maxTokens: options.max_tokens || 2500,
  };

  let parsedModel;
  let usage;

  const { text, usage: u1 } = await callClaude(modelConfig);
  try {
    parsedModel = parseModelJson(text);
    usage = u1;
  } catch {
    // Retry once with stricter instruction
    const { text: text2, usage: u2 } = await callClaude({
      ...modelConfig,
      userText: modelConfig.userText + '\n\nReturn only valid JSON. No prose, no code fences.',
    });
    parsedModel = parseModelJson(text2);
    usage = u2;
  }

  // 6. Build response
  const response = {
    request_id: requestId,
    mode,
    jurisdiction,
    code_edition: editionLabel,
    summary: parsedModel.summary || '',
    answer: parsedModel.answer || '',
    confidence: parsedModel.confidence || { level: 'low', rationale: 'Insufficient information' },
    assumptions: parsedModel.assumptions || [],
    missing_inputs: parsedModel.missing_inputs || [],
    citations: (parsedModel.citations || []).map(c => ({
      section: c.section || '',
      title: c.title || '',
      edition: c.edition || editionLabel,
      effective_date: c.effective_date || '',
      url: c.url || null,
      note: c.note || '',
    })),
    email: mode === 'reviewer_email' ? (parsedModel.email || null) : null,
    memo: mode === 'eor_memo' ? (parsedModel.memo || null) : null,
    disclaimer: DISCLAIMER,
    usage,
  };

  console.log(JSON.stringify({ request_id: requestId, jurisdiction, mode, question, response }));
  return response;
}

function buildUserMessage({ jurisdiction, editionLabel, asOfDate, mode, question, facts, chunks }) {
  const jurisdictionLine = [jurisdiction.city, jurisdiction.county, jurisdiction.state]
    .filter(Boolean).join(', ');

  const factsBlock = Object.entries(facts)
    .map(([k, v]) => {
      const src = String(v).includes('source: image') ? '' : ' (source: user)';
      return `  ${k}: ${v}${src}`;
    })
    .join('\n') || '  (none provided)';

  const chunksBlock = chunks.length
    ? chunks.map(c =>
        `  [${c.section}] ${c.title || ''} — ${c.edition} (eff. ${c.effective_date})\n  ${c.body}`
      ).join('\n\n')
    : '  (knowledge base not yet seeded — reason from general code knowledge and state all assumptions)';

  return [
    `JURISDICTION: ${jurisdictionLine}`,
    `CODE EDITION IN EFFECT: ${editionLabel}`,
    `AS OF DATE: ${asOfDate}`,
    `MODE: ${mode}`,
    '',
    'QUESTION:',
    question,
    '',
    'FACTS:',
    factsBlock,
    '',
    'RELEVANT CODE CONTEXT (retrieved, authoritative for this request):',
    chunksBlock,
  ].join('\n');
}
