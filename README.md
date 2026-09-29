# Hüquq backend

Backend monorepo for **Hüquq**, an Azerbaijani law-learning app (see [HUQUQ_BRIEF.md](HUQUQ_BRIEF.md)).
Phase 1 covers auth, content (fields → topics → questions with law-article references),
the answer log, the spaced-repetition review queue, bookmarks and the profile.

## Stack

| Piece             | Choice                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Monorepo          | pnpm workspaces + Turborepo                                                                            |
| API               | NestJS 11 (ESM, TypeScript strict), Express 5                                                          |
| Shared logic      | `@huquq/core`: pure TS (review engine, study day, Azerbaijani text, zod schemas); runs in React Native |
| Database          | PostgreSQL 16 + pgvector + pg_trgm, Drizzle ORM (`@huquq/db`)                                          |
| Auth              | Better Auth (email/password, Google, Apple) via `@thallesp/nestjs-better-auth`                         |
| Validation / docs | zod 4 schemas in `@huquq/core` → `nestjs-zod` → Swagger at `/docs`                                     |
| Logging           | `nestjs-pino`                                                                                          |
| Jobs              | pg-boss (module wired, no jobs yet)                                                                    |
| Tests             | Vitest (SWC for the API), API tests against a real Postgres                                            |

## Layout

```
apps/api/                  NestJS API
  src/
    main.ts, app.module.ts, app.factory.ts
    common/                config (zod env), error filter, logger, OpenAPI
    db/                    Drizzle provider
    auth/                  Better Auth instance, @Roles() + RolesGuard, GET /v1/session
    fields/ topics/ questions/ attempts/ review/ bookmarks/ me/ health/
    jobs/                  pg-boss module
    scripts/               seed.ts, import-questions.ts (+ lib/)
    _todo/                 READMEs for later phases (ai, offline-packs, groups, exams, plans, law-sync)
  test/                    integration tests (real Postgres)
  examples/                sample question import files
packages/core/             @huquq/core: review/, time/, text/az.ts, questions/, attempts/, schemas/
packages/db/               @huquq/db: src/schema/*.ts, drizzle/ migrations, drizzle.config.ts
packages/tsconfig/         shared tsconfig presets
packages/eslint-config/    shared flat ESLint config
docs/decisions.md          design decisions and their reasons
```

## Run it locally

Prerequisites: Node 22, pnpm 10 (`corepack enable`), Docker.

```bash
pnpm install
cp .env.example .env              # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d              # Postgres 16 + pgvector on :5432 (creates huquq and huquq_test)
pnpm db:migrate                   # applies packages/db/drizzle to DATABASE_URL
pnpm --filter api seed            # Azerbaijani dev content (idempotent)
pnpm dev                          # watches core, db and the API → http://localhost:3000
```

- Swagger UI: <http://localhost:3000/docs> (JSON at `/docs/json`)
- Health: <http://localhost:3000/v1/health>

`docker/postgres-init.sql` creates `huquq_test` only on the first start of an empty volume. With an
older volume, create it once: `docker compose exec postgres createdb -U postgres huquq_test`.

### Try it

```bash
# Sign up as a student (cookie saved to ./jar)
curl -c jar -H 'content-type: application/json' -H 'origin: http://localhost:3000' \
  -d '{"name":"Leyla Məmmədova","email":"leyla@example.az","password":"parol-12345","role":"student","interests":["cinayet-huququ"]}' \
  http://localhost:3000/v1/auth/sign-up/email

curl http://localhost:3000/v1/fields
curl -b jar http://localhost:3000/v1/topics/b1000000-0000-4000-8000-000000000001/questions

# Answer a question wrongly (the client generates the attempt id), then look at the review queue
curl -b jar -H 'content-type: application/json' -d '{"attempts":[{
  "id":"'"$(node -p 'crypto.randomUUID()')"'","questionId":"d1000000-0000-4000-8000-000000000001",
  "context":"quiz","answer":"A","answeredAt":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","timezone":"Asia/Baku"}]}' \
  http://localhost:3000/v1/attempts
curl -b jar http://localhost:3000/v1/review/today
curl -b jar http://localhost:3000/v1/me
```

## Scripts

| Command                                                 | What it does                                                      |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                                              | Watch mode for all workspaces (API on `PORT`, default 3000)       |
| `pnpm build`                                            | Build packages and the API                                        |
| `pnpm typecheck` / `pnpm lint` / `pnpm test`            | Checks across the monorepo (Turborepo)                            |
| `pnpm db:generate`                                      | Generate a migration from schema changes (`drizzle-kit generate`) |
| `pnpm db:migrate`                                       | Apply migrations to `DATABASE_URL`                                |
| `pnpm --filter api seed`                                | Load the dev seed                                                 |
| `pnpm --filter api import:questions <file> [--dry-run]` | Import questions from `.json` or `.csv`                           |

### Question import

Rows are validated with `QuestionImportRowSchema` from `@huquq/core`. Invalid rows are reported
with their row number and skipped; valid rows are upserted in one transaction. Topics must already
exist (`fieldSlug` + `topicSlug`), and so must the referenced law articles.

- JSON: an array of rows (or `{ "questions": [...] }`), see `apps/api/examples/questions.example.json`.
- CSV: header `id,fieldSlug,topicSlug,type,prompt,options,correctAnswer,explanation,difficulty,articles`,
  see `apps/api/examples/questions.example.csv`.
  - `options`: `A:Birinci variant|B:İkinci variant` (omit for `true_false`)
  - `articles`: `CM:20;CM:21@2024-01-01` (`code:number`, optional `@version`; the latest version otherwise)
- Give rows an `id` (UUID) to make re-imports update in place; rows without one are always inserted.

## Tests

- `packages/core`: unit tests for the review ladder, same-day rule, study day and Asia/Baku
  midnight edges, streak/stats, Azerbaijani casing and sorting, and the schemas.
- `apps/api`: integration tests that boot the full Nest app against `DATABASE_URL_TEST`.
  They run migrations first and **truncate every table**, so never point it at real data
  (the harness refuses to run if it equals `DATABASE_URL`).

## API overview (all under `/v1`)

| Method     | Path                               | Auth |                                                                                                                                                                                               |
| ---------- | ---------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| *          | `/auth/*`                          | –    | Better Auth: `sign-up/email` (with `role`, `interests`, `timezone`), `sign-in/email`, `sign-in/social` (google, apple), `request-password-reset`, `reset-password`, `get-session`, `sign-out` |
| GET        | `/session`                         | ✓    | Current user and session                                                                                                                                                                      |
| GET        | `/health`                          | –    | Liveness + database check                                                                                                                                                                     |
| GET        | `/fields`                          | –    | Fields in Azerbaijani alphabetical order                                                                                                                                                      |
| GET        | `/fields/:id/topics`               | –    | Topics of a field                                                                                                                                                                             |
| GET        | `/topics/:id`                      | –    | Summary + article references                                                                                                                                                                  |
| GET        | `/topics/:id/questions`            | ✓    | Questions with `articleIds`                                                                                                                                                                   |
| POST       | `/attempts`                        | ✓    | Batch upload; per-row `accepted` / `duplicate` / `invalid`                                                                                                                                    |
| GET        | `/review/today`                    | ✓    | Due questions grouped by field + next 7 days                                                                                                                                                  |
| GET, POST  | `/bookmarks`                       | ✓    | List (optional `?targetType=`), create (idempotent)                                                                                                                                           |
| DELETE     | `/bookmarks/:targetType/:targetId` | ✓    | Hard delete                                                                                                                                                                                   |
| GET, PATCH | `/me`                              | ✓    | Profile, streak and stats; update interests and timezone                                                                                                                                      |

Errors always look like `{ "code": "NOT_FOUND", "message": "Mövzu tapılmadı", "details": ... }`
(Better Auth's own `/auth/*` routes use Better Auth's error format).

See [docs/decisions.md](docs/decisions.md) for the review ladder, study day and other rules.
