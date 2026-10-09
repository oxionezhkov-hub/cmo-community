// CRM лички — фронтенд страницы /crm. Данные — /api/tgcrm/* (crm/api.js).
(function () {
  'use strict';

  // ─── утилиты ──────────────────────────────────────────────
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* */ } }
  };
  const pad = n => String(n).padStart(2, '0');
  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function fmtTime(ms) { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  function fmtShort(ms) {
    if (!ms) return '';
    const d = new Date(ms), now = new Date();
    if (sameDay(d, now)) return fmtTime(ms);
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (sameDay(d, y)) return 'вчера';
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }
  function fmtDay(ms) {
    const d = new Date(ms), now = new Date();
    if (sameDay(d, now)) return 'Сегодня';
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (sameDay(d, y)) return 'Вчера';
    return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''}`;
  }
  function fmtDue(ms) {
    if (!ms) return 'без срока';
    const d = new Date(ms), now = new Date();
    const t = new Date(now); t.setDate(t.getDate() + 1);
    if (sameDay(d, now)) return `сегодня ${fmtTime(ms)}`;
    if (sameDay(d, t)) return `завтра ${fmtTime(ms)}`;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${fmtTime(ms)}`;
  }
  function dueClass(ms) {
    if (!ms) return '';
    if (ms < Date.now()) return 'overdue';
    if (sameDay(new Date(ms), new Date())) return 'today';
    return '';
  }
  function toLocalInput(ms) { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  function linkify(html) { return html.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"»])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }
  function hashColor(s) {
    let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const colors = ['#e17076', '#7bc862', '#65aadd', '#a695e7', '#ee7aae', '#6ec9cb', '#faa774', '#5b8def'];
    return colors[h % colors.length];
  }
  function initials(name) { return (String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => [...w][0] || '').join('') || '?').toUpperCase(); }
  function avatar(name, id, cls = '') { return `<span class="avatar ${cls}" style="background:${hashColor(id || name)}">${esc(initials(name))}</span>`; }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  // ─── состояние ────────────────────────────────────────────
  const S = {
    token: store.get('tgcrm_token', null),
    user: null, stages: [], users: [], leads: [], tasks: [], triagePending: 0,
    tab: 'chats', view: store.get('tgcrm_view', 'split'),
    activeChatId: null, chat: null, // контроллер открытого диалога
    kb: null, kbActive: null, kbEdit: false,
    prevUnread: null, prevTriage: null,
    notified: new Set(store.get('tgcrm_notified', [])),
    sort: store.get('tgcrm_sort', { key: 'lastAt', dir: -1 }),
    selected: new Set(), taskScope: 'mine', pollTimer: null
  };
  const STAGE_COLORS = { new: '#65aadd', work: '#a695e7', call: '#faa774', think: '#cb912f', pay: '#ee7aae', client: '#2f9e44', lost: '#9b9a97' };
  const stageTitle = id => (S.stages.find(s => s.id === id) || {}).title || id;
  const userName = id => (S.users.find(u => u.id === id) || {}).name || (id ? id : '—');
  const isAdmin = () => S.user?.role === 'admin';
  const leadById = id => S.leads.find(l => l.chatId === id);

  // ─── API ──────────────────────────────────────────────────
  async function api(path, { method = 'GET', body, form } = {}) {
    const headers = { Authorization: `Bearer ${S.token}` };
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(`/api/tgcrm/${path}`, { method, headers, body: payload });
    let data = null;
    try { data = await res.json(); } catch { /* */ }
    if (res.status === 401 && path !== 'login') { logoutLocal(); throw new Error('Сессия истекла — войдите снова'); }
    if (!res.ok) throw new Error(data?.error || `Ошибка ${res.status}`);
    return data;
  }
  const mediaUrl = (chatId, msgId) => `/api/tgcrm/chats/${encodeURIComponent(chatId)}/media/${encodeURIComponent(msgId)}?t=${S.token}`;

  // ─── уведомления ──────────────────────────────────────────
  function toast(html, { kind = '', onClick, ttl = 6000 } = {}) {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = html;
    el.onclick = () => { el.remove(); onClick && onClick(); };
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), ttl);
  }
  const err = e => toast(esc(e.message || e), { kind: 'err' });
  let audioCtx = null;
  function beep(freq = 880) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = freq; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
      o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.4);
    } catch { /* */ }
  }
  function systemNotify(title, body, onClick) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || document.hasFocus()) return;
    try {
      const n = new Notification(title, { body, tag: title });
      n.onclick = () => { window.focus(); n.close(); onClick && onClick(); };
    } catch { /* */ }
  }
  function updateNotifBtn() {
    const b = $('#notif-btn');
    if (!('Notification' in window)) { b.hidden = true; return; }
    b.textContent = Notification.permission === 'granted' ? '🔔' : '🔕';
    b.title = Notification.permission === 'granted' ? 'Уведомления включены' : 'Включить уведомления в браузере';
  }

  // ─── вход / выход ─────────────────────────────────────────
  function showLogin() {
    $('#app').hidden = true; $('#login').hidden = false;
    setTimeout(() => $('#login-name').focus(), 50);
  }
  function logoutLocal() {
    S.token = null; store.del('tgcrm_token');
    clearTimeout(S.pollTimer);
    showLogin();
  }
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    $('#login-err').hidden = true;
    try {
      const data = await api('login', { method: 'POST', body: { login: $('#login-name').value, password: $('#login-pass').value } });
      S.token = data.token; store.set('tgcrm_token', data.token);
      $('#login-pass').value = '';
      start();
    } catch (ex) {
      $('#login-err').textContent = ex.message; $('#login-err').hidden = false;
    }
  });
  $('#logout-btn').onclick = async () => { try { await api('logout', { method: 'POST' }); } catch { /* */ } logoutLocal(); };
  $('#me-btn').onclick = e => { e.stopPropagation(); $('#me-pop').hidden = !$('#me-pop').hidden; };
  document.addEventListener('click', () => { $('#me-pop').hidden = true; });
  $('#theme-btn').onclick = () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next; store.set('tgcrm_theme', next);
  };
  if (store.get('tgcrm_theme', null)) document.documentElement.dataset.theme = store.get('tgcrm_theme');
  $('#notif-btn').onclick = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') await Notification.requestPermission();
    else if (Notification.permission === 'denied') toast('Уведомления запрещены в настройках браузера для этого сайта');
    else toast('Уведомления уже включены 👍');
    updateNotifBtn();
  };

  async function start() {
    $('#login').hidden = true; $('#app').hidden = false;
    try {
      await poll(true);
    } catch (e) { err(e); }
    $('#me-name').textContent = S.user?.name || '';
    $('#me-avatar').outerHTML = avatar(S.user?.name, S.user?.id, 'sm');
    $('#me-role').textContent = `${S.user?.name} · ${isAdmin() ? 'админ' : 'менеджер'}`;
    document.body.classList.toggle('is-admin', isAdmin());
    fillStageSelects();
    setView(S.view);
    updateNotifBtn();
    $('#empty-hint').textContent = isAdmin()
      ? 'Новые диалоги из лички появляются во вкладке «Разбор» — там решаете, добавлять ли их в CRM.'
      : 'Здесь только диалоги, которые админ добавил в CRM.';
    if (isAdmin() && S.triagePending && !S.leads.length) setTab('triage');
    setInterval(checkTaskReminders, 20000);
    checkTaskReminders();
  }

  // ─── опрос сервера ────────────────────────────────────────
  async function poll(first = false) {
    clearTimeout(S.pollTimer);
    try {
      const data = await api(`state?visible=${document.hidden ? 0 : 1}`);
      $('#conn-warn').hidden = true;
      S.user = data.user; S.stages = data.stages; S.users = data.users;
      const prevLeads = S.leads;
      S.leads = data.leads; S.tasks = data.tasks; S.triagePending = data.triagePending;
      detectNew(prevLeads, first);
      renderAll();
    } catch (e) {
      if (S.token) { $('#conn-warn').textContent = `⚠️ ${e.message}`; $('#conn-warn').hidden = false; }
      if (first) throw e;
    } finally {
      if (S.token) S.pollTimer = setTimeout(() => poll(), document.hidden ? 30000 : 8000);
    }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.token) poll(); });

  function detectNew(prevLeads, first) {
    const prev = Object.fromEntries((prevLeads || []).map(l => [l.chatId, l]));
    if (!first) {
      for (const l of S.leads) {
        const p = prev[l.chatId];
        const grew = p ? (l.unread > p.unread || (l.lastMessageAt > p.lastMessageAt && l.lastDirection === 'in')) : l.unread > 0;
        if (!grew || l.lastDirection !== 'in') continue;
        const open = S.activeChatId === l.chatId && !document.hidden;
        if (open) continue;
        beep();
        toast(`<b>💬 ${esc(l.name)}</b>${esc((l.lastMessagePreview || '').slice(0, 120))}`, { onClick: () => openChat(l.chatId) });
        systemNotify(`Новое сообщение: ${l.name}`, (l.lastMessagePreview || '').slice(0, 140), () => openChat(l.chatId));
      }
      if (isAdmin() && S.prevTriage != null && S.triagePending > S.prevTriage) {
        toast('<b>🆕 Новый диалог в личке</b>Разберите его во вкладке «Разбор»', { onClick: () => setTab('triage') });
      }
    }
    S.prevTriage = S.triagePending;
    if (S.chat && S.activeChatId) {
      const l = leadById(S.activeChatId), p = prev[S.activeChatId];
      if (l && p && l.lastMessageAt !== p.lastMessageAt) S.chat.refresh();
    }
  }

  function checkTaskReminders() {
    if (!S.user) return;
    const now = Date.now();
    for (const t of S.tasks) {
      if (t.done || !t.dueAt || t.dueAt > now || S.notified.has(t.id)) continue;
      if (t.assignee && t.assignee !== S.user.id) continue;
      S.notified.add(t.id);
      beep(660);
      toast(`<b>⏰ Задача: ${esc(t.text)}</b>${esc(t.chatName || '')}${t.note ? ' — ' + esc(t.note.slice(0, 80)) : ''}`, { kind: 'task', ttl: 20000, onClick: () => openChat(t.chatId) });
      systemNotify(`⏰ ${t.text}`, `${t.chatName || ''} ${t.note || ''}`.trim(), () => openChat(t.chatId));
    }
    store.set('tgcrm_notified', [...S.notified].slice(-500));
  }

  // ─── вкладки и вид ────────────────────────────────────────
  function setTab(tab) {
    S.tab = tab;
    $$('#tabs .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    for (const v of ['chats', 'tasks', 'triage', 'activity', 'team']) $(`#view-${v}`).hidden = v !== tab;
    $('#view-toggle').style.visibility = tab === 'chats' ? '' : 'hidden';
    if (tab === 'triage') loadTriage();
    if (tab === 'activity') initActivity();
    if (tab === 'team') loadTeam();
    if (tab === 'tasks') renderTasks();
  }
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if (b) setTab(b.dataset.tab); });

  function setView(view) {
    S.view = view; store.set('tgcrm_view', view);
    $$('#view-toggle button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    $('#split').hidden = view !== 'split';
    $('#table-wrap').hidden = view !== 'table';
    if (view === 'table' && S.chat && !S.chat.modal) closeChat();
    renderAll();
  }
  $('#view-toggle').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setView(b.dataset.view); });

  function fillStageSelects() {
    const opts = '<option value="">Все этапы</option>' + S.stages.map(s => `<option value="${s.id}">${esc(s.title)}</option>`).join('');
    $('#stage-filter').innerHTML = opts; $('#table-stage').innerHTML = opts;
  }

  function renderAll() {
    const unread = S.leads.reduce((s, l) => s + (l.unread || 0), 0);
    const overdue = S.tasks.filter(t => !t.done && t.dueAt && t.dueAt < Date.now() && (!t.assignee || t.assignee === S.user?.id || isAdmin())).length;
    setBadge('#b-unread', unread); setBadge('#b-tasks', overdue); setBadge('#b-triage', S.triagePending);
    document.title = unread ? `(${unread}) CRM лички` : 'CRM лички';
    if (S.tab === 'chats') { if (S.view === 'split') renderList(); else renderTable(); }
    if (S.tab === 'tasks') renderTasks();
  }
  function setBadge(sel, n) { const b = $(sel); b.hidden = !n; b.textContent = n > 99 ? '99+' : n; }

  // ─── список диалогов (вид «чаты») ─────────────────────────
  function filteredLeads(q, stage, unreadOnly) {
    q = (q || '').trim().toLowerCase();
    return S.leads.filter(l => {
      if (stage && l.stage !== stage) return false;
      if (unreadOnly && !l.unread) return false;
      if (q && !(`${l.name} ${l.username} ${l.lastMessagePreview} ${l.note}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }
  function renderList() {
    const list = filteredLeads($('#chat-search').value, $('#stage-filter').value, $('#unread-only').checked)
      .sort((a, b) => (b.unread > 0) - (a.unread > 0) || (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
    const el = $('#chat-list');
    if (!list.length) {
      el.innerHTML = `<div class="empty-state small">${S.leads.length ? 'Ничего не найдено' : (isAdmin() ? 'В CRM пока нет диалогов.<br>Откройте вкладку «Разбор» и добавьте нужные.' : 'Админ ещё не добавил диалоги в CRM')}</div>`;
      return;
    }
    el.innerHTML = list.map(l => {
      const task = l.nextTask;
      return `<div class="ci ${l.unread ? 'unread' : ''} ${l.chatId === S.activeChatId ? 'active' : ''}" data-id="${esc(l.chatId)}">
        ${avatar(l.name, l.chatId)}
        <div class="ci-body">
          <div class="ci-top"><span class="ci-name">${esc(l.name)}</span><span class="ci-time">${fmtShort(l.lastMessageAt)}</span></div>
          <div class="ci-top"><span class="ci-prev">${l.lastDirection === 'out' ? '<span class="ci-you">Вы: </span>' : ''}${esc(l.lastMessagePreview)}</span>${l.unread ? `<span class="badge">${l.unread}</span>` : ''}</div>
          <div class="ci-meta">
            <span class="pill"><span class="stage-dot" style="background:${STAGE_COLORS[l.stage] || '#999'}"></span>${esc(stageTitle(l.stage))}</span>
            ${task ? `<span class="pill ${dueClass(task.dueAt)}">⏰ ${esc(fmtDue(task.dueAt))}</span>` : ''}
            ${l.assignee ? `<span class="pill">👤 ${esc(userName(l.assignee))}</span>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');
  }
  $('#chat-list').addEventListener('click', e => { const c = e.target.closest('.ci'); if (c) openChat(c.dataset.id); });
  $('#chat-search').addEventListener('input', debounce(renderList, 150));
  $('#stage-filter').addEventListener('change', renderList);
  $('#unread-only').addEventListener('change', renderList);

  // ─── таблица ──────────────────────────────────────────────
  function renderTable() {
    const list = filteredLeads($('#table-search').value, $('#table-stage').value, false);
    const { key, dir } = S.sort;
    const val = l => ({
      name: (l.name || '').toLowerCase(), stage: S.stages.findIndex(s => s.id === l.stage), last: (l.lastMessagePreview || '').toLowerCase(),
      lastAt: l.lastMessageAt || 0, task: l.nextTask?.dueAt || Infinity, assignee: userName(l.assignee)
    })[key];
    list.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * dir);
    $$('.grid th[data-sort]').forEach(th => { th.textContent = th.textContent.replace(/ [▲▼]$/, '') + (th.dataset.sort === key ? (dir > 0 ? ' ▲' : ' ▼') : ''); });
    for (const id of [...S.selected]) if (!S.leads.some(l => l.chatId === id)) S.selected.delete(id);
    $('#table-body').innerHTML = list.map(l => `<tr class="${l.unread ? 'unread' : ''}" data-id="${esc(l.chatId)}">
      <td class="c-chk"><input type="checkbox" class="row-chk" ${S.selected.has(l.chatId) ? 'checked' : ''}></td>
      <td class="c-name">${esc(l.name)}${l.unread ? `<span class="badge">${l.unread}</span>` : ''}<div class="muted small">${l.username ? '@' + esc(l.username) : ''}</div></td>
      <td><span class="pill"><span class="stage-dot" style="background:${STAGE_COLORS[l.stage]}"></span>${esc(stageTitle(l.stage))}</span></td>
      <td class="c-last">${l.lastDirection === 'out' ? 'Вы: ' : ''}${esc(l.lastMessagePreview)}</td>
      <td class="muted">${fmtShort(l.lastMessageAt)}</td>
      <td>${l.nextTask ? `<span class="pill ${dueClass(l.nextTask.dueAt)}">${esc(fmtDue(l.nextTask.dueAt))}</span> ${esc(l.nextTask.text)}` : '<span class="muted">—</span>'}</td>
      <td>${esc(l.assignee ? userName(l.assignee) : '—')}</td>
    </tr>`).join('') || `<tr><td colspan="7" class="muted" style="text-align:center;padding:30px">${S.leads.length ? 'Ничего не найдено' : 'В CRM пока нет диалогов'}</td></tr>`;
    $('#sel-count').textContent = S.selected.size ? `Выбрано: ${S.selected.size}` : '';
    $('#broadcast-btn').disabled = !S.selected.size;
    $('#sel-all').checked = list.length > 0 && list.every(l => S.selected.has(l.chatId));
  }
  $('#table-body').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-id]'); if (!tr) return;
    if (e.target.classList.contains('row-chk')) {
      if (e.target.checked) S.selected.add(tr.dataset.id); else S.selected.delete(tr.dataset.id);
      renderTable(); return;
    }
    if (e.target.closest('.c-chk')) return;
    openChat(tr.dataset.id, { modal: true });
  });
  $('#sel-all').addEventListener('change', e => {
    const list = filteredLeads($('#table-search').value, $('#table-stage').value, false);
    list.forEach(l => e.target.checked ? S.selected.add(l.chatId) : S.selected.delete(l.chatId));
    renderTable();
  });
  $$('.grid th[data-sort]').forEach(th => th.addEventListener('click', () => {
    S.sort = { key: th.dataset.sort, dir: S.sort.key === th.dataset.sort ? -S.sort.dir : 1 };
    store.set('tgcrm_sort', S.sort); renderTable();
  }));
  $('#table-search').addEventListener('input', debounce(renderTable, 150));
  $('#table-stage').addEventListener('change', renderTable);
  $('#broadcast-btn').onclick = () => openBroadcast([...S.selected]);

  function openBroadcast(ids) {
    const names = ids.map(id => leadById(id)?.name).filter(Boolean);
    modal(`<h3>📣 Рассылка: ${ids.length} получ.</h3>
      <p class="muted small">${esc(names.slice(0, 12).join(', '))}${names.length > 12 ? ' и др.' : ''}</p>
      <label>Текст сообщения <textarea id="bc-text" rows="6" placeholder="Привет, {имя}! ..."></textarea></label>
      <p class="muted small">{имя} заменится на имя получателя. Сообщения уйдут от вашего Telegram-аккаунта, по одному, с паузой.</p>
      <div class="modal-actions"><button class="btn" data-close>Отмена</button><button class="btn btn-primary" id="bc-send">Отправить</button></div>`);
    $('#bc-send').onclick = async () => {
      const text = $('#bc-text').value.trim();
      if (!text) return;
      if (!confirm(`Отправить сообщение ${ids.length} людям?`)) return;
      $('#bc-send').disabled = true; $('#bc-send').textContent = 'Отправляю…';
      try {
        const { results } = await api('broadcast', { method: 'POST', body: { chatIds: ids, text } });
        const ok = results.filter(r => r.ok).length, bad = results.filter(r => !r.ok);
        closeModal();
        toast(`Отправлено: ${ok} из ${results.length}${bad.length ? '. Ошибки: ' + esc(bad.map(b => `${leadById(b.chatId)?.name || b.chatId} (${b.error})`).join(', ')) : ''}`, { kind: bad.length ? 'err' : '', ttl: 12000 });
        S.selected.clear(); poll();
      } catch (e) { err(e); $('#bc-send').disabled = false; $('#bc-send').textContent = 'Отправить'; }
    };
  }

  // ─── модалки ──────────────────────────────────────────────
  function modal(html) {
    $('#modal-box').innerHTML = html;
    $('#modal').hidden = false;
    setTimeout(() => { const f = $('#modal-box input, #modal-box textarea'); f && f.focus(); }, 30);
  }
  function closeModal() { $('#modal').hidden = true; $('#modal-box').innerHTML = ''; }
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });

  // ─── открытый диалог ──────────────────────────────────────
  function openChat(chatId, { modal: inModal } = {}) {
    if (!leadById(chatId) && !isAdmin()) return;
    if (S.tab !== 'chats') setTab('chats');
    if (S.view === 'table') inModal = true;
    closeChat();
    S.activeChatId = chatId;
    let container;
    if (inModal) {
      $('#chat-modal').hidden = false;
      container = $('#chat-modal-box');
    } else {
      container = $('#chat-pane');
      $('#split').classList.add('has-chat');
    }
    S.chat = createChat(container, chatId, { modal: !!inModal });
    renderList();
  }
  function closeChat() {
    if (S.chat) S.chat.destroy();
    S.chat = null; S.activeChatId = null;
    $('#chat-modal').hidden = true; $('#chat-modal-box').innerHTML = '';
    $('#split').classList.remove('has-chat');
    $('#chat-pane').innerHTML = '';
    $('#chat-pane').appendChild(chatEmptyEl);
  }
  const chatEmptyEl = $('#chat-empty');

  function createChat(container, chatId, { modal: inModal }) {
    const lead = () => leadById(chatId) || { chatId, name: 'Диалог', stage: 'new' };
    const l0 = lead();
    let messages = [], hasMore = false, loading = false, destroyed = false;
    let fullNote = null; // заметка целиком приходит с перепиской; в опросе — только начало
    const draftKey = `tgcrm_draft_${chatId}`;
    container.innerHTML = `<div class="chat">
      <div class="chat-head">
        <button class="icon-btn back-btn" data-act="back" title="Назад">←</button>
        ${inModal ? '<button class="icon-btn" data-act="back" title="Закрыть (Esc)">✕</button>' : ''}
        ${avatar(l0.name, chatId)}
        <div class="chat-title"><b>${esc(l0.name)}</b>${l0.username ? `<a href="https://t.me/${esc(l0.username)}" target="_blank" rel="noopener">@${esc(l0.username)}</a>` : '<span class="muted small">без username</span>'}</div>
        <select data-f="stage" title="Этап">${S.stages.map(s => `<option value="${s.id}">${esc(s.title)}</option>`).join('')}</select>
        <button class="btn btn-sm" data-act="task">＋ Задача</button>
        <button class="icon-btn side-toggle" data-act="side" title="Карточка лида">ⓘ</button>
      </div>
      <div class="chat-body">
        <div class="msgs" data-el="msgs"><div class="empty-state muted">Загружаю переписку…</div></div>
        <aside class="lead-side" data-el="side">
          <div><h4>Ответственный</h4><select data-f="assignee" style="width:100%"><option value="">— не назначен —</option>${S.users.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select></div>
          <div><h4>Задачи</h4><div data-el="tasks"></div><button class="btn btn-sm" data-act="task">＋ Задача</button></div>
          <div><h4>Заметка о клиенте</h4><textarea data-f="note" placeholder="Что важно знать: ниша, бюджет, боли, договорённости"></textarea><div class="muted small" data-el="note-st"></div></div>
          <div><h4>Скрипты</h4><button class="btn btn-sm" data-act="kb">📚 Открыть базу знаний</button></div>
        </aside>
      </div>
      <div class="composer">
        <button class="icon-btn" data-act="snip" title="Вставить скрипт из базы знаний">📋</button>
        <textarea data-el="input" rows="1" placeholder="Сообщение…" title="Enter — отправить, Shift+Enter — новая строка"></textarea>
        <button class="btn btn-primary" data-act="send">Отправить</button>
      </div>
    </div>`;
    const el = n => $(`[data-el="${n}"]`, container);
    const f = n => $(`[data-f="${n}"]`, container);
    const input = el('input'), msgsEl = el('msgs');
    input.value = store.get(draftKey, '');
    autoGrow();

    function syncLead() {
      const l = lead();
      f('stage').value = l.stage || 'new';
      f('assignee').value = l.assignee || '';
      if (fullNote != null && document.activeElement !== f('note')) f('note').value = fullNote;
      renderTasksSide();
    }
    function renderTasksSide() {
      const ts = S.tasks.filter(t => t.chatId === chatId).sort((a, b) => a.done - b.done || (a.dueAt || 9e15) - (b.dueAt || 9e15));
      el('tasks').innerHTML = ts.map(t => `<div class="task-mini ${t.done ? 'done' : dueClass(t.dueAt)}" data-tid="${t.id}">
        <input type="checkbox" ${t.done ? 'checked' : ''} data-act="tdone">
        <div class="t-body"><div>${esc(t.text)}</div><div class="muted small">${esc(fmtDue(t.dueAt))}${t.assignee ? ' · ' + esc(userName(t.assignee)) : ''}</div>${t.note ? `<div class="t-note">${esc(t.note)}</div>` : ''}</div>
        <button class="icon-btn" data-act="tedit" title="Изменить" style="width:24px;height:24px;font-size:12px">✎</button>
      </div>`).join('') || '<div class="muted small" style="margin-bottom:6px">Задач нет — поставьте следующий шаг</div>';
    }

    function renderMsgs(keepScroll) {
      const atBottom = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 80;
      const prevH = msgsEl.scrollHeight, prevTop = msgsEl.scrollTop;
      let html = hasMore ? '<button class="btn btn-sm load-more" data-act="more">Загрузить раньше</button>' : '';
      let lastDay = '';
      for (const m of messages) {
        const day = new Date(m.at).toDateString();
        if (day !== lastDay) { html += `<div class="day-sep">${fmtDay(m.at)}</div>`; lastDay = day; }
        html += renderMsg(chatId, m);
      }
      msgsEl.innerHTML = html || '<div class="empty-state muted">Сообщений пока нет</div>';
      if (keepScroll === 'top') msgsEl.scrollTop = msgsEl.scrollHeight - prevH + prevTop;
      else if (keepScroll !== 'stay' || atBottom) msgsEl.scrollTop = msgsEl.scrollHeight;
    }

    async function load(older) {
      if (loading) return; loading = true;
      try {
        const offset = older ? messages.length : 0;
        const l = lead();
        const data = await api(`chats/${encodeURIComponent(chatId)}/messages?limit=80&offset=${offset}${!older && !messages.length ? `&log=1&name=${encodeURIComponent(l.name || '')}` : ''}`);
        if (destroyed) return;
        if (!offset) fullNote = data.lead?.note || '';
        if (data.lead) {
          const l2 = leadById(chatId);
          if (l2) Object.assign(l2, { stage: data.lead.stage || l2.stage, assignee: data.lead.assignee ?? l2.assignee });
        }
        if (!offset) syncLead();
        if (older) { messages = data.messages.concat(messages); hasMore = data.hasMore; renderMsgs('top'); }
        else if (!messages.length) { messages = data.messages; hasMore = data.hasMore; renderMsgs(); }
        else {
          const byId = new Map(messages.map((m, i) => [m.id, i]));
          let added = false;
          for (const m of data.messages) {
            if (byId.has(m.id)) messages[byId.get(m.id)] = m;
            else { messages.push(m); added = true; }
          }
          messages.sort((a, b) => a.at - b.at);
          renderMsgs(added ? undefined : 'stay');
        }
        if (l.unread) {
          l.unread = 0; renderAll();
          api(`chats/${encodeURIComponent(chatId)}/read`, { method: 'POST' }).catch(() => {});
        }
      } catch (e) {
        if (!messages.length) msgsEl.innerHTML = `<div class="empty-state">⚠️ ${esc(e.message)}</div>`; else err(e);
      } finally { loading = false; }
    }

    async function send() {
      const text = input.value.trim();
      if (!text) return;
      const btn = $('[data-act="send"]', container);
      btn.disabled = true;
      const lastIn = [...messages].reverse().find(m => m.direction === 'in');
      try {
        const { message } = await api(`chats/${encodeURIComponent(chatId)}/send`, { method: 'POST', body: { text, chatName: lead().name, context: lastIn?.text || '' } });
        messages.push({ ...message, hasFile: false });
        input.value = ''; store.del(draftKey); autoGrow();
        renderMsgs();
        const l = lead(); l.lastMessageAt = message.at; l.lastMessagePreview = text; l.lastDirection = 'out'; l.unread = 0;
        renderAll();
        if (!S.tasks.some(t => t.chatId === chatId && !t.done)) {
          toast('💡 У лида нет следующего шага — поставьте задачу', { kind: 'task', onClick: () => taskModal({ chatId }) });
        }
      } catch (e) { err(e); }
      finally { btn.disabled = false; input.focus(); }
    }

    function autoGrow() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 200) + 'px'; }
    input.addEventListener('input', () => { autoGrow(); store.set(draftKey, input.value); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
    });
    msgsEl.addEventListener('scroll', () => { if (msgsEl.scrollTop < 40 && hasMore && !loading) load(true); });
    msgsEl.addEventListener('click', e => {
      const img = e.target.closest('img.media');
      if (img) modal(`<img class="img-view" src="${esc(img.src)}" data-close>`);
    });

    const saveNote = debounce(async () => {
      try {
        await api(`leads/${encodeURIComponent(chatId)}`, { method: 'PATCH', body: { note: f('note').value } });
        fullNote = f('note').value; el('note-st').textContent = 'Сохранено';
      } catch (e) { err(e); }
    }, 800);
    f('note').addEventListener('input', () => { el('note-st').textContent = '…'; saveNote(); });
    f('stage').addEventListener('change', async () => {
      try { await api(`leads/${encodeURIComponent(chatId)}`, { method: 'PATCH', body: { stage: f('stage').value, chatName: lead().name } }); lead().stage = f('stage').value; renderAll(); }
      catch (e) { err(e); }
    });
    f('assignee').addEventListener('change', async () => {
      try { await api(`leads/${encodeURIComponent(chatId)}`, { method: 'PATCH', body: { assignee: f('assignee').value || null } }); lead().assignee = f('assignee').value || null; renderAll(); }
      catch (e) { err(e); }
    });

    container.addEventListener('click', async e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      const act = a.dataset.act;
      if (act === 'back') { closeChat(); renderList(); }
      else if (act === 'send') send();
      else if (act === 'more') load(true);
      else if (act === 'task') taskModal({ chatId });
      else if (act === 'side') el('side').classList.toggle('open');
      else if (act === 'kb') openKb();
      else if (act === 'snip') toggleSnippets(container, input, autoGrow);
      else if (act === 'tdone') {
        const tid = a.closest('[data-tid]').dataset.tid;
        try { await toggleTask(tid, a.checked); renderTasksSide(); } catch (ex) { err(ex); }
      } else if (act === 'tedit') {
        const t = S.tasks.find(x => x.id === a.closest('[data-tid]').dataset.tid);
        if (t) taskModal({ chatId, task: t });
      }
    });

    syncLead();
    load(false);
    return {
      modal: inModal,
      refresh() { if (!destroyed) { load(false); syncLead(); } },
      syncLead,
      insert(text) { input.value = input.value ? input.value + '\n' + text : text; autoGrow(); store.set(draftKey, input.value); input.focus(); },
      destroy() { destroyed = true; }
    };
  }

  function renderMsg(chatId, m) {
    let body = '';
    const src = m.hasFile ? mediaUrl(chatId, m.id) : null;
    if (m.type === 'photo' && src) body += `<img class="media" loading="lazy" src="${src}" alt="фото">`;
    else if ((m.type === 'video' || m.type === 'video_note' || m.type === 'animation') && src) body += `<video class="media" controls preload="none" src="${src}"></video>`;
    else if ((m.type === 'voice' || m.type === 'audio') && src) body += `<audio controls preload="none" src="${src}"></audio>`;
    else if (m.type === 'document' && src) body += `<a class="file" href="${src}" target="_blank" rel="noopener">📎 ${esc(m.fileName || 'файл')}</a>${m.text ? '\n' : ''}`;
    else if (m.type === 'sticker' && src) body += `<img class="media" style="max-height:140px" loading="lazy" src="${src}" alt="${esc(m.text)}">`;
    else if (m.type !== 'text' && !src) body += `<span class="muted">${({ voice: '🎤 Голосовое', video: '🎬 Видео', photo: '📷 Фото', sticker: '🖼️ Стикер', contact: '👤 Контакт', location: '📍 Локация', video_note: '⭕ Видеосообщение' })[m.type] || ''}</span>${m.text ? '\n' : ''}`;
    if (m.text && m.type !== 'sticker') body += linkify(esc(m.text));
    let author = '';
    if (m.direction === 'out') author = m.author ? `<span class="msg-author">${esc(m.author)}</span>` : '<span class="msg-author phone" title="Отправлено напрямую из Telegram">из Telegram</span>';
    return `<div class="msg ${m.direction === 'out' ? 'out' : ''} ${m.deletedAt ? 'deleted' : ''}">${body}<div class="msg-meta">${author}${m.editedAt ? '<span>изм.</span>' : ''}${m.deletedAt ? '<span>🗑 удалено</span>' : ''}<span>${fmtTime(m.at)}</span></div></div>`;
  }

  // ─── задачи ───────────────────────────────────────────────
  async function toggleTask(id, done) {
    const { task } = await api(`tasks/${id}`, { method: 'PATCH', body: { done } });
    const i = S.tasks.findIndex(t => t.id === id); if (i >= 0) S.tasks[i] = task;
    renderAll();
  }

  async function taskModal({ chatId, task }) {
    if (task?.noteCut) {
      try { task = (await api(`tasks/${task.id}`)).task; } catch (e) { err(e); return; }
    }
    const l = leadById(chatId) || {};
    const due = task?.dueAt || (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d.getTime(); })();
    const q = (label, fn) => `<button class="btn btn-sm" type="button" data-q="${fn}">${label}</button>`;
    modal(`<h3>${task ? 'Задача' : 'Новая задача'} · ${esc(l.name || task?.chatName || '')}</h3>
      <label>Что сделать<input id="t-text" value="${esc(task?.text || '')}" placeholder="Например: перезвонить, отправить КП, напомнить про оплату"></label>
      <label>Когда<input id="t-due" type="datetime-local" value="${toLocalInput(due)}"></label>
      <div class="quick-dates">${q('Через час', 'h1')}${q('Сегодня 18:00', 't18')}${q('Завтра 10:00', 'd1')}${q('Через 3 дня', 'd3')}${q('Через неделю', 'd7')}</div>
      <label>Примечание<textarea id="t-note" placeholder="Контекст: о чём договорились, что сказать">${esc(task?.note || '')}</textarea></label>
      <label>Ответственный<select id="t-assignee">${S.users.map(u => `<option value="${u.id}" ${(task?.assignee || S.user.id) === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>
      <div class="modal-actions">
        ${task ? '<button class="btn btn-danger" id="t-del" style="margin-right:auto">Удалить</button>' : ''}
        <button class="btn" data-close>Отмена</button><button class="btn btn-primary" id="t-save">Сохранить</button>
      </div>`);
    $('#modal-box .quick-dates').addEventListener('click', e => {
      const b = e.target.closest('[data-q]'); if (!b) return;
      const d = new Date();
      if (b.dataset.q === 'h1') d.setHours(d.getHours() + 1);
      if (b.dataset.q === 't18') d.setHours(18, 0, 0, 0);
      if (b.dataset.q === 'd1') { d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); }
      if (b.dataset.q === 'd3') { d.setDate(d.getDate() + 3); d.setHours(10, 0, 0, 0); }
      if (b.dataset.q === 'd7') { d.setDate(d.getDate() + 7); d.setHours(10, 0, 0, 0); }
      $('#t-due').value = toLocalInput(d.getTime());
    });
    $('#t-save').onclick = async () => {
      const body = { text: $('#t-text').value.trim(), note: $('#t-note').value.trim(), dueAt: $('#t-due').value ? new Date($('#t-due').value).getTime() : null, assignee: $('#t-assignee').value };
      if (!body.text) { $('#t-text').focus(); return; }
      try {
        if (task) {
          const r = await api(`tasks/${task.id}`, { method: 'PATCH', body });
          const i = S.tasks.findIndex(t => t.id === task.id); if (i >= 0) S.tasks[i] = r.task;
          S.notified.delete(task.id);
        } else {
          const r = await api('tasks', { method: 'POST', body: { ...body, chatId, chatName: l.name || '' } });
          S.tasks.push(r.task);
        }
        closeModal(); renderAll(); S.chat?.syncLead();
        toast('Задача сохранена');
      } catch (e) { err(e); }
    };
    if (task) $('#t-del').onclick = async () => {
      if (!confirm('Удалить задачу?')) return;
      try { await api(`tasks/${task.id}`, { method: 'DELETE' }); S.tasks = S.tasks.filter(t => t.id !== task.id); closeModal(); renderAll(); S.chat?.syncLead(); }
      catch (e) { err(e); }
    };
  }

  function renderTasks() {
    const now = Date.now();
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const tomorrow = start.getTime() + 86400000, after = tomorrow + 86400000;
    const mine = S.taskScope === 'mine';
    const list = S.tasks.filter(t => !mine || !t.assignee || t.assignee === S.user.id);
    const groups = [
      ['🔥 Просрочено', 'red', list.filter(t => !t.done && t.dueAt && t.dueAt < now)],
      ['Сегодня', '', list.filter(t => !t.done && t.dueAt >= now && t.dueAt < tomorrow)],
      ['Завтра', '', list.filter(t => !t.done && t.dueAt >= tomorrow && t.dueAt < after)],
      ['Позже', '', list.filter(t => !t.done && t.dueAt >= after)],
      ['Без срока', '', list.filter(t => !t.done && !t.dueAt)],
      ['✓ Выполнено (последние)', '', list.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 20)]
    ];
    $('#task-groups').innerHTML = groups.filter(g => g[2].length).map(([title, cls, ts]) => `
      <div class="tg-title ${cls}">${title} <span class="badge badge-gray">${ts.length}</span></div>
      ${ts.sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0)).map(t => `<div class="task-row ${!t.done && t.dueAt && t.dueAt < now ? 'overdue' : ''}" data-tid="${t.id}">
        <input type="checkbox" ${t.done ? 'checked' : ''} data-act="done">
        <div class="t-main">
          <div class="t-text" style="${t.done ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(t.text)}</div>
          <div class="t-sub">${esc(fmtDue(t.dueAt))} · <button class="link-btn" data-act="open">💬 ${esc(leadById(t.chatId)?.name || t.chatName || 'диалог')}</button> · ${esc(userName(t.assignee))}${t.createdBy !== t.assignee ? ` · поставил ${esc(userName(t.createdBy))}` : ''}</div>
          ${t.note ? `<div class="t-note">${esc(t.note)}</div>` : ''}
        </div>
        <button class="btn btn-sm" data-act="edit">Изменить</button>
      </div>`).join('')}`).join('') || '<div class="empty-state"><div class="empty-ico">✅</div><p>Задач нет</p><p class="muted small">Ставьте задачи из диалога кнопкой «＋ Задача»</p></div>';
  }
  $('#task-groups').addEventListener('click', async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const t = S.tasks.find(x => x.id === a.closest('[data-tid]').dataset.tid); if (!t) return;
    if (a.dataset.act === 'done') { try { await toggleTask(t.id, a.checked); } catch (ex) { err(ex); } }
    if (a.dataset.act === 'open') openChat(t.chatId, { modal: true });
    if (a.dataset.act === 'edit') taskModal({ chatId: t.chatId, task: t });
  });
  $('#task-scope').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    S.taskScope = b.dataset.scope;
    $$('#task-scope button').forEach(x => x.classList.toggle('active', x === b));
    renderTasks();
  });

  // ─── разбор диалогов (Tinder) ─────────────────────────────
  const T = { all: [], queue: [], history: [], mode: 'cards', cache: new Map() };
  async function loadTriage() {
    $('#triage-progress').textContent = 'Загружаю диалоги…';
    try {
      const { conversations } = await api('triage');
      T.all = conversations;
      T.queue = conversations.filter(c => !c.decision).sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
      renderTriage();
    } catch (e) { $('#triage-progress').textContent = '⚠️ ' + e.message; }
  }
  function triageMsgs(chatId) {
    if (!T.cache.has(chatId)) T.cache.set(chatId, api(`chats/${encodeURIComponent(chatId)}/messages?limit=40`).catch(e => ({ error: e.message })));
    return T.cache.get(chatId);
  }
  function renderTriage() {
    const decided = T.all.filter(c => c.decision);
    const inCnt = decided.filter(c => c.decision === 'in').length;
    $('#triage-progress').textContent = `Осталось разобрать: ${T.queue.length} из ${T.all.length} · в CRM: ${inCnt} · не добавляем: ${decided.length - inCnt}`;
    $('#triage-cards').hidden = T.mode !== 'cards';
    $('#triage-list').hidden = T.mode !== 'list';
    if (T.mode === 'cards') renderTriageCard(); else renderTriageList();
  }
  function renderTriageCard() {
    const box = $('#triage-cards');
    const c = T.queue[0];
    if (!c) {
      box.innerHTML = `<div class="empty-state"><div class="empty-ico">🎉</div><p>Все диалоги разобраны</p>
        ${T.history.length ? '<button class="btn" data-act="undo">↶ Вернуть последний</button>' : ''}
        <p class="muted small">Новые диалоги из лички будут появляться здесь автоматически.</p></div>`;
      return;
    }
    box.innerHTML = `<div class="tcard" id="tcard">
        <div class="stamp yes">В CRM</div><div class="stamp no">Нет</div>
        <div class="tcard-head">${avatar(c.name, c.chatId, 'lg')}<div style="flex:1;min-width:0">
          <h3>${esc(c.name)}</h3>
          <div class="muted small">${c.username ? '@' + esc(c.username) + ' · ' : ''}последнее: ${fmtShort(c.lastMessageAt)}${c.unread ? ` · непрочитанных: ${c.unread}` : ''}</div>
        </div></div>
        <div class="tcard-msgs" id="tcard-msgs"><div class="empty-state muted">Загружаю переписку…</div></div>
        <div class="tcard-actions">
          <button class="btn" data-act="undo" ${T.history.length ? '' : 'disabled'} title="Вернуть (Backspace)">↶</button>
          <button class="btn btn-no" data-act="no" title="Не добавлять (←)">✕ Не добавлять</button>
          <button class="btn" data-act="skip" title="Пропустить (↓)">Позже</button>
          <button class="btn btn-yes" data-act="yes" title="Добавить в CRM (→)">✓ В CRM</button>
        </div>
      </div><div class="kbd-hint">← не добавлять · → в CRM · ↓ позже · Backspace — вернуть. На телефоне — свайп.</div>`;
    triageMsgs(c.chatId).then(data => {
      if (T.queue[0] !== c) return;
      const m = $('#tcard-msgs');
      if (data.error) { m.innerHTML = `<div class="empty-state">⚠️ ${esc(data.error)}</div>`; return; }
      let html = data.hasMore ? `<div class="day-sep">…ещё ${data.total - data.messages.length} сообщ. раньше</div>` : '';
      let lastDay = '';
      for (const msg of data.messages) {
        const day = new Date(msg.at).toDateString();
        if (day !== lastDay) { html += `<div class="day-sep">${fmtDay(msg.at)}</div>`; lastDay = day; }
        html += renderMsg(c.chatId, msg);
      }
      m.innerHTML = html || '<div class="empty-state muted">Пусто</div>';
      m.scrollTop = m.scrollHeight;
    });
    if (T.queue[1]) triageMsgs(T.queue[1].chatId);
    bindSwipe($('#tcard'));
  }
  function bindSwipe(card) {
    let x0 = null, dx = 0;
    const yes = $('.stamp.yes', card), no = $('.stamp.no', card);
    card.addEventListener('pointerdown', e => {
      if (e.target.closest('button, .tcard-msgs, a, audio, video')) return;
      x0 = e.clientX; dx = 0; card.classList.add('dragging'); card.setPointerCapture(e.pointerId);
    });
    card.addEventListener('pointermove', e => {
      if (x0 == null) return;
      dx = e.clientX - x0;
      card.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`;
      yes.style.opacity = Math.max(0, Math.min(1, dx / 120));
      no.style.opacity = Math.max(0, Math.min(1, -dx / 120));
    });
    const end = () => {
      if (x0 == null) return;
      x0 = null; card.classList.remove('dragging');
      if (dx > 120) decide('in'); else if (dx < -120) decide('out');
      else { card.style.transform = ''; yes.style.opacity = 0; no.style.opacity = 0; }
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
  }
  async function decide(decision) {
    const c = T.queue[0]; if (!c) return;
    const card = $('#tcard');
    if (card && decision !== 'skip') {
      card.style.transform = `translateX(${decision === 'in' ? 140 : -140}%) rotate(${decision === 'in' ? 18 : -18}deg)`;
      card.style.opacity = 0;
    }
    T.queue.shift();
    if (decision === 'skip') { T.queue.push(c); renderTriage(); return; }
    T.history.push({ c, prev: c.decision });
    c.decision = decision;
    setTimeout(renderTriage, card ? 200 : 0);
    try {
      await api('triage', { method: 'POST', body: { chatId: c.chatId, decision, chatName: c.name } });
      S.triagePending = Math.max(0, S.triagePending - 1); S.prevTriage = S.triagePending; renderAll();
      if (decision === 'in') poll();
    } catch (e) { err(e); }
  }
  async function undoTriage() {
    const h = T.history.pop(); if (!h) return;
    try {
      await api('triage', { method: 'POST', body: { chatId: h.c.chatId, decision: null, chatName: h.c.name } });
      h.c.decision = null; T.queue.unshift(h.c);
      S.triagePending++; S.prevTriage = S.triagePending; renderTriage(); poll();
    } catch (e) { err(e); }
  }
  $('#triage-cards').addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    ({ yes: () => decide('in'), no: () => decide('out'), skip: () => decide('skip'), undo: undoTriage })[a.dataset.act]?.();
  });
  $('#triage-mode').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    T.mode = b.dataset.mode;
    $$('#triage-mode button').forEach(x => x.classList.toggle('active', x === b));
    renderTriage();
  });
  function renderTriageList() {
    const box = $('#triage-list');
    const q = (box.dataset.q || '').toLowerCase(), fd = box.dataset.f || '';
    const list = T.all.filter(c => (!q || `${c.name} ${c.username} ${c.lastMessagePreview}`.toLowerCase().includes(q))
      && (!fd || (fd === 'none' ? !c.decision : c.decision === fd)))
      .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
    box.innerHTML = `<div class="filters" style="margin-bottom:10px">
        <input class="search" id="tl-q" type="search" placeholder="Поиск" value="${esc(box.dataset.q || '')}">
        <select id="tl-f"><option value="">Все</option><option value="none">Не разобраны</option><option value="in">В CRM</option><option value="out">Не добавляем</option></select>
      </div>` + list.map(c => `<div class="tl-row" data-id="${esc(c.chatId)}">
        ${avatar(c.name, c.chatId, 'sm')}
        <div class="tl-body"><b>${esc(c.name)}</b> <span class="muted small">${c.username ? '@' + esc(c.username) : ''} · ${fmtShort(c.lastMessageAt)}</span><div class="tl-prev">${esc(c.lastMessagePreview)}</div></div>
        <button class="btn btn-sm" data-act="peek">👁</button>
        <div class="seg"><button class="yes ${c.decision === 'in' ? 'active' : ''}" data-d="in">В CRM</button><button class="no ${c.decision === 'out' ? 'active' : ''}" data-d="out">Нет</button><button class="${!c.decision ? 'active' : ''}" data-d="">—</button></div>
      </div>`).join('');
    $('#tl-f').value = fd;
    $('#tl-q').addEventListener('input', debounce(ev => { box.dataset.q = ev.target.value; renderTriageList(); $('#tl-q').focus(); }, 250));
    $('#tl-f').addEventListener('change', ev => { box.dataset.f = ev.target.value; renderTriageList(); });
  }
  $('#triage-list').addEventListener('click', async e => {
    const row = e.target.closest('[data-id]'); if (!row) return;
    const c = T.all.find(x => x.chatId === row.dataset.id);
    if (e.target.closest('[data-act="peek"]')) {
      modal(`<h3>${esc(c.name)}</h3><div class="tcard-msgs" id="peek" style="max-height:60vh;border-radius:10px"><div class="muted">Загружаю…</div></div><div class="modal-actions"><button class="btn" data-close>Закрыть</button></div>`);
      const data = await triageMsgs(c.chatId);
      $('#peek').innerHTML = data.error ? esc(data.error) : data.messages.map(m => renderMsg(c.chatId, m)).join('');
      $('#peek').scrollTop = 1e9;
      return;
    }
    const b = e.target.closest('[data-d]'); if (!b) return;
    const decision = b.dataset.d || null;
    const was = c.decision;
    try {
      await api('triage', { method: 'POST', body: { chatId: c.chatId, decision, chatName: c.name } });
      c.decision = decision;
      T.queue = T.all.filter(x => !x.decision).sort((a, b2) => (b2.lastMessageAt || 0) - (a.lastMessageAt || 0));
      if (!was && decision) S.triagePending = Math.max(0, S.triagePending - 1);
      if (was && !decision) S.triagePending++;
      S.prevTriage = S.triagePending;
      renderTriage(); poll();
    } catch (ex) { err(ex); }
  });

  // ─── журнал работы ────────────────────────────────────────
  const EV_LABEL = {
    login: () => '🔑 Вошёл в систему', logout: () => '↩︎ Вышел',
    open: e => `👁 Открыл диалог «${esc(e.chatName)}»`,
    send: e => `✉️ Написал «${esc(e.chatName)}»: <q>${esc(e.text)}</q>${e.context ? `<div class="muted small">в ответ на: ${esc(e.context.slice(0, 160))}</div>` : ''}`,
    broadcast: e => `📣 Рассылка на ${e.count} чел.: <q>${esc(e.text)}</q>`,
    task_create: e => `⏰ Задача по «${esc(e.chatName)}»: ${esc(e.text)} (${esc(e.due)})`,
    task_done: e => `✅ Выполнил задачу по «${esc(e.chatName)}»: ${esc(e.text)}`,
    task_delete: e => `🗑 Удалил задачу по «${esc(e.chatName)}»: ${esc(e.text)}`,
    stage: e => `➡️ «${esc(e.chatName)}» → ${esc(e.stage)}`,
    triage: e => `${e.decision === 'in' ? '✓ Добавил в CRM' : e.decision === 'out' ? '✕ Не добавлять' : '↶ Вернул на разбор'}: «${esc(e.chatName)}»`,
    kb_edit: e => `📚 Изменил страницу «${esc(e.title)}»`, kb_create: e => `📚 Создал страницу «${esc(e.title)}»`,
    kb_delete: e => `📚 Удалил страницу «${esc(e.title)}»`, kb_file: e => `📎 Загрузил файл «${esc(e.file)}» в «${esc(e.title)}»`
  };
  function isoDay(ms) { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function initActivity() {
    const sel = $('#act-user');
    const cur = sel.value;
    sel.innerHTML = '<option value="">Все сотрудники</option>' + S.users.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join('');
    sel.value = cur || (S.users.find(u => u.role === 'manager')?.id || '');
    if (!$('#act-from').value) { $('#act-from').value = isoDay(Date.now() - 6 * 86400000); $('#act-to').value = isoDay(Date.now()); }
    loadActivity();
  }
  async function loadActivity() {
    $('#act-days').innerHTML = '<p class="muted">Загружаю…</p>';
    try {
      const qs = new URLSearchParams({ from: $('#act-from').value, to: $('#act-to').value });
      if ($('#act-user').value) qs.set('user', $('#act-user').value);
      const { days, summaries } = await api(`activity?${qs}`);
      $('#act-summaries').innerHTML = summaries.slice(0, 5).map((s, i) => `<div class="card summary">
        <div class="summary-head"><b>✨ ИИ-разбор: ${esc(s.userName)}</b><span class="muted small">${esc(s.from)} — ${esc(s.to)} · ${fmtShort(s.at)}</span></div>
        <details ${i === 0 ? 'open' : ''}><summary>Показать</summary><div class="md">${md(s.text)}</div></details>
      </div>`).join('');
      $('#act-days').innerHTML = days.map(d => {
        const cnt = t => d.events.filter(e => e.type === t).length;
        const p = d.presence;
        return `<div class="card act-day">
          <div class="act-day-head"><b>${esc(d.day.split('-').reverse().join('.'))} · ${esc(d.userName)}</b>
            <div class="act-stats">
              ${p ? `<span class="pill">🕐 ${fmtTime(p.first)}–${fmtTime(p.last)}</span><span class="pill">⏱ ${p.minutes} мин в системе</span>` : ''}
              <span class="pill">✉️ ${cnt('send')} сообщ.</span><span class="pill">👁 ${cnt('open')} диалогов</span>
              <span class="pill">⏰ ${cnt('task_create')} задач</span><span class="pill">✅ ${cnt('task_done')} выполнено</span>
            </div></div>
          ${d.events.slice().reverse().map(e => `<div class="ev"><span class="ev-time">${fmtTime(e.at)}</span><span class="ev-text">${(EV_LABEL[e.type] || (() => esc(e.type)))(e)}</span></div>`).join('') || '<div class="muted small">Действий нет</div>'}
        </div>`;
      }).join('') || '<div class="empty-state muted">За период активности нет</div>';
    } catch (e) { $('#act-days').innerHTML = `<p>⚠️ ${esc(e.message)}</p>`; }
  }
  $('#act-load').onclick = loadActivity;
  $('#act-user').addEventListener('change', loadActivity);
  $('#act-summary').onclick = async () => {
    const userId = $('#act-user').value || S.users.find(u => u.role === 'manager')?.id;
    if (!userId) { toast('Выберите сотрудника'); return; }
    const b = $('#act-summary'); b.disabled = true; b.textContent = '✨ Анализирую… (до минуты)';
    try {
      await api('summary', { method: 'POST', body: { userId, from: $('#act-from').value, to: $('#act-to').value } });
      await loadActivity();
    } catch (e) { err(e); }
    finally { b.disabled = false; b.textContent = '✨ ИИ-разбор'; }
  };

  // ─── команда ──────────────────────────────────────────────
  async function loadTeam() {
    try {
      const { users } = await api('users');
      $('#team-list').innerHTML = users.map(u => `<div class="team-row" data-uid="${esc(u.id)}">
        ${avatar(u.name, u.id)}
        <div class="tm-body"><b>${esc(u.name)}</b> <span class="muted">· логин <code>${esc(u.login)}</code> · ${u.role === 'admin' ? 'админ' : 'менеджер'}${u.active ? '' : ' · <b style="color:var(--danger)">отключён</b>'}</span></div>
        <button class="btn btn-sm" data-act="pass">Сменить пароль</button>
        ${u.id !== S.user.id ? `<button class="btn btn-sm" data-act="toggle">${u.active ? 'Отключить' : 'Включить'}</button>` : ''}
      </div>`).join('');
    } catch (e) { err(e); }
  }
  $('#team-list').addEventListener('click', async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const uid = a.closest('[data-uid]').dataset.uid;
    try {
      if (a.dataset.act === 'pass') {
        const p = prompt('Новый пароль (от 6 символов):');
        if (!p) return;
        await api(`users/${uid}`, { method: 'PATCH', body: { password: p } });
        toast('Пароль изменён');
      } else if (a.dataset.act === 'toggle') {
        const active = a.textContent.trim() === 'Включить';
        await api(`users/${uid}`, { method: 'PATCH', body: { active } });
        loadTeam();
      }
    } catch (ex) { err(ex); }
  });
  $('#team-add').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    try { await api('users', { method: 'POST', body: fd }); e.target.reset(); toast('Сотрудник добавлен'); loadTeam(); poll(); }
    catch (ex) { err(ex); }
  });

  // ─── markdown ─────────────────────────────────────────────
  function mdInline(s) {
    return s.split(/(`[^`]+`)/).map(part => {
      if (/^`[^`]+`$/.test(part)) return `<code>${esc(part.slice(1, -1))}</code>`;
      let h = esc(part);
      h = h.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|#)[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      h = h.replace(/(^|[\s(])(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
      h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<b>$1</b>');
      h = h.replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>').replace(/(^|[^_\w])_([^_\s][^_]*)_(?!\w)/g, '$1<i>$2</i>');
      h = h.replace(/~~([^~]+)~~/g, '<s>$1</s>');
      return h;
    }).join('');
  }
  function md(src) {
    const lines = String(src || '').replace(/\r/g, '').split('\n');
    const out = [];
    let i = 0;
    const isBlockStart = l => /^(#{1,6}\s|```|>|\s*([-*+]|\d+[.)])\s|\|)/.test(l) || /^(-{3,}|\*{3,})\s*$/.test(l);
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      if (line.startsWith('```')) {
        const buf = []; i++;
        while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
        i++;
        out.push(`<pre><button class="copy-btn" data-copy>Копировать</button><code>${esc(buf.join('\n'))}</code></pre>`);
        continue;
      }
      let m;
      if ((m = line.match(/^(#{1,6})\s+(.*)/))) { const n = Math.min(m[1].length, 4); out.push(`<h${n}>${mdInline(m[2])}</h${n}>`); i++; continue; }
      if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
      if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
        const row = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const head = row(line); i += 2;
        const body = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) body.push(row(lines[i++]));
        out.push(`<table><thead><tr>${head.map(c => `<th>${mdInline(c)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${mdInline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
        continue;
      }
      if (line.startsWith('>')) {
        const buf = [];
        while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''));
        out.push(`<blockquote>${md(buf.join('\n'))}<button class="copy-btn" data-copy>Копировать</button></blockquote>`);
        continue;
      }
      if (/^\s*([-*+]|\d+[.)])\s/.test(line)) {
        const items = [];
        while (i < lines.length && (/^\s*([-*+]|\d+[.)])\s/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
          const lm = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)/);
          if (lm) items.push({ level: Math.floor(lm[1].replace(/\t/g, '  ').length / 2), ordered: /\d/.test(lm[2]), text: lm[3] });
          else items[items.length - 1].text += ' ' + lines[i].trim();
          i++;
        }
        let html = '', stack = [];
        for (const it of items) {
          while (stack.length > it.level + 1) html += `</li></${stack.pop()}>`;
          if (stack.length === it.level + 1) html += '</li>';
          while (stack.length < it.level + 1) { const tag = it.ordered ? 'ol' : 'ul'; stack.push(tag); html += `<${tag}>`; }
          const task = it.text.match(/^\[( |x|X)\]\s+(.*)/);
          html += task ? `<li class="task"><input type="checkbox" disabled ${task[1] !== ' ' ? 'checked' : ''}> ${mdInline(task[2])}` : `<li>${mdInline(it.text)}`;
        }
        while (stack.length) html += `</li></${stack.pop()}>`;
        out.push(html);
        continue;
      }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !(buf.length && isBlockStart(lines[i]))) buf.push(lines[i++]);
      out.push(`<p>${buf.map(mdInline).join('<br>')}</p>`);
    }
    return out.join('\n');
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const box = b.parentElement.cloneNode(true);
    box.querySelectorAll('[data-copy], [data-insert]').forEach(x => x.remove());
    const text = box.innerText.trim();
    navigator.clipboard?.writeText(text).then(() => { b.textContent = 'Скопировано ✓'; setTimeout(() => { b.textContent = 'Копировать'; }, 1500); });
  });

  // ─── база знаний ──────────────────────────────────────────
  async function ensureKb() {
    if (!S.kb) S.kb = (await api('kb')).pages;
    return S.kb;
  }
  function kbChildren(parentId) { return S.kb.filter(p => (p.parentId || null) === parentId).sort((a, b) => (a.order || 0) - (b.order || 0)); }
  async function openKb(pageId) {
    $('#kb').hidden = false;
    try { await ensureKb(); } catch (e) { err(e); return; }
    if (pageId) S.kbActive = pageId;
    if (!S.kbActive || !S.kb.some(p => p.id === S.kbActive)) S.kbActive = kbChildren(null)[0]?.id || null;
    S.kbEdit = false;
    renderKbTree(); renderKbPage();
  }
  $('#kb-open').onclick = () => openKb();
  $('#kb-close').onclick = () => { $('#kb').hidden = true; };
  function renderKbTree() {
    const q = $('#kb-search').value.trim().toLowerCase();
    if (q) {
      const hits = S.kb.filter(p => `${p.title}\n${p.content}`.toLowerCase().includes(q));
      $('#kb-tree').innerHTML = hits.map(p => {
        const idx = (p.content || '').toLowerCase().indexOf(q);
        const snip = idx >= 0 ? p.content.slice(Math.max(0, idx - 40), idx + 80).replace(/\n/g, ' ') : '';
        return `<div class="kb-hit" data-id="${p.id}"><b>${esc(p.icon || '📄')} ${esc(p.title)}</b>${snip ? `<small>…${esc(snip)}…</small>` : ''}</div>`;
      }).join('') || '<div class="muted small" style="padding:8px">Ничего не найдено</div>';
      return;
    }
    const walk = (parentId, depth) => kbChildren(parentId).map(p => `<div class="kb-item ${p.id === S.kbActive ? 'active' : ''}" data-id="${p.id}" style="padding-left:${8 + depth * 16}px"><span class="kb-ico">${esc(p.icon || '📄')}</span><span class="kb-t">${esc(p.title)}</span></div>${walk(p.id, depth + 1)}`).join('');
    $('#kb-tree').innerHTML = walk(null, 0) || '<div class="muted small" style="padding:8px">Пока пусто</div>';
  }
  $('#kb-tree').addEventListener('click', e => {
    const it = e.target.closest('[data-id]'); if (!it) return;
    S.kbActive = it.dataset.id; S.kbEdit = false;
    $('#kb').classList.remove('side-open');
    renderKbTree(); renderKbPage();
  });
  $('#kb-search').addEventListener('input', debounce(renderKbTree, 150));
  $('#kb-add').onclick = () => kbCreate(null);
  async function kbCreate(parentId) {
    try {
      const { page } = await api('kb', { method: 'POST', body: { title: 'Новая страница', parentId, content: '' } });
      S.kb.push(page); S.kbActive = page.id; S.kbEdit = true;
      renderKbTree(); renderKbPage();
    } catch (e) { err(e); }
  }
  function renderKbPage() {
    const main = $('#kb-main');
    const p = S.kb.find(x => x.id === S.kbActive);
    if (!p) { main.innerHTML = '<div class="kb-doc"><button class="btn kb-menu-btn" data-act="menu">☰ Страницы</button><div class="empty-state">Выберите страницу слева</div></div>'; return; }
    const crumbs = [];
    for (let c = p; c && c.parentId; ) { c = S.kb.find(x => x.id === c.parentId); if (c) crumbs.unshift(c); }
    const kids = kbChildren(p.id);
    const canInsert = !!S.chat;
    if (S.kbEdit) {
      main.innerHTML = `<div class="kb-doc">
        <div class="kb-doc-tools"><button class="btn btn-primary btn-sm" data-act="save">Сохранить (Ctrl+S)</button><button class="btn btn-sm" data-act="cancel">Отмена</button>
          <span>Markdown: # заголовок, **жирный**, - список, &gt; цитата (готовая фраза с кнопкой «Копировать»), | таблица |</span></div>
        <div class="kb-title"><input class="kb-icon-in" id="kb-icon" value="${esc(p.icon || '📄')}" maxlength="4"><input id="kb-t" value="${esc(p.title)}"></div>
        <textarea class="kb-edit" id="kb-c">${esc(p.content || '')}</textarea>
      </div>`;
      $('#kb-c').focus();
      return;
    }
    main.innerHTML = `<div class="kb-doc">
      <div class="kb-doc-tools">
        <button class="btn btn-sm kb-menu-btn" data-act="menu">☰</button>
        ${crumbs.map(c => `<a href="#" data-goto="${c.id}">${esc(c.icon || '')} ${esc(c.title)}</a> /`).join(' ')}
        <span class="spacer"></span>
        <span>изм. ${fmtShort(p.updatedAt)}${p.updatedBy && p.updatedBy !== 'seed' ? ' · ' + esc(userName(p.updatedBy)) : ''}</span>
        <button class="btn btn-sm" data-act="edit">✏️ Редактировать</button>
        <button class="btn btn-sm" data-act="sub">＋ Подстраница</button>
        <button class="btn btn-sm btn-danger" data-act="del">Удалить</button>
      </div>
      <h1 class="kb-title">${esc(p.icon || '📄')} ${esc(p.title)}</h1>
      ${kids.length ? `<div class="kb-children">${kids.map(k => `<a href="#" data-goto="${k.id}">${esc(k.icon || '📄')} ${esc(k.title)}</a>`).join('')}</div>` : ''}
      <div class="md" id="kb-md">${md(p.content) || '<p class="muted">Пустая страница. Нажмите «Редактировать».</p>'}</div>
      <div class="kb-files">
        <h4 style="margin:0 0 8px">📎 Файлы</h4>
        ${(p.files || []).map(fl => `<div class="kb-file"><a href="/api/tgcrm/kbfile/${fl.id}?t=${S.token}" target="_blank" rel="noopener">${esc(fl.name)}</a><span class="muted small">${(fl.size / 1024).toFixed(0)} КБ</span><button class="btn btn-sm" data-delfile="${fl.id}">✕</button></div>`).join('') || '<div class="muted small">Файлов нет</div>'}
        <label class="btn btn-sm" style="margin-top:8px;cursor:pointer">Загрузить файл<input type="file" id="kb-file" hidden></label>
      </div>
    </div>`;
    if (canInsert) $$('#kb-md blockquote, #kb-md pre').forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'copy-btn'; btn.dataset.insert = '1'; btn.textContent = '↳ В чат'; btn.style.right = '96px';
      b.appendChild(btn);
    });
    $('#kb-file').addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      const form = new FormData(); form.append('file', file);
      try { const { page } = await api(`kb/${p.id}/files`, { method: 'POST', form }); Object.assign(p, page); renderKbPage(); toast('Файл загружен'); }
      catch (ex) { err(ex); }
    });
  }
  $('#kb-main').addEventListener('click', async e => {
    const p = S.kb?.find(x => x.id === S.kbActive);
    const go = e.target.closest('[data-goto]');
    if (go) { e.preventDefault(); S.kbActive = go.dataset.goto; renderKbTree(); renderKbPage(); return; }
    const ins = e.target.closest('[data-insert]');
    if (ins && S.chat) {
      const box = ins.parentElement.cloneNode(true);
      box.querySelectorAll('[data-copy], [data-insert]').forEach(x => x.remove());
      S.chat.insert(box.innerText.trim());
      $('#kb').hidden = true;
      return;
    }
    const df = e.target.closest('[data-delfile]');
    if (df && p) {
      if (!confirm('Удалить файл?')) return;
      try { const { page } = await api(`kb/${p.id}/files/${df.dataset.delfile}`, { method: 'DELETE' }); Object.assign(p, page); renderKbPage(); } catch (ex) { err(ex); }
      return;
    }
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'menu') $('#kb').classList.toggle('side-open');
    if (!p) return;
    if (act === 'edit') { S.kbEdit = true; renderKbPage(); }
    if (act === 'cancel') { S.kbEdit = false; renderKbPage(); }
    if (act === 'save') kbSave(p);
    if (act === 'sub') kbCreate(p.id);
    if (act === 'del') {
      if (!confirm(`Удалить «${p.title}» и все её подстраницы?`)) return;
      try { await api(`kb/${p.id}`, { method: 'DELETE' }); S.kb = null; await ensureKb(); S.kbActive = null; openKb(); } catch (ex) { err(ex); }
    }
  });
  async function kbSave(p) {
    try {
      const { page } = await api(`kb/${p.id}`, { method: 'PATCH', body: { title: $('#kb-t').value, icon: $('#kb-icon').value, content: $('#kb-c').value } });
      Object.assign(p, page); S.kbEdit = false; renderKbTree(); renderKbPage(); toast('Сохранено');
    } catch (e) { err(e); }
  }

  // Готовые фразы для вставки в чат: цитаты (> …) и блоки кода из базы знаний.
  function kbSnippets() {
    const out = [];
    for (const p of S.kb || []) {
      let heading = p.title, quote = [];
      const flush = () => { if (quote.length) { out.push({ where: `${p.title}${heading !== p.title ? ' → ' + heading : ''}`, text: quote.join('\n').trim() }); quote = []; } };
      for (const line of (p.content || '').split('\n')) {
        const h = line.match(/^#{1,6}\s+(.*)/);
        if (h) { flush(); heading = h[1].replace(/[*_`]/g, ''); continue; }
        if (line.startsWith('>')) quote.push(line.replace(/^>\s?/, '').replace(/\*\*/g, ''));
        else flush();
      }
      flush();
    }
    return out.filter(s => s.text.length > 3);
  }
  async function toggleSnippets(container, input, autoGrow) {
    const old = $('.snip-pop', container);
    if (old) { old.remove(); return; }
    try { await ensureKb(); } catch (e) { err(e); return; }
    const all = kbSnippets();
    const pop = document.createElement('div');
    pop.className = 'snip-pop';
    pop.innerHTML = `<input type="search" placeholder="Поиск скрипта (${all.length})"><div data-el="snips"></div>`;
    $('.composer', container).appendChild(pop);
    const render = q => {
      q = (q || '').toLowerCase();
      const list = all.filter(s => !q || `${s.where} ${s.text}`.toLowerCase().includes(q)).slice(0, 60);
      $('[data-el="snips"]', pop).innerHTML = list.map((s, i) => `<div class="snip" data-i="${all.indexOf(s)}"><small>${esc(s.where)}</small>${esc(s.text)}</div>`).join('')
        || '<div class="muted small" style="padding:8px">Нет фраз. Добавьте в базу знаний цитаты вида «&gt; текст».</div>';
    };
    render('');
    const si = $('input', pop); si.focus();
    si.addEventListener('input', () => render(si.value));
    pop.addEventListener('click', e => {
      const s = e.target.closest('.snip'); if (!s) return;
      const text = all[+s.dataset.i].text;
      input.value = input.value ? input.value + '\n' + text : text;
      autoGrow(); input.dispatchEvent(new Event('input')); pop.remove(); input.focus();
    });
  }

  // ─── клавиатура ───────────────────────────────────────────
  document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if (e.key === 'Escape') {
      if (!$('#modal').hidden) { closeModal(); return; }
      const pop = $('.snip-pop'); if (pop) { pop.remove(); return; }
      if (!$('#kb').hidden) { if (!S.kbEdit) $('#kb').hidden = true; return; }
      if (!$('#chat-modal').hidden) { closeChat(); return; }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && !$('#kb').hidden && S.kbEdit) {
      e.preventDefault(); const p = S.kb.find(x => x.id === S.kbActive); if (p) kbSave(p); return;
    }
    if (S.tab === 'triage' && T.mode === 'cards' && !typing && $('#modal').hidden && $('#kb').hidden) {
      if (e.key === 'ArrowRight') { e.preventDefault(); decide('in'); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); decide('out'); }
      if (e.key === 'ArrowDown') { e.preventDefault(); decide('skip'); }
      if (e.key === 'Backspace') { e.preventDefault(); undoTriage(); }
    }
  });

  // ─── старт ────────────────────────────────────────────────
  if (S.token) start(); else showLogin();
})();
