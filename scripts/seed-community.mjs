// Одноразовый скрипт: заполняет /community CRM данными из community-seed-data.json.
// Запуск: node scripts/seed-community.mjs <admin-password> [worker-url]
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const password = process.argv[2];
const base = process.argv[3] || 'https://cmo-razbory.oxion-ezhkov.workers.dev';

if (!password) {
  console.error('Использование: node scripts/seed-community.mjs <admin-password> [worker-url]');
  process.exit(1);
}

const people = JSON.parse(readFileSync(join(__dirname, 'community-seed-data.json'), 'utf-8'));

async function main() {
  const loginRes = await fetch(base + '/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const loginData = await loginRes.json();
  if (!loginData.ok) throw new Error('Login failed: ' + JSON.stringify(loginData));
  const headers = { 'Content-Type': 'application/json', Authorization: loginData.token };

  for (const p of people) {
    const createRes = await fetch(base + '/api/community', {
      method: 'POST', headers,
      body: JSON.stringify({ action: 'create', name: p.name })
    });
    const created = await createRes.json();
    if (!created.ok) { console.error('Failed to create', p.name, created); continue; }
    const id = created.person.id;

    await fetch(base + '/api/community', {
      method: 'POST', headers,
      body: JSON.stringify({ action: 'update-fields', id, telegram: p.telegram, email: p.email || '' })
    });

    for (const pay of p.payments || []) {
      await fetch(base + '/api/community', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'add-payment', id, amount: pay.amount, date: pay.date })
      });
    }
    for (const req of p.requests || []) {
      await fetch(base + '/api/community', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'add-request', id, text: req.text, date: req.date })
      });
    }
    for (const note of p.notes || []) {
      await fetch(base + '/api/community', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'add-note', id, text: note.text, date: note.date })
      });
    }
    console.log('Seeded:', p.name);
  }
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
