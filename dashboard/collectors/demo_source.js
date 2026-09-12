// Демо-источник: генерирует «сырые» данные в том же формате, в котором их
// отдают реальные коннекторы (yandex_direct.js, yandex_metrika.js и т.д.).
// Нужен, чтобы дашборд и весь пайплайн можно было показать без доступов к API.
import { rng, round, dateRange, weekdayFactor, isoDate } from './lib/util.js';

export const COMPANY = 'Онлайн-школа профессий «Вектор»';

export const CAMPAIGNS = [
  { id: 71100101, name: 'Поиск / Бренд',                channel: 'Яндекс.Директ — Поиск', cpc: 34,  ctr: 0.19,  clicks: 120, cr: 0.079, quality: 0.74 },
  { id: 71100102, name: 'Поиск / Профессия «Аналитик»', channel: 'Яндекс.Директ — Поиск', cpc: 96,  ctr: 0.082, clicks: 190, cr: 0.041, quality: 0.58 },
  { id: 71100103, name: 'Поиск / Профессия «Дизайнер»', channel: 'Яндекс.Директ — Поиск', cpc: 88,  ctr: 0.077, clicks: 170, cr: 0.038, quality: 0.54 },
  { id: 71100104, name: 'Поиск / Конкуренты',           channel: 'Яндекс.Директ — Поиск', cpc: 131, ctr: 0.058, clicks: 70,  cr: 0.026, quality: 0.44 },
  { id: 71100205, name: 'РСЯ / Ретаргетинг',            channel: 'Яндекс.Директ — РСЯ',   cpc: 22,  ctr: 0.006, clicks: 260, cr: 0.028, quality: 0.61 },
  { id: 71100206, name: 'РСЯ / Look-alike',             channel: 'Яндекс.Директ — РСЯ',   cpc: 19,  ctr: 0.004, clicks: 380, cr: 0.013, quality: 0.39 },
  { id: 71100207, name: 'РСЯ / Широкий интерес',        channel: 'Яндекс.Директ — РСЯ',   cpc: 17,  ctr: 0.003, clicks: 420, cr: 0.009, quality: 0.21, drift: 1.62 },
  { id: 71100308, name: 'Мастер кампаний / Автотаргет', channel: 'Мастер кампаний',       cpc: 41,  ctr: 0.021, clicks: 150, cr: 0.031, quality: 0.49 },
];

const ORGANIC = [
  { source: 'Органический поиск', visits: 940, bounce: 0.31, depth: 3.4, cr: 0.021 },
  { source: 'Telegram-канал',     visits: 610, bounce: 0.24, depth: 4.1, cr: 0.020 },
  { source: 'Email-рассылка',     visits: 240, bounce: 0.28, depth: 3.8, cr: 0.030 },
  { source: 'Переходы с сайтов',  visits: 180, bounce: 0.44, depth: 2.2, cr: 0.008 },
  { source: 'Прямые заходы',      visits: 320, bounce: 0.35, depth: 3.0, cr: 0.012 },
];

const MANAGERS = ['Анна К.', 'Игорь М.', 'Полина С.', 'Тимур Р.'];
const LOST_REASONS = ['Не дозвонились', 'Дорого', 'Выбрал конкурента', 'Не готов сейчас', 'Нецелевой'];

/**
 * @param {{from:string,to:string}} period
 * @param {{seed?:number, decay?:number}} [opts] decay<1 — «прошлый период» (спокойнее)
 */
export function generateRaw(period, opts = {}) {
  const seed = opts.seed ?? 20260912;
  const rand = rng(seed);
  const days = dateRange(period.from, period.to);
  const n = days.length;
  const era = opts.era ?? 'current'; // current | previous

  const direct = [];
  const metrika = [];
  const bot = [];
  const leads = [];
  let leadSeq = opts.leadStart ?? 100000;

  days.forEach((date, i) => {
    const wf = weekdayFactor(date);
    const progress = n > 1 ? i / (n - 1) : 0;
    const noise = () => 0.86 + rand() * 0.28;

    // ---- Яндекс.Директ: показы / клики / расход по кампаниям ----
    for (const c of CAMPAIGNS) {
      // «Широкий интерес» в текущем периоде разгоняют — это и станет главным инсайтом.
      const driftK = c.drift && era === 'current' ? 1 + (c.drift - 1) * progress : 1;
      const clicks = Math.round(c.clicks * wf * noise() * driftK * (era === 'previous' ? 0.92 : 1));
      const impressions = Math.round((clicks / c.ctr) * noise());
      const cpcToday = round(c.cpc * (era === 'current' ? 1 + 0.09 * progress : 1) * noise(), 2);
      const spend = round(clicks * cpcToday, 2);
      direct.push({ date, campaignId: c.id, campaign: c.name, impressions, clicks, spend });

      // ---- Заявки из платного трафика (в CRM попадут как сделки) ----
      const crK = c.drift && era === 'current' ? 1 - 0.28 * progress : 1;
      const count = Math.round(clicks * c.cr * crK * noise());
      for (let k = 0; k < count; k++) {
        leads.push(makeLead(rand, ++leadSeq, date, c.channel, c.name, c.quality, era, progress));
      }
    }

    // ---- Метрика: визиты по источникам ----
    for (const s of ORGANIC) {
      const visits = Math.round(s.visits * wf * noise() * (era === 'previous' ? 0.9 : 1));
      const goalLeads = Math.round(visits * s.cr * noise());
      metrika.push({
        date, source: s.source, visits,
        bounceRate: round(s.bounce * noise() * 100, 1),
        pageDepth: round(s.depth * noise(), 2),
        goalLeads,
      });
      const chan = s.source === 'Telegram-канал' ? 'Telegram' : s.source === 'Email-рассылка' ? 'Email' : s.source === 'Органический поиск' ? 'SEO' : 'Прочее';
      for (let k = 0; k < goalLeads; k++) {
        leads.push(makeLead(rand, ++leadSeq, date, chan, '—', 0.66, era, progress));
      }
    }

    // ---- Telegram-бот ----
    // В текущем периоде на 18-й день ломается шаг «квиз» — второй инсайт.
    const broken = era === 'current' && i >= 18;
    const started = Math.round(78 * wf * noise());
    const quiz = Math.round(started * (broken ? 0.24 : 0.63) * noise());
    const booked = Math.round(quiz * 0.41 * noise());
    bot.push({
      date,
      joined: Math.round(96 * wf * noise()),
      left: Math.round(11 * wf * noise()),
      started,
      quizCompleted: quiz,
      bookedCall: booked,
    });
    for (let k = 0; k < booked; k++) {
      leads.push(makeLead(rand, ++leadSeq, date, 'Telegram-бот', 'Бот · квиз', 0.81, era, progress));
    }
  });

  return {
    period,
    direct,
    metrika,
    bot,
    leads,
    sheets: buildSheets(period, era),
    lastLeadId: leadSeq,
  };
}

function makeLead(rand, id, date, channel, campaign, quality, era, progress) {
  const qualified = rand() < quality;
  // Скорость обработки в текущем периоде проседает — третий инсайт.
  const manager = MANAGERS[Math.floor(rand() * MANAGERS.length)];
  const slow = era === 'current' && manager === 'Игорь М.';
  const cycle = round((slow ? 6.4 : 3.1) * (0.7 + rand() * 0.9) + (era === 'current' ? progress * 0.8 : 0), 1);
  const won = qualified && rand() < (slow ? 0.055 : 0.10);
  const amount = won ? Math.round((48000 + rand() * 92000) / 1000) * 1000 : 0;
  const status = won ? 'Успешно реализовано' : qualified ? (rand() < 0.55 ? 'В работе' : 'Закрыто и не реализовано') : 'Закрыто и не реализовано';
  return {
    id: `L-${id}`,
    createdAt: `${date}T${String(8 + Math.floor(rand() * 12)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}:00`,
    channel, campaign, manager,
    qualified,
    status,
    amount,
    cycleDays: cycle,
    lostReason: status === 'Закрыто и не реализовано'
      ? (slow && rand() < 0.5 ? 'Не дозвонились' : LOST_REASONS[Math.floor(rand() * LOST_REASONS.length)])
      : null,
  };
}

// ---- Google Sheets: план и офлайн-расходы, которых нет ни в одном API ----
function buildSheets(period, era) {
  const month = period.to.slice(0, 7);
  const k = era === 'previous' ? 0.95 : 1;
  return {
    plan: [
      { month, metric: 'Заявки', plan: 3200 },
      { month, metric: 'Квал. заявки', plan: 1900 },
      { month, metric: 'Продажи', plan: 210 },
      { month, metric: 'Выручка', plan: 19500000 },
      { month, metric: 'CPL', plan: 900 },
    ],
    costs: [
      { month, channel: 'Telegram Ads', spend: round(420000 * k) },
      { month, channel: 'Контент и SEO', spend: round(310000 * k) },
      { month, channel: 'Email-платформа', spend: round(38000 * k) },
      { month, channel: 'Работа агентства', spend: round(180000 * k) },
    ],
  };
}

export { MANAGERS, LOST_REASONS, ORGANIC };
export const demoMeta = { company: COMPANY, generatedFrom: 'demo_source.js' };
export const todayIso = () => isoDate(new Date());
