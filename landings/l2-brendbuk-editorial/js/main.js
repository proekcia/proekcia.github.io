/* =========================================================================
   PROEKCIA · Брендбук — поведінка сторінки.
   Без залежностей. Кожен модуль самостійний: якщо його вузлів немає в DOM,
   він просто не вмикається (зручно для перенесення блоків у WordPress).
   ========================================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- 1. Шапка: фон після скролу + ховається на скрол униз ------ */
  function initHeader() {
    var header = document.getElementById('header');
    if (!header) return;
    var sidenav = document.getElementById('sidenav');
    var last = window.scrollY;
    var ticking = false;

    var update = function () {
      ticking = false;
      var y = window.scrollY;
      var delta = y - last;
      header.classList.toggle('is-stuck', y > 24);

      /* поки меню відкрите — шапка завжди на місці */
      var menuOpen = sidenav && sidenav.classList.contains('is-open');
      if (menuOpen || y <= header.offsetHeight) {
        header.classList.remove('is-hidden');
      } else if (delta > 4) {
        header.classList.add('is-hidden');      /* гортаємо вниз — ховаємо */
      } else if (delta < -4) {
        header.classList.remove('is-hidden');   /* гортаємо вгору — показуємо */
      }
      last = y;
    };

    update();
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
  }

  /* ---------- 1b. Шапка над темними секціями: інверсія ------------------ */
  function initHeaderTheme() {
    var header = document.getElementById('header');
    var nights = document.querySelectorAll('.section--night');
    var accents = document.querySelectorAll('.section--accent');
    if (!header || (!nights.length && !accents.length)) return;

    var ticking = false;
    var check = function () {
      ticking = false;
      var band = header.getBoundingClientRect().height * 0.6;
      var hit = function (list) {
        var found = false;
        list.forEach(function (s) {
          var r = s.getBoundingClientRect();
          if (r.top <= band && r.bottom >= band) found = true;
        });
        return found;
      };
      header.classList.toggle('is-over-night', hit(nights));
      header.classList.toggle('is-over-accent', hit(accents));
    };
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(check);
    };

    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  /* ---------- 2. Меню (панель #sidenav, як на сайті) --------------------- */
  function initMenu() {
    var panel = document.getElementById('sidenav');
    var burger = document.getElementById('burger');
    var close = document.getElementById('burgerClose');
    if (!panel || !burger) return;

    panel.removeAttribute('hidden');

    var setState = function (state) {
      panel.classList.toggle('is-open', state);
      burger.setAttribute('aria-expanded', String(state));
      burger.setAttribute('aria-label', state ? 'Закрити меню' : 'Відкрити меню');
      burger.classList.toggle('is-active', state);
      document.body.classList.toggle('is-locked', state);
      /* відкрите меню завжди з шапкою — інакше після закриття її не видно */
      var header = document.getElementById('header');
      if (header && state) header.classList.remove('is-hidden');
      if (state) {
        /* фокус переводимо на саму панель, а не на перше посилання (ним було
           лого) — інакше при кліку по бургеру лого обводиться помаранчевим */
        window.requestAnimationFrame(function () {
          panel.setAttribute('tabindex', '-1');
          panel.focus({ preventScroll: true });
        });
      }
    };

    burger.addEventListener('click', function () {
      setState(burger.getAttribute('aria-expanded') !== 'true');
    });
    if (close) close.addEventListener('click', function (e) {
      setState(false);
      /* фокус повертаємо на бургер лише при активації з клавіатури
         (e.detail === 0), інакше після кліку мишею він обводиться помаранчевим */
      if (e.detail === 0) burger.focus();
    });

    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setState(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) {
        setState(false);
        burger.focus();
      }
    });
  }

  /* ---------- 3. Поява блоків при скролі -------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal, .flowrow');
    if (!items.length) return;

    if (reduced.matches || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 4. Активний пункт навігації ------------------------------- */
  function initNavSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.sidenav__links a[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    links.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if (section) map[id] = a;
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute('aria-current'); });
        var active = map[entry.target.id];
        if (active) active.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  /* ---------- 5. Секція «3 шари»: липкий індекс -------------------------- */
  /* ---------- 6. Відео в кейсах: вмикаємо лише при наведенні ------------
     Коли курсор іде — відео не ховається, а ставиться на паузу: у картці
     лишається стоп-кадр. Постер показуємо тільки доти, доки відео жодного
     разу не програлося (клас .is-video додаємо після успішного play()). */
  function initCaseVideos() {
    var cases = document.querySelectorAll('.loop-item');
    if (!cases.length || reduced.matches) return;

    var canHover = window.matchMedia('(hover: hover)').matches;

    cases.forEach(function (card) {
      var video = card.querySelector('video');
      if (!video) return;

      var reveal = function () { card.classList.add('is-video'); };
      var play = function () {
        var p = video.play();
        if (p && p.then) p.then(reveal).catch(function () { /* автоплей заблоковано */ });
        else reveal();
      };
      var pause = function () { video.pause(); };   // кадр лишається на екрані

      card.addEventListener('mouseenter', play);
      card.addEventListener('mouseleave', pause);
      card.addEventListener('focusin', play);
      card.addEventListener('focusout', pause);

      // на тачі наведення немає — вмикаємо відео, коли картка в кадрі
      if (!canHover && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) play(); else pause();
          });
        }, { threshold: 0.6 }).observe(card);
      }
    });
  }

  /* ---------- 6b. Стрічка відгуків -------------------------------------- */
  function initReviews() {
    var track = document.getElementById('reviewsTrack');
    if (!track) return;

    var buttons = document.querySelectorAll('.rnav[aria-controls="reviewsTrack"]');
    var step = function () {
      var card = track.querySelector('blockquote');
      if (!card) return track.clientWidth * 0.8;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    };
    var scrollBy = function (dir) {
      track.scrollBy({
        left: step() * dir,
        behavior: reduced.matches ? 'auto' : 'smooth'
      });
    };

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { scrollBy(Number(btn.dataset.dir)); });
    });

    var sync = function () {
      var max = track.scrollWidth - track.clientWidth - 2;
      buttons.forEach(function (btn) {
        btn.disabled = (track.scrollLeft <= 2 && btn.dataset.dir === '-1') ||
                       (track.scrollLeft >= max && btn.dataset.dir === '1');
      });
    };
    sync();
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync, { passive: true });

    track.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      scrollBy(e.key === 'ArrowRight' ? 1 : -1);
    });
  }

  /* ---------- 6c. «Читати повний відгук» -------------------------------- */
  function initReviewDialog() {
    var dialog = document.getElementById('reviewDialog');
    if (!dialog || typeof dialog.showModal !== 'function') return;

    var body = dialog.querySelector('.review-dialog__body');
    var close = dialog.querySelector('.review-dialog__close');

    document.querySelectorAll('.review-more').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var src = document.getElementById(btn.dataset.full);
        if (!src) return;
        body.innerHTML =
          '<p class="review-dialog__name">' + (src.dataset.name || '') + '</p>' +
          (src.dataset.company
            ? '<p class="review-dialog__company">' + src.dataset.company + '</p>'
            : '') +
          src.innerHTML;
        dialog.showModal();
      });
    });

    close.addEventListener('click', function () { dialog.close(); });
    // клік по підкладці закриває
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) dialog.close();
    });
  }

  /* ---------- 6d. Теги кейсів: крокова прокрутка ------------------------
     На сайті це Swiper (loop + autoplay 1000ms, speed 300, пауза на
     наведенні). Тут — той самий крок без бібліотеки: раз на секунду
     зсуваємо трек на ширину першої пігулки, потім переносимо її в кінець.
     Вмикається лише там, де теги не вміщаються в картку.               */
  function initTagTickers() {
    var lists = document.querySelectorAll('.list-tags');
    if (!lists.length || reduced.matches) return;

    lists.forEach(function (list) {
      var track = list.querySelector('.list-tags__track');
      if (!track) return;
      if (track.scrollWidth <= list.clientWidth + 1) return;   // вміщається — не рухаємо

      var paused = false;
      list.addEventListener('mouseenter', function () { paused = true; });
      list.addEventListener('mouseleave', function () { paused = false; });

      var step = function () {
        if (paused || !document.body.contains(track)) return;
        var first = track.firstElementChild;
        if (!first) return;
        var next = first.nextElementSibling;
        var shift = first.getBoundingClientRect().width +
                    (next ? parseFloat(getComputedStyle(next).marginLeft) : 0);

        track.style.transition = 'transform 300ms ' + 'cubic-bezier(.22,.61,.36,1)';
        track.style.transform = 'translateX(' + (-shift) + 'px)';

        window.setTimeout(function () {
          track.style.transition = 'none';
          track.style.transform = 'translateX(0)';
          track.appendChild(first);        // перша пігулка стає останньою
          first.style.marginLeft = '';     // перекриття далі рахує CSS (.tag + .tag)
        }, 320);
      };

      window.setInterval(step, 1000);
    });
  }

  /* ---------- 6e. Попап CTA ---------------------------------------------
     Відкривається з будь-якої кнопки з атрибутом data-cta. Закриття —
     хрестик, клік по підкладці, Esc (його бере на себе <dialog>).
     ВІДПРАВКА: form[data-endpoint] порожній — заявка нікуди не йде.
     Підставте URL (WP admin-ajax / CRM / бот) — і форма почне слати POST. */
  function initCtaModal() {
    var dialog = document.getElementById('ctaModal');
    if (!dialog || typeof dialog.showModal !== 'function') return;

    var form = dialog.querySelector('#ctaForm');
    var done = dialog.querySelector('.cta-modal__done');
    var lastTrigger = null;

    var open = function (trigger) {
      lastTrigger = trigger || null;
      dialog.classList.remove('is-closing');
      // повертаємо форму у вихідний стан, якщо попап уже відправляли
      if (form && form.hidden) {
        form.hidden = false;
        form.reset();
        form.querySelectorAll('.form-group.has-error')
            .forEach(function (g) { g.classList.remove('has-error'); });
        if (done) done.hidden = true;
      }
      dialog.showModal();
      document.body.classList.add('is-locked');
      var first = dialog.querySelector('input');
      if (first) window.requestAnimationFrame(function () { first.focus(); });
    };

    var close = function () {
      if (reduced.matches) { dialog.close(); return; }
      dialog.classList.add('is-closing');
      window.setTimeout(function () {
        dialog.classList.remove('is-closing');
        dialog.close();
      }, 450);
    };

    dialog.addEventListener('close', function () {
      document.body.classList.remove('is-locked');
      if (lastTrigger) lastTrigger.focus();
    });

    document.querySelectorAll('[data-cta]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var panel = document.getElementById('sidenav');
        if (panel && panel.classList.contains('is-open')) {
          panel.classList.remove('is-open');
          var burger = document.getElementById('burger');
          if (burger) {
            burger.setAttribute('aria-expanded', 'false');
            burger.classList.remove('is-active');
          }
        }
        open(btn);
      });
    });

    dialog.querySelectorAll('[data-cta-close]').forEach(function (btn) {
      btn.addEventListener('click', close);
    });

    // клік по підкладці (поза полотном) закриває
    dialog.addEventListener('click', function (e) {
      var box = dialog.getBoundingClientRect();
      var inside = e.clientX >= box.left && e.clientX <= box.right &&
                   e.clientY >= box.top && e.clientY <= box.bottom;
      if (!inside) close();
    });

    // Esc: даємо <dialog> закритись, але з анімацією
    dialog.addEventListener('cancel', function (e) {
      if (reduced.matches) return;
      e.preventDefault();
      close();
    });

    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var ok = true;
      form.querySelectorAll('[required]').forEach(function (field) {
        var group = field.closest('.form-group');
        var valid = field.value.trim().length > 1;
        if (group) group.classList.toggle('has-error', !valid);
        if (!valid && ok) { field.focus(); ok = false; }
      });
      if (!ok) return;

      var endpoint = form.dataset.endpoint;
      var showDone = function () {
        form.hidden = true;
        if (done) done.hidden = false;
      };

      if (!endpoint) { showDone(); return; }   // демо-режим: адресу ще не задано

      var btn = form.querySelector('.cta-form__submit');
      if (btn) btn.disabled = true;
      fetch(endpoint, { method: 'POST', body: new FormData(form) })
        .then(showDone)
        .catch(showDone)
        .then(function () { if (btn) btn.disabled = false; });
    });

    form.querySelectorAll('input,textarea').forEach(function (field) {
      field.addEventListener('input', function () {
        var group = field.closest('.form-group');
        if (group) group.classList.remove('has-error');
      });
    });
  }

  /* ---------- 7. Дрібниці ----------------------------------------------- */
  function initMisc() {
    var year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function init() {
    initHeader();
    initHeaderTheme();
    initMenu();
    initReveal();
    initNavSpy();
    initCaseVideos();
    initReviews();
    initReviewDialog();
    initTagTickers();
    initCtaModal();
    initMisc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
