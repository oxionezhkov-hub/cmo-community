/* План воронки — рабочее пространство: документы (как Notion) и доски (как Miro).
   Исходники: plan/plan.js, plan/plan.css, plan/seed.md. Сборка для воркера: node plan/build-worker-assets.mjs */
(function () {
'use strict';

// ════════════════════════════════════════════════════════════
//  Утилиты
// ════════════════════════════════════════════════════════════
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl';
const modKey = e => (isMac ? e.metaKey : e.ctrlKey);
let idCounter = 0;
const uid = () => Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 8) + (idCounter++).toString(36);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
}

function debounce(fn, ms) {
  let t = null;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => { t = null; fn(...a); }, ms); };
  d.flush = () => { if (t) { clearTimeout(t); t = null; fn(); } };
  d.cancel = () => { clearTimeout(t); t = null; };
  return d;
}

const ICONS = {
  plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
  grip: '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="5.5" cy="3.5" r="1.2"/><circle cx="10.5" cy="3.5" r="1.2"/><circle cx="5.5" cy="8" r="1.2"/><circle cx="10.5" cy="8" r="1.2"/><circle cx="5.5" cy="12.5" r="1.2"/><circle cx="10.5" cy="12.5" r="1.2"/></svg>',
  chevron: '<svg viewBox="0 0 12 12" fill="currentColor"><path d="M4 2.5l4.5 3.5L4 9.5z"/></svg>',
  dots: '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="12.5" cy="8" r="1.3"/></svg>',
  cursor: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M5 3l10 6.5-4.6 1.1L8.2 15z"/></svg>',
  hand: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10V4.8a1.2 1.2 0 012.4 0V9.5M9.4 9V3.7a1.2 1.2 0 012.4 0V9.5M11.8 9.5V4.9a1.2 1.2 0 012.4 0v6.6c0 3.3-2.2 5.5-5.2 5.5-2.2 0-3.4-1-4.6-2.9L3 10.6a1.2 1.2 0 012-1.3L7 11.4"/></svg>',
  sticky: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M4 3.5h12v8.5l-4.5 4.5H4z"/><path d="M11.5 16.5V12H16"/></svg>',
  shape: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7.5" width="9" height="9" rx="1.5"/><circle cx="13" cy="7" r="4"/></svg>',
  text: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4.5 5V3.8h11V5M10 3.8v12.4M7.8 16.2h4.4"/></svg>',
  frame: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 2.5v15M14 2.5v15M2.5 6h15M2.5 14h15"/></svg>',
  line: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16L15.5 4.5"/><path d="M9.5 4.5h6v6"/></svg>',
  minus: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 10h10"/></svg>',
  plusL: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M10 5v10M5 10h10"/></svg>',
  fit: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5v-4h4M16.5 7.5v-4h-4M3.5 12.5v4h4M16.5 12.5v4h-4"/></svg>',
  trash: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12M8 6V4.5h4V6M5.5 6l.8 10h7.4l.8-10"/></svg>',
  copy: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="7" y="7" width="9" height="9" rx="1.5"/><path d="M13 7V4.5A1.5 1.5 0 0011.5 3h-7A1.5 1.5 0 003 4.5v7A1.5 1.5 0 004.5 13H7"/></svg>',
  front: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="3" y="3" width="9" height="9" rx="1" opacity=".45"/><rect x="8" y="8" width="9" height="9" rx="1" fill="currentColor" fill-opacity=".2"/></svg>',
  back: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="8" y="8" width="9" height="9" rx="1" opacity=".45"/><rect x="3" y="3" width="9" height="9" rx="1" fill="currentColor" fill-opacity=".2"/></svg>'
};

// ════════════════════════════════════════════════════════════
//  Безопасный HTML (только простая разметка текста)
// ════════════════════════════════════════════════════════════
const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'CODE', 'A', 'SPAN', 'BR', 'FONT', 'DIV', 'P', 'MARK']);
const SAFE_CSS_VAL = /^[#a-z0-9(),.\s%-]{1,40}$/i;
const sanitizeCache = new Map();

function sanitizeHtml(html) {
  if (!html) return '';
  html = String(html);
  if (!/[<&]/.test(html)) return html;
  const hit = sanitizeCache.get(html);
  if (hit !== undefined) return hit;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  cleanNode(tpl.content);
  const out = tpl.innerHTML;
  if (sanitizeCache.size > 3000) sanitizeCache.clear();
  sanitizeCache.set(html, out);
  return out;
}
function cleanNode(node) {
  for (const ch of Array.from(node.childNodes)) {
    if (ch.nodeType === 3) continue;
    if (ch.nodeType !== 1) { ch.remove(); continue; }
    const tag = ch.tagName;
    if (!ALLOWED_TAGS.has(tag)) {
      if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE|SVG|MATH|IMG|VIDEO|AUDIO|LINK|META|TITLE|NOSCRIPT)$/.test(tag)) { ch.remove(); continue; }
      cleanNode(ch);
      ch.replaceWith(...Array.from(ch.childNodes));
      continue;
    }
    for (const a of Array.from(ch.attributes)) {
      const n = a.name.toLowerCase();
      if (tag === 'A' && n === 'href') {
        if (!/^(https?:|mailto:|tel:)/i.test(a.value.trim())) ch.removeAttribute('href');
      } else if (n === 'style') {
        const keep = [];
        for (const prop of ['color', 'background-color']) {
          const v = ch.style.getPropertyValue(prop);
          if (v && SAFE_CSS_VAL.test(v)) keep.push(prop + ':' + v);
        }
        if (keep.length) ch.setAttribute('style', keep.join(';')); else ch.removeAttribute('style');
      } else if (tag === 'FONT' && n === 'color') {
        if (!SAFE_CSS_VAL.test(a.value)) ch.removeAttribute('color');
      } else ch.removeAttribute(a.name);
    }
    cleanNode(ch);
  }
}
function htmlToText(html) {
  if (!html) return '';
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|p)>/gi, '\n');
  return tpl.content.textContent.replace(/\n$/, '');
}
function textToHtml(t) { return esc(t).replace(/\n/g, '<br>'); }
function normHtml(html) {
  if (!html) return '';
  if (/^(\s|<br\s*\/?>)*$/i.test(html)) return '';
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  if (!tpl.content.textContent && !tpl.content.querySelector('br')) return '';
  return html;
}

// ════════════════════════════════════════════════════════════
//  Markdown ⇄ блоки
// ════════════════════════════════════════════════════════════
function mdInline(s) {
  const codes = [];
  let t = esc(s).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+|mailto:[^)\s]+)\)/g, (_, txt, url) => '<a href="' + url + '">' + txt + '</a>');
  t = t.replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>').replace(/__([^_]+?)__/g, '<b>$1</b>');
  t = t.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, '$1<i>$2</i>').replace(/(^|[^_\w])_([^_\s][^_]*?)_(?![_\w])/g, '$1<i>$2</i>');
  t = t.replace(/~~([^~]+?)~~/g, '<s>$1</s>');
  t = t.replace(/\u0000(\d+)\u0000/g, (_, i) => '<code>' + codes[+i] + '</code>');
  return t;
}

function parseMarkdown(md) {
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const indentOf = sp => Math.min(6, Math.floor(sp.replace(/\t/g, '  ').length / 2));
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if (/^\s*```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
      out.push({ type: 'code', text: buf.join('\n') });
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        const raw = lines[i].trim().slice(1, -1);
        if (!/^\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*$/.test(raw)) rows.push(raw.split(/(?<!\\)\|/).map(c => mdInline(c.trim().replace(/\\\|/g, '|'))));
        i++;
      }
      i--;
      const cols = Math.max(...rows.map(r => r.length));
      rows.forEach(r => { while (r.length < cols) r.push(''); });
      out.push({ type: 'table', rows, header: true });
      continue;
    }
    if (!line.trim()) continue;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) { out.push({ type: m[1].length >= 3 ? 'h3' : 'h' + m[1].length, html: mdInline(m[2].replace(/\s+#+\s*$/, '')) }); continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push({ type: 'divider' }); continue; }
    if ((m = line.match(/^(\s*)[-*+•]\s+\[( |x|X)\]\s*(.*)$/))) { out.push({ type: 'todo', html: mdInline(m[3]), checked: m[2] !== ' ', indent: indentOf(m[1]) }); continue; }
    if ((m = line.match(/^(\s*)[-*+•]\s+(.*)$/))) { out.push({ type: 'bullet', html: mdInline(m[2]), indent: indentOf(m[1]) }); continue; }
    if ((m = line.match(/^(\s*)\d+[.)]\s+(.*)$/))) { out.push({ type: 'numbered', html: mdInline(m[2]), indent: indentOf(m[1]) }); continue; }
    if ((m = line.match(/^\s*>\s?(.*)$/))) { out.push({ type: 'quote', html: mdInline(m[1]) }); continue; }
    out.push({ type: 'text', html: mdInline(line.trim()) });
  }
  return out.map(normalizeBlock);
}

function htmlToMd(html) {
  if (!html) return '';
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const walk = n => {
    let s = '';
    for (const c of n.childNodes) {
      if (c.nodeType === 3) { s += c.nodeValue.replace(/ /g, ' '); continue; }
      if (c.nodeType !== 1) continue;
      const inner = walk(c), t = c.tagName;
      if (t === 'BR') s += '\n';
      else if (!inner.trim() && t !== 'DIV' && t !== 'P') s += inner;
      else if (t === 'B' || t === 'STRONG') s += '**' + inner + '**';
      else if (t === 'I' || t === 'EM') s += '*' + inner + '*';
      else if (t === 'S' || t === 'STRIKE' || t === 'DEL') s += '~~' + inner + '~~';
      else if (t === 'CODE') s += '`' + inner + '`';
      else if (t === 'A') s += c.getAttribute('href') ? '[' + inner + '](' + c.getAttribute('href') + ')' : inner;
      else if (t === 'DIV' || t === 'P') s += (s && !s.endsWith('\n') ? '\n' : '') + inner + '\n';
      else s += inner;
    }
    return s;
  };
  return walk(tpl.content).replace(/\n+$/, '');
}

function blocksToMd(blocks) {
  const out = [];
  let prev = null;
  const num = numbering(blocks);
  blocks.forEach((b, i) => {
    const pad = '  '.repeat(b.indent || 0);
    const txt = htmlToMd(b.html).replace(/\n/g, '\n' + pad + '  ');
    const isList = ['bullet', 'numbered', 'todo', 'toggle'].includes(b.type);
    if (prev && !(isList && ['bullet', 'numbered', 'todo', 'toggle'].includes(prev.type))) out.push('');
    switch (b.type) {
      case 'h1': out.push('# ' + txt); break;
      case 'h2': out.push('## ' + txt); break;
      case 'h3': out.push('### ' + txt); break;
      case 'bullet': case 'toggle': out.push(pad + '- ' + txt); break;
      case 'numbered': out.push(pad + num[i] + '. ' + txt); break;
      case 'todo': out.push(pad + '- [' + (b.checked ? 'x' : ' ') + '] ' + txt); break;
      case 'quote': out.push('> ' + txt.replace(/\n/g, '\n> ')); break;
      case 'callout': out.push('> ' + (b.emoji ? b.emoji + ' ' : '') + txt.replace(/\n/g, '\n> ')); break;
      case 'divider': out.push('---'); break;
      case 'code': out.push('```\n' + (b.text || '') + '\n```'); break;
      case 'table': {
        const rows = (b.rows || []).map(r => '| ' + r.map(c => htmlToMd(c).replace(/\n/g, ' ').replace(/\|/g, '\\|')).join(' | ') + ' |');
        if (rows.length) rows.splice(1, 0, '|' + (b.rows[0] || []).map(() => '---').join('|') + '|');
        out.push(rows.join('\n'));
        break;
      }
      default: out.push(pad + txt);
    }
    prev = b;
  });
  return out.join('\n') + '\n';
}

function numbering(blocks) {
  const res = [], cnt = [], last = [];
  blocks.forEach((b, i) => {
    const d = b.indent || 0;
    cnt.length = Math.min(cnt.length, d + 1);
    last.length = Math.min(last.length, d + 1);
    if (b.type === 'numbered') { cnt[d] = last[d] === 'numbered' ? (cnt[d] || 0) + 1 : 1; res[i] = cnt[d]; }
    last[d] = b.type;
  });
  return res;
}

// ════════════════════════════════════════════════════════════
//  Модель данных
// ════════════════════════════════════════════════════════════
const BLOCK_TYPES = [
  { type: 'text', label: 'Текст', icon: 'Аа', keys: 'text текст абзац paragraph p', ph: 'Пишите или нажмите «/» для команд' },
  { type: 'h1', label: 'Заголовок 1', icon: 'H1', keys: 'h1 heading заголовок большой', ph: 'Заголовок 1', md: '#' },
  { type: 'h2', label: 'Заголовок 2', icon: 'H2', keys: 'h2 heading заголовок средний', ph: 'Заголовок 2', md: '##' },
  { type: 'h3', label: 'Заголовок 3', icon: 'H3', keys: 'h3 heading заголовок малый', ph: 'Заголовок 3', md: '###' },
  { type: 'bullet', label: 'Список', icon: '•', keys: 'bullet list список маркированный ul', ph: 'Пункт списка', md: '-' },
  { type: 'numbered', label: 'Нумерованный список', icon: '1.', keys: 'numbered ol нумерованный список номер', ph: 'Пункт списка', md: '1.' },
  { type: 'todo', label: 'Задача', icon: '☑', keys: 'todo task задача чекбокс галочка checkbox дело', ph: 'Задача', md: '[]' },
  { type: 'toggle', label: 'Раскрывающийся блок', icon: '▸', keys: 'toggle раскрывающийся свернуть спойлер', ph: 'Заголовок блока', md: '>' },
  { type: 'quote', label: 'Цитата', icon: '❝', keys: 'quote цитата', ph: 'Цитата', md: '"' },
  { type: 'callout', label: 'Выноска', icon: '💡', keys: 'callout выноска заметка важно note', ph: 'Важная мысль' },
  { type: 'code', label: 'Код', icon: '</>', keys: 'code код', ph: '', md: '```' },
  { type: 'table', label: 'Таблица', icon: '▦', keys: 'table таблица' },
  { type: 'divider', label: 'Разделитель', icon: '—', keys: 'divider разделитель линия hr', md: '---' }
];
const BT = Object.fromEntries(BLOCK_TYPES.map(t => [t.type, t]));
const TEXTUAL = new Set(['text', 'h1', 'h2', 'h3', 'bullet', 'numbered', 'todo', 'toggle', 'quote', 'callout']);
const COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
const COLOR_NAMES = { gray: 'Серый', brown: 'Коричневый', orange: 'Оранжевый', yellow: 'Жёлтый', green: 'Зелёный', blue: 'Синий', purple: 'Фиолетовый', pink: 'Розовый', red: 'Красный' };

function normalizeBlock(b) {
  b = b && typeof b === 'object' ? b : {};
  const type = BT[b.type] ? b.type : 'text';
  const o = { id: typeof b.id === 'string' && b.id ? b.id : uid(), type, indent: clamp(parseInt(b.indent, 10) || 0, 0, 8) };
  if (TEXTUAL.has(type)) o.html = typeof b.html === 'string' ? b.html : '';
  if (type === 'todo') o.checked = !!b.checked;
  if (type === 'toggle') o.open = !!b.open;
  if (type === 'callout') o.emoji = typeof b.emoji === 'string' ? b.emoji : '💡';
  if (type === 'code') o.text = typeof b.text === 'string' ? b.text : '';
  if (type === 'table') {
    let rows = Array.isArray(b.rows) && b.rows.length ? b.rows : [['', ''], ['', '']];
    const cols = Math.max(1, ...rows.map(r => (Array.isArray(r) ? r.length : 0)));
    o.rows = rows.map(r => { const a = Array.isArray(r) ? r.map(c => (typeof c === 'string' ? c : '')) : []; while (a.length < cols) a.push(''); return a; });
    o.header = b.header !== false;
  }
  if (b.color && (COLORS.includes(b.color) || /^bg-/.test(b.color) && COLORS.includes(b.color.slice(3)))) o.color = b.color;
  return o;
}

const BOARD_KINDS = new Set(['sticky', 'shape', 'text', 'frame', 'line']);
function normalizeItem(it) {
  if (!it || typeof it !== 'object' || !BOARD_KINDS.has(it.kind)) return null;
  const o = { id: typeof it.id === 'string' && it.id ? it.id : uid(), kind: it.kind };
  const num = (v, d) => (Number.isFinite(+v) ? +v : d);
  if (it.kind === 'line') {
    const end = e => (e && typeof e.id === 'string' ? { id: e.id } : { x: num(e && e.x, 0), y: num(e && e.y, 0) });
    o.from = end(it.from); o.to = end(it.to);
    o.color = typeof it.color === 'string' ? it.color : 'gray';
    o.dash = !!it.dash;
    o.arrow = ['end', 'both', 'none'].includes(it.arrow) ? it.arrow : 'end';
    o.html = typeof it.html === 'string' ? it.html : '';
    return o;
  }
  o.x = num(it.x, 0); o.y = num(it.y, 0);
  o.w = Math.max(20, num(it.w, 200)); o.h = Math.max(20, num(it.h, 200));
  o.color = typeof it.color === 'string' ? it.color : (it.kind === 'sticky' ? 'yellow' : it.kind === 'shape' ? 'blue' : it.kind === 'frame' ? 'white' : 'default');
  if (it.kind === 'frame') o.title = typeof it.title === 'string' ? it.title : 'Фрейм';
  else o.html = typeof it.html === 'string' ? it.html : '';
  if (it.kind === 'shape') o.shape = ['rect', 'round', 'ellipse', 'diamond'].includes(it.shape) ? it.shape : 'round';
  if (it.fs != null && Number.isFinite(+it.fs)) o.fs = clamp(+it.fs, 8, 120);
  if (it.align === 'left') o.align = 'left';
  return o;
}

function normalizePage(p) {
  if (!p || typeof p !== 'object') return null;
  const type = p.type === 'board' ? 'board' : p.type === 'fin' ? 'fin' : 'doc';
  const o = { id: typeof p.id === 'string' && p.id ? p.id : uid(), type, title: typeof p.title === 'string' ? p.title : '', icon: typeof p.icon === 'string' ? p.icon : '' };
  if (type === 'doc') {
    o.blocks = (Array.isArray(p.blocks) ? p.blocks : []).map(normalizeBlock);
    const seen = new Set();
    o.blocks.forEach(b => { if (seen.has(b.id)) b.id = uid(); seen.add(b.id); });
    if (!o.blocks.length) o.blocks.push(normalizeBlock({ type: 'text' }));
  } else if (type === 'fin') {
    o.fm = normalizeFm(p.fm);
  } else {
    o.items = (Array.isArray(p.items) ? p.items : []).map(normalizeItem).filter(Boolean);
    const ids = new Set(o.items.filter(i => i.kind !== 'line').map(i => i.id));
    o.items = o.items.filter(i => i.kind !== 'line' || ((!i.from.id || ids.has(i.from.id)) && (!i.to.id || ids.has(i.to.id))));
  }
  return o;
}

function newDocPage(title, icon) { return { id: uid(), type: 'doc', title: title || '', icon: icon || '', blocks: [normalizeBlock({ type: 'text' })] }; }
function newBoardPage(title, icon) { return { id: uid(), type: 'board', title: title || 'Новая доска', icon: icon || '🧩', items: [] }; }

function clonePageFresh(p) {
  const c = clone(p);
  c.id = uid();
  if (c.type === 'doc') c.blocks.forEach(b => { b.id = uid(); });
  else if (c.type === 'board') {
    const map = {};
    c.items.forEach(i => { const n = uid(); map[i.id] = n; i.id = n; });
    c.items.forEach(i => { if (i.kind === 'line') { if (i.from.id) i.from.id = map[i.from.id]; if (i.to.id) i.to.id = map[i.to.id]; } });
  }
  return c;
}

// ════════════════════════════════════════════════════════════
//  Хранилище и история
// ════════════════════════════════════════════════════════════
const LS = { state: 'cmoPlan.v1', views: 'cmoPlan.views', sync: 'cmoPlan.sync', ui: 'cmoPlan.ui' };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* noop */ } }
};

let state = null;      // { pages: [], activeId }
let lastLocalJson = '';
const views = store.get(LS.views, {}) || {};
const uiPrefs = Object.assign({ theme: 'auto', sideCollapsed: false }, store.get(LS.ui, {}) || {});

const page = id => state.pages.find(p => p.id === id) || null;
const activePage = () => page(state.activeId);

let saveFailedShown = false;
const saveLocal = debounce(() => {
  const json = JSON.stringify({ v: 1, seed: SEED_VERSION, pages: state.pages, activeId: state.activeId, touched: !!state.touched });
  lastLocalJson = json;
  try {
    localStorage.setItem(LS.state, json);
    setSaveState('saved');
    saveFailedShown = false;
  } catch (e) {
    setSaveState('error');
    if (!saveFailedShown) { saveFailedShown = true; toast('Не удалось сохранить в браузере: закончилось место. Скачайте резервную копию в меню «⋯».', { timeout: 9000 }); }
  }
}, 250);
const saveViews = debounce(() => store.set(LS.views, views), 400);

const History = {
  map: new Map(),
  entry(p) {
    let h = this.map.get(p.id);
    if (!h) { h = { undo: [], redo: [], last: JSON.stringify(p), key: null, t: 0, sel: null }; this.map.set(p.id, h); }
    return h;
  },
  reset(p) { this.map.delete(p.id); this.entry(p); },
  record(p, key, sel) {
    const h = this.entry(p);
    const json = JSON.stringify(p);
    if (json === h.last) return false;
    const now = Date.now();
    const coalesce = key && key === h.key && now - h.t < 1200;
    if (!coalesce) {
      h.undo.push({ json: h.last, sel: h.sel });
      if (h.undo.length > 200) h.undo.shift();
    }
    h.redo.length = 0;
    h.last = json; h.key = key || null; h.t = now; h.sel = sel || null;
    return true;
  },
  breakCoalesce(p) { const h = this.map.get(p.id); if (h) h.key = null; },
  canUndo(p) { const h = p && this.map.get(p.id); return !!(h && h.undo.length); },
  canRedo(p) { const h = p && this.map.get(p.id); return !!(h && h.redo.length); },
  step(p, dir, curSel) {
    const h = this.entry(p);
    const from = dir < 0 ? h.undo : h.redo, to = dir < 0 ? h.redo : h.undo;
    if (!from.length) return null;
    const e = from.pop();
    to.push({ json: h.last, sel: curSel || h.sel });
    h.last = e.json; h.key = null; h.sel = e.sel;
    return e;
  }
};

// Любое изменение страницы проходит через changed()
function changed(p, key, opts) {
  opts = opts || {};
  const sel = opts.sel !== undefined ? opts.sel : (editor && editor.page === p && editor.captureSel ? editor.captureSel() : null);
  History.record(p, key, sel);
  afterChange(p, opts);
}
let lastEditAt = 0;
function afterChange(p, opts) {
  lastEditAt = Date.now();
  setSaveState('dirty');
  saveLocal();
  Sync.onLocalChange();
  updateUndoButtons();
  if (!opts || !opts.skipChrome) renderChrome();
}

// ════════════════════════════════════════════════════════════
//  UI: тосты, модалки, меню
// ════════════════════════════════════════════════════════════
function toast(msg, opts) {
  opts = opts || {};
  const t = el('div', { class: 'toast', role: 'status' }, el('span', { text: msg }));
  if (opts.action) t.append(el('button', { text: opts.action.label, onclick: () => { t.remove(); opts.action.fn(); } }));
  $('#toasts').append(t);
  setTimeout(() => t.remove(), opts.timeout || 3200);
  return t;
}

let modalOpen = 0;
function modal(build) {
  return new Promise(resolve => {
    const prevFocus = document.activeElement;
    const back = el('div', { class: 'modal-back' });
    const box = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
    back.append(box);
    let done = false;
    const close = v => {
      if (done) return;
      done = true; modalOpen--;
      back.remove();
      document.removeEventListener('keydown', onKey, true);
      if (prevFocus && prevFocus.isConnected && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* noop */ }
      resolve(v);
    };
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); }
    };
    back.addEventListener('pointerdown', e => { if (e.target === back) close(null); });
    build(box, close);
    modalOpen++;
    document.body.append(back);
    document.addEventListener('keydown', onKey, true);
    const f = box.querySelector('input,[autofocus],.btn.primary');
    if (f) setTimeout(() => { f.focus(); if (f.select) f.select(); }, 0);
  });
}
const ui = {
  prompt(o) {
    return modal((box, close) => {
      const inp = el('input', { type: o.password ? 'password' : 'text', value: o.value || '', placeholder: o.placeholder || '', autocomplete: o.password ? 'current-password' : 'off' });
      const err = el('div', { class: 'err' });
      const submit = async () => {
        if (o.validate) {
          err.textContent = '';
          const r = await o.validate(inp.value);
          if (r) { err.textContent = r; inp.focus(); return; }
        }
        close(inp.value);
      };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); submit(); } });
      box.append(el('h3', { text: o.title }), o.text ? el('p', { text: o.text }) : null, inp, err,
        el('div', { class: 'modal-btns' },
          el('button', { class: 'btn', text: 'Отмена', onclick: () => close(null) }),
          el('button', { class: 'btn primary', text: o.ok || 'Готово', onclick: submit })));
    });
  },
  confirm(o) {
    return modal((box, close) => {
      box.append(el('h3', { text: o.title }), o.text ? el('p', { text: o.text }) : null,
        el('div', { class: 'modal-btns' },
          el('button', { class: 'btn', text: o.cancel || 'Отмена', onclick: () => close(false) }),
          el('button', { class: 'btn ' + (o.danger ? 'danger' : 'primary'), text: o.ok || 'ОК', onclick: () => close(true) })));
    }).then(v => !!v);
  },
  choice(o) {
    return modal((box, close) => {
      box.append(el('h3', { text: o.title }), o.text ? el('p', { text: o.text }) : null,
        el('div', { class: 'modal-btns' },
          el('button', { class: 'btn', text: 'Отмена', onclick: () => close(null) }),
          ...o.buttons.map(b => el('button', { class: 'btn' + (b.primary ? ' primary' : b.danger ? ' danger' : ''), text: b.label, onclick: () => close(b.value) }))));
    });
  },
  info(title, node, wide) {
    return modal((box, close) => {
      if (wide) box.classList.add('wide');
      box.append(el('h3', { text: title }), node, el('div', { class: 'modal-btns' }, el('button', { class: 'btn primary', text: 'Понятно', onclick: () => close(true) })));
    });
  }
};

// Всплывающее меню. items: {label, icon, hint, onClick, danger, checked, sub, keys} | 'sep' | {title}
let menuState = null;
function closeMenu() {
  if (!menuState) return;
  const m = menuState;
  menuState = null;
  m.node.remove();
  document.removeEventListener('pointerdown', m.onDown, true);
  document.removeEventListener('keydown', m.onKey, true);
  window.removeEventListener('resize', m.onResize);
  if (m.onClose) m.onClose();
}
function placePop(node, anchor, opts) {
  opts = opts || {};
  const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor;
  const vw = window.innerWidth, vh = window.innerHeight;
  const nw = node.offsetWidth, nh = node.offsetHeight;
  let x = opts.alignRight ? r.right - nw : r.left;
  let y = r.bottom + 4;
  if (y + nh > vh - 8 && r.top - nh - 4 > 8) y = r.top - nh - 4;
  if (y + nh > vh - 8) y = Math.max(8, vh - nh - 8);
  x = clamp(x, 8, Math.max(8, vw - nw - 8));
  node.style.left = x + 'px';
  node.style.top = y + 'px';
}
function openMenu(anchor, items, opts) {
  closeMenu();
  opts = opts || {};
  const node = el('div', { class: 'pop', role: 'menu' });
  const btns = [];
  let active = -1;
  const setActive = i => {
    btns.forEach(b => b.classList.remove('active'));
    active = i;
    if (btns[i]) { btns[i].classList.add('active'); btns[i].scrollIntoView({ block: 'nearest' }); }
  };
  const build = list => {
    node.innerHTML = '';
    btns.length = 0; active = -1;
    if (opts.custom) { node.append(opts.custom(closeMenu)); }
    list.forEach(it => {
      if (it === 'sep') { node.append(el('div', { class: 'mi-sep' })); return; }
      if (it.title) { node.append(el('div', { class: 'pop-title', text: it.title })); return; }
      if (it.custom) { node.append(it.custom); return; }
      const b = el('button', { class: 'mi' + (it.danger ? ' danger' : ''), role: 'menuitem', type: 'button' },
        it.icon != null ? el('span', { class: 'mi-ic' + (it.box ? ' box' : ''), html: it.iconHtml ? it.icon : esc(it.icon) }) : null,
        el('span', { class: 'mi-l', html: esc(it.label) + (it.desc ? '<small>' + esc(it.desc) + '</small>' : '') }),
        it.checked ? el('span', { class: 'mi-check', text: '✓' }) : null,
        it.hint ? el('span', { class: 'mi-h', text: it.hint }) : (it.sub ? el('span', { class: 'mi-h', text: '›' }) : null));
      b.addEventListener('pointerdown', e => e.preventDefault());
      b.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        if (it.sub) { build([{ label: '← Назад', onClick: null, back: true }, 'sep'].concat(typeof it.sub === 'function' ? it.sub() : it.sub)); placePop(node, anchor, opts); return; }
        if (it.back) { build(items); placePop(node, anchor, opts); return; }
        closeMenu();
        if (it.onClick) it.onClick();
      });
      b.addEventListener('mousemove', () => { const i = btns.indexOf(b); if (i !== active) setActive(i); });
      btns.push(b);
      node.append(b);
    });
    if (!list.length && opts.empty) node.append(el('div', { class: 'pop-empty', text: opts.empty }));
  };
  build(items);
  document.body.append(node);
  placePop(node, anchor, opts);
  if (opts.focusFirst !== false && btns.length && opts.keyboard) setActive(0);
  const onDown = e => { if (!node.contains(e.target) && !(opts.keepOn && opts.keepOn.contains(e.target))) closeMenu(); };
  const onKey = e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); return; }
    if (opts.passKeys) return;
    if (!btns.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setActive((active + 1) % btns.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setActive((active - 1 + btns.length) % btns.length); }
    else if ((e.key === 'Enter' || (e.key === 'Tab' && opts.keyboard)) && active >= 0) { e.preventDefault(); e.stopPropagation(); btns[active].click(); }
  };
  const onResize = () => closeMenu();
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', onResize);
  menuState = { node, onDown, onKey, onResize, onClose: opts.onClose, setActive, btns, get active() { return active; } };
  return menuState;
}

const EMOJIS = ['📋', '🗺️', '✅', '🎯', '🚀', '💡', '📌', '📈', '📊', '💬', '🧲', '🎥', '💰', '🔥', '⭐', '❗', '❓', '⚠️', '🧠', '🤖', '👩‍💻', '🗓️', '⏰', '📝', '🔗', '🧩', '🏁', '🎁', '💎', '📣', '🛠️', '🔒', '✍️', '👀', '🙌', '🌱', '📚', '🧭', '🏆', '📦', '🗂️', '💼', '☕', '🎉', '❤️', '👍', '📞', '✨'];
function emojiPicker(anchor, onPick, allowNone) {
  const grid = el('div', { class: 'emoji-grid' }, EMOJIS.map(e => el('button', { type: 'button', text: e, onclick: () => { closeMenu(); onPick(e); } })));
  grid.addEventListener('pointerdown', e => e.preventDefault());
  openMenu(anchor, allowNone ? ['sep', { label: 'Без иконки', onClick: () => onPick('') }] : [], { custom: () => grid });
}

function download(name, text, type) {
  const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function pickFile(accept) {
  return new Promise(resolve => {
    const inp = el('input', { type: 'file', accept, style: { display: 'none' } });
    inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; inp.remove(); resolve(f || null); });
    document.body.append(inp);
    inp.click();
  });
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fallback */ }
  const ta = el('textarea', { style: { position: 'fixed', left: '-9999px' } });
  ta.value = text;
  document.body.append(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { /* noop */ }
  ta.remove();
  return ok;
}

// ════════════════════════════════════════════════════════════
//  Каретка в contenteditable
// ════════════════════════════════════════════════════════════
const Caret = {
  range() { const s = window.getSelection(); return s && s.rangeCount ? s.getRangeAt(0) : null; },
  inside(node) { const r = this.range(); return !!(r && node.contains(r.startContainer)); },
  offset(node) {
    const r = this.range();
    if (!r || !node.contains(r.startContainer)) return null;
    const pre = document.createRange();
    pre.selectNodeContents(node);
    pre.setEnd(r.startContainer, r.startOffset);
    return pre.toString().length;
  },
  endOffset(node) {
    const r = this.range();
    if (!r || !node.contains(r.endContainer)) return null;
    const pre = document.createRange();
    pre.selectNodeContents(node);
    pre.setEnd(r.endContainer, r.endOffset);
    return pre.toString().length;
  },
  len(node) { return node.textContent.length; },
  pointAt(node, offset) {
    const tw = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let n, acc = 0, last = null;
    while ((n = tw.nextNode())) {
      const l = n.nodeValue.length;
      if (acc + l >= offset) return { node: n, offset: offset - acc };
      acc += l; last = n;
    }
    return last ? { node: last, offset: last.nodeValue.length } : { node, offset: 0 };
  },
  set(node, where) {
    const s = window.getSelection();
    const r = document.createRange();
    if (where === 'end' || where == null) { r.selectNodeContents(node); r.collapse(false); }
    else if (where === 'start') { r.selectNodeContents(node); r.collapse(true); }
    else {
      const p = this.pointAt(node, clamp(where, 0, this.len(node)));
      r.setStart(p.node, p.offset); r.collapse(true);
    }
    s.removeAllRanges(); s.addRange(r);
  },
  select(node, a, b) {
    const s = window.getSelection(), r = document.createRange();
    const p1 = this.pointAt(node, a), p2 = this.pointAt(node, b);
    r.setStart(p1.node, p1.offset); r.setEnd(p2.node, p2.offset);
    s.removeAllRanges(); s.addRange(r);
  },
  selectAll(node) { const s = window.getSelection(), r = document.createRange(); r.selectNodeContents(node); s.removeAllRanges(); s.addRange(r); },
  collapsed() { const r = this.range(); return !r || r.collapsed; },
  atStart(node) { return this.collapsed() && this.offset(node) === 0; },
  atEnd(node) { return this.collapsed() && this.offset(node) === this.len(node); },
  split(node) {
    const r = this.range();
    if (!r) return [node.innerHTML, ''];
    if (!r.collapsed) r.deleteContents();
    const a = document.createRange(); a.selectNodeContents(node); a.setEnd(r.startContainer, r.startOffset);
    const b = document.createRange(); b.selectNodeContents(node); b.setStart(r.startContainer, r.startOffset);
    const h = frag => { const d = document.createElement('div'); d.append(frag); return d.innerHTML; };
    return [normHtml(h(a.cloneContents())), normHtml(h(b.cloneContents()))];
  },
  removeText(node, a, b) {
    const s = this.pointAt(node, a), e = this.pointAt(node, b);
    const r = document.createRange(); r.setStart(s.node, s.offset); r.setEnd(e.node, e.offset);
    r.deleteContents();
  },
  rect() {
    const r = this.range();
    if (!r) return null;
    const c = r.cloneRange(); c.collapse(true);
    const rects = c.getClientRects();
    if (rects.length) return rects[0];
    return null;
  },
  lineInfo(node) {
    const cr = this.rect();
    const off = this.offset(node), len = this.len(node);
    if (!cr || !cr.height) return { first: off === 0 || len === 0, last: off === len };
    const nr = node.getBoundingClientRect();
    const cs = getComputedStyle(node);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5 || 22;
    return {
      first: cr.top - nr.top - (parseFloat(cs.paddingTop) || 0) < lh * 0.7,
      last: nr.bottom - (parseFloat(cs.paddingBottom) || 0) - cr.bottom < lh * 0.7
    };
  }
};

function inEditable(t) {
  t = t || document.activeElement;
  return !!(t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'));
}

// ════════════════════════════════════════════════════════════
//  Плавающая панель форматирования (для выделенного текста)
// ════════════════════════════════════════════════════════════
const SelTool = {
  node: null,
  init() {
    this.node = el('div', { id: 'seltool', hidden: true });
    const btn = (html, title, fn, style) => {
      const b = el('button', { type: 'button', title, html, style });
      b.addEventListener('pointerdown', e => e.preventDefault());
      b.addEventListener('click', e => { e.preventDefault(); fn(b); });
      return b;
    };
    this.node.append(
      btn('<b>Ж</b>', 'Жирный (' + MOD + '+B)', () => exec('bold')),
      btn('<i>К</i>', 'Курсив (' + MOD + '+I)', () => exec('italic')),
      btn('<u>Ч</u>', 'Подчёркнутый (' + MOD + '+U)', () => exec('underline')),
      btn('<s>З</s>', 'Зачёркнутый (' + MOD + '+Shift+S)', () => exec('strikeThrough')),
      btn('<span style="font-family:var(--mono);font-size:12px">&lt;/&gt;</span>', 'Код (' + MOD + '+E)', () => toggleInlineCode()),
      el('span', { class: 'sep' }),
      btn('🔗', 'Ссылка (' + MOD + '+K)', () => makeLink()),
      btn('<span style="border-bottom:3px solid var(--c-red);padding:0 2px">A</span>', 'Цвет текста', b => colorMenu(b)),
      btn('⨯', 'Убрать форматирование', () => exec('removeFormat'))
    );
    document.body.append(this.node);
    let raf = 0;
    document.addEventListener('selectionchange', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => this.update()); });
    window.addEventListener('scroll', () => this.update(), true);
  },
  update() {
    const r = Caret.range();
    const host = r && !r.collapsed && closestEditableRich(r.commonAncestorContainer);
    if (!host || document.querySelector('.modal-back')) { this.node.hidden = true; return; }
    const rect = r.getBoundingClientRect();
    if (!rect.width && !rect.height) { this.node.hidden = true; return; }
    this.node.hidden = false;
    const w = this.node.offsetWidth, hgt = this.node.offsetHeight;
    let y = rect.top - hgt - 8;
    if (y < 8) y = rect.bottom + 8;
    this.node.style.left = clamp(rect.left + rect.width / 2 - w / 2, 8, window.innerWidth - w - 8) + 'px';
    this.node.style.top = y + 'px';
  },
  hide() { if (this.node) this.node.hidden = true; }
};
function closestEditableRich(n) {
  if (!n) return null;
  const e = n.nodeType === 1 ? n : n.parentElement;
  const h = e && e.closest('.rich');
  return h && h.isContentEditable ? h : null;
}
function exec(cmd, val) {
  try { document.execCommand('styleWithCSS', false, cmd === 'foreColor' || cmd === 'hiliteColor'); } catch (e) { /* noop */ }
  document.execCommand(cmd, false, val);
  try { document.execCommand('styleWithCSS', false, false); } catch (e) { /* noop */ }
  SelTool.update();
}
function fireInput(node) { node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatSetBlockTextDirection' })); }
function toggleInlineCode() {
  const r = Caret.range();
  if (!r) return;
  const host = closestEditableRich(r.commonAncestorContainer);
  if (!host) return;
  const anc = (r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement).closest('code');
  if (anc && host.contains(anc)) {
    const t = document.createTextNode(anc.textContent);
    anc.replaceWith(t);
    const rr = document.createRange(); rr.selectNodeContents(t);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(rr);
  } else {
    if (r.collapsed) return;
    const text = r.toString();
    r.deleteContents();
    const c = document.createElement('code');
    c.textContent = text;
    r.insertNode(c);
    const rr = document.createRange(); rr.selectNodeContents(c);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(rr);
  }
  fireInput(host);
  SelTool.update();
}
async function makeLink() {
  const r = Caret.range();
  if (!r || r.collapsed) { toast('Сначала выделите текст для ссылки'); return; }
  const host = closestEditableRich(r.commonAncestorContainer);
  if (!host) return;
  const saved = r.cloneRange();
  const url = await ui.prompt({ title: 'Ссылка', placeholder: 'https://…', ok: 'Добавить' });
  if (!host.isConnected) return;
  host.focus();
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(saved);
  if (url == null) return;
  const u = url.trim();
  if (!u) { exec('unlink'); return; }
  const href = /^(https?:|mailto:|tel:)/i.test(u) ? u : 'https://' + u;
  exec('createLink', href);
}
function colorMenu(anchor) {
  const r = Caret.range();
  const saved = r && r.cloneRange();
  const restore = () => { if (saved) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(saved); } };
  const sw = (name, cssVar, bg) => el('button', {
    type: 'button', class: 'swatch', title: COLOR_NAMES[name] || 'По умолчанию',
    style: bg ? { background: 'var(' + cssVar + ')' } : { color: cssVar ? 'var(' + cssVar + ')' : 'var(--text)' },
    html: bg ? '' : '<b>A</b>',
    onclick: () => {
      closeMenu(); restore();
      const val = cssVar ? getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() : (bg ? 'transparent' : 'inherit');
      exec(bg ? 'hiliteColor' : 'foreColor', val || 'inherit');
    }
  });
  const box = el('div', {},
    el('div', { class: 'pop-title', text: 'Цвет текста' }),
    el('div', { class: 'swatches' }, sw('', null, false), COLORS.map(c => sw(c, '--c-' + c, false))),
    el('div', { class: 'pop-title', text: 'Фон' }),
    el('div', { class: 'swatches' }, sw('', null, true), COLORS.map(c => sw(c, '--b-' + c, true))));
  box.addEventListener('pointerdown', e => e.preventDefault());
  openMenu(anchor, [], { custom: () => box });
}
// Общие сочетания для форматирования внутри любых .rich
function richKeys(e) {
  if (!modKey(e)) return false;
  const k = e.key.toLowerCase();
  if (e.shiftKey && (k === 's' || k === 'x' || e.code === 'KeyS' || e.code === 'KeyX')) { e.preventDefault(); exec('strikeThrough'); return true; }
  if (!e.shiftKey && (k === 'e' || e.code === 'KeyE')) { e.preventDefault(); toggleInlineCode(); return true; }
  if (!e.shiftKey && (k === 'k' || e.code === 'KeyK')) { e.preventDefault(); makeLink(); return true; }
  if (!e.shiftKey && (e.code === 'KeyB' || e.code === 'KeyI' || e.code === 'KeyU') && !['b', 'i', 'u'].includes(k)) {
    // русская раскладка: «и», «ш», «г» — выполняем вручную
    e.preventDefault();
    exec({ KeyB: 'bold', KeyI: 'italic', KeyU: 'underline' }[e.code]);
    return true;
  }
  return false;
}
function pastePlain(e) {
  const t = (e.clipboardData || window.clipboardData).getData('text/plain');
  e.preventDefault();
  if (t) document.execCommand('insertText', false, t);
}

// ════════════════════════════════════════════════════════════
//  Документ (блочный редактор в стиле Notion)
// ════════════════════════════════════════════════════════════
const LIST_TYPES = new Set(['bullet', 'numbered', 'todo']);
const textLenOf = html => { if (!html) return 0; const t = document.createElement('template'); t.innerHTML = html; return t.content.textContent.length; };
const toAlpha = n => { let s = ''; while (n > 0) { n--; s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26); } return s; };
const toRoman = n => { const m = [[40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]; let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; };

class DocEditor {
  constructor(p, host) {
    this.page = p;
    this.host = host;
    this.sel = new Set();
    this.slash = null;
    this.focusId = null;
    this.build();
    this.render();
  }

  // ── каркас ──
  build() {
    this.scroll = el('div', { class: 'doc-scroll', tabindex: '-1' });
    this.root = el('div', { class: 'doc' });
    this.iconRow = el('div', { class: 'doc-icon-row' });
    this.title = el('div', { class: 'doc-title', contenteditable: 'true', 'data-ph': 'Без названия', spellcheck: 'true', role: 'textbox', 'aria-label': 'Название страницы' });
    this.blocksEl = el('div', { class: 'doc-blocks' });
    this.tail = el('div', { class: 'doc-tail', title: 'Нажмите, чтобы добавить блок' });
    this.root.append(this.iconRow, this.title, this.blocksEl, this.tail);
    this.scroll.append(this.root);
    this.host.append(this.scroll);

    this.title.addEventListener('input', () => {
      if (!this.title.textContent && this.title.innerHTML) this.title.innerHTML = '';
      this.page.title = this.title.textContent.replace(/\s*\n\s*/g, ' ');
      changed(this.page, 'title');
    });
    this.title.addEventListener('paste', e => {
      e.preventDefault();
      const t = (e.clipboardData.getData('text/plain') || '').split('\n')[0];
      if (t) document.execCommand('insertText', false, t);
    });
    this.scroll.addEventListener('keydown', e => this.onKeyDown(e));
    this.blocksEl.addEventListener('input', e => this.onInput(e));
    this.blocksEl.addEventListener('paste', e => this.onPasteIn(e));
    this.blocksEl.addEventListener('click', e => this.onClick(e));
    this.blocksEl.addEventListener('change', e => this.onChange(e));
    this.blocksEl.addEventListener('focusin', e => {
      const w = e.target.closest('.blk');
      $$('.blk.focused', this.blocksEl).forEach(x => x !== w && x.classList.remove('focused'));
      if (w) { w.classList.add('focused'); this.focusId = w.dataset.id; }
      if (this.sel.size) this.clearBlockSel();
    });
    this.blocksEl.addEventListener('focusout', e => {
      const w = e.target.closest('.blk');
      if (w && !(e.relatedTarget && w.contains(e.relatedTarget))) w.classList.remove('focused');
      if (this.slash && e.target === this.slash.node) setTimeout(() => { if (this.slash && document.activeElement !== this.slash.node) this.closeSlash(); }, 0);
    });
    this.blocksEl.addEventListener('pointerdown', e => {
      const hd = e.target.closest('.blk-handle');
      if (hd) this.onHandleDown(e, hd);
    });
    this.scroll.addEventListener('pointerdown', e => this.onScrollPointerDown(e));
    this.blocksEl.addEventListener('mousedown', e => {
      const a = e.target.closest('a[href]');
      if (a && (e.ctrlKey || e.metaKey)) { e.preventDefault(); window.open(a.href, '_blank', 'noopener'); }
    });
  }

  destroy() { this.closeSlash(); this.stopDrag && this.stopDrag(); this.scroll.remove(); }

  block(id) { return this.page.blocks.find(b => b.id === id) || null; }
  idx(b) { return this.page.blocks.indexOf(b); }
  elOf(id) { return this.blocksEl.querySelector('.blk[data-id="' + CSS.escape(id) + '"]'); }
  subtreeEnd(i) {
    const bl = this.page.blocks, d = bl[i].indent;
    let j = i + 1;
    while (j < bl.length && bl[j].indent > d) j++;
    return j;
  }
  visPrev(b) { const w = this.elOf(b.id), p = w && w.previousElementSibling; return p ? this.block(p.dataset.id) : null; }
  visNext(b) { const w = this.elOf(b.id), n = w && w.nextElementSibling; return n ? this.block(n.dataset.id) : null; }
  commit(key) { changed(this.page, key || null); }

  // ── отрисовка ──
  render() {
    const p = this.page;
    this.iconRow.innerHTML = '';
    if (p.icon) {
      const ib = el('button', { class: 'doc-icon', type: 'button', title: 'Сменить иконку', text: p.icon });
      ib.addEventListener('click', () => emojiPicker(ib, e => { p.icon = e; this.render(); this.commit(); }, true));
      this.iconRow.append(ib);
    } else {
      const ab = el('button', { class: 'doc-add-icon', type: 'button', text: '☺ Добавить иконку' });
      ab.addEventListener('click', () => emojiPicker(ab, e => { if (e) { p.icon = e; this.render(); this.commit(); } }));
      this.iconRow.append(ab);
    }
    if (document.activeElement !== this.title || this.title.textContent !== p.title) this.title.textContent = p.title;
    this.renderBlocks();
  }

  renderBlocks() {
    const bl = this.page.blocks;
    const num = numbering(bl);
    const frag = document.createDocumentFragment();
    let hide = null;
    bl.forEach((b, i) => {
      if (hide != null) { if (b.indent > hide) return; hide = null; }
      const next = bl[i + 1];
      frag.append(this.blockEl(b, num[i], !next || next.indent <= b.indent));
      if (b.type === 'toggle' && !b.open) hide = b.indent;
    });
    this.blocksEl.innerHTML = '';
    this.blocksEl.append(frag);
    $$('.blk-code', this.blocksEl).forEach(autoGrow);
    if (this.sel.size) this.paintSel();
  }

  blockEl(b, n, noKids) {
    const cls = ['blk'];
    if (b.color) cls.push(b.color.startsWith('bg-') ? b.color : 'c-' + b.color);
    if (b.type === 'todo' && b.checked) cls.push('done');
    if (b.id === this.focusId && this.blocksEl.contains(document.activeElement)) cls.push('focused');
    const w = el('div', { class: cls.join(' '), 'data-id': b.id, 'data-type': b.type, style: '--ind:' + b.indent });
    const gutter = el('div', { class: 'blk-gutter' },
      el('button', { class: 'blk-add', type: 'button', tabindex: '-1', title: 'Добавить блок ниже (Alt — выше)', html: ICONS.plus }),
      el('button', { class: 'blk-handle', type: 'button', tabindex: '-1', title: 'Перетащите или нажмите для меню', html: ICONS.grip }));
    const inner = el('div', { class: 'blk-inner' });
    const txt = () => {
      const t = el('div', { class: 'blk-text rich', contenteditable: 'true', spellcheck: 'true', 'data-ph': BT[b.type].ph || '' });
      t.innerHTML = sanitizeHtml(b.html);
      return t;
    };
    switch (b.type) {
      case 'bullet':
        inner.append(el('span', { class: 'blk-marker', text: ['•', '◦', '▪'][b.indent % 3] }), txt()); break;
      case 'numbered': {
        const lv = b.indent % 3;
        inner.append(el('span', { class: 'blk-marker num', text: (lv === 0 ? n : lv === 1 ? toAlpha(n) : toRoman(n)) + '.' }), txt()); break;
      }
      case 'todo': {
        const cb = el('input', { type: 'checkbox', class: 'blk-cb', 'aria-label': 'Готово' });
        cb.checked = !!b.checked;
        inner.append(el('span', { class: 'blk-check' }, cb), txt()); break;
      }
      case 'toggle': {
        const body = el('div', { class: 'blk-body' }, txt());
        if (b.open && noKids) body.append(el('div', { class: 'blk-toggle-empty', text: 'Пусто. Нажмите, чтобы добавить вложенный блок.' }));
        inner.append(el('button', { class: 'blk-toggle' + (b.open ? ' open' : ''), type: 'button', tabindex: '-1', title: b.open ? 'Свернуть' : 'Развернуть', html: ICONS.chevron }), body); break;
      }
      case 'callout':
        inner.append(el('button', { class: 'blk-emoji', type: 'button', tabindex: '-1', title: 'Сменить иконку', text: b.emoji || '💡' }), txt()); break;
      case 'code': {
        const ta = el('textarea', { class: 'blk-code', spellcheck: 'false', rows: '1', 'aria-label': 'Код' });
        ta.value = b.text || '';
        inner.append(ta); break;
      }
      case 'divider':
        inner.append(el('div', { class: 'blk-divider', tabindex: '0', role: 'separator' }, el('hr'))); break;
      case 'table':
        inner.append(this.tableEl(b)); break;
      default:
        inner.append(txt());
    }
    w.append(gutter, inner);
    return w;
  }

  tableEl(b) {
    const body = el('div', { class: 'blk-body' });
    const wrap = el('div', { class: 'blk-tablewrap' });
    const table = el('table', { class: 'blk-table' });
    const tb = el('tbody');
    b.rows.forEach((row, r) => {
      const tr = el('tr', { class: b.header && r === 0 ? 'th' : null });
      row.forEach((c, ci) => {
        const cell = el('div', { class: 'cell rich', contenteditable: 'true', spellcheck: 'true', 'data-r': r, 'data-c': ci });
        cell.innerHTML = sanitizeHtml(c);
        tr.append(el('td', {}, cell, el('button', { class: 'cell-more', type: 'button', tabindex: '-1', title: 'Строки и столбцы', text: '⋯' })));
      });
      tb.append(tr);
    });
    table.append(tb);
    wrap.append(table);
    body.append(wrap, el('div', { class: 'tbl-actions' },
      el('button', { type: 'button', 'data-act': 'row', text: '+ строка' }),
      el('button', { type: 'button', 'data-act': 'col', text: '+ столбец' })));
    return body;
  }

  // ── фокус и выделение ──
  focusBlock(id, where) {
    const w = this.elOf(id);
    const b = this.block(id);
    if (!w || !b) return;
    if (TEXTUAL.has(b.type)) {
      const t = w.querySelector('.blk-text');
      t.focus({ preventScroll: true });
      Caret.set(t, where == null ? 'end' : where);
    } else if (b.type === 'code') {
      const ta = w.querySelector('textarea');
      ta.focus({ preventScroll: true });
      const pos = where === 'start' ? 0 : typeof where === 'number' ? where : ta.value.length;
      ta.setSelectionRange(pos, pos);
    } else if (b.type === 'table') {
      const cells = $$('.cell', w);
      let cell = where === 'end' ? cells[cells.length - 1] : cells[0];
      if (where && typeof where === 'object') cell = w.querySelector('.cell[data-r="' + where.r + '"][data-c="' + where.c + '"]') || cell;
      if (cell) { cell.focus({ preventScroll: true }); Caret.set(cell, where && typeof where === 'object' ? (where.off != null ? where.off : 'end') : where === 'end' ? 'end' : 'start'); }
    } else if (b.type === 'divider') {
      w.querySelector('.blk-divider').focus({ preventScroll: true });
    }
    scrollIntoViewSoft(w, this.scroll);
  }
  focusTitle(selectAll) {
    this.title.focus();
    if (selectAll) Caret.selectAll(this.title); else Caret.set(this.title, 'end');
  }
  focusDefault() {
    if (!this.page.title) { this.focusTitle(); return; }
    this.scroll.focus({ preventScroll: true });
  }
  captureSel() {
    const a = document.activeElement;
    if (!a || !this.scroll.contains(a)) return this.sel.size ? { blocks: Array.from(this.sel) } : null;
    if (a === this.title) return { title: true, off: Caret.offset(this.title) || 0 };
    const w = a.closest('.blk');
    if (!w) return null;
    if (a.classList.contains('blk-text')) return { id: w.dataset.id, off: Caret.offset(a) };
    if (a.tagName === 'TEXTAREA') return { id: w.dataset.id, off: a.selectionStart };
    if (a.classList.contains('cell')) return { id: w.dataset.id, cell: { r: +a.dataset.r, c: +a.dataset.c, off: Caret.offset(a) } };
    return { id: w.dataset.id };
  }
  restoreSel(s) {
    if (!s) return;
    if (s.title) { this.title.focus(); Caret.set(this.title, s.off); return; }
    if (s.blocks) { this.selectBlocks(s.blocks.filter(id => this.block(id))); return; }
    if (!this.block(s.id)) return;
    if (s.cell) this.focusBlock(s.id, s.cell); else this.focusBlock(s.id, s.off == null ? 'end' : s.off);
  }
  reload(p, sel) {
    this.page = p;
    this.closeSlash();
    this.sel = new Set(Array.from(this.sel).filter(id => this.block(id)));
    this.render();
    if (sel) this.restoreSel(sel);
  }

  selectBlocks(ids, keepFocus) {
    this.closeSlash();
    this.sel = new Set(ids);
    this.paintSel();
    if (!keepFocus && ids.length) {
      const a = document.activeElement;
      if (a && this.scroll.contains(a) && a !== this.scroll) a.blur();
      window.getSelection().removeAllRanges();
      this.scroll.focus({ preventScroll: true });
    }
  }
  clearBlockSel() { this.sel.clear(); this.paintSel(); }
  paintSel() { $$('.blk', this.blocksEl).forEach(w => w.classList.toggle('selected', this.sel.has(w.dataset.id))); }
  selectedBlocks() { return this.page.blocks.filter(b => this.sel.has(b.id)); }
  withSubtrees(ids) {
    const bl = this.page.blocks, set = new Set();
    bl.forEach((b, i) => {
      if (ids.has(b.id) && !set.has(b.id)) { const e = this.subtreeEnd(i); for (let j = i; j < e; j++) set.add(bl[j].id); }
    });
    return set;
  }

  // ── преобразования блоков ──
  convert(b, t) {
    const from = b.type;
    if (from === t) return;
    if (t === 'code') {
      if (TEXTUAL.has(from)) b.text = htmlToText(b.html || '');
      else if (from === 'table') b.text = b.rows.map(r => r.map(htmlToText).join('\t')).join('\n');
    } else if (TEXTUAL.has(t)) {
      if (from === 'code') b.html = textToHtml(b.text || '');
      else if (from === 'table') b.html = b.rows.map(r => r.map(c => esc(htmlToText(c))).join(' | ')).join('<br>');
      else if (from === 'divider') b.html = '';
    } else if (t === 'table') {
      const first = TEXTUAL.has(from) ? (b.html || '') : from === 'code' ? textToHtml(b.text || '') : '';
      b.rows = [[first, ''], ['', '']];
      b.header = true;
    }
    b.type = t;
    const n = normalizeBlock(b);
    Object.keys(b).forEach(k => delete b[k]);
    Object.assign(b, n);
  }
  shiftIndent(list, delta) {
    const bl = this.page.blocks;
    const tops = list.slice().sort((a, b) => bl.indexOf(a) - bl.indexOf(b));
    let did = false;
    for (const top of tops) {
      const i = bl.indexOf(top);
      if (delta > 0) {
        // вложить можно не глубже, чем на уровень под предыдущим блоком
        if (i === 0 || top.indent > bl[i - 1].indent || top.indent >= 8) continue;
      } else if (top.indent === 0) continue;
      const e = this.subtreeEnd(i);
      for (let j = i; j < e; j++) bl[j].indent = clamp(bl[j].indent + delta, 0, 8);
      did = true;
      if (delta > 0) {
        // если новый родитель — свёрнутый блок, раскрываем его, чтобы блок не пропал из виду
        for (let k = i - 1; k >= 0; k--) if (bl[k].indent < top.indent) { if (bl[k].type === 'toggle') bl[k].open = true; break; }
      }
    }
    return did;
  }
  insertAfter(b, nb, intoChildren) {
    const bl = this.page.blocks, i = bl.indexOf(b);
    const at = intoChildren ? i + 1 : (b.type === 'toggle' && !b.open ? this.subtreeEnd(i) : i + 1);
    bl.splice(at, 0, nb);
    return nb;
  }
  removeBlocks(ids) {
    const bl = this.page.blocks;
    const keep = bl.filter(b => !ids.has(b.id));
    bl.length = 0;
    bl.push(...keep);
  }
  deleteBlocks(list) {
    if (!list.length) return;
    const bl = this.page.blocks;
    const first = bl.indexOf(list[0]);
    const ids = new Set(list.map(b => b.id));
    // дети удаляемых блоков поднимаются на уровень выше, а не пропадают
    bl.forEach((b, i) => {
      if (ids.has(b.id)) {
        const e = this.subtreeEnd(i);
        for (let j = i + 1; j < e; j++) if (!ids.has(bl[j].id)) bl[j].indent = Math.max(0, bl[j].indent - 1);
      }
    });
    this.removeBlocks(ids);
    if (!bl.length) bl.push(normalizeBlock({ type: 'text' }));
    this.sel.clear();
    this.render();
    const target = bl[Math.max(0, Math.min(first - 1, bl.length - 1))];
    const visible = target && this.elOf(target.id) ? target : bl.find(b => this.elOf(b.id));
    if (visible) this.focusBlock(visible.id, 'end');
    this.commit();
  }
  duplicateBlocks(list) {
    if (!list.length) return;
    const bl = this.page.blocks;
    const ids = this.withSubtrees(new Set(list.map(b => b.id)));
    const group = bl.filter(b => ids.has(b.id));
    const lastIdx = bl.indexOf(group[group.length - 1]);
    const copies = group.map(b => Object.assign(clone(b), { id: uid() }));
    bl.splice(lastIdx + 1, 0, ...copies);
    this.render();
    this.selectBlocks(copies.filter((c, k) => list.some(b => b.id === group[k].id)).map(c => c.id));
    this.commit();
  }
  moveBlocks(list, beforeId, keepIndent) {
    const bl = this.page.blocks;
    const ids = this.withSubtrees(new Set(list.map(b => b.id)));
    if (beforeId && ids.has(beforeId)) return false;
    const moving = bl.filter(b => ids.has(b.id));
    const rest = bl.filter(b => !ids.has(b.id));
    let at = beforeId ? rest.findIndex(b => b.id === beforeId) : rest.length;
    if (at < 0) at = rest.length;
    let target = keepIndent ? moving[0].indent : (beforeId && rest[at] ? rest[at].indent : 0);
    const maxInd = at > 0 ? rest[at - 1].indent + 1 : 0;
    target = Math.min(target, maxInd);
    const delta = target - moving[0].indent;
    rest.splice(at, 0, ...moving);
    const sameOrder = rest.every((b, i) => b === bl[i]);
    if (sameOrder && !delta) return false;
    moving.forEach(b => { b.indent = clamp(b.indent + delta, 0, 8); });
    bl.length = 0;
    bl.push(...rest);
    return true;
  }
  moveByKey(list, dir) {
    const bl = this.page.blocks;
    const ids = this.withSubtrees(new Set(list.map(b => b.id)));
    const first = bl.findIndex(b => ids.has(b.id));
    if (dir < 0) {
      // ищем предыдущий видимый блок того же или меньшего уровня
      let k = first - 1;
      while (k >= 0 && !this.elOf(bl[k].id)) k--;
      if (k < 0) return false;
      this.moveBlocks(list, bl[k].id, true);
    } else {
      let last = first;
      while (last + 1 < bl.length && ids.has(bl[last + 1].id)) last++;
      if (!bl[last + 1]) return false;
      const e = this.subtreeEnd(last + 1);
      this.moveBlocks(list, bl[e] ? bl[e].id : null, true);
    }
    this.render();
    return true;
  }

  // ── ввод ──
  onInput(e) {
    const t = e.target;
    const w = t.closest('.blk');
    if (!w) return;
    const b = this.block(w.dataset.id);
    if (!b) return;
    if (t.classList.contains('blk-text')) {
      if (!t.textContent && t.innerHTML && !t.querySelector('br + br')) t.innerHTML = '';
      b.html = normHtml(t.innerHTML);
      if (e.inputType === 'insertText' && !this.slash && this.tryMarkdown(b, t, e.data)) return;
      if (e.inputType === 'insertText' && e.data === '/' && !this.slash) {
        const off = Caret.offset(t), s = t.textContent;
        if (off != null && (off === 1 || /\s/.test(s[off - 2]))) this.openSlash(b, t, off - 1);
      } else if (this.slash) this.updateSlash();
      changed(this.page, 'type:' + b.id, { skipChrome: true });
    } else if (t.tagName === 'TEXTAREA') {
      b.text = t.value;
      autoGrow(t);
      changed(this.page, 'code:' + b.id, { skipChrome: true });
    } else if (t.classList.contains('cell')) {
      if (!t.textContent && t.innerHTML && !t.querySelector('br + br')) t.innerHTML = '';
      const r = +t.dataset.r, c = +t.dataset.c;
      if (b.rows[r]) b.rows[r][c] = normHtml(t.innerHTML);
      changed(this.page, 'cell:' + b.id + ':' + r + ':' + c, { skipChrome: true });
    }
  }

  tryMarkdown(b, node, data) {
    if (!TEXTUAL.has(b.type)) return false;
    const txt = node.textContent.replace(/ /g, ' ');
    const off = Caret.offset(node);
    if (off == null) return false;
    if (data === ' ') {
      const prefix = txt.slice(0, off - 1);
      const map = { '#': 'h1', '##': 'h2', '###': 'h3', '-': 'bullet', '*': 'bullet', '+': 'bullet', '•': 'bullet', '1.': 'numbered', '1)': 'numbered', '[]': 'todo', '[ ]': 'todo', '[x]': 'todo', '>': 'toggle', '"': 'quote', '“': 'quote' };
      const t = map[prefix];
      if (!t || (t === b.type && prefix !== '[x]')) return false;
      Caret.removeText(node, 0, off);
      b.html = normHtml(node.innerHTML);
      this.convert(b, t);
      if (prefix === '[x]') b.checked = true;
      if (t === 'toggle') b.open = true;
      this.render();
      this.focusBlock(b.id, 0);
      this.commit();
      return true;
    }
    if (b.type !== 'text') return false;
    if (data === '-' && txt === '---') {
      this.convert(b, 'divider');
      let nb = this.visNext(b);
      if (!nb || !TEXTUAL.has(nb.type)) nb = this.insertAfter(b, normalizeBlock({ type: 'text', indent: b.indent }));
      this.render();
      this.focusBlock(nb.id, 'start');
      this.commit();
      return true;
    }
    if (data === '`' && txt === '```') {
      b.html = '';
      this.convert(b, 'code');
      this.render();
      this.focusBlock(b.id, 'start');
      this.commit();
      return true;
    }
    return false;
  }

  onChange(e) {
    const t = e.target;
    if (!t.classList.contains('blk-cb')) return;
    const w = t.closest('.blk'), b = this.block(w.dataset.id);
    if (!b) return;
    b.checked = t.checked;
    w.classList.toggle('done', b.checked);
    this.commit();
  }

  onClick(e) {
    const t = e.target;
    const w = t.closest('.blk');
    if (!w) return;
    const b = this.block(w.dataset.id);
    if (!b) return;
    if (t.closest('.blk-add')) {
      e.preventDefault();
      const nb = normalizeBlock({ type: 'text', indent: b.type === 'toggle' && b.open ? b.indent + 1 : b.indent, html: '/' });
      if (e.altKey) { const i = this.idx(b); nb.indent = b.indent; this.page.blocks.splice(i, 0, nb); } else this.insertAfter(b, nb, b.type === 'toggle' && b.open);
      this.render();
      this.focusBlock(nb.id, 'end');
      this.commit();
      const node = this.elOf(nb.id).querySelector('.blk-text');
      this.openSlash(nb, node, 0);
      return;
    }
    if (t.closest('.blk-toggle')) {
      b.open = !b.open;
      this.render();
      this.focusBlock(b.id, 'end');
      this.commit();
      return;
    }
    if (t.closest('.blk-toggle-empty')) {
      const nb = this.insertAfter(b, normalizeBlock({ type: 'text', indent: b.indent + 1 }), true);
      this.render();
      this.focusBlock(nb.id, 'start');
      this.commit();
      return;
    }
    if (t.closest('.blk-emoji')) {
      emojiPicker(t.closest('.blk-emoji'), em => { b.emoji = em || '💡'; this.render(); this.commit(); });
      return;
    }
    if (t.closest('.cell-more')) {
      const cell = t.closest('td').querySelector('.cell');
      this.tableMenu(b, +cell.dataset.r, +cell.dataset.c, t.closest('.cell-more'));
      return;
    }
    const act = t.closest('.tbl-actions button');
    if (act) {
      if (act.dataset.act === 'row') { b.rows.push(b.rows[0].map(() => '')); this.render(); this.focusBlock(b.id, { r: b.rows.length - 1, c: 0 }); }
      else { b.rows.forEach(r => r.push('')); this.render(); this.focusBlock(b.id, { r: 0, c: b.rows[0].length - 1 }); }
      this.commit();
    }
  }

  tableMenu(b, r, c, anchor) {
    const cols = b.rows[0].length;
    const go = (fn, fr, fc) => { fn(); this.render(); this.focusBlock(b.id, { r: clamp(fr, 0, b.rows.length - 1), c: clamp(fc, 0, b.rows[0].length - 1) }); this.commit(); };
    openMenu(anchor, [
      { label: 'Вставить строку выше', onClick: () => go(() => b.rows.splice(r, 0, Array(cols).fill('')), r, c) },
      { label: 'Вставить строку ниже', onClick: () => go(() => b.rows.splice(r + 1, 0, Array(cols).fill('')), r + 1, c) },
      { label: 'Вставить столбец слева', onClick: () => go(() => b.rows.forEach(row => row.splice(c, 0, '')), r, c) },
      { label: 'Вставить столбец справа', onClick: () => go(() => b.rows.forEach(row => row.splice(c + 1, 0, '')), r, c + 1) },
      'sep',
      { label: 'Первая строка — заголовок', checked: b.header, onClick: () => go(() => { b.header = !b.header; }, r, c) },
      'sep',
      { label: 'Удалить строку', danger: true, onClick: () => { if (b.rows.length <= 1) return this.deleteBlocks([b]); go(() => b.rows.splice(r, 1), r - 1 < 0 ? 0 : r - (r >= b.rows.length - 1 ? 1 : 0), c); } },
      { label: 'Удалить столбец', danger: true, onClick: () => { if (cols <= 1) return this.deleteBlocks([b]); go(() => b.rows.forEach(row => row.splice(c, 1)), r, c - (c >= cols - 1 ? 1 : 0)); } },
      { label: 'Удалить таблицу', danger: true, onClick: () => this.deleteBlocks([b]) }
    ]);
  }

  // ── клавиатура ──
  onKeyDown(e) {
    if (e.isComposing || e.keyCode === 229) return;
    const t = e.target;
    if (t === this.title) return this.titleKey(e);
    if (t === this.scroll) { if (this.sel.size) this.selKey(e); return; }
    const w = t.closest && t.closest('.blk');
    if (!w) return;
    const b = this.block(w.dataset.id);
    if (!b) return;
    if (t.classList.contains('blk-text')) return this.textKey(e, b, t);
    if (t.tagName === 'TEXTAREA') return this.codeKey(e, b, t);
    if (t.classList.contains('cell')) return this.cellKey(e, b, t);
    if (t.classList.contains('blk-divider')) return this.dividerKey(e, b);
  }

  titleKey(e) {
    if (e.key === 'Enter' || (e.key === 'ArrowDown' && Caret.lineInfo(this.title).last)) {
      e.preventDefault();
      const bl = this.page.blocks;
      if (e.key === 'Enter') {
        const off = Caret.offset(this.title) || 0;
        const full = this.title.textContent;
        if (off < full.length) {
          // Enter посреди названия переносит хвост в первый блок
          this.page.title = full.slice(0, off).trim();
          const nb = normalizeBlock({ type: 'text', html: esc(full.slice(off).trim()) });
          bl.unshift(nb);
          this.render();
          this.focusBlock(nb.id, 'start');
          this.commit();
          return;
        }
        if (!bl.length || !TEXTUAL.has(bl[0].type) || bl[0].html) bl.unshift(normalizeBlock({ type: 'text' }));
        this.render();
        this.focusBlock(bl[0].id, 'start');
        this.commit();
        return;
      }
      if (bl[0]) this.focusBlock(bl[0].id, 'start');
      return;
    }
    if (modKey(e) && ['KeyB', 'KeyI', 'KeyU', 'KeyE', 'KeyK'].includes(e.code)) e.preventDefault();
  }

  textKey(e, b, t) {
    if (richKeys(e)) return;
    const mod = modKey(e);
    if (this.slash && e.key === 'Enter') this.closeSlash();
    switch (e.key) {
      case 'Enter':
        if (e.shiftKey && !mod) return;
        e.preventDefault();
        if (mod) {
          if (b.type === 'todo') { b.checked = !b.checked; this.elOf(b.id).classList.toggle('done', b.checked); this.elOf(b.id).querySelector('.blk-cb').checked = b.checked; this.commit(); }
          else if (b.type === 'toggle') { b.open = !b.open; this.render(); this.focusBlock(b.id, 'end'); this.commit(); }
          return;
        }
        return this.onEnter(b, t);
      case 'Backspace':
        if (!mod && Caret.atStart(t)) { e.preventDefault(); this.onBackspace(b, t); }
        return;
      case 'Delete':
        if (!mod && Caret.atEnd(t)) { e.preventDefault(); this.onDelete(b, t); }
        return;
      case 'Tab': {
        e.preventDefault();
        const sel = this.captureSel();
        if (this.shiftIndent([b], e.shiftKey ? -1 : 1)) { this.render(); this.restoreSel(sel); this.commit(); }
        return;
      }
      case 'Escape':
        e.preventDefault();
        if (this.slash) { this.closeSlash(); return; }
        this.selectBlocks([b.id]);
        return;
      case 'ArrowUp': case 'ArrowDown': {
        if (mod && e.shiftKey) {
          e.preventDefault();
          const off = Caret.offset(t);
          if (this.moveByKey([b], e.key === 'ArrowUp' ? -1 : 1)) { this.focusBlock(b.id, off); this.commit(); }
          return;
        }
        if (e.shiftKey || mod || e.altKey || this.slash) return;
        const li = Caret.lineInfo(t);
        const target = e.key === 'ArrowUp' ? (li.first && this.visPrev(b)) : (li.last && this.visNext(b));
        if (target) { e.preventDefault(); this.focusBlock(target.id, e.key === 'ArrowUp' ? 'end' : 'start'); }
        else if (e.key === 'ArrowUp' && li.first && !this.visPrev(b)) { e.preventDefault(); this.focusTitle(); }
        return;
      }
      case 'ArrowLeft':
        if (!e.shiftKey && !mod && Caret.atStart(t)) { const p = this.visPrev(b); if (p) { e.preventDefault(); this.focusBlock(p.id, 'end'); } }
        return;
      case 'ArrowRight':
        if (!e.shiftKey && !mod && Caret.atEnd(t)) { const n = this.visNext(b); if (n) { e.preventDefault(); this.focusBlock(n.id, 'start'); } }
        return;
    }
    if (mod && e.code === 'KeyA' && !e.shiftKey) {
      const len = Caret.len(t);
      if (!len || (Caret.offset(t) === 0 && Caret.endOffset(t) === len)) { e.preventDefault(); this.selectBlocks(this.page.blocks.filter(x => this.elOf(x.id)).map(x => x.id)); }
      return;
    }
    if (mod && e.code === 'KeyD' && !e.shiftKey) { e.preventDefault(); this.duplicateBlocks([b]); return; }
  }

  onEnter(b, t) {
    this.closeSlash();
    const bl = this.page.blocks;
    const i = bl.indexOf(b);
    const empty = !t.textContent;
    if (empty && b.type !== 'text' && TEXTUAL.has(b.type) && !/^h[123]$/.test(b.type)) {
      if (b.indent > 0 && b.type !== 'quote' && b.type !== 'callout') this.shiftIndent([b], -1); else this.convert(b, 'text');
      this.render(); this.focusBlock(b.id, 0); this.commit();
      return;
    }
    const [before, after] = Caret.split(t);
    if (!before && after) {
      const nb = normalizeBlock({ type: LIST_TYPES.has(b.type) ? b.type : 'text', indent: b.indent });
      bl.splice(i, 0, nb);
      this.render(); this.focusBlock(b.id, 0); this.commit();
      return;
    }
    b.html = before;
    let type = LIST_TYPES.has(b.type) ? b.type : 'text', indent = b.indent, into = false;
    if (b.type === 'toggle') { if (b.open) { indent = b.indent + 1; into = true; } else type = 'toggle'; }
    const nb = normalizeBlock({ type, indent, html: after });
    this.insertAfter(b, nb, into || b.type !== 'toggle');
    this.render(); this.focusBlock(nb.id, 0); this.commit();
  }

  onBackspace(b, t) {
    this.closeSlash();
    if (b.type !== 'text') { this.convert(b, 'text'); this.render(); this.focusBlock(b.id, 0); this.commit(); return; }
    if (b.indent > 0) { this.shiftIndent([b], -1); this.render(); this.focusBlock(b.id, 0); this.commit(); return; }
    const pb = this.visPrev(b);
    if (!pb) return;
    if (TEXTUAL.has(pb.type)) {
      const len = textLenOf(pb.html);
      pb.html = normHtml((pb.html || '') + (b.html || ''));
      this.removeBlocks(new Set([b.id]));
      this.render(); this.focusBlock(pb.id, len); this.commit();
    } else if (pb.type === 'divider') {
      this.removeBlocks(new Set([pb.id]));
      this.render(); this.focusBlock(b.id, 0); this.commit();
    } else if (!t.textContent) {
      this.removeBlocks(new Set([b.id]));
      this.render(); this.focusBlock(pb.id, 'end'); this.commit();
    } else this.focusBlock(pb.id, 'end');
  }

  onDelete(b, t) {
    const nb = this.visNext(b);
    if (!nb) return;
    if (TEXTUAL.has(nb.type)) {
      const len = Caret.len(t);
      b.html = normHtml((b.html || '') + (nb.html || ''));
      const i = this.idx(nb), e = this.subtreeEnd(i);
      for (let j = i + 1; j < e; j++) this.page.blocks[j].indent = Math.max(b.indent, this.page.blocks[j].indent - 1);
      this.removeBlocks(new Set([nb.id]));
      this.render(); this.focusBlock(b.id, len); this.commit();
    } else if (nb.type === 'divider') {
      this.removeBlocks(new Set([nb.id]));
      this.render(); this.focusBlock(b.id, 'end'); this.commit();
    }
  }

  codeKey(e, b, ta) {
    const mod = modKey(e);
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ta.selectionStart, en = ta.selectionEnd;
      if (e.shiftKey) {
        const ls = ta.value.lastIndexOf('\n', s - 1) + 1;
        if (ta.value.slice(ls, ls + 2) === '  ') { ta.setRangeText('', ls, ls + 2, 'preserve'); ta.setSelectionRange(Math.max(ls, s - 2), Math.max(ls, en - 2)); }
      } else ta.setRangeText('  ', s, en, 'end');
      b.text = ta.value; autoGrow(ta); this.commit('code:' + b.id);
    } else if (e.key === 'Escape') { e.preventDefault(); this.selectBlocks([b.id]); }
    else if (e.key === 'Enter' && mod) {
      e.preventDefault();
      const nb = this.insertAfter(b, normalizeBlock({ type: 'text', indent: b.indent }));
      this.render(); this.focusBlock(nb.id, 'start'); this.commit();
    } else if (e.key === 'ArrowUp' && ta.selectionStart === 0 && ta.selectionEnd === 0 && !e.shiftKey) {
      const p = this.visPrev(b); if (p) { e.preventDefault(); this.focusBlock(p.id, 'end'); }
    } else if (e.key === 'ArrowDown' && ta.selectionStart === ta.value.length && !e.shiftKey) {
      const n = this.visNext(b); if (n) { e.preventDefault(); this.focusBlock(n.id, 'start'); }
    } else if (e.key === 'Backspace' && !ta.value) {
      e.preventDefault(); this.convert(b, 'text'); this.render(); this.focusBlock(b.id, 0); this.commit();
    }
  }

  cellKey(e, b, cell) {
    if (richKeys(e)) return;
    const r = +cell.dataset.r, c = +cell.dataset.c;
    const R = b.rows.length, C = b.rows[0].length;
    const go = (nr, nc, where) => this.focusBlock(b.id, { r: nr, c: nc, off: where === 'start' ? 0 : null });
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) { if (c > 0) go(r, c - 1); else if (r > 0) go(r - 1, C - 1); }
      else if (c < C - 1) go(r, c + 1);
      else if (r < R - 1) go(r + 1, 0);
      else { b.rows.push(Array(C).fill('')); this.render(); go(R, 0); this.commit(); }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (r < R - 1) go(r + 1, c);
      else { b.rows.push(Array(C).fill('')); this.render(); go(R, c); this.commit(); }
    } else if (e.key === 'Escape') { e.preventDefault(); this.selectBlocks([b.id]); }
    else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey && !modKey(e)) {
      const li = Caret.lineInfo(cell);
      if (e.key === 'ArrowUp' && li.first) {
        e.preventDefault();
        if (r > 0) go(r - 1, c); else { const p = this.visPrev(b); if (p) this.focusBlock(p.id, 'end'); }
      } else if (e.key === 'ArrowDown' && li.last) {
        e.preventDefault();
        if (r < R - 1) go(r + 1, c, 'start'); else { const n = this.visNext(b); if (n) this.focusBlock(n.id, 'start'); else { const nb = this.insertAfter(b, normalizeBlock({ type: 'text', indent: b.indent })); this.render(); this.focusBlock(nb.id, 'start'); this.commit(); } }
      }
    }
  }

  dividerKey(e, b) {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      const p = this.visPrev(b) || this.visNext(b);
      this.removeBlocks(new Set([b.id]));
      if (!this.page.blocks.length) this.page.blocks.push(normalizeBlock({ type: 'text' }));
      this.render();
      if (p) this.focusBlock(p.id, 'end');
      this.commit();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const nb = this.insertAfter(b, normalizeBlock({ type: 'text', indent: b.indent }));
      this.render(); this.focusBlock(nb.id, 'start'); this.commit();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { const p = this.visPrev(b); if (p) { e.preventDefault(); this.focusBlock(p.id, 'end'); } }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { const n = this.visNext(b); if (n) { e.preventDefault(); this.focusBlock(n.id, 'start'); } }
    else if (e.key === 'Escape') { e.preventDefault(); this.selectBlocks([b.id]); }
  }

  selKey(e) {
    const mod = modKey(e);
    const vis = this.page.blocks.filter(b => this.elOf(b.id));
    const selVis = vis.filter(b => this.sel.has(b.id));
    if (!selVis.length) { this.clearBlockSel(); return; }
    const firstI = vis.indexOf(selVis[0]), lastI = vis.indexOf(selVis[selVis.length - 1]);
    switch (e.key) {
      case 'Escape': e.preventDefault(); this.clearBlockSel(); return;
      case 'Backspace': case 'Delete': e.preventDefault(); this.deleteBlocks(selVis); return;
      case 'Enter': e.preventDefault(); { const b = selVis[0]; this.clearBlockSel(); this.focusBlock(b.id, 'end'); } return;
      case 'Tab': {
        e.preventDefault();
        const ids = selVis.map(b => b.id);
        if (this.shiftIndent(selVis, e.shiftKey ? -1 : 1)) { this.render(); this.selectBlocks(ids); this.commit(); }
        return;
      }
      case 'ArrowUp': case 'ArrowDown': {
        e.preventDefault();
        const up = e.key === 'ArrowUp';
        if (mod && e.shiftKey) {
          const ids = selVis.map(b => b.id);
          if (this.moveByKey(selVis, up ? -1 : 1)) { this.selectBlocks(ids); this.commit(); }
          return;
        }
        if (e.shiftKey) {
          const anchor = this.selAnchor && vis.find(b => b.id === this.selAnchor) ? vis.findIndex(b => b.id === this.selAnchor) : firstI;
          this.selAnchor = vis[anchor].id;
          let head = this.selHead != null ? this.selHead : (anchor === firstI ? lastI : firstI);
          head = clamp(head + (up ? -1 : 1), 0, vis.length - 1);
          this.selHead = head;
          const [a, z] = anchor < head ? [anchor, head] : [head, anchor];
          this.selectBlocks(vis.slice(a, z + 1).map(b => b.id));
          return;
        }
        this.selAnchor = null; this.selHead = null;
        const k = up ? Math.max(0, firstI - 1) : Math.min(vis.length - 1, lastI + 1);
        this.selectBlocks([vis[k].id]);
        scrollIntoViewSoft(this.elOf(vis[k].id), this.scroll);
        return;
      }
    }
    if (mod && e.code === 'KeyA') { e.preventDefault(); this.selectBlocks(vis.map(b => b.id)); return; }
    if (mod && e.code === 'KeyD') { e.preventDefault(); this.duplicateBlocks(selVis); return; }
  }

  // ── буфер обмена ──
  onCopy(e, cut) {
    if (!this.sel.size) return false;
    const list = this.page.blocks.filter(b => this.withSubtrees(this.sel).has(b.id));
    e.clipboardData.setData('text/plain', blocksToMd(list));
    e.preventDefault();
    if (cut) this.deleteBlocks(this.selectedBlocks());
    return true;
  }
  onPaste(e) {
    if (!this.sel.size) return false;
    const text = e.clipboardData.getData('text/plain');
    e.preventDefault();
    if (!text) return true;
    const parsed = parseMarkdown(text);
    if (!parsed.length) return true;
    const sel = this.selectedBlocks();
    const last = sel[sel.length - 1];
    const bl = this.page.blocks;
    const at = this.subtreeEnd(bl.indexOf(last));
    parsed.forEach(p => { p.indent = clamp(p.indent + last.indent, 0, 8); });
    bl.splice(at, 0, ...parsed);
    this.render();
    this.selectBlocks(parsed.map(p => p.id));
    this.commit();
    return true;
  }
  onPasteIn(e) {
    const t = e.target;
    if (t.tagName === 'TEXTAREA') return;
    const cd = e.clipboardData;
    if (!cd) return;
    const text = cd.getData('text/plain');
    if (t.classList.contains('cell')) { e.preventDefault(); if (text) document.execCommand('insertText', false, text.replace(/\r?\n/g, ' ')); return; }
    if (!t.classList.contains('blk-text')) return;
    e.preventDefault();
    if (!text) { if (cd.files && cd.files.length) toast('Картинки и файлы пока не поддерживаются — вставьте ссылку'); return; }
    const w = t.closest('.blk'), b = this.block(w.dataset.id);
    if (!b) return;
    const clean = text.replace(/\r\n?/g, '\n');
    if (!/\n/.test(clean.trim())) {
      const one = clean.replace(/\n/g, ' ');
      if (/^(https?:\/\/)\S+$/i.test(one.trim()) && !Caret.collapsed()) { exec('createLink', one.trim()); return; }
      document.execCommand('insertText', false, one);
      return;
    }
    const parsed = parseMarkdown(clean);
    if (!parsed.length) return;
    const bl = this.page.blocks;
    const [before, after] = Caret.split(t);
    parsed.forEach(p => { p.indent = clamp(p.indent + b.indent, 0, 8); });
    let inserted;
    if (!before && !after && b.type === 'text') {
      const i = bl.indexOf(b);
      bl.splice(i, 1, ...parsed);
      inserted = parsed;
    } else {
      let rest = parsed;
      b.html = before;
      if (TEXTUAL.has(parsed[0].type)) { b.html = normHtml(before + parsed[0].html); rest = parsed.slice(1); }
      const i = bl.indexOf(b);
      bl.splice(i + 1, 0, ...rest);
      inserted = [b].concat(rest);
    }
    let last = inserted[inserted.length - 1];
    let pos = 'end';
    if (after) {
      if (TEXTUAL.has(last.type)) { pos = textLenOf(last.html); last.html = normHtml((last.html || '') + after); }
      else { const nb = normalizeBlock({ type: 'text', indent: b.indent, html: after }); bl.splice(bl.indexOf(last) + 1, 0, nb); last = nb; pos = 0; }
    }
    this.render();
    this.focusBlock(last.id, pos);
    this.commit();
  }

  // ── меню «/» ──
  openSlash(b, node, start) {
    this.slash = { id: b.id, node, start, q: '' };
    this.renderSlash();
  }
  slashItems(q) {
    q = (q || '').toLowerCase().trim();
    if (!q) return BLOCK_TYPES;
    return BLOCK_TYPES.filter(t => (t.label + ' ' + t.keys).toLowerCase().split(/\s+/).some(w => w.startsWith(q)) || t.label.toLowerCase().includes(q));
  }
  renderSlash() {
    const s = this.slash;
    if (!s) return;
    const items = this.slashItems(s.q);
    const rect = Caret.rect() || s.node.getBoundingClientRect();
    s.rebuilding = true;
    openMenu({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, [{ title: 'Блоки' }].concat(items.map(t => ({
      label: t.label, icon: t.icon, box: true, desc: t.md ? 'Быстрый ввод: ' + t.md : '', onClick: () => this.applySlash(t.type, s)
    }))), { keyboard: true, empty: 'Ничего не найдено', onClose: () => { if (this.slash === s && !s.rebuilding) this.slash = null; } });
    s.rebuilding = false;
  }
  updateSlash() {
    const s = this.slash;
    if (!s) return;
    const node = s.node;
    const off = Caret.offset(node);
    const txt = node.textContent;
    if (!node.isConnected || off == null || off <= s.start || txt[s.start] !== '/') { this.closeSlash(); return; }
    const q = txt.slice(s.start + 1, off);
    if (q.length > 30 || /\n/.test(q) || (/\s$/.test(q) && !this.slashItems(q).length)) { this.closeSlash(); return; }
    s.q = q;
    this.renderSlash();
  }
  closeSlash() {
    if (!this.slash) return;
    this.slash = null;
    closeMenu();
  }
  applySlash(type, s) {
    s = s || this.slash;
    if (!s) return;
    this.slash = null;
    const b = this.block(s.id);
    const node = s.node;
    if (!b || !node.isConnected) return;
    const off = Caret.offset(node);
    const end = off != null && off > s.start ? off : Math.min(node.textContent.length, s.start + 1 + s.q.length);
    Caret.removeText(node, s.start, end);
    b.html = normHtml(node.innerHTML);
    const empty = !node.textContent.trim();
    let focusId = b.id, where = 'end';
    if (empty) {
      b.html = '';
      if (type === 'divider') {
        this.convert(b, 'divider');
        let nb = this.visNext(b);
        if (!nb || !TEXTUAL.has(nb.type)) nb = this.insertAfter(b, normalizeBlock({ type: 'text', indent: b.indent }));
        focusId = nb.id; where = 'start';
      } else {
        this.convert(b, type);
        if (type === 'toggle') b.open = true;
        where = type === 'table' ? 'start' : 'end';
      }
    } else {
      const nb = normalizeBlock({ type, indent: b.indent });
      if (type === 'toggle') nb.open = true;
      this.insertAfter(b, nb);
      focusId = nb.id; where = 'start';
      if (type === 'divider') { const t2 = this.insertAfter(nb, normalizeBlock({ type: 'text', indent: b.indent })); focusId = t2.id; }
    }
    this.render();
    this.focusBlock(focusId, where);
    this.commit();
  }

  // ── меню блока ──
  openBlockMenu(b, anchor, shift) {
    if (shift) {
      const s = new Set(this.sel);
      if (s.has(b.id)) s.delete(b.id); else s.add(b.id);
      this.selectBlocks([...s]);
      return;
    }
    if (!this.sel.has(b.id)) this.selectBlocks([b.id]);
    const list = () => this.selectedBlocks();
    const one = list().length === 1;
    const convertTo = t => {
      const l = list();
      const ids = l.map(x => x.id);
      l.forEach(x => { if (t !== 'table' || l.length === 1) this.convert(x, t); if (t === 'toggle') x.open = true; });
      this.render();
      if (one && t !== 'divider') { this.clearBlockSel(); this.focusBlock(ids[0], 'end'); } else this.selectBlocks(ids);
      this.commit();
    };
    const colorize = c => {
      const ids = list().map(x => x.id);
      list().forEach(x => { if (c) x.color = c; else delete x.color; });
      this.render(); this.selectBlocks(ids); this.commit();
    };
    openMenu(anchor, [
      { title: one ? (BT[b.type].label) : 'Блоков: ' + list().length },
      { label: 'Удалить', icon: '🗑', hint: 'Del', danger: true, onClick: () => this.deleteBlocks(list()) },
      { label: 'Дублировать', icon: '⧉', hint: MOD + '+D', onClick: () => this.duplicateBlocks(list()) },
      { label: 'Превратить в', icon: '↻', sub: () => BLOCK_TYPES.filter(t => t.type !== 'divider' && (t.type !== 'table' || one)).map(t => ({ label: t.label, icon: t.icon, checked: one && b.type === t.type, onClick: () => convertTo(t.type) })) },
      { label: 'Цвет', icon: '🎨', sub: () => [{ title: 'Текст' }, { label: 'По умолчанию', icon: 'A', onClick: () => colorize(null) }]
        .concat(COLORS.map(c => ({ label: COLOR_NAMES[c], icon: 'A', checked: one && b.color === c, onClick: () => colorize(c) })))
        .concat([{ title: 'Фон' }], COLORS.map(c => ({ label: COLOR_NAMES[c] + ' фон', icon: '■', checked: one && b.color === 'bg-' + c, onClick: () => colorize('bg-' + c) }))) },
      'sep',
      { label: 'Переместить выше', icon: '↑', hint: MOD + '+Shift+↑', onClick: () => { const ids = list().map(x => x.id); if (this.moveByKey(list(), -1)) { this.selectBlocks(ids); this.commit(); } } },
      { label: 'Переместить ниже', icon: '↓', hint: MOD + '+Shift+↓', onClick: () => { const ids = list().map(x => x.id); if (this.moveByKey(list(), 1)) { this.selectBlocks(ids); this.commit(); } } },
      { label: 'Скопировать как Markdown', icon: '⎘', onClick: async () => { const ok = await copyText(blocksToMd(this.page.blocks.filter(x => this.withSubtrees(this.sel).has(x.id)))); toast(ok ? 'Скопировано' : 'Не удалось скопировать'); } }
    ]);
  }

  // ── мышь: перетаскивание блоков ──
  onHandleDown(e, handle) {
    if (e.button !== 0) return;
    e.preventDefault();
    const w = handle.closest('.blk');
    const b = this.block(w.dataset.id);
    if (!b) return;
    const sx = e.clientX, sy = e.clientY;
    let dragging = false, line = null, target = null, timer = 0, lastY = sy;
    const ids = this.sel.has(b.id) && this.sel.size > 1 ? this.selectedBlocks() : [b];
    try { handle.setPointerCapture(e.pointerId); } catch (er) { /* noop */ }
    const start = () => {
      dragging = true;
      this.closeSlash();
      const set = this.withSubtrees(new Set(ids.map(x => x.id)));
      $$('.blk', this.blocksEl).forEach(x => { if (set.has(x.dataset.id)) x.classList.add('dragging'); });
      line = el('div', { class: 'drop-line' });
      this.blocksEl.append(line);
      if (document.activeElement && this.scroll.contains(document.activeElement)) document.activeElement.blur();
      timer = setInterval(() => {
        const r = this.scroll.getBoundingClientRect();
        if (lastY < r.top + 50) this.scroll.scrollTop -= 14; else if (lastY > r.bottom - 50) this.scroll.scrollTop += 14;
      }, 30);
    };
    const update = y => {
      const els = $$('.blk:not(.dragging)', this.blocksEl);
      target = null;
      let top = null, ind = 0;
      for (const x of els) {
        const r = x.getBoundingClientRect();
        if (y < r.top + r.height / 2) { target = x.dataset.id; top = x.offsetTop - 2; ind = +x.style.getPropertyValue('--ind') || 0; break; }
      }
      if (!target) {
        const lastEl = els[els.length - 1];
        top = lastEl ? lastEl.offsetTop + lastEl.offsetHeight : 0;
      }
      line.style.top = top + 'px';
      line.style.left = (ind * 26) + 'px';
      line.style.right = '0';
    };
    const move = ev => {
      lastY = ev.clientY;
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 4) start();
      if (dragging) update(ev.clientY);
    };
    const finish = ev => {
      cleanup();
      if (!dragging) { this.openBlockMenu(b, handle, ev && ev.shiftKey); return; }
      const idsArr = ids.map(x => x.id);
      if (ev && ev.type === 'pointerup' && this.moveBlocks(ids, target)) { this.render(); this.selectBlocks(idsArr); this.commit(); }
      else { this.render(); this.selectBlocks(idsArr); }
    };
    const cleanup = () => {
      clearInterval(timer);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
      if (line) line.remove();
      $$('.blk.dragging', this.blocksEl).forEach(x => x.classList.remove('dragging'));
      this.stopDrag = null;
    };
    this.stopDrag = cleanup;
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  }

  // ── мышь: рамка выделения и выделение через несколько блоков ──
  onScrollPointerDown(e) {
    if (e.button !== 0 || e.pointerType === 'touch') return;
    const t = e.target;
    if (t.closest('.blk-gutter, button, input, textarea, .doc-icon-row, a, .tbl-actions')) return;
    if (t === this.title || this.title.contains(t)) return;
    const startBlk = t.closest('.blk');
    const inText = t.closest('.blk-text, .cell');
    if (e.shiftKey && startBlk && this.sel.size) {
      // Shift+клик расширяет выделение блоков
      e.preventDefault();
      const vis = this.page.blocks.filter(b => this.elOf(b.id));
      const ids = vis.map(b => b.id);
      const a = ids.findIndex(id => this.sel.has(id)), z = ids.indexOf(startBlk.dataset.id);
      const [i1, i2] = a < z ? [a, z] : [z, a];
      this.selectBlocks(ids.slice(i1, i2 + 1));
      return;
    }
    const sx = e.clientX, sy = e.clientY;
    let mode = null, box = null;
    if (!inText && !startBlk) {
      if (this.sel.size) this.clearBlockSel();
    }
    const blocksBetween = (y1, y2) => {
      const lo = Math.min(y1, y2), hi = Math.max(y1, y2);
      return $$('.blk', this.blocksEl).filter(x => { const r = x.getBoundingClientRect(); return r.bottom > lo && r.top < hi; }).map(x => x.dataset.id);
    };
    const move = ev => {
      if (!mode) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        if (inText) {
          const over = document.elementFromPoint(ev.clientX, ev.clientY);
          const ob = over && over.closest && over.closest('.blk');
          if (!ob || ob === startBlk || !startBlk) return;
          mode = 'cross';
        } else mode = 'box';
        this.root.classList.add('sel-mode');
        if (mode === 'box') { box = el('div', { class: 'marquee-doc' }); document.body.append(box); }
        if (document.activeElement && this.scroll.contains(document.activeElement)) document.activeElement.blur();
      }
      window.getSelection().removeAllRanges();
      if (mode === 'box') {
        Object.assign(box.style, { left: Math.min(sx, ev.clientX) + 'px', top: Math.min(sy, ev.clientY) + 'px', width: Math.abs(ev.clientX - sx) + 'px', height: Math.abs(ev.clientY - sy) + 'px' });
        const br = this.blocksEl.getBoundingClientRect();
        const hitX = Math.max(sx, ev.clientX) > br.left && Math.min(sx, ev.clientX) < br.right;
        this.selectBlocks(hitX ? blocksBetween(sy, ev.clientY) : [], true);
      } else {
        const sr = startBlk.getBoundingClientRect();
        this.selectBlocks(blocksBetween(sr.top + 2, ev.clientY), true);
      }
    };
    const up = ev => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      this.root.classList.remove('sel-mode');
      if (box) box.remove();
      if (mode) { if (this.sel.size) this.scroll.focus({ preventScroll: true }); return; }
      if (ev.type === 'pointerup' && (t === this.tail || this.tail.contains(t))) this.tailClick();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  tailClick() {
    const bl = this.page.blocks;
    const lastVis = [...bl].reverse().find(b => this.elOf(b.id));
    if (lastVis && lastVis.type === 'text' && !lastVis.html && lastVis.indent === 0) { this.focusBlock(lastVis.id, 'end'); return; }
    const nb = normalizeBlock({ type: 'text' });
    bl.push(nb);
    this.render();
    this.focusBlock(nb.id, 'start');
    this.commit();
  }
}

function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
function scrollIntoViewSoft(node, scroller) {
  if (!node || !scroller) return;
  const r = node.getBoundingClientRect(), s = scroller.getBoundingClientRect();
  if (r.top < s.top + 20) scroller.scrollTop -= (s.top + 20 - r.top);
  else if (r.bottom > s.bottom - 40) scroller.scrollTop += Math.min(r.bottom - s.bottom + 40, r.top - s.top - 20);
}

// ════════════════════════════════════════════════════════════
//  Доска (бесконечный холст в стиле Miro)
// ════════════════════════════════════════════════════════════
const STICKY_COLORS = { yellow: '#fff1a8', orange: '#ffd8a8', red: '#ffc9c9', pink: '#fcc2d7', violet: '#e5dbff', blue: '#c5e3ff', cyan: '#c3fae8', green: '#d3f9d8', gray: '#e9ecef', white: '#ffffff' };
const SHAPE_COLORS = { blue: ['#dbeafe', '#3b82f6'], green: ['#dcfce7', '#22a35a'], yellow: ['#fef3c7', '#d99a06'], red: ['#fee2e2', '#e5484d'], violet: ['#ede9fe', '#7c5cf0'], gray: ['#f1f3f5', '#868e96'], white: ['#ffffff', '#495057'], dark: ['#343a40', '#212529'] };
const INK_COLORS = { default: null, gray: '#868e96', blue: '#2383e2', red: '#e03131', green: '#2f9e44', orange: '#f08c00', violet: '#7048e8' };
const LINE_COLORS = { gray: '#868e96', dark: '#343a40', blue: '#2383e2', red: '#e03131', green: '#2f9e44', orange: '#f08c00', violet: '#7048e8' };
const FRAME_COLORS = { white: null, gray: '#f1f3f5', blue: '#e7f1fd', yellow: '#fff8db', green: '#ebfbee', pink: '#fff0f6' };
const FONT_SIZES = [{ v: null, l: 'Авто' }, { v: 12, l: 'S' }, { v: 16, l: 'M' }, { v: 22, l: 'L' }, { v: 32, l: 'XL' }, { v: 48, l: 'XXL' }];
const TOOLS = [
  { id: 'select', icon: 'cursor', key: 'V', label: 'Выбор' },
  { id: 'hand', icon: 'hand', key: 'H', label: 'Рука (перемещать холст)' },
  'sep',
  { id: 'sticky', icon: 'sticky', key: 'N', label: 'Стикер' },
  { id: 'shape', icon: 'shape', key: 'S', label: 'Фигура' },
  { id: 'text', icon: 'text', key: 'T', label: 'Текст' },
  { id: 'frame', icon: 'frame', key: 'F', label: 'Фрейм (группа)' },
  { id: 'line', icon: 'line', key: 'L', label: 'Стрелка' }
];
const MIN_Z = 0.1, MAX_Z = 4;
let boardClip = null;

class BoardEditor {
  constructor(p, host) {
    this.page = p;
    this.host = host;
    this.sel = new Set();
    this.tool = 'select';
    this.editing = null;      // id элемента или 'label:id' / 'title:id'
    this.els = new Map();
    this.measured = new Map(); // высоты текстовых элементов
    this.fitCache = new Map();
    this.pointers = new Map();
    this.g = null;            // текущий жест
    this.space = false;
    this.lastTap = null;
    const v = views[p.id];
    this.view = v && Number.isFinite(v.x) && Number.isFinite(v.z) ? { x: v.x, y: v.y, z: clamp(v.z, MIN_Z, MAX_Z) } : null;
    this.build();
    this.renderAll();
    if (!this.view) requestAnimationFrame(() => this.fit(true));
    else this.applyView();
  }

  build() {
    const b = this.board = el('div', { class: 'board', tabindex: '0', 'aria-label': 'Доска' });
    this.world = el('div', { class: 'b-world' });
    this.framesL = el('div', { class: 'b-layer' });
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'b-lines');
    this.labelsL = el('div', { class: 'b-layer' });
    this.itemsL = el('div', { class: 'b-layer' });
    this.world.append(this.framesL, this.svg, this.labelsL, this.itemsL);
    this.overlay = el('div', { class: 'b-overlay' });
    this.tools = el('div', { class: 'b-tools b-ui' });
    TOOLS.forEach(t => {
      if (t === 'sep') { this.tools.append(el('div', { class: 'sep' })); return; }
      const btn = el('button', { class: 'b-tool', type: 'button', title: t.label + ' (' + t.key + ')', 'aria-label': t.label, 'data-tool': t.id, html: ICONS[t.icon] });
      btn.addEventListener('click', () => this.setTool(t.id));
      this.tools.append(btn);
    });
    this.zoomL = el('button', { type: 'button', title: 'Масштаб 100% (' + MOD + '+0)', text: '100%' });
    this.zoomBox = el('div', { class: 'b-zoom b-ui' },
      el('button', { type: 'button', title: 'Отдалить (−)', html: ICONS.minus, onclick: () => this.zoomBy(1 / 1.25) }),
      this.zoomL,
      el('button', { type: 'button', title: 'Приблизить (+)', html: ICONS.plusL, onclick: () => this.zoomBy(1.25) }),
      el('button', { type: 'button', class: 'zf', title: 'Показать всё (Shift+1)', html: ICONS.fit, onclick: () => this.fit() }));
    this.zoomL.addEventListener('click', () => this.zoomTo(1));
    this.hint = el('div', { class: 'b-hint', text: 'Двойной клик — новый стикер · колёсико — прокрутка · ' + MOD + '+колёсико — масштаб · пробел+мышь — сдвиг' });
    this.ctx = el('div', { class: 'b-ctx b-ui', hidden: true });
    b.append(this.world, this.overlay, this.tools, this.zoomBox, this.hint, this.ctx);
    this.host.append(b);
    this.setTool('select');
    if (this.page.items.length) this.hint.style.opacity = '0';

    b.addEventListener('pointerdown', e => this.onDown(e));
    b.addEventListener('pointermove', e => this.onMove(e));
    b.addEventListener('pointerup', e => this.onUp(e));
    b.addEventListener('pointercancel', e => this.onUp(e, true));
    b.addEventListener('lostpointercapture', e => { if (this.pointers.has(e.pointerId)) this.onUp(e, true); });
    b.addEventListener('wheel', e => this.onWheel(e), { passive: false });
    b.addEventListener('contextmenu', e => this.onContext(e));
    b.addEventListener('keydown', e => this.onKey(e));
    b.addEventListener('keyup', e => { if (e.code === 'Space') { this.space = false; b.classList.remove('panning'); } });
    b.addEventListener('input', e => this.onInput(e));
    b.addEventListener('paste', e => { if (this.editing) pastePlain(e); });
    b.addEventListener('focusout', e => {
      if (!this.editing) return;
      const ed = this.editingNode();
      if (ed && e.target === ed && !(e.relatedTarget && ed.contains(e.relatedTarget))) setTimeout(() => { if (this.editing && document.activeElement !== this.editingNode()) this.finishEdit(); }, 0);
    });
    this.ctx.addEventListener('pointerdown', e => { e.stopPropagation(); if (!e.target.closest('input')) e.preventDefault(); });
    this.ro = new ResizeObserver(() => this.applyView());
    this.ro.observe(b);
    this.onBlurWin = () => { this.space = false; b.classList.remove('panning'); };
    window.addEventListener('blur', this.onBlurWin);
  }

  destroy() {
    if (this.editing) this.finishEdit();
    this.ro.disconnect();
    window.removeEventListener('blur', this.onBlurWin);
    this.board.remove();
  }

  // ── координаты и вид ──
  item(id) { return this.page.items.find(i => i.id === id) || null; }
  h(it) { return it.kind === 'text' ? (this.measured.get(it.id) || it.h || 40) : it.h; }
  rectOf(it) { return { x: it.x, y: it.y, w: it.w, h: this.h(it) }; }
  toWorld(cx, cy) { const r = this.board.getBoundingClientRect(); return { x: (cx - r.left - this.view.x) / this.view.z, y: (cy - r.top - this.view.y) / this.view.z }; }
  toScreen(x, y) { return { x: x * this.view.z + this.view.x, y: y * this.view.z + this.view.y }; }
  applyView() {
    if (!this.view) return;
    const { x, y, z } = this.view;
    this.world.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + z + ')';
    this.world.style.setProperty('--iz', 1 / z);
    const gs = 24 * z;
    if (z >= 0.3) {
      this.board.style.backgroundImage = 'radial-gradient(circle, var(--board-dot) ' + Math.max(0.7, Math.min(1.4, z)) + 'px, transparent ' + (Math.max(0.7, Math.min(1.4, z)) + 0.3) + 'px)';
      this.board.style.backgroundSize = gs + 'px ' + gs + 'px';
      this.board.style.backgroundPosition = x + 'px ' + y + 'px';
    } else this.board.style.backgroundImage = 'none';
    this.zoomL.textContent = Math.round(z * 100) + '%';
    this.sizeFrameTitles();
    this.renderLines();
    this.renderOverlay();
    views[this.page.id] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 1000) / 1000 };
    saveViews();
  }
  // подпись фрейма держим читаемой при любом масштабе, но не шире самого фрейма
  sizeFrameTitles() {
    const z = this.view.z;
    this.page.items.forEach(it => {
      if (it.kind !== 'frame') return;
      const n = this.els.get(it.id);
      if (n) n.firstChild.style.fontSize = Math.max(6, Math.min(14 / z, it.w / 10, 90)) + 'px';
    });
  }
  zoomAt(z, cx, cy) {
    z = clamp(z, MIN_Z, MAX_Z);
    const r = this.board.getBoundingClientRect();
    const px = cx - r.left, py = cy - r.top;
    const wx = (px - this.view.x) / this.view.z, wy = (py - this.view.y) / this.view.z;
    this.view = { x: px - wx * z, y: py - wy * z, z };
    this.applyView();
  }
  zoomBy(f) { const r = this.board.getBoundingClientRect(); this.zoomAt(this.view.z * f, r.left + r.width / 2, r.top + r.height / 2); }
  zoomTo(z) { const r = this.board.getBoundingClientRect(); this.zoomAt(z, r.left + r.width / 2, r.top + r.height / 2); }
  bounds(items) {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    items.forEach(it => {
      if (it.kind === 'line') {
        [this.endPoint(it, 'from'), this.endPoint(it, 'to')].forEach(p => { if (p) { x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y); x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y); } });
        return;
      }
      const r = this.rectOf(it);
      x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y - (it.kind === 'frame' ? 24 : 0)); x2 = Math.max(x2, r.x + r.w); y2 = Math.max(y2, r.y + r.h);
    });
    return x1 === Infinity ? null : { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }
  fit(initial) {
    const r = this.board.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const bb = this.bounds(this.page.items);
    if (!bb) { this.view = { x: r.width / 2, y: r.height / 2, z: 1 }; this.applyView(); return; }
    const pad = r.width < 600 ? 30 : 80;
    const z = clamp(Math.min((r.width - pad * 2) / Math.max(bb.w, 1), (r.height - pad * 2) / Math.max(bb.h, 1)), MIN_Z, initial ? 1 : 1.5);
    this.view = { x: r.width / 2 - (bb.x + bb.w / 2) * z, y: r.height / 2 - (bb.y + bb.h / 2) * z, z };
    this.applyView();
  }

  setTool(t) {
    this.tool = t;
    $$('.b-tool', this.tools).forEach(b => b.classList.toggle('on', b.dataset.tool === t));
    this.board.classList.toggle('tool-hand', t === 'hand');
    this.board.classList.toggle('tool-create', ['sticky', 'shape', 'text', 'frame', 'line'].includes(t));
  }

  // ── отрисовка ──
  renderAll() {
    this.renderItems();
    this.renderLines();
    this.renderOverlay();
    this.renderCtx();
  }
  renderItems() {
    const seen = new Set();
    const frames = [], others = [];
    this.page.items.forEach(it => { if (it.kind === 'frame') frames.push(it); else if (it.kind !== 'line') others.push(it); });
    const place = (layer, list) => {
      list.forEach((it, i) => {
        seen.add(it.id);
        let n = this.els.get(it.id);
        if (!n || n.dataset.kind !== it.kind) { if (n) n.remove(); n = this.createEl(it); this.els.set(it.id, n); }
        if (layer.children[i] !== n) layer.insertBefore(n, layer.children[i] || null);
        this.updateEl(n, it);
      });
      while (layer.children.length > list.length) {
        const last = layer.lastElementChild;
        if (seen.has(last.dataset.id) && layer.children.length <= list.length) break;
        last.remove();
      }
    };
    place(this.framesL, frames);
    place(this.itemsL, others);
    for (const [id, n] of this.els) if (!seen.has(id)) { n.remove(); this.els.delete(id); }
    if (this.view) this.sizeFrameTitles();
    this.measureTexts();
  }
  createEl(it) {
    const n = el('div', { class: 'bi bi-' + (it.kind === 'text' ? 'textitem' : it.kind), 'data-id': it.id, 'data-kind': it.kind });
    if (it.kind === 'frame') n.append(el('div', { class: 'bi-frame-title', spellcheck: 'false' }));
    else {
      if (it.kind === 'shape') n.innerHTML = '<svg preserveAspectRatio="none"><path vector-effect="non-scaling-stroke" stroke-width="2"/></svg>';
      n.append(el('div', { class: 'bi-text rich', spellcheck: 'true' }));
    }
    return n;
  }
  updateEl(n, it) {
    const editingThis = this.editing === it.id || this.editing === 'title:' + it.id;
    n.style.left = it.x + 'px';
    n.style.top = it.y + 'px';
    n.style.width = it.w + 'px';
    if (it.kind !== 'text') n.style.height = it.h + 'px';
    n.classList.toggle('sel', this.sel.has(it.id));
    if (it.kind === 'frame') {
      n.style.background = FRAME_COLORS[it.color] || '';
      const t = n.firstChild;
      if (!editingThis && t.textContent !== it.title) t.textContent = it.title || 'Фрейм';
      return;
    }
    const tx = n.querySelector('.bi-text');
    if (!editingThis) {
      const html = sanitizeHtml(it.html);
      if (tx.innerHTML !== html) tx.innerHTML = html;
    }
    tx.classList.toggle('al-left', it.align === 'left');
    if (it.kind === 'sticky') n.style.background = STICKY_COLORS[it.color] || STICKY_COLORS.yellow;
    if (it.kind === 'shape') {
      const [fill, stroke] = SHAPE_COLORS[it.color] || SHAPE_COLORS.blue;
      const path = n.querySelector('path');
      const d = { rect: 'M0 0H100V100H0Z', round: 'M12 0H88Q100 0 100 12V88Q100 100 88 100H12Q0 100 0 88V12Q0 0 12 0Z', ellipse: 'M50 0A50 50 0 1 1 50 100A50 50 0 1 1 50 0Z', diamond: 'M50 0L100 50L50 100L0 50Z' }[it.shape];
      const svg = n.querySelector('svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      if (it.shape === 'round') {
        // скругление не растягивается: строим путь в реальных размерах
        const w = it.w, hh = it.h, r = Math.min(16, w / 4, hh / 4);
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + hh);
        path.setAttribute('d', 'M' + r + ' 0H' + (w - r) + 'Q' + w + ' 0 ' + w + ' ' + r + 'V' + (hh - r) + 'Q' + w + ' ' + hh + ' ' + (w - r) + ' ' + hh + 'H' + r + 'Q0 ' + hh + ' 0 ' + (hh - r) + 'V' + r + 'Q0 0 ' + r + ' 0Z');
      } else path.setAttribute('d', d);
      path.setAttribute('fill', fill);
      path.setAttribute('stroke', stroke);
      n.style.color = it.color === 'dark' ? '#fff' : '';
      n.className = 'bi bi-shape sh-' + it.shape + (this.sel.has(it.id) ? ' sel' : '') + (editingThis ? ' editing' : '');
    }
    if (it.kind === 'text') {
      n.style.color = INK_COLORS[it.color] || '';
      tx.style.fontSize = (it.fs || 20) + 'px';
      n.style.height = '';
    }
    if (it.kind === 'sticky' || it.kind === 'shape') this.fitText(n, it);
  }
  fitText(n, it) {
    const tx = n.querySelector('.bi-text');
    const key = it.html + '|' + it.w + '|' + it.h + '|' + (it.fs || 0) + '|' + it.kind + '|' + (it.shape || '');
    if (this.fitCache.get(it.id) === key && tx.style.fontSize) return;
    let fs = it.fs || Math.round(clamp(Math.min(it.w, it.h) / 9, 12, 28));
    tx.style.fontSize = fs + 'px';
    if (!n.isConnected) return;
    let guard = 0;
    const box = n.clientHeight;
    while (fs > 7 && (tx.offsetHeight > box + 1 || tx.scrollWidth > tx.clientWidth + 1) && guard++ < 40) {
      fs -= fs > 20 ? 2 : 1;
      tx.style.fontSize = fs + 'px';
    }
    this.fitCache.set(it.id, key);
  }
  measureTexts() {
    let changedH = false;
    this.page.items.forEach(it => {
      if (it.kind !== 'text') return;
      const n = this.els.get(it.id);
      if (!n || !n.isConnected) return;
      const h = n.offsetHeight;
      if (h && this.measured.get(it.id) !== h) { this.measured.set(it.id, h); changedH = true; }
    });
    return changedH;
  }

  endPoint(ln, which) {
    const e = ln[which], o = ln[which === 'from' ? 'to' : 'from'];
    const ref = e2 => { if (e2.id) { const it = this.item(e2.id); if (!it) return null; const r = this.rectOf(it); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; } return { x: e2.x, y: e2.y }; };
    if (!e.id) return { x: e.x, y: e.y };
    const it = this.item(e.id);
    if (!it) return null;
    const r = this.rectOf(it);
    const c = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    const t = ref(o) || c;
    const dx = t.x - c.x, dy = t.y - c.y;
    if (!dx && !dy) return c;
    const hw = r.w / 2, hh = r.h / 2;
    let k;
    if (it.kind === 'shape' && it.shape === 'ellipse') k = 1 / Math.sqrt((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh));
    else if (it.kind === 'shape' && it.shape === 'diamond') k = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
    else k = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    const len = Math.hypot(dx, dy), gap = 6;
    return { x: c.x + dx * k + (dx / len) * gap, y: c.y + dy * k + (dy / len) * gap };
  }
  renderLines() {
    if (!this.view) return;
    const z = this.view.z;
    let svg = '';
    const labels = [];
    this.page.items.forEach(ln => {
      if (ln.kind !== 'line') return;
      const a = this.endPoint(ln, 'from'), b = this.endPoint(ln, 'to');
      if (!a || !b) return;
      const col = LINE_COLORS[ln.color] || LINE_COLORS.gray;
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      const L = 12, W = 6;
      const head = (p, sx, sy) => '<path d="M' + p.x + ' ' + p.y + 'L' + (p.x - sx * L + -sy * W) + ' ' + (p.y - sy * L + sx * W) + 'L' + (p.x - sx * L - -sy * W) + ' ' + (p.y - sy * L - sx * W) + 'Z" fill="' + col + '"/>';
      const a2 = ln.arrow === 'both' && len > L ? { x: a.x + ux * L * 0.8, y: a.y + uy * L * 0.8 } : a;
      const b2 = ln.arrow !== 'none' && len > L ? { x: b.x - ux * L * 0.8, y: b.y - uy * L * 0.8 } : b;
      const d = 'M' + a2.x + ' ' + a2.y + 'L' + b2.x + ' ' + b2.y;
      const s = this.sel.has(ln.id);
      svg += '<g data-id="' + esc(ln.id) + '" class="' + (s ? 'sel' : '') + '">' +
        '<path class="hit" d="M' + a.x + ' ' + a.y + 'L' + b.x + ' ' + b.y + '" stroke-width="' + (16 / z) + '"/>' +
        '<path class="ln" d="' + d + '" stroke="' + (s ? 'var(--accent)' : col) + '" stroke-width="2"' + (ln.dash ? ' stroke-dasharray="7 6"' : '') + '/>' +
        (ln.arrow !== 'none' ? head(b, ux, uy) : '') + (ln.arrow === 'both' ? head(a, -ux, -uy) : '') + '</g>';
      if (ln.html || this.editing === 'label:' + ln.id) labels.push({ ln, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    });
    if (this.g && this.g.type === 'connect' && this.g.tmp) {
      const p = this.g.tmp;
      svg += '<path class="tmp" d="M' + p.a.x + ' ' + p.a.y + 'L' + p.b.x + ' ' + p.b.y + '" stroke-width="' + (2 / z) + '"/>';
    }
    this.svg.innerHTML = svg;
    // подписи стрелок
    const keep = new Set();
    labels.forEach(({ ln, x, y }) => {
      keep.add(ln.id);
      let n = this.labelsL.querySelector('.bi-label[data-line="' + CSS.escape(ln.id) + '"]');
      if (!n) { n = el('div', { class: 'bi-label rich', 'data-line': ln.id, 'data-id': ln.id }); this.labelsL.append(n); }
      n.style.left = x + 'px'; n.style.top = y + 'px';
      if (this.editing !== 'label:' + ln.id) { const h = sanitizeHtml(ln.html); if (n.innerHTML !== h) n.innerHTML = h; }
    });
    $$('.bi-label', this.labelsL).forEach(n => { if (!keep.has(n.dataset.line)) n.remove(); });
  }

  selItems() { return this.page.items.filter(i => this.sel.has(i.id)); }
  renderOverlay() {
    if (!this.view) return;
    const ov = this.overlay;
    ov.innerHTML = '';
    if (this.g && this.g.type === 'marquee' && this.g.box) {
      const b = this.g.box;
      ov.append(el('div', { class: 'b-marquee', style: { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' } }));
    }
    const sel = this.selItems();
    if (!sel.length) return;
    const z = this.view.z;
    const boxes = sel.filter(i => i.kind !== 'line');
    const lines = sel.filter(i => i.kind === 'line');
    if (boxes.length > 1 || (boxes.length && lines.length)) {
      boxes.forEach(it => {
        const r = this.rectOf(it), p = this.toScreen(r.x, r.y);
        ov.append(el('div', { class: 'b-selbox thin', style: { left: p.x + 'px', top: p.y + 'px', width: r.w * z + 'px', height: r.h * z + 'px' } }));
      });
    }
    if (boxes.length) {
      const bb = this.bounds(boxes);
      const fb = boxes.length === 1 && boxes[0].kind === 'frame' ? this.rectOf(boxes[0]) : bb;
      const p = this.toScreen(fb.x, fb.y), w = fb.w * z, hgt = fb.h * z;
      ov.append(el('div', { class: 'b-selbox', style: { left: p.x - 1 + 'px', top: p.y - 1 + 'px', width: w + 2 + 'px', height: hgt + 2 + 'px' } }));
      if (!this.editing) {
        const only = boxes.length === 1 ? boxes[0] : null;
        const hs = only && only.kind === 'text' ? ['w', 'e'] : ['nw', 'ne', 'sw', 'se'];
        const pos = { nw: [0, 0], ne: [1, 0], sw: [0, 1], se: [1, 1], w: [0, 0.5], e: [1, 0.5] };
        hs.forEach(hn => ov.append(el('div', { class: 'b-handle ' + hn, 'data-handle': hn, style: { left: p.x + pos[hn][0] * w + 'px', top: p.y + pos[hn][1] * hgt + 'px' } })));
        if (only && only.kind !== 'frame' && !lines.length) {
          [[0.5, 0, 0, -1], [1, 0.5, 1, 0], [0.5, 1, 0, 1], [0, 0.5, -1, 0]].forEach(([fx, fy, dx, dy]) => {
            ov.append(el('div', { class: 'b-anchor', 'data-anchor': only.id, title: 'Потяните, чтобы провести стрелку', style: { left: p.x + fx * w + dx * 22 + 'px', top: p.y + fy * hgt + dy * 22 + 'px' } }));
          });
        }
      }
    }
    if (lines.length === 1 && !boxes.length && !this.editing) {
      const ln = lines[0];
      ['from', 'to'].forEach(wh => {
        const pt = this.endPoint(ln, wh);
        if (!pt) return;
        const s = this.toScreen(pt.x, pt.y);
        ov.append(el('div', { class: 'b-handle end', 'data-end': wh, title: 'Перетащите конец стрелки', style: { left: s.x + 'px', top: s.y + 'px' } }));
      });
    }
    this.positionCtx();
  }

  // ── контекстная панель ──
  renderCtx() {
    const ctx = this.ctx;
    const sel = this.selItems();
    ctx.innerHTML = '';
    if (!sel.length || (this.g && this.g.type !== 'pan')) { ctx.hidden = true; return; }
    const kinds = new Set(sel.map(i => i.kind));
    const one = sel.length === 1 ? sel[0] : null;
    const btn = (html, title, fn, on) => {
      const b = el('button', { type: 'button', title, html, class: on ? 'on' : null });
      b.addEventListener('click', e => { e.stopPropagation(); fn(b); });
      ctx.append(b);
      return b;
    };
    const sep = () => ctx.append(el('span', { class: 'sep' }));
    const apply = (fn, key) => { sel.forEach(fn); this.renderAll(); this.commit(key); };
    const kind = kinds.size === 1 ? [...kinds][0] : null;
    const palette = kind === 'sticky' ? STICKY_COLORS : kind === 'shape' ? Object.fromEntries(Object.entries(SHAPE_COLORS).map(([k, v]) => [k, v[0]])) : kind === 'line' ? LINE_COLORS : kind === 'text' ? Object.fromEntries(Object.entries(INK_COLORS).map(([k, v]) => [k, v || 'var(--text)'])) : kind === 'frame' ? Object.fromEntries(Object.entries(FRAME_COLORS).map(([k, v]) => [k, v || 'var(--frame-bg)'])) : null;
    if (palette) {
      const cur = one ? one.color : null;
      btn('<span class="dot" style="background:' + (palette[cur] || Object.values(palette)[0]) + '"></span>', 'Цвет', b => {
        const box = el('div', { class: 'swatches' }, Object.entries(palette).map(([k, v]) => el('button', {
          type: 'button', class: 'swatch', title: k, style: { background: v }, onclick: () => { closeMenu(); apply(i => { i.color = k; }); }
        })));
        openMenu(b, [], { custom: () => box });
      });
    }
    if (kind === 'shape') {
      btn('◇', 'Форма', b => openMenu(b, [['rect', 'Прямоугольник', '▭'], ['round', 'Скруглённый', '▢'], ['ellipse', 'Эллипс', '◯'], ['diamond', 'Ромб', '◇']].map(([v, l, ic]) => ({ label: l, icon: ic, checked: one && one.shape === v, onClick: () => apply(i => { i.shape = v; }) }))));
    }
    if (kind === 'sticky' || kind === 'shape' || kind === 'text') {
      const fsv = one ? one.fs : undefined;
      const lbl = (FONT_SIZES.find(f => f.v === (fsv == null ? null : fsv)) || { l: fsv ? String(fsv) : 'Авто' }).l;
      btn('<span style="font-size:12px">Aa ' + lbl + '</span>', 'Размер текста', b => openMenu(b, FONT_SIZES.filter(f => kind !== 'text' || f.v).map(f => ({ label: f.l === 'Авто' ? 'Авто (по размеру)' : f.l + ' — ' + f.v + ' px', checked: one && (one.fs || null) === f.v, onClick: () => apply(i => { if (f.v) i.fs = f.v; else delete i.fs; this.fitCache.delete(i.id); }) }))));
      if (kind !== 'text') btn(one && one.align === 'left' ? '⇤' : '≡', 'Выравнивание текста', () => apply(i => { if (i.align === 'left') delete i.align; else i.align = 'left'; }), one && one.align === 'left');
    }
    if (kind === 'line') {
      btn('<span style="font-size:13px">' + (one && one.dash ? '┄' : '—') + '</span>', 'Пунктир', () => apply(i => { i.dash = !i.dash; }), one && one.dash);
      btn(one ? ({ end: '→', both: '↔', none: '—' }[one.arrow]) : '→', 'Стрелки', b => openMenu(b, [['end', 'Стрелка в конце', '→'], ['both', 'С двух сторон', '↔'], ['none', 'Без стрелок', '—']].map(([v, l, ic]) => ({ label: l, icon: ic, checked: one && one.arrow === v, onClick: () => apply(i => { i.arrow = v; }) }))));
      if (one) btn('<span style="font-size:12px">Подпись</span>', 'Подпись (двойной клик по стрелке)', () => this.startEdit('label:' + one.id));
      if (one && one.from.id && one.to.id) btn('⇄', 'Развернуть', () => apply(i => { const t = i.from; i.from = i.to; i.to = t; }));
    }
    if (kind === 'frame' && one) btn('<span style="font-size:12px">Название</span>', 'Переименовать фрейм', () => this.startEdit('title:' + one.id));
    if (one && (one.kind === 'sticky' || one.kind === 'shape' || one.kind === 'text')) btn('<span style="font-size:12px">Текст</span>', 'Редактировать текст (Enter)', () => this.startEdit(one.id));
    if (ctx.children.length) sep();
    if (!kinds.has('line') || kinds.size > 1) {
      btn(ICONS.front, 'На передний план (])', () => this.zorder(1));
      btn(ICONS.back, 'На задний план ([)', () => this.zorder(-1));
    }
    btn(ICONS.copy, 'Дублировать (' + MOD + '+D)', () => this.duplicate());
    btn(ICONS.trash, 'Удалить (Del)', () => this.deleteSel());
    ctx.hidden = false;
    this.positionCtx();
  }
  positionCtx() {
    const ctx = this.ctx;
    if (ctx.hidden || !this.view) return;
    const sel = this.selItems();
    const bb = this.bounds(sel);
    if (!bb) { ctx.hidden = true; return; }
    const r = this.board.getBoundingClientRect();
    const p = this.toScreen(bb.x, bb.y), z = this.view.z;
    const w = ctx.offsetWidth, hgt = ctx.offsetHeight;
    let x = p.x + (bb.w * z) / 2 - w / 2;
    let y = p.y - hgt - 18;
    if (y < 8) y = p.y + bb.h * z + 18;
    if (y + hgt > r.height - 8) y = Math.max(8, Math.min(r.height - hgt - 8, p.y - hgt - 18));
    ctx.style.left = clamp(x, 8, Math.max(8, r.width - w - 8)) + 'px';
    ctx.style.top = clamp(y, 8, Math.max(8, r.height - hgt - 8)) + 'px';
  }

  setSel(ids) {
    this.sel = new Set(ids);
    this.els.forEach((n, id) => n.classList.toggle('sel', this.sel.has(id)));
    this.renderLines();
    this.renderOverlay();
    this.renderCtx();
  }
  commit(key) { changed(this.page, key || null); }
  captureSel() { return { ids: Array.from(this.sel) }; }
  restoreSel(s) { if (s && s.ids) this.setSel(s.ids.filter(id => this.item(id))); }
  reload(p, sel) {
    if (this.editing) { this.editing = null; }
    this.page = p;
    this.fitCache.clear();
    this.sel = new Set(Array.from(this.sel).filter(id => this.item(id)));
    this.renderAll();
    if (sel) this.restoreSel(sel);
  }
  focusDefault() { this.board.focus({ preventScroll: true }); }

  // ── создание и изменение ──
  addItem(it, edit) {
    const n = normalizeItem(it);
    this.page.items.push(n);
    this.hint.style.opacity = '0';
    this.renderAll();
    this.setSel([n.id]);
    if (edit) this.startEdit(n.id, true);
    this.commit();
    return n;
  }
  defaultItem(kind, x, y) {
    if (kind === 'sticky') return { kind, x: x - 100, y: y - 100, w: 200, h: 200, color: this.lastSticky || 'yellow', html: '' };
    if (kind === 'shape') return { kind, x: x - 110, y: y - 70, w: 220, h: 140, color: 'blue', shape: 'round', html: '' };
    if (kind === 'text') return { kind, x: x - 4, y: y - 16, w: 260, h: 40, fs: 20, html: '' };
    if (kind === 'frame') return { kind, x: x - 400, y: y - 300, w: 800, h: 600, title: 'Фрейм ' + (this.page.items.filter(i => i.kind === 'frame').length + 1) };
    return null;
  }
  deleteSel() {
    if (!this.sel.size) return;
    const ids = new Set(this.sel);
    this.page.items = this.page.items.filter(i => !ids.has(i.id) && !(i.kind === 'line' && ((i.from.id && ids.has(i.from.id)) || (i.to.id && ids.has(i.to.id)))));
    this.sel.clear();
    this.renderAll();
    this.commit();
  }
  duplicate(offset) {
    const sel = this.selItems();
    if (!sel.length) return;
    const ids = new Set(sel.map(i => i.id));
    const map = {};
    const d = offset == null ? 24 : offset;
    const copies = [];
    sel.forEach(i => { if (i.kind !== 'line') { const c = clone(i); c.id = uid(); map[i.id] = c.id; c.x += d; c.y += d; copies.push(c); } });
    this.page.items.forEach(i => {
      if (i.kind !== 'line') return;
      const fromIn = i.from.id && map[i.from.id], toIn = i.to.id && map[i.to.id];
      if (ids.has(i.id) || (fromIn && toIn)) {
        const c = clone(i); c.id = uid();
        c.from = i.from.id ? (map[i.from.id] ? { id: map[i.from.id] } : { id: i.from.id }) : { x: i.from.x + d, y: i.from.y + d };
        c.to = i.to.id ? (map[i.to.id] ? { id: map[i.to.id] } : { id: i.to.id }) : { x: i.to.x + d, y: i.to.y + d };
        copies.push(c);
      }
    });
    this.page.items.push(...copies);
    this.renderAll();
    this.setSel(copies.map(c => c.id));
    this.commit();
  }
  zorder(dir) {
    const sel = this.sel;
    const a = this.page.items.filter(i => sel.has(i.id)), rest = this.page.items.filter(i => !sel.has(i.id));
    this.page.items = dir > 0 ? rest.concat(a) : a.concat(rest);
    this.renderAll();
    this.commit();
  }
  framedItems(frame) {
    const r = this.rectOf(frame);
    return this.page.items.filter(i => i !== frame && i.kind !== 'line' && (() => { const q = this.rectOf(i); return q.x >= r.x - 1 && q.y >= r.y - 1 && q.x + q.w <= r.x + r.w + 1 && q.y + q.h <= r.y + r.h + 1; })());
  }

  // ── редактирование текста ──
  editingNode() {
    const e = this.editing;
    if (!e) return null;
    if (e.startsWith('label:')) return this.labelsL.querySelector('.bi-label[data-line="' + CSS.escape(e.slice(6)) + '"]');
    if (e.startsWith('title:')) { const n = this.els.get(e.slice(6)); return n && n.querySelector('.bi-frame-title'); }
    const n = this.els.get(e);
    return n && n.querySelector('.bi-text');
  }
  startEdit(key, selectAll) {
    if (this.editing) this.finishEdit();
    const id = key.replace(/^(label|title):/, '');
    if (!this.item(id)) return;
    if (!this.sel.has(id) || this.sel.size !== 1) this.setSel([id]);
    this.editing = key;
    if (key.startsWith('label:')) this.renderLines();
    const node = this.editingNode();
    if (!node) { this.editing = null; return; }
    node.contentEditable = 'true';
    const host = node.closest('.bi') || node;
    host.classList.add('editing');
    node.focus({ preventScroll: true });
    if (selectAll) Caret.selectAll(node); else Caret.set(node, 'end');
    this.renderOverlay();
    this.ctx.hidden = true;
  }
  finishEdit() {
    const key = this.editing;
    if (!key) return;
    const node = this.editingNode();
    this.editing = null;
    if (node) {
      node.contentEditable = 'false';
      (node.closest('.bi') || node).classList.remove('editing');
    }
    const sel = window.getSelection();
    if (node && sel.rangeCount && node.contains(sel.anchorNode)) sel.removeAllRanges();
    SelTool.hide();
    const id = key.replace(/^(label|title):/, '');
    const it = this.item(id);
    if (it && it.kind === 'text' && !key.startsWith('label:') && !htmlToText(it.html).trim()) {
      this.page.items = this.page.items.filter(i => i !== it && !(i.kind === 'line' && (i.from.id === id || i.to.id === id)));
      this.sel.delete(id);
      this.commit();
    } else if (it && key.startsWith('title:') && !it.title.trim()) { it.title = 'Фрейм'; this.commit(); }
    History.breakCoalesce(this.page);
    if (this.board.isConnected && !inEditable()) this.board.focus({ preventScroll: true });
    this.renderAll();
  }
  onInput(e) {
    if (!this.editing) return;
    const node = this.editingNode();
    if (!node || !node.contains(e.target)) return;
    const id = this.editing.replace(/^(label|title):/, '');
    const it = this.item(id);
    if (!it) return;
    if (this.editing.startsWith('title:')) { it.title = node.textContent.replace(/\n/g, ' '); }
    else {
      if (!node.textContent && node.innerHTML && !node.querySelector('br + br')) node.innerHTML = '';
      it.html = normHtml(node.innerHTML);
      if (it.kind === 'sticky' || it.kind === 'shape') { this.fitCache.delete(it.id); this.fitText(this.els.get(it.id), it); }
      if (it.kind === 'text' && this.measureTexts()) this.renderLines();
    }
    this.renderOverlay();
    changed(this.page, 'edit:' + this.editing, { skipChrome: true });
  }

  // ── указатель ──
  hitAt(e) {
    const t = e.target;
    if (t.closest('.b-ui')) return { ui: true };
    const h = t.closest('[data-handle]');
    if (h) return { handle: h.dataset.handle };
    const en = t.closest('[data-end]');
    if (en) return { end: en.dataset.end };
    const an = t.closest('[data-anchor]');
    if (an) return { anchor: an.dataset.anchor };
    const lab = t.closest('.bi-label');
    if (lab) return { line: lab.dataset.line, label: true };
    const g = t.closest('g[data-id]');
    if (g) return { line: g.dataset.id };
    const ft = t.closest('.bi-frame-title');
    if (ft) return { item: ft.closest('.bi').dataset.id, frameTitle: true };
    const it = t.closest('.bi');
    if (it && it.dataset.kind !== 'frame') return { item: it.dataset.id };
    return { empty: true };
  }
  itemAtPoint(cx, cy, exclude) {
    const list = document.elementsFromPoint(cx, cy);
    for (const n of list) {
      const b = n.closest && n.closest('.bi');
      if (b && this.board.contains(b) && b.dataset.kind !== 'frame' && b.dataset.id !== exclude) return this.item(b.dataset.id);
    }
    return null;
  }

  onDown(e) {
    if (menuState) closeMenu();
    const hit = this.hitAt(e);
    if (hit.ui) return;
    if (this.editing) {
      const node = this.editingNode();
      if (node && node.contains(e.target)) return;
      const host = node && node.closest('.bi');
      if (host && host.contains(e.target) && !hit.handle && !hit.anchor) {
        // клик по стикеру мимо строки текста — продолжаем печатать
        e.preventDefault();
        node.focus({ preventScroll: true });
        Caret.set(node, 'end');
        return;
      }
      this.finishEdit();
    }
    if (e.target.closest('.bi-text, .bi-label, .bi-frame-title') && e.target.isContentEditable) return;
    e.preventDefault();
    if (document.activeElement !== this.board) this.board.focus({ preventScroll: true });
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { this.board.setPointerCapture(e.pointerId); } catch (er) { /* noop */ }
    if (this.pointers.size === 2) {
      this.endGesture(true);
      const [p1, p2] = [...this.pointers.values()];
      this.g = { type: 'pinch', d0: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1, m0: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, v0: { ...this.view } };
      return;
    }
    if (this.pointers.size > 2) return;
    const w = this.toWorld(e.clientX, e.clientY);
    const base = { sx: e.clientX, sy: e.clientY, w0: w, moved: false, pid: e.pointerId, shift: e.shiftKey, hit };
    if (e.button === 1 || (e.button === 0 && (this.space || this.tool === 'hand')) || (e.pointerType === 'touch' && hit.empty && this.tool === 'select')) {
      this.g = Object.assign(base, { type: 'pan', v0: { ...this.view } });
      this.board.classList.add('panning');
      return;
    }
    if (e.button !== 0) { this.pointers.delete(e.pointerId); return; }
    if (hit.handle) { this.startResize(base, hit.handle); return; }
    if (hit.end) {
      const ln = this.selItems()[0];
      this.g = Object.assign(base, { type: 'end', ln, which: hit.end, before: clone(ln) });
      return;
    }
    if (hit.anchor) { this.startConnect(base, this.item(hit.anchor)); return; }
    if (['sticky', 'shape', 'text', 'frame'].includes(this.tool)) { this.g = Object.assign(base, { type: 'create', kind: this.tool }); return; }
    if (this.tool === 'line') { this.startConnect(base, hit.item && !hit.frameTitle ? this.item(hit.item) : null); return; }
    // инструмент «выбор»
    const id = hit.item || hit.line;
    if (id) {
      if (e.shiftKey) {
        const s = new Set(this.sel);
        if (s.has(id)) s.delete(id); else s.add(id);
        this.setSel([...s]);
        this.g = Object.assign(base, { type: 'tap', id });
        return;
      }
      const wasSel = this.sel.has(id);
      if (!wasSel) this.setSel([id]);
      this.startMove(base, id, wasSel);
      return;
    }
    if (!e.shiftKey && this.sel.size) this.setSel([]);
    this.g = Object.assign(base, { type: 'marquee', prev: e.shiftKey ? new Set(this.sel) : new Set() });
  }

  startMove(base, id, wasSel) {
    const moving = new Map();
    const sel = this.selItems();
    const add = it => { if (!moving.has(it.id)) moving.set(it.id, { it, x: it.x, y: it.y }); };
    sel.forEach(it => {
      if (it.kind === 'line') return;
      add(it);
      if (it.kind === 'frame') this.framedItems(it).forEach(add);
    });
    const freeEnds = [];
    sel.forEach(it => {
      if (it.kind !== 'line') return;
      ['from', 'to'].forEach(wh => { if (!it[wh].id) freeEnds.push({ end: it[wh], x: it[wh].x, y: it[wh].y }); });
    });
    this.g = Object.assign(base, { type: 'move', id, wasSel, moving, freeEnds, lineOnly: !moving.size });
  }
  startResize(base, handle) {
    const boxes = this.selItems().filter(i => i.kind !== 'line');
    if (!boxes.length) return;
    const bb = boxes.length === 1 ? this.rectOf(boxes[0]) : this.bounds(boxes);
    this.g = Object.assign(base, { type: 'resize', handle, bb, items: boxes.map(it => ({ it, r: this.rectOf(it), fs: it.fs })) });
  }
  startConnect(base, from) {
    const a = from ? (() => { const r = this.rectOf(from); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; })() : base.w0;
    this.g = Object.assign(base, { type: 'connect', from, a, tmp: null, over: null });
  }

  onMove(e) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = this.g;
    if (!g) return;
    if (g.type === 'pinch') {
      const [p1, p2] = [...this.pointers.values()];
      if (!p2) return;
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const m = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const z = clamp(g.v0.z * d / g.d0, MIN_Z, MAX_Z);
      const r = this.board.getBoundingClientRect();
      const wx = (g.m0.x - r.left - g.v0.x) / g.v0.z, wy = (g.m0.y - r.top - g.v0.y) / g.v0.z;
      this.view = { x: m.x - r.left - wx * z, y: m.y - r.top - wy * z, z };
      this.applyView();
      return;
    }
    if (e.pointerId !== g.pid) return;
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
    if (!g.moved && Math.hypot(dx, dy) < 3) return;
    if (!g.moved) { g.moved = true; this.ctx.hidden = true; }
    const w = this.toWorld(e.clientX, e.clientY);
    const z = this.view.z;
    switch (g.type) {
      case 'pan':
        this.view = { x: g.v0.x + dx, y: g.v0.y + dy, z: g.v0.z };
        this.applyView();
        break;
      case 'move': {
        const mx = dx / z, my = dy / z;
        g.moving.forEach(m => { m.it.x = Math.round(m.x + mx); m.it.y = Math.round(m.y + my); const n = this.els.get(m.it.id); if (n) { n.style.left = m.it.x + 'px'; n.style.top = m.it.y + 'px'; } });
        g.freeEnds.forEach(f => { f.end.x = Math.round(f.x + mx); f.end.y = Math.round(f.y + my); });
        this.highlightDrop(g);
        this.renderLines();
        this.renderOverlay();
        break;
      }
      case 'resize': this.doResize(g, w, e.shiftKey); break;
      case 'end': {
        const over = this.itemAtPoint(e.clientX, e.clientY);
        const other = g.ln[g.which === 'from' ? 'to' : 'from'];
        const ok = over && !(other.id && other.id === over.id);
        g.ln[g.which] = ok ? { id: over.id } : { x: Math.round(w.x), y: Math.round(w.y) };
        this.markTarget(ok ? over.id : null);
        this.renderLines();
        this.renderOverlay();
        break;
      }
      case 'connect': {
        const over = this.itemAtPoint(e.clientX, e.clientY, g.from && g.from.id);
        g.over = over;
        this.markTarget(over ? over.id : null);
        let b = w;
        if (over) { const r = this.rectOf(over); b = { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
        let a = g.a;
        if (g.from) a = this.endPoint({ from: { id: g.from.id }, to: { x: b.x, y: b.y } }, 'from') || a;
        g.tmp = { a, b };
        this.renderLines();
        break;
      }
      case 'create': {
        const x1 = Math.min(g.w0.x, w.x), y1 = Math.min(g.w0.y, w.y);
        g.box = { x: x1, y: y1, w: Math.abs(w.x - g.w0.x), h: Math.abs(w.y - g.w0.y) };
        const s = this.toScreen(x1, y1);
        this.overlay.innerHTML = '';
        this.overlay.append(el('div', { class: 'b-marquee', style: { left: s.x + 'px', top: s.y + 'px', width: g.box.w * z + 'px', height: g.box.h * z + 'px' } }));
        break;
      }
      case 'marquee': {
        const r = this.board.getBoundingClientRect();
        g.box = { x: Math.min(g.sx, e.clientX) - r.left, y: Math.min(g.sy, e.clientY) - r.top, w: Math.abs(dx), h: Math.abs(dy) };
        const a = this.toWorld(Math.min(g.sx, e.clientX), Math.min(g.sy, e.clientY));
        const b = this.toWorld(Math.max(g.sx, e.clientX), Math.max(g.sy, e.clientY));
        const ids = new Set(g.prev);
        this.page.items.forEach(it => {
          if (it.kind === 'line') {
            const p1 = this.endPoint(it, 'from'), p2 = this.endPoint(it, 'to');
            if (p1 && p2 && [p1, p2].every(p => p.x >= a.x && p.x <= b.x && p.y >= a.y && p.y <= b.y)) ids.add(it.id);
            return;
          }
          const q = this.rectOf(it);
          const inside = q.x >= a.x && q.y >= a.y && q.x + q.w <= b.x && q.y + q.h <= b.y;
          const inter = q.x < b.x && q.x + q.w > a.x && q.y < b.y && q.y + q.h > a.y;
          if (it.kind === 'frame' ? inside : inter) ids.add(it.id);
        });
        this.sel = ids;
        this.els.forEach((n, id) => n.classList.toggle('sel', ids.has(id)));
        this.renderLines();
        this.renderOverlay();
        break;
      }
    }
  }
  markTarget(id) { this.els.forEach((n, k) => n.classList.toggle('drop-target', k === id)); }
  highlightDrop(g) {
    // подсветка фрейма, в который попадёт элемент (визуальная подсказка)
    if (!g.moving.size || [...g.moving.values()].some(m => m.it.kind === 'frame')) return;
    const first = [...g.moving.values()][0].it;
    const r = this.rectOf(first), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const fr = this.page.items.filter(i => i.kind === 'frame' && !g.moving.has(i.id)).reverse().find(f => cx > f.x && cx < f.x + f.w && cy > f.y && cy < f.y + f.h);
    this.els.forEach((n, k) => { if (n.dataset.kind === 'frame') n.classList.toggle('drop-target', !!fr && k === fr.id); });
  }
  doResize(g, w, keepRatio) {
    const bb = g.bb, hd = g.handle;
    let x1 = bb.x, y1 = bb.y, x2 = bb.x + bb.w, y2 = bb.y + bb.h;
    if (hd.includes('w')) x1 = Math.min(w.x, x2 - 20);
    if (hd.includes('e')) x2 = Math.max(w.x, x1 + 20);
    if (hd.includes('n')) y1 = Math.min(w.y, y2 - 20);
    if (hd.includes('s')) y2 = Math.max(w.y, y1 + 20);
    let sx = (x2 - x1) / bb.w, sy = (y2 - y1) / bb.h;
    if (keepRatio && hd.length === 2) {
      const s = Math.max(sx, sy);
      sx = sy = s;
      if (hd.includes('w')) x1 = x2 - bb.w * s; else x2 = x1 + bb.w * s;
      if (hd.includes('n')) y1 = y2 - bb.h * s; else y2 = y1 + bb.h * s;
    }
    if (hd === 'w' || hd === 'e') { sy = 1; y1 = bb.y; }
    g.items.forEach(({ it, r }) => {
      it.x = Math.round(x1 + (r.x - bb.x) * sx);
      it.y = Math.round(y1 + (r.y - bb.y) * sy);
      it.w = Math.max(20, Math.round(r.w * sx));
      if (it.kind !== 'text') it.h = Math.max(20, Math.round(r.h * sy));
    });
    this.renderItems();
    this.renderLines();
    this.renderOverlay();
  }

  onUp(e, cancel) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    try { this.board.releasePointerCapture(e.pointerId); } catch (er) { /* noop */ }
    const g = this.g;
    if (!g) return;
    if (g.type === 'pinch') { if (this.pointers.size === 0) { this.g = null; this.renderCtx(); } return; }
    if (e.pointerId !== g.pid) return;
    this.g = null;
    this.board.classList.remove('panning');
    this.markTarget(null);
    const w = this.toWorld(e.clientX, e.clientY);
    if (cancel) { this.renderAll(); return; }
    switch (g.type) {
      case 'pan':
        // на тач-экране пустой холст двигается пальцем; короткий тап снимает выделение, двойной — создаёт стикер
        if (!g.moved && g.hit.empty) { if (this.sel.size) this.setSel([]); this.tap(e, g); }
        break;
      case 'move':
        if (g.moved) { this.commit(); break; }
        if (g.wasSel && this.sel.size > 1) this.setSel([g.id]);
        this.tap(e, g);
        break;
      case 'tap': this.tap(e, g); break;
      case 'resize': if (g.moved) this.commit(); break;
      case 'end': if (g.moved && !deepEq(g.before, g.ln)) this.commit(); break;
      case 'connect': {
        const over = g.over;
        if (g.moved && (over || Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 24)) {
          const ln = { kind: 'line', from: g.from ? { id: g.from.id } : { x: Math.round(g.a.x), y: Math.round(g.a.y) }, to: over ? { id: over.id } : { x: Math.round(w.x), y: Math.round(w.y) }, color: this.lastLine || 'gray', arrow: 'end' };
          this.setTool('select');
          this.addItem(ln);
        } else if (!g.moved && g.from && this.tool === 'select') this.setSel([g.from.id]);
        this.renderLines();
        break;
      }
      case 'create': {
        let it;
        if (g.moved && g.box && g.box.w * this.view.z > 12 && g.box.h * this.view.z > 12) {
          it = this.defaultItem(g.kind, 0, 0);
          Object.assign(it, { x: Math.round(g.box.x), y: Math.round(g.box.y), w: Math.max(40, Math.round(g.box.w)), h: Math.max(30, Math.round(g.box.h)) });
        } else it = this.defaultItem(g.kind, w.x, w.y);
        this.setTool('select');
        this.addItem(it, g.kind !== 'frame');
        break;
      }
      case 'marquee':
        if (!g.moved) this.tap(e, g);
        this.renderOverlay();
        break;
    }
    if (!this.editing) this.renderCtx();
    this.renderOverlay();
  }

  // одиночный и двойной тап (одинаково для мыши и пальца)
  tap(e, g) {
    const now = Date.now();
    const key = g.hit.empty ? 'empty' : (g.hit.label ? 'label:' + g.hit.line : g.hit.frameTitle ? 'title:' + g.hit.item : (g.hit.item || g.hit.line || ''));
    const lt = this.lastTap;
    this.lastTap = { t: now, key, x: e.clientX, y: e.clientY };
    if (!lt || now - lt.t > 450 || lt.key !== key || Math.hypot(lt.x - e.clientX, lt.y - e.clientY) > 12) return;
    this.lastTap = null;
    if (key === 'empty') {
      const w = this.toWorld(e.clientX, e.clientY);
      this.addItem(this.defaultItem('sticky', w.x, w.y), true);
      return;
    }
    if (key.startsWith('title:') || key.startsWith('label:')) { this.startEdit(key); return; }
    const it = this.item(key);
    if (!it) return;
    if (it.kind === 'line') this.startEdit('label:' + it.id);
    else if (it.kind === 'frame') this.startEdit('title:' + it.id);
    else this.startEdit(it.id);
  }
  endGesture() {
    const g = this.g;
    if (!g) return;
    this.g = null;
    this.board.classList.remove('panning');
    if (g.moved && ['move', 'resize', 'end'].includes(g.type)) this.commit();
    this.renderAll();
  }

  onWheel(e) {
    if (e.target.closest('.b-ui') || e.target.closest('.pop')) return;
    if (this.editing) { const n = this.editingNode(); if (n && n.contains(e.target) && n.scrollHeight > n.clientHeight) return; }
    e.preventDefault();
    let dx = e.deltaX, dy = e.deltaY;
    if (e.deltaMode === 1) { dx *= 16; dy *= 16; } else if (e.deltaMode === 2) { dx *= 400; dy *= 400; }
    if (e.ctrlKey || e.metaKey) {
      this.zoomAt(this.view.z * Math.exp(-clamp(dy, -60, 60) * 0.01), e.clientX, e.clientY);
    } else {
      if (e.shiftKey && !dx) { dx = dy; dy = 0; }
      this.view = { x: this.view.x - dx, y: this.view.y - dy, z: this.view.z };
      this.applyView();
    }
  }

  onContext(e) {
    if (e.target.closest('.b-ui') || (this.editing && this.editingNode() && this.editingNode().contains(e.target))) return;
    e.preventDefault();
    const hit = this.hitAt(e);
    const id = hit.item || hit.line;
    if (id && !this.sel.has(id)) this.setSel([id]);
    const w = this.toWorld(e.clientX, e.clientY);
    const at = { left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY };
    if (id) {
      openMenu(at, [
        { label: 'Редактировать текст', icon: '✎', hint: 'Enter', onClick: () => { const it = this.item(id); this.startEdit(it.kind === 'line' ? 'label:' + id : it.kind === 'frame' ? 'title:' + id : id); } },
        { label: 'Дублировать', icon: '⧉', hint: MOD + '+D', onClick: () => this.duplicate() },
        { label: 'Копировать', icon: '⎘', hint: MOD + '+C', onClick: () => { this.copySel(); toast('Скопировано — вставьте через ' + MOD + '+V'); } },
        { label: 'На передний план', icon: '⬆', hint: ']', onClick: () => this.zorder(1) },
        { label: 'На задний план', icon: '⬇', hint: '[', onClick: () => this.zorder(-1) },
        'sep',
        { label: 'Удалить', icon: '🗑', hint: 'Del', danger: true, onClick: () => this.deleteSel() }
      ]);
    } else {
      openMenu(at, [
        { label: 'Стикер здесь', icon: '▢', onClick: () => this.addItem(this.defaultItem('sticky', w.x, w.y), true) },
        { label: 'Текст здесь', icon: 'T', onClick: () => this.addItem(this.defaultItem('text', w.x, w.y), true) },
        { label: 'Фигура здесь', icon: '◯', onClick: () => this.addItem(this.defaultItem('shape', w.x, w.y), true) },
        { label: 'Фрейм здесь', icon: '#', onClick: () => this.addItem(this.defaultItem('frame', w.x, w.y)) },
        'sep',
        boardClip ? { label: 'Вставить', icon: '📋', hint: MOD + '+V', onClick: () => this.pasteItems(boardClip, w) } : null,
        { label: 'Выделить всё', icon: '⬚', hint: MOD + '+A', onClick: () => this.setSel(this.page.items.map(i => i.id)) },
        { label: 'Показать всё', icon: '⤢', hint: 'Shift+1', onClick: () => this.fit() }
      ].filter(Boolean));
    }
  }

  // ── клавиатура ──
  onKey(e) {
    if (e.isComposing || e.keyCode === 229) return;
    if (this.editing) {
      const node = this.editingNode();
      if (!node || !node.contains(e.target)) return;
      if (richKeys(e)) return;
      if (e.key === 'Escape' || (e.key === 'Enter' && (modKey(e) || this.editing.startsWith('title:') || (this.editing.startsWith('label:') && !e.shiftKey)))) { e.preventDefault(); this.finishEdit(); }
      else if (e.key === 'Tab') e.preventDefault();
      return;
    }
    if (e.target !== this.board) return;
    const mod = modKey(e);
    if (e.code === 'Space' && !mod) { e.preventDefault(); if (!this.space) { this.space = true; this.board.classList.add('panning'); } return; }
    if (mod) {
      if (e.code === 'KeyA') { e.preventDefault(); this.setSel(this.page.items.map(i => i.id)); }
      else if (e.code === 'KeyD') { e.preventDefault(); this.duplicate(); }
      else if (e.code === 'Digit0' || e.code === 'Numpad0') { e.preventDefault(); this.zoomTo(1); }
      else if (e.key === '=' || e.key === '+' || e.code === 'Equal') { e.preventDefault(); this.zoomBy(1.25); }
      else if (e.key === '-' || e.code === 'Minus') { e.preventDefault(); this.zoomBy(1 / 1.25); }
      return;
    }
    if (e.altKey) return;
    const sel = this.selItems();
    switch (e.key) {
      case 'Delete': case 'Backspace': e.preventDefault(); this.deleteSel(); return;
      case 'Escape': e.preventDefault(); if (this.tool !== 'select') this.setTool('select'); else this.setSel([]); return;
      case 'Enter': {
        e.preventDefault();
        if (sel.length === 1) { const it = sel[0]; this.startEdit(it.kind === 'line' ? 'label:' + it.id : it.kind === 'frame' ? 'title:' + it.id : it.id); }
        return;
      }
      case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight': {
        if (!sel.length) return;
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
        const moved = new Set();
        sel.forEach(it => {
          if (it.kind === 'line') { ['from', 'to'].forEach(wh => { if (!it[wh].id) { it[wh].x += dx; it[wh].y += dy; } }); return; }
          const group = [it].concat(it.kind === 'frame' ? this.framedItems(it) : []);
          group.forEach(g => { if (!moved.has(g.id)) { moved.add(g.id); g.x += dx; g.y += dy; } });
        });
        this.renderAll();
        this.commit('nudge');
        return;
      }
      case ']': e.preventDefault(); this.zorder(1); return;
      case '[': e.preventDefault(); this.zorder(-1); return;
      case '!': if (e.shiftKey) { e.preventDefault(); this.fit(); } return;
    }
    if (e.shiftKey && e.code === 'Digit1') { e.preventDefault(); this.fit(); return; }
    if (e.shiftKey) return;
    const tool = { KeyV: 'select', KeyH: 'hand', KeyN: 'sticky', KeyS: 'shape', KeyT: 'text', KeyF: 'frame', KeyL: 'line' }[e.code];
    if (tool) { e.preventDefault(); this.setTool(tool); return; }
    if (e.key === '+' || e.key === '=') { this.zoomBy(1.25); return; }
    if (e.key === '-') { this.zoomBy(1 / 1.25); return; }
    // начать печатать в выделенном стикере
    if (sel.length === 1 && e.key.length === 1 && sel[0].kind !== 'line' && sel[0].kind !== 'frame') {
      this.startEdit(sel[0].id);
    }
  }

  // ── буфер обмена ──
  copySel() {
    const sel = this.selItems();
    if (!sel.length) return null;
    const ids = new Set(sel.map(i => i.id));
    const items = this.page.items.filter(i => ids.has(i.id) || (i.kind === 'line' && i.from.id && i.to.id && ids.has(i.from.id) && ids.has(i.to.id))).map(clone);
    const text = items.filter(i => i.kind !== 'line').map(i => i.kind === 'frame' ? i.title : htmlToText(i.html)).filter(Boolean).join('\n\n');
    boardClip = { items, text, n: 0 };
    return boardClip;
  }
  onCopy(e, cut) {
    if (this.editing || !this.sel.size) return false;
    const c = this.copySel();
    e.clipboardData.setData('text/plain', c.text || ' ');
    e.preventDefault();
    if (cut) this.deleteSel();
    return true;
  }
  onPaste(e) {
    if (this.editing) return false;
    const text = e.clipboardData.getData('text/plain');
    e.preventDefault();
    if (boardClip && (text === (boardClip.text || ' ') || !text)) { this.pasteItems(boardClip); return true; }
    if (text && text.trim()) {
      const r = this.board.getBoundingClientRect();
      const c = this.toWorld(r.left + r.width / 2, r.top + r.height / 2);
      const parts = text.trim().split(/\n\s*\n/).slice(0, 30);
      const created = [];
      parts.forEach((p, i) => {
        const it = normalizeItem(Object.assign(this.defaultItem('sticky', c.x + (i % 5) * 220 - (Math.min(parts.length, 5) - 1) * 110, c.y + Math.floor(i / 5) * 220), { html: textToHtml(p.trim()) }));
        this.page.items.push(it);
        created.push(it.id);
      });
      this.renderAll();
      this.setSel(created);
      this.commit();
      return true;
    }
    if (e.clipboardData.files && e.clipboardData.files.length) toast('Картинки пока не поддерживаются на доске');
    return true;
  }
  pasteItems(clip, at) {
    clip.n++;
    const map = {};
    const items = clip.items.map(clone);
    const boxes = items.filter(i => i.kind !== 'line');
    let dx = 24 * clip.n, dy = 24 * clip.n;
    if (at || boxes.length) {
      const bb = this.bounds(boxes.length ? boxes : items) || { x: 0, y: 0, w: 0, h: 0 };
      const r = this.board.getBoundingClientRect();
      const vis = { a: this.toWorld(r.left, r.top), b: this.toWorld(r.right, r.bottom) };
      const onScreen = bb.x + dx < vis.b.x && bb.x + bb.w + dx > vis.a.x && bb.y + dy < vis.b.y && bb.y + bb.h + dy > vis.a.y;
      if (at || !onScreen) {
        const c = at || this.toWorld(r.left + r.width / 2, r.top + r.height / 2);
        dx = Math.round(c.x - bb.x - bb.w / 2); dy = Math.round(c.y - bb.y - bb.h / 2);
      }
    }
    items.forEach(i => { if (i.kind !== 'line') { const n = uid(); map[i.id] = n; i.id = n; i.x += dx; i.y += dy; } });
    items.forEach(i => {
      if (i.kind !== 'line') return;
      i.id = uid();
      ['from', 'to'].forEach(wh => { if (i[wh].id) i[wh] = map[i[wh].id] ? { id: map[i[wh].id] } : (this.item(i[wh].id) ? { id: i[wh].id } : { x: 0, y: 0 }); else { i[wh].x += dx; i[wh].y += dy; } });
    });
    const norm = items.map(normalizeItem).filter(Boolean);
    this.page.items.push(...norm);
    this.renderAll();
    this.setSel(norm.map(i => i.id));
    this.commit();
  }
}

// ════════════════════════════════════════════════════════════
//  Синхронизация с сервером (общий план команды)
// ════════════════════════════════════════════════════════════
function mergePages(base, local, server) {
  const js = p => JSON.stringify(p);
  const B = new Map((base || []).map(p => [p.id, js(p)]));
  const L = new Map(local.map(p => [p.id, p]));
  const S = new Set(server.map(p => p.id));
  const out = [], conflicts = [];
  server.forEach(sp => {
    const lp = L.get(sp.id), b = B.get(sp.id);
    if (!lp) { if (b != null && b === js(sp)) return; out.push(sp); return; }
    const lj = js(lp), sj = js(sp);
    if (lj === sj) { out.push(lp); return; }
    if (b === lj) { out.push(sp); return; }
    if (b === sj) { out.push(lp); return; }
    // правили и тут, и там — ничего не теряем: своя версия остаётся, чужая рядом копией
    out.push(lp);
    const copy = clonePageFresh(sp);
    copy.title = (sp.title || 'Без названия') + ' (другая версия)';
    out.push(copy);
    conflicts.push(copy.title);
  });
  local.forEach((lp, i) => {
    if (S.has(lp.id)) return;
    const b = B.get(lp.id);
    if (b != null && b === js(lp)) return;
    let k = -1;
    for (let j = i - 1; j >= 0; j--) { const idx = out.findIndex(p => p.id === local[j].id); if (idx >= 0) { k = idx; break; } }
    out.splice(k + 1, 0, lp);
  });
  return { pages: out, conflicts };
}

const Sync = {
  avail: /^https?:$/.test(location.protocol),
  enabled: false, token: null, rev: 0, base: null,
  pushing: false, again: false, timer: 0, pollT: 0, dirtyAt: 0, errs: 0, status: 'local',
  init() {
    const s = store.get(LS.sync, null);
    if (this.avail && s && s.token) {
      this.token = s.token; this.rev = s.rev || 0; this.base = s.base || null; this.enabled = true;
      this.pull();
      this.startPoll();
    } else if (this.avail && !(s && s.off)) {
      // общий план подключается сам, если человек не отключал его вручную
      this.connect();
    }
    this.paint();
    document.addEventListener('visibilitychange', () => {
      if (!this.enabled) return;
      if (document.visibilityState === 'hidden') { if (this.isDirty()) this.push(); }
      else this.pull();
    });
  },
  persist() { if (!store.set(LS.sync, { token: this.token, rev: this.rev, base: this.base })) store.set(LS.sync, { token: this.token, rev: this.rev, base: null }); },
  isDirty() { return JSON.stringify(state.pages) !== this.base; },
  async api(method, body) {
    const r = await fetch('/api/plan', { method, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: this.token || '' }, body: body ? JSON.stringify(body) : undefined });
    let j = null;
    try { j = await r.json(); } catch (e) { /* noop */ }
    return { status: r.status, j: j || {} };
  },
  paint(s) {
    if (s) this.status = s;
    const dot = $('#sync-dot'), txt = $('#sync-text');
    if (!dot) return;
    dot.className = 'sync-dot';
    if (!this.enabled) {
      txt.textContent = this.avail ? 'Подключить общий план' : 'Сохраняется в этом браузере';
      $('#sync-btn').title = 'Сейчас план хранится только в этом браузере. Подключите общий план, чтобы он был одинаковым у всей команды.';
      return;
    }
    $('#sync-btn').title = 'План сохраняется на сервере и общий для команды';
    const map = { ok: ['ok', 'Общий план · всё сохранено'], dirty: ['busy', 'Общий план · есть правки'], busy: ['busy', 'Общий план · сохраняю…'], err: ['err', 'Нет связи · правки в браузере'], local: ['busy', 'Общий план · загружаю…'] };
    const [c, t] = map[this.status] || map.ok;
    dot.classList.add(c);
    txt.textContent = t;
  },
  startPoll() {
    clearInterval(this.pollT);
    this.pollT = setInterval(() => { if (document.visibilityState === 'visible' && !this.pushing && !this.isDirty()) this.pull(); }, 20000);
  },
  onLocalChange() {
    state.touched = true;
    if (!this.enabled) return;
    if (!this.dirtyAt) this.dirtyAt = Date.now();
    clearTimeout(this.timer);
    // бережём лимит записей KV: пишем после 5 с тишины, но не реже раза в 30 с
    const wait = Math.max(300, Math.min(5000, 30000 - (Date.now() - this.dirtyAt)));
    this.timer = setTimeout(() => this.push(), wait);
    if (!this.pushing && this.status !== 'err') this.paint('dirty');
  },
  async push() {
    if (!this.enabled) return;
    if (this.pushing) { this.again = true; return; }
    clearTimeout(this.timer);
    const json = JSON.stringify(state.pages);
    if (json === this.base) { this.dirtyAt = 0; this.paint('ok'); return; }
    this.pushing = true;
    this.paint('busy');
    try {
      const { status, j } = await this.api('PUT', { doc: { pages: JSON.parse(json) }, baseRev: this.rev });
      if (status === 200 && j.ok) {
        this.rev = j.rev; this.base = json; this.persist(); this.errs = 0;
        if (JSON.stringify(state.pages) === json) { this.dirtyAt = 0; this.paint('ok'); } else this.again = true;
      } else if (status === 409) {
        this.applyRemote(j.doc, j.rev);
        this.again = this.isDirty();
      } else if (status === 401) { this.authLost(); }
      else if (status === 413) { toast('План слишком большой для сервера — удалите лишние страницы'); this.paint('err'); }
      else throw new Error('HTTP ' + status);
    } catch (e) {
      this.errs++;
      this.paint('err');
      this.timer = setTimeout(() => this.push(), Math.min(60000, 4000 * this.errs));
    } finally {
      this.pushing = false;
      if (this.again && this.enabled) { this.again = false; this.timer = setTimeout(() => this.push(), 400); }
    }
  },
  async pull() {
    if (!this.enabled || this.pushing) return;
    try {
      const { status, j } = await this.api('GET');
      if (status === 401) { this.authLost(); return; }
      if (status !== 200) throw new Error('HTTP ' + status);
      this.errs = 0;
      if ((j.rev || 0) !== this.rev) {
        // не перерисовываем страницу под пальцами: подождём, пока человек отпустит текст
        const ap = activePage();
        const busy = inEditable() && $('#view').contains(document.activeElement) && Date.now() - lastEditAt < 4000;
        if (busy && !this.isDirty()) {
          const sp = j.doc && Array.isArray(j.doc.pages) && j.doc.pages.find(p => p.id === ap.id);
          if (sp && JSON.stringify(normalizePage(sp)) !== JSON.stringify(ap)) return;
        }
        this.applyRemote(j.doc, j.rev);
      }
      if (this.isDirty()) this.onLocalChange(); else { this.dirtyAt = 0; this.paint('ok'); }
    } catch (e) { this.paint('err'); }
  },
  applyRemote(doc, rev) {
    const server = doc && Array.isArray(doc.pages) ? doc.pages.map(normalizePage).filter(Boolean) : [];
    const base = this.base ? JSON.parse(this.base) : null;
    const m = mergePages(base, state.pages, server);
    this.rev = rev || 0;
    this.base = JSON.stringify(server);
    this.persist();
    replacePages(m.pages);
    if (m.conflicts.length) toast('Страницу правили одновременно. Ваша версия на месте, вторая сохранена копией: «' + m.conflicts[0] + '»', { timeout: 8000 });
  },
  async connect() {
    if (!this.avail) {
      ui.info('Общий план', el('p', { text: 'Синхронизация работает, когда страница открыта на сайте (например, /plan на воркере). Сейчас всё сохраняется в этом браузере — можно скачать резервную копию в меню «⋯».' }));
      return;
    }
    // пароль не нужен: общий план открыт всем, у кого есть ссылка
    this.token = 'open';
    let res;
    try { res = await this.api('GET'); } catch (e) { toast('Нет связи с сервером'); return; }
    if (res.status !== 200) { toast(res.status === 404 ? 'На сервере нет хранилища плана — обновите воркер' : 'Сервер ответил ошибкой ' + res.status); this.token = null; return; }
    const j = res.j;
    const serverPages = j.doc && Array.isArray(j.doc.pages) ? j.doc.pages : [];
    this.enabled = true;
    this.rev = j.rev || 0;
    if (!serverPages.length) {
      this.base = null;
      this.persist();
      await this.push();
      toast('Готово: план сохранён на сервере');
    } else if (!state.touched) {
      this.base = null;
      this.applyRemoteReplace(j.doc, j.rev);
      toast('Загружен общий план команды');
    } else {
      const v = await ui.choice({
        title: 'На сервере уже есть план',
        text: 'В этом браузере тоже есть правки. Объединить — ничего не потеряется: совпадающие страницы сольются, разные сохранятся копиями.',
        buttons: [{ label: 'Взять серверный', value: 'server' }, { label: 'Объединить', value: 'merge', primary: true }]
      });
      if (!v) { this.enabled = false; this.token = null; this.paint(); return; }
      this.base = null;
      if (v === 'server') this.applyRemoteReplace(j.doc, j.rev); else { this.applyRemote(j.doc, j.rev); if (this.isDirty()) await this.push(); }
      toast('Общий план подключён');
    }
    this.persist();
    this.startPoll();
    this.paint(this.isDirty() ? 'dirty' : 'ok');
  },
  applyRemoteReplace(doc, rev) {
    const server = doc.pages.map(normalizePage).filter(Boolean);
    this.rev = rev || 0;
    this.base = JSON.stringify(server);
    this.persist();
    replacePages(server);
  },
  disconnect() {
    this.enabled = false; this.token = null; this.base = null; this.rev = 0;
    clearInterval(this.pollT); clearTimeout(this.timer);
    store.set(LS.sync, { off: true });
    this.paint();
    toast('Отключено. План остаётся в этом браузере.');
  },
  authLost() {
    this.disconnect();
    toast('Пароль не подошёл — подключите общий план заново', { timeout: 6000 });
  }
};

// Замена всех страниц (после синхронизации/импорта) без потери текущего экрана
function replacePages(pages) {
  const before = new Map(state.pages.map(p => [p.id, JSON.stringify(p)]));
  state.pages = pages.length ? pages : [newDocPage('Без названия')];
  state.pages.forEach(p => { if (before.get(p.id) !== JSON.stringify(p)) History.reset(p); });
  saveLocal();
  if (!page(state.activeId)) { openPage(state.pages[0].id); return; }
  const ap = activePage();
  if (editor && editor.page !== ap) {
    if (editor.page.type === ap.type) { const s = editor.captureSel(); editor.reload(ap, s); } else openPage(ap.id);
  }
  renderChrome();
  updateUndoButtons();
}

// ════════════════════════════════════════════════════════════
//  Финмодель: тарифы × периоды, итоги, расходы, воронки с обратным расчётом
// ════════════════════════════════════════════════════════════
const FIN_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const FIN_SALE = '_sale';
const finNum = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[\s ₽%]/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const finEmpty = v => v === '' || v == null;
const finFmt = (n, d) => (Number.isFinite(n) ? n : 0).toLocaleString('ru-RU', { maximumFractionDigits: d == null ? 0 : d });
const finRub = n => (Number.isFinite(n) ? finFmt(Math.round(n)) + ' ₽' : '—');
const finCnt = n => (Number.isFinite(n) ? finFmt(Math.ceil(n - 1e-9)) : '—');
const finPct = n => (Number.isFinite(n) ? finFmt(n, 1) + '%' : '—');

function finStages(list) { return list.map(([name, conv, cost]) => ({ id: uid(), name, conv: conv == null ? '' : conv, cost: cost == null ? '' : cost })); }
function finDefaultStages() {
  return finStages([['Просмотры рилсов', 1.5], ['Переходы на сайт', 30], ['Регистрации', 60], ['Зашли в бесплатный чат', 30], ['Пришли на встречу', 20]]);
}

function normalizeFm(fm) {
  fm = fm && typeof fm === 'object' ? fm : {};
  const id = x => (typeof x === 'string' && x ? x : uid());
  const str = (x, d) => (typeof x === 'string' ? x : d);
  const val = x => (finEmpty(x) ? '' : Number.isFinite(+x) ? +x : '');
  const periods = (Array.isArray(fm.periods) ? fm.periods : []).filter(p => p && typeof p === 'object').map(p => ({ id: id(p.id), name: str(p.name, '') }));
  const pids = new Set(periods.map(p => p.id));
  const byPeriod = o => { const r = {}; if (o && typeof o === 'object') for (const k in o) if (pids.has(k)) { const v = val(o[k]); if (v !== '') r[k] = v; } return r; };
  const tariffs = (Array.isArray(fm.tariffs) ? fm.tariffs : []).filter(t => t && typeof t === 'object').map(t => {
    const stages = (Array.isArray(t.stages) ? t.stages : []).filter(s => s && typeof s === 'object').map(s => ({ id: id(s.id), name: str(s.name, ''), conv: val(s.conv), cost: val(s.cost) }));
    const sids = new Set(stages.map(s => s.id).concat(FIN_SALE));
    const fact = {};
    if (t.fact && typeof t.fact === 'object') for (const pid in t.fact) {
      if (!pids.has(pid) || !t.fact[pid] || typeof t.fact[pid] !== 'object') continue;
      const m = {};
      for (const sid in t.fact[pid]) { const v = val(t.fact[pid][sid]); if (v !== '' && sids.has(sid)) m[sid] = v; }
      fact[pid] = m;
    }
    return { id: id(t.id), name: str(t.name, ''), price: val(t.price), kind: t.kind === 'sub' ? 'sub' : 'once', start: val(t.start), churn: val(t.churn), sales: byPeriod(t.sales), stages, fact };
  });
  const expenses = (Array.isArray(fm.expenses) ? fm.expenses : []).filter(e => e && typeof e === 'object').map(e => ({ id: id(e.id), name: str(e.name, ''), values: byPeriod(e.values) }));
  const view = fm.view === 'all' || pids.has(fm.view) ? fm.view : 'all';
  return { periods, tariffs, expenses, view };
}

// Сколько нужно людей на каждом этапе, чтобы получить план продаж (снизу вверх)
function finFunnel(t, planned, factOf) {
  const n = t.stages.length;
  const need = new Array(n + 1);
  need[n] = planned;
  for (let i = n - 1; i >= 0; i--) {
    const c = finNum(t.stages[i].conv) / 100;
    need[i] = c > 0 && Number.isFinite(need[i + 1]) ? need[i + 1] / c : NaN;
  }
  const fact = t.stages.map(s => factOf(s.id)).concat(factOf(FIN_SALE));
  const factConv = t.stages.map((s, i) => (fact[i] > 0 && fact[i + 1] != null ? fact[i + 1] / fact[i] * 100 : NaN));
  let budget = 0, hasCost = false;
  t.stages.forEach((s, i) => { if (!finEmpty(s.cost) && Number.isFinite(need[i])) { budget += need[i] * finNum(s.cost); hasCost = true; } });
  // прогноз: если на верхнем этапе есть факт, сколько продаж дадут плановые конверсии
  let forecast = NaN;
  if (n && fact[0] > 0) { forecast = fact[0]; t.stages.forEach(s => { forecast *= finNum(s.conv) / 100; }); }
  return { need, fact, factConv, budget: hasCost ? budget : NaN, forecast };
}

function finCalc(fm) {
  const P = fm.periods;
  const T = {};
  fm.tariffs.forEach(t => {
    const price = finNum(t.price), churn = Math.min(100, Math.max(0, finNum(t.churn))) / 100;
    let prev = finNum(t.start);
    const r = { count: {}, carry: {}, fresh: {}, rev: {}, totalCount: 0, totalNew: 0, totalRev: 0, funnel: {} };
    P.forEach(p => {
      const has = !finEmpty(t.sales[p.id]);
      let cur, fresh;
      if (t.kind === 'sub') {
        const kept = prev * (1 - churn);
        r.carry[p.id] = kept;
        cur = has ? finNum(t.sales[p.id]) : kept;
        fresh = Math.max(0, cur - kept);
        prev = cur;
      } else { cur = has ? finNum(t.sales[p.id]) : 0; fresh = cur; }
      r.count[p.id] = cur; r.fresh[p.id] = fresh; r.rev[p.id] = cur * price;
      r.totalCount += cur; r.totalNew += fresh; r.totalRev += cur * price;
    });
    const factSum = sid => { let s = 0, any = false; P.forEach(p => { const v = t.fact[p.id] && t.fact[p.id][sid]; if (!finEmpty(v)) { s += finNum(v); any = true; } }); return any ? s : null; };
    r.funnel.all = finFunnel(t, r.totalNew, factSum);
    P.forEach(p => { r.funnel[p.id] = finFunnel(t, r.fresh[p.id], sid => { const v = t.fact[p.id] && t.fact[p.id][sid]; return finEmpty(v) ? null : finNum(v); }); });
    T[t.id] = r;
  });
  const per = {};
  let cumProfit = 0, cumRev = 0;
  P.forEach(p => {
    const rev = fm.tariffs.reduce((a, t) => a + T[t.id].rev[p.id], 0);
    const fresh = fm.tariffs.reduce((a, t) => a + T[t.id].fresh[p.id], 0);
    const exp = fm.expenses.reduce((a, e) => a + finNum(e.values[p.id]), 0);
    let budget = 0, hasBudget = false;
    fm.tariffs.forEach(t => { const b = T[t.id].funnel[p.id].budget; if (Number.isFinite(b)) { budget += b; hasBudget = true; } });
    cumRev += rev; cumProfit += rev - exp;
    per[p.id] = { rev, fresh, exp, profit: rev - exp, cumRev, cumProfit, budget: hasBudget ? budget : NaN };
  });
  const sum = k => P.reduce((a, p) => a + (Number.isFinite(per[p.id][k]) ? per[p.id][k] : 0), 0);
  const tot = { rev: sum('rev'), fresh: sum('fresh'), exp: sum('exp'), profit: sum('profit'), budget: P.some(p => Number.isFinite(per[p.id].budget)) ? sum('budget') : NaN };
  tot.sales = fm.tariffs.reduce((a, t) => a + T[t.id].totalCount, 0);
  return { T, per, tot };
}

function finNextName(prev) {
  const m = String(prev || '').trim().match(/^([А-Яа-яЁё]+)\s+(\d{4})$/);
  if (m) {
    const i = FIN_MONTHS.findIndex(x => x.toLowerCase() === m[1].toLowerCase());
    if (i >= 0) return i === 11 ? FIN_MONTHS[0] + ' ' + (+m[2] + 1) : FIN_MONTHS[i + 1] + ' ' + m[2];
  }
  const d = new Date();
  return FIN_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}

function newFinPage(title, icon) {
  return { id: uid(), type: 'fin', title: title || 'Финмодель', icon: icon || '📊', fm: normalizeFm({ periods: [{ name: finNextName('') }], tariffs: [{ name: 'Новый тариф', price: '', kind: 'once', stages: finDefaultStages() }], expenses: [] }) };
}

class FinEditor {
  constructor(p, host) {
    this.page = p;
    this.host = host;
    p.fm = normalizeFm(p.fm);
    this.binds = new Map();
    this.outs = [];
    this.build();
    this.render();
  }

  build() {
    this.scroll = el('div', { class: 'doc-scroll', tabindex: '-1' });
    this.root = el('div', { class: 'fin' });
    this.scroll.append(this.root);
    this.host.append(this.scroll);
    this.root.addEventListener('input', e => this.onInput(e));
    this.root.addEventListener('focusout', e => { if (e.target.classList && e.target.classList.contains('fm-in')) setTimeout(() => this.refresh(), 0); });
    this.root.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || !e.target.classList.contains('fm-in')) return;
      e.preventDefault();
      const all = $$('.fm-in', this.root);
      const td = e.target.closest('td, th');
      // Enter — вниз по колонке, если есть куда, иначе на следующее поле
      if (td && td.parentElement) {
        const idx = Array.prototype.indexOf.call(td.parentElement.children, td);
        let tr = td.parentElement.nextElementSibling;
        while (tr) { const c = tr.children[idx]; const n = c && c.querySelector('.fm-in'); if (n) { n.focus(); n.select(); return; } tr = tr.nextElementSibling; }
      }
      const i = all.indexOf(e.target);
      if (i >= 0 && all[i + 1]) { all[i + 1].focus(); all[i + 1].select(); } else e.target.blur();
    });
  }

  destroy() { this.scroll.remove(); }
  focusDefault() { this.scroll.focus({ preventScroll: true }); }
  captureSel() {
    const a = document.activeElement;
    if (a && this.root.contains(a) && a.dataset && a.dataset.k) return { k: a.dataset.k, s: a.selectionStart };
    return null;
  }
  reload(p, sel) {
    this.page = p;
    p.fm = normalizeFm(p.fm);
    const y = this.scroll.scrollTop;
    this.render();
    this.scroll.scrollTop = y;
    if (sel && sel.k) {
      const n = this.root.querySelector('[data-k="' + CSS.escape(sel.k) + '"]');
      if (n) { n.focus({ preventScroll: true }); try { n.setSelectionRange(sel.s, sel.s); } catch (e) { /* noop */ } }
    }
  }

  get fm() { return this.page.fm; }

  commit(key) { changed(this.page, 'fm:' + key, { skipChrome: key !== 'title' }); this.refresh(); }
  structural(fn) {
    fn(this.fm);
    this.page.fm = normalizeFm(this.page.fm);
    History.breakCoalesce(this.page);
    changed(this.page, null, { sel: null, skipChrome: true });
    const y = this.scroll.scrollTop;
    this.render();
    this.scroll.scrollTop = y;
  }

  // поле ввода, привязанное к модели: get отдаёт значение для показа, set принимает строку
  inp(key, get, set, o) {
    o = o || {};
    const n = el('input', { class: 'fm-in' + (o.text ? ' fm-text' : '') + (o.cls ? ' ' + o.cls : ''), 'data-k': key, type: 'text', inputmode: o.text ? null : 'decimal', placeholder: o.ph || '', 'aria-label': o.label || null, autocomplete: 'off', spellcheck: o.text ? 'true' : 'false', title: o.title || null });
    const b = { node: n, get, set, ph: o.phFn || null };
    this.binds.set(key, b);
    n.value = get();
    if (b.ph) n.placeholder = b.ph();
    return n;
  }
  out(fn, cls) {
    const n = el('span', { class: 'fm-out' + (cls ? ' ' + cls : '') });
    this.outs.push({ n, fn });
    n.textContent = fn();
    return n;
  }
  onInput(e) {
    const k = e.target.dataset && e.target.dataset.k;
    const b = k && this.binds.get(k);
    if (!b) return;
    b.set(e.target.value);
    this.commit(k);
  }
  refresh() {
    this.calc = finCalc(this.fm);
    const a = document.activeElement;
    this.binds.forEach(b => {
      if (b.node !== a) { const v = b.get(); if (b.node.value !== v) b.node.value = v; }
      if (b.ph) b.node.placeholder = b.ph();
    });
    this.outs.forEach(o => { o.n.textContent = o.fn(); });
  }

  btn(label, onClick, cls, title) { return el('button', { type: 'button', class: 'fm-btn' + (cls ? ' ' + cls : ''), title: title || null, onclick: onClick }, label); }
  numGet(obj, key) { return () => (finEmpty(obj[key]) ? '' : String(obj[key])); }
  numSet(obj, key) { return v => { obj[key] = String(v).trim() === '' ? '' : finNum(v); }; }

  async confirmDel(text) {
    const v = await ui.choice({ title: 'Удалить?', text, buttons: [{ label: 'Отмена', value: 'no' }, { label: 'Удалить', value: 'yes', danger: true }] });
    return v === 'yes';
  }

  render() {
    this.binds.clear();
    this.outs = [];
    this.calc = finCalc(this.fm);
    this.root.innerHTML = '';
    const fm = this.fm;
    const C = () => this.calc;

    // ── заголовок ──
    const title = el('input', { class: 'fin-title', 'data-k': 'title', value: this.page.title || '', placeholder: 'Финмодель', 'aria-label': 'Название страницы', autocomplete: 'off' });
    title.addEventListener('input', () => { this.page.title = title.value; changed(this.page, 'title'); });
    this.root.append(
      el('div', { class: 'doc-icon-row' }, el('span', { class: 'doc-icon', text: this.page.icon || '📊' })),
      title,
      el('p', { class: 'fin-hint', text: 'Впишите тарифы, цены и план продаж по месяцам — итоги и воронки посчитаются сами. В воронке меняйте конверсию или сразу нужное число людей на этапе: недостающее подставится. Подписка: в ячейке — сколько платящих на конец месяца, новые продажи считаются с учётом оттока.' })
    );

    // ── сводка ──
    const kpi = (label, fn, cls) => el('div', { class: 'fm-kpi' + (cls ? ' ' + cls : '') }, el('div', { class: 'fm-kpi-l', text: label }), this.out(fn, 'fm-kpi-v'));
    this.root.append(el('div', { class: 'fm-kpis' },
      kpi('Выручка за все периоды', () => finRub(C().tot.rev)),
      kpi('Расходы', () => finRub(C().tot.exp)),
      kpi('Прибыль', () => finRub(C().tot.profit), 'fm-kpi-main'),
      kpi('Новых продаж', () => finCnt(C().tot.fresh)),
      kpi('Средний чек', () => (C().tot.sales > 0 ? finRub(C().tot.rev / C().tot.sales) : '—')),
      kpi('Бюджет по воронкам', () => finRub(C().tot.budget)),
      kpi('Стоимость продажи (CAC)', () => (Number.isFinite(C().tot.budget) && C().tot.fresh > 0 ? finRub(C().tot.budget / C().tot.fresh) : '—'))
    ));

    this.root.append(this.renderPlan(), this.renderTotals(), this.renderFunnels());
  }

  // ── 1. тарифы и план продаж ──
  renderPlan() {
    const fm = this.fm, C = () => this.calc;
    const head = el('tr', null,
      el('th', { class: 'fm-sticky', text: 'Тариф' }), el('th', { class: 'fm-num', text: 'Цена, ₽' }), el('th', { text: 'Тип' }),
      fm.periods.map(p => el('th', { class: 'fm-num fm-per' },
        el('div', { class: 'fm-per-h' },
          this.inp('pname:' + p.id, () => p.name, v => { p.name = v; }, { text: true, cls: 'fm-per-in', label: 'Название периода' }),
          this.btn('×', async () => {
            const has = fm.tariffs.some(t => !finEmpty(t.sales[p.id])) || fm.expenses.some(e => !finEmpty(e.values[p.id]));
            if (has && !(await this.confirmDel('Период «' + (p.name || 'без названия') + '» и все цифры в нём.'))) return;
            this.structural(f => { f.periods = f.periods.filter(x => x.id !== p.id); });
          }, 'fm-x', 'Удалить период')))),
      el('th', { class: 'fm-num', text: 'Итого, шт' }), el('th', { class: 'fm-num', text: 'Выручка' }), el('th'));
    const rows = fm.tariffs.map(t => {
      const kind = el('select', { class: 'fm-sel', 'aria-label': 'Тип тарифа' },
        el('option', { value: 'once', text: 'Разовая продажа' }), el('option', { value: 'sub', text: 'Подписка в месяц' }));
      kind.value = t.kind;
      kind.addEventListener('change', () => this.structural(() => { t.kind = kind.value; }));
      const kindCell = el('td', { class: 'fm-kind' }, kind);
      if (t.kind === 'sub') kindCell.append(el('div', { class: 'fm-subf' },
        el('label', null, 'база ', this.inp('start:' + t.id, this.numGet(t, 'start'), this.numSet(t, 'start'), { cls: 'fm-mini', label: 'Платящих на старте', title: 'Сколько платящих уже есть до первого периода' })),
        el('label', null, 'отток % ', this.inp('churn:' + t.id, this.numGet(t, 'churn'), this.numSet(t, 'churn'), { cls: 'fm-mini', label: 'Отток в месяц, %', title: 'Какая доля платящих уходит за месяц' }))));
      return el('tr', null,
        el('td', { class: 'fm-sticky' }, this.inp('tname:' + t.id, () => t.name, v => { t.name = v; }, { text: true, ph: 'Название тарифа', label: 'Название тарифа' })),
        el('td', { class: 'fm-num' }, this.inp('price:' + t.id, this.numGet(t, 'price'), this.numSet(t, 'price'), { ph: '0', label: 'Цена' })),
        kindCell,
        fm.periods.map(p => el('td', { class: 'fm-num' },
          this.inp('sale:' + t.id + ':' + p.id, () => (finEmpty(t.sales[p.id]) ? '' : String(t.sales[p.id])), v => { if (String(v).trim() === '') delete t.sales[p.id]; else t.sales[p.id] = finNum(v); },
            { label: (t.name || 'Тариф') + ', ' + (p.name || 'период'), phFn: () => (t.kind === 'sub' ? finCnt(C().T[t.id] ? C().T[t.id].carry[p.id] : 0) : '0') }),
          t.kind === 'sub' ? this.out(() => '+' + finCnt(C().T[t.id].fresh[p.id]) + ' новых', 'fm-note') : null)),
        el('td', { class: 'fm-num' }, this.out(() => (t.kind === 'sub' ? finCnt(C().T[t.id].totalNew) + ' новых' : finCnt(C().T[t.id].totalCount)))),
        el('td', { class: 'fm-num fm-strong' }, this.out(() => finRub(C().T[t.id].totalRev))),
        el('td', { class: 'fm-act' }, this.btn('×', async () => {
          if (!(await this.confirmDel('Тариф «' + (t.name || 'без названия') + '» вместе с его воронкой.'))) return;
          this.structural(f => { f.tariffs = f.tariffs.filter(x => x.id !== t.id); });
        }, 'fm-x', 'Удалить тариф')));
    });
    const foot = el('tr', { class: 'fm-total' },
      el('td', { class: 'fm-sticky', text: 'Выручка' }), el('td'), el('td'),
      fm.periods.map(p => el('td', { class: 'fm-num' }, this.out(() => finRub(C().per[p.id].rev)))),
      el('td'), el('td', { class: 'fm-num' }, this.out(() => finRub(C().tot.rev))), el('td'));
    return el('section', { class: 'fm-sec' },
      el('h2', { text: '1. Тарифы и план продаж' }),
      el('div', { class: 'fm-wrap' }, el('table', { class: 'fm-table' }, el('thead', null, head), el('tbody', null, rows, foot))),
      el('div', { class: 'fm-bar' },
        this.btn('+ Тариф', () => this.structural(f => { f.tariffs.push({ id: uid(), name: '', price: '', kind: 'once', sales: {}, stages: finDefaultStages(), fact: {} }); })),
        this.btn('+ Месяц', () => this.structural(f => { f.periods.push({ id: uid(), name: finNextName(f.periods.length ? f.periods[f.periods.length - 1].name : '') }); }))));
  }

  // ── 2. итоги, расходы, прибыль ──
  renderTotals() {
    const fm = this.fm, C = () => this.calc;
    const row = (label, fn, cls, totFn) => el('tr', { class: cls || null },
      el('td', { class: 'fm-sticky', text: label }),
      fm.periods.map(p => el('td', { class: 'fm-num' }, this.out(() => fn(p)))),
      el('td', { class: 'fm-num fm-strong' }, totFn ? this.out(totFn) : null), el('td'));
    const exp = fm.expenses.map(e => el('tr', { class: 'fm-exp' },
      el('td', { class: 'fm-sticky' }, this.inp('ename:' + e.id, () => e.name, v => { e.name = v; }, { text: true, ph: 'Статья расходов', label: 'Статья расходов' })),
      fm.periods.map(p => el('td', { class: 'fm-num' }, this.inp('exp:' + e.id + ':' + p.id, () => (finEmpty(e.values[p.id]) ? '' : String(e.values[p.id])), v => { if (String(v).trim() === '') delete e.values[p.id]; else e.values[p.id] = finNum(v); }, { ph: '0', label: (e.name || 'Расход') + ', ' + (p.name || 'период') }))),
      el('td', { class: 'fm-num' }, this.out(() => finRub(fm.periods.reduce((a, p) => a + finNum(e.values[p.id]), 0)))),
      el('td', { class: 'fm-act' }, this.btn('×', () => this.structural(f => { f.expenses = f.expenses.filter(x => x.id !== e.id); }), 'fm-x', 'Удалить статью'))));
    const head = el('tr', null, el('th', { class: 'fm-sticky', text: 'Показатель' }), fm.periods.map(p => el('th', { class: 'fm-num' }, this.out(() => p.name || 'Период'))), el('th', { class: 'fm-num', text: 'Итого' }), el('th'));
    const body = [
      fm.tariffs.map(t => row(t.name || 'Тариф', p => finRub(C().T[t.id].rev[p.id]), 'fm-sub', () => finRub(C().T[t.id].totalRev))),
      row('Выручка', p => finRub(C().per[p.id].rev), 'fm-total', () => finRub(C().tot.rev)),
      row('Новых продаж', p => finCnt(C().per[p.id].fresh), null, () => finCnt(C().tot.fresh)),
      el('tr', { class: 'fm-group' }, el('td', { class: 'fm-sticky', text: 'Расходы', colspan: String(fm.periods.length + 3) })),
      exp,
      el('tr', null, el('td', { class: 'fm-sticky', colspan: String(fm.periods.length + 3) }, this.btn('+ Статья расходов', () => this.structural(f => { f.expenses.push({ id: uid(), name: '', values: {} }); }), 'fm-link'))),
      row('Расходы всего', p => finRub(C().per[p.id].exp), 'fm-total', () => finRub(C().tot.exp)),
      row('Прибыль', p => finRub(C().per[p.id].profit), 'fm-total fm-profit', () => finRub(C().tot.profit)),
      row('Прибыль нарастающим итогом', p => finRub(C().per[p.id].cumProfit), 'fm-muted'),
      row('Маржа', p => (C().per[p.id].rev > 0 ? finPct(C().per[p.id].profit / C().per[p.id].rev * 100) : '—'), 'fm-muted', () => (C().tot.rev > 0 ? finPct(C().tot.profit / C().tot.rev * 100) : '—')),
      row('Бюджет по воронкам (для сверки с рекламой)', p => finRub(C().per[p.id].budget), 'fm-muted', () => finRub(C().tot.budget))
    ];
    return el('section', { class: 'fm-sec' },
      el('h2', { text: '2. Итоги, расходы и прибыль' }),
      el('div', { class: 'fm-wrap' }, el('table', { class: 'fm-table' }, el('thead', null, head), el('tbody', null, body.flat(3)))));
  }

  // ── 3. воронки по тарифам ──
  renderFunnels() {
    const fm = this.fm, C = () => this.calc;
    const view = fm.view;
    const chips = el('div', { class: 'fm-chips', role: 'tablist' },
      [{ id: 'all', name: 'Все периоды' }].concat(fm.periods).map(p => el('button', {
        type: 'button', role: 'tab', class: 'fm-chip' + (view === p.id ? ' on' : ''), 'aria-selected': view === p.id ? 'true' : 'false',
        onclick: () => this.structural(f => { f.view = p.id; })
      }, p.name || 'Период')));
    const cards = fm.tariffs.map(t => {
      const F = () => C().T[t.id].funnel[view];
      const n = t.stages.length;
      const factIn = (sid, label) => (view === 'all'
        ? this.out(() => { const v = F().fact[sid === FIN_SALE ? n : t.stages.findIndex(s => s.id === sid)]; return v == null ? '' : finCnt(v); }, 'fm-faint')
        : this.inp('fact:' + t.id + ':' + view + ':' + sid, () => { const v = t.fact[view] && t.fact[view][sid]; return finEmpty(v) ? '' : String(v); },
          v => { t.fact[view] = t.fact[view] || {}; if (String(v).trim() === '') delete t.fact[view][sid]; else t.fact[view][sid] = finNum(v); }, { ph: '—', label: 'Факт: ' + label }));
      const rows = t.stages.map((s, i) => el('tr', null,
        el('td', { class: 'fm-sticky' }, this.inp('sname:' + s.id, () => s.name, v => { s.name = v; }, { text: true, ph: 'Этап', label: 'Название этапа' })),
        el('td', { class: 'fm-num' }, this.inp('conv:' + s.id, this.numGet(s, 'conv'), this.numSet(s, 'conv'), { ph: '%', label: 'Конверсия в следующий этап, %' })),
        el('td', { class: 'fm-num fm-strong' }, this.inp('need:' + t.id + ':' + view + ':' + s.id, () => { const v = F().need[i]; return Number.isFinite(v) ? finCnt(v).replace(/\s/g, '') : ''; },
          v => {
            const want = finNum(v), next = F().need[i + 1];
            if (want > 0 && Number.isFinite(next) && next > 0) s.conv = Math.round(next / want * 10000) / 100;
          }, { ph: '—', label: 'Нужно людей на этапе', cls: 'fm-need', title: 'Впишите своё число — конверсия этого этапа пересчитается' })),
        el('td', { class: 'fm-num' }, factIn(s.id, s.name)),
        el('td', { class: 'fm-num' }, this.out(() => finPct(F().factConv[i]), 'fm-faint')),
        el('td', { class: 'fm-num' }, this.inp('cost:' + s.id, this.numGet(s, 'cost'), this.numSet(s, 'cost'), { ph: '—', label: 'Стоимость одного человека на этапе, ₽' })),
        el('td', { class: 'fm-num' }, this.out(() => (finEmpty(s.cost) ? '' : finRub(F().need[i] * finNum(s.cost))))),
        el('td', { class: 'fm-act' },
          this.btn('↑', () => this.structural(() => { if (i > 0) t.stages.splice(i - 1, 0, t.stages.splice(i, 1)[0]); }), 'fm-x', 'Выше'),
          this.btn('↓', () => this.structural(() => { if (i < n - 1) t.stages.splice(i + 1, 0, t.stages.splice(i, 1)[0]); }), 'fm-x', 'Ниже'),
          this.btn('×', () => this.structural(() => { t.stages.splice(i, 1); }), 'fm-x', 'Удалить этап'))));
      const sale = el('tr', { class: 'fm-total' },
        el('td', { class: 'fm-sticky', text: t.kind === 'sub' ? 'Новые продажи' : 'Продажи' }),
        el('td', { class: 'fm-num fm-faint', text: 'план' }),
        el('td', { class: 'fm-num fm-strong' }, this.out(() => finCnt(F().need[n]))),
        el('td', { class: 'fm-num' }, factIn(FIN_SALE, 'продажи')),
        el('td'), el('td'),
        el('td', { class: 'fm-num fm-strong' }, this.out(() => finRub(F().budget))), el('td'));
      const summary = el('div', { class: 'fm-fsum' },
        this.out(() => {
          const f = F(), plan = f.need[n];
          const parts = ['План: ' + finCnt(plan) + ' продаж'];
          if (Number.isFinite(f.budget) && plan > 0) parts.push('стоимость продажи ' + finRub(f.budget / plan));
          if (Number.isFinite(f.forecast)) parts.push('по факту верхнего этапа прогноз ≈ ' + finCnt(f.forecast) + ' продаж');
          return parts.join(' · ');
        }));
      return el('div', { class: 'fm-card' },
        el('h3', null, this.out(() => (t.name || 'Тариф') + (t.price !== '' ? ' · ' + finRub(finNum(t.price)) : ''))),
        el('div', { class: 'fm-wrap' }, el('table', { class: 'fm-table fm-funnel' },
          el('thead', null, el('tr', null,
            el('th', { class: 'fm-sticky', text: 'Этап' }), el('th', { class: 'fm-num', text: 'Конверсия в следующий' }), el('th', { class: 'fm-num', text: 'Нужно' }),
            el('th', { class: 'fm-num', text: 'Факт' }), el('th', { class: 'fm-num', text: 'Конверсия факт' }), el('th', { class: 'fm-num', text: '₽ за 1' }), el('th', { class: 'fm-num', text: 'Бюджет' }), el('th'))),
          el('tbody', null, rows, sale))),
        summary,
        el('div', { class: 'fm-bar' }, this.btn('+ Этап', () => this.structural(() => { t.stages.push({ id: uid(), name: '', conv: '', cost: '' }); }))));
    });
    return el('section', { class: 'fm-sec' },
      el('h2', { text: '3. Воронки продаж по тарифам' }),
      el('p', { class: 'fin-hint', text: 'План продаж берётся из таблицы 1. «Нужно» считается снизу вверх: продажи ÷ конверсия. Впишите «Нужно» сами — пересчитается конверсия этого этапа. «Факт» вносится по месяцам, во вкладке «Все периоды» он суммируется. «₽ за 1» — сколько стоит один человек на этапе (например, переход или заявка), из этого считается бюджет.' }),
      chips, cards);
  }
}

function seedFinPage() {
  const per = [{ id: 'fp-1', name: 'Ноябрь 2026' }, { id: 'fp-2', name: 'Декабрь 2026' }, { id: 'fp-3', name: 'Январь 2027' }];
  const st = (pre, list) => list.map(([name, conv, cost], i) => ({ id: pre + i, name, conv: conv == null ? '' : conv, cost: cost == null ? '' : cost }));
  return {
    id: 'seed-fin', type: 'fin', title: 'Финмодель', icon: '📊',
    fm: normalizeFm({
      periods: per,
      tariffs: [
        { id: 'ft-club', name: 'Сообщество', price: 5000, kind: 'sub', start: 70, churn: 10, sales: { 'fp-1': 80, 'fp-2': 90, 'fp-3': 100 },
          stages: st('fs-c', [['Просмотры рилсов', 1.5], ['Переходы на сайт', 30], ['Регистрации (лид-магнит)', 60], ['Зашли в бесплатный чат', 30], ['Пришли на встречу', 20]]) },
        { id: 'ft-with', name: 'Сделать вместе · 4 недели', price: 50000, kind: 'once', sales: { 'fp-1': 10, 'fp-3': 12 },
          stages: st('fs-w', [['Участники сообщества', 25], ['Пришли на встречу-презентацию', 40], ['Оставили заявку', 50]]) },
        { id: 'ft-done', name: 'Сделать за клиента', price: 200000, kind: 'once', sales: { 'fp-2': 1, 'fp-3': 2 },
          stages: st('fs-d', [['Заявки', 40], ['Созвон-диагностика', 30]]) }
      ],
      expenses: [{ id: 'fe-1', name: 'Реклама и продвижение', values: {} }, { id: 'fe-2', name: 'Команда и кураторы', values: {} }, { id: 'fe-3', name: 'Сервисы', values: {} }],
      view: 'all'
    })
  };
}

// ════════════════════════════════════════════════════════════
//  Шаблон: продукт «ИИ для руководителей» — идеи, mindmap, тесты воронок
// ════════════════════════════════════════════════════════════
// Поднимайте версию при смене шаблона: нетронутые планы в браузерах пересоберутся из нового шаблона
const SEED_VERSION = 3;
const SEED_FIRST_ID = 'seed-product';

const SEED_LAUNCH_MD = `Ход тестов воронок. Отмечайте сделанное, дописывайте задачи, меняйте порядок (тяните за ⋮⋮). «/» — меню блоков.

## Продукт
- [ ] Решить, кого берём первым: предприниматели, руководители в найме или C-level
- [ ] Решить спор о конструкторе (таблица в документе «ИИ для руководителей»)
- [ ] Программа ступени 50 000 ₽: 1,5 месяца, 2 занятия в неделю
- [ ] Программа ступени 200 000 ₽: что внедряем в компании клиента
- [ ] Трипак 2 500 ₽: что внутри и как переводит в поток
- [ ] Список модулей за 0 ₽: подготовка, безопасность, …

## Упаковка
- [ ] Файл с оффером для личек (Олег)
- [ ] Маркетинговые смыслы для лендинга
- [ ] Вёрстка лендинга (Il.Chu)
- [ ] Ожидание в Ядре для купивших любой чек

## Тест 1 · Обход личек
- [ ] Список тёплых контактов: руководители и предприниматели
- [ ] Текст первого сообщения + файл с оффером
- [ ] 20 созвонов
- [ ] Записать возражения и вопросы

## Вопросы на созвонах
- Что вы уже пробовали с ИИ и почему это не прижилось?
- Какая задача отнимает у вас больше всего часов в неделю?
- Где лежат данные по маркетингу и продажам? Сколько это систем?
- По каким цифрам вы поймёте, что внедрение ИИ окупилось?
- Кто в компании решает про обучение и бюджет на него?
- Что останавливает: безопасность данных, команда, время?
- [ ] Записывать ответы в раздел «Боли ЦА» документа «ИИ для руководителей»

## Тест 2 · Рилсы из нарезки вебов
- [ ] Выбрать 10 фрагментов из текущих вебов
- [ ] Кодовое слово и ответ бота
- [ ] 2 недели публикаций, считаем лиды в боте

## Тест 3 · Корпоративный аутрич (Руслан)
- [ ] Список компаний и ЛПР
- [ ] Оффер для юрлица: группа, документы, оплата по счёту
- [ ] 3 пилота

## Тест 4 · Партнёрка и бартер
- [ ] Условия партнёрки: клуб на месяц в подарок
- [ ] 3 кандидата из медийки на бартер за охваты в Instagram

## Разведка
- [ ] Посмотреть изнутри РШУ и Moscow.mba через своих людей
- [ ] Пройти воронку AIBasis и Zerocoder как клиент
- [ ] Пересмотреть эфир 5призм с Лёней: навыковые курсы и библиотека входных продуктов

## Метрики: план и факт
| Воронка | Касаний | Созвонов / лидов | Оплат | Выручка | Комментарий |
|---|---|---|---|---|---|
| Обход личек | | | | | |
| Рилсы | | | | | |
| Корпоративный аутрич | | | | | |
| Партнёрка | | | | | |
| Итого к плану 1 млн ₽ | | | | | |
`;

function seedIds(blocks, prefix) { blocks.forEach((b, i) => { b.id = prefix + '-' + i; }); return blocks; }

function seedFunnelDoc() {
  const md = typeof window.PLAN_SEED_MD === 'string' ? window.PLAN_SEED_MD : '# ИИ для руководителей\n';
  let blocks = parseMarkdown(md);
  let title = 'ИИ для руководителей';
  if (blocks[0] && blocks[0].type === 'h1') { title = htmlToText(blocks[0].html); blocks.shift(); }
  // выводы и оговорки выделяем выносками
  blocks.forEach(b => {
    if (b.type !== 'text') return;
    const t = htmlToText(b.html);
    if (/^Вывод:/.test(t)) { b.type = 'callout'; b.emoji = '💡'; }
    else if (/^Это иллюстрация/.test(t)) { b.type = 'callout'; b.emoji = '⚠️'; }
  });
  return { id: SEED_FIRST_ID, type: 'doc', title, icon: '💡', blocks: seedIds(blocks.map(normalizeBlock), 'sp') };
}
function seedLaunchDoc() {
  return { id: 'seed-tests', type: 'doc', title: 'Тесты воронок', icon: '✅', blocks: seedIds(parseMarkdown(SEED_LAUNCH_MD), 'st') };
}
function seedBoard() {
  let n = 0;
  const items = [];
  const add = o => { o.id = 'sm-' + (n++); items.push(o); return o; };
  const S = (x, y, w, h, color, html, align) => add({ kind: 'sticky', x, y, w, h, color, html, align });
  const F = (x, y, w, h, title, color) => add({ kind: 'frame', x, y, w, h, title, color: color || 'white' });
  const SH = (x, y, w, h, shape, color, html) => add({ kind: 'shape', x, y, w, h, shape, color, html });
  const T = (x, y, w, html, fs, color) => add({ kind: 'text', x, y, w, h: fs * 1.4, html, fs, color: color || 'default' });
  const L = (a, b, o) => add(Object.assign({ kind: 'line', from: { id: a.id }, to: { id: b.id }, color: 'gray', arrow: 'none', html: '' }, o || {}));

  const SW = 300, GAP = 30;
  const stickH = html => Math.max(130, 70 + Math.ceil(html.replace(/<[^>]+>/g, '').length / 28) * 22);

  T(-150, -760, 3000, '<b>Mindmap: стратегия роста CMO</b>', 44);
  T(-150, -680, 3000, 'Обновлено 17.10 по саммари стратегии. Двойной клик по пустому месту — новый стикер. Синие точки у выделенного — провести связь. Свои идеи кидайте в «Парковку» справа.', 18, 'gray');

  const CX = 1200, CY = 900, CW = 440, CH = 200;
  const center = SH(CX, CY, CW, CH, 'ellipse', 'dark', '<b>Система привлечения клиентов на ИИ</b><br>малый бизнес · 70 участников · ≈350 000 ₽/мес');

  // ветка: узел + стикеры, уходящие от центра (up / down / left / right)
  const branch = (x, y, dir, title, shapeColor, stickColor, list) => {
    const node = SH(x, y, SW, 110, 'round', shapeColor, '<b>' + title + '</b>');
    L(center, node, { color: 'dark' });
    let cur = dir === 'up' ? y - GAP : dir === 'down' ? y + 110 + GAP : y + 55;
    const hs = list.map(stickH);
    if (dir === 'left' || dir === 'right') cur = y + 55 - (hs.reduce((a, h) => a + h + GAP, -GAP)) / 2;
    let prev = node;
    list.forEach((html, i) => {
      const h = hs[i];
      let sx = x, sy;
      if (dir === 'up') { sy = cur - h; cur = sy - GAP; }
      else if (dir === 'down') { sy = cur; cur += h + GAP; }
      else { sx = dir === 'left' ? x - SW - 120 : x + SW + 120; sy = cur; cur += h + GAP; }
      const st = S(sx, sy, SW, h, stickColor, html, 'left');
      L(dir === 'left' || dir === 'right' ? node : prev, st);
      prev = st;
    });
    return node;
  };

  branch(-150, 500, 'up', 'Аудитория и боль', 'blue', 'blue', [
    '<b>Малый бизнес</b><br>Собственники, которые сами отвечают за заявки',
    '<b>Горящая боль</b><br>Нехватка клиентов и заявок',
    '<b>Хроническая</b><br>«Всё тяну на себе» — не в заголовок, а в выгоду',
    'ИИ — не боль, а способ решения',
    '<b>?</b> Проверить боль на 70 участниках: что болит и какими словами'
  ]);
  branch(1270, 500, 'up', 'Лестница продуктов', 'yellow', 'orange', [
    '<b>Бесплатно</b><br>Reels, лид-магнит, чат, встречи',
    '<b>Сообщество · 5 000 ₽/мес</b><br>70 участников ≈ 350 000 ₽/мес',
    '<b>Сделать вместе</b><br>Внедряем прямо на встречах',
    '<b>Сделать за клиента</b><br>Команда собирает под ключ, дороже',
    '<b>Персонализация</b><br>Под конкретный бизнес клиента'
  ]);
  branch(2690, 500, 'up', 'Упаковка', 'violet', 'violet', [
    '<b>Смысл</b><br>Система привлечения клиентов на ИИ за 4 недели — без агентства и без найма маркетолога',
    '<b>Обещание</b><br>Контент, реклама, воронка, обработка заявок',
    '<b>Отличие от курсов</b><br>Не записи, а внедрение на встречах',
    '<b>Доказательства</b><br>Свои кейсы, гарантии не нужны',
    '<b>Ограничение</b><br>Маленькая группа, разбор каждого бизнеса'
  ]);
  branch(3300, 945, 'right', 'Воронка через Reels', 'green', 'green', [
    '<b>Reels</b><br>Про ИИ в маркетинге',
    '<b>Лид-магнит</b><br>За регистрацию на сайте в один шаг',
    '<b>Бесплатный чат</b><br>Польза + анонсы встреч',
    '<b>Встреча</b><br>Reels приводят на встречи больше людей',
    '<b>Платное сообщество</b><br>→ премиум-внедрение'
  ]);
  branch(2690, 1300, 'down', 'Контент', 'yellow', 'yellow', [
    '3–5 роликов в неделю',
    'Хук в первые 2 секунды',
    'Один полезный шаг на ролик',
    'Лицо в кадре',
    'Главный ресурс — нарезки Маркшопов и встреч'
  ]);
  branch(1270, 1300, 'down', 'Живой запуск', 'gray', 'cyan', [
    '<b>По шагам пути клиента</b><br>Упаковка → контент → реклама → воронка → заявки',
    'Одна встреча = одна задача, 30–40 минут практики',
    'Группа 10–15 человек, две комнаты в Zoom',
    'Шаблоны и чек-листы на каждый шаг',
    '<b>Контроль</b><br>Скриншот результата в чат; с отстающими — созвон или куратор'
  ]);
  branch(-150, 1300, 'down', 'Кейсы', 'gray', 'gray', [
    'Reels, которые принесли заявки',
    'Оптимизация Директа',
    'Воронка за минуту',
    '<b>Первые покупатели</b><br>Среди текущих 70 участников'
  ]);
  branch(-400, 945, 'left', 'Открытые вопросы', 'red', 'red', [
    'Какой лид-магнит выбираем?',
    'Ритм контента в бесплатном чате',
    'Цена, число мест, длительность',
    'Разделение ролей с Ильёй'
  ]);

  F(4300, -500, 1060, 1500, 'Парковка идей — кидайте сюда');
  [['Олег', 'yellow'], ['Дима', 'pink'], ['Il.Chu', 'cyan'], ['Руслан', 'green']].forEach(([who, c], i) => {
    S(4350 + (i % 2) * 500, -420 + Math.floor(i / 2) * 700, 460, 640, c, '<b>' + who + '</b><br>', 'left');
  });

  return { id: 'seed-mindmap', type: 'board', title: 'Mindmap стратегии', icon: '🧠', items: items.map(normalizeItem).filter(Boolean) };
}
function seedPages() { return [seedFunnelDoc(), seedBoard(), seedLaunchDoc(), seedFinPage()].map(normalizePage); }

// ════════════════════════════════════════════════════════════
//  Приложение: боковая панель, страницы, меню
// ════════════════════════════════════════════════════════════
let editor = null;

function setSaveState(s) {
  const n = $('#save-state');
  if (!n) return;
  n.textContent = s === 'dirty' ? 'Сохранение…' : s === 'error' ? 'Не сохранено!' : 'Сохранено';
  n.style.color = s === 'error' ? 'var(--danger)' : '';
}
function updateUndoButtons() {
  const p = editor && editor.page;
  $('#undo-btn').disabled = !History.canUndo(p);
  $('#redo-btn').disabled = !History.canRedo(p);
}
function pageLabel(p) { return p.title || (p.type === 'board' ? 'Без названия' : 'Без названия'); }
function pageIcon(p) { return p.icon || (p.type === 'board' ? '🧩' : p.type === 'fin' ? '📊' : '📄'); }

function renderChrome() {
  renderSidebar();
  const p = activePage();
  if (!p) return;
  $('#crumb-icon').textContent = pageIcon(p);
  $('#crumb-title').textContent = pageLabel(p);
  document.title = pageLabel(p) + ' — План воронки';
}

let dragPage = null;
function renderSidebar() {
  const list = $('#pages');
  list.innerHTML = '';
  state.pages.forEach(p => {
    const row = el('div', { class: 'pg' + (p.id === state.activeId ? ' active' : ''), draggable: 'true', 'data-id': p.id, title: pageLabel(p), role: 'button', tabindex: '0' },
      el('span', { class: 'pg-icon', text: pageIcon(p) }),
      el('span', { class: 'pg-title', text: pageLabel(p) }),
      p.type === 'board' ? el('span', { class: 'pg-kind', text: 'доска' }) : p.type === 'fin' ? el('span', { class: 'pg-kind', text: 'финмодель' }) : null,
      el('button', { class: 'pg-more', type: 'button', title: 'Действия', 'aria-label': 'Действия со страницей', html: ICONS.dots }));
    row.addEventListener('click', e => {
      if (e.target.closest('.pg-more')) { e.stopPropagation(); pageMenu(p, e.target.closest('.pg-more')); return; }
      if (p.id !== state.activeId) openPage(p.id); else closeSidebarMobile();
    });
    row.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target === row) openPage(p.id); });
    row.addEventListener('dblclick', e => { if (!e.target.closest('.pg-more')) renamePage(p); });
    row.addEventListener('contextmenu', e => { e.preventDefault(); pageMenu(p, { left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY }); });
    row.addEventListener('dragstart', e => { dragPage = p.id; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', pageLabel(p)); } catch (er) { /* noop */ } });
    row.addEventListener('dragend', () => { dragPage = null; $$('.pg', list).forEach(r => r.classList.remove('drop-before', 'drop-after')); });
    row.addEventListener('dragover', e => {
      if (!dragPage || dragPage === p.id) return;
      e.preventDefault();
      const r = row.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
      $$('.pg', list).forEach(x => x.classList.remove('drop-before', 'drop-after'));
      row.classList.add(after ? 'drop-after' : 'drop-before');
    });
    row.addEventListener('drop', e => {
      if (!dragPage || dragPage === p.id) return;
      e.preventDefault();
      const after = row.classList.contains('drop-after');
      const moving = page(dragPage);
      state.pages = state.pages.filter(x => x !== moving);
      const i = state.pages.indexOf(p);
      state.pages.splice(after ? i + 1 : i, 0, moving);
      dragPage = null;
      globalChanged();
    });
    list.append(row);
  });
}
function globalChanged() { setSaveState('dirty'); saveLocal(); Sync.onLocalChange(); renderChrome(); }

function openPage(id, opts) {
  opts = opts || {};
  const p = page(id) || state.pages[0];
  if (!p) return;
  closeMenu();
  SelTool.hide();
  if (editor) { editor.destroy(); editor = null; }
  state.activeId = p.id;
  saveLocal();
  History.entry(p);
  const view = $('#view');
  view.innerHTML = '';
  $('#main').classList.toggle('is-board', p.type === 'board');
  editor = p.type === 'board' ? new BoardEditor(p, view) : p.type === 'fin' ? new FinEditor(p, view) : new DocEditor(p, view);
  renderChrome();
  updateUndoButtons();
  closeSidebarMobile();
  if (opts.focusTitle && editor.focusTitle) editor.focusTitle(true);
  else if (!isTouch()) editor.focusDefault();
}
const isTouch = () => window.matchMedia('(hover: none)').matches;
const isNarrow = () => window.matchMedia('(max-width: 820px)').matches;
function closeSidebarMobile() { $('#app').classList.remove('side-open'); }
function toggleSidebar(force) {
  const app = $('#app');
  if (isNarrow()) app.classList.toggle('side-open', force);
  else {
    app.classList.toggle('side-collapsed', force == null ? undefined : !force);
    uiPrefs.sideCollapsed = app.classList.contains('side-collapsed');
    store.set(LS.ui, uiPrefs);
    if (editor && editor.applyView) setTimeout(() => editor.applyView(), 200);
  }
}

function addPage(type) {
  const p = type === 'board' ? newBoardPage() : type === 'fin' ? newFinPage() : newDocPage();
  const i = state.pages.findIndex(x => x.id === state.activeId);
  state.pages.splice(i + 1, 0, p);
  History.entry(p);
  globalChanged();
  openPage(p.id, { focusTitle: type === 'doc' });
  if (type === 'board') renamePage(p);
}
async function renamePage(p) {
  if (p.type === 'doc' && p.id === state.activeId && editor && editor.focusTitle) { editor.focusTitle(true); return; }
  const v = await ui.prompt({ title: 'Название страницы', value: p.title, ok: 'Сохранить' });
  if (v == null) return;
  p.title = v.trim();
  if (editor && editor.page === p && editor.render && p.type !== 'board') editor.render();
  changed(p, null, { sel: null });
}
function duplicatePage(p) {
  const c = clonePageFresh(p);
  c.title = (p.title || 'Без названия') + ' (копия)';
  state.pages.splice(state.pages.indexOf(p) + 1, 0, c);
  globalChanged();
  openPage(c.id);
}
async function deletePage(p) {
  const ok = await ui.confirm({ title: 'Удалить страницу «' + pageLabel(p) + '»?', text: 'Её можно будет вернуть кнопкой «Вернуть» в течение нескольких секунд.', ok: 'Удалить', danger: true });
  if (!ok) return;
  const i = state.pages.indexOf(p);
  if (i < 0) return;
  state.pages.splice(i, 1);
  if (!state.pages.length) state.pages.push(newDocPage('Без названия'));
  if (state.activeId === p.id) openPage(state.pages[Math.max(0, i - 1)].id);
  globalChanged();
  toast('Страница удалена', { timeout: 8000, action: { label: 'Вернуть', fn: () => { if (page(p.id)) return; state.pages.splice(Math.min(i, state.pages.length), 0, p); History.reset(p); globalChanged(); openPage(p.id); } } });
}
function movePage(p, dir) {
  const i = state.pages.indexOf(p), j = i + dir;
  if (j < 0 || j >= state.pages.length) return;
  state.pages.splice(i, 1);
  state.pages.splice(j, 0, p);
  globalChanged();
}
function pageMenu(p, anchor) {
  openMenu(anchor, [
    { label: 'Открыть', icon: '↗', onClick: () => openPage(p.id) },
    { label: 'Переименовать', icon: '✎', onClick: () => { if (p.id !== state.activeId) openPage(p.id); setTimeout(() => renamePage(p), 0); } },
    { label: 'Сменить иконку', icon: '☺', onClick: () => emojiPicker(anchor.getBoundingClientRect ? anchor : anchor, e => { p.icon = e; if (editor && editor.page === p && p.type !== 'board') editor.render(); changed(p, null, { sel: null }); }, true) },
    { label: 'Дублировать', icon: '⧉', onClick: () => duplicatePage(p) },
    p.type === 'doc' ? { label: 'Скачать как Markdown', icon: '⬇', onClick: () => download(fileName(p) + '.md', '# ' + pageLabel(p) + '\n\n' + blocksToMd(p.blocks), 'text/markdown;charset=utf-8') } : null,
    'sep',
    { label: 'Выше', icon: '↑', onClick: () => movePage(p, -1) },
    { label: 'Ниже', icon: '↓', onClick: () => movePage(p, 1) },
    'sep',
    { label: 'Удалить', icon: '🗑', danger: true, onClick: () => deletePage(p) }
  ].filter(Boolean));
}
const fileName = p => (pageLabel(p).replace(/[\\/:*?"<>|«»]+/g, '').trim().slice(0, 60) || 'страница');

function addPageMenu(anchor) {
  openMenu(anchor, [
    { label: 'Документ', icon: '📄', desc: 'Текст, списки, задачи, таблицы — как в Notion', onClick: () => addPage('doc') },
    { label: 'Доска', icon: '🧩', desc: 'Стикеры, фигуры, стрелки, фреймы — как в Miro', onClick: () => addPage('board') },
    { label: 'Финмодель', icon: '📊', desc: 'Тарифы, план продаж по месяцам, итоги и воронки с обратным расчётом', onClick: () => addPage('fin') }
  ]);
}

function moreMenu(anchor) {
  const p = activePage();
  const theme = uiPrefs.theme;
  const setTheme = t => { uiPrefs.theme = t; store.set(LS.ui, uiPrefs); applyTheme(); };
  openMenu(anchor, [
    p.type === 'doc' ? { label: 'Скопировать как Markdown', icon: '⎘', onClick: async () => toast((await copyText('# ' + pageLabel(p) + '\n\n' + blocksToMd(p.blocks))) ? 'Скопировано' : 'Не удалось скопировать') } : null,
    p.type === 'doc' ? { label: 'Скачать как Markdown', icon: '⬇', onClick: () => download(fileName(p) + '.md', '# ' + pageLabel(p) + '\n\n' + blocksToMd(p.blocks), 'text/markdown;charset=utf-8') } : null,
    p.type === 'doc' ? { label: 'Печать / PDF', icon: '🖨', onClick: () => window.print() } : null,
    p.type === 'board' ? { label: 'Показать всё', icon: '⤢', hint: 'Shift+1', onClick: () => editor.fit() } : null,
    'sep',
    { label: 'Скачать резервную копию', icon: '💾', desc: 'Все страницы в одном файле .json', onClick: () => download('plan-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ v: 1, app: 'cmo-plan', exportedAt: new Date().toISOString(), pages: state.pages }, null, 1), 'application/json') },
    { label: 'Импорт из файла', icon: '📂', desc: 'Резервная копия .json или текст .md', onClick: importFile },
    { label: 'Добавить шаблон «ИИ для руководителей»', icon: '💡', desc: 'Исходные страницы ещё раз, текущие не трогаем', onClick: addTemplate },
    'sep',
    { label: 'Тема', icon: '◐', sub: () => [['auto', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']].map(([v, l]) => ({ label: l, checked: theme === v, onClick: () => setTheme(v) })) },
    { label: 'Горячие клавиши', icon: '⌨', onClick: showHelp }
  ].filter(Boolean), { alignRight: true });
}

function addTemplate() {
  const fresh = seedPages().map(clonePageFresh);
  state.pages.push(...fresh);
  globalChanged();
  openPage(fresh[0].id);
  toast('Добавлено страниц: ' + fresh.length);
}

async function importFile() {
  const f = await pickFile('.json,.md,.markdown,.txt,application/json,text/markdown,text/plain');
  if (!f) return;
  let text;
  try { text = await f.text(); } catch (e) { toast('Не удалось прочитать файл'); return; }
  if (/\.json$/i.test(f.name) || /^\s*\{/.test(text)) {
    let data;
    try { data = JSON.parse(text); } catch (e) { toast('Файл повреждён: это не JSON'); return; }
    const pages = (Array.isArray(data) ? data : data && data.pages || []).map(normalizePage).filter(Boolean);
    if (!pages.length) { toast('В файле нет страниц'); return; }
    const v = await ui.choice({ title: 'Импорт: страниц — ' + pages.length, text: 'Добавить их к текущим или заменить всё содержимое?', buttons: [{ label: 'Заменить всё', value: 'replace', danger: true }, { label: 'Добавить', value: 'add', primary: true }] });
    if (!v) return;
    if (v === 'replace') {
      if (!(await ui.confirm({ title: 'Заменить все страницы?', text: 'Текущие страницы пропадут. Если сомневаетесь — сначала скачайте резервную копию.', ok: 'Заменить', danger: true }))) return;
      state.pages = pages;
      state.pages.forEach(p => History.reset(p));
      globalChanged();
      openPage(pages[0].id);
    } else {
      const added = pages.map(p => (page(p.id) ? clonePageFresh(p) : p));
      state.pages.push(...added);
      globalChanged();
      openPage(added[0].id);
    }
    toast('Импорт готов');
    return;
  }
  let blocks = parseMarkdown(text);
  let title = f.name.replace(/\.(md|markdown|txt)$/i, '');
  if (blocks[0] && blocks[0].type === 'h1') { title = htmlToText(blocks[0].html); blocks.shift(); }
  const p = normalizePage({ type: 'doc', title, icon: '📄', blocks });
  state.pages.push(p);
  globalChanged();
  openPage(p.id);
  toast('Документ импортирован');
}

function applyTheme() {
  const t = uiPrefs.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}

function showHelp() {
  const k = (...keys) => el('span', {}, keys.map((x, i) => [i ? ' ' : '', el('kbd', { text: x })]));
  const rows = [
    ['Документ'],
    ['Меню блоков', k('/')], ['Новый блок / перенос строки', k('Enter'), k('Shift+Enter')], ['Вложить / вынести', k('Tab'), k('Shift+Tab')],
    ['Выделить блок / все блоки', k('Esc'), k(MOD + '+A')], ['Переместить блок', k(MOD + '+Shift+↑/↓')], ['Дублировать', k(MOD + '+D')],
    ['Жирный, курсив, подчёркнутый', k(MOD + '+B'), k(MOD + '+I'), k(MOD + '+U')], ['Зачёркнутый, код, ссылка', k(MOD + '+Shift+S'), k(MOD + '+E'), k(MOD + '+K')],
    ['Быстрый ввод', k('#'), k('-'), k('1.'), k('[]'), k('>'), k('---')], ['Отметить задачу / раскрыть', k(MOD + '+Enter')],
    ['Доска'],
    ['Выбор, рука, стикер, фигура', k('V'), k('H'), k('N'), k('S')], ['Текст, фрейм, стрелка', k('T'), k('F'), k('L')],
    ['Новый стикер', k('двойной клик')], ['Редактировать текст', k('Enter'), k('двойной клик')], ['Двигать холст', k('пробел + мышь'), k('колёсико')],
    ['Масштаб', k(MOD + '+колёсико'), k('+'), k('−'), k(MOD + '+0')], ['Показать всё', k('Shift+1')], ['Сдвиг элемента', k('стрелки'), k('Shift+стрелки')],
    ['Копировать, вставить, дублировать', k(MOD + '+C'), k(MOD + '+V'), k(MOD + '+D')], ['Слои', k(']'), k('[')],
    ['Везде'],
    ['Отменить / повторить', k(MOD + '+Z'), k(MOD + '+Shift+Z')], ['Скрыть панель страниц', k(MOD + '+\\')]
  ];
  const grid = el('div', { class: 'keys' });
  rows.forEach(r => { if (r.length === 1) grid.append(el('h4', { text: r[0] })); else grid.append(el('span', { text: r[0] }), el('span', {}, r.slice(1).map((x, i) => [i ? ' ' : '', x]))); });
  ui.info('Горячие клавиши', grid, true);
}

// ── отмена / повтор ──
function undoRedo(dir) {
  if (!editor) return;
  if (editor.editing) editor.finishEdit();
  if (editor.closeSlash) editor.closeSlash();
  closeMenu();
  const p = editor.page;
  const cur = editor.captureSel();
  const e = History.step(p, dir, cur);
  if (!e) return;
  const np = JSON.parse(e.json);
  const i = state.pages.findIndex(x => x.id === p.id);
  if (i < 0) return;
  state.pages[i] = np;
  editor.reload(np, e.sel);
  afterChange(np);
}

// ════════════════════════════════════════════════════════════
//  Запуск
// ════════════════════════════════════════════════════════════
function init() {
  applyTheme();
  SelTool.init();
  const saved = store.get(LS.state, null);
  const pages = saved && Array.isArray(saved.pages) ? saved.pages.map(normalizePage).filter(Boolean) : [];
  // план, который никто не правил, пересобираем, если шаблон обновился
  const stale = pages.length && saved.touched === false && saved.seed !== SEED_VERSION;
  if (pages.length && !stale) state = { pages, activeId: saved.activeId, touched: saved.touched !== false };
  else state = { pages: seedPages(), activeId: SEED_FIRST_ID, touched: false };
  if (uiPrefs.sideCollapsed && !isNarrow()) $('#app').classList.add('side-collapsed');

  $('#add-page').addEventListener('click', e => addPageMenu(e.currentTarget));
  $('#side-open').addEventListener('click', () => toggleSidebar());
  $('#side-close').addEventListener('click', () => toggleSidebar(false));
  $('#scrim').addEventListener('click', closeSidebarMobile);
  $('#undo-btn').addEventListener('click', () => undoRedo(-1));
  $('#redo-btn').addEventListener('click', () => undoRedo(1));
  $('#more-btn').addEventListener('click', e => moreMenu(e.currentTarget));
  $('#help-btn').addEventListener('click', showHelp);
  $('#crumb').addEventListener('click', () => renamePage(activePage()));
  $('#sync-btn').addEventListener('click', e => {
    if (!Sync.enabled) { Sync.connect(); return; }
    openMenu(e.currentTarget, [
      { label: 'Синхронизировать сейчас', icon: '⟳', onClick: async () => { await Sync.push(); await Sync.pull(); toast(Sync.status === 'err' ? 'Нет связи с сервером' : 'Синхронизировано'); } },
      { label: 'Отключить общий план', icon: '⏏', desc: 'План останется в этом браузере', onClick: () => Sync.disconnect() }
    ]);
  });

  window.addEventListener('keydown', e => {
    if (modalOpen) return;
    const mod = modKey(e);
    if (mod && !e.altKey && e.code === 'KeyZ') { e.preventDefault(); e.stopPropagation(); undoRedo(e.shiftKey ? 1 : -1); return; }
    if (mod && !e.altKey && e.code === 'KeyY' && !isMac) { e.preventDefault(); e.stopPropagation(); undoRedo(1); return; }
    if (mod && e.code === 'KeyS') { e.preventDefault(); saveLocal.flush(); if (Sync.enabled) Sync.push(); toast('Всё сохраняется автоматически'); return; }
    if (mod && e.code === 'Backslash') { e.preventDefault(); toggleSidebar(); }
  }, true);
  document.addEventListener('beforeinput', e => {
    if ((e.inputType === 'historyUndo' || e.inputType === 'historyRedo') && $('#view').contains(e.target)) { e.preventDefault(); undoRedo(e.inputType === 'historyUndo' ? -1 : 1); }
  });
  const clip = (e, kind) => {
    if (modalOpen || !editor || inEditable()) return;
    if (!$('#view').contains(document.activeElement)) return;
    if (kind === 'paste') { if (editor.onPaste) editor.onPaste(e); }
    else if (editor.onCopy) editor.onCopy(e, kind === 'cut');
  };
  document.addEventListener('copy', e => clip(e, 'copy'));
  document.addEventListener('cut', e => clip(e, 'cut'));
  document.addEventListener('paste', e => clip(e, 'paste'));
  window.addEventListener('pagehide', () => saveLocal.flush());
  window.addEventListener('beforeunload', () => saveLocal.flush());
  window.addEventListener('storage', e => {
    if (e.key !== LS.state || !e.newValue || e.newValue === lastLocalJson) return;
    let data;
    try { data = JSON.parse(e.newValue); } catch (er) { return; }
    const pages = (data.pages || []).map(normalizePage).filter(Boolean);
    if (!pages.length) return;
    const apply = () => { lastLocalJson = e.newValue; replacePages(pages); };
    if (inEditable() && $('#view').contains(document.activeElement)) toast('План изменён в другой вкладке', { timeout: 10000, action: { label: 'Обновить', fn: apply } });
    else apply();
  });

  renderChrome();
  openPage(state.activeId);
  setSaveState('saved');
  Sync.init();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

// для автотестов
window.__plan = { get state() { return state; }, get editor() { return editor; }, Sync, parseMarkdown, blocksToMd, mergePages, sanitizeHtml, History };
})();
