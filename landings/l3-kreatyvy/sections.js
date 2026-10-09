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
    gsap.set('.bill__cta', { autoAlpha: 0, y: 16 });
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
      // кнопка з'являється, коли сума дорахувалась
      .to('.bill__cta', { autoAlpha: 1, y: 0, duration: 0.12, ease: 'power3.out' }, 0.86)
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
  /* ---------- 03d · бренд-пам'ять: відбитки креативів складаються в знак ----------
     Знак (зірка PROEKCIA) заповнюємо сіткою клітинок. На скролі «креативи» (білі картки)
     по одному прилітають з-за меж кадру, зменшуються і лягають у свою клітинку
     напівпрозорим відбитком; відбитки накладаються — знак проступає все чіткіше.
     Кожен восьмий — оранжевий («продаж»), решта — темні («пам'ять»). */
  var memBox = $('.memory__canvas');
  if (memBox) {
    var cv = $('canvas', memBox), ctx = cv.getContext('2d');
    var MEM_STAR = new Path2D('M259.998 437.084C259.998 300.197 219.801 260 82.9141 260C219.801 260 259.998 219.803 259.998 82.916C259.998 219.803 300.195 260 437.082 260C300.195 260 259.998 300.197 259.998 437.084Z');
    var memEnd = $('.memory__end');
    var cells = [], size = 0, dpr = 1, cell = 0;
    // детермінований «випадок» — однакова картина при кожному перерахунку
    var rnd = function (i, k) { var x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
    var build = function () {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      size = memBox.clientWidth;
      cv.width = size * dpr; cv.height = size * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);     // isPointInPath рахує з урахуванням поточної трансформації
      // сітка в координатах знака (520×520), лишаємо клітинки, центр яких усередині зірки
      // сітка симетрична відносно центру знака (260, 260): промені однакові, контур рівний
      var step = 7, list = [], C = 260, R = 27;
      for (var j = -R; j <= R; j++) for (var i = -R; i <= R; i++) {
        var cx = C + i * step, cy = C + j * step;
        if (ctx.isPointInPath(MEM_STAR, cx, cy)) list.push({ x: cx - step / 2, y: cy - step / 2 });
      }
      // порядок появи: від центру назовні з легким розкидом — знак «наростає»
      list.forEach(function (c, i) { var dx = c.x + 3.5 - 260, dy = c.y + 3.5 - 260; c.o = Math.sqrt(dx * dx + dy * dy) + rnd(i, 1) * 90; });
      list.sort(function (a, b) { return a.o - b.o; });
      cell = step;
      cells = list.map(function (c, i) {
        var ang = rnd(i, 2) * Math.PI * 2;
        return { x: c.x, y: c.y, sell: i % 8 === 5,
          fx: 260 + Math.cos(ang) * 520, fy: 260 + Math.sin(ang) * 520,   // звідки прилітає (за межами кадру)
          rot: (rnd(i, 3) - 0.5) * 0.9 };
      });
    };
    var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
    var draw = function (p) {
      if (!cells.length) return;
      var k = size / 380 * dpr, n = cells.length;   // кадр — рамка знака 70…450 з 520
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(k, 0, 0, k, -70 * k, -70 * k);
      var FLY = 0.07, SPAN = 0.8 - FLY;        // кожен креатив летить 7% скролу; усі долітають до 80%
      var flying = [];
      for (var i = 0; i < n; i++) {
        var c = cells[i], t0 = i / n * SPAN, e = (p - t0) / FLY;
        if (e <= 0) continue;
        if (e >= 1) {
          // відбиток: темний напівпрозорий (накладаються — густішає) або оранжевий
          ctx.fillStyle = c.sell ? '#FF4613' : '#AABCD7';   // фірмовий сіро-синій
          ctx.beginPath(); ctx.roundRect(c.x + 0.75, c.y + 0.75, cell - 1.5, cell - 1.5, 1.5); ctx.fill();
        } else flying.push([c, ease(e)]);
      }
      // креативи в польоті — поверх відбитків: біла картка 4:5, що зменшується до клітинки
      flying.forEach(function (f) {
        var c = f[0], e = f[1];
        var w = 46 + (cell - 1.5 - 46) * e, h = w * 1.25 + (cell - 1.5 - (cell - 1.5) * 1.25) * e;
        var x = c.fx + (c.x + cell / 2 - c.fx) * e, y = c.fy + (c.y + cell / 2 - c.fy) * e;
        ctx.save(); ctx.translate(x, y); ctx.rotate(c.rot * (1 - e));
        ctx.globalAlpha = 0.35 + 0.65 * (1 - e);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(13,13,13,.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 3); ctx.fill(); ctx.stroke();
        if (e < 0.6) {                          // «вміст» креативу: фото-плашка й рядки тексту
          ctx.fillStyle = c.sell ? '#FF4613' : '#D7E3F5';
          ctx.fillRect(-w / 2 + w * 0.1, -h / 2 + h * 0.1, w * 0.8, h * 0.5);
          ctx.fillStyle = 'rgba(13,13,13,.5)';
          ctx.fillRect(-w / 2 + w * 0.1, -h / 2 + h * 0.68, w * 0.6, h * 0.05);
          ctx.fillRect(-w / 2 + w * 0.1, -h / 2 + h * 0.78, w * 0.4, h * 0.05);
        }
        ctx.restore();
      });
    };
    build();
    var memState = { p: 0 };
    gsap.to(memState, {
      p: 1, ease: 'none', onUpdate: function () { draw(memState.p); },
      scrollTrigger: { trigger: '.memory', start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true }
    });
    // висновок з'являється, коли знак складено
    if (memEnd) gsap.to(memEnd, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out',
      scrollTrigger: { trigger: '.memory', start: function () { var st = $('.memory'); return 'top+=' + (st.offsetHeight - window.innerHeight) * 0.82 + ' top'; },
        toggleActions: 'play none none reverse', invalidateOnRefresh: true } });
    var rT;
    window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(function () { build(); draw(memState.p); }, 150); });
  }

  /* ---------- 04 · два шари: на голий оффер натягується шар бренду (липка сцена) ---------- */
  var lxCard = $('.lx__card');
  if (lxCard) {
    var lxS = { p: 0 };
    var lxBrand = $('.lx__brand', lxCard), lxEdge = $('.lx__edge', lxCard);
    var lxDraw = function () {
      var x = 100 - lxS.p * 100;   // лівий край шару бренду, %
      lxBrand.style.clipPath = 'inset(0 0 0 ' + x.toFixed(2) + '%)';
      lxEdge.style.left = x.toFixed(2) + '%';
      lxEdge.style.opacity = lxS.p > 0.001 && lxS.p < 0.999 ? 1 : 0;
    };
    lxDraw();
    gsap.timeline({ scrollTrigger: { trigger: '.layers', start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true } })
      .to({}, { duration: 0.12 })                                                   // спершу видно лише шар дії
      .to(lxS, { p: 1, duration: 0.5, ease: 'power2.inOut', onUpdate: lxDraw })      // шар бренду натягується
      .to($('.lx__chip-a', lxCard), { opacity: 0, duration: 0.06 }, 0.55)
      .to($('.lx__chip-b', lxCard), { opacity: 1, duration: 0.06 }, 0.57)
      .fromTo('.lx__s2', { opacity: 0.25 }, { opacity: 1, duration: 0.08 }, 0.7)
      .to({}, { duration: 0.22 });                                                  // пауза: готовий креатив тримається
  }

  /* ---------- 05 · ПРИНЦИПИ: горизонтальний скрол на десктопі ---------- */
  var rules = $$('.rule');
  mm.add('(min-width: 1024px)', function () {
    var section = $('.rules');
    var track = $('.rules__track');
    section.classList.add('is-pinned');
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    // пауза в кінці: горизонтальний рух зупиняється на останній картці (кнопці),
    // і вона тримається ще цілий екран скролу, перш ніж секція поїде вгору
    var hold = function () { return window.innerHeight * 1.0; };
    var h = gsap.timeline({
      scrollTrigger: {
        trigger: section, pin: true, start: 'top top',
        refreshPriority: 1,   // рахується першою: тригери нижче мають враховувати висоту закріплення
        end: function () { return '+=' + (dist() + hold()); },
        scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1
      }
    })
      .to(track, { x: function () { return -dist(); }, ease: 'none', duration: 1 })
      .to({}, { duration: hold() / Math.max(1, dist()) });
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
  var deck = function (list, pinTarget, startAt, prio) {
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
  /* Принципи на телефоні/планшеті: одна картка — один рух пальцем (або коліщатком).
     Колода закріплюється, сторінка стоїть, а кожен змах виводить наступну картку знизу —
     незалежно від сили змаху, тож встигаєш прочитати. Після останньої — звичайний скрол далі. */
  var swipeDeck = function (list) {
    var cards = $$(':scope > *', list), n = cards.length;
    if (n < 2) return;
    list.classList.add('is-deck');
    var fit = function () {
      cards.forEach(function (c) { c.style.height = ''; });
      var h = Math.max.apply(null, cards.map(function (c) { return c.offsetHeight; }));
      cards.forEach(function (c) { c.style.height = h + 'px'; });
      list.style.height = h + 'px';
    };
    fit();
    var DIM = 'brightness(0.4)';
    var cur = 0, busy = false;
    var below = function () { return Math.max(window.innerHeight, list.offsetHeight + 60); };
    var state = function (j, i) {
      return j < i ? { y: -14, scale: 0.95, filter: DIM }
           : j === i ? { y: 0, scale: 1, filter: 'brightness(1)' }
           : { y: below(), scale: 1, filter: 'brightness(1)' };
    };
    var place = function (i) {
      cards.forEach(function (c, j) { gsap.set(c, state(j, i)); c.classList.toggle('is-on', j <= i); });
      cur = i;
    };
    var go = function (i) {
      busy = true;
      cards.forEach(function (c, j) {
        gsap.to(c, Object.assign({ duration: 0.6, ease: 'power3.out', overwrite: true }, state(j, i)));
        c.classList.toggle('is-on', j <= i);
      });
      cur = i;
      gsap.delayedCall(0.5, function () { busy = false; });   // один змах — одна картка
    };
    var obs = ST.observe({
      type: 'touch,wheel', wheelSpeed: -1, tolerance: 12, preventDefault: true,
      onUp: function () { if (busy) return; if (cur < n - 1) go(cur + 1); else release(1); },     // палець угору — наступна
      onDown: function () { if (busy) return; if (cur > 0) go(cur - 1); else release(-1); },       // палець униз — попередня
      onEnable: function (self) {
        var y = self.scrollY();
        self._lock = function () { self.scrollY(y); };     // сторінка стоїть, поки гортаємо картки
        document.addEventListener('scroll', self._lock, { passive: false });
      },
      onDisable: function (self) { document.removeEventListener('scroll', self._lock); }
    });
    obs.disable();
    // після останньої (чи перед першою) картки — відпускаємо сторінку й одразу трохи прокручуємо її,
    // щоб той самий змах не «пропав»
    var release = function (dir) {
      obs.disable();
      window.scrollBy({ top: dir * 160, behavior: 'smooth' });
    };
    place(0);
    var st = ST.create({
      trigger: list, pin: true, pinSpacing: true, refreshPriority: 1,
      start: function () { return 'top ' + Math.max(64, (window.innerHeight - list.offsetHeight) / 2) + 'px'; },
      end: '+=120', invalidateOnRefresh: true, onRefreshInit: fit,
      onEnter: function (self) { if (obs.isEnabled) return; self.scroll(self.start + 1); obs.enable(); },
      onEnterBack: function (self) { if (obs.isEnabled) return; self.scroll(self.end - 1); obs.enable(); }
    });
    return function () {
      obs.kill(); st.kill();
      list.classList.remove('is-deck'); list.style.height = '';
      cards.forEach(function (c) { c.style.height = ''; c.classList.remove('is-on'); });
      gsap.set(cards, { clearProps: 'all' });
    };
  };
  mm.add('(max-width: 1023.98px)', function () {
    var undoRules = swipeDeck($('.rules__deck'));
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
  // 04 · стос із трьох реклам Loivi: масштаб під висоту станції; верхня картка по черзі йде назад
  var fbStack = $('.fbstack');
  if (fbStack) {
    var fbCards = $$('.fbad', fbStack), fbOrder = fbCards.slice(), fbT = null;
    var fbFit = function () {
      fbStack.style.transform = '';
      var vis = fbStack.closest('.belt__vis');
      // уміститися і по висоті станції, і по ширині (з бічними картками стос ~1.8 ширини картки)
      var k = Math.min(1, (vis.clientHeight - 30) / fbStack.offsetHeight, vis.clientWidth / (fbStack.offsetWidth * 1.8));
      fbStack.style.transform = 'scale(' + k.toFixed(3) + ')';
    };
    // одна спереду по центру, дві — позаду з боків; по колу міняються місцями
    var SLOT = [
      { xPercent: 0, scale: 1, zIndex: 3, rotation: 0, filter: 'brightness(1)' },       // центр
      { xPercent: -46, scale: 0.8, zIndex: 1, rotation: -5, filter: 'brightness(.88)' }, // зліва позаду
      { xPercent: 46, scale: 0.8, zIndex: 1, rotation: 5, filter: 'brightness(.88)' }    // справа позаду
    ];
    var fbLay = function (anim) {
      fbOrder.forEach(function (c, i) {
        gsap.to(c, Object.assign({ duration: anim ? 0.8 : 0, ease: 'power3.inOut' }, SLOT[i]));
      });
    };
    var fbNext = function () {
      // права виходить у центр, центральна йде вліво, ліва — вправо
      fbOrder = [fbOrder[2], fbOrder[0], fbOrder[1]];
      fbLay(true);
    };
    fbFit(); fbLay(false);
    window.addEventListener('resize', fbFit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fbFit);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { if (!fbT) fbT = setInterval(fbNext, 2600); }
      else { clearInterval(fbT); fbT = null; }
    }, { threshold: 0.4 }).observe(fbStack);
  }
  // станції конвеєра: is-in, коли станція в кадрі (мітки текстів, кабінет кампаній)
  if ('IntersectionObserver' in window) {
    var adsDone = false;
    var stIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        if (!adsDone && $('.ads', e.target)) {
          adsDone = true;
          $$('.ads__row:not(.ads__row--th)', e.target).forEach(function (row, i) {
            setTimeout(function () {
              row.classList.add('is-on');
              var n = $('.ads__num', row), to = +n.dataset.to, o = { v: 0 };
              gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out', onUpdate: function () { n.textContent = Math.round(o.v).toLocaleString('uk-UA'); } });
            }, 250 + i * 350);
          });
        }
      });
    }, { threshold: 0.5 });
    $$('.belt__st').forEach(function (st) { stIO.observe(st); });
  }
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
    gsap.timeline({ scrollTrigger: { trigger: '.belt', start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true } })
      .to(track, { x: function () { return -(track.scrollWidth - window.innerWidth); }, ease: 'none', duration: 1 })
      .to({}, { duration: 0.15 });   // пауза: остання станція тримається, перш ніж секція поїде
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
    trigger: '.brief__list', start: 'top 90%', end: 'bottom 82%', scrub: true,   // усі пункти заповнені, поки список ще в нижній частині екрана
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

  /* ---------- відгуки: стрілки гортають стрічку на ширину картки ---------- */
  var rvTrack = $('.reviews__track');
  if (rvTrack) {
    var rvPrev = $('.reviews__btn--prev'), rvNext = $('.reviews__btn--next');
    var rvStep = function () { var c = $('.rv', rvTrack); return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(rvTrack).columnGap || 24) : 300; };
    var rvSync = function () {
      rvPrev.disabled = rvTrack.scrollLeft < 4;
      rvNext.disabled = rvTrack.scrollLeft + rvTrack.clientWidth >= rvTrack.scrollWidth - 4;
    };
    rvPrev.addEventListener('click', function () { rvTrack.scrollBy({ left: -rvStep(), behavior: 'smooth' }); });
    rvNext.addEventListener('click', function () { rvTrack.scrollBy({ left: rvStep(), behavior: 'smooth' }); });
    rvTrack.addEventListener('scroll', rvSync, { passive: true });
    window.addEventListener('resize', rvSync);
    rvSync();
    // одне аудіо за раз
    $$('.rv__audio').forEach(function (a) { a.addEventListener('play', function () { $$('.rv__audio').forEach(function (o) { if (o !== a) o.pause(); }); }); });
  }

  /* ---------- 06 · рівняння: частини з'являються по черзі ---------- */
  if ($('.eq')) {
    gsap.from('.eq > *', { y: 24, autoAlpha: 0, duration: 0.6, ease: 'power3.out', stagger: 0.14,
      scrollTrigger: { trigger: '.eq', start: 'top 80%', once: true } });
  }

  /* ---------- 07 · кейси: ролик грає при наведенні (ПК) або коли плитка в кадрі (телефон) ---------- */
  var cases = $$('.case');
  if (cases.length) {
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var playCase = function (c, on) {
      var v = $('.case__vid', c);
      if (!v) return;
      if (on) { v.preload = 'auto'; v.play().then(function () { c.classList.add('is-playing'); }).catch(function () {}); }
      else { c.classList.remove('is-playing'); v.pause(); }
    };
    if (canHover) cases.forEach(function (c) {
      c.addEventListener('mouseenter', function () { playCase(c, true); });
      c.addEventListener('mouseleave', function () { playCase(c, false); });
    });
    else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { playCase(e.target, e.intersectionRatio > 0.6); }); }, { threshold: [0, 0.6, 1] });
      cases.forEach(function (c) { io.observe(c); });
    }
    gsap.from(cases, { y: 40, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: '.cases__grid', start: 'top 85%', once: true } });
  }

  /* ---------- мем біля курсора при наведенні на кнопку (лише миша) ----------
     «Стартуєм» у брифі, «Замовити креативи» в бренд-пам'яті, «Знизити вартість ліда» біля чека, картка «Замовити креативи» в принципах — кожна зі своїм мемом */
  var memeHover = function (btn, src, cls) {
    if (!btn) return;
    var meme = document.createElement('img');
    meme.className = 'brief__meme' + (cls ? ' ' + cls : '');
    meme.src = src;
    meme.alt = '';
    meme.setAttribute('aria-hidden', 'true');
    document.body.appendChild(meme);
    // мем висить над курсором: низ картинки — трохи вище за вістря, по центру
    gsap.set(meme, { xPercent: -50, yPercent: -100, x: -400, y: -400, scale: 0, rotation: 14, autoAlpha: 0 });
    var mx = gsap.quickTo(meme, 'x', { duration: 0.35, ease: 'power3.out' });
    var my = gsap.quickTo(meme, 'y', { duration: 0.35, ease: 'power3.out' });
    btn.addEventListener('mouseenter', function (e) {
      gsap.set(meme, { x: e.clientX, y: e.clientY - 46 });
      gsap.to(meme, { scale: 1, autoAlpha: 1, rotation: 14, duration: 0.45, ease: 'back.out(2)', overwrite: 'auto' });
    });
    btn.addEventListener('mousemove', function (e) { mx(e.clientX); my(e.clientY - 46); });
    btn.addEventListener('mouseleave', function () {
      gsap.to(meme, { scale: 0, autoAlpha: 0, rotation: 35, duration: 0.25, ease: 'power2.in', overwrite: 'auto' });
    });
  };
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    memeHover($('.brief__send'), 'images/brief/meme.webp');
    memeHover($('.memory__end .pill-btn'), 'images/brief/hamster.webp');
    memeHover($('.bill__cta'), 'images/brief/laugh.webp');
    memeHover($('.rule--cta'), 'images/brief/dog.webp');
    memeHover($('.cta__main'), 'images/brief/sticker.webp?v=2');
    memeHover($('.cases__more .pill-btn'), 'images/brief/cat.webp');   // котик впритул до камери   // анімований стікер (квадратний, як інші меми)
  }

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
