#!/usr/bin/env node
// Собирает страницу /ai-notify в модуль, который импортирует Cloudflare Worker.
// Запускать после правки index.html: node ai-notify/build-worker-assets.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const html = await fs.readFile(path.join(DIR, 'index.html'), 'utf8');

const out = `// Файл сгенерирован: node ai-notify/build-worker-assets.mjs — руками не править.
export const AI_NOTIFY_HTML = ${JSON.stringify(html)};
`;

await fs.mkdir(path.join(DIR, 'dist'), { recursive: true });
await fs.writeFile(path.join(DIR, 'dist', 'worker-assets.js'), out);
console.log(`• ai-notify/dist/worker-assets.js — ${(out.length / 1024).toFixed(0)} КБ`);
