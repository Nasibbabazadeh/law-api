# Teacher / group mode

Brief section 2.9.

## Tables

- `group(id, teacher_id → user, name, code char(6) unique, created_at)`. The code uses an
  unambiguous alphabet (no 0/O, 1/I), e.g. `MX4K2P`.
- `group_member(group_id, user_id, joined_at, removed_at)`, PK (group_id, user_id).
- `assignment(id, group_id, type test|case|topic, topic_id, question_count, deadline timestamptz,
time_limit_min, created_at)`.
- `assignment_attempt(assignment_id, user_id, started_at, completed_at, score)`. The individual
  answers are normal `attempt` rows with `context = 'group'`, so wrong answers enter the
  student's review queue automatically.

## Rules

- Only `@Roles('teacher')` can create groups and assignments or remove members (the guard
  already exists in `auth/roles.ts`).
- **Privacy:** teachers see assignment results and activity only. Never join `bookmark`,
  notes or highlights into any teacher-facing query.
- Results: completion rate, average score, hardest questions (lowest % correct across the
  group's attempts for the assignment), per-student score. "Remind" enqueues a push job.
- A group assignment stays on the student's Home until the deadline or completion.

## Endpoints (draft)

`POST /v1/groups`, `POST /v1/groups/join` { code }, `GET /v1/groups/:id`,
`DELETE /v1/groups/:id/members/:userId`, `POST /v1/groups/:id/assignments`,
`GET /v1/assignments/:id/results`, `POST /v1/assignments/:id/remind`.
