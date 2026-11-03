// ─── МОДЕРАЦИЯ КЛУБНЫХ ЧАТОВ ────────────────────────────────────────────────
// Новые участники клубных чатов не могут писать, пока не заполнят анкету:
//  1. Бот видит вход человека в чат (chat_member / new_chat_members) и помечает его как «новичка».
//  2. Сообщения новичка сразу удаляются. Напоминание «заполни анкету» уходит ему в личку —
//     его видит только он. Если бот не может написать первым (человек ни разу не запускал бота),
//     в чате на 15 секунд появляется короткое сообщение со ссылкой на бота и удаляется само.
//  3. Анкета проходит в личке с ботом. После неё визитка публикуется в чат, ответы уходят
//     в Google Таблицу (Apps Script, секрет MOD_SHEET_WEBHOOK), человек может писать.
// Участники, которые были в чате до подключения бота, не ограничиваются.
// Боту в каждом чате нужны права администратора: «Удаление сообщений».

export const MOD_BOT_USERNAME = 'cmo_razbory_bot';

// Вопросы анкеты. key — колонка в таблице, card — показывать в визитке,
// required — нельзя пропустить, auto: 'username' — берём @username из Telegram и не спрашиваем, если он есть.
// Сейчас у всех клубов вопросы из их Google Форм; у каждого клуба список свой — меняется здесь.
const FORM_QUESTIONS = [
  { key: 'name', label: 'Имя', text: 'Как тебя зовут?', required: true, card: true },
  { key: 'telegram', label: 'Telegram', text: 'Контакт в Telegram (личный, без анонимов)', required: true, auto: 'username' },
  { key: 'background', label: 'Бэкграунд', text: 'Расскажи про свой бэкграунд: какие проекты были в прошлом? Текущая компания и должность. Твоя экспертиза и польза для других участников сообщества', required: true, card: true },
  { key: 'pain', label: 'Что болит', text: 'Что сейчас болит больше всего?', required: false, card: true },
  { key: 'email', label: 'Email', text: 'Электронная почта (если нужен доступ к базе знаний)', required: false },
  { key: 'questions', label: 'Вопросы на старте', text: 'Какие есть вопросы к нам на старте?', required: false }
];

// chatIds — id чатов без префикса -100 (как их показывает Telegram), можно несколько на клуб.
export const MOD_CLUBS = {
  edtech: {
    title: '@CMO EdTech',
    chatIds: ['3803744801'],
    about: 'Закрытый клуб про образование и продвижение: обучающие материалы, видео, статьи, обратная связь и общение.',
    questions: FORM_QUESTIONS
  },
  agency: {
    title: '@CMO Агентства',
    chatIds: ['2162277146'],
    about: 'Клуб для руководителей digital-агентств от сообщества cmo.pro: растём минимум x2 в обороте за счёт нетворкинга, обмена опытом и взаимной партнёрки.',
    questions: FORM_QUESTIONS
  },
  sales: {
    title: 'Sales Club',
    chatIds: ['4486767094'],
    about: 'Объединяем коммерсов от специалистов до CCO и CEO. Лидер клуба — Полина Славкина: 18 лет в роли CCO и COO, 10+ отделов продаж в разных индустриях.',
    questions: FORM_QUESTIONS
  },
  ai: {
    title: '@CMO Заработок с AI',
    chatIds: ['2239422398'],
    about: 'Вместе осваиваем навыки AI и зарабатываем удалённо, даже если ещё не пробовали ИИ.',
    questions: FORM_QUESTIONS
  }
};

const NOTICE_TTL_MS = 15 * 1000;        // сколько висит подсказка в чате, если в личку написать нельзя
const DM_THROTTLE_SEC = 10 * 60;        // не чаще раза в 10 минут напоминать в личку
const GROUP_NOTICE_THROTTLE_SEC = 60;   // не чаще раза в минуту показывать подсказку в чате

function normChatId(id) {
  return String(id).replace(/^-100/, '').replace(/^-/, '');
}

export function modClubByChat(chatId) {
  const n = normChatId(chatId);
  for (const [key, club] of Object.entries(MOD_CLUBS)) {
    if (club.chatIds.some(c => normChatId(c) === n)) return { key, club };
  }
  return null;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function tg(env, method, body) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (e) {
    return { ok: false, description: String(e) };
  }
}

function sendHtml(env, chatId, text, replyMarkup) {
  return tg(env, 'sendMessage', {
    chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

async function notifyAdminOnce(env, flagKey, text, ttlSec = 6 * 3600) {
  if (!env.ADMIN_ID) return;
  if (await env.KV.get(flagKey)) return;
  await env.KV.put(flagKey, '1', { expirationTtl: ttlSec });
  await sendHtml(env, env.ADMIN_ID, text);
}

function startLink(clubKey) {
  return `https://t.me/${MOD_BOT_USERNAME}?start=mod_${clubKey}`;
}

function fullName(u) {
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || 'участник';
}

// ─── Вход в чат ──────────────────────────────────────────────────────────────
async function markNewcomer(env, chatId, user, clubKey) {
  if (!user || user.is_bot) return;
  if (await env.KV.get(`mod:ok:${clubKey}:${user.id}`)) return; // анкета уже есть — ничего не делаем
  await env.KV.put(`mod:new:${normChatId(chatId)}:${user.id}`, String(Date.now()));
  await sendInviteDm(env, user.id, clubKey, true);
}

function isPresent(status) {
  return ['member', 'restricted', 'administrator', 'creator'].includes(status);
}

// update.chat_member — приходит, если бот админ и в allowed_updates есть chat_member
export async function modHandleChatMember(update, env) {
  const cm = update.chat_member;
  if (!cm) return;
  const found = modClubByChat(cm.chat.id);
  if (!found) return;
  const was = isPresent(cm.old_chat_member?.status) && cm.old_chat_member?.is_member !== false;
  const now = isPresent(cm.new_chat_member?.status) && cm.new_chat_member?.is_member !== false;
  if (was || !now) return;
  if (['administrator', 'creator'].includes(cm.new_chat_member.status)) return;
  await markNewcomer(env, cm.chat.id, cm.new_chat_member.user, found.key);
}

// update.chat_join_request — человек подал заявку по ссылке «по заявке».
// Одобряют заявки админы клуба, бот только сразу присылает анкету.
export async function modHandleJoinRequest(update, env) {
  const req = update.chat_join_request;
  if (!req) return;
  const found = modClubByChat(req.chat.id);
  if (!found) return;
  if (await env.KV.get(`mod:ok:${found.key}:${req.from.id}`)) return;
  await env.KV.put(`mod:new:${normChatId(req.chat.id)}:${req.from.id}`, String(Date.now()));
  // На заявку боту разрешено написать первым — даже если человек не запускал бота
  await sendInviteDm(env, req.user_chat_id || req.from.id, found.key, true);
}

// ─── Сообщения в чате ────────────────────────────────────────────────────────
// Возвращает true, если сообщение удалено (дальше его обрабатывать не нужно).
export async function modHandleGroupMessage(msg, env, ctx) {
  const found = modClubByChat(msg.chat.id);
  if (!found) return false;
  const { key: clubKey, club } = found;

  // Вход через сервисное сообщение — помечаем новичков
  if (Array.isArray(msg.new_chat_members)) {
    for (const u of msg.new_chat_members) await markNewcomer(env, msg.chat.id, u, clubKey);
    return false;
  }

  const from = msg.from;
  if (!from || from.is_bot || msg.sender_chat) return false; // боты, каналы, анонимные админы
  const newKey = `mod:new:${normChatId(msg.chat.id)}:${from.id}`;
  if (!(await env.KV.get(newKey))) return false;              // старый участник — пишет свободно
  if (await env.KV.get(`mod:ok:${clubKey}:${from.id}`)) return false;

  // Админов чата не трогаем, даже если они зашли недавно
  const member = await tg(env, 'getChatMember', { chat_id: msg.chat.id, user_id: from.id });
  if (member.ok && ['administrator', 'creator'].includes(member.result.status)) {
    await env.KV.delete(newKey);
    return false;
  }

  const del = await tg(env, 'deleteMessage', { chat_id: msg.chat.id, message_id: msg.message_id });
  if (!del.ok) {
    await notifyAdminOnce(env, `mod:warn:nodelete:${normChatId(msg.chat.id)}`,
      `⚠️ Модерация «${esc(club.title)}»: бот не может удалять сообщения новичков. Дай боту право администратора «Удаление сообщений».\n\n<code>${esc(del.description || '')}</code>`);
    return false;
  }

  const dmSent = await sendInviteDm(env, from.id, clubKey, false);
  if (!dmSent) await groupNotice(env, msg.chat.id, from, clubKey, ctx);
  return true;
}

// Напоминание в личку. Возвращает true, если человек его получил (или получал недавно).
async function sendInviteDm(env, userId, clubKey, force) {
  const club = MOD_CLUBS[clubKey];
  const throttleKey = `mod:dm:${clubKey}:${userId}`;
  if (!force && (await env.KV.get(throttleKey))) return true;
  const res = await sendHtml(env, userId,
    `👋 Привет! Это бот сообщества CMO.\n\n<b>${esc(club.title)}</b> — ${esc(club.about)}\n\n` +
    `Чтобы писать в чат, заполни короткую анкету — это пара минут. После неё твоя визитка появится в чате, и участники узнают, кто ты и чем полезен.`,
    { inline_keyboard: [[{ text: '📝 Заполнить анкету', callback_data: `mod_start_${clubKey}` }]] });
  if (!res.ok) return false;
  await env.KV.put(throttleKey, '1', { expirationTtl: DM_THROTTLE_SEC });
  return true;
}

// Подсказка в чате, если в личку написать нельзя. Висит 15 секунд и удаляется.
async function groupNotice(env, chatId, from, clubKey, ctx) {
  const throttleKey = `mod:gn:${normChatId(chatId)}:${from.id}`;
  if (await env.KV.get(throttleKey)) return;
  await env.KV.put(throttleKey, '1', { expirationTtl: GROUP_NOTICE_THROTTLE_SEC });
  const res = await sendHtml(env, chatId,
    `<a href="tg://user?id=${from.id}">${esc(fullName(from))}</a>, чтобы писать в чат, заполни короткую анкету у бота 👇`,
    { inline_keyboard: [[{ text: '📝 Заполнить анкету', url: startLink(clubKey) }]] });
  if (!res.ok) return;
  const messageId = res.result.message_id;
  // Запасной вариант на случай, если воркер не доживёт до таймера — подчистит крон
  await env.KV.put(`mod:cleanup:${chatId}:${messageId}`, String(Date.now() + NOTICE_TTL_MS), { expirationTtl: 3600 });
  const job = new Promise(r => setTimeout(r, NOTICE_TTL_MS)).then(async () => {
    await tg(env, 'deleteMessage', { chat_id: chatId, message_id: messageId });
    await env.KV.delete(`mod:cleanup:${chatId}:${messageId}`);
  });
  if (ctx && ctx.waitUntil) ctx.waitUntil(job);
}

// Крон: удаляем подсказки, которые не удалились по таймеру
export async function modCleanupNotices(env) {
  const list = await env.KV.list({ prefix: 'mod:cleanup:' });
  for (const k of list.keys) {
    const due = Number(await env.KV.get(k.name));
    if (due && Date.now() < due) continue;
    const [, , chatId, messageId] = k.name.split(':');
    await tg(env, 'deleteMessage', { chat_id: Number(chatId), message_id: Number(messageId) });
    await env.KV.delete(k.name);
  }
}

// ─── Анкета в личке ──────────────────────────────────────────────────────────
function stateKey(userId) { return `mod:state:${userId}`; }

async function askStep(env, userId, state, from) {
  const club = MOD_CLUBS[state.club];
  const qs = club.questions;
  // Пропускаем вопросы, ответ на которые знаем сами (например, @username)
  while (state.step < qs.length && qs[state.step].auto === 'username' && from && from.username) {
    state.answers[qs[state.step].key] = '@' + from.username;
    state.step++;
  }
  if (state.step >= qs.length) {
    await env.KV.delete(stateKey(userId));
    await finishAnketa(env, userId, state, from);
    return;
  }
  await env.KV.put(stateKey(userId), JSON.stringify(state), { expirationTtl: 7 * 24 * 3600 });
  const q = qs[state.step];
  const shown = qs.filter(x => !(x.auto === 'username' && from && from.username));
  const num = shown.indexOf(q) + 1;
  await sendHtml(env, userId, `<b>Вопрос ${num} из ${shown.length}</b>\n${esc(q.text)}`,
    q.required ? undefined : { inline_keyboard: [[{ text: 'Пропустить →', callback_data: 'mod_skip' }]] });
}

async function startAnketa(env, from, clubKey) {
  if (!MOD_CLUBS[clubKey]) return;
  if (await env.KV.get(`mod:ok:${clubKey}:${from.id}`)) {
    await sendHtml(env, from.id, `Анкета для <b>${esc(MOD_CLUBS[clubKey].title)}</b> уже заполнена ✅ Можно писать в чат.`);
    return;
  }
  const state = { club: clubKey, step: 0, answers: {}, startedAt: Date.now() };
  await sendHtml(env, from.id, `Анкета для <b>${esc(MOD_CLUBS[clubKey].title)}</b> 📝\nОтвечай одним сообщением на каждый вопрос.`);
  await askStep(env, from.id, state, from);
}

// /start mod_<club> в личке. Возвращает true, если обработали.
export async function modHandleStart(msg, env, payload) {
  if (!payload || !payload.startsWith('mod_')) return false;
  await startAnketa(env, msg.from, payload.slice(4));
  return true;
}

// Ответ на текущий вопрос. Возвращает true, если у человека идёт анкета.
export async function modHandlePrivateMessage(msg, env) {
  const state = await env.KV.get(stateKey(msg.from.id), 'json');
  if (!state || !MOD_CLUBS[state.club]) return false;
  const text = (msg.text || '').trim();
  const q = MOD_CLUBS[state.club].questions[state.step];
  if (!text) {
    await sendHtml(env, msg.from.id, 'Ответь, пожалуйста, текстом 🙏');
    return true;
  }
  if (q.required && (text === '-' || text.length < 2)) {
    await sendHtml(env, msg.from.id, 'Это обязательный вопрос — ответь, пожалуйста, чуть подробнее.');
    return true;
  }
  state.answers[q.key] = text === '-' ? '' : text.slice(0, 1500);
  state.step++;
  await askStep(env, msg.from.id, state, msg.from);
  return true;
}

// Кнопки анкеты. Возвращает true, если callback наш.
export async function modHandleCallback(cq, env) {
  const data = cq.data || '';
  if (data.startsWith('mod_start_')) {
    await startAnketa(env, cq.from, data.slice('mod_start_'.length));
    return true;
  }
  if (data === 'mod_skip') {
    const state = await env.KV.get(stateKey(cq.from.id), 'json');
    if (!state || !MOD_CLUBS[state.club]) return true;
    const q = MOD_CLUBS[state.club].questions[state.step];
    if (!q || q.required) return true;
    state.answers[q.key] = '';
    state.step++;
    await askStep(env, cq.from.id, state, cq.from);
    return true;
  }
  return false;
}

function cardHtml(club, answers, from) {
  const lines = [`👋 <b>Новый участник ${esc(club.title)}</b>`, ''];
  const name = answers.name || fullName(from);
  lines.push(`<b>${esc(name)}</b>${from.username ? ' · @' + esc(from.username) : ''}`);
  for (const q of club.questions) {
    if (!q.card || q.key === 'name') continue;
    const a = answers[q.key];
    if (a) lines.push('', `<b>${esc(q.label)}:</b> ${esc(a)}`);
  }
  return lines.join('\n');
}

async function finishAnketa(env, userId, state, from) {
  const clubKey = state.club;
  const club = MOD_CLUBS[clubKey];
  const record = {
    club: clubKey, clubTitle: club.title, tgId: userId,
    username: from?.username || '', firstName: from?.first_name || '', lastName: from?.last_name || '',
    answers: state.answers, filledAt: new Date().toISOString()
  };
  await env.KV.put(`mod:ok:${clubKey}:${userId}`, '1');
  await env.KV.put(`mod:anketa:${clubKey}:${userId}`, JSON.stringify(record));

  // Визитка — во все чаты клуба
  const card = cardHtml(club, state.answers, from || {});
  for (const chatId of club.chatIds) {
    const res = await sendHtml(env, Number('-100' + normChatId(chatId)), card);
    if (res.ok) await env.KV.put(`mod:card:${clubKey}:${userId}:${normChatId(chatId)}`, String(res.result.message_id));
  }

  await sendHtml(env, userId, `Спасибо! Анкета принята ✅\nТвоя визитка опубликована в <b>${esc(club.title)}</b> — теперь можно писать в чат.`);
  await sendToSheet(env, club, record);
}

// Ответы — в Google Таблицу через веб-приложение Apps Script (см. moderation/apps-script.gs)
async function sendToSheet(env, club, record) {
  if (!env.MOD_SHEET_WEBHOOK) {
    await notifyAdminOnce(env, 'mod:warn:nosheet',
      '⚠️ Модерация: анкеты не пишутся в Google Таблицу — не задан секрет MOD_SHEET_WEBHOOK (см. moderation/README.md). Пока они сохраняются только в KV.', 24 * 3600);
    return;
  }
  const payload = {
    secret: env.MOD_SHEET_SECRET || '',
    sheet: club.title,
    headers: ['Дата', 'TG ID', 'Username', 'Имя в Telegram', ...club.questions.map(q => q.label)],
    row: [record.filledAt, String(record.tgId), record.username ? '@' + record.username : '',
      [record.firstName, record.lastName].filter(Boolean).join(' '),
      ...club.questions.map(q => record.answers[q.key] || '')]
  };
  let ok = false, detail = '';
  try {
    const res = await fetch(env.MOD_SHEET_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), redirect: 'follow'
    });
    detail = (await res.text()).slice(0, 300);
    ok = res.ok && detail.includes('"ok":true');
  } catch (e) { detail = String(e); }
  if (!ok) {
    await env.KV.put(`mod:sheetfail:${record.club}:${record.tgId}`, JSON.stringify(payload), { expirationTtl: 30 * 24 * 3600 });
    if (env.ADMIN_ID) await sendHtml(env, env.ADMIN_ID, `⚠️ Анкета ${esc(club.title)} не записалась в таблицу (TG ID ${record.tgId}). Она сохранена в KV.\n<code>${esc(detail)}</code>`);
  }
}
