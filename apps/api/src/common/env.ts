import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

/** Load the repo root `.env` (shared by all workspaces). Real env vars take precedence. */
export function loadDotEnv(): void {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // src/common or dist/common → repo root
  config({ path: path.resolve(here, '../../../../.env'), quiet: true });
}
