/* Отрисовка дашборда. Все цифры берутся из data/dashboard.js (window.DASHBOARD_DATA),
   который собирает collectors/collect.js. Здесь — только представление. */
const D = window.DASHBOARD_DATA;

/* ---------- форматирование ---------- */
const nf = new Intl.NumberFormat('ru-RU');
const num = (n) => nf.format(Math.round(Number(n) || 0));
const money = (n) => `${num(n)} ₽`;
const moneyShort = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(Math.abs(v) >= 1e8 ? 0 : 1).replace('.', ',')} млн ₽`;
  if (Math.abs(v) >= 1e4) return `${Math.round(v / 1e3)} тыс ₽`;
  return money(v);
};
const dm = (s) => new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
const signed = (n) => `${n > 0 ? '+' : ''}${String(n).replace('.', ',')}`;
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

const COLORS = { blue: '#2F5BEA', green: '#0F9D6E', red: '#DC3D43', amber: '#D98A00', violet: '#6D4AFF', teal: '#0E9AA7', ink3: '#8D96A8', line: '#E8EBF2' };

/* ---------- Chart.js: общие настройки ---------- */
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.color = '#5A6478';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 7;
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.plugins.tooltip.backgroundColor = '#131A2B';
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 10;
Chart.defaults.plugins.tooltip.boxPadding = 5;
Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
Chart.defaults.maintainAspectRatio = false;
const axis = (extra = {}) => ({ grid: { color: COLORS.line, drawTicks: false }, border: { display: false }, ticks: { padding: 8 }, ...extra });

/* ---------- шапка ---------- */
function header() {
  document.getElementById('company').textContent = D.meta.company;
  document.getElementById('period').textContent =
    `${dm(D.meta.period.from)} — ${dm(D.meta.period.to)} · обновлено ${new Date(D.meta.generatedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
  document.getElementById('kpiHint').textContent =
    `сравнение с ${dm(D.meta.comparePeriod.from)} — ${dm(D.meta.comparePeriod.to)} · план — месячный, из Google Sheets`;

  const box = document.getElementById('topChips');
  const bad = D.sources.filter((s) => s.status === 'error').length;
  box.appendChild(el(`<span class="chip ${D.meta.mode === 'demo' ? 'demo' : ''}"><span class="dot"></span>${
    D.meta.mode === 'demo' ? 'Демо-данные' : bad ? `${bad} источник(ов) с ошибкой` : 'Все источники на связи'}</span>`));
  D.sources.forEach((s) => box.appendChild(el(
    `<span class="chip" title="${s.note || (s.rows ? s.rows + ' строк' : '')}"><span class="dot" style="background:${
      s.status === 'error' ? COLORS.red : s.status === 'off' ? COLORS.ink3 : s.status === 'demo' ? COLORS.violet : COLORS.green}"></span>${s.name}</span>`)));
}

/* ---------- KPI ---------- */
/** Скользящее среднее — спарклайн должен показывать тренд, а не дневной шум. */
function smooth(values, win = 3) {
  return values.map((_, i) => {
    const from = Math.max(0, i - Math.floor(win / 2));
    const slice = values.slice(from, from + win).map((v) => Number(v) || 0);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function sparkline(values, color) {
  const w = 240, h = 34, pad = 2;
  const vals = smooth(values.map((v) => Number(v) || 0));
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const pt = (v, i) => [pad + (i * (w - pad * 2)) / Math.max(vals.length - 1, 1), h - pad - ((v - min) / span) * (h - pad * 2)];
  const line = vals.map((v, i) => pt(v, i).join(',')).join(' L');
  const area = `M${line} L${w - pad},${h} L${pad},${h} Z`;
  const id = 'g' + Math.random().toString(36).slice(2, 8);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="100%" height="34">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity=".22"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#${id})"/>
    <path d="M${line}" fill="none" stroke="${color}" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

function kpiValue(k) {
  if (k.unit === '₽') return k.value >= 100000 ? moneyShort(k.value) : money(k.value);
  if (k.unit === '%') return `${String(k.value).replace('.', ',')}%`;
  return num(k.value);
}

function kpis() {
  const grid = document.getElementById('kpiGrid');
  D.kpi.forEach((k) => {
    const better = k.good === 'neutral' ? 'flat' : (k.good === 'up' ? k.delta > 0 : k.delta < 0) ? 'up' : k.delta === 0 ? 'flat' : 'down';
    const color = better === 'up' ? COLORS.green : better === 'down' ? COLORS.red : COLORS.blue;
    // Для CPL «хорошо» — не превышать план, поэтому шкала считается наоборот.
    const planCls = k.plan
      ? (k.good === 'down'
          ? (k.planDone <= 100 ? 'ok' : k.planDone <= 115 ? 'warn' : 'bad')
          : (k.planDone >= 95 ? 'ok' : k.planDone >= 75 ? 'warn' : 'bad'))
      : '';
    const plan = k.plan ? `<div class="planbar">
        <div class="t"><span>план ${k.unit === '₽' ? moneyShort(k.plan) : num(k.plan)}</span><span>${k.planDone}%</span></div>
        <div class="track"><i class="${planCls}" style="width:${Math.min(k.planDone, 100)}%"></i></div>
      </div>` : '';
    grid.appendChild(el(`<div class="card kpi">
      <div class="lab">${k.label}</div>
      <div class="val">${kpiValue(k)}</div>
      <div class="row">
        <span class="pill ${better}">${k.delta > 0 ? '▲' : k.delta < 0 ? '▼' : '='} ${signed(k.delta)}%</span>
        <span class="vs">к прошлому периоду</span>
      </div>
      ${sparkline(k.spark, color)}
      ${plan}
    </div>`));
  });
}

/* ---------- инсайты ---------- */
const SEV = { critical: 'Требует решения', warning: 'Под контроль', opportunity: 'Точка роста', info: 'К сведению' };
function insights() {
  document.getElementById('insHint').textContent =
    `${D.insights.length} вывода по данным за период · ${D.meta.mode === 'demo' ? 'правила + Claude API' : 'Claude API'}`;
  const grid = document.getElementById('insGrid');
  D.insights.forEach((i) => {
    const ev = (i.evidence || []).map((e) => `<span>${e.label}: <b>${e.value}</b></span>`).join('');
    const impact = i.impact > 0 ? `<div class="impact">Оценка эффекта: <b>${money(i.impact)}</b></div>` : '';
    grid.appendChild(el(`<div class="card insight ${i.severity}">
      <span class="tag">${SEV[i.severity] || i.severity}</span>
      <h4>${i.title}</h4>
      <p>${i.summary}</p>
      <div class="ev">${ev}</div>
      <div class="act"><span class="ic">→</span><span>${i.action}</span></div>
      ${impact}
      <div class="srcs">${(i.sources || []).map((s) => `<span>${s}</span>`).join('')}</div>
    </div>`));
  });
}

/* ---------- динамика ---------- */
let dailyChart;
function daily(days = D.daily.length) {
  const rows = D.daily.slice(-days);
  const cfg = {
    data: {
      labels: rows.map((r) => dm(r.date)),
      datasets: [
        { type: 'bar', label: 'Расход, ₽', data: rows.map((r) => r.spend), backgroundColor: '#DCE4FD', hoverBackgroundColor: '#C3D0FB', borderRadius: 5, yAxisID: 'y1', order: 3 },
        { type: 'line', label: 'Заявки', data: rows.map((r) => r.leads), borderColor: COLORS.blue, backgroundColor: COLORS.blue, borderWidth: 2.5, tension: .35, pointRadius: 0, pointHoverRadius: 4, yAxisID: 'y', order: 1 },
        { type: 'line', label: 'CPL, ₽', data: rows.map((r) => r.cpl), borderColor: COLORS.amber, borderWidth: 2, borderDash: [5, 4], tension: .35, pointRadius: 0, pointHoverRadius: 4, yAxisID: 'y2', order: 2 },
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: axis({ grid: { display: false } }),
        y: axis({ position: 'left', title: { display: true, text: 'заявки' }, beginAtZero: true }),
        y1: axis({ position: 'right', grid: { display: false }, beginAtZero: true, ticks: { callback: (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v) } }),
        // CPL живёт в своём масштабе: иначе линия прижимается к нулю рядом с расходом
        y2: { display: false, beginAtZero: true, suggestedMax: Math.max(...rows.map((r) => r.cpl)) * 1.8 },
      },
      plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.dataset.yAxisID === 'y' ? num(c.parsed.y) : money(c.parsed.y)}` } } },
    },
  };
  if (dailyChart) { dailyChart.data = cfg.data; dailyChart.update(); return; }
  dailyChart = new Chart(document.getElementById('chDaily'), cfg);
}

function funnel(target, steps, opts = {}) {
  const box = document.getElementById(target);
  box.innerHTML = '';
  if (opts.head) box.appendChild(el(`<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:6px">${
    opts.head.map((h) => `<div><div style="color:var(--ink-3);font-size:12px">${h.l}</div><div style="font-weight:650;font-size:15px">${h.v}</div></div>`).join('')}</div>`));
  const max = Math.max(...steps.map((s) => s.value));
  steps.forEach((s, i) => {
    const prev = i ? steps[i - 1].value : null;
    const conv = prev ? `${((s.value / prev) * 100).toFixed(1).replace('.', ',')}% от пред.` : (opts.firstLabel || '100%');
    box.appendChild(el(`<div class="fstep">
      <div class="flab">${s.stage}${s.source ? ` <small style="color:var(--ink-3)">· ${s.source}</small>` : ''}</div>
      <div class="fbar"><i style="width:${Math.max((s.value / max) * 100, 6)}%"></i><span class="${(s.value / max) < .3 ? 'out' : ''}" style="${
        (s.value / max) < .3 ? `left:calc(${Math.max((s.value / max) * 100, 6)}% + 10px)` : ''}">${num(s.value)}</span></div>
      <div class="fmeta"><b>${conv}</b>${prev ? `<span>−${num(prev - s.value)}</span>` : ''}</div>
    </div>`));
  });
}

/* ---------- каналы и кампании ---------- */
function channels() {
  new Chart(document.getElementById('chChannels'), {
    type: 'bar',
    data: {
      labels: D.channels.map((c) => c.name),
      datasets: [
        { label: 'Расход', data: D.channels.map((c) => c.spend), backgroundColor: '#C3D0FB', borderRadius: 5 },
        { label: 'Выручка', data: D.channels.map((c) => c.revenue), backgroundColor: COLORS.green, borderRadius: 5 },
      ],
    },
    options: {
      indexAxis: 'y',
      scales: { x: axis({ beginAtZero: true, ticks: { callback: (v) => (v >= 1e6 ? `${v / 1e6} млн` : v >= 1000 ? `${v / 1000}k` : v) } }), y: axis({ grid: { display: false } }) },
      plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${money(c.parsed.x)}` } } },
    },
  });

  table('tblChannels',
    [{ k: 'name', t: 'Канал', align: 'left' }, { k: 'leads', t: 'Заявки' }, { k: 'cpl', t: 'CPL' }, { k: 'qualRate', t: 'Квал.' }, { k: 'romi', t: 'ROMI' }],
    D.channels.map((c) => ({
      name: `<div class="name"><b>${c.name}</b><small>${c.paid ? money(c.spend) : 'без прямых затрат'}</small></div>`,
      leads: num(c.leads),
      cpl: c.paid ? `${money(c.cpl)} ${deltaBadge(c.cplDelta, 'down')}` : '—',
      qualRate: barCell(c.qualRate, 100, `${c.qualRate}%`, c.qualRate >= 60 ? 'green' : c.qualRate >= 45 ? '' : 'amber'),
      romi: c.romi === null ? '—' : `<span class="badge ${c.romi > 100 ? 'g' : c.romi < 0 ? 'r' : 'n'}">${num(c.romi)}%</span>`,
    })));

  const cols = [
    { k: 'name', t: 'Кампания', align: 'left', raw: (c) => c.name },
    { k: 'spend', t: 'Расход', raw: (c) => c.spend },
    { k: 'clicks', t: 'Клики', raw: (c) => c.clicks },
    { k: 'ctr', t: 'CTR', raw: (c) => c.ctr },
    { k: 'cpc', t: 'CPC', raw: (c) => c.cpc },
    { k: 'leads', t: 'Заявки', raw: (c) => c.leads },
    { k: 'cpl', t: 'CPL', raw: (c) => c.cpl },
    { k: 'qualRate', t: 'Квал.', raw: (c) => c.qualRate },
    { k: 'deals', t: 'Продажи', raw: (c) => c.deals },
    { k: 'romi', t: 'ROMI', raw: (c) => c.romi },
  ];
  const paid = D.campaigns.filter((c) => c.spend > 0);
  const maxCpl = Math.max(...paid.map((c) => c.cpl));
  const render = (sortKey, dir) => {
    const rows = [...paid].sort((a, b) => {
      const col = cols.find((c) => c.k === sortKey);
      const va = col.raw(a), vb = col.raw(b);
      return (typeof va === 'string' ? String(va).localeCompare(vb) : va - vb) * dir;
    }).map((c) => ({
      name: `<div class="name"><b>${c.name}</b><small>${c.channel}</small></div>`,
      spend: money(c.spend),
      clicks: num(c.clicks),
      ctr: `${String(c.ctr).replace('.', ',')}%`,
      cpc: money(c.cpc),
      leads: num(c.leads),
      cpl: barCell(c.cpl, maxCpl, `${money(c.cpl)} ${deltaBadge(c.cplDelta, 'down')}`, c.cpl > maxCpl * 0.6 ? 'red' : c.cpl > maxCpl * 0.35 ? 'amber' : 'green'),
      qualRate: `${String(c.qualRate).replace('.', ',')}%`,
      deals: num(c.deals),
      romi: `<span class="badge ${c.romi > 100 ? 'g' : c.romi < 0 ? 'r' : 'n'}">${num(c.romi)}%</span>`,
    }));
    table('tblCampaigns', cols, rows, { sortKey, dir, onSort: (k) => render(k, k === sortKey ? -dir : -1) });
  };
  render('spend', -1);
}

function deltaBadge(d, good = 'up') {
  if (!d) return '';
  const ok = good === 'up' ? d > 0 : d < 0;
  return `<span class="badge ${ok ? 'g' : 'r'}">${signed(d)}%</span>`;
}
function barCell(value, max, label, cls = '') {
  return `<div class="bar-cell"><span>${label}</span><span class="bar"><i class="${cls}" style="width:${Math.min((value / max) * 100, 100)}%"></i></span></div>`;
}

function table(id, cols, rows, opts = {}) {
  const t = document.getElementById(id);
  const head = cols.map((c) => `<th class="${opts.onSort ? 'sortable' : ''} ${opts.sortKey === c.k ? 'act-sort' : ''}" data-k="${c.k}">${c.t}${
    opts.sortKey === c.k ? (opts.dir === 1 ? ' ↑' : ' ↓') : ''}</th>`).join('');
  const body = rows.map((r) => `<tr>${cols.map((c) => `<td>${r[c.k] ?? '—'}</td>`).join('')}</tr>`).join('');
  t.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
  if (opts.onSort) t.querySelectorAll('th').forEach((th) => th.addEventListener('click', () => opts.onSort(th.dataset.k)));
}

/* ---------- Метрика ---------- */
function site() {
  const s = D.metrika.sources;
  new Chart(document.getElementById('chSources'), {
    type: 'doughnut',
    data: {
      labels: s.map((x) => x.source),
      datasets: [{ data: s.map((x) => x.visits), backgroundColor: [COLORS.blue, COLORS.violet, COLORS.teal, COLORS.green, COLORS.amber, '#B4BDCE'], borderWidth: 0, hoverOffset: 6 }],
    },
    options: { cutout: '62%', plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (c) => `${c.label}: ${num(c.parsed)} визитов` } } } },
  });
  const maxV = Math.max(...s.map((x) => x.visits));
  table('tblSources',
    [{ k: 'source', t: 'Источник', align: 'left' }, { k: 'visits', t: 'Визиты' }, { k: 'bounce', t: 'Отказы' }, { k: 'depth', t: 'Глубина' }, { k: 'leads', t: 'Заявки' }, { k: 'cr', t: 'CR' }],
    s.map((x) => ({
      source: `<div class="name"><b>${x.source}</b></div>`,
      visits: barCell(x.visits, maxV, num(x.visits)),
      bounce: `<span class="badge ${x.bounceRate > 40 ? 'r' : x.bounceRate > 30 ? 'n' : 'g'}">${String(x.bounceRate).replace('.', ',')}%</span>`,
      depth: String(x.pageDepth).replace('.', ','),
      leads: num(x.leads),
      cr: `${String(x.cr).replace('.', ',')}%`,
    })));
}

/* ---------- бот ---------- */
function bot() {
  const b = D.telegram;
  new Chart(document.getElementById('chBot'), {
    type: 'line',
    data: {
      labels: b.daily.map((d) => dm(d.date)),
      datasets: [
        { label: 'Дошли до конца квиза, %', data: b.daily.map((d) => d.quizRate), borderColor: COLORS.violet, backgroundColor: 'rgba(109,74,255,.10)', fill: true, borderWidth: 2.5, tension: .35, pointRadius: 0, pointHoverRadius: 4 },
        { label: 'Записались на консультацию', data: b.daily.map((d) => d.bookedCall), borderColor: COLORS.teal, borderWidth: 2, tension: .35, pointRadius: 0, pointHoverRadius: 4, yAxisID: 'y1' },
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      scales: { x: axis({ grid: { display: false } }), y: axis({ beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%` } }), y1: axis({ position: 'right', grid: { display: false }, beginAtZero: true }) },
    },
  });
  funnel('botFunnel', b.funnel);
}

/* ---------- amoCRM ---------- */
function sales() {
  const a = D.amo;
  const stats = [
    { l: 'Средний чек', v: money(a.avgCheck), d: a.avgCheckPrev ? `было ${money(a.avgCheckPrev)}` : '' },
    { l: 'Средний цикл сделки', v: `${String(a.avgCycle).replace('.', ',')} дн.`, d: `было ${String(a.avgCyclePrev).replace('.', ',')} дн.` },
    { l: 'В работе / выиграно / проиграно', v: a.pipeline.map((p) => num(p.count)).join(' · '), d: `выиграно на ${moneyShort(a.pipeline[1].sum)}` },
  ];
  const box = document.getElementById('amoStats');
  stats.forEach((s) => box.appendChild(el(`<div class="card kpi"><div class="lab">${s.l}</div><div class="val">${s.v}</div><div class="row"><span class="vs">${s.d}</span></div></div>`)));

  table('tblManagers',
    [{ k: 'name', t: 'Менеджер', align: 'left' }, { k: 'leads', t: 'Заявки' }, { k: 'deals', t: 'Продажи' }, { k: 'conv', t: 'Конверсия' }, { k: 'cycle', t: 'Цикл' }, { k: 'no', t: 'Не дозвонились' }, { k: 'rev', t: 'Выручка' }],
    a.managers.map((m) => ({
      name: `<div class="name"><b>${m.name}</b></div>`,
      leads: num(m.leads),
      deals: num(m.deals),
      conv: `${String(m.convRate).replace('.', ',')}%`,
      cycle: `<span class="badge ${m.avgCycle > a.avgCycle * 1.25 ? 'r' : m.avgCycle < a.avgCycle * 0.9 ? 'g' : 'n'}">${String(m.avgCycle).replace('.', ',')} дн.</span>`,
      no: num(m.noAnswer),
      rev: moneyShort(m.revenue),
    })));

  new Chart(document.getElementById('chLost'), {
    type: 'bar',
    data: {
      labels: a.lostReasons.map((r) => r.reason),
      datasets: [{ label: 'Сделок', data: a.lostReasons.map((r) => r.count), backgroundColor: a.lostReasons.map((r, i) => (i === 0 ? COLORS.red : '#C3D0FB')), borderRadius: 5 }],
    },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: axis({ beginAtZero: true }), y: axis({ grid: { display: false } }) } },
  });
}

/* ---------- план/факт и дайджест ---------- */
function planFact() {
  document.getElementById('planCap').textContent = `месяц ${new Date(D.meta.period.to).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })} · факт за ${D.daily.length} дн.`;
  const box = document.getElementById('planRows');
  D.sheets.planFact.forEach((r) => {
    const done = r.done || 0;
    const good = r.good === 'down' ? done <= 100 : done >= 90;
    const fmtv = (v) => (r.metric === 'Выручка' || r.metric === 'CPL' ? (r.metric === 'CPL' ? money(v) : moneyShort(v)) : num(v));
    box.appendChild(el(`<div>
      <div class="t" style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
        <span><b>${r.metric}</b> <span style="color:var(--ink-3)">${fmtv(r.fact)} из ${fmtv(r.plan)}</span></span>
        <span class="badge ${good ? 'g' : done >= 75 ? 'n' : 'r'}">${done}%</span>
      </div>
      <div class="track"><i class="${good ? 'ok' : done >= 75 ? 'warn' : 'bad'}" style="width:${Math.min(done, 100)}%"></i></div>
    </div>`));
  });
  document.getElementById('digest').textContent = (D.digest || '').replace(/\*/g, '');
}

/* ---------- откуда данные ---------- */
const LINEAGE = [
  ['Расход, клики, показы, кампании', 'Яндекс.Директ', 'Reports API v5, отчёт CAMPAIGN_PERFORMANCE_REPORT'],
  ['Визиты, отказы, глубина, источники', 'Яндекс.Метрика', 'Reporting API, метрики ym:s:*'],
  ['Воронка бота: /start → квиз → запись', 'Telegram-бот', 'события бота из собственного хранилища + Bot API'],
  ['Заявки, квалификация, сделки, выручка', 'amoCRM', 'API v4 /leads с фильтром по дате создания'],
  ['План месяца и офлайн-расходы', 'Google Sheets', 'Sheets API v4, диапазоны «План» и «Расходы»'],
  ['Инсайты и дайджест', 'Claude API', 'правила считают аномалии, модель формулирует выводы'],
];
function pipelineTable() {
  const st = Object.fromEntries(D.sources.map((s) => [s.name, s]));
  table('tblPipeline',
    [{ k: 'block', t: 'Блок дашборда', align: 'left' }, { k: 'src', t: 'Источник' }, { k: 'how', t: 'Как забираем' }, { k: 'status', t: 'Статус' }],
    LINEAGE.map(([block, src, how]) => ({
      block: `<div class="name"><b>${block}</b></div>`,
      src, how: `<span style="color:var(--ink-2)">${how}</span>`,
      status: st[src]
        ? `<span class="badge ${st[src].status === 'ok' ? 'g' : st[src].status === 'error' ? 'r' : 'n'}">${
            st[src].status === 'ok' ? `ok · ${num(st[src].rows)} строк` : st[src].status === 'demo' ? 'демо' : st[src].status === 'off' ? 'выключен' : 'ошибка'}</span>`
        : '<span class="badge n">—</span>',
    })));
  document.getElementById('modeNote').innerHTML = D.meta.mode === 'demo'
    ? 'Сейчас дашборд собран на демо-данных: цифры сгенерированы <code>collectors/demo_source.js</code> в том же формате, в котором их отдают реальные API. Чтобы переключиться на боевые данные — скопируйте <code>config.example.json</code> в <code>config.json</code>, впишите доступы и запустите <code>node collect.js --mode=live</code>.'
    : 'Дашборд собран на боевых данных. Обновление — по расписанию (cron / GitHub Actions), дайджест уходит в Telegram при появлении критичного инсайта.';
  document.getElementById('footNote').innerHTML =
    `Собрано ${new Date(D.meta.generatedAt).toLocaleString('ru-RU')} · период ${dm(D.meta.period.from)} — ${dm(D.meta.period.to)} · режим: ${D.meta.mode}. Дашборд — статичный HTML: данные лежат в <code>data/dashboard.json</code>, пересобираются одной командой.`;
}

/* ---------- запуск ---------- */
header();
kpis();
insights();
daily();
const [imp, clicks, ...rest] = D.funnel;
funnel('funnel', rest, {
  firstLabel: 'весь трафик',
  head: [
    { l: 'Показы (Директ)', v: num(imp.value) },
    { l: 'Клики (Директ)', v: num(clicks.value) },
    { l: 'CTR', v: `${((clicks.value / imp.value) * 100).toFixed(2).replace('.', ',')}%` },
  ],
});
channels();
site();
bot();
sales();
planFact();
pipelineTable();

document.getElementById('rangeSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  document.querySelectorAll('#rangeSeg button').forEach((x) => x.classList.toggle('on', x === b));
  daily(Number(b.dataset.days));
});
