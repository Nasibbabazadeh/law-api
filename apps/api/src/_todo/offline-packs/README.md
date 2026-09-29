# Offline packs

Brief section 2.8. Content is downloaded per field (~20–55 MB): topics, questions, law text,
glossary terms and cases.

## Design

- A pack is an immutable, versioned build per field: `offline_pack(id, field_id, version,
content_hash, size_bytes, url, built_at)`. Built by a pg-boss job whenever a field's content
  or a referenced law article changes; stored in object storage (S3-compatible), served by URL.
- The pack format is a SQLite file the app opens directly (or gzipped JSON if simpler first).
- `GET /v1/offline-packs` lists the latest pack per field with size and version.
  The app compares versions to offer "update available" and "auto-update when law changes".
- **Answers offline:** the app keeps attempts locally with their client UUID, `answeredAt` and
  timezone, and uploads them later through the existing `POST /v1/attempts` batch endpoint.
  It is already idempotent and the review cache is rebuilt from the full log, so late and
  out-of-order uploads converge. No new sync protocol is needed for answers.
- **Conflicts:** review state and streak are derived from attempts, so two devices never
  conflict on them. Plan completion and notes will need per-row `updated_at` and
  last-writer-wins (or append-only events like attempts).
- `@huquq/core` runs in React Native, so the app can compute the review queue and streak
  offline with the same code as the server.
