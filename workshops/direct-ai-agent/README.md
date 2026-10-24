# Воркшоп «ИИ-агент ведёт Яндекс.Директ»

Презентация (28 слайдов, с заметками спикера): https://claude.ai/artifact/TFYVQ2ZogAdQLy6PcaKkZg

Блоки: цифры экономии → три способа подключения (Claude Code/Codex + MCP, удалённый MCP, свой сервер) →
доступ к API и баллы → автозапуск кампании (бриф, тексты, картинки, JSON, таргетинги) → автостратегии и ритм
оптимизации → Reports и инсайты → безопасность (патч → dry-run → согласование → применение), cron, грабли,
план на 7 дней → скилл «Директ-агент».

## Источники цифр

| Цифра | Откуда |
|---|---|
| 12 минут вместо 3–4 часов на аудит, минусацию и отчёт | [vc.ru — Claude Code + Яндекс Директ](https://vc.ru/marketing/2808268-claude-code-i-yandeks-direkt-avtomatizatsiya-reklamy) |
| 6 → 1 час в день, CPA −42%, CTR +65%, проверка каждые 30 минут | [viora.pro — кейс агентства](https://viora.pro/case-ai-agent-yandex-direct) |
| Запуск < 15 минут, CPA в 3 раза ниже | [PromoPult — ИИ-маркетолог](https://blog.promopult.ru/promopult/kak-s-pomoshhyu-ii-marketologa-snizili-cpa-v-direkte-v-3-raza.html) |
| +17% конверсий у нейрообъявлений (данные Яндекса) | [обзоры нейрообъявлений](https://blog.promopult.ru/ppc/nejroobyavleniya-v-yandeks-direkte.html) |
| +12% от «Персонализации», автоприменение рекомендаций до +4% бюджета, ошибка 1 400 вместо 950 ₽ | [aksanov.digital](https://aksanov.digital/blog/yandex-direct/vedenie-yandex-direct-s-ai-agentom) |
| МАКО: +10% лидов, −8% CPA | [Sostav](https://www.sostav.ru/blogs/275971/74200) |
| 21% специалистов используют агентов, 1–5 ч/нед экономии | [State of PPC 2026](https://almcorp.com/blog/state-of-ppc-2026-global-report/) |
| 198 «конверсий» против 42 реальных, РСЯ 14% → 6%, CPC ×4 | [vc.ru — 9 104 ₽ на Директ с AI](https://vc.ru/marketing/3089288-analiz-reklamnoy-kampanii-na-yandeks-direkt-s-ispolzovaniem-ai) |
| Патч → dry-run → согласование, 35/26 патчей, 4 481 ₽ на одну фразу | [Хабр — ИИ-агенты для Директа](https://habr.com/ru/articles/1079434/) |
| Баллы, лимиты картинок, v501 для ЕПК | [документация API Директа](https://yandex.ru/dev/direct/doc/ru/) |
| MCP-серверы | [askads](https://github.com/askads/mcp-yandex-direct), [axisrow](https://github.com/axisrow/yandex-direct-mcp-plugin), [Yurich-ru](https://github.com/Yurich-ru/yandex-ads-mcp) |

Почти все кейсы опубликованы авторами инструментов, контрольных групп в них нет. На воркшопе это стоит проговорить.

Ошибка 58 на слайде — реальный ответ API при подготовке: токен есть, но заявка приложения в Директе
(Инструменты → API → «Мои заявки») ещё не одобрена.
