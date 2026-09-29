interface IssueLike {
  path: readonly PropertyKey[];
  message: string;
  code?: string;
}

/** Flatten zod issues (checked structurally, so any zod instance works). */
export function zodIssues(error: unknown): { path: string; message: string; code?: string }[] {
  if (typeof error !== 'object' || error === null || !('issues' in error)) return [];
  const { issues } = error;
  if (!Array.isArray(issues)) return [];
  return (issues as IssueLike[]).map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
    ...(issue.code ? { code: issue.code } : {}),
  }));
}
