#!/usr/bin/env node
// Собирает страницу /crm в один HTML-файл и стартовую базу знаний для воркера.
// Запускать после правки index.html, crm.css, crm.js или файлов в kb/: node crm/build-worker-assets.mjs
//
// База знаний: каждый kb/*.md — страница верхнего уровня (заголовок — первая строка «# …»).
// Если в файле есть строка <!-- split -->, разделы «## …» становятся подстраницами,
// а большой раздел (>12 КБ) дробится ещё и по «### …». Раздел «Содержание» пропускается.
// Это только стартовое наполнение: при первом открытии оно копируется в KV (tgcrm:kb),
// дальше база правится в интерфейсе.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFile(path.join(DIR, f), 'utf8');

const ICONS = { scripts: '📞', guide: '🧭' };
const SECTION_ICONS = ['📊', '💬', '🛡️', '🛠️', '⚠️', '✅', '❓', '📌'];
let seq = 0;
const pid = name => `seed-${name}-${++seq}`;

// Делит markdown по заголовкам уровня `level` (## или ###): [{ title, body }], intro — текст до первого.
function splitBy(md, level) {
  const re = new RegExp(`^${'#'.repeat(level)} (.+)$`, 'gm');
  const parts = [];
  let m, last = 0, title = null;
  while ((m = re.exec(md))) {
    parts.push({ title, body: md.slice(last, m.index) });
    title = m[1].trim(); last = re.lastIndex;
  }
  parts.push({ title, body: md.slice(last) });
  const intro = parts.shift().body;
  return { intro, sections: parts.map(p => ({ title: p.title, body: p.body.replace(/\n---\s*$/m, '').trim() })) };
}
const clean = t => t.replace(/^\d+(\.\d+)*\.?\s+/, '');

const pages = [];
const files = (await fs.readdir(path.join(DIR, 'kb'))).filter(f => f.endsWith('.md')).sort((a, b) => (b === 'guide.md') - (a === 'guide.md'));
for (const file of files) {
  const raw = (await read(`kb/${file}`)).replace(/\r/g, '');
  const name = file.replace(/\.md$/, '');
  const split = raw.includes('<!-- split -->');
  const titleMatch = raw.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : name;
  const body = raw.replace(/<!-- split -->\n?/, '').replace(/^# .+\n/m, '');
  const root = { id: pid(name), title, icon: ICONS[name] || '📄', parentId: null, content: body.trim() };
  pages.push(root);
  if (!split) continue;
  const { intro, sections } = splitBy(body, 2);
  root.content = intro.replace(/\n---\s*$/m, '').trim();
  let i = 0;
  for (const s of sections) {
    if (/^Содержание/i.test(s.title)) continue;
    const page = { id: pid(name), title: clean(s.title), icon: SECTION_ICONS[i++ % SECTION_ICONS.length], parentId: root.id, content: s.body };
    pages.push(page);
    if (s.body.length > 12000) {
      const sub = splitBy(s.body, 3);
      if (sub.sections.length > 1) {
        page.content = sub.intro.trim();
        for (const ss of sub.sections) pages.push({ id: pid(name), title: clean(ss.title), icon: '📄', parentId: page.id, content: ss.body });
      }
    }
  }
}

const [html, css, js] = await Promise.all([read('index.html'), read('crm.css'), read('crm.js')]);
const safe = s => {
  if (/<\/script/i.test(s)) throw new Error('В скрипте встречается </script — сборка остановлена');
  return s;
};
let out = html;
for (const [k, v] of Object.entries({ css: `<style>\n${css}</style>`, js: `<script>\n${safe(js)}</script>` })) {
  const re = new RegExp(`<!--INLINE:${k}-->[\\s\\S]*?<!--/INLINE-->`);
  if (!re.test(out)) throw new Error(`Нет метки INLINE:${k} в index.html`);
  out = out.replace(re, () => v);
}

const mod = `// Файл сгенерирован: node crm/build-worker-assets.mjs — руками не править.
export const CRM_HTML = ${JSON.stringify(out)};
export const KB_SEED = ${JSON.stringify(pages)};
`;
await fs.mkdir(path.join(DIR, 'dist'), { recursive: true });
await fs.writeFile(path.join(DIR, 'dist', 'worker-assets.js'), mod);
console.log(`• crm/dist/worker-assets.js — ${(mod.length / 1024).toFixed(0)} КБ, страниц в базе знаний: ${pages.length}`);
for (const p of pages) console.log(`  ${p.parentId ? (pages.find(x => x.id === p.parentId).parentId ? '      ' : '   ') : ''}${p.icon} ${p.title} (${(p.content.length / 1024).toFixed(1)} КБ)`);
