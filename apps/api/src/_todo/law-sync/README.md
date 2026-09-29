# Law sync (e-qanun.az)

Brief sections 2.13 and 5.3.

## Goal

Keep `law_article` in step with the official texts on e-qanun.az, detect changes, and flag
affected content.

## Design

- A pg-boss scheduled job (the `JobsModule` already exists) fetches each tracked code and splits
  it into articles. Prefer an official feed or API if one is available; otherwise scrape
  politely (rate-limited, cached, with a clear user agent).
- For each article, compute `content_hash` (sha256 of the normalized text). If it differs from
  the latest stored version, insert a **new row** with a new `version`. Old versions are never
  edited, so existing citations, attempts and notes still point at the text they were based on.
- `law_change(id, article_id_old, article_id_new, detected_at, diff jsonb, summary)` records
  each change. The AI "What changed?" summary is generated later (see `_todo/ai`).
- Fan-out after a change:
  - mark questions linked through `question_article` for editorial review;
  - rebuild offline packs that include the article;
  - notify users who studied, bookmarked or noted the article.
- The seed's article texts are shortened placeholders; the first sync run replaces them.
