const WORKER_URL = "https://cmo-razbory.oxion-ezhkov.workers.dev";
const PAYMENT_LINK = "https://edsofa.ai/sb/JIx";
const ADMIN_PASSWORD = "12345678";
const ADMIN_PATH = "/admin";

// ─── ROUTING ────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/webhook") return handleWebhook(request, env);
    if (url.pathname === "/setup-webhook") return setupWebhook(env);
    if (url.pathname === "/api/export-modules") return apiExportModules(request, env);
    if (url.pathname.startsWith(ADMIN_PATH)) return handleAdmin(request, env, url);
    if (url.pathname === "/api/auth") return apiAuth(request, env);
    if (url.pathname === "/api/user") return apiUser(request, env);
    if (url.pathname === "/api/program") return apiProgram(request, env);
    if (url.pathname === "/api/tasks") return apiTasks(request, env);
    if (url.pathname === "/api/progress") return apiProgress(request, env);
    if (url.pathname === "/api/questions") return apiQuestions(request, env);
    if (url.pathname === "/api/admin/login") return apiAdminLogin(request, env);
    if (url.pathname.startsWith('/api/admin/coffee')) return apiAdminCoffee(request, env, url);
    if (url.pathname === '/api/admin/analytics') return apiAdminAnalytics(request, env, url);
    if (url.pathname === '/api/admin/workshop-attendance') return apiAdminWorkshopAttendance(request, env, url);
    if (url.pathname === '/api/admin/crm') return apiAdminCRM(request, env, url);
    if (url.pathname === '/api/admin/chat-activity') return apiAdminChatActivity(request, env, url);
    if (url.pathname === '/api/admin/payments') return apiAdminPayments(request, env, url);
    if (url.pathname === '/api/payments/webhook') return apiPaymentsWebhook(request, env);
    if (url.pathname === '/api/admin/avatar') return apiCRMAvatar(request, env, url);
    if (url.pathname === '/api/community') return apiCommunity(request, env, url);
    if (url.pathname === '/community') return serveCommunity();
    if (url.pathname.startsWith("/api/admin/")) return apiAdminAction(request, env, url);
    if (url.pathname === "/" || url.pathname === "/app") return serveApp(env);
    if (url.pathname === "/quiz1" || url.pathname === "/worker/quiz1") return serveQuiz1();
    if (url.pathname === "/quiz2" || url.pathname === "/worker/quiz2") return serveQuiz2();
    if (url.pathname === "/api/quiz2-analyze") return apiQuiz2Analyze(request, env);
    if (url.pathname === "/quiz3" || url.pathname === "/worker/quiz3") return serveQuiz3();
    if (url.pathname === "/api/quiz3-dialogue") return apiQuiz3Dialogue(request, env);
    if (url.pathname === "/api/quiz3-result") return apiQuiz3Result(request, env);
    if (url.pathname === "/leadmagnet1") return serveLeadMagnet1();
    if (url.pathname === "/api/leadmagnet1-submit") return apiLeadMagnet1Submit(request, env);
    if (url.pathname === "/leadmagnet2") return serveLeadMagnet2();
    if (url.pathname === "/api/leadmagnet2-submit") return apiLeadMagnet2Submit(request, env);
    if (url.pathname === "/api/task-progress") return apiTaskProgress(request, env);
    if (url.pathname === "/api/auth-email") return apiAuthEmail(request, env);
    if (url.pathname === "/api/events") return apiEvents(request, env);
    if (url.pathname === '/api/request-access') return apiRequestAccess(request, env);
    if (url.pathname === '/api/kb') return apiKB(request, env);
    if (url.pathname === '/api/tags') return apiTags(request, env);
    if (url.pathname === '/api/module-order') return apiModuleOrder(request, env);
    if (url.pathname === '/api/coffee/join') return apiCoffeeJoin(request, env);
if (url.pathname === '/api/coffee/profile') return apiCoffeeProfile(request, env);
if (url.pathname === '/api/coffee/toggle') return apiCoffeeToggle(request, env);
if (url.pathname === '/api/coffee/status') return apiCoffeeStatus(request, env);
if (url.pathname === '/api/coffee/rate') return apiCoffeeRate(request, env);
if (url.pathname === '/api/track') return apiTrack(request, env);
if (url.pathname === '/api/admin/coffee/send-now') {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.includes('admin_session_' + ADMIN_PASSWORD))
    return jsonResp({ error: 'Unauthorized' }, 401);
  const weekId = COFFEE_WEEK();
  const round = await env.KV.get(`coffee:round:${weekId}`, 'json');
  if (!round) return jsonResp({ ok: false, error: `Нет раунда для ${weekId}` });
  if (round.sentAt) return jsonResp({ ok: false, error: `Уже отправлено в ${new Date(round.sentAt).toISOString()}` });
  await coffeeSendPairs(env);
  return jsonResp({ ok: true, weekId, pairs: round.pairs.length });
}
    if (url.pathname === '/api/event-ics') {
  const id = Number(url.searchParams.get('id'));
  const events = await env.KV.get('events:list', 'json') || [];
  const ev = events.find(e => e.id === id);
  if (!ev) return new Response('Not found', { status: 404 });
  const CRLF = '\r\n';
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT',
    'DTSTART;TZID=Europe/Moscow:' + icsStartFromDatetime(ev.datetime),
    'DTEND;TZID=Europe/Moscow:' + icsEndFromDatetime(ev.datetime, ev.duration || 90),
    'SUMMARY:' + ev.title,
    'LOCATION:' + (ev.actionUrl || ''),
    'END:VEVENT','END:VCALENDAR'].join(CRLF);
  return new Response(ics, { headers: {
  'Content-Type': 'text/calendar; charset=utf-8',
  'Content-Disposition': 'attachment; filename="event.ics"'
}});
}
    return new Response("Not found", { status: 404 });
  },
  async scheduled(event, env, ctx) {
  try {
    const now = new Date();
    const day = now.getUTCDay(); // 1=пн, 5=пт
    const hour = now.getUTCHours();
    // 9 = 12:00 МСК
    if (hour === 9) {
      if (day === 1) {
        // понедельник — если админ не назначил пары вручную, формируем их автоматически (избегая повторов)
        const weekId = COFFEE_WEEK();
        const existing = await env.KV.get(`coffee:round:${weekId}`, 'json');
        if (!existing) await coffeeAutoGeneratePairs(env, weekId);
        await coffeeSendPairs(env); // рассылка пар
        await sendWeeklyDigest(env); // сводка топ-10 участников
      }
      if (day === 5) await coffeeSendReminder(env); // пятница — напоминание + оценка
    }
    await coffeeSendNewbieReminders(env);
  } catch(err) {
    await notifyAdminError(env, 'scheduled', err);
  }
}
};

// ─── API: ЭКСПОРТ МОДУЛЕЙ В CSV ───────────────────────────────
async function apiExportModules(request, env) {
  // Простая проверка: можно защитить паролем, но для удобства оставим открытым
  // Если хочешь защитить — раскомментируй строки ниже
  /*
  const auth = request.headers.get("Authorization") || "";
  if (!auth.includes("admin_session_" + ADMIN_PASSWORD)) {
    return jsonResp({ error: "Unauthorized" }, 401);
  }
  */

  try {
    // Загружаем обе программы
    const [programAi, programFunnels, tasksAi, tasksFunnels] = await Promise.all([
      env.KV.get("program:ai", "json"),
      env.KV.get("program:funnels", "json"),
      env.KV.get("tasks:ai", "json"),
      env.KV.get("tasks:funnels", "json")
    ]);

    // Собираем все модули с меткой программы
    const modules = [];
    
    (programAi?.modules || []).forEach(m => {
      modules.push({ ...m, program: "ИИ-контент", programKey: "ai" });
    });
    
    (programFunnels?.modules || []).forEach(m => {
      modules.push({ ...m, program: "Воронки", programKey: "funnels" });
    });

    // Маппинг заданий по программе
    const tasksMap = {
      ai: tasksAi || [],
      funnels: tasksFunnels || []
    };

    // Строим строки CSV
    const rows = [];
    
    // Заголовки CSV
    const headers = [
      "Программа",
      "ID модуля",
      "Название модуля",
      "Описание",
      "Дата",
      "Доступен",
      "Теги",
      "Ссылка на видео",
      "Файлы (название | URL)",
      "Таймкоды (время | описание)",
      "Задания (ID | Название | Описание)"
    ];
    rows.push(headers.join(";"));

    for (const mod of modules) {
      // Форматируем файлы
      const filesStr = (mod.files || [])
        .map(f => `${f.name} | ${f.url}`)
        .join("; ");

      // Форматируем таймкоды
      const timecodesStr = (mod.timecodes || [])
        .map(t => `${t.time} | ${t.label}`)
        .join("; ");

      // Находим задания для этого модуля
      const modTasks = (tasksMap[mod.programKey] || [])
        .filter(t => t.moduleId === mod.id);

      const tasksStr = modTasks
        .map(t => `${t.id} | ${t.title} | ${t.description || ""}`)
        .join("; ");

      // Теги
      const tagsStr = (mod.tags || []).join(", ");

      // Собираем строку
      const row = [
        mod.program,
        mod.id,
        mod.title || "",
        (mod.description || "").replace(/;/g, ","), // экранируем ; на ,
        mod.date || "",
        mod.available ? "Да" : "Нет",
        tagsStr,
        mod.embedUrl || "",
        filesStr,
        timecodesStr,
        tasksStr
      ];

      rows.push(row.map(cell => `"${cell}"`).join(";")); // оборачиваем в кавычки
    }

    // Если нет модулей — отдаём пустой CSV с заголовком
    if (rows.length === 1) {
      rows.push('"Нет данных";"";"";"";"";"";"";"";"";"";""');
    }

    const csvContent = rows.join("\n");
    const filename = `cmo_modules_export_${new Date().toISOString().slice(0,10)}.csv`;

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });

  } catch (err) {
    console.error("Export error:", err);
    return jsonResp({ error: "Ошибка при выгрузке данных" }, 500);
  }
}

async function coffeeSendNewbieReminders(env) {
  const THREE_HOURS = 3 * 60 * 60 * 1000;
  const keys = await env.KV.list({ prefix: 'coffee:remind:' });
  
  for (const key of keys.keys) {
    const userId = key.name.replace('coffee:remind:', '');
    const startedAtStr = await env.KV.get(key.name);
    if (!startedAtStr) continue;
    
    const startedAt = Number(startedAtStr);
    const elapsed = Date.now() - startedAt;
    
    // Только если прошло от 3 до 4 часов (чтобы не слать повторно)
    if (elapsed >= THREE_HOURS && elapsed < THREE_HOURS + 3600000) {
      // Проверить, не зарегистрировался ли уже
      const coffeeProfile = await env.KV.get(`coffee:user:${userId}`, 'json');
      if (!coffeeProfile) {
        await tgSend(env, Number(userId),
          `☕ *Рандом Кофе ждёт тебя!*\n\nКаждую неделю мы подбираем участникам CMO нового собеседника для 30-минутной встречи. Это самый быстрый способ решить свой запрос, получить рекомендацию или просто поговорить с близким по духу человеком.\n\n👉 Зарегистрируйся прямо сейчас — это займёт 2 минуты:`,
          { inline_keyboard: [[{ text: '☕ Рандом Кофе', web_app: { url: `${WORKER_URL}/app` } }]] }
        );
      }
      // Удаляем ключ в любом случае, чтобы не слать снова
      await env.KV.delete(key.name);
    }
  }
}

// ─── WEBHOOK SETUP ───────────────────────────────────────────
async function setupWebhook(env) {
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: `${WORKER_URL}/webhook` })
  });
  const data = await res.json();
  return jsonResp(data);
}

async function apiAuthEmail(request, env) {
  if (request.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);
  const { email, initData } = await request.json();
  if (!email) return jsonResp({ ok: false, error: "No email" }, 400);
  const emailLower = email.toLowerCase().trim();

  const parsed = initData ? parseTgInitData(initData) : null;

  const emails = await env.KV.get("emails:approved", "json") || [];
  const found = emails.some(e => e.toLowerCase() === emailLower);
  if (!found) {
    // Доступ выдаётся сразу — админ может закрыть его отдельно, если участник не оплатил
    emails.push(emailLower);
    await env.KV.put("emails:approved", JSON.stringify(emails));
    await notifyAdminNewAccess(env, emailLower, parsed?.user);
  }

  // Try to get existing mapping
  let userId = await env.KV.get(`email_to_user:${emailLower}`);

  // If no mapping yet but we have initData — create it now
  if (!userId && initData) {
    if (parsed?.user) {
      const tgId = String(parsed.user.id);
      await env.KV.put(`email_to_user:${emailLower}`, tgId);
      const existing = await env.KV.get(`user:${tgId}`, "json");
      const newData = {
        ...(existing || {}),
        tgId: Number(tgId),
        email: emailLower,
        approved: true,
        enrolledAt: existing?.enrolledAt || Date.now(),
        name: existing?.name || parsed.user.first_name || emailLower.split('@')[0],
        username: existing?.username || parsed.user.username || '',
      };
      await env.KV.put(`user:${tgId}`, JSON.stringify(newData));
      userId = tgId;
    }
  }

  const userData = userId ? await env.KV.get(`user:${userId}`, "json") : null;
  return jsonResp({
    ok: true,
    email: emailLower,
    user: userData || { email: emailLower, approved: true, first_name: emailLower.split('@')[0] }
  });
}

// ─── TELEGRAM WEBHOOK ────────────────────────────────────────
async function handleWebhook(request, env) {
  const update = await request.json();
  if (update.message) await handleMessage(update.message, env);
  if (update.callback_query) await handleCallback(update.callback_query, env);
  return new Response("OK");
}

async function apiRequestAccess(request, env) {
  if (request.method !== 'POST') return jsonResp({ error: 'Method not allowed' }, 405);
  const { email, initData } = await request.json();
  if (!email) return jsonResp({ ok: false });
  const emailLower = email.toLowerCase().trim();

  const parsed = initData ? parseTgInitData(initData) : null;

  // Доступ выдаётся сразу — админ может закрыть его отдельно, если участник не оплатил
  const emails = await env.KV.get('emails:approved', 'json') || [];
  if (!emails.some(e => e.toLowerCase() === emailLower)) {
    emails.push(emailLower);
    await env.KV.put('emails:approved', JSON.stringify(emails));
  }
  await notifyAdminNewAccess(env, emailLower, parsed?.user);

  return jsonResp({ ok: true });
}

async function handleMessage(msg, env) {
  const chatId = msg.chat.id;
  const text = msg.text || "";
  const userId = msg.from.id;

  // Групповой чат (например, чат Ядра) — отдельная ветка: только учёт активности, без ответов бота
  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    await handleGroupMessage(msg, env);
    return;
  }

  // Сохраняем пользователя
  await env.KV.put(`botuser:${userId}`, JSON.stringify({
    tgId: userId,
    name: msg.from.first_name,
    lastName: msg.from.last_name || '',
    username: msg.from.username || '',
    startedAt: Date.now()
  }));

  if (text === "/start") {
    const userData = await env.KV.get(`user:${userId}`, "json");
    const name = msg.from.first_name || "участник";
    await logEvent(env, 'bot_start', userId);

    const keyboard = {
      inline_keyboard: [
        [{ text: "👤 Мой профиль", web_app: { url: `${WORKER_URL}/app` } }],
        [{ text: "🆘 Поддержка", callback_data: "support_request" }]
      ]
    };

    // Напоминание о Рандом Кофе через 3 часа
    const alreadyInCoffee = await env.KV.get(`coffee:user:${userId}`, 'json');
    if (!alreadyInCoffee) {
      const existingReminder = await env.KV.get(`coffee:remind:${userId}`);
      if (!existingReminder) {
        await env.KV.put(`coffee:remind:${userId}`, String(Date.now()), { expirationTtl: 86400 });
      }
    }

    if (userData && userData.approved) {
      await tgSend(env, chatId, `*Привет, ${name}! 👋*\nCMO — это сообщество маркетологов и предпринимателей. Заходи в мини-приложение, чтобы воспользоваться нашими инструментами.\n\n☕ *Рандом Кофе* — каждую неделю ты получаешь нового собеседника для короткой встречи. Обменяйся опытом, реши свой запрос или просто познакомься с близким по духу человеком. Зарегистрируйся в разделе «Нетворк».\n\n🌟 *Ядро* — воркшопы по ИИ-маркетингу в контенте и воронках.\n\n📅 *Мероприятия* — анонсы событий, зумов и эфиров.\n\nЗапускай мини-ап 👇`, keyboard);
    } else {
      await tgSend(env, chatId, `Привет, ${name}! 👋\n\n*CMO* — сообщество маркетологов и предпринимателей.\n\n☕ *Рандом Кофе* — нетворкинг с новым собеседником каждую неделю. Регистрируйся в разделе «Нетворк».\n\n🌟 *Ядро* — закрытые воркшопы по ИИ-маркетингу.\n\n📅 *Мероприятия* — субботние разборы и события сообщества.\n\nЕсли уже вступил в Ядро — введи свой email прямо в мини-ап 👇`, keyboard);
    }
  } 
  else if (text.includes("@") && text.includes(".")) {
    await handleEmailCheck(msg, env, text.trim().toLowerCase());
  }
  else {
    // любое другое сообщение — считается вопросом
    const questions = await env.KV.get("questions:list", "json") || [];
    const q = {
      id: Date.now(),
      userId,
      name: msg.from.first_name,
      text,
      date: Date.now(),
      program: '',
      source: 'bot'
    };
    questions.unshift(q);
    await env.KV.put("questions:list", JSON.stringify(questions));
    await notifyAdmin(env, `❓ Вопрос от ${msg.from.first_name} (@${msg.from.username || '—'})\n\n${text}`);
    await tgSend(env, chatId, `Твой вопрос принят! Мы ответим в ближайшее время.`);
  }
}

async function handleEmailCheck(msg, env, email) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const emails = await env.KV.get("emails:approved", "json") || [];
  const found = emails.some(e => e.toLowerCase() === email);

  if (!found) {
    // Доступ выдаётся сразу — админ может закрыть его отдельно, если участник не оплатил
    emails.push(email);
    await env.KV.put("emails:approved", JSON.stringify(emails));
    await notifyAdminNewAccess(env, email, msg.from);
  }

  const existing = await env.KV.get(`user:${userId}`, "json");
  const userData = {
    ...(existing || {}),
    tgId: userId,
    email,
    approved: true,
    name: existing?.name || msg.from.first_name,
    lastName: existing?.lastName || msg.from.last_name || "",
    username: existing?.username || msg.from.username || "",
    enrolledAt: existing?.enrolledAt || Date.now()
  };
  await env.KV.put(`user:${userId}`, JSON.stringify(userData));
  await env.KV.put(`email_to_user:${email}`, String(userId));
  const keyboard = {
    inline_keyboard: [[
      { text: "📚 Открыть приложение", web_app: { url: `${WORKER_URL}/app` } }
    ]]
  };
  await tgSend(env, chatId, `✅ *Доступ подтверждён!*\n\nТвой email \`${email}\` активирован.\n\nНажми кнопку ниже, чтобы войти в приложение.`, keyboard);
}

async function handleCallback(cq, env) {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: cq.id })
  });
  const data = cq.data || '';

if (data.startsWith('approve_')) {
  const [, userId, email] = data.split('_');
  const emails = await env.KV.get("emails:approved", "json") || [];
  if (!emails.includes(email)) emails.push(email);
  await env.KV.put("emails:approved", JSON.stringify(emails));
  
  const userData = {
    tgId: Number(userId), email, approved: true,
    enrolledAt: Date.now()
  };
  await env.KV.put(`user:${userId}`, JSON.stringify(userData));
  await env.KV.put(`email_to_user:${email}`, String(userId));
  
  // Убрать кнопки у сообщения
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: cq.message.chat.id, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] } })
  });
  
  // Уведомить пользователя
  const keyboard = { inline_keyboard: [[{ text: "📚 Открыть приложение", web_app: { url: `${WORKER_URL}/app` } }]] };
  await tgSend(env, Number(userId), `✅ Доступ одобрен!\n\nТвой email \`${email}\` подтверждён администратором.`, keyboard);
  await tgSend(env, cq.message.chat.id, `✅ Одобрено: ${email}`);
} else if (data.startsWith('closeaccess_')) {
  const token = data.replace('closeaccess_', '');
  const info = await env.KV.get(`accessrevoke:${token}`, 'json');
  if (info) {
    const { tgId, email } = info;
    const emails = await env.KV.get('emails:approved', 'json') || [];
    const filtered = emails.filter(e => e.toLowerCase() !== String(email).toLowerCase());
    await env.KV.put('emails:approved', JSON.stringify(filtered));

    const userData = await env.KV.get(`user:${tgId}`, 'json');
    if (userData) {
      userData.approved = false;
      await env.KV.put(`user:${tgId}`, JSON.stringify(userData));
    }
    await env.KV.delete(`email_to_user:${String(email).toLowerCase()}`);
    await env.KV.delete(`accessrevoke:${token}`);

    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cq.message.chat.id, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] } })
    });

    await tgSend(env, tgId, `🚫 Доступ к разделам «Ядро» и «База знаний» закрыт администратором.\n\nЕсли ты уже оплатил участие — напиши администратору Олегу Ежкову, чтобы восстановить доступ.`);
    await tgSend(env, cq.message.chat.id, `🚫 Доступ закрыт: ${email}`);
  } else {
    await tgSend(env, cq.message.chat.id, `⚠️ Ссылка на закрытие доступа устарела.`);
  }
} else if (data === 'coffee_restore') {
  const tgId = cq.from.id;  // ← вот так правильно
  const profile = await env.KV.get(`coffee:user:${tgId}`, 'json');
  if (profile) {
    profile.active = true;
    profile.disabledReason = '';
    profile.updatedAt = Date.now();
    await env.KV.put(`coffee:user:${tgId}`, JSON.stringify(profile));
    await tgSend(env, tgId, '✅ Ты снова в подборе! В следующий понедельник получишь нового партнёра ☕');
  }
}

if (data.startsWith('reject_')) {
  const userId = data.split('_')[1];
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: cq.message.chat.id, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] } })
  });
  await tgSend(env, Number(userId), `❌ В доступе отказано. Если считаешь что это ошибка — напиши нам.`);
  await tgSend(env, cq.message.chat.id, `❌ Отклонено`);
}
if (data === 'support_request') {
  const userId = cq.from.id;
  await env.KV.put(`support:pending:${userId}`, '1', { expirationTtl: 3600 });
  await tgSend(env, userId, '🆘 *Поддержка*\n\nОпиши свою проблему или вопрос — просто напиши сюда сообщение, и мы разберёмся.');
}
}

async function tgSend(env, chatId, text, replyMarkup) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  };
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json(); // ← добавь return
}

async function notifyAdminError(env, context, err) {
  try {
    if (!env.ADMIN_ID) return;
    const detail = (err && err.stack) ? String(err.stack) : String(err);
    await tgSend(env, env.ADMIN_ID, `⚠️ Ошибка в Random Coffee (${context})\n\n${detail.slice(0, 800)}`);
  } catch(e) {}
}

// Доступ в Ядро и базу знаний выдаётся автоматически по email.
// Админ получает уведомление и может закрыть доступ, если участник не оплатил.
async function notifyAdminNewAccess(env, email, tgUser) {
  try {
    if (!env.ADMIN_ID) return;
    const tgId = tgUser?.id || null;
    const name = tgUser?.first_name || email.split('@')[0];
    let keyboard = null;
    if (tgId) {
      const token = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      await env.KV.put(`accessrevoke:${token}`, JSON.stringify({ tgId, email }), { expirationTtl: 60 * 60 * 24 * 30 });
      keyboard = { inline_keyboard: [[{ text: '🚫 Закрыть доступ (не оплатил)', callback_data: `closeaccess_${token}` }]] };
    }
    const text = `✅ *Доступ в Ядро выдан автоматически*\n\nEmail: \`${email}\`\nИмя: ${name}${tgId ? `\nTG ID: ${tgId}` : ''}\n\nЕсли участник не оплатил — закрой доступ кнопкой ниже.`;
    await tgSend(env, env.ADMIN_ID, text, keyboard);
  } catch(e) {}
}

// Уведомление админу о проблеме со списанием от edsofa.ai
async function notifyAdminPaymentProblem(env, email, telegram, payload) {
  try {
    if (!env.ADMIN_ID) return;
    let tgId = null;
    let name = telegram || (email ? email.split('@')[0] : 'неизвестно');
    if (email) {
      const mappedId = await env.KV.get(`email_to_user:${email.toLowerCase()}`);
      if (mappedId) {
        tgId = mappedId;
        const u = await env.KV.get(`user:${mappedId}`, 'json');
        if (u?.name) name = u.name;
      }
    }

    let keyboard = null;
    if (tgId && email) {
      const token = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      await env.KV.put(`accessrevoke:${token}`, JSON.stringify({ tgId, email }), { expirationTtl: 60 * 60 * 24 * 30 });
      keyboard = { inline_keyboard: [[{ text: '⏸ Приостановить доступ', callback_data: `closeaccess_${token}` }]] };
    }

    const text = `⚠️ *Проблема со списанием (edsofa)*\n\nEmail: \`${email || '—'}\`\nИмя: ${name}${telegram ? `\nTelegram: @${telegram}` : ''}${tgId ? `\nTG ID: ${tgId}` : '\n\n⚠️ Не удалось найти Telegram-аккаунт участника — доступ придётся закрыть вручную.'}`;
    await tgSend(env, env.ADMIN_ID, text, keyboard);
  } catch(e) {}
}

// ── ЕЖЕНЕДЕЛЬНАЯ СВОДКА ТОП-10 УЧАСТНИКОВ ──────────────────────
async function buildTopParticipantsDigest(env) {
  const admins = await env.KV.get("admins:list", "json") || [];
  const adminEmails = new Set(admins.map(a => a.email.toLowerCase()));

  // Имя/email/telegram берём из CRM (getCRMParticipants) — это та же карточка,
  // что видит админ на CRM-доске, и там уже учтена вручную заполненная связка почта↔имя↔telegram.
  const participants = await getCRMParticipants(env);

  // Сообщения в чате — суммарно по всем чатам, на одного участника (по tgId)
  const chatIdx = await env.KV.get('chatactivity:chats', 'json') || [];
  const messagesByUser = new Map();
  for (const chatId of chatIdx) {
    const keys = await env.KV.list({ prefix: `chatuser:${chatId}:` });
    const records = await Promise.all(keys.keys.map(k => env.KV.get(k.name, 'json')));
    records.filter(Boolean).forEach(r => {
      const uid = String(r.userId);
      messagesByUser.set(uid, (messagesByUser.get(uid) || 0) + (r.messageCount || 0));
    });
  }

  const stats = [];
  for (const p of participants) {
    if (!p.tgId) continue; // без телеграм-аккаунта активность не считаем
    if (p.email && adminEmails.has(p.email.toLowerCase())) continue;
    const userId = String(p.tgId);

    const [progAi, progFun, tpAi, tpFun] = await Promise.all([
      env.KV.get(`progress:${userId}:ai`, "json"),
      env.KV.get(`progress:${userId}:funnels`, "json"),
      env.KV.get(`taskprogress:${userId}:ai`, "json"),
      env.KV.get(`taskprogress:${userId}:funnels`, "json")
    ]);

    const completed = (progAi?.completed?.length || 0) + (progFun?.completed?.length || 0)
      + (tpAi?.completed?.length || 0) + (tpFun?.completed?.length || 0);
    const messages = messagesByUser.get(userId) || 0;
    const launches = p.launches || 0;
    const score = messages + launches + completed;
    if (score === 0) continue;

    stats.push({
      name: p.name || p.telegram || (p.email ? p.email.split('@')[0] : 'Без имени'),
      username: p.telegram || '',
      email: p.email || '',
      messages, launches, completed, score
    });
  }

  stats.sort((a, b) => b.score - a.score);
  return stats.slice(0, 10);
}

async function sendWeeklyDigest(env) {
  try {
    if (!env.ADMIN_ID) return;
    const top = await buildTopParticipantsDigest(env);
    if (!top.length) {
      await tgSend(env, env.ADMIN_ID, '📊 *Еженедельная сводка активности*\n\nПока нет данных об активности участников.');
      return;
    }
    let text = '📊 *Топ-10 участников за неделю*\n\n_Сообщения в чате · заходы в мини-ап · выполненные модули/задания_\n\n';
    top.forEach((p, i) => {
      const handle = p.username ? ` (@${p.username})` : '';
      const emailLine = p.email ? `\n   ✉️ ${p.email}` : '';
      text += `${i + 1}. *${p.name}*${handle}${emailLine}\n   💬 ${p.messages} · 📱 ${p.launches} · ✅ ${p.completed}\n`;
    });
    await tgSend(env, env.ADMIN_ID, text);
  } catch(err) {
    await notifyAdminError(env, 'sendWeeklyDigest', err);
  }
}

function icsStartFromDatetime(dtStr) {
  const d = new Date(dtStr);
  return d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') +
    'T' + String(d.getHours()).padStart(2,'0') + String(d.getMinutes()).padStart(2,'0') + '00';
}

function icsEndFromDatetime(dtStr, durMin) {
  const d = new Date(new Date(dtStr).getTime() + durMin * 60000);
  return d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') +
    'T' + String(d.getHours()).padStart(2,'0') + String(d.getMinutes()).padStart(2,'0') + '00';
}

async function apiTasks(request, env) {
  const url = new URL(request.url);
  const programId = url.searchParams.get("id");
  if (!programId) return jsonResp({ error: "Missing id" }, 400);
  const tasks = await env.KV.get(`tasks:${programId}`, "json") || [];
  return jsonResp({ tasks });
}

async function notifyAdmin(env, text) {
  if (!env.ADMIN_ID) return;
  await tgSend(env, env.ADMIN_ID, text);
}

// ─── API: AUTH ───────────────────────────────────────────────
async function apiTaskProgress(request, env) {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const programId = url.searchParams.get("programId");
    const progress = await env.KV.get(`taskprogress:${userId}:${programId}`, "json") || { completed: [] };
    return jsonResp(progress);
  }
  if (request.method === "POST") {
    const { initData, programId, taskId, done } = await request.json();
    const parsed = parseTgInitData(initData);
    if (!parsed?.user) return jsonResp({ ok: false }, 401);
    const userId = parsed.user.id;
    const key = `taskprogress:${userId}:${programId}`;
    const progress = await env.KV.get(key, "json") || { completed: [] };
    if (done && !progress.completed.includes(taskId)) progress.completed.push(taskId);
    else if (!done) progress.completed = progress.completed.filter(id => id !== taskId);
    await env.KV.put(key, JSON.stringify(progress));
    return jsonResp({ ok: true, progress });
  }
  return jsonResp({ error: "Method not allowed" }, 405);
}


async function apiAuth(request, env) {
  if (request.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);
  const { initData } = await request.json();
  const parsed = parseTgInitData(initData);
  if (!parsed || !parsed.user) return jsonResp({ ok: false, error: "Invalid initData" }, 401);

  const userId = parsed.user.id;
  const userData = await env.KV.get(`user:${userId}`, "json");

  // Сохранить botuser если ещё нет
  const botUser = await env.KV.get(`botuser:${userId}`, "json");
  if (!botUser) {
    await env.KV.put(`botuser:${userId}`, JSON.stringify({
      tgId: userId,
      name: parsed.user.first_name,
      lastName: parsed.user.last_name,
      username: parsed.user.username,
      startedAt: Date.now()
    }));
  }

  if (userData && userData.approved) {
    const launches = (await env.KV.get(`userstat:${userId}:launches`, "json") || 0) + 1;
    await env.KV.put(`userstat:${userId}:launches`, JSON.stringify(launches));
    await logEvent(env, 'miniapp_open', userId, { role: 'member' });
    return jsonResp({ ok: true, role: 'member', user: { ...parsed.user, ...userData } });
  }

  // Гость — пускаем, но без доступа к Ядру
  await logEvent(env, 'miniapp_open', userId, { role: 'guest' });
  return jsonResp({ ok: true, role: 'guest', user: parsed.user });
}

// ─── API: USER ───────────────────────────────────────────────
async function apiUser(request, env) {
  if (request.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);
  const { initData, action, payload } = await request.json();
  const parsed = parseTgInitData(initData);
  if (!parsed?.user) return jsonResp({ ok: false }, 401);
  const userId = parsed.user.id;
  const userData = await env.KV.get(`user:${userId}`, "json");
  if (!userData?.approved) return jsonResp({ ok: false, error: "Not authorized" }, 403);

  if (action === "submitQuestion") {
    const questions = await env.KV.get("questions:list", "json") || [];
    const q = { id: Date.now(), userId, name: userData.name, text: payload.text, date: Date.now(), program: payload.program || "" };
    questions.unshift(q);
    await env.KV.put("questions:list", JSON.stringify(questions));
    await notifyAdmin(env, `❓ Новый вопрос от ${userData.name}\n\nПрограмма: ${q.program}\n\n${q.text}`);
    return jsonResp({ ok: true });
  }
  return jsonResp({ ok: false, error: "Unknown action" });
}

// ─── API: PROGRAM ────────────────────────────────────────────
async function apiProgram(request, env) {
  const url = new URL(request.url);
  const programId = url.searchParams.get("id");
  if (!programId) return jsonResp({ error: "Missing id" }, 400);

  const program = await env.KV.get(`program:${programId}`, "json");
  return jsonResp(program);
}

const DEFAULT_MODULE_TAGS = ["Игровой миникурс", "Контент", "Сайты", "Воронки"];

async function getOrSeedTags(env) {
  const tags = await env.KV.get("program:tags", "json");
  if (tags && tags.length) return tags;
  await env.KV.put("program:tags", JSON.stringify(DEFAULT_MODULE_TAGS));
  return DEFAULT_MODULE_TAGS;
}

async function apiTags(request, env) {
  const tags = await getOrSeedTags(env);
  return jsonResp({ tags });
}

// Хронология объединённого списка модулей Ядра (обе программы вместе).
// Хранится как список ключей "programId:moduleId" в порядке отображения (сверху вниз).
async function getModulesOrder(env) {
  let order = await env.KV.get("modules:order", "json");
  if (order && Array.isArray(order)) return order;

  const [ai, funnels] = await Promise.all([
    env.KV.get("program:ai", "json"),
    env.KV.get("program:funnels", "json")
  ]);
  const all = [
    ...(ai?.modules || []).map(m => ({ ...m, _p: "ai" })),
    ...(funnels?.modules || []).map(m => ({ ...m, _p: "funnels" }))
  ];
  all.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da; // новые сверху при первичной инициализации
  });
  order = all.map(m => `${m._p}:${m.id}`);
  await env.KV.put("modules:order", JSON.stringify(order));
  return order;
}

async function apiModuleOrder(request, env) {
  const order = await getModulesOrder(env);
  return jsonResp({ order });
}

// ─── API: PROGRESS ───────────────────────────────────────────
async function apiProgress(request, env) {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const programId = url.searchParams.get("programId");
    if (!userId || !programId) return jsonResp({ error: "Missing params" }, 400);
    const progress = await env.KV.get(`progress:${userId}:${programId}`, "json") || { completed: [] };
    return jsonResp(progress);
  }
  if (request.method === "POST") {
    const { initData, programId, moduleId, done } = await request.json();
    const parsed = parseTgInitData(initData);
    if (!parsed?.user) return jsonResp({ ok: false }, 401);
    const userId = parsed.user.id;
    const userData = await env.KV.get(`user:${userId}`, "json");
    if (!userData?.approved) return jsonResp({ ok: false }, 403);

    const key = `progress:${userId}:${programId}`;
    const progress = await env.KV.get(key, "json") || { completed: [] };
    if (done && !progress.completed.includes(moduleId)) {
      progress.completed.push(moduleId);
    } else if (!done) {
      progress.completed = progress.completed.filter(id => id !== moduleId);
    }
    await env.KV.put(key, JSON.stringify(progress));
    return jsonResp({ ok: true, progress });
  }
  return jsonResp({ error: "Method not allowed" }, 405);
}

// ─── API: QUESTIONS ──────────────────────────────────────────
async function apiQuestions(request, env) {
  const questions = await env.KV.get("questions:list", "json") || [];
  return jsonResp({ questions });
}

// ─── API: ADMIN LOGIN ────────────────────────────────────────
async function apiAdminLogin(request, env) {
  if (request.method !== "POST") return jsonResp({ error: "Method" }, 405);
  const { password } = await request.json();
  if (password !== ADMIN_PASSWORD) return jsonResp({ ok: false, error: "Неверный пароль" }, 401);
  return jsonResp({ ok: true, token: "admin_session_" + ADMIN_PASSWORD });
}

// ─── API: ADMIN ACTIONS ──────────────────────────────────────
async function apiAdminAction(request, env, url) {
  // Simple token check
  const auth = request.headers.get("Authorization") || "";
  if (!auth.includes("admin_session_" + ADMIN_PASSWORD)) {
    return jsonResp({ error: "Unauthorized" }, 401);
  }

  const action = url.pathname.replace("/api/admin/", "");

  if (action === "events" && request.method === "GET") {
  await ensureSeedEvents(env);
  const events = await env.KV.get("events:list", "json") || [];
  return jsonResp({ events });
}

if (action === 'sync-participants' && request.method === 'POST') {
  const emails = await env.KV.get('emails:approved', 'json') || [];
  const emailSet = new Set(emails.map(e => e.toLowerCase()));
  let linked = 0, missing = 0, updated = 0;

  // Build email→tgId map by scanning all user:* records
  const userKeys = await env.KV.list({ prefix: 'user:' });
  const emailToTgId = {};
  for (const key of userKeys.keys) {
    const record = await env.KV.get(key.name, 'json');
    if (record?.email) emailToTgId[record.email.toLowerCase()] = { tgId: key.name.replace('user:', ''), record };
  }

  for (const email of emails) {
    const emailLower = email.toLowerCase();
    const existing = await env.KV.get(`email_to_user:${emailLower}`);
    if (existing) { linked++; continue; }

    const found = emailToTgId[emailLower];
    if (found) {
      await env.KV.put(`email_to_user:${emailLower}`, found.tgId);
      // Ensure approved flag is set
      if (!found.record.approved) {
        found.record.approved = true;
        await env.KV.put(`user:${found.tgId}`, JSON.stringify(found.record));
        updated++;
      }
      linked++;
    } else {
      missing++;
    }
  }

  return jsonResp({ ok: true, linked, missing, updated });
}

if (action === "save-event" && request.method === "POST") {
  const { event } = await request.json();
  const events = await env.KV.get("events:list", "json") || [];
  const idx = events.findIndex(e => e.id === event.id);
  if (idx >= 0) events[idx] = event;
  else events.push(event);
  await env.KV.put("events:list", JSON.stringify(events));
  return jsonResp({ ok: true });
}

if (action === "delete-event" && request.method === "POST") {
  const { id } = await request.json();
  let events = await env.KV.get("events:list", "json") || [];
  events = events.filter(e => e.id !== id);
  await env.KV.put("events:list", JSON.stringify(events));
  return jsonResp({ ok: true });
}

// ─── KB ADMIN ACTIONS ────────────────────────────────────────
if (action === "kb-categories" && request.method === "GET") {
  await ensureSeedKBUpdate(env);
  const categories = await env.KV.get("kb:categories", "json") || [];
  return jsonResp({ categories });
}

if (action === "kb-save-category" && request.method === "POST") {
  const { category } = await request.json();
  let cats = await env.KV.get("kb:categories", "json") || [];
  const idx = cats.findIndex(c => c.id === category.id);
  if (idx >= 0) cats[idx] = category;
  else cats.push(category);
  cats.sort((a, b) => (a.order || 0) - (b.order || 0));
  await env.KV.put("kb:categories", JSON.stringify(cats));
  return jsonResp({ ok: true });
}

if (action === "kb-delete-category" && request.method === "POST") {
  const { id } = await request.json();
  let cats = await env.KV.get("kb:categories", "json") || [];
  cats = cats.filter(c => c.id !== id);
  await env.KV.put("kb:categories", JSON.stringify(cats));
  await env.KV.delete(`kb:entries:${id}`);
  return jsonResp({ ok: true });
}

if (action === "kb-entries" && request.method === "GET") {
  const { searchParams } = new URL(request.url);
  const catId = searchParams.get("catId");
  const entries = await env.KV.get(`kb:entries:${catId}`, "json") || [];
  return jsonResp({ entries });
}

if (action === "kb-save-entry" && request.method === "POST") {
  const { catId, entry } = await request.json();
  let entries = await env.KV.get(`kb:entries:${catId}`, "json") || [];
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  await env.KV.put(`kb:entries:${catId}`, JSON.stringify(entries));
  return jsonResp({ ok: true });
}

if (action === "kb-delete-entry" && request.method === "POST") {
  const { catId, entryId } = await request.json();
  let entries = await env.KV.get(`kb:entries:${catId}`, "json") || [];
  entries = entries.filter(e => e.id !== entryId);
  await env.KV.put(`kb:entries:${catId}`, JSON.stringify(entries));
  return jsonResp({ ok: true });
}

if (action === "kb-init" && request.method === "POST") {
  await initKBData(env);
  return jsonResp({ ok: true });
}

  if (action === "participants" && request.method === "GET") {
  const emails = await env.KV.get("emails:approved", "json") || [];
  const pending = await env.KV.get("pending:list", "json") || [];
  const admins = await env.KV.get("admins:list", "json") || [];
  const stopped = await env.KV.get("users:stopped", "json") || []; // ← добавь
  const adminEmails = new Set(admins.map(a => a.email.toLowerCase()));
  const filteredEmails = emails.filter(e => !adminEmails.has(e.toLowerCase()));
  return jsonResp({ emails: filteredEmails, pending, stopped }); // ← добавь stopped
}

  if (action === "dashboard-stats" && request.method === "GET") {
  const emails = await env.KV.get("emails:approved", "json") || [];
  const pending = await env.KV.get("pending:list", "json") || [];
  const questions = await env.KV.get("questions:list", "json") || [];

const admins = await env.KV.get("admins:list", "json") || [];
const adminEmails = new Set(admins.map(a => a.email.toLowerCase()));
const participantEmails = emails.filter(e => !adminEmails.has(e.toLowerCase()));

  // Собрать данные по всем юзерам
  const userList = await env.KV.list({ prefix: "user:" });
  let totalLaunches = 0;
  let paymentsWithDates = [];
  let topUsers = [];

  for (const key of userList.keys) {
  const u = await env.KV.get(key.name, "json");
  if (!u?.approved) continue;
  if (adminEmails.has((u.email || '').toLowerCase())) continue;
    const userId = u.tgId;

    const launches = await env.KV.get(`userstat:${userId}:launches`, "json") || 0;
    const payment = await env.KV.get(`userpayment:${userId}`);
    const progAi = await env.KV.get(`progress:${userId}:ai`, "json") || { completed: [] };
    const progFun = await env.KV.get(`progress:${userId}:funnels`, "json") || { completed: [] };
    const totalDone = progAi.completed.length + progFun.completed.length;

    totalLaunches += launches;
    if (payment) paymentsWithDates.push({ email: u.email, date: payment });
    topUsers.push({ email: u.email, username: u.username, launches, done: totalDone });
  }

  topUsers.sort((a, b) => b.launches - a.launches);

  // Сигналы для карточки здоровья и ленты "Требует внимания" — переиспользуем
  // тот же список участников, что и CRM-доска (см. getCRMParticipants).
  const participants = await getCRMParticipants(env);
  const activeIsh = participants.filter(p => p.status === 'active' || p.status === 'paid');
  const riskList = activeIsh.filter(p => p.risk);
  const newList = participants.filter(p => p.isNew);
  const unpaidActive = activeIsh.filter(p => !p.paidThisMonth);

  const retentionPct = participants.length ? Math.round(activeIsh.length / participants.length * 100) : 0;
  const paymentHealthPct = activeIsh.length ? Math.round((activeIsh.length - unpaidActive.length) / activeIsh.length * 100) : 100;

  const day = 86400000;
  const now = Date.now();
  const sumEvtaggRange = async (fromDaysAgoExclusive, toDaysAgoInclusive) => {
    const dates = [];
    for (let i = toDaysAgoInclusive; i < fromDaysAgoExclusive; i++) dates.push(eventDateStr(now - i * day));
    const aggs = await Promise.all(dates.map(d => env.KV.get(`evtagg:${d}`, 'json')));
    return aggs.reduce((sum, a) => sum + (a?.total || 0), 0);
  };
  const last30 = await sumEvtaggRange(30, 0);
  const prev30 = await sumEvtaggRange(60, 30);
  const engagementDeltaPct = prev30 > 0 ? Math.round((last30 - prev30) / prev30 * 100) : (last30 > 0 ? 100 : 0);
  const engagementScore = Math.max(0, Math.min(100, 50 + engagementDeltaPct / 2));
  const growthScore = Math.max(0, Math.min(100, newList.length * 10));

  const healthScore = Math.round((retentionPct + engagementScore + growthScore + paymentHealthPct) / 4);

  const insights = [];
  if (riskList.length) insights.push({ type: 'risk', title: `${riskList.length} участник${riskList.length === 1 ? '' : riskList.length < 5 ? 'а' : 'ов'} ${riskList.length === 1 ? 'не проявлял' : 'не проявляли'} активность ${RISK_DAYS}+ дней`, sub: 'Активные/оплатившие без следов активности — стоит написать', target: 'participants', filter: 'risk' });
  if (pending.length) insights.push({ type: 'pending', title: `${pending.length} заявк${pending.length === 1 ? 'а' : pending.length < 5 ? 'и' : 'ок'} ${pending.length === 1 ? 'ждёт' : 'ждут'} одобрения`, sub: 'Новые заявки на доступ висят в очереди', target: 'participants', filter: 'pending' });
  if (questions.length) insights.push({ type: 'pending', title: `${questions.length} вопрос${questions.length === 1 ? '' : questions.length < 5 ? 'а' : 'ов'} без ответа`, sub: 'Участники ждут ответа в боте', target: 'questions', filter: null });
  if (unpaidActive.length) insights.push({ type: 'risk', title: `${unpaidActive.length} активн${unpaidActive.length === 1 ? 'ый' : 'ых'} участник${unpaidActive.length === 1 ? '' : unpaidActive.length < 5 ? 'а' : 'ов'} ${unpaidActive.length === 1 ? 'не оплатил' : 'не оплатили'} этот месяц`, sub: 'Нет отметки об оплате за ' + thisMonthLabelRu(), target: 'participants', filter: 'unpaid' });
  if (newList.length) insights.push({ type: 'info', title: `${newList.length} нов${newList.length === 1 ? 'ый' : 'ых'} участник${newList.length === 1 ? '' : newList.length < 5 ? 'а' : 'ов'} за последние ${NEW_DAYS} дней`, sub: 'Стоит проверить, прошли ли онбординг', target: 'participants', filter: 'new' });

  return jsonResp({
    totalEmails: participantEmails.length,
    totalPending: pending.length,
    totalQuestions: questions.length,
    totalLaunches,
    paymentsWithDates: paymentsWithDates.slice(0, 20),
    topUsers: topUsers.slice(0, 5),
    health: {
      score: healthScore,
      retentionPct, paymentHealthPct,
      engagementDeltaPct, growthCount: newList.length,
      riskCount: riskList.length, newCount: newList.length,
      totalParticipants: participants.length, activeCount: activeIsh.length,
      eventsLast30: last30, eventsPrev30: prev30
    },
    insights
  });
}

  if (action === "admins" && request.method === "GET") {
  const admins = await env.KV.get("admins:list", "json") || [];
  return jsonResp({ admins });
}

if (action === "add-admin" && request.method === "POST") {
  const { email, tgId, name } = await request.json();
  const admins = await env.KV.get("admins:list", "json") || [];
  if (!admins.find(a => a.email === email)) admins.push({ email, tgId, name });
  await env.KV.put("admins:list", JSON.stringify(admins));
  return jsonResp({ ok: true });
}

if (action === "remove-admin" && request.method === "POST") {
  const { email } = await request.json();
  let admins = await env.KV.get("admins:list", "json") || [];
  admins = admins.filter(a => a.email !== email);
  await env.KV.put("admins:list", JSON.stringify(admins));
  return jsonResp({ ok: true });
}

  if (action === "user-by-id" && request.method === "GET") {
  const userId = url.searchParams.get("userId");
  const user = await env.KV.get(`user:${userId}`, "json");
  return jsonResp(user || {});
}

  if (action === "userid-by-email" && request.method === "GET") {
  const email = url.searchParams.get("email");
  const userId = await env.KV.get(`email_to_user:${email}`);
  return jsonResp({ userId });
}

  if (action === "bot-users" && request.method === "GET") {
  const list = await env.KV.list({ prefix: "botuser:" });
  const users = [];
  for (const key of list.keys) {
    const u = await env.KV.get(key.name, "json");
    if (u) users.push(u);
  }
  return jsonResp({ users });
}

  if (action === "user-stats" && request.method === "GET") {
  const userId = url.searchParams.get("userId");
  const [launches, payment, progAi, progFun, tpAi, tpFun, questions] = await Promise.all([
    env.KV.get(`userstat:${userId}:launches`, "json"),
    env.KV.get(`userpayment:${userId}`),
    env.KV.get(`progress:${userId}:ai`, "json"),
    env.KV.get(`progress:${userId}:funnels`, "json"),
    env.KV.get(`taskprogress:${userId}:ai`, "json"),
    env.KV.get(`taskprogress:${userId}:funnels`, "json"),
    env.KV.get("questions:list", "json")
  ]);
  const userQuestions = (questions || []).filter(q => String(q.userId) === String(userId)).length;
  return jsonResp({
    launches: launches || 0,
    payment: payment || null,
    progress: {
      ai: (progAi?.completed || []).length,
      funnels: (progFun?.completed || []).length
    },
    tasks: {
      ai: (tpAi?.completed || []).length,
      funnels: (tpFun?.completed || []).length
    },
    questions: userQuestions
  });
}

if (action === "set-payment" && request.method === "POST") {
  const { userId, date } = await request.json();
  await env.KV.put(`userpayment:${userId}`, date);
  return jsonResp({ ok: true });
}

  if (action === "tasks" && request.method === "GET") {
  const programId = url.searchParams.get("id");
  const tasks = await env.KV.get(`tasks:${programId}`, "json") || [];
  return jsonResp({ tasks });
}

if (action === "save-task" && request.method === "POST") {
  const { programId, task } = await request.json();
  const tasks = await env.KV.get(`tasks:${programId}`, "json") || [];
  const idx = tasks.findIndex(t => t.id === task.id);
  if (idx >= 0) tasks[idx] = task;
  else tasks.push(task);
  await env.KV.put(`tasks:${programId}`, JSON.stringify(tasks));
  return jsonResp({ ok: true });
}

if (action === "delete-task" && request.method === "POST") {
  const { programId, taskId } = await request.json();
  let tasks = await env.KV.get(`tasks:${programId}`, "json") || [];
  tasks = tasks.filter(t => t.id !== taskId);
  await env.KV.put(`tasks:${programId}`, JSON.stringify(tasks));
  return jsonResp({ ok: true });
}

  if (action === "add-email" && request.method === "POST") {
    const { email } = await request.json();
    const emailLower = email.toLowerCase().trim();
    const emails = await env.KV.get("emails:approved", "json") || [];
    if (!emails.includes(emailLower)) emails.push(emailLower);
    await env.KV.put("emails:approved", JSON.stringify(emails));
    // Get tgId from pending before removing
    let pending = await env.KV.get("pending:list", "json") || [];
    const pendingEntry = pending.find(p => p.email === emailLower);
    const tgId = pendingEntry?.tgId;
    // Remove from pending
    pending = pending.filter(p => p.email !== emailLower);
    await env.KV.put("pending:list", JSON.stringify(pending));
    // If we know tgId — create full mapping, update user record, send notification
    if (tgId) {
      await env.KV.put(`email_to_user:${emailLower}`, String(tgId));
      const existing = await env.KV.get(`user:${tgId}`, "json");
      const userData = {
        ...(existing || {}),
        tgId: Number(tgId),
        email: emailLower,
        approved: true,
        enrolledAt: existing?.enrolledAt || Date.now(),
        name: existing?.name || pendingEntry?.name || emailLower.split('@')[0],
      };
      await env.KV.put(`user:${tgId}`, JSON.stringify(userData));
      const keyboard = { inline_keyboard: [[{ text: "📚 Открыть CMO Ядро", web_app: { url: WORKER_URL + "/app" } }]] };
      await tgSend(env, Number(tgId),
        `✅ *Доступ к CMO Ядро одобрен!*\n\nТвой email \`${emailLower}\` подтверждён администратором.\n\nНажми кнопку ниже, чтобы войти в приложение.`,
        keyboard
      );
    }
    return jsonResp({ ok: true, tgId });
  }

  if (action === "remove-email" && request.method === "POST") {
    const { email } = await request.json();
    let emails = await env.KV.get("emails:approved", "json") || [];
    emails = emails.filter(e => e !== email.toLowerCase());
    await env.KV.put("emails:approved", JSON.stringify(emails));
    return jsonResp({ ok: true });
  }

  // ─── STOP USER ───────────────────────────────────────────────
  if (action === "stop-user" && request.method === "POST") {
    const { email } = await request.json();
    
    // НЕ удаляем из emails:approved — пусть остаётся в списке
    // Вместо этого помечаем в отдельном KV ключе
    const stopped = await env.KV.get("users:stopped", "json") || [];
    if (!stopped.includes(email.toLowerCase())) stopped.push(email.toLowerCase());
    await env.KV.put("users:stopped", JSON.stringify(stopped));
    
    // Помечаем юзера
    const userId = await env.KV.get(`email_to_user:${email.toLowerCase()}`);
    if (userId) {
      const userData = await env.KV.get(`user:${userId}`, "json");
      if (userData) {
        userData.approved = false;
        userData.stoppedAt = Date.now();
        await env.KV.put(`user:${userId}`, JSON.stringify(userData));
      }
      await tgSend(env, Number(userId),
        `🚫 *Доступ к CMO Ядро закрыт*\n\nМы не получили оплату за следующий месяц, поэтому доступ приостановлен.\n\n⏳ Через 3 дня ты будешь удалён из чата. Вернуться после этого будет невозможно.\n\n_Если это ошибка — напиши Олегу, он разберётся._`,
        { inline_keyboard: [[{ text: '✍️ Написать Олегу — восстановить доступ', url: 'https://t.me/oleg_ezhkov' }]] }
      );
    }
    return jsonResp({ ok: true, userId });
}

  // ─── RESTORE USER ────────────────────────────────────────────
  if (action === "restore-user" && request.method === "POST") {
    const { email } = await request.json();
    
    // Убираем из списка остановленных
    let stopped = await env.KV.get("users:stopped", "json") || [];
    stopped = stopped.filter(e => e !== email.toLowerCase());
    await env.KV.put("users:stopped", JSON.stringify(stopped));
    
    const userId = await env.KV.get(`email_to_user:${email.toLowerCase()}`);
    if (userId) {
      const userData = await env.KV.get(`user:${userId}`, "json");
      if (userData) {
        userData.approved = true;
        delete userData.stoppedAt;
        await env.KV.put(`user:${userId}`, JSON.stringify(userData));
      }
      await tgSend(env, Number(userId),
        `✅ *Доступ к CMO Ядро восстановлен!*\n\nТвой доступ к базе знаний снова активен. Добро пожаловать обратно! 🎉\n\nЗаходи в мини-приложение 👇`,
        { inline_keyboard: [[{ text: "📚 Открыть CMO Ядро", web_app: { url: WORKER_URL + "/app" } }]] }
      );
    }
    return jsonResp({ ok: true, userId });
}

if (action === "notify" && request.method === "POST") {
  const { text, program, userIds } = await request.json();
  let sent = 0;
  const keyboard = {
    inline_keyboard: [[
      { text: "📚 Открыть приложение", web_app: { url: `${WORKER_URL}/app` } }
    ]]
  };

  if (userIds && userIds.length > 0) {
    // Отправить выбранным
    for (const userId of userIds) {
      const userData = await env.KV.get(`user:${userId}`, "json");
      if (userData?.approved) {
        await tgSend(env, userData.tgId, `📢 *Уведомление от CMO*\n\n${text}`, keyboard);
        sent++;
      }
    }
  } else {
    // Отправить всем (или по программе)
    const listResult = await env.KV.list({ prefix: "user:" });
    for (const key of listResult.keys) {
      const userData = await env.KV.get(key.name, "json");
      if (!userData || !userData.approved) continue;
      if (program) {
        const enrollments = await env.KV.get(`enroll:${userData.tgId}`, "json") || [];
        if (!enrollments.includes(program)) continue;
      }
      await tgSend(env, userData.tgId, `📢 *Уведомление от CMO*\n\n${text}`, keyboard);
      sent++;
    }
  }

  return jsonResp({ ok: true, sent });
}

  if (action === "program" && request.method === "GET") {
    const programId = url.searchParams.get("id");
    const program = await env.KV.get(`program:${programId}`, "json");
    return jsonResp(program);
  }

  if (action === "program" && request.method === "POST") {
    const { programId, program } = await request.json();
    await env.KV.put(`program:${programId}`, JSON.stringify(program));
    return jsonResp({ ok: true });
  }

  if (action === "module" && request.method === "POST") {
    const { programId, module } = await request.json();
    const program = await env.KV.get(`program:${programId}`, "json");
    const idx = program.modules.findIndex(m => m.id === module.id);
    if (idx >= 0) program.modules[idx] = module;
    else program.modules.push(module);
    await env.KV.put(`program:${programId}`, JSON.stringify(program));
    return jsonResp({ ok: true });
  }

  if (action === "add-module" && request.method === "POST") {
    const { programId } = await request.json();
    const program = await env.KV.get(`program:${programId}`, "json");
    const newId = "m" + (program.modules.length + 1) + "_" + Date.now();
    program.modules.push({ id: newId, title: "Новый модуль", description: "", embedUrl: "", files: [], available: false, date: new Date().toISOString().slice(0, 10), tags: [] });
    await env.KV.put(`program:${programId}`, JSON.stringify(program));

    // Новый модуль сразу ставим сверху в общей хронологии
    const order = await getModulesOrder(env);
    order.unshift(`${programId}:${newId}`);
    await env.KV.put("modules:order", JSON.stringify(order));

    return jsonResp({ ok: true, program });
  }

  if (action === "module-order" && request.method === "GET") {
    const order = await getModulesOrder(env);
    const [ai, funnels] = await Promise.all([
      env.KV.get("program:ai", "json"),
      env.KV.get("program:funnels", "json")
    ]);
    const modMap = new Map();
    (ai?.modules || []).forEach(m => modMap.set(`ai:${m.id}`, { ...m, programId: "ai" }));
    (funnels?.modules || []).forEach(m => modMap.set(`funnels:${m.id}`, { ...m, programId: "funnels" }));
    const items = order.map(key => modMap.get(key)).filter(Boolean);
    return jsonResp({ items });
  }

  if (action === "save-module-order" && request.method === "POST") {
    const { order } = await request.json();
    await env.KV.put("modules:order", JSON.stringify(Array.isArray(order) ? order : []));
    return jsonResp({ ok: true });
  }

  if (action === "send-digest-now" && request.method === "POST") {
    await sendWeeklyDigest(env);
    return jsonResp({ ok: true });
  }

  if (action === "tags" && request.method === "GET") {
    const tags = await getOrSeedTags(env);
    return jsonResp({ tags });
  }

  if (action === "add-tag" && request.method === "POST") {
    const { name } = await request.json();
    const trimmed = (name || "").trim();
    if (!trimmed) return jsonResp({ ok: false, error: "Пустое имя тега" });
    const tags = await env.KV.get("program:tags", "json") || [];
    if (!tags.includes(trimmed)) {
      tags.push(trimmed);
      await env.KV.put("program:tags", JSON.stringify(tags));
    }
    return jsonResp({ ok: true, tags });
  }

  if (action === "delete-tag" && request.method === "POST") {
    const { name } = await request.json();
    let tags = await env.KV.get("program:tags", "json") || [];
    tags = tags.filter(t => t !== name);
    await env.KV.put("program:tags", JSON.stringify(tags));
    return jsonResp({ ok: true, tags });
  }

  if (action === "delete-module" && request.method === "POST") {
    const { programId, moduleId } = await request.json();
    const program = await env.KV.get(`program:${programId}`, "json");
    if (!program) return jsonResp({ ok: false, error: "Программа не найдена" });
    program.modules = (program.modules || []).filter(m => m.id !== moduleId);
    await env.KV.put(`program:${programId}`, JSON.stringify(program));

    const order = (await getModulesOrder(env)).filter(key => key !== `${programId}:${moduleId}`);
    await env.KV.put("modules:order", JSON.stringify(order));

    // Отвязать (не удалять) задания, привязанные к удалённому модулю
    const tasks = await env.KV.get(`tasks:${programId}`, "json") || [];
    let changed = false;
    for (const t of tasks) {
      if (t.moduleId === moduleId) { t.moduleId = ""; changed = true; }
    }
    if (changed) await env.KV.put(`tasks:${programId}`, JSON.stringify(tasks));

    return jsonResp({ ok: true, program });
  }

  if (action === "questions" && request.method === "GET") {
    const questions = await env.KV.get("questions:list", "json") || [];
    return jsonResp({ questions });
  }

  if (action === "clear-question" && request.method === "POST") {
    const { id } = await request.json();
    let questions = await env.KV.get("questions:list", "json") || [];
    questions = questions.filter(q => q.id !== id);
    await env.KV.put("questions:list", JSON.stringify(questions));
    return jsonResp({ ok: true });
  }

  return jsonResp({ error: "Unknown action" }, 404);
}

// ─── ADMIN HTML PAGE ─────────────────────────────────────────
async function handleAdmin(request, env, url) {
  return new Response(getAdminHTML(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Разовый идемпотентный сид расписания: воркшопы по субботам и форум-группа.
// Помечается флагом events:seeded_workshops_v1, чтобы не дублировать при повторных вызовах.
async function ensureSeedEvents(env) {
  const seeded = await env.KV.get("events:seeded_workshops_v1");
  if (seeded) return;

  const events = await env.KV.get("events:list", "json") || [];
  const exists = (title, dateStr) => events.some(e => e.title === title && String(e.datetime || "").startsWith(dateStr));

  const toAdd = [];
  const WORKSHOP_TITLE = "Воркшоп по ИИ-маркетингу";
  const WORKSHOP_DATES = ["2026-08-22", "2026-08-29", "2026-09-05", "2026-09-12", "2026-09-19", "2026-09-26"];
  for (const d of WORKSHOP_DATES) {
    if (!exists(WORKSHOP_TITLE, d)) {
      toAdd.push({
        title: WORKSHOP_TITLE, author: "", datetime: `${d}T12:15`, photo: "",
        actionType: "register", actionUrl: "https://t.me/oleg_ezhkov", tags: [], authorUrl: ""
      });
    }
  }

  const FORUM_TITLE = "Форум-группа";
  const FORUM_DATES = ["2026-08-27", "2026-09-10", "2026-09-24"];
  for (const d of FORUM_DATES) {
    if (!exists(FORUM_TITLE, d)) {
      toAdd.push({
        title: FORUM_TITLE, author: "", datetime: `${d}T19:00`, photo: "",
        actionType: "register", actionUrl: "https://t.me/oleg_ezhkov", tags: [], authorUrl: ""
      });
    }
  }

  if (toAdd.length) {
    const now = Date.now();
    toAdd.forEach((ev, i) => { ev.id = now + i; });
    const merged = events.concat(toAdd);
    merged.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    await env.KV.put("events:list", JSON.stringify(merged));
  }
  await env.KV.put("events:seeded_workshops_v1", "1");
}

async function apiEvents(request, env) {
  await ensureSeedEvents(env);
  const events = await env.KV.get("events:list", "json") || [];
  return jsonResp({ events });
}

// ─── KNOWLEDGE BASE API ──────────────────────────────────────
async function apiKB(request, env) {
  await ensureSeedKBUpdate(env);
  const categories = await env.KV.get("kb:categories", "json") || [];
  const result = [];
  for (const cat of categories) {
    const entries = await env.KV.get(`kb:entries:${cat.id}`, "json") || [];
    result.push({ ...cat, entries });
  }
  return jsonResp({ categories: result });
}

async function initKBData(env) {
  const categories = [
    { id: "experts-2026", title: "Встречи с экспертами 2026", icon: "🎤", order: 1 },
    { id: "community-2026", title: "Встречи сообщества 2026", icon: "👥", order: 2 },
    { id: "excursions", title: "Экскурсии в проекты и инструменты", icon: "🏗️", order: 3 }
  ];
  await env.KV.put("kb:categories", JSON.stringify(categories));

  const experts = [
    {
      id: "crm-anna-2026-04-16",
      title: "Экскурсия в отдел CRM-маркетинга с Анной Ильичевой",
      subtitle: "Как оценить потенциал выручки с базы по 5 критериям",
      date: "16.04.2026",
      videoUrl: "https://youtu.be/Voa2PNtz2GY",
      materials: [
        { title: "Шаблон: Аудит состояния базы + расчёт потенциала выручки из базы", url: "https://docs.google.com/spreadsheets/d/1cilSwiXFqlw_QFErHuoJx-HAe6GUUhjIaULied86lLU/edit?gid=1534526639#gid=1534526639" }
      ],
      summary: "Основа работы с базой — аналитика. До построения и тестирования гипотез нужно провести анализ поведения пользователей в базе. Ключевые метрики: средняя выручка на регистрацию, структура выручки (новые vs база), доля клиентов в базе (при 12%+ база «выгорела»), конверсия базы в заказ (<1,5% — большой потенциал), доля активных пользователей.\n\nИтоговый потенциал: перемножение всех коэффициентов показывает теоретический рост выручки в 3,7 раза. Пример подтверждённой гипотезы: трафик текущего месяца, прошедший 18-дневную воронку но не купивший, конвертируется повторно без дополнительных скидок — достаточно смысловой обвязки (сезонность, срочность).\n\nРост открываемости писем на 1–2% требует 3–4 месяцев работы. На Чёрную пятницу скидка 80% через бандлы снизила средний чек всего на 2–3 тыс. руб., но дала рекордную выручку."
    },
    {
      id: "petr-derevenskiy-2026-04-18",
      title: "Встреча с Петром Деревенским",
      subtitle: "Как создать цифрового двойника для онлайн-школы?",
      date: "18.04.2026",
      videoUrl: "https://youtu.be/AEnRncx_qhQ",
      materials: [
        { title: "600 нейросетей и их возможности", url: "https://drive.google.com/file/d/1y2FivNdJaDubL7IO4wDYTSryFFBEWz94/view?usp=sharing" },
        { title: "Промт для нейро-прогрева", url: "https://docs.google.com/document/u/0/d/1z4kS7kjZPoUXVyd46VUmw2-2hjtZyjk0k52f6vnGyy4/mobilebasic" },
        { title: "Промт для нейро-веба", url: "https://docs.google.com/document/u/0/d/1kgs38WU97akWINMSUB47FFZctzLG4kJ6se229-t0UK4/mobilebasic" }
      ],
      summary: "Охваты в Telegram упали на 50% из-за блокировок. Трафик дорожает, команда не дешевеет, база выгорает.\n\nNeiroPeople создаёт цифрового двойника эксперта — ИИ-копию, которая работает в любых онлайн-сервисах 24/7 без VPN. Двойник обучается автоматически на контенте из подключённых соцсетей и мессенджеров.\n\nЧто двойник умеет: персонализированно предлагает продукты под боль конкретного пользователя, заменяет кураторов (отвечает на вопросы студентов в любое время), пуш-уведомления открывают 40–60% подписчиков против 5–15% у рассылок, находит чаты с вакансиями и откликается по скрипту, создаёт контент: анализирует тренды → пишет сценарий → генерирует видео через HeyGen → публикует.\n\nМодель работы: внедрение бесплатно, совместный запуск 50/50 от чистой прибыли. Контакт: @p_derevenskiy"
    },
    {
      id: "dmitry-zubankov-2026-04-30",
      title: "Встреча с Дмитрием Зубанковым",
      subtitle: "Как запустить и масштабировать успешный клуб по подписке?",
      date: "30.04.2026",
      videoUrl: "https://youtu.be/-4RdjRnI2Dc",
      materials: [
        { title: "Матрица масштабирования", url: "https://drive.google.com/file/d/1buVHP54NjxKpmzmhUt9laY2oapc3qe9P/view?usp=sharing" },
        { title: "Дорожная карта по запуску клуба", url: "https://drive.google.com/file/d/1rxT66dr98Euko14bMC0ztxhlJc830mh5/view?usp=sharing" },
        { title: "Бесплатная консультация по запуску / масштабированию клуба", url: "https://my-membership.ru/consultation?utm_campaign=cmoveb" }
      ],
      summary: "В подписной модели ключевое — удержание: клиент приносит деньги, пока остаётся в системе. Участники приходят за контентом, остаются ради сообщества и результата.\n\nМетодология запуска (6–8 недель): исследовать рынок → определить роль клуба в линейке → описать путь клиента → разбить на дорожную карту → запустить предзапись за 2–4 недели → провести тестовый запуск.\n\nФорматы клубов: контентный, капельный, DHL, коучинговый, комьюнити, престиж, гибридный (самый частый).\n\nМасштабирование по 3 направлениям: маркетинг (аудитория → конверсия → маховик), резиденты (удержание, снижение оттока), менеджмент (команда, система).\n\nЧастые ошибки: каннибализация дорогих продуктов, продажа клубов в холодный трафик, смешение несвязанных аудиторий."
    },
    {
      id: "minikonfа-romi-seo-geo",
      title: "Мини-конфа: Как получать ROMI 500–700% от SEO и GEO",
      subtitle: "AI-агентные системы производства контента и стратегия органического трафика",
      date: "2026",
      videoUrl: "https://youtu.be/PmDWexr0iXw",
      materials: [
        { title: "Исследование: ключевые факторы успеха сайтов в EdTech", url: "https://drive.google.com/file/d/14CDOdnTRaCvngxnZ00VL6UjQMWDtFc_x/view?usp=sharing" },
        { title: "Фин.модель окупаемости инвестиций в SEO (по запросу)", url: "https://t.me/kasyanovserj" }
      ],
      summary: "Три эксперта по SEO и контент-маркетингу:\n\nRuslan (B2B/корпораты): AI-агентная система из 11 фаз производства контента, 9 из которых делают агенты. Юнит-экономика: 4–8 тыс. руб./статья, 70–80 статей/месяц силами 7 человек. За 3 месяца: 78 статей, ~3000 органических переходов/месяц, 10 лидов на входе воронки.\n\nIlya: полуавтоматический пайплайн технического аудита и генерации статей — 5–7 статей в день. Визуал через фирменный код в едином стиле.\n\nSergey (200+ человек в команде, ~200–500 проектов): стратегия ROI 500%+ через органику. Доходность лида с одного канала может различаться в 10 раз между воронками. Средняя конверсия сайтов 2,5%, у топ-5% — >7%. Поисковый мультипликатор: с каждым новым материалом старые получают больше трафика.\n\nGEO-оптимизация: упоминания бренда в Яндекс.Справочнике влияют на переходы из нейросетевой выдачи (Алиса). Несколько тысяч переходов в неделю из GEO уже реальность."
    },
    {
      id: "vasily-alekseev-2026-05-28",
      title: "Встреча с Василием Алексеевым (CEO Лайк)",
      subtitle: "",
      date: "28.05.2026",
      videoUrl: "",
      materials: [],
      summary: ""
    },
    {
      id: "philipp-lorez-2026-05-21",
      title: "Встреча с Филиппом Лорез (CMO Web3 Academy)",
      subtitle: "",
      date: "21.05.2026",
      videoUrl: "",
      materials: [],
      summary: ""
    },
    {
      id: "evgeny-bordunov-2026-06-04",
      title: "Встреча с Евгением Бордуновым",
      subtitle: "",
      date: "04.06.2026",
      videoUrl: "",
      materials: [],
      summary: ""
    },
    {
      id: "alexey-tkachenko-2026-06-25",
      title: "Встреча с Алексеем Ткаченко",
      subtitle: "Механики увеличения конверсии вебинаров до 48%",
      date: "25.06.2026",
      videoUrl: "",
      materials: [],
      summary: ""
    },
    {
      id: "vladimir-belikov-2026-07-31",
      title: "Встреча с Владимиром Беликовым",
      subtitle: "Почему смыслы решают конверсию сильнее воронки",
      date: "31.07.2026",
      videoUrl: "https://youtu.be/Tc_BJ9X6scs",
      materials: [],
      summary: "Смыслы решают конверсию сильнее, чем структура воронки: большинство сайтов не продают не из-за дизайна или трафика, а из-за слабого смысла в оффере. При этом статистика показывает — части проектов вообще не нужно менять тексты, сначала стоит проверить, действительно ли причина в смыслах.\n\nРазобраны три типичные ошибки, из-за которых сайт не продаёт, и реальный офер: написан красиво, но никто не купит — потому что текст не отражает то, что на самом деле покупает клиент. Пример: оружейники продают не оружие — разбор показывает, какую подлинную ценность покупают клиенты в разных нишах. Кейс: смена всего пары фраз в оффере подняла конверсию в 3 раза.\n\nЗагадка про женщину, которая продавала не то, что думала, а на деле выяснилось совсем другое — иллюстрация того, как легко ошибиться в определении настоящего смысла продукта. Отдельно разобрано, почему ИИ только усиливает ошибку, если в основе лежит слабый смысл: нейросети хорошо упаковывают текст, но не чинят некорректный оффер.\n\nНа эфире прошёл живой разбор офера воркшопа, кейс продажи профессии, которую скоро заменит ИИ, разбор того, почему яркий «джунглевый» слайд убивает внимание клиента, и жёсткий разбор сайта клиники («у вас результата вообще нет на сайте»).\n\nФормат встречи: участники присылают свой сайт — на эфире находят, что именно режет конверсию и как её поднять. Спикер — Владимир Беликов, спикер программы мэра Москвы «Малый бизнес Москвы» в нише маркетинга."
    },
    {
      id: "artem-zakharov-puzzlebrain",
      title: "Встреча с Артемом Захаровым (puzzlebrain.ru)",
      subtitle: "Как получать регистрации в онлайн-школы от 50 рублей с Яндекс.Директа?",
      date: "2026",
      videoUrl: "",
      materials: [],
      summary: ""
    },
    {
      id: "vetto-voice",
      title: "Встреча с Ветто",
      subtitle: "Голос как инструмент влияния: как вызывать уважение, быть услышанным и вести за собой",
      date: "2026",
      videoUrl: "",
      materials: [],
      summary: ""
    }
  ];
  await env.KV.put("kb:entries:experts-2026", JSON.stringify(experts));

  const community = [
    {
      id: "edtech-tops-2026-04-15",
      title: "Круглый стол для топов EdTech",
      subtitle: "",
      date: "15.04.2026",
      videoUrl: "",
      materials: [],
      summary: ""
    },
    {
      id: "edtech-kids-2026-04-28",
      title: "Круглый стол по детской нише EdTech",
      subtitle: "",
      date: "28.04.2026",
      videoUrl: "",
      materials: [],
      summary: ""
    }
  ];
  await env.KV.put("kb:entries:community-2026", JSON.stringify(community));
  await env.KV.put("kb:entries:excursions", JSON.stringify([]));
}

// Разовое идемпотентное дополнение базы знаний контентом из выгрузки Notion
// (полные конспекты, ссылки на записи и материалы для записей, которые были пустыми).
const KB_NOTION_UPDATE = {
  "experts-2026": [
    {
      id: "crm-anna-2026-04-16",
      summary: "Основа работы с базой — аналитика. До построения и тестирования гипотез нужно провести анализ поведения пользователей в базе.\n\nОсновные метрики когортного анализа: средняя выручка на регистрацию (в месяц и за весь цикл когорты — помогает выстроить стратегию закупки трафика); структура выручки (доля от новых пользователей vs база); доля клиентов в базе (при 5%+ продавать сложнее, при 12%+ база «выгорела» — нужно наращивать приток); конверсия базы в заказ (<0,5% — очень низко, <1,5% — большой потенциал роста); доля активных пользователей (бенчмарки: 10% за 7 дней, 20% за 30 дней, 40% за 90 дней).\n\nИтоговый потенциал считается перемножением коэффициентов — в разобранном кейсе (средний чек 180 тыс. руб.) это показало теоретический рост выручки в 3,7 раза. На практике достижим частичный рост, так как требуется работа всей команды, особенно создание новых продуктов.\n\nТестирование связок «сегмент + оффер»: фиксируется сегмент, размер скидки, бонусы, инфоповод; отслеживаются открываемость, кликабельность, заявки, продажи, выручка; успешные гипотезы внедряются на постоянку. Пример подтверждённой гипотезы: трафик текущего месяца, прошедший 18-дневную воронку, но не купивший, конвертируется повторно без скидок — достаточно смысловой обвязки (сезонность, срочность).\n\nРеактивация базы — цепочки качественных контентных писем; классика «Пора прощаться? Вы давно не читали наши письма» стабильно работает. Рост открываемости писем на 1–2% требует 3–4 месяцев работы; ценовые офферы — самые сильные, но не всегда бьют по среднему чеку (на Чёрную пятницу скидка 80% через бандлы снизила чек всего на 2–3 тыс. руб., но дала рекордную выручку).\n\nПочему GetCourse, а не внешние сервисы вроде Mindbox/SendPulse: сложная сегментация требует интеграции через вебхуки между сервисами, постоянной выгрузки/загрузки баз, аналитика при распределённой инфраструктуре ненадёжна, есть риск отказа прокладок между сервисами."
    },
    {
      id: "petr-derevenskiy-2026-04-18",
      summary: "Главная проблема — охваты в Telegram упали на 50% из-за блокировок. Трафик дорожает, команда не дешевеет, база выгорает, продавать становится всё сложнее.\n\nNeiroPeople создаёт цифрового двойника эксперта — ИИ-копию, которая работает в любых онлайн-сервисах 24/7 без VPN. Двойник обучается автоматически на контенте из подключённых соцсетей и мессенджеров и общается в стиле эксперта.\n\nЧто умеет двойник: персонализированно предлагает продукты под боль конкретного пользователя (автовебы, трипваеры, бесплатники) без участия команды; заменяет кураторов, отвечая на вопросы студентов в любое время (уже внедрено в школе из топ-1% GetCourse); даёт охваты без Telegram — пуш-уведомления из мобильного приложения открывают 40–60% подписчиков против 5–15% у рассылок; сам находит чаты с вакансиями и откликается по скрипту — актуально для школ профессий и B2B; работает как контент-завод — анализирует тренды, пишет сценарий, генерирует видео через HeyGen, публикует во всех соцсетях после согласования командой.\n\nТехнически каждый пользователь получает личный виртуальный сервер, двойник подключается только к разрешённым сервисам; под капотом — Claude, DeepSeek, GPT.\n\nМодель работы со школами: внедрение бесплатно, совместный запуск 50/50 от чистой прибыли. Сейчас команда ищет одну школу для глубокого внедрения — в приоритете финансовые школы и школы профессий с большой аудиторией, входящие в топ-1% GetCourse. Контакт: @p_derevenskiy"
    },
    {
      id: "dmitry-zubankov-2026-04-30",
      summary: "Дмитрий Зубанков провёл вебинар о запуске клубов по подписке: методология создания, выбор платформ, работа с аудиторией. Главный акцент — удержание участников как основной драйвер выручки, а не только привлечение. Для старта достаточно 500–3 тыс. активной аудитории при конверсии 5–10% из листа ожидания (при высокой лояльности — до 50–60%).\n\nОсновные тезисы: в подписной модели ключевое — удержание, клиент приносит деньги, пока остаётся в системе; участники приходят за контентом, остаются ради сообщества и результата; для MVP-запуска не нужен большой объём контента; тестовый запуск (20–300 человек) обязателен для проверки гипотез; перегруз контентом и неудобные сервисы — главные причины отписок.\n\nМетодология запуска (6–8 недель): исследовать рынок и аудиторию → определить роль клуба в продуктовой линейке (фронтенд/главный/бэкенд) → описать путь клиента → разбить на дорожную карту → запустить предзапись на 2–4 недели → провести тестовый запуск на лояльной аудитории.\n\nФорматы клубов: контентный, капельный, DHL (доставка по расписанию), коучинговый, комьюнити, престиж, гибридный (контент + сообщество — самый частый).\n\nПлатформы: собственные решения (WordPress и коробки), универсальные (GetCourse, AXL), клубные (Gurucan, Mangustin), мобильные приложения (Hubster, TalentRocks, Refocus), социальные форматы (Mighty Networks), решения с монетизацией (Rejoin, Компот). Независимые платформы дают фокус и снижают влияние мессенджеров, но переход между платформами теряет до ~30% аудитории.\n\nРабота с участниками — 4 этапа: онбординг (критичен первый месяц), вовлечение, удержание (основной эффект на выручку), реактивация ушедших. Правила: не перегружать контентом, сегментировать аудиторию, чётко задавать правила с первого дня, предупреждать об автосписаниях, проще вернуть деньги, чем спорить.\n\nМасштабирование — 3 направления: маркетинг (аудитория → конверсия → маховик роста), резиденты (удержание, снижение оттока), менеджмент (команда и система).\n\nЦенообразование: автосписание обязательно, максимум 2–3 тарифа, осторожно с годовой подпиской на старте, вход через мини-продукты. Частые ошибки — каннибализация дорогих продуктов, продажа клубов в холодный трафик, смешение несвязанных аудиторий.\n\nМинимальная команда: проджект/директор, техспециалист, комьюнити-менеджер (ключевая роль), копирайтер/SMM."
    },
    {
      id: "minikonfа-romi-seo-geo",
      summary: "Три эксперта по SEO и контент-маркетингу поделились опытом автоматизации через AI-агентов.\n\nRuslan — ABM-стратегия для корпоративного сегмента (финтех, медтех, IT). Работает точечно с 30–40 компаниями в квартал, CAC от 500 тыс. руб., цикл сделки 6+ месяцев, вход через пилоты на 2–6 месяцев. Не работают для B2B: холодный аутрич, инфопочта, холодные звонки, традиционный SMM, performance при больших бюджетах. Работают: экспертный контент с конкретными кейсами, органический SEO-трафик, раздел СМИ о компании, аутрич в LinkedIn/Telegram/TenChat.\n\nAI-агентная система контента — команда из 7 человек (CPO, CMO, CSIO, пиарщик, редактор, SMM, инженер по агентам), 11 фаз производства, 9 из которых полностью делают агенты (discovery → intent → research с 3-уровневой проверкой источников → драфтинг ТЗ → генерация статьи с 5–9 рекурсивными проходами → редактура человеком → визуал → презентация → запись видео → публикация с SEO-оптимизацией). Юнит-экономика: 4–8 тыс. руб. за статью, 70–80 статей в месяц на объёме. За 3 месяца: 78 статей, ~3000 органических переходов в месяц, 10 лидов на входе воронки. AI-контент требует человеческой составляющей, чтобы побеждать AI-детекторы — живое видео, цитаты реальных людей, собственная стилистика.\n\nIlya — полуавтоматический пайплайн технического SEO-аудита (техготовность, спрос по Wordstat, структура сайта, конкуренты, метрики Яндекс.Метрики) и генерации статей: 5–7 статей в день с проверкой ключевиков через код и визуалом по фирменному стилю. Прирост для нового сайта — +1000–1500 просмотров за месяц с нуля.\n\nSergey — агентство (200+ человек, 150+ проектов в EdTech) со стратегией ROI 500%+ через органику: поисковый мультипликатор (каждая новая статья усиливает трафик старых), консолидация выдачи в пользу крупных долгоживущих сайтов, техтребования (загрузка 2–4 сек), контент от потребностей ЦА, а не от продукта. Средняя конверсия сайтов — 2,5%, у топ-5% — выше 7%. Доходность лида на одном канале может различаться в 10 раз между воронками — фокус нужно направлять в самые доходные воронки, а не гнаться за объёмом лидов.\n\nGEO-оптимизация: упоминания бренда в Яндекс.Справочнике влияют на переходы из нейросетевой выдачи (Алиса), уже даёт несколько тысяч переходов в неделю; страницы стоит дополнять ценами, сравнениями, FAQ и открывать для индексации краулерами. Публикация на внешних площадках (Дзен, Хабр, VC) нужна не ради прямого трафика (на своём сайте доходность выше в 99 случаях из 100), а ради ссылочной массы и упоминаний бренда."
    },
    {
      id: "vasily-alekseev-2026-05-28",
      videoUrl: "https://youtu.be/JI422XoByDk",
      summary: "Василий провёл встречу для сообщества с разбором 130 слайдов трендов образовательного рынка и кейсами крупнейших школ. Основной фокус — трансформация после кризиса 2023 года, рост офлайн-сегмента (в 5 раз больше онлайна), переход в суверенные каналы (Макс, Авито), применение ИИ вместо части сотрудников и каскадные воронки с LTV до 500 тыс. руб.\n\nСредний возраст аудитории вырос до 40–50 лет, доля женщин-предпринимателей растёт — они чаще становятся основным добытчиком в семье и ищут подработку через ИИ-проекты. Аудитория переходит в суверенные каналы: Авито (сильная реклама), Wildberries (много женщин), VK Маркетплейс — половина страны проводит в маркетплейсах 25 минут в день. Из Макса собрали 800 человек на мероприятие против 700 из Telegram — при том что подписчиков в Максе на порядок меньше.\n\n70% трафика идёт через YouTube с регулярными рубриками; объём аудитории пропорционален объёму контента. Работают конспекты книг (387 тыс. скачиваний ежедневника), мини-курсы, автовебинарные воронки, разбор новостей, подкасты и кружочки для удержания охватов. После каждого видео пользователь бесшовно попадает в игровую воронку под ключевую боль ЦА, ведущую в основной продукт. Реферальная программа с понятными уровнями наград даёт 12–15% регистраций на бесплатные мероприятия.\n\nПодписная модель и клубы дали рост доли продаж в 2–3 раза. Партнёрские запуски с экспертами и блогерами работают через воронку с доказательством результатов — блогеры всё чаще готовы к партнёрке из-за сокращения способов монетизации.\n\nИИ уже замещает консультантов по продажам: отдельная команда интегрирует технологии и сама начала продавать готовые решения другим компаниям. Каждый элемент продажи проходит цикл «ИИ-разбор звонка → рекомендации → тренировка менеджера → повторная проверка». Корпоративная ИИ работает из единого пространства на базе Claude — знания остаются в компании при увольнении сотрудника, нейрокураторы уже эффективнее живых.\n\nКаскад из ~40 тематических автовебинаров с глубиной прогрева до года окупается когортно — x3 на третьем месяце вместо 1:1 в первом; в пике LTV превышал 500 тыс. руб. за счёт переходов участников между продуктами.\n\nБонус участникам встречи: доступ к Notebook LM мастермайнда Василия — постоянно обновляемая база наработок, конспектов и разбор запусков."
    },
    {
      id: "philipp-lorez-2026-05-21",
      videoUrl: "https://youtu.be/yxJJjo8RL-w",
      materials: [
        { title: "Гайд по созданию уникального механизма", url: "https://docs.google.com/document/d/1DpGhyDeWfEIGFH7v1Ous5eG4hyAqaZtVQfm95eh2mVs/edit?usp=sharing" },
        { title: "Unique Mechanism Swipe File (подборка примеров)", url: "https://drive.google.com/file/d/1HpiQEpm3N7R6D3jlxv_OhU6UNBV2CMuh/view?usp=sharing" },
        { title: "Breakthrough Advertising — Юджин Шварц", url: "https://drive.google.com/file/d/1XArErQRtB0hJtiAyfjhTZvR8H2oj6JCp/view?usp=sharing" }
      ],
      summary: "Филипп Лорез (CMO Web3 Academy, ранее — глава маркетинга X10 Academy Игоря Рыбакова, запускал образовательный продукт для VertexCGI) провёл лекцию про уникальные механизмы — ключевой инструмент дифференциации на гиперконкурентных рынках. Идея: вместо обещания больших результатов продавать новый способ их достижения.\n\nКоммодити — взаимозаменяемые продукты, между которыми клиент не видит разницы (вода, кофе, курсы рисования). В глазах клиента 96% продуктов выглядят одинаково, и единственный критерий выбора — цена: например, школы графического дизайна обещают одно и то же слово в слово (доход от 100 000 ₽, портфолио, помощь с работой).\n\nКонцепция уровней зрелости рынка (Юджин Шварц, «Breakthrough Advertising», 1966): 1) достаточно заявить о продукте; 2) нужно обещать больше/быстрее; 3) обещания не работают — нужен уникальный механизм; 4) все копируют механизм — нужно его улучшать; 5) не работают даже механизмы — нужен эмпатичный маркетинг, разговор о клиенте, а не о продукте. Большинство рынков в России — на уровне 3 и выше: аудитория не верит обещаниям и ищет новый механизм.\n\nМеханизм — это то, как продукт даёт результат (не что обещаете, а как доставляете). Уникальный механизм отвечает на вопрос «почему именно ваш продукт» и даёт клиенту надежду, что в этот раз получится. Это не УТП — УТП про выгоду, механизм про способ работы продукта. Такие механизмы редко создаются с нуля — чаще это адаптация существующих западных подходов; часть российских «гуру» присвоили концепцию Шварца, не указывая источник.\n\nЧто делать: прочитать «Breakthrough Advertising» в оригинале (русский перевод слабый), изучить материалы Тодда Брауна и Агоры, определить уровень зрелости своего рынка, разобрать механизмы конкурентов и собрать собственный уникальный механизм с сильным обоснованием."
    },
    {
      id: "evgeny-bordunov-2026-06-04",
      subtitle: "Секретный код Reels: формула роликов, которые набирают миллионы просмотров",
      videoUrl: "https://youtu.be/yVJTv7MSQFA",
      summary: "Евгений Бордунов (стратегический продюсер вирусных Reels, 50+ млн просмотров и 90 тыс. подписчиков в экспертной нише на личном аккаунте) провёл практический вебинар о вирусном контенте в Instagram Reels на примере аккаунта по нейротипологии (169 постов, 15 роликов-миллионников). Главный вывод: успех зависит от правильного формата, а не только от харизмы — формат должен быть простым в повторении, работать на широкую аудиторию и легко доносить экспертность.\n\nКритерии рабочего формата: простота реализации (без сложного монтажа и локаций), повторяемость без привязки к уникальным условиям, донесение экспертности, широкая применимость вне трендов, долговечность.\n\nМетрики, за которыми стоит следить: первые 3 секунды решают, будут ли смотреть дальше; skip rate — ниже 30%; average watch time — на 10% больше длины ролика; первый час публикации критичен для буста; retention-график показывает, где теряется внимание. Короткие ролики держат внимание лучше; для экспертных ниш нужны два типа контента — 80% охватных коротких и 20% экспертных продающих.\n\nПриёмы удержания: динамика в кадре и смена планов под поколение Z, интрига (ключевую информацию — на конец), сокращение длины без потери смысла, шаблонизация форматов, хук в начале (провокационные заголовки, человеческое лицо в кадре, списочный формат), провокационные темы (безопасность, деньги, секс, здоровье) и простые бытовые темы. Длинный текст под роликом увеличивает время просмотра до 150–200% от длины видео — люди читают и пересматривают. Успешные ролики можно перезаливать повторно, каждый раз набирая миллионы просмотров, и повторять одни и те же ~50 тем ежемесячно — новая аудитория видит их впервые.\n\nВоронка: Reels → подписка/лид-магнит → диалог в Direct → вебинар/продукт. ChatPlace (~$20/мес) автоматизирует перевод из комментариев в Direct по кодовым фразам; призывы стоит встраивать в сам ролик, а не в конец — это меньше просаживает retention. Инструменты монтажа: CapCut, VN, приложение Edits от Instagram (удобная статистика внутри приложения)."
    },
    {
      id: "alexey-tkachenko-2026-06-25",
      videoUrl: "https://youtu.be/cNu1O2WhN7A",
      materials: [
        { title: "Плейбук: 5 ключевых действий для роста конверсии на каждом этапе воронки", url: "https://docs.google.com/document/d/1WbK5PmPD_xaifWBSUVJajBqBY2uuAgfnBrtJ9RErH80/edit?usp=sharing" },
        { title: "Презентация с эфира", url: "https://drive.google.com/file/d/1TVRGtIb3n7NlEbJ5Ojowm21kDuANJkzR/view?usp=sharing" }
      ],
      summary: "Алексей Ткаченко — продюсер, номинант GetAward, экспонент EdTech Expo, автор вебинаров и вебинарных воронок в 80+ нишах, включая англоязычный рынок.\n\nНа встрече разобрали: по каким 3 признакам за 5 минут понятно, что продаж с вебинара будет мало; что важнее для результата — воронка или структура самого веба; почему кастдевы не дают смыслы, триггерящие аудиторию, и как это исправить; как выдавать пользу, которая приводит к мысли «срочно дайте купить»; 5 нестандартных приёмов, которые работают в 2026 году; топ-3 ошибки, которые стоят проектам миллионы рублей.\n\nВ материалах — плейбук на 18 страниц с 5 ключевыми действиями для повышения конверсии на каждом этапе воронки и презентация с эфира."
    },
    {
      id: "artem-zakharov-puzzlebrain",
      videoUrl: "https://youtu.be/m77WxYgtXWs",
      summary: "Артём Захаров — основатель PuzzleBrain, привёл более 2 млн регистраций с Яндекс.Директа по цене до 150 руб. за регистрацию, главный архитектор автоматизированной ИИ-платформы для запуска Директа «ИРБИС».\n\nНа встрече разобрали: как работает Яндекс.Директ в текущих реалиях; какими должны быть посадочные страницы, чтобы получать самые дешёвые регистрации от качественной аудитории; главные принципы тестирования, чтобы регистрации не дорожали постоянно; как лучше запускаться — самому, через агентство или фрилансера."
    },
    {
      id: "vetto-voice",
      videoUrl: "https://youtu.be/_aMz4ZlnRew",
      summary: "Ветто Апрелев — тренер по голосу и уверенности, преподавал в университете из топ-10 Forbes Россия. Его ученики справлялись с социофобией, получали лёгкость в переговорах и выступлениях, увереннее проявлялись и больше зарабатывали. Сам был зажатым парнем с высоким голосом, избегающим общения — сейчас в его окружении собственники миллиардных компаний, актёры и музыканты.\n\nНа встрече разобрали, почему при равных компетенциях одних слушают и уважают, а других нет: собеседник решает, доверять ли и стоит ли строить совместные проекты, за доли секунды — ещё до того, как договорена первая фраза. Разобрали, что люди считывают в голосе, как это влияет на переговоры, питчи и деньги, и как этим управлять — с техниками, которые легко адаптировать в жизнь и которые дают результат не на 20–30 минут, а надолго. Подход Ветто — не просто красиво звучать, а через голос и уверенность улучшать жизнь, окружение, влияние и харизму."
    }
  ],
  "community-2026": [
    {
      id: "edtech-tops-2026-04-15",
      subtitle: "Итоги за I квартал, разборы и лучшие решения",
      videoUrl: "https://youtu.be/8yxzJvO5XHc",
      summary: "Встреча собрала владельцев и руководителей онлайн-школ для обмена опытом по итогам I квартала 2026 года.\n\nЛучшие решения участников: коллаборации с крупными экспертами и работа с базами партнёров принесли десятки миллионов рублей выручки за счёт прогретой аудитории (продажа своего продукта на базе выпускников партнёра, цикл сделки 3–6 месяцев, старт с малых школ для отладки конверсий); расширение продуктовой линейки и вывод новых экспертов в существующую воронку снижает зависимость от одного бренда; геймифицированные боты с персонализацией дают конверсию 65–86% в прохождение; видео-воронка с врачом (не актёром) плюс 4-страничные клипы-лендинги дают лид по 700–780₽ и ROI до 500%; камерные мероприятия с экспертом без затрат на трафик хорошо закрывают возражения на своей базе; групповые интервью вместо индивидуальных ускоряют найм МОПов и масштабирование отдела.\n\nКанальный фокус — ВК, Макс, Авито; выручка с аудитории, перешедшей из других соцсетей в Макс, вдвое выше. Контент-завод из 20 креаторов с нативным продакт-плейсментом и оцифровкой сценариев масштабирует лучшие ролики. 1 SEO-статья даёт 5–6 тыс. визитов при индексации ~3 месяца.\n\nЗапретили разработчикам писать код руками, полностью перешли на AI-агентов — ускорение команды в 3 раза, сокращение затрат, закрытие годового объёма задач за 3 месяца. Обсудили отдел диагностики (требует точного расчёта маржинальности) и холодную воронку с ROI выше 200%, цифровых двойников экспертов, вход в B2B через открытые уроки и семинары в компаниях, запуск собственного бренда косметики с продажей на своей базе перед выходом на маркетплейсы."
    },
    {
      id: "edtech-kids-2026-04-28",
      subtitle: "Итоги за I квартал, разборы и лучшие решения",
      summary: "Лучшие решения со встречи руководителей детских онлайн-школ: повышение цен на 20–25% каждые 8–9 месяцев за счёт фокуса на качество продукта и позиционирования через соревновательные группы; удлинение минимальных пакетов, увеличение разницы в цене между короткими и длинными пакетами, разделение комиссии рассрочки с клиентом. Средний чек за 3–4 года вырос в 3–4 раза за счёт кросс-селла (каникулы, мастер-классы, соревнования).\n\nВнедрение AI-помощника для детей (обучен на методологиях, понимает контекст ребёнка, помогает с домашним заданием) сократило цикл сделки с 2 месяцев до ~5 недель, снизило стоимость привлечения на 16% и подняло NPS с 68 до 83. Отказ от двух внешних SaaS-сервисов (администрирование групп, аналитика) — свои технари повторили функционал за месяц. ИИ используют и для методической проработки курсов и дизайна интерфейсов — запустили 100+ курсов за год; сборка карусели через Claude сократилась с 3 часов до 15–20 минут без дизайнера.\n\nМасштабируют модель кружков в государственных школах Москвы — 850 учеников в 60 школах, план на 200 школ в новом учебном году. Показали модель привлечения клиента в базу дешевле 100₽ без диджитал. Конверсия из лида в продажу выросла с 5% до 10% после жёстких квалификационных вопросов (возраст, диагноз) и гео-таргетинга. Перевели 50% лидов на самозапись через личный кабинет, оптимизировав ФОТ; отказались от подрядчиков по телемаркетингу в пользу внутреннего отдела — снизили ДРР, повысили качество за счёт контроля на каждом этапе.\n\nЗапустили премиум-продукт для экспатов (чек $6–10 тыс./мес.) — бизнес-инкубатор для подростков. Также обсудили бенчмарки конверсий из вводного урока в оплату, масштабирование автообзвона, эффективные каналы, работу без платных закупок (только органика у одного из лидеров ниши) и эффективность игровых воронок с холодного трафика."
    }
  ]
};

async function ensureSeedKBUpdate(env) {
  const flag = await env.KV.get("kb:seeded_notion_update_v1");
  if (flag) return;

  for (const catId of Object.keys(KB_NOTION_UPDATE)) {
    const entries = await env.KV.get(`kb:entries:${catId}`, "json") || [];
    let changed = false;
    for (const patch of KB_NOTION_UPDATE[catId]) {
      const idx = entries.findIndex(e => e.id === patch.id);
      if (idx >= 0) {
        entries[idx] = Object.assign({}, entries[idx], patch);
        changed = true;
      }
    }
    if (changed) await env.KV.put(`kb:entries:${catId}`, JSON.stringify(entries));
  }
  await env.KV.put("kb:seeded_notion_update_v1", "1");
}

// ─── MINI APP HTML ───────────────────────────────────────────
async function serveApp(env) {
  return new Response(getMiniAppHTML(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// ─── QUIZ 1: AI MATURITY SCORE (Growth Autopilot, шаблонный, без ИИ) ──
function serveQuiz1() {
  return new Response(getQuiz1HTML(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// ─── QUIZ 2: РАЗБОР ЛЕНДИНГА ОТ ЭКСПЕРТА (реальный ИИ-анализ через Claude) ──
function serveQuiz2() {
  return new Response(getQuiz2HTML(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

const QUIZ2_SYSTEM_PROMPT = `Ты — Максим Ильин, опытный эксперт по маркетинговым воронкам и конверсии лендингов. Тон уверенный, конкретный, без токсичности и излишней вежливости.
Тебе присылают текст одной страницы сайта (может быть недоступен) и описание ситуации от пользователя: что за продукт, куда ведёт трафик, что должно происходить после захода на сайт, в чём подозревают проблему. Опционально — цифры конверсии.
Если текст сайта помечен как недоступный — делай анализ только по описанию ситуации от пользователя, честно опираясь на меньший объём данных, не притворяйся, что видел сайт.
Если цифры конверсии не переданы — никогда не выдумывай их, опирайся только на текстовый анализ страницы и описание ситуации.
Ответь СТРОГО в виде JSON без каких-либо пояснений до или после, без markdown-разметки и без \`\`\`json оболочки, ровно по такой схеме:
{"verdict":"короткий вывод в 1-2 предложения","score":6,"blocks":[{"title":"Оффер","status":"warning","score":6,"text":"..."},{"title":"Доверие / соц. доказательства","status":"bad","score":3,"text":"..."},{"title":"Призыв к действию","status":"good","score":8,"text":"..."},{"title":"Что происходит после лендинга","status":"warning","score":5,"text":"..."}],"next_steps":["шаг 1","шаг 2","шаг 3"]}
Правила: "score" на верхнем уровне — целое число от 1 до 10, общая оценка конвертящей способности страницы. У каждого блока — своё "score" от 1 до 10 именно по этому конкретному параметру (не обязано совпадать с общим score) и "status", строго одно из "good"/"warning"/"bad", согласованное с этим числом (8-10 → good, 4-7 → warning, 1-3 → bad). Блоков всегда ровно 4, именно с этими 4 заголовками и в этом порядке: "Оффер", "Доверие / соц. доказательства", "Призыв к действию", "Что происходит после лендинга". "next_steps" — 3 коротких конкретных пункта, что сделать в первую очередь.`;

const QUIZ2_FALLBACK_RESULT = {
  verdict: "Сайт сейчас выглядит неплохо, но теряет часть заявок на переходе от интереса к действию — оффер размыт, а доверие почти ничем не подкреплено.",
  score: 5,
  blocks: [
    { title: "Оффер", status: "warning", score: 6, text: "Непонятно за 3 секунды, что именно вы предлагаете и кому это нужно прямо сейчас. Заголовок общий, выгода не сформулирована в цифрах или конкретном результате." },
    { title: "Доверие / соц. доказательства", status: "bad", score: 3, text: "На странице почти нет отзывов, кейсов, цифр или логотипов клиентов — читателю не на что опереться, чтобы поверить в результат." },
    { title: "Призыв к действию", status: "warning", score: 5, text: "Кнопка есть, но формулировка нейтральная ('Отправить', 'Узнать больше') — не создаёт ощущения срочности и не отвечает на вопрос 'а что будет дальше'." },
    { title: "Что происходит после лендинга", status: "bad", score: 4, text: "Не описано, что человек получит сразу после заявки — нет мгновенного ответа, письма или следующего шага, из-за чего часть лидов остывает." }
  ],
  next_steps: [
    "Переписать первый экран: конкретная выгода + для кого + что нужно сделать",
    "Добавить 2-3 живых кейса или отзыва с цифрами рядом с оффером",
    "Прописать понятный следующий шаг сразу после заявки (звонок за 15 минут, письмо с гайдом и т.п.)"
  ],
  _fallback: true
};

async function apiQuiz2Analyze(request, env) {
  if (request.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResp({ error: "Некорректный JSON" }, 400);
  }

  const siteUrl = String(body.url || "").trim();
  const situation = String(body.situation || "").trim();
  const metrics = String(body.metrics || "").trim();

  if (!siteUrl || !situation) {
    return jsonResp({ error: "Нужны ссылка на сайт и описание ситуации" }, 400);
  }

  const siteText = await fetchSiteText(siteUrl);
  const userPrompt = buildQuiz2Prompt({ siteText, situation, metrics });

  const result = await callClaudeQuiz2Json(env, { system: QUIZ2_SYSTEM_PROMPT, user: userPrompt });

  if (result) return jsonResp(result);

  // Уровень 2 fallback — Claude не ответил/не распарсился: отдаём канонический пример,
  // чтобы на эфире не было тишины перед камерой.
  return jsonResp(QUIZ2_FALLBACK_RESULT);
}

// Забираем HTML одной страницы и вырезаем видимый текст. Деградирует без сбоя —
// при любой ошибке возвращаем null, а не бросаем исключение (уровень 1 fallback).
async function fetchSiteText(rawUrl) {
  let target;
  try {
    target = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    new URL(target);
  } catch {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(target, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CMORazboryBot/1.0; +https://cmo-razbory.oxion-ezhkov.workers.dev)" }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    return stripHtmlToText(html);
  } catch {
    return null;
  }
}

function stripHtmlToText(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 4000);
}

function buildQuiz2Prompt({ siteText, situation, metrics }) {
  const parts = [];
  parts.push(
    siteText
      ? `Текст сайта (очищенный, до 4000 символов):\n${siteText}`
      : "Текст сайта недоступен — не удалось получить или разобрать страницу. Делай анализ только по описанию ситуации ниже."
  );
  parts.push(`Описание ситуации от пользователя:\n${situation}`);
  parts.push(metrics ? `Известные цифры конверсии:\n${metrics}` : "Цифры конверсии не переданы — не выдумывай их.");
  return parts.join("\n\n");
}

// Вызов Claude API по методологии из mybrand-smm (callClaude): модель, заголовки,
// JSON-режим через инструкцию в промпте + regex-очистка ```json оболочки + JSON.parse.
async function callClaudeQuiz2Json(env, { system, user }) {
  if (!env.CLAUDE_API) return null;

  const reqBody = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    system,
    messages: [{ role: "user", content: user }]
  };

  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 14000);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.CLAUDE_API,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(reqBody)
      });
      clearTimeout(timeout);

      if (res.status === 429 && attempts < 3) {
        await new Promise(r => setTimeout(r, 1000 * attempts));
        continue;
      }
      if (!res.ok) throw new Error(`Claude ${res.status}`);

      const data = await res.json();
      const text = data.content?.filter(b => b.type === "text")?.map(b => b.text)?.join("") ?? "";
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());

      if (
        !parsed ||
        typeof parsed.verdict !== "string" ||
        typeof parsed.score !== "number" ||
        !Array.isArray(parsed.blocks) ||
        !Array.isArray(parsed.next_steps)
      ) {
        return null;
      }
      return parsed;
    } catch (e) {
      if (attempts >= 3) return null;
    }
  }
  return null;
}

// ─── QUIZ 3: ДИАЛОГ С НУТРИЦИОЛОГОМ (многоходовой диалог, голос + текст) ───
function serveQuiz3() {
  return new Response(getQuiz3HTML(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// ─── LEAD MAGNET: КУДА УТЕКАЮТ ПАЦИЕНТЫ СТОМАТОЛОГИИ (Growth Autopilot) ──
function serveLeadMagnet1() {
  return new Response(getLeadMagnet1HTML(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function apiLeadMagnet1Submit(request, env) {
  if (request.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);
  let body;
  try { body = await request.json(); } catch (e) { return jsonResp({ ok: false }, 400); }
  const name = (body.name || "").toString().trim().slice(0, 200);
  const clinic = (body.clinic || "").toString().trim().slice(0, 200);
  const contact = (body.contact || "").toString().trim().slice(0, 200);
  if (!name || !contact) return jsonResp({ ok: false });

  if (env.ADMIN_ID) {
    const text = `🦷 *Заявка с лид-магнита «Куда утекают пациенты стоматологии»*\n\nИмя: ${name}\nКлиника: ${clinic || "—"}\nКонтакт: ${contact}`;
    await tgSend(env, env.ADMIN_ID, text);
  }
  return jsonResp({ ok: true });
}

function getLeadMagnet1HTML() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Куда утекают пациенты вашей стоматологии — Growth Autopilot</title>
<meta name="description" content="Диагностика воронки стоматологии: теория, 5 мест, где теряются пациенты, ориентиры рынка, расчёт потерь в деньгах и бесплатный разбор с экспертом Growth Autopilot.">
<meta property="og:title" content="Куда утекают пациенты вашей стоматологии">
<meta property="og:description" content="Системный разбор воронки клиники: где теряются пациенты, сколько это стоит в деньгах — и что сделать в первую очередь.">
<meta property="og:type" content="article">

<!-- Яндекс.Метрика: ID-заглушка 00000000, заменить на реальный счётчик клиента перед публикацией в прод (см. lead-magnets/brief.md, раздел "Воронка и метрики успеха") -->
<script type="text/javascript">
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
   ym(00000000, "init", {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", accurateTrackBounce:true, trackLinks:true});
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/00000000" style="position:absolute; left:-9999px;" alt=""/></div></noscript>

<style>
  /* ── Токены: "бумага диагностического отчёта" ─────────────────
     paper — бумага, ink — текст/линии, verdigris — структурный акцент
     (доверие, референс), red — только для денег/потерь (маркер аудитора). */
  :root {
    --paper: #EEF0E8;
    --paper-raised: #FCFCF9;
    --ink: #171D1B;
    --ink-soft: #57635C;
    --line: #C7CFC3;
    --verdigris: #2E6B5E;
    --verdigris-tint: #E1EAE4;
    --red: #B23A22;
    --red-tint: #F3E1D9;
    --font-serif: Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', serif;
    --font-mono: ui-monospace, 'SF Mono', 'Cascadia Mono', 'Roboto Mono', Consolas, 'Liberation Mono', monospace;
    --max-width: 700px;
    --space: 24px;
  }

  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-serif);
    line-height: 1.62;
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3 { font-family: var(--font-serif); font-weight: 700; line-height: 1.18; margin: 0 0 0.45em; }
  p { margin: 0 0 1.1em; }
  a { color: var(--verdigris); }
  button { font-family: inherit; cursor: pointer; }
  :focus-visible { outline: 2px solid var(--verdigris); outline-offset: 2px; }

  .mono { font-family: var(--font-mono); }
  .eyebrow {
    display: inline-flex; align-items: center; gap: 9px;
    font-family: var(--font-mono); font-size: 12px; font-weight: 600;
    letter-spacing: .08em; text-transform: uppercase; color: var(--verdigris);
    margin-bottom: 18px;
  }
  .eyebrow::before { content: ""; width: 8px; height: 8px; background: var(--verdigris); }

  #reading-progress {
    position: fixed; top: 0; left: 0; height: 3px; width: 0%;
    background: var(--red); z-index: 1000; transition: width 0.1s linear;
  }

  .wrap { max-width: var(--max-width); margin: 0 auto; padding: 0 var(--space); }

  /* ── Шапка / тезис ──────────────────────────────────────── */
  .hero { padding: 56px 0 8px; }
  .hero h1 { font-size: clamp(30px, 6.5vw, 46px); letter-spacing: -0.01em; }
  .hero .dek { font-size: 18px; color: var(--ink-soft); max-width: 54ch; }

  /* Диагностическая цепочка воронки — визуальный тезис страницы */
  .funnel { position: relative; margin: 40px 0 20px; overflow-x: auto; padding-bottom: 6px; }
  .funnel-track { position: relative; display: flex; gap: 0; min-width: 560px; }
  .funnel-track::before {
    content: ""; position: absolute; left: 14px; right: 14px; top: 9px; height: 1px; background: var(--line);
  }
  .funnel-node { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; z-index: 1; }
  .funnel-dot { width: 19px; height: 19px; border-radius: 50%; background: var(--paper-raised); border: 2px solid var(--ink); margin-bottom: 12px; }
  .funnel-node.last .funnel-dot { background: var(--verdigris); border-color: var(--verdigris); }
  .funnel-label { font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: .03em; color: var(--ink-soft); line-height: 1.4; max-width: 92px; }

  /* ── Контентные секции ──────────────────────────────────── */
  .section { padding: 44px 0; border-top: 1px solid var(--line); }
  .section h2 { font-size: clamp(23px, 4vw, 29px); }
  .section .lede { font-family: var(--font-mono); font-size: 13px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: .04em; margin: -8px 0 22px; }
  .prose p { font-size: 17px; color: var(--ink); }
  .prose .callout {
    background: var(--verdigris-tint); border-left: 3px solid var(--verdigris);
    padding: 14px 16px; font-size: 15px; color: var(--ink-soft); margin: 24px 0 0;
  }

  /* ── Квиз ───────────────────────────────────────────────── */
  .quiz-q { font-family: var(--font-serif); font-weight: 700; font-size: 19px; margin-bottom: 16px; }
  .quiz-options { display: grid; gap: 10px; margin-bottom: 4px; }
  .quiz-options button {
    padding: 15px 18px; border: 1.5px solid var(--ink); background: var(--paper-raised);
    font-family: var(--font-serif); font-size: 16px; text-align: left; min-height: 48px;
    color: var(--ink); transition: background .12s ease, color .12s ease;
  }
  .quiz-options button:hover { background: var(--ink); color: var(--paper); }
  .quiz-question { display: none; }
  .quiz-question.active { display: block; }
  .quiz-result { display: none; }
  .quiz-result.active { display: block; animation: reveal .3s ease; }
  @keyframes reveal { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  .quiz-tag {
    display: inline-block; font-family: var(--font-mono); font-size: 11px; font-weight: 700;
    letter-spacing: .05em; text-transform: uppercase; color: var(--verdigris);
    border: 1px solid var(--verdigris); padding: 4px 10px; margin-bottom: 12px;
  }
  .quiz-result h3 { font-size: 20px; }

  /* ── 5 мест утечки — нумерованные строки дела ──────────────── */
  .case-list { margin-top: 8px; }
  .case-row { display: grid; grid-template-columns: 44px 1fr; gap: 18px; padding: 28px 0; border-top: 1px solid var(--line); }
  .case-row:first-child { border-top: none; padding-top: 4px; }
  .case-num { font-family: var(--font-mono); font-size: 15px; font-weight: 700; color: var(--line); padding-top: 3px; }
  .case-row h3 { font-size: 19px; margin-bottom: 10px; }
  .case-row p { font-size: 16px; }
  .case-check { font-size: 14.5px; color: var(--ink-soft); }
  .case-check .mono-label { font-family: var(--font-mono); font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--ink); margin-right: 6px; }

  /* ── Ориентиры рынка — таблица-леджер ──────────────────────── */
  .ledger { margin: 22px 0; border-top: 1px solid var(--ink); }
  .ledger-row { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; padding: 13px 0; border-bottom: 1px dotted var(--line); }
  .ledger-row .label { font-size: 15.5px; }
  .ledger-row .value { font-family: var(--font-mono); font-size: 15px; font-weight: 700; color: var(--verdigris); white-space: nowrap; }

  /* ── Калькулятор-чек — сигнатурный элемент ─────────────────── */
  .receipt-wrap { margin-top: 8px; }
  .receipt {
    position: relative; background: var(--paper-raised); border: 1px solid var(--ink);
    padding: 30px 26px 26px; margin-top: 8px;
  }
  .receipt::before {
    content: ""; position: absolute; top: -1px; left: 0; right: 0; height: 10px;
    background-image: radial-gradient(circle at 7px 0, var(--paper) 6px, transparent 6.5px);
    background-size: 14px 10px; background-repeat: repeat-x; background-position: top;
  }
  .receipt-title { font-family: var(--font-mono); font-size: 11.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-soft); margin-bottom: 4px; }
  .receipt-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 13px 0; border-bottom: 1px dotted var(--line); }
  .receipt-row label { font-family: var(--font-mono); font-size: 12.5px; text-transform: uppercase; letter-spacing: .03em; color: var(--ink-soft); }
  .receipt-row input {
    border: none; border-bottom: 1.5px solid var(--ink); background: transparent;
    font-family: var(--font-mono); font-size: 17px; text-align: right; width: 108px;
    color: var(--ink); padding: 2px 0;
  }
  .receipt-row input:focus { outline: none; border-color: var(--verdigris); }
  .receipt-total { display: flex; justify-content: space-between; align-items: baseline; margin-top: 20px; padding-top: 18px; border-top: 2px dashed var(--ink); }
  .receipt-total .rt-label { font-family: var(--font-mono); font-size: 12.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-soft); }
  .receipt-total .rt-value { font-family: var(--font-mono); font-size: 32px; font-weight: 700; color: var(--red); }
  .receipt-note { font-size: 13.5px; color: var(--ink-soft); font-style: italic; margin: 16px 0 0; }

  /* ── Чек-лист ───────────────────────────────────────────── */
  .checklist-progress { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--verdigris); text-transform: uppercase; letter-spacing: .03em; margin: 0 0 4px; }
  .checklist { margin-top: 12px; }
  .checklist label { display: flex; gap: 14px; align-items: flex-start; padding: 13px 0; border-bottom: 1px solid var(--line); font-size: 16px; }
  .checklist label:last-child { border-bottom: none; }
  .checklist input { width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px; accent-color: var(--verdigris); }

  /* ── Финал — штамп ──────────────────────────────────────── */
  .stamp { background: var(--ink); color: var(--paper); padding: 42px var(--space) 38px; }
  .stamp h2 { color: #fff; font-size: clamp(23px, 4vw, 28px); }
  .stamp p.dek { color: #C7CDC5; font-size: 16.5px; max-width: 46ch; }
  .stamp form { display: grid; gap: 16px; margin-top: 26px; max-width: 420px; }
  .stamp-field label { display: block; font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #9AA69E; margin-bottom: 6px; }
  .stamp-field input {
    width: 100%; background: transparent; border: none; border-bottom: 1.5px solid #4A544E;
    color: #fff; font-family: var(--font-serif); font-size: 16px; padding: 8px 0; min-height: 30px;
  }
  .stamp-field input::placeholder { color: #6B756F; }
  .stamp-field input:focus { outline: none; border-color: var(--red); }
  .stamp button[type="submit"] {
    margin-top: 6px; padding: 15px 22px; border: none; background: var(--red); color: #fff;
    font-family: var(--font-mono); font-size: 13.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
    min-height: 48px;
  }
  .stamp button[type="submit"]:hover { background: #99311D; }
  .form-status { font-size: 14px; margin-top: 4px; min-height: 20px; color: #C7CDC5; }

  footer { text-align: center; padding: 28px 0 120px; color: var(--ink-soft); font-size: 12.5px; font-family: var(--font-mono); }

  /* ── Навигация по разделам ──────────────────────────────── */
  .nav-next {
    position: fixed; right: 22px; bottom: 22px; z-index: 900;
    display: none; align-items: center; gap: 10px;
    background: var(--ink); color: var(--paper); border: none;
    padding: 13px 18px; max-width: 320px;
    font-family: var(--font-mono); font-size: 12.5px; text-align: left;
    box-shadow: 0 6px 18px rgba(23,29,27,.25);
    opacity: 0; transform: translateY(8px); transition: opacity .2s ease, transform .2s ease;
    pointer-events: none;
  }
  .nav-next.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
  .nav-next .nn-label { display: block; color: #9AA69E; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 3px; }
  .nav-next .nn-title { display: block; font-family: var(--font-serif); font-size: 14.5px; color: #fff; }
  .nav-next .nn-arrow { flex: none; font-size: 16px; }

  .nav-scrub {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 900;
    background: var(--paper-raised); border-top: 1px solid var(--ink);
    padding: 10px 18px calc(10px + env(safe-area-inset-bottom));
    display: none; opacity: 0; transform: translateY(100%); transition: opacity .2s ease, transform .2s ease;
  }
  .nav-scrub.visible { opacity: 1; transform: translateY(0); }
  .nav-scrub .ns-label { font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-soft); margin-bottom: 6px; }
  .nav-scrub .ns-title { font-family: var(--font-serif); font-weight: 700; font-size: 14px; }
  .nav-scrub input[type="range"] {
    width: 100%; margin-top: 8px; accent-color: var(--red); height: 22px;
  }

  @media (min-width: 860px) {
    .nav-next { display: flex; }
  }
  @media (max-width: 859px) {
    .nav-scrub { display: block; }
    footer { padding-bottom: 96px; }
  }
  @media (max-width: 640px) {
    .funnel { overflow-x: visible; }
    .funnel-track { min-width: 0; flex-wrap: wrap; row-gap: 22px; }
    .funnel-track::before { display: none; }
    .funnel-node { flex: 0 0 33.333%; }
  }
</style>
</head>
<body>

<div id="reading-progress"></div>

<header class="hero wrap" id="top">
  <div class="eyebrow">Диагностика воронки · Growth Autopilot</div>
  <h1>Куда утекают пациенты вашей стоматологии</h1>
  <p class="dek">Трафик вроде есть, а свободных окон в расписании всё равно не хватает? Разберём, как устроена воронка стоматологии, где она чаще всего течёт, во сколько это обходится в деньгах — и что сделать в первую очередь.</p>

  <div class="funnel" aria-hidden="true">
    <div class="funnel-track">
      <div class="funnel-node"><span class="funnel-dot"></span><span class="funnel-label">Реклама / трафик</span></div>
      <div class="funnel-node"><span class="funnel-dot"></span><span class="funnel-label">Сайт, соцсети</span></div>
      <div class="funnel-node"><span class="funnel-dot"></span><span class="funnel-label">Заявка, звонок</span></div>
      <div class="funnel-node"><span class="funnel-dot"></span><span class="funnel-label">Запись на время</span></div>
      <div class="funnel-node"><span class="funnel-dot"></span><span class="funnel-label">Дошёл до приёма</span></div>
      <div class="funnel-node last"><span class="funnel-dot"></span><span class="funnel-label">Стал постоянным</span></div>
    </div>
  </div>
</header>

<main>

  <!-- Теория воронки -->
  <section class="section wrap prose" id="s-theory1" data-nav-label="Почему воронка течёт">
    <p class="lede">Раздел 1</p>
    <h2>Почему трафик есть, а очереди из пациентов нет</h2>
    <p>Когда стоматология жалуется на нехватку пациентов, первая реакция обычно одна: добавить бюджет на рекламу. Логика понятна — если заявок мало, значит, надо привести больше людей на сайт. Но в большинстве случаев проблема не в количестве трафика, а в том, что происходит с ним дальше.</p>
    <p>У любой стоматологии есть воронка — путь, который проходит человек от первого касания с клиникой до того, как он садится в кресло, а затем возвращается снова (см. схему выше). Каждый переход между этими этапами — точка, где часть людей отваливается. И вот в чём проблема: почти весь маркетинговый бюджет и всё внимание уходят на первый этап — «привести трафик». Это самая заметная и самая измеримая часть: есть цифры показов, кликов, цена за клик. Середина и низ воронки — заявка → запись → дошёл → вернулся — почти никогда не считаются с той же тщательностью, хотя именно там теряется больше денег.</p>
    <p>Возьмём типичный пример. Клиника тратит на рекламу 100 000 ₽ в месяц и получает 80 заявок по 1 250 ₽ за штуку — цифра выглядит нормально, отчёт «по лидам выполнен». Но если из этих 80 заявок реально доходит до кресла 40 человек — потому что часть не дозвонилась, часть передумала, пока ждала обратного звонка, часть не смогла найти удобное время — настоящая цена привлечённого пациента уже не 1 250 ₽, а 2 500 ₽. И это без учёта того, сколько из дошедших вообще вернутся повторно.</p>
    <p>Отсюда правило, на котором строится весь этот разбор: если у клиники есть трафик, но нет очереди из пациентов, чинить нужно не верх воронки, а середину и низ. Это дешевле, чем удвоение рекламного бюджета, и почти всегда быстрее — правки в скрипты звонков или скорость реакции на заявку можно внести за 1-2 дня, а не ждать нового рекламного цикла.</p>
    <p class="callout">Дальше — конкретно 5 мест, где эта потеря происходит чаще всего.</p>
  </section>

  <!-- Квиз-калибровка -->
  <section class="section wrap" id="s-quiz" data-nav-label="Какая у вас клиника">
    <p class="lede">Раздел 2</p>
    <h2>Сначала — пара слов о вашей клинике</h2>
    <div class="quiz" id="quiz-1" data-metrica-goal="quiz_completed">
      <div class="quiz-question active" data-q="0">
        <p class="quiz-q">Какая у вас стоматология?</p>
        <div class="quiz-options">
          <button data-result="solo">Один кабинет / соло-практика</button>
          <button data-result="network">Сеть из нескольких клиник</button>
        </div>
      </div>
      <div class="quiz-result" data-result="solo">
        <span class="quiz-tag">Соло-практика</span>
        <h3>Вы сами и врач, и управляющий, и часто маркетолог</h3>
        <p>Узнаём. У соло-практик обычно нет ресурса тестировать десять каналов сразу — важно быстро найти 1-2 места, где теряется больше всего, и закрыть именно их. Ниже — 5 мест, где чаще всего теряют пациентов именно небольшие клиники.</p>
      </div>
      <div class="quiz-result" data-result="network">
        <span class="quiz-tag">Сеть клиник</span>
        <h3>У вас уже есть на кого делегировать трафик</h3>
        <p>Значит, вопрос не в том, «делать ли маркетинг», а в том, где именно воронка течёт при масштабировании — то, что незаметно в одной клинике, на сети превращается в заметные потери. Ниже разберём, где именно искать.</p>
      </div>
    </div>
  </section>

  <!-- 5 мест утечки -->
  <section class="section wrap" id="s-leaks" data-nav-label="5 мест утечки">
    <p class="lede">Раздел 3</p>
    <h2>5 мест, где стоматология теряет пациентов</h2>
    <div class="case-list">
      <div class="case-row">
        <div class="case-num">01</div>
        <div>
          <h3>Сайт и оффер: непонятно, зачем звонить именно вам</h3>
          <p>Пациент, который ищет стоматологию, за один вечер открывает 4-5 сайтов подряд. Если ваш ничем не выделяется — список услуг, цены «от», фото врачей — он ничем не отличается от остальных вкладок в браузере. Человек либо звонит туда, где увидел конкретную причину прийти именно сюда, либо откладывает решение и в итоге не звонит никуда.</p>
          <p>Работающий оффер — это не «скидка 10%» мелким шрифтом внизу страницы. Это понятная причина обратиться именно сейчас и именно к вам: бесплатная диагностика с рентгеном при записи на приём, гарантия на пломбы, фиксированная цена на популярную услугу без «от», ограниченное число мест на консультацию в этом месяце. Оффер должен быть виден в первые 3 секунды на сайте — в заголовке, а не в третьем экране вниз.</p>
          <p class="case-check"><span class="mono-label">Проверить</span>откройте свой сайт как будто видите его впервые. Понятно ли за 3 секунды, что вам предлагают и почему стоит выбрать именно эту клинику?</p>
        </div>
      </div>
      <div class="case-row">
        <div class="case-num">02</div>
        <div>
          <h3>Заявка обрабатывается не сразу</h3>
          <p>Пациент, который оставил заявку или позвонил в стоматологию, в этот момент сравнивает несколько клиник одновременно — это нормальное поведение при выборе медицинской услуги. Если администратор перезванивает через 2-3 часа, а не через 5-10 минут, велика вероятность, что человек уже записался туда, где ответили быстрее.</p>
          <p>Дело не в лени администратора — чаще всего дело в отсутствии процесса: заявки падают в общий чат или на почту, где их не видно сразу, нет ответственного, который обязан перезвонить в течение конкретного времени, нет уведомлений о новой заявке на телефон.</p>
          <p class="case-check"><span class="mono-label">Проверить</span>сделайте контрольную заявку на своём сайте в обычный будний день и засеките, через сколько минут вам перезвонят.</p>
        </div>
      </div>
      <div class="case-row">
        <div class="case-num">03</div>
        <div>
          <h3>Скрипты звонков — про информирование, а не про запись</h3>
          <p>Разговор администратора с пациентом часто выглядит так: рассказали про врачей, про цены, ответили на вопросы — и попрощались словами «хорошо, подумайте, будут вопросы — звоните». Формально всё вежливо и правильно. По факту разговор закончился ничем, потому что в нём не было момента, ради которого он вообще происходил, — записи на конкретное время.</p>
          <p>Хороший скрипт звонка не «информирует», а ведёт к записи с первой фразы. После ответа на 1-2 вопроса администратор должен сам предложить конкретное время: «Могу записать вас на четверг в 15:00 или на пятницу утром — что удобнее?». Выбор из двух вариантов работает лучше, чем открытый вопрос «когда вам удобно» — человеку проще выбрать, чем формулировать.</p>
          <p class="case-check"><span class="mono-label">Проверить</span>попросите коллегу или знакомого позвонить как обычный пациент и посчитать, сколько раз за разговор администратор предложил конкретное время записи.</p>
        </div>
      </div>
      <div class="case-row">
        <div class="case-num">04</div>
        <div>
          <h3>Отзывы и Яндекс.Карты не работают на вас</h3>
          <p>Прежде чем позвонить, большинство людей открывают Яндекс.Карты и смотрят рейтинг и последние отзывы клиники — это происходит до звонка, поэтому в рекламной статистике этот этап вообще не виден. Если рейтинг ниже 4.5, отзывов мало или последний негативный отзыв висит без ответа клиники несколько месяцев — часть трафика отваливается именно здесь, а в отчётах по рекламе это выглядит как «низкая конверсия сайта», хотя причина в другом месте.</p>
          <p>Работа с репутацией — это не разовая акция «накрутим отзывов», а процесс: после каждого визита администратор или врач просит оставить отзыв, на негатив отвечают быстро и по существу, карточка на Яндекс.Картах заполнена полностью.</p>
          <p class="case-check"><span class="mono-label">Проверить</span>откройте свою клинику в Яндекс.Картах глазами незнакомого человека. Захотелось бы вам позвонить за первые 10 секунд?</p>
        </div>
      </div>
      <div class="case-row">
        <div class="case-num">05</div>
        <div>
          <h3>Реклама крутится без аналитики по дошедшим</h3>
          <p>Почти любая рекламная система покажет вам, сколько стоила заявка. Но заявка — это ещё не пациент. Часть заявок — это ошибочные звонки, спам, люди, которые передумали, не подтвердили запись или не дошли до приёма. Без связи между рекламным кабинетом и тем, что происходит дальше, невозможно понять, какой канал реально приводит пациентов, а какой просто красиво выглядит в отчёте по цене клика.</p>
          <p>Минимальная версия этой аналитики — не сложная сквозная система, а обычная таблица или CRM, где на каждую заявку фиксируется источник и итоговый статус (дошёл / не дошёл / записан на будущее / отказ).</p>
          <p class="case-check"><span class="mono-label">Проверить</span>сможете ли вы сейчас назвать не цену заявки, а цену дошедшего пациента по каждому рекламному каналу за последний месяц?</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Ориентиры рынка -->
  <section class="section wrap prose" id="s-benchmarks" data-nav-label="Ориентиры рынка">
    <p class="lede">Раздел 4</p>
    <h2>Как выглядит здоровая воронка стоматологии</h2>
    <p>Чтобы понимать, где именно ваша воронка проседает, полезно иметь ориентиры — не эталон, к которому нужно прийти любой ценой, а средние по рынку значения, с которыми можно сравнить свою ситуацию.</p>
    <div class="ledger">
      <div class="ledger-row"><span class="label">Скорость реакции на заявку</span><span class="value">5–10 мин</span></div>
      <div class="ledger-row"><span class="label">Конверсия заявки в запись</span><span class="value">50–70%</span></div>
      <div class="ledger-row"><span class="label">Запись → «дошёл» (с напоминаниями)</span><span class="value">70–85%</span></div>
      <div class="ledger-row"><span class="label">Доля повторных пациентов</span><span class="value">30–40%</span></div>
      <div class="ledger-row"><span class="label">Рейтинг в Яндекс.Картах</span><span class="value">от 4.5</span></div>
    </div>
    <p>Скорость реакции на заявку — в клиниках, где выстроен процесс, среднее время до первого звонка после заявки укладывается в 5-10 минут в рабочие часы. Если у вас это часы, а не минуты — здесь чаще всего теряется больше всего заявок, и это самое дешёвое место для правки: не нужен новый бюджет, нужен процесс и ответственный.</p>
    <p>Доля повторных пациентов — показатель, который реже всего кто-то считает, хотя именно он определяет, окупается ли маркетинг в долгую. Клиника, где 30-40% визитов — от уже знакомых пациентов, тратит на привлечение заметно меньше, чем клиника, которая каждый месяц строит расписание заново с нуля.</p>
    <p class="callout">Если по своей клинике вы не можете сходу назвать хотя бы 2-3 из этих цифр — это тоже диагноз: скорее всего, воронка теряет пациентов именно там, где её не измеряют. Проверьте себя по короткому чек-листу ниже — он собран как раз из этих ориентиров.</p>
  </section>

  <!-- Калькулятор потерь -->
  <section class="section wrap" id="s-calc" data-nav-label="Калькулятор потерь">
    <p class="lede">Раздел 5</p>
    <h2>Сколько теряет ваша клиника в деньгах</h2>
    <div class="receipt-wrap">
      <div class="receipt" id="calc-1" data-metrica-goal="calculator_used">
        <p class="receipt-title">Расчёт упущенной выручки / мес</p>
        <div class="receipt-row">
          <label for="calc-leads">Заявок в месяц</label>
          <input type="number" id="calc-leads" inputmode="numeric" min="0" value="60">
        </div>
        <div class="receipt-row">
          <label for="calc-lost">Не доходят до записи, %</label>
          <input type="number" id="calc-lost" inputmode="numeric" min="0" max="100" value="30">
        </div>
        <div class="receipt-row">
          <label for="calc-check">Средний чек, ₽</label>
          <input type="number" id="calc-check" inputmode="numeric" min="0" value="4000">
        </div>
        <div class="receipt-total">
          <span class="rt-label">Итого теряете / мес</span>
          <span class="rt-value"><span id="calc-output">72 000</span> ₽</span>
        </div>
        <p class="receipt-note">Это только первичные визиты — без учёта повторных посещений и допродаж, с которыми реальная сумма обычно выше.</p>
      </div>
    </div>
  </section>

  <!-- Чек-лист -->
  <section class="section wrap" id="s-checklist" data-nav-label="Чек-лист">
    <p class="lede">Раздел 6</p>
    <h2>Проверьте свою воронку за 2 минуты</h2>
    <p class="checklist-progress"><span class="done-count">0</span> / <span class="total-count">6</span> отмечено</p>
    <div class="checklist" id="checklist-1" data-storage-key="dental-checklist-v1">
      <label><input type="checkbox"> Отвечаем на заявку/звонок в течение 10-15 минут</label>
      <label><input type="checkbox"> У администраторов есть скрипт, который заканчивается конкретной записью на время</label>
      <label><input type="checkbox"> На сайте есть понятный оффер, а не только список цен</label>
      <label><input type="checkbox"> Рейтинг в Яндекс.Картах выше 4.5, негатив отрабатывается</label>
      <label><input type="checkbox"> Знаем, сколько стоит не заявка, а дошедший пациент, по каждому каналу</label>
      <label><input type="checkbox"> Есть система напоминаний о повторных визитах</label>
    </div>
  </section>

  <!-- Финальный CTA -->
  <section class="section" id="s-cta" data-nav-label="Запись на разбор" style="border-top:none; padding:0;">
    <div class="stamp">
      <div class="wrap" style="padding:0;">
        <p class="lede" style="color:#9AA69E;">Раздел 7</p>
        <h2>Бесплатно разберём воронку вашей клиники за 20 минут</h2>
        <p class="dek">Покажем 2-3 конкретных места, где вы теряете пациентов прямо сейчас, и что с этим делать в первую очередь — без обязательств и без «универсального» решения под копирку.</p>
        <form id="lead-form" data-webhook="/api/leadmagnet1-submit">
          <div class="stamp-field">
            <label for="f-name">Как к вам обращаться</label>
            <input type="text" id="f-name" name="name" required>
          </div>
          <div class="stamp-field">
            <label for="f-clinic">Название клиники</label>
            <input type="text" id="f-clinic" name="clinic" required>
          </div>
          <div class="stamp-field">
            <label for="f-contact">Телефон или Telegram</label>
            <input type="tel" id="f-contact" name="contact" required>
          </div>
          <button type="submit">Записаться на разбор</button>
          <p class="form-status"></p>
        </form>
      </div>
    </div>
  </section>

</main>

<footer class="mono">Growth Autopilot — агентство лидогенерации для стоматологий</footer>

<!-- Навигация: десктоп — кнопка "следующий раздел", мобильный — перемотка -->
<button class="nav-next mono" id="nav-next" type="button">
  <span>
    <span class="nn-label">Далее</span>
    <span class="nn-title" id="nav-next-title"></span>
  </span>
  <span class="nn-arrow" aria-hidden="true">→</span>
</button>

<div class="nav-scrub" id="nav-scrub">
  <div class="ns-label">Раздел <span id="ns-index">1</span> / <span id="ns-total"></span></div>
  <div class="ns-title" id="ns-title"></div>
  <input type="range" id="ns-range" min="0" max="0" step="1" value="0" aria-label="Перемотка по разделам">
</div>

<script>
(function () {
  var METRICA_COUNTER_ID = 00000000;

  var bar = document.getElementById('reading-progress');
  window.addEventListener('scroll', function () {
    var h = document.documentElement;
    var scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    bar.style.width = Math.min(100, Math.max(0, scrolled)) + '%';
  }, { passive: true });

  function reachGoal(name) {
    if (typeof ym === 'function') {
      try { ym(METRICA_COUNTER_ID, 'reachGoal', name); } catch (e) {}
    }
  }

  // Квиз
  document.querySelectorAll('.quiz').forEach(function (quiz) {
    quiz.querySelectorAll('.quiz-options button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var result = btn.getAttribute('data-result');
        quiz.querySelectorAll('.quiz-question').forEach(function (q) { q.classList.remove('active'); });
        quiz.querySelectorAll('.quiz-result').forEach(function (r) {
          r.classList.toggle('active', r.getAttribute('data-result') === result);
        });
        reachGoal(quiz.getAttribute('data-metrica-goal') || 'quiz_completed');
      });
    });
  });

  // Калькулятор
  document.querySelectorAll('.receipt').forEach(function (calc) {
    var leadsInput = calc.querySelector('#calc-leads');
    var lostInput = calc.querySelector('#calc-lost');
    var checkInput = calc.querySelector('#calc-check');
    var output = calc.querySelector('#calc-output');
    var fired = false;

    function recalc() {
      var leads = Math.max(0, parseFloat(leadsInput.value) || 0);
      var lostPct = Math.min(100, Math.max(0, parseFloat(lostInput.value) || 0));
      var check = Math.max(0, parseFloat(checkInput.value) || 0);
      var lost = Math.round(leads * (lostPct / 100) * check);
      output.textContent = lost.toLocaleString('ru-RU');
      if (!fired) { fired = true; reachGoal(calc.getAttribute('data-metrica-goal') || 'calculator_used'); }
    }

    [leadsInput, lostInput, checkInput].forEach(function (input) {
      input.addEventListener('input', recalc);
    });
    recalc();
  });

  // Чек-лист с сохранением состояния
  document.querySelectorAll('.checklist').forEach(function (list) {
    var key = list.getAttribute('data-storage-key') || 'checklist-default';
    var boxes = list.querySelectorAll('input[type="checkbox"]');
    var section = list.closest('.section');
    var doneCount = section.querySelector('.done-count');
    var totalCount = section.querySelector('.total-count');
    totalCount.textContent = boxes.length;

    function saved() {
      try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
    }
    function update() {
      var done = 0;
      var state = [];
      boxes.forEach(function (box, i) { if (box.checked) done++; state[i] = box.checked; });
      doneCount.textContent = done;
      try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {}
    }
    var state = saved();
    boxes.forEach(function (box, i) { if (state[i]) box.checked = true; });
    update();
    boxes.forEach(function (box) { box.addEventListener('change', update); });
  });

  // Финальная форма
  var form = document.getElementById('lead-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      var webhook = form.getAttribute('data-webhook');
      var data = Object.fromEntries(new FormData(form).entries());
      status.textContent = 'Отправляем...';

      fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error('bad status');
        status.textContent = 'Спасибо! Мы скоро свяжемся.';
        form.reset();
        reachGoal('lead_submit');
      }).catch(function () {
        status.textContent = 'Не получилось отправить. Попробуйте ещё раз или напишите нам напрямую.';
      });
    });
  }

  // ── Навигация по разделам: следующий раздел (десктоп) + перемотка (моб.) ──
  var sections = Array.prototype.map.call(document.querySelectorAll('main .section[id]'), function (el) {
    return { id: el.id, label: el.getAttribute('data-nav-label') || el.id, el: el };
  });

  var navNext = document.getElementById('nav-next');
  var navNextTitle = document.getElementById('nav-next-title');
  var navScrub = document.getElementById('nav-scrub');
  var nsRange = document.getElementById('ns-range');
  var nsTitle = document.getElementById('ns-title');
  var nsIndex = document.getElementById('ns-index');
  var nsTotal = document.getElementById('ns-total');
  var hero = document.getElementById('top');

  nsRange.max = String(sections.length - 1);
  nsTotal.textContent = String(sections.length);

  var dragging = false;
  var currentIndex = 0;

  function scrollToSection(i) {
    var target = sections[Math.max(0, Math.min(sections.length - 1, i))];
    if (target) target.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function computeCurrentIndex() {
    var probe = window.scrollY + 140;
    var idx = 0;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].el.offsetTop <= probe) idx = i;
    }
    return idx;
  }

  function updateNav() {
    var pastHero = window.scrollY > (hero.offsetTop + hero.offsetHeight - 80);
    navNext.classList.toggle('visible', pastHero);
    navScrub.classList.toggle('visible', pastHero);
    if (!pastHero) return;

    currentIndex = computeCurrentIndex();

    var next = sections[currentIndex + 1];
    if (next) {
      navNext.style.display = '';
      navNextTitle.textContent = next.label;
    } else {
      navNext.classList.remove('visible');
    }

    nsTitle.textContent = sections[currentIndex].label;
    nsIndex.textContent = String(currentIndex + 1);
    if (!dragging) nsRange.value = String(currentIndex);
  }

  navNext.addEventListener('click', function () {
    scrollToSection(currentIndex + 1);
  });

  nsRange.addEventListener('pointerdown', function () { dragging = true; });
  window.addEventListener('pointerup', function () {
    if (dragging) { dragging = false; scrollToSection(parseInt(nsRange.value, 10)); }
  });
  nsRange.addEventListener('input', function () {
    var i = parseInt(nsRange.value, 10);
    nsTitle.textContent = sections[i].label;
    nsIndex.textContent = String(i + 1);
  });

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () { updateNav(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
  window.addEventListener('resize', updateNav);
  updateNav();
})();
</script>

</body>
</html>`;
}

// ─── LEAD MAGNET 2: КУДА УТЕКАЕТ ВЫРУЧКА ПАРКА РАЗВЛЕЧЕНИЙ (демо-ниша) ──
function serveLeadMagnet2() {
  return new Response(getLeadMagnet2HTML(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function apiLeadMagnet2Submit(request, env) {
  if (request.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);
  let body;
  try { body = await request.json(); } catch (e) { return jsonResp({ ok: false }, 400); }
  const name = (body.name || "").toString().trim().slice(0, 200);
  const park = (body.park || "").toString().trim().slice(0, 200);
  const contact = (body.contact || "").toString().trim().slice(0, 200);
  if (!name || !contact) return jsonResp({ ok: false });

  if (env.ADMIN_ID) {
    const text = `🎡 *Заявка с лид-магнита «Куда утекает выручка парка развлечений» (демо-ниша)*\n\nИмя: ${name}\nПарк: ${park || "—"}\nКонтакт: ${contact}`;
    await tgSend(env, env.ADMIN_ID, text);
  }
  return jsonResp({ ok: true });
}

function getLeadMagnet2HTML() {
  return `<!DOCTYPE html>
<!--
  ДЕМО-НИША. Бренд "ParkFlow", кейсы и цифры на этой странице — вымышленные:
  цель — показать 10 разных интерактивных механик (игры, перетаскивание,
  диаграммы), а не описать реального клиента Growth Autopilot. Форма ниже
  подключена к тому же Telegram-каналу, что и остальные лид-магниты воркера.
  См. lead-magnets/pages/kuda-utekaet-vyruchka-parka/structure.md.
-->
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Куда утекает выручка вашего парка развлечений — ParkFlow (демо)</title>
<meta name="description" content="Игровая диагностика воронки продажи билетов сезонного парка развлечений: 10 разных интерактивных механик — колесо, карта утечек, перетаскивание, свайпы, игра на память и другие.">
<meta property="og:title" content="Куда утекает выручка вашего парка развлечений">
<meta property="og:description" content="10 игровых механик вместо скучной теории: найдите свои точки утечки выручки и получите бесплатный разбор воронки.">
<meta property="og:type" content="article">

<!-- Яндекс.Метрика: ID-заглушка 00000000 — демо-материал, не публиковалось в прод, реальный счётчик не подставлен -->
<script type="text/javascript">
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
   ym(00000000, "init", {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", accurateTrackBounce:true, trackLinks:true});
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/00000000" style="position:absolute; left:-9999px;" alt=""/></div></noscript>

<style>
  :root {
    --ticket: #FFF6E7;
    --ticket-raised: #FFFFFF;
    --ink: #2A1E1A;
    --ink-soft: #7A6659;
    --line: #F0DEB8;
    --red: #E63946;
    --red-tint: #FBE0E1;
    --gold: #F1A208;
    --gold-tint: #FDECC8;
    --teal: #0F8B8D;
    --teal-tint: #DCF1EF;
    --font-heading: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --font-body: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --radius: 20px;
    --max-width: 720px;
    --space: 24px;
  }

  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
  body {
    margin: 0;
    background: var(--ticket);
    color: var(--ink);
    font-family: var(--font-body);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3 { font-family: var(--font-heading); font-weight: 800; line-height: 1.2; margin: 0 0 0.5em; letter-spacing: -0.01em; }
  p { margin: 0 0 1.1em; }
  a { color: var(--teal); }
  button { font-family: inherit; cursor: pointer; }
  :focus-visible { outline: 3px solid var(--teal); outline-offset: 2px; }

  .demo-flag { background: var(--ink); color: var(--gold-tint); font-size: 12px; font-weight: 700; text-align: center; padding: 8px 12px; letter-spacing: .03em; }
  #reading-progress { position: fixed; top: 0; left: 0; height: 5px; width: 0%; background: linear-gradient(90deg, var(--red), var(--gold)); z-index: 1000; transition: width 0.1s linear; }
  .wrap { max-width: var(--max-width); margin: 0 auto; padding: 0 var(--space); }

  .eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--red); margin-bottom: 14px; }
  .eyebrow::before { content: "🎡"; font-size: 15px; }

  .hero { padding: 48px 0 36px; text-align: center; }
  .hero h1 { font-size: clamp(28px, 6.4vw, 44px); }
  .hero p { color: var(--ink-soft); font-size: 18px; max-width: 52ch; margin: 0 auto 28px; }
  .fair-scene { display: flex; justify-content: center; gap: 10px; margin-bottom: 8px; }

  .ticket-card { background: var(--ticket-raised); border-radius: var(--radius); padding: 20px var(--space); margin-top: 8px; box-shadow: 0 10px 30px rgba(42,30,26,0.08); position: relative; border: 2px dashed var(--line); }
  .ticket-card::before, .ticket-card::after { content: ""; position: absolute; top: 50%; width: 22px; height: 22px; background: var(--ticket); border-radius: 50%; transform: translateY(-50%); }
  .ticket-card::before { left: -13px; }
  .ticket-card::after { right: -13px; }
  .ticket-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .ticket-stat b { display: block; font-size: 22px; color: var(--red); }
  .ticket-stat span { font-size: 12.5px; color: var(--ink-soft); }

  .content-block { padding: 40px 0; border-top: 1px dashed var(--line); }
  .content-block h2 { font-size: clamp(22px, 4.2vw, 29px); }
  .content-block .lede { font-size: 13px; color: var(--red); text-transform: uppercase; letter-spacing: .05em; font-weight: 700; margin: -6px 0 18px; }
  .content-block .hint { font-size: 15px; color: var(--ink-soft); }
  .card-surface { background: var(--ticket-raised); border-radius: var(--radius); padding: var(--space); box-shadow: 0 4px 18px rgba(42,30,26,0.06); }

  /* ── 1. Колесо фортуны ─────────────────────────────────── */
  .wheel-wrap { text-align: center; }
  .wheel-pointer { font-size: 26px; color: var(--red); margin-bottom: -10px; }
  .wheel { width: 250px; height: 250px; border-radius: 50%; margin: 0 auto; position: relative; border: 6px solid var(--ticket-raised); box-shadow: 0 8px 24px rgba(42,30,26,0.18); background: conic-gradient(var(--red) 0deg 45deg, var(--gold) 45deg 90deg, var(--teal) 90deg 135deg, var(--ink) 135deg 180deg, var(--red) 180deg 225deg, var(--gold) 225deg 270deg, var(--teal) 270deg 315deg, var(--ink) 315deg 360deg); transition: transform 4s cubic-bezier(.17,.67,.12,1); }
  .wheel-label { position: absolute; top: 50%; left: 50%; width: 2px; height: 2px; }
  .wheel-label span { position: absolute; left: -52px; top: -112px; width: 104px; text-align: center; font-size: 10px; font-weight: 800; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.4); display: block; }
  .wheel-btn { margin-top: 22px; background: var(--red); color: #fff; border: none; border-radius: 999px; padding: 15px 30px; font-weight: 800; font-size: 16px; min-height: 48px; box-shadow: 0 6px 16px rgba(230,57,70,.35); }
  .wheel-btn:disabled { opacity: .55; }
  .wheel-result { margin-top: 18px; background: var(--gold-tint); border-radius: 14px; padding: 16px 18px; font-weight: 700; display: none; }

  /* ── 2. Карта утечек ───────────────────────────────────── */
  .park-map { position: relative; background: linear-gradient(180deg, var(--teal-tint), var(--gold-tint)); border-radius: var(--radius); padding: 40px 14px 30px; overflow: hidden; }
  .park-row { display: flex; justify-content: space-between; align-items: center; }
  .park-icon { font-size: 26px; text-align: center; flex: 1; }
  .park-icon-label { font-size: 9.5px; color: var(--ink-soft); text-align: center; margin-top: 4px; }
  .hotspot { position: absolute; width: 30px; height: 30px; border-radius: 50%; background: var(--red); border: 3px solid #fff; box-shadow: 0 0 0 0 rgba(230,57,70,.6); animation: pulse 1.6s infinite; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 13px; padding: 0; }
  .hotspot.found { background: var(--teal); animation: none; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(230,57,70,.5); } 70% { box-shadow: 0 0 0 14px rgba(230,57,70,0); } 100% { box-shadow: 0 0 0 0 rgba(230,57,70,0); } }
  .leak-progress { font-weight: 700; color: var(--red); margin: 14px 0 10px; }
  .leak-log-item { background: var(--ticket-raised); border-radius: 10px; padding: 10px 14px; margin-bottom: 8px; font-size: 14px; border-left: 4px solid var(--teal); animation: reveal .3s ease; }
  @keyframes reveal { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

  /* ── 3. Драг-н-дроп воронка ────────────────────────────── */
  .sort-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .sort-item { background: var(--ticket-raised); border: 2px solid var(--line); border-radius: 14px; padding: 12px 14px; display: flex; align-items: center; gap: 12px; user-select: none; font-size: 15px; font-weight: 600; }
  .sort-item.dragging { opacity: .5; border-color: var(--teal); }
  .sort-item.wrong { border-color: var(--red); }
  .sort-handle { font-size: 20px; color: var(--ink-soft); cursor: grab; padding: 4px 8px; touch-action: none; flex-shrink: 0; }
  .sort-check-btn { margin-top: 16px; background: var(--teal); color: #fff; border: none; border-radius: 999px; padding: 13px 24px; font-weight: 700; min-height: 44px; }
  .sort-feedback { margin-top: 12px; font-weight: 700; min-height: 22px; }
  .sort-feedback.ok { color: var(--teal); }
  .sort-feedback.no { color: var(--red); }

  /* ── 4. Свайп-карточки ─────────────────────────────────── */
  .swipe-stack { position: relative; height: 210px; max-width: 340px; margin: 0 auto; }
  .swipe-card { position: absolute; inset: 0; background: var(--ticket-raised); border-radius: var(--radius); box-shadow: 0 8px 24px rgba(42,30,26,0.14); display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px; font-size: 16.5px; font-weight: 700; touch-action: none; cursor: grab; border: 2px solid var(--line); }
  .swipe-btns { display: flex; gap: 12px; justify-content: center; margin-top: 18px; }
  .swipe-btn { border-radius: 999px; padding: 12px 22px; font-weight: 700; border: 2px solid; min-height: 44px; background: var(--ticket-raised); }
  .swipe-btn.no { border-color: var(--ink-soft); color: var(--ink-soft); }
  .swipe-btn.yes { border-color: var(--teal); color: var(--teal); }
  .swipe-progress { text-align: center; font-size: 13px; color: var(--ink-soft); margin-top: 12px; }
  .swipe-verdict { display: none; text-align: center; font-weight: 700; margin-top: 14px; background: var(--gold-tint); border-radius: 12px; padding: 16px; }

  /* ── 5 и 10: спидометры (общий стиль) ─────────────────── */
  .gauge-wrap { text-align: center; }
  .gauge-svg { width: 220px; height: 130px; }
  .gauge-needle { transform-origin: 110px 110px; transition: transform .15s ease; }
  .gauge-range { width: 100%; margin-top: 10px; accent-color: var(--red); height: 30px; }
  .gauge-text { margin-top: 12px; font-weight: 700; min-height: 44px; }
  .gauge-score { margin-top: 6px; font-size: 14px; color: var(--ink-soft); }

  /* ── 6. Игра на память ─────────────────────────────────── */
  .memory-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .memory-card { background: var(--ink); color: #fff; border-radius: 12px; min-height: 100px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer; border: none; }
  .memory-card .memory-back { font-size: 26px; }
  .memory-card.flipped { background: #fff; color: var(--ink); border: 2px solid var(--teal); }
  .memory-card.matched { background: var(--teal-tint); color: var(--ink); border: 2px solid var(--teal); cursor: default; }
  .memory-status { text-align: center; margin-top: 16px; font-weight: 700; color: var(--teal); display: none; }

  /* ── 7. Таймлайн-скраббер ──────────────────────────────── */
  .timeline-track { position: relative; height: 6px; background: var(--line); border-radius: 3px; margin: 34px 4px 18px; }
  .timeline-fill { position: absolute; left: 0; top: 0; height: 100%; background: var(--red); border-radius: 3px; }
  .timeline-marker { position: absolute; top: 50%; font-size: 22px; transform: translate(-50%,-50%); }
  .timeline-range { width: 100%; accent-color: var(--red); }
  .timeline-day { text-align: center; font-weight: 700; margin-bottom: 4px; }
  .timeline-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
  .timeline-stat { background: var(--ticket); border-radius: 12px; padding: 12px; text-align: center; }
  .timeline-stat b { display: block; font-size: 18px; }
  .timeline-stat.loss b { color: var(--red); }
  .timeline-stat.gain b { color: var(--teal); }
  .timeline-note { font-size: 12px; color: var(--ink-soft); font-style: italic; margin-top: 12px; }

  /* ── 8. Калькулятор + донат ────────────────────────────── */
  .calc-field { margin-bottom: 16px; }
  .calc-field label { display: block; font-size: 14px; font-weight: 700; margin-bottom: 6px; }
  .calc-field input { width: 100%; padding: 13px 14px; border-radius: 12px; border: 2px solid var(--line); font-size: 16px; min-height: 44px; font-family: inherit; background: var(--ticket); color: var(--ink); }
  .calc-field input:focus { border-color: var(--teal); outline: none; }
  .donut-wrap { display: flex; align-items: center; gap: 20px; margin-top: 18px; flex-wrap: wrap; justify-content: center; }
  .donut-box { position: relative; width: 150px; height: 150px; flex-shrink: 0; }
  .donut-center-label { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; }
  .donut-legend { font-size: 13.5px; }
  .donut-legend div { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .donut-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
  .calc-result-line { margin-top: 14px; font-size: 14px; color: var(--ink-soft); text-align: center; }
  .calc-result-line b { color: var(--red); }

  /* ── 9. Чек-лист (питает спидометр 10) ─────────────────── */
  .checklist-progress { font-size: 14px; font-weight: 700; color: var(--teal); margin-bottom: 14px; }
  .checklist label { display: flex; gap: 12px; align-items: flex-start; padding: 11px 0; border-bottom: 1px dashed var(--line); font-size: 15px; }
  .checklist label:last-child { border-bottom: none; }
  .checklist input { width: 22px; height: 22px; flex-shrink: 0; margin-top: 1px; accent-color: var(--teal); }

  /* ── 10. Скретч-билет + CTA ─────────────────────────────── */
  .scratch-wrap { position: relative; border-radius: var(--radius); overflow: hidden; aspect-ratio: 16/10; max-width: 420px; margin: 0 auto; box-shadow: 0 10px 30px rgba(42,30,26,.18); }
  .scratch-reveal { position: absolute; inset: 0; background: linear-gradient(135deg, var(--red), #C22233); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 22px; }
  .scratch-reveal h3 { color: #fff; margin-bottom: 8px; }
  .scratch-reveal p { color: rgba(255,255,255,.92); margin: 0; font-size: 14.5px; }
  .scratch-canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: pointer; display: block; }
  .scratch-fallback { display: block; margin: 14px auto 0; background: none; border: 2px dashed var(--ink-soft); border-radius: 999px; padding: 10px 18px; font-size: 13px; color: var(--ink-soft); }

  .final-cta { background: linear-gradient(135deg, var(--red), #C22233); color: #fff; border-radius: var(--radius); padding: 32px var(--space); text-align: center; position: relative; margin-top: 26px; }
  .final-cta::before, .final-cta::after { content: ""; position: absolute; top: 50%; width: 24px; height: 24px; background: var(--ticket); border-radius: 50%; transform: translateY(-50%); }
  .final-cta::before { left: -14px; }
  .final-cta::after { right: -14px; }
  .final-cta h2 { color: #fff; }
  .final-cta p { color: rgba(255,255,255,0.9); }
  .final-cta form { display: grid; gap: 12px; margin-top: 20px; text-align: left; }
  .final-cta input { padding: 15px 16px; border-radius: 12px; border: none; font-size: 16px; min-height: 48px; font-family: inherit; }
  .final-cta button[type="submit"] { padding: 15px 16px; border-radius: 12px; border: none; background: var(--gold); color: var(--ink); font-size: 16px; font-weight: 800; min-height: 48px; }
  .final-cta button[type="submit"]:hover { filter: brightness(1.05); }
  .form-status { font-size: 14px; margin-top: 4px; min-height: 20px; color: #fff; }

  footer { text-align: center; padding: 36px 0 44px; color: var(--ink-soft); font-size: 13px; }
  footer .demo-footer-note { display: block; margin-top: 6px; font-size: 11.5px; opacity: .8; }
</style>
</head>
<body>

<div class="demo-flag">ДЕМО-СТРАНИЦА · данные и кейсы вымышлены, 10 разных интерактивных механик для показа формата, не публиковалась</div>
<div id="reading-progress"></div>

<header class="hero wrap">
  <div class="fair-scene" aria-hidden="true">
    <svg width="220" height="72" viewBox="0 0 220 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="36" cy="36" r="30" stroke="#F1A208" stroke-width="4"/>
      <circle cx="36" cy="36" r="3" fill="#E63946"/>
      <line x1="36" y1="6" x2="36" y2="66" stroke="#F1A208" stroke-width="2"/>
      <line x1="6" y1="36" x2="66" y2="36" stroke="#F1A208" stroke-width="2"/>
      <line x1="15" y1="15" x2="57" y2="57" stroke="#F1A208" stroke-width="2"/>
      <line x1="57" y1="15" x2="15" y2="57" stroke="#F1A208" stroke-width="2"/>
      <path d="M100 66 L110 20 L120 66 Z" fill="#E63946"/>
      <path d="M130 66 L142 10 L154 66 Z" fill="#0F8B8D"/>
      <path d="M164 66 L172 30 L180 66 Z" fill="#F1A208"/>
    </svg>
  </div>
  <span class="eyebrow">Игровой разбор для сезонных парков</span>
  <h1>Куда утекает выручка вашего парка развлечений</h1>
  <p>10 разных мини-игр вместо скучной теории — покрутите колесо, найдите утечки на карте, соберите воронку и посчитайте, сколько теряете каждый день сезона.</p>

  <div class="ticket-card">
    <div class="ticket-stats">
      <div class="ticket-stat"><b>10</b><span>разных механик</span></div>
      <div class="ticket-stat"><b>5&nbsp;мин</b><span>пройти всё</span></div>
      <div class="ticket-stat"><b>20&nbsp;мин</b><span>бесплатный аудит воронки</span></div>
    </div>
  </div>
</header>

<main class="wrap">

  <!-- 1. Колесо фортуны -->
  <section class="content-block">
    <p class="lede">Разбор 01 · Колесо</p>
    <h2>Крути колесо — узнай факт о своём сезоне</h2>
    <p class="hint">Каждый сектор — короткое наблюдение о сезонных парках. Нажмите «Крутить» и посмотрите, что выпадет.</p>
    <div class="wheel-wrap">
      <div class="wheel-pointer" aria-hidden="true">▼</div>
      <div class="wheel" id="wheel">
        <div class="wheel-label" style="transform: rotate(22.5deg)"><span>Сезон = 90-120 дней</span></div>
        <div class="wheel-label" style="transform: rotate(67.5deg)"><span>До 25% теряется на кассе</span></div>
        <div class="wheel-label" style="transform: rotate(112.5deg)"><span>Ремаркетинг вернёт треть</span></div>
        <div class="wheel-label" style="transform: rotate(157.5deg)"><span>Абонементы кормят межсезонье</span></div>
        <div class="wheel-label" style="transform: rotate(202.5deg)"><span>Быстрая касса = рост конверсии</span></div>
        <div class="wheel-label" style="transform: rotate(247.5deg)"><span>Будни — резерв для индор-парков</span></div>
        <div class="wheel-label" style="transform: rotate(292.5deg)"><span>Отзывы решают, придут ли вообще</span></div>
        <div class="wheel-label" style="transform: rotate(337.5deg)"><span>Погода — часть воронки, не оправдание</span></div>
      </div>
      <button class="wheel-btn" id="wheelBtn" type="button">Крутить колесо 🎡</button>
      <div class="wheel-result" id="wheelResult"></div>
    </div>
  </section>

  <!-- 2. Карта утечек -->
  <section class="content-block">
    <p class="lede">Разбор 02 · Карта</p>
    <h2>Найдите 5 утечек на карте парка</h2>
    <p class="hint">Нажимайте на красные точки на пути посетителя — от ворот до выхода.</p>
    <div class="park-map" id="parkMap">
      <div class="park-row">
        <div><div class="park-icon">🚪</div><div class="park-icon-label">Ворота</div></div>
        <div><div class="park-icon">🎟️</div><div class="park-icon-label">Касса</div></div>
        <div><div class="park-icon">🎢</div><div class="park-icon-label">Аттракционы</div></div>
        <div><div class="park-icon">🌭</div><div class="park-icon-label">Фудкорт</div></div>
        <div><div class="park-icon">🚶</div><div class="park-icon-label">Выход</div></div>
      </div>
      <button class="hotspot" type="button" style="top:8px; left:14%;" data-leak="На воротах нет QR на онлайн-кассу — часть гостей идёт в живую очередь и часть из них разворачивается.">1</button>
      <button class="hotspot" type="button" style="top:66%; left:32%;" data-leak="Касса принимает только карту и наличные — гости с Apple/Google Pay иногда просто уходят.">2</button>
      <button class="hotspot" type="button" style="top:20%; left:52%;" data-leak="У части аттракционов нет понятного прайса рядом — гости не понимают, сколько ещё платить, и экономят.">3</button>
      <button class="hotspot" type="button" style="top:70%; left:72%;" data-leak="Фудкорт принимает только наличные в будни — теряются импульсные покупки.">4</button>
      <button class="hotspot" type="button" style="top:22%; left:90%;" data-leak="На выходе никто не предлагает абонемент или сертификат на следующий визit — гость просто уходит навсегда.">5</button>
    </div>
    <p class="leak-progress"><span id="leakFound">0</span> из 5 найдено</p>
    <div id="leakLog"></div>
  </section>

  <!-- 3. Драг-н-дроп воронка -->
  <section class="content-block">
    <p class="lede">Разбор 03 · Перетаскивание</p>
    <h2>Соберите воронку продажи билетов правильно</h2>
    <p class="hint">Перетащите карточки за ⠿, чтобы выстроить верный порядок этапов — от первого касания до повторной покупки.</p>
    <ul class="sort-list" id="sortList">
      <li class="sort-item" data-step="1"><span class="sort-handle">⠿</span> Реклама или пост в соцсетях</li>
      <li class="sort-item" data-step="2"><span class="sort-handle">⠿</span> Страница парка с ценами</li>
      <li class="sort-item" data-step="3"><span class="sort-handle">⠿</span> Онлайн-покупка билета</li>
      <li class="sort-item" data-step="4"><span class="sort-handle">⠿</span> Визит + допродажи в парке</li>
      <li class="sort-item" data-step="5"><span class="sort-handle">⠿</span> Повторная покупка или абонемент</li>
    </ul>
    <button class="sort-check-btn" id="sortCheckBtn" type="button">Проверить порядок</button>
    <p class="sort-feedback" id="sortFeedback"></p>
  </section>

  <!-- 4. Свайп-карточки -->
  <section class="content-block">
    <p class="lede">Разбор 04 · Свайп</p>
    <h2>Это про вас?</h2>
    <p class="hint">Смахните карточку вправо, если это про ваш парк, влево — если нет. Или используйте кнопки.</p>
    <div class="swipe-stack" id="swipeStack"></div>
    <div class="swipe-btns">
      <button class="swipe-btn no" id="swipeNoBtn" type="button">👎 Не про нас</button>
      <button class="swipe-btn yes" id="swipeYesBtn" type="button">👍 Это у нас</button>
    </div>
    <p class="swipe-progress" id="swipeProgress"></p>
    <p class="swipe-verdict" id="swipeVerdict"></p>
  </section>

  <!-- 5. Спидометр "хаос-система" -->
  <section class="content-block">
    <p class="lede">Разбор 05 · Шкала</p>
    <h2>От хаоса до системы — где сейчас продажи билетов?</h2>
    <p class="hint">Подвиньте ползунок туда, где честно находитесь сейчас.</p>
    <div class="gauge-wrap">
      <svg class="gauge-svg" viewBox="0 0 220 130">
        <path d="M20,110 A90,90 0 0,1 200,110" fill="none" stroke="#F0DEB8" stroke-width="16" stroke-linecap="round"/>
        <line id="chaosNeedle" class="gauge-needle" x1="110" y1="110" x2="110" y2="30" stroke="#E63946" stroke-width="6" stroke-linecap="round" style="transform: rotate(0deg);"/>
        <circle cx="110" cy="110" r="8" fill="#2A1E1A"/>
      </svg>
      <input class="gauge-range" id="chaosRange" type="range" min="0" max="100" value="50">
      <p class="gauge-text" id="chaosText">Есть отдельные процессы, но они не связаны в систему.</p>
    </div>
  </section>

  <!-- 6. Игра на память -->
  <section class="content-block">
    <p class="lede">Разбор 06 · Память</p>
    <h2>Найдите пары: проблема → решение</h2>
    <p class="hint">Открывайте по две карточки. Совпала пара — она остаётся открытой.</p>
    <div class="memory-grid" id="memoryGrid"></div>
    <p class="memory-status" id="memoryStatus">Все 4 пары найдены — вот ваши главные точки роста 👆</p>
  </section>

  <!-- 7. Таймлайн-скраббер -->
  <section class="content-block">
    <p class="lede">Разбор 07 · Таймлайн</p>
    <h2>Сезон по дням: цена промедления</h2>
    <p class="hint">Потяните ползунок — посмотрите, как растут выручка и упущенные деньги день за днём (на примере среднего парка: 350 гостей в день, чек 900 ₽, 22% теряется на воронке).</p>
    <div class="card-surface">
      <p class="timeline-day" id="timelineDay">День 1 из 100</p>
      <div class="timeline-track">
        <div class="timeline-fill" id="timelineFill" style="width:1%;"></div>
        <div class="timeline-marker" id="timelineMarker" style="left:1%;">🎡</div>
      </div>
      <input class="timeline-range" id="timelineRange" type="range" min="1" max="100" value="1">
      <div class="timeline-stats">
        <div class="timeline-stat gain"><b id="timelineGain">0 ₽</b><span>заработано накопленным итогом</span></div>
        <div class="timeline-stat loss"><b id="timelineLoss">0 ₽</b><span>упущено накопленным итогом</span></div>
      </div>
      <p class="timeline-note">Цифры — иллюстративные средние по рынку, не ваши данные. Ваш личный расчёт — в следующем блоке.</p>
    </div>
  </section>

  <!-- 8. Калькулятор + донат-диаграмма -->
  <section class="content-block">
    <p class="lede">Разбор 08 · Калькулятор</p>
    <h2>Сколько теряете вы — с вашими цифрами</h2>
    <div class="card-surface">
      <div class="calc-field">
        <label for="calcVisitors">Посетителей в парке за день</label>
        <input type="number" id="calcVisitors" inputmode="numeric" placeholder="Например, 400" min="0">
      </div>
      <div class="calc-field">
        <label for="calcLost">Доля тех, кто интересовался, но не купил билет онлайн (%)</label>
        <input type="number" id="calcLost" inputmode="numeric" placeholder="Например, 25" min="0" max="100">
      </div>
      <div class="calc-field">
        <label for="calcCheck">Средний чек одного посетителя, ₽</label>
        <input type="number" id="calcCheck" inputmode="numeric" placeholder="Например, 1200" min="0">
      </div>
      <div class="donut-wrap">
        <div class="donut-box">
          <svg viewBox="0 0 140 140" width="140" height="140">
            <circle cx="70" cy="70" r="60" fill="none" style="stroke: var(--teal);" stroke-width="18"/>
            <circle id="donutLostArc" cx="70" cy="70" r="60" fill="none" style="stroke: var(--red);" stroke-width="18" stroke-dasharray="0 377" stroke-linecap="round" transform="rotate(-90 70 70)"/>
          </svg>
          <div class="donut-center-label">
            <span id="donutCenterPct" style="font-size:22px; font-weight:800; color:var(--red); display:block;">0%</span>
            <span style="font-size:10px; color:var(--ink-soft);">теряется</span>
          </div>
        </div>
        <div class="donut-legend">
          <div><span class="donut-dot" style="background:var(--teal);"></span> Выручка получена</div>
          <div><span class="donut-dot" style="background:var(--red);"></span> Выручка потеряна</div>
        </div>
      </div>
      <p class="calc-result-line">Упущено за день: <b id="calcDayResult">0 ₽</b> · за сезон (100 дней): <b id="calcSeasonResult">0 ₽</b></p>
    </div>
  </section>

  <!-- 9. Чек-лист (питает спидометр 10) -->
  <section class="content-block">
    <p class="lede">Разбор 09 · Чек-лист</p>
    <h2>Отметьте, что уже есть</h2>
    <div class="card-surface checklist" id="checklist1" data-storage-key="parkflow-demo-checklist-v2">
      <p class="checklist-progress"><span class="done-count">0</span> из <span class="total-count">6</span> отмечено</p>
      <label><input type="checkbox"> Билет можно купить онлайн за 2 клика с телефона</label>
      <label><input type="checkbox"> На сайте есть онлайн-касса без звонка администратору</label>
      <label><input type="checkbox"> Есть ремаркетинг на тех, кто зашёл, но не купил билет</label>
      <label><input type="checkbox"> Собираете контакты у тех, кто не купил, чтобы вернуть их позже</label>
      <label><input type="checkbox"> В межсезонье есть отдельная воронка — абонементы или сертификаты</label>
      <label><input type="checkbox"> Знаете точную конверсию из захода на сайт в купленный билет</label>
    </div>
  </section>

  <!-- 10. Спидометр-скор -->
  <section class="content-block">
    <p class="lede">Разбор 10 · Спидометр</p>
    <h2>Ваш скор по итогам чек-листа</h2>
    <div class="gauge-wrap">
      <svg class="gauge-svg" viewBox="0 0 220 130">
        <path d="M20,110 A90,90 0 0,1 65,32" fill="none" style="stroke: var(--red);" stroke-width="16" stroke-linecap="round"/>
        <path d="M65,32 A90,90 0 0,1 155,32" fill="none" style="stroke: var(--gold);" stroke-width="16" stroke-linecap="round"/>
        <path d="M155,32 A90,90 0 0,1 200,110" fill="none" style="stroke: var(--teal);" stroke-width="16" stroke-linecap="round"/>
        <line id="scoreNeedle" class="gauge-needle" x1="110" y1="110" x2="110" y2="30" stroke="#2A1E1A" stroke-width="6" stroke-linecap="round" style="transform: rotate(-90deg);"/>
        <circle cx="110" cy="110" r="8" fill="#2A1E1A"/>
      </svg>
      <p class="gauge-score" id="scoreText">Отметьте пункты чек-листа выше — стрелка сдвинется сама.</p>
    </div>
  </section>

  <!-- 11. Скретч-билет + финальный CTA -->
  <section class="content-block">
    <p class="lede">Разбор 11 · Скретч-билет</p>
    <h2>Сотрите билет — там бонус</h2>
    <div class="scratch-wrap">
      <div class="scratch-reveal">
        <h3>🎟️ Билет открыт!</h3>
        <p>Бесплатный 20-минутный разбор воронки продажи билетов + список ваших 3 главных точек утечки.</p>
      </div>
      <canvas class="scratch-canvas" id="scratchCanvas"></canvas>
    </div>
    <button class="scratch-fallback" id="scratchFallbackBtn" type="button">Не получается — открыть билет</button>

    <div class="final-cta">
      <h2>Разберём вашу воронку бесплатно</h2>
      <p>20 минут созвона — покажем, где именно ваш парк теряет выручку, и что сделать в первую очередь до конца сезона.</p>
      <form id="lead-form" data-webhook="/api/leadmagnet2-submit">
        <input type="text" name="name" placeholder="Как к вам обращаться" required>
        <input type="text" name="park" placeholder="Название парка" required>
        <input type="tel" name="contact" placeholder="Телефон или Telegram" required>
        <button type="submit">Записаться на разбор</button>
        <p class="form-status"></p>
      </form>
    </div>
  </section>

</main>

<footer>
  ParkFlow — growth-агентство для парков развлечений (демо-бренд)
  <span class="demo-footer-note">Страница — демонстрация 10 разных интерактивных механик, данные и кейсы вымышлены.</span>
</footer>

<script>
(function () {
  var METRICA_COUNTER_ID = 00000000;

  var bar = document.getElementById('reading-progress');
  window.addEventListener('scroll', function () {
    var h = document.documentElement;
    var scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    bar.style.width = Math.min(100, Math.max(0, scrolled)) + '%';
  }, { passive: true });

  function reachGoal(name) {
    if (typeof ym === 'function') {
      try { ym(METRICA_COUNTER_ID, 'reachGoal', name); } catch (e) {}
    }
  }

  /* ── 1. Колесо фортуны ────────────────────────────────── */
  (function () {
    var wheel = document.getElementById('wheel');
    var btn = document.getElementById('wheelBtn');
    var resultEl = document.getElementById('wheelResult');
    var facts = [
      'Сезонный парк живёт всего 90-120 дней в году — каждый погожий день на счету.',
      'Типично до 25% выручки теряется именно на этапе покупки билета, а не привлечения гостя.',
      'Ремаркетинг на тех, кто зашёл и не купил, обычно возвращает до трети отказников.',
      'Абонементы и подарочные сертификаты — способ заработать даже в межсезонье.',
      'Быстрая онлайн-касса без звонка администратору заметно поднимает конверсию.',
      'Для индор-парков будни — главный неиспользованный резерв роста.',
      'Отзывы и рейтинг в картах часто решают, придёт ли гость вообще.',
      'Погода — это не оправдание, а часть воронки, которую можно и нужно учитывать.'
    ];
    var currentRotation = 0;
    var spinning = false;
    btn.addEventListener('click', function () {
      if (spinning) return;
      spinning = true;
      btn.disabled = true;
      resultEl.style.display = 'none';
      var extra = 360 * 5 + Math.floor(Math.random() * 360);
      currentRotation += extra;
      wheel.style.transform = 'rotate(' + currentRotation + 'deg)';
      setTimeout(function () {
        var normalized = currentRotation % 360;
        var targetAngle = (360 - normalized) % 360;
        var index = Math.floor(targetAngle / 45) % 8;
        resultEl.textContent = facts[index];
        resultEl.style.display = 'block';
        btn.disabled = false;
        spinning = false;
        reachGoal('wheel_spun');
      }, 4100);
    });
  })();

  /* ── 2. Карта утечек ──────────────────────────────────── */
  (function () {
    var map = document.getElementById('parkMap');
    var foundEl = document.getElementById('leakFound');
    var log = document.getElementById('leakLog');
    var found = 0;
    map.querySelectorAll('.hotspot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        if (dot.classList.contains('found')) return;
        dot.classList.add('found');
        found++;
        foundEl.textContent = found;
        var item = document.createElement('div');
        item.className = 'leak-log-item';
        item.textContent = dot.getAttribute('data-leak');
        log.appendChild(item);
        if (found === 5) reachGoal('leaks_found_all');
      });
    });
  })();

  /* ── 3. Драг-н-дроп воронка ───────────────────────────── */
  (function () {
    var list = document.getElementById('sortList');
    var checkBtn = document.getElementById('sortCheckBtn');
    var feedback = document.getElementById('sortFeedback');
    var items = Array.prototype.slice.call(list.children);
    // shuffle (Fisher-Yates), ensure not already sorted
    function shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
    var order;
    do {
      order = shuffle(items.slice());
    } while (order.every(function (el, i) { return el.getAttribute('data-step') === String(i + 1); }));
    order.forEach(function (el) { list.appendChild(el); });

    var dragEl = null;
    function getAfterElement(container, y) {
      var els = Array.prototype.slice.call(container.querySelectorAll('.sort-item:not(.dragging)'));
      var closest = { offset: -Infinity, element: null };
      els.forEach(function (child) {
        var box = child.getBoundingClientRect();
        var offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) closest = { offset: offset, element: child };
      });
      return closest.element;
    }
    list.querySelectorAll('.sort-handle').forEach(function (handle) {
      handle.addEventListener('pointerdown', function (e) {
        dragEl = handle.closest('.sort-item');
        dragEl.classList.add('dragging');
        try { handle.setPointerCapture(e.pointerId); } catch (err) {}
      });
    });
    list.addEventListener('pointermove', function (e) {
      if (!dragEl) return;
      var after = getAfterElement(list, e.clientY);
      if (after == null) list.appendChild(dragEl); else list.insertBefore(dragEl, after);
    });
    window.addEventListener('pointerup', function () {
      if (dragEl) { dragEl.classList.remove('dragging'); dragEl = null; }
    });

    checkBtn.addEventListener('click', function () {
      var current = Array.prototype.slice.call(list.querySelectorAll('.sort-item'));
      var ok = current.every(function (el, i) { return el.getAttribute('data-step') === String(i + 1); });
      current.forEach(function (el) { el.classList.remove('wrong'); });
      if (ok) {
        feedback.textContent = 'Точно! Это и есть правильная последовательность воронки.';
        feedback.className = 'sort-feedback ok';
        reachGoal('funnel_sorted');
      } else {
        current.forEach(function (el, i) { if (el.getAttribute('data-step') !== String(i + 1)) el.classList.add('wrong'); });
        feedback.textContent = 'Пока не совсем — подсвеченные карточки стоят не на своём месте.';
        feedback.className = 'sort-feedback no';
      }
    });
  })();

  /* ── 4. Свайп-карточки ────────────────────────────────── */
  (function () {
    var statements = [
      'Билет иногда покупают только через звонок администратору',
      'Соцсети активны, а понятного сайта с ценами нет',
      'О тех, кто не купил билет, мы больше не вспоминаем',
      'В межсезонье про маркетинг как будто забывают',
      'Точную конверсию сайта в купленный билет никто не назовёт',
      'Абонементов или подарочных сертификатов нет вообще'
    ];
    var stack = document.getElementById('swipeStack');
    var progressEl = document.getElementById('swipeProgress');
    var verdictEl = document.getElementById('swipeVerdict');
    var btnsWrap = document.querySelector('.swipe-btns');
    var yesBtn = document.getElementById('swipeYesBtn');
    var noBtn = document.getElementById('swipeNoBtn');
    var idx = 0, yesCount = 0;

    function render() {
      stack.innerHTML = '';
      if (idx >= statements.length) {
        progressEl.textContent = statements.length + ' из ' + statements.length;
        verdictEl.style.display = 'block';
        verdictEl.textContent = 'Совпало ' + yesCount + ' из ' + statements.length + (yesCount >= 4 ? ' — есть, над чем поработать в первую очередь.' : ' — база крепкая, но сверьте детали в чек-листе ниже.');
        btnsWrap.style.display = 'none';
        reachGoal('swipe_finished');
        return;
      }
      progressEl.textContent = idx + ' из ' + statements.length;
      var visible = statements.slice(idx, idx + 3);
      visible.forEach(function (text, i) {
        var card = document.createElement('div');
        card.className = 'swipe-card';
        card.style.zIndex = String(10 - i);
        card.style.transform = 'scale(' + (1 - i * 0.05) + ') translateY(' + (i * 10) + 'px)';
        card.textContent = text;
        stack.appendChild(card);
        if (i === 0) attachDrag(card);
      });
    }

    function attachDrag(card) {
      var startX = 0, dx = 0, dragging = false;
      card.addEventListener('pointerdown', function (e) {
        dragging = true; startX = e.clientX;
        try { card.setPointerCapture(e.pointerId); } catch (err) {}
      });
      card.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        dx = e.clientX - startX;
        card.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 14) + 'deg)';
      });
      card.addEventListener('pointerup', function () {
        if (!dragging) return;
        dragging = false;
        if (Math.abs(dx) > 80) { swipeOut(card, dx > 0); } else { card.style.transform = ''; }
        dx = 0;
      });
    }

    function swipeOut(card, yes) {
      card.style.transition = 'transform .35s ease, opacity .35s ease';
      card.style.transform = 'translateX(' + (yes ? 600 : -600) + 'px) rotate(' + (yes ? 25 : -25) + 'deg)';
      card.style.opacity = '0';
      if (yes) yesCount++;
      idx++;
      reachGoal('swipe_answered');
      setTimeout(render, 260);
    }

    yesBtn.addEventListener('click', function () { var top = stack.querySelector('.swipe-card'); if (top) swipeOut(top, true); });
    noBtn.addEventListener('click', function () { var top = stack.querySelector('.swipe-card'); if (top) swipeOut(top, false); });

    render();
  })();

  /* ── 5. Спидометр хаос-система ────────────────────────── */
  (function () {
    var range = document.getElementById('chaosRange');
    var needle = document.getElementById('chaosNeedle');
    var text = document.getElementById('chaosText');
    function update() {
      var v = parseInt(range.value, 10);
      needle.style.transform = 'rotate(' + (v / 100 * 180 - 90) + 'deg)';
      text.textContent = v < 34
        ? 'Хаос: билеты продаются как получится, единой воронки нет.'
        : v < 67
        ? 'Есть отдельные процессы, но они не связаны в систему.'
        : 'Почти система — осталось закрыть пару дыр, и воронка станет предсказуемой.';
    }
    range.addEventListener('input', update);
    update();
  })();

  /* ── 6. Игра на память ────────────────────────────────── */
  (function () {
    var pairs = [
      { id: 1, text: 'Проблема: билет нельзя купить без звонка' },
      { id: 1, text: 'Решение: онлайн-касса за 2 клика' },
      { id: 2, text: 'Проблема: отказники исчезают навсегда' },
      { id: 2, text: 'Решение: ремаркетинг по контактам' },
      { id: 3, text: 'Проблема: в межсезонье — тишина' },
      { id: 3, text: 'Решение: абонементы и сертификаты заранее' },
      { id: 4, text: 'Проблема: конверсия в билет — загадка' },
      { id: 4, text: 'Решение: сквозная аналитика воронки' }
    ];
    for (var i = pairs.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pairs[i]; pairs[i] = pairs[j]; pairs[j] = t;
    }
    var grid = document.getElementById('memoryGrid');
    var statusEl = document.getElementById('memoryStatus');
    var firstCard = null, firstIndex = null, lock = false, matched = 0;

    pairs.forEach(function (pair, idx) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'memory-card';
      card.innerHTML = '<span class="memory-back">🎫</span>';
      card.addEventListener('click', function () {
        if (lock || card.classList.contains('matched') || card === firstCard) return;
        card.classList.add('flipped');
        card.textContent = pair.text;
        if (!firstCard) { firstCard = card; firstIndex = idx; return; }
        lock = true;
        var isMatch = pairs[firstIndex].id === pair.id;
        if (isMatch) {
          firstCard.classList.add('matched');
          card.classList.add('matched');
          matched++;
          firstCard = null; lock = false;
          if (matched === 4) { statusEl.style.display = 'block'; reachGoal('memory_completed'); }
        } else {
          var f = firstCard;
          setTimeout(function () {
            f.classList.remove('flipped'); f.innerHTML = '<span class="memory-back">🎫</span>';
            card.classList.remove('flipped'); card.innerHTML = '<span class="memory-back">🎫</span>';
            firstCard = null; lock = false;
          }, 800);
        }
      });
      grid.appendChild(card);
    });
  })();

  /* ── 7. Таймлайн-скраббер ─────────────────────────────── */
  (function () {
    var range = document.getElementById('timelineRange');
    var fill = document.getElementById('timelineFill');
    var marker = document.getElementById('timelineMarker');
    var dayLabel = document.getElementById('timelineDay');
    var gainEl = document.getElementById('timelineGain');
    var lossEl = document.getElementById('timelineLoss');
    var potentialPerDay = 350 * 900;
    var lossShare = 0.22;
    function update() {
      var day = parseInt(range.value, 10);
      fill.style.width = day + '%';
      marker.style.left = day + '%';
      dayLabel.textContent = 'День ' + day + ' из 100';
      var dailyLoss = potentialPerDay * lossShare;
      var dailyGain = potentialPerDay - dailyLoss;
      gainEl.textContent = Math.round(dailyGain * day).toLocaleString('ru-RU') + ' ₽';
      lossEl.textContent = Math.round(dailyLoss * day).toLocaleString('ru-RU') + ' ₽';
    }
    range.addEventListener('input', update);
    update();
  })();

  /* ── 8. Калькулятор + донат ───────────────────────────── */
  (function () {
    var visitorsInput = document.getElementById('calcVisitors');
    var lostInput = document.getElementById('calcLost');
    var checkInput = document.getElementById('calcCheck');
    var dayResult = document.getElementById('calcDayResult');
    var seasonResult = document.getElementById('calcSeasonResult');
    var donutArc = document.getElementById('donutLostArc');
    var donutPct = document.getElementById('donutCenterPct');
    var circumference = 2 * Math.PI * 60;
    var goalSent = false;
    function update() {
      var visitors = parseFloat(visitorsInput.value) || 0;
      var lostPct = Math.min(100, Math.max(0, parseFloat(lostInput.value) || 0));
      var check = parseFloat(checkInput.value) || 0;
      var dayLoss = visitors * (lostPct / 100) * check;
      var seasonLoss = dayLoss * 100;
      dayResult.textContent = Math.round(dayLoss).toLocaleString('ru-RU') + ' ₽';
      seasonResult.textContent = Math.round(seasonLoss).toLocaleString('ru-RU') + ' ₽';
      var lostLen = circumference * (lostPct / 100);
      donutArc.setAttribute('stroke-dasharray', lostLen.toFixed(1) + ' ' + (circumference - lostLen).toFixed(1));
      donutPct.textContent = Math.round(lostPct) + '%';
      if (dayLoss > 0 && !goalSent) { reachGoal('calc_used'); goalSent = true; }
    }
    [visitorsInput, lostInput, checkInput].forEach(function (el) { el.addEventListener('input', update); });
    update();
  })();

  /* ── 9 + 10. Чек-лист и спидометр-скор ────────────────── */
  (function () {
    var list = document.getElementById('checklist1');
    var key = list.getAttribute('data-storage-key');
    var boxes = list.querySelectorAll('input[type="checkbox"]');
    var doneCount = list.querySelector('.done-count');
    var totalCount = list.querySelector('.total-count');
    var needle = document.getElementById('scoreNeedle');
    var scoreText = document.getElementById('scoreText');
    totalCount.textContent = boxes.length;

    function saved() {
      try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
    }
    function update() {
      var done = 0; var state = [];
      boxes.forEach(function (box, i) { if (box.checked) done++; state[i] = box.checked; });
      doneCount.textContent = done;
      try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {}
      var ratio = done / boxes.length;
      needle.style.transform = 'rotate(' + (ratio * 180 - 90) + 'deg)';
      scoreText.textContent = done + ' из ' + boxes.length + ' закрыто. ' + (
        ratio < 0.34 ? 'Пока много открытых точек утечки — есть, с чего начать.' :
        ratio < 0.67 ? 'Уже неплохая база, но воронка ещё не системная.' :
        'Сильный результат — осталось закрыть последние детали.'
      );
      if (done === boxes.length) reachGoal('checklist_completed');
    }
    var state = saved();
    boxes.forEach(function (box, i) { if (state[i]) box.checked = true; });
    update();
    boxes.forEach(function (box) { box.addEventListener('change', update); });
  })();

  /* ── 11. Скретч-билет ─────────────────────────────────── */
  (function () {
    var canvas = document.getElementById('scratchCanvas');
    var wrap = canvas.closest('.scratch-wrap');
    var fallbackBtn = document.getElementById('scratchFallbackBtn');
    var ctx = canvas.getContext('2d');
    var cells = {}, cellSize = 26, totalCells = 0, erasedCells = 0, revealed = false;

    function draw() {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#B9B4AD';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '700 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('потрите билет пальцем', canvas.width / 2, canvas.height / 2);
      ctx.globalCompositeOperation = 'destination-out';
      totalCells = Math.max(1, Math.ceil(canvas.width / cellSize) * Math.ceil(canvas.height / cellSize));
      cells = {}; erasedCells = 0; revealed = false;
      canvas.style.display = 'block';
      canvas.style.opacity = '1';
    }
    function size() {
      var r = wrap.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width));
      canvas.height = Math.max(1, Math.round(r.height));
      draw();
    }
    size();
    window.addEventListener('resize', size);

    function getPos(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function erase(x, y) {
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
      var key = Math.floor(x / cellSize) + '_' + Math.floor(y / cellSize);
      if (!cells[key]) { cells[key] = true; erasedCells++; }
      if (!revealed && erasedCells / totalCells > 0.45) { revealed = true; revealAll(); }
    }
    function revealAll() {
      canvas.style.transition = 'opacity .5s ease';
      canvas.style.opacity = '0';
      setTimeout(function () { canvas.style.display = 'none'; }, 500);
      reachGoal('scratch_revealed');
    }
    var scratching = false;
    canvas.addEventListener('pointerdown', function (e) {
      scratching = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      var p = getPos(e); erase(p.x, p.y);
    });
    canvas.addEventListener('pointermove', function (e) { if (scratching) { var p = getPos(e); erase(p.x, p.y); } });
    window.addEventListener('pointerup', function () { scratching = false; });
    fallbackBtn.addEventListener('click', revealAll);
  })();

  /* ── Финальная форма ───────────────────────────────────── */
  var form = document.getElementById('lead-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      var webhook = form.getAttribute('data-webhook');
      var data = Object.fromEntries(new FormData(form).entries());
      status.textContent = 'Отправляем...';
      fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error('bad status');
        status.textContent = 'Спасибо! Мы скоро свяжемся.';
        form.reset();
        reachGoal('lead_submit');
      }).catch(function () {
        status.textContent = 'Не получилось отправить. Попробуйте ещё раз или напишите нам напрямую.';
      });
    });
  }
})();
</script>

</body>
</html>
`;
}

// Фиксированные темы вопросов 2-4 — сам вопрос показывает фронт, сюда идёт
// только смысловое описание темы, чтобы модель понимала, о чём именно речь.
const QUIZ3_TOPICS = {
  2: "текущий рацион в течение дня (что и когда обычно ест человек)",
  3: "перекусы и режим приёмов пищи (регулярность, хаотичность)",
  4: "вода и напитки, а также пищевые ограничения или непереносимости"
};

const QUIZ3_GUARDRAILS = `Правила, которые нельзя нарушать:
- Никогда не называй конкретные цифры: калории, граммы БЖУ, дозировки нутриентов.
- Никогда не говори языком диагноза или назначения ("у вас дефицит X", "вам нужно принимать Y") — только мягкие направляющие формулировки ("стоит обратить внимание на...", "попробуйте добавить...").
- Давай только общие направляющие рекомендации, не конкретные протоколы питания.
- Если в ответах пользователя есть признаки серьёзных проблем (расстройства пищевого поведения, экстремальные ограничения, тревожные медицинские жалобы) — мягко порекомендуй обратиться к живому специалисту вместо советов по питанию в этом направлении.
- Ты вымышленный нутрициолог Анна Светлова в демо-продукте, тон тёплый, живой, без канцелярита.`;

function quiz3DialogueSystemPrompt(questionIndex, goal) {
  const topic = QUIZ3_TOPICS[questionIndex] || "рацион пользователя";
  return `Ты — Анна Светлова, нутрициолог, ведёшь короткий диалог с пользователем о его питании.
Цель пользователя: ${goal || "не указана"}.
Сейчас разговор находится на вопросе про тему: "${topic}".
Пользователь только что ответил на этот вопрос впервые — уточнение по этой теме ещё НЕ задавалось.
Твоя задача — решить: нужен ли РОВНО ОДИН уточняющий вопрос, чтобы ответ стал содержательным (например, ответ расплывчатый вроде "ем более-менее нормально", слишком короткий или обходит суть), или ответа уже достаточно, чтобы двигаться дальше.
Больше одного уточнения по этой теме задавать нельзя — если сомневаешься, лучше двигаться дальше.
${QUIZ3_GUARDRAILS}
Ответь СТРОГО в виде JSON без пояснений, markdown и \`\`\`json оболочки, ровно по схеме:
{"action":"followup","message":"короткий тёплый уточняющий вопрос по теме"}
или
{"action":"advance","message":"короткая тёплая реакция на ответ пользователя в 1 фразу (без нового вопроса)"}
"action" — строго "followup" или "advance". "message" — не длиннее 2 предложений.`;
}

const QUIZ3_DIALOGUE_FALLBACK = {
  action: "advance",
  message: "Поняла, спасибо! Это уже даёт хорошую картину.",
  _fallback: true
};

async function apiQuiz3Dialogue(request, env) {
  if (request.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResp({ error: "Некорректный JSON" }, 400);
  }

  const questionIndex = Number(body.questionIndex);
  const goal = String(body.goal || "").trim();
  const history = Array.isArray(body.history) ? body.history : [];

  if (![2, 3, 4].includes(questionIndex) || !history.length) {
    return jsonResp({ error: "Некорректные данные диалога" }, 400);
  }

  const system = quiz3DialogueSystemPrompt(questionIndex, goal);
  const result = await callClaudeQuiz3Json(env, {
    system,
    messages: history,
    validate: (p) => p && (p.action === "followup" || p.action === "advance") && typeof p.message === "string"
  });

  return jsonResp(result || QUIZ3_DIALOGUE_FALLBACK);
}

const QUIZ3_RESULT_SYSTEM_PROMPT = `Ты — Анна Светлова, нутрициолог. Пользователь только что прошёл с тобой короткий диалог о своём питании (цель + рацион + перекусы/режим + вода/ограничения, с уточнениями там, где было нужно).
На основе всей истории диалога сформируй персональный разбор рациона.
${QUIZ3_GUARDRAILS}
Ответь СТРОГО в виде JSON без пояснений, markdown и \`\`\`json оболочки, ровно по схеме:
{"summary":"короткое резюме текущего рациона в 1-2 предложения","balance_score":6,"blocks":[{"title":"Режим питания","status":"warning","text":"..."},{"title":"Разнообразие рациона","status":"good","text":"..."},{"title":"Вода и напитки","status":"bad","text":"..."},{"title":"Что учесть по цели","status":"warning","text":"..."}],"next_steps":["шаг 1","шаг 2","шаг 3"]}
Правила: "balance_score" — целое число от 1 до 10. "status" у каждого блока — строго одно из "good"/"warning"/"bad". Блоков всегда ровно 4, именно с этими 4 заголовками и в этом порядке: "Режим питания", "Разнообразие рациона", "Вода и напитки", "Что учесть по цели" (последний блок — с учётом цели пользователя, без цифр и диагнозов). "next_steps" — 3 коротких направляющих пункта без конкретных цифр и протоколов.`;

const QUIZ3_FALLBACK_RESULT = {
  summary: "Питание в целом на плаву, но есть нерегулярность в режиме и мало внимания к воде — небольшие корректировки дадут заметный эффект.",
  balance_score: 6,
  blocks: [
    { title: "Режим питания", status: "warning", text: "Приёмы пищи скорее хаотичные — время от времени случаются большие паузы, из-за которых потом сложнее контролировать голод." },
    { title: "Разнообразие рациона", status: "good", text: "В рационе присутствуют разные группы продуктов, это хорошая база — важно сохранить это разнообразие и дальше." },
    { title: "Вода и напитки", status: "bad", text: "Похоже, что чистой воды в течение дня пьётся мало, а её роль в самочувствии и аппетите часто недооценивают." },
    { title: "Что учесть по цели", status: "warning", text: "Для выбранной цели стоит в первую очередь выровнять регулярность приёмов пищи — это даст больше эффекта, чем резкие ограничения." }
  ],
  next_steps: [
    "Постараться есть примерно в одно и то же время, без больших пропусков",
    "Держать под рукой воду и постепенно увеличивать её долю среди напитков за день",
    "Добавить в рацион больше клетчатки — овощи, зелень, цельные продукты"
  ],
  _fallback: true
};

async function apiQuiz3Result(request, env) {
  if (request.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResp({ error: "Некорректный JSON" }, 400);
  }

  const history = Array.isArray(body.history) ? body.history : [];
  if (!history.length) return jsonResp({ error: "Нет истории диалога" }, 400);

  const result = await callClaudeQuiz3Json(env, {
    system: QUIZ3_RESULT_SYSTEM_PROMPT,
    messages: history,
    validate: (p) =>
      p &&
      typeof p.summary === "string" &&
      typeof p.balance_score === "number" &&
      Array.isArray(p.blocks) &&
      Array.isArray(p.next_steps)
  });

  return jsonResp(result || QUIZ3_FALLBACK_RESULT);
}

// Общий вызов Claude для квиза 3: принимает уже готовый массив messages
// (полная история диалога, как того требует архитектура — Worker не хранит
// состояние сам, а получает весь контекст на каждый шаг).
async function callClaudeQuiz3Json(env, { system, messages, validate }) {
  if (!env.CLAUDE_API) return null;

  const cleanMessages = messages
    .filter(m => m && typeof m.content === "string" && m.content.trim())
    .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content.trim() }));

  if (!cleanMessages.length) return null;

  const reqBody = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    system,
    messages: cleanMessages
  };

  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 14000);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.CLAUDE_API,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(reqBody)
      });
      clearTimeout(timeout);

      if (res.status === 429 && attempts < 3) {
        await new Promise(r => setTimeout(r, 1000 * attempts));
        continue;
      }
      if (!res.ok) throw new Error(`Claude ${res.status}`);

      const data = await res.json();
      const text = data.content?.filter(b => b.type === "text")?.map(b => b.text)?.join("") ?? "";
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());

      if (!validate(parsed)) return null;
      return parsed;
    } catch (e) {
      if (attempts >= 3) return null;
    }
  }
  return null;
}

// ══════════════════════════════════════════════
// РАНДОМ КОФЕ — API
// ══════════════════════════════════════════════

const COFFEE_WEEK = () => {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

async function apiCoffeeJoin(request, env) {
  if (request.method !== 'POST') return jsonResp({ error: 'Method not allowed' }, 405);
  try {
    const { tgId, name, city, bio, request: userRequest, skills, active } = await request.json();
    if (!tgId) return jsonResp({ ok: false, error: 'No tgId' });

    const existing = await env.KV.get(`coffee:user:${tgId}`, 'json') || {};
    // Подтянуть username из botuser если не пришёл явно
    const botuserData = await env.KV.get(`botuser:${tgId}`, 'json');
    const resolvedUsername = botuserData?.username || existing.username || null;
    const profile = {
      ...existing,
      tgId, name, city, bio,
      username: resolvedUsername,  // ← новое поле
      request: userRequest,
      skills: skills || [],
      active: active !== undefined ? active : true, // по умолчанию true
      joinedAt: existing.joinedAt || Date.now(),
      updatedAt: Date.now()
    };
    await env.KV.put(`coffee:user:${tgId}`, JSON.stringify(profile));

    // Добавить в индекс участников
    const idx = await env.KV.get('coffee:participants', 'json') || [];
    if (!idx.includes(tgId)) {
      idx.push(tgId);
      await env.KV.put('coffee:participants', JSON.stringify(idx));
    }

    return jsonResp({ ok: true });
  } catch(err) {
    await notifyAdminError(env, 'apiCoffeeJoin', err);
    return jsonResp({ ok: false, error: 'internal' }, 500);
  }
}

async function apiCoffeeProfile(request, env) {
  if (request.method !== 'POST') return jsonResp({ error: 'Method not allowed' }, 405);
  try {
    const { tgId, ...fields } = await request.json();
    if (!tgId) return jsonResp({ ok: false, error: 'No tgId' });

    const profile = await env.KV.get(`coffee:user:${tgId}`, 'json');
    if (!profile) return jsonResp({ ok: false, error: 'Not found' });

    const updated = { ...profile, ...fields, updatedAt: Date.now() };
    await env.KV.put(`coffee:user:${tgId}`, JSON.stringify(updated));
    return jsonResp({ ok: true });
  } catch(err) {
    await notifyAdminError(env, 'apiCoffeeProfile', err);
    return jsonResp({ ok: false, error: 'internal' }, 500);
  }
}

async function apiCoffeeToggle(request, env) {
  if (request.method !== 'POST') return jsonResp({ error: 'Method not allowed' }, 405);
  try {
    const { tgId } = await request.json();
    if (!tgId) return jsonResp({ ok: false });

    const profile = await env.KV.get(`coffee:user:${tgId}`, 'json');
    if (!profile) return jsonResp({ ok: false, error: 'Not found' });

    profile.active = !profile.active;
    profile.updatedAt = Date.now();
    await env.KV.put(`coffee:user:${tgId}`, JSON.stringify(profile));
    return jsonResp({ ok: true, active: profile.active });
  } catch(err) {
    await notifyAdminError(env, 'apiCoffeeToggle', err);
    return jsonResp({ ok: false, error: 'internal' }, 500);
  }
}

async function apiCoffeeStatus(request, env) {
  const tgId = new URL(request.url).searchParams.get('tgId');
  if (!tgId) return jsonResp({ ok: false });

  try {
  const profile = await env.KV.get(`coffee:user:${tgId}`, 'json');
  const match = await env.KV.get(`coffee:match:${tgId}`, 'json');
  const history = await env.KV.get(`coffee:history:${tgId}`, 'json') || [];

  // Для текущего матча подгрузить профиль партнёра
  let partnerProfile = null;
if (match?.partnerId) {
  partnerProfile = await env.KV.get(`coffee:user:${match.partnerId}`, 'json');
  // Подтянуть username из botuser если не сохранён в профиле кофе
  if (partnerProfile && !partnerProfile.username) {
    const partnerBotuser = await env.KV.get(`botuser:${match.partnerId}`, 'json');
    if (partnerBotuser?.username) {
      partnerProfile = { ...partnerProfile, username: partnerBotuser.username };
    }
  }
}

  // Для истории подгрузить имена партнёров и взаимные оценки
  const historyEnriched = await Promise.all(history.map(async (h) => {
    const partner = await env.KV.get(`coffee:user:${h.partnerId}`, 'json');
    const myRating = await env.KV.get(`coffee:rating:${tgId}:${h.weekId}`, 'json');
    const theirRating = await env.KV.get(`coffee:rating:${h.partnerId}:${h.weekId}`, 'json');
    return {
      ...h,
      partnerName: partner?.name || '—',
      partnerCity: partner?.city || '',
      myRating: myRating || null,
      theirRating: myRating ? (theirRating || null) : null // показываем только если сам уже оценил
    };
  }));

  // Средний рейтинг пользователя (по оценкам ДРУГИХ о нём)
  const ratingsAboutMe = await Promise.all(
    history.map(h => env.KV.get(`coffee:rating:${h.partnerId}:${h.weekId}`, 'json'))
  );
  const validRatings = ratingsAboutMe.filter(r => r?.stars);
  const avgRating = validRatings.length
    ? (validRatings.reduce((s, r) => s + r.stars, 0) / validRatings.length).toFixed(1)
    : null;

  return jsonResp({
    ok: true,
    profile,
    match: match ? { ...match, partnerProfile } : null,
    history: historyEnriched,
    avgRating,
    totalMeetings: history.length
  });
  } catch(err) {
    await notifyAdminError(env, 'apiCoffeeStatus', err);
    return jsonResp({ ok: false, error: 'internal' }, 500);
  }
}

async function apiCoffeeRate(request, env) {
  if (request.method !== 'POST') return jsonResp({ error: 'Method not allowed' }, 405);
  try {
  const { tgId, weekId, stars, complaint, note } = await request.json();
  if (!tgId || !weekId) return jsonResp({ ok: false });

  const rating = { stars, complaint: complaint || false, note: note || '', createdAt: Date.now() };
  await env.KV.put(`coffee:rating:${tgId}:${weekId}`, JSON.stringify(rating));

  // Обновить статус в матче
  const match = await env.KV.get(`coffee:match:${tgId}`, 'json');
  if (match) {
    match.status = complaint ? 'complained' : 'done';
    await env.KV.put(`coffee:match:${tgId}`, JSON.stringify(match));
  }

  // Обновить статус в истории
  const history = await env.KV.get(`coffee:history:${tgId}`, 'json') || [];
  const entry = history.find(h => h.weekId === weekId);
  if (entry) {
    entry.rated = true;
    entry.stars = stars;
    entry.complaint = complaint || false;
    await env.KV.put(`coffee:history:${tgId}`, JSON.stringify(history));
  }

  // Если жалоба — записать в очередь для админа
  if (complaint) {
    const complaints = await env.KV.get('coffee:complaints', 'json') || [];
    complaints.unshift({
      fromId: tgId,
      toId: match?.partnerId,
      weekId,
      note,
      createdAt: Date.now(),
      resolved: false
    });
    await env.KV.put('coffee:complaints', JSON.stringify(complaints));
  }

  return jsonResp({ ok: true });
  } catch(err) {
    await notifyAdminError(env, 'apiCoffeeRate', err);
    return jsonResp({ ok: false, error: 'internal' }, 500);
  }
}

// ══════════════════════════════════════════════
// РАНДОМ КОФЕ — ADMIN API
// ══════════════════════════════════════════════

async function apiAdminCoffee(request, env, url) {
  // Простая проверка — тот же пароль что у основной админки
  const auth = request.headers.get("Authorization") || "";
if (!auth.includes("admin_session_" + ADMIN_PASSWORD)) {
  return jsonResp({ error: "Unauthorized" }, 401);
}

  const sub = url.pathname.replace('/api/admin/coffee', '') || '/';

  // GET /api/admin/coffee — дашборд
  if (request.method === 'GET' && sub === '/') {
    const idx = await env.KV.get('coffee:participants', 'json') || [];
    const participants = await Promise.all(idx.map(async (tgId) => {
      const profile = await env.KV.get(`coffee:user:${tgId}`, 'json');
      const match = await env.KV.get(`coffee:match:${tgId}`, 'json');
      const history = await env.KV.get(`coffee:history:${tgId}`, 'json') || [];
      const ratingsAboutMe = await Promise.all(
        history.map(h => env.KV.get(`coffee:rating:${h.partnerId}:${h.weekId}`, 'json'))
      );
      const validRatings = ratingsAboutMe.filter(r => r?.stars);
      const avgRating = validRatings.length
        ? (validRatings.reduce((s, r) => s + r.stars, 0) / validRatings.length).toFixed(1)
        : null;
      return { ...profile, currentMatch: match, totalMeetings: history.length, avgRating };
    }));
    const complaints = await env.KV.get('coffee:complaints', 'json') || [];
    const weekId = COFFEE_WEEK();
    const round = await env.KV.get(`coffee:round:${weekId}`, 'json') || null;
    return jsonResp({ ok: true, participants, complaints, round, weekId });
  }

  // GET /api/admin/coffee/history — история по неделям
  if (request.method === 'GET' && sub === '/history') {
    const roundKeys = await env.KV.list({ prefix: 'coffee:round:' });
    const rounds = (await Promise.all(roundKeys.keys.map(k => env.KV.get(k.name, 'json')))).filter(Boolean);
    const idx = await env.KV.get('coffee:participants', 'json') || [];
    const profiles = {};
    await Promise.all(idx.map(async tgId => { profiles[tgId] = await env.KV.get(`coffee:user:${tgId}`, 'json'); }));
    const weeks = await Promise.all(rounds.map(async round => {
      const pairs = await Promise.all((round.pairs || []).map(async pair => {
        const ratingA = await env.KV.get(`coffee:rating:${pair.a}:${round.weekId}`, 'json');
        const ratingB = await env.KV.get(`coffee:rating:${pair.b}:${round.weekId}`, 'json');
        return {
          a: pair.a, b: pair.b,
          nameA: profiles[pair.a]?.name || String(pair.a),
          nameB: profiles[pair.b]?.name || String(pair.b),
          ratingA: ratingA || null, ratingB: ratingB || null
        };
      }));
      return { weekId: round.weekId, sentAt: round.sentAt, createdAt: round.createdAt, auto: !!round.auto, pairs };
    }));
    weeks.sort((a, b) => String(b.weekId).localeCompare(String(a.weekId)));
    return jsonResp({ ok: true, weeks });
  }

  // POST /api/admin/coffee/generate — автоматически сформировать пары на текущую неделю (избегая повторов)
  if (request.method === 'POST' && sub === '/generate') {
    const weekId = COFFEE_WEEK();
    const existing = await env.KV.get(`coffee:round:${weekId}`, 'json');
    if (existing?.sentAt) return jsonResp({ ok: false, error: `Пары на ${weekId} уже отправлены` });
    const round = await coffeeAutoGeneratePairs(env, weekId);
    return jsonResp({ ok: true, round });
  }

  // POST /api/admin/coffee/ignore-complaint — закрыть жалобу без переназначения
  if (request.method === 'POST' && sub === '/ignore-complaint') {
    const { index } = await request.json();
    const complaints = await env.KV.get('coffee:complaints', 'json') || [];
    if (complaints[index]) complaints[index].resolved = true;
    await env.KV.put('coffee:complaints', JSON.stringify(complaints));
    return jsonResp({ ok: true });
  }

  // POST /api/admin/coffee/pairs — сохранить пары на неделю (вручную)
  // body: { weekId, pairs: [{a: tgId, b: tgId}, ...] }
  if (request.method === 'POST' && sub === '/pairs') {
    const { weekId, pairs } = await request.json();
    await env.KV.put(`coffee:round:${weekId}`, JSON.stringify({ pairs, weekId, createdAt: Date.now(), sentAt: null }));
    return jsonResp({ ok: true });
  }

  // POST /api/admin/coffee/reassign — переназначить партнёра вручную
  // body: { tgId, newPartnerId, weekId }
  if (request.method === 'POST' && sub === '/reassign') {
    const { tgId, newPartnerId, weekId, complaintId } = await request.json();

    // Обновить матчи обоим
    await env.KV.put(`coffee:match:${tgId}`, JSON.stringify({ partnerId: newPartnerId, weekId, status: 'active' }));
    await env.KV.put(`coffee:match:${newPartnerId}`, JSON.stringify({ partnerId: tgId, weekId, status: 'active' }));

    // Добавить в историю
    await coffeeAddHistory(env, tgId, newPartnerId, weekId);
    await coffeeAddHistory(env, newPartnerId, tgId, weekId);

    // Уведомить обоих в боте
    const p1 = await env.KV.get(`coffee:user:${tgId}`, 'json');
    const p2 = await env.KV.get(`coffee:user:${newPartnerId}`, 'json');
    await coffeeSendMatchNotification(env, tgId, p2);
    await coffeeSendMatchNotification(env, newPartnerId, p1);

    // Отметить жалобу решённой
    if (complaintId !== undefined) {
      const complaints = await env.KV.get('coffee:complaints', 'json') || [];
      if (complaints[complaintId]) complaints[complaintId].resolved = true;
      await env.KV.put('coffee:complaints', JSON.stringify(complaints));
    }

    return jsonResp({ ok: true });
  }

  // POST /api/admin/coffee/disable — отключить участника
  if (request.method === 'POST' && sub === '/disable') {
    const { tgId, reason } = await request.json();
    const profile = await env.KV.get(`coffee:user:${tgId}`, 'json');
    if (!profile) return jsonResp({ ok: false });
    profile.active = false;
    profile.disabledReason = reason || '';
    profile.updatedAt = Date.now();
    await env.KV.put(`coffee:user:${tgId}`, JSON.stringify(profile));

    // Уведомление в бот с кнопкой восстановления
    await tgSend(env, tgId,
      `☕ Рандом Кофе\n\nТебя временно исключили из подбора партнёров${reason ? ` — ${reason}` : ''}.\n\nЕсли хочешь вернуться, нажми кнопку ниже 👇`,
      { inline_keyboard: [[{ text: '✅ Восстановить участие', callback_data: 'coffee_restore' }]] }
    );
    return jsonResp({ ok: true });
  }

  // POST /api/admin/coffee/enable — восстановить участника
  if (request.method === 'POST' && sub === '/enable') {
    const { tgId } = await request.json();
    const profile = await env.KV.get(`coffee:user:${tgId}`, 'json');
    if (!profile) return jsonResp({ ok: false });
    profile.active = true;
    profile.disabledReason = '';
    profile.updatedAt = Date.now();
    await env.KV.put(`coffee:user:${tgId}`, JSON.stringify(profile));
    return jsonResp({ ok: true });
  }

// POST /api/admin/coffee/send-now — ручная рассылка пар
if (request.method === 'POST' && sub === '/send-now') {
  const weekId = COFFEE_WEEK();
  const round = await env.KV.get(`coffee:round:${weekId}`, 'json');
  if (!round) return jsonResp({ ok: false, error: `Нет раунда для ${weekId}` });
  if (round.sentAt) return jsonResp({ ok: false, error: `Уже отправлено в ${new Date(round.sentAt).toISOString()}` });
  await coffeeSendPairs(env);
  return jsonResp({ ok: true, weekId, pairs: round.pairs.length });
}
  if (request.method === 'POST' && sub === '/resend-username') {
    const weekId = COFFEE_WEEK();
    const round = await env.KV.get(`coffee:round:${weekId}`, 'json');
    if (!round) return jsonResp({ ok: false, error: `Нет раунда для ${weekId}` });

    let sent = 0;
    for (const pair of round.pairs) {
      const p1 = await env.KV.get(`coffee:user:${pair.a}`, 'json');
      const p2 = await env.KV.get(`coffee:user:${pair.b}`, 'json');
      if (!p1 || !p2) continue;

      // Подтянуть username из botuser если нет в профиле
      if (!p1.username) {
        const bu = await env.KV.get(`botuser:${pair.a}`, 'json');
        if (bu?.username) p1.username = bu.username;
      }
      if (!p2.username) {
        const bu = await env.KV.get(`botuser:${pair.b}`, 'json');
        if (bu?.username) p2.username = bu.username;
      }

      const msg1 = p2.username
        ? `✈️ Контакт твоего партнёра по рандом кофе на этой неделе:\n\n@${p2.username}`
        : `✈️ У твоего партнёра *${p2.name}* нет username в Telegram — попробуй найти его в общем чате CMO.`;
      const msg2 = p1.username
        ? `✈️ Контакт твоего партнёра по рандом кофе на этой неделе:\n\n@${p1.username}`
        : `✈️ У твоего партнёра *${p1.name}* нет username в Telegram — попробуй найти его в общем чате CMO.`;

      await tgSend(env, pair.a, msg1);
      await tgSend(env, pair.b, msg2);
      sent++;
    }
    return jsonResp({ ok: true, pairsSent: sent });
  }

 // POST /api/admin/coffee/sync-usernames — полный синхрон
if (request.method === 'POST' && sub === '/sync-usernames') {
  const idx = await env.KV.get('coffee:participants', 'json') || [];
  let updated = 0, notFound = 0;

  for (const tgId of idx) {
    const profile = await env.KV.get(`coffee:user:${tgId}`, 'json');
    if (!profile) continue;
    if (profile.username) { continue; } // уже есть — пропускаем

    // Источник 1: botuser (писался при /start)
    const botuser = await env.KV.get(`botuser:${tgId}`, 'json');
    if (botuser?.username) {
      profile.username = botuser.username;
      profile.updatedAt = Date.now();
      await env.KV.put(`coffee:user:${tgId}`, JSON.stringify(profile));
      updated++;
      continue;
    }

    // Источник 2: user: (писался при вводе email)
    const userRecord = await env.KV.get(`user:${tgId}`, 'json');
    if (userRecord?.username) {
      profile.username = userRecord.username;
      profile.updatedAt = Date.now();
      await env.KV.put(`coffee:user:${tgId}`, JSON.stringify(profile));
      updated++;
      continue;
    }
 
    notFound++;
  }

  return jsonResp({ ok: true, updated, notFound });
}

  return jsonResp({ error: 'Not found' }, 404);
}


// ══════════════════════════════════════════════
// РАНДОМ КОФЕ — CRON ФУНКЦИИ
// ══════════════════════════════════════════════

async function coffeeSendPairs(env) {
  try {
    const weekId = COFFEE_WEEK();
    const round = await env.KV.get(`coffee:round:${weekId}`, 'json');
    if (!round || round.sentAt) return; // нет пар или уже отправлено

    for (const pair of round.pairs) {
      const p1 = await env.KV.get(`coffee:user:${pair.a}`, 'json');
      const p2 = await env.KV.get(`coffee:user:${pair.b}`, 'json');
      if (!p1 || !p2) continue;

      // Сохранить матчи
      await env.KV.put(`coffee:match:${pair.a}`, JSON.stringify({ partnerId: pair.b, weekId, status: 'active' }));
      await env.KV.put(`coffee:match:${pair.b}`, JSON.stringify({ partnerId: pair.a, weekId, status: 'active' }));

      // Добавить в историю
      await coffeeAddHistory(env, pair.a, pair.b, weekId);
      await coffeeAddHistory(env, pair.b, pair.a, weekId);

      // Отправить уведомления с карточкой партнёра
      await coffeeSendMatchNotification(env, pair.a, p2);
      await coffeeSendMatchNotification(env, pair.b, p1);
    }

    round.sentAt = Date.now();
    await env.KV.put(`coffee:round:${weekId}`, JSON.stringify(round));
  } catch(err) {
    await notifyAdminError(env, 'coffeeSendPairs', err);
  }
}

async function coffeeSendReminder(env) {
  try {
    const weekId = COFFEE_WEEK();
    const round = await env.KV.get(`coffee:round:${weekId}`, 'json');
    if (!round) return;

    for (const pair of round.pairs) {
      for (const tgId of [pair.a, pair.b]) {
        const match = await env.KV.get(`coffee:match:${tgId}`, 'json');
        if (match?.status !== 'active') continue; // уже оценили или пожаловались

        await tgSend(env, tgId,
          `☕ Рандом Кофе — напоминание\n\nЭта неделя заканчивается. Ты уже успел(а) пообщаться со своим партнёром?\n\nНе забудь оценить встречу 👇`,
          {
            inline_keyboard: [
              [{ text: '⭐ Оценить встречу', callback_data: `coffee_rate_${weekId}` }],
              [{ text: '🚩 Партнёр не вышел на связь', callback_data: `coffee_complaint_${weekId}` }]
            ]
          }
        );

        // Крючок в Ядро — органично в пятничное сообщение
        await tgSend(env, tgId,
          `💡 Кстати, в разделе *Ядро* уже собраны участники, которые готовы к глубокому нетворку — с профилями, запросами и историей встреч. Загляни 👇`,
          { parse_mode: 'Markdown', inline_keyboard: [[{ text: '🌟 Открыть Ядро', web_app: { url: 'https://cmo-razbory.oxion-ezhkov.workers.dev/app' } }]] }
        );
      }
    }
  } catch(err) {
    await notifyAdminError(env, 'coffeeSendReminder', err);
  }
}

async function coffeeSendMatchNotification(env, tgId, partnerProfile) {
  const skillsText = partnerProfile.skills?.length
    ? `\n\n🤝 Готов(а) помочь с:\n${partnerProfile.skills.map(s => `• ${s}`).join('\n')}`
    : '';

  const requestText = partnerProfile.request
    ? `\n\n🎯 Его/её запрос: ${partnerProfile.request}`
    : '';

  const usernameText = partnerProfile.username
    ? `\n\n✈️ Написать: @${partnerProfile.username}`
    : '';

  await tgSend(env, tgId,
    `☕ Рандом Кофе — новая неделя!\n\nТвой партнёр на эту неделю:\n\n👤 *${partnerProfile.name}*${partnerProfile.city ? ` · ${partnerProfile.city}` : ''}\n${partnerProfile.bio || ''}${requestText}${skillsText}${usernameText}\n\nНапиши ему первым — удачной встречи! 🚀`,
{
      parse_mode: 'Markdown',
      inline_keyboard: [[{ text: '✅ Встретились, оценить', callback_data: `coffee_rate_${COFFEE_WEEK()}` }]]
    }
  );
}

// ══════════════════════════════════════════════
// РАНДОМ КОФЕ — ВСПОМОГАТЕЛЬНЫЕ
// ══════════════════════════════════════════════

async function coffeeAddHistory(env, tgId, partnerId, weekId) {
  const history = await env.KV.get(`coffee:history:${tgId}`, 'json') || [];
  // Не дублировать
  if (!history.find(h => h.weekId === weekId && h.partnerId === partnerId)) {
    history.unshift({ partnerId, weekId, rated: false, createdAt: Date.now() });
    await env.KV.put(`coffee:history:${tgId}`, JSON.stringify(history));
  }
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Автоматически формирует пары активных участников на неделю, стараясь не повторять
// партнёров, с которыми пользователь уже встречался ранее (по coffee:history).
async function coffeeAutoGeneratePairs(env, weekId) {
  try {
    const idx = await env.KV.get('coffee:participants', 'json') || [];
    const profiles = await Promise.all(idx.map(tgId => env.KV.get(`coffee:user:${tgId}`, 'json')));
    const activeIds = idx.filter((tgId, i) => profiles[i]?.active).map(String);

    const histories = await Promise.all(activeIds.map(tgId => env.KV.get(`coffee:history:${tgId}`, 'json')));
    const historyMap = new Map();
    activeIds.forEach((tgId, i) => {
      historyMap.set(tgId, new Set((histories[i] || []).map(h => String(h.partnerId))));
    });

    let pool = shuffleArray(activeIds);
    const pairs = [];
    while (pool.length > 1) {
      const a = pool.shift();
      let pickIdx = pool.findIndex(b => !historyMap.get(a)?.has(b));
      if (pickIdx === -1) pickIdx = 0; // все возможные партнёры уже были — придётся повторить
      const b = pool.splice(pickIdx, 1)[0];
      pairs.push({ a, b });
    }
    const unmatched = pool.length === 1 ? [pool[0]] : [];

    const round = { pairs, weekId, createdAt: Date.now(), sentAt: null, auto: true, unmatched };
    await env.KV.put(`coffee:round:${weekId}`, JSON.stringify(round));

    if (unmatched.length) {
      for (const tgId of unmatched) {
        await tgSend(env, tgId,
          `☕ На этой неделе для тебя, к сожалению, не нашлось пары (нечётное число участников). На следующей неделе тебя подберут в первую очередь!`
        );
      }
    }

    return round;
  } catch(err) {
    await notifyAdminError(env, 'coffeeAutoGeneratePairs', err);
    return null;
  }
}

// ─── HELPERS ─────────────────────────────────────────────────
function parseTgInitData(initData) {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    if (!userStr) return null;
    return { user: JSON.parse(userStr) };
  } catch {
    return null;
  }
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

// ══════════════════════════════════════════════
// АКТИВНОСТЬ ПОЛЬЗОВАТЕЛЕЙ — ЛОГ СОБЫТИЙ
// ══════════════════════════════════════════════

function eventDateStr(ts) {
  return new Date(ts).toISOString().slice(0, 10); // YYYY-MM-DD
}

// Записывает событие активности (bot_start, miniapp_open, section_view, module_open, click, chat_message, ...)
// и обновляет суточную агрегацию для дашборда + короткую историю по пользователю.
async function logEvent(env, type, userId, meta) {
  try {
    const ts = Date.now();
    const date = eventDateStr(ts);
    const rand = Math.random().toString(36).slice(2, 8);
    await env.KV.put(`evt:${date}:${ts}_${rand}`, JSON.stringify({ type, userId: userId ?? null, meta: meta || null, ts }), { expirationTtl: 60 * 60 * 24 * 400 });

    // Суточная агрегация
    const aggKey = `evtagg:${date}`;
    const agg = await env.KV.get(aggKey, 'json') || { date, total: 0, byType: {}, users: [] };
    agg.total++;
    agg.byType[type] = (agg.byType[type] || 0) + 1;
    if (userId && !agg.users.includes(String(userId))) agg.users.push(String(userId));
    await env.KV.put(aggKey, JSON.stringify(agg), { expirationTtl: 60 * 60 * 24 * 400 });

    // Короткая история по пользователю (последние 50 событий)
    if (userId) {
      const userKey = `useractivity:${userId}`;
      const list = await env.KV.get(userKey, 'json') || [];
      list.unshift({ type, meta: meta || null, ts });
      await env.KV.put(userKey, JSON.stringify(list.slice(0, 50)));
    }
  } catch (e) { /* трекинг не должен ронять основной запрос */ }
}

// Записывает событие активности задним числом (для ручного импорта истории чата)
async function logEventBackdated(env, type, userId, meta, date) {
  try {
    const ts = new Date(date + 'T12:00:00Z').getTime() || Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    await env.KV.put(`evt:${date}:${ts}_${rand}`, JSON.stringify({ type, userId: userId ?? null, meta: meta || null, ts }), { expirationTtl: 60 * 60 * 24 * 400 });
    const aggKey = `evtagg:${date}`;
    const agg = await env.KV.get(aggKey, 'json') || { date, total: 0, byType: {}, users: [] };
    agg.total++;
    agg.byType[type] = (agg.byType[type] || 0) + 1;
    if (userId && !agg.users.includes(String(userId))) agg.users.push(String(userId));
    await env.KV.put(aggKey, JSON.stringify(agg), { expirationTtl: 60 * 60 * 24 * 400 });
  } catch (e) {}
}

// ══════════════════════════════════════════════
// АКТИВНОСТЬ В ГРУППОВОМ ЧАТЕ (ЧАТ ЯДРА)
// ══════════════════════════════════════════════

async function handleGroupMessage(msg, env) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (msg.from.is_bot) return;

  const key = `chatuser:${chatId}:${userId}`;
  const existing = await env.KV.get(key, 'json') || {
    userId, name: msg.from.first_name || '', lastName: msg.from.last_name || '',
    username: msg.from.username || '', messageCount: 0, firstSeenAt: Date.now()
  };
  existing.name = msg.from.first_name || existing.name;
  existing.lastName = msg.from.last_name || existing.lastName;
  existing.username = msg.from.username || existing.username;
  existing.messageCount = (existing.messageCount || 0) + 1;
  existing.lastMessageAt = Date.now();
  await env.KV.put(key, JSON.stringify(existing));

  const chatIdx = await env.KV.get('chatactivity:chats', 'json') || [];
  if (!chatIdx.includes(String(chatId))) {
    chatIdx.push(String(chatId));
    await env.KV.put('chatactivity:chats', JSON.stringify(chatIdx));
  }

  await logEvent(env, 'chat_message', userId, { chatId });
}

async function apiAdminChatActivity(request, env, url) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.includes("admin_session_" + ADMIN_PASSWORD)) return jsonResp({ error: "Unauthorized" }, 401);

  if (request.method === 'GET') {
    const chatIdx = await env.KV.get('chatactivity:chats', 'json') || [];
    const users = [];
    for (const chatId of chatIdx) {
      const keys = await env.KV.list({ prefix: `chatuser:${chatId}:` });
      const records = await Promise.all(keys.keys.map(k => env.KV.get(k.name, 'json')));
      records.filter(Boolean).forEach(r => users.push({ ...r, chatId }));
    }
    users.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
    return jsonResp({ ok: true, chats: chatIdx, users });
  }

  if (request.method === 'POST') {
    const body = await request.json();

    // Ручной импорт активности за прошлые дни (например, из выгрузки чата)
    if (body.action === 'import') {
      const { chatId, records } = body; // records: [{ userId, name, username, date, count }]
      if (!chatId || !Array.isArray(records)) return jsonResp({ ok: false, error: 'Некорректные данные' });
      const chatIdx = await env.KV.get('chatactivity:chats', 'json') || [];
      if (!chatIdx.includes(String(chatId))) {
        chatIdx.push(String(chatId));
        await env.KV.put('chatactivity:chats', JSON.stringify(chatIdx));
      }
      let imported = 0;
      for (const r of records) {
        const uid = r.userId || ('name_' + (r.name || 'unknown').replace(/\s+/g, '_').toLowerCase());
        const key = `chatuser:${chatId}:${uid}`;
        const existing = await env.KV.get(key, 'json') || { userId: uid, name: r.name || '', username: r.username || '', messageCount: 0, firstSeenAt: Date.now() };
        const count = Number(r.count) || 1;
        existing.messageCount = (existing.messageCount || 0) + count;
        const ts = r.date ? new Date(r.date + 'T12:00:00Z').getTime() : Date.now();
        if (!existing.lastMessageAt || ts > existing.lastMessageAt) existing.lastMessageAt = ts;
        if (r.name) existing.name = r.name;
        if (r.username) existing.username = r.username;
        await env.KV.put(key, JSON.stringify(existing));
        if (r.date) {
          for (let i = 0; i < count; i++) await logEventBackdated(env, 'chat_message', r.userId || null, { chatId, imported: true }, r.date);
        }
        imported++;
      }
      return jsonResp({ ok: true, imported });
    }

    return jsonResp({ error: 'Unknown action' }, 404);
  }

  return jsonResp({ error: 'Not found' }, 404);
}

// ══════════════════════════════════════════════
// ОПЛАТЫ — сверка с edsofa.ai (текущим процессором оплат)
// ══════════════════════════════════════════════

// Находит участника CRM по email или telegram-username (без @, без учёта регистра).
function crmFindByContact(participants, email, telegram) {
  const emailLc = (email || '').toLowerCase().trim() || null;
  const tgLc = (telegram || '').replace(/^@/, '').toLowerCase().trim() || null;
  return participants.find(p =>
    (emailLc && p.email && p.email.toLowerCase() === emailLc) ||
    (tgLc && p.telegram && p.telegram.toLowerCase() === tgLc)
  ) || null;
}

// Добавляет месяцы оплаты в crm:{key}.paidMonths и переводит лида/бота в статус "paid".
async function crmApplyPaidMonths(env, key, months, fallback) {
  const crm = await env.KV.get(`crm:${key}`, 'json') || { status: fallback?.status || 'lead', createdAt: Date.now(), email: fallback?.email || null, telegram: fallback?.telegram || null, name: fallback?.name || '' };
  const set = new Set(crm.paidMonths || fallback?.paidMonths || []);
  months.forEach(m => set.add(m));
  crm.paidMonths = [...set];
  if (!crm.status || crm.status === 'lead' || crm.status === 'bot') crm.status = 'paid';
  crm.updatedAt = Date.now();
  await env.KV.put(`crm:${key}`, JSON.stringify(crm));
  return crm;
}

async function apiAdminPayments(request, env, url) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.includes("admin_session_" + ADMIN_PASSWORD)) return jsonResp({ error: "Unauthorized" }, 401);

  if (request.method === 'GET') {
    const unmatched = await env.KV.get('payments:unmatched', 'json') || [];
    return jsonResp({ ok: true, unmatched, webhookConfigured: !!env.PAYMENTS_WEBHOOK_SECRET });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const action = body.action;

    // Импорт из вставленной таблицы (формат совпадает с таблицей, которую ведут вручную):
    // № · telegram · email · ВСЕГО · колонки-месяцы с суммой.
    if (action === 'import') {
      const { records } = body; // [{ telegram, email, name, months: ['2026-05', ...] }]
      if (!Array.isArray(records)) return jsonResp({ ok: false, error: 'Некорректные данные' });
      const participants = await getCRMParticipants(env);
      let matched = 0;
      const unmatchedRows = [];
      for (const r of records) {
        if (!r.months?.length) continue;
        const found = crmFindByContact(participants, r.email, r.telegram);
        if (found) {
          await crmApplyPaidMonths(env, found.key, r.months, found);
          matched++;
        } else {
          unmatchedRows.push(r);
        }
      }
      return jsonResp({ ok: true, matched, unmatched: unmatchedRows });
    }

    if (action === 'dismiss-unmatched') {
      const { id } = body;
      let unmatched = await env.KV.get('payments:unmatched', 'json') || [];
      unmatched = unmatched.filter(u => u.id !== id);
      await env.KV.put('payments:unmatched', JSON.stringify(unmatched));
      return jsonResp({ ok: true });
    }

    if (action === 'link-unmatched') {
      const { id, key } = body;
      if (!id || !key) return jsonResp({ ok: false, error: 'Нет id или key' });
      let unmatched = await env.KV.get('payments:unmatched', 'json') || [];
      const entry = unmatched.find(u => u.id === id);
      if (!entry) return jsonResp({ ok: false, error: 'Запись не найдена' });
      await crmApplyPaidMonths(env, key, [entry.monthKey]);
      unmatched = unmatched.filter(u => u.id !== id);
      await env.KV.put('payments:unmatched', JSON.stringify(unmatched));
      return jsonResp({ ok: true });
    }

    return jsonResp({ error: 'Unknown action' }, 404);
  }

  return jsonResp({ error: 'Not found' }, 404);
}

// Входящий вебхук платёжного процессора (edsofa.ai). Формат payload у edsofa.ai не публикуется
// (нет открытой документации API/webhooks) — поля ниже разумное значение по умолчанию
// (email/telegram/amount/paid_at/status), при получении реального примера от поддержки
// edsofa.ai подстроить маппинг полей здесь под их точную схему.
async function apiPaymentsWebhook(request, env) {
  if (request.method !== 'POST') return jsonResp({ error: 'Method not allowed' }, 405);
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || request.headers.get('X-Webhook-Secret') || '';
  if (!env.PAYMENTS_WEBHOOK_SECRET || token !== env.PAYMENTS_WEBHOOK_SECRET) {
    return jsonResp({ error: 'Unauthorized' }, 401);
  }

  let payload;
  try { payload = await request.json(); } catch (e) { return jsonResp({ error: 'Invalid JSON' }, 400); }

  const email = payload.email || payload.buyer_email || payload.customer?.email || null;
  const telegram = payload.telegram || payload.username || payload.tg_username || payload.customer?.telegram || null;

  // Колбек о проблеме со списанием — отдельно уведомляем админа, без применения оплаты
  const statusRaw = String(payload.status || payload.event || payload.type || '').toLowerCase();
  const isPaymentProblem = ['fail', 'declin', 'error', 'problem', 'chargeback', 'refund'].some(k => statusRaw.includes(k));
  if (isPaymentProblem) {
    await notifyAdminPaymentProblem(env, email, telegram, payload);
    return jsonResp({ ok: true, problem: true });
  }

  const paidAtTs = payload.paid_at ? new Date(payload.paid_at).getTime() : Date.now();
  const monthKey = currentMonthStr(Number.isNaN(paidAtTs) ? Date.now() : paidAtTs);

  const participants = await getCRMParticipants(env);
  const match = crmFindByContact(participants, email, telegram);

  if (!match) {
    const unmatched = await env.KV.get('payments:unmatched', 'json') || [];
    unmatched.unshift({
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      email: email || null, telegram: telegram || null,
      amount: payload.amount ?? null, monthKey, raw: payload, receivedAt: Date.now()
    });
    await env.KV.put('payments:unmatched', JSON.stringify(unmatched.slice(0, 200)));
    return jsonResp({ ok: true, matched: false });
  }

  await crmApplyPaidMonths(env, match.key, [monthKey], match);
  return jsonResp({ ok: true, matched: true, key: match.key, monthKey });
}

// ══════════════════════════════════════════════
// АВАТАРЫ УЧАСТНИКОВ (проксируем и кешируем фото профиля Telegram)
// ══════════════════════════════════════════════

function bufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const AVATAR_CACHE_TTL = 60 * 60 * 24 * 7; // 7 дней — и на найденное фото, и на "фото нет"

// Публичный (без admin-сессии) эндпоинт — <img src> не может передать заголовок Authorization,
// а отдаёт он только чужую публичную аватарку Telegram, не данные CRM, так что это безопасно.
async function apiCRMAvatar(request, env, url) {
  const tgId = url.searchParams.get('tgId');
  if (!tgId || !env.BOT_TOKEN) return new Response(null, { status: 404 });

  const cacheKey = `avatarcache:${tgId}`;
  const cached = await env.KV.get(cacheKey, 'json');
  if (cached) {
    if (!cached.dataB64) return new Response(null, { status: 404 });
    const bytes = Uint8Array.from(atob(cached.dataB64), c => c.charCodeAt(0));
    return new Response(bytes, { headers: { 'Content-Type': cached.mime || 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } });
  }

  try {
    const photosRes = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getUserProfilePhotos?user_id=${encodeURIComponent(tgId)}&limit=1`).then(r => r.json());
    const photoSizes = photosRes?.result?.photos?.[0];
    if (!photoSizes?.length) {
      await env.KV.put(cacheKey, JSON.stringify({ dataB64: null, fetchedAt: Date.now() }), { expirationTtl: AVATAR_CACHE_TTL });
      return new Response(null, { status: 404 });
    }

    const fileId = photoSizes[0].file_id; // наименьший размер — этого достаточно для маленькой аватарки
    const fileRes = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`).then(r => r.json());
    const filePath = fileRes?.result?.file_path;
    if (!filePath) {
      await env.KV.put(cacheKey, JSON.stringify({ dataB64: null, fetchedAt: Date.now() }), { expirationTtl: AVATAR_CACHE_TTL });
      return new Response(null, { status: 404 });
    }

    const imgRes = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${filePath}`);
    if (!imgRes.ok) return new Response(null, { status: 404 });
    const buf = await imgRes.arrayBuffer();
    const mime = imgRes.headers.get('Content-Type') || 'image/jpeg';
    const dataB64 = bufferToBase64(buf);
    await env.KV.put(cacheKey, JSON.stringify({ dataB64, mime, fetchedAt: Date.now() }), { expirationTtl: AVATAR_CACHE_TTL });
    return new Response(buf, { headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=86400' } });
  } catch (e) {
    return new Response(null, { status: 404 });
  }
}

async function apiTrack(request, env) {
  if (request.method !== 'POST') return jsonResp({ error: 'Method not allowed' }, 405);
  const { type, tgId, initData, meta } = await request.json();
  if (!type) return jsonResp({ ok: false });
  let userId = tgId || null;
  if (!userId && initData) {
    const parsed = parseTgInitData(initData);
    if (parsed?.user) userId = parsed.user.id;
  }
  await logEvent(env, type, userId, meta);
  return jsonResp({ ok: true });
}

// ══════════════════════════════════════════════
// РУЧНОЙ УЧЁТ ПОСЕЩЕНИЙ ВОРКШОПОВ
// ══════════════════════════════════════════════

async function apiAdminWorkshopAttendance(request, env, url) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.includes("admin_session_" + ADMIN_PASSWORD)) return jsonResp({ error: "Unauthorized" }, 401);

  if (request.method === 'GET') {
    const userId = url.searchParams.get('userId');
    if (!userId) return jsonResp({ ok: false, error: 'Нет userId' });
    const records = await env.KV.get(`workshopattendance:${userId}`, 'json') || [];
    return jsonResp({ ok: true, records });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const { userId } = body;
    if (!userId) return jsonResp({ ok: false, error: 'Нет userId' });
    const records = await env.KV.get(`workshopattendance:${userId}`, 'json') || [];

    if (body.deleteId) {
      const filtered = records.filter(r => r.id !== body.deleteId);
      await env.KV.put(`workshopattendance:${userId}`, JSON.stringify(filtered));
      return jsonResp({ ok: true, records: filtered });
    }

    const { title, date, note } = body;
    if (!title || !date) return jsonResp({ ok: false, error: 'Нужны название и дата' });
    records.unshift({ id: 'wa_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), title, date, note: note || '', recordedAt: Date.now() });
    records.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    await env.KV.put(`workshopattendance:${userId}`, JSON.stringify(records));
    return jsonResp({ ok: true, records });
  }

  return jsonResp({ error: 'Not found' }, 404);
}

// ══════════════════════════════════════════════
// CRM — УЧАСТНИКИ ПО СТАТУСАМ
// ══════════════════════════════════════════════

const CRM_STATUSES = ['bot', 'lead', 'paid', 'active', 'paused', 'left'];

async function crmSuspendAccess(env, email) {
  const stopped = await env.KV.get('users:stopped', 'json') || [];
  if (!stopped.includes(email.toLowerCase())) {
    stopped.push(email.toLowerCase());
    await env.KV.put('users:stopped', JSON.stringify(stopped));
  }
  const userId = await env.KV.get(`email_to_user:${email.toLowerCase()}`);
  if (userId) {
    const userData = await env.KV.get(`user:${userId}`, 'json');
    if (userData) {
      userData.approved = false;
      userData.stoppedAt = Date.now();
      await env.KV.put(`user:${userId}`, JSON.stringify(userData));
    }
    await tgSend(env, Number(userId),
      `🚫 *Доступ к CMO Ядро закрыт*\n\nМы не получили оплату за следующий месяц, поэтому доступ приостановлен.\n\n⏳ Через 3 дня ты будешь удалён из чата. Вернуться после этого будет невозможно.\n\n_Если это ошибка — напиши Олегу, он разберётся._`,
      { inline_keyboard: [[{ text: '✍️ Написать Олегу — восстановить доступ', url: 'https://t.me/oleg_ezhkov' }]] }
    );
  }
}

async function crmRestoreAccess(env, email) {
  let stopped = await env.KV.get('users:stopped', 'json') || [];
  stopped = stopped.filter(e => e !== email.toLowerCase());
  await env.KV.put('users:stopped', JSON.stringify(stopped));
  const userId = await env.KV.get(`email_to_user:${email.toLowerCase()}`);
  if (userId) {
    const userData = await env.KV.get(`user:${userId}`, 'json');
    if (userData) {
      userData.approved = true;
      delete userData.stoppedAt;
      await env.KV.put(`user:${userId}`, JSON.stringify(userData));
    }
    await tgSend(env, Number(userId),
      `✅ *Доступ к CMO Ядро восстановлен!*\n\nТвой доступ к базе знаний снова активен. Добро пожаловать обратно! 🎉\n\nЗаходи в мини-приложение 👇`,
      { inline_keyboard: [[{ text: "📚 Открыть CMO Ядро", web_app: { url: WORKER_URL + "/app" } }]] }
    );
  }
}

const RISK_DAYS = 14;
const NEW_DAYS = 7;

function currentMonthStr(ts = Date.now()) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

const RU_MONTHS = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
function thisMonthLabelRu(ts = Date.now()) {
  const d = new Date(ts);
  return RU_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}

// Собирает единый список участников CRM (используется CRM-доской, дашбордом и рассылками по сегментам),
// обогащая его сигналами активности из useractivity:{tgId} (пишется logEvent на bot/miniapp/chat-события).
async function getCRMParticipants(env) {
  const [approvedEmails, pending, stopped, crmKeys, botKeys] = await Promise.all([
    env.KV.get('emails:approved', 'json').then(v => v || []),
    env.KV.get('pending:list', 'json').then(v => v || []),
    env.KV.get('users:stopped', 'json').then(v => v || []),
    env.KV.list({ prefix: 'crm:' }),
    env.KV.list({ prefix: 'botuser:' })
  ]);
  const crmRecords = {};
  await Promise.all(crmKeys.keys.map(async k => {
    const r = await env.KV.get(k.name, 'json');
    if (r) crmRecords[k.name.replace('crm:', '')] = r;
  }));

  const keySet = new Map(); // key(lowercase) -> canonical email
  approvedEmails.forEach(e => keySet.set(e.toLowerCase(), e));
  pending.forEach(p => keySet.set(p.email.toLowerCase(), p.email));
  Object.values(crmRecords).forEach(r => { if (r.email) keySet.set(r.email.toLowerCase(), r.email); });

  const list = [];
  const coveredTgIds = new Set();

  for (const [key, email] of keySet) {
    const crm = crmRecords[key] || {};
    const isPending = pending.some(p => p.email.toLowerCase() === key);
    const isStopped = stopped.includes(key);
    let status = crm.status;
    if (!status) status = isStopped ? 'paused' : isPending ? 'lead' : 'active';

    const tgId = crm.tgId || await env.KV.get(`email_to_user:${key}`);
    let userRec = null, botUser = null;
    if (tgId) {
      coveredTgIds.add(String(tgId));
      [userRec, botUser] = await Promise.all([
        env.KV.get(`user:${tgId}`, 'json'),
        env.KV.get(`botuser:${tgId}`, 'json')
      ]);
    }
    const launches = tgId ? (await env.KV.get(`userstat:${tgId}:launches`, 'json') || 0) : 0;
    const pendingEntry = pending.find(p => p.email.toLowerCase() === key);

    list.push({
      key, email,
      status,
      isPending,
      name: crm.name || userRec?.name || botUser?.name || pendingEntry?.name || '',
      telegram: crm.telegram || botUser?.username || userRec?.username || '',
      note: crm.note || '',
      tgId: tgId || null,
      paidMonths: crm.paidMonths || [],
      payments: crm.payments || [],
      enrolledAt: userRec?.enrolledAt || crm.createdAt || null,
      launches,
      updatedAt: crm.updatedAt || null
    });
  }

  // Чистые лиды без email/аккаунта (добавленные вручную)
  for (const [key, r] of Object.entries(crmRecords)) {
    if (!r.email && !list.some(x => x.key === key)) {
      if (r.tgId) coveredTgIds.add(String(r.tgId));
      list.push({
        key, email: null, status: r.status || 'lead', isPending: false,
        name: r.name || '', telegram: r.telegram || '', note: r.note || '',
        tgId: r.tgId || null, paidMonths: r.paidMonths || [],
        payments: r.payments || [],
        enrolledAt: r.createdAt || null, launches: 0, updatedAt: r.updatedAt || null
      });
    }
  }

  // Пользователи, которые только написали боту, но не проходили email-верификацию —
  // показываем как отдельный статус "Написал боту", а не отдельным списком.
  for (const k of botKeys.keys) {
    const tgId = k.name.replace('botuser:', '');
    if (coveredTgIds.has(String(tgId))) continue;
    const userRec = await env.KV.get(`user:${tgId}`, 'json');
    if (userRec) continue; // уже прошёл email-флоу — представлен где-то выше
    const crmKey = `tg_${tgId}`;
    if (crmRecords[crmKey]) continue; // обработан в блоке выше как "чистый лид"
    const botUser = await env.KV.get(k.name, 'json');
    list.push({
      key: crmKey, email: null, status: 'bot', isPending: false,
      name: botUser?.name || '', telegram: botUser?.username || '', note: '',
      tgId: Number(tgId) || tgId, paidMonths: [],
      enrolledAt: botUser?.startedAt || null, launches: 0, updatedAt: null
    });
  }

  // Обогащение сигналами активности (последнее событие из useractivity: bot/miниапп/чат)
  // и производными признаками риска/новизны/оплаты — без выдумывания новых полей статуса,
  // это подсказки поверх существующего ручного статуса.
  const thisMonth = currentMonthStr();
  const now = Date.now();
  await Promise.all(list.map(async p => {
    let lastActiveAt = null;
    if (p.tgId) {
      const activity = await env.KV.get(`useractivity:${p.tgId}`, 'json');
      lastActiveAt = activity?.[0]?.ts || null;
    }
    p.lastActiveAt = lastActiveAt;
    p.paidThisMonth = (p.paidMonths || []).includes(thisMonth);
    p.isNew = !!(p.enrolledAt && (now - p.enrolledAt) < NEW_DAYS * 86400000);
    const activeIsh = ['active', 'paid'].includes(p.status);
    const daysSinceActive = lastActiveAt ? Math.floor((now - lastActiveAt) / 86400000) : null;
    p.risk = activeIsh && (daysSinceActive === null || daysSinceActive >= RISK_DAYS);
  }));

  return list;
}

// ══════════════════════════════════════════════
// COMMUNITY CRM — отдельная доска комьюнити-менеджера
// (независимо от crm: — свой префикс cmperson:)
// ══════════════════════════════════════════════

function cmId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function apiCommunity(request, env, url) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.includes("admin_session_" + ADMIN_PASSWORD)) return jsonResp({ error: "Unauthorized" }, 401);

  if (request.method === 'GET') {
    const keys = await env.KV.list({ prefix: 'cmperson:' });
    const people = (await Promise.all(keys.keys.map(k => env.KV.get(k.name, 'json')))).filter(Boolean);
    people.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    return jsonResp({ ok: true, people });
  }

  if (request.method !== 'POST') return jsonResp({ error: 'Not found' }, 404);

  const body = await request.json();
  const action = body.action;

  async function getPerson(id) {
    return await env.KV.get(`cmperson:${id}`, 'json');
  }
  async function savePerson(p) {
    p.updatedAt = Date.now();
    await env.KV.put(`cmperson:${p.id}`, JSON.stringify(p));
    return p;
  }

  if (action === 'create') {
    const id = cmId();
    const person = {
      id,
      name: body.name || '',
      telegram: body.telegram || '',
      tgUsername: body.tgUsername || '',
      email: body.email || '',
      ratings: [],
      requests: [],
      notes: [],
      payments: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await env.KV.put(`cmperson:${id}`, JSON.stringify(person));
    return jsonResp({ ok: true, person });
  }

  if (action === 'update-fields') {
    const p = await getPerson(body.id);
    if (!p) return jsonResp({ ok: false, error: 'Не найдено' }, 404);
    ['name', 'telegram', 'tgUsername', 'email'].forEach(f => {
      if (body[f] !== undefined) p[f] = body[f];
    });
    await savePerson(p);
    return jsonResp({ ok: true, person: p });
  }

  if (action === 'delete') {
    await env.KV.delete(`cmperson:${body.id}`);
    return jsonResp({ ok: true });
  }

  if (['add-rating', 'add-request', 'add-note', 'add-payment'].includes(action)) {
    const p = await getPerson(body.id);
    if (!p) return jsonResp({ ok: false, error: 'Не найдено' }, 404);
    const entry = { entryId: cmId(), date: body.date || new Date().toISOString().slice(0, 10), createdAt: Date.now() };
    if (action === 'add-rating') {
      entry.value = Number(body.value);
      p.ratings.push(entry);
    } else if (action === 'add-request') {
      entry.text = body.text || '';
      p.requests.push(entry);
    } else if (action === 'add-note') {
      entry.text = body.text || '';
      p.notes.push(entry);
    } else if (action === 'add-payment') {
      entry.amount = Number(body.amount) || 0;
      p.payments.push(entry);
    }
    await savePerson(p);
    return jsonResp({ ok: true, person: p });
  }

  if (action === 'delete-entry') {
    const p = await getPerson(body.id);
    if (!p) return jsonResp({ ok: false, error: 'Не найдено' }, 404);
    const listName = { rating: 'ratings', request: 'requests', note: 'notes', payment: 'payments' }[body.kind];
    if (!listName || !p[listName]) return jsonResp({ ok: false, error: 'Некорректный тип' });
    p[listName] = p[listName].filter(e => e.entryId !== body.entryId);
    await savePerson(p);
    return jsonResp({ ok: true, person: p });
  }

  if (action === 'edit-entry') {
    const p = await getPerson(body.id);
    if (!p) return jsonResp({ ok: false, error: 'Не найдено' }, 404);
    const listName = { rating: 'ratings', request: 'requests', note: 'notes', payment: 'payments' }[body.kind];
    if (!listName || !p[listName]) return jsonResp({ ok: false, error: 'Некорректный тип' });
    const entry = p[listName].find(e => e.entryId === body.entryId);
    if (!entry) return jsonResp({ ok: false, error: 'Запись не найдена' }, 404);
    if (body.date) entry.date = body.date;
    if (body.kind === 'rating') entry.value = Number(body.value);
    else if (body.kind === 'payment') entry.amount = Number(body.amount) || 0;
    else entry.text = body.text || '';
    await savePerson(p);
    return jsonResp({ ok: true, person: p });
  }

  return jsonResp({ error: 'Unknown action' }, 404);
}

function serveCommunity() {
  return new Response(getCommunityHTML(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function apiAdminCRM(request, env, url) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.includes("admin_session_" + ADMIN_PASSWORD)) return jsonResp({ error: "Unauthorized" }, 401);

  if (request.method === 'GET') {
    const list = await getCRMParticipants(env);
    return jsonResp({ ok: true, participants: list });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const action = body.action;

    if (action === 'set-status') {
      const { key, status } = body;
      if (!key || !CRM_STATUSES.includes(status)) return jsonResp({ ok: false, error: 'Некорректные данные' });
      const crm = await env.KV.get(`crm:${key}`, 'json') || { email: body.email || null, createdAt: Date.now() };
      const prevStatus = crm.status;
      crm.status = status;
      crm.updatedAt = Date.now();
      if (body.email) crm.email = body.email;
      await env.KV.put(`crm:${key}`, JSON.stringify(crm));

      if (crm.email) {
        const goingInactive = (status === 'paused' || status === 'left');
        const wasInactive = (prevStatus === 'paused' || prevStatus === 'left');
        if (goingInactive && !wasInactive) await crmSuspendAccess(env, crm.email);
        else if (!goingInactive && wasInactive) await crmRestoreAccess(env, crm.email);
      }
      return jsonResp({ ok: true });
    }

    if (action === 'save') {
      const { key, fields } = body;
      if (!key) return jsonResp({ ok: false, error: 'Нет key' });
      const crm = await env.KV.get(`crm:${key}`, 'json') || { status: 'lead', createdAt: Date.now() };
      Object.assign(crm, fields || {});
      crm.updatedAt = Date.now();
      await env.KV.put(`crm:${key}`, JSON.stringify(crm));
      return jsonResp({ ok: true, record: crm });
    }

    if (action === 'add-lead') {
      const { name, email, telegram, note } = body;
      if (!name && !email && !telegram) return jsonResp({ ok: false, error: 'Заполни хотя бы одно поле' });
      const key = email ? email.toLowerCase() : ('lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
      const crm = { email: email || null, name: name || '', telegram: telegram || '', note: note || '', status: 'lead', createdAt: Date.now(), updatedAt: Date.now() };
      await env.KV.put(`crm:${key}`, JSON.stringify(crm));
      return jsonResp({ ok: true, key });
    }

    if (action === 'delete') {
      const { key } = body;
      if (!key) return jsonResp({ ok: false });
      await env.KV.delete(`crm:${key}`);
      return jsonResp({ ok: true });
    }

    return jsonResp({ error: 'Unknown action' }, 404);
  }

  return jsonResp({ error: 'Not found' }, 404);
}

async function apiAdminAnalytics(request, env, url) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.includes("admin_session_" + ADMIN_PASSWORD)) return jsonResp({ error: "Unauthorized" }, 401);

  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '14', 10) || 14, 1), 90);
  const now = Date.now();
  const dayList = [];
  for (let i = days - 1; i >= 0; i--) {
    dayList.push(eventDateStr(now - i * 86400000));
  }
  const aggs = await Promise.all(dayList.map(d => env.KV.get(`evtagg:${d}`, 'json')));
  const daily = dayList.map((d, i) => {
    const a = aggs[i];
    return {
      date: d,
      total: a?.total || 0,
      byType: a?.byType || {},
      uniqueUsers: a?.users?.length || 0
    };
  });

  const totals = daily.reduce((acc, d) => {
    acc.total += d.total;
    acc.uniqueUsers += d.uniqueUsers; // приблизительно (без дедупликации между днями)
    for (const [t, c] of Object.entries(d.byType)) acc.byType[t] = (acc.byType[t] || 0) + c;
    return acc;
  }, { total: 0, uniqueUsers: 0, byType: {} });

  return jsonResp({ ok: true, days: daily, totals });
}

// ─── MINI APP HTML ───────────────────────────────────────────
function getMiniAppHTML() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<title>CMO Субботние разборы</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@300;400;600;700&family=Geologica:wght@300;400;500;600&display=swap');

  :root {
    --bg: #0d0d0d;
    --bg2: #141414;
    --bg3: #1a1a1a;
    --card: #161616;
    --border: rgba(255,255,255,0.07);
    --border-hover: rgba(255,255,255,0.15);
    --text: #ffffff;
    --text2: rgba(255,255,255,0.5);
    --text3: rgba(255,255,255,0.25);
    --accent: #ffffff;
    --accent-dim: rgba(255,255,255,0.08);
    --done: rgba(255,255,255,0.12);
    --radius: 12px;
    --radius-lg: 20px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Geologica', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    min-height: 100vh;
    overscroll-behavior: none;
  }

  /* ── SCREENS ── */
  .screen { display: none; flex-direction: column; min-height: 100vh; }
  .screen.active { display: flex; }

  .event-card { background:var(--card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px; display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:12px; }
.event-photo-wrap { width:80px; height:80px; border-radius:50%; overflow:hidden; background:var(--bg3); flex-shrink:0; }
.event-photo { width:100%; height:100%; object-fit:cover; }
.event-body { width:100%; text-align:center; }
.event-title { font-family:'Unbounded',sans-serif; font-size:15px; font-weight:600; margin-bottom:4px; }
.event-author { font-size:12px; color:var(--text2); margin-bottom:8px; }
.event-datetime { font-size:13px; color:var(--text2); margin-bottom:12px; }
.event-zoom-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 14px;
  background: var(--text);
  color: var(--bg);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
}

  /* ── AUTH SCREEN ── */
  #authScreen {
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    text-align: center;
    gap: 0;
  }

  .auth-logo {
    font-family: 'Unbounded', sans-serif;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -1px;
    margin-bottom: 8px;
  }

  .auth-sub {
    font-size: 11px;
    color: var(--text3);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 48px;
  }

  .auth-icon {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: var(--bg3);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 32px;
    font-size: 32px;
  }

  .auth-title {
    font-family: 'Unbounded', sans-serif;
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 12px;
    line-height: 1.3;
  }

  .auth-desc {
    color: var(--text2);
    font-size: 13px;
    margin-bottom: 32px;
    line-height: 1.6;
  }

  .input-wrap {
    width: 100%;
    max-width: 320px;
    margin-bottom: 12px;
  }

  .input-wrap input {
    width: 100%;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    color: var(--text);
    font-family: 'Geologica', sans-serif;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }

  .input-wrap input:focus { border-color: rgba(255,255,255,0.3); }
  .input-wrap input::placeholder { color: var(--text3); }

  .btn-primary {
    width: 100%;
    max-width: 320px;
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: var(--radius);
    padding: 14px 20px;
    font-family: 'Geologica', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
    letter-spacing: 0.3px;
  }

  .btn-primary:active { opacity: 0.8; }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--radius);
    padding: 12px 20px;
    font-family: 'Geologica', sans-serif;
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .btn-ghost:active { border-color: rgba(255,255,255,0.3); }

  .auth-msg {
    font-size: 12px;
    margin-top: 12px;
    max-width: 320px;
    line-height: 1.5;
    min-height: 20px;
  }

  .auth-msg.error { color: #ff6b6b; }
  .auth-msg.success { color: #6bffb8; }

  /* ── MAIN APP ── */
  #appScreen { padding-bottom: 96px; }

  /* ── TOP BAR ── */
  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(13,13,13,0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    position: relative;
  }

  .topbar-logo {
    font-family: 'Unbounded', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -0.5px;
    white-space: nowrap;
  }

  .topbar-icon-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--bg3);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text2);
    text-decoration: none;
    flex-shrink: 0;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }
  .topbar-icon-btn:active { border-color: var(--border-h); color: var(--text); }

  .topbar-user {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .topbar-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bg3);
    border: 1px solid var(--border);
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
  }

  .topbar-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .topbar-name { font-size: 13px; color: var(--text2); }

  /* ── PROGRAM TABS ── */
  .program-tabs {
    display: flex;
    gap: 8px;
    padding: 16px 16px 0;
  }

  /* ── SECTION TABS ── */
  .section-tabs {
    display: flex;
    gap: 4px;
    padding: 16px 16px 0;
  }

  .stab {
    flex: 1;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 4px;
    text-align: center;
    cursor: pointer;
    font-family: 'Geologica', sans-serif;
    font-size: 12px;
    color: var(--text2);
    transition: all 0.2s;
  }

  .stab.active {
    background: var(--accent-dim);
    border-color: rgba(255,255,255,0.2);
    color: var(--text);
  }

  /* ── CONTENT AREA ── */
  .content { padding: 16px; }

  /* ── SECTION: KNOWLEDGE ── */
  .section-header {
    margin-bottom: 16px;
  }

  .section-title {
    font-family: 'Unbounded', sans-serif;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .section-desc { color: var(--text2); font-size: 12px; }

  /* ── MODULE CARDS ── */
  .module-list { display: flex; flex-direction: column; gap: 8px; }

  .module-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    position: relative;
  }

  .module-card:active { background: var(--bg3); }
  .module-card.available:hover { border-color: var(--border-hover); }
  .module-card.locked { opacity: 0.4; cursor: default; }
  .module-card.done { background: var(--done); }

  .module-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .module-num {
    font-size: 10px;
    color: var(--text3);
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .module-title {
    font-family: 'Geologica', sans-serif;
    font-weight: 500;
    font-size: 14px;
    line-height: 1.3;
  }

  .module-desc {
    font-size: 12px;
    color: var(--text2);
    margin-top: 6px;
    line-height: 1.5;
  }

  .module-status {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1.5px solid var(--border);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    cursor: pointer;
  }

  .module-status.done {
    background: var(--text);
    border-color: var(--text);
    color: var(--bg);
  }

  .module-tag {
    display: inline-block;
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 4px;
    margin-top: 8px;
    background: var(--accent-dim);
    color: var(--text2);
  }

  .module-tag.locked-tag {
    background: transparent;
    border: 1px solid var(--border);
  }

  /* ── TAG FILTER ── */
  .tag-filter-row {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 2px 0 16px;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .tag-filter-row::-webkit-scrollbar { display: none; }

  .tag-chip {
    flex: 0 0 auto;
    padding: 7px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text2);
    cursor: pointer;
    white-space: nowrap;
    transition: transform 0.15s cubic-bezier(.34,1.56,.64,1), background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }
  .tag-chip:active { transform: scale(0.92); }
  .tag-chip.active {
    background: var(--text);
    border-color: var(--text);
    color: var(--bg);
    animation: tagChipPop 0.28s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes tagChipPop {
    0% { transform: scale(0.88); }
    55% { transform: scale(1.08); }
    100% { transform: scale(1); }
  }

  /* ── PROGRESS BAR ── */
  .progress-wrap {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    margin-bottom: 16px;
  }

  .progress-label {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text2);
    margin-bottom: 10px;
  }

  .progress-pct {
    font-family: 'Unbounded', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .progress-bar-track {
    height: 3px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: var(--text);
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  /* ── MODULE DETAIL ── */
  #detailScreen {
    padding-bottom: 80px;
  }

  .detail-back {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(13,13,13,0.95);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  font-size: 13px;
  color: var(--text2);
  cursor: pointer;
  border-bottom: 1px solid var(--border);
}

.detail-back svg { width: 16px; height: 16px; }

  .detail-content { padding: 16px; }

  .detail-num {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text3);
    margin-bottom: 8px;
  }

  .detail-title {
    font-family: 'Unbounded', sans-serif;
    font-size: 20px;
    font-weight: 600;
    line-height: 1.25;
    margin-bottom: 12px;
  }

  .detail-desc {
    color: var(--text2);
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 24px;
  }

  .embed-wrap {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    margin-bottom: 16px;
    aspect-ratio: 16/9;
  }

  .embed-wrap iframe {
    width: 100%;
    height: 100%;
    border: none;
  }

  .embed-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--text3);
    font-size: 12px;
  }

  .embed-placeholder-icon { font-size: 32px; }

  .files-section { margin-bottom: 24px; }
.files-title { font-size: 12px; color: var(--text3); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px; }

.file-item {
  display: flex;           /* оставляем flex */
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 8px;      /* отступ снизу */
  text-decoration: none;
  color: var(--text);
  transition: all 0.2s;
  width: 100%;             /* на всю ширину */
}

.file-item:hover {
  border-color: var(--border-h);
  background: var(--bg2);
  transform: translateY(-1px);
}

.file-icon {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.file-icon svg {
  display: block;
  width: 18px;
  height: 18px;
}

.file-name {
  font-size: 13px;
  flex: 1;                 /* занимает всё свободное место */
}

.file-arrow {
  display: inline-flex;
  align-items: center;
  line-height: 1;
  opacity: 0.5;
  transition: opacity 0.2s, transform 0.2s;
}

.file-arrow svg {
  display: block;
  width: 14px;
  height: 14px;
}

.file-item:hover .file-arrow {
  opacity: 1;
  transform: translate(2px, -2px);
}

/* Таймкоды */
.timeline-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 8px;
  text-decoration: none;
  color: var(--text);
  transition: all 0.2s;
}

.timeline-item:hover {
  border-color: var(--border-h);
  background: var(--bg2);
  transform: translateX(2px);
}

.timeline-time {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  color: var(--text2);
}

/* Формат ММ:СС (например, 05:30) */
.timeline-time.time-short {
  min-width: 65px;
  max-width: 65px;
}

/* Формат 54:10 (две цифры в часах) */
.timeline-time.time-medium {
  min-width: 75px;
  max-width: 75px;
}

/* Формат ЧЧ:ММ:СС (например, 01:09:04) */
.timeline-time.time-long {
  min-width: 85px;
  max-width: 85px;
}

/* Автоматическая ширина (если нужно) */
.timeline-time.time-auto {
  min-width: auto;
  width: auto;
}

.timeline-time svg {
  flex-shrink: 0;
}

.timeline-time span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timeline-label {
  flex: 1;
  font-size: 13px;
  color: var(--text);
  word-break: break-word;  /* перенос длинных слов */
}

.timeline-arrow {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  opacity: 0.4;
  transition: opacity 0.2s, transform 0.2s;
}

.timeline-item:hover .timeline-arrow {
  opacity: 1;
  transform: translate(2px, -2px);
}

  .done-btn {
    width: 100%;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text2);
    border-radius: var(--radius);
    padding: 14px;
    font-family: 'Geologica', sans-serif;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .done-btn.is-done {
    background: var(--done);
    border-color: rgba(255,255,255,0.2);
    color: var(--text);
  }

  /* ── BOTTOM NAV ── */
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    background: rgba(13,13,13,0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--border);
    display: flex;
    padding: 0 8px;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 2px 14px;
  gap: 4px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--text3);
  font-family: 'Geologica', sans-serif;
  font-size: 9px;
  font-weight: 400;
  line-height: 1;
  white-space: nowrap;
  transition: color 0.2s;
}

.nav-item.active { 
  color: var(--text);
  font-weight: 400;          /* добавить — явно тот же вес */
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;    /* добавить */
}

  /* ── SPINNER ── */
  .spinner {
    width: 20px; height: 20px;
    border: 2px solid var(--border);
    border-top-color: var(--text);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
  }

  /* ── TOAST ── */
  .toast {
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 16px;
    font-size: 13px;
    opacity: 0;
    transition: all 0.3s;
    pointer-events: none;
    white-space: nowrap;
    z-index: 100;
  }

  .toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  /* ── EMPTY STATE ── */
  .empty-state {
    text-align: center;
    padding: 48px 24px;
    color: var(--text3);
  }
  .empty-state-icon { font-size: 40px; margin-bottom: 12px; }
  .empty-state-text { font-size: 13px; line-height: 1.6; }

  /* ── ENROLLING ── */
  .enroll-banner {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    text-align: center;
    margin-bottom: 16px;
  }
  .enroll-banner p { color: var(--text2); font-size: 13px; margin-bottom: 12px; }

  /* Mobile safe area */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    #appScreen, #detailScreen { padding-bottom: calc(80px + env(safe-area-inset-bottom)); }
  }
      :root {
    --gold: #F5C842;
    --gold-dim: rgba(245,200,66,0.12);
    --gold-border: rgba(245,200,66,0.3);
  }
 
  /* Таб-переключатель внутри раздела */
  .coffee-tabs {
    display: flex;
    gap: 6px;
    padding: 16px 16px 0;
  }
  .coffee-tab {
    flex: 1;
    height: 36px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text2);
    font-family: 'Geologica', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all .15s;
  }
  .coffee-tab.active {
    background: var(--bg3);
    border-color: var(--border-hover);
    color: var(--text);
  }
 
  /* Карточка партнёра */
  .coffee-partner-card {
    margin: 12px 16px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .coffee-partner-card.has-match {
    border-color: var(--border-hover);
  }
  .coffee-partner-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
  }
  .coffee-partner-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--bg3);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .coffee-partner-name {
    font-family: 'Unbounded', sans-serif;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .coffee-partner-city {
    font-size: 12px;
    color: var(--text2);
  }
  .coffee-week-badge {
    margin-left: auto;
    font-size: 11px;
    color: var(--text3);
    white-space: nowrap;
  }
  .coffee-partner-body {
    padding: 0 16px 16px;
  }
  .coffee-partner-bio {
    font-size: 13px;
    color: var(--text2);
    margin-bottom: 10px;
    line-height: 1.5;
  }
  .coffee-skills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
  }
  .coffee-skill-tag {
    padding: 4px 10px;
    border-radius: 20px;
    background: var(--accent-dim);
    border: 1px solid var(--border);
    font-size: 11px;
    color: var(--text2);
  }
  .coffee-partner-request {
    font-size: 12px;
    color: var(--text3);
    padding: 10px 12px;
    background: var(--bg3);
    border-radius: 8px;
    margin-bottom: 14px;
  }
  .coffee-partner-request strong {
    color: var(--text2);
  }
  .coffee-actions {
    display: flex;
    gap: 8px;
  }
  .coffee-btn {
    flex: 1;
    height: 40px;
    border-radius: 10px;
    border: none;
    font-family: 'Geologica', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity .15s;
  }
  .coffee-btn:active { opacity: 0.7; }
  .coffee-btn-primary {
    background: #ffffff;
    color: #0d0d0d;
    font-weight: 600;
    letter-spacing: 0.2px;
    border-radius: 999px;
    box-shadow: 0 2px 12px rgba(255,255,255,0.15);
  }
  .coffee-btn-primary:active { opacity: 0.85; }
  .coffee-btn-secondary {
    background: var(--bg3);
    color: var(--text2);
    border: 1px solid var(--border);
  }
  .coffee-btn-danger {
    background: rgba(255,80,80,0.1);
    color: #ff6b6b;
    border: 1px solid rgba(255,80,80,0.2);
  }
  
  .coffee-join-footer {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 16px max(16px, env(safe-area-inset-bottom));
    background: linear-gradient(to top, var(--bg) 70%, transparent);
    z-index: 10;
  }
  .coffee-join-btn {
    width: 100%;
    height: 52px;
    border-radius: 14px;
    border: none;
    background: #ffffff;
    color: #0d0d0d;
    font-family: 'Geologica', sans-serif;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.2px;
    cursor: pointer;
        box-shadow: 0 2px 12px rgba(255,255,255,0.15);
    transition: opacity .15s, transform .1s;
  }
  .coffee-join-btn:active { opacity: 0.85; transform: scale(0.98); }
  .coffee-join-btn:disabled { opacity: 0.5; }
  
  .coffee-edit-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(8px);
    z-index: 500;
    align-items: flex-end;
    justify-content: center;
  }
  .coffee-edit-overlay.open { display: flex; }
  .coffee-edit-sheet {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 24px 24px 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 88vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
  .coffee-edit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: var(--bg2);
    z-index: 1;
  }
  .coffee-edit-title {
    font-family: 'Unbounded', sans-serif;
    font-size: 14px;
    font-weight: 600;
  }
  .coffee-edit-close {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--bg3);
    border: 1px solid var(--border);
    color: var(--text2);
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .coffee-edit-body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .coffee-edit-footer {
    padding: 12px 20px;
    border-top: 1px solid var(--border);
    position: sticky;
    bottom: 0;
    background: var(--bg2);
  }

  /* Статус встречи */
  .coffee-status-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-top: 1px solid var(--border);
    font-size: 12px;
    color: var(--text3);
  }
  .coffee-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text3);
    flex-shrink: 0;
  }
  .coffee-status-dot.active { background: #6bffb8; box-shadow: 0 0 6px #6bffb8; }
  .coffee-status-dot.done   { background: #F5C842; }
  .coffee-status-dot.complained { background: #ff6b6b; }
 
  /* Онбординг-форма */
  .coffee-form {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .coffee-form-title {
    font-family: 'Unbounded', sans-serif;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .coffee-form-sub {
    font-size: 13px;
    color: var(--text2);
    margin-bottom: 8px;
    line-height: 1.5;
  }
  .coffee-input {
    width: 100%;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 14px;
    color: var(--text);
    font-family: 'Geologica', sans-serif;
    font-size: 14px;
    outline: none;
    transition: border-color .15s;
    resize: none;
  }
  .coffee-input:focus { border-color: var(--border-hover); }
  .coffee-input::placeholder { color: var(--text3); }
  .coffee-input-label {
    font-size: 11px;
    color: var(--text3);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
    padding-left: 2px;
  }
  .coffee-char-count {
    text-align: right;
    font-size: 11px;
    color: var(--text3);
    margin-top: -8px;
  }
  .coffee-char-count.warn { color: #ff6b6b; }
 
  /* Скилл-поля (3 штуки) */
  .coffee-skills-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
 
  /* История встреч */
  .coffee-history-item {
    margin: 0 16px 10px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
  }
  .coffee-history-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .coffee-history-name {
    font-size: 14px;
    font-weight: 500;
  }
  .coffee-history-week {
    font-size: 11px;
    color: var(--text3);
  }
  .coffee-history-city {
    font-size: 12px;
    color: var(--text2);
    margin-bottom: 10px;
  }
  .coffee-ratings-row {
    display: flex;
    gap: 10px;
  }
  .coffee-rating-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 20px;
    font-size: 12px;
    background: var(--bg3);
    border: 1px solid var(--border);
  }
  .coffee-rating-pill.mine { border-color: var(--gold-border); background: var(--gold-dim); }
  .coffee-rating-pill.theirs { opacity: 0.6; }
  .coffee-rating-pill.pending { color: var(--text3); }
 
  /* Профиль-блок (мой статус) */
  .coffee-profile-card {
    margin: 12px 16px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 16px;
  }
  .coffee-profile-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .coffee-profile-name {
    font-family: 'Unbounded', sans-serif;
    font-size: 14px;
    font-weight: 600;
  }
  .coffee-rating-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 20px;
    background: var(--gold-dim);
    border: 1px solid var(--gold-border);
    font-size: 12px;
    color: var(--gold);
    font-weight: 600;
  }
  .coffee-profile-meta {
    font-size: 12px;
    color: var(--text2);
    margin-bottom: 10px;
  }
  .coffee-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1px solid var(--border);
  }
  .coffee-toggle-label {
    font-size: 13px;
    color: var(--text2);
  }
  .coffee-toggle {
    position: relative;
    width: 42px;
    height: 24px;
  }
  .coffee-toggle input { display: none; }
  .coffee-toggle-slider {
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: var(--bg3);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: background .2s;
  }
  .coffee-toggle-slider::before {
    content: '';
    position: absolute;
    left: 3px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--text3);
    transition: all .2s;
  }
  .coffee-toggle input:checked + .coffee-toggle-slider { background: rgba(107,255,184,0.2); border-color: rgba(107,255,184,0.4); }
  .coffee-toggle input:checked + .coffee-toggle-slider::before { background: #6bffb8; left: calc(100% - 19px); }
 
  /* Ядро-промо блок */
  .coffee-nucleus-promo {
    margin: 0 16px 16px;
    background: linear-gradient(135deg, rgba(245,200,66,0.08) 0%, rgba(245,200,66,0.03) 100%);
    border: 1px solid var(--gold-border);
    border-radius: var(--radius-lg);
    padding: 18px;
    display: flex;
    gap: 14px;
    align-items: flex-start;
    cursor: pointer;
    transition: border-color .15s;
  }
  .coffee-nucleus-promo:active { border-color: var(--gold); }
  .coffee-nucleus-icon {
    font-size: 28px;
    flex-shrink: 0;
    line-height: 1;
  }
  .coffee-nucleus-title {
    font-family: 'Unbounded', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: var(--gold);
    margin-bottom: 4px;
  }
  .coffee-nucleus-text {
    font-size: 12px;
    color: var(--text2);
    line-height: 1.5;
  }
  .coffee-nucleus-arrow {
    margin-left: auto;
    font-size: 16px;
    color: var(--gold);
    flex-shrink: 0;
    align-self: center;
  }
 
  /* Секция-заголовок */
  .coffee-section-title {
    padding: 16px 16px 8px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text3);
    font-weight: 500;
  }
 
  /* Пустые состояния */
  .coffee-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 32px;
    text-align: center;
    gap: 12px;
  }
  .coffee-empty-icon { font-size: 40px; }
  .coffee-empty-title { font-family: 'Unbounded', sans-serif; font-size: 14px; font-weight: 600; }
  .coffee-empty-sub { font-size: 13px; color: var(--text2); line-height: 1.5; }
 
  /* Модалка оценки */
  .coffee-rate-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(8px);
    z-index: 500;
    align-items: flex-end;
    justify-content: center;
  }
  .coffee-rate-overlay.open { display: flex; }
  .coffee-rate-sheet {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 24px 24px 0 0;
    padding: 24px;
    width: 100%;
    max-width: 480px;
    padding-bottom: max(24px, env(safe-area-inset-bottom));
  }
  .coffee-rate-title {
    font-family: 'Unbounded', sans-serif;
    font-size: 15px;
    font-weight: 600;
    text-align: center;
    margin-bottom: 6px;
  }
  .coffee-rate-sub {
    font-size: 13px;
    color: var(--text2);
    text-align: center;
    margin-bottom: 20px;
  }
  .coffee-stars-row {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 20px;
  }
  .coffee-star {
    font-size: 32px;
    cursor: pointer;
    opacity: 0.3;
    transition: opacity .1s, transform .1s;
    user-select: none;
  }
  .coffee-star.active { opacity: 1; transform: scale(1.1); }
  .coffee-rate-complaint {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-radius: var(--radius);
    background: var(--bg3);
    border: 1px solid var(--border);
    margin-bottom: 14px;
    cursor: pointer;
  }
  .coffee-rate-complaint.checked {
    border-color: rgba(255,80,80,0.3);
    background: rgba(255,80,80,0.07);
  }
  .coffee-rate-checkbox {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 1px solid var(--border);
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 11px;
  }
  .coffee-rate-complaint.checked .coffee-rate-checkbox {
    background: rgba(255,80,80,0.2);
    border-color: #ff6b6b;
    color: #ff6b6b;
  }
  .coffee-rate-note-wrap {
    display: none;
    margin-bottom: 14px;
  }
  .coffee-rate-note-wrap.show { display: block; }
    /* Исправления для формы Рандом Кофе */
  .coffee-form {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px; /* Увеличил отступ между полями */
    padding-bottom: 100px; /* Место для закрепленной кнопки */
  }

  /* Кнопка "Присоединиться" теперь широкая и закреплена */
  .coffee-form .coffee-btn-primary {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-width: 100% !important;
    border-radius: 0;
    padding: 16px;
    margin: 0;
    z-index: 100;
    font-size: 16px !important;
    font-weight: 600;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
  }

  /* Исправление для input и textarea внутри формы */
  .coffee-form .coffee-input,
  .coffee-form .coffee-input-label {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }
  
  .coffee-form .coffee-input {
    margin-top: 4px;
  }
    /* Модалка редактирования */
#coffeeEditModal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: var(--bg);
  overflow-y: auto;
}

/* ── DESKTOP ADAPTATION ──
   Мини-ап показывается «телефоном» по центру широкого экрана.
   Полноценная десктоп-версия платформы появится отдельно. */
@media (min-width: 720px) {
  html { background: #000; }
  body { background: #000; }

  .screen.active {
    max-width: 480px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 0 1px var(--border), 0 24px 70px rgba(0,0,0,0.55);
  }

  .bottom-nav,
  .coffee-form .coffee-btn-primary,
  #coffeeEditModal,
  .desktop-fixed-bar {
    width: 480px !important;
    max-width: 480px !important;
    left: 50% !important;
    right: auto !important;
    transform: translateX(-50%) !important;
  }

  .desktop-fixed-inset-bar {
    width: 448px !important;
    max-width: 448px !important;
    left: 50% !important;
    right: auto !important;
    transform: translateX(-50%) !important;
  }
}
</style>
</head>
<body>

<!-- LOADING -->
<div id="loadingScreen" class="loading-screen">
  <div class="spinner"></div>
</div>

<!-- AUTH SCREEN -->
<div id="authScreen" class="screen">
  <div class="auth-logo">CMO</div>
  <div class="auth-sub">Субботние разборы</div>
  <div class="auth-icon">📚</div>
  <div class="auth-title" id="authTitle">Добро пожаловать</div>
  <div class="auth-desc" id="authDesc"></div>
  <div class="input-wrap" id="emailWrap">
    <input type="email" id="emailInput" placeholder="example@email.com" 
      autocomplete="email" inputmode="email"/>
  </div>
  <button class="btn-primary" id="checkEmailBtn" onclick="checkEmail()">
    Проверить
  </button>
  <div class="auth-msg" id="authMsg"></div>
</div>

<!-- MAIN APP -->
<div id="appScreen" class="screen">
  <div class="topbar">
    <div class="topbar-logo" style="display:flex;align-items:center;gap:8px">
      <span id="currentProgramName" style="display:none"></span>
      <span id="dropdownArrow" style="font-size:10px;transition:transform 0.2s;display:none"></span>
      <span role="button" tabindex="0" onclick="event.stopPropagation();openTgDeepLink('https://t.me/+Lh27u2ZjQMA3NDcy')" class="topbar-icon-btn" title="Чат">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H12a8.38 8.38 0 0 1-4-1L3 20l1-5a8.38 8.38 0 0 1-1-4 8.5 8.5 0 0 1 8.5-8.5h.5a8.5 8.5 0 0 1 8.5 8.5z"/></svg>
      </span>
      <span role="button" tabindex="0" onclick="event.stopPropagation();openTgDeepLink('https://t.me/oleg_ezhkov')" class="topbar-icon-btn" title="Поддержка">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><line x1="5.4" y1="5.4" x2="8.6" y2="8.6"/><line x1="15.4" y1="15.4" x2="18.6" y2="18.6"/><line x1="15.4" y1="8.6" x2="18.6" y2="5.4"/><line x1="5.4" y1="18.6" x2="8.6" y2="15.4"/></svg>
      </span>
    </div>
    <div class="topbar-user">
      <span class="topbar-name" id="topbarName"></span>
      <div class="topbar-avatar" id="topbarAvatar"></div>
    </div>
  </div>

  <div id="programMenu" style="display:none;position:absolute;top:52px;left:12px;z-index:100;background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;min-width:200px">
    <div onclick="selectProgram('ai')" style="padding:12px 16px;cursor:pointer;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;gap:10px">
      <span style="font-size:18px;width:24px;text-align:center">☆</span> ИИ-контент
    </div>
    <div onclick="selectProgram('funnels')" style="padding:12px 16px;cursor:pointer;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;gap:10px">
      <span style="font-size:18px;width:24px;text-align:center">➶</span> Воронки
    </div>
  </div>

  <!-- Основной контент -->
  <div class="content" id="mainContent"></div>

  <!-- Gate для гостей — внутри appScreen, скрыт по умолчанию -->
  <div id="nucleusGateScreen" style="display:none; overflow-y:auto; position:absolute; top:52px; left:0; right:0; bottom:60px; padding: 20px 16px 20px;">

    <div style="margin-bottom:24px;">
  <div style="font-size:22px; font-weight:700; margin-bottom:4px;">CMO Ядро</div>
  <div style="color:#888; font-size:14px;">
    Комьюнити для маркетологов, фаундеров и CMO, которые внедряют ИИ в бизнес
  </div>
</div>

<div style="background:#1a1a1a; border-radius:12px; padding:16px; margin-bottom:10px;">
  <div style="font-weight:600; margin-bottom:8px;">Формат</div>
  <div style="color:#ccc; font-size:14px; line-height:1.5;">
    Каждую субботу в 12:15 (мск) — живой воркшоп с разбором рабочих AI-схем, инструментов и новых маркетинговых механик. После эфира всю неделю помогаем участникам внедрить решение в свой проект и довести до результата.
  </div>
</div>

<div style="background:#1a1a1a; border-radius:12px; padding:16px; margin-bottom:10px;">
  <div style="font-weight:600; margin-bottom:8px;">Что изучаем в июне</div>
  <div style="color:#ccc; font-size:14px; line-height:1.8;">
    ☄️ Полностью автоматизированный AI-контент: рилсы, посты, карусели, SEO и трендвотчинг.<br>
    ☄️ Игровые мини-курсы для прогрева холодного трафика и эвергрин-воронки с высокой конверсией.<br><br>
    Эксперты направления:<br>
    — Илья Чумаченков (AI-контент)<br>
    — Олег Ежков (игровые мини-курсы и воронки)
  </div>
</div>

<div style="background:#1a1a1a; border-radius:12px; padding:16px; margin-bottom:10px;">
  <div style="font-weight:600; margin-bottom:8px;">Что внутри</div>
  <div style="color:#ccc; font-size:14px; line-height:1.8;">
    — Закрытое комьюнити маркетологов и предпринимателей<br>
    — Записи всех воркшопов и база знаний<br>
    — Практические задания с отслеживанием прогресса<br>
    — Поддержка и помощь во внедрении<br>
    — Мастер-группы и нетворкинг<br>
    — AI-инструменты и рекомендации
  </div>
</div>

<div style="background:#1a1a1a; border-radius:12px; padding:16px; margin-bottom:10px;">
  <div style="font-weight:600; margin-bottom:8px;">Результат</div>
  <div style="color:#ccc; font-size:14px; line-height:1.5;">
    Вы внедряете ИИ в маркетинг на практике: автоматизируете контент, воронки, прогрев и процессы продаж вместе с экспертами и комьюнити — без бесконечных курсов и теории.
  </div>
</div>

<div style="background:#1a1a1a; border-radius:12px; padding:16px; margin-bottom:20px;">
  <div style="font-weight:600; margin-bottom:8px;">Условия участия</div>
  <div style="color:#ccc; font-size:14px; line-height:1.8;">
    — 5 000 ₽/мес<br>
    — Практика и выполнение заданий<br>
    — Активное участие в комьюнити<br>
    — Подписание NDA
  </div>
</div>

    <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:8px;">

  <div id="nucleusEmailForm" style="background:#1a1a1a;border-radius:12px;padding:16px;">
    <div style="font-weight:600;margin-bottom:4px;">Уже участник Ядра?</div>
    <div style="color:#888;font-size:13px;margin-bottom:12px;">Введи email, с которым оплатил участие</div>
    <div class="input-wrap" style="max-width:100%;margin-bottom:10px;">
      <input type="email" id="nucleusEmailInput" placeholder="example@email.com"
        autocomplete="email" inputmode="email"
        onkeydown="if(event.key==='Enter')checkNucleusEmail()"/>
    </div>
    <button class="btn-primary"
      style="width:100%; max-width:100%; box-sizing:border-box;"
      onclick="checkNucleusEmail()">
      Войти
    </button>
    <div id="nucleusEmailMsg" style="font-size:13px; margin-top:10px; color:#888;"></div>
  </div>

  <a href="https://t.me/m/R12fmbLzOWJi" target="_blank"
    style="width:100%; display:block; text-decoration:none;">
    <button class="btn-primary"
        style="width:100%; max-width:100%; box-sizing:border-box; background:transparent; border:1px solid #444; color:#ccc; font-size:14px;">
      Хочу вступить в Ядро →
    </button>
  </a>
</div>
</div>

  <!-- Bottom Nav -->
  <nav class="bottom-nav">
    <button class="nav-item" id="nav-home" onclick="navTo('home')">
      <span class="nav-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="9"/>
          <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
        </svg>
      </span>
      Ядро
    </button>
    <button class="nav-item" id="nav-kb" onclick="navTo('kb')">
      <span class="nav-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          <line x1="9" y1="7" x2="15" y2="7"/>
          <line x1="9" y1="11" x2="15" y2="11"/>
        </svg>
      </span>
      База знаний
    </button>
    <button class="nav-item active" id="nav-progress" onclick="navTo('progress')">
      <span class="nav-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 8h1a4 4 0 0 1 0 8h-1"/>
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/>
          <line x1="6" y1="2" x2="6" y2="4"/>
          <line x1="10" y1="2" x2="10" y2="4"/>
          <line x1="14" y1="2" x2="14" y2="4"/>
        </svg>
      </span>
      Нетворк
    </button>
    <button class="nav-item" id="nav-ask" onclick="navTo('ask')">
      <span class="nav-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
      </span>
      Мероприятия
    </button>
  </nav>


  <!-- COFFEE RATE MODAL -->
<div class="coffee-rate-overlay" id="coffeeRateOverlay">
  <div class="coffee-rate-sheet">
    <div class="coffee-rate-title">Оценить встречу</div>
    <div class="coffee-rate-sub" id="coffeeRateSub">Как прошла встреча с партнёром?</div>
    <div class="coffee-stars-row" id="coffeeStarsRow">
      <span class="coffee-star" data-v="1">★</span>
      <span class="coffee-star" data-v="2">★</span>
      <span class="coffee-star" data-v="3">★</span>
      <span class="coffee-star" data-v="4">★</span>
      <span class="coffee-star" data-v="5">★</span>
    </div>
    <div class="coffee-rate-complaint" id="coffeeComplaintToggle" onclick="toggleCoffeeComplaint()">
      <div class="coffee-rate-checkbox" id="coffeeCheckbox"></div>
      <span style="font-size:13px;color:var(--text2)">Партнёр не вышел на связь</span>
    </div>
    <div class="coffee-rate-note-wrap" id="coffeeNoteWrap">
      <textarea class="coffee-input" id="coffeeNoteInput" rows="3" placeholder="Коротко опишите ситуацию (необязательно)"></textarea>
    </div>
    <div style="display:flex;gap:8px">
      <button class="coffee-btn coffee-btn-secondary" style="flex:0 0 80px" onclick="closeCoffeeRate()">Отмена</button>
      <button class="coffee-btn coffee-btn-primary" id="coffeeRateSubmitBtn" onclick="submitCoffeeRate()">Отправить</button>
    </div>
  </div>
</div>

<!-- COFFEE EDIT MODAL -->
<div class="coffee-edit-overlay" id="coffeeEditOverlay">
  <div class="coffee-edit-sheet">
    <div class="coffee-edit-header">
      <div class="coffee-edit-title">Редактировать профиль</div>
      <button class="coffee-edit-close" onclick="closeCoffeeEdit()">✕</button>
    </div>
    <div class="coffee-edit-body">
 
      <div>
        <div class="coffee-input-label">О себе — как твит</div>
        <textarea class="coffee-input" id="edit_bio" rows="3" maxlength="280"
          oninput="updateCoffeeCount(this,'edit_bio_count',280)"
          placeholder="Кто ты, чем занимаешься, чем живёшь"></textarea>
        <div class="coffee-char-count" id="edit_bio_count">0 / 280</div>
      </div>
 
      <div>
        <div class="coffee-input-label">Мой запрос на эту неделю</div>
        <textarea class="coffee-input" id="edit_request" rows="2" maxlength="200"
          oninput="updateCoffeeCount(this,'edit_request_count',200)"
          placeholder="Что ищу, в чём нужна помощь или мнение"></textarea>
        <div class="coffee-char-count" id="edit_request_count">0 / 200</div>
      </div>
 
      <div>
        <div class="coffee-input-label">Чем готов помочь — 3 пункта</div>
        <div class="coffee-skills-group">
          <input class="coffee-input" id="edit_skill0" type="text" placeholder="Навык 1"/>
          <input class="coffee-input" id="edit_skill1" type="text" placeholder="Навык 2"/>
          <input class="coffee-input" id="edit_skill2" type="text" placeholder="Навык 3"/>
        </div>
      </div>

    </div>
    <div class="coffee-edit-footer">
      <button class="coffee-join-btn" id="coffeeEditSaveBtn" onclick="saveCoffeeEdit()">Сохранить</button>
    </div>
  </div>
</div>

</div>
<!-- конец appScreen -->

<!-- DETAIL SCREEN -->
<div id="detailScreen" class="screen">
  <div class="detail-back" onclick="closeDetail()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
    Назад
  </div>
  <div class="detail-content" id="detailContent"></div>
</div>

<!-- TOAST -->
<div class="toast" id="toast"></div>

<script>
const WORKER = '';
let tasksData = { ai: [], funnels: [] };
let taskProgressData = { ai: { completed: [] }, funnels: { completed: [] } };
let tg = window.Telegram?.WebApp;
let initData = tg?.initData || '';
let currentUser = null;
let currentRole = 'guest';
let currentProgram = 'ai';
let currentSection = 'knowledge';
let programData = { ai: null, funnels: null };
let progressData = { ai: { completed: [] }, funnels: { completed: [] } };
let enrollData = { ai: false, funnels: false };
const BOT_USERNAME = 'cmo_razbory_bot';

// ── INIT ──────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  tg?.expand();
  tg?.setHeaderColor('#0d0d0d');
  tg?.setBackgroundColor('#0d0d0d');

  const savedEmail = localStorage.getItem('cmo_email');
  if (savedEmail) {
    try {
      const res = await fetch('/api/auth-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: savedEmail, initData: window.Telegram?.WebApp?.initData || '' })
      }).then(r => r.json());

      if (res.ok) {
        currentUser = res.user;
        currentRole = 'member';
      } else {
        localStorage.removeItem('cmo_email');
        currentRole = 'guest';
        currentUser = {};
      }
    } catch(e) {
      currentRole = 'guest';
      currentUser = {};
    }
  } else if (initData) {
    try {
      const res = await api('/api/auth', { initData });
      if (res.ok) {
        currentUser = res.user;
        currentRole = res.role;
      } else {
        currentRole = 'guest';
        currentUser = {};
      }
    } catch(e) {
      currentRole = 'guest';
      currentUser = {};
    }
  } else {
    currentRole = 'guest';
    currentUser = {};
  }

  // Грузим данные для всех
  await loadUserData();
  updateEventsNavVisibility();

  // Показываем нужный экран
  showScreen('appScreen');
  if (currentRole !== 'member') {
    // Гость — дефолт нетворк, ядро заблокировано
    navTo('progress');
  } else {
    // Участник — дефолт нетворк
    navTo('progress');
  }

  document.getElementById('loadingScreen').style.display = 'none';
});

function showAuthError(title, text) {
  document.getElementById('authTitle').textContent = title;
  document.getElementById('authDesc').textContent = text;
  document.getElementById('emailWrap').style.display = 'block';
  document.getElementById('checkEmailBtn').style.display = 'block';
  showScreen('authScreen');
}

async function updateEventsNavVisibility() {
  try {
    const data = await fetch('/api/events').then(r => r.json());
    const now = Date.now();
    const hasUpcoming = (data.events || []).some(function(ev) {
      const endTime = new Date(ev.datetime).getTime() + (ev.duration || 90) * 60 * 1000;
      return endTime > now;
    });
    const navBtn = document.getElementById('nav-ask');
    if (navBtn) navBtn.style.display = hasUpcoming ? '' : 'none';
    if (!hasUpcoming && currentSection === 'questions') {
      navTo('progress');
    }
  } catch(e) {}
}

function formatEventDate(dt) {
  const d = new Date(dt);
  const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  return days[d.getDay()] + ', ' + d.toLocaleDateString('ru', {day:'numeric',month:'long'}) + ' · ' + d.toLocaleTimeString('ru', {hour:'2-digit',minute:'2-digit'});
}

async function loadUserData() {
  try {
    [programData.ai, programData.funnels] = await Promise.all([
      api('/api/program?id=ai'),
      api('/api/program?id=funnels')
    ]);

    // Прогресс и задания грузим только для участников
    const userId = currentUser?.tgId || tg?.initDataUnsafe?.user?.id;
    if (userId && currentRole === 'member') {
      const [pAi, pFun] = await Promise.all([
        fetch('/api/progress?userId=' + userId + '&programId=ai').then(r => r.json()),
        fetch('/api/progress?userId=' + userId + '&programId=funnels').then(r => r.json())
      ]);
      const [tasksAi, tasksFunnels] = await Promise.all([
        fetch('/api/tasks?id=ai').then(r => r.json()),
        fetch('/api/tasks?id=funnels').then(r => r.json())
      ]);
      tasksData.ai = tasksAi.tasks || [];
      tasksData.funnels = tasksFunnels.tasks || [];

      const [tpAi, tpFun] = await Promise.all([
        fetch('/api/task-progress?userId=' + userId + '&programId=ai').then(r => r.json()),
        fetch('/api/task-progress?userId=' + userId + '&programId=funnels').then(r => r.json())
      ]);
      taskProgressData.ai = tpAi;
      taskProgressData.funnels = tpFun;

      progressData.ai = pAi;
      progressData.funnels = pFun;
    }
  } catch(e) {}

  renderUserUI();
  // конец — больше ничего не вызываем отсюда
}

function renderUserUI() {
  if (!currentUser) return;
  const nameEl = document.getElementById('topbarName');
  const avatarEl = document.getElementById('topbarAvatar');
  nameEl.textContent = currentUser.first_name || '';
  if (currentUser.photo_url) {
    avatarEl.innerHTML = '<img src="' + currentUser.photo_url + '" alt="avatar"/>';
  } else {
    avatarEl.textContent = (currentUser.first_name || '?')[0].toUpperCase();
  }
}

// ── SCREENS ──────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

const PROGRAM_NAMES = {
  ai: 'ИИ-контент',
  funnels: 'Воронки',
};

function toggleProgramMenu() {
  const menu = document.getElementById('programMenu');
  const arrow = document.getElementById('dropdownArrow');
  const open = menu.style.display === 'block';
  menu.style.display = open ? 'none' : 'block';
  arrow.style.transform = open ? '' : 'rotate(180deg)';
}

const PROGRAM_ICONS = { ai: '☆', funnels: '➶'};

function selectProgram(prog) {
  currentProgram = prog;
  document.getElementById('currentProgramName').textContent = PROGRAM_ICONS[prog] + ' ' + PROGRAM_NAMES[prog];
 document.getElementById('programMenu').style.display = 'none';
  document.getElementById('dropdownArrow').style.transform = '';
  renderContent();
}

// Закрывать при клике вне меню
document.addEventListener('click', function(e) {
  if (!e.target.closest('.topbar-logo')) {
    document.getElementById('programMenu').style.display = 'none';
    document.getElementById('dropdownArrow').style.transform = '';
  }
});

function showApp() {}

// ── AUTH ─────────────────────────────────────────────────────
async function checkEmail() {
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  const msg = document.getElementById('authMsg');
  const btn = document.getElementById('checkEmailBtn');

  if (!email || !email.includes('@')) {
    msg.className = 'auth-msg error';
    msg.textContent = 'Введи корректный email';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Проверяем...';
  msg.textContent = '';

  try {
    const res = await fetch('/api/auth-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, initData: window.Telegram?.WebApp?.initData || '' })
    }).then(r => r.json());

    if (res.ok) {
      // Сохранить email для будущих сессий
      localStorage.setItem('cmo_email', email);
      currentUser = res.user;
      await loadUserData();
      showApp();
    } else {
      msg.className = 'auth-msg error';
      msg.textContent = res.error || 'Email не найден. Напиши боту — @cmo_razbory_bot';
    }
  } catch(e) {
    msg.className = 'auth-msg error';
    msg.textContent = 'Ошибка соединения. Попробуй снова.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Войти';
  }
}

function navTo(page) {
  if ((page === 'home' || page === 'kb') && currentRole !== 'member') {
    showNucleusGate();
    return;
  }

  document.getElementById('nucleusGateScreen').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';

  // Топбар (иконки чата/поддержки + профиль) виден только на вкладке «Ядро»
  const topbarEl = document.querySelector('.topbar');
  if (topbarEl) topbarEl.style.display = page === 'home' ? 'flex' : 'none';
  document.getElementById('programMenu').style.display = 'none';

  showScreen('appScreen');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('nav-' + page).classList.add('active');

  if (page === 'home') {
    currentSection = 'knowledge';
  } else if (page === 'kb') {
    currentSection = 'kb';
  } else if (page === 'progress') {
    currentSection = 'progress';
  } else if (page === 'ask') {
    currentSection = 'questions';
  }
  track('section_view', { section: currentSection });
  renderContent();
}

// Лёгкая fire-and-forget отправка события активности (не блокирует UI)
function track(type, meta) {
  try {
    const tgId = currentUser?.tgId || tg?.initDataUnsafe?.user?.id || null;
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, tgId, initData, meta: meta || null })
    }).catch(() => {});
  } catch(e) {}
}

function showNucleusGate() {
  document.getElementById('mainContent').style.display = 'none';
  document.getElementById('nucleusGateScreen').style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('nav-home').classList.add('active');
}

function showNucleusEmailForm() {
  document.getElementById('nucleusEmailForm').style.display = 'block';
  document.getElementById('nucleusEmailInput').focus();
}

async function checkNucleusEmail() {
  const email = document.getElementById('nucleusEmailInput').value.trim().toLowerCase();
  const msg = document.getElementById('nucleusEmailMsg');

  if (!email || !email.includes('@')) {
    msg.style.color = '#ef4444';
    msg.textContent = 'Введи корректный email';
    return;
  }

  msg.style.color = '#888';
  msg.textContent = 'Проверяем...';

  try {
    const res = await fetch('/api/auth-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, initData: window.Telegram?.WebApp?.initData || '' })
    }).then(r => r.json());

    if (res.ok) {
      localStorage.setItem('cmo_email', email);
      currentUser = res.user;
      currentRole = 'member';
      document.getElementById('nucleusGateScreen').style.display = 'none';
      document.getElementById('mainContent').style.display = 'block';
      await loadUserData();
      navTo('home');
    } else {
      // Email не найден — отправить заявку как pending
      try {
        await fetch('/api/request-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, initData: window.Telegram?.WebApp?.initData || '' })
        });
      } catch(e) {}

      msg.style.color = '#f59e0b';
      msg.textContent = 'Ожидайте подтверждения администратора';
    }
  } catch(e) {
    msg.style.color = '#ef4444';
    msg.textContent = 'Ошибка соединения. Попробуй снова.';
  }
}

// ── RENDER CONTENT ───────────────────────────────────────────
function renderContent() {
  const container = document.getElementById('mainContent');

  if (currentSection === 'knowledge') {
    renderKnowledge(container);
  } else if (currentSection === 'kb') {
    renderKBPage(container);
  } else if (currentSection === 'progress') {
    renderCoffeeStub(container);
  } else if (currentSection === 'questions') {
    renderEvents(container);
  }
}

let coffeeData = null;       // кэш данных с сервера
let coffeeTab = 'current';   // 'current' | 'history'
let coffeeRateWeekId = null;
let coffeeRateStars = 0;
let coffeeRateComplaint = false;
 
async function renderCoffeeStub(container) {
  container.innerHTML = '<div class="coffee-empty"><span class="coffee-empty-icon">☕</span><span class="coffee-empty-title">Загружаем...</span></div>';
 
  try {
    const tgId = currentUser?.tgId || tg?.initDataUnsafe?.user?.id;
    if (!tgId) {
      renderCoffeeOnboarding(container, null);
      return;
    }
 
    const res = await fetch('/api/coffee/status?tgId=' + tgId).then(r => r.json());
    coffeeData = res;
 
    if (!res.profile) {
      renderCoffeeOnboarding(container, tgId);
    } else {
      renderCoffeeMain(container, res, tgId);
    }
  } catch(e) {
    container.innerHTML = '<div class="coffee-empty"><span class="coffee-empty-icon">⚠️</span><span class="coffee-empty-title">Ошибка загрузки</span></div>';
  }
}

function renderCoffeeOnboarding(container, tgId) {
  container.innerHTML = \`
    <div style="padding: 16px 0;">
      <div class="coffee-form-title" style="padding: 0 16px;">☕ Рандом Кофе</div>
      <div class="coffee-form-sub" style="padding: 0 16px 16px;">Каждую неделю — новый партнёр для короткой встречи. Обменяйся опытом, помоги или получи помощь.</div>
    </div>
 
    <div class="coffee-form">
      <div>
        <div class="coffee-input-label">Имя</div>
        <input class="coffee-input" id="cf_name" type="text" placeholder="Как тебя зовут?" value="\${escapeHtml(currentUser?.name || currentUser?.first_name || '')}"/>
      </div>
 
      <div>
        <div class="coffee-input-label">О себе <span style="color:var(--text3);font-size:10px">— как твит</span></div>
        <textarea class="coffee-input" id="cf_bio" rows="3" maxlength="280"
          oninput="updateCoffeeCount(this,'cf_bio_count',280)"
          placeholder="Кто ты, чем занимаешься, чем живёшь"></textarea>
        <div class="coffee-char-count" id="cf_bio_count">0 / 280</div>
      </div>
 
      <div>
        <div class="coffee-input-label">Мой запрос на эту неделю</div>
        <textarea class="coffee-input" id="cf_request" rows="2" maxlength="200"
          oninput="updateCoffeeCount(this,'cf_request_count',200)"
          placeholder="Что ищу, в чём нужна помощь или мнение"></textarea>
        <div class="coffee-char-count" id="cf_request_count">0 / 200</div>
      </div>
 
      <div>
        <div class="coffee-input-label">Чем готов помочь — 3 пункта</div>
        <div class="coffee-skills-group">
          <input class="coffee-input" id="cf_skill0" type="text" placeholder="Например: маркетинг в b2b"/>
          <input class="coffee-input" id="cf_skill1" type="text" placeholder="Например: нетворк в недвижимости"/>
          <input class="coffee-input" id="cf_skill2" type="text" placeholder="Например: найм руководителей"/>
        </div>
      </div>
 
 
    </div>

    <div class="desktop-fixed-bar" style="position: fixed; left: 0; right: 0; bottom: calc(76px + env(safe-area-inset-bottom)); padding: 0 16px; z-index: 60;">
      <button class="coffee-btn coffee-btn-primary" id="coffeeSubmitBtn" style="width: 100%; height: 52px;" onclick="submitCoffeeOnboarding('\${tgId}')">
        Присоединиться к Рандом Кофе
      </button>
    </div>
  \`;

  restoreOnboardingFormData();
  
  // Обновляем счетчики, если они есть
  ['cf_bio', 'cf_request'].forEach(id => {
    const el = document.getElementById(id);
    if (el) updateCoffeeCount(el, \`\${id}_count\`, id === 'cf_bio' ? 280 : 200);
  });
}

function restoreOnboardingFormData() {
  const savedData = sessionStorage.getItem('coffee_onboarding_form_data');
  const isOnboardingMode = sessionStorage.getItuserData?.tgIdem('coffee_onboarding_mode');
  
  if (savedData && isOnboardingMode === 'true') {
    const data = JSON.parse(savedData);
    setTimeout(() => {
      if (data.name) document.getElementById('cf_name') && (document.getElementById('cf_name').value = data.name);
      if (data.city) document.getElementById('cf_city') && (document.getElementById('cf_city').value = data.city);
      if (data.bio) document.getElementById('cf_bio') && (document.getElementById('cf_bio').value = data.bio);
      if (data.request) document.getElementById('cf_request') && (document.getElementById('cf_request').value = data.request);
      if (data.skills) {
        data.skills.forEach((skill, i) => {
          if (skill && document.getElementById(\`cf_skill\${i}\`)) {
            document.getElementById(\`cf_skill\${i}\`).value = skill;
          }
        });
      }
      // Обновляем счетчики
      ['cf_bio', 'cf_request'].forEach(id => {
        const el = document.getElementById(id);
        if (el) updateCoffeeCount(el, \`\${id}_count\`, id === 'cf_bio' ? 280 : 200);
      });
    }, 100);
    
    // Очищаем после восстановления
    sessionStorage.removeItem('coffee_onboarding_form_data');
    sessionStorage.removeItem('coffee_onboarding_mode');
  }
}


function renderCoffeeMain(container, data, tgId) {
  const { profile, match, history, avgRating, totalMeetings } = data;
 
  const profileHTML = renderCoffeeProfileCard(profile, avgRating, tgId);
  const bodyHTML = renderCoffeeCurrentTab(match, profile, tgId);
 
  const nucleusPromo = \`
    <div class="coffee-section-title">Расширенный нетворк</div>
    <div class="coffee-nucleus-promo" onclick="navTo('home')">
      <div class="coffee-nucleus-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
      </div>
      <div>
        <div class="coffee-nucleus-title">Ядро</div>
        <div class="coffee-nucleus-text">Участники с профилями, запросами и историей встреч. Глубокий нетворк.</div>
      </div>
      <div class="coffee-nucleus-arrow">›</div>
    </div>
  \`;
 
  const historyLink = totalMeetings > 0 ? \`
    <div style="padding: 4px 16px 24px; text-align: center;">
      <span onclick="openCoffeeHistory()" style="font-size:13px;color:var(--text3);text-decoration:underline;text-underline-offset:3px;cursor:pointer;">
        История встреч (\${totalMeetings})
      </span>
    </div>
  \` : \`
    <div style="padding: 4px 16px 24px; text-align: center;">
      <span style="font-size:13px;color:var(--text3);">
        Здесь будет история встреч
      </span>
    </div>
  \`;
 
  container.innerHTML = profileHTML + bodyHTML + nucleusPromo + historyLink;
}

function openCoffeeHistory() {
  const container = document.getElementById('mainContent');
  const history = coffeeData?.history || [];
 
  const backBtn = \`
    <div style="padding:16px 16px 0; display:flex; align-items:center; gap:10px;">
      <button onclick="renderCoffeeMain(document.getElementById('mainContent'), coffeeData, currentUser?.tgId)"
        style="background:none;border:none;color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:6px;font-family:'Geologica',sans-serif;font-size:13px;padding:8px 0;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Назад
      </button>
    </div>
  \`;
 
  container.innerHTML = backBtn + renderCoffeeHistoryTab(history);
}
 
function renderCoffeeProfileCard(profile, avgRating, tgId) {
  const ratingHTML = avgRating
    ? \`<div class="coffee-rating-badge">★ \${avgRating}</div>\`
    : '';
 
  const editIcon = \`
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  \`;
 
  return \`
    <div class="coffee-profile-card">
      <div class="coffee-profile-top">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="coffee-profile-name">\${escapeHtml(profile.name || '')}</div>
            \${ratingHTML}
            <button onclick="openCoffeeEdit()" style="margin-left:auto;background:var(--bg3);border:1px solid var(--border);border-radius:8px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:var(--text2);cursor:pointer;flex-shrink:0;">
              \${editIcon}
            </button>
          </div>
          \${profile.bio ? \`<div style="font-size:12px;color:var(--text2);margin-top:5px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\${escapeHtml(profile.bio)}</div>\` : ''}
        </div>
      </div>
      <div class="coffee-toggle-row">
        <span class="coffee-toggle-label">\${profile.active ? 'Участвую в подборе' : 'Подбор остановлен'}</span>
        <label class="coffee-toggle">
          <input type="checkbox" \${profile.active ? 'checked' : ''} onchange="toggleCoffeeActive('\${tgId}', this)"/>
          <span class="coffee-toggle-slider"></span>
        </label>
      </div>
    </div>
  \`;
}

function openCoffeeProfileEdit() {
  if (!coffeeData?.profile) return;
  const p = coffeeData.profile;
  
  // Закрываем предыдущую модалку если есть
  closeCoffeeProfileEdit();
  
  const modalHtml = \`
    <div id="coffeeEditModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: var(--bg); z-index: 1000; overflow-y: auto;">
      <div style="padding: 20px 16px 100px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; position: sticky; top: 0; background: var(--bg); padding-bottom: 12px;">
          <div class="coffee-form-title" style="margin-bottom: 0;">Редактировать профиль</div>
          <button onclick="closeCoffeeProfileEdit()" style="background: none; border: none; color: var(--text2); font-size: 24px; cursor: pointer; padding: 8px;">✕</button>
        </div>
        
        <div class="field-group" style="margin-bottom: 20px;">
          <div class="coffee-input-label" style="margin-bottom: 6px;">Имя</div>
          <input class="coffee-input" id="edit_name" type="text" value="\${escapeHtml(p.name || '')}" style="margin-top: 0;"/>
        </div>
 
        <div class="field-group" style="margin-bottom: 20px;">
          <div class="coffee-input-label" style="margin-bottom: 6px;">Город</div>
          <input class="coffee-input" id="edit_city" type="text" value="\${escapeHtml(p.city || '')}" style="margin-top: 0;"/>
        </div>
 
        <div class="field-group" style="margin-bottom: 20px;">
          <div class="coffee-input-label" style="margin-bottom: 6px;">О себе</div>
          <textarea class="coffee-input" id="edit_bio" rows="3" maxlength="280" style="margin-top: 0;">\${escapeHtml(p.bio || '')}</textarea>
          <div class="coffee-char-count" id="edit_bio_count" style="margin-top: 4px;">\${(p.bio || '').length} / 280</div>
        </div>
 
        <div class="field-group" style="margin-bottom: 20px;">
          <div class="coffee-input-label" style="margin-bottom: 6px;">Мой запрос</div>
          <textarea class="coffee-input" id="edit_request" rows="2" maxlength="200" style="margin-top: 0;">\${escapeHtml(p.request || '')}</textarea>
          <div class="coffee-char-count" id="edit_request_count" style="margin-top: 4px;">\${(p.request || '').length} / 200</div>
        </div>
 
        <div class="field-group" style="margin-bottom: 20px;">
          <div class="coffee-input-label" style="margin-bottom: 6px;">Чем готов помочь (3 пункта)</div>
          <div class="coffee-skills-group" style="gap: 10px;">
            <input class="coffee-input" id="edit_skill0" type="text" placeholder="Навык 1" value="\${escapeHtml(p.skills?.[0] || '')}" style="margin-top: 0;"/>
            <input class="coffee-input" id="edit_skill1" type="text" placeholder="Навык 2" value="\${escapeHtml(p.skills?.[1] || '')}" style="margin-top: 0;"/>
            <input class="coffee-input" id="edit_skill2" type="text" placeholder="Навык 3" value="\${escapeHtml(p.skills?.[2] || '')}" style="margin-top: 0;"/>
          </div>
        </div>
 
        <button class="coffee-btn coffee-btn-primary desktop-fixed-inset-bar" id="saveProfileBtn" style="position: fixed; bottom: 20px; left: 16px; right: 16px; width: auto; border-radius: 30px; padding: 16px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);" onclick="saveCoffeeProfileEdit()">
          Сохранить изменения
        </button>
      </div>
    </div>
  \`;
  
  // Добавляем модалку на страницу
  let modal = document.getElementById('coffeeEditModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'coffeeEditModal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = modalHtml;
  modal.style.display = 'block';
  
  // Счетчики символов
  const bioEl = document.getElementById('edit_bio');
  const reqEl = document.getElementById('edit_request');
  if (bioEl) bioEl.addEventListener('input', () => updateCoffeeCount(bioEl, 'edit_bio_count', 280));
  if (reqEl) reqEl.addEventListener('input', () => updateCoffeeCount(reqEl, 'edit_request_count', 200));
}

function closeCoffeeProfileEdit() {
  const modal = document.getElementById('coffeeEditModal');
  if (modal) modal.style.display = 'none';
}

async function saveCoffeeProfileEdit() {
  const tgId = currentUser?.tgId || tg?.initDataUnsafe?.user?.id;
  if (!tgId) return;
  
  const name = document.getElementById('edit_name')?.value.trim();
  const city = document.getElementById('edit_city')?.value.trim();
  const bio = document.getElementById('edit_bio')?.value.trim();
  const request = document.getElementById('edit_request')?.value.trim();
  const skills = [0,1,2].map(i => document.getElementById(\`edit_skill\${i}\`)?.value.trim()).filter(Boolean);
  
  if (!name || !bio || !request) {
    showToast('Заполни имя, о себе и запрос');
    return;
  }
  
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Сохраняем...';
  
  try {
    const res = await fetch('/api/coffee/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tgId, name, city, bio, request, skills })
    }).then(r => r.json());
    
    if (res.ok) {
      showToast('✅ Профиль обновлён');
      closeCoffeeProfileEdit();
      // Обновляем данные на странице
      const container = document.getElementById('mainContent');
      await renderCoffeeStub(container);
    } else {
      showToast('Ошибка сохранения');
    }
  } catch(e) {
    showToast('Ошибка подключения');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Сохранить изменения';
  }
}
 
function renderCoffeeCurrentTab(match, profile, tgId) {
  if (!match || !match.partnerProfile) {
    if (!profile.active) {
      return \`
        <div class="coffee-empty">
<span class="coffee-empty-icon">
<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.4">
       <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
     </svg>
   </span>
          <span class="coffee-empty-title">Подбор остановлен</span>
          <span class="coffee-empty-sub">Включи переключатель выше, чтобы снова участвовать в рандом кофе</span>
        </div>
      \`;
    }
    return \`
      <div class="coffee-empty">
        <span class="coffee-empty-icon">
     <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.4">
       <path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/>
       <line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>
     </svg>
   </span>
        <span class="coffee-empty-title">Партнёр ещё не назначен</span>
        <span class="coffee-empty-sub">Каждый понедельник ты получишь нового собеседника. Пока можешь дополнить профиль.</span>
      </div>
    \`;
  }
 
  const p = match.partnerProfile;
  const weekLabel = match.weekId ? match.weekId.replace('-W', ', неделя ') : '';
  const skillsHTML = (p.skills || []).filter(Boolean).map(s =>
    \`<span class="coffee-skill-tag">\${escapeHtml(s)}</span>\`
  ).join('');
 
  const statusMap = {
    active: { dot: 'active', text: 'Ждёт вашей встречи' },
    done: { dot: 'done', text: 'Встреча состоялась' },
    complained: { dot: 'complained', text: 'Жалоба отправлена' }
  };
  const st = statusMap[match.status] || statusMap.active;
 
  const actionsHTML = match.status === 'active' ? \`
    <div class="coffee-actions">
      <button class="coffee-btn coffee-btn-primary" onclick="openCoffeeRate('\${match.weekId}', '\${escapeHtml(p.name)}')">✓ Оценить встречу</button>
      <button class="coffee-btn coffee-btn-danger" style="flex:0 0 auto;padding:0 14px" onclick="openCoffeeComplaint('\${match.weekId}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></button>
    </div>
  \` : match.status === 'done' ? \`
    <div style="text-align:center;font-size:13px;color:var(--text2);padding-top:4px">Встреча оценена ✓</div>
  \` : \`
    <div style="text-align:center;font-size:13px;color:#ff6b6b;padding-top:4px">Жалоба на модерации</div>
  \`;
 
  return \`
    <div class="coffee-section-title">Твой партнёр на эту неделю</div>
    <div class="coffee-partner-card has-match">
      <div class="coffee-partner-header">
<div>
  <div style="display:flex;align-items:center;gap:6px;">
    \${p.username ? \`
      <a href="https://t.me/\${escapeHtml(p.username)}" target="_blank" style="display:flex;align-items:center;color:#229ED9;flex-shrink:0;" title="@\${escapeHtml(p.username)}">
        <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.417 15.181l-.397 5.584c.568 0 .814-.244 1.109-.537l2.663-2.545 5.518 4.041c1.012.564 1.725.267 1.998-.931L23.93 3.821c.321-1.496-.541-2.081-1.527-1.714L1.084 10.333c-1.452.564-1.429 1.37-.247 1.737l5.443 1.693 12.643-7.911c.595-.394 1.136-.176.691.218z" fill="#229ED9"/>
        </svg>
      </a> 
    \` : ''}
  </div>
</div>
        <div>
          <div class="coffee-partner-name">\${escapeHtml(p.name || '')}</div>
          <div class="coffee-partner-city">\${escapeHtml(p.city || '')}</div>
        </div>
        <div class="coffee-week-badge">\${weekLabel}</div>
      </div>
      <div class="coffee-partner-body">
        \${p.bio ? \`<div class="coffee-partner-bio">\${escapeHtml(p.bio)}</div>\` : ''}
        \${p.request ? \`<div class="coffee-partner-request"><strong>Запрос:</strong> \${escapeHtml(p.request)}</div>\` : ''}
        \${skillsHTML ? \`<div class="coffee-skills">\${skillsHTML}</div>\` : ''}
        
\${actionsHTML}
      </div>
      <div class="coffee-status-row">
        <div class="coffee-status-dot \${st.dot}"></div>
        <span>\${st.text}</span>
      </div>
    </div>
  \`;
}
 
function renderCoffeeHistoryTab(history) {
  if (!history || history.length === 0) {
    return \`
      <div class="coffee-empty">
        <span class="coffee-empty-icon">
     <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.4">
       <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
       <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
     </svg>
   </span>
        <span class="coffee-empty-title">История пуста</span>
        <span class="coffee-empty-sub">Здесь появятся все твои партнёры по нетворку</span>
      </div>
    \`;
  }
 
  const items = history.map(h => {
    const weekLabel = h.weekId ? h.weekId.replace('-W', ', нед. ') : '';
 
    let myRatingHTML = '';
    if (h.myRating) {
      const stars = '★'.repeat(h.myRating.stars) + '☆'.repeat(5 - h.myRating.stars);
      myRatingHTML = \`<div class="coffee-rating-pill mine"><span style="color:var(--gold)">\${stars}</span> <span>Моя</span></div>\`;
    } else {
      myRatingHTML = \`<div class="coffee-rating-pill pending">☆ Не оценено</div>\`;
    }
 
    let theirRatingHTML = '';
    if (h.myRating && h.theirRating) {
      // Показываем только после того как сам оценил
      const stars = '★'.repeat(h.theirRating.stars) + '☆'.repeat(5 - h.theirRating.stars);
      theirRatingHTML = \`<div class="coffee-rating-pill theirs"><span style="color:var(--text2)">\${stars}</span> <span>Его/её</span></div>\`;
    } else if (h.myRating && !h.theirRating) {
      theirRatingHTML = \`<div class="coffee-rating-pill pending" style="opacity:0.4">Ещё не оценил(а)</div>\`;
    }
 
    return \`
      <div class="coffee-history-item">
        <div class="coffee-history-top">
          <div class="coffee-history-name">\${escapeHtml(h.partnerName || '—')}</div>
          <div class="coffee-history-week">\${weekLabel}</div>
        </div>
        \${h.partnerCity ? \`<div class="coffee-history-city">📍 \${escapeHtml(h.partnerCity)}</div>\` : ''}
        <div class="coffee-ratings-row">
          \${myRatingHTML}
          \${theirRatingHTML}
        </div>
        \${h.complaint ? \`<div style="font-size:11px;color:#ff6b6b;margin-top:8px">🚩 Жалоба была отправлена</div>\` : ''}
      </div>
    \`;
  }).join('');
 
  return \`<div class="coffee-section-title">Все встречи</div>\` + items;
}

let allTagsPool = null;
let activeModuleTagFilters = new Set();
let moduleOrderCache = null;

function renderYadroRedirect(container) {
  container.innerHTML = \`
    <div class="empty-state" style="padding-top:32px">
      <div class="empty-state-icon">🚀</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:10px">База знаний переехала</div>
      <div style="font-size:14px;color:var(--text2);line-height:1.5;max-width:340px;margin:0 auto 20px">
        Мы перенесли базу знаний и записи на удобный сайт с ИИ-поиском.
      </div>
      <a href="https://cmo.pro/yadro" target="_blank" rel="noopener"
        style="display:inline-block;padding:12px 24px;border-radius:12px;background:var(--accent, #6c5ce7);color:#fff;font-weight:600;text-decoration:none;margin-bottom:16px">
        Открыть cmo.pro/yadro
      </a>
      <div style="font-size:13px;color:var(--text3);line-height:1.5;max-width:340px;margin:0 auto">
        Если нет логина и пароля — напишите
        <a href="https://t.me/oleg_ezhkov" target="_blank" rel="noopener">Олегу</a>.
      </div>
    </div>\`;
}

async function renderKnowledge(container) {
  renderYadroRedirect(container);
}

async function toggleModuleDoneFromList(programId, moduleId) {
  const completed = progressData[programId]?.completed || [];
  const isDone = completed.includes(moduleId);
  try {
    const res = await api('/api/progress', { initData, programId, moduleId, done: !isDone }, 'POST');
    if (res.ok) {
      progressData[programId] = res.progress;
      showToast(!isDone ? 'Отмечено как пройденное ✓' : 'Отметка снята');
      renderContent();
    }
  } catch(e) {
    showToast('Ошибка. Попробуй снова.');
  }
}

function toggleModuleTagFilter(t) {
  if (activeModuleTagFilters.has(t)) activeModuleTagFilters.delete(t);
  else activeModuleTagFilters.add(t);
  renderContent();
}

function clearModuleTagFilter() {
  activeModuleTagFilters.clear();
  renderContent();
}

document.addEventListener('click', function(e) {
  const chip = e.target.closest('.tag-chip');
  if (!chip) return;
  if (chip.dataset.tagAll) clearModuleTagFilter();
  else if (chip.dataset.tag) toggleModuleTagFilter(chip.dataset.tag);
});

function formatModuleDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── KNOWLEDGE BASE RENDER ────────────────────────────────────
async function renderKBPage(container) {
  renderYadroRedirect(container);
}

function tgOpenLink(url) {
  if (window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(url);
  } else {
    window.open(url, '_blank');
  }
}

// Для ссылок вида t.me/... — открывает чат/профиль внутри Telegram напрямую,
// без промежуточного открытия системного браузера.
function openTgDeepLink(url) {
  if (window.Telegram?.WebApp?.openTelegramLink) {
    window.Telegram.WebApp.openTelegramLink(url);
  } else if (window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(url);
  } else {
    window.open(url, '_blank');
  }
}

function escKB(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escKBAttr(s) {
  if (!s) return '';
  return String(s).replace(/'/g,"\\'").replace(/"/g,'&quot;');
}
function plural(n, one, few, many) {
  const m = Math.abs(n) % 100;
  const m1 = m % 10;
  if (m >= 11 && m <= 19) return many;
  if (m1 === 1) return one;
  if (m1 >= 2 && m1 <= 4) return few;
  return many;
}

function switchCoffeeTab(tab) {
  coffeeTab = tab;
  const container = document.getElementById('mainContent');
  renderCoffeeMain(container, coffeeData, coffeeData?.profile?.tgId);
}
 
function updateCoffeeCount(el, countId, max) {
  const el2 = document.getElementById(countId);
  if (!el2) return;
  const len = el.value.length;
  el2.textContent = len + ' / ' + max;
  el2.classList.toggle('warn', len > max * 0.9);
}
 
async function toggleCoffeeActive(tgId, checkbox) {
  try {
    const res = await fetch('/api/coffee/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tgId })
    }).then(r => r.json());
 
    if (res.ok) {
      if (coffeeData?.profile) coffeeData.profile.active = res.active;
      showToast(res.active ? '✅ Подбор включён' : '⏸ Подбор остановлен');
    } else {
      checkbox.checked = !checkbox.checked; // откат
    }
  } catch(e) {
    checkbox.checked = !checkbox.checked;
  }
}

function openCoffeeEdit() {
  const p = coffeeData?.profile;
  if (!p) return;
  document.getElementById('edit_bio').value = p.bio || '';
  document.getElementById('edit_request').value = p.request || '';
  document.getElementById('edit_skill0').value = p.skills?.[0] || '';
  document.getElementById('edit_skill1').value = p.skills?.[1] || '';
  document.getElementById('edit_skill2').value = p.skills?.[2] || '';
  document.getElementById('edit_bio_count').textContent = (p.bio || '').length + ' / 280';
  document.getElementById('edit_request_count').textContent = (p.request || '').length + ' / 200';
  document.getElementById('coffeeEditOverlay').classList.add('open');
}
 
function closeCoffeeEdit() {
  document.getElementById('coffeeEditOverlay').classList.remove('open');
}
 
async function saveCoffeeEdit() {
  const tgId = currentUser?.tgId || tg?.initDataUnsafe?.user?.id;
  if (!tgId) return;
  const bio = document.getElementById('edit_bio').value.trim();
  const request = document.getElementById('edit_request').value.trim();
  const skills = [0,1,2].map(i => document.getElementById('edit_skill'+i)?.value.trim()).filter(Boolean);
  const btn = document.getElementById('coffeeEditSaveBtn');
  btn.disabled = true; btn.textContent = 'Сохраняем...';
  try {
    const res = await fetch('/api/coffee/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tgId, bio, request, skills })
    }).then(r => r.json());
    if (res.ok) {
      closeCoffeeEdit();
      showToast('Профиль обновлён');
      // Обновить кэш
      if (coffeeData?.profile) {
        coffeeData.profile.bio = bio;
        coffeeData.profile.request = request;
        coffeeData.profile.skills = skills;
      }
      renderCoffeeMain(document.getElementById('mainContent'), coffeeData, tgId);
    } else { showToast('Ошибка, попробуй ещё раз'); }
  } catch(e) { showToast('Ошибка подключения'); }
  finally { btn.disabled = false; btn.textContent = 'Сохранить'; }
}
 
// Закрыть по клику на фон
document.getElementById('coffeeEditOverlay')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeCoffeeEdit();
});
 
async function submitCoffeeOnboarding(tgId) {
  const name = document.getElementById('cf_name')?.value.trim();
    const city = '';

  const bio = document.getElementById('cf_bio')?.value.trim();
  const request = document.getElementById('cf_request')?.value.trim();
  const skills = [0,1,2].map(i => document.getElementById('cf_skill'+i)?.value.trim()).filter(Boolean);
 
  if (!name || !bio || !request) {
    showToast('Заполни имя, о себе и запрос');
    return;
  }
  if (skills.length < 1) {
    showToast('Добавь хотя бы один пункт помощи');
    return;
  }
 
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Сохраняем...';
 
  try {
    const res = await fetch('/api/coffee/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tgId, name, city, bio, request, skills,
        active: true  // ★ активен по умолчанию
      })
    }).then(r => r.json());
 
    if (res.ok) {
      showToast('🎉 Ты в Рандом Кофе!');
      const container = document.getElementById('mainContent');
      await renderCoffeeStub(container);
    } else {
      showToast('Ошибка, попробуй ещё раз');
      btn.disabled = false;
      btn.textContent = 'Присоединиться к Рандом Кофе';
    }
  } catch(e) {
    showToast('Ошибка подключения');
    btn.disabled = false;
    btn.textContent = 'Присоединиться к Рандом Кофе';
  }
}

function openCoffeeRate(weekId, partnerName) {
  coffeeRateWeekId = weekId;
  coffeeRateStars = 0;
  coffeeRateComplaint = false;
  document.getElementById('coffeeRateSub').textContent = 'Как прошла встреча с ' + partnerName + '?';
  document.getElementById('coffeeComplaintToggle').classList.remove('checked');
  document.getElementById('coffeeCheckbox').textContent = '';
  document.getElementById('coffeeNoteWrap').classList.remove('show');
  document.getElementById('coffeeNoteInput').value = '';
  updateCoffeeStars(0);
  document.getElementById('coffeeRateOverlay').classList.add('open');
}
 
function openCoffeeComplaint(weekId) {
  // Открываем модалку с уже включённой жалобой
  openCoffeeRate(weekId, 'партнёром');
  toggleCoffeeComplaint();
}
 
function closeCoffeeRate() {
  document.getElementById('coffeeRateOverlay').classList.remove('open');
}
 
function updateCoffeeStars(n) {
  coffeeRateStars = n;
  document.querySelectorAll('.coffee-star').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.v) <= n);
  });
}
 
function toggleCoffeeComplaint() {
  coffeeRateComplaint = !coffeeRateComplaint;
  const el = document.getElementById('coffeeComplaintToggle');
  const cb = document.getElementById('coffeeCheckbox');
  el.classList.toggle('checked', coffeeRateComplaint);
  cb.textContent = coffeeRateComplaint ? '✓' : '';
  document.getElementById('coffeeNoteWrap').classList.toggle('show', coffeeRateComplaint);
}
 
// Назначить звёзды кликом
document.addEventListener('click', e => {
  const star = e.target.closest('.coffee-star');
  if (star) updateCoffeeStars(parseInt(star.dataset.v));
});
 
// Закрыть по клику на фон
document.getElementById('coffeeRateOverlay')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeCoffeeRate();
});
 
async function submitCoffeeRate() {
  if (!coffeeRateWeekId) return;
  if (!coffeeRateStars && !coffeeRateComplaint) {
    showToast('Выбери оценку или отметь жалобу');
    return;
  }
 
  const tgId = currentUser?.tgId || tg?.initDataUnsafe?.user?.id;
  const note = document.getElementById('coffeeNoteInput')?.value.trim() || '';
  const btn = document.getElementById('coffeeRateSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Отправляем...';
 
  try {
    const res = await fetch('/api/coffee/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tgId, weekId: coffeeRateWeekId, stars: coffeeRateStars, complaint: coffeeRateComplaint, note })
    }).then(r => r.json());
 
    if (res.ok) {
      closeCoffeeRate();
      showToast(coffeeRateComplaint ? '🚩 Жалоба отправлена на модерацию' : '✅ Оценка сохранена');
      const container = document.getElementById('mainContent');
      await renderCoffeeStub(container);
    } else {
      showToast('Ошибка, попробуй ещё раз');
    }
  } catch(e) {
    showToast('Ошибка подключения');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Отправить';
  }
}

function renderProgress(container, prog) {
  const tasks = tasksData[currentProgram] || [];
  const completed = taskProgressData[currentProgram]?.completed || [];

  if (!tasks.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">Задачи ещё не добавлены</div></div>';
    return;
  }

  const totalModules = (prog?.modules || []).filter(m => m.available).length;
const totalTasks = (tasksData[currentProgram] || []).length;
const total = totalModules + totalTasks;

const completedModules = progressData[currentProgram]?.completed || [];
const completedTasks = taskProgressData[currentProgram]?.completed || [];
const doneModules = (prog?.modules || []).filter(m => m.available && completedModules.includes(m.id)).length;
const doneTasks = completedTasks.length;
const done = doneModules + doneTasks;
const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  let html = '<div class="progress-wrap"><div class="progress-label"><span>' + done + ' из ' + total + ' материалов</span><span class="progress-pct">' + pct + '%</span></div><div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div></div><div class="module-list">';

  tasks.forEach(task => {
    const isDone = completed.includes(task.id);
    html += '<div class="module-card available' + (isDone ? ' done' : '') + '" onclick="toggleTask(&quot;' + task.id + '&quot;)">';
    html += '<div class="module-top"><div>';
    html += '<div class="module-title">' + task.title + '</div>';
    if (task.description) html += '<div class="module-desc">' + task.description + '</div>';
    html += '</div><div class="module-status ' + (isDone ? 'done' : '') + '">' + (isDone ? '✓' : '') + '</div></div></div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

async function toggleTask(taskId) {
  const completed = taskProgressData[currentProgram]?.completed || [];
  const isDone = completed.includes(taskId);
  const res = await fetch('/api/task-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, programId: currentProgram, taskId, done: !isDone })
  }).then(r => r.json());
  if (res.ok) {
    taskProgressData[currentProgram] = res.progress;
    renderContent();
  }
}

async function renderEvents(container) {
  container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  
  try {
    const data = await fetch('/api/events').then(r => r.json());
    const now = Date.now();
    const events = (data.events || [])
      .filter(ev => {
        const endTime = new Date(ev.datetime).getTime() + (ev.duration || 90) * 60 * 1000;
        return endTime > now;
      })
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    
    if (!events.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">Мероприятий пока нет</div></div>';
      return;
    }

    var html = '';
    events.forEach(function(ev) {
      var dt = new Date(ev.datetime);
      var days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
      var formatted = days[dt.getDay()] + ', ' + dt.toLocaleDateString('ru', {day:'numeric', month:'long'}) + ' · ' + dt.toLocaleTimeString('ru', {hour:'2-digit', minute:'2-digit'});

      function fmtCalLocal(dtStr, durMin) {
        var startMs = new Date(dtStr).getTime();
        var endMs = startMs + (durMin || 90) * 60000;
        var sd = new Date(dtStr);
        var ed = new Date(endMs);
        var sStr = sd.getFullYear() + String(sd.getMonth()+1).padStart(2,'0') + String(sd.getDate()).padStart(2,'0') + 'T' + String(sd.getHours()).padStart(2,'0') + String(sd.getMinutes()).padStart(2,'0') + '00';
        var eStr = ed.getFullYear() + String(ed.getMonth()+1).padStart(2,'0') + String(ed.getDate()).padStart(2,'0') + 'T' + String(ed.getHours()).padStart(2,'0') + String(ed.getMinutes()).padStart(2,'0') + '00';
        return sStr + '/' + eStr;
      }

      var calDates = fmtCalLocal(ev.datetime, ev.duration);
      var gCalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE&dates=' + calDates + '&ctz=Europe/Moscow&text=' + encodeURIComponent(ev.title) + '&location=' + encodeURIComponent(ev.actionUrl || '');

      var icsStart = calDates.split('/')[0];
      var icsEnd = calDates.split('/')[1];
      var icsLines = ['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT','DTSTART;TZID=Europe/Moscow:' + icsStart,'DTEND;TZID=Europe/Moscow:' + icsEnd,'SUMMARY:' + ev.title,'LOCATION:' + (ev.actionUrl || ''),'END:VEVENT','END:VCALENDAR'];
      var icsContent = icsLines.join('\\r\\n');
      var icsUrl = 'data:text/calendar;charset=utf8,' + encodeURIComponent(icsContent);

      html += '<div class="event-card">';

      if (ev.photo) {
  html += '<div class="event-photo-wrap"><img src="' + ev.photo + '" class="event-photo"/></div>';
} else {
  html += '<div class="event-photo-wrap" style="display:flex;align-items:center;justify-content:center;background:var(--bg3)">';
html += '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"><path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.889L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>';
  html += '</div>';
}

      html += '<div class="event-body">';
      html += '<div class="event-title">' + ev.title + '</div>';

      if (ev.author) {
        if (ev.authorUrl) {
          html += '<div class="event-author"><a href="' + ev.authorUrl + '" target="_blank" style="color:inherit;text-decoration:underline">' + ev.author + '</a></div>';
        } else {
          html += '<div class="event-author">' + ev.author + '</div>';
        }
      }
      if (ev.tags && ev.tags.length) {
  html += '<div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;margin-top:4px;margin-bottom:6px">';
  ev.tags.forEach(function(tag) {
    html += '<span style="font-size:10px;padding:2px 10px;border-radius:20px;border:1px solid var(--border);color:var(--text3)">' + tag + '</span>';
  });
  html += '</div>';
}
html += '<div class="event-datetime">' + formatted + '</div>';

      html += '<div style="display:flex;align-items:center;justify-content:center;gap:8px">';

      html += '<a href="' + gCalUrl + '" target="_blank" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:#ffffff;text-decoration:none" title="Google Calendar">';
      html += '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.35-1.04 2.5-2.21 3.29v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
      html += '</a>';
html += '<a href="#" data-ics-id="' + ev.id + '" class="ics-btn" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:#ffffff;text-decoration:none" title="Apple Calendar">';
      html += '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>';
      html += '</a>';

      var btnText = ev.actionType === 'register' ? 'Записаться →' : 'Zoom →';
      html += '<a href="' + (ev.actionUrl || '#') + '" target="_blank" class="event-zoom-btn">' + btnText + '</a>';

      html += '</div>';
      html += '</div>';
      html += '</div>';
    });

    container.innerHTML = html;
  } catch(err) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Ошибка загрузки</div></div>';
  }
}

function openIcs(eventId) {
  var url = 'webcal://' + location.host + '/api/event-ics?id=' + eventId;
  if (tg && tg.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, '_blank');
  }
}

document.addEventListener('click', function(e) {
  var btn = e.target.closest('.ics-btn');
  if (!btn) return;
  e.preventDefault();
  var url = 'https://' + location.host + '/api/event-ics?id=' + btn.dataset.icsId;
  tg.openLink(url);
});

// ── MODULE DETAIL ─────────────────────────────────────────────
function openModule(moduleId, programId) {
  if (programId) currentProgram = programId;
  const prog = programData[currentProgram];
  if (!prog) return;
  const mod = prog.modules.find(m => m.id === moduleId);
  if (!mod) return;
  track('module_open', { program: currentProgram, moduleId });
  const moduleTasks = (tasksData[currentProgram] || []).filter(t => t.moduleId === moduleId);
const moduleTaskProgress = taskProgressData[currentProgram]?.completed || [];

  let moduleTasksHtml = '';
if (moduleTasks.length > 0) {
  moduleTasksHtml = '<div class="files-section"><div class="files-title">Задания</div>';
  moduleTasks.forEach(task => {
    const done = moduleTaskProgress.includes(task.id);
    moduleTasksHtml += \`<div class="module-card available \${done ? 'done' : ''}" 
  data-task-id="\${task.id}" style="margin-bottom:8px;cursor:pointer">
  <div class="module-top">
    <div>
      <div class="module-title" style="font-size:13px">\${task.title}</div>
      \${task.description ? \`<div class="module-desc">\${task.description}</div>\` : ''}
    </div>
    <div class="module-status \${done ? 'done' : ''}">\${done ? '✓' : ''}</div>
  </div>
</div>\`;
  });
  moduleTasksHtml += '</div>';
}

  const completed = progressData[currentProgram]?.completed || [];
  const isDone = completed.includes(moduleId);
  const idx = prog.modules.indexOf(mod);

  let embedHtml = '';
  if (mod.embedUrl) {
    const embedSrc = getEmbedSrc(mod.embedUrl);
    embedHtml = \`<div class="embed-wrap"><iframe src="\${embedSrc}" allowfullscreen></iframe></div>\`;
  } else {
    embedHtml = \`<div class="embed-wrap"><div class="embed-placeholder"><span class="embed-placeholder-icon">▶</span><span>Видео появится здесь</span></div></div>\`;
  }

  let filesHtml = '';
  if (mod.files && mod.files.length > 0) {
    filesHtml = '<div class="files-section"><div class="files-title">Материалы</div>';
    mod.files.forEach(f => {
      filesHtml += \`<a class="file-item" href="\${f.url}" target="_blank">
  <span class="file-icon">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
      <polyline points="13 2 13 9 20 9"/>
    </svg>
  </span>
  <span class="file-name">\${escapeHtml(f.name)}</span>
  <span class="file-arrow">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  </span>
</a>\`;
});
    filesHtml += '</div>';
  }

  let timecodesHtml = '';
if (mod.timecodes && mod.timecodes.length > 0 && mod.embedUrl) {
  // Генерируем уникальный ID для этого модуля
  const collapseId = \`timecodes-\${moduleId}\`;
  timecodesHtml = \`
    <div class="files-section">
      <div class="files-title" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="toggleCollapse('\${collapseId}')">
        <span>Таймкоды (\${mod.timecodes.length})</span>
        <span id="\${collapseId}-arrow" style="font-size:12px;transition:transform 0.2s">▼</span>
      </div>
      <div id="\${collapseId}" class="collapse-content" style="display:none">
        \${mod.timecodes.map(tc => {
          const parts = tc.time.split(':').map(Number);
          const secs = parts.length === 3 ? parts[0]*3600+parts[1]*60+parts[2] : parts[0]*60+parts[1];
          const ytMatch = mod.embedUrl.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([^&\\s]+)/);
          const ytId = ytMatch ? ytMatch[1] : null;
          const tcUrl = ytId ? \`https://www.youtube.com/watch?v=\${ytId}&t=\${secs}s\` : mod.embedUrl;
          return \`<a class="timeline-item" href="\${tcUrl}" target="_blank">
            <span class="timeline-time \${getTimeFormatClass(tc.time)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>\${escapeHtml(tc.time)}</span>
            </span>
            <span class="timeline-label">\${escapeHtml(tc.label)}</span>
            <span class="timeline-arrow">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </span>
          </a>\`;
        }).join('')}
      </div>
    </div>\`;
}

  const doneBtnClass = isDone ? 'done-btn is-done' : 'done-btn';
  const doneBtnText = isDone ? '✓ Пройдено' : 'Отметить как пройденное';

  document.getElementById('detailContent').innerHTML = \`
    <div class="detail-num">МОДУЛЬ \${idx + 1} · \${currentProgram === 'ai' ? 'ИИ-КОНТЕНТ' : 'ВОРОНКИ'}\${mod.date ? ' · ' + formatModuleDate(mod.date) : ''}</div>
    <div class="detail-title">\${mod.title}</div>
    \${mod.description ? \`<div class="detail-desc">\${mod.description}</div>\` : ''}
    \${embedHtml}
    \${timecodesHtml}
    \${filesHtml}
    \${moduleTasksHtml}
    <button class="\${doneBtnClass}" id="doneBtn" onclick="toggleDone('\${moduleId}')">
      \${isDone ? '✓ Пройдено' : '○ Отметить как пройденное'}
    </button>\`;

  showScreen('detailScreen');
  document.querySelectorAll('[data-task-id]').forEach(el => {
  el.onclick = () => toggleTaskInModule(el.dataset.taskId, moduleId);
});
}

function toggleCollapse(id) {
  const el = document.getElementById(id);
  const arrow = document.getElementById(id + '-arrow');
  if (el.style.display === 'none') {
    el.style.display = 'block';
    arrow.style.transform = 'rotate(0deg)';
  } else {
    el.style.display = 'none';
    arrow.style.transform = 'rotate(-90deg)';
  }
}

function getTimeFormatClass(timeStr) {
  if (!timeStr) return 'time-short';
  const parts = timeStr.split(':');
  if (parts.length === 3) return 'time-long';      // ЧЧ:ММ:СС
  if (parts.length === 2 && parts[0].length > 2) return 'time-medium'; // 54:10 (две цифры)
  return 'time-short';                              // ММ:СС
}

// Добавьте эту функцию в самое начало <script>, после объявления переменных
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function toggleTaskInModule(taskId, moduleId) {
  const completed = taskProgressData[currentProgram]?.completed || [];
  const isDone = completed.includes(taskId);
  track('click', { action: 'toggle_task', taskId, moduleId, done: !isDone });
  const res = await fetch('/api/task-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, programId: currentProgram, taskId, done: !isDone })
  }).then(r => r.json());
  if (res.ok) {
    taskProgressData[currentProgram] = res.progress;
    openModule(moduleId); // перерендер детали
    // Обновляем прогресс-бар
    updateProgressBar();
  }
}

function closeDetail() {
  showScreen('appScreen');
}

function getEmbedSrc(url) {
  if (!url) return '';
  // YouTube
  const ytMatch = url.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([^&\\s]+)/);
  if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1];
  // Vimeo
  const vimeoMatch = url.match(/vimeo\\.com\\/(\d+)/);
  if (vimeoMatch) return 'https://player.vimeo.com/video/' + vimeoMatch[1];
  return url;
}

// ── TOGGLE DONE ───────────────────────────────────────────────
async function toggleDone(moduleId) {
  const completed = progressData[currentProgram]?.completed || [];
  const isDone = completed.includes(moduleId);
  const newDone = !isDone;

  try {
    const res = await api('/api/progress', { initData, programId: currentProgram, moduleId, done: newDone }, 'POST');
    if (res.ok) {
      progressData[currentProgram] = res.progress;
      
      // Обновляем кнопку в деталях
      const btn = document.getElementById('doneBtn');
      if (newDone) {
        btn.className = 'done-btn is-done';
        btn.textContent = '✓ Пройдено';
        showToast('Отмечено как пройденное ✓');
      } else {
        btn.className = 'done-btn';
        btn.textContent = '○ Отметить как пройденное';
        showToast('Отметка снята');
      }
      
      // ⭐ ОБНОВЛЯЕМ СТАТУС МОДУЛЯ В МЕНЮ (без перезагрузки) ⭐
      updateModuleStatusInList(moduleId, newDone);
      
      // Также обновляем прогресс-бар на главной
      updateProgressBar();
    }
  } catch(e) {
    showToast('Ошибка. Попробуй снова.');
  }
}

// Новая функция для обновления статуса модуля в списке
function updateModuleStatusInList(moduleId, isDone) {
  // Ищем карточку модуля в DOM
  const modules = document.querySelectorAll('.module-card');
  for (const card of modules) {
    // Проверяем, есть ли у карточки onclick с этим moduleId
    const onclickAttr = card.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes(\`'\${moduleId}'\`)) {
      // Обновляем класс done
      if (isDone) {
        card.classList.add('done');
        const statusDiv = card.querySelector('.module-status');
        if (statusDiv) {
          statusDiv.classList.add('done');
          statusDiv.textContent = '✓';
        }
        // Обновляем тег, если есть
        const tagSpan = card.querySelector('.module-tag');
        if (tagSpan && !tagSpan.classList.contains('locked-tag')) {
          tagSpan.textContent = '✓ Пройдено';
        }
      } else {
        card.classList.remove('done');
        const statusDiv = card.querySelector('.module-status');
        if (statusDiv) {
          statusDiv.classList.remove('done');
          statusDiv.textContent = '';
        }
        const tagSpan = card.querySelector('.module-tag');
        if (tagSpan && tagSpan.textContent === '✓ Пройдено') {
          tagSpan.textContent = '';
        }
      }
      break;
    }
  }
}

// Обновление прогресс-бара
function updateProgressBar() {
  const prog = programData[currentProgram];
  if (!prog) return;
  
  const completedModules = progressData[currentProgram]?.completed || [];
  const completedTasks = taskProgressData[currentProgram]?.completed || [];
  
  const totalModules = (prog.modules || []).filter(m => m.available).length;
  const totalTasks = (tasksData[currentProgram] || []).length;
  const total = totalModules + totalTasks;
  
  const doneModules = (prog.modules || []).filter(m => m.available && completedModules.includes(m.id)).length;
  const doneTasks = completedTasks.length;
  const done = doneModules + doneTasks;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  
  // Обновляем прогресс-бар на странице
  const progressWrap = document.querySelector('.progress-wrap');
  if (progressWrap) {
    const pctSpan = progressWrap.querySelector('.progress-pct');
    const fillDiv = progressWrap.querySelector('.progress-bar-fill');
    if (pctSpan) pctSpan.textContent = \`\${pct}%\`;
    if (fillDiv) fillDiv.style.width = \`\${pct}%\`;
  }
}

// ── QUESTIONS ─────────────────────────────────────────────────
async function sendQuestion() {
  const text = document.getElementById('questionText').value.trim();
  if (!text) return;
  await submitQuestion(text);
  document.getElementById('questionText').value = '';
  showToast('Вопрос отправлен!');
}

async function submitQuestion(text) {
  try {
    await api('/api/user', {
      initData,
      action: 'submitQuestion',
      payload: { text, program: currentProgram === 'ai' ? 'ИИ-контент' : 'Воронки' }
    }, 'POST');
  } catch(e) {}
}

// ── UTILS ─────────────────────────────────────────────────────
async function api(path, body, method = 'POST') {
  const opts = { headers: { 'Content-Type': 'application/json' } };
  if (method === 'GET') {
    opts.method = 'GET';
  } else {
    opts.method = method;
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(WORKER + path, opts);
  return res.json();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
</script>
</body>
</html>`;
}

// ─── ADMIN HTML ───────────────────────────────────────────────
function getAdminHTML() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>CMO Admin</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;700&family=Geologica:wght@300;400;500;600&display=swap');

  :root {
  --bg: #f6f6f8;
  --bg2: #efeff2;
  --bg3: #e9e9ee;
  --card: #ffffff;
  --border: rgba(17,17,20,0.09);
  --border-h: rgba(17,17,20,0.2);
  --text: #131316;
  --text2: rgba(19,19,22,0.56);
  --text3: rgba(19,19,22,0.38);
  --accent: #4338ca;
  --accent-soft: rgba(67,56,202,0.1);
  --accent-text: #ffffff;
  --danger: #d93025;
  --danger-soft: rgba(217,48,37,0.1);
  --success: #16794f;
  --success-soft: rgba(22,121,79,0.1);
  --warning: #b8860b;
  --warning-soft: rgba(184,134,11,0.12);
  --radius: 10px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 2px rgba(17,17,20,0.04);
  --shadow-md: 0 8px 24px rgba(17,17,20,0.08);
}

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Geologica', sans-serif;
    font-size: 14px;
    min-height: 100vh;
  }

  /* LOGIN */
  #loginWrap {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
  }

  .login-box {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 40px 32px;
    width: 100%;
    max-width: 380px;
    text-align: center;
  }

  .login-logo {
    font-family: 'Unbounded', sans-serif;
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .login-sub { color: var(--text3); font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 36px; }

  .login-box input {
    width: 100%;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 16px;
    color: var(--text);
    font-family: 'Geologica', sans-serif;
    font-size: 14px;
    outline: none;
    margin-bottom: 12px;
    transition: border-color 0.2s;
  }

  .login-box input:focus { border-color: var(--accent); }

  .btn { display: inline-block; padding: 11px 20px; border-radius: var(--radius); font-family: 'Geologica', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; }
  .btn-w { background: var(--text); color: var(--bg); width: 100%; }
  .btn-w:hover { opacity: 0.88; }
  .btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text2); }
  .btn-ghost:hover { border-color: var(--border-h); color: var(--text); }
  .btn-danger { background: transparent; border: 1px solid rgba(255,68,68,0.3); color: var(--danger); }
  .btn-danger:hover { background: rgba(255,68,68,0.1); }
  .btn-sm { padding: 6px 12px; font-size: 12px; }

  #loginError { color: var(--danger); font-size: 12px; margin-top: 8px; min-height: 18px; }

  /* ADMIN LAYOUT */
  #adminWrap { display: none; }

  .admin-layout { display: flex; min-height: 100vh; }

  .sidebar {
    width: 220px;
    flex-shrink: 0;
    background: var(--card);
    border-right: 1px solid var(--border);
    padding: 24px 0;
    position: fixed;
    top: 0; left: 0; bottom: 0;
    overflow-y: auto;
  }

  .sidebar-logo {
    padding: 0 20px 24px;
    font-family: 'Unbounded', sans-serif;
    font-size: 16px;
    font-weight: 700;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
  }

  .sidebar-logo span { color: var(--text3); font-size: 10px; display: block; margin-top: 2px; letter-spacing: 1.5px; font-weight: 400; font-family: 'Geologica'; }

  .nav-section-label {
    padding: 16px 20px 6px;
    font-size: 10px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--text3);
    font-weight: 600;
  }
  .nav-section-label:first-of-type { padding-top: 4px; }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 20px;
    margin: 0 8px;
    border-radius: 8px;
    color: var(--text2);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .nav-link:hover { color: var(--text); background: var(--bg2); }
  .nav-link.active { color: var(--accent-text); background: var(--accent); }
  .nav-link-icon { font-size: 16px; width: 20px; text-align: center; }

  .main-content {
    margin-left: 220px;
    flex: 1;
    padding: 32px;
    max-width: calc(100vw - 220px);
  }

  .page { display: none; }
  .page.active { display: block; }

  .page-title {
    font-family: 'Unbounded', sans-serif;
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 24px;
    letter-spacing: -0.5px;
  }

  /* CARDS */
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
  }

  .card-title {
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text3);
    margin-bottom: 14px;
  }

  /* TABLE */
  .tbl { width: 100%; border-collapse: collapse; min-width: 900px; }
  .tbl th {
    text-align: left;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text3);
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    font-weight: 400;
  }
  .tbl td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
    color: var(--text2);
  }
  .tbl tr:last-child td { border-bottom: none; }
  .tbl td:first-child { color: var(--text); }

  /* FORM ELEMENTS */
  .field { margin-bottom: 14px; }
  .field label { display: block; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--text3); margin-bottom: 6px; }
  .field input, .field textarea, .field select {
    width: 100%;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 14px;
    color: var(--text);
    font-family: 'Geologica', sans-serif;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
  }
  .field input:focus, .field textarea:focus, .field select:focus { border-color: var(--accent); }
  .field textarea { resize: vertical; min-height: 80px; }
  .field select option { background: var(--bg3); }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }

  .row { display: flex; align-items: center; gap: 10px; }
  .row .field { flex: 1; margin-bottom: 0; }

  /* STATUS */
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 11px;
    letter-spacing: 0.5px;
  }
  .badge-ok { background: var(--success-soft); color: var(--success); }
  .badge-pending { background: var(--warning-soft); color: var(--warning); }
  .badge-risk { background: var(--danger-soft); color: var(--danger); }
  .badge-new { background: var(--accent-soft); color: var(--accent); }

  /* NOTIFY FORM */
  .notify-preview {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    font-size: 13px;
    color: var(--text2);
    min-height: 60px;
    margin-bottom: 12px;
    white-space: pre-wrap;
  }

  /* MODULE LIST */
  .module-item {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .module-item:hover { border-color: var(--border-h); }
  .module-item-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .module-item-title { font-weight: 500; font-size: 14px; }
  .module-item-actions { display: flex; gap: 6px; }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    display: none;
    padding: 24px;
  }
  .modal-overlay.open { display: flex; }
  .modal {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 28px;
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    overflow-y: auto;
  }
  .modal-title {
    font-family: 'Unbounded', sans-serif;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 20px;
  }
  .modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }

  /* STATS */
  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .stats-row-4 { grid-template-columns: repeat(4, 1fr); }
  .stat-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
  }
  .stat-val {
    font-family: 'Unbounded', sans-serif;
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 6px;
  }
  .stat-label { font-size: 12px; color: var(--text3); }

  .msg { font-size: 12px; margin-top: 8px; min-height: 18px; }
  .msg.ok { color: var(--success); }
  .msg.err { color: var(--danger); }

  /* Questions */
  .q-item {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    margin-bottom: 8px;
  }
  .q-meta { font-size: 11px; color: var(--text3); margin-bottom: 6px; }
  .q-text { font-size: 13px; color: var(--text2); line-height: 1.5; }
  .q-bottom { display: flex; justify-content: flex-end; margin-top: 10px; }

  /* Toggle */
  .toggle-wrap { display: flex; align-items: center; gap: 10px; }
  .toggle { position: relative; width: 36px; height: 20px; cursor: pointer; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-track { position: absolute; inset: 0; background: var(--bg3); border: 1px solid var(--border); border-radius: 20px; transition: 0.2s; }
  .toggle input:checked + .toggle-track { background: var(--text); border-color: var(--text); }
  .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 12px; height: 12px; background: var(--text3); border-radius: 50%; transition: 0.2s; }
  .toggle input:checked ~ .toggle-thumb { transform: translateX(16px); background: var(--bg); }

  .crm-board { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; align-items: flex-start; }
  .crm-column {
    flex: 0 0 300px; width: 300px; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 10px;
    display: flex; flex-direction: column; max-height: calc(100vh - 280px); min-height: 160px;
  }
  .crm-column-head { flex-shrink: 0; }
  .crm-column-cards { overflow-y: auto; overflow-x: hidden; padding-right: 2px; flex: 1; }

  .crm-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; margin-bottom: 6px; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; display: flex; align-items: center; gap: 8px; }
  .crm-card:hover { border-color: var(--border-h); box-shadow: var(--shadow-sm); }
  .crm-card-avatar { position: relative; flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #fff; overflow: hidden; }
  .crm-card-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .crm-card-body { flex: 1; min-width: 0; }
  .crm-card-name-row { display: flex; align-items: center; gap: 5px; }
  .crm-card-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .crm-card-dot.attn { background: var(--danger); }
  .crm-card-dot.pending { background: var(--warning); }
  .crm-card-name { font-size: 13px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .crm-card-sub { font-size: 11px; color: var(--accent); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .crm-card-icons { display: flex; align-items: center; gap: 1px; flex-shrink: 0; }
  .crm-card-iconbtn { flex-shrink: 0; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; color: var(--text3); cursor: pointer; border-radius: 5px; font-size: 12px; line-height: 1; border: none; background: transparent; }
  .crm-card-iconbtn:hover { background: var(--bg2); color: var(--text); }
  .crm-card-draghandle { display: none; cursor: grab; }
  @media (min-width: 769px) { .crm-card-draghandle { display: flex; } }

  /* FILTER CHIPS */
  .chip-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
  .chip { padding: 6px 13px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid var(--border); background: var(--card); color: var(--text2); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
  .chip:hover { border-color: var(--border-h); color: var(--text); }
  .chip.active { background: var(--text); border-color: var(--text); color: var(--bg); }

  /* HEALTH / DASHBOARD */
  .health-card { display: flex; align-items: center; gap: 28px; background: linear-gradient(135deg, var(--text) 0%, #2c2c34 100%); color: #fff; border-radius: var(--radius-lg); padding: 24px 28px; margin-bottom: 16px; flex-wrap: wrap; }
  .health-ring { position: relative; width: 96px; height: 96px; flex-shrink: 0; }
  .health-ring svg { transform: rotate(-90deg); }
  .health-ring-val { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: 'Unbounded', sans-serif; font-size: 26px; font-weight: 700; }
  .health-sub { flex: 1; min-width: 220px; display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 14px; }
  .health-sub-item .l { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.55); margin-bottom: 6px; }
  .health-sub-item .v { font-family: 'Unbounded', sans-serif; font-size: 18px; font-weight: 600; }
  .health-bar { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.15); margin-top: 6px; overflow: hidden; }
  .health-bar i { display: block; height: 100%; background: #fff; border-radius: 2px; }

  .metric-tile { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
  .metric-tile .l { font-size: 11px; color: var(--text3); margin-bottom: 8px; }
  .metric-tile .v { font-family: 'Unbounded', sans-serif; font-size: 24px; font-weight: 700; line-height: 1; }
  .metric-delta { font-size: 11px; font-weight: 500; margin-top: 6px; display: inline-block; }
  .metric-delta.up { color: var(--success); }
  .metric-delta.down { color: var(--danger); }
  .metric-delta.flat { color: var(--text3); }

  .insight-list { display: flex; flex-direction: column; gap: 8px; }
  .insight-card { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; }
  .insight-card .ic { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
  .insight-card .ic.risk { background: var(--danger-soft); }
  .insight-card .ic.pending { background: var(--warning-soft); }
  .insight-card .ic.info { background: var(--accent-soft); }
  .insight-card .body { flex: 1; min-width: 0; }
  .insight-card .t { font-size: 13px; font-weight: 500; color: var(--text); }
  .insight-card .s { font-size: 11px; color: var(--text3); margin-top: 2px; }
  .insight-empty { color: var(--text3); font-size: 13px; padding: 12px 4px; }

  .activity-row { display: flex; align-items: center; gap: 12px; padding: 10px 4px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; border-radius: 8px; }
  .activity-row:hover { background: var(--bg2); }
  .activity-row:last-child { border-bottom: none; }
  .activity-row .name { font-size: 13px; font-weight: 500; flex: 1; min-width: 0; }
  .activity-row .cnt { font-size: 12px; color: var(--text3); }

  .tab-row { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
  .tab-btn { padding: 10px 4px; margin-right: 20px; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text3); font-family: 'Geologica', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
  .tab-btn:hover { color: var(--text); }
  .tab-btn.active { color: var(--text); border-bottom-color: var(--accent); }

  .callout { display: flex; gap: 12px; background: var(--accent-soft); border: 1px solid rgba(67,56,202,0.18); border-radius: 12px; padding: 14px 16px; font-size: 12px; color: var(--text2); line-height: 1.6; margin-bottom: 16px; }
  .callout .ic { font-size: 18px; flex-shrink: 0; }

  @media (max-width: 768px) {
  .sidebar { display: none; }
  .main-content { margin-left: 0; max-width: 100vw; padding: 20px 16px 80px; }
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
  .stats-row { grid-template-columns: 1fr 1fr; }
  .crm-board { flex-direction: column; overflow-x: visible; }
  .crm-column { flex: 1 1 auto; width: 100%; min-width: 100%; max-height: none; }
  .crm-column-cards { overflow-y: visible; }
}
  .mnav-btn {
  flex: 0 0 auto;
  min-width: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 6px;
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.25);
  font-family: 'Geologica', sans-serif;
  font-size: 9px;
  cursor: pointer;
  transition: color 0.2s;
}
.mnav-btn.active { color: #ffffff; }
.tbl-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
</head>
<body>

<!-- LOGIN -->
<div id="loginWrap">
  <div class="login-box">
    <div class="login-logo">CMO</div>
    <div class="login-sub">Admin Panel</div>
    <input type="password" id="adminPass" placeholder="Пароль" onkeydown="if(event.key==='Enter')adminLogin()"/>
    <button class="btn btn-w" onclick="adminLogin()">Войти</button>
    <div id="loginError"></div>
  </div>
</div>

<!-- ADMIN -->
<div id="adminWrap">
  <div class="admin-layout">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-logo">CMO <span>ADMIN PANEL</span></div>

      <div class="nav-section-label">Обзор</div>
      <div class="nav-link active" id="nl-dashboard" onclick="showPage('dashboard')">
        <span class="nav-link-icon">⊞</span> Дашборд
      </div>

      <div class="nav-section-label">Участники</div>
      <div class="nav-link" id="nl-participants" onclick="showPage('participants')">
        <span class="nav-link-icon">👤</span> CRM
      </div>
      <div class="nav-link" id="nl-analytics" onclick="showPage('analytics')">
        <span class="nav-link-icon">📊</span> Активность
      </div>

      <div class="nav-section-label">Коммуникации</div>
      <div class="nav-link" id="nl-notify" onclick="showPage('notify')">
        <span class="nav-link-icon">📢</span> Уведомления
      </div>
      <div class="nav-link" id="nl-questions" onclick="showPage('questions')">
        <span class="nav-link-icon">❓</span> Вопросы
      </div>

      <div class="nav-section-label">Оплаты</div>
      <div class="nav-link" id="nl-payments" onclick="showPage('payments')">
        <span class="nav-link-icon">💳</span> Оплаты
      </div>

      <div class="nav-section-label">Мероприятия</div>
      <div class="nav-link" id="nl-events" onclick="showPage('events')">
        <span class="nav-link-icon">📅</span> Мероприятия
      </div>
      <div class="nav-link" id="nl-coffee" onclick="showPage('coffee')">
        <span class="nav-link-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M17 8h1a4 4 0 0 1 0 8h-1"/>
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/>
            <line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>
          </svg>
        </span>
        Рандом Кофе
      </div>

      <div class="nav-section-label">Материалы</div>
      <div class="nav-link" id="nl-programs" onclick="showPage('programs')">
        <span class="nav-link-icon">📚</span> Программы
      </div>
      <div class="nav-link" id="nl-kb" onclick="showPage('kb')">
        <span class="nav-link-icon">📖</span> База знаний
      </div>

      <div class="nav-section-label">Команда</div>
      <div class="nav-link" id="nl-admins" onclick="showPage('admins')">
        <span class="nav-link-icon">🔐</span> Админы
      </div>
    </div>

    <!-- Content -->
    <div class="main-content">

      <!-- DASHBOARD -->
      <div class="page active" id="page-dashboard">
        <div class="page-title" style="display:flex;align-items:center;justify-content:space-between">
          <span>Дашборд</span>
          <button class="btn btn-ghost btn-sm" onclick="sendDigestNow()">📊 Отправить сводку топ-10 сейчас</button>
        </div>

        <div class="health-card">
          <div class="health-ring">
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="8"/>
              <circle id="healthRingArc" cx="48" cy="48" r="42" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-dasharray="264" stroke-dashoffset="264" style="transition:stroke-dashoffset 0.6s ease"/>
            </svg>
            <div class="health-ring-val" id="healthScoreVal">—</div>
          </div>
          <div class="health-sub">
            <div class="health-sub-item"><div class="l">Удержание</div><div class="v" id="healthRetention">—</div><div class="health-bar"><i id="healthRetentionBar" style="width:0%"></i></div></div>
            <div class="health-sub-item"><div class="l">Вовлечённость</div><div class="v" id="healthEngagement">—</div><div class="health-bar"><i id="healthEngagementBar" style="width:0%"></i></div></div>
            <div class="health-sub-item"><div class="l">Рост</div><div class="v" id="healthGrowth">—</div><div class="health-bar"><i id="healthGrowthBar" style="width:0%"></i></div></div>
            <div class="health-sub-item"><div class="l">Оплаты</div><div class="v" id="healthPayment">—</div><div class="health-bar"><i id="healthPaymentBar" style="width:0%"></i></div></div>
          </div>
        </div>

        <div class="stats-row stats-row-4">
          <div class="metric-tile"><div class="l">Участников</div><div class="v" id="stat-emails">—</div></div>
          <div class="metric-tile"><div class="l">Ожидают одобрения</div><div class="v" id="stat-pending">—</div></div>
          <div class="metric-tile"><div class="l">Вопросов без ответа</div><div class="v" id="stat-questions">—</div></div>
          <div class="metric-tile"><div class="l">Всего заходов</div><div class="v" id="stat-launches">—</div></div>
        </div>

        <div class="card" style="margin-bottom:16px">
          <div class="card-title">Требует внимания</div>
          <div class="insight-list" id="insightList"></div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-title">Топ-5 по активности</div>
            <div id="topUsers"></div>
          </div>
          <div class="card">
            <div class="card-title">Последние оплаты</div>
            <div id="paymentsList"></div>
          </div>
        </div>
      </div>

      <!-- PARTICIPANTS -->
      <div class="page" id="page-participants">
        <div class="page-title">CRM участников</div>

        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">
            <div class="card-title" style="margin-bottom:0">Участники по статусам</div>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="text" id="crmSearch" placeholder="Поиск..." oninput="renderCRMBoard()"
                style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:7px 12px;color:var(--text);font-size:13px;width:180px;outline:none"/>
              <button class="btn btn-ghost btn-sm" onclick="loadCRM()">↻</button>
              <button class="btn btn-w btn-sm" onclick="openCRMEdit(null)">+ Добавить</button>
            </div>
          </div>
          <div class="chip-row" id="crmFilterChips">
            <div class="chip active" data-filter="all" onclick="setCrmFilter('all')">Все</div>
            <div class="chip" data-filter="risk" onclick="setCrmFilter('risk')">🔥 Риск</div>
            <div class="chip" data-filter="new" onclick="setCrmFilter('new')">🆕 Новые</div>
            <div class="chip" data-filter="unpaid" onclick="setCrmFilter('unpaid')">💳 Не оплатили в этом месяце</div>
            <div class="chip" data-filter="pending" onclick="setCrmFilter('pending')">⏳ Ожидают одобрения</div>
          </div>
          <p style="font-size:12px;color:var(--text3);margin:4px 0 12px">Клик по карточке открывает подробную информацию и смену статуса. За значок ⠿ карточку можно перетащить в другую колонку. Точка на карточке — красная значит требует внимания (риск/не оплатил), жёлтая — ждёт одобрения. Перевод в «Пауза»/«Ушёл» и обратно отправляет участнику уведомление в Telegram.</p>
          <div id="crm-board" class="crm-board"></div>
        </div>

        <div class="card" style="margin-bottom:12px">
          <div class="card-title">Синхронизация</div>
          <p style="font-size:13px;color:var(--text3);margin-bottom:12px">Привязывает TG ID и username к email по существующим записям user:* в KV</p>
          <button class="btn btn-ghost" onclick="syncParticipants()">🔄 Синхронизировать участников</button>
          <div class="msg" id="syncMsg" style="margin-top:8px"></div>
        </div>
        <div class="card">
          <div class="card-title">Добавить email напрямую (выдать доступ)</div>
          <div class="row">
            <div class="field">
              <input type="email" id="newEmail" placeholder="email@example.com"/>
            </div>
            <button class="btn btn-ghost" onclick="addEmail()">Добавить</button>
          </div>
          <div class="msg" id="addEmailMsg"></div>
        </div>
      </div>

      <!-- CRM EDIT MODAL -->
      <div class="modal-overlay" id="crmEditModal">
        <div class="modal" style="max-width:560px">
          <div class="modal-title" id="crmEditTitle">Карточка участника</div>
          <div id="crmActivityReadout" style="display:none;font-size:12px;color:var(--text3);margin:-12px 0 16px"></div>
          <input type="hidden" id="crmKey"/>
          <div class="grid-2">
            <div class="field"><label>Имя</label><input type="text" id="crmName" placeholder="Имя Фамилия"/></div>
            <div class="field"><label>Статус</label>
              <select id="crmStatus">
                <option value="bot">Написал боту</option>
                <option value="lead">Лид</option>
                <option value="paid">Оплатил</option>
                <option value="active">Активен</option>
                <option value="paused">Пауза</option>
                <option value="left">Ушёл</option>
              </select>
            </div>
          </div>
          <div class="grid-2">
            <div class="field"><label>Email</label><input type="email" id="crmEmail" placeholder="email@example.com"/></div>
            <div class="field"><label>Telegram (без @)</label><input type="text" id="crmTelegram" placeholder="username"/></div>
          </div>
          <div style="display:flex;gap:8px;margin:-8px 0 14px">
            <button class="btn btn-ghost btn-sm" id="crmQuickTgBtn" style="display:none" onclick="crmOpenTelegram(event, document.getElementById('crmTelegram').value.trim().replace(/^@/,''))">✈️ Открыть в Telegram</button>
            <button class="btn btn-ghost btn-sm" id="crmQuickEmailBtn" style="display:none" onclick="crmCopyEmail(event, document.getElementById('crmEmail').value.trim())">📋 Скопировать email</button>
          </div>
          <div class="field" id="crmApproveWrap" style="display:none">
            <button class="btn btn-w btn-sm" onclick="approveCRMEntry()">✅ Одобрить доступ (ожидает подтверждения)</button>
          </div>
          <div class="field">
            <button class="btn btn-danger btn-sm" id="crmPauseResumeBtn" style="display:none" onclick="crmModalPauseResume()"></button>
          </div>
          <div class="field"><label>Примечание</label><textarea id="crmNote" rows="3" placeholder="Заметки по участнику..."></textarea></div>

          <div class="field" id="crmStatsBlock" style="display:none">
            <label>Статистика</label>
            <div id="crmStatsContent" style="font-size:12px;color:var(--text2);display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px"></div>
          </div>

          <div class="field">
            <label>Факты оплаты (5 000 ₽ / месяц) — <span id="crmPaidSum">0 ₽</span></label>
            <div id="crmPaidMonths" style="display:flex;flex-wrap:wrap;gap:6px"></div>
          </div>

          <div class="field">
            <label>История оплат (сумма и дата) — <span id="crmPaymentsSum">0 ₽</span></label>
            <div id="crmPaymentsList" style="margin-bottom:8px"></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <input type="number" id="crmPaymentAmount" placeholder="Сумма ₽" style="flex:1;min-width:100px" min="0"/>
              <input type="date" id="crmPaymentDate" style="flex:1;min-width:120px"/>
              <button class="btn btn-ghost btn-sm" onclick="addCRMPaymentRecord()">+ Добавить</button>
            </div>
          </div>

          <div class="field">
            <label>Посещения воркшопов</label>
            <div id="crmWorkshopList" style="margin-bottom:8px"></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <input type="text" id="crmWorkshopTitle" placeholder="Название воркшопа" style="flex:2;min-width:140px"/>
              <input type="date" id="crmWorkshopDate" style="flex:1;min-width:120px"/>
              <button class="btn btn-ghost btn-sm" onclick="addCRMWorkshop()">+ Добавить</button>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="closeCRMEdit()">Отмена</button>
            <button class="btn btn-danger" id="crmDeleteBtn" onclick="deleteCRMEntry()" style="display:none">Удалить</button>
            <button class="btn btn-w" onclick="saveCRMEdit()">Сохранить</button>
          </div>
          <div class="msg" id="crmEditMsg"></div>
        </div>
      </div>

      <!-- EVENTS -->
<div class="page" id="page-events">
  <div class="page-title">Мероприятия</div>

  <div class="card">
<div class="card-title" id="evCardTitle">Добавить мероприятие</div>
    <div class="grid-2">
      <div class="field">
        <label>Название</label>
        <input type="text" id="evTitle" placeholder="Субботний разбор #12"/>
      </div>
      <div class="field">
  <label>Теги (через запятую)</label>
  <input type="text" id="evTags" placeholder="Встреча, Разборы..."/>
</div>
<div class="grid-2">
      <div class="field">
        <label>Автор (опционально)</label>
        <input type="text" id="evAuthor" placeholder="Иван Иванов"/>
      </div>
    <div class="field">
  <label>Ссылка на автора (опционально)</label>
  <input type="url" id="evAuthorUrl" placeholder="https://t.me/username"/>
</div>
</div>
<div class="field">
        <label>Фото (URL)</label>
        <input type="url" id="evPhoto" placeholder="https://..."/>
      </div>
      <div class="field">
        <label>Дата и время</label>
        <input type="datetime-local" id="evDatetime"/>
      </div>
<div class="grid-2">
    <div class="field">
    <label>Тип кнопки</label>
    <select id="evActionType">
      <option value="zoom">Zoom</option>
      <option value="register">Записаться</option>
    </select>
  </div>
    <div class="field">
      <label>Ссылка на мероприятие</label>
      <input type="url" id="evZoom" placeholder="https://zoom.us/j/..."/>
    </div>
      </div>
      </div>
    <button class="btn btn-w" id="evSaveBtn" onclick="saveEvent()">Добавить</button>
    <div class="msg" id="evMsg"></div>
    </div>
  <div id="eventsList"></div>
</div>

      <!-- NOTIFY -->
      <div class="page" id="page-notify">
        <div class="page-title">Уведомления</div>
        <div class="card">
          <div class="card-title">Отправить уведомление</div>
          <div class="field">
  <label>Получатели</label>
  <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
    <button class="btn btn-w btn-sm" id="notifyModeAll" onclick="setNotifyMode('all')">Все участники</button>
    <button class="btn btn-ghost btn-sm" id="notifyModeSelect" onclick="setNotifyMode('select')">Выбрать</button>
    <button class="btn btn-ghost btn-sm" id="notifyModeSegment" onclick="setNotifyMode('segment')">По сегменту</button>
  </div>
  <div id="notifySegmentRow" class="chip-row" style="display:none">
    <div class="chip active" data-seg="risk" onclick="setNotifySegment('risk')">🔥 Риск</div>
    <div class="chip" data-seg="new" onclick="setNotifySegment('new')">🆕 Новые</div>
    <div class="chip" data-seg="unpaid" onclick="setNotifySegment('unpaid')">💳 Не оплатили</div>
  </div>
  <div id="notifySegmentCount" style="display:none;font-size:12px;color:var(--text3);margin-bottom:12px"></div>
  <div id="notifyUserList" style="display:none;max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:8px"></div>
</div>
          <div class="field">
            <label>Текст сообщения</label>
            <textarea id="notifyText" rows="5" placeholder="Текст уведомления..." oninput="updatePreview()"></textarea>
          </div>
          <div class="card-title" style="margin-bottom:8px">Предпросмотр</div>
          <div class="notify-preview" id="notifyPreview">📢 Уведомление от CMO&#10;&#10;...</div>
          <button class="btn btn-w" onclick="sendNotify()" style="margin-top:8px">Отправить всем →</button>
          <div class="msg" id="notifyMsg"></div>
        </div>
      </div>

      <!-- PROGRAMS -->
      <div class="page" id="page-programs">
        <div class="page-title">Программы</div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-title">Теги модулей</div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:12px">Теги показываются участникам как фильтр в объединённом списке модулей Ядра.</div>
          <div id="tagsPoolChips" class="chip-row" style="margin-bottom:12px"></div>
          <div style="display:flex;gap:8px">
            <input type="text" id="newTagInput" placeholder="Название тега" style="flex:1" onkeydown="if(event.key==='Enter')addTagToPool()"/>
            <button class="btn btn-ghost btn-sm" onclick="addTagToPool()">+ Добавить тег</button>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:20px">
          <button class="btn btn-w" id="pb-ai" onclick="selectProgAdmin('ai')">🤖 ИИ-контент</button>
          <button class="btn btn-ghost" id="pb-funnels" onclick="selectProgAdmin('funnels')">🔻 Воронки</button>
        </div>
        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div class="card-title" style="margin-bottom:0">Модули программы</div>
            <button class="btn btn-ghost btn-sm" onclick="addModule()">+ Добавить модуль</button>
          </div>
          <div id="moduleList"></div>
        </div>

        <div class="card">
          <div class="card-title">Хронология в общем списке (Ядро)</div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:12px">Порядок, в котором участники видят модули обеих программ. Новый модуль автоматически встаёт сверху.</div>
          <div id="moduleOrderList"></div>
        </div>
      </div>

      <!-- QUESTIONS -->
      <div class="page" id="page-questions">
        <div class="page-title">Вопросы участников</div>
        <div id="questionsList"></div>
      </div>

      <!-- PAYMENTS -->
      <div class="page" id="page-payments">
        <div class="page-title">Оплаты</div>

        <div class="callout">
          <div class="ic">💳</div>
          <div>Оплаты идут через <b>edsofa.ai</b>. У edsofa.ai нет открытой API-документации, поэтому здесь два способа сверки: вставить таблицу с оплатами (как ты уже ведёшь её вручную) или настроить вебхук в личном кабинете edsofa.ai — попроси у их поддержки формат уведомления и, если поля будут отличаться от email/telegram/amount/paid_at, дай знать, чтобы поправить приём на своей стороне.</div>
        </div>

        <div class="card" style="margin-bottom:16px">
          <div class="card-title">Вставить таблицу оплат</div>
          <p style="font-size:12px;color:var(--text3);margin-bottom:12px">Скопируй строки прямо из таблицы (как в файле, который ты ведёшь) и вставь ниже. Первая строка — заголовки: <code style="background:var(--bg3);padding:2px 6px;border-radius:4px">telegram, email, ВСЕГО</code>, затем по одной колонке на месяц (например <code style="background:var(--bg3);padding:2px 6px;border-radius:4px">МАЙ, ИЮНЬ, ИЮЛЬ</code>). Пустая ячейка месяца — не оплачено, любое непустое значение — оплачено.</p>
          <div class="field">
            <label>Год для колонок-месяцев</label>
            <input type="number" id="paymentsImportYear" style="max-width:120px" placeholder="2026"/>
          </div>
          <div class="field">
            <label>Данные (вставь из таблицы, разделитель — таб или запятая)</label>
            <textarea id="paymentsImportData" rows="8" placeholder="telegram	email	ВСЕГО	МАЙ	ИЮНЬ	ИЮЛЬ&#10;https://t.me/AllaSld	habarovchanka@ya.ru	10000	 	5000	5000"></textarea>
          </div>
          <button class="btn btn-w" onclick="submitPaymentsImport()">Сверить и применить</button>
          <div class="msg" id="paymentsImportMsg"></div>
          <div id="paymentsImportUnmatched" style="margin-top:12px"></div>
        </div>

        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <div class="card-title" style="margin-bottom:0">Непривязанные оплаты из вебхука</div>
            <button class="btn btn-ghost btn-sm" onclick="loadPayments()">↻ Обновить</button>
          </div>
          <p style="font-size:12px;color:var(--text3);margin:4px 0 12px">Оплаты от edsofa.ai, для которых не нашёлся email/telegram в CRM — привяжи вручную к нужному участнику.</p>
          <div id="paymentsUnmatchedList" style="color:var(--text3);font-size:13px">Загрузка...</div>
        </div>
      </div>

      <div class="page" id="page-admins">
  <div class="page-title">Администраторы</div>
  <div class="card">
    <div class="card-title">Добавить админа</div>
    <div class="grid-3">
      <div class="field"><input type="text" id="newAdminName" placeholder="Имя"/></div>
      <div class="field"><input type="email" id="newAdminEmail" placeholder="Email"/></div>
      <div class="field"><input type="text" id="newAdminTgId" placeholder="TG ID"/></div>
    </div>
    <button class="btn btn-ghost" onclick="addAdmin()">Добавить</button>
  </div>
  <div class="card">
    <div class="card-title">Список администраторов</div>
    <table class="tbl">
      <thead><tr><th>Имя</th><th>Email</th><th>TG ID</th><th></th></tr></thead>
      <tbody id="adminTable"></tbody>
    </table>
  </div>
</div>

<!-- KB PAGE -->
<div class="page" id="page-kb">
  <div class="page-title">📚 База знаний</div>

  <div class="card" style="margin-bottom:16px">
    <div class="card-title">Инициализация данных</div>
    <p style="font-size:13px;color:var(--text2);margin-bottom:12px">При первом запуске или для сброса данных нажмите кнопку — загрузит все встречи из архива.</p>
    <button class="btn btn-ghost" onclick="kbInitData()">Загрузить начальные данные</button>
    <div class="msg" id="kbInitMsg"></div>
  </div>

  <div class="grid-2" style="margin-bottom:16px">
    <div class="card">
      <div class="card-title">Категории</div>
      <div id="kbCategoryList"></div>
      <div style="margin-top:12px">
        <button class="btn btn-ghost" onclick="kbOpenCategoryModal(null)">+ Добавить категорию</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Записи в категории</div>
      <div class="field">
        <label>Выбрать категорию</label>
        <select id="kbSelectedCat" onchange="kbLoadEntries(this.value)">
          <option value="">— выбрать —</option>
        </select>
      </div>
      <div id="kbEntryList"></div>
      <div style="margin-top:12px">
        <button class="btn btn-ghost" onclick="kbOpenEntryModal(null)" id="kbAddEntryBtn" disabled>+ Добавить запись</button>
      </div>
    </div>
  </div>
</div>

<!-- KB CATEGORY MODAL -->
<div class="modal-overlay" id="kbCatModal">
  <div class="modal" style="max-width:400px">
    <div class="modal-title" id="kbCatModalTitle">Категория</div>
    <input type="hidden" id="kbCatId"/>
    <div class="field"><label>ID (латиница, без пробелов)</label><input type="text" id="kbCatIdInput" placeholder="experts-2026"/></div>
    <div class="field"><label>Название</label><input type="text" id="kbCatTitle" placeholder="Встречи с экспертами 2026"/></div>
    <div class="field"><label>Иконка (emoji)</label><input type="text" id="kbCatIcon" placeholder="🎤" maxlength="4"/></div>
    <div class="field"><label>Порядок</label><input type="number" id="kbCatOrder" placeholder="1" min="0"/></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="kbCloseCatModal()">Отмена</button>
      <button class="btn btn-w" onclick="kbSaveCategory()">Сохранить</button>
    </div>
  </div>
</div>

<!-- KB ENTRY MODAL -->
<div class="modal-overlay" id="kbEntryModal">
  <div class="modal" style="max-width:600px">
    <div class="modal-title" id="kbEntryModalTitle">Запись базы знаний</div>
    <input type="hidden" id="kbEntryId"/>
    <input type="hidden" id="kbEntryCatId"/>
    <div class="grid-2">
      <div class="field"><label>ID (латиница)</label><input type="text" id="kbEntryIdInput" placeholder="expert-name-2026-04-16"/></div>
      <div class="field"><label>Дата</label><input type="text" id="kbEntryDate" placeholder="16.04.2026"/></div>
    </div>
    <div class="field"><label>Название</label><input type="text" id="kbEntryTitle" placeholder="Встреча с Иваном Ивановым"/></div>
    <div class="field"><label>Подзаголовок / тема</label><input type="text" id="kbEntrySubtitle" placeholder="Как увеличить конверсию на 300%"/></div>
    <div class="field"><label>Ссылка на запись (YouTube)</label><input type="url" id="kbEntryVideo" placeholder="https://youtu.be/..."/></div>
    <div class="field">
      <label>Материалы (по одному на строку: Название | URL)</label>
      <textarea id="kbEntryMaterials" rows="4" placeholder="Шаблон аудита базы | https://docs.google.com/...&#10;Промт для нейро-прогрева | https://docs.google.com/..."></textarea>
    </div>
    <div class="field">
      <label>Выводы и тезисы</label>
      <textarea id="kbEntrySummary" rows="8" placeholder="Основные тезисы встречи..."></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="kbCloseEntryModal()">Отмена</button>
      <button class="btn btn-danger" id="kbEntryDeleteBtn" onclick="kbDeleteEntry()" style="display:none">Удалить</button>
      <button class="btn btn-w" onclick="kbSaveEntry()">Сохранить</button>
    </div>
  </div>
</div>

<!-- COFFEE PAGE -->
<div class="page" id="page-coffee">
  <div class="page-title">☕ Рандом Кофе</div>

  <!-- Статистика -->
  <div class="stats-row" style="margin-bottom:24px">
    <div class="stat-card"><div class="stat-val" id="coffee-stat-total">—</div><div class="stat-label">Участников</div></div>
    <div class="stat-card"><div class="stat-val" id="coffee-stat-active">—</div><div class="stat-label">Активных</div></div>
    <div class="stat-card"><div class="stat-val" id="coffee-stat-complaints">—</div><div class="stat-label">Жалоб</div></div>
    <div class="stat-card"><div class="stat-val" id="coffee-stat-week">—</div><div class="stat-label">Пар на неделе</div></div>
  </div>

  <!-- Текущий раунд -->
  <div class="card" style="margin-bottom:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:14px;font-weight:600">Раунд <span id="coffee-week-id">—</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="loadCoffeeAdmin()">↻ Обновить</button>
        <button class="btn btn-ghost" onclick="generateCoffeePairsAuto()">🎲 Авто-распределение</button>
        <button class="btn btn-w" onclick="openCoffeePairModal()">+ Назначить пары вручную</button>
        <button class="btn btn-w" onclick="sendCoffeePairsNow()">📤 Отправить сейчас</button>
      </div>
    </div>
    <div id="coffee-pairs-table">
      <div style="color:var(--text3);font-size:13px">Пары ещё не назначены</div>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-top:8px">
      Каждый понедельник в 12:00 МСК пары формируются автоматически (по возможности без повторов партнёров) и рассылаются участникам. Кнопка «Авто-распределение» позволяет сформировать пары заранее и при необходимости скорректировать их вручную до рассылки.
    </div>
  </div>

  <!-- Жалобы -->
  <div class="card" style="margin-bottom:20px">
    <div style="font-size:14px;font-weight:600;margin-bottom:16px">Жалобы</div>
    <div id="coffee-complaints-list">
      <div style="color:var(--text3);font-size:13px">Жалоб нет</div>
    </div>
  </div>

  <!-- История по неделям -->
  <div class="card" style="margin-bottom:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:14px;font-weight:600">История взаимодействий по неделям</div>
      <button class="btn btn-ghost" onclick="loadCoffeeHistory()">↻ Обновить</button>
    </div>
    <div id="coffee-history-list">
      <div style="color:var(--text3);font-size:13px">Загрузка...</div>
    </div>
  </div>

  <!-- Участники -->
  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:14px;font-weight:600">Участники</div>
      <input id="coffee-search" type="text" placeholder="Поиск..."
        oninput="filterCoffeeParticipants()"
        style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:7px 12px;color:var(--text);font-size:13px;width:200px;outline:none"/>
    </div>
    <table class="tbl" style="width:100%">
      <thead>
        <tr>
          <th>Участник</th>
          <th>Анкета</th>
          <th>Встреч</th>
          <th>Рейтинг</th>
          <th>Статус</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody id="coffee-participants-tbody"></tbody>
    </table>
  </div>
</div>

<!-- ANALYTICS PAGE -->
<div class="page" id="page-analytics">
  <div class="page-title">📊 Аналитика активности</div>

  <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px">
    <label style="font-size:12px;color:var(--text3)">Период:</label>
    <select id="analytics-days" onchange="loadAnalytics()" style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:6px 10px;color:var(--text);font-size:13px">
      <option value="7">7 дней</option>
      <option value="14" selected>14 дней</option>
      <option value="30">30 дней</option>
      <option value="90">90 дней</option>
    </select>
    <button class="btn btn-ghost" onclick="loadAnalytics()">↻ Обновить</button>
  </div>

  <div class="stats-row" style="margin-bottom:24px">
    <div class="stat-card"><div class="stat-val" id="an-total-events">—</div><div class="stat-label">Событий за период</div></div>
    <div class="stat-card"><div class="stat-val" id="an-bot-start">—</div><div class="stat-label">Открытий бота</div></div>
    <div class="stat-card"><div class="stat-val" id="an-miniapp-open">—</div><div class="stat-label">Открытий мини-апа</div></div>
    <div class="stat-card"><div class="stat-val" id="an-section-view">—</div><div class="stat-label">Просмотров разделов</div></div>
    <div class="stat-card"><div class="stat-val" id="an-clicks">—</div><div class="stat-label">Кликов</div></div>
  </div>

  <div class="card" style="margin-bottom:20px">
    <div style="font-size:14px;font-weight:600;margin-bottom:16px">Активность по дням</div>
    <div id="analytics-daily-chart"></div>
  </div>

  <div class="card" style="margin-bottom:20px">
    <div style="font-size:14px;font-weight:600;margin-bottom:16px">Текущие показатели (сводка)</div>
    <div id="analytics-current-summary" style="color:var(--text3);font-size:13px">Загрузка...</div>
  </div>

  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:14px;font-weight:600">Активность в чате Ядра</div>
      <button class="btn btn-ghost btn-sm" onclick="openChatImportModal()">+ Внести данные вручную</button>
    </div>
    <div class="callout">
      <div class="ic">🤖</div>
      <div>Чтобы бот считал сообщения в чате автоматически: добавь его в чат Ядра участником, затем в <b>@BotFather</b> → выбери бота → <b>Bot Settings → Group Privacy → Turn off</b>. Пока Privacy Mode включён, Telegram не показывает боту обычные сообщения группы — только упоминания и команды. Дни до подключения бота можно внести вручную ниже, задним числом.</div>
    </div>
    <div id="chat-activity-list" style="color:var(--text3);font-size:13px">Загрузка...</div>
  </div>
</div>

<!-- CHAT ACTIVITY IMPORT MODAL -->
<div class="modal-overlay" id="chatImportModal">
  <div class="modal" style="max-width:520px">
    <div class="modal-title">Внести активность чата вручную</div>
    <div class="field"><label>Chat ID</label><input type="text" id="chatImportChatId" placeholder="-100XXXXXXXXXX"/></div>
    <div class="field">
      <label>Данные (по одной записи на строку: Имя | Дата ГГГГ-ММ-ДД | Кол-во сообщений)</label>
      <textarea id="chatImportData" rows="8" placeholder="Иван Иванов | 2026-07-20 | 5&#10;Мария Петрова | 2026-07-21 | 3"></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="document.getElementById('chatImportModal').classList.remove('open')">Отмена</button>
      <button class="btn btn-w" onclick="submitChatImport()">Сохранить</button>
    </div>
    <div class="msg" id="chatImportMsg"></div>
  </div>
</div>

    </div>
  </div>
</div>

<!-- COFFEE PAIR MODAL -->
<div id="coffeePairModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;align-items:center;justify-content:center;">
  <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:24px;width:480px;max-height:80vh;overflow-y:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div style="font-family:'Unbounded',sans-serif;font-size:14px;font-weight:600">Назначить пары</div>
      <button onclick="document.getElementById('coffeePairModal').style.display='none'" style="background:none;border:none;color:var(--text2);font-size:18px;cursor:pointer">✕</button>
    </div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:16px">
      Выбери пары участников из списков ниже.
    </div>
    <div id="coffee-pair-rows" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px"></div>
    <button onclick="addCoffeePairRow()" class="btn btn-ghost" style="width:100%;margin-bottom:16px">+ Добавить пару</button>
    <div style="display:flex;gap:8px">
      <button onclick="document.getElementById('coffeePairModal').style.display='none'" class="btn btn-ghost" style="flex:1">Отмена</button>
      <button onclick="saveCoffeePairs()" class="btn btn-w" style="flex:1">Сохранить раунд</button>
    </div>
  </div>
</div>

<!-- MODULE MODAL -->
<div class="modal-overlay" id="moduleModal">
  <div class="modal" style="max-width:640px">
    <div class="modal-title" id="modalTitle">Редактировать модуль</div>
    <input type="hidden" id="mId"/>
    <div class="field">
      <label>Название модуля</label>
      <input type="text" id="mTitle" placeholder="Название"/>
    </div>
    <div class="field">
      <label>Описание</label>
      <textarea id="mDesc" placeholder="Описание модуля..."></textarea>
    </div>
    <div class="field">
      <label>Дата модуля</label>
      <input type="date" id="mDate"/>
    </div>
    <div class="field">
      <label>Теги</label>
      <div id="mTagsChips" class="chip-row"></div>
    </div>
    <div class="field">
      <label>Ссылка на видео (YouTube / Vimeo)</label>
      <input type="url" id="mEmbed" placeholder="https://youtube.com/watch?v=..."/>
    </div>
    <div class="field">
      <label>Таймкоды</label>
      <div id="mTimecodesRows" style="display:flex;flex-direction:column;gap:6px"></div>
      <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="addTimecodeRow()">+ Добавить таймкод</button>
    </div>
    <div class="field">
      <label>Файлы / материалы</label>
      <div id="mFilesRows" style="display:flex;flex-direction:column;gap:6px"></div>
      <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="addFileRow()">+ Добавить файл</button>
    </div>
    <div class="field">
      <div class="toggle-wrap">
        <label class="toggle">
          <input type="checkbox" id="mAvailable"/>
          <div class="toggle-track"></div>
          <div class="toggle-thumb"></div>
        </label>
        <span style="font-size:13px;color:var(--text2)">Доступен участникам</span>
      </div>
    </div>
    <div class="field">
      <label>Задания модуля</label>
      <div id="mTasksRows" style="display:flex;flex-direction:column;gap:10px"></div>
      <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="addModuleTaskRow()">+ Добавить задание</button>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Отмена</button>
      <button class="btn btn-danger" id="mDeleteBtn" onclick="deleteModuleFromModal()">Удалить модуль</button>
      <button class="btn btn-w" onclick="saveModule()">Сохранить</button>
    </div>
    <div class="msg" id="moduleMsg"></div>
  </div>
</div>

<nav id="mobileNav" style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:200;background:rgba(13,13,13,0.97);backdrop-filter:blur(12px);border-top:1px solid rgba(255,255,255,0.08);padding:0 8px;padding-bottom:env(safe-area-inset-bottom,0px)">
  <div style="display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch">
    <button class="mnav-btn active" id="mnav-dashboard" onclick="showPage('dashboard')">
      <span style="font-size:20px">⊞</span>
      <span>Дашборд</span>
    </button>
    <button class="mnav-btn" id="mnav-participants" onclick="showPage('participants')">
      <span style="font-size:20px">👤</span>
      <span>CRM</span>
    </button>
    <button class="mnav-btn" id="mnav-analytics" onclick="showPage('analytics')">
      <span style="font-size:20px">📊</span>
      <span>Активность</span>
    </button>
    <button class="mnav-btn" id="mnav-notify" onclick="showPage('notify')">
      <span style="font-size:20px">📢</span>
      <span>Рассылка</span>
    </button>
    <button class="mnav-btn" id="mnav-questions" onclick="showPage('questions')">
      <span style="font-size:20px">❓</span>
      <span>Вопросы</span>
    </button>
    <button class="mnav-btn" id="mnav-payments" onclick="showPage('payments')">
      <span style="font-size:20px">💳</span>
      <span>Оплаты</span>
    </button>
    <button class="mnav-btn" id="mnav-events" onclick="showPage('events')">
      <span style="font-size:20px">📅</span>
      <span>Мероприятия</span>
    </button>
    <button class="mnav-btn" id="mnav-coffee" onclick="showPage('coffee')">
      <span style="font-size:20px">☕</span>
      <span>Кофе</span>
    </button>
    <button class="mnav-btn" id="mnav-programs" onclick="showPage('programs')">
      <span style="font-size:20px">📚</span>
      <span>Программы</span>
    </button>
    <button class="mnav-btn" id="mnav-kb" onclick="showPage('kb')">
      <span style="font-size:20px">📖</span>
      <span>База знаний</span>
    </button>
    <button class="mnav-btn" id="mnav-admins" onclick="showPage('admins')">
      <span style="font-size:20px">🔐</span>
      <span>Админы</span>
    </button>
  </div>
</nav>

<script>
let adminToken = '';
let adminProgram = 'ai';
let adminProgramData = { ai: null, funnels: null };
let allParticipantsData = [];
let notifyMode = 'all';
let notifySegment = 'risk';
let selectedNotifyUsers = new Set();
let editingEventId = null;


function setNotifyMode(mode) {
  notifyMode = mode;
  document.getElementById('notifyModeAll').className = mode === 'all' ? 'btn btn-w btn-sm' : 'btn btn-ghost btn-sm';
  document.getElementById('notifyModeSelect').className = mode === 'select' ? 'btn btn-w btn-sm' : 'btn btn-ghost btn-sm';
  document.getElementById('notifyModeSegment').className = mode === 'segment' ? 'btn btn-w btn-sm' : 'btn btn-ghost btn-sm';
  document.getElementById('notifyUserList').style.display = mode === 'select' ? 'block' : 'none';
  document.getElementById('notifySegmentRow').style.display = mode === 'segment' ? 'flex' : 'none';
  document.getElementById('notifySegmentCount').style.display = mode === 'segment' ? 'block' : 'none';
  if (mode === 'select') loadNotifyUserList();
  if (mode === 'segment') updateNotifySegmentCount();
}

async function setNotifySegment(seg) {
  notifySegment = seg;
  document.querySelectorAll('#notifySegmentRow .chip').forEach(c => c.classList.toggle('active', c.dataset.seg === seg));
  updateNotifySegmentCount();
}

async function updateNotifySegmentCount() {
  const el = document.getElementById('notifySegmentCount');
  el.textContent = 'Считаем аудиторию...';
  try {
    if (!crmData.length) await loadCRM();
    const count = crmSegmentTgIds(notifySegment).length;
    el.textContent = \`Получат сообщение: \${count} участник\${count === 1 ? '' : count < 5 ? 'а' : 'ов'} с привязанным Telegram\`;
  } catch (e) { el.textContent = ''; }
}

function crmSegmentTgIds(seg) {
  let list = crmData.filter(p => p.tgId);
  if (seg === 'risk') list = list.filter(p => p.risk);
  else if (seg === 'new') list = list.filter(p => p.isNew);
  else if (seg === 'unpaid') list = list.filter(p => (p.status === 'active' || p.status === 'paid') && !p.paidThisMonth);
  return list.map(p => p.tgId);
}

// ── PAYMENTS (edsofa.ai reconciliation) ─────────────────────────────
const RU_MONTH_MAP = { 'янв':1,'фев':2,'мар':3,'апр':4,'май':5,'июн':6,'июл':7,'авг':8,'сен':9,'окт':10,'ноя':11,'дек':12 };
function ruMonthToNum(word) {
  const w = (word || '').toLowerCase().trim();
  for (const prefix in RU_MONTH_MAP) if (w.startsWith(prefix)) return RU_MONTH_MAP[prefix];
  return null;
}

function splitImportLine(line) {
  if (line.includes('\t')) return line.split('\t');
  const protectedLine = line.replace(/(\\d),(\\d{3})/g, '$1§$2');
  return protectedLine.split(',').map(c => c.replace(/§/g, ','));
}

function parsePaymentsImportData(raw, year) {
  const lines = raw.split('\\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { records: [], error: 'Нужна строка заголовков и хотя бы одна строка данных' };

  const header = splitImportLine(lines[0]).map(h => h.trim());
  let tgIdx = -1, emailIdx = -1;
  const monthCols = [];
  header.forEach((h, i) => {
    const hl = h.toLowerCase();
    if (hl.includes('telegram') || hl === 'tg' || hl.includes('t.me')) tgIdx = i;
    else if (hl.includes('mail') || hl.includes('почта')) emailIdx = i;
    else {
      const m = ruMonthToNum(hl);
      if (m) monthCols.push({ idx: i, monthKey: year + '-' + String(m).padStart(2, '0') });
    }
  });

  if (tgIdx === -1 || emailIdx === -1) {
    const sample = splitImportLine(lines[1] || '');
    sample.forEach((cell, i) => {
      if (tgIdx === -1 && /t\\.me\\//i.test(cell)) tgIdx = i;
      if (emailIdx === -1 && /@.+\\./.test(cell)) emailIdx = i;
    });
  }

  if (!monthCols.length) return { records: [], error: 'Не нашёл ни одной колонки-месяца в заголовке (МАЙ, ИЮНЬ...)' };
  if (tgIdx === -1 && emailIdx === -1) return { records: [], error: 'Не нашёл колонку telegram или email' };

  const records = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = splitImportLine(lines[li]);
    const tgRaw = tgIdx >= 0 ? (cells[tgIdx] || '').trim() : '';
    const telegram = tgRaw.replace(/^https?:\\/\\/t\\.me\\//i, '').replace(/^@/, '').trim() || null;
    const email = emailIdx >= 0 ? (cells[emailIdx] || '').trim().toLowerCase() || null : null;
    if (!telegram && !email) continue;
    const months = [];
    monthCols.forEach(mc => {
      const v = (cells[mc.idx] || '').trim();
      if (v && /\\d/.test(v)) months.push(mc.monthKey);
    });
    if (!months.length) continue;
    records.push({ telegram, email, months });
  }
  return { records };
}

async function submitPaymentsImport() {
  const year = parseInt(document.getElementById('paymentsImportYear').value, 10) || new Date().getFullYear();
  const raw = document.getElementById('paymentsImportData').value.trim();
  const msg = document.getElementById('paymentsImportMsg');
  if (!raw) { msg.className = 'msg err'; msg.textContent = 'Вставь данные'; return; }

  const { records, error } = parsePaymentsImportData(raw, year);
  if (error) { msg.className = 'msg err'; msg.textContent = error; return; }
  if (!records.length) { msg.className = 'msg err'; msg.textContent = 'Не нашёл ни одной строки с оплатой'; return; }

  try {
    const res = await fetch('/api/admin/payments', {
      method: 'POST', headers: aHeaders(),
      body: JSON.stringify({ action: 'import', records })
    }).then(r => r.json());
    if (!res.ok) { msg.className = 'msg err'; msg.textContent = res.error || 'Ошибка'; return; }
    msg.className = 'msg ok';
    msg.textContent = \`Применено к \${res.matched} участник\${res.matched === 1 ? 'у' : 'ам'}\${res.unmatched?.length ? \`, не найдено в CRM: \${res.unmatched.length}\` : ''}\`;
    const unmEl = document.getElementById('paymentsImportUnmatched');
    unmEl.innerHTML = (res.unmatched || []).length ? \`<div class="card" style="background:var(--bg2)"><div class="card-title">Не найдены в CRM (добавь их вручную)</div>\` +
      res.unmatched.map(r => \`<div style="font-size:12px;color:var(--text2);padding:4px 0">\${escapeAdminHtml(r.telegram ? '@' + r.telegram : '') } \${escapeAdminHtml(r.email || '')}</div>\`).join('') + '</div>' : '';
    if (res.matched) loadCRM();
  } catch (e) { msg.className = 'msg err'; msg.textContent = 'Ошибка подключения'; }
}

async function loadPayments() {
  const el = document.getElementById('paymentsUnmatchedList');
  try {
    if (!crmData.length) await loadCRM();
    const data = await fetch('/api/admin/payments', { headers: aHeaders() }).then(r => r.json());
    if (!data.ok) { el.innerHTML = '<div style="color:var(--text3)">Ошибка загрузки</div>'; return; }
    window.paymentsUnmatchedData = data.unmatched || [];
    renderPaymentsUnmatched();
  } catch (e) { el.innerHTML = '<div style="color:var(--text3)">Ошибка загрузки</div>'; }
}

function renderPaymentsUnmatched() {
  const el = document.getElementById('paymentsUnmatchedList');
  const list = window.paymentsUnmatchedData || [];
  if (!list.length) { el.innerHTML = '<div style="color:var(--text3)">Непривязанных оплат нет.</div>'; return; }
  const options = crmData.map(p => \`<option value="\${escapeAdminHtml(p.key)}">\${escapeAdminHtml(p.name || p.email || p.telegram || p.key)}</option>\`).join('');
  el.innerHTML = list.map(u => \`
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:160px">
        <div style="font-size:13px">\${escapeAdminHtml(u.email || '')} \${u.telegram ? '<span style="color:var(--accent)">@' + escapeAdminHtml(u.telegram) + '</span>' : ''}</div>
        <div style="font-size:11px;color:var(--text3)">\${u.monthKey || ''}\${u.amount ? ' · ' + u.amount : ''} · \${new Date(u.receivedAt).toLocaleDateString('ru')}</div>
      </div>
      <select id="paymentsLink-\${u.id}" style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:6px 8px;color:var(--text);font-size:12px;max-width:200px">
        <option value="">— выбрать участника —</option>\${options}
      </select>
      <button class="btn btn-ghost btn-sm" onclick="linkUnmatchedPayment('\${u.id}')">Привязать</button>
      <button class="btn btn-ghost btn-sm" onclick="dismissUnmatchedPayment('\${u.id}')">Скрыть</button>
    </div>\`).join('');
}

async function linkUnmatchedPayment(id) {
  const key = document.getElementById('paymentsLink-' + id)?.value;
  if (!key) { showAdminToast('Выбери участника'); return; }
  await fetch('/api/admin/payments', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ action: 'link-unmatched', id, key }) });
  showAdminToast('Привязано');
  loadCRM();
  loadPayments();
}

async function dismissUnmatchedPayment(id) {
  await fetch('/api/admin/payments', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ action: 'dismiss-unmatched', id }) });
  loadPayments();
}

async function loadNotifyUserList() {
  const data = await fetch('/api/admin/participants', { headers: aHeaders() }).then(r => r.json());
  let html = '';
  for (const email of (data.emails || [])) {
    const { userId } = await fetch('/api/admin/userid-by-email?email=' + encodeURIComponent(email), { headers: aHeaders() }).then(r => r.json());
    html += \`<label style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-bottom:1px solid var(--border)">
      <input type="checkbox" onchange="toggleNotifyUser('\${userId}')" style="width:16px;height:16px"/>
      <span style="font-size:13px">\${email}</span>
      \${userId ? '<span style="font-size:11px;color:var(--text3)">ID: ' + userId + '</span>' : ''}
    </label>\`;
  }
  document.getElementById('notifyUserList').innerHTML = html;
}

function toggleNotifyUser(userId) {
  if (selectedNotifyUsers.has(userId)) selectedNotifyUsers.delete(userId);
  else selectedNotifyUsers.add(userId);
}


window.addEventListener('load', () => {
  const savedToken = localStorage.getItem('adminToken');
  if (savedToken) {
    adminToken = savedToken;
    document.getElementById('loginWrap').style.display = 'none';
    document.getElementById('adminWrap').style.display = 'block';
    const savedPage = localStorage.getItem('adminPage') || 'dashboard';
    const savedProg = localStorage.getItem('adminProg') || 'ai';
    loadDashboard();
    loadParticipants();
    loadProgramAdmin(savedProg);
    loadTagsPool();
    loadModuleOrder();
    loadQuestions();
    showPage(savedPage);
    selectProgAdmin(savedProg);
  }
});

function initMobileNav() {
  const isMobile = window.innerWidth <= 768;
  document.getElementById('mobileNav').style.display = isMobile ? 'block' : 'none';
}
window.addEventListener('resize', initMobileNav);
window.addEventListener('load', initMobileNav);

// ── LOGIN ─────────────────────────────────────────────────────
async function adminLogin() {
  const pass = document.getElementById('adminPass').value;
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass })
    }).then(r => r.json());

    if (res.ok) {
  adminToken = res.token;
  localStorage.setItem('adminToken', adminToken);
  document.getElementById('loginWrap').style.display = 'none';
  document.getElementById('adminWrap').style.display = 'block';
  
  const savedPage = localStorage.getItem('adminPage') || 'dashboard';
  const savedProg = localStorage.getItem('adminProg') || 'ai';
  
  loadDashboard();
  loadParticipants();
  loadProgramAdmin(savedProg);
  loadTagsPool();
  loadModuleOrder();
  loadQuestions();
  showPage(savedPage);
  selectProgAdmin(savedProg);
} else {
      document.getElementById('loginError').textContent = res.error || 'Ошибка';
    }
  } catch(e) {
    document.getElementById('loginError').textContent = 'Ошибка подключения';
  }
}

function aHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'admin_session_' + adminToken };
}

// ── Редактор модуля: таймкоды / файлы / задания как списки строк ──

function addTimecodeRow(time, label) {
  const rows = document.getElementById('mTimecodesRows');
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;align-items:center';
  div.innerHTML = '<input type="text" class="tc-time" placeholder="00:00" value="' + escapeAdminHtml(time || '') + '" style="width:90px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:7px 10px;color:var(--text);font-size:12px"/>' +
    '<input type="text" class="tc-label" placeholder="Название раздела" value="' + escapeAdminHtml(label || '') + '" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:7px 10px;color:var(--text);font-size:12px"/>' +
    '<button type="button" onclick="this.parentElement.remove()" class="btn btn-ghost btn-sm">✕</button>';
  rows.appendChild(div);
}

function addFileRow(name, url) {
  const rows = document.getElementById('mFilesRows');
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;align-items:center';
  div.innerHTML = '<input type="text" class="mf-name" placeholder="Название файла" value="' + escapeAdminHtml(name || '') + '" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:7px 10px;color:var(--text);font-size:12px"/>' +
    '<input type="url" class="mf-url" placeholder="https://..." value="' + escapeAdminHtml(url || '') + '" style="flex:2;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:7px 10px;color:var(--text);font-size:12px"/>' +
    '<button type="button" onclick="this.parentElement.remove()" class="btn btn-ghost btn-sm">✕</button>';
  rows.appendChild(div);
}

function addModuleTaskRow(taskId, title, description) {
  const rows = document.getElementById('mTasksRows');
  const div = document.createElement('div');
  div.className = 'module-task-row';
  div.dataset.taskId = taskId || '';
  div.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:6px';
  div.innerHTML = '<div style="display:flex;gap:8px;align-items:center">' +
    '<input type="text" class="mt-title" placeholder="Название задания" value="' + escapeAdminHtml(title || '') + '" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:7px 10px;color:var(--text);font-size:12px"/>' +
    '<button type="button" onclick="removeModuleTaskRow(this)" class="btn btn-danger btn-sm">✕</button>' +
    '</div>' +
    '<textarea class="mt-desc" placeholder="Описание задания (необязательно)" rows="2" style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:7px 10px;color:var(--text);font-size:12px">' + escapeAdminHtml(description || '') + '</textarea>';
  rows.appendChild(div);
}

function removeModuleTaskRow(btn) {
  const row = btn.closest('.module-task-row');
  if (!row) return;
  const taskId = row.dataset.taskId;
  if (taskId) {
    window._moduleDeletedTaskIds = window._moduleDeletedTaskIds || [];
    window._moduleDeletedTaskIds.push(taskId);
  }
  row.remove();
}

// ── PAGES ─────────────────────────────────────────────────────
function showPage(id) {
  localStorage.setItem('adminPage', id);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.mnav-btn').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.getElementById('nl-' + id).classList.add('active');
  const mnavBtn = document.getElementById('mnav-' + id);
  if (mnavBtn) mnavBtn.classList.add('active');

  if (id === 'participants') loadParticipants();
  if (id === 'questions') loadQuestions();
  if (id === 'dashboard') loadDashboard();
  if (id === 'admins') loadAdmins();
  if (id === 'events') loadEvents();
  if (id === 'coffee') loadCoffeeAdmin();
  if (id === 'kb') kbLoadAdmin();
  if (id === 'analytics') loadAnalytics();
  if (id === 'payments') loadPayments();
}

async function loadAnalytics() {
  const days = document.getElementById('analytics-days')?.value || 14;
  try {
    const data = await fetch('/api/admin/analytics?days=' + days, { headers: aHeaders() }).then(r => r.json());
    if (!data.ok) return;

    document.getElementById('an-total-events').textContent = data.totals.total || 0;
    document.getElementById('an-bot-start').textContent = data.totals.byType.bot_start || 0;
    document.getElementById('an-miniapp-open').textContent = data.totals.byType.miniapp_open || 0;
    document.getElementById('an-section-view').textContent = data.totals.byType.section_view || 0;
    document.getElementById('an-clicks').textContent = data.totals.byType.click || 0;

    renderAnalyticsDaily(data.days || []);

    const stats = await fetch('/api/admin/dashboard-stats', { headers: aHeaders() }).then(r => r.json());
    document.getElementById('analytics-current-summary').innerHTML = \`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">
        <div><div style="font-size:20px;font-weight:600">\${stats.totalEmails || 0}</div><div style="font-size:11px;color:var(--text3)">Участников всего</div></div>
        <div><div style="font-size:20px;font-weight:600">\${stats.totalPending || 0}</div><div style="font-size:11px;color:var(--text3)">В ожидании</div></div>
        <div><div style="font-size:20px;font-weight:600">\${stats.totalLaunches || 0}</div><div style="font-size:11px;color:var(--text3)">Заходов в мини-ап (всего)</div></div>
        <div><div style="font-size:20px;font-weight:600">\${stats.totalQuestions || 0}</div><div style="font-size:11px;color:var(--text3)">Вопросов задано</div></div>
        <div><div style="font-size:20px;font-weight:600">\${stats.paymentsWithDates?.length || 0}</div><div style="font-size:11px;color:var(--text3)">Оплат зафиксировано</div></div>
      </div>
    \`;

    loadChatActivity();
  } catch(e) { console.error('loadAnalytics', e); }
}

async function loadChatActivity() {
  const el = document.getElementById('chat-activity-list');
  try {
    const [data] = await Promise.all([
      fetch('/api/admin/chat-activity', { headers: aHeaders() }).then(r => r.json()),
      crmData.length ? Promise.resolve() : loadCRM()
    ]);
    if (!data.ok || !data.users.length) { el.innerHTML = '<div style="color:var(--text3)">Данных пока нет — добавь бота в чат Ядра или внеси данные вручную.</div>'; return; }
    el.innerHTML = \`<table class="tbl" style="width:100%"><thead><tr>
      <th>Участник</th><th>Сообщений</th><th>Последняя активность</th>
    </tr></thead><tbody>\` + data.users.map(u => {
      const crmEntry = crmData.find(p => String(p.tgId) === String(u.userId));
      return \`
      <tr onclick="openCRMByTgId('\${escapeAdminHtml(String(u.userId))}')" style="cursor:pointer" title="\${crmEntry ? 'Открыть карточку в CRM' : 'Не найден в CRM'}">
        <td>\${escapeAdminHtml(u.name || '—')} \${u.username ? '<span style="color:var(--accent)">@' + escapeAdminHtml(u.username) + '</span>' : ''}</td>
        <td>\${u.messageCount || 0}</td>
        <td style="color:var(--text3);font-size:12px">\${u.lastMessageAt ? new Date(u.lastMessageAt).toLocaleDateString('ru') : '—'}</td>
      </tr>\`;
    }).join('') + '</tbody></table>';
  } catch(e) { el.innerHTML = '<div style="color:var(--text3)">Ошибка загрузки</div>'; }
}

function openCRMByTgId(tgId) {
  const entry = crmData.find(p => String(p.tgId) === String(tgId));
  if (entry) { showPage('participants'); setTimeout(() => openCRMEdit(entry.key), 50); }
  else showAdminToast('Этот пользователь не найден в CRM');
}

function openChatImportModal() {
  document.getElementById('chatImportMsg').textContent = '';
  document.getElementById('chatImportModal').classList.add('open');
}

async function submitChatImport() {
  const chatId = document.getElementById('chatImportChatId').value.trim();
  const raw = document.getElementById('chatImportData').value.trim();
  const msg = document.getElementById('chatImportMsg');
  if (!chatId || !raw) { msg.className = 'msg err'; msg.textContent = 'Укажи Chat ID и данные'; return; }

  const records = raw.split('\\n').map(line => {
    const parts = line.split('|').map(s => s.trim());
    if (!parts[0]) return null;
    return { name: parts[0], date: parts[1] || '', count: parseInt(parts[2]) || 1 };
  }).filter(Boolean);

  if (!records.length) { msg.className = 'msg err'; msg.textContent = 'Не удалось разобрать данные'; return; }

  try {
    const res = await fetch('/api/admin/chat-activity', {
      method: 'POST', headers: aHeaders(),
      body: JSON.stringify({ action: 'import', chatId, records })
    }).then(r => r.json());
    if (res.ok) {
      msg.className = 'msg ok'; msg.textContent = 'Импортировано записей: ' + res.imported;
      loadChatActivity();
      setTimeout(() => document.getElementById('chatImportModal').classList.remove('open'), 900);
    } else { msg.className = 'msg err'; msg.textContent = res.error || 'Ошибка'; }
  } catch(e) { msg.className = 'msg err'; msg.textContent = 'Ошибка подключения'; }
}

function renderAnalyticsDaily(days) {
  const el = document.getElementById('analytics-daily-chart');
  if (!days.length) { el.innerHTML = '<div style="color:var(--text3);font-size:13px">Нет данных</div>'; return; }
  const max = Math.max(1, ...days.map(d => d.total));
  el.innerHTML = days.map(d => {
    const pct = Math.round((d.total / max) * 100);
    return \`
      <div style="display:flex;align-items:center;gap:10px;padding:5px 0">
        <div style="width:76px;font-size:11px;color:var(--text3);flex-shrink:0">\${d.date.slice(5)}</div>
        <div style="flex:1;background:var(--bg3);border-radius:6px;overflow:hidden;height:18px;position:relative">
          <div style="width:\${pct}%;background:var(--brand,#00bd62);height:100%;border-radius:6px"></div>
        </div>
        <div style="width:110px;font-size:11px;color:var(--text2);text-align:right;flex-shrink:0">\${d.total} соб. · \${d.uniqueUsers} польз.</div>
      </div>
    \`;
  }).join('');
}

async function loadAdmins() {
  const data = await fetch('/api/admin/admins', { headers: aHeaders() }).then(r => r.json());
  let rows = '';
  (data.admins || []).forEach(a => {
    rows += \`<tr>
      <td>\${a.name || '—'}</td>
      <td>\${a.email}</td>
      <td style="color:var(--text3);font-size:12px">\${a.tgId || '—'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="removeAdmin('\${a.email}')">Удалить</button></td>
    </tr>\`;
  });
  document.getElementById('adminTable').innerHTML = rows || '<tr><td colspan="4" style="color:var(--text3)">Нет администраторов</td></tr>';
}

async function addAdmin() {
  const name = document.getElementById('newAdminName').value.trim();
  const email = document.getElementById('newAdminEmail').value.trim();
  const tgId = document.getElementById('newAdminTgId').value.trim();
  if (!email) return;
  await fetch('/api/admin/add-admin', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ email, tgId, name }) });
  document.getElementById('newAdminName').value = '';
  document.getElementById('newAdminEmail').value = '';
  document.getElementById('newAdminTgId').value = '';
  loadAdmins();
}

async function removeAdmin(email) {
  if (!confirm('Удалить ' + email + '?')) return;
  await fetch('/api/admin/remove-admin', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ email }) });
  loadAdmins();
}

// ── DASHBOARD ─────────────────────────────────────────────────
const INSIGHT_ICONS = { risk: '🔥', pending: '⏳', info: '🆕' };

function goInsight(target, filter) {
  showPage(target);
  if (target === 'participants' && filter) {
    setTimeout(() => setCrmFilter(filter), 50);
  }
}

async function sendDigestNow() {
  try {
    const res = await fetch('/api/admin/send-digest-now', { method: 'POST', headers: aHeaders() }).then(r => r.json());
    showAdminToast(res.ok ? '📊 Сводка отправлена админу в Telegram' : 'Ошибка отправки');
  } catch(e) { showAdminToast('Ошибка подключения'); }
}

async function loadDashboard() {
  const stats = await fetch('/api/admin/dashboard-stats', { headers: aHeaders() }).then(r => r.json());

  document.getElementById('stat-emails').textContent = stats.totalEmails || 0;
  document.getElementById('stat-pending').textContent = stats.totalPending || 0;
  document.getElementById('stat-questions').textContent = stats.totalQuestions || 0;
  document.getElementById('stat-launches').textContent = stats.totalLaunches || 0;

  // Индекс здоровья
  const h = stats.health || {};
  const score = h.score ?? 0;
  document.getElementById('healthScoreVal').textContent = score;
  const circumference = 264;
  document.getElementById('healthRingArc').setAttribute('stroke-dashoffset', String(circumference - (circumference * Math.max(0, Math.min(100, score)) / 100)));

  document.getElementById('healthRetention').textContent = (h.retentionPct ?? 0) + '%';
  document.getElementById('healthRetentionBar').style.width = (h.retentionPct ?? 0) + '%';

  const engDelta = h.engagementDeltaPct ?? 0;
  document.getElementById('healthEngagement').textContent = (engDelta > 0 ? '+' : '') + engDelta + '%';
  document.getElementById('healthEngagementBar').style.width = Math.max(0, Math.min(100, 50 + engDelta / 2)) + '%';

  document.getElementById('healthGrowth').textContent = '+' + (h.growthCount ?? 0);
  document.getElementById('healthGrowthBar').style.width = Math.max(0, Math.min(100, (h.growthCount ?? 0) * 10)) + '%';

  document.getElementById('healthPayment').textContent = (h.paymentHealthPct ?? 0) + '%';
  document.getElementById('healthPaymentBar').style.width = (h.paymentHealthPct ?? 0) + '%';

  // Требует внимания
  const insightList = document.getElementById('insightList');
  const insights = stats.insights || [];
  insightList.innerHTML = insights.length ? insights.map(ins => \`
    <div class="insight-card" onclick="goInsight('\${ins.target}', \${ins.filter ? \`'\${ins.filter}'\` : 'null'})">
      <div class="ic \${ins.type}">\${INSIGHT_ICONS[ins.type] || 'ℹ️'}</div>
      <div class="body">
        <div class="t">\${escapeAdminHtml(ins.title)}</div>
        <div class="s">\${escapeAdminHtml(ins.sub)}</div>
      </div>
      <div style="color:var(--text3);font-size:16px">→</div>
    </div>\`).join('') : '<div class="insight-empty">Всё спокойно — ничего срочного нет.</div>';

  // Топ-5
  let topHtml = '';
  (stats.topUsers || []).forEach((u, i) => {
    topHtml += \`<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="font-family:'Unbounded',sans-serif;font-size:18px;color:var(--text3);width:24px">\${i+1}</div>
      <div style="flex:1">
        <div style="font-size:13px">\${u.email}</div>
        <div style="font-size:11px;color:var(--text3)">\${u.username ? '@' + u.username : '—'}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px">\${u.launches} заходов</div>
        <div style="font-size:11px;color:var(--text3)">\${u.done} пройдено</div>
      </div>
    </div>\`;
  });
  document.getElementById('topUsers').innerHTML = topHtml || '<p style="color:var(--text3);font-size:13px">Нет данных</p>';
  
  // Даты оплат
  let payHtml = '';
  (stats.paymentsWithDates || []).forEach(p => {
    payHtml += \`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span>\${p.email}</span>
      <span style="color:var(--text3)">\${p.date}</span>
    </div>\`;
  });
  document.getElementById('paymentsList').innerHTML = payHtml || '<p style="color:var(--text3);font-size:13px">Нет оплат</p>';
}

async function syncParticipants() {
  const msg = document.getElementById('syncMsg');
  msg.className = 'msg';
  msg.textContent = 'Синхронизируем...';
  try {
    const res = await fetch('/api/admin/sync-participants', { method: 'POST', headers: aHeaders() }).then(r => r.json());
    msg.className = 'msg ok';
    msg.textContent = 'Готово: привязано ' + res.linked + ', без TG ID: ' + res.missing + (res.updated ? ', обновлено: ' + res.updated : '');
    loadParticipants();
  } catch(e) {
    msg.className = 'msg err';
    msg.textContent = 'Ошибка синхронизации';
  }
}

async function approveFromDash(email) {
  await fetch('/api/admin/add-email', {
    method: 'POST', headers: aHeaders(),
    body: JSON.stringify({ email })
  });
  loadDashboard();
  loadParticipants();
}

// ── PARTICIPANTS ──────────────────────────────────────────────
// ── CRM ───────────────────────────────────────────────────────
const CRM_STATUS_LABELS = { bot: 'Написал боту', lead: 'Лид', paid: 'Оплатил', active: 'Активен', paused: 'Пауза', left: 'Ушёл' };
const CRM_STATUS_ORDER = ['bot', 'lead', 'paid', 'active', 'paused', 'left'];
const CRM_MONTH_PRICE = 5000;
let crmData = [];
let crmDraggedKey = null;
let crmFilter = 'all';

function setCrmFilter(filter) {
  crmFilter = filter;
  document.querySelectorAll('#crmFilterChips .chip').forEach(c => c.classList.toggle('active', c.dataset.filter === filter));
  renderCRMBoard();
}

function crmSumOf(paidMonths) {
  return (paidMonths?.length || 0) * CRM_MONTH_PRICE;
}

function crmCurrentMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// Быстрая отметка/снятие оплаты за текущий месяц прямо с карточки, без открытия модалки.
async function crmToggleThisMonthPaid(event, key) {
  event.stopPropagation();
  const entry = crmData.find(p => p.key === key);
  if (!entry) return;
  const month = crmCurrentMonthKey();
  const months = new Set(entry.paidMonths || []);
  const willBePaid = !months.has(month);
  if (willBePaid) months.add(month); else months.delete(month);
  entry.paidMonths = [...months];
  entry.paidThisMonth = willBePaid;
  renderCRMBoard();
  await fetch('/api/admin/crm', {
    method: 'POST', headers: aHeaders(),
    body: JSON.stringify({ action: 'save', key, fields: { paidMonths: entry.paidMonths } })
  });
  showAdminToast(willBePaid ? 'Отмечено: оплатил ' + month : 'Отметка снята: ' + month);
}

function crmRelativeActivity(ts) {
  if (!ts) return 'нет данных об активности';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 7) return \`\${days} дн. назад\`;
  if (days < 30) return \`\${Math.floor(days / 7)} нед. назад\`;
  return \`\${Math.floor(days / 30)} мес. назад\`;
}

const CRM_AVATAR_COLORS = ['#4338ca', '#0f766e', '#b45309', '#be185d', '#4d7c0f', '#7c3aed', '#0369a1', '#b91c1c'];
function crmAvatarColor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return CRM_AVATAR_COLORS[Math.abs(hash) % CRM_AVATAR_COLORS.length];
}
function crmInitials(label) {
  return (label || '?').trim().slice(0, 1).toUpperCase();
}

function crmIsInactiveStatus(status) { return status === 'paused' || status === 'left'; }

// Общий обработчик смены статуса (используется и выпадающим списком, и drag&drop) —
// переход в/из "Пауза"/"Ушёл" реально отправляет участнику уведомление в Telegram
// (см. crmSuspendAccess/crmRestoreAccess), поэтому спрашиваем подтверждение.
async function crmApplyStatusChange(key, status) {
  const entry = crmData.find(p => p.key === key);
  if (!entry || entry.status === status) return;

  const goingInactive = crmIsInactiveStatus(status) && !crmIsInactiveStatus(entry.status);
  const goingActive = !crmIsInactiveStatus(status) && crmIsInactiveStatus(entry.status);
  if ((goingInactive || goingActive) && entry.email) {
    const who = entry.name || entry.email;
    const msg = goingInactive
      ? \`\${who} придёт уведомление о закрытии доступа (доступ отключится через 3 дня). Продолжить?\`
      : \`\${who} придёт уведомление о восстановлении доступа. Продолжить?\`;
    if (!confirm(msg)) { renderCRMBoard(); return; }
  }

  entry.status = status;
  renderCRMBoard();
  await fetch('/api/admin/crm', {
    method: 'POST', headers: aHeaders(),
    body: JSON.stringify({ action: 'set-status', key, status, email: entry.email })
  });
  showAdminToast('Статус обновлён: ' + CRM_STATUS_LABELS[status]);
}

function updateCrmPauseResumeBtn(entry) {
  const btn = document.getElementById('crmPauseResumeBtn');
  if (!entry?.tgId) { btn.style.display = 'none'; return; }
  if (crmIsInactiveStatus(entry.status)) {
    btn.style.display = 'inline-block';
    btn.className = 'btn btn-w btn-sm';
    btn.textContent = '▶️ Возобновить доступ';
  } else {
    btn.style.display = 'inline-block';
    btn.className = 'btn btn-danger btn-sm';
    btn.textContent = '⏸ Приостановить доступ (уведомим участника)';
  }
}

async function crmModalPauseResume() {
  const key = document.getElementById('crmKey').value;
  const entry = crmData.find(p => p.key === key);
  if (!entry) return;
  const target = crmIsInactiveStatus(entry.status) ? 'active' : 'paused';
  await crmApplyStatusChange(key, target);
  const refreshed = crmData.find(p => p.key === key);
  if (refreshed) {
    document.getElementById('crmStatus').value = refreshed.status;
    updateCrmPauseResumeBtn(refreshed);
  }
}

function crmCopyEmail(event, email) {
  event.stopPropagation();
  if (!email) return;
  navigator.clipboard?.writeText(email).then(() => showAdminToast('Email скопирован')).catch(() => showAdminToast('Не удалось скопировать'));
}

function crmOpenTelegram(event, telegram) {
  event.stopPropagation();
  if (!telegram) return;
  window.open('https://t.me/' + telegram, '_blank');
}

async function loadCRM() {
  try {
    const data = await fetch('/api/admin/crm', { headers: aHeaders() }).then(r => r.json());
    if (!data.ok) return;
    crmData = data.participants || [];
    renderCRMBoard();
  } catch(e) { console.error('loadCRM', e); }
}

function renderCRMBoard() {
  const board = document.getElementById('crm-board');
  if (!board) return;
  const q = (document.getElementById('crmSearch')?.value || '').toLowerCase().trim();
  let filtered = q
    ? crmData.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.telegram || '').toLowerCase().includes(q))
    : crmData;

  if (crmFilter === 'risk') filtered = filtered.filter(p => p.risk);
  else if (crmFilter === 'new') filtered = filtered.filter(p => p.isNew);
  else if (crmFilter === 'unpaid') filtered = filtered.filter(p => (p.status === 'active' || p.status === 'paid') && !p.paidThisMonth);
  else if (crmFilter === 'pending') filtered = filtered.filter(p => p.isPending);

  // Внутри колонки — сначала те, кто требует внимания (ждут одобрения, затем риск/не оплатил),
  // и внутри каждой группы сначала самые давно неактивные, чтобы не листать в поисках, с кем работать.
  function crmSortKey(p) {
    const unpaid = (p.status === 'active' || p.status === 'paid') && !p.paidThisMonth;
    const tier = p.isPending ? 0 : (p.risk || unpaid) ? 1 : 2;
    return [tier, p.lastActiveAt || 0];
  }

  board.innerHTML = CRM_STATUS_ORDER.map(status => {
    const items = filtered.filter(p => p.status === status).sort((a, b) => {
      const ka = crmSortKey(a), kb = crmSortKey(b);
      return ka[0] !== kb[0] ? ka[0] - kb[0] : ka[1] - kb[1];
    });
    const cards = items.map(p => {
      const unpaid = (p.status === 'active' || p.status === 'paid') && !p.paidThisMonth;
      const attnReasons = [];
      if (p.risk) attnReasons.push(\`не активен \${crmRelativeActivity(p.lastActiveAt)}\`);
      if (unpaid) attnReasons.push('не оплатил в этом месяце');
      const label = p.name || p.email || 'Без имени';
      const isPayingStatus = p.status === 'active' || p.status === 'paid';
      return \`
      <div class="crm-card" draggable="true" data-key="\${escapeAdminHtml(p.key)}"
        ondragstart="crmCardDragStart(event,'\${escapeAdminHtml(p.key)}')"
        onclick="openCRMEdit('\${escapeAdminHtml(p.key)}')">
        <div class="crm-card-avatar" style="background:\${crmAvatarColor(p.key)}">\${escapeAdminHtml(crmInitials(label))}\${p.tgId ? \`<img src="/api/admin/avatar?tgId=\${encodeURIComponent(p.tgId)}" loading="lazy" onerror="this.remove()"/>\` : ''}</div>
        <div class="crm-card-body">
          <div class="crm-card-name-row">
            \${attnReasons.length ? \`<span class="crm-card-dot attn" title="\${escapeAdminHtml(attnReasons.join(' · '))}"></span>\` : ''}
            \${p.isPending ? '<span class="crm-card-dot pending" title="Ожидает одобрения"></span>' : ''}
            <span class="crm-card-name">\${escapeAdminHtml(label)}</span>
          </div>
          \${p.telegram ? \`<div class="crm-card-sub">@\${escapeAdminHtml(p.telegram)}</div>\` : ''}
        </div>
        <div class="crm-card-icons">
          \${p.telegram ? \`<button class="crm-card-iconbtn" onclick="crmOpenTelegram(event,'\${escapeAdminHtml(p.telegram)}')" title="Открыть в Telegram">✈️</button>\` : ''}
          \${p.email ? \`<button class="crm-card-iconbtn" onclick="crmCopyEmail(event,'\${escapeAdminHtml(p.email)}')" title="Скопировать email">📋</button>\` : ''}
          \${isPayingStatus ? \`<button class="crm-card-iconbtn" onclick="crmToggleThisMonthPaid(event,'\${escapeAdminHtml(p.key)}')" style="\${p.paidThisMonth ? 'opacity:1' : 'opacity:0.35'}" title="\${p.paidThisMonth ? 'Оплатил в этом месяце — нажми, чтобы снять отметку' : 'Отметить оплату за этот месяц'}">💰</button>\` : ''}
          <span class="crm-card-draghandle" title="Перетащить в другую колонку" onmousedown="event.stopPropagation()">⠿</span>
        </div>
      </div>\`;
    }).join('');
    return \`
      <div class="crm-column" data-status="\${status}"
        ondragover="event.preventDefault()"
        ondrop="crmHandleDrop(event,'\${status}')">
        <div class="crm-column-head" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text3);margin-bottom:10px;display:flex;justify-content:space-between">
          <span>\${CRM_STATUS_LABELS[status]}</span><span>\${items.length}</span>
        </div>
        <div class="crm-column-cards">
          \${cards || '<div style="font-size:12px;color:var(--text3);opacity:0.6">Пусто</div>'}
        </div>
      </div>\`;
  }).join('');
}

function crmCardDragStart(event, key) {
  if (!event.target.classList.contains('crm-card-draghandle')) { event.preventDefault(); return; }
  crmDraggedKey = key;
  event.dataTransfer.effectAllowed = 'move';
}

async function crmHandleDrop(event, status) {
  event.preventDefault();
  const key = crmDraggedKey;
  crmDraggedKey = null;
  if (!key) return;
  await crmApplyStatusChange(key, status);
}

function openCRMEdit(key) {
  const entry = key ? crmData.find(p => p.key === key) : null;
  document.getElementById('crmEditTitle').textContent = entry ? 'Карточка участника' : 'Новый лид';
  document.getElementById('crmKey').value = key || '';
  document.getElementById('crmName').value = entry?.name || '';
  document.getElementById('crmEmail').value = entry?.email || '';
  document.getElementById('crmTelegram').value = entry?.telegram || '';
  document.getElementById('crmNote').value = entry?.note || '';
  document.getElementById('crmStatus').value = entry?.status || 'lead';
  document.getElementById('crmDeleteBtn').style.display = entry ? 'inline-block' : 'none';
  document.getElementById('crmEditMsg').textContent = '';

  document.getElementById('crmQuickTgBtn').style.display = entry?.telegram ? 'inline-block' : 'none';
  document.getElementById('crmQuickEmailBtn').style.display = entry?.email ? 'inline-block' : 'none';

  document.getElementById('crmApproveWrap').style.display = entry?.isPending ? 'block' : 'none';
  updateCrmPauseResumeBtn(entry);

  const activityEl = document.getElementById('crmActivityReadout');
  if (entry?.tgId) {
    activityEl.style.display = 'block';
    const badges = [entry.risk ? '🔥 риск' : '', entry.isNew ? '🆕 новый' : '', entry.paidThisMonth ? 'оплатил в этом месяце' : (entry.status === 'active' || entry.status === 'paid') ? 'не оплатил в этом месяце' : ''].filter(Boolean).join(' · ');
    activityEl.textContent = 'Последняя активность: ' + crmRelativeActivity(entry.lastActiveAt) + (badges ? ' · ' + badges : '');
  } else {
    activityEl.style.display = 'none';
  }

  renderCRMPaidMonths(entry?.paidMonths || []);
  renderCRMPayments(entry?.payments || []);

  const statsBlock = document.getElementById('crmStatsBlock');
  if (entry?.tgId) {
    statsBlock.style.display = 'block';
    document.getElementById('crmStatsContent').innerHTML = '<div style="grid-column:1/-1;color:var(--text3)">Загрузка...</div>';
    fetch('/api/admin/user-stats?userId=' + entry.tgId, { headers: aHeaders() }).then(r => r.json()).then(stats => {
      const daysInCore = entry.enrolledAt ? Math.floor((Date.now() - entry.enrolledAt) / 86400000) : null;
      document.getElementById('crmStatsContent').innerHTML = \`
        <div><b>\${entry.launches ?? 0}</b><br>заходов</div>
        <div><b>\${stats.progress?.ai ?? 0}</b><br>мод. ИИ</div>
        <div><b>\${stats.progress?.funnels ?? 0}</b><br>мод. Воронки</div>
        <div><b>\${stats.tasks?.ai ?? 0}</b><br>зад. ИИ</div>
        <div><b>\${stats.tasks?.funnels ?? 0}</b><br>зад. Воронки</div>
        <div><b>\${stats.questions ?? 0}</b><br>вопросов</div>
        \${daysInCore !== null ? \`<div><b>\${daysInCore}</b><br>дней в ядре</div>\` : ''}
      \`;
    }).catch(() => { document.getElementById('crmStatsContent').innerHTML = '<div style="grid-column:1/-1;color:var(--text3)">Нет данных</div>'; });
  } else {
    statsBlock.style.display = 'none';
  }

  loadCRMWorkshops(entry?.tgId || key);

  document.getElementById('crmEditModal').classList.add('open');
}

function closeCRMEdit() {
  document.getElementById('crmEditModal').classList.remove('open');
}

let crmEditPaidMonths = [];

// Показывает последние 18 месяцев (включая текущий) как переключаемые чипы
function renderCRMPaidMonths(paidMonths) {
  crmEditPaidMonths = [...(paidMonths || [])];
  const el = document.getElementById('crmPaidMonths');
  const now = new Date();
  const months = [];
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }
  const monthNames = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  el.innerHTML = months.map(m => {
    const [y, mo] = m.split('-');
    const label = monthNames[parseInt(mo, 10) - 1] + ' ' + y;
    const active = crmEditPaidMonths.includes(m);
    return \`<button type="button" onclick="crmToggleMonth('\${m}')" data-month="\${m}"
      style="padding:5px 10px;border-radius:16px;font-size:11px;cursor:pointer;border:1px solid \${active ? 'var(--success)' : 'var(--border)'};background:\${active ? 'rgba(0,189,98,0.15)' : 'var(--bg3)'};color:\${active ? 'var(--success)' : 'var(--text2)'}">\${label}</button>\`;
  }).join('');
  updateCRMPaidSum();
}

function crmToggleMonth(month) {
  const idx = crmEditPaidMonths.indexOf(month);
  if (idx >= 0) crmEditPaidMonths.splice(idx, 1);
  else crmEditPaidMonths.push(month);
  renderCRMPaidMonths(crmEditPaidMonths);
}

function updateCRMPaidSum() {
  document.getElementById('crmPaidSum').textContent = crmSumOf(crmEditPaidMonths).toLocaleString('ru') + ' ₽';
}

// Точный журнал оплат (сумма + дата) — дополняет помесячные чипы выше для случаев,
// когда сумма отличается от стандартной или важна точная дата платежа.
let crmEditPayments = [];

function renderCRMPayments(payments) {
  crmEditPayments = [...(payments || [])];
  const el = document.getElementById('crmPaymentsList');
  el.innerHTML = crmEditPayments.length
    ? crmEditPayments.map((p, i) => \`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px">
        <div><b>\${Number(p.amount || 0).toLocaleString('ru')} ₽</b> <span style="color:var(--text3)">· \${escapeAdminHtml(p.date || '')}</span></div>
        <button class="btn btn-ghost btn-sm" onclick="deleteCRMPaymentRecord(\${i})">✕</button>
      </div>\`).join('')
    : '<div style="color:var(--text3);font-size:12px">Оплат не внесено</div>';
  const total = crmEditPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  document.getElementById('crmPaymentsSum').textContent = total.toLocaleString('ru') + ' ₽';
}

function addCRMPaymentRecord() {
  const amount = parseFloat(document.getElementById('crmPaymentAmount').value);
  const date = document.getElementById('crmPaymentDate').value;
  if (!amount || amount <= 0 || !date) { alert('Укажи сумму и дату оплаты'); return; }
  crmEditPayments.push({ amount, date });
  crmEditPayments.sort((a, b) => (a.date < b.date ? 1 : -1));
  document.getElementById('crmPaymentAmount').value = '';
  document.getElementById('crmPaymentDate').value = '';
  renderCRMPayments(crmEditPayments);
}

function deleteCRMPaymentRecord(idx) {
  crmEditPayments.splice(idx, 1);
  renderCRMPayments(crmEditPayments);
}

async function approveCRMEntry() {
  const email = document.getElementById('crmEmail').value.trim();
  if (!email) { alert('Нет email для одобрения'); return; }
  if (!confirm('Одобрить доступ для ' + email + '?')) return;
  await approveEmail(email);
  closeCRMEdit();
  loadCRM();
}

async function saveCRMEdit() {
  const key = document.getElementById('crmKey').value;
  const email = document.getElementById('crmEmail').value.trim();
  const fields = {
    name: document.getElementById('crmName').value.trim(),
    email: email || null,
    telegram: document.getElementById('crmTelegram').value.trim().replace(/^@/, ''),
    note: document.getElementById('crmNote').value.trim(),
    paidMonths: crmEditPaidMonths,
    payments: crmEditPayments,
    status: document.getElementById('crmStatus').value
  };
  const msg = document.getElementById('crmEditMsg');

  try {
    if (!key) {
      // Новый лид
      const res = await fetch('/api/admin/crm', {
        method: 'POST', headers: aHeaders(),
        body: JSON.stringify({ action: 'add-lead', ...fields })
      }).then(r => r.json());
      if (!res.ok) { msg.className = 'msg err'; msg.textContent = res.error || 'Ошибка'; return; }
      if (fields.status !== 'lead') {
        await fetch('/api/admin/crm', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ action: 'set-status', key: res.key, status: fields.status, email: fields.email }) });
      }
    } else {
      const entry = crmData.find(p => p.key === key);
      await fetch('/api/admin/crm', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ action: 'save', key, fields }) });
      if (entry && entry.status !== fields.status) {
        await fetch('/api/admin/crm', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ action: 'set-status', key, status: fields.status, email: fields.email }) });
      }
    }
    msg.className = 'msg ok'; msg.textContent = 'Сохранено';
    closeCRMEdit();
    loadCRM();
  } catch(e) { msg.className = 'msg err'; msg.textContent = 'Ошибка подключения'; }
}

async function deleteCRMEntry() {
  const key = document.getElementById('crmKey').value;
  if (!key) return;
  if (!confirm('Удалить карточку из CRM? Доступ пользователя (если есть) затронут не будет.')) return;
  await fetch('/api/admin/crm', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ action: 'delete', key }) });
  closeCRMEdit();
  loadCRM();
}

// ── Посещения воркшопов (ручной учёт, можно задним числом) ──────
async function loadCRMWorkshops(userId) {
  const el = document.getElementById('crmWorkshopList');
  if (!userId) { el.innerHTML = '<div style="color:var(--text3);font-size:12px">Доступно после привязки Telegram ID</div>'; return; }
  try {
    const data = await fetch('/api/admin/workshop-attendance?userId=' + userId, { headers: aHeaders() }).then(r => r.json());
    const records = data.records || [];
    el.innerHTML = records.length
      ? records.map(r => \`
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
          <div><b>\${escapeAdminHtml(r.title)}</b> <span style="color:var(--text3)">· \${escapeAdminHtml(r.date)}</span>\${r.note ? \` — \${escapeAdminHtml(r.note)}\` : ''}</div>
          <button class="btn btn-ghost btn-sm" onclick="deleteCRMWorkshop('\${userId}','\${r.id}')">✕</button>
        </div>\`).join('')
      : '<div style="color:var(--text3);font-size:12px">Посещений не отмечено</div>';
  } catch(e) { el.innerHTML = '<div style="color:var(--text3);font-size:12px">Ошибка загрузки</div>'; }
}

async function addCRMWorkshop() {
  const key = document.getElementById('crmKey').value;
  const entry = crmData.find(p => p.key === key);
  const userId = entry?.tgId;
  if (!userId) { alert('Сначала привяжи участника к Telegram (должен быть tgId)'); return; }
  const title = document.getElementById('crmWorkshopTitle').value.trim();
  const date = document.getElementById('crmWorkshopDate').value;
  if (!title || !date) { alert('Укажи название и дату (можно задним числом)'); return; }
  await fetch('/api/admin/workshop-attendance', {
    method: 'POST', headers: aHeaders(),
    body: JSON.stringify({ userId, title, date })
  });
  document.getElementById('crmWorkshopTitle').value = '';
  document.getElementById('crmWorkshopDate').value = '';
  loadCRMWorkshops(userId);
}

async function deleteCRMWorkshop(userId, id) {
  await fetch('/api/admin/workshop-attendance', {
    method: 'POST', headers: aHeaders(),
    body: JSON.stringify({ userId, deleteId: id })
  });
  loadCRMWorkshops(userId);
}

async function loadParticipants() {
  try {
    loadCRM();
    const data = await fetch('/api/admin/participants', { headers: aHeaders() }).then(r => r.json());
    window.stoppedUsers = data.stopped || [];
  } catch(e) { console.error(e); }
}

async function addEmail() {
  const email = document.getElementById('newEmail').value.trim().toLowerCase();
  const msg = document.getElementById('addEmailMsg');
  if (!email || !email.includes('@')) { msg.className='msg err'; msg.textContent='Введи корректный email'; return; }
  try {
    await fetch('/api/admin/add-email', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ email }) });
    msg.className = 'msg ok'; msg.textContent = 'Добавлен: ' + email;
    document.getElementById('newEmail').value = '';
    loadParticipants(); loadDashboard();
  } catch(e) { msg.className = 'msg err'; msg.textContent = 'Ошибка'; }
}

async function removeEmail(email) {
  if (!confirm('Удалить ' + email + '?')) return;
  await fetch('/api/admin/remove-email', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ email }) });
  loadParticipants(); loadDashboard();
}

async function stopUser(email, safeId) {
  if (!confirm('Остановить доступ для ' + email + '? Пользователю придёт уведомление об отключении.')) return;
  const res = await fetch('/api/admin/stop-user', {
    method: 'POST', headers: aHeaders(), body: JSON.stringify({ email })
  }).then(r => r.json());
  if (res.ok) {
    const restoreBtn = document.getElementById('restore-btn-' + safeId);
    if (restoreBtn) {
      restoreBtn.style.display = 'inline-block';
      restoreBtn.previousElementSibling.style.display = 'none';
    }
    alert('✅ Доступ остановлен. Уведомление отправлено.');
  } else {
    alert('Ошибка: не удалось остановить доступ');
  }
}

async function restoreUser(email, safeId) {
  if (!confirm('Восстановить доступ для ' + email + '? Пользователю придёт уведомление.')) return;
  const res = await fetch('/api/admin/restore-user', {
    method: 'POST', headers: aHeaders(), body: JSON.stringify({ email })
  }).then(r => r.json());
  if (res.ok) {
    const restoreBtn = document.getElementById('restore-btn-' + safeId);
    if (restoreBtn) {
      restoreBtn.style.display = 'none';
      restoreBtn.previousElementSibling.style.display = 'inline-block';
    }
    alert('✅ Доступ восстановлен. Пользователь уведомлён.');
  } else {
    alert('Ошибка: не удалось восстановить доступ');
  }
}

async function approveEmail(email) {
  await fetch('/api/admin/add-email', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ email }) });
  loadParticipants(); loadDashboard();
}

// ── NOTIFY ────────────────────────────────────────────────────
function updatePreview() {
  const text = document.getElementById('notifyText').value;
  document.getElementById('notifyPreview').textContent = '📢 Уведомление от CMO' + (text || '...');
}

async function sendNotify() {
  const text = document.getElementById('notifyText').value.trim();
  const msg = document.getElementById('notifyMsg');

  if (!text) { 
    msg.className = 'msg err'; 
    msg.textContent = 'Введи текст'; 
    return; 
  }

  if (!confirm('Отправить уведомление?')) return;

  let body;
  if (notifyMode === 'all') body = { text, program: '' };
  else if (notifyMode === 'segment') {
    if (!crmData.length) await loadCRM();
    body = { text, userIds: crmSegmentTgIds(notifySegment) };
  } else body = { text, userIds: [...selectedNotifyUsers] };

  try {
    const res = await fetch('/api/admin/notify', {
      method: 'POST', 
      headers: aHeaders(),
      body: JSON.stringify(body)
    }).then(r => r.json());

    msg.className = 'msg ok';
    msg.textContent = 'Отправлено: ' + res.sent + ' участникам';
    document.getElementById('notifyText').value = '';
    selectedNotifyUsers.clear();
    updatePreview();
  } catch(e) { 
    msg.className = 'msg err'; 
    msg.textContent = 'Ошибка отправки'; 
  }
}

// ── PROGRAMS ─────────────────────────────────────────────────
function selectProgAdmin(prog) {
  localStorage.setItem('adminProg', prog);
  adminProgram = prog;
  document.getElementById('pb-ai').className = prog === 'ai' ? 'btn btn-w' : 'btn btn-ghost';
  document.getElementById('pb-funnels').className = prog === 'funnels' ? 'btn btn-w' : 'btn btn-ghost';
  loadProgramAdmin(prog);
}

async function loadProgramAdmin(prog) {
  try {
    // Загружаем программу (модули)
    const data = await fetch('/api/admin/program?id=' + prog, { headers: aHeaders() }).then(r => r.json());
    adminProgramData[prog] = data;
    
    // ⭐ ЗАГРУЖАЕМ ЗАДАНИЯ ПЕРЕД РЕНДЕРОМ ⭐
    const tasksData = await fetch('/api/admin/tasks?id=' + prog, { headers: aHeaders() }).then(r => r.json());
    window._currentTasks = tasksData.tasks || [];
    
    // Рендерим модули с заданиями
    renderModuleList(data.modules || []);
  } catch(e) {
    console.error('loadProgramAdmin error', e);
  }
}

function renderModuleList(modules) {
  const tasks = window._currentTasks || [];
  let html = '';
  modules.forEach((mod, i) => {
    const lockLabel = mod.available ? '<span style="color:var(--success);font-size:11px">● Доступен</span>' : '<span style="color:var(--text3);font-size:11px">● Заблокирован</span>';
    const modTasks = tasks.filter(t => t.moduleId === mod.id);

    const dateLabel = mod.date ? \`<div style="font-size:10px;color:var(--text3);margin-bottom:2px">\${mod.date}</div>\` : '';
    const tagsLabel = (mod.tags && mod.tags.length) ? \` · \${mod.tags.join(', ')}\` : '';

    html += \`<div class="module-item">
      <div class="module-item-top">
        <div>
          \${dateLabel}
          <div class="module-item-title">\${mod.title}</div>
          <div style="margin-top:4px">\${lockLabel} \${modTasks.length ? \`<span style="color:var(--text3);font-size:11px"> · \${modTasks.length} \${modTasks.length === 1 ? 'задание' : 'заданий'}</span>\` : ''}<span style="color:var(--text3);font-size:11px">\${tagsLabel}</span></div>
        </div>
        <div class="module-item-actions">
          <button class="btn btn-ghost btn-sm" onclick="editModule('\${mod.id}')">Изменить</button>
        </div>
      </div>
    </div>\`;
  });
  document.getElementById('moduleList').innerHTML = html || '<p style="color:var(--text3);font-size:13px">Нет модулей</p>';
}

function editModule(modId) {
  const prog = adminProgramData[adminProgram];
  if (!prog) return;
  const mod = prog.modules.find(m => m.id === modId);
  if (!mod) return;

  document.getElementById('modalTitle').textContent = 'Редактировать модуль';
  document.getElementById('mId').value = mod.id;
  document.getElementById('mTitle').value = mod.title;
  document.getElementById('mDesc').value = mod.description || '';
  document.getElementById('mDate').value = mod.date || '';
  document.getElementById('mEmbed').value = mod.embedUrl || '';
  document.getElementById('mAvailable').checked = mod.available || false;
  renderModuleTagChips(mod.tags || []);

  const tcRows = document.getElementById('mTimecodesRows');
  tcRows.innerHTML = '';
  (mod.timecodes || []).forEach(t => addTimecodeRow(t.time, t.label));

  const fRows = document.getElementById('mFilesRows');
  fRows.innerHTML = '';
  (mod.files || []).forEach(f => addFileRow(f.name, f.url));

  window._moduleDeletedTaskIds = [];
  const tRows = document.getElementById('mTasksRows');
  tRows.innerHTML = '';
  const modTasks = (window._currentTasks || []).filter(t => t.moduleId === mod.id);
  modTasks.forEach(t => addModuleTaskRow(t.id, t.title, t.description));

  document.getElementById('mDeleteBtn').style.display = 'inline-block';
  document.getElementById('moduleMsg').textContent = '';
  document.getElementById('moduleModal').classList.add('open');
}

let adminTagsList = [];

async function loadTagsPool() {
  try {
    const res = await fetch('/api/admin/tags', { headers: aHeaders() }).then(r => r.json());
    adminTagsList = res.tags || [];
    renderTagsPoolChips();
  } catch(e) {}
}

function renderTagsPoolChips() {
  const el = document.getElementById('tagsPoolChips');
  if (!el) return;
  el.innerHTML = adminTagsList.length
    ? adminTagsList.map(t => \`<span class="chip active" style="display:inline-flex;align-items:center;gap:8px">\${escapeAdminHtml(t)}<span class="tag-pool-del" data-tag="\${escapeAdminHtml(t)}" style="cursor:pointer;opacity:0.7">✕</span></span>\`).join('')
    : '<span style="color:var(--text3);font-size:12px">Тегов пока нет — добавь первый ниже</span>';
}

document.addEventListener('click', function(e) {
  const delBtn = e.target.closest('.tag-pool-del');
  if (delBtn) { deleteTagFromPool(delBtn.dataset.tag); return; }
  const mtagChip = e.target.closest('.mtag-chip');
  if (mtagChip) { toggleModuleTag(mtagChip.dataset.tag, mtagChip); }
});

async function addTagToPool() {
  const input = document.getElementById('newTagInput');
  const name = input.value.trim();
  if (!name) return;
  try {
    const res = await fetch('/api/admin/add-tag', {
      method: 'POST', headers: aHeaders(),
      body: JSON.stringify({ name })
    }).then(r => r.json());
    if (res.ok) {
      adminTagsList = res.tags;
      renderTagsPoolChips();
      input.value = '';
    }
  } catch(e) {}
}

async function deleteTagFromPool(name) {
  try {
    const res = await fetch('/api/admin/delete-tag', {
      method: 'POST', headers: aHeaders(),
      body: JSON.stringify({ name })
    }).then(r => r.json());
    if (res.ok) {
      adminTagsList = res.tags;
      renderTagsPoolChips();
    }
  } catch(e) {}
}

function renderModuleTagChips(selected) {
  window._moduleSelectedTags = new Set(selected || []);
  const el = document.getElementById('mTagsChips');
  if (!el) return;
  if (!adminTagsList.length) {
    el.innerHTML = '<span style="color:var(--text3);font-size:12px">Сначала добавь теги в разделе «Теги модулей» выше</span>';
    return;
  }
  el.innerHTML = adminTagsList.map(t =>
    \`<span class="chip mtag-chip\${window._moduleSelectedTags.has(t) ? ' active' : ''}" data-tag="\${escapeAdminHtml(t)}">\${escapeAdminHtml(t)}</span>\`
  ).join('');
}

function toggleModuleTag(tag, el) {
  const set = window._moduleSelectedTags || new Set();
  if (set.has(tag)) { set.delete(tag); el.classList.remove('active'); }
  else { set.add(tag); el.classList.add('active'); }
  window._moduleSelectedTags = set;
}

async function addModule() {
  try {
    const res = await fetch('/api/admin/add-module', {
      method: 'POST', headers: aHeaders(),
      body: JSON.stringify({ programId: adminProgram })
    }).then(r => r.json());
    if (res.ok) {
      adminProgramData[adminProgram] = res.program;
      renderModuleList(res.program.modules || []);
      loadModuleOrder();
      // Edit the last added module
      const last = res.program.modules[res.program.modules.length - 1];
      if (last) editModule(last.id);
    }
  } catch(e) {}
}

async function saveModule() {
  const modId = document.getElementById('mId').value;
  const title = document.getElementById('mTitle').value.trim();
  const desc = document.getElementById('mDesc').value.trim();
  const date = document.getElementById('mDate').value;
  const embed = document.getElementById('mEmbed').value.trim();
  const available = document.getElementById('mAvailable').checked;
  const tags = Array.from(window._moduleSelectedTags || []);
  const msg = document.getElementById('moduleMsg');

  if (!title) { msg.className='msg err'; msg.textContent='Введи название'; return; }

  const files = Array.from(document.querySelectorAll('#mFilesRows > div')).map(row => ({
    name: row.querySelector('.mf-name').value.trim(),
    url: row.querySelector('.mf-url').value.trim()
  })).filter(f => f.name && f.url);

  const timecodes = Array.from(document.querySelectorAll('#mTimecodesRows > div')).map(row => ({
    time: row.querySelector('.tc-time').value.trim(),
    label: row.querySelector('.tc-label').value.trim()
  })).filter(t => t.time && t.label);

  const module = { id: modId, title, description: desc, date, embedUrl: embed, files, timecodes, available, tags };

  try {
    await fetch('/api/admin/module', {
      method: 'POST', headers: aHeaders(),
      body: JSON.stringify({ programId: adminProgram, module })
    });

    // Синхронизировать задания модуля прямо из того же окна редактирования
    const taskRows = Array.from(document.querySelectorAll('#mTasksRows > .module-task-row'));
    for (const row of taskRows) {
      const tTitle = row.querySelector('.mt-title').value.trim();
      if (!tTitle) continue;
      const task = {
        id: row.dataset.taskId || ('task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
        title: tTitle,
        description: row.querySelector('.mt-desc').value.trim(),
        moduleId: modId
      };
      await fetch('/api/admin/save-task', {
        method: 'POST', headers: aHeaders(),
        body: JSON.stringify({ programId: adminProgram, task })
      });
    }
    for (const taskId of (window._moduleDeletedTaskIds || [])) {
      await fetch('/api/admin/delete-task', {
        method: 'POST', headers: aHeaders(),
        body: JSON.stringify({ programId: adminProgram, taskId })
      });
    }
    window._moduleDeletedTaskIds = [];

    msg.className = 'msg ok'; msg.textContent = 'Сохранено!';
    loadProgramAdmin(adminProgram);
    setTimeout(() => closeModal(), 800);
  } catch(e) { msg.className = 'msg err'; msg.textContent = 'Ошибка'; }
}

async function deleteModuleFromModal() {
  const modId = document.getElementById('mId').value;
  if (!modId) return;
  if (!confirm('Удалить модуль? Задания модуля останутся, но потеряют привязку к нему.')) return;
  try {
    const res = await fetch('/api/admin/delete-module', {
      method: 'POST', headers: aHeaders(),
      body: JSON.stringify({ programId: adminProgram, moduleId: modId })
    }).then(r => r.json());
    if (res.ok) {
      adminProgramData[adminProgram] = res.program;
      showAdminToast('Модуль удалён');
      closeModal();
      loadProgramAdmin(adminProgram);
      loadModuleOrder();
    } else alert('Ошибка удаления');
  } catch(e) { alert('Ошибка подключения'); }
}

let adminModuleOrderItems = [];

async function loadModuleOrder() {
  try {
    const res = await fetch('/api/admin/module-order', { headers: aHeaders() }).then(r => r.json());
    adminModuleOrderItems = res.items || [];
    renderModuleOrderList();
  } catch(e) {}
}

function renderModuleOrderList() {
  const el = document.getElementById('moduleOrderList');
  if (!el) return;
  el.innerHTML = adminModuleOrderItems.map((m, i) => \`
    <div class="module-item" style="display:flex;align-items:center;justify-content:space-between;gap:10px">
      <div>
        <div style="font-size:10px;color:var(--text3);margin-bottom:2px">\${m.programId === 'ai' ? '🤖 ИИ-контент' : '🔻 Воронки'}</div>
        <div class="module-item-title">\${escapeAdminHtml(m.title)}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn btn-ghost btn-sm" data-order-move="up" data-order-idx="\${i}" \${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="btn btn-ghost btn-sm" data-order-move="down" data-order-idx="\${i}" \${i === adminModuleOrderItems.length - 1 ? 'disabled' : ''}>↓</button>
      </div>
    </div>
  \`).join('') || '<p style="color:var(--text3);font-size:13px">Нет модулей</p>';
}

document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-order-move]');
  if (!btn) return;
  const idx = Number(btn.dataset.orderIdx);
  const dir = btn.dataset.orderMove;
  const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= adminModuleOrderItems.length) return;
  const tmp = adminModuleOrderItems[idx];
  adminModuleOrderItems[idx] = adminModuleOrderItems[swapIdx];
  adminModuleOrderItems[swapIdx] = tmp;
  renderModuleOrderList();
  saveModuleOrder();
});

async function saveModuleOrder() {
  const order = adminModuleOrderItems.map(m => \`\${m.programId}:\${m.id}\`);
  try {
    await fetch('/api/admin/save-module-order', {
      method: 'POST', headers: aHeaders(),
      body: JSON.stringify({ order })
    });
  } catch(e) {}
}

function closeModal() {
  document.getElementById('moduleModal').classList.remove('open');
}

// ── QUESTIONS ─────────────────────────────────────────────────
async function loadQuestions() {
  try {
    const data = await fetch('/api/admin/questions', { headers: aHeaders() }).then(r => r.json());
    const qs = data.questions || [];
    let html = '';
    if (!qs.length) {
      html = '<p style="color:var(--text3);font-size:13px">Вопросов нет</p>';
    } else {
      qs.forEach(q => {
        const d = new Date(q.date).toLocaleString('ru');
        html += \`<div class="q-item">
          <div class="q-meta">\${q.name} · \${q.program} · \${d}</div>
          <div class="q-text">\${q.text}</div>
          <div class="q-bottom">
            <button class="btn btn-ghost btn-sm" onclick="clearQuestion(\${q.id})">Удалить</button>
          </div>
        </div>\`;
      });
    }
    document.getElementById('questionsList').innerHTML = html;
  } catch(e) {}
}

async function clearQuestion(id) {
  await fetch('/api/admin/clear-question', {
    method: 'POST', headers: aHeaders(),
    body: JSON.stringify({ id })
  });
  loadQuestions(); loadDashboard();
}

// Close modal on overlay click
document.getElementById('moduleModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

async function loadEvents() {
  const data = await fetch('/api/admin/events', { headers: aHeaders() }).then(r => r.json());
  const events = (data.events || []).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  
  window._currentEvents = events; // все события, не только активные

  if (!events.length) {
    document.getElementById('eventsList').innerHTML = '<p style="color:var(--text3);font-size:13px;padding:8px 0">Мероприятий нет</p>';
    return;
  }

  const now = Date.now();
  let html = '';
  events.forEach(e => {
    const dt = new Date(e.datetime);
    const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
    const formatted = days[dt.getDay()] + ', ' + dt.toLocaleDateString('ru', {day:'numeric', month:'long'}) + ' · ' + dt.toLocaleTimeString('ru', {hour:'2-digit', minute:'2-digit'});
    
    // Визуально отмечаем прошедшие, но не скрываем
    const endTime = new Date(e.datetime).getTime() + (e.duration || 90) * 60 * 1000;
    const isPast = endTime < now;

    html += '<div class="card" style="display:flex;align-items:center;gap:16px' + (isPast ? ';opacity:0.45' : '') + '">' +
      (e.photo ? '<img src="' + e.photo + '" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid var(--border)"/>' : '<div style="width:56px;height:56px;border-radius:50%;background:var(--bg3);flex-shrink:0"></div>') +
      '<div style="flex:1">' +
      '<div style="font-weight:500;font-size:14px">' + e.title + (isPast ? ' <span style="font-size:11px;color:var(--text3)">(прошло)</span>' : '') + '</div>' +
      (e.author ? '<div style="font-size:12px;color:var(--text3);margin-top:2px">' + e.author + '</div>' : '') +
      '<div style="font-size:12px;color:var(--text2);margin-top:4px">' + formatted + '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:2px">' + (e.actionUrl || '') + '</div>' +
      '</div>' +
      '<button class="btn btn-ghost btn-sm" onclick="editEvent(' + e.id + ')">Изменить</button>' +
      '<button class="btn btn-danger btn-sm" onclick="deleteEvent(' + e.id + ')">Удалить</button>' +
      '</div>';
  });

  document.getElementById('eventsList').innerHTML = html;
}

async function saveEvent() {
  const msg = document.getElementById('evMsg');
  const event = {
    id: editingEventId || Date.now(),
    title: document.getElementById('evTitle').value.trim(),
    author: document.getElementById('evAuthor').value.trim(),
    datetime: document.getElementById('evDatetime').value,
    photo: document.getElementById('evPhoto').value.trim(),
    actionType: document.getElementById('evActionType').value,
    actionUrl: document.getElementById('evZoom').value.trim(),
    tags: document.getElementById('evTags').value.split(',').map(t => t.trim()).filter(Boolean),
    authorUrl: document.getElementById('evAuthorUrl').value.trim(),
  };

  if (!event.title || !event.datetime || !event.actionUrl) {
    msg.className = 'msg err';
    msg.textContent = 'Заполни название, дату и ссылку';
    return;
  }

  await fetch('/api/admin/save-event', {
    method: 'POST', headers: aHeaders(),
    body: JSON.stringify({ event })
  });

  editingEventId = null;
  document.getElementById('evSaveBtn').textContent = 'Добавить';
  msg.className = 'msg ok';
  msg.textContent = 'Сохранено!';
  // очистить поля...
  ['evTitle','evAuthor','evDatetime','evPhoto','evZoom','evTags','evAuthorUrl'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) el.value = '';
});
var weeklyEl = document.getElementById('evWeekly');
if (weeklyEl) weeklyEl.checked = false;
document.getElementById('evActionType').value = 'zoom';
  document.getElementById('evWeekly').checked = false;
  document.getElementById('evActionType').value = 'zoom';
  loadEvents();
  setTimeout(() => msg.textContent = '', 3000);
}

// Функция для заполнения формы при редактировании
function editEvent(id) {
  // нужно хранить события в памяти
  const ev = window._currentEvents?.find(e => e.id === id);
  if (!ev) return;
  editingEventId = id;
  document.getElementById('evCardTitle').textContent = 'Редактировать мероприятие';
  document.getElementById('evTitle').value = ev.title || '';
  document.getElementById('evAuthor').value = ev.author || '';
  document.getElementById('evDatetime').value = ev.datetime || '';
  document.getElementById('evAuthorUrl').value = ev.authorUrl || '';
  document.getElementById('evPhoto').value = ev.photo || '';
  document.getElementById('evZoom').value = ev.actionUrl || '';
  document.getElementById('evActionType').value = ev.actionType || 'zoom';
  document.getElementById('evTags').value = (ev.tags || []).join(', ');
  document.getElementById('page-events').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('evSaveBtn').textContent = 'Сохранить изменения';
}

async function deleteEvent(id) {
  if (!confirm('Удалить мероприятие?')) return;
  await fetch('/api/admin/delete-event', {
    method: 'POST', headers: aHeaders(),
    body: JSON.stringify({ id })
  });
  loadEvents();
}

let coffeeAdminData = null;
let coffeeParticipantsAll = [];
 
async function loadCoffeeAdmin() {
  try {
    const data = await fetch('/api/admin/coffee', { headers: aHeaders() }).then(r => r.json());
    if (!data.ok) return;
    coffeeAdminData = data;
    coffeeParticipantsAll = data.participants || [];
 
    // Статистика
    const active = coffeeParticipantsAll.filter(p => p.active).length;
    const complaints = (data.complaints || []).filter(c => !c.resolved).length;
    const pairs = data.round?.pairs?.length || 0;
 
    document.getElementById('coffee-stat-total').textContent = coffeeParticipantsAll.length;
    document.getElementById('coffee-stat-active').textContent = active;
    document.getElementById('coffee-stat-complaints').textContent = complaints;
    document.getElementById('coffee-stat-week').textContent = pairs;
    document.getElementById('coffee-week-id').textContent = data.weekId || '—';
 
    // Пары
    renderCoffeePairsTable(data.round, coffeeParticipantsAll);
 
    // Жалобы
    renderCoffeeComplaints(data.complaints || [], coffeeParticipantsAll);
 
    // Участники
    renderCoffeeParticipantsTable(coffeeParticipantsAll);

    // История
    loadCoffeeHistory();

  } catch(e) { console.error('loadCoffeeAdmin', e); }
}

async function generateCoffeePairsAuto() {
  if (!confirm('Сформировать пары автоматически на текущую неделю? Система постарается не повторять партнёров с прошлых недель. Уже отправленные пары изменить нельзя.')) return;
  try {
    const res = await fetch('/api/admin/coffee/generate', {
      method: 'POST', headers: aHeaders(), body: JSON.stringify({})
    }).then(r => r.json());
    if (res.ok) {
      const unmatchedCount = res.round?.unmatched?.length || 0;
      showAdminToast('Пары сформированы' + (unmatchedCount ? \` (без пары остался: \${unmatchedCount})\` : ''));
      loadCoffeeAdmin();
    } else alert(res.error || 'Ошибка');
  } catch(e) { alert('Ошибка подключения'); }
}

async function sendCoffeePairsNow() {
  if (!confirm('Разослать пары этой недели участникам в Telegram прямо сейчас? Это действие нельзя отменить.')) return;
  try {
    const res = await fetch('/api/admin/coffee/send-now', {
      method: 'POST', headers: aHeaders(), body: JSON.stringify({})
    }).then(r => r.json());
    if (res.ok) {
      showAdminToast(\`Разослано пар: \${res.pairs}\`);
      loadCoffeeAdmin();
    } else alert(res.error || 'Ошибка');
  } catch(e) { alert('Ошибка подключения'); }
}

async function loadCoffeeHistory() {
  const el = document.getElementById('coffee-history-list');
  if (!el) return;
  try {
    const data = await fetch('/api/admin/coffee/history', { headers: aHeaders() }).then(r => r.json());
    if (!data.ok) { el.innerHTML = '<div style="color:var(--text3);font-size:13px">Не удалось загрузить историю</div>'; return; }
    renderCoffeeHistory(data.weeks || []);
  } catch(e) { el.innerHTML = '<div style="color:var(--text3);font-size:13px">Ошибка загрузки</div>'; }
}

function renderCoffeeHistory(weeks) {
  const el = document.getElementById('coffee-history-list');
  if (!weeks.length) { el.innerHTML = '<div style="color:var(--text3);font-size:13px">История пуста</div>'; return; }
  el.innerHTML = weeks.map((w, wi) => {
    const rows = w.pairs.map(p => {
      const ra = p.ratingA ? \`★\${p.ratingA.stars}\${p.ratingA.complaint ? ' 🚩' : ''}\` : '—';
      const rb = p.ratingB ? \`★\${p.ratingB.stars}\${p.ratingB.complaint ? ' 🚩' : ''}\` : '—';
      return \`<tr>
        <td style="font-size:12px">\${escapeAdminHtml(p.nameA)}</td>
        <td style="color:var(--text3);font-size:11px">\${ra}</td>
        <td style="color:var(--text3);text-align:center">↔</td>
        <td style="font-size:12px">\${escapeAdminHtml(p.nameB)}</td>
        <td style="color:var(--text3);font-size:11px">\${rb}</td>
      </tr>\`;
    }).join('');
    return \`
      <div style="border:1px solid var(--border);border-radius:10px;margin-bottom:10px;overflow:hidden">
        <div onclick="toggleCoffeeHistoryWeek(\${wi})" style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;background:var(--bg2)">
          <div style="font-size:13px;font-weight:500">\${escapeAdminHtml(w.weekId)} \${w.auto ? '<span style="color:var(--text3);font-size:11px">· авто</span>' : ''}</div>
          <div style="font-size:11px;color:var(--text3)">\${w.pairs.length} пар \${w.sentAt ? '· отправлено' : '· не отправлено'}</div>
        </div>
        <div id="coffee-history-week-\${wi}" style="display:none;padding:8px 14px 14px">
          <table style="width:100%;border-collapse:collapse">\${rows}</table>
        </div>
      </div>
    \`;
  }).join('');
}

function toggleCoffeeHistoryWeek(i) {
  const row = document.getElementById('coffee-history-week-' + i);
  if (!row) return;
  row.style.display = row.style.display === 'none' ? '' : 'none';
}

function getParticipantName(tgId, participants) {
  const p = participants.find(x => String(x.tgId) === String(tgId));
  return p ? (p.name || p.tgId) : tgId;
}
 
function renderCoffeePairsTable(round, participants) {
  const el = document.getElementById('coffee-pairs-table');
  if (!round || !round.pairs || round.pairs.length === 0) {
    el.innerHTML = '<div style="color:var(--text3);font-size:13px">Пары ещё не назначены на эту неделю</div>';
    return;
  }
  const rows = round.pairs.map((pair, i) => \`
    <tr>
      <td style="color:var(--text3);font-size:12px">\${i+1}</td>
      <td>\${escapeAdminHtml(getParticipantName(pair.a, participants))}</td>
      <td style="color:var(--text3)">↔</td>
      <td>\${escapeAdminHtml(getParticipantName(pair.b, participants))}</td>
      <td>
        <button onclick="openReassignModal('\${pair.a}','\${pair.b}')" class="btn btn-ghost" style="font-size:11px;padding:4px 10px">Переназначить</button>
      </td>
    </tr>
  \`).join('');
  el.innerHTML = \`
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="text-align:left;color:var(--text3);font-size:11px;padding:4px 8px">#</th>
        <th style="text-align:left;font-size:11px;padding:4px 8px">Участник А</th>
        <th></th>
        <th style="text-align:left;font-size:11px;padding:4px 8px">Участник Б</th>
        <th></th>
      </tr></thead>
      <tbody>\${rows}</tbody>
    </table>
    \${round.sentAt ? '<div style="font-size:11px;color:var(--text3);margin-top:10px">✓ Рассылка отправлена</div>' : '<div style="font-size:11px;color:var(--warning);margin-top:10px">⏳ Рассылка ещё не отправлена (пн 12:00 МСК)</div>'}
  \`;
}
 
function renderCoffeeComplaints(complaints, participants) {
  const el = document.getElementById('coffee-complaints-list');
  const open = complaints.filter(c => !c.resolved);
  if (open.length === 0) {
    el.innerHTML = '<div style="color:var(--text3);font-size:13px">Жалоб нет</div>';
    return;
  }
  el.innerHTML = open.map((c, i) => \`
    <div style="padding:14px;background:rgba(255,80,80,0.06);border:1px solid rgba(255,80,80,0.15);border-radius:10px;margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:13px;font-weight:500">
          <span style="color:#ff6b6b">\${escapeAdminHtml(getParticipantName(c.fromId, participants))}</span>
          <span style="color:var(--text3)"> → </span>
          \${escapeAdminHtml(getParticipantName(c.toId, participants))}
        </div>
        <div style="font-size:11px;color:var(--text3)">\${c.weekId || ''}</div>
      </div>
      \${c.note ? \`<div style="font-size:12px;color:var(--text2);margin-bottom:10px">"\${escapeAdminHtml(c.note)}"</div>\` : ''}
      <div style="display:flex;gap:8px">
        <select id="reassign-select-\${i}" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:6px 10px;color:var(--text);font-size:12px">
          <option value="">— выбрать нового партнёра —</option>
          \${participants.filter(p => p.active && String(p.tgId) !== String(c.fromId)).map(p =>
            \`<option value="\${p.tgId}">\${escapeAdminHtml(p.name || p.tgId)}</option>\`
          ).join('')}
        </select>
        <button onclick="resolveComplaint(\${i}, '\${c.fromId}', '\${c.weekId}')" class="btn btn-w" style="font-size:12px;white-space:nowrap">Назначить</button>
        <button onclick="ignoreComplaint(\${i})" class="btn btn-ghost" style="font-size:12px">Игнор</button>
      </div>
    </div>
  \`).join('');
}
 
async function resolveComplaint(idx, fromId, weekId) {
  const select = document.getElementById('reassign-select-' + idx);
  const newPartnerId = select?.value;
  if (!newPartnerId) { alert('Выбери нового партнёра'); return; }
  if (!confirm('Назначить нового партнёра и закрыть жалобу?')) return;
  try {
    const res = await fetch('/api/admin/coffee/reassign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...aHeaders() },
      body: JSON.stringify({ tgId: fromId, newPartnerId, weekId, complaintId: idx })
    }).then(r => r.json());
    if (res.ok) { showAdminToast('Переназначено'); loadCoffeeAdmin(); }
    else alert('Ошибка');
  } catch(e) { alert('Ошибка подключения'); }
}
 
async function ignoreComplaint(idx) {
  if (!confirm('Пометить жалобу как решённую без переназначения?')) return;
  try {
    const res = await fetch('/api/admin/coffee/ignore-complaint', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...aHeaders() },
      body: JSON.stringify({ index: idx })
    }).then(r => r.json());
    if (res.ok) { showAdminToast('Жалоба закрыта'); loadCoffeeAdmin(); }
    else alert('Ошибка');
  } catch(e) { alert('Ошибка подключения'); }
}
 
function renderCoffeeParticipantsTable(participants) {
  const tbody = document.getElementById('coffee-participants-tbody');
  if (!participants.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text3);text-align:center;padding:20px">Участников нет</td></tr>';
    return;
  }
  tbody.innerHTML = participants.map(p => {
    const statusBadge = p.active
      ? '<span style="color:var(--success);font-size:11px">● Активен</span>'
      : '<span style="color:var(--text3);font-size:11px">○ Остановлен</span>';
    const disableBtnText = p.active ? 'Отключить' : 'Включить';
    return \`
      <tr id="coffee-row-\${p.tgId}">
        <td>
          <div style="font-size:13px;font-weight:500">\${escapeAdminHtml(p.name || '—')}</div>
          <div style="font-size:11px;color:var(--text3)">\${p.tgId}</div>
          \${p.username ? \`<div style="font-size:11px;color:var(--accent)">@\${escapeAdminHtml(p.username)}</div>\` : '<div style="font-size:11px;color:var(--text3);opacity:0.5">нет username</div>'}
        </td>
        <td>
          <button onclick="toggleCoffeeInfo('\${p.tgId}')" class="btn btn-ghost" style="font-size:11px;padding:4px 10px">Информация</button>
        </td>
        <td style="font-size:13px">\${p.totalMeetings || 0}</td>
        <td style="font-size:13px;color:var(--warning)">\${p.avgRating ? '★ ' + p.avgRating : '—'}</td>
        <td>\${statusBadge}</td>
        <td>
          <button onclick="toggleCoffeeParticipant('\${p.tgId}', \${p.active})"
            class="btn \${p.active ? 'btn-ghost' : 'btn-w'}" style="font-size:11px;padding:4px 10px">
            \${disableBtnText}
          </button>
        </td>
      </tr>
      <tr id="coffee-info-\${p.tgId}" style="display:none">
        <td colspan="6" style="background:var(--bg2);padding:16px;border-radius:8px">
          \${renderCoffeeInfoCard(p)}
        </td>
      </tr>
    \`;
  }).join('');
}

function renderCoffeeInfoCard(p) {
  const skillsHTML = (p.skills || []).filter(Boolean).map(s =>
    \`<span style="display:inline-block;background:var(--bg3);border:1px solid var(--border);border-radius:20px;padding:4px 10px;font-size:12px;margin:0 6px 6px 0">\${escapeAdminHtml(s)}</span>\`
  ).join('') || '<span style="color:var(--text3);font-size:12px">—</span>';

  let partnerHTML = '<span style="color:var(--text3);font-size:12px">Партнёр не назначен</span>';
  if (p.currentMatch?.partnerId) {
    const partner = coffeeParticipantsAll.find(x => String(x.tgId) === String(p.currentMatch.partnerId));
    const partnerName = partner ? (partner.name || partner.tgId) : p.currentMatch.partnerId;
    const statusMap = { active: 'Ожидает встречи', done: 'Встреча оценена', complained: 'Жалоба' };
    const statusText = statusMap[p.currentMatch.status] || p.currentMatch.status || '';
    partnerHTML = \`
      <div style="font-size:13px;font-weight:500">\${escapeAdminHtml(partnerName)}</div>
      <div style="font-size:11px;color:v">\${escapeAdminHtml(statusText)} · \${p.currentMatch.weekId || ''}</div>
    \`;
  }

  return \`
    <div style="display:flex;flex-direction:column;gap:12px;font-size:13px">
      <div>
        <div style="color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">О себе</div>
        <div style="color:var(--text2);line-height:1.5">\${escapeAdminHtml(p.bio || '—')}</div>
      </div>
      <div>
        <div style="color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Текущий запрос</div>
        <div style="color:var(--text2);line-height:1.5">\${escapeAdminHtml(p.request || '—')}</div>
      </div>
      <div>
        <div style="color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Чем готов помочь</div>
        <div>\${skillsHTML}</div>
      </div>
      <div>
        <div style="color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Текущий партнёр</div>
        \${partnerHTML}
      </div>
      <div>
  <div style="color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Telegram</div>
  \${p.username
    ? \`<a href="https://t.me/\${escapeAdminHtml(p.username)}" target="_blank" style="color:#00bd62;font-size:13px;text-decoration:none">@\${escapeAdminHtml(p.username)}</a>\`
    : '<span style="color:var(--text3);font-size:12px">— нет username</span>'
  }
</div>
    </div>
  \`;
}

function toggleCoffeeInfo(tgId) {
  const row = document.getElementById('coffee-info-' + tgId);
  if (!row) return;
  row.style.display = row.style.display === 'none' ? '' : 'none';
}
 
async function toggleCoffeeParticipant(tgId, currentlyActive) {
  const endpoint = currentlyActive ? '/api/admin/coffee/disable' : '/api/admin/coffee/enable';
  let reason = '';
  if (currentlyActive) {
    reason = prompt('Причина отключения (необязательно):') || '';
  }
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...aHeaders() },
      body: JSON.stringify({ tgId, reason })
    }).then(r => r.json());
    if (res.ok) { showAdminToast(currentlyActive ? 'Участник отключён' : 'Участник восстановлен'); loadCoffeeAdmin(); }
    else alert('Ошибка');
  } catch(e) { alert('Ошибка'); }
}
 
function filterCoffeeParticipants() {
  const q = document.getElementById('coffee-search').value.toLowerCase();
  const filtered = coffeeParticipantsAll.filter(p =>
    (p.name || '').toLowerCase().includes(q) ||
    String(p.tgId).includes(q) ||
    (p.city || '').toLowerCase().includes(q)
  );
  renderCoffeeParticipantsTable(filtered);
}
 
function openCoffeePairModal() {
  const modal = document.getElementById('coffeePairModal');
  modal.style.display = 'flex';
  const rows = document.getElementById('coffee-pair-rows');
  rows.innerHTML = '';
  addCoffeePairRow();
  addCoffeePairRow();
  addCoffeePairRow();
}
 
function addCoffeePairRow() {
  const rows = document.getElementById('coffee-pair-rows');
  const participants = coffeeParticipantsAll.filter(p => p.active);
  const options = participants.map(p =>
    \`<option value="\${p.tgId}">\${escapeAdminHtml(p.name || p.tgId)}</option>\`
  ).join('');
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;align-items:center';
  div.innerHTML = \`
    <select class="coffee-pair-a" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:7px 10px;color:var(--text);font-size:12px">
      <option value="">— участник А —</option>\${options}
    </select>
    <span style="color:var(--text3)">↔</span>
    <select class="coffee-pair-b" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:7px 10px;color:var(--text);font-size:12px">
      <option value="">— участник Б —</option>\${options}
    </select>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px">✕</button>
  \`;
  rows.appendChild(div);
}
 
async function saveCoffeePairs() {
  const rows = document.querySelectorAll('#coffee-pair-rows > div');
  const pairs = [];
  for (const row of rows) {
    const a = row.querySelector('.coffee-pair-a')?.value;
    const b = row.querySelector('.coffee-pair-b')?.value;
    if (a && b && a !== b) pairs.push({ a, b });
  }
  if (pairs.length === 0) { alert('Добавь хотя бы одну пару'); return; }
 
  // Проверить дубли
  const seen = new Set();
  for (const p of pairs) {
    const key = [p.a, p.b].sort().join('-');
    if (seen.has(key)) { alert('Есть повторяющиеся пары'); return; }
    seen.add(key);
  }
 
  // Получить weekId
  const weekId = coffeeAdminData?.weekId;
  if (!weekId) { alert('Ошибка: нет weekId'); return; }
 
  try {
    const res = await fetch('/api/admin/coffee/pairs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...aHeaders() },
      body: JSON.stringify({ weekId, pairs })
    }).then(r => r.json());
    if (res.ok) {
      document.getElementById('coffeePairModal').style.display = 'none';
      showAdminToast('Пары сохранены');
      loadCoffeeAdmin();
    } else alert('Ошибка сохранения');
  } catch(e) { alert('Ошибка подключения'); }
}
 
async function openReassignModal(tgId, currentPartnerId) {
  const participants = coffeeParticipantsAll.filter(p => p.active && String(p.tgId) !== String(tgId) && String(p.tgId) !== String(currentPartnerId));
  const options = participants.map(p =>
    \`<option value="\${p.tgId}">\${escapeAdminHtml(p.name || p.tgId)}</option>\`
  ).join('');
  const newPartnerId = await showAdminSelect('Выбрать нового партнёра:', options);
  if (!newPartnerId) return;
  const weekId = coffeeAdminData?.weekId;
  try {
    const res = await fetch('/api/admin/coffee/reassign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...aHeaders() },
      body: JSON.stringify({ tgId, newPartnerId, weekId })
    }).then(r => r.json());
    if (res.ok) { showAdminToast('Переназначено'); loadCoffeeAdmin(); }
    else alert('Ошибка');
  } catch(e) { alert('Ошибка'); }
}
 
// Простой select-диалог (браузерный confirm не возвращает значение)
function showAdminSelect(label, optionsHTML) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:2000;display:flex;align-items:center;justify-content:center';
    overlay.innerHTML = \`
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:20px;width:320px">
        <div style="font-size:13px;margin-bottom:12px">\${label}</div>
        <select id="admin-tmp-select" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px;color:var(--text);font-size:13px;margin-bottom:16px">
          <option value="">— выбрать —</option>\${optionsHTML}
        </select>
        <div style="display:flex;gap:8px">
          <button onclick="document.body.removeChild(this.closest('[style*=fixed]'));window._adminSelectResolve(null)" class="btn btn-ghost" style="flex:1">Отмена</button>
          <button onclick="const v=document.getElementById('admin-tmp-select').value;document.body.removeChild(this.closest('[style*=fixed]'));window._adminSelectResolve(v||null)" class="btn btn-w" style="flex:1">OK</button>
        </div>
      </div>
    \`;
    window._adminSelectResolve = resolve;
    document.body.appendChild(overlay);
  });
}
 
function escapeAdminHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
 
function showAdminToast(msg) {
  // Используй существующую функцию если есть, иначе:
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px 18px;font-size:13px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.4)';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ── KB ADMIN ──────────────────────────────────────────────────
let kbAdminCats = [];
let kbAdminCurrentCat = null;

async function kbLoadAdmin() {
  const data = await fetch('/api/admin/kb-categories', { headers: aHeaders() }).then(r => r.json());
  kbAdminCats = data.categories || [];
  renderKBAdminCategories();
  const sel = document.getElementById('kbSelectedCat');
  sel.innerHTML = '<option value="">— выбрать —</option>' + kbAdminCats.map(c => '<option value="' + c.id + '">' + escapeAdminHtml(c.icon) + ' ' + escapeAdminHtml(c.title) + '</option>').join('');
  document.getElementById('kbEntryList').innerHTML = '';
  document.getElementById('kbAddEntryBtn').disabled = true;
}

function renderKBAdminCategories() {
  const el = document.getElementById('kbCategoryList');
  if (!kbAdminCats.length) { el.innerHTML = '<p style="color:var(--text3);font-size:13px">Нет категорий</p>'; return; }
  el.innerHTML = kbAdminCats.map(c =>
    '<div class="module-item"><div class="module-item-top">' +
    '<div class="module-item-title">' + escapeAdminHtml(c.icon) + ' ' + escapeAdminHtml(c.title) + '</div>' +
    '<div class="module-item-actions">' +
    '<button class="btn btn-ghost btn-sm" data-id="' + c.id + '" onclick="kbOpenCategoryModal(this.dataset.id)">✏️</button>' +
    '<button class="btn btn-danger btn-sm" data-id="' + c.id + '" onclick="kbDeleteCategory(this.dataset.id)">✕</button>' +
    '</div></div></div>'
  ).join('');
}

function kbOpenCategoryModal(id) {
  const cat = id ? kbAdminCats.find(c => c.id === id) : null;
  document.getElementById('kbCatModalTitle').textContent = cat ? 'Редактировать категорию' : 'Новая категория';
  document.getElementById('kbCatId').value = id || '';
  document.getElementById('kbCatIdInput').value = cat?.id || '';
  document.getElementById('kbCatIdInput').disabled = !!cat;
  document.getElementById('kbCatTitle').value = cat?.title || '';
  document.getElementById('kbCatIcon').value = cat?.icon || '';
  document.getElementById('kbCatOrder').value = cat?.order ?? kbAdminCats.length + 1;
  document.getElementById('kbCatModal').classList.add('open');
}
function kbCloseCatModal() { document.getElementById('kbCatModal').classList.remove('open'); }

async function kbSaveCategory() {
  const isNew = !document.getElementById('kbCatId').value;
  const id = isNew ? document.getElementById('kbCatIdInput').value.trim() : document.getElementById('kbCatId').value;
  if (!id) { showAdminToast('Укажи ID категории'); return; }
  const category = {
    id,
    title: document.getElementById('kbCatTitle').value.trim(),
    icon: document.getElementById('kbCatIcon').value.trim(),
    order: parseInt(document.getElementById('kbCatOrder').value) || 0
  };
  await fetch('/api/admin/kb-save-category', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ category }) });
  kbCloseCatModal();
  showAdminToast('Категория сохранена');
  kbLoadAdmin();
}

async function kbDeleteCategory(id) {
  if (!confirm('Удалить категорию и все её записи?')) return;
  await fetch('/api/admin/kb-delete-category', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ id }) });
  showAdminToast('Категория удалена');
  kbLoadAdmin();
}

async function kbLoadEntries(catId) {
  kbAdminCurrentCat = catId;
  document.getElementById('kbAddEntryBtn').disabled = !catId;
  if (!catId) { document.getElementById('kbEntryList').innerHTML = ''; return; }
  const data = await fetch('/api/admin/kb-entries?catId=' + catId, { headers: aHeaders() }).then(r => r.json());
  const entries = data.entries || [];
  const el = document.getElementById('kbEntryList');
  if (!entries.length) { el.innerHTML = '<p style="color:var(--text3);font-size:13px;margin-top:8px">Нет записей</p>'; return; }
  el.innerHTML = entries.map(e =>
    '<div class="module-item" style="margin-top:6px"><div class="module-item-top"><div>' +
    '<div class="module-item-title" style="font-size:13px">' + escapeAdminHtml(e.title) + '</div>' +
    '<div style="font-size:11px;color:var(--text3)">' + escapeAdminHtml(e.date) + (e.videoUrl ? ' · ▶ видео' : '') + (e.materials && e.materials.length ? ' · 📎 ' + e.materials.length : '') + '</div>' +
    '</div><div class="module-item-actions">' +
    '<button class="btn btn-ghost btn-sm" data-id="' + e.id + '" onclick="kbOpenEntryModal(this.dataset.id)">✏️</button>' +
    '</div></div></div>'
  ).join('');
}

async function kbOpenEntryModal(id) {
  const catId = kbAdminCurrentCat;
  if (!catId) { showAdminToast('Выбери категорию'); return; }
  let entry = null;
  if (id) {
    const data = await fetch('/api/admin/kb-entries?catId=' + catId, { headers: aHeaders() }).then(r => r.json());
    entry = (data.entries || []).find(e => e.id === id);
  }
  document.getElementById('kbEntryModalTitle').textContent = entry ? 'Редактировать запись' : 'Новая запись';
  document.getElementById('kbEntryId').value = entry?.id || '';
  document.getElementById('kbEntryCatId').value = catId;
  document.getElementById('kbEntryIdInput').value = entry?.id || '';
  document.getElementById('kbEntryIdInput').disabled = !!entry;
  document.getElementById('kbEntryDate').value = entry?.date || '';
  document.getElementById('kbEntryTitle').value = entry?.title || '';
  document.getElementById('kbEntrySubtitle').value = entry?.subtitle || '';
  document.getElementById('kbEntryVideo').value = entry?.videoUrl || '';
  document.getElementById('kbEntryMaterials').value = (entry?.materials || []).map(m => m.title + ' | ' + m.url).join('\\n');
  document.getElementById('kbEntrySummary').value = entry?.summary || '';
  document.getElementById('kbEntryDeleteBtn').style.display = entry ? 'block' : 'none';
  document.getElementById('kbEntryModal').classList.add('open');
}
function kbCloseEntryModal() { document.getElementById('kbEntryModal').classList.remove('open'); }

async function kbSaveEntry() {
  const isNew = !document.getElementById('kbEntryId').value;
  const catId = document.getElementById('kbEntryCatId').value;
  const id = isNew ? document.getElementById('kbEntryIdInput').value.trim() : document.getElementById('kbEntryId').value;
  if (!id) { showAdminToast('Укажи ID записи'); return; }
  const materialsRaw = document.getElementById('kbEntryMaterials').value.trim();
  const materials = materialsRaw ? materialsRaw.split('\\n').filter(l => l.trim()).map(l => {
    const sep = l.indexOf(' | ');
    if (sep === -1) return { title: l.trim(), url: l.trim() };
    return { title: l.slice(0, sep).trim(), url: l.slice(sep + 3).trim() };
  }) : [];
  const entry = {
    id,
    title: document.getElementById('kbEntryTitle').value.trim(),
    subtitle: document.getElementById('kbEntrySubtitle').value.trim(),
    date: document.getElementById('kbEntryDate').value.trim(),
    videoUrl: document.getElementById('kbEntryVideo').value.trim(),
    materials,
    summary: document.getElementById('kbEntrySummary').value.trim()
  };
  await fetch('/api/admin/kb-save-entry', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ catId, entry }) });
  kbCloseEntryModal();
  showAdminToast('Запись сохранена');
  kbLoadEntries(catId);
}

async function kbDeleteEntry() {
  if (!confirm('Удалить запись?')) return;
  const catId = document.getElementById('kbEntryCatId').value;
  const entryId = document.getElementById('kbEntryId').value;
  await fetch('/api/admin/kb-delete-entry', { method: 'POST', headers: aHeaders(), body: JSON.stringify({ catId, entryId }) });
  kbCloseEntryModal();
  showAdminToast('Запись удалена');
  kbLoadEntries(catId);
}

async function kbInitData() {
  const msg = document.getElementById('kbInitMsg');
  msg.textContent = 'Загружаем...';
  msg.className = 'msg';
  try {
    await fetch('/api/admin/kb-init', { method: 'POST', headers: aHeaders() });
    msg.textContent = 'Данные загружены!';
    msg.className = 'msg ok';
    kbLoadAdmin();
  } catch(e) {
    msg.textContent = 'Ошибка';
    msg.className = 'msg err';
  }
}
</script>
</body>
</html>`;
}

// ─── COMMUNITY CRM HTML/CSS/JS ─────────────────────────────────────
function getCommunityHTML() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Комьюнити CRM</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@600;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#f4f2ee;
  --bg-soft:#fbfaf8;
  --panel:#ffffff;
  --ink:#181614;
  --ink-soft:#6b6560;
  --ink-faint:#a29c96;
  --line:#e8e3dc;
  --line-soft:#f0ece5;
  --accent:#ff5a36;
  --accent-soft:#fff0ea;
  --accent-ink:#c23f20;
  --green:#1f9d64;
  --green-soft:#e7f7ee;
  --amber:#c98a1a;
  --amber-soft:#fdf3e0;
  --red:#e0453a;
  --red-soft:#fdeceb;
  --shadow-sm:0 1px 2px rgba(24,22,20,.05);
  --shadow-md:0 10px 30px -12px rgba(24,22,20,.18);
  --shadow-lg:0 30px 80px -20px rgba(24,22,20,.35);
  --radius:16px;
}
*{box-sizing:border-box;}
html,body{height:100%;}
body{
  margin:0;
  font-family:'Manrope',-apple-system,BlinkMacSystemFont,sans-serif;
  background:var(--bg);
  color:var(--ink);
  overflow:hidden;
  -webkit-font-smoothing:antialiased;
}
@media (max-width:860px){ body{ overflow:auto; } }
h1,h2,h3{font-family:'Unbounded',sans-serif; margin:0; letter-spacing:-0.01em;}
button{font-family:inherit;}
::selection{background:var(--accent-soft); color:var(--accent-ink);}

/* ───── Login ───── */
#loginScreen{
  position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
  background:radial-gradient(circle at 20% 20%, #fff 0%, var(--bg) 60%);
  z-index:500;
}
.loginCard{
  background:var(--panel); border-radius:24px; padding:44px 40px; width:340px;
  box-shadow:var(--shadow-lg); border:1px solid var(--line-soft); text-align:center;
}
.loginCard .badge{
  width:52px; height:52px; border-radius:14px; margin:0 auto 18px;
  background:linear-gradient(135deg,var(--accent),#ff8a5b);
  display:flex; align-items:center; justify-content:center; font-size:22px; color:#fff;
  box-shadow:0 10px 24px -8px rgba(255,90,54,.55);
}
.loginCard h1{font-size:20px; margin-bottom:6px;}
.loginCard p{color:var(--ink-soft); font-size:13.5px; margin:0 0 22px;}
.loginCard input{
  width:100%; padding:13px 16px; border-radius:12px; border:1.5px solid var(--line);
  font-size:15px; outline:none; margin-bottom:12px; background:var(--bg-soft); transition:.15s;
}
.loginCard input:focus{border-color:var(--accent); background:#fff;}
.loginCard button{
  width:100%; padding:13px; border-radius:12px; border:none; background:var(--ink); color:#fff;
  font-weight:700; font-size:14.5px; cursor:pointer; transition:.15s;
}
.loginCard button:hover{background:#000;}
.loginErr{color:var(--red); font-size:12.5px; margin-top:10px; min-height:14px;}

/* ───── App shell ───── */
#app{display:none; height:100vh; flex-direction:column;}
@media (max-width:860px){ #app{height:auto; min-height:100vh;} }

.topbar{
  display:flex; align-items:center; gap:10px; padding:16px 24px; flex-shrink:0;
  border-bottom:1px solid var(--line);
}
@media (max-width:860px){ .topbar{flex-wrap:wrap; padding:14px 16px;} }
.searchWrap{position:relative; flex:1;}
.searchWrap input{
  width:100%; padding:10px 34px 10px 36px; border-radius:11px; border:1.5px solid var(--line);
  font-size:13.5px; outline:none; background:var(--bg-soft); transition:.15s;
}
.searchWrap input:focus{border-color:var(--accent); background:#fff;}
.searchWrap .searchIcon{position:absolute; left:12px; top:50%; transform:translateY(-50%); opacity:.4; pointer-events:none;}
.searchWrap .clearBtn{
  position:absolute; right:8px; top:50%; transform:translateY(-50%); width:22px; height:22px; border-radius:50%;
  border:none; background:var(--line-soft); color:var(--ink-soft); display:none; align-items:center; justify-content:center; cursor:pointer;
}
.searchWrap .clearBtn:hover{background:var(--accent-soft); color:var(--accent-ink);}
.searchWrap.hasText .clearBtn{display:flex;}

.btn{
  display:inline-flex; align-items:center; gap:7px; padding:9px 16px; border-radius:11px;
  border:1.5px solid var(--line); background:#fff; color:var(--ink); font-size:13.5px; font-weight:600;
  cursor:pointer; transition:.15s; white-space:nowrap; flex-shrink:0;
}
.btn:hover{border-color:var(--ink); transform:translateY(-1px);}
.btn.primary{background:var(--ink); color:#fff; border-color:var(--ink);}
.btn.primary:hover{background:#000;}
.btn.accent{background:var(--accent); color:#fff; border-color:var(--accent); box-shadow:0 8px 20px -8px rgba(255,90,54,.6);}
.btn.accent:hover{background:var(--accent-ink); border-color:var(--accent-ink);}
.btn.ghost{border-color:transparent; background:transparent;}
.btn.ghost:hover{background:var(--line-soft); border-color:transparent; transform:none;}
.btn.small{padding:6px 11px; font-size:12px; border-radius:9px;}
.btn.toggled{background:var(--accent-soft); border-color:var(--accent); color:var(--accent-ink);}
.btn.iconOnly{width:38px; height:38px; padding:0; justify-content:center;}

.popoverWrap{position:relative; flex-shrink:0;}
.popover{
  position:absolute; top:calc(100% + 8px); right:0; background:#fff; border-radius:16px; box-shadow:var(--shadow-lg);
  border:1px solid var(--line-soft); padding:16px; width:220px; z-index:60; display:none;
}
.popover.show{display:block;}
.statLine{display:flex; align-items:baseline; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--line-soft);}
.statLine:last-child{border-bottom:none;}
.statLine .n{font-family:'Unbounded',sans-serif; font-size:15px; font-weight:700;}
.statLine .l{font-size:11.5px; color:var(--ink-faint); font-weight:600;}

/* ───── Table ───── */
.tableWrap{flex:1; overflow:auto; padding:0 24px 22px; min-height:0;}
table{width:100%; border-collapse:separate; border-spacing:0 8px;}
thead th{
  position:sticky; top:0; background:var(--bg); z-index:5;
  text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:.06em;
  color:var(--ink-faint); font-weight:700; padding:0 14px 8px; white-space:nowrap;
}
thead th.actionsCol{width:1%; white-space:nowrap;}
thead th.nameCol{width:1%;}
thead th.dateCol{width:1%;}
thead th.ratingCol{width:1%;}
thead th.reqCol, thead th.noteCol{width:50%;}
tbody tr.pRow{
  background:var(--panel); cursor:pointer; transition:.15s; box-shadow:var(--shadow-sm);
}
tbody tr.pRow:hover{box-shadow:var(--shadow-md); transform:translateY(-1px);}
tbody tr.pRow td{padding:13px 14px; font-size:13.5px; border-top:1px solid var(--line-soft); border-bottom:1px solid var(--line-soft); vertical-align:middle;}
tbody tr.pRow td:first-child{border-left:1px solid var(--line-soft); border-radius:13px 0 0 13px;}
tbody tr.pRow td:last-child{border-right:1px solid var(--line-soft); border-radius:0 13px 13px 0;}
td.nameCol, td.dateCol, td.ratingCol{white-space:nowrap;}

.iconBtn{
  width:30px; height:30px; border-radius:9px; border:1px solid var(--line); background:var(--bg-soft);
  display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:.15s; color:var(--ink-soft);
}
.iconBtn:hover{background:var(--accent-soft); border-color:var(--accent); color:var(--accent-ink); transform:scale(1.06);}
.iconBtn.copied{background:var(--green-soft); border-color:var(--green); color:var(--green);}
.iconGroup{display:flex; gap:6px;}

.nameCell{font-weight:700;}
.faint{color:var(--ink-faint); font-weight:500;}
.mono{font-variant-numeric:tabular-nums;}

.ratingNum{font-weight:700; font-size:13px;}

.reqText{white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; max-width:1px; min-width:100%;}
.reqDate{font-size:11px; color:var(--ink-faint); margin-top:2px;}
.noteText{white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; color:var(--ink-soft); max-width:1px; min-width:100%;}

.hidden-col{display:none;}
.emptyState{text-align:center; padding:60px 20px; color:var(--ink-faint);}

@media (max-width:860px){
  .tableWrap{overflow:auto;}
  table{min-width:900px;}
}

/* ───── Person Panel (80% overlay) ───── */
#overlay{position:fixed; inset:0; background:rgba(20,17,14,.45); backdrop-filter:blur(3px); display:none; z-index:100; opacity:0; transition:opacity .22s;}
#overlay.show{display:block; opacity:1;}
#panel{
  position:fixed; top:0; right:0; height:100%; width:80%; max-width:1100px; background:var(--bg-soft);
  z-index:101; transform:translateX(100%); transition:transform .28s cubic-bezier(.2,.8,.2,1);
  display:flex; flex-direction:column; box-shadow:-30px 0 80px -20px rgba(0,0,0,.35);
}
#panel.show{transform:translateX(0);}
@media (max-width:860px){ #panel{width:100%; max-width:none;} }

.panelHead{
  display:flex; align-items:center; gap:16px; padding:20px 24px; border-bottom:1px solid var(--line); flex-shrink:0; background:var(--panel);
}
.panelHead h2{font-size:19px;}
.panelHead .meta{font-size:12.5px; color:var(--ink-faint); margin-top:2px;}
.panelBody{flex:1; display:flex; overflow:hidden;}
@media (max-width:860px){ .panelBody{flex-direction:column; overflow:auto;} }
.panelLeft{flex:1.3; overflow-y:auto; padding:22px 24px 60px;}
@media (max-width:860px){ .panelLeft{padding:18px 16px 30px;} }
.panelRight{flex:1; overflow-y:auto; padding:22px 24px 60px; border-left:1px solid var(--line); background:var(--panel);}
@media (max-width:860px){ .panelRight{border-left:none; border-top:1px solid var(--line); padding:0;} }

.section{background:var(--panel); border:1px solid var(--line-soft); border-radius:var(--radius); padding:18px 20px; margin-bottom:14px; box-shadow:var(--shadow-sm);}
.section h3{font-size:12.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--ink-faint); margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;}
.fieldGrid{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
.field label{font-size:11.5px; font-weight:700; color:var(--ink-faint); text-transform:uppercase; letter-spacing:.04em; display:block; margin-bottom:6px;}
.field input, .field textarea, .field select{
  width:100%; padding:10px 13px; border-radius:10px; border:1.5px solid var(--line); font-size:14px;
  outline:none; background:var(--bg-soft); font-family:inherit; transition:.15s;
}
.field input:focus, .field textarea:focus, .field select:focus{border-color:var(--accent); background:#fff;}
.field{margin-bottom:0;}
.field.full{grid-column:1/-1;}

.totalPaid{
  display:flex; align-items:baseline; justify-content:space-between; padding:15px 18px; border-radius:14px;
  background:linear-gradient(135deg,#1a1815,#2b2621); color:#fff; margin-bottom:14px;
}
.totalPaid .num{font-family:'Unbounded',sans-serif; font-size:22px; font-weight:700;}
.totalPaid .lbl{font-size:11.5px; color:#c9c2ba; text-transform:uppercase; letter-spacing:.05em;}

/* custom date picker */
.datePick{position:relative; flex:none;}
.dateDisplay{
  padding:10px 12px; border-radius:10px; border:1.5px solid var(--line); background:var(--bg-soft); font-size:13.5px;
  cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:8px; transition:.15s; user-select:none; white-space:nowrap;
}
.dateDisplay:hover{border-color:var(--accent);}
.dateDisplay svg{opacity:.5; flex-shrink:0;}
.calPop{
  position:absolute; top:calc(100% + 8px); left:0; background:#fff; border-radius:16px; box-shadow:var(--shadow-lg);
  border:1px solid var(--line-soft); padding:16px; width:270px; z-index:60; display:none;
}
.calPop.flip{left:auto; right:0;}
.calPop.flip-up{top:auto; bottom:calc(100% + 8px);}
.calPop.show{display:block;}
.calHead{display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;}
.calHead .lbl{font-weight:700; font-size:14px;}
.calNav{width:26px; height:26px; border-radius:8px; border:none; background:var(--bg-soft); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.15s;}
.calNav:hover{background:var(--accent-soft); color:var(--accent-ink);}
.calGrid{display:grid; grid-template-columns:repeat(7,1fr); gap:3px;}
.calDow{font-size:10px; color:var(--ink-faint); text-align:center; font-weight:700; padding-bottom:4px;}
.calDay{
  aspect-ratio:1; display:flex; align-items:center; justify-content:center; border-radius:8px; font-size:12.5px;
  cursor:pointer; transition:.12s; font-weight:600;
}
.calDay:hover{background:var(--accent-soft);}
.calDay.muted{color:var(--ink-faint); font-weight:400;}
.calDay.today{border:1.5px solid var(--accent);}
.calDay.selected{background:var(--accent); color:#fff;}
.calToday{margin-top:10px; text-align:center; font-size:12px; color:var(--accent-ink); font-weight:700; cursor:pointer;}

/* custom rating picker */
.ratingPick{position:relative; flex:none; width:84px;}
.ratingPick .dateDisplay{font-weight:700; justify-content:center; gap:6px;}
.ratingPop{
  position:absolute; top:calc(100% + 8px); left:0; background:#fff; border-radius:16px; box-shadow:var(--shadow-lg);
  border:1px solid var(--line-soft); padding:8px; width:84px; z-index:60; display:none; max-height:280px; overflow-y:auto;
}
.ratingPop.flip{left:auto; right:0;}
.ratingPop.flip-up{top:auto; bottom:calc(100% + 8px);}
.ratingPop.show{display:block;}
.ratingOpt{
  padding:9px 10px; border-radius:9px; font-size:13.5px; font-weight:700; text-align:center; cursor:pointer; transition:.12s;
}
.ratingOpt:hover{background:var(--accent-soft);}
.ratingOpt.selected{background:var(--accent); color:#fff;}

.inlineRow{display:flex; gap:10px; align-items:center;}
.inlineRow input.textInput, .inlineRow textarea.textInput{
  flex:1; padding:10px 13px; border-radius:10px; border:1.5px solid var(--line); font-size:14px;
  outline:none; background:var(--bg-soft); font-family:inherit; transition:.15s;
}
.inlineRow textarea.textInput{resize:vertical; min-height:40px; line-height:1.4;}
.inlineRow input.textInput:focus, .inlineRow textarea.textInput:focus{border-color:var(--accent); background:#fff;}
.inlineRow + .inlineRow{margin-top:10px;}

/* history */
.histEmpty{text-align:center; color:var(--ink-faint); padding:30px 10px; font-size:13px;}
.histItem{display:flex; gap:12px; padding:12px 0; border-bottom:1px solid var(--line-soft);}
.histItem:last-child{border-bottom:none;}
.histIcon{
  width:32px; height:32px; border-radius:9px; flex-shrink:0; display:flex; align-items:center; justify-content:center;
}
.histIcon.rating{background:var(--accent-soft); color:var(--accent-ink);}
.histIcon.request{background:#e7edfd; color:#3457c9;}
.histIcon.note{background:var(--line-soft); color:var(--ink-soft);}
.histIcon.payment{background:var(--green-soft); color:var(--green);}
.histBody{flex:1; min-width:0;}
.histTop{display:flex; align-items:center; justify-content:space-between; gap:8px;}
.histTitle{font-weight:700; font-size:13.5px;}
.histDate{font-size:11px; color:var(--ink-faint); white-space:nowrap;}
.histText{font-size:13px; color:var(--ink-soft); margin-top:3px; word-break:break-word; white-space:pre-wrap;}
.histActions{display:flex; gap:12px; margin-top:4px;}
.histDel{opacity:0; transition:.15s; cursor:pointer; color:var(--ink-faint); background:none; border:none; font-size:12px;}
.histItem:hover .histDel{opacity:1;}
.histDel:hover{color:var(--accent-ink);}
.histActions .histDel:last-child:hover{color:var(--red);}

.closeX{
  width:36px; height:36px; border-radius:11px; border:1px solid var(--line); background:#fff; cursor:pointer;
  display:flex; align-items:center; justify-content:center; transition:.15s; margin-left:auto;
}
.closeX:hover{background:var(--red-soft); border-color:var(--red); color:var(--red);}

.toast{
  position:fixed; bottom:26px; left:50%; transform:translateX(-50%) translateY(20px); background:var(--ink); color:#fff;
  padding:11px 20px; border-radius:11px; font-size:13px; font-weight:600; z-index:400; opacity:0; pointer-events:none; transition:.2s; box-shadow:var(--shadow-lg);
}
.toast.show{opacity:1; transform:translateX(-50%) translateY(0);}

.delRow{display:flex; justify-content:flex-end; margin-top:6px;}
.delPersonBtn{background:none; border:none; color:var(--ink-faint); font-size:12px; cursor:pointer;}
.delPersonBtn:hover{color:var(--red);}

.histToggle{display:none;}
@media (max-width:860px){
  .histToggle{
    display:flex; width:100%; align-items:center; justify-content:space-between; padding:16px; background:var(--panel);
    border:none; border-bottom:1px solid var(--line); font-family:'Unbounded',sans-serif; font-size:13px; font-weight:700; cursor:pointer;
  }
  .histToggle svg{transition:.2s;}
  .histToggle.open svg{transform:rotate(180deg);}
  #historyWrap{display:none; padding:18px 16px 30px;}
  #historyWrap.open{display:block;}
}
</style>
</head>
<body>

<div id="loginScreen">
  <div class="loginCard">
    <div class="badge">◆</div>
    <h1>Комьюнити CRM</h1>
    <p>Доступ только для команды</p>
    <input type="password" id="loginPass" placeholder="Пароль" onkeydown="if(event.key==='Enter')doLogin()">
    <button class="btn primary" style="width:100%; justify-content:center;" onclick="doLogin()">Войти</button>
    <div class="loginErr" id="loginErr"></div>
  </div>
</div>

<div id="app">
  <div class="topbar">
    <div class="searchWrap" id="searchWrap">
      <svg class="searchIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <input id="searchInput" placeholder="Поиск по имени, telegram, email..." oninput="onSearchInput()">
      <button class="clearBtn" onclick="clearSearch()">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <div class="popoverWrap">
      <button class="btn iconOnly" id="statsBtn" title="Статистика" onclick="toggleStats()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>
      </button>
      <div class="popover" id="statsPopover"></div>
    </div>

    <button class="btn iconOnly" id="expandBtn" title="Развернуть telegram/email" onclick="toggleExpand()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
    </button>

    <button class="btn accent" onclick="openNewPerson()">+ Участник</button>
  </div>

  <div class="tableWrap">
    <table>
      <thead>
        <tr>
          <th class="actionsCol"></th>
          <th class="nameCol"></th>
          <th class="hidden-col expandCol">TG username</th>
          <th class="hidden-col expandCol">Email</th>
          <th class="dateCol">Дата оплаты</th>
          <th class="ratingCol">Оценка</th>
          <th class="reqCol">Текущий запрос</th>
          <th class="noteCol">Примечание</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>
  </div>
</div>

<div id="overlay" onclick="closePanel()"></div>
<div id="panel">
  <div class="panelHead">
    <div>
      <h2 id="pName">—</h2>
    </div>
    <button class="closeX" onclick="closePanel()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  </div>
  <div class="panelBody">
    <div class="panelLeft">

      <div class="section">
        <h3>Данные участника</h3>
        <div class="fieldGrid">
          <div class="field"><label>Имя</label><input id="fName" oninput="scheduleFieldSave()"></div>
          <div class="field"><label>Ссылка на telegram</label><input id="fTelegram" oninput="scheduleFieldSave()" placeholder="https://t.me/username"></div>
          <div class="field full"><label>Email</label><input id="fEmail" oninput="scheduleFieldSave()" placeholder="mail@example.com"></div>
        </div>
        <div class="delRow"><button class="delPersonBtn" onclick="deletePerson()">Удалить участника</button></div>
      </div>

      <div class="totalPaid">
        <div>
          <div class="lbl">Всего оплачено</div>
          <div class="num" id="totalPaidNum">0 ₽</div>
        </div>
      </div>
      <div class="section">
        <h3>Оплата</h3>
        <div class="inlineRow">
          <input type="number" id="payAmount" class="textInput" value="5000" style="max-width:130px;" placeholder="Сумма">
          <div class="datePick" id="payDatePick"></div>
          <button class="btn accent small" id="paySubmitBtn" onclick="submitPayment()">Добавить</button>
        </div>
      </div>

      <div class="section">
        <h3>Оценка комьюнити</h3>
        <div id="currentRatingView" style="margin-bottom:12px;"></div>
        <div class="inlineRow">
          <div class="ratingPick" id="ratingPick"></div>
          <div class="datePick" id="ratingDatePick"></div>
          <button class="btn accent small" id="ratingSubmitBtn" onclick="submitRating()">Сохранить</button>
        </div>
      </div>

      <div class="section">
        <h3>Текущий запрос</h3>
        <div id="currentRequestView" class="faint" style="margin-bottom:12px;">Нет активного запроса</div>
        <div class="inlineRow">
          <textarea id="reqText" class="textInput" rows="2" placeholder="Новый запрос..."></textarea>
        </div>
        <div class="inlineRow">
          <div class="datePick" id="reqDatePick"></div>
          <button class="btn accent small" id="reqSubmitBtn" onclick="submitRequest()">Сохранить</button>
        </div>
      </div>

      <div class="section">
        <h3>Примечание</h3>
        <div id="currentNoteView" class="faint" style="margin-bottom:12px;">Нет примечаний</div>
        <div class="inlineRow">
          <textarea id="noteText" class="textInput" rows="2" placeholder="Новое примечание..."></textarea>
        </div>
        <div class="inlineRow">
          <div class="datePick" id="noteDatePick"></div>
          <button class="btn accent small" id="noteSubmitBtn" onclick="submitNote()">Сохранить</button>
        </div>
      </div>

    </div>
    <div class="panelRight">
      <button class="histToggle" id="histToggleBtn" onclick="toggleHistoryMobile()">
        <span>История</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div id="historyWrap">
        <h3 style="font-size:12.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--ink-faint); margin-bottom:14px;" class="historyTitleDesktop">История</h3>
        <div id="historyList"></div>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
let ADMIN_TOKEN = localStorage.getItem('communityToken') || '';
let PEOPLE = [];
let CURRENT = null;
let EXPANDED = localStorage.getItem('communityExpanded') === '1';
let saveFieldTimer = null;
let editingEntries = {payment:null, rating:null, request:null, note:null};

document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && document.getElementById('panel').classList.contains('show')) closePanel();
});

function authHeaders(){ return {'Content-Type':'application/json','Authorization':'admin_session_'+ADMIN_TOKEN}; }

async function doLogin(){
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginErr');
  errEl.textContent = '';
  try{
    const r = await fetch('/api/admin/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({password: pass})});
    const d = await r.json();
    if(!d.ok){ errEl.textContent = d.error || 'Неверный пароль'; return; }
    ADMIN_TOKEN = d.token.replace('admin_session_','');
    localStorage.setItem('communityToken', ADMIN_TOKEN);
    boot();
  }catch(e){ errEl.textContent = 'Ошибка соединения'; }
}

async function boot(){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  if(EXPANDED){ document.getElementById('expandBtn').classList.add('toggled'); document.querySelectorAll('.expandCol').forEach(c=>c.classList.remove('hidden-col')); }
  await loadPeople();
}

async function loadPeople(){
  const r = await fetch('/api/community', {headers: authHeaders()});
  if(r.status === 401){ logout(); return; }
  const d = await r.json();
  PEOPLE = d.people || [];
  renderTable();
}

function logout(){
  localStorage.removeItem('communityToken');
  location.reload();
}

if(ADMIN_TOKEN) boot();

function onSearchInput(){
  const wrap = document.getElementById('searchWrap');
  wrap.classList.toggle('hasText', document.getElementById('searchInput').value.length>0);
  renderTable();
}
function clearSearch(){
  document.getElementById('searchInput').value = '';
  document.getElementById('searchWrap').classList.remove('hasText');
  renderTable();
}

function toggleExpand(){
  EXPANDED = !EXPANDED;
  localStorage.setItem('communityExpanded', EXPANDED ? '1':'0');
  document.getElementById('expandBtn').classList.toggle('toggled', EXPANDED);
  document.querySelectorAll('.expandCol').forEach(c=>c.classList.toggle('hidden-col', !EXPANDED));
}

function toggleStats(){
  const pop = document.getElementById('statsPopover');
  const willShow = !pop.classList.contains('show');
  document.querySelectorAll('.popover').forEach(p=>p.classList.remove('show'));
  if(willShow){ renderStats(); pop.classList.add('show'); }
}
document.addEventListener('click', (e) => {
  if(!e.target.closest('.popoverWrap')) document.querySelectorAll('.popover').forEach(p=>p.classList.remove('show'));
});

function fmtMoney(n){ return (n||0).toLocaleString('ru-RU') + ' ₽'; }
function fmtDate(iso){
  if(!iso) return '—';
  const d = new Date(iso+'T00:00:00');
  if(isNaN(d)) return iso;
  return d.toLocaleDateString('ru-RU', {day:'2-digit', month:'short'});
}
function fmtDateFull(iso){
  if(!iso) return '—';
  const d = new Date(iso+'T00:00:00');
  if(isNaN(d)) return iso;
  return d.toLocaleDateString('ru-RU', {day:'2-digit', month:'long', year:'numeric'});
}

function lastOf(arr){ if(!arr || !arr.length) return null; return arr.slice().sort((a,b)=> (a.date>b.date?1:a.date<b.date?-1:a.createdAt-b.createdAt))[arr.length-1]; }
function sumPayments(arr){ return (arr||[]).reduce((s,p)=>s+(p.amount||0),0); }

function ratingColor(v){
  if(v>=8) return 'var(--green)';
  if(v>=5) return 'var(--amber)';
  return 'var(--red)';
}

function renderStats(){
  const totalPaid = PEOPLE.reduce((s,p)=>s+sumPayments(p.payments),0);
  const vals = PEOPLE.map(p=>lastOf(p.ratings)?.value).filter(v=>v!=null);
  const avgRating = vals.length? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '—';
  const withRequest = PEOPLE.filter(p => p.requests && p.requests.length).length;
  document.getElementById('statsPopover').innerHTML =
    '<div class="statLine"><span class="l">Участников</span><span class="n">'+PEOPLE.length+'</span></div>' +
    '<div class="statLine"><span class="l">Всего оплат</span><span class="n">'+fmtMoney(totalPaid)+'</span></div>' +
    '<div class="statLine"><span class="l">Средняя оценка</span><span class="n">'+avgRating+'</span></div>' +
    '<div class="statLine"><span class="l">Активных запросов</span><span class="n">'+withRequest+'</span></div>';
}

function renderTable(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const tbody = document.getElementById('tbody');
  let list = PEOPLE;
  if(q){
    list = PEOPLE.filter(p => [p.name,p.telegram,p.tgUsername,p.email].join(' ').toLowerCase().includes(q));
  }

  if(!list.length){
    tbody.innerHTML = '<tr><td colspan="8"><div class="emptyState">Никого не найдено</div></td></tr>';
    return;
  }

  tbody.innerHTML = list.map(p => {
    const rating = lastOf(p.ratings);
    const request = lastOf(p.requests);
    const note = lastOf(p.notes);
    const payment = lastOf(p.payments);
    const tg = (p.telegram||'').trim();
    const tgHref = tg ? (tg.startsWith('http')? tg : 'https://t.me/'+tg.replace('@','')) : '';
    return '<tr class="pRow" onclick="handleRowClick(event,\\''+p.id+'\\')">' +
      '<td onclick="event.stopPropagation()"><div class="iconGroup">' +
        '<button class="iconBtn" title="Скопировать email" onclick="copyEmail(this,\\''+(p.email||'').replace(/'/g,"\\\\'")+'\\')">'+
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>'+
        '</button>' +
        (tgHref ? '<a class="iconBtn" title="Открыть telegram" href="'+tgHref+'" target="_blank" rel="noopener">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21.05 3.6L2.9 10.7c-1.24.5-1.23 1.2-.23 1.5l4.65 1.45 1.8 5.5c.22.6.37.85.76.85.3 0 .43-.14.6-.3l1.62-1.57 3.37 2.5c.62.34 1.06.16 1.22-.57l2.2-10.4c.25-.9-.34-1.3-1.34-.86z"/></svg>' +
        '</a>' : '<span class="iconBtn" style="opacity:.3; cursor:default;"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21.05 3.6L2.9 10.7c-1.24.5-1.23 1.2-.23 1.5l4.65 1.45 1.8 5.5c.22.6.37.85.76.85.3 0 .43-.14.6-.3l1.62-1.57 3.37 2.5c.62.34 1.06.16 1.22-.57l2.2-10.4c.25-.9-.34-1.3-1.34-.86z"/></svg></span>') +
      '</div></td>' +
      '<td class="nameCol"><div class="nameCell">'+(p.name||'Без имени')+'</div></td>' +
      '<td class="hidden-col expandCol faint">'+(p.tgUsername||tg||'—')+'</td>' +
      '<td class="hidden-col expandCol faint">'+(p.email||'—')+'</td>' +
      '<td class="dateCol mono">'+(payment? fmtDate(payment.date) : '—')+'</td>' +
      '<td class="ratingCol">'+(rating!=null ? '<span class="ratingNum" style="color:'+ratingColor(rating.value)+'">'+rating.value+'/10</span>' : '<span class="faint">—</span>')+'</td>' +
      '<td class="reqCol">'+(request ? '<span class="reqText">'+escapeHtml(request.text)+'</span><span class="reqDate">'+fmtDate(request.date)+'</span>' : '<span class="faint">—</span>')+'</td>' +
      '<td class="noteCol">'+(note ? '<span class="noteText">'+escapeHtml(note.text)+'</span>' : '<span class="faint">—</span>')+'</td>' +
    '</tr>';
  }).join('');
}

function handleRowClick(e, id){
  const sel = window.getSelection();
  if(sel && sel.toString().length>0) return;
  openPerson(id);
}

function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function copyEmail(btn, email){
  if(!email){ showToast('У участника нет email'); return; }
  try{ await navigator.clipboard.writeText(email); }catch(e){}
  btn.classList.add('copied');
  showToast('Email скопирован');
  setTimeout(()=>btn.classList.remove('copied'), 1200);
}

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove('show'), 2000);
}

/* ───── Panel ───── */
function openNewPerson(){
  CURRENT = { id:null, name:'', telegram:'', tgUsername:'', email:'', ratings:[], requests:[], notes:[], payments:[] };
  fillPanel();
  showPanel();
  document.getElementById('fName').focus();
}

function openPerson(id){
  CURRENT = PEOPLE.find(p=>p.id===id);
  if(!CURRENT) return;
  fillPanel();
  showPanel();
}

function showPanel(){
  document.getElementById('overlay').classList.add('show');
  document.getElementById('panel').classList.add('show');
  document.getElementById('histToggleBtn').classList.remove('open');
  document.getElementById('historyWrap').classList.remove('open');
  clearEditing();
}
function closePanel(){
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('panel').classList.remove('show');
  CURRENT = null;
  clearEditing();
}
function clearEditing(){
  editingEntries = {payment:null, rating:null, request:null, note:null};
  const labels = {paySubmitBtn:'Добавить', ratingSubmitBtn:'Сохранить', reqSubmitBtn:'Сохранить', noteSubmitBtn:'Сохранить'};
  Object.keys(labels).forEach(id => { const el = document.getElementById(id); if(el) el.textContent = labels[id]; });
}
function toggleHistoryMobile(){
  document.getElementById('histToggleBtn').classList.toggle('open');
  document.getElementById('historyWrap').classList.toggle('open');
}

function fillPanel(){
  clearEditing();
  const p = CURRENT;
  document.getElementById('pName').textContent = p.name || 'Новый участник';
  document.getElementById('fName').value = p.name||'';
  document.getElementById('fTelegram').value = p.telegram||'';
  document.getElementById('fEmail').value = p.email||'';
  document.getElementById('payAmount').value = 5000;

  document.getElementById('totalPaidNum').textContent = fmtMoney(sumPayments(p.payments));

  const rating = lastOf(p.ratings);
  document.getElementById('currentRatingView').innerHTML = rating
    ? '<span class="ratingNum" style="font-size:19px; color:'+ratingColor(rating.value)+'">'+rating.value+'/10</span> <span class="faint" style="font-size:12px;">от '+fmtDate(rating.date)+'</span>'
    : '<span class="faint">Оценки пока нет</span>';

  const request = lastOf(p.requests);
  document.getElementById('currentRequestView').innerHTML = request
    ? '<div style="font-weight:600; color:var(--ink);">'+escapeHtml(request.text)+'</div><div class="faint" style="font-size:12px; margin-top:4px;">от '+fmtDate(request.date)+'</div>'
    : 'Нет активного запроса';

  const note = lastOf(p.notes);
  document.getElementById('currentNoteView').innerHTML = note
    ? '<div style="font-weight:600; color:var(--ink);">'+escapeHtml(note.text)+'</div><div class="faint" style="font-size:12px; margin-top:4px;">от '+fmtDate(note.date)+'</div>'
    : 'Нет примечаний';

  document.getElementById('reqText').value = '';
  document.getElementById('noteText').value = '';

  buildRatingPicker(rating ? rating.value : 7);
  renderHistory();
  setupDatePickers();
}

const ratingPickerState = { selected: 7 };
function buildRatingPicker(selected){
  ratingPickerState.selected = selected;
  const container = document.getElementById('ratingPick');
  container.innerHTML =
    '<div class="dateDisplay" id="ratingPick_disp"><span id="ratingPick_txt">'+selected+'</span>' +
      '<svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1 1l5 5 5-5"/></svg>' +
    '</div>' +
    '<div class="ratingPop" id="ratingPick_pop"></div>';
  document.getElementById('ratingPick_disp').onclick = (e) => { e.stopPropagation(); toggleRatingPop(); };
  renderRatingPop();
}
function renderRatingPop(){
  const pop = document.getElementById('ratingPick_pop');
  let html = '';
  for(let i=10;i>=0;i--){
    html += '<div class="ratingOpt'+(i===ratingPickerState.selected?' selected':'')+'" onclick="event.stopPropagation();pickRating('+i+')">'+i+'</div>';
  }
  pop.innerHTML = html;
  pop.onclick = (e)=>e.stopPropagation();
}
function toggleRatingPop(){
  const pop = document.getElementById('ratingPick_pop');
  const willShow = !pop.classList.contains('show');
  document.querySelectorAll('.calPop,.ratingPop').forEach(el => el.classList.remove('show'));
  if(!willShow) return;
  pop.classList.remove('flip','flip-up');
  pop.classList.add('show');
  positionFloating(pop);
}
function pickRating(value){
  ratingPickerState.selected = value;
  document.getElementById('ratingPick_txt').textContent = value;
  document.getElementById('ratingPick_pop').classList.remove('show');
  renderRatingPop();
}

function renderHistory(){
  const p = CURRENT;
  const items = [];
  (p.ratings||[]).forEach(e=>items.push({type:'rating', text: e.value+'/10', ...e}));
  (p.requests||[]).forEach(e=>items.push({type:'request', text:e.text, ...e}));
  (p.notes||[]).forEach(e=>items.push({type:'note', text:e.text, ...e}));
  (p.payments||[]).forEach(e=>items.push({type:'payment', text: fmtMoney(e.amount), ...e}));
  items.sort((a,b)=> (b.date>a.date?1:b.date<a.date?-1:b.createdAt-a.createdAt));
  const el = document.getElementById('historyList');
  if(!items.length){ el.innerHTML = '<div class="histEmpty">История пока пуста</div>'; return; }
  const icons = {
    rating: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>',
    request: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 01-9 8.4A8.5 8.5 0 013 11.5 8.38 8.38 0 0112 3a8.5 8.5 0 019 8.5z"/></svg>',
    note: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>',
    payment: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>'
  };
  el.innerHTML = items.map(it =>
    '<div class="histItem">' +
      '<div class="histIcon '+it.type+'">'+icons[it.type]+'</div>' +
      '<div class="histBody">' +
        '<div class="histTop"><span class="histTitle">'+escapeHtml(it.text)+'</span><span class="histDate">'+fmtDate(it.date)+'</span></div>' +
        '<div class="histActions">' +
          '<button class="histDel" onclick="editEntry(\\''+it.type+'\\',\\''+it.entryId+'\\')">изменить</button>' +
          '<button class="histDel" onclick="deleteEntry(\\''+it.type+'\\',\\''+it.entryId+'\\')">удалить</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  ).join('');
}

function editEntry(kind, entryId){
  const p = CURRENT;
  const listName = {rating:'ratings', request:'requests', note:'notes', payment:'payments'}[kind];
  const entry = (p[listName]||[]).find(e=>e.entryId===entryId);
  if(!entry) return;
  editingEntries[kind] = entryId;
  const btnMap = {payment:'paySubmitBtn', rating:'ratingSubmitBtn', request:'reqSubmitBtn', note:'noteSubmitBtn'};
  if(kind==='payment'){
    document.getElementById('payAmount').value = entry.amount;
    setPickedDate('payDatePick', entry.date);
  } else if(kind==='rating'){
    buildRatingPicker(entry.value);
    setPickedDate('ratingDatePick', entry.date);
  } else if(kind==='request'){
    document.getElementById('reqText').value = entry.text;
    setPickedDate('reqDatePick', entry.date);
  } else if(kind==='note'){
    document.getElementById('noteText').value = entry.text;
    setPickedDate('noteDatePick', entry.date);
  }
  document.getElementById(btnMap[kind]).textContent = 'Сохранить изменения';
  document.getElementById(btnMap[kind]).scrollIntoView({behavior:'smooth', block:'center'});
}

async function scheduleFieldSave(){
  clearTimeout(saveFieldTimer);
  saveFieldTimer = setTimeout(saveFields, 500);
}

async function ensurePersonCreated(){
  if(CURRENT.id) return CURRENT.id;
  const r = await fetch('/api/community', {method:'POST', headers:authHeaders(), body: JSON.stringify({
    action:'create', name: document.getElementById('fName').value.trim()
  })});
  const d = await r.json();
  CURRENT.id = d.person.id;
  CURRENT.createdAt = d.person.createdAt;
  PEOPLE.push(CURRENT);
  return CURRENT.id;
}

async function saveFields(){
  const name = document.getElementById('fName').value.trim();
  const telegram = document.getElementById('fTelegram').value.trim();
  const email = document.getElementById('fEmail').value.trim();
  if(!CURRENT.id && !name && !telegram && !email) return;
  await ensurePersonCreated();
  Object.assign(CURRENT, {name, telegram, email});
  document.getElementById('pName').textContent = name || 'Без имени';
  await fetch('/api/community', {method:'POST', headers:authHeaders(), body: JSON.stringify({action:'update-fields', id:CURRENT.id, name, telegram, email})});
  renderTable();
}

async function deletePerson(){
  if(!CURRENT.id){ closePanel(); return; }
  if(!confirm('Удалить участника «'+(CURRENT.name||'без имени')+'» из комьюнити CRM? Это действие необратимо.')) return;
  await fetch('/api/community', {method:'POST', headers:authHeaders(), body: JSON.stringify({action:'delete', id:CURRENT.id})});
  PEOPLE = PEOPLE.filter(p=>p.id!==CURRENT.id);
  closePanel();
  renderTable();
}

async function deleteEntry(kind, entryId){
  if(!CURRENT || !CURRENT.id) return;
  const r = await fetch('/api/community', {method:'POST', headers:authHeaders(), body: JSON.stringify({action:'delete-entry', id:CURRENT.id, kind, entryId})});
  const d = await r.json();
  if(d.ok){ Object.assign(CURRENT, d.person); const idx=PEOPLE.findIndex(p=>p.id===CURRENT.id); if(idx>=0) PEOPLE[idx]=CURRENT; fillPanel(); renderTable(); }
}

async function submitPayment(){
  const amount = Number(document.getElementById('payAmount').value);
  if(!amount || amount<=0){ showToast('Укажи сумму'); return; }
  await ensurePersonCreated();
  const date = getPickedDate('payDatePick');
  const editId = editingEntries.payment;
  const body = editId
    ? {action:'edit-entry', id:CURRENT.id, kind:'payment', entryId:editId, amount, date}
    : {action:'add-payment', id:CURRENT.id, amount, date};
  const r = await fetch('/api/community', {method:'POST', headers:authHeaders(), body: JSON.stringify(body)});
  const d = await r.json();
  applyPersonUpdate(d.person);
  showToast(editId ? 'Оплата обновлена' : 'Оплата добавлена');
}

async function submitRating(){
  const value = ratingPickerState.selected;
  await ensurePersonCreated();
  const date = getPickedDate('ratingDatePick');
  const editId = editingEntries.rating;
  const body = editId
    ? {action:'edit-entry', id:CURRENT.id, kind:'rating', entryId:editId, value, date}
    : {action:'add-rating', id:CURRENT.id, value, date};
  const r = await fetch('/api/community', {method:'POST', headers:authHeaders(), body: JSON.stringify(body)});
  const d = await r.json();
  applyPersonUpdate(d.person);
  showToast(editId ? 'Оценка обновлена' : 'Оценка сохранена');
}

async function submitRequest(){
  const text = document.getElementById('reqText').value.trim();
  if(!text){ showToast('Введи текст запроса'); return; }
  await ensurePersonCreated();
  const date = getPickedDate('reqDatePick');
  const editId = editingEntries.request;
  const body = editId
    ? {action:'edit-entry', id:CURRENT.id, kind:'request', entryId:editId, text, date}
    : {action:'add-request', id:CURRENT.id, text, date};
  const r = await fetch('/api/community', {method:'POST', headers:authHeaders(), body: JSON.stringify(body)});
  const d = await r.json();
  applyPersonUpdate(d.person);
  showToast(editId ? 'Запрос обновлён' : 'Запрос сохранён');
}

async function submitNote(){
  const text = document.getElementById('noteText').value.trim();
  if(!text){ showToast('Введи текст примечания'); return; }
  await ensurePersonCreated();
  const date = getPickedDate('noteDatePick');
  const editId = editingEntries.note;
  const body = editId
    ? {action:'edit-entry', id:CURRENT.id, kind:'note', entryId:editId, text, date}
    : {action:'add-note', id:CURRENT.id, text, date};
  const r = await fetch('/api/community', {method:'POST', headers:authHeaders(), body: JSON.stringify(body)});
  const d = await r.json();
  applyPersonUpdate(d.person);
  showToast(editId ? 'Примечание обновлено' : 'Примечание сохранено');
}

function applyPersonUpdate(person){
  Object.assign(CURRENT, person);
  const idx = PEOPLE.findIndex(p=>p.id===CURRENT.id);
  if(idx>=0) PEOPLE[idx]=CURRENT; else PEOPLE.push(CURRENT);
  fillPanel();
  renderTable();
}

/* ───── Custom date picker ───── */
const RU_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const RU_DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const pickerState = {};

function todayISO(){ const d = new Date(); return d.toISOString().slice(0,10); }
function getPickedDate(containerId){ return (pickerState[containerId] && pickerState[containerId].selected) || todayISO(); }

function setupDatePickers(){
  ['payDatePick','ratingDatePick','reqDatePick','noteDatePick'].forEach(id => buildDatePicker(id));
}

function buildDatePicker(containerId){
  const container = document.getElementById(containerId);
  const today = new Date();
  const state = pickerState[containerId] = { selected: todayISO(), viewY: today.getFullYear(), viewM: today.getMonth() };
  const shortMode = (containerId === 'reqDatePick' || containerId === 'noteDatePick');
  container.innerHTML =
    '<div class="dateDisplay" id="'+containerId+'_disp">' +
      '<span id="'+containerId+'_txt">'+(shortMode ? fmtDate(state.selected) : fmtDateFull(state.selected))+'</span>' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>' +
    '</div>' +
    '<div class="calPop" id="'+containerId+'_pop"></div>';
  document.getElementById(containerId+'_disp').onclick = (e) => { e.stopPropagation(); toggleCal(containerId); };
  renderCal(containerId);
}

function positionFloating(pop){
  pop.classList.remove('flip','flip-up');
  let rect = pop.getBoundingClientRect();
  if(rect.right > window.innerWidth - 8) pop.classList.add('flip');
  if(rect.bottom > window.innerHeight - 8) pop.classList.add('flip-up');
  rect = pop.getBoundingClientRect();
  if(rect.top < 8) pop.classList.remove('flip-up');
}

function toggleCal(containerId){
  const pop = document.getElementById(containerId+'_pop');
  const willShow = !pop.classList.contains('show');
  document.querySelectorAll('.calPop,.ratingPop').forEach(el => el.classList.remove('show'));
  if(!willShow) return;
  pop.classList.add('show');
  positionFloating(pop);
}

document.addEventListener('click', () => document.querySelectorAll('.calPop,.ratingPop').forEach(el => el.classList.remove('show')));

function renderCal(containerId){
  const state = pickerState[containerId];
  const pop = document.getElementById(containerId+'_pop');
  const y = state.viewY, m = state.viewM;
  const first = new Date(y, m, 1);
  let startDow = first.getDay(); startDow = startDow===0?6:startDow-1;
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const daysInPrev = new Date(y, m, 0).getDate();
  const todayStr = todayISO();
  let cells = '';
  for(let i=startDow-1;i>=0;i--) cells += '<div class="calDay muted">'+(daysInPrev-i)+'</div>';
  for(let d=1; d<=daysInMonth; d++){
    const iso = y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    let cls = 'calDay';
    if(iso===todayStr) cls += ' today';
    if(iso===state.selected) cls += ' selected';
    cells += '<div class="'+cls+'" onclick="pickDate(\\''+containerId+'\\',\\''+iso+'\\')">'+d+'</div>';
  }
  const totalCells = startDow + daysInMonth;
  const rem = (7 - (totalCells % 7)) % 7;
  for(let d=1; d<=rem; d++) cells += '<div class="calDay muted">'+d+'</div>';

  pop.innerHTML =
    '<div class="calHead">' +
      '<button class="calNav" onclick="event.stopPropagation();navCal(\\''+containerId+'\\',-1)">‹</button>' +
      '<span class="lbl">'+RU_MONTHS[m]+' '+y+'</span>' +
      '<button class="calNav" onclick="event.stopPropagation();navCal(\\''+containerId+'\\',1)">›</button>' +
    '</div>' +
    '<div class="calGrid">' + RU_DOW.map(d=>'<div class="calDow">'+d+'</div>').join('') + cells + '</div>' +
    '<div class="calToday" onclick="event.stopPropagation();pickDate(\\''+containerId+'\\',\\''+todayStr+'\\')">Сегодня</div>';
  pop.onclick = (e)=>e.stopPropagation();
}

function navCal(containerId, dir){
  const state = pickerState[containerId];
  state.viewM += dir;
  if(state.viewM<0){ state.viewM=11; state.viewY--; }
  if(state.viewM>11){ state.viewM=0; state.viewY++; }
  renderCal(containerId);
}

function pickDate(containerId, iso){
  const state = pickerState[containerId];
  state.selected = iso;
  const shortMode = (containerId === 'reqDatePick' || containerId === 'noteDatePick');
  document.getElementById(containerId+'_txt').textContent = shortMode ? fmtDate(iso) : fmtDateFull(iso);
  document.getElementById(containerId+'_pop').classList.remove('show');
}

function setPickedDate(containerId, iso){
  const state = pickerState[containerId];
  if(!state) return;
  const d = new Date(iso+'T00:00:00');
  state.selected = iso;
  state.viewY = d.getFullYear();
  state.viewM = d.getMonth();
  const shortMode = (containerId === 'reqDatePick' || containerId === 'noteDatePick');
  document.getElementById(containerId+'_txt').textContent = shortMode ? fmtDate(iso) : fmtDateFull(iso);
  renderCal(containerId);
}
</script>
</body>
</html>`;
}

// ─── QUIZ 1 HTML/CSS/JS ─────────────────────────────────────
function getQuiz1HTML() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>AI Maturity Score — Growth Autopilot</title>
<style>
  :root{
    --violet:#7C3AED;
    --magenta:#D946EF;
    --blue:#3B82F6;
    --bg:#F6F4FC;
    --card:#FFFFFF;
    --text:#1F2937;
    --muted:#6B7280;
    --border:#E9E4F7;
    --ok:#16A34A;
    --warn:#D97706;
    --grad: linear-gradient(135deg, var(--violet), var(--magenta));
    --radius: 22px;
  }
  *{box-sizing:border-box; margin:0; padding:0;}
  html,body{height:100%;}
  body{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height:100vh;
    display:flex;
    align-items:flex-start;
    justify-content:center;
    padding:16px;
    -webkit-font-smoothing:antialiased;
  }
  .app{
    width:100%;
    max-width:460px;
    min-height:640px;
    background:var(--card);
    border-radius: var(--radius);
    overflow:hidden;
    position:relative;
    display:flex;
    flex-direction:column;
    box-shadow: 0 8px 30px rgba(124,58,237,0.08);
  }
  .screen{
    display:none;
    flex-direction:column;
    flex:1;
    padding:28px 24px 24px;
    animation: fadeIn .35s ease;
  }
  .screen.active{display:flex;}
  @keyframes fadeIn{ from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:translateY(0);} }

  .icon{ display:inline-flex; flex:none; }
  .icon svg{ display:block; }

  .brand{
    font-size:13px;
    font-weight:700;
    letter-spacing:.04em;
    color:var(--violet);
    text-transform:uppercase;
    margin-bottom:8px;
  }

  /* ---- Cover ---- */
  #screen-cover{ justify-content:center; text-align:center; }
  .cover-badge{
    width:72px; height:72px; margin:0 auto 20px;
    border-radius:20px;
    background:var(--grad);
    display:flex; align-items:center; justify-content:center;
  }
  .cover-title{ font-size:26px; font-weight:800; line-height:1.3; margin-bottom:12px; letter-spacing:-.01em; }
  .cover-sub{ font-size:15px; color:var(--muted); line-height:1.55; margin-bottom:26px; }
  .cover-points{ text-align:left; margin-bottom:28px; display:flex; flex-direction:column; gap:12px; }
  .cover-point{ display:flex; align-items:center; gap:12px; font-size:14px; color:var(--text); line-height:1.4; }
  .cover-point .dot{ flex:none; width:30px; height:30px; border-radius:10px; background:rgba(124,58,237,.10); color:var(--violet); display:flex; align-items:center; justify-content:center; }

  .btn{
    border:none; cursor:pointer;
    padding:16px 20px;
    border-radius:16px;
    font-size:16px; font-weight:700;
    font-family:inherit;
    transition:transform .15s ease, box-shadow .15s ease, opacity .15s ease;
    -webkit-tap-highlight-color: transparent;
    display:flex; align-items:center; justify-content:center; gap:8px;
    text-decoration:none;
  }
  .btn:active{ transform:scale(0.97); }
  .btn-primary{ background:var(--grad); color:#fff; box-shadow:0 8px 20px rgba(124,58,237,.28); width:100%; }
  .btn-primary:hover{ box-shadow:0 10px 26px rgba(124,58,237,.36); }
  .btn-ghost{ background:transparent; color:var(--muted); font-weight:600; font-size:14px; padding:10px; width:auto; }
  .btn:disabled{ opacity:.45; cursor:not-allowed; }

  /* ---- Progress ---- */
  .progress-wrap{ display:flex; align-items:center; gap:10px; margin-bottom:22px; }
  .progress-track{ flex:1; height:6px; border-radius:6px; background:#EDE9FE; overflow:hidden; }
  .progress-fill{ height:100%; border-radius:6px; background:var(--grad); width:0%; transition:width .4s ease; }
  .progress-label{ font-size:12px; font-weight:700; color:var(--muted); flex:none; font-variant-numeric:tabular-nums; }

  /* ---- Question ---- */
  .q-text{ font-size:20px; font-weight:800; line-height:1.35; margin-bottom:20px; letter-spacing:-.01em; }
  .options{ display:flex; flex-direction:column; gap:10px; flex:1; }
  .option{
    text-align:left;
    border:1.5px solid var(--border);
    background:#FBFAFE;
    border-radius:16px;
    padding:15px 16px;
    font-size:14.5px;
    line-height:1.4;
    font-weight:600;
    color:var(--text);
    cursor:pointer;
    transition:border-color .15s ease, background .15s ease, transform .1s ease;
  }
  .option:active{ transform:scale(0.98); }
  .option:hover{ border-color:var(--violet); background:#F5F1FE; }
  .option.selected{ border-color:var(--violet); background:linear-gradient(135deg, rgba(124,58,237,.08), rgba(217,70,239,.08)); }
  .q-footer{ display:flex; justify-content:space-between; align-items:center; margin-top:18px; min-height:38px; }

  /* ---- Analyzing ---- */
  #screen-analyzing{ justify-content:center; align-items:center; text-align:center; }
  .spinner{
    width:56px; height:56px; border-radius:50%;
    border:4px solid #EDE9FE; border-top-color:var(--violet);
    animation:spin 1s linear infinite; margin-bottom:26px;
  }
  @keyframes spin{ to{ transform:rotate(360deg); } }
  .analyze-lines{ display:flex; flex-direction:column; gap:14px; align-items:flex-start; text-align:left; }
  .analyze-line{ display:flex; align-items:center; gap:10px; font-size:14.5px; color:var(--muted); opacity:0; transform:translateX(-6px); transition:opacity .35s ease, transform .35s ease, color .2s ease; }
  .analyze-line.show{ opacity:1; transform:translateX(0); }
  .analyze-line.done{ color:var(--text); }
  .analyze-check{ flex:none; width:20px; height:20px; border-radius:50%; background:#EDE9FE; color:var(--violet); display:flex; align-items:center; justify-content:center; opacity:0; transform:scale(.5); transition:opacity .25s ease, transform .25s ease, background .25s ease, color .25s ease; }
  .analyze-line.done .analyze-check{ opacity:1; transform:scale(1); background:var(--grad); color:#fff; }

  /* ---- Form (contact gate) ---- */
  .form-title{ font-size:21px; font-weight:800; margin-bottom:8px; letter-spacing:-.01em; }
  .field{ margin-bottom:14px; }
  .field label{ display:block; font-size:12.5px; font-weight:700; color:var(--muted); margin-bottom:6px; }
  .field input{
    width:100%; padding:14px 16px; border-radius:14px;
    border:1.5px solid var(--border); background:#FBFAFE;
    font-size:15px; font-family:inherit; color:var(--text);
    transition:border-color .15s ease;
  }
  .field input:focus{ outline:none; border-color:var(--violet); }
  .field-error{ font-size:12px; color:#DC2626; margin-top:5px; display:none; }
  .field.invalid input{ border-color:#DC2626; }
  .field.invalid .field-error{ display:block; }
  .form-note{ font-size:11.5px; color:var(--muted); text-align:center; margin-top:14px; line-height:1.5; }
  .form-actions{ display:flex; flex-direction:column; gap:8px; margin-top:4px; }

  /* ---- Result ---- */
  #screen-result{ padding-top:22px; }
  .result-scroll{ overflow-y:auto; flex:1; -webkit-overflow-scrolling:touch; padding-bottom:6px; }
  .result-title{ font-size:20px; font-weight:800; text-align:center; margin-bottom:2px; letter-spacing:-.01em; }
  .result-tier{ text-align:center; font-size:13px; font-weight:700; color:var(--violet); text-transform:uppercase; letter-spacing:.04em; margin-bottom:18px; }

  .gauge-wrap{ display:flex; justify-content:center; margin-bottom:22px; position:relative; }
  .gauge-num{ position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:34px; font-weight:800; font-variant-numeric:tabular-nums; }
  .gauge-num span{ font-size:16px; font-weight:700; color:var(--muted); }

  .card-block{ background:#FBFAFE; border:1px solid #EFEAFB; border-radius:18px; padding:18px; margin-bottom:16px; }
  .card-title{ font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); margin-bottom:14px; }

  .radar-wrap{ display:flex; justify-content:center; }

  .bar-row{ display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
  .bar-row:last-child{ margin-bottom:0; }
  .bar-label{ display:flex; justify-content:space-between; font-size:13px; font-weight:700; }
  .bar-label span:last-child{ font-variant-numeric:tabular-nums; }
  .bar-track{ height:10px; border-radius:8px; background:#EDE9FE; overflow:hidden; }
  .bar-fill{ height:100%; border-radius:8px; width:0%; transition:width 1.1s cubic-bezier(.22,.9,.3,1); }
  .bar-fill.you{ background:var(--grad); }
  .bar-fill.avg{ background:#C7D2FE; }

  .rec-text p{ font-size:14px; line-height:1.6; color:var(--text); margin-bottom:10px; }
  .rec-text p:last-child{ margin-bottom:0; }

  .sw-grid{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .sw-col-title{ font-size:12px; font-weight:800; margin-bottom:10px; }
  .sw-item{ font-size:12.5px; line-height:1.4; margin-bottom:10px; display:flex; align-items:center; gap:8px; }
  .sw-item:last-child{ margin-bottom:0; }

  .cta-block{ text-align:center; margin-top:6px; }
  .cta-title{ font-size:17px; font-weight:800; margin-bottom:6px; letter-spacing:-.01em; }
  .cta-sub{ font-size:13.5px; color:var(--muted); margin-bottom:16px; line-height:1.5; }
  .cta-actions{ display:flex; flex-direction:column; gap:8px; }

  @media (max-width:380px){
    .sw-grid{ grid-template-columns:1fr; }
  }
</style>
</head>
<body>
<div class="app">

  <!-- 1. Cover -->
  <div class="screen active" id="screen-cover">
    <div class="brand">Growth Autopilot</div>
    <div class="cover-badge">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 6"/><polyline points="15 6 21 6 21 12"/></svg>
    </div>
    <div class="cover-title">Узнайте свой AI Maturity Score</div>
    <div class="cover-sub">10 вопросов — и вы увидите, насколько ваш маркетинг уже работает на автопилоте, а где вы всё ещё тратите время руками.</div>
    <div class="cover-points">
      <div class="cover-point"><span class="dot"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span> Персональный процент зрелости + сравнение со средним по рынку</div>
      <div class="cover-point"><span class="dot"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z"/></svg></span> Радар сильных и слабых зон: контент, лидген, ресерч, автоматизация</div>
      <div class="cover-point"><span class="dot"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg></span> Конкретные следующие шаги под вашу ситуацию</div>
    </div>
    <button class="btn btn-primary" onclick="Quiz.start()">Пройти тест (3 минуты)</button>
  </div>

  <!-- 2. Question -->
  <div class="screen" id="screen-question">
    <div class="progress-wrap">
      <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
      <div class="progress-label" id="progressLabel">1/10</div>
    </div>
    <div class="q-text" id="qText"></div>
    <div class="options" id="qOptions"></div>
    <div class="q-footer">
      <button class="btn btn-ghost" id="qBack" onclick="Quiz.back()">← Назад</button>
      <div></div>
    </div>
  </div>

  <!-- 3. Analyzing -->
  <div class="screen" id="screen-analyzing">
    <div class="spinner"></div>
    <div class="analyze-lines" id="analyzeLines">
      <div class="analyze-line" data-i="0"><span class="analyze-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg></span><span>Считаем ваши ответы</span></div>
      <div class="analyze-line" data-i="1"><span class="analyze-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg></span><span>Сравниваем с 500+ компаниями в нашей базе</span></div>
      <div class="analyze-line" data-i="2"><span class="analyze-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg></span><span>Формируем персональные рекомендации</span></div>
    </div>
  </div>

  <!-- 4. Contact form (gate before result) -->
  <div class="screen" id="screen-form">
    <div class="brand">Growth Autopilot</div>
    <div class="form-title">Ваш результат готов</div>
    <div class="cover-sub" style="margin-bottom:22px;">Оставьте имя и контакт — сразу покажем ваш AI Maturity Score и разбор по 4 направлениям.</div>

    <div class="field" id="fieldName">
      <label for="inpName">Имя</label>
      <input id="inpName" type="text" placeholder="Как к вам обращаться?" autocomplete="name">
      <div class="field-error">Введите имя (минимум 2 символа)</div>
    </div>
    <div class="field" id="fieldContact">
      <label for="inpContact">Telegram или email</label>
      <input id="inpContact" type="text" placeholder="@username или email@mail.com" autocomplete="email">
      <div class="field-error">Введите корректный @telegram или email</div>
    </div>

    <div class="form-actions">
      <button class="btn btn-primary" id="submitBtn" onclick="Quiz.submitForm()">Показать результат</button>
      <button class="btn btn-ghost" onclick="Quiz.formBack()">← Назад к тесту</button>
    </div>
    <div class="form-note">Это демо-версия квиза: данные формы никуда не сохраняются и не отправляются на сервер — только имитация в рамках воркшопа.</div>
  </div>

  <!-- 5. Result -->
  <div class="screen" id="screen-result">
    <div class="result-scroll">
      <div class="result-title">Ваш AI Maturity Score готов</div>
      <div class="result-tier" id="resultTierName"></div>

      <div class="gauge-wrap">
        <svg id="gaugeSvg" width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="78" fill="none" stroke="#EDE9FE" stroke-width="14"/>
          <circle id="gaugeArc" cx="90" cy="90" r="78" fill="none" stroke="url(#gaugeGrad)" stroke-width="14" stroke-linecap="round" stroke-dasharray="490" stroke-dashoffset="490" transform="rotate(-90 90 90)"/>
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#7C3AED"/>
              <stop offset="100%" stop-color="#D946EF"/>
            </linearGradient>
          </defs>
        </svg>
        <div class="gauge-num"><span id="gaugeNum">0</span><span>%</span></div>
      </div>

      <div class="card-block">
        <div class="card-title">Профиль по 4 направлениям</div>
        <div class="radar-wrap"><svg id="radarSvg" width="300" height="220" viewBox="0 0 300 220"></svg></div>
      </div>

      <div class="card-block">
        <div class="card-title">Вы vs рынок</div>
        <div class="bar-row">
          <div class="bar-label"><span>Вы</span><span id="barYouLabel">0%</span></div>
          <div class="bar-track"><div class="bar-fill you" id="barYou"></div></div>
        </div>
        <div class="bar-row">
          <div class="bar-label"><span>Средний по рынку</span><span>58%</span></div>
          <div class="bar-track"><div class="bar-fill avg" id="barAvg"></div></div>
        </div>
      </div>

      <div class="card-block">
        <div class="card-title">Что это значит для вас</div>
        <div class="rec-text" id="recText"></div>
      </div>

      <div class="card-block">
        <div class="sw-grid">
          <div>
            <div class="sw-col-title">Что уже хорошо</div>
            <div id="swGood"></div>
          </div>
          <div>
            <div class="sw-col-title">Что стоит подтянуть</div>
            <div id="swBad"></div>
          </div>
        </div>
      </div>

      <div class="cta-block">
        <div class="cta-title">Хотите полный разбор?</div>
        <div class="cta-sub">Расширенный PDF-отчёт с рекомендациями под вашу нишу — у нас в Telegram, бесплатно.</div>
        <div class="cta-actions">
          <a class="btn btn-primary" href="https://t.me/oleg_ezhkov" target="_blank" rel="noopener">Получить в Telegram</a>
          <button class="btn btn-ghost" onclick="Quiz.restart()">Пройти ещё раз</button>
        </div>
      </div>
    </div>
  </div>

</div>

<script>
(function(){

var QUESTIONS = [
  { text: "Как сейчас у вас устроен контент?", options: [
    { text:"Пишу/снимаю всё сам вручную", scores:{content:5,leadgen:0,research:0,automation:0} },
    { text:"Есть SMM-щик/команда, делают руками", scores:{content:10,leadgen:0,research:0,automation:5} },
    { text:"Иногда использую ChatGPT для идей/текстов", scores:{content:15,leadgen:0,research:5,automation:10} },
    { text:"Есть отлаженная система генерации через ИИ", scores:{content:25,leadgen:0,research:15,automation:20} }
  ]},
  { text: "Как вы находите темы и следите за конкурентами?", options: [
    { text:"Придумываю из головы / смотрю ленту", scores:{content:0,leadgen:0,research:5,automation:0} },
    { text:"Раз в месяц смотрю, что у конкурентов заходит", scores:{content:5,leadgen:0,research:10,automation:5} },
    { text:"Слежу за трендами вручную регулярно", scores:{content:10,leadgen:0,research:15,automation:10} },
    { text:"Есть агент/сервис, который сам присылает тренды и разборы конкурентов", scores:{content:15,leadgen:5,research:25,automation:20} }
  ]},
  { text: "Что происходит с человеком после того, как он на вас подписался?", options: [
    { text:"Ничего специального, просто видит посты", scores:{content:0,leadgen:0,research:0,automation:0} },
    { text:"Иногда зову в личку/на созвон вручную", scores:{content:5,leadgen:10,research:0,automation:5} },
    { text:"Есть лид-магнит, но дальше тишина", scores:{content:10,leadgen:15,research:0,automation:10} },
    { text:"Есть выстроенная воронка/мини-курс с прогревом и автоматической продажей", scores:{content:15,leadgen:25,research:5,automation:20} }
  ]},
  { text: "Сколько часов в неделю у вас/команды уходит на маркетинг руками?", options: [
    { text:"Больше 15 часов", scores:{content:0,leadgen:0,research:0,automation:0} },
    { text:"8–15 часов", scores:{content:5,leadgen:5,research:5,automation:5} },
    { text:"3–8 часов", scores:{content:10,leadgen:10,research:10,automation:10} },
    { text:"Меньше 3 часов, остальное работает само", scores:{content:20,leadgen:15,research:15,automation:25} }
  ]},
  { text: "Как вы обрабатываете входящие заявки?", options: [
    { text:"Отвечаю сам, когда доходят руки", scores:{content:0,leadgen:0,research:0,automation:0} },
    { text:"Есть менеджер, отвечает вручную", scores:{content:0,leadgen:5,research:0,automation:0} },
    { text:"Есть шаблоны ответов, но отправляем вручную", scores:{content:0,leadgen:10,research:0,automation:5} },
    { text:"Есть чат-бот, который сам квалифицирует и передаёт менеджеру", scores:{content:0,leadgen:20,research:5,automation:15} }
  ]},
  { text: "Как устроена аналитика по рекламе и воронке?", options: [
    { text:"Не смотрю цифры, просто трачу бюджет", scores:{content:0,leadgen:0,research:0,automation:0} },
    { text:"Смотрю базовые метрики раз в месяц", scores:{content:0,leadgen:5,research:5,automation:0} },
    { text:"Веду таблицу с ключевыми показателями вручную", scores:{content:0,leadgen:10,research:10,automation:5} },
    { text:"Есть дашборд, который сам собирает данные и присылает отчёт", scores:{content:5,leadgen:15,research:20,automation:15} }
  ]},
  { text: "Как устроены рассылки (email/Telegram)?", options: [
    { text:"Рассылок нет вообще", scores:{content:0,leadgen:0,research:0,automation:0} },
    { text:"Изредка отправляю вручную из личного аккаунта", scores:{content:5,leadgen:5,research:0,automation:0} },
    { text:"Есть сервис рассылок, но письма готовлю и шлю вручную", scores:{content:10,leadgen:10,research:0,automation:5} },
    { text:"Есть цепочки писем, которые запускаются и работают сами", scores:{content:15,leadgen:20,research:5,automation:20} }
  ]},
  { text: "Кто закрывает вопросы и возражения до покупки?", options: [
    { text:"Я лично, в переписке, каждый раз заново", scores:{content:0,leadgen:0,research:0,automation:0} },
    { text:"Менеджер отвечает по памяти, своими словами", scores:{content:0,leadgen:5,research:0,automation:0} },
    { text:"Есть база ответов, менеджер копирует вручную", scores:{content:5,leadgen:10,research:5,automation:5} },
    { text:"ИИ-ассистент сам отвечает на большинство типовых вопросов", scores:{content:10,leadgen:20,research:10,automation:20} }
  ]},
  { text: "Как часто обновляется контент-стратегия и план публикаций?", options: [
    { text:"Публикую, когда придёт вдохновение", scores:{content:0,leadgen:0,research:0,automation:0} },
    { text:"Есть примерный план на неделю, часто съезжает", scores:{content:5,leadgen:0,research:5,automation:0} },
    { text:"Планирую на месяц вперёд и слежу за результатами", scores:{content:10,leadgen:5,research:10,automation:5} },
    { text:"Стратегия строится на данных и обновляется по тому, что заходит", scores:{content:20,leadgen:5,research:15,automation:15} }
  ]},
  { text: "Что сейчас болит сильнее всего?", pain:true, options: [
    { text:"Не хватает заявок/лидов", key:"leadgen" },
    { text:"Трачу слишком много времени", key:"automation" },
    { text:"Хаос, ничего не систематизировано", key:"system" },
    { text:"Не понимаю, что вообще делать с ИИ", key:"learning" }
  ]}
];

var CATS = ["content","leadgen","research","automation"];
var CAT_LABEL = { content:"Контент", leadgen:"Лидген/Воронки", research:"Ресерч/Аналитика", automation:"Автоматизация" };

var MAX_BY_CAT = {};
CATS.forEach(function(cat){
  var max = 0;
  QUESTIONS.forEach(function(q){
    if (q.pain) return;
    var best = 0;
    q.options.forEach(function(o){ if (o.scores[cat] > best) best = o.scores[cat]; });
    max += best;
  });
  MAX_BY_CAT[cat] = max;
});
var MAX_TOTAL = CATS.reduce(function(s,c){ return s + MAX_BY_CAT[c]; }, 0);

var TIERS = [
  { key:"manual", min:0, max:25, name:"Ручной режим" },
  { key:"partial", min:26, max:50, name:"Частичная автоматизация" },
  { key:"advanced", min:51, max:75, name:"Продвинутый уровень" },
  { key:"autopilot", min:76, max:100, name:"Автопилот" }
];

var PAIN_LABEL = { leadgen:"Лидген", automation:"Автоматизация", system:"Система", learning:"Обучение/внедрение" };

var ICON_CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="8 12.5 11 15.5 16 9"/></svg>';
var ICON_UP = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="9.5 14.5 14.5 9.5"/><polyline points="10.5 9.5 14.5 9.5 14.5 13.5"/></svg>';

var RECS = {
  manual: {
    leadgen: ["У вас старт с той же точки, что и у большинства — ручной контент есть, а системы, которая сама доводит подписчика до заявки, пока нет.","Прежде чем масштабировать трафик, стоит собрать простую воронку: лид-магнит → авто-прогрев → предложение. Даже базовая связка поднимает число заявок без роста бюджета на рекламу.","Начните с одного сценария — например, мини-курс или чат-бот с прогревом на 3-5 сообщений. Это займёт меньше времени, чем кажется, и сразу даст измеримый результат."],
    automation: ["Сейчас почти всё держится на ручном труде — это нормальная стартовая точка, но именно она съедает больше всего часов в неделю.","Первый шаг — не автоматизировать всё сразу, а найти 1-2 самые повторяющиеся задачи (например, генерацию постов или сбор трендов) и снять их с себя через ИИ-инструменты.","Освободившееся время лучше вложить в стратегию и продажи — то, что пока нельзя делегировать роботу."],
    system: ["Контент и продвижение существуют, но без единой системы — каждое действие требует ручного решения, что делать дальше.","Хаос на этом этапе — это не провал, а признак того, что процессы ещё не описаны. Даже простая таблица с шагами «пост → лид → воронка → продажа» уже наведёт порядок.","Дальше эти шаги можно один за другим переводить на автопилот — начиная с самого частого и самого утомительного."],
    learning: ["Вы там, где ИИ пока воспринимается как что-то отдельное, а не как часть ежедневной работы — и это самая частая точка старта.","Начните с малого: используйте ИИ для одной конкретной задачи в неделю — черновик поста, анализ конкурента, план контента. Так формируется навык без перегрузки.","Через 2-3 недели такой практики вы увидите, какие процессы стоит доверить агентам полностью, а не по одной задаче."]
  },
  partial: {
    leadgen: ["У вас уже есть контакт с аудиторией и первые точки касания — не хватает воронки, которая доводит человека до заявки без вашего участия.","Лид-магнит или мини-курс с автоматическим прогревом закроет именно этот разрыв: люди будут двигаться к покупке, даже пока вы заняты другим.","Следующий логичный шаг — подключить сценарий дожима для тех, кто не купил сразу, вместо того чтобы просто «забывать» о тёплых лидах."],
    automation: ["Часть рутины уже снята с ваших рук — хороший знак. Но заметная доля времени всё ещё уходит на ручные действия, которые можно передать ИИ.","Следующий уровень — не точечные инструменты, а связка агентов: один собирает данные, второй готовит черновик, третий публикует. Это экономит не минуты, а часы в неделю.","Приоритет — процессы, которые повторяются чаще всего: именно там автоматизация окупается быстрее всего."],
    system: ["База выстроена — есть контент, есть какая-то воронка, но между блоками много ручных склеек, из-за чего система работает рывками.","Стоит один раз описать весь путь клиента от первого касания до оплаты и найти 2-3 узких места, где вы вручную «дотягиваете» процесс.","Автоматизация именно этих точек даст максимальный эффект — не нужно перестраивать всё, достаточно закрыть слабые звенья."],
    learning: ["Вы уже пробуете ИИ-инструменты точечно — это хороший этап, но пока каждое применение требует отдельного решения «а надо ли здесь ИИ».","Полезно свести уже опробованные инструменты в понятный список: что для контента, что для ресерча, что для воронки — и использовать их системно, а не от случая к случаю.","Дальше можно перейти от разовых промптов к постоянным сценариям — агентам, которые работают по расписанию, а не по вашей команде каждый раз."]
  },
  advanced: {
    leadgen: ["Вы дальше 70% рынка: воронка уже приносит заявки, контент работает на привлечение, а не существует сам по себе.","Чтобы вырасти ещё, имеет смысл персонализировать сценарии под сегменты аудитории — не одна воронка для всех, а несколько веток под разные боли и уровни готовности к покупке.","Также стоит подключить аналитику по каждому шагу воронки, чтобы видеть, где именно теряются лиды, и точечно улучшать конверсию."],
    automation: ["Большая часть рутины уже автоматизирована — вы близки к тому, чтобы маркетинг работал по большей части без вашего ежедневного участия.","Оставшиеся ручные точки обычно самые «неудобные» для автоматизации — например, персональная переписка или сложная аналитика. Именно там имеет смысл внедрять более гибких ИИ-агентов.","Итоговая цель — перейти от набора отдельных автоматизаций к единой системе, где агенты передают задачи друг другу без вашего участия."],
    system: ["Система в целом выстроена и работает — контент, лидген и аналитика связаны между собой, а не существуют отдельно.","На этом уровне главная задача — не сломать систему при масштабировании: добавляйте новые каналы и форматы так, чтобы они встраивались в существующие процессы, а не создавали новый хаос.","Регулярный аудит воронки раз в квартал поможет вовремя находить узкие места, которые появляются по мере роста."],
    learning: ["Вы уже уверенно используете ИИ как часть работы, а не как эксперимент — это заметно выделяет вас на фоне большинства.","Следующий шаг — не «использовать ИИ больше», а «использовать ИИ точнее»: выстраивать агентов под конкретные бизнес-метрики, а не только под удобство.","Имеет смысл обучить команду тем же принципам, чтобы система не зависела от одного человека, который «разбирается в ИИ»."]
  },
  autopilot: {
    leadgen: ["Ваша воронка уже работает почти без ручного участия — редкий результат, признание заслуженно.","Осталось убрать последние ручные точки: например, ручную квалификацию лидов или персональные ответы, которые ещё не переданы агентам.","На этом уровне рост чаще приходит не от новых инструментов, а от точной аналитики — A/B-тестов сценариев и сегментации аудитории."],
    automation: ["Вы в режиме автопилота: большая часть маркетинга работает без ежедневного вмешательства — это уровень, на который многие только нацеливаются.","Последние ручные точки — обычно стратегические решения и нестандартные ситуации, которые и не стоит полностью автоматизировать.","Дальше имеет смысл сфокусироваться на том, что автоматизация не может дать — на стратегии роста и новых направлениях."],
    system: ["У вас выстроена целостная система: контент, лидген, ресерч и автоматизация работают друг на друга, а не по отдельности.","На этом уровне ценность растёт не от добавления новых инструментов, а от точной настройки уже существующих процессов под данные.","Стоит подумать о том, как задокументировать систему, чтобы она не зависела от одного человека и масштабировалась вместе с командой."],
    learning: ["Вы не просто используете ИИ — вы выстроили вокруг него систему, и это уже уровень, о котором говорят как о конкурентном преимуществе.","Осталось убрать последние ручные решения — точки, где вы по привычке делаете что-то сами, хотя агент справился бы не хуже.","Дальше есть смысл делиться этим опытом с командой или партнёрами — система такого уровня редко строится в одиночку."]
  }
};

var state = {
  step: 0, // index into QUESTIONS
  answers: [], // {scores?, key?}
  result: null
};

function $(id){ return document.getElementById(id); }

function showScreen(id){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  $(id).classList.add('active');
}

var Quiz = {
  start: function(){
    state.step = 0;
    state.answers = [];
    showScreen('screen-question');
    renderQuestion();
  },

  back: function(){
    if (state.step === 0){
      showScreen('screen-cover');
      return;
    }
    state.step -= 1;
    state.answers.pop();
    renderQuestion();
  },

  formBack: function(){
    state.step = QUESTIONS.length - 1;
    showScreen('screen-question');
    renderQuestion();
  },

  submitForm: function(){
    var name = $('inpName').value.trim();
    var contact = $('inpContact').value.trim();
    var nameOk = name.length >= 2;
    var contactOk = /^@?[a-zA-Z0-9_]{4,}$/.test(contact) || /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(contact);

    $('fieldName').classList.toggle('invalid', !nameOk);
    $('fieldContact').classList.toggle('invalid', !contactOk);
    if (!nameOk || !contactOk) return;

    var btn = $('submitBtn');
    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Считаем результат…';

    // Демо: никакого реального запроса, данные нигде не сохраняются
    setTimeout(function(){
      btn.disabled = false;
      btn.textContent = original;
      computeResult();
      renderResult();
      showScreen('screen-result');
      animateResult();
    }, 900);
  },

  restart: function(){
    state.step = 0;
    state.answers = [];
    state.result = null;
    $('inpName').value = '';
    $('inpContact').value = '';
    $('fieldName').classList.remove('invalid');
    $('fieldContact').classList.remove('invalid');
    showScreen('screen-cover');
  }
};

function renderQuestion(){
  var q = QUESTIONS[state.step];
  var total = QUESTIONS.length;
  $('progressLabel').textContent = (state.step+1) + '/' + total;
  $('progressFill').style.width = Math.round(((state.step) / total) * 100) + '%';
  $('qText').textContent = q.text;

  var wrap = $('qOptions');
  wrap.innerHTML = '';
  q.options.forEach(function(opt, i){
    var btn = document.createElement('button');
    btn.className = 'option';
    btn.textContent = opt.text;
    btn.onclick = function(){ selectOption(i); };
    wrap.appendChild(btn);
  });
}

function selectOption(i){
  var q = QUESTIONS[state.step];
  var opt = q.options[i];
  var opts = document.querySelectorAll('#qOptions .option');
  opts.forEach(function(el){ el.classList.remove('selected'); });
  opts[i].classList.add('selected');

  state.answers[state.step] = q.pain ? { key: opt.key } : { scores: opt.scores };

  setTimeout(function(){
    if (state.step < QUESTIONS.length - 1){
      state.step += 1;
      renderQuestion();
      $('progressFill').style.width = Math.round((state.step / QUESTIONS.length) * 100) + '%';
    } else {
      $('progressFill').style.width = '100%';
      startAnalyzing();
    }
  }, 220);
}

function startAnalyzing(){
  showScreen('screen-analyzing');
  var lines = document.querySelectorAll('.analyze-line');
  lines.forEach(function(el){ el.classList.remove('show','done'); });
  lines.forEach(function(el, i){
    setTimeout(function(){ el.classList.add('show'); }, i * 800);
    setTimeout(function(){ el.classList.add('done'); }, i * 800 + 500);
  });
  setTimeout(function(){
    showScreen('screen-form');
  }, lines.length * 800 + 600);
}

function computeResult(){
  var totals = { content:0, leadgen:0, research:0, automation:0 };
  var painKey = 'system';
  state.answers.forEach(function(a){
    if (a.scores){
      CATS.forEach(function(c){ totals[c] += a.scores[c] || 0; });
    } else if (a.key){
      painKey = a.key;
    }
  });
  var totalScore = CATS.reduce(function(s,c){ return s + totals[c]; }, 0);
  var pct = Math.round((totalScore / MAX_TOTAL) * 100);
  pct = Math.max(0, Math.min(100, pct));

  var tier = TIERS.find(function(t){ return pct >= t.min && pct <= t.max; }) || TIERS[0];

  var axisPct = {};
  CATS.forEach(function(c){ axisPct[c] = Math.round((totals[c] / MAX_BY_CAT[c]) * 100); });

  var ranked = CATS.slice().sort(function(a,b){ return axisPct[b] - axisPct[a]; });
  var good = ranked.slice(0,2);
  var bad = ranked.slice(2);

  state.result = { totals: totals, pct: pct, tier: tier, painKey: painKey, axisPct: axisPct, good: good, bad: bad };
}

function renderResult(){
  var r = state.result;
  $('resultTierName').textContent = r.tier.name;
  $('gaugeNum').textContent = '0';

  var recParagraphs = RECS[r.tier.key][r.painKey];
  $('recText').innerHTML = recParagraphs.map(function(p){ return '<p>' + p + '</p>'; }).join('');

  var goodHtml = r.good.map(function(c){ return '<div class="sw-item">' + ICON_CHECK + '<span>' + CAT_LABEL[c] + '</span></div>'; }).join('');
  var badHtml = r.bad.map(function(c){ return '<div class="sw-item">' + ICON_UP + '<span>' + CAT_LABEL[c] + '</span></div>'; }).join('');
  $('swGood').innerHTML = goodHtml;
  $('swBad').innerHTML = badHtml;

  renderRadarStatic(r.axisPct);
}

function animateResult(){
  var r = state.result;

  // Gauge count-up + arc
  var circumference = 490;
  var start = performance.now();
  var duration = 1400;
  function tickGauge(now){
    var t = Math.min(1, (now - start) / duration);
    var eased = 1 - Math.pow(1 - t, 3);
    var val = Math.round(eased * r.pct);
    $('gaugeNum').textContent = val;
    var offset = circumference - (eased * r.pct / 100) * circumference;
    $('gaugeArc').setAttribute('stroke-dashoffset', offset);
    if (t < 1) requestAnimationFrame(tickGauge);
  }
  requestAnimationFrame(tickGauge);

  // Radar animated draw
  animateRadar(r.axisPct);

  // Bars
  setTimeout(function(){
    $('barYouLabel').textContent = r.pct + '%';
    $('barYou').style.width = r.pct + '%';
    $('barAvg').style.width = '58%';
  }, 150);
}

// ---- Radar chart (custom SVG) ----
var RADAR_CENTER = { x:150, y:110 };
var RADAR_R = 62;
var RADAR_AXES = [
  { key:'content', angle:-90, label:'Контент' },
  { key:'leadgen', angle:0, label:'Лидген' },
  { key:'research', angle:90, label:'Ресерч' },
  { key:'automation', angle:180, label:'Автомат.' }
];

function radarPoint(angleDeg, radius){
  var rad = angleDeg * Math.PI / 180;
  return { x: RADAR_CENTER.x + radius * Math.cos(rad), y: RADAR_CENTER.y + radius * Math.sin(rad) };
}

function renderRadarStatic(axisPct){
  var svg = $('radarSvg');
  var parts = [];

  // grid rings
  [0.25, 0.5, 0.75, 1].forEach(function(f){
    var pts = RADAR_AXES.map(function(a){ var p = radarPoint(a.angle, RADAR_R * f); return p.x + ',' + p.y; }).join(' ');
    parts.push('<polygon points="' + pts + '" fill="none" stroke="#EDE9FE" stroke-width="1"/>');
  });

  // axis lines + labels
  RADAR_AXES.forEach(function(a){
    var p = radarPoint(a.angle, RADAR_R);
    parts.push('<line x1="' + RADAR_CENTER.x + '" y1="' + RADAR_CENTER.y + '" x2="' + p.x + '" y2="' + p.y + '" stroke="#EDE9FE" stroke-width="1"/>');
    var lp = radarPoint(a.angle, RADAR_R + 18);
    var anchor = a.angle === 0 ? 'start' : (a.angle === 180 ? 'end' : 'middle');
    parts.push('<text x="' + lp.x + '" y="' + lp.y + '" font-size="11" font-weight="700" fill="#6B7280" text-anchor="' + anchor + '" dominant-baseline="middle">' + a.label + '</text>');
  });

  parts.push('<polygon id="radarPoly" points="" fill="url(#radarFill)" stroke="#7C3AED" stroke-width="2" stroke-linejoin="round" opacity="0"/>');
  parts.push('<defs><radialGradient id="radarFill" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#D946EF" stop-opacity="0.35"/><stop offset="100%" stop-color="#7C3AED" stop-opacity="0.12"/></radialGradient></defs>');

  svg.innerHTML = parts.join('');
}

function animateRadar(axisPct){
  var poly = $('radarPoly');
  if (!poly) return;
  poly.style.transition = 'opacity .4s ease';
  poly.style.opacity = '1';

  var start = performance.now();
  var duration = 1200;
  function tick(now){
    var t = Math.min(1, (now - start) / duration);
    var eased = 1 - Math.pow(1 - t, 3);
    var pts = RADAR_AXES.map(function(a){
      var val = (axisPct[a.key] || 0) * eased;
      var p = radarPoint(a.angle, RADAR_R * (val/100));
      return p.x + ',' + p.y;
    }).join(' ');
    poly.setAttribute('points', pts);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

window.Quiz = Quiz;
})();
</script>
</body>
</html>`;
}

// ─── QUIZ 2 HTML: разбор лендинга от эксперта (реальный ИИ-анализ) ────
function getQuiz2HTML() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Разбор лендинга от эксперта — Growth Autopilot</title>
<style>
  :root{
    --ink:#12101C;
    --ink-soft:#3D3A4E;
    --muted:#8B87A0;
    --line:#E7E3F3;
    --surface:#FFFFFF;
    --sunken:#F7F5FC;
    --accent1:#6D28D9;
    --accent2:#EC4899;
    --accent3:#F59E0B;
    --grad: linear-gradient(120deg, var(--accent1), var(--accent2) 65%, var(--accent3));
    --ok:#0F9D6B;
    --warn:#D97706;
    --bad:#E11D48;
    --radius:26px;
  }
  *{box-sizing:border-box; margin:0; padding:0;}
  html,body{height:100%;}
  body{
    font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:var(--ink);
    min-height:100vh;
    display:flex;
    align-items:flex-start;
    justify-content:center;
    padding:26px 16px;
    -webkit-font-smoothing:antialiased;
    background:
      radial-gradient(560px 420px at 12% -6%, rgba(109,40,217,.16), transparent 60%),
      radial-gradient(520px 420px at 108% 18%, rgba(236,72,153,.14), transparent 60%),
      radial-gradient(600px 500px at 50% 118%, rgba(245,158,11,.10), transparent 60%),
      #0E0B17;
    background-attachment:fixed;
  }
  .app{
    width:100%;
    max-width:440px;
    min-height:660px;
    background:var(--surface);
    border-radius:var(--radius);
    overflow:hidden;
    position:relative;
    display:flex;
    flex-direction:column;
    box-shadow:0 30px 70px rgba(10,6,30,.45), 0 2px 0 rgba(255,255,255,.4) inset;
  }
  .screen{
    display:none;
    flex-direction:column;
    flex:1;
    padding:30px 26px 26px;
    animation:fadeIn .4s cubic-bezier(.22,.9,.3,1);
  }
  .screen.active{display:flex;}
  @keyframes fadeIn{ from{opacity:0; transform:translateY(10px);} to{opacity:1; transform:translateY(0);} }

  .eyebrow{
    display:inline-flex; align-items:center; gap:7px;
    font-size:11.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase;
    color:var(--accent1); margin-bottom:14px;
  }
  .eyebrow-dot{ width:6px; height:6px; border-radius:50%; background:var(--grad); }

  /* ---- Cover ---- */
  #screen-cover{ justify-content:center; text-align:center; padding-top:36px; }
  .cover-orb{
    width:84px; height:84px; margin:0 auto 24px;
    border-radius:26px;
    background:var(--grad);
    display:flex; align-items:center; justify-content:center;
    position:relative;
    box-shadow:0 18px 34px rgba(109,40,217,.35);
    transform:rotate(-6deg);
  }
  .cover-orb svg{ transform:rotate(6deg); }
  .cover-title{ font-size:28px; font-weight:800; line-height:1.22; margin-bottom:14px; letter-spacing:-.02em; }
  .cover-title em{ font-style:normal; background:var(--grad); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .cover-sub{ font-size:15px; color:var(--ink-soft); line-height:1.6; margin-bottom:28px; }
  .cover-points{ text-align:left; margin-bottom:8px; display:flex; flex-direction:column; gap:4px; }
  .cover-point{ display:flex; align-items:flex-start; gap:14px; font-size:14px; color:var(--ink); line-height:1.45; padding:12px 4px; border-bottom:1px solid var(--line); }
  .cover-point:last-child{ border-bottom:none; }
  .cover-point .num{ flex:none; width:26px; height:26px; border-radius:9px; background:var(--sunken); color:var(--accent1); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; margin-top:1px; }

  .btn{
    border:none; cursor:pointer;
    padding:17px 20px;
    border-radius:17px;
    font-size:15.5px; font-weight:700;
    font-family:inherit;
    transition:transform .15s ease, box-shadow .15s ease, opacity .15s ease, filter .15s ease;
    -webkit-tap-highlight-color:transparent;
    display:flex; align-items:center; justify-content:center; gap:8px;
    text-decoration:none;
  }
  .btn:active{ transform:scale(0.96); }
  .btn-primary{ background:var(--grad); color:#fff; box-shadow:0 14px 28px rgba(109,40,217,.30); width:100%; margin-top:22px; }
  .btn-primary:hover{ filter:brightness(1.05); }
  .btn-ghost{ background:var(--sunken); color:var(--ink-soft); font-weight:700; font-size:14px; padding:12px 16px; width:auto; }
  .btn-ghost:hover{ background:var(--line); }
  .btn:disabled{ opacity:.45; cursor:not-allowed; }

  /* ---- Progress ---- */
  .progress-wrap{ display:flex; align-items:center; gap:10px; margin-bottom:26px; }
  .progress-track{ flex:1; height:5px; border-radius:6px; background:var(--sunken); overflow:hidden; }
  .progress-fill{ height:100%; border-radius:6px; background:var(--grad); width:0%; transition:width .45s cubic-bezier(.22,.9,.3,1); }
  .progress-label{ font-size:12px; font-weight:800; color:var(--muted); flex:none; font-variant-numeric:tabular-nums; }

  /* ---- Step (form question) ---- */
  .step-scroll{ overflow-y:auto; flex:1; -webkit-overflow-scrolling:touch; }
  .q-text{ font-size:22px; font-weight:800; line-height:1.3; margin-bottom:10px; letter-spacing:-.015em; }
  .q-hint{ font-size:13.5px; color:var(--muted); line-height:1.55; margin-bottom:20px; }
  .field{ margin-bottom:14px; }
  .field input, .field textarea{
    width:100%; padding:16px 17px; border-radius:16px;
    border:1.5px solid var(--line); background:var(--sunken);
    font-size:15.5px; font-family:inherit; color:var(--ink);
    transition:border-color .15s ease, background .15s ease;
    resize:vertical;
  }
  .field textarea{ min-height:100px; line-height:1.5; }
  .field input:focus, .field textarea:focus{ outline:none; border-color:var(--accent1); background:#fff; }
  .field-error{ font-size:12px; color:var(--bad); margin-top:7px; display:none; font-weight:600; }
  .field.invalid input, .field.invalid textarea{ border-color:var(--bad); }
  .field.invalid .field-error{ display:block; }

  .q-footer{ display:flex; flex-direction:column; gap:10px; margin-top:20px; }
  .q-footer-row{ display:flex; justify-content:center; }
  .q-footer .btn-ghost{ align-self:center; padding:8px 14px; }

  /* ---- Analyzing ---- */
  #screen-analyzing{ justify-content:center; align-items:center; text-align:center; }
  .pulse-ring{ width:74px; height:74px; margin-bottom:30px; position:relative; }
  .pulse-ring i{ position:absolute; inset:0; border-radius:50%; border:3px solid transparent; border-top-color:var(--accent1); border-right-color:var(--accent2); animation:spin 1.1s linear infinite; }
  .pulse-ring i:nth-child(2){ inset:10px; border-top-color:var(--accent2); border-right-color:var(--accent3); animation-duration:.85s; animation-direction:reverse; opacity:.7; }
  @keyframes spin{ to{ transform:rotate(360deg); } }
  .analyze-lines{ display:flex; flex-direction:column; gap:16px; align-items:flex-start; text-align:left; }
  .analyze-line{ display:flex; align-items:center; gap:12px; font-size:14.5px; color:var(--muted); opacity:0; transform:translateX(-8px); transition:opacity .4s ease, transform .4s ease, color .2s ease; }
  .analyze-line.show{ opacity:1; transform:translateX(0); }
  .analyze-line.done{ color:var(--ink); font-weight:600; }
  .analyze-check{ flex:none; width:22px; height:22px; border-radius:50%; background:var(--sunken); color:var(--accent1); display:flex; align-items:center; justify-content:center; opacity:0; transform:scale(.5); transition:opacity .25s ease, transform .25s ease, background .25s ease, color .25s ease; }
  .analyze-line.done .analyze-check{ opacity:1; transform:scale(1); background:var(--grad); color:#fff; }

  /* ---- Contact form (gate before result) ---- */
  .form-title{ font-size:23px; font-weight:800; margin-bottom:8px; letter-spacing:-.015em; }
  .form-note{ font-size:11.5px; color:var(--muted); text-align:center; margin-top:16px; line-height:1.55; }

  /* ---- Result ---- */
  #screen-result{ padding-top:28px; }
  .result-scroll{ overflow-y:auto; flex:1; -webkit-overflow-scrolling:touch; padding-bottom:6px; }
  .result-title{ font-size:22px; font-weight:800; margin-bottom:4px; letter-spacing:-.015em; }
  .result-sub{ font-size:13px; color:var(--muted); margin-bottom:20px; }

  .score-pill{
    display:inline-flex; align-items:baseline; gap:5px;
    background:var(--grad); color:#fff; border-radius:14px;
    padding:8px 14px; font-weight:800; font-size:14px; margin-bottom:16px;
  }
  .score-pill b{ font-size:19px; }
  .score-pill span{ font-size:12px; opacity:.85; font-weight:700; }

  .verdict-block{ background:var(--sunken); border-radius:20px; padding:18px 19px; margin-bottom:20px; font-size:14.5px; line-height:1.6; color:var(--ink); border-left:4px solid var(--accent1); }

  .chart-block{ background:var(--surface); border:1.5px solid var(--line); border-radius:20px; padding:20px 19px; margin-bottom:16px; }
  .chart-title{ font-size:12.5px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); margin-bottom:16px; }
  .chart-row{ margin-bottom:16px; }
  .chart-row:last-child{ margin-bottom:0; }
  .chart-row-head{ display:flex; justify-content:space-between; align-items:baseline; margin-bottom:7px; }
  .chart-row-label{ font-size:13.5px; font-weight:700; color:var(--ink); }
  .chart-row-score{ font-size:13px; font-weight:800; font-variant-numeric:tabular-nums; }
  .chart-track{ height:9px; border-radius:8px; background:var(--sunken); overflow:hidden; }
  .chart-fill{ height:100%; border-radius:8px; width:0%; transition:width 1s cubic-bezier(.22,.9,.3,1); }
  .chart-fill.good{ background:var(--ok); }
  .chart-fill.warning{ background:var(--warn); }
  .chart-fill.bad{ background:var(--bad); }

  .detail-card{ border-radius:18px; padding:16px 17px; margin-bottom:12px; border:1.5px solid var(--line); }
  .detail-head{ display:flex; align-items:center; gap:10px; margin-bottom:6px; }
  .detail-icon{ flex:none; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .detail-card.good .detail-icon{ background:rgba(15,157,107,.12); color:var(--ok); }
  .detail-card.warning .detail-icon{ background:rgba(217,119,6,.12); color:var(--warn); }
  .detail-card.bad .detail-icon{ background:rgba(225,29,72,.12); color:var(--bad); }
  .detail-title{ font-size:14px; font-weight:800; }
  .detail-text{ font-size:13.5px; line-height:1.55; color:var(--ink-soft); padding-left:34px; }

  .steps-block{ background:var(--ink); color:#fff; border-radius:20px; padding:20px 19px; margin-bottom:20px; margin-top:16px; }
  .steps-title{ font-size:12.5px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:rgba(255,255,255,.55); margin-bottom:14px; }
  .step-row{ display:flex; gap:12px; align-items:flex-start; font-size:14px; line-height:1.55; margin-bottom:12px; }
  .step-row:last-child{ margin-bottom:0; }
  .step-num{ flex:none; width:24px; height:24px; border-radius:8px; background:var(--grad); color:#12101C; font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; font-variant-numeric:tabular-nums; }

  .cta-block{ text-align:center; margin-top:4px; }
  .cta-title{ font-size:18px; font-weight:800; margin-bottom:6px; letter-spacing:-.01em; }
  .cta-sub{ font-size:13.5px; color:var(--muted); margin-bottom:6px; line-height:1.55; }
  .cta-actions{ display:flex; flex-direction:column; gap:10px; margin-top:14px; }
  .cta-actions .btn-primary{ margin-top:0; }
</style>
</head>
<body>
<div class="app">

  <!-- 1. Cover -->
  <div class="screen active" id="screen-cover">
    <div class="cover-orb">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="21" y2="21"/></svg>
    </div>
    <div class="cover-title">Твой лендинг глазами <em>эксперта по воронкам</em></div>
    <div class="cover-sub">5 коротких вопросов о сайте — и получишь честный разбор, что мешает конвертить и что исправить в первую очередь.</div>
    <div class="cover-points">
      <div class="cover-point"><span class="num">1</span> Реальный анализ вашей страницы, а не общий шаблон</div>
      <div class="cover-point"><span class="num">2</span> Оценка по 4 параметрам на шкале от 1 до 10</div>
      <div class="cover-point"><span class="num">3</span> Конкретные шаги, что улучшить в первую очередь</div>
    </div>
    <button class="btn btn-primary" onclick="Quiz2.start()">Начать разбор (~1 минута)</button>
  </div>

  <!-- 2. Step form (5 targeted questions) -->
  <div class="screen" id="screen-step">
    <div class="progress-wrap">
      <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
      <div class="progress-label" id="progressLabel">1/5</div>
    </div>
    <div class="step-scroll">
      <div class="q-text" id="qText"></div>
      <div class="q-hint" id="qHint"></div>
      <div class="field" id="fieldStep">
        <input id="inpStepInput" type="text" style="display:none;">
        <textarea id="inpStepTextarea" style="display:none;"></textarea>
        <div class="field-error">Заполните поле, чтобы продолжить</div>
      </div>
    </div>
    <div class="q-footer">
      <button class="btn btn-primary" style="margin-top:0;" onclick="Quiz2.stepNext()">Далее</button>
      <div class="q-footer-row" id="stepBackRow">
        <button class="btn btn-ghost" id="stepBack" onclick="Quiz2.stepBack()">← Назад</button>
      </div>
    </div>
  </div>

  <!-- 3. Analyzing -->
  <div class="screen" id="screen-analyzing">
    <div class="pulse-ring"><i></i><i></i></div>
    <div class="analyze-lines" id="analyzeLines">
      <div class="analyze-line" data-i="0"><span class="analyze-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg></span><span>Забираем страницу по ссылке</span></div>
      <div class="analyze-line" data-i="1"><span class="analyze-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg></span><span>Изучаем оффер, доверие и призыв к действию</span></div>
      <div class="analyze-line" data-i="2"><span class="analyze-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg></span><span>Формируем разбор от эксперта</span></div>
    </div>
  </div>

  <!-- 4. Contact form (gate before result) -->
  <div class="screen" id="screen-form">
    <div class="eyebrow"><span class="eyebrow-dot"></span>Разбор почти готов</div>
    <div class="form-title">Куда показать результат?</div>
    <div class="q-hint" style="margin-bottom:22px;">Оставьте имя и контакт — сразу откроем разбор вашего лендинга с оценкой по параметрам.</div>

    <div class="field" id="fieldName">
      <input id="inpName" type="text" placeholder="Как к вам обращаться?" autocomplete="name">
      <div class="field-error">Введите имя (минимум 2 символа)</div>
    </div>
    <div class="field" id="fieldContact">
      <input id="inpContact" type="text" placeholder="@username в Telegram или email" autocomplete="email">
      <div class="field-error">Введите корректный @telegram или email</div>
    </div>

    <button class="btn btn-primary" id="submitBtn" onclick="Quiz2.submitForm()">Показать разбор</button>
    <div class="q-footer-row" style="margin-top:10px;"><button class="btn btn-ghost" onclick="Quiz2.formBack()">← Назад</button></div>
    <div class="form-note">Это демо-версия квиза: данные формы никуда не сохраняются и не отправляются на сервер — только имитация в рамках воркшопа.</div>
  </div>

  <!-- 5. Result -->
  <div class="screen" id="screen-result">
    <div class="result-scroll">
      <div class="eyebrow"><span class="eyebrow-dot"></span>AI-анализ от Максима Ильина</div>
      <div class="result-title">Разбор лендинга готов</div>
      <div class="result-sub" id="resultUrl"></div>

      <div class="score-pill"><b id="scorePillNum">0</b><span>/ 10 общая оценка</span></div>

      <div class="verdict-block" id="verdictText"></div>

      <div class="chart-block">
        <div class="chart-title">Оценка по параметрам</div>
        <div id="chartRows"></div>
      </div>

      <div id="resultCards"></div>

      <div class="steps-block">
        <div class="steps-title">Что сделать в первую очередь</div>
        <div id="nextSteps"></div>
      </div>

      <div class="cta-block">
        <div class="cta-title">Хотите подробную консультацию?</div>
        <div class="cta-sub">Разберём вашу воронку целиком и составим план роста конверсии — бесплатно, в Telegram.</div>
        <div class="cta-actions">
          <a class="btn btn-primary" href="https://t.me/oleg_ezhkov" target="_blank" rel="noopener">Получить консультацию в Telegram</a>
          <button class="btn btn-ghost" style="align-self:center;" onclick="Quiz2.restart()">Разобрать ещё один сайт</button>
        </div>
      </div>
    </div>
  </div>

</div>

<script>
(function(){

var STATUS_META = {
  good: { cls: 'good', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg>' },
  warning: { cls: 'warning', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2z"/><line x1="12" y1="9" x2="12" y2="14"/><circle cx="12" cy="17.5" r=".6" fill="currentColor" stroke="none"/></svg>' },
  bad: { cls: 'bad', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>' }
};

var STATUS_FALLBACK_SCORE = { good: 8, warning: 5, bad: 3 };

// Локальная копия канонического ответа — второй уровень fallback на случай,
// если сам запрос к нашему API не дошёл (сеть отвалилась у зрителя на эфире).
var LOCAL_FALLBACK = {
  verdict: "Сайт сейчас выглядит неплохо, но теряет часть заявок на переходе от интереса к действию — оффер размыт, а доверие почти ничем не подкреплено.",
  score: 5,
  blocks: [
    { title: "Оффер", status: "warning", score: 6, text: "Непонятно за 3 секунды, что именно вы предлагаете и кому это нужно прямо сейчас." },
    { title: "Доверие / соц. доказательства", status: "bad", score: 3, text: "На странице почти нет отзывов, кейсов и цифр — читателю не на что опереться." },
    { title: "Призыв к действию", status: "warning", score: 5, text: "Кнопка есть, но формулировка нейтральная и не создаёт ощущения срочности." },
    { title: "Что происходит после лендинга", status: "bad", score: 4, text: "Не описано, что человек получит сразу после заявки." }
  ],
  next_steps: [
    "Переписать первый экран: конкретная выгода + для кого + что нужно сделать",
    "Добавить 2-3 живых кейса или отзыва с цифрами рядом с оффером",
    "Прописать понятный следующий шаг сразу после заявки"
  ]
};

var STEPS = [
  {
    key: "url",
    text: "На какой сайт или лендинг посмотреть?",
    hint: "Вставьте прямую ссылку на страницу, куда ведёте трафик.",
    type: "input",
    placeholder: "https://example.com",
    minLen: 4
  },
  {
    key: "product",
    text: "Что именно продаёте на этой странице?",
    hint: "Продукт, услуга, курс — коротко, в двух-трёх словах.",
    type: "input",
    placeholder: "Например: онлайн-курс по продажам",
    minLen: 2
  },
  {
    key: "traffic",
    text: "Откуда идёт трафик на страницу?",
    hint: "Реклама, Reels, рассылка, органика — источник влияет на ожидания аудитории.",
    type: "input",
    placeholder: "Например: реклама в Reels и Telegram-каналы",
    minLen: 2
  },
  {
    key: "desired_action",
    text: "Что должно произойти после того, как человек зашёл на страницу?",
    hint: "Опишите ожидаемое действие — заявка, покупка, запись на созвон.",
    type: "textarea",
    placeholder: "Например: должен оставить заявку на бесплатную консультацию",
    minLen: 6
  },
  {
    key: "metrics",
    text: "Знаете цифры конверсии? Если да — укажите",
    hint: "Необязательно. Если не знаете — оставьте пустым, разбор не будет их выдумывать.",
    type: "input",
    placeholder: "Например: 500 переходов, 8 заявок за месяц",
    minLen: 0
  }
];

function $(id){ return document.getElementById(id); }

function showScreen(id){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  $(id).classList.add('active');
}

function setInvalid(fieldId, invalid){
  var el = $(fieldId);
  if (invalid) el.classList.add('invalid'); else el.classList.remove('invalid');
}

function validEmailOrTg(v){
  v = v.trim();
  if (v.indexOf('@') === 0 && v.length > 2) return true;
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v);
}

var state = {
  step: 0,
  answers: {},
  analyzeReady: null
};

function renderStep(){
  var q = STEPS[state.step];
  $('progressLabel').textContent = (state.step + 1) + '/' + STEPS.length;
  $('progressFill').style.width = Math.round(((state.step + 1) / STEPS.length) * 100) + '%';
  $('qText').textContent = q.text;
  $('qHint').textContent = q.hint;

  var input = $('inpStepInput');
  var textarea = $('inpStepTextarea');
  setInvalid('fieldStep', false);

  if (q.type === 'textarea') {
    input.style.display = 'none';
    textarea.style.display = 'block';
    textarea.placeholder = q.placeholder;
    textarea.value = state.answers[q.key] || '';
  } else {
    textarea.style.display = 'none';
    input.style.display = 'block';
    input.placeholder = q.placeholder;
    input.value = state.answers[q.key] || '';
  }

  $('stepBackRow').style.display = state.step === 0 ? 'none' : 'flex';
}

function currentStepValue(){
  var q = STEPS[state.step];
  return (q.type === 'textarea' ? $('inpStepTextarea').value : $('inpStepInput').value).trim();
}

var Quiz2 = {
  start: function(){
    state.step = 0;
    renderStep();
    showScreen('screen-step');
  },

  stepBack: function(){
    if (state.step === 0){ showScreen('screen-cover'); return; }
    state.answers[STEPS[state.step].key] = currentStepValue();
    state.step -= 1;
    renderStep();
  },

  stepNext: function(){
    var q = STEPS[state.step];
    var val = currentStepValue();
    if (val.length < q.minLen) {
      setInvalid('fieldStep', true);
      return;
    }
    state.answers[q.key] = val;

    if (state.step < STEPS.length - 1) {
      state.step += 1;
      renderStep();
      return;
    }
    Quiz2.runAnalysis();
  },

  runAnalysis: function(){
    showScreen('screen-analyzing');

    var lines = document.querySelectorAll('.analyze-line');
    lines.forEach(function(el){ el.classList.remove('show','done'); });
    var delays = [200, 900, 1700];
    lines.forEach(function(el, i){
      setTimeout(function(){ el.classList.add('show'); }, delays[i] || 0);
      setTimeout(function(){ el.classList.add('done'); }, (delays[i] || 0) + 500);
    });

    var situation = 'Продукт: ' + state.answers.product +
      '. Источник трафика: ' + state.answers.traffic +
      '. Ожидаемое действие после захода на страницу: ' + state.answers.desired_action + '.';

    state.analyzeReady = fetch('/api/quiz2-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: state.answers.url, situation: situation, metrics: state.answers.metrics || '' })
    }).then(function(res){
      if (!res.ok) throw new Error('bad response');
      return res.json();
    }).catch(function(){
      return LOCAL_FALLBACK;
    });

    var minDelay = new Promise(function(resolve){ setTimeout(resolve, 2300); });
    Promise.all([state.analyzeReady, minDelay]).then(function(){
      showScreen('screen-form');
    });
  },

  formBack: function(){
    showScreen('screen-step');
    state.step = STEPS.length - 1;
    renderStep();
  },

  submitForm: function(){
    var name = $('inpName').value.trim();
    var contact = $('inpContact').value.trim();
    var nameOk = name.length >= 2;
    var contactOk = validEmailOrTg(contact);
    setInvalid('fieldName', !nameOk);
    setInvalid('fieldContact', !contactOk);
    if (!nameOk || !contactOk) return;

    $('submitBtn').disabled = true;
    $('submitBtn').textContent = 'Готовим разбор…';

    Promise.resolve(state.analyzeReady).then(function(data){
      $('submitBtn').disabled = false;
      $('submitBtn').textContent = 'Показать разбор';
      renderResult(data || LOCAL_FALLBACK);
      showScreen('screen-result');
    });
  },

  restart: function(){
    state.step = 0;
    state.answers = {};
    state.analyzeReady = null;
    $('inpName').value = '';
    $('inpContact').value = '';
    setInvalid('fieldName', false);
    setInvalid('fieldContact', false);
    showScreen('screen-cover');
  }
};

function renderResult(data){
  var score = Math.max(1, Math.min(10, Math.round(Number(data.score) || 5)));

  $('resultUrl').textContent = state.answers.url || '';
  $('verdictText').textContent = data.verdict || '';
  $('scorePillNum').textContent = '0';
  animateNumber($('scorePillNum'), 0, score, 900);

  var blocks = Array.isArray(data.blocks) ? data.blocks : [];

  var chartHtml = '';
  blocks.forEach(function(b){
    var meta = STATUS_META[b.status] || STATUS_META.warning;
    var bScore = Math.max(1, Math.min(10, Math.round(Number(b.score) || STATUS_FALLBACK_SCORE[meta.cls] || 5)));
    chartHtml += '<div class="chart-row">' +
      '<div class="chart-row-head"><span class="chart-row-label">' + escapeHtml(b.title || '') + '</span>' +
      '<span class="chart-row-score" style="color:var(--' + (meta.cls === 'good' ? 'ok' : meta.cls) + ')">' + bScore + '/10</span></div>' +
      '<div class="chart-track"><div class="chart-fill ' + meta.cls + '" data-w="' + (bScore * 10) + '"></div></div>' +
      '</div>';
  });
  $('chartRows').innerHTML = chartHtml;
  requestAnimationFrame(function(){
    document.querySelectorAll('.chart-fill').forEach(function(el){
      el.style.width = el.getAttribute('data-w') + '%';
    });
  });

  var cardsHtml = '';
  blocks.forEach(function(b){
    var meta = STATUS_META[b.status] || STATUS_META.warning;
    cardsHtml += '<div class="detail-card ' + meta.cls + '">' +
      '<div class="detail-head"><div class="detail-icon">' + meta.icon + '</div>' +
      '<div class="detail-title">' + escapeHtml(b.title || '') + '</div></div>' +
      '<div class="detail-text">' + escapeHtml(b.text || '') + '</div>' +
      '</div>';
  });
  $('resultCards').innerHTML = cardsHtml;

  var stepsHtml = '';
  var steps = Array.isArray(data.next_steps) ? data.next_steps : [];
  steps.forEach(function(step, i){
    stepsHtml += '<div class="step-row"><div class="step-num">' + (i + 1) + '</div><div>' + escapeHtml(step) + '</div></div>';
  });
  $('nextSteps').innerHTML = stepsHtml;
}

function animateNumber(el, from, to, duration){
  var start = performance.now();
  function tick(now){
    var t = Math.min(1, (now - start) / duration);
    var eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function escapeHtml(str){
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.Quiz2 = Quiz2;
})();
</script>
</body>
</html>`;
}

// ─── QUIZ 3 HTML: ДИАЛОГ С НУТРИЦИОЛОГОМ ──────────────────────────
function getQuiz3HTML() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Диалог с нутрициологом — Growth Autopilot</title>
<style>
  :root{
    --moss:#2F4A38;
    --moss-light:#4C7357;
    --sand:#F6F1E7;
    --card:#FFFFFF;
    --line:#E7DFCE;
    --text:#22281F;
    --muted:#6E7568;
    --clay:#BE7A4B;
    --clay-light:#E4A876;
    --good:#3F7D5C;
    --good-bg:#EEF4EE;
    --warn:#A8762A;
    --warn-bg:#FAF2E3;
    --bad:#AE5039;
    --bad-bg:#FAECE7;
    --grad: linear-gradient(135deg, var(--moss), var(--moss-light));
    --radius: 20px;
    --shadow: 0 10px 30px rgba(47,74,56,.10);
  }
  *{box-sizing:border-box; margin:0; padding:0;}
  html,body{height:100%;}
  body{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--sand);
    background-image: radial-gradient(circle at 12% 8%, rgba(190,122,75,.07), transparent 42%), radial-gradient(circle at 88% 92%, rgba(47,74,56,.08), transparent 40%);
    color: var(--text);
    height:100%;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:16px;
  }
  .app{
    width:100%;
    max-width:460px;
    height:min(760px, 100dvh - 32px);
    background:var(--card);
    border-radius: var(--radius);
    overflow:hidden;
    position:relative;
    display:flex;
    flex-direction:column;
    box-shadow: var(--shadow);
    border:1px solid var(--line);
  }
  .screen{
    display:none;
    flex-direction:column;
    flex:1;
    min-height:0;
    padding:26px 22px 20px;
    animation: fadeIn .35s ease;
  }
  .screen.active{display:flex;}
  @keyframes fadeIn{ from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:translateY(0);} }

  .brand{
    font-size:11.5px;
    font-weight:700;
    letter-spacing:.09em;
    color:var(--clay);
    text-transform:uppercase;
    margin-bottom:10px;
  }

  svg.ic{ display:block; flex:none; }

  /* ---- Cover ---- */
  #screen-cover{ justify-content:center; text-align:center; }
  .cover-badge{
    width:64px; height:64px; margin:0 auto 22px;
    border-radius:18px;
    background:var(--grad);
    display:flex; align-items:center; justify-content:center;
    color:#fff;
    box-shadow: var(--shadow);
  }
  .cover-title{ font-family:Georgia,'Iowan Old Style','Palatino Linotype',serif; font-size:26px; font-weight:600; line-height:1.28; margin-bottom:12px; letter-spacing:-.01em; }
  .cover-sub{ font-size:14.5px; color:var(--muted); line-height:1.55; margin-bottom:28px; }
  .cover-points{ text-align:left; margin-bottom:30px; display:flex; flex-direction:column; gap:13px; }
  .cover-point{ display:flex; align-items:flex-start; gap:12px; font-size:13.5px; color:var(--text); line-height:1.45; }
  .cover-point .dot{ flex:none; width:26px; height:26px; border-radius:50%; background:var(--good-bg); color:var(--moss); display:flex; align-items:center; justify-content:center; }
  .cover-author{ font-size:12px; color:var(--muted); margin-top:18px; }
  .cover-author b{ color:var(--text); font-weight:700; }

  .btn{
    border:none; cursor:pointer;
    padding:15px 20px;
    border-radius:15px;
    font-size:15.5px; font-weight:700;
    font-family:inherit;
    transition:transform .15s ease, box-shadow .15s ease, opacity .15s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .btn:active{ transform:scale(0.97); }
  .btn-primary{ background:var(--grad); color:#fff; box-shadow:0 10px 22px rgba(47,74,56,.24); width:100%; }
  .btn-primary:hover{ box-shadow:0 12px 26px rgba(47,74,56,.3); }
  .btn-ghost{ background:transparent; color:var(--muted); font-weight:600; font-size:13.5px; padding:10px; border:1.5px solid var(--line); border-radius:14px; }
  .btn:disabled{ opacity:.5; cursor:not-allowed; }

  /* ---- Q1 goal buttons ---- */
  .goal-list{ display:flex; flex-direction:column; gap:11px; margin-top:8px; }
  .goal-btn{
    display:flex; align-items:center; justify-content:space-between; gap:10px;
    text-align:left; background:var(--sand); border:1.5px solid var(--line); border-radius:15px;
    padding:15px 17px; font-size:14.5px; font-weight:700; color:var(--text); cursor:pointer;
    transition:border-color .15s ease, background .15s ease, transform .15s ease;
  }
  .goal-btn .arrow{ color:var(--muted); transition:transform .15s ease, color .15s ease; }
  .goal-btn:active{ transform:scale(0.98); }
  .goal-btn:hover{ border-color:var(--moss-light); background:var(--good-bg); }
  .goal-btn:hover .arrow{ color:var(--moss); transform:translateX(2px); }

  /* ---- Chat ---- */
  #screen-chat{ padding-bottom:16px; }
  .qprogress{ display:flex; gap:6px; margin-bottom:16px; flex:none; }
  .qprogress-dot{ flex:1; height:3px; border-radius:2px; background:var(--line); }
  .qprogress-dot.done{ background:var(--grad); }

  .chat-scroll{ flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; gap:10px; padding:2px 2px 8px; }
  .chat-scroll::-webkit-scrollbar{ width:4px; }
  .chat-scroll::-webkit-scrollbar-thumb{ background:var(--line); border-radius:4px; }

  .bubble-row{ display:flex; align-items:flex-end; gap:8px; animation:fadeIn .3s ease; }
  .bubble-row.user{ justify-content:flex-end; }
  .bubble-avatar{ flex:none; width:26px; height:26px; border-radius:50%; background:var(--grad); color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; font-family:Georgia,serif; }
  .bubble{ max-width:76%; padding:11px 14px; border-radius:16px; font-size:14px; line-height:1.5; }
  .bubble-ai{ background:var(--sand); border:1px solid var(--line); border-bottom-left-radius:4px; }
  .bubble-user{ background:var(--grad); color:#fff; border-bottom-right-radius:4px; }
  .bubble-note{ background:var(--bad-bg); color:var(--bad); border:1px solid rgba(174,80,57,.22); border-bottom-left-radius:4px; font-size:12.5px; }
  .typing-row{ display:flex; align-items:flex-end; gap:8px; }
  .typing{ display:flex; gap:4px; padding:13px 15px; background:var(--sand); border:1px solid var(--line); border-radius:16px; border-bottom-left-radius:4px; }
  .typing span{ width:5px; height:5px; border-radius:50%; background:var(--moss-light); opacity:.4; animation:typingBounce 1s infinite ease-in-out; }
  .typing span:nth-child(2){ animation-delay:.15s; }
  .typing span:nth-child(3){ animation-delay:.3s; }
  @keyframes typingBounce{ 0%,60%,100%{ transform:translateY(0); opacity:.4; } 30%{ transform:translateY(-4px); opacity:1; } }

  /* ---- Input bar: text <-> voice merged into one shell + one action button ---- */
  .chat-inputbar{ display:flex; align-items:flex-end; gap:8px; margin-top:14px; flex:none; }
  .inputbar-shell{
    flex:1; min-width:0; border-radius:16px; border:1.5px solid var(--line); background:var(--sand);
    transition:border-color .15s ease;
  }
  .inputbar-shell:focus-within{ border-color:var(--moss-light); }
  .inputbar-text{
    display:block; width:100%; border:none; background:transparent; outline:none;
    padding:13px 15px; font-size:14.5px; font-family:inherit; color:var(--text);
    resize:none; min-height:46px; max-height:120px; line-height:1.4;
  }
  .inputbar-text.hidden{ display:none; }
  .inputbar-voice{ display:none; align-items:center; gap:12px; padding:12px 15px; min-height:46px; }
  .inputbar-voice.active{ display:flex; }
  .voice-wave{ display:flex; align-items:center; gap:3px; height:22px; flex:none; }
  .voice-wave span{ width:3px; border-radius:2px; background:var(--clay); height:5px; opacity:.55; }
  .voice-wave.live span{ animation:wave 0.9s infinite ease-in-out; opacity:1; }
  .voice-wave span:nth-child(1){ animation-delay:0s; } .voice-wave span:nth-child(2){ animation-delay:.1s; }
  .voice-wave span:nth-child(3){ animation-delay:.2s; } .voice-wave span:nth-child(4){ animation-delay:.3s; }
  .voice-wave span:nth-child(5){ animation-delay:.15s; } .voice-wave span:nth-child(6){ animation-delay:.05s; }
  .voice-wave span:nth-child(7){ animation-delay:.25s; }
  @keyframes wave{ 0%,100%{ height:5px; } 50%{ height:20px; } }
  .voice-live-status{ font-size:13px; color:var(--muted); font-weight:600; }

  .inputbar-action{
    flex:none; width:46px; height:46px; border-radius:14px; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    background:var(--sand); border:1.5px solid var(--line); color:var(--muted);
    transition:background .15s ease, border-color .15s ease, color .15s ease, transform .15s ease, box-shadow .15s ease;
  }
  .inputbar-action:active{ transform:scale(0.94); }
  .inputbar-action.is-send{ background:var(--grad); border-color:transparent; color:#fff; box-shadow:0 8px 18px rgba(47,74,56,.24); }
  .inputbar-action.is-recording{ background:var(--clay); border-color:transparent; color:#fff; animation:micPulse 1.4s infinite; }
  @keyframes micPulse{ 0%{ box-shadow:0 0 0 0 rgba(190,122,75,.4);} 70%{ box-shadow:0 0 0 14px rgba(190,122,75,0);} 100%{ box-shadow:0 0 0 0 rgba(190,122,75,0);} }
  .inputbar-action:disabled{ opacity:.5; cursor:not-allowed; }

  .voice-fallback{ font-size:12px; color:var(--bad); margin-top:8px; display:none; flex:none; }
  .voice-fallback.show{ display:block; }

  /* ---- Analyzing ---- */
  #screen-analyzing{ justify-content:center; align-items:center; text-align:center; }
  .spinner-ring{ margin-bottom:26px; }
  .spinner-ring circle{ transform-origin:center; }
  .analyze-lines{ display:flex; flex-direction:column; gap:14px; align-items:flex-start; text-align:left; }
  .analyze-line{ display:flex; align-items:center; gap:10px; font-size:14px; color:var(--muted); opacity:0; transform:translateX(-6px); transition:opacity .35s ease, transform .35s ease, color .2s ease; }
  .analyze-line.show{ opacity:1; transform:translateX(0); }
  .analyze-line.done{ color:var(--text); }
  .analyze-check{ flex:none; width:20px; height:20px; border-radius:50%; background:var(--good-bg); color:var(--moss); display:flex; align-items:center; justify-content:center; opacity:0; transform:scale(.5); transition:opacity .25s ease, transform .25s ease, background .25s ease, color .25s ease; }
  .analyze-line.done .analyze-check{ opacity:1; transform:scale(1); background:var(--grad); color:#fff; }

  /* ---- Form (contact, hard gate) ---- */
  .form-scroll{ overflow-y:auto; flex:1; -webkit-overflow-scrolling:touch; }
  .field{ margin-bottom:14px; }
  .field label{ display:block; font-size:12px; font-weight:700; color:var(--muted); margin-bottom:6px; }
  .field input, .field textarea{
    width:100%; padding:13px 15px; border-radius:14px;
    border:1.5px solid var(--line); background:var(--sand);
    font-size:14.5px; font-family:inherit; color:var(--text);
    transition:border-color .15s ease;
    resize:vertical;
  }
  .field input:focus, .field textarea:focus{ outline:none; border-color:var(--moss-light); }
  .field-error{ font-size:11.5px; color:var(--bad); margin-top:5px; display:none; }
  .field.invalid input, .field.invalid textarea{ border-color:var(--bad); }
  .field.invalid .field-error{ display:block; }
  .form-note{ font-size:11px; color:var(--muted); text-align:center; margin-top:14px; line-height:1.5; }

  /* ---- Result: premium editorial layout ---- */
  #screen-result{ padding-top:22px; }
  .result-scroll{ overflow-y:auto; flex:1; -webkit-overflow-scrolling:touch; padding-bottom:6px; }
  .result-eyebrow{ font-size:11.5px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--clay); text-align:center; margin-bottom:6px; }
  .result-title{ font-family:Georgia,'Iowan Old Style','Palatino Linotype',serif; font-size:23px; font-weight:600; text-align:center; margin-bottom:20px; letter-spacing:-.01em; }

  .score-card{ background:var(--grad); border-radius:18px; padding:18px 20px; margin-bottom:16px; color:#fff; display:flex; align-items:center; gap:16px; }
  .score-num{ font-family:Georgia,serif; font-size:34px; font-weight:700; line-height:1; flex:none; }
  .score-num span{ font-size:15px; font-weight:600; opacity:.75; }
  .score-meter{ flex:1; }
  .score-tag{ font-size:13px; font-weight:700; margin-bottom:8px; }
  .score-track{ height:6px; border-radius:4px; background:rgba(255,255,255,.25); overflow:hidden; }
  .score-fill{ height:100%; border-radius:4px; background:#fff; width:0%; transition:width 1s cubic-bezier(.22,.9,.3,1); }

  .verdict-block{
    background:var(--sand); border-left:3px solid var(--clay); border-radius:0 14px 14px 0;
    padding:15px 17px; margin-bottom:18px; font-family:Georgia,'Iowan Old Style',serif; font-style:italic;
    font-size:14.5px; line-height:1.6; color:var(--text);
  }

  .result-cards{ display:flex; flex-direction:column; gap:10px; margin-bottom:18px; }
  .result-card{ border:1.5px solid var(--line); border-left-width:3px; border-radius:14px; padding:14px 16px; background:var(--card); }
  .result-card.good{ border-left-color:var(--good); }
  .result-card.warning{ border-left-color:var(--warn); }
  .result-card.bad{ border-left-color:var(--bad); }
  .result-card-head{ display:flex; align-items:center; gap:8px; margin-bottom:5px; }
  .result-card-icon{ flex:none; width:20px; height:20px; display:flex; align-items:center; justify-content:center; }
  .result-card.good .result-card-icon{ color:var(--good); }
  .result-card.warning .result-card-icon{ color:var(--warn); }
  .result-card.bad .result-card-icon{ color:var(--bad); }
  .result-card-title{ font-size:13.5px; font-weight:800; }
  .result-card-text{ font-size:13px; line-height:1.5; color:var(--muted); }

  .steps-block{ background:var(--sand); border:1px solid var(--line); border-radius:16px; padding:17px; margin-bottom:18px; }
  .steps-title{ font-size:11.5px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:var(--muted); margin-bottom:13px; }
  .step-row{ display:flex; gap:11px; align-items:flex-start; font-size:13.5px; line-height:1.5; margin-bottom:11px; }
  .step-row:last-child{ margin-bottom:0; }
  .step-icon{ flex:none; width:20px; height:20px; color:var(--moss); margin-top:1px; }

  .cta-block{ text-align:center; margin-top:6px; }
  .cta-title{ font-family:Georgia,serif; font-size:16.5px; font-weight:600; margin-bottom:6px; }
  .cta-sub{ font-size:13px; color:var(--muted); margin-bottom:16px; line-height:1.5; }

  .error-note{ font-size:12px; color:var(--bad); text-align:center; margin-top:12px; display:none; }
  .error-note.show{ display:block; }
</style>
</head>
<body>
<div class="app">

  <!-- 1. Cover -->
  <div class="screen active" id="screen-cover">
    <div class="brand">Growth Autopilot</div>
    <div class="cover-badge">
      <svg class="ic" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4c-8 0-14 5-14 12 0 2.2.7 3.6 1.6 4.6M20 4c0 8-5 14-12 14-2.2 0-3.6-.7-4.6-1.6M20 4c-6 1-10 4-12 8"/></svg>
    </div>
    <div class="cover-title">Персональный разбор твоего рациона</div>
    <div class="cover-sub">2 минуты живого диалога — расскажи, как обычно питаешься, а Анна уточнит детали и соберёт разбор именно под тебя.</div>
    <div class="cover-points">
      <div class="cover-point"><span class="dot"><svg class="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/></svg></span> Настоящий диалог, а не анкета — отвечай текстом или голосом</div>
      <div class="cover-point"><span class="dot"><svg class="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/></svg></span> Анна уточнит один раз, если ответ получится расплывчатым</div>
      <div class="cover-point"><span class="dot"><svg class="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/></svg></span> В конце — разбор по 4 блокам и понятные следующие шаги</div>
    </div>
    <button class="btn btn-primary" onclick="Quiz3.start()">Начать диалог</button>
    <div class="cover-author">Ведёт <b>Анна Светлова</b> — нутрициолог</div>
  </div>

  <!-- 2. Q1: цель (кнопки) -->
  <div class="screen" id="screen-q1">
    <div class="brand">Growth Autopilot</div>
    <div class="cover-title" style="font-size:22px; text-align:left;">Привет, я Анна</div>
    <div class="cover-sub" style="text-align:left; margin-bottom:8px;">Для начала — какая у тебя сейчас цель?</div>
    <div class="goal-list">
      <button class="goal-btn" onclick="Quiz3.chooseGoal('Похудение')"><span>Похудение</span><span class="arrow"><svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></span></button>
      <button class="goal-btn" onclick="Quiz3.chooseGoal('Набор массы')"><span>Набор массы</span><span class="arrow"><svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></span></button>
      <button class="goal-btn" onclick="Quiz3.chooseGoal('Поддержание веса')"><span>Поддержание веса</span><span class="arrow"><svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></span></button>
      <button class="goal-btn" onclick="Quiz3.chooseGoal('Разобраться в питании')"><span>Разобраться в питании</span><span class="arrow"><svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></span></button>
    </div>
  </div>

  <!-- 3. Диалог (вопросы 2-4) -->
  <div class="screen" id="screen-chat">
    <div class="qprogress" id="qProgress">
      <div class="qprogress-dot" data-q="2"></div>
      <div class="qprogress-dot" data-q="3"></div>
      <div class="qprogress-dot" data-q="4"></div>
    </div>
    <div class="chat-scroll" id="chatScroll"></div>

    <div class="chat-inputbar">
      <div class="inputbar-shell">
        <textarea id="chatInput" class="inputbar-text" placeholder="Напиши ответ…" rows="1"></textarea>
        <div class="inputbar-voice" id="voiceShell">
          <div class="voice-wave" id="voiceWave"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
          <div class="voice-live-status" id="voiceLiveStatus">Слушаю…</div>
        </div>
      </div>
      <button class="inputbar-action" id="actionBtn" onclick="Quiz3.handleAction()" aria-label="Записать голосом">
        <span id="actionIcon"></span>
      </button>
    </div>
    <div class="voice-fallback" id="voiceFallback"></div>
  </div>

  <!-- 4. Contact form (хард-гейт, до результата) -->
  <div class="screen" id="screen-contact">
    <div class="brand">Growth Autopilot</div>
    <div class="cover-title" style="font-size:22px;">Куда прислать разбор?</div>
    <div class="cover-sub" style="margin-bottom:22px;">Оставь контакт — и сразу увидишь персональный разбор своего рациона.</div>

    <div class="field" id="fieldName">
      <label for="inpName">Имя</label>
      <input id="inpName" type="text" placeholder="Как к тебе обращаться?" autocomplete="name">
      <div class="field-error">Введите имя (минимум 2 символа)</div>
    </div>
    <div class="field" id="fieldContact">
      <label for="inpContact">Telegram или email</label>
      <input id="inpContact" type="text" placeholder="@username или email@mail.com" autocomplete="email">
      <div class="field-error">Введите корректный @telegram или email</div>
    </div>

    <button class="btn btn-primary" id="submitBtn" onclick="Quiz3.submitForm()">Показать разбор</button>
    <div class="form-note">Это демо-версия квиза: данные формы никуда не сохраняются — только имитация сбора контакта в рамках воркшопа.</div>
  </div>

  <!-- 5. Analyzing -->
  <div class="screen" id="screen-analyzing">
    <svg class="spinner-ring" width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r="23" fill="none" stroke="var(--line)" stroke-width="4"/>
      <circle cx="28" cy="28" r="23" fill="none" stroke="var(--moss)" stroke-width="4" stroke-linecap="round" stroke-dasharray="90 200">
        <animateTransform attributeName="transform" type="rotate" from="0 28 28" to="360 28 28" dur="1s" repeatCount="indefinite"/>
      </circle>
    </svg>
    <div class="analyze-lines" id="analyzeLines">
      <div class="analyze-line" data-i="0"><span class="analyze-check"><svg class="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span><span>Собираем весь диалог воедино</span></div>
      <div class="analyze-line" data-i="1"><span class="analyze-check"><svg class="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span><span>Анализируем режим, разнообразие и воду</span></div>
      <div class="analyze-line" data-i="2"><span class="analyze-check"><svg class="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span><span>Готовим персональный разбор</span></div>
    </div>
  </div>

  <!-- 6. Result -->
  <div class="screen" id="screen-result">
    <div class="result-scroll">
      <div class="result-eyebrow">Разбор от Анны Светловой</div>
      <div class="result-title">Твой разбор рациона готов</div>

      <div class="score-card">
        <div class="score-num"><span id="gaugeNum">0</span><span>/10</span></div>
        <div class="score-meter">
          <div class="score-tag" id="scoreTag">Считаем баланс…</div>
          <div class="score-track"><div class="score-fill" id="scoreFill"></div></div>
        </div>
      </div>

      <div class="verdict-block" id="verdictText"></div>

      <div class="result-cards" id="resultCards"></div>

      <div class="steps-block">
        <div class="steps-title">Что сделать в первую очередь</div>
        <div id="nextSteps"></div>
      </div>

      <div class="cta-block">
        <div class="cta-title">Спасибо, что прошёл диалог</div>
        <div class="cta-sub">Это демо-версия — в реальном проекте здесь могло быть приглашение на консультацию.</div>
        <button class="btn btn-ghost" style="width:100%;" onclick="Quiz3.restart()">Пройти ещё раз</button>
      </div>
    </div>
  </div>

</div>

<script>
(function(){

var ICONS = {
  good: '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  warning: '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none"/></svg>',
  bad: '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'
};
var STEP_ICON = '<svg class="step-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>';
var MIC_ICON = '<svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
var SEND_ICON = '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
var STOP_ICON = '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

var QUESTIONS = {
  2: "Расскажи, как обычно выглядит твой день в еде — что и когда ты ешь?",
  3: "А как у тебя с перекусами и режимом приёмов пищи — есть чёткое расписание или скорее хаотично?",
  4: "И последнее: сколько воды и других напитков пьёшь за день, и есть ли ограничения или непереносимости, о которых стоит знать?"
};

// Локальный запасной сценарий (уровень 2 fallback) — если Dialogue Worker
// не отвечает, диалог всё равно продолжается по заготовленным репликам.
var LOCAL_DIALOGUE_FALLBACK = { action: 'advance', message: 'Поняла, спасибо! Это уже даёт хорошую картину.', _fallback: true };

var LOCAL_RESULT_FALLBACK = {
  summary: "Питание в целом на плаву, но есть нерегулярность в режиме и мало внимания к воде — небольшие корректировки дадут заметный эффект.",
  balance_score: 6,
  blocks: [
    { title: "Режим питания", status: "warning", text: "Приёмы пищи скорее хаотичные — время от времени случаются большие паузы." },
    { title: "Разнообразие рациона", status: "good", text: "В рационе присутствуют разные группы продуктов — хорошая база." },
    { title: "Вода и напитки", status: "bad", text: "Похоже, что чистой воды в течение дня пьётся мало." },
    { title: "Что учесть по цели", status: "warning", text: "Стоит в первую очередь выровнять регулярность приёмов пищи." }
  ],
  next_steps: [
    "Постараться есть примерно в одно и то же время",
    "Держать под рукой воду и постепенно увеличивать её долю среди напитков",
    "Добавить в рацион больше клетчатки — овощи, зелень, цельные продукты"
  ]
};

function $(id){ return document.getElementById(id); }

function showScreen(id){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  $(id).classList.add('active');
}

function setInvalid(fieldId, invalid){
  var el = $(fieldId);
  if (invalid) el.classList.add('invalid'); else el.classList.remove('invalid');
}

function validEmailOrTg(v){
  v = v.trim();
  if (v.indexOf('@') === 0 && v.length > 2) return true;
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v);
}

function escapeHtml(str){
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function animateNumber(el, from, to, duration){
  var start = performance.now();
  function tick(now){
    var t = Math.min(1, (now - start) / duration);
    var eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

var state = {
  goal: null,
  currentQ: 2,
  messages: [],       // {role:'user'|'assistant', content:'...'} — полная история для Dialogue Worker
  followupUsed: false,
  resultPromise: null,
  recognition: null,
  recording: false,
  finalTranscript: ''
};

function scrollChatToBottom(){
  var scroll = $('chatScroll');
  scroll.scrollTop = scroll.scrollHeight;
}

function addBubble(who, text){
  var scroll = $('chatScroll');
  var row = document.createElement('div');
  row.className = 'bubble-row ' + (who === 'ai' ? '' : 'user');
  var avatar = who === 'ai' ? '<div class="bubble-avatar">АС</div>' : '';
  var bubbleClass = who === 'ai' ? 'bubble-ai' : 'bubble-user';
  row.innerHTML = avatar + '<div class="bubble ' + bubbleClass + '"></div>';
  row.querySelector('.bubble').textContent = text;
  scroll.appendChild(row);
  scrollChatToBottom();
}

function addNote(text){
  var scroll = $('chatScroll');
  var row = document.createElement('div');
  row.className = 'bubble-row';
  row.innerHTML = '<div class="bubble-avatar">АС</div><div class="bubble bubble-note"></div>';
  row.querySelector('.bubble').textContent = text;
  scroll.appendChild(row);
  scrollChatToBottom();
}

function showTyping(){
  var scroll = $('chatScroll');
  var row = document.createElement('div');
  row.className = 'typing-row';
  row.id = 'typingIndicator';
  row.innerHTML = '<div class="bubble-avatar">АС</div><div class="typing"><span></span><span></span><span></span></div>';
  scroll.appendChild(row);
  scrollChatToBottom();
}

function hideTyping(){
  var el = $('typingIndicator');
  if (el) el.remove();
}

function updateActionButton(){
  var btn = $('actionBtn');
  var icon = $('actionIcon');
  var hasText = $('chatInput').value.trim().length > 0;
  btn.classList.remove('is-send', 'is-recording');
  if (state.recording){
    btn.classList.add('is-recording');
    icon.innerHTML = STOP_ICON;
    btn.setAttribute('aria-label', 'Остановить запись');
  } else if (hasText){
    btn.classList.add('is-send');
    icon.innerHTML = SEND_ICON;
    btn.setAttribute('aria-label', 'Отправить');
  } else {
    icon.innerHTML = MIC_ICON;
    btn.setAttribute('aria-label', 'Записать голосом');
  }
}

function setInputEnabled(enabled){
  $('chatInput').disabled = !enabled;
  $('actionBtn').disabled = !enabled;
}

function switchToTextShell(){
  $('chatInput').classList.remove('hidden');
  $('voiceShell').classList.remove('active');
  $('voiceWave').classList.remove('live');
}

function switchToVoiceShell(){
  $('chatInput').classList.add('hidden');
  $('voiceShell').classList.add('active');
  $('voiceWave').classList.add('live');
}

function updateProgress(){
  document.querySelectorAll('.qprogress-dot').forEach(function(dot){
    var q = Number(dot.getAttribute('data-q'));
    if (q < state.currentQ) dot.classList.add('done'); else dot.classList.remove('done');
  });
}

function renderQuestion(n){
  state.currentQ = n;
  state.followupUsed = false;
  updateProgress();
  var text = QUESTIONS[n];
  addBubble('ai', text);
  state.messages.push({ role: 'assistant', content: text });
  setInputEnabled(true);
  $('chatInput').value = '';
  updateActionButton();
  $('chatInput').focus();
}

function handleAnswer(answerText){
  addBubble('user', answerText);
  state.messages.push({ role: 'user', content: answerText });
  setInputEnabled(false);
  showTyping();

  fetch('/api/quiz3-dialogue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history: state.messages, questionIndex: state.currentQ, goal: state.goal })
  }).then(function(res){
    if (!res.ok) throw new Error('bad response');
    return res.json();
  }).catch(function(){
    return LOCAL_DIALOGUE_FALLBACK;
  }).then(function(data){
    hideTyping();
    var action = (data && (data.action === 'followup' || data.action === 'advance')) ? data.action : 'advance';
    // Ровно одно уточнение на вопрос — если оно уже было, форсируем переход дальше.
    if (action === 'followup' && state.followupUsed) action = 'advance';

    var message = (data && typeof data.message === 'string' && data.message.trim()) ? data.message.trim() : '';

    if (action === 'followup'){
      state.followupUsed = true;
      addBubble('ai', message || 'Можешь рассказать чуть подробнее?');
      state.messages.push({ role: 'assistant', content: message || 'Можешь рассказать чуть подробнее?' });
      setInputEnabled(true);
      $('chatInput').value = '';
      updateActionButton();
      $('chatInput').focus();
    } else {
      if (message){
        addBubble('ai', message);
        state.messages.push({ role: 'assistant', content: message });
      }
      if (state.currentQ < 4){
        setTimeout(function(){ renderQuestion(state.currentQ + 1); }, 350);
      } else {
        updateProgress();
        finishDialogue();
      }
    }
  });
}

function finishDialogue(){
  // Хард-гейт: контакты показываем сразу, а разбор считаем параллельно в фоне.
  showScreen('screen-contact');
  state.resultPromise = fetch('/api/quiz3-result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history: state.messages })
  }).then(function(res){
    if (!res.ok) throw new Error('bad response');
    return res.json();
  }).catch(function(){
    return LOCAL_RESULT_FALLBACK;
  });
}

function scoreTag(score){
  if (score >= 8) return 'Хороший баланс';
  if (score >= 5) return 'Есть, что улучшить';
  return 'Стоит пересмотреть режим';
}

function renderResult(data){
  var score = Math.max(1, Math.min(10, Math.round(Number(data.balance_score) || 5)));

  $('verdictText').textContent = data.summary || '';
  $('scoreTag').textContent = scoreTag(score);

  $('scoreFill').style.width = '0%';
  $('gaugeNum').textContent = '0';
  requestAnimationFrame(function(){
    $('scoreFill').style.width = (score * 10) + '%';
  });
  animateNumber($('gaugeNum'), 0, score, 1000);

  var cardsHtml = '';
  var blocks = Array.isArray(data.blocks) ? data.blocks : [];
  blocks.forEach(function(b){
    var status = ICONS[b.status] ? b.status : 'warning';
    cardsHtml += '<div class="result-card ' + status + '">' +
      '<div class="result-card-head"><div class="result-card-icon">' + ICONS[status] + '</div>' +
      '<div class="result-card-title">' + escapeHtml(b.title || '') + '</div></div>' +
      '<div class="result-card-text">' + escapeHtml(b.text || '') + '</div>' +
      '</div>';
  });
  $('resultCards').innerHTML = cardsHtml;

  var stepsHtml = '';
  var steps = Array.isArray(data.next_steps) ? data.next_steps : [];
  steps.forEach(function(step){
    stepsHtml += '<div class="step-row">' + STEP_ICON + '<div>' + escapeHtml(step) + '</div></div>';
  });
  $('nextSteps').innerHTML = stepsHtml;
}

function getRecognition(){
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  var rec = new SR();
  rec.lang = 'ru-RU';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  return rec;
}

function showVoiceFallback(text){
  $('voiceFallback').textContent = text;
  $('voiceFallback').classList.add('show');
}

function startRecording(){
  var rec = getRecognition();
  if (!rec){
    showVoiceFallback('Голосовой ввод не поддерживается этим браузером — попробуй написать текстом.');
    return;
  }

  $('voiceFallback').classList.remove('show');
  state.recognition = rec;
  state.recording = true;
  state.finalTranscript = '';
  switchToVoiceShell();
  $('voiceLiveStatus').textContent = 'Слушаю…';
  updateActionButton();

  rec.onresult = function(e){
    for (var i = e.resultIndex; i < e.results.length; i++){
      if (e.results[i].isFinal) state.finalTranscript += e.results[i][0].transcript;
    }
  };

  rec.onerror = function(evt){
    if (evt && evt.error === 'no-speech') return; // не мешаем ждать дальше, пока не нажали стоп
    showVoiceFallback('Не расслышала — тишина или шум. Попробуй ещё раз или напиши текстом.');
  };

  rec.onend = function(){
    state.recording = false;
    switchToTextShell();
    updateActionButton();
    var text = state.finalTranscript.trim();
    if (text){
      handleAnswer(text);
    } else if (!document.getElementById('voiceFallback').classList.contains('show')) {
      showVoiceFallback('Не удалось распознать голос — попробуй написать текстом.');
    }
  };

  try {
    rec.start();
  } catch (err){
    state.recording = false;
    switchToTextShell();
    updateActionButton();
    showVoiceFallback('Не удалось запустить запись — попробуй написать текстом.');
  }
}

function stopRecording(){
  if (state.recognition) state.recognition.stop();
}

var Quiz3 = {
  start: function(){
    showScreen('screen-q1');
  },

  chooseGoal: function(goal){
    state.goal = goal;
    state.messages = [{ role: 'user', content: 'Моя цель: ' + goal + '.' }];
    state.currentQ = 2;
    $('chatScroll').innerHTML = '';
    showScreen('screen-chat');
    renderQuestion(2);
  },

  handleAction: function(){
    if (state.recording){
      stopRecording();
      return;
    }
    var val = $('chatInput').value.trim();
    if (val){
      handleAnswer(val);
      return;
    }
    startRecording();
  },

  submitForm: function(){
    var name = $('inpName').value.trim();
    var contact = $('inpContact').value.trim();
    var nameOk = name.length >= 2;
    var contactOk = validEmailOrTg(contact);
    setInvalid('fieldName', !nameOk);
    setInvalid('fieldContact', !contactOk);
    if (!nameOk || !contactOk) return;

    $('submitBtn').disabled = true;
    $('submitBtn').textContent = 'Готовим разбор…';
    showScreen('screen-analyzing');

    var lines = document.querySelectorAll('.analyze-line');
    lines.forEach(function(el){ el.classList.remove('show','done'); });
    var delays = [200, 900, 1700];
    lines.forEach(function(el, i){
      setTimeout(function(){ el.classList.add('show'); }, delays[i] || 0);
      setTimeout(function(){ el.classList.add('done'); }, (delays[i] || 0) + 500);
    });

    var minDelay = new Promise(function(resolve){ setTimeout(resolve, 2300); });
    var resultPromise = state.resultPromise || Promise.resolve(LOCAL_RESULT_FALLBACK);

    Promise.all([resultPromise, minDelay]).then(function(vals){
      renderResult(vals[0] || LOCAL_RESULT_FALLBACK);
      $('submitBtn').disabled = false;
      $('submitBtn').textContent = 'Показать разбор';
      showScreen('screen-result');
    });
  },

  restart: function(){
    if (state.recognition && state.recording) { try { state.recognition.stop(); } catch(e){} }
    state.goal = null;
    state.currentQ = 2;
    state.messages = [];
    state.followupUsed = false;
    state.resultPromise = null;
    state.recording = false;
    state.finalTranscript = '';
    $('chatScroll').innerHTML = '';
    $('chatInput').value = '';
    $('inpName').value = '';
    $('inpContact').value = '';
    setInvalid('fieldName', false);
    setInvalid('fieldContact', false);
    switchToTextShell();
    $('voiceFallback').classList.remove('show');
    showScreen('screen-cover');
  }
};

$('chatInput').addEventListener('input', updateActionButton);
$('chatInput').addEventListener('keydown', function(e){
  if (e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    if (!state.recording && $('chatInput').value.trim()) handleAnswer($('chatInput').value.trim());
  }
});

updateActionButton();
window.Quiz3 = Quiz3;
})();
</script>
</body>
</html>`;
}
