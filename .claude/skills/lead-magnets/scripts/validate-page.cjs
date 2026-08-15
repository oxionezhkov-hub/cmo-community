#!/usr/bin/env node
/**
 * validate-page.cjs
 *
 * Проверяет готовую страницу лид-магнита перед публикацией (Фаза 5).
 * Не про красоту вёрстки — про типовые баги, которые незаметны при беглом
 * просмотре, но убивают конверсию или аналитику.
 *
 * Usage:
 *   node validate-page.cjs <path-to-index.html>
 *   node validate-page.cjs <path-to-index.html> --json
 */

const fs = require("fs");
const path = require("path");

function validatePage(filePath) {
  const results = {
    path: filePath,
    valid: true,
    issues: [],
    warnings: [],
  };

  if (!fs.existsSync(filePath)) {
    results.valid = false;
    results.issues.push(`File not found: ${filePath}`);
    return results;
  }

  const html = fs.readFileSync(filePath, "utf-8");

  // 1. Незаполненные плейсхолдеры шаблона
  const placeholders = html.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (placeholders) {
    const unique = [...new Set(placeholders)];
    results.issues.push(
      `Остались незаполненные плейсхолдеры (${unique.length}): ${unique
        .slice(0, 10)
        .join(", ")}${unique.length > 10 ? ", ..." : ""}`
    );
  }

  // 2. Lorem ipsum / очевидные заглушки
  if (/lorem ipsum/i.test(html)) {
    results.issues.push("Найден текст-заглушка Lorem ipsum");
  }

  // 3. Viewport meta (мобильный первый)
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    results.issues.push("Нет <meta name=\"viewport\"> — страница не будет адаптивной на мобильных");
  }

  // 4. Title не пустой и не заглушка
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  if (!titleMatch || !titleMatch[1].trim()) {
    results.issues.push("Пустой или отсутствующий <title>");
  }

  // 5. Счётчик Яндекс.Метрики
  const hasMetricaScript = /mc\.yandex\.ru\/metrika\/tag\.js/.test(html);
  const hasYmInit = /ym\(\s*\d+\s*,\s*["']init["']/.test(html);
  if (!hasMetricaScript) {
    results.issues.push("Не найден скрипт счётчика Яндекс.Метрики");
  } else if (!hasYmInit) {
    results.issues.push(
      "Счётчик Метрики подключён, но ID счётчика не подставлен (ym вызывается без числового ID) — без счётчика Фаза 6 (аналитика) невозможна"
    );
  }

  // 6. Форма/CTA присутствует
  const hasForm = /<form[\s>]/i.test(html);
  const hasCtaButton = /data-cta|type=["']submit["']/i.test(html);
  if (!hasForm && !hasCtaButton) {
    results.issues.push("Не найдено ни формы, ни кнопки с целевым действием (CTA)");
  }

  // 7. Webhook для формы не оставлен пустым/плейсхолдером
  const webhookMatch = html.match(/data-webhook=["']([^"']*)["']/i);
  if (hasForm && (!webhookMatch || !webhookMatch[1] || webhookMatch[1].includes("{{"))) {
    results.issues.push("У формы не указан рабочий адрес отправки (data-webhook)");
  }

  // 8. Alt-тексты у изображений
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imagesWithoutAlt = imgTags.filter((tag) => !/alt=["'][^"']+["']/.test(tag));
  if (imagesWithoutAlt.length > 0) {
    results.warnings.push(
      `${imagesWithoutAlt.length} изображени${imagesWithoutAlt.length === 1 ? "е" : "й"} без alt-текста`
    );
  }

  // 9. Внешние тяжёлые библиотеки (страница должна быть самодостаточной)
  const externalScripts = (html.match(/<script[^>]+src=["']https?:\/\/[^"']+["']/gi) || []).filter(
    (tag) => !/mc\.yandex\.ru/.test(tag)
  );
  if (externalScripts.length > 0) {
    results.warnings.push(
      `Подключены внешние скрипты помимо метрики (${externalScripts.length}) — страница может перестать быть самодостаточной`
    );
  }

  results.valid = results.issues.length === 0;
  return results;
}

function formatOutput(results) {
  const lines = [];
  lines.push("\n" + "=".repeat(60));
  lines.push(`LEAD MAGNET PAGE VALIDATION: ${path.basename(results.path)}`);
  lines.push("=".repeat(60));
  lines.push(`\nStatus: ${results.valid ? "OK" : "FAIL"}`);
  lines.push(`Path: ${results.path}`);

  if (results.issues.length > 0) {
    lines.push("\nISSUES (блокируют публикацию):");
    results.issues.forEach((issue) => lines.push(`  - ${issue}`));
  }

  if (results.warnings.length > 0) {
    lines.push("\nWARNINGS (не блокируют, но стоит проверить):");
    results.warnings.forEach((warning) => lines.push(`  - ${warning}`));
  }

  if (results.valid) {
    lines.push("\nВсе обязательные проверки пройдены. Можно переходить к деплою.");
  }

  lines.push("\n" + "=".repeat(60));
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const filePath = args.find((a) => !a.startsWith("--"));

  if (!filePath) {
    console.error("Usage: node validate-page.cjs <path-to-index.html> [--json]");
    console.error("\nExample:");
    console.error("  node validate-page.cjs lead-magnets/pages/kak-uvelichit-loyalnost/index.html");
    process.exit(1);
  }

  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const results = validatePage(resolvedPath);

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(formatOutput(results));
  }

  process.exit(results.valid ? 0 : 1);
}

main();
