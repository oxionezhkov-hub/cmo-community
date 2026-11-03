// ─── МОДЕРАЦИЯ КЛУБНЫХ ЧАТОВ ────────────────────────────────────────────────
// Новые участники клубных чатов не могут писать, пока не заполнят анкету:
//  1. Бот видит вход человека в чат (chat_member / new_chat_members) и помечает его как «новичка».
//  2. Сообщения новичка сразу удаляются. Напоминание «заполни анкету» бот показывает прямо в чате
//     эфемерным сообщением (Bot API 10.2+): его видит только этот человек, остальные — нет.
//     Копия с кнопкой уходит в личку, если человек запускал бота. Если эфемерное сообщение
//     отправить не удалось, в чате на 15 секунд появляется обычная подсказка и удаляется сама.
//  3. Анкета проходит в личке с ботом. После неё ответы уходят
//     в Google Таблицу (Apps Script, секрет MOD_SHEET_WEBHOOK), человек может писать.
// Участники, которые были в чате до подключения бота, не ограничиваются.
// Боту в каждом чате нужны права администратора: «Удаление сообщений».

export const MOD_BOT_USERNAME = 'cmo_razbory_bot';

// Вопросы анкеты. key — колонка в таблице,
// required — нельзя пропустить, auto: 'username' — берём @username из Telegram и не спрашиваем, если он есть.
// Сейчас у всех клубов вопросы из их Google Форм; у каждого клуба список свой — меняется здесь.
const FORM_QUESTIONS = [
  { key: 'name', label: 'Имя', text: 'Как тебя зовут?', required: true },
  { key: 'telegram', label: 'Telegram', text: 'Контакт в Telegram (личный, без анонимов)', required: true, auto: 'username' },
  { key: 'background', label: 'Бэкграунд', text: 'Расскажи про свой бэкграунд: какие проекты были в прошлом? Текущая компания и должность. Твоя экспертиза и польза для других участников сообщества', required: true },
  { key: 'pain', label: 'Что болит', text: 'Что сейчас болит больше всего?', required: false },
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

// Кто может выдавать «доверенный» доступ (писать без анкеты): ADMIN_ID из секретов + эти id
const MOD_TRUST_ADMINS = ['345618009']; // Дима

const NOTICE_TTL_MS = 15 * 1000;
const EPHEMERAL_THROTTLE_SEC = 20;      // эфемерное напоминание — не чаще раза в 20 секунд        // сколько висит подсказка в чате, если в личку написать нельзя
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

// ─── Доверенные: пишут во всех клубных чатах без анкеты ─────────────────────
function isTrustAdmin(env, userId) {
  return [String(env.ADMIN_ID || ''), ...MOD_TRUST_ADMINS].filter(Boolean).includes(String(userId));
}

async function isTrusted(env, user) {
  if (!user) return false;
  if (await env.KV.get(`mod:trust:id:${user.id}`)) return true;
  return !!(user.username && await env.KV.get(`mod:trust:u:${user.username.toLowerCase()}`));
}

// Разбор того, что админ прислал боту: @username, t.me/username, числовой id или пересланное сообщение
function parseTrustTarget(msg) {
  const fo = msg.forward_origin;
  if (fo && fo.type === 'user' && fo.sender_user) {
    const u = fo.sender_user;
    return { id: String(u.id), username: (u.username || '').toLowerCase(), label: u.username ? '@' + u.username : fullName(u) };
  }
  if (fo && fo.type === 'hidden_user') return { hidden: true, label: fo.sender_user_name || '' };
  const t = (msg.text || '').trim();
  let m = t.match(/^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z][A-Za-z0-9_]{3,31})\/?$/i) || t.match(/^@([A-Za-z][A-Za-z0-9_]{3,31})$/);
  if (m) return { username: m[1].toLowerCase(), label: '@' + m[1] };
  m = t.match(/^(?:id\s*:?\s*)?(\d{5,15})$/i);
  if (m) return { id: m[1], label: 'id ' + m[1] };
  return null;
}

async function trustIndex(env) {
  return await env.KV.get('mod:trust:list', 'json') || [];
}

async function addTrust(env, target, byUser) {
  const entry = { id: target.id || '', username: target.username || '', label: target.label, by: byUser.id, byName: byUser.username ? '@' + byUser.username : fullName(byUser), at: new Date().toISOString() };
  if (entry.id) await env.KV.put(`mod:trust:id:${entry.id}`, JSON.stringify(entry));
  if (entry.username) await env.KV.put(`mod:trust:u:${entry.username}`, JSON.stringify(entry));
  const list = (await trustIndex(env)).filter(e => !((entry.id && e.id === entry.id) || (entry.username && e.username === entry.username)));
  list.push(entry);
  await env.KV.put('mod:trust:list', JSON.stringify(list));
  return entry;
}

async function removeTrust(env, key) {
  const list = await trustIndex(env);
  const left = [];
  let removed = null;
  for (const e of list) {
    if (e.id === key || e.username === key) { removed = e; continue; }
    left.push(e);
  }
  if (!removed) return null;
  if (removed.id) await env.KV.delete(`mod:trust:id:${removed.id}`);
  if (removed.username) await env.KV.delete(`mod:trust:u:${removed.username}`);
  await env.KV.put('mod:trust:list', JSON.stringify(left));
  return removed;
}

function trustKey(e) { return e.id || e.username; }

async function notifyOtherTrustAdmins(env, byId, text) {
  for (const id of [String(env.ADMIN_ID || ''), ...MOD_TRUST_ADMINS].filter(Boolean)) {
    if (id !== String(byId)) await sendHtml(env, Number(id), text);
  }
}

// Личка с ботом: админ кидает @username / ссылку / id / пересылает сообщение → человек пишет без анкеты.
// Команды: /trusted — список, /untrust @username — забрать доступ. Возвращает true, если обработали.
export async function modHandleAdminTrust(msg, env) {
  if (!msg.from || !isTrustAdmin(env, msg.from.id)) return false;
  const text = (msg.text || '').trim();

  if (text === '/trusted') {
    const list = await trustIndex(env);
    await sendHtml(env, msg.chat.id, list.length
      ? '<b>Пишут без анкеты:</b>\n' + list.map(e => `• ${esc(e.label)} — добавил ${esc(e.byName)}`).join('\n') + '\n\nЗабрать доступ: <code>/untrust @username</code>'
      : 'Список пуст. Пришли @username, ссылку t.me/… или id человека — и он сможет писать без анкеты.');
    return true;
  }

  const un = text.match(/^\/untrust\s+(.+)$/i);
  if (un) {
    const t = parseTrustTarget({ text: un[1] });
    const removed = t ? await removeTrust(env, t.id || t.username) : null;
    await sendHtml(env, msg.chat.id, removed ? `Готово: ${esc(removed.label)} снова пишет только после анкеты.` : 'Такого человека нет в списке. Список: /trusted');
    if (removed) await notifyOtherTrustAdmins(env, msg.from.id, `↩️ ${esc(removed.label)} убран из доверенных (${esc(msg.from.username ? '@' + msg.from.username : fullName(msg.from))}).`);
    return true;
  }

  const target = parseTrustTarget(msg);
  if (!target) return false;
  if (target.hidden) {
    await sendHtml(env, msg.chat.id, `У ${esc(target.label)} скрыт аккаунт в пересылке — пришли его @username или ссылку t.me/…`);
    return true;
  }
  const entry = await addTrust(env, target, msg.from);
  await sendHtml(env, msg.chat.id,
    `✅ ${esc(entry.label)} может писать во всех клубных чатах без анкеты.` +
    (entry.username ? '' : '\n\nДобавлен по id — сработает, даже если человек сменит @username.'),
    { inline_keyboard: [[{ text: '↩️ Отменить', callback_data: `mod_untrust_${trustKey(entry)}` }]] });
  await notifyOtherTrustAdmins(env, msg.from.id, `🤝 ${esc(entry.label)} добавлен в доверенные (пишет без анкеты). Добавил ${esc(entry.byName)}.`);
  return true;
}

// ─── Вход в чат ──────────────────────────────────────────────────────────────
async function markNewcomer(env, chatId, user, clubKey) {
  if (!user || user.is_bot) return;
  const club = MOD_CLUBS[clubKey];
  if (await env.KV.get(`mod:ok:${clubKey}:${user.id}`)) return; // анкета уже есть — пишет свободно
  if (await isTrusted(env, user)) return;                         // доверенный — без анкеты
  await env.KV.put(`mod:new:${normChatId(chatId)}:${user.id}`, String(Date.now()));
  // Приветствие прямо в чате — видит только новичок
  await welcomeInChat(env, chatId, user, clubKey);
  // Копия в личку — если не писали только что (например, при автоприёме заявки)
  await sendInviteDm(env, user.id, clubKey, false);
}

// Эфемерное сообщение в группе: видит только receiver. Бот должен быть админом чата.
async function sendEphemeral(env, chatId, userId, text, clubKey) {
  const res = await tg(env, 'sendMessage', {
    chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true,
    ephemeral_message_parameters: { receiver_user_id: userId },
    reply_markup: { inline_keyboard: [[{ text: '📝 Заполнить анкету', url: startLink(clubKey) }]] }
  });
  return !!res.ok;
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
// Все заявки в клубные чаты принимаются автоматически: человек сразу видит чат и может
// читать его без «подписки», а писать — только после анкеты (сообщения удаляются).
// Порядок: помечаем новичком → пишем в личку (пока заявка не обработана, боту можно написать
// первым) → принимаем заявку → в самом чате показываем приветствие, которое видит только он.
export async function modHandleJoinRequest(update, env) {
  const req = update.chat_join_request;
  if (!req) return;
  const found = modClubByChat(req.chat.id);
  if (!found) return;
  const { key: clubKey, club } = found;
  const userId = req.from.id;
  const free = (await env.KV.get(`mod:ok:${clubKey}:${userId}`)) || (await isTrusted(env, req.from));

  if (!free) {
    await env.KV.put(`mod:new:${normChatId(req.chat.id)}:${userId}`, String(Date.now()));
    await sendInviteDm(env, req.user_chat_id || userId, clubKey, true, true);
  }

  const approved = await tg(env, 'approveChatJoinRequest', { chat_id: req.chat.id, user_id: userId });
  if (!approved.ok) {
    await notifyAdminOnce(env, `mod:warn:noapprove:${normChatId(req.chat.id)}`,
      `⚠️ Модерация «${esc(club.title)}»: бот не может принимать заявки. Дай боту право администратора «Добавление участников».\n\n<code>${esc(approved.description || '')}</code>`);
    return;
  }
  if (!free) await welcomeInChat(env, req.chat.id, req.from, clubKey);
}

// Приветствие в чате, видимое только новичку. Один раз на вход (после автоприёма заявки
// следом приходит ещё и событие о вступлении — второй раз не показываем).
async function welcomeInChat(env, chatId, user, clubKey) {
  const flag = `mod:welcomed:${normChatId(chatId)}:${user.id}`;
  if (await env.KV.get(flag)) return;
  await env.KV.put(flag, '1', { expirationTtl: 3600 });
  const club = MOD_CLUBS[clubKey];
  await sendEphemeral(env, chatId, user.id,
    `👋 Добро пожаловать в <b>${esc(club.title)}</b>!\n\nЧитать чат можно уже сейчас. Чтобы писать, заполни короткую анкету — это пара минут 👇`,
    clubKey);
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
  if (await isTrusted(env, from)) return false;                // доверенный — пишет без анкеты

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

  // Напоминание прямо в чате, видимое только этому человеку
  const ephKey = `mod:eph:${normChatId(msg.chat.id)}:${from.id}`;
  const recent = await env.KV.get(ephKey); // '1' — показали, '0' — не прошло
  let shown = recent === '1';
  if (!recent) {
    shown = await sendEphemeral(env, msg.chat.id, from.id,
      `Сообщение не отправлено: чтобы писать в <b>${esc(club.title)}</b>, сначала заполни короткую анкету 👇`, clubKey);
    await env.KV.put(ephKey, shown ? '1' : '0', { expirationTtl: EPHEMERAL_THROTTLE_SEC });
  }
  const dmSent = await sendInviteDm(env, from.id, clubKey, false);
  // Запасной вариант, если эфемерные сообщения не прошли и в личку написать нельзя
  if (!shown && !dmSent) await groupNotice(env, msg.chat.id, from, clubKey, ctx);
  return true;
}

// Напоминание в личку. Возвращает true, если человек его получил (или получал недавно).
async function sendInviteDm(env, userId, clubKey, force, joinRequest = false) {
  const club = MOD_CLUBS[clubKey];
  const throttleKey = `mod:dm:${clubKey}:${userId}`;
  if (!force && (await env.KV.get(throttleKey))) return true;
  const res = await sendHtml(env, userId,
    (joinRequest
      ? `👋 Привет! Заявка в <b>${esc(club.title)}</b> принята — чат уже открыт, его можно читать.\n\n${esc(club.about)}\n\n`
      : `👋 Привет! Это бот сообщества CMO.\n\n<b>${esc(club.title)}</b> — ${esc(club.about)}\n\n`) +
    `Чтобы писать в чат, заполни короткую анкету — это пара минут.`,
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
  if (data.startsWith('mod_untrust_')) {
    if (!isTrustAdmin(env, cq.from.id)) return true;
    const removed = await removeTrust(env, data.slice('mod_untrust_'.length));
    await sendHtml(env, cq.from.id, removed ? `↩️ Отменено: ${esc(removed.label)} снова пишет только после анкеты.` : 'Уже отменено.');
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

  // Визитку в чат не публикуем — после анкеты человек просто может писать
  const member = await tg(env, 'getChatMember', { chat_id: Number('-100' + normChatId(club.chatIds[0])), user_id: userId });
  const inChat = member.ok && isPresent(member.result.status) && member.result.is_member !== false;
  await sendHtml(env, userId, inChat || !member.ok
    ? `Спасибо! Анкета принята ✅\nТеперь можно писать в <b>${esc(club.title)}</b>.`
    : `Спасибо! Анкета принята ✅\nКак только заявку в <b>${esc(club.title)}</b> одобрят, сразу сможешь писать в чат.`);
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
