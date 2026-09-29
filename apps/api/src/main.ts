import 'reflect-metadata';
import { createApp } from './app.factory.js';
import { loadConfig } from './common/config.js';
import { loadDotEnv } from './common/env.js';

loadDotEnv();
const config = loadConfig();
const app = await createApp(config);
await app.listen(config.PORT);
