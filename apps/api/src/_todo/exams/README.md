# Mock exams

Brief section 2.3.

## Formats

| Format | Questions | Minutes        |
| ------ | --------- | -------------- |
| full   | 100       | 120            |
| short  | 40        | 45             |
| field  | 30        | 35 (one field) |

## Tables

- `exam(id, user_id, format, field_id?, question_ids uuid[], started_at, deadline_at,
submitted_at, score, per_field jsonb)`. The question set is fixed when the exam starts.
- Answers are `attempt` rows with `context = 'exam'`, uploaded on submit. All wrong answers enter
  the review queue through the existing rebuild. `exam_answer(exam_id, question_id, attempt_id,
flagged)` keeps flags and links answers to the exam.

## Rules (put the pure parts in `@huquq/core`)

- The server owns the deadline: submits after `deadline_at` (plus a small grace period) are
  auto-submitted with the answers received so far.
- No feedback during the exam; answers revealed after submission.
- Score out of 100, change from the previous attempt, per-field breakdown.
- **Readiness %**: weighted average of the last 3 attempts compared with a pass line of 70.
  The weights still need a product decision (e.g. 0.5 / 0.3 / 0.2).

## Endpoints (draft)

`POST /v1/exams` { format, fieldId? } → questions without answers,
`POST /v1/exams/:id/submit` { answers[] }, `GET /v1/exams/:id`, `GET /v1/exams?limit=`.
