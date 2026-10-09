// ─── CRM ЛИЧКИ (/crm) ───────────────────────────────────────
// Рабочее место для переписки с лидами из личного Telegram Олега.
//
// Откуда берутся диалоги: личка подключена к инбоксу в воркере tasktracker
// (репозиторий mybrand-smm, Telegram Business → бот-инбокс). Этот модуль
// ходит в его API (/message/api/...) через service binding INBOX и
// отдельный токен INBOX_API_TOKEN — тот же, что задан на tasktracker как
// INBOX_CMO_TOKEN (или общий INBOX_ACCESS_TOKEN).
//
// Что хранится здесь, в KV этого воркера (префикс tgcrm:):
//   tgcrm:users                 — пользователи CRM (логин, роль, хэш пароля)
//   tgcrm:session:<token>       — сессии (TTL 30 дней)
//   tgcrm:tri:<chatId>          — решение админа «добавляем диалог в CRM / нет»
//   tgcrm:lead:<chatId>         — карточка лида: этап, заметка, ответственный
//   tgcrm:au:<chatId>:<msgId>   — кто из сотрудников отправил сообщение
//   tgcrm:task:<id>             — задача по лиду
//   tgcrm:ev:<дата>:<userId>:…  — журнал действий (бэклог для разборов)
//   tgcrm:presence:<дата>:<userId> — когда сотрудник был в системе
//   tgcrm:kbp:<id>, tgcrm:kbfile:<id> — база знаний (страницы и файлы)
//   tgcrm:summaries             — ИИ-разборы работы сотрудников
//
// Всё, что пишут несколько человек одновременно, лежит по отдельному ключу
// на запись, а краткая версия — в metadata ключа: список читается одним
// KV.list, и параллельные записи (быстрые свайпы, два сотрудника) не
// затирают друг друга, как было бы с одним общим JSON-массивом.
//
// Роли: admin видит всё (разбор новых диалогов, журнал, пользователи),
// manager — только диалоги, добавленные в CRM, задачи и базу знаний.

import { CRM_HTML, KB_SEED } from "./dist/worker-assets.js";

const INBOX_BASE_DEFAULT = "https://tasktracker.oxion-ezhkov.workers.dev";
const SESSION_TTL = 60 * 60 * 24 * 30;
const LOG_TTL = 60 * 60 * 24 * 400;
const MAX_BROADCAST = 50;
const MAX_KB_FILE = 20 * 1024 * 1024;

export const LEAD_STAGES = [
  { id: "new", title: "Новый" },
  { id: "work", title: "В работе" },
  { id: "call", title: "Созвон назначен" },
  { id: "think", title: "Думает" },
  { id: "pay", title: "Ждём оплату" },
  { id: "client", title: "Клиент" },
  { id: "lost", title: "Отказ" }
];

// Стартовые пользователи — создаются при первом обращении, если в KV ещё
// никого нет. Пароли выданы владельцу отдельно, здесь только PBKDF2-хэши;
// сменить пароль или добавить сотрудника — в разделе «Команда» на /crm.
const DEFAULT_USERS = [
  { id: "oleg", login: "oleg", name: "Олег", role: "admin",
    salt: "58ea65b63d384fa81a2d9c7714c42571", hash: "a4b162375a543512cd1c8ccd060b73213a03c3fef9ae72fefc4653e8e9556e0b" },
  { id: "roman", login: "roman", name: "Роман", role: "manager",
    salt: "22c648531f21173364f8fd1b05d5ee81", hash: "6253d8341310d624ce08e47c801905efacee91b1f3e68a7435682c83ed31457a" }
];

// ─── helpers ────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

async function kget(env, key, def) {
  const v = await env.KV.get(key, "json");
  return v ?? def;
}

function kput(env, key, val, opts) {
  return env.KV.put(key, JSON.stringify(val), opts);
}

// Все ключи с префиксом вместе с metadata (KV.list отдаёт до 1000 за раз).
async function listKeys(env, prefix) {
  const out = [];
  let cursor;
  do {
    const r = await env.KV.list({ prefix, cursor });
    out.push(...r.keys);
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return out;
}

// metadata ключа KV ограничена 1024 байтами — длинные строки укорачиваем.
function fitMeta(obj) {
  const m = { ...obj };
  const size = () => new TextEncoder().encode(JSON.stringify(m)).length;
  let limit = 300;
  while (size() > 1000 && limit > 10) {
    for (const k of Object.keys(m)) if (typeof m[k] === "string" && m[k].length > limit) m[k] = m[k].slice(0, limit) + "…";
    limit = Math.floor(limit * 0.7);
  }
  return m;
}

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

function randomId(bytes = 16) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return [...a].map(b => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations: 100000 }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Дата по Москве — журнал и присутствие режутся по московским суткам.
function mskDate(ms = Date.now()) {
  return new Date(ms + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

// Дни от to назад до from включительно (YYYY-MM-DD), не больше max.
function dayRange(from, to, max) {
  const days = [];
  for (let t = Date.parse(to + "T12:00:00Z"); days.length < max && !Number.isNaN(t); t -= 86400000) {
    const d = new Date(t).toISOString().slice(0, 10);
    if (d < from) break;
    days.push(d);
  }
  return days;
}

function publicUser(u) {
  return { id: u.id, login: u.login, name: u.name, role: u.role, active: u.active !== false };
}

// ─── пользователи и сессии ──────────────────────────────────
async function loadUsers(env) {
  let users = await kget(env, "tgcrm:users", null);
  if (!users) {
    users = DEFAULT_USERS.map(u => ({ ...u, active: true, createdAt: Date.now() }));
    await kput(env, "tgcrm:users", users);
  }
  return users;
}

async function getSession(request, env, url) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1] || url.searchParams.get("t") || "";
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  const sess = await kget(env, `tgcrm:session:${token}`, null);
  if (!sess) return null;
  const users = await loadUsers(env);
  const user = users.find(u => u.id === sess.userId && u.active !== false);
  if (!user) return null;
  return { token, user, sess };
}

// ─── журнал действий и присутствие ──────────────────────────
// Каждое действие сотрудника пишется в его дневной журнал — по нему админ
// смотрит, что происходило, и строит ИИ-разбор (что улучшить в скриптах).
async function logEvent(env, user, type, data = {}) {
  const at = Date.now();
  const ev = { at, type, ...data };
  const key = `tgcrm:ev:${mskDate(at)}:${user.id}:${String(at).padStart(14, "0")}${randomId(3)}`;
  const raw = JSON.stringify(ev);
  // Короткое событие целиком в metadata (читается одним list), длинное — в значении.
  if (new TextEncoder().encode(raw).length <= 1000) await env.KV.put(key, "", { metadata: { e: ev }, expirationTtl: LOG_TTL });
  else await env.KV.put(key, raw, { metadata: { big: 1 }, expirationTtl: LOG_TTL });
}

async function readEvents(env, day, userId) {
  const keys = await listKeys(env, `tgcrm:ev:${day}:${userId}:`);
  const events = await Promise.all(keys.map(k => k.metadata?.e ? k.metadata.e : kget(env, k.name, null)));
  return events.filter(Boolean).sort((a, b) => a.at - b.at);
}

// Пинг раз в минуту со страницы: первое/последнее появление за день и
// сколько минут сотрудник реально был в системе (вкладка открыта).
async function touchPresence(env, user, visible) {
  const day = mskDate();
  const key = `tgcrm:presence:${day}:${user.id}`;
  const now = Date.now();
  const p = await kget(env, key, null) || { first: now, last: 0, minutes: 0, sessions: 0 };
  if (now - (p.last || 0) < 50 * 1000) return p;
  if (visible) {
    if (p.last && now - p.last < 3 * 60 * 1000) p.minutes += Math.round((now - p.last) / 60000);
    else p.sessions += 1;
  }
  p.last = now;
  await kput(env, key, p, { expirationTtl: LOG_TTL });
  return p;
}

// ─── инбокс (tasktracker) ───────────────────────────────────
function inboxToken(env) {
  return env.INBOX_API_TOKEN || env.INBOX_ACCESS_TOKEN || "";
}

async function inboxFetch(env, path, init = {}) {
  const token = inboxToken(env);
  if (!token) throw new InboxError("Не задан секрет INBOX_API_TOKEN — CRM не подключена к личке", 503);
  const base = env.INBOX_API_BASE || INBOX_BASE_DEFAULT;
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const req = new Request(`${base}/message/api/${path}`, { ...init, headers });
  // Service binding — запрос идёт напрямую в воркер tasktracker, минуя
  // публичный workers.dev (воркер на workers.dev не может fetch-ить соседа).
  const res = env.INBOX ? await env.INBOX.fetch(req) : await fetch(req);
  return res;
}

class InboxError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

async function inboxJson(env, path, init) {
  const res = await inboxFetch(env, path, init);
  let data = null;
  try { data = await res.json(); } catch { /* not json */ }
  if (!res.ok) throw new InboxError(data?.error ? `Инбокс: ${data.error}` : `Инбокс ответил ${res.status}`, res.status === 401 ? 503 : 502);
  return data;
}

async function inboxConversations(env) {
  const data = await inboxJson(env, "conversations");
  return (data.conversations || []).filter(c => c.chatType === "private" || !c.chatType);
}

// ─── доступ к диалогам ──────────────────────────────────────
async function loadTriage(env) {
  const out = {};
  for (const k of await listKeys(env, "tgcrm:tri:")) out[k.name.slice(10)] = k.metadata || {};
  return out;
}

async function setTriage(env, chatId, decision, userId) {
  if (decision === "in" || decision === "out") await env.KV.put(`tgcrm:tri:${chatId}`, "", { metadata: { d: decision, by: userId, at: Date.now() } });
  else await env.KV.delete(`tgcrm:tri:${chatId}`);
}

// Лиды: полная карточка в значении, этап/ответственный/начало заметки — в metadata.
async function loadLeads(env) {
  const out = {};
  for (const k of await listKeys(env, "tgcrm:lead:")) out[k.name.slice(11)] = k.metadata || {};
  return out;
}

async function getLead(env, chatId) {
  return kget(env, `tgcrm:lead:${chatId}`, null);
}

async function saveLead(env, chatId, lead) {
  const meta = fitMeta({ stage: lead.stage || "new", assignee: lead.assignee || null, tags: (lead.tags || []).join(","), note: (lead.note || "").slice(0, 200) });
  await env.KV.put(`tgcrm:lead:${chatId}`, JSON.stringify(lead), { metadata: meta });
}

// Задачи: полная задача в значении, всё нужное для списков — в metadata.
// Выполненные живут ещё 60 дней и удаляются сами.
async function loadTasks(env) {
  return (await listKeys(env, "tgcrm:task:")).map(k => k.metadata).filter(Boolean);
}

async function getTask(env, id) {
  return kget(env, `tgcrm:task:${id}`, null);
}

async function saveTask(env, task) {
  const meta = fitMeta({ ...task, note: (task.note || "").slice(0, 200), noteCut: (task.note || "").length > 200 });
  await env.KV.put(`tgcrm:task:${task.id}`, JSON.stringify(task), { metadata: meta, ...(task.done ? { expirationTtl: 60 * 86400 } : {}) });
}

function isInCrm(triage, chatId) {
  return triage[chatId]?.d === "in";
}

async function canAccessChat(env, user, chatId) {
  if (user.role === "admin") return true;
  const triage = await loadTriage(env);
  return isInCrm(triage, chatId);
}

// ─── сообщения ──────────────────────────────────────────────
async function getMessages(env, chatId, url) {
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "80", 10) || 80, 300);
  const prefix = `tgcrm:au:${chatId}:`;
  const [data, authorKeys, users, lead] = await Promise.all([
    inboxJson(env, `conversations/${encodeURIComponent(chatId)}/messages?limit=${limit}&offset=${offset}`),
    listKeys(env, prefix), loadUsers(env), offset ? null : getLead(env, chatId)
  ]);
  const authors = Object.fromEntries(authorKeys.map(k => [k.name.slice(prefix.length), k.metadata?.u]));
  const names = Object.fromEntries(users.map(u => [u.id, u.name]));
  const messages = (data.messages || []).map(m => {
    const out = {
      id: m.id, tgMessageId: m.tgMessageId, direction: m.direction, at: m.at, type: m.type,
      text: m.text || "", fileName: m.fileName, mimeType: m.mimeType, hasFile: !!m.fileId,
      entities: m.entities, editedAt: m.editedAt, deletedAt: m.deletedAt
    };
    if (m.direction === "out") {
      const a = authors[m.tgMessageId];
      out.author = a ? (names[a] || a) : null; // null — отправлено с телефона в Telegram
      out.authorId = a || null;
    }
    return out;
  });
  return { messages, total: data.total, hasMore: data.hasMore, lead };
}

async function sendMessage(env, user, chatId, text) {
  const data = await inboxJson(env, `conversations/${encodeURIComponent(chatId)}/send`, {
    method: "POST",
    body: JSON.stringify({ text })
  });
  const msg = data.message;
  if (msg?.tgMessageId) await env.KV.put(`tgcrm:au:${chatId}:${msg.tgMessageId}`, "", { metadata: { u: user.id } });
  return msg;
}

// ─── сводка для списка лидов ────────────────────────────────
function leadView(conv, triage, leads, tasks) {
  const lead = leads[conv.chatId] || {};
  const open = tasks.filter(t => t.chatId === conv.chatId && !t.done).sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));
  return {
    chatId: conv.chatId,
    name: conv.displayName,
    username: conv.username,
    unread: conv.unread || 0,
    lastMessageAt: conv.lastMessageAt,
    lastMessagePreview: conv.lastMessagePreview,
    lastDirection: conv.lastDirection,
    stage: lead.stage || "new",
    note: lead.note || "",
    assignee: lead.assignee || null,
    tags: lead.tags ? String(lead.tags).split(",").filter(Boolean) : [],
    nextTask: open[0] ? { id: open[0].id, text: open[0].text, dueAt: open[0].dueAt } : null,
    openTasks: open.length,
    decision: triage[conv.chatId]?.d || null
  };
}

// ─── ИИ-разбор работы сотрудника ────────────────────────────
async function buildSummary(env, admin, body) {
  if (!env.CLAUDE_API) throw new InboxError("Не задан секрет CLAUDE_API", 503);
  const userId = body.userId;
  const from = body.from || mskDate(Date.now() - 6 * 86400000);
  const to = body.to || mskDate();
  const users = await loadUsers(env);
  const target = users.find(u => u.id === userId);
  if (!target) throw new InboxError("Нет такого сотрудника", 400);

  const days = dayRange(from, to, 31).reverse();
  const lines = [];
  for (const day of days) {
    const [log, pres] = await Promise.all([
      readEvents(env, day, userId),
      kget(env, `tgcrm:presence:${day}:${userId}`, null)
    ]);
    if (pres) lines.push(`## ${day}: в системе ${pres.minutes} мин, вход ${new Date(pres.first + 3 * 3600e3).toISOString().slice(11, 16)}, последний раз ${new Date(pres.last + 3 * 3600e3).toISOString().slice(11, 16)} (МСК)`);
    for (const e of log) {
      const t = new Date(e.at + 3 * 3600e3).toISOString().slice(11, 16);
      if (e.type === "send") lines.push(`${day} ${t} отправил «${e.chatName}»: ${e.text}${e.context ? `\n   (последнее от клиента перед этим: ${e.context})` : ""}`);
      else if (e.type === "task_create") lines.push(`${day} ${t} поставил задачу по «${e.chatName}»: ${e.text} на ${e.due}`);
      else if (e.type === "task_done") lines.push(`${day} ${t} закрыл задачу по «${e.chatName}»: ${e.text}`);
      else if (e.type === "stage") lines.push(`${day} ${t} перевёл «${e.chatName}» в этап «${e.stage}»`);
      else if (e.type === "login") lines.push(`${day} ${t} вошёл в систему`);
      else if (e.type === "broadcast") lines.push(`${day} ${t} рассылка на ${e.count} чел.: ${e.text}`);
    }
  }
  if (!lines.length) return { text: "За выбранный период действий нет." };

  const kb = await loadKb(env);
  const scripts = kb.map(p => `# ${p.title}\n${p.content || ""}`).join("\n\n").slice(0, 30000);
  const system = "Ты — руководитель отдела продаж и наставник менеджера. Разбираешь журнал работы менеджера в CRM: его сообщения лидам, задачи, этапы, время в системе. "
    + "Пиши по-русски, конкретно, без воды. Структура ответа:\n"
    + "1. Итог периода (цифры: дни, минуты в системе, сообщений, диалогов, задач).\n"
    + "2. Что получилось хорошо (с цитатами).\n"
    + "3. Ошибки и упущенные возможности (с цитатами и как надо было ответить) — долгие ответы, нет следующего шага, не назначил созвон/задачу, отступил от скрипта, грамматика и тон.\n"
    + "4. Что поменять в скриптах (конкретные новые формулировки).\n"
    + "5. Три задачи менеджеру на следующую неделю.";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": env.CLAUDE_API, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: env.TGCRM_AI_MODEL || "claude-sonnet-5-5",
      max_tokens: 3000,
      system,
      messages: [{ role: "user", content: `Менеджер: ${target.name}. Период: ${from} — ${to}.\n\nТЕКУЩИЕ СКРИПТЫ (база знаний):\n${scripts}\n\nЖУРНАЛ:\n${lines.join("\n").slice(0, 120000)}` }]
    })
  });
  if (!res.ok) throw new InboxError(`Модель ответила ${res.status}: ${(await res.text()).slice(0, 200)}`, 502);
  const data = await res.json();
  const text = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("\n").trim();
  const list = await kget(env, "tgcrm:summaries", []);
  const item = { id: randomId(8), userId, userName: target.name, from, to, text, at: Date.now(), by: admin.id };
  list.unshift(item);
  await kput(env, "tgcrm:summaries", list.slice(0, 50));
  return item;
}

// ─── база знаний ────────────────────────────────────────────
// Страница — отдельный ключ tgcrm:kbp:<id>. Стартовое наполнение (KB_SEED,
// собирается из crm/kb/*.md) кладётся один раз — флаг tgcrm:kb-seeded,
// чтобы удалённые страницы не возвращались.
async function loadKb(env) {
  const keys = await listKeys(env, "tgcrm:kbp:");
  if (!keys.length && !(await env.KV.get("tgcrm:kb-seeded"))) {
    const now = Date.now();
    const pages = KB_SEED.map((p, i) => ({ ...p, order: i, updatedAt: now, updatedBy: "seed", files: [] }));
    await Promise.all(pages.map(savePage.bind(null, env)));
    await env.KV.put("tgcrm:kb-seeded", "1");
    return pages;
  }
  return (await Promise.all(keys.map(k => kget(env, k.name, null)))).filter(Boolean);
}

function savePage(env, page) {
  return kput(env, `tgcrm:kbp:${page.id}`, page);
}

// ─── главный обработчик ─────────────────────────────────────
export function serveCrm() {
  return new Response(CRM_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }
  });
}

export async function handleCrmApi(request, env, url) {
  try {
    return await route(request, env, url);
  } catch (e) {
    if (e instanceof InboxError) return json({ error: e.message }, e.status);
    console.error("tgcrm error", e);
    return json({ error: e.message || "Ошибка" }, 500);
  }
}

async function route(request, env, url) {
  const parts = url.pathname.replace(/^\/api\/tgcrm\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const [res0, id, sub, subId] = parts;
  const method = request.method;

  // ── вход ──
  if (res0 === "login" && method === "POST") {
    const body = await readBody(request);
    const login = String(body.login || "").trim().toLowerCase();
    const users = await loadUsers(env);
    const user = users.find(u => u.login === login && u.active !== false);
    // Пауза против перебора паролей.
    if (!user || !safeEqual(await hashPassword(String(body.password || ""), user.salt), user.hash)) {
      await new Promise(r => setTimeout(r, 600));
      return json({ error: "Неверный логин или пароль" }, 401);
    }
    const token = randomId(24);
    await kput(env, `tgcrm:session:${token}`, { userId: user.id, at: Date.now(), ua: (request.headers.get("User-Agent") || "").slice(0, 160) }, { expirationTtl: SESSION_TTL });
    await logEvent(env, user, "login", { ip: request.headers.get("CF-Connecting-IP") || "" });
    return json({ token, user: publicUser(user) });
  }

  const session = await getSession(request, env, url);
  if (!session) return json({ error: "Нужно войти" }, 401);
  const { user } = session;
  const isAdmin = user.role === "admin";

  if (res0 === "logout" && method === "POST") {
    await env.KV.delete(`tgcrm:session:${session.token}`);
    await logEvent(env, user, "logout");
    return json({ ok: true });
  }

  if (res0 === "me") return json({ user: publicUser(user), stages: LEAD_STAGES });

  // ── состояние для опроса раз в N секунд: лиды, задачи, счётчики ──
  if (res0 === "state" && method === "GET") {
    const visible = url.searchParams.get("visible") !== "0";
    const [convs, triage, leads, tasks, users] = await Promise.all([
      inboxConversations(env), loadTriage(env), loadLeads(env), loadTasks(env), loadUsers(env), touchPresence(env, user, visible)
    ]);
    const inCrm = convs.filter(c => isInCrm(triage, c.chatId));
    const leadList = inCrm.map(c => leadView(c, triage, leads, tasks));
    const allowed = new Set(inCrm.map(c => c.chatId));
    const myTasks = tasks.filter(t => isAdmin || allowed.has(t.chatId));
    return json({
      user: publicUser(user),
      stages: LEAD_STAGES,
      users: users.filter(u => u.active !== false).map(publicUser),
      leads: leadList,
      tasks: myTasks,
      triagePending: isAdmin ? convs.filter(c => !triage[c.chatId]).length : 0,
      serverTime: Date.now()
    });
  }

  // ── разбор диалогов (свайпы) — только админ ──
  if (res0 === "triage") {
    if (!isAdmin) return json({ error: "Только для админа" }, 403);
    if (method === "GET") {
      const [convs, triage, leads, tasks] = await Promise.all([inboxConversations(env), loadTriage(env), loadLeads(env), loadTasks(env)]);
      return json({ conversations: convs.map(c => ({ ...leadView(c, triage, leads, tasks), decidedAt: triage[c.chatId]?.at || null, createdAt: c.createdAt })) });
    }
    if (method === "POST") {
      const body = await readBody(request);
      const chatId = String(body.chatId || "");
      if (!chatId) return json({ error: "Нет chatId" }, 400);
      await setTriage(env, chatId, body.decision, user.id);
      if (body.decision === "in" && !(await getLead(env, chatId))) await saveLead(env, chatId, { stage: "new", createdAt: Date.now() });
      await logEvent(env, user, "triage", { chatId, chatName: body.chatName || "", decision: body.decision || null });
      return json({ ok: true });
    }
  }

  // ── диалог ──
  if (res0 === "chats" && id) {
    const chatId = id;
    if (!(await canAccessChat(env, user, chatId))) return json({ error: "Диалог не добавлен в CRM" }, 403);

    if (sub === "messages" && method === "GET") {
      const data = await getMessages(env, chatId, url);
      if (url.searchParams.get("log") === "1") await logEvent(env, user, "open", { chatId, chatName: url.searchParams.get("name") || "" });
      return json(data);
    }

    if (sub === "send" && method === "POST") {
      const body = await readBody(request);
      const text = String(body.text || "").trim();
      if (!text) return json({ error: "Пустое сообщение" }, 400);
      if (text.length > 4000) return json({ error: "Слишком длинное сообщение (максимум 4000 символов)" }, 400);
      const msg = await sendMessage(env, user, chatId, text);
      await logEvent(env, user, "send", { chatId, chatName: body.chatName || "", text: text.slice(0, 1500), context: String(body.context || "").slice(0, 400) });
      return json({ message: { ...msg, author: user.name, authorId: user.id } });
    }

    if (sub === "read" && method === "POST") {
      await inboxJson(env, `conversations/${encodeURIComponent(chatId)}/read`, { method: "POST" });
      return json({ ok: true });
    }

    if (sub === "media" && subId && method === "GET") {
      const res = await inboxFetch(env, `media/${encodeURIComponent(chatId)}/${encodeURIComponent(subId)}`);
      if (!res.ok) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      for (const h of ["Content-Type", "Content-Disposition"]) if (res.headers.get(h)) headers.set(h, res.headers.get(h));
      headers.set("Cache-Control", "private, max-age=86400");
      return new Response(res.body, { headers });
    }
  }

  // ── карточка лида ──
  if (res0 === "leads" && id && method === "PATCH") {
    const chatId = id;
    if (!(await canAccessChat(env, user, chatId))) return json({ error: "Диалог не добавлен в CRM" }, 403);
    const body = await readBody(request);
    const lead = await getLead(env, chatId) || { stage: "new", createdAt: Date.now() };
    if ("stage" in body && LEAD_STAGES.some(s => s.id === body.stage)) {
      if (lead.stage !== body.stage) await logEvent(env, user, "stage", { chatId, chatName: body.chatName || "", stage: LEAD_STAGES.find(s => s.id === body.stage).title });
      lead.stage = body.stage;
    }
    if ("note" in body) lead.note = String(body.note || "").slice(0, 5000);
    if ("assignee" in body) lead.assignee = body.assignee || null;
    if ("tags" in body && Array.isArray(body.tags)) lead.tags = body.tags.map(String).slice(0, 20);
    lead.updatedAt = Date.now();
    lead.updatedBy = user.id;
    await saveLead(env, chatId, lead);
    return json({ ok: true, lead });
  }

  // ── рассылка по выбранным лидам ──
  if (res0 === "broadcast" && method === "POST") {
    const body = await readBody(request);
    const text = String(body.text || "").trim();
    const ids = Array.isArray(body.chatIds) ? body.chatIds.map(String) : [];
    if (!text || !ids.length) return json({ error: "Нужен текст и получатели" }, 400);
    if (ids.length > MAX_BROADCAST) return json({ error: `Не больше ${MAX_BROADCAST} получателей за раз` }, 400);
    const triage = await loadTriage(env);
    const convs = await inboxConversations(env);
    const byId = Object.fromEntries(convs.map(c => [c.chatId, c]));
    const results = [];
    for (const chatId of ids) {
      if (!isInCrm(triage, chatId) || !byId[chatId]) { results.push({ chatId, ok: false, error: "не в CRM" }); continue; }
      const c = byId[chatId];
      const personal = text.replace(/\{имя\}|\{name\}/gi, (c.displayName || "").split(" ")[0] || "");
      try {
        await sendMessage(env, user, chatId, personal);
        results.push({ chatId, ok: true });
      } catch (e) {
        results.push({ chatId, ok: false, error: e.message });
      }
      await new Promise(r => setTimeout(r, 350));
    }
    await logEvent(env, user, "broadcast", { text: text.slice(0, 1500), count: results.filter(r => r.ok).length, chatIds: ids });
    return json({ results });
  }

  // ── задачи ──
  if (res0 === "tasks") {
    if (method === "POST" && !id) {
      const body = await readBody(request);
      const chatId = String(body.chatId || "");
      if (!chatId || !(await canAccessChat(env, user, chatId))) return json({ error: "Нет доступа к диалогу" }, 403);
      const text = String(body.text || "").trim();
      const dueAt = Number(body.dueAt) || null;
      if (!text) return json({ error: "Опиши задачу" }, 400);
      const task = {
        id: randomId(8), chatId, chatName: String(body.chatName || ""), text: text.slice(0, 500),
        note: String(body.note || "").slice(0, 3000), dueAt, assignee: body.assignee || user.id,
        createdBy: user.id, createdAt: Date.now(), done: false
      };
      await saveTask(env, task);
      await logEvent(env, user, "task_create", { chatId, chatName: task.chatName, text: task.text, due: dueAt ? new Date(dueAt + 3 * 3600e3).toISOString().slice(0, 16).replace("T", " ") : "без даты" });
      return json({ task });
    }
    if (id) {
      const task = await getTask(env, id);
      if (!task) return json({ error: "Задача не найдена" }, 404);
      if (!(await canAccessChat(env, user, task.chatId))) return json({ error: "Нет доступа" }, 403);
      if (method === "GET") return json({ task });
      if (method === "PATCH") {
        const body = await readBody(request);
        if ("text" in body) task.text = String(body.text || "").slice(0, 500);
        if ("note" in body) task.note = String(body.note || "").slice(0, 3000);
        if ("dueAt" in body) task.dueAt = Number(body.dueAt) || null;
        if ("assignee" in body) task.assignee = body.assignee || null;
        if ("done" in body) {
          const done = !!body.done;
          if (done && !task.done) await logEvent(env, user, "task_done", { chatId: task.chatId, chatName: task.chatName, text: task.text });
          task.done = done;
          task.doneAt = done ? Date.now() : null;
          task.doneBy = done ? user.id : null;
        }
        task.updatedAt = Date.now();
        await saveTask(env, task);
        return json({ task });
      }
      if (method === "DELETE") {
        await env.KV.delete(`tgcrm:task:${id}`);
        await logEvent(env, user, "task_delete", { chatId: task.chatId, chatName: task.chatName, text: task.text });
        return json({ ok: true });
      }
    }
  }

  // ── база знаний ──
  if (res0 === "kb") {
    const kb = await loadKb(env);
    if (method === "GET" && !id) return json({ pages: kb });
    if (method === "POST" && !id) {
      const body = await readBody(request);
      const page = {
        id: randomId(8), title: String(body.title || "Без названия").slice(0, 200), icon: String(body.icon || "📄").slice(0, 8),
        parentId: body.parentId || null, content: String(body.content || ""), order: kb.reduce((m, p) => Math.max(m, p.order || 0), 0) + 1,
        updatedAt: Date.now(), updatedBy: user.id, files: []
      };
      await savePage(env, page);
      await logEvent(env, user, "kb_create", { title: page.title });
      return json({ page });
    }
    const page = kb.find(p => p.id === id);
    if (!page) return json({ error: "Страница не найдена" }, 404);
    if (sub === "files" && method === "POST") {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") return json({ error: "Нет файла" }, 400);
      if (file.size > MAX_KB_FILE) return json({ error: "Файл больше 20 МБ" }, 400);
      const fileId = randomId(10);
      await env.KV.put(`tgcrm:kbfile:${fileId}`, await file.arrayBuffer(), { metadata: { name: file.name, type: file.type || "application/octet-stream" } });
      page.files = page.files || [];
      page.files.push({ id: fileId, name: file.name, size: file.size, type: file.type, at: Date.now(), by: user.id });
      page.updatedAt = Date.now();
      await savePage(env, page);
      await logEvent(env, user, "kb_file", { title: page.title, file: file.name });
      return json({ page });
    }
    if (sub === "files" && subId && method === "DELETE") {
      page.files = (page.files || []).filter(f => f.id !== subId);
      await env.KV.delete(`tgcrm:kbfile:${subId}`);
      await savePage(env, page);
      return json({ page });
    }
    if (method === "PATCH") {
      const body = await readBody(request);
      if ("title" in body) page.title = String(body.title || "Без названия").slice(0, 200);
      if ("icon" in body) page.icon = String(body.icon || "📄").slice(0, 8);
      if ("content" in body) page.content = String(body.content || "").slice(0, 500000);
      if ("parentId" in body) page.parentId = body.parentId && body.parentId !== page.id ? body.parentId : null;
      if ("order" in body) page.order = Number(body.order) || 0;
      page.updatedAt = Date.now();
      page.updatedBy = user.id;
      await savePage(env, page);
      await logEvent(env, user, "kb_edit", { title: page.title });
      return json({ page });
    }
    if (method === "DELETE") {
      const drop = new Set([page.id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const p of kb) if (p.parentId && drop.has(p.parentId) && !drop.has(p.id)) { drop.add(p.id); grew = true; }
      }
      for (const p of kb) {
        if (!drop.has(p.id)) continue;
        for (const f of p.files || []) await env.KV.delete(`tgcrm:kbfile:${f.id}`);
        await env.KV.delete(`tgcrm:kbp:${p.id}`);
      }
      await logEvent(env, user, "kb_delete", { title: page.title });
      return json({ ok: true });
    }
  }

  if (res0 === "kbfile" && id && method === "GET") {
    const { value, metadata } = await env.KV.getWithMetadata(`tgcrm:kbfile:${id}`, "arrayBuffer");
    if (!value) return new Response("Not found", { status: 404 });
    const name = (metadata?.name || "file").replace(/["\r\n]/g, "");
    return new Response(value, {
      headers: {
        "Content-Type": metadata?.type || "application/octet-stream",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, max-age=3600"
      }
    });
  }

  // ── дальше только админ ──
  if (!isAdmin) return json({ error: "Только для админа" }, 403);

  // Журнал: действия и присутствие сотрудников по дням.
  if (res0 === "activity" && method === "GET") {
    const users = await loadUsers(env);
    const to = url.searchParams.get("to") || mskDate();
    const from = url.searchParams.get("from") || mskDate(Date.now() - 6 * 86400000);
    const only = url.searchParams.get("user");
    const days = dayRange(from, to, 62);
    const out = [];
    for (const day of days) {
      for (const u of users) {
        if (only && u.id !== only) continue;
        const [events, presence] = await Promise.all([
          readEvents(env, day, u.id),
          kget(env, `tgcrm:presence:${day}:${u.id}`, null)
        ]);
        if (!events.length && !presence) continue;
        out.push({ day, userId: u.id, userName: u.name, presence, events });
      }
    }
    return json({ days: out, summaries: (await kget(env, "tgcrm:summaries", [])).filter(s => !only || s.userId === only) });
  }

  if (res0 === "summary" && method === "POST") {
    return json({ summary: await buildSummary(env, user, await readBody(request)) });
  }

  // Команда: добавить сотрудника, сменить пароль, отключить доступ.
  if (res0 === "users") {
    const users = await loadUsers(env);
    if (method === "GET") return json({ users: users.map(publicUser) });
    if (method === "POST" && !id) {
      const body = await readBody(request);
      const login = String(body.login || "").trim().toLowerCase();
      if (!/^[a-z0-9._-]{2,32}$/.test(login)) return json({ error: "Логин — латиница/цифры, 2–32 символа" }, 400);
      if (users.some(u => u.login === login)) return json({ error: "Такой логин уже есть" }, 400);
      const password = String(body.password || "");
      if (password.length < 6) return json({ error: "Пароль от 6 символов" }, 400);
      const salt = randomId(16);
      const u = { id: login, login, name: String(body.name || login).slice(0, 60), role: body.role === "admin" ? "admin" : "manager", salt, hash: await hashPassword(password, salt), active: true, createdAt: Date.now() };
      users.push(u);
      await kput(env, "tgcrm:users", users);
      return json({ user: publicUser(u) });
    }
    const u = users.find(x => x.id === id);
    if (!u) return json({ error: "Нет такого пользователя" }, 404);
    if (method === "PATCH") {
      const body = await readBody(request);
      if (body.name) u.name = String(body.name).slice(0, 60);
      if (body.role && u.id !== user.id) u.role = body.role === "admin" ? "admin" : "manager";
      if ("active" in body && u.id !== user.id) u.active = !!body.active;
      if (body.password) {
        if (String(body.password).length < 6) return json({ error: "Пароль от 6 символов" }, 400);
        u.salt = randomId(16);
        u.hash = await hashPassword(String(body.password), u.salt);
      }
      await kput(env, "tgcrm:users", users);
      return json({ user: publicUser(u) });
    }
  }

  return json({ error: "Не найдено" }, 404);
}
