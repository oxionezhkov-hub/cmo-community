// Яндекс.Метрика — Reporting API (https://yandex.ru/dev/metrika/doc/api2/api_v1/intro.html).
// Токен: OAuth с правами на счётчик. goalId — цель «Заявка» в счётчике.
import { request } from './lib/http.js';

const ENDPOINT = 'https://api-metrika.yandex.net/stat/v1/data';

export async function fetchMetrika({ token, counterId, goalId }, period) {
  const metrics = ['ym:s:visits', 'ym:s:bounceRate', 'ym:s:pageDepth'];
  if (goalId) metrics.push(`ym:s:goal${goalId}reaches`);
  const params = new URLSearchParams({
    ids: String(counterId),
    date1: period.from,
    date2: period.to,
    metrics: metrics.join(','),
    dimensions: 'ym:s:date,ym:s:lastsignTrafficSource',
    limit: '10000',
    accuracy: 'full',
  });
  const res = await request(`${ENDPOINT}?${params}`, { headers: { Authorization: `OAuth ${token}` } });
  return res.data.data.map((row) => ({
    date: row.dimensions[0].name,
    source: row.dimensions[1].name,
    visits: row.metrics[0],
    bounceRate: row.metrics[1],
    pageDepth: row.metrics[2],
    goalLeads: goalId ? row.metrics[3] : 0,
  }));
}
