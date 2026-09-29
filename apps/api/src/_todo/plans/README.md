# Study plan

Brief section 2.7.

## Inputs → output

- Inputs: exam type (bar | semester | judge), exam date, study days of the week, minutes per day
  (15 | 30 | 60).
- Output: countdown, weekly schedule, phases (basics → weak fields → cases and mixed tests →
  full mock exams in the final week) and a daily task list.

## Tables

- `plan(id, user_id, exam_type, exam_date date, days_of_week smallint[], minutes_per_day,
created_at, archived_at)`.
- `plan_task(id, plan_id, study_day date, type, ref_id, minutes, done_at, carried_from date)`.

## Rules (pure functions in `@huquq/core`, using `time/study-day`)

- **Carry-over:** an undone task moves to the next _study day_ (the next day in
  `days_of_week`, not the next calendar day) and gets the "From yesterday" tag
  (`carried_from`). Compute it lazily when the plan is read, not with a midnight cron, so it
  respects each user's timezone.
- **Behind schedule** (N days of backlog): offer to increase minutes, add a study day, or
  spread the backlog over the next 2 weeks. Each option is a pure re-planning function.
- Plan tasks feed the Home "Today" list together with review items and group assignments.
