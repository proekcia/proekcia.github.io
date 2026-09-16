/* Режим коментування. Клік по кнопці → клік по елементу → текст правки.
   Коментар летить у comments.md у корені репозиторію (comment-server.py).
   Прибрати після роботи: видалити цей файл + рядок <script src="comment.js"> */
(function () {
  var on = false;
  var btn = document.createElement('button');
  btn.textContent = '💬 Коментар';
  btn.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:999999;' +
    'padding:14px 20px;border-radius:999px;border:0;background:#17181A;color:#fff;' +
    'font:600 16px system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.3)';
  btn.onclick = function (e) {
    e.stopPropagation();
    on = !on;
    btn.style.background = on ? '#FF4613' : '#17181A';
    document.documentElement.style.cursor = on ? 'crosshair' : '';
  };
  document.body.appendChild(btn);

  document.addEventListener('click', function (e) {
    if (!on || e.target === btn) return;
    e.preventDefault();
    e.stopPropagation();

    var sel = String(window.getSelection()).trim();
    var quote = sel || (e.target.innerText || e.target.textContent || '').trim();
    quote = quote.replace(/\s+/g, ' ').slice(0, 300);
    var sec = e.target.closest('[id]');

    var text = (window.prompt('Що виправити?\n\n«' + quote.slice(0, 150) + '»') || '').trim();
    if (!text) return;

    fetch('/__comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: location.pathname,
        section: sec ? sec.id : '',
        quote: quote,
        text: text
      })
    }).then(function () {
      btn.textContent = '✓ Записано';
      setTimeout(function () { btn.textContent = '💬 Коментар'; }, 1200);
    }).catch(function () {
      alert('Не записалось — сервер не запущений (comment-server.py)');
    });
  }, true);
})();
