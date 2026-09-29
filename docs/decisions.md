# Design decisions (phase 1)

Where these differ from the draft data model in `HUQUQ_BRIEF.md`, this file wins.

## Review ladder

- Intervals are **1 → 3 → 7 → 30 days** (`LADDER_INTERVALS` in `@huquq/core`).
- A wrong answer from **any** context (quiz, drill, exam, review, group) puts the question on
  step 0, due the next study day, and resets `correct_streak`.
- A correct answer **on or after the due day** moves it up one step:
  step 0 → +3 days, step 1 → +7, step 2 → +30. A correct answer on step 3 (the 30-day review) is
  the 4th correct answer in a row: the question is **mastered** and leaves the queue.
- A correct answer **before** the due day is logged and counts for stats, but does not move the
  ladder (otherwise daily drilling could master a question in four days). An early wrong answer
  still resets it.
- **Same-day rule:** only the first attempt per question per study day reaches the ladder. Later
  attempts that day are stored and count for stats. The first attempt uses up the day even if it
  was an early correct answer.
- After mastery, a correct answer changes nothing; a wrong answer brings the question back at step 0.
- A question that was only ever answered correctly has no review item.

## Attempts are the source of truth

- `attempt` is append-only. A trigger rejects `UPDATE`; rows disappear only with their user.
- The primary key is the **client-generated UUID**, so retrying an upload is safe: a known id is
  reported as `duplicate`.
- The server grades answers (`gradeAnswer`) and never trusts a client-sent correctness flag.
- `review_item` is a **cache**: after every batch the server replays the user's full attempt log
  for the touched questions with `deriveReviewItems` and upserts the result, in the same
  transaction as the insert. A per-user advisory lock serialises concurrent batches. Because the
  rebuild is a pure function of the log, late or out-of-order offline uploads converge to the
  same state. `wrong_count` and `last_attempt_day` are cached there too (the brief's per-question
  history).
- Streak and stats are computed from attempts on read (`computeStreak`, `computeStats`). At the
  expected scale this is cheap; add a rollup table if it ever is not.

## Study day

- The client sends `answeredAt` (ISO instant with offset) and its IANA `timezone`. The server
  recomputes `study_day` with `studyDay()` from `@huquq/core` and ignores any client-sent day.
- A study day is a local date string `YYYY-MM-DD`, stored as `date`, never a UTC timestamp.
  Asia/Baku is UTC+4 with no DST, so a Baku day starts at 20:00Z the previous calendar day.
- "Today" for `GET /review/today` and `GET /me` is computed in the user's profile timezone
  (`user.timezone`, default `Asia/Baku`, changeable with `PATCH /me`).
- If a timezone change makes an attempt's local day not later than the last ladder day for that
  question, it does not move the ladder (it can't replay an earlier day).
- `answeredAt` more than 5 minutes in the future, or before 2024, is rejected as `invalid`.

## Azerbaijani text

- `field.name` and `topic.name` use `COLLATE "az-x-icu"`, so `ORDER BY name` follows the
  Azerbaijani alphabet (A B C Ç D E Ə F G Ğ H X I İ J K Q L M N O Ö P R S Ş T U Ü V Y Z).
- `@huquq/core/text/az.ts` implements `azLower`, `azUpper` (I ↔ ı, İ ↔ i) and `azCompare` without
  relying on `Intl` locale data, which React Native engines may not ship.
- User-facing strings (API error messages, seed data) are in Azerbaijani; code and comments in English.

## Stack choices

- **NestJS 11, not 12:** `nestjs-zod` 5 supports `@nestjs/common` ≤ 11 and `@nestjs/swagger` ≤ 11.
  `@thallesp/nestjs-better-auth` supports both, so 11 satisfies everything.
- **ESM API:** Better Auth, the Nest integration and pg-boss are ESM-only, so the API is an ES
  module (`"type": "module"`, `NodeNext`); relative imports carry `.js` extensions.
- **Zod schemas are the only shape definitions.** They live in `@huquq/core/schemas`, and
  controllers wrap them with `createZodDto`. Schemas used as a DTO root must not have
  `.meta({ id })` (nestjs-zod names them after the DTO class); nested, reused schemas may.
- `POST /attempts` is documented with the strict `AttemptBatchSchema`, but validated row by row
  in the service so one bad row never fails the batch.
- **Auth:** Better Auth owns `/v1/auth/*` and stores users in our Postgres through the Drizzle
  adapter. `role`, `interests` and `timezone` are accepted at sign-up and validated with the core
  zod schemas; `locale` is server-controlled. The global guard from the Nest integration protects
  every route unless marked `@AllowAnonymous()`. Our own `@Roles('teacher')` + `RolesGuard`
  checks the product role. CORS is configured once in `app.factory.ts` (the integration's
  built-in CORS omits `PATCH`).
- Content reads (`/fields`, `/fields/:id/topics`, `/topics/:id`) are public for guests and the
  website; questions (which include answers) need a session.
- A topic's "official sources" are the articles its questions cite (no separate join table yet).

## Extensibility

Later tables (exam, case, note, term, plan, group, ai_request, law_article_chunk, offline_pack)
reference existing ids and need no change to phase-1 tables:

- `attempt.context` already includes `exam` and `group`.
- `bookmark.target_type` is a text column with a check constraint; allowing `term` is a
  one-line migration.
- `law_article` is versioned and never edited in place, so citations stay valid across changes.
- pgvector and pg_trgm are enabled for AI retrieval and fuzzy search.
