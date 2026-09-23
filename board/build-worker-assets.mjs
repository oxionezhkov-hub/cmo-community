#!/usr/bin/env node
// Собирает картинку превью для /board в модуль, который импортирует Cloudflare Worker.
// Запускать после замены og-vacancies.jpg: node board/build-worker-assets.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const img = await fs.readFile(path.join(DIR, 'og-vacancies.jpg'));

const out = `// Файл сгенерирован: node board/build-worker-assets.mjs — руками не править.
export const BOARD_OG_IMAGE_B64 = ${JSON.stringify(img.toString('base64'))};
`;

await fs.mkdir(path.join(DIR, 'dist'), { recursive: true });
await fs.writeFile(path.join(DIR, 'dist', 'worker-assets.js'), out);
console.log(`• board/dist/worker-assets.js — ${(out.length / 1024).toFixed(0)} КБ`);
