/* Proekcia — «Рекламні креативи»: анімації та інтерактив секцій після героя.
   Інтерактив (перемикач шарів, вибір формату, чек-лист) працює і без GSAP.
   Анімації — GSAP + ScrollTrigger; без них або при «зменшенні руху»
   усе просто показується в кінцевому стані. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- відео «дві задачі»: вантажиться й грає лише коли в кадрі ---------- */
  var bv = $('.breath__video');
  if (bv && 'IntersectionObserver' in window && !reduce) {
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { if (bv.preload !== 'auto') { bv.preload = 'auto'; bv.load(); } bv.play().catch(function () {}); }
      else bv.pause();
    }, { rootMargin: '200px 0px' }).observe(bv);
  } else if (bv) { bv.preload = 'metadata'; }

  /* ---------- 02b · два горизонти: перемикання «продажі» → «бренд» ----------
     Пройшли середину липкої сцени — ставимо .is-brand (і знімаємо, якщо скролять назад).
     Сам перехід — коротка CSS-анімація, тож проміжних «напівпрозорих» станів на екрані не лишається. */
  var hzD = $('.hzD');
  if (hzD) {
    var hzStage = $('.hzD__stage', hzD);
    var raf2 = 0, isBrand = false;
    var update = function () {
      raf2 = 0;
      var r = hzD.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight)));
      var b = p >= 0.45;
      if (b === isBrand) return;
      isBrand = b;
      hzStage.classList.toggle('is-brand', b);
    };
    // обидва відео грають по колу лише коли сцена на екрані (при «зменшенні руху» — стоп-кадри)
    var hzVids = $$('.hzD__vid');
    // на телефоні — вертикальні стоп-кадри під вертикальні відео
    if (window.matchMedia('(max-width: 767.98px)').matches) {
      hzVids.forEach(function (v) { v.poster = v.getAttribute('poster').replace(/\.webp(\?.*)?$/, '-m.webp'); });
    }
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        hzVids.forEach(function (v) { if (es[0].isIntersecting) v.play().catch(function () {}); else v.pause(); });
      }, { rootMargin: '100px 0px' }).observe(hzD);
    }
    window.addEventListener('scroll', function () { if (!raf2) raf2 = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- 01 · капсула «гортай»: крапка з’їжджає вниз, і зірка морфиться в стрілку ↓ ----------
     Одна фігура з однаковою структурою (4 кубічні криві): верхній промінь зірки плавно
     витягується в стрижень, бокові — в «крила» стрілки з макета. Угору — назад у зірку. */
  var shape = $('.post__scroll-shape'), sDot = $('.post__scroll-dot'), sPill = $('.post__scroll');
  if (shape && sDot && !reduce && window.gsap) {
    var STAR = [11.9,21.86, 11.9,14.94, 9.87,12.91, 2.95,12.91, 9.87,12.91, 11.9,10.88, 11.9,3.96, 11.9,10.88, 13.93,12.91, 20.85,12.91, 13.93,12.91, 11.9,14.94, 11.9,21.86];
    var ARROW = [11.9,21.92, 11.32,16.3, 10.85,15.82, 2.98,12.91, 10.5,14.2, 11.75,14, 11.9,1.3, 12.05,14, 13.3,14.2, 20.83,12.91, 12.95,15.82, 12.48,16.3, 11.9,21.92];
    var toD = function (t) {
      var v = STAR.map(function (n, i) { return (n + (ARROW[i] - n) * t).toFixed(2); });
      return 'M' + v[0] + ' ' + v[1] + 'C' + v.slice(2, 8).join(' ') + 'C' + v.slice(8, 14).join(' ') + 'C' + v.slice(14, 20).join(' ') + 'C' + v.slice(20, 26).join(' ') + 'Z';
    };
    var st0 = { p: 0 };
    var travel = function () { return sPill.clientHeight - sDot.offsetHeight; };
    var render = function () {
      var p = st0.p;                                            // 0 — крапка вгорі, 1 — внизу
      // плавний (дробовий) зсув; чіткість тримає окремий шар крапки (will-change у CSS) — браузер не перемальовує зірку
      sDot.style.transform = 'translate3d(0,' + (-(1 - p) * travel()).toFixed(2) + 'px,0)';
      var m = Math.min(1, Math.max(0, (p - 0.35) / 0.65));      // морфінг — у другій половині ходу
      m = m * m * (3 - 2 * m);
      shape.setAttribute('d', toD(m));
    };
    window.gsap.timeline({ repeat: -1, repeatDelay: 0.15 })   // window.gsap: локальна змінна gsap оголошена в файлі нижче
      .to(st0, { p: 1, duration: 0.9, ease: 'power2.inOut', onUpdate: render })
      .to(st0, { p: 0, duration: 0.9, ease: 'power2.inOut', onUpdate: render }, '+=0.25');
    render();
  }

  /* ---------- без анімацій: кінцеві стани ---------- */
  if (reduce || !window.gsap || !window.ScrollTrigger) {
    $$('.rule').forEach(function (r) { r.classList.add('is-on'); });
    $$('.rule-note__s').forEach(function (r) { r.style.opacity = 1; });
    $$('.hl').forEach(function (m) { m.classList.add('is-on'); });
    $$('.brief__row').forEach(function (r) { r.classList.add('is-done'); });
    var bb = $('.brief__bar span'), bc = $('.brief__count b');
    if (bb) bb.style.width = '100%';
    if (bc) bc.textContent = $$('.brief__row').length;
    return;
  }

  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  var mm = gsap.matchMedia();

  /* ---------- поява блоків ---------- */
  $$('[data-rv]').forEach(function (el) {
    gsap.from(el, {
      y: 40, autoAlpha: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  /* ---------- 01 · УВАГА: три стрічки ----------
     Бічні колонки весь час летять розмиті вниз, центральна — вгору.
     Центральна летить разом із ними, а потім різко гальмує на пості
     з помаранчевою карткою — і в ній проступає фраза. */
  var stage = $('.signal__stage');
  var cTrack = $('.feed--c .feed__track');
  var cPosts = $$('.post', cTrack);
  var stopPost = $('.post--stop', cTrack);
  var otherPosts = cPosts.filter(function (p) { return p !== stopPost; });
  var lTrack = $('.feed--l .feed__track'), rTrack = $('.feed--r .feed__track');
  var isPhone = function () { return window.matchMedia('(max-width: 767.98px)').matches; };
  var centerOn = function (post) { return stage.offsetHeight * 0.5 - (post.offsetTop + post.offsetHeight / 2); };
  var step = function (track) { var p = track.children; return p.length > 1 ? p[1].offsetTop - p[0].offsetTop : 0; };
  gsap.set(cPosts, { filter: 'blur(14px)' });

  // пости, які на старті опинилися б над сценою, ховаємо до моменту «прилипання»
  var startY = function (track) {
    if (track === cTrack) return centerOn(cPosts[1]);
    if (track === lTrack) return -step(lTrack) * 3.3;
    return -step(rTrack) * 4.2;
  };
  var markAbove = function () {
    [cTrack, lTrack, rTrack].forEach(function (t) {
      if (!t) return;
      var y = startY(t);
      $$('.post', t).forEach(function (p) { p.classList.toggle('is-above', p.offsetTop + y < 0); });
    });
  };
  markAbove();
  ST.addEventListener('refreshInit', markAbove);
  ST.create({
    trigger: '.signal', start: 'top top', end: 'bottom top',
    toggleClass: { targets: '.signal', className: 'is-pinned' }
  });

  // вхід у секцію: стрічки «вилітають» знизу по черзі цілими картками
  gsap.fromTo('.feed', { yPercent: 55, autoAlpha: 0 }, {
    yPercent: 0, autoAlpha: 1, ease: 'power3.out', stagger: 0.15,
    scrollTrigger: { trigger: '.signal', start: 'top 95%', end: 'top top', scrub: 0.6 }
  });
  gsap.set('.post__card > *', { autoAlpha: 0, y: 24 });

  var sig = gsap.timeline({
    scrollTrigger: { trigger: '.signal', start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true }
  })
    // центральна: рівний швидкий «свайп»…
    .fromTo(cTrack,
      { y: function () { return centerOn(cPosts[1]); } },
      { y: function () { var a = centerOn(cPosts[1]), b = centerOn(stopPost); return a + (b - a) * 0.88; }, duration: 1, ease: 'none' }, 0)
    // …і різке гальмування на пості з фразою
    .to(cTrack, { y: function () { return centerOn(stopPost); }, duration: 0.4, ease: 'expo.out' }, 1)
    .to(stopPost, { filter: 'blur(0px)', duration: 0.35, ease: 'expo.out' }, 1)
    .to(otherPosts, { opacity: 0.28, filter: 'blur(8px)', duration: 0.4, ease: 'power2.out' }, 1.05)
    .to('.post__card > *', { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.12, ease: 'power3.out' }, 1.2)
    // бічні: увесь час летять униз (назустріч центральній, що йде вгору), з різною швидкістю
    .fromTo(lTrack, { y: function () { return -step(lTrack) * 3.3; } }, { y: function () { return 0; }, duration: 1.9, ease: 'none' }, 0)
    .fromTo(rTrack, { y: function () { return -step(rTrack) * 4.2; } }, { y: function () { return -step(rTrack) * 1.6; }, duration: 1.9, ease: 'none' }, 0)
    .to({}, { duration: 0.7 }, 1.9);   // пауза: фраза тримається, перш ніж секція поїде

  /* ---------- 02 · візуал розкривається від центру до країв ---------- */
  gsap.fromTo('.breath__frame',
    { clipPath: 'inset(0% 50% 0% 50%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: '.breath', start: 'top 100%',
        // на телефоні розкривається повністю раніше — поки пігулка ще внизу екрана
        end: function () { return window.innerWidth < 768 ? 'top 78%' : 'top 50%'; },
        scrub: true, invalidateOnRefresh: true } });

  /* ---------- 02c · термочек виповзає з принтера ----------
     Блок закріплюється, з щілини знизу ривками (як справжній принтер) росте чек:
     спершу шапка, далі позиції, сума «набігає», поки друкується.
     Наприкінці чек «відривається» — підскакує й хилиться. */
  var billSum = document.querySelector('.bill__sum');
  if (billSum) {
    var billTotal = +billSum.getAttribute('data-total');
    var fmtUah = function (n) { return Math.round(n).toLocaleString('uk-UA').replace(/\s/g, '\u00a0') + ',00'; };
    var billPaper = document.querySelector('.bill__paper');
    billSum.textContent = fmtUah(0);
    gsap.set(billPaper, { yPercent: 100 });
    gsap.timeline({
      scrollTrigger: {
        trigger: '.bill', pin: true, start: 'top top', refreshPriority: 2,   // рахується раніше за «Принципи» (у тих 1), щоб ті врахували відступ від цього закріплення
       
        end: function () { return '+=' + billPaper.offsetHeight * 1.7; },
        scrub: 0.5, invalidateOnRefresh: true
      },
      // сума рахується від часу таймлайна (стійко до refresh/resize), поки рядок СУМА виходить із принтера
      onUpdate: function () {
        var k = gsap.utils.clamp(0, 1, (this.time() - 0.62) / 0.2);
        billSum.textContent = fmtUah(billTotal * (1 - Math.pow(1 - k, 2)));
      }
    })
      .to(billPaper, { yPercent: 0, ease: 'steps(32)', duration: 1 }, 0)
      // принтер ледь тремтить, поки друкує
      .fromTo('.bill__slot', { x: -1 }, { x: 1, duration: 0.025, repeat: 39, yoyo: true, ease: 'none' }, 0)
      // сума рахується, поки рядок СУМА виходить із принтера
      // відрив
      .to(billPaper, { y: -16, rotation: -2.5, duration: 0.15, ease: 'back.out(2.5)' }, 1.02)
      // пауза: готовий чек тримається на екрані, перш ніж сторінка поїде далі
      .to({}, { duration: 0.55 }, 1.17);
  }

  /* ---------- 02d · три кола «вискакують» по черзі ---------- */
  gsap.from('.cheaper__em', {
    scale: 0, rotation: -20, duration: 0.9, ease: 'back.out(1.7)', stagger: 0.18,
    scrollTrigger: { trigger: '.cheaper__list', start: 'top 80%', once: true }
  });
  gsap.from('.cheaper__txt', {
    autoAlpha: 0, y: 20, duration: 0.7, ease: 'power2.out', stagger: 0.18, delay: 0.25,
    scrollTrigger: { trigger: '.cheaper__list', start: 'top 80%', once: true }
  });

  /* ---------- 03 · «знижка»: фраза дочитується скролом, слово за словом ---------- */
  var dt = $('.discount__title');
  if (dt) {
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(dt.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/( +)/).forEach(function (part) {
          if (!part) return;
          if (/^ +$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var w = document.createElement('span');
          w.className = 'w';
          w.textContent = part;
          frag.appendChild(w);
        });
      } else {
        var wrap = document.createElement('span');
        wrap.className = 'w';
        wrap.appendChild(node.cloneNode(true));
        frag.appendChild(wrap);
      }
    });
    dt.textContent = '';
    dt.appendChild(frag);
    gsap.to($$('.w', dt), {
      opacity: 1, ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: dt, start: 'top 100%', end: 'bottom 75%', scrub: true }   // фраза повністю проявляється, поки блок ще в нижній частині екрана
    });
  }

  /* ---------- 03 · великий «%» повільно обертається зі скролом ---------- */
  gsap.fromTo('.discount__pct', { rotation: -25, yPercent: -40 }, {
    rotation: 15, yPercent: -60, ease: 'none',
    scrollTrigger: { trigger: '.discount', start: 'top bottom', end: 'bottom top', scrub: true }
  });

  /* ---------- 03b · «продажі» і «бренд» постійно то розходяться (вгору / вниз), то сходяться ---------- */
  var em = function (k) { return function () { return parseFloat(getComputedStyle($('.split__title')).fontSize) * k; }; };
  var splitLoop = gsap.timeline({ paused: true, repeat: -1, yoyo: true, repeatDelay: 0.25, defaults: { duration: 1.3, ease: 'sine.inOut' } })
    .fromTo('.split__w--a', { y: 0, rotation: 0 }, { y: em(-0.14), rotation: -3 }, 0)
    .fromTo('.split__w--b', { y: 0, rotation: 0 }, { y: em(0.14), rotation: 3 }, 0);
  // грає лише в кадрі
  ScrollTrigger.create({ trigger: '.split__title', start: 'top bottom', end: 'bottom top',
    onToggle: function (self) { if (self.isActive) splitLoop.play(); else splitLoop.pause(); } });
  $$('.split__err').forEach(function (card, i) {
    gsap.from(card, { autoAlpha: 0, y: 30, duration: 0.7, ease: 'power3.out', delay: i * 0.12,
      scrollTrigger: { trigger: card, start: 'top 88%', once: true } });
  });

  /* ---------- 03c · маркер біжить по ключових словах ---------- */
  $$('.mech__col').forEach(function (col) {
    var marks = $$('.hl', col);
    ST.create({
      trigger: col, start: 'top 70%', end: 'bottom 55%', scrub: true,
      onUpdate: function (self) {
        marks.forEach(function (m, i) { m.classList.toggle('is-on', self.progress >= (i + 0.5) / (marks.length + 0.5)); });
      }
    });
  });

  /* ---------- 04b · 5 креативів одного бренду: спершу фото, потім на всі «лягає» фірмова система,
     і лише на двох з’являються ціна й «Купити». Разова коротка послідовність. ---------- */
  var adTiles = $$('.ad-tile');
  if (adTiles.length) {
    gsap.set('.ad-tile__frame, .ad-tile__mark, .ad-tile__head', { autoAlpha: 0 });
    gsap.set('.ad-tile__btn', { x: 0, xPercent: -50, autoAlpha: 0, y: 12 });   // центрування через xPercent, щоб не губилося при ресайзі
    gsap.timeline({ scrollTrigger: { trigger: '.memory__grid', start: 'top 80%', once: true } })
      .fromTo(adTiles, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', stagger: 0.06 })
      .fromTo('.ad-tile__frame', { scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power2.out', stagger: 0.06 }, 0.6)
      .to('.ad-tile__mark, .ad-tile__head', { autoAlpha: 1, duration: 0.45, stagger: 0.04 }, 0.75)
      .to('.ad-tile__btn', { autoAlpha: 1, y: 0, duration: 0.45, ease: 'back.out(1.8)', stagger: 0.12 }, 1.7);
  }

  /* ---------- 04 · кальки накладаються (липка сцена) ----------
     0–.1    кальки лежать окремо: «нічийний» банер і бренд-мудборд;
     .1–.32  калька бренду лягає на банер;
     .34–.52 «рендер»: фото розгортається на весь макет, мудборд (Aa, кольори) зникає,
             текст дії перебирає фірмовий шрифт і кольори, з’являються рамка і знак → ✓, речення 1;
     .6      речення 2; далі — пауза. */
  var shA = $('.sheet--a'), shB = $('.sheet--b');
  if (shA && shB) {
    var desk = $('.desk');
    var narrow = function () { return window.innerWidth < 768; };
    // на телефоні кальки в розкладеному стані менші й ближчі, щоб обидві влазили в ширину
    var apart = function () { return desk.offsetWidth * (narrow() ? 0.25 : 0.24); };
    var small = function () { return narrow() ? 0.6 : 0.8; };
    var s1 = $('.rule-note__s--1'), s2 = $('.rule-note__s--2');
    gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: { trigger: '.layers', start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true }
    })
      .fromTo(shA, { x: function () { return -apart(); }, rotation: -5, scale: small }, { x: function () { return -apart(); }, rotation: -5, scale: small, duration: 0.1 }, 0)
      .fromTo(shB, { x: function () { return apart(); }, rotation: 4, scale: small }, { x: function () { return apart(); }, rotation: 4, scale: small, duration: 0.1 }, 0)
      // накладання
      .to([shA, shB], { x: 0, rotation: 0, scale: 1, duration: 0.22 }, 0.1)
      .to('.sheet__label', { opacity: 0, duration: 0.06 }, 0.1)
      // «рендер» фірмового стилю
      .to('.sheet--b .sheet__milk', { opacity: 0.08, duration: 0.08 }, 0.32)
      .to('.kit__aa, .kit__sw', { opacity: 0, y: -8, duration: 0.06 }, 0.34)
      .to('.kit__photo', { top: '5.5%', right: '5%', width: '90%', height: '89.5%', duration: 0.14 }, 0.36)
      .to('.ink-plain', { opacity: 0, filter: 'blur(4px)', duration: 0.08 }, 0.38)
      .to('.kit__mark', { bottom: '87.6%', duration: 0.12 }, 0.4)   // знак «піднімається» в лівий кут верхнього рядка
      .to('.kit__frame', { borderColor: 'rgba(255,255,255,.75)', duration: 0.08 }, 0.42)
      .fromTo('.ink-brand', { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.1 }, 0.44)
      .fromTo('.ink-brand__pct', { letterSpacing: '.08em' }, { letterSpacing: '-.07em', duration: 0.12 }, 0.44)
      .to('.desk__mark--ok', { opacity: 1, scale: 1, duration: 0.05, ease: 'back.out(2.5)' }, 0.54)
      .to(s1, { opacity: 1, duration: 0.06 }, 0.46)
      .to(s2, { opacity: 1, duration: 0.06 }, 0.62)
      .to({}, { duration: 0.3 }, 0.7);
  }

  /* ---------- 05 · ПРИНЦИПИ: горизонтальний скрол на десктопі ---------- */
  var rules = $$('.rule');
  mm.add('(min-width: 1024px)', function () {
    var section = $('.rules');
    var track = $('.rules__track');
    section.classList.add('is-pinned');
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var h = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        trigger: section, pin: true, start: 'top top',
        refreshPriority: 1,   // рахується першою: тригери нижче мають враховувати висоту закріплення
        end: function () { return '+=' + dist(); },
        scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1
      }
    });
    rules.forEach(function (r) {
      ST.create({
        trigger: r, containerAnimation: h, start: 'left 70%',
        onEnter: function () { r.classList.add('is-on'); },
        onLeaveBack: function () { r.classList.remove('is-on'); }
      });
    });
    return function () { section.classList.remove('is-pinned'); };
  });
  // на телефоні/планшеті анімації карток вмикає «колода» нижче — за тим, яка картка зверху

  /* ---------- 06 · процес: активна «намистина» = поточний крок ---------- */
  var beads = $$('.beads li');
  $$('.step').forEach(function (step, i) {
    ST.create({
      trigger: step, start: 'top 55%', end: 'bottom 55%',
      onToggle: function (self) {
        if (self.isActive) beads.forEach(function (b, j) { b.classList.toggle('is-on', j === i); });
      }
    });
  });

  /* ---------- телефон/планшет: «колода» замість довгих списків принципів і етапів ----------
     Список закріплюється на екрані, і на скролі кожна наступна картка наїжджає знизу
     поверх попередньої (та трохи зменшується й тьмяніє). Десктоп не зачіпаємо. */
  var deck = function (list, pinTarget, startAt, prio, swipe) {
    var cards = $$(':scope > *', list);
    if (cards.length < 2) return;
    list.classList.add('is-deck');
    var dim = list.closest('.rules') ? 'brightness(0.4)' : 'brightness(0.92)';
    // усі картки — однакової висоти (за найвищою): тоді попередні не визирають знизу своїм текстом
    var fit = function () {
      cards.forEach(function (c) { c.style.height = ''; });
      var h = Math.max.apply(null, cards.map(function (c) { return c.offsetHeight; }));
      cards.forEach(function (c) { c.style.height = h + 'px'; });
      list.style.height = h + 'px';
    };
    fit();
    var tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: pinTarget, pin: true, pinSpacing: true,   // явно: у flex-батька GSAP інакше не додає місце під закріплення
        start: startAt, refreshPriority: prio || 0,
        end: function () { return '+=' + (cards.length - 1) * window.innerHeight * 0.7; },
        scrub: 0.5, invalidateOnRefresh: true, onRefreshInit: fit,
        onUpdate: function (self) {
          // картка вважається «відкритою», коли наїхала більш ніж наполовину
          var top = Math.floor(self.progress * (cards.length - 1 + 0.3) + 0.5);
          cards.forEach(function (c, j) { c.classList.toggle('is-on', self.progress > 0 && j <= top); });
        },
        onEnter: function () { cards[0].classList.add('is-on'); },
        onLeaveBack: function () { cards.forEach(function (c) { c.classList.remove('is-on'); }); }
      }
    });
    if (swipe) {
      // «гортання пальцем»: картки лежать стосом, верхня — поточна. На скролі її змахує вбік
      // з легким поворотом (як пальцем), а наступна з-під неї піднімається й світлішає.
      var n = cards.length;
      cards.forEach(function (c, i) { c.style.zIndex = n - i; });
      gsap.set(cards.slice(1), { scale: 0.94, filter: dim });
      cards.forEach(function (c, i) {
        if (i === n - 1) return;
        var dir = i % 2 ? 1 : -1;                // по черзі вліво / вправо — як живий жест
        tl.to(c, { x: function () { return dir * window.innerWidth * 1.15; }, y: -30, rotation: dir * 14,
                   duration: 1, ease: 'power1.in' }, i)
          .fromTo(cards[i + 1], { scale: 0.94, filter: dim }, { scale: 1, filter: 'brightness(1)', duration: 0.8, ease: 'power2.out', immediateRender: false }, i + 0.2);
      });
      tl.to({}, { duration: 0.3 });
      return function () {
        list.classList.remove('is-deck'); list.style.height = '';
        cards.forEach(function (c) { c.style.height = ''; c.style.zIndex = ''; c.classList.remove('is-on'); });
        gsap.set(cards, { clearProps: 'all' });
      };
    }
    cards.forEach(function (c, i) {
      if (!i) return;
      // старт — за нижнім краєм екрана, щоб наступні картки не визирали заздалегідь
      // старт — нижче і екрана, і самої колоди: наступна картка не визирає заздалегідь
      tl.fromTo(c, { y: function () { return Math.max(window.innerHeight, list.offsetHeight + 60); } }, { y: 0, duration: 1 }, i - 1)
        // попередня — трохи менша й темніша, але НЕ прозора: інакше крізь неї просвічують нижні картки
        // попередня відступає трохи вгору й углиб — над поточною видно лише її край
        .fromTo(cards[i - 1], { y: 0, scale: 1, filter: 'brightness(1)' }, { y: -14, scale: 0.95, filter: dim, duration: 1, immediateRender: false }, i - 1);   // явний старт: з «none» GSAP рахує від 0
    });
    tl.to({}, { duration: 0.3 });
    return function () {
      list.classList.remove('is-deck'); list.style.height = '';
      cards.forEach(function (c) { c.style.height = ''; });
      gsap.set(cards, { clearProps: 'all' });
      cards.forEach(function (c) { c.classList.remove('is-on'); });
    };
  };
  mm.add('(max-width: 1023.98px)', function () {
    var undoRules = deck($('.rules__deck'), '.rules__deck', 'top 4%', 1, true);   // вище на сторінці — рахується раніше
    var undoSteps = deck($('.steps'), '.process__grid', function () {
      // закріплюємо так, щоб на екрані були і заголовок блоку, і колода етапів
      var g = $('.process__grid');
      return 'top ' + Math.max(16, (window.innerHeight - g.offsetHeight) / 2) + 'px';
    });
    return function () { undoRules && undoRules(); undoSteps && undoSteps(); };
  });

  /* Тригери, що стоять на сторінці НИЖЧЕ за закріплену секцію принципів, мають створюватися
     ПІСЛЯ неї — інакше ScrollTrigger не врахує її висоту при розрахунку позицій. */
  /* ---------- 05 · «Що ви отримуєте?» — конвеєр ---------- */
  // відео в станціях грають лише в кадрі
  $$('.kit-video').forEach(function (v) {
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { v.preload = 'auto'; v.play().catch(function () {}); } else v.pause();
    }, { rootMargin: '100px 0px' }).observe(v);
  });
  // графік зростання в станції «запуск» домальовується, коли вона в кадрі
  $$('.kit-chart path').forEach(function (pth) {
    var L = pth.getTotalLength();
    gsap.fromTo(pth, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.out',
      scrollTrigger: { trigger: pth.closest('.belt__st'), start: 'top 85%', once: true } });
  });
  // стрічка їде вбік, поки секція «липка» (лише десктоп/планшет)
  mm.add('all', function () {   // і на десктопі, і на телефоні
    var track = $('.belt__track');
    if (!track) return;
    gsap.to(track, {
      x: function () { return -(track.scrollWidth - window.innerWidth); }, ease: 'none',
      scrollTrigger: { trigger: '.belt', start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true }
    });
  });

  /* ---------- 07 · бриф: аркуш вирівнюється, рядки «друкуються», галочки ставляться по черзі ---------- */
  var briefRows = $$('.brief__row');
  var briefBar = $('.brief__bar span'), briefCount = $('.brief__count b');
  gsap.fromTo('.brief__sheet', { rotation: -3, y: 60 }, {
    rotation: 0, y: 0, ease: 'power2.out',
    scrollTrigger: { trigger: '.brief', start: 'top bottom', end: 'top 25%', scrub: 0.6 }
  });
  gsap.set('.brief__t', { clipPath: 'inset(0% 100% 0% 0%)' });
  gsap.set('.brief__line', { scaleX: 0 });
  ST.create({
    trigger: '.brief__list', start: 'top 75%', end: 'bottom 45%', scrub: true,
    onUpdate: function (self) {
      var p = self.progress, n = briefRows.length, done = 0;
      briefRows.forEach(function (row, i) {
        var local = Math.min(1, Math.max(0, p * n * 1.15 - i));     // «друк» рядка 0…1
        gsap.set($('.brief__t', row), { clipPath: 'inset(0% ' + (100 - local * 100) + '% 0% 0%)' });
        gsap.set($('.brief__line', row), { scaleX: Math.max(0, local * 1.4 - 0.4) });
        var isDone = local >= 1;
        row.classList.toggle('is-done', isDone);
        if (isDone) done++;
      });
      briefBar.style.width = (done / n * 100) + '%';
      briefCount.textContent = done;
      $('.brief__send').classList.toggle('is-ready', done === n);
    }
  });

  // шрифти змінюють висоти — перерахувати тригери
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
  window.addEventListener('load', function () { ST.refresh(); });
  // ліниві картинки змінюють висоту блоків — після їх завантаження перерахувати тригери
  var refreshT;
  $$('main img[loading="lazy"]').forEach(function (img) {
    if (img.complete) return;
    img.addEventListener('load', function () { clearTimeout(refreshT); refreshT = setTimeout(function () { ST.refresh(); }, 150); }, { once: true });
  });
})();
