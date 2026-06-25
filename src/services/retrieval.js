import { db } from '../db/client.js';

// Returns relevant code chunks from pgvector.
// Phase 0: returns empty array when no embedding key is configured.
// Phase 1: embed the query and query the code_chunks table.
export async function retrieveCodeChunks({ question, facts, edition, jurisdiction }) {
  if (!process.env.EMBEDDING_API_KEY) return [];

  // TODO Phase 1: embed the query, run the pgvector query below.
  // const embedding = await embed(buildQuery(question, facts));
  // const { rows } = await db.query(
  //   `SELECT section, title, edition, effective_date, source_url, body
  //    FROM code_chunks
  //    WHERE edition = $1
  //      AND jurisdiction IN ('FL_state', $2, $3)
  //    ORDER BY embedding <=> $4
  //    LIMIT 12`,
  //   [edition, jurisdiction.county, jurisdiction.city, `[${embedding}]`]
  // );
  // return rows;

  return [];
}

function buildQuery(question, facts) {
  const factLines = Object.entries(facts || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  return `${question} ${factLines}`.slice(0, 512);
}
