CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS code_chunks (
  id             BIGSERIAL PRIMARY KEY,
  jurisdiction   TEXT NOT NULL,
  code_volume    TEXT NOT NULL,
  edition        TEXT NOT NULL,
  effective_date DATE NOT NULL,
  section        TEXT NOT NULL,
  title          TEXT,
  body           TEXT NOT NULL,
  source_url     TEXT,
  embedding      vector(1024)
);

CREATE INDEX IF NOT EXISTS code_chunks_embedding_idx
  ON code_chunks USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS code_chunks_jurisdiction_edition_idx
  ON code_chunks (jurisdiction, edition);
