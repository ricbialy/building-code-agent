# Building Code Compliance Agent API

A stateless HTTP API that answers building code compliance questions using Claude. The agent is jurisdiction-aware, supports multiple output modes, and is designed to grow from zero KB (Phase 0) to a fully seeded pgvector knowledge base (Phase 4).

> **Disclaimer:** All output is advisory. The Authority Having Jurisdiction (AHJ) and the engineer of record make the binding determination. Never procure materials or begin construction based solely on this API's output.

---

## Quickstart

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in ANTHROPIC_API_KEY and SERVICE_API_KEYS at minimum
```

### 3. Start the server

```bash
# Production
npm start

# Development (auto-restart on file change)
npm run dev
```

The server listens on `PORT` (default `3000`).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `SERVICE_API_KEYS` | Yes | Comma-separated list of valid API keys for clients (e.g. `key1,key2`) |
| `DEFAULT_MODEL` | No | Claude model for main analysis (default: `claude-opus-4-8`) |
| `EXTRACTION_MODEL` | No | Claude model for image fact extraction (default: `claude-haiku-4-5`) |
| `DATABASE_URL` | Phase 1+ | PostgreSQL connection string with pgvector |
| `EMBEDDING_API_KEY` | Phase 1+ | API key for the embedding model |
| `PORT` | No | HTTP port (default: `3000`) |

---

## API Reference

All authenticated endpoints require:
```
Authorization: Bearer <key>
```

### GET /v1/health

Health check. No authentication required.

**Response:**
```json
{ "status": "ok", "timestamp": "2026-06-25T00:00:00.000Z" }
```

---

### POST /v1/analyze

Full pipeline: resolve edition → extract image facts → retrieve KB chunks → call Claude → return structured result.

**Request body:**
```json
{
  "jurisdiction": {
    "city": "Miami",
    "county": "Miami-Dade",
    "state": "FL"
  },
  "code_edition": "FBC_8th_2023",
  "as_of_date": "2026-06-01",
  "question": "Does a single-story wood-frame residence require a fire sprinkler system?",
  "facts": {
    "occupancy_type": "R-3",
    "construction_type": "V-B",
    "gross_floor_area_sqft": "2400"
  },
  "images": [],
  "mode": "scored_answer",
  "options": {
    "max_tokens": 2500
  }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `jurisdiction.city` | string | Yes | |
| `jurisdiction.county` | string | No | |
| `jurisdiction.state` | string | Yes | Two-letter state code |
| `code_edition` | string | No | Overrides automatic edition resolution |
| `as_of_date` | string | No | ISO date used for edition resolution |
| `question` | string | Yes | The compliance question |
| `facts` | object | No | Known project facts (key/value) |
| `images` | array | No | Up to 4 images (see below) |
| `mode` | string | Yes | `scored_answer`, `reviewer_email`, or `eor_memo` |
| `options.model` | string | No | Override the Claude model for this request |
| `options.max_tokens` | integer | No | 100–8000 |

**Image object:**
```json
{
  "media_type": "image/jpeg",
  "data": "<base64-encoded bytes>"
}
```
Supported types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`.

**Response:**
```json
{
  "request_id": "req_abc123",
  "mode": "scored_answer",
  "jurisdiction": { "city": "Miami", "county": "Miami-Dade", "state": "FL" },
  "code_edition": "FBC 8th Edition (2023)",
  "summary": "One-line answer",
  "answer": "Full reasoning in prose...",
  "confidence": { "level": "medium", "rationale": "KB not yet seeded; reasoning from general knowledge" },
  "assumptions": ["Occupancy is R-3 as stated", "..."],
  "missing_inputs": ["Local amendment status", "..."],
  "citations": [
    {
      "section": "903.2.8",
      "title": "Group R",
      "edition": "FBC 8th Edition (2023)",
      "effective_date": "2023-12-31",
      "url": null,
      "note": ""
    }
  ],
  "email": null,
  "memo": null,
  "disclaimer": "Advisory only. Not a code determination...",
  "usage": { "input_tokens": 800, "output_tokens": 450 }
}
```

---

### POST /v1/ask

Simplified endpoint. Accepts freeform question text and optional images; the API extracts structured facts automatically, then runs the same pipeline as `/v1/analyze`.

**Request body:**
```json
{
  "jurisdiction": { "city": "Orlando", "state": "FL" },
  "question": "Our 4-story Type III-A office building has 42,000 sqft per floor. Does it need sprinklers?",
  "images": [],
  "mode": "scored_answer",
  "options": {}
}
```

Response shape is identical to `/v1/analyze`.

---

## Output Modes

| Mode | What it produces |
|---|---|
| `scored_answer` | Structured compliance analysis: answer, confidence, assumptions, missing inputs, citations |
| `reviewer_email` | Everything in `scored_answer` plus a professionally drafted email addressed to the plans examiner, signed "Ric Bialys" |
| `eor_memo` | Everything in `scored_answer` plus a code analysis memo formatted for the engineer of record |

---

## Example curl commands

### Health check
```bash
curl http://localhost:3000/v1/health
```

### Scored answer
```bash
curl -X POST http://localhost:3000/v1/analyze \
  -H "Authorization: Bearer key1" \
  -H "Content-Type: application/json" \
  -d '{
    "jurisdiction": { "city": "Miami", "county": "Miami-Dade", "state": "FL" },
    "question": "Does a single-story wood-frame residence require a fire sprinkler system?",
    "facts": { "occupancy_type": "R-3", "gross_floor_area_sqft": "2400" },
    "mode": "scored_answer"
  }'
```

### Reviewer email
```bash
curl -X POST http://localhost:3000/v1/analyze \
  -H "Authorization: Bearer key1" \
  -H "Content-Type: application/json" \
  -d '{
    "jurisdiction": { "city": "Tampa", "county": "Hillsborough", "state": "FL" },
    "question": "We propose to use an alternative fire-resistance-rated assembly per FBC 703.3. What submittal documentation is required?",
    "mode": "reviewer_email"
  }'
```

### Ask (freeform)
```bash
curl -X POST http://localhost:3000/v1/ask \
  -H "Authorization: Bearer key1" \
  -H "Content-Type: application/json" \
  -d '{
    "jurisdiction": { "city": "Jacksonville", "state": "FL" },
    "question": "4-story Type IIIA office, 42000 sqft/floor. Sprinklers required?",
    "mode": "eor_memo"
  }'
```

---

## Build Phases

| Phase | Description |
|---|---|
| **Phase 0** | Model reasons from training knowledge. KB retrieval returns empty. Ships now. |
| **Phase 1** | Seed `code_chunks` via `src/db/schema.sql`. Enable `EMBEDDING_API_KEY` to activate pgvector retrieval. |
| **Phase 2** | Add jurisdiction-specific local amendments table. Weight retrieved chunks by recency and jurisdiction specificity. |
| **Phase 3** | Add a feedback/correction table. Fine-tune citation accuracy. |
| **Phase 4** | Multi-jurisdiction support beyond Florida. Automate edition schedule updates. |

---

## KB Setup (Phase 1+)

1. Provision a PostgreSQL instance with the `pgvector` extension.
2. Run the schema:
   ```bash
   psql $DATABASE_URL -f src/db/schema.sql
   ```
3. Seed `code_chunks` rows with your code text and embeddings (1024-dimensional vectors).
4. Set `DATABASE_URL` and `EMBEDDING_API_KEY` in your `.env`.

The retrieval service (`src/services/retrieval.js`) will activate automatically when `EMBEDDING_API_KEY` is present.

---

## Project Structure

```
src/
├── index.js                   Express app entry point
├── middleware/
│   ├── auth.js                Bearer token authentication
│   └── rateLimit.js           60 req/min rate limiter
├── prompts/
│   └── system.js              Claude system prompt
├── services/
│   ├── claude.js              Anthropic API client
│   ├── extraction.js          Image fact extractor
│   ├── editions.js            Jurisdiction → code edition resolver
│   ├── retrieval.js           pgvector KB retrieval (Phase 1+)
│   └── pipeline.js            Core analysis pipeline (shared by both routes)
├── validation/
│   └── schemas.js             Zod request schemas
├── routes/
│   ├── health.js              GET /v1/health
│   ├── analyze.js             POST /v1/analyze
│   └── ask.js                 POST /v1/ask
└── db/
    ├── client.js              PostgreSQL pool (lazy init)
    └── schema.sql             code_chunks table + pgvector indexes
```
