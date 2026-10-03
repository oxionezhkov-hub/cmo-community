#!/usr/bin/env node
// Собирает страницу /plan в один HTML-файл и модуль для Cloudflare Worker.
// Запускать после правки index.html, plan.css, plan.js или seed.md: node plan/build-worker-assets.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFile(path.join(DIR, f), 'utf8');

// Шаблон-конспект: подхватывается страницей при первом открытии
const seedMd = await read('seed.md');
const seedJs = `// Файл сгенерирован из seed.md: node plan/build-worker-assets.mjs — руками не править.\nwindow.PLAN_SEED_MD = ${JSON.stringify(seedMd).replace(/<\//g, '<\\/')};\n`;
await fs.writeFile(path.join(DIR, 'seed.js'), seedJs);

const [html, css, js] = await Promise.all([read('index.html'), read('plan.css'), read('plan.js')]);
const safe = s => {
  if (/<\/script/i.test(s)) throw new Error('В скрипте встречается </script — сборка остановлена');
  return s;
};
const inline = {
  css: `<style>\n${css}</style>`,
  seed: `<script>\n${safe(seedJs)}</script>`,
  js: `<script>\n${safe(js)}</script>`
};
let out = html;
for (const [k, v] of Object.entries(inline)) {
  const re = new RegExp(`<!--INLINE:${k}-->[\\s\\S]*?<!--/INLINE-->`);
  if (!re.test(out)) throw new Error(`Нет метки INLINE:${k} в index.html`);
  out = out.replace(re, () => v);
}

const mod = `// Файл сгенерирован: node plan/build-worker-assets.mjs — руками не править.
export const PLAN_HTML = ${JSON.stringify(out)};
`;
await fs.mkdir(path.join(DIR, 'dist'), { recursive: true });
await fs.writeFile(path.join(DIR, 'dist', 'worker-assets.js'), mod);
console.log(`• plan/dist/worker-assets.js — ${(mod.length / 1024).toFixed(0)} КБ`);
