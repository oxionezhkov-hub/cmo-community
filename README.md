# CMO Community (cmo-razbory)

Telegram-бот + веб-приложение для закрытого комьюнити «Разборы CMO» — платформы для маркетинг-директоров с курсом, квизами-разборами на ИИ, random coffee и админкой.

Работает как единый **Cloudflare Worker** (`worker.js`) с хранением данных в **Cloudflare KV**.

## Возможности

- **Telegram-бот** — вебхук-обработчик, регистрация и онбординг пользователей.
- **Mini App / веб-кабинет** — программа курса, задания, прогресс, вопросы.
- **ИИ-квизы**:
  - Quiz 1 — AI Maturity Score (шаблонный, без ИИ).
  - Quiz 2 — разбор лендинга через Claude.
  - Quiz 3 — многоходовой диалог с «нутрициологом» (голос + текст).
- **Лид-магниты** — интерактивные лендинги-разборы (например, «Куда утекают пациенты стоматологии»), исходники в `lead-magnets/`.
- **Random Coffee** — авто-формирование пар раз в неделю (пн 12:00 МСК) и напоминание/оценка (пт), через cron-триггер.
- **Админка** (`/admin`) — пользователи, аналитика, CRM, посещаемость воркшопов, активность в чате, платежи.
- **Платежи** — приём вебхуков от edsofa.ai.
- **События** — список ивентов с генерацией `.ics`-файлов для календаря.

## Стек

- Cloudflare Workers (`wrangler.toml`)
- Cloudflare KV (хранилище)
- Telegram Bot API
- Claude API (анализ в квизах)

## Структура репозитория

```
worker.js           — весь backend/frontend воркера (роутинг, API, HTML/CSS/JS)
wrangler.toml        — конфигурация Cloudflare Worker, KV, cron
lead-magnets/         — исходники и структура лид-магнитов
.claude/skills/       — скиллы для Claude Code (дизайн, брендинг, лендинги и т.д.)
```

## Настройка и деплой

1. Установить [Wrangler](https://developers.cloudflare.com/workers/wrangler/).
2. Задать секреты:
   ```
   wrangler secret put BOT_TOKEN               # токен Telegram-бота
   wrangler secret put ADMIN_ID                 # chat id для админ-уведомлений
   wrangler secret put PAYMENTS_WEBHOOK_SECRET   # секрет вебхука edsofa.ai
   ```
3. Деплой:
   ```
   wrangler deploy
   ```
4. Установить вебхук Telegram: открыть `/setup-webhook` на домене воркера.

## Локальная разработка

```
wrangler dev
```
