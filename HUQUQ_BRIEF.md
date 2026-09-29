# Hüquq: product and logic brief for technical review

This is a technical brief for the Hüquq app. Use it to get recommendations on architecture, stack, data model and infrastructure.

## 1. Product

Hüquq is a mobile app and website for learning Azerbaijani law. The main user is a law student preparing for exams. The main persona is Leyla Məmmədova, a 3rd‑year student.

- All UI text is in Azerbaijani.
- Mobile is the primary platform, designed for iPhone 390×844. Android and a 1440px website are also planned.
- Content covers 6 legal fields: Criminal, Administrative, Labor, Civil, Family and Constitutional law.
- Every legal claim references an article of an official code, with the source e-qanun.az.

### Roles
| Role | Can do |
|---|---|
| Student | Learn, practice, take mock exams, keep notes, study offline, join groups |
| Teacher | Create groups, assign tasks, see group results, remove members |
| Guest | Onboarding, landing page, demo question |

The role is chosen at onboarding. The role and the user's interests set the default ordering on Home and Explore.

### Navigation
There are 4 tabs: Home, Explore, Bookmarks and Profile. Each tab has one purpose:
- **Home** holds daily work: the unified "Today" list.
- **Explore** holds tools and content: articles, law updates, cases, glossary and search.
- **Profile** holds personal data: plan, exams, review queue, groups, notes, offline storage and settings.

---

## 2. Features and business logic

### 2.1 Learning core
- The content structure is Field → Topic → Summary + official sources → Quiz of about 10 questions.
- In a quiz, the user can flag a question and open a question navigator. Before finishing, a confirmation modal appears.
- After each answer the user sees correct/wrong feedback with an explanation and the article reference.
- The result screen shows the score and the topics that need review.

### 2.2 Spaced repetition: review of mistakes
- Every wrongly answered question, from any source, enters the user's review queue. Sources are quizzes, the daily drill, mock exams and group tasks.
- The interval ladder is **1 → 3 → 7 → 30 days**.
  - A correct answer moves the question to the next step.
  - A wrong answer resets it to step 0, so it comes back tomorrow.
  - Four correct answers in a row mark the question as **mastered**, and it leaves the queue.
- Home shows the questions due today, grouped by field, and the upcoming due counts.
- Each question stores its history: the number of wrong attempts and the last attempt date.

### 2.3 Mock exam
- There are three formats:
  - **Full:** 100 questions, 120 minutes.
  - **Short:** 40 questions, 45 minutes.
  - **Field:** 30 questions, 35 minutes, from one field.
- The timer counts down. At 5 minutes left a yellow warning appears with the number of unanswered questions. When time runs out, the exam is submitted automatically.
- No feedback appears during the exam. Answers are revealed only after submission.
- The user can flag questions and move between them freely.
- The result screen shows:
  - the score out of 100 and the change from the previous attempt;
  - a per‑field breakdown;
  - a **readiness %**, calculated from the last 3 attempts and compared against a pass line of 70.
- All wrong answers are pushed into the review queue.
- The answer review can be filtered by All, Wrong or Flagged.
- The exam can be started from Home, from Profile, or from a Field screen. Starting from a Field screen preselects the Field format.

### 2.4 Cases
- Cases are based on real court cases. Names are anonymized.
- A case has facts (a numbered list) and a question.
- The user picks a verdict from 3 options and selects one or more articles as the legal basis.
- The comparison with the court's decision shows:
  - whether the user's verdict matches the court's;
  - a status for each article: **picked correctly**, **missed** (the court used it, the user did not), or **irrelevant** (the user picked it, the court did not);
  - the court's reasoning in steps.
- The case list can be filtered by field and shows a "solved" status.

### 2.5 Notes and highlights
- The user selects text in a law, article or topic. A toolbar appears with Highlight, Note, AI Explain and Copy.
- A note stores the quoted text, the source article, the note body and optional links to a case or topic.
- Highlighted text is drawn with a yellow background and underline. A note marker opens the note inline.
- Bookmarks has a Notes tab. Deleting a note asks for confirmation.
- Notes and highlights are private, and teachers never see them.

### 2.6 Glossary
- The list is sorted A–Z by the **Azerbaijani alphabet**: A B C Ç D E Ə F G Ğ H X I İ J K Q L M N O Ö P R S Ş T U Ü V Y Z.
  - This needs locale‑aware sorting and search (`az`). Note the dotted and dotless i: I/ı and İ/i.
- Users can search, filter by field and jump via a letter index.
- A term has:
  - an official definition;
  - an AI "plain language" version;
  - the source article;
  - related terms;
  - the fields it belongs to.
- Terms inside legal text have a dotted underline. Tapping one opens a bottom sheet with a short definition and "Full explanation".
- If search finds nothing, the user is offered "Ask AI".
- Search results in Explore show a matching term card first.

### 2.7 Study plan
- **Inputs:** exam type (Bar, Semester or Judge exam), exam date, study days per week and minutes per day (15, 30 or 60).
- **Output:** a countdown, weekly schedule, phases and a daily task list. The phases are:
  1. Basics
  2. Weak fields
  3. Cases and mixed tests
  4. Full mock exams in the final week
- **Carry‑over rule:** any task not done today moves automatically to the **next study day**, with a "From yesterday" tag. A partially completed day is marked in the week view.
- **Behind schedule:** when the user is N days behind, the app offers three adjustments:
  - increase the daily minutes;
  - add a study day;
  - spread the backlog over the next 2 weeks.
- The plan feeds tasks into the Home "Today" list.

### 2.8 Offline mode
- Content is downloaded per field. One pack is about 20–55 MB and includes topics, questions, law text, glossary terms and cases.
- The user can download, cancel or delete a pack. Deleting asks for confirmation.
- The Offline screen shows storage usage and two toggles: "Wi‑Fi only" and "Auto‑update when law changes".
- **While offline:**
  - a banner appears at the top;
  - fields that are not downloaded are dimmed and show an empty state;
  - AI features are unavailable;
  - answers, notes and progress are stored locally.
- **Back online:**
  - local changes are synced, for example "14 answers, 2 notes synced";
  - if a law changed in a downloaded pack, the user is prompted to update it.
- Conflicts need a resolution strategy. Candidates are review‑queue state, streak and plan completion edited on two devices.

### 2.9 Teacher / group mode
- **Teacher:**
  - creates a group and gets a 6‑character join code, for example MX4K2P;
  - creates assignments with a type (test, case or topic), topic, question count, deadline and optional time limit;
  - sees results: completion rate, average score, hardest questions (lowest % correct) and each student's score;
  - can "Remind" students who have not started;
  - can remove members after a confirmation.
- **Student:**
  - joins with the code;
  - sees assignments with a deadline tag, their own result and the group average.
- **Privacy:** the teacher sees assignment results and progress only, never notes or bookmarks.
- Wrong answers in group tasks also enter the student's review queue.

### 2.10 AI assistant (grounded, not free chat)
- AI features appear inside existing screens. There is no separate AI tab.
  - "Why?" card in answer feedback.
  - "Explain" for selected law text.
  - Plain‑language term definitions.
  - Situation Q&A.
  - A law map, for example "what applies at age X".
- **Every answer must cite articles**, shown as [1] [2] links to e-qanun.az. If no source is found, the AI shows a "source not found / low confidence" state and does not guess.
- Users can switch the explanation level: Simple, Detailed or Legal language.
- The chat can include a mini‑quiz. Responses are streamed.
- The disclaimer "Not legal advice" is always shown.
- AI is unavailable offline.

### 2.11 Engagement
- A daily drill of 5 questions, about 3 minutes, maintains the streak.
- There is a game mode with levels and a challenge mode.
- There is a news‑style feed of everyday rights situations.
- Profile shows stats: topics, tests, accuracy and per‑field accuracy.

### 2.12 Unified Home ("Today")
One list merges four sources:
1. Plan tasks, including carried‑over tasks.
2. Review due today.
3. Group assignments, which stay in the list until their deadline.
4. Anything carried over from yesterday.

Each row can be checked off and opens its feature. Below the list, "Practice" links to Mock exam, Cases, Daily drill and Game.

### 2.13 Planned, not designed yet
- **Law change notification:** when an article the user studied, saved or noted changes, the user is notified. The notification shows an AI "What changed?" summary and an old/new diff. The change also updates offline packs, flags affected questions and notes, and may adjust the plan.
- **Certificate:** a PDF certificate on completing a field, shareable to LinkedIn.

---

## 3. Core data model (draft)

```
User(id, name, role[student|teacher], interests[], locale='az', streak, streakRecord)
Field(id, name, color)
Topic(id, fieldId, title, summary, order)
LawArticle(id, code, number, text, sourceUrl, version, updatedAt)
Question(id, topicId, fieldId, text, options[], correctKey, explanation, articleIds[])
Attempt(id, userId, questionId, context[quiz|drill|exam|review|group], chosenKey, correct, at)
ReviewItem(userId, questionId, step[0..3], dueAt, wrongCount, streakCorrect, mastered)
Exam(id, userId, format, startedAt, submittedAt, score, perField{}, answers[])
Case(id, fieldId, title, facts[], question, verdictOptions[], correctVerdict, courtArticleIds[], reasoning[])
CaseAttempt(userId, caseId, verdict, articleIds[], at)
Term(id, name, fieldIds[], definition, plainText, articleId, relatedTermIds[])
Note(id, userId, articleId|topicId, quote, range, body, linkedCaseId?, linkedTopicId?, createdAt)
Bookmark(userId, type[question|topic|term], refId)
Plan(userId, examType, examDate, daysOfWeek[], minutesPerDay, phases[])
PlanTask(id, planId, date, type, refId, done, carriedFrom?)
OfflinePack(userId, fieldId, version, sizeMb, downloadedAt)
Group(id, teacherId, name, code, createdAt)
GroupMember(groupId, userId, joinedAt)
Assignment(id, groupId, type, topicId, questionCount, deadline, timeLimitMin?)
AssignmentResult(assignmentId, userId, score, completedAt)
AIRequest(id, userId, context, prompt, level, citedArticleIds[], confidence, at)
```

## 4. Key rules summary

| Rule | Logic |
|---|---|
| Review interval | Steps are 1, 3, 7 and 30 days. Correct moves to step+1. Wrong resets to step 0 (tomorrow). 4 correct in a row means mastered. |
| Exam readiness | Weighted average of the last 3 attempts, compared to a pass line of 70. |
| Exam auto‑submit | When the timer reaches 0. Warning at 5 minutes left. |
| Plan carry‑over | An undone task moves to the next study day (not the next calendar day) with the tag "From yesterday". |
| Group task on Home | Shown until the deadline or until completed. |
| Wrong answers | Any context adds the question to the ReviewItem queue. |
| Deletes | Every delete requires a confirmation (Cancel / Delete). |
| AI answers | Must cite ≥1 article. Otherwise the answer shows a "source not found" state. |
| Privacy | Teachers see only assignment results and activity, never notes or bookmarks. |
| Offline | Answers are stored locally and synced later. AI is disabled. Packs are versioned per field. |

## 5. Questions for the technical recommendation

1. **Stack:** cross‑platform mobile (React Native / Flutter) plus web. Should the website share code with the app?
2. **Offline‑first:** choice of local DB (SQLite / WatermelonDB / Realm), sync engine, conflict resolution for review state, streak and plan.
3. **Content pipeline:** ingesting and versioning law texts from e-qanun.az (scraping vs. official source), detecting article changes, diffing, and mapping changes to questions, notes and offline packs.
4. **AI:** RAG over versioned law articles with mandatory citations, a confidence threshold for "source not found", streaming, cost control, and moderation. Where should embeddings be stored?
5. **Search:** Azerbaijani‑aware full‑text search and sorting (İ/ı, Ə, Ş, Ç, Ğ, Ö, Ü), fuzzy matching for typos.
6. **Scheduling:** where should the spaced repetition and plan carry‑over logic run: client, server or both? Consider timezones and "study day" rules.
7. **Notifications:** push for due reviews, plan reminders, teacher "Remind" and law changes.
8. **Auth and roles:** email/password, Google and Apple sign‑in, and the student/teacher role model.
9. **Analytics:** exam readiness, hardest questions per group, and per‑field accuracy.
10. **PDF certificates** (future): generation and verification links.
11. **Scale assumptions:** Azerbaijani law students, roughly 10k–100k users. Content is 6 fields, hundreds of topics and thousands of questions.

---

## 6. Design file map (for reference)

| File | Screens |
|---|---|
| Huquq Onboarding | 01–06 welcome, role, interests, time, sign‑up, login, password reset |
| Huquq Hub | H1 Home (Today), H2 Profile hubs, H3 entry‑point map (main versions) |
| Huquq Learning | 08–12 field, topic, question, feedback, result |
| Huquq Engagement | 13–19 daily drill, bookmarks, feed, settings |
| Huquq Review | R1–R5 spaced repetition |
| Huquq Exam | X1–X6 mock exam |
| Huquq Cases | K1–K4 cases |
| Huquq Notes | N1–N4 notes and highlights |
| Huquq Glossary | T1–T3 glossary |
| Huquq Plan | P1–P4 study plan |
| Huquq Offline | O1–O5 offline mode |
| Huquq Groups | M1–M6 teacher/group mode |
| Huquq AI | A1–A5 grounded AI assistant |
| Huquq Explore | E1–E6 explore, articles, law updates, search |
| Huquq Game / Challenge | G1–G9, C1–C6 game modes |
| Huquq Landing / Website | Marketing site, 1440px web W1–W6 |
