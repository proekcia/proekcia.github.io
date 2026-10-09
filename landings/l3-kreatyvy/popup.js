/* Попап «Зв’язатися зараз»: відкривається з усіх кнопок, що ведуть на контакти (#cta),
   та з елементів із data-popup. Тимчасова копія попапа головного сайту. */
(function () {
  var popup = document.getElementById('popup');
  if (!popup) return;
  var html = document.documentElement;
  var lastFocus = null;
  var open = function () {
    lastFocus = document.activeElement;
    popup.classList.remove('is-sent');
    popup.classList.add('is-open');
    popup.setAttribute('aria-hidden', 'false');
    html.classList.add('popup-lock');
    setTimeout(function () { var f = popup.querySelector('input'); if (f) f.focus({ preventScroll: true }); }, 350);
  };
  var close = function () {
    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');
    html.classList.remove('popup-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  document.addEventListener('click', function (e) {
    var t = e.target.closest('a[href="#cta"], [data-popup]');
    if (!t) return;
    e.preventDefault();
    open();
  });
  popup.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', close); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && popup.classList.contains('is-open')) close(); });
  // відправка: поки без сервера — лише подяка (при перенесенні на сайт підключиться справжня форма)
  popup.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();
    popup.classList.add('is-sent');
  });
})();
