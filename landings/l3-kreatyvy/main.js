/* Proekcia — лендинг «Рекламні креативи»: анімації.
   Залежності: GSAP + ScrollTrigger (cdnjs). Якщо їх немає або користувач
   просить зменшити рух — сторінка просто показується без анімацій. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var hero = document.querySelector('.hero');
  var title = document.querySelector('.hero__title');

  /* ---------- шапка: ховається, коли гортаєш униз, і з’являється, щойно гортаєш угору ----------
     Після першого екрана — компактна на темній підкладці. */
  var siteHeader = document.getElementById('siteHeader');
  if (siteHeader) {
    var lastY = window.scrollY, hdrRaf = 0;
    var onHdr = function () {
      hdrRaf = 0;
      var y = window.scrollY, dy = y - lastY;
      siteHeader.classList.toggle('is-scrolled', y > 40);
      if (y < 80) siteHeader.classList.remove('is-hidden');          // на самому верху — завжди видна
      else if (dy > 6) siteHeader.classList.add('is-hidden');        // униз — ховаємо
      else if (dy < -6) siteHeader.classList.remove('is-hidden');    // угору — показуємо
      if (Math.abs(dy) > 6) lastY = y;
    };
    window.addEventListener('scroll', function () { if (!hdrRaf) hdrRaf = requestAnimationFrame(onHdr); }, { passive: true });
    onHdr();
  }

  /* ---------- кнопки: заливка росте від точки курсора ---------- */
  document.querySelectorAll('.pill-btn').forEach(function (btn) {
    btn.addEventListener('pointerenter', setOrigin);
    btn.addEventListener('pointerleave', setOrigin);
    function setOrigin(e) {
      var r = btn.getBoundingClientRect();
      btn.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      btn.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }
  });

  /* ---------- відео героя: шум → екран тріскається ----------
     Ролик 3,75 с грає ОДИН раз, без звуку, і зупиняється на останньому
     кадрі — білому тріснутому екрані. Стартує разом з появою заголовка. Тріск — на 1,5 с. */
  var video = document.getElementById('heroVideo');
  var CRACK = 1.5;
  var hv = { onCrack: [], start: function () {}, fallback: function () {} };

  if (video) {
    video.muted = true;
    var started = false, live = false, cracked = false;

    // короткий спалах у момент тріску — і з відео, і з запасним кадром
    var flash = function () {
      if (window.gsap) window.gsap.fromTo(video, { filter: 'brightness(2.2)' }, { filter: 'brightness(1)', duration: 0.6, ease: 'power2.out', clearProps: 'filter' });
    };
    // тріск — коли кадр із тріщинами реально з’явився на екрані:
    // requestVideoFrameCallback дає час показаного кадру; currentTime випереджає картинку
    var rvfc = 'requestVideoFrameCallback' in video;
    var tick = function (now, meta) {
      if (video.paused || video.ended) return;
      var t = rvfc && meta ? meta.mediaTime : video.currentTime - 0.08;
      if (!cracked && t >= CRACK - 0.01) {
        cracked = true;
        flash();
        hv.onCrack.forEach(function (fn) { fn(); });
      }
      if (rvfc) video.requestVideoFrameCallback(tick);
      else requestAnimationFrame(tick);
    };
    var run = function () {
      // екран уже «розбили» кадром, поки ролик вантажився — граємо далі з моменту тріску (шум)
      if (cracked && video.currentTime < CRACK) video.currentTime = CRACK;
      return video.play().then(function () { if (rvfc) video.requestVideoFrameCallback(tick); else requestAnimationFrame(tick); });
    };
    var videoReady = function () {
      return new Promise(function (res) {
        if (video.readyState >= 3) res();
        else {
          video.addEventListener('canplay', res, { once: true });
          setTimeout(res, 6000);                 // повільний інтернет — не чекаємо вічно
        }
      });
    };

    // запасний сценарій: відео не стартувало (iOS у режимі енергозбереження блокує автозапуск,
    // або повільна мережа) — «тріск» і тексти все одно з’являються
    // кадр «розбитий екран» — показуємо замість відео, якщо воно так і не пішло
    var CRACK_IMG = window.matchMedia('(max-width: 1023.98px)').matches ? 'images/hero/crack-1024.jpg' : 'images/hero/crack.jpg';
    var crackPre = new Image();
    crackPre.src = CRACK_IMG;
    var crackNow = function () {
      if (cracked) return;
      cracked = true;
      if (video.paused && video.currentTime < 0.2) video.poster = CRACK_IMG;
      flash();
      hv.onCrack.forEach(function (fn) { fn(); });
    };
    // запасний тріск — коли кнопки вже з’явились, а ролик так і не пішов
    hv.fallback = function () { if (!cracked && (video.paused || video.currentTime < 0.2)) crackNow(); };
    hv.start = function () {
      if (started) return;
      started = true;
      videoReady().then(function () {
        live = true;
        run().catch(crackNow);
      });
    };
    // iOS: перший дотик дозволяє запуск — пробуємо дограти, якщо ролик ще стоїть
    window.addEventListener('touchstart', function () { if (live && video.paused && !video.ended) run().catch(function () {}); }, { once: true, passive: true });

    // поза кадром — пауза; повернулися — догравати (якщо ще не скінчився).
    // Браузер сам ставить на паузу відео без звуку у фоновій вкладці —
    // тож, коли вкладка знову видима, теж догравати.
    var inView = true;
    var resume = function () {
      if (live && !video.ended && inView && !document.hidden) run().catch(function () {});
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) resume();
        else if (live) video.pause();
      }).observe(hero);
    }
    document.addEventListener('visibilitychange', resume);
    video.addEventListener('pause', function () { setTimeout(resume, 300); });
  }

  if (reduce || !window.gsap) {
    root.classList.remove('js');
    if (!reduce) hv.start();
    return;
  }

  var gsap = window.gsap;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
  // телефон: адресний рядок iOS ховається/з’являється — не перераховувати закріплення (інакше блоки «стрибають»)
  if (window.ScrollTrigger) window.ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------- розбивка заголовка на літери ---------- */
  var lines = gsap.utils.toArray('.hero__line-in');
  lines.forEach(function (line) {
    var text = line.textContent;
    line.setAttribute('aria-hidden', 'true');
    line.textContent = '';
    Array.prototype.forEach.call(text, function (ch) {
      var s = document.createElement('span');
      s.className = 'char';
      s.textContent = ch;
      line.appendChild(s);
    });
  });
  title.setAttribute('aria-label', 'Рекламні креативи');
  var chars1 = lines[0].querySelectorAll('.char');
  var chars2 = lines[1].querySelectorAll('.char');

  /* ---------- інтро: телевізор вмикається, проявляється заголовок ---------- */
  var crt = document.querySelector('.intro-crt');
  var crtLine = crt.querySelector('.intro-crt__line');
  var crtTop = crt.querySelector('.intro-crt__half--top');
  var crtBottom = crt.querySelector('.intro-crt__half--bottom');
  gsap.set([chars1, chars2], { yPercent: 110 });
  gsap.set('.site-header', { autoAlpha: 0, y: -16 });
  gsap.set('.hero .pill-btn--orange', { xPercent: -35, autoAlpha: 0 });
  gsap.set('.hero .pill-btn--black', { xPercent: 35, autoAlpha: 0 });

  var intro = gsap.timeline({ delay: 0.05, defaults: { ease: 'expo.out' } });
  intro
    // 1) лінія розтягується від центру на всю ширину
    .fromTo(crtLine, { scaleX: 0, opacity: 0.6 }, { scaleX: 1, opacity: 1, duration: 0.3, ease: 'power3.out' })
    // 2) половини роз'їжджаються від центру, світло лінії розливається і гасне
    .to(crtTop, { yPercent: -100, duration: 0.75, ease: 'power3.inOut' }, '-=0.05')
    .to(crtBottom, { yPercent: 100, duration: 0.75, ease: 'power3.inOut' }, '<')
    .to(crtLine, { opacity: 0, duration: 0.25, ease: 'power1.in' }, '<0.05')
    .fromTo(video, { filter: 'brightness(1.9) contrast(1.2)' },
      { filter: 'brightness(1) contrast(1)', duration: 1.1, ease: 'power2.out', clearProps: 'filter' }, '<')
    .to(chars1, { yPercent: 0, duration: 1.1, stagger: 0.045 }, '-=0.55')
    .to(chars2, { yPercent: 0, duration: 1.1, stagger: { each: 0.045, from: 'end' } }, '<0.15')
    .add(function () { title.classList.add('is-revealed'); })
    .addLabel('btns', '-=0.6')
    .to('.hero .pill-btn--orange, .hero .pill-btn--black', { xPercent: 0, autoAlpha: 1, duration: 1.1 }, 'btns')
    // ролик стартує так, щоб тріск (1.5 с ролика) припав одразу після появи кнопок
    .add(hv.start, 'btns-=0.8')
    // відео так і не пішло — розбиваємо екран кадром саме в цей момент
    .add(hv.fallback, 'btns+=0.75')
    .to('.site-header', { autoAlpha: 1, y: 0, duration: 0.9 }, 'btns')
    .add(function () {
      crt.style.display = 'none';
      scheduleGlitch();
      startDrift();
    });

  /* ---------- момент тріску: заголовок «здригається», з'являються підписи ---------- */
  var revealed = false;
  hv.onCrack.push(function () {
    if (revealed) return;
    revealed = true;
    gsap.utils.toArray('[data-reveal]').forEach(function (el, i) {
      revealLines(el, 0.15);         // обидва підписи — одночасно
    });
  });
  hv.onCrack.push(function () {
    glitch();
    gsap.fromTo('.hero__stage', { x: 0 }, {
      keyframes: { x: [-10, 8, -5, 3, 0] }, duration: 0.45, ease: 'power2.out', overwrite: 'auto'
    });
  });

  /* Розбиває текст на рядки (як він реально переноситься), кожен рядок
     виїжджає з-під маски. Після анімації повертаємо вихідний HTML, щоб текст
     далі вільно переносився при зміні ширини екрана. */
  function revealLines(el, delay) {
    var original = el.innerHTML;
    var words = [];
    el.innerHTML = original.split(/<br\s*\/?>/i).map(function (part) {
      return part.trim().split(/\s+/).map(function (w) {
        return '<span class="w" style="display:inline-block">' + w + '</span>';
      }).join(' ');
    }).join('<br>');
    words = el.querySelectorAll('.w');
    var rows = [], lastTop = null;
    words.forEach(function (w) {
      var t = w.offsetTop;
      if (lastTop === null || Math.abs(t - lastTop) > 2) { rows.push([]); lastTop = t; }
      rows[rows.length - 1].push(w.textContent);
    });
    // кожен рядок, крім останнього, розтягуємо на всю ширину (як у justify)
    el.innerHTML = rows.map(function (r, i) {
      var last = i === rows.length - 1 ? getComputedStyle(el).textAlignLast : 'justify';
      return '<span class="reveal-line"><span style="text-align-last:' + last + '">' + r.join(' ') + '</span></span>';
    }).join('');
    el.style.visibility = 'visible';
    gsap.from(el.querySelectorAll('.reveal-line > span'), {
      yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.09, delay: delay,
      onComplete: function () { el.innerHTML = original; }
    });
  }

  /* ---------- випадкові «перешкоди» сигналу ---------- */
  function glitch() {
    title.classList.remove('is-glitch');
    void title.offsetWidth;
    title.classList.add('is-glitch');
  }
  function scheduleGlitch() {
    gsap.delayedCall(gsap.utils.random(4.5, 9), function () {
      if (!document.hidden) glitch();
      scheduleGlitch();
    });
  }

  /* ---------- рядки заголовка повільно розходяться й сходяться (самі, без мишки) ---------- */
  function startDrift() {
    // розходяться назовні: на десктопі «Рекламні» праворуч, «креативи» ліворуч; на телефоні навпаки
    var d = window.matchMedia('(min-width: 768px)').matches ? 1 : -1;
    gsap.fromTo(lines[0], { xPercent: 0 }, { xPercent: 1.6 * d, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.fromTo(lines[1], { xPercent: 0 }, { xPercent: -1.6 * d, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  /* ---------- скрол: камера «від'їжджає» від телевізора ---------- */
  if (window.ScrollTrigger) {
    gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 }
    })
      .to('.hero__scene', { scale: 0.8, yPercent: 10, ease: 'none' }, 0);
  }
})();
