// ─── Журнал модерации клубных чатов ─────────────────────────────────────────
// Каждое событие модерации пишется в KV по дням (по Москве): modlog:day:YYYY-MM-DD → [событие, …].
// Страница /moderation показывает журнал с фильтрами и сортировкой (moderation/log-page.js).
// При первом открытии журнал дополняется прошлыми данными, которые бот уже хранит
// (анкеты, отметки входа, доверенные) — см. backfillModLog.

export const MOD_EVENT_TYPES = {
  join: 'Вошёл в чат',
  join_request: 'Заявка принята автоматически',
  join_request_failed: 'Заявку не удалось принять',
  msg_deleted: 'Сообщение удалено (нет анкеты)',
  anketa_start: 'Начал анкету',
  anketa_done: 'Заполнил анкету',
  trust_add: 'Добавлен в доверенные',
  trust_remove: 'Убран из доверенных',
  sheet_fail: 'Анкета не записалась в таблицу'
};

const DAY_TTL = 400 * 24 * 3600;
const DAY_CAP = 5000;

export function mskDay(ts = Date.now()) {
  return new Date(ts + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

function personOf(user) {
  if (!user) return {};
  return {
    userId: user.id != null ? String(user.id) : '',
    username: user.username || '',
    name: [user.first_name, user.last_name].filter(Boolean).join(' ')
  };
}

// ev: { type, club, user?, userId?, username?, name?, detail?, by?, ts? }
export async function modLog(env, ev) {
  try {
    const ts = ev.ts || Date.now();
    const p = ev.user ? personOf(ev.user) : { userId: ev.userId != null ? String(ev.userId) : '', username: ev.username || '', name: ev.name || '' };
    const row = { ts, type: ev.type, club: ev.club || '', ...p, detail: ev.detail ? String(ev.detail).slice(0, 300) : '', by: ev.by || '' };
    // Момент запуска журнала: прошлые данные дописываются только до него (без дублей)
    if (!(await env.KV.get('modlog:started_at'))) await env.KV.put('modlog:started_at', String(ts));
    const key = `modlog:day:${mskDay(ts)}`;
    const list = await env.KV.get(key, 'json') || [];
    if (list.length >= DAY_CAP) return;
    list.push(row);
    await env.KV.put(key, JSON.stringify(list), { expirationTtl: DAY_TTL });
  } catch (e) {
    console.error('modLog failed:', e);
  }
}

async function listAll(env, prefix) {
  const keys = [];
  let cursor;
  do {
    const res = await env.KV.list({ prefix, cursor });
    keys.push(...res.keys);
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);
  return keys;
}

// Разово переносит в журнал то, что бот уже знал до появления журнала.
// Ограничено по числу чтений KV, чтобы уложиться в лимиты Cloudflare за один вызов.
async function backfillModLog(env, clubs, normChatId) {
  if (await env.KV.get('modlog:backfilled_v1')) return;
  const startedAt = Number(await env.KV.get('modlog:started_at')) || Date.now();
  // только то, что было до запуска журнала (с запасом в минуту: отметка входа ставится чуть раньше первой записи)
  const before = (ts) => ts && ts < startedAt - 60 * 1000;
  const rows = [];
  let budget = 800;
  const clubByChat = {};
  for (const [key, c] of Object.entries(clubs)) for (const id of c.chatIds) clubByChat[normChatId(id)] = key;

  const names = {};
  for (const k of await listAll(env, 'mod:anketa:')) {
    if (budget-- <= 0) break;
    const r = await env.KV.get(k.name, 'json');
    if (!r) continue;
    const name = r.answers?.name || [r.firstName, r.lastName].filter(Boolean).join(' ');
    names[String(r.tgId)] = { name, username: r.username || '' };
    if (!before(Date.parse(r.filledAt))) continue;
    rows.push({ ts: Date.parse(r.filledAt), type: 'anketa_done', club: r.club, userId: String(r.tgId), username: r.username || '', name, detail: '', by: '' });
  }
  for (const k of await listAll(env, 'mod:new:')) {
    if (budget-- <= 0) break;
    const [, , chat, userId] = k.name.split(':');
    const ts = Number(await env.KV.get(k.name));
    if (!before(ts)) continue;
    const n = names[userId] || {};
    rows.push({ ts, type: 'join', club: clubByChat[chat] || '', userId, username: n.username || '', name: n.name || '', detail: 'до появления журнала', by: '' });
  }
  const trust = await env.KV.get('mod:trust:list', 'json') || [];
  for (const e of trust) if (before(Date.parse(e.at))) rows.push({ ts: Date.parse(e.at), type: 'trust_add', club: '', userId: e.id || '', username: e.username || '', name: e.label || '', detail: '', by: e.byName || '' });

  const byDay = {};
  for (const r of rows) (byDay[mskDay(r.ts)] ||= []).push(r);
  for (const [day, list] of Object.entries(byDay)) {
    const key = `modlog:day:${day}`;
    const existing = await env.KV.get(key, 'json') || [];
    await env.KV.put(key, JSON.stringify(existing.concat(list).slice(0, DAY_CAP)), { expirationTtl: DAY_TTL });
  }
  await env.KV.put('modlog:backfilled_v1', String(rows.length));
}

// GET /api/mod/log?from=YYYY-MM-DD&to=YYYY-MM-DD — события за период (по умолчанию 30 дней)
export async function modLogApi(request, env, url, { isAdmin, clubs, normChatId }) {
  if (!isAdmin(request)) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  await backfillModLog(env, clubs, normChatId);
  const today = mskDay();
  const to = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('to') || '') ? url.searchParams.get('to') : today;
  let from = url.searchParams.get('from');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '')) from = mskDay(Date.now() - 29 * 86400 * 1000);
  const days = [];
  for (let t = Date.parse(from + 'T12:00:00Z'); t <= Date.parse(to + 'T12:00:00Z') && days.length < 366; t += 86400 * 1000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  const events = [];
  for (const d of days) {
    const list = await env.KV.get(`modlog:day:${d}`, 'json');
    if (list) events.push(...list);
  }
  events.sort((a, b) => b.ts - a.ts);
  const clubTitles = Object.fromEntries(Object.entries(clubs).map(([k, c]) => [k, c.title]));
  return Response.json({ ok: true, from, to, events, clubs: clubTitles, types: MOD_EVENT_TYPES });
}
