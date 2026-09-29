/**
 * Small Azerbaijani seed for local development. Idempotent (fixed ids, upserts).
 *
 *   pnpm --filter api seed
 *
 * The law texts are shortened development placeholders based on the Criminal Code
 * of the Republic of Azerbaijan. Always check the official text on e-qanun.az; the
 * law-sync job (later phase) replaces them with the real, versioned articles.
 */
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { sql } from 'drizzle-orm';
import { createDb, field, lawArticle, topic, type Database } from '@huquq/db';
import { loadDotEnv } from '../common/env.js';
import { importQuestions } from './lib/question-importer.js';

const CRIMINAL_CODE_URL = 'https://e-qanun.az/framework/46947';
const ARTICLE_VERSION = '2024-01-01';

const FIELDS = [
  { id: 'a1000000-0000-4000-8000-000000000001', slug: 'cinayet-huququ', name: 'Cinayət hüququ' },
  { id: 'a1000000-0000-4000-8000-000000000002', slug: 'inzibati-huquq', name: 'İnzibati hüquq' },
  { id: 'a1000000-0000-4000-8000-000000000003', slug: 'emek-huququ', name: 'Əmək hüququ' },
  { id: 'a1000000-0000-4000-8000-000000000004', slug: 'mulki-huquq', name: 'Mülki hüquq' },
  { id: 'a1000000-0000-4000-8000-000000000005', slug: 'aile-huququ', name: 'Ailə hüququ' },
  {
    id: 'a1000000-0000-4000-8000-000000000006',
    slug: 'konstitusiya-huququ',
    name: 'Konstitusiya hüququ',
  },
] as const;

const TOPIC = {
  id: 'b1000000-0000-4000-8000-000000000001',
  fieldId: FIELDS[0].id,
  slug: 'cinayet-mesuliyyeti-yasi',
  name: 'Cinayət məsuliyyəti yaşı',
  sortOrder: 1,
  summary: [
    'Cinayət məsuliyyətinə cinayət törədilənədək müəyyən yaşa çatmış anlaqlı fiziki şəxs cəlb edilir.',
    '',
    '- **Ümumi qayda:** cinayət törədilənədək 16 yaşı tamam olmuş şəxslər məsuliyyət daşıyır (CM, maddə 20.1).',
    '- **İstisna:** qəsdən adam öldürmə, oğurluq, soyğunçuluq kimi ağır əməllərə görə məsuliyyət 14 yaşdan başlayır (CM, maddə 20.2).',
    '- **Anlaqsızlıq:** əməli törədərkən öz hərəkətlərini dərk edə və ya idarə edə bilməyən şəxs məsuliyyətə cəlb edilmir (CM, maddə 21).',
  ].join('\n'),
};

const ARTICLES = [
  {
    id: 'c1000000-0000-4000-8000-000000000019',
    number: '19',
    text: 'Maddə 19. Cinayət məsuliyyətinin ümumi şərtləri. Cinayət törətdiyi vaxt anlaqlı olan və bu Məcəllədə nəzərdə tutulmuş yaşa çatmış fiziki şəxs cinayət məsuliyyətinə cəlb edilir. [İnkişaf üçün qısaldılmış mətn]',
  },
  {
    id: 'c1000000-0000-4000-8000-000000000020',
    number: '20',
    text: 'Maddə 20. Cinayət məsuliyyətinə cəlb edilmə yaşı. 20.1. Cinayət törədilənədək on altı yaşı tamam olmuş şəxslər cinayət məsuliyyətinə cəlb edilir. 20.2. Cinayət törədilənədək on dörd yaşı tamam olmuş şəxslər qəsdən adam öldürməyə, oğurluğa, soyğunçuluğa, quldurluğa və Məcəllədə sadalanan digər əməllərə görə cinayət məsuliyyətinə cəlb edilir. [İnkişaf üçün qısaldılmış mətn]',
  },
  {
    id: 'c1000000-0000-4000-8000-000000000021',
    number: '21',
    text: 'Maddə 21. Anlaqsızlıq. Cinayət qanunu ilə nəzərdə tutulmuş əməli törədərkən anlaqsız vəziyyətdə olan, yəni psixi xəstəlik nəticəsində öz hərəkətlərinin ictimai təhlükəliliyini dərk edə bilməyən və ya onları idarə edə bilməyən şəxs cinayət məsuliyyətinə cəlb edilmir. [İnkişaf üçün qısaldılmış mətn]',
  },
] as const;

const QUESTIONS = [
  {
    id: 'd1000000-0000-4000-8000-000000000001',
    fieldSlug: 'cinayet-huququ',
    topicSlug: TOPIC.slug,
    type: 'single_choice',
    prompt:
      'Azərbaycan Respublikasının Cinayət Məcəlləsinə görə cinayət məsuliyyətinin ümumi yaşı neçədir?',
    options: [
      { key: 'A', text: '14 yaş' },
      { key: 'B', text: '16 yaş' },
      { key: 'C', text: '18 yaş' },
      { key: 'D', text: '21 yaş' },
    ],
    correctAnswer: 'B',
    explanation:
      'Ümumi qaydaya görə cinayət törədilənədək 16 yaşı tamam olmuş şəxslər cinayət məsuliyyətinə cəlb edilir.',
    difficulty: 1,
    articles: [{ code: 'CM', number: '20' }],
  },
  {
    id: 'd1000000-0000-4000-8000-000000000002',
    fieldSlug: 'cinayet-huququ',
    topicSlug: TOPIC.slug,
    type: 'single_choice',
    prompt: 'Qəsdən adam öldürməyə görə cinayət məsuliyyəti hansı yaşdan başlayır?',
    options: [
      { key: 'A', text: '12 yaş' },
      { key: 'B', text: '14 yaş' },
      { key: 'C', text: '16 yaş' },
      { key: 'D', text: '18 yaş' },
    ],
    correctAnswer: 'B',
    explanation:
      'Qəsdən adam öldürmə 20.2-ci maddədə sadalanan əməllərdəndir: məsuliyyət 14 yaşdan başlayır.',
    difficulty: 2,
    articles: [{ code: 'CM', number: '20' }],
  },
  {
    id: 'd1000000-0000-4000-8000-000000000003',
    fieldSlug: 'cinayet-huququ',
    topicSlug: TOPIC.slug,
    type: 'true_false',
    prompt: 'Cinayət məsuliyyətinə yalnız fiziki şəxslər cəlb edilə bilər.',
    correctAnswer: 'true',
    explanation: 'Cinayət məsuliyyətinə anlaqlı və müəyyən yaşa çatmış fiziki şəxs cəlb edilir.',
    difficulty: 1,
    articles: [{ code: 'CM', number: '19' }],
  },
  {
    id: 'd1000000-0000-4000-8000-000000000004',
    fieldSlug: 'cinayet-huququ',
    topicSlug: TOPIC.slug,
    type: 'true_false',
    prompt: 'Əməli törədərkən anlaqsız vəziyyətdə olan şəxs cinayət məsuliyyətinə cəlb edilir.',
    correctAnswer: 'false',
    explanation: 'Anlaqsız vəziyyətdə olan şəxs cinayət məsuliyyətinə cəlb edilmir.',
    difficulty: 2,
    articles: [{ code: 'CM', number: '21' }],
  },
  {
    id: 'd1000000-0000-4000-8000-000000000005',
    fieldSlug: 'cinayet-huququ',
    topicSlug: TOPIC.slug,
    type: 'single_choice',
    prompt: 'Cinayət məsuliyyəti yaşı hansı an üçün müəyyən edilir?',
    options: [
      { key: 'A', text: 'Hökmün çıxarıldığı gün' },
      { key: 'B', text: 'Cinayətin törədildiyi an' },
      { key: 'C', text: 'Cinayət işinin başlandığı gün' },
      { key: 'D', text: 'Şəxsin tutulduğu gün' },
    ],
    correctAnswer: 'B',
    explanation:
      'Qanun "cinayət törədilənədək" yaşa çatmağı tələb edir, yəni yaş əməlin törədildiyi an üçün müəyyən edilir.',
    difficulty: 3,
    articles: [
      { code: 'CM', number: '20' },
      { code: 'CM', number: '19' },
    ],
  },
];

export async function seed(db: Database): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(field)
      .values(FIELDS.map((f) => ({ ...f, sortOrder: 0 })))
      .onConflictDoUpdate({
        target: field.slug,
        set: { name: sql`excluded.name`, sortOrder: sql`excluded.sort_order` },
      });
    await tx
      .insert(topic)
      .values(TOPIC)
      .onConflictDoUpdate({
        target: topic.id,
        set: { name: TOPIC.name, summary: TOPIC.summary, sortOrder: TOPIC.sortOrder },
      });
    await tx
      .insert(lawArticle)
      .values(
        ARTICLES.map((a) => ({
          ...a,
          code: 'CM',
          version: ARTICLE_VERSION,
          sourceUrl: CRIMINAL_CODE_URL,
          contentHash: createHash('sha256').update(a.text).digest('hex'),
        })),
      )
      .onConflictDoNothing();
  });

  const report = await importQuestions(
    db,
    QUESTIONS.map((data, index) => ({ row: index + 1, data })),
  );
  if (report.invalid.length > 0) {
    throw new Error(`Seed questions are invalid: ${JSON.stringify(report.invalid)}`);
  }
  console.log(
    `Seeded ${FIELDS.length} fields, 1 topic, ${ARTICLES.length} articles, ` +
      `${report.inserted + report.updated} questions (${report.inserted} new).`,
  );
}

// Run when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadDotEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { db, pool } = createDb(url, { max: 2 });
  try {
    await seed(db);
  } finally {
    await pool.end();
  }
}
