/* ============================================================================
   РЕЖИМ КОМЕНТУВАННЯ — тимчасовий інструмент для збору правок від клієнта й
   команди прямо на живому лендінгу. Працює повністю локально (без сервера,
   без сторонніх сервісів): усе зберігається в localStorage ТОГО браузера, де
   лишили коментар. Автор сам натискає «Забрати» і надсилає текст ведучому
   розробнику (Claude Code) в чат.

   ПРИБРАТИ ПІСЛЯ РОБОТИ: видалити цей файл і один рядок
   <script src="comments-widget.js"></script> з index.html. Більше ніде
   нічого не займано.

   Формат зберігання: JSONL (один JSON-об'єкт на рядок) у localStorage під
   ключем STORAGE_KEY — рядок за рядком, щоб одна побита строка не валила
   читання решти (кожен рядок парситься в try/catch окремо).
   ============================================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'proekcia_comments_v1';
  var NAME_KEY = 'proekcia_commenter_name';
  var WIDGET_CLASS = 'pc-widget-root';
  var MAX_TEXT_LEN = 2000;
  var MAX_NAME_LEN = 80;
  var MAX_QUOTE_LEN = 300;
  var MAX_CONTEXT_RADIUS = 100; // з кожного боку цитати, разом ~200

  /* ---------------------------- утиліти ---------------------------- */

  function normalizeWs(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
  }

  function truncate(s, n) {
    s = s || '';
    return s.length > n ? s.slice(0, n) : s;
  }

  function uid() {
    return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function getBuildStamp() {
    var m = document.querySelector('meta[name="build"]');
    return m ? m.getAttribute('content') : 'unknown';
  }

  function getPageKey() {
    return location.pathname;
  }

  /* ------------------------- сховище (JSONL) ------------------------ */
  // Повертає {list, brokenCount} — побиті рядки пропускаються, а не валять
  // читання решти (вимога з ТЗ).
  function readAllRaw() {
    var raw = '';
    try {
      raw = localStorage.getItem(STORAGE_KEY) || '';
    } catch (e) {
      return { list: [], brokenCount: 0 };
    }
    if (!raw) return { list: [], brokenCount: 0 };
    var lines = raw.split('\n');
    var list = [];
    var brokenCount = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line || !line.trim()) continue;
      try {
        var obj = JSON.parse(line);
        if (obj && typeof obj === 'object' && obj.id) {
          list.push(obj);
        } else {
          brokenCount++;
        }
      } catch (e) {
        brokenCount++;
      }
    }
    return { list: list, brokenCount: brokenCount };
  }

  function writeAllRaw(list) {
    var lines = list.map(function (c) {
      try {
        return JSON.stringify(c);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    try {
      localStorage.setItem(STORAGE_KEY, lines.join('\n'));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getCommentsForThisPage() {
    var all = readAllRaw();
    return {
      list: all.list.filter(function (c) { return c.page === getPageKey(); }),
      brokenCount: all.brokenCount
    };
  }

  function appendComment(comment) {
    var all = readAllRaw();
    all.list.push(comment);
    return writeAllRaw(all.list);
  }

  function updateComment(id, patch) {
    var all = readAllRaw();
    var found = false;
    var list = all.list.map(function (c) {
      if (c.id === id) {
        found = true;
        return Object.assign({}, c, patch);
      }
      return c;
    });
    if (found) writeAllRaw(list);
    return found;
  }

  function deleteComment(id) {
    var all = readAllRaw();
    var before = all.list.length;
    var list = all.list.filter(function (c) { return c.id !== id; });
    if (list.length !== before) {
      writeAllRaw(list);
      return true;
    }
    return false;
  }

  /* ---------------------------- ім'я автора -------------------------- */

  function getStoredName() {
    try {
      return localStorage.getItem(NAME_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function storeName(name) {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch (e) { /* ignore */ }
  }

  /* ------------------------- прив'язка (якорі) ----------------------- */

  function nearestIdAncestor(el) {
    var cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body) {
      if (cur.id) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  function cssPath(el) {
    if (!(el instanceof Element)) return '';
    var path = [];
    var cur = el;
    var depth = 0;
    while (cur && cur.nodeType === 1 && cur !== document.body && depth < 12) {
      var selector = cur.nodeName.toLowerCase();
      if (cur.id) {
        selector += '#' + cur.id;
        path.unshift(selector);
        break;
      } else {
        var sib = cur;
        var nth = 1;
        while ((sib = sib.previousElementSibling)) {
          if (sib.nodeName === cur.nodeName) nth++;
        }
        selector += ':nth-of-type(' + nth + ')';
      }
      path.unshift(selector);
      cur = cur.parentElement;
      depth++;
    }
    return path.join(' > ');
  }

  function getQuoteAndContext(el, selectionText) {
    var quote = selectionText && normalizeWs(selectionText)
      ? normalizeWs(selectionText)
      : normalizeWs(el.innerText || el.textContent || '');
    quote = truncate(quote, MAX_QUOTE_LEN);

    var container = el.closest('section, article, header, footer, .container') || el.parentElement || el;
    var full = normalizeWs(container.innerText || container.textContent || '');
    var idx = quote ? full.indexOf(quote) : -1;
    var context;
    if (idx !== -1) {
      var start = Math.max(0, idx - MAX_CONTEXT_RADIUS);
      var end = Math.min(full.length, idx + quote.length + MAX_CONTEXT_RADIUS);
      context = full.slice(start, end);
    } else {
      context = quote;
    }
    return { quote: quote, context: truncate(context, MAX_QUOTE_LEN + MAX_CONTEXT_RADIUS * 2) };
  }

  function buildAnchor(el, selectionText, clickX, clickY) {
    var idEl = nearestIdAncestor(el);
    var qc = getQuoteAndContext(el, selectionText);
    var rectEl = el.getBoundingClientRect();
    var offsetXPct = rectEl.width ? Math.min(100, Math.max(0, ((clickX - rectEl.left) / rectEl.width) * 100)) : 50;
    var offsetYPct = rectEl.height ? Math.min(100, Math.max(0, ((clickY - rectEl.top) / rectEl.height) * 100)) : 50;
    return {
      id: idEl ? idEl.id : null,
      quote: qc.quote,
      context: qc.context,
      path: cssPath(el),
      offsetXPct: offsetXPct,
      offsetYPct: offsetYPct
    };
  }

  // Пошук елемента за текстом — найменший елемент, чий видимий текст
  // містить потрібний фрагмент (найточніше накриття).
  // ВАЖЛИВО: беремо innerText (візуальний порядок, як бачить людина), а не
  // textContent (сирий DOM-порядок) — інакше цитата, записана через
  // innerText в getQuoteAndContext, не збігається з пошуком для елементів,
  // де CSS змінює візуальний порядок відносно DOM (виявлено тестом на
  // hero-заголовку: підпис у дужках стоїть в DOM між рядками заголовка).
  function findElementByText(needle) {
    needle = normalizeWs(needle);
    if (!needle) return null;
    var all = document.body.querySelectorAll('*');
    var best = null;
    var bestLen = Infinity;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.closest('.' + WIDGET_CLASS)) continue;
      var t = normalizeWs(el.innerText || el.textContent || '');
      if (t && t.indexOf(needle) !== -1) {
        var len = t.length;
        if (len < bestLen) {
          best = el;
          bestLen = len;
        }
      }
    }
    return best;
  }

  // Пошук цілі при відкритті: id → цитата (+контекст) → CSS-шлях.
  // Повертає {el, method} або null, якщо ціль «зникла».
  function locateTarget(anchor) {
    if (anchor.id) {
      var byId = document.getElementById(anchor.id);
      if (byId) return { el: byId, method: 'id' };
    }
    if (anchor.quote) {
      var byQuote = findElementByText(anchor.quote);
      if (byQuote) return { el: byQuote, method: 'quote' };
    }
    if (anchor.context && anchor.context !== anchor.quote) {
      var byContext = findElementByText(anchor.context);
      if (byContext) return { el: byContext, method: 'context' };
    }
    if (anchor.path) {
      try {
        var byPath = document.querySelector(anchor.path);
        if (byPath) return { el: byPath, method: 'path' };
      } catch (e) { /* invalid selector after markup changes — ignore */ }
    }
    return null;
  }

  /* ------------------------------- стилі ----------------------------- */

  var STYLE = '\
.' + WIDGET_CLASS + ' * { box-sizing: border-box; }\
.pc-fab-stack { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; font-family: Arial, Helvetica, sans-serif; }\
.pc-fab { display: flex; align-items: center; gap: 8px; padding: 14px 18px; border-radius: 999px; border: none; background: #17181A; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,.25); min-height: 48px; }\
.pc-fab.is-active { background: #FF4613; }\
.pc-fab-list { background: #fff; color: #17181A; border: 1px solid rgba(0,0,0,.15); font-weight: 600; }\
.pc-badge { background: #FF4613; color: #fff; border-radius: 999px; font-size: 12px; padding: 1px 7px; min-width: 18px; text-align: center; }\
html.pc-mode-on, html.pc-mode-on body { cursor: crosshair !important; }\
.pc-pin { position: absolute; width: 28px; height: 28px; border-radius: 50%; background: #FF4613; color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2147482900; box-shadow: 0 2px 8px rgba(0,0,0,.35); border: 2px solid #fff; transform: translate(-50%, -50%); font-family: Arial, sans-serif; }\
.pc-pin.is-done { background: #9AA3AF; }\
.pc-pin.is-missing { background: #C0392B; }\
.pc-composer { position: absolute; z-index: 2147483100; background: #fff; border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,.3); padding: 16px; width: min(340px, 88vw); font-family: Arial, sans-serif; }\
.pc-composer label { display: block; font-size: 13px; color: #555; margin-bottom: 6px; }\
.pc-composer input[type=text], .pc-composer textarea { width: 100%; font-size: 16px; padding: 10px 12px; border: 1px solid rgba(0,0,0,.2); border-radius: 8px; font-family: inherit; margin-bottom: 10px; resize: vertical; }\
.pc-composer textarea { min-height: 80px; }\
.pc-composer .pc-quote-preview { font-size: 13px; color: #666; background: #F4F5F7; border-left: 3px solid #FF4613; padding: 8px 10px; margin-bottom: 10px; max-height: 70px; overflow: auto; }\
.pc-composer .pc-row { display: flex; gap: 8px; justify-content: flex-end; }\
.pc-btn { padding: 10px 16px; border-radius: 8px; border: none; font-size: 15px; font-weight: 600; cursor: pointer; min-height: 44px; }\
.pc-btn-primary { background: #FF4613; color: #fff; }\
.pc-btn-secondary { background: #EEE; color: #333; }\
.pc-error { color: #C0392B; font-size: 13px; margin: -4px 0 10px; }\
.pc-panel-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.3); z-index: 2147483200; }\
.pc-panel { position: fixed; top: 0; right: 0; bottom: 0; width: min(420px, 92vw); background: #fff; z-index: 2147483201; box-shadow: -10px 0 30px rgba(0,0,0,.3); display: flex; flex-direction: column; font-family: Arial, sans-serif; }\
.pc-panel-head { padding: 16px; border-bottom: 1px solid rgba(0,0,0,.1); display: flex; justify-content: space-between; align-items: center; }\
.pc-panel-head h3 { margin: 0; font-size: 17px; }\
.pc-panel-close { background: none; border: none; font-size: 22px; cursor: pointer; min-width: 44px; min-height: 44px; }\
.pc-panel-body { flex: 1; overflow-y: auto; padding: 12px 16px; }\
.pc-item { border: 1px solid rgba(0,0,0,.12); border-radius: 10px; padding: 12px; margin-bottom: 10px; }\
.pc-item .pc-quote { font-size: 13px; color: #666; background: #F4F5F7; border-left: 3px solid #ccc; padding: 6px 8px; margin: 6px 0; }\
.pc-item .pc-meta { font-size: 12px; color: #888; margin-top: 6px; }\
.pc-status { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; margin-right: 6px; }\
.pc-status-new { background: #E8ECF1; color: #333; }\
.pc-status-accepted { background: #FFE9B8; color: #7A5200; }\
.pc-status-done { background: #D8F0DD; color: #1F6B33; }\
.pc-status-rejected { background: #FADADA; color: #8A2020; }\
.pc-panel-section { border-top: 1px solid rgba(0,0,0,.1); padding: 14px 16px; }\
.pc-panel-section h4 { margin: 0 0 8px; font-size: 14px; }\
.pc-panel-section textarea { width: 100%; font-size: 16px; padding: 8px; border-radius: 8px; border: 1px solid rgba(0,0,0,.2); min-height: 100px; font-family: inherit; }\
.pc-hint { font-size: 12px; color: #888; margin-top: 6px; }\
@media (max-width: 480px) { .pc-fab span.pc-fab-text { display: none; } .pc-fab { padding: 14px; } }\
';

  function injectStyle() {
    var s = document.createElement('style');
    s.className = WIDGET_CLASS;
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  /* ------------------------------- стан ------------------------------ */

  var state = {
    modeOn: false,
    pendingClick: null // {el, x, y, selectionText} поки відкритий composer
  };

  var els = {}; // кеш DOM-вузлів віджета

  /* -------------------------- ім'я (composer) ------------------------- */

  function ensureName(onReady) {
    var existing = getStoredName();
    if (existing) return onReady(existing);
    var overlay = document.createElement('div');
    overlay.className = WIDGET_CLASS + ' pc-panel-backdrop';
    var box = document.createElement('div');
    box.className = 'pc-composer';
    box.style.left = '50%';
    box.style.top = '50%';
    box.style.transform = 'translate(-50%, -50%)';
    box.style.position = 'fixed';

    var label = document.createElement('label');
    label.textContent = "Як вас звати? (запитаємо один раз)";
    var input = document.createElement('input');
    input.type = 'text';
    input.maxLength = MAX_NAME_LEN;
    input.placeholder = "Ваше ім'я";

    var err = document.createElement('div');
    err.className = 'pc-error';
    err.style.display = 'none';

    var row = document.createElement('div');
    row.className = 'pc-row';
    var okBtn = document.createElement('button');
    okBtn.className = 'pc-btn pc-btn-primary';
    okBtn.textContent = 'Продовжити';
    row.appendChild(okBtn);

    box.appendChild(label);
    box.appendChild(input);
    box.appendChild(err);
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    input.focus();

    function submit() {
      var v = normalizeWs(input.value);
      if (!v) {
        err.textContent = "Введіть ім'я — без нього коментар зберегти не можна.";
        err.style.display = 'block';
        return;
      }
      v = truncate(v, MAX_NAME_LEN);
      storeName(v);
      document.body.removeChild(overlay);
      onReady(v);
    }
    okBtn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submit();
    });
  }

  /* ------------------------------ composer ---------------------------- */

  function openComposer(target, clientX, clientY, selectionText) {
    closeComposer();
    ensureName(function (author) {
      var anchor = buildAnchor(target, selectionText, clientX, clientY);

      var box = document.createElement('div');
      box.className = WIDGET_CLASS + ' pc-composer';
      var left = Math.min(clientX + 12, window.innerWidth - 356);
      var top = Math.min(clientY + 12, window.innerHeight - 260);
      box.style.left = Math.max(8, left) + 'px';
      box.style.top = Math.max(8, top) + 'px';

      var quotePrev = document.createElement('div');
      quotePrev.className = 'pc-quote-preview';
      quotePrev.textContent = anchor.quote ? ('«' + anchor.quote + '»') : '(елемент без тексту)';

      var textarea = document.createElement('textarea');
      textarea.maxLength = MAX_TEXT_LEN;
      textarea.placeholder = 'Що виправити?';

      var err = document.createElement('div');
      err.className = 'pc-error';
      err.style.display = 'none';

      var row = document.createElement('div');
      row.className = 'pc-row';
      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'pc-btn pc-btn-secondary';
      cancelBtn.textContent = 'Скасувати';
      var saveBtn = document.createElement('button');
      saveBtn.className = 'pc-btn pc-btn-primary';
      saveBtn.textContent = 'Зберегти';
      row.appendChild(cancelBtn);
      row.appendChild(saveBtn);

      box.appendChild(quotePrev);
      box.appendChild(textarea);
      box.appendChild(err);
      box.appendChild(row);
      document.body.appendChild(box);
      els.composer = box;
      textarea.focus();

      cancelBtn.addEventListener('click', closeComposer);
      saveBtn.addEventListener('click', function () {
        var text = normalizeWs(textarea.value);
        if (!text) {
          err.textContent = 'Порожній коментар не зберігається — напишіть, що саме виправити.';
          err.style.display = 'block';
          return;
        }
        var comment = {
          id: uid(),
          page: getPageKey(),
          build: getBuildStamp(),
          createdAt: new Date().toISOString(),
          author: author,
          text: truncate(text, MAX_TEXT_LEN),
          anchor: anchor,
          status: 'new',
          reply: ''
        };
        appendComment(comment);
        closeComposer();
        renderPins();
      });
    });
  }

  function closeComposer() {
    if (els.composer && els.composer.parentNode) {
      els.composer.parentNode.removeChild(els.composer);
    }
    els.composer = null;
  }

  /* -------------------------------- піни ------------------------------- */

  function clearPins() {
    document.querySelectorAll('.' + WIDGET_CLASS + '.pc-pin').forEach(function (p) {
      p.parentNode.removeChild(p);
    });
  }

  function statusPinClass(status) {
    if (status === 'done' || status === 'rejected') return 'is-done';
    return '';
  }

  function renderPins() {
    clearPins();
    var data = getCommentsForThisPage();
    data.list.forEach(function (c) {
      var located = locateTarget(c.anchor);
      var pin = document.createElement('div');
      pin.className = WIDGET_CLASS + ' pc-pin ' + statusPinClass(c.status);
      pin.textContent = (c.author || '?').trim().charAt(0).toUpperCase();
      pin.title = c.text;

      if (!located) {
        pin.classList.add('is-missing');
        pin.style.left = '24px';
        pin.style.top = (24 + 36 * missingCounter()) + 'px';
        pin.style.position = 'fixed';
      } else {
        var rect = located.el.getBoundingClientRect();
        var x = rect.left + window.scrollX + (c.anchor.offsetXPct / 100) * rect.width;
        var y = rect.top + window.scrollY + (c.anchor.offsetYPct / 100) * rect.height;
        pin.style.left = x + 'px';
        pin.style.top = y + 'px';
      }
      pin.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openThread(c);
      });
      document.body.appendChild(pin);
    });
  }

  var _missingCounter = 0;
  function missingCounter() {
    return _missingCounter++;
  }

  /* ------------------------------ тред пін-а ---------------------------- */

  function statusLabel(status) {
    return { new: 'Нове', accepted: 'Прийнято', done: 'Зроблено', rejected: 'Відхилено' }[status] || status;
  }

  function openThread(comment) {
    var overlay = document.createElement('div');
    overlay.className = WIDGET_CLASS + ' pc-panel-backdrop';
    var box = document.createElement('div');
    box.className = 'pc-composer';
    box.style.position = 'fixed';
    box.style.left = '50%';
    box.style.top = '50%';
    box.style.transform = 'translate(-50%, -50%)';

    var statusEl = document.createElement('span');
    statusEl.className = 'pc-status pc-status-' + comment.status;
    statusEl.textContent = statusLabel(comment.status);

    var meta = document.createElement('div');
    meta.className = 'pc-hint';
    meta.textContent = comment.author + ' · ' + new Date(comment.createdAt).toLocaleString('uk-UA') + ' · збірка ' + comment.build;

    var quote = document.createElement('div');
    quote.className = 'pc-quote-preview';
    quote.textContent = comment.anchor.quote ? ('«' + comment.anchor.quote + '»') : '(без цитати)';

    var text = document.createElement('div');
    text.style.margin = '10px 0';
    text.textContent = comment.text;

    var replyBox = document.createElement('div');
    if (comment.reply) {
      var replyLabel = document.createElement('div');
      replyLabel.className = 'pc-hint';
      replyLabel.textContent = 'Відповідь:';
      var replyText = document.createElement('div');
      replyText.style.fontWeight = '600';
      replyText.textContent = comment.reply;
      replyBox.appendChild(replyLabel);
      replyBox.appendChild(replyText);
    }

    var closeBtn = document.createElement('button');
    closeBtn.className = 'pc-btn pc-btn-secondary';
    closeBtn.textContent = 'Закрити';
    closeBtn.addEventListener('click', function () {
      document.body.removeChild(overlay);
    });

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'pc-btn pc-btn-secondary';
    deleteBtn.style.color = '#C0392B';
    deleteBtn.textContent = 'Видалити';
    deleteBtn.addEventListener('click', function () {
      if (deleteBtn.dataset.confirm === '1') {
        deleteComment(comment.id);
        document.body.removeChild(overlay);
        renderPins();
        refreshBadge();
      } else {
        deleteBtn.dataset.confirm = '1';
        deleteBtn.textContent = 'Точно видалити?';
      }
    });

    box.appendChild(statusEl);
    box.appendChild(meta);
    box.appendChild(quote);
    box.appendChild(text);
    box.appendChild(replyBox);
    var row = document.createElement('div');
    row.className = 'pc-row';
    row.style.marginTop = '10px';
    row.appendChild(deleteBtn);
    row.appendChild(closeBtn);
    box.appendChild(row);

    overlay.appendChild(box);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
    document.body.appendChild(overlay);
  }

  /* --------------------------- перехоплення кліків ------------------------- */

  function isOwnUi(el) {
    return !!(el && el.closest && el.closest('.' + WIDGET_CLASS));
  }

  function onDocMouseUp(e) {
    if (!state.modeOn) return;
    if (isOwnUi(e.target)) return;
    var sel = window.getSelection();
    var selectionText = sel && !sel.isCollapsed ? sel.toString() : '';
    var target = e.target;
    if (target.nodeType !== 1) target = target.parentElement;
    if (!target) return;
    openComposer(target, e.clientX, e.clientY, selectionText);
  }

  function onDocClickCapture(e) {
    if (!state.modeOn) return;
    if (isOwnUi(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function setMode(on) {
    state.modeOn = on;
    document.documentElement.classList.toggle('pc-mode-on', on);
    els.fabToggle.classList.toggle('is-active', on);
    els.fabToggle.querySelector('.pc-fab-text').textContent = on ? 'Вимкнути' : 'Коментувати';
    if (!on) closeComposer();
  }

  /* -------------------------------- панель --------------------------------- */

  function formatExport() {
    var data = getCommentsForThisPage();
    if (data.list.length === 0) {
      return 'Коментарів немає (0).';
    }
    var byBlock = {};
    var order = [];
    data.list.forEach(function (c) {
      var key = c.anchor.id || '(без id)';
      if (!byBlock[key]) {
        byBlock[key] = [];
        order.push(key);
      }
      byBlock[key].push(c);
    });
    var lines = [];
    order.forEach(function (key) {
      lines.push('━━━ Секція: #' + key + ' ━━━');
      byBlock[key].forEach(function (c, i) {
        var located = locateTarget(c.anchor);
        lines.push(
          (i + 1) + '. [' + statusLabel(c.status) + '] ' + c.author + ', ' +
          new Date(c.createdAt).toLocaleString('uk-UA') + ' · збірка ' + c.build +
          (located ? '' : '  ⚠️ елемент зник')
        );
        lines.push('   Де: "' + c.anchor.quote + '"');
        lines.push('   Коментар: ' + c.text);
        if (c.reply) lines.push('   Відповідь: ' + c.reply);
        lines.push('   id: ' + c.id);
        lines.push('');
      });
    });
    return lines.join('\n').trim();
  }

  function applyStatusUpdates(raw) {
    // Формат рядка: "id: c_xxx status: done reply: текст відповіді"
    // Простий, стійкий до дрібних відхилень парсер.
    var updated = 0;
    var lines = raw.split('\n');
    lines.forEach(function (line) {
      var idMatch = line.match(/id:\s*(\S+)/);
      if (!idMatch) return;
      var id = idMatch[1];
      var statusMatch = line.match(/status:\s*(new|accepted|done|rejected)/i);
      var replyMatch = line.match(/reply:\s*(.+)$/i);
      var patch = {};
      if (statusMatch) patch.status = statusMatch[1].toLowerCase();
      if (replyMatch) patch.reply = truncate(normalizeWs(replyMatch[1]), MAX_TEXT_LEN);
      if (Object.keys(patch).length && updateComment(id, patch)) updated++;
    });
    return updated;
  }

  function openPanel() {
    var overlay = document.createElement('div');
    overlay.className = WIDGET_CLASS + ' pc-panel-backdrop';
    var panel = document.createElement('div');
    panel.className = 'pc-panel';

    var head = document.createElement('div');
    head.className = 'pc-panel-head';
    var data = getCommentsForThisPage();
    var h3 = document.createElement('h3');
    h3.textContent = 'Мої коментарі (' + data.list.length + ')';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'pc-panel-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', function () {
      document.body.removeChild(overlay);
    });
    head.appendChild(h3);
    head.appendChild(closeBtn);

    var body = document.createElement('div');
    body.className = 'pc-panel-body';

    if (data.brokenCount > 0) {
      var warn = document.createElement('div');
      warn.className = 'pc-hint';
      warn.style.color = '#C0392B';
      warn.textContent = 'Побитих рядків у сховищі пропущено: ' + data.brokenCount + ' (решта коментарів прочитані нормально).';
      body.appendChild(warn);
    }

    if (data.list.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'pc-hint';
      empty.textContent = 'Коментарів немає (0).';
      body.appendChild(empty);
    } else {
      data.list.forEach(function (c) {
        var located = locateTarget(c.anchor);
        var item = document.createElement('div');
        item.className = 'pc-item';

        var statusEl = document.createElement('span');
        statusEl.className = 'pc-status pc-status-' + c.status;
        statusEl.textContent = statusLabel(c.status);
        item.appendChild(statusEl);
        if (!located) {
          var missing = document.createElement('span');
          missing.textContent = '⚠️ елемент зник';
          missing.style.color = '#C0392B';
          missing.style.fontSize = '12px';
          item.appendChild(missing);
        }

        var quote = document.createElement('div');
        quote.className = 'pc-quote';
        quote.textContent = '«' + c.anchor.quote + '»';
        item.appendChild(quote);

        var text = document.createElement('div');
        text.textContent = c.text;
        item.appendChild(text);

        if (c.reply) {
          var reply = document.createElement('div');
          reply.className = 'pc-hint';
          reply.textContent = 'Відповідь: ' + c.reply;
          item.appendChild(reply);
        }

        var meta = document.createElement('div');
        meta.className = 'pc-meta';
        meta.textContent = c.author + ' · ' + new Date(c.createdAt).toLocaleString('uk-UA') + ' · збірка ' + c.build;
        item.appendChild(meta);

        var itemDeleteBtn = document.createElement('button');
        itemDeleteBtn.className = 'pc-btn pc-btn-secondary';
        itemDeleteBtn.style.color = '#C0392B';
        itemDeleteBtn.style.marginTop = '8px';
        itemDeleteBtn.style.minHeight = '36px';
        itemDeleteBtn.style.padding = '6px 12px';
        itemDeleteBtn.style.fontSize = '13px';
        itemDeleteBtn.textContent = 'Видалити';
        itemDeleteBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (itemDeleteBtn.dataset.confirm === '1') {
            deleteComment(c.id);
            document.body.removeChild(overlay);
            renderPins();
            refreshBadge();
            openPanel();
          } else {
            itemDeleteBtn.dataset.confirm = '1';
            itemDeleteBtn.textContent = 'Точно видалити?';
          }
        });
        item.appendChild(itemDeleteBtn);

        item.addEventListener('click', function () {
          if (located) {
            document.body.removeChild(overlay);
            located.el.scrollIntoView({ block: 'center' });
          }
        });
        body.appendChild(item);
      });
    }

    var exportSection = document.createElement('div');
    exportSection.className = 'pc-panel-section';
    var exportTitle = document.createElement('h4');
    exportTitle.textContent = 'Забрати до роботи';
    var exportArea = document.createElement('textarea');
    exportArea.readOnly = true;
    exportArea.value = formatExport();
    var copyBtn = document.createElement('button');
    copyBtn.className = 'pc-btn pc-btn-primary';
    copyBtn.style.marginTop = '8px';
    copyBtn.textContent = 'Скопіювати';
    copyBtn.addEventListener('click', function () {
      exportArea.select();
      var copied = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(exportArea.value).then(function () {
          copyBtn.textContent = 'Скопійовано ✓';
        }).catch(function () {
          try { document.execCommand('copy'); copyBtn.textContent = 'Скопійовано ✓'; } catch (e) { copied = false; }
        });
      } else {
        try { document.execCommand('copy'); copyBtn.textContent = 'Скопійовано ✓'; } catch (e) { copied = false; }
      }
    });
    exportSection.appendChild(exportTitle);
    exportSection.appendChild(exportArea);
    exportSection.appendChild(copyBtn);
    var exportHint = document.createElement('div');
    exportHint.className = 'pc-hint';
    exportHint.textContent = 'Скопіюй і надішли цей текст у чат.';
    exportSection.appendChild(exportHint);

    var importSection = document.createElement('div');
    importSection.className = 'pc-panel-section';
    var importTitle = document.createElement('h4');
    importTitle.textContent = 'Вставити відповідь (статуси)';
    var importArea = document.createElement('textarea');
    importArea.placeholder = 'Встав сюди текст зі статусами, який тобі надіслали';
    var importBtn = document.createElement('button');
    importBtn.className = 'pc-btn pc-btn-secondary';
    importBtn.style.marginTop = '8px';
    importBtn.textContent = 'Застосувати';
    var importResult = document.createElement('div');
    importResult.className = 'pc-hint';
    importBtn.addEventListener('click', function () {
      var n = applyStatusUpdates(importArea.value);
      importResult.textContent = 'Оновлено коментарів: ' + n + '.';
      renderPins();
    });
    importSection.appendChild(importTitle);
    importSection.appendChild(importArea);
    importSection.appendChild(importBtn);
    importSection.appendChild(importResult);

    panel.appendChild(head);
    panel.appendChild(body);
    panel.appendChild(exportSection);
    panel.appendChild(importSection);
    overlay.appendChild(panel);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
    document.body.appendChild(overlay);
  }

  /* ------------------------------- FAB-кнопки -------------------------------- */

  function buildFab() {
    var stack = document.createElement('div');
    stack.className = WIDGET_CLASS + ' pc-fab-stack';

    var listBtn = document.createElement('button');
    listBtn.className = 'pc-fab pc-fab-list';
    var data = getCommentsForThisPage();
    listBtn.innerHTML = '';
    var listIcon = document.createElement('span');
    listIcon.textContent = '📋';
    var listCount = document.createElement('span');
    listCount.className = 'pc-badge';
    listCount.textContent = String(data.list.length);
    listBtn.appendChild(listIcon);
    listBtn.appendChild(listCount);
    listBtn.addEventListener('click', openPanel);
    els.listBtn = listBtn;
    els.listCount = listCount;

    var toggleBtn = document.createElement('button');
    toggleBtn.className = 'pc-fab';
    var icon = document.createElement('span');
    icon.textContent = '💬';
    var text = document.createElement('span');
    text.className = 'pc-fab-text';
    text.textContent = 'Коментувати';
    toggleBtn.appendChild(icon);
    toggleBtn.appendChild(text);
    toggleBtn.addEventListener('click', function () {
      setMode(!state.modeOn);
    });
    els.fabToggle = toggleBtn;

    stack.appendChild(listBtn);
    stack.appendChild(toggleBtn);
    document.body.appendChild(stack);
  }

  function refreshBadge() {
    if (els.listCount) {
      els.listCount.textContent = String(getCommentsForThisPage().list.length);
    }
  }

  /* -------------------------------- запуск ----------------------------------- */

  function init() {
    injectStyle();
    buildFab();
    renderPins();
    document.addEventListener('mouseup', onDocMouseUp, true);
    document.addEventListener('click', onDocClickCapture, true);
    window.addEventListener('resize', function () {
      renderPins();
    });
    var origAppend = appendComment;
    appendComment = function (c) {
      var ok = origAppend(c);
      refreshBadge();
      return ok;
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Публічний доступ для самоперевірок/діагностики з консолі.
  window.__proekciaComments = {
    readAllRaw: readAllRaw,
    writeAllRaw: writeAllRaw,
    getCommentsForThisPage: getCommentsForThisPage,
    locateTarget: locateTarget,
    formatExport: formatExport,
    applyStatusUpdates: applyStatusUpdates,
    STORAGE_KEY: STORAGE_KEY
  };
})();
