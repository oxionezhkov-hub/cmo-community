/**
 * Приёмник анкет клубных чатов для Google Таблицы.
 *
 * Как подключить:
 * 1. Открой Google Таблицу, куда писать ответы → Расширения → Apps Script.
 * 2. Вставь этот код вместо содержимого Code.gs и сохрани.
 * 3. (Необязательно) Задай секрет: Настройки проекта → Свойства скрипта → SECRET = любая строка.
 *    То же значение положи в секрет воркера MOD_SHEET_SECRET.
 * 4. Начать развёртывание → Новое развёртывание → Тип «Веб-приложение»:
 *    «Запуск от имени» — от моего имени, «У кого есть доступ» — Все.
 * 5. Скопируй URL веб-приложения и положи его в секрет воркера:
 *    wrangler secret put MOD_SHEET_WEBHOOK
 *
 * Для каждого клуба создаётся своя вкладка (по названию клуба), первая строка — заголовки.
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
    if (secret && data.secret !== secret) return json_({ ok: false, error: 'bad secret' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var name = String(data.sheet || 'Анкеты').replace(/[\[\]\*\?\/\\:]/g, '').slice(0, 90);
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sheet.getLastRow() === 0 && data.headers) {
      sheet.appendRow(data.headers);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow(data.row || []);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
