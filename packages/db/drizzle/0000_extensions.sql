-- Extensions used across phases: pgvector (AI embeddings, later), pg_trgm (fuzzy search).
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
