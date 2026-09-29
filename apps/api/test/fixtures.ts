import { createHash } from 'node:crypto';
import type { Database } from '@huquq/db';
import { field, lawArticle, question, questionArticle, topic } from '@huquq/db';

export const IDS = {
  fieldCriminal: '10000000-0000-4000-8000-000000000001',
  fieldAdmin: '10000000-0000-4000-8000-000000000002',
  fieldLabor: '10000000-0000-4000-8000-000000000003',
  fieldFamily: '10000000-0000-4000-8000-000000000004',
  topicAge: '20000000-0000-4000-8000-000000000001',
  topicLabor: '20000000-0000-4000-8000-000000000002',
  article20: '30000000-0000-4000-8000-000000000001',
  article21: '30000000-0000-4000-8000-000000000002',
  q1: '40000000-0000-4000-8000-000000000001',
  q2: '40000000-0000-4000-8000-000000000002',
  q3: '40000000-0000-4000-8000-000000000003',
  missing: '9f9f9f9f-0000-4000-8000-000000000000',
} as const;

const hash = (text: string) => createHash('sha256').update(text).digest('hex');

/** A small content tree: 4 fields (names chosen to exercise az sorting), 2 topics, 3 questions. */
export async function seedContent(db: Database): Promise<void> {
  await db.insert(field).values([
    { id: IDS.fieldAdmin, slug: 'inzibati-huquq', name: 'İnzibati hüquq' },
    { id: IDS.fieldLabor, slug: 'emek-huququ', name: 'Əmək hüququ' },
    { id: IDS.fieldCriminal, slug: 'cinayet-huququ', name: 'Cinayət hüququ' },
    { id: IDS.fieldFamily, slug: 'aile-huququ', name: 'Ailə hüququ' },
  ]);
  await db.insert(topic).values([
    {
      id: IDS.topicAge,
      fieldId: IDS.fieldCriminal,
      slug: 'cinayet-mesuliyyeti-yasi',
      name: 'Cinayət məsuliyyəti yaşı',
      summary: 'Ümumi qayda: 16 yaş.',
    },
    {
      id: IDS.topicLabor,
      fieldId: IDS.fieldLabor,
      slug: 'emek-muqavilesi',
      name: 'Əmək müqaviləsi',
    },
  ]);
  const text20 = 'Maddə 20 mətni';
  const text21 = 'Maddə 21 mətni';
  await db.insert(lawArticle).values([
    {
      id: IDS.article21,
      code: 'CM',
      number: '21',
      version: '2024-01-01',
      text: text21,
      contentHash: hash(text21),
    },
    {
      id: IDS.article20,
      code: 'CM',
      number: '20',
      version: '2024-01-01',
      text: text20,
      contentHash: hash(text20),
      sourceUrl: 'https://e-qanun.az/framework/46947',
    },
  ]);
  await db.insert(question).values([
    {
      id: IDS.q1,
      topicId: IDS.topicAge,
      type: 'single_choice',
      prompt: 'Cinayət məsuliyyətinin ümumi yaşı neçədir?',
      options: [
        { key: 'A', text: '14' },
        { key: 'B', text: '16' },
      ],
      correctAnswer: 'B',
      explanation: 'CM 20.1',
      difficulty: 1,
    },
    {
      id: IDS.q2,
      topicId: IDS.topicAge,
      type: 'true_false',
      prompt: 'Qəsdən adam öldürməyə görə 14 yaşdan məsuliyyət yaranır.',
      options: [
        { key: 'true', text: 'Doğru' },
        { key: 'false', text: 'Yanlış' },
      ],
      correctAnswer: 'true',
      difficulty: 2,
    },
    {
      id: IDS.q3,
      topicId: IDS.topicLabor,
      type: 'true_false',
      prompt: 'Əmək müqaviləsi yazılı bağlanır.',
      options: [
        { key: 'true', text: 'Doğru' },
        { key: 'false', text: 'Yanlış' },
      ],
      correctAnswer: 'true',
      difficulty: 1,
    },
  ]);
  await db.insert(questionArticle).values([
    { questionId: IDS.q1, articleId: IDS.article20 },
    { questionId: IDS.q2, articleId: IDS.article20 },
    { questionId: IDS.q2, articleId: IDS.article21 },
  ]);
}
