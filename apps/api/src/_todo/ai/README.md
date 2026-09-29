# AI assistant (grounded, not free chat)

Brief section 2.10. AI appears inside screens ("Why?" card, "Explain" on selected law text,
plain-language term definitions, situation Q&A, law map). It is never available offline.

## Rules

- Every answer cites at least one `law_article` (rendered as [1] [2] links to e-qanun.az).
- If retrieval finds no article above a confidence threshold, return a
  `source_not_found` state instead of an answer. The model never guesses.
- Levels: `simple | detailed | legal`. The "Not legal advice" disclaimer is always shown.
- Responses are streamed (SSE).

## Design

- **Embeddings:** a `law_article_chunk` table (article_id FK, chunk_index, text, `embedding vector(n)`)
  in the main Postgres; `pgvector` is already enabled. HNSW index. Chunks belong to one article
  version, so citations stay valid when a law changes.
- **Retrieval:** hybrid pgvector similarity + `pg_trgm`/full-text on the chunk text, filtered to
  the current version of each article.
- **Model:** Claude via the Anthropic API. The prompt contains only the retrieved chunks; the
  answer must list the chunk ids it used, and the server maps them back to article ids.
- **Logging:** `ai_request(id, user_id, context, prompt, level, cited_article_ids uuid[],
confidence, input_tokens, output_tokens, created_at)` for cost control and review.
- **Limits:** per-user daily quota and rate limit; a moderation pass on the input.

## Endpoints (draft)

- `POST /v1/ai/explain` { articleId | questionId | text, level } → SSE stream
- `POST /v1/ai/ask` { question, level } → SSE stream with citations
