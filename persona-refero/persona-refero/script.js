/* =========================================================
   PERSONA — refero — interactions
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var HEADER = 80;

  /* ---- Smooth inertial scroll (desktop, rAF lerp) ---- */
  var smooth = !reduceMotion && !coarse;
  var targetY = window.scrollY, currentY = window.scrollY, animating = false, menuOpen = false;
  var EASE = 0.1;
  function maxScroll(){ return document.documentElement.scrollHeight - window.innerHeight; }
  function clampY(v){ return Math.max(0, Math.min(v, maxScroll())); }
  function tick(){
    var d = targetY - currentY;
    if (Math.abs(d) < 0.4){ currentY = targetY; window.scrollTo(0, currentY); animating = false; return; }
    currentY += d * EASE; window.scrollTo(0, currentY); requestAnimationFrame(tick);
  }
  function startTick(){ if (!animating){ animating = true; currentY = window.scrollY; requestAnimationFrame(tick); } }
  function scrollToY(y){ y = clampY(y); if (!smooth){ window.scrollTo(0, y); targetY = currentY = y; return; } targetY = y; startTick(); }
  if (smooth){
    window.addEventListener('wheel', function (e){
      if (menuOpen || e.ctrlKey) return;
      e.preventDefault();
      var delta = e.deltaY * (e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? window.innerHeight : 1));
      targetY = clampY(targetY + delta); startTick();
    }, { passive:false });
    window.addEventListener('scroll', function (){ if (!animating){ targetY = currentY = window.scrollY; } }, { passive:true });
    window.addEventListener('resize', function (){ targetY = clampY(targetY); });
  }

  /* ---- Anchor links ---- */
  function goTo(y){ if (smooth) scrollToY(y); else window.scrollTo({ top:clampY(y), behavior: reduceMotion ? 'auto' : 'smooth' }); }
  /* якоримо до заголовка секції (а не до верху з паддингом) */
  function anchorY(el){
    var head = (el.querySelector && el.querySelector('.meta--head')) || el;
    return head.getBoundingClientRect().top + window.scrollY - HEADER;
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a){
    a.addEventListener('click', function (e){
      var id = a.getAttribute('href'); e.preventDefault();
      if (id === '#' || id === '#top'){
        /* якщо відкрито варіант події — повертаємось на загальну сторінку */
        if (location.search){ location.href = location.pathname; return; }
        goTo(0); return;
      }
      var t = document.querySelector(id);
      if (t) goTo(anchorY(t));
    });
  });

  /* ---- Nav scrolled ---- */
  var nav = document.getElementById('nav');
  function onScroll(){ if (window.scrollY > 30) nav.classList.add('is-scrolled'); else nav.classList.remove('is-scrolled'); }
  window.addEventListener('scroll', onScroll, { passive:true }); onScroll();

  /* ---- Mobile menu ---- */
  var burger = document.getElementById('burger');
  var mobileNav = document.getElementById('mobileNav');
  function toggleMenu(open){
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    mobileNav.classList.toggle('is-open', open);
    mobileNav.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', function (){ toggleMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  mobileNav.querySelectorAll('a').forEach(function (a){ a.addEventListener('click', function (){ toggleMenu(false); }); });

  /* ---- Події: варіант лендингу під подію (?event=...) ---- */
  var EVENTS = {
    wedding: {
      tagline:'Весільні фотокниги Persona',
      title:['Фотокниги,','створені для','найцінніших','спогадів'],
      subtitle:'Одного дня ви згадаєте не сам день — а те, як сильно ви були щасливі. Ці моменти ми збережемо у книзі, яку захочеться брати в руки знову і знову.'
    },
    birthday: {
      tagline:'Persona для свят',
      title:['Фотокниги,','що зберігають','тепло свята'],
      subtitle:'Роки минають швидко, а сміх, побажання та обійми залишаються. Ми зберемо їх в одну книгу — щоб ви поверталися до цих емоцій знову і знову.'
    },
    newborn: {
      tagline:'Persona для родин',
      title:['Перші дні,','збережені','назавжди'],
      subtitle:'Маленькі пальчики, перший погляд, найніжніші обійми — усе це минає так швидко. Ми збережемо ці крихкі моменти у книзі, яку ваша дитина колись відкриє сама.'
    }
  };
  var curEvent = (new URLSearchParams(location.search)).get('event');
  var evCfg = curEvent && EVENTS[curEvent];
  if (evCfg){
    var heroEl = document.getElementById('hero');
    if (heroEl) heroEl.classList.add('is-event');
    /* підпис над заголовком — єдиний на всіх сторінках (не міняємо під подію) */
    var titleEl = document.querySelector('.hero__title');
    if (titleEl && evCfg.title){
      titleEl.innerHTML = '';
      evCfg.title.forEach(function (t, i){
        var line = document.createElement('span'); line.className = 'line';
        var inner = document.createElement('span'); inner.textContent = t;
        inner.style.animationDelay = (1.05 + i * 0.13) + 's';   /* той самий каскад, що й на головній */
        line.appendChild(inner); titleEl.appendChild(line);
      });
    }
    var subEl = document.getElementById('heroSubtitle');
    if (subEl) subEl.textContent = evCfg.subtitle || '';
    /* за наявності медіа під подію — підміняємо постер/відео hero */
    var hv = document.querySelector('.hero__video');
    if (hv){
      var src = hv.querySelector('source');
      if (src){
        src.setAttribute('src', 'assets/hero-' + curEvent + '.mp4');
        hv.load();
        /* якщо медіа під подію ще немає — повертаємо дефолтне відео */
        hv.addEventListener('error', function (){ src.setAttribute('src', 'assets/hero.mp4'); hv.load(); }, { once:true });
      }
    }
  }

  /* ---- Повноекранне меню подій ---- */
  var eventsMenu = document.getElementById('eventsMenu');
  var eventsOpen = document.getElementById('eventsOpen');
  var eventsClose = document.getElementById('eventsClose');
  if (eventsMenu && eventsOpen){
    function openEvents(){ eventsMenu.classList.add('is-open'); eventsMenu.setAttribute('aria-hidden','false'); eventsOpen.setAttribute('aria-expanded','true'); document.body.style.overflow = 'hidden'; }
    function closeEvents(){ eventsMenu.classList.remove('is-open'); eventsMenu.setAttribute('aria-hidden','true'); eventsOpen.setAttribute('aria-expanded','false'); document.body.style.overflow = ''; }
    eventsOpen.addEventListener('click', openEvents);
    if (eventsClose) eventsClose.addEventListener('click', closeEvents);
    /* клік на фон (не по контенту) — закрити */
    eventsMenu.addEventListener('click', function (e){ if (e.target === eventsMenu) closeEvents(); });
    document.addEventListener('keydown', function (e){ if (e.key === 'Escape') closeEvents(); });
  }

  /* ---- Заголовки секцій: розбивка на реальні рядки (за переносом) для маскової появи ---- */
  var dispHeads = document.querySelectorAll('h2.display');
  function splitHeading(h){
    var text = h.getAttribute('data-text');
    if (text === null){ text = h.textContent.replace(/\s+/g, ' ').trim(); h.setAttribute('data-text', text); }
    /* тимчасово розкладаємо на слова, щоб виміряти переноси */
    h.innerHTML = text.split(' ').map(function (w){ return '<span class="w" style="display:inline-block">' + w + '</span>'; }).join(' ');
    var words = h.querySelectorAll('.w'), lines = [], cur = [], top = null;
    words.forEach(function (w){
      var t = w.offsetTop;
      if (top === null) top = t;
      if (t - top > 2){ lines.push(cur); cur = []; top = t; }
      cur.push(w.textContent);
    });
    if (cur.length) lines.push(cur);
    h.innerHTML = lines.map(function (ws, i){
      return '<span class="line"><span style="transition-delay:' + (i * 0.09).toFixed(2) + 's">' + ws.join(' ') + '</span></span>';
    }).join('');
  }
  function splitAllHeads(){ dispHeads.forEach(splitHeading); }
  if (document.fonts && document.fonts.ready){ document.fonts.ready.then(splitAllHeads); } else { splitAllHeads(); }
  var splitT;
  window.addEventListener('resize', function (){ clearTimeout(splitT); splitT = setTimeout(splitAllHeads, 200); });

  /* ---- Stagger ---- */
  document.querySelectorAll('[data-stagger]').forEach(function (g){
    Array.prototype.forEach.call(g.children, function (c, i){ c.style.transitionDelay = (i * 0.08) + 's'; });
  });

  /* ---- Reveal ---- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion){
    var io = new IntersectionObserver(function (es){
      es.forEach(function (en){ if (en.isIntersecting){ en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold:0.1, rootMargin:'0px 0px -6% 0px' });
    reveals.forEach(function (el){ io.observe(el); });
  } else { reveals.forEach(function (el){ el.classList.add('is-in'); }); }

  /* ---- Aesthetics: статичне фото праворуч; наведення на пункт змінює фото ---- */
  var aes = document.getElementById('aesthetics');
  if (aes){
    var pts = aes.querySelectorAll('.point');
    var imgs = aes.querySelectorAll('.stack__img');
    var activeIdx = -1;
    function setActive(i){
      if (i === activeIdx) return;
      activeIdx = i;
      imgs.forEach(function (im, k){ im.classList.toggle('is-active', k === i); });
      pts.forEach(function (p, k){ p.classList.toggle('is-active', k === i); });
    }
    setActive(0);

    pts.forEach(function (p, i){
      p.addEventListener('mouseenter', function (){ setActive(i); });  /* desktop hover */
      p.addEventListener('click', function (){ setActive(i); });        /* tap на мобільному */
    });
  }

  /* ---- Compare → configurator + smooth scroll ----
     Кнопки "Обрати …" у таблиці порівняння делегуються конфігуратору
     (configurator.js слухає клік і виставляє пакет). Тут лише плавний скрол. */
  var configurator = document.getElementById('configurator');
  document.querySelectorAll('.edition__select').forEach(function (btn){
    btn.addEventListener('click', function (){
      if (configurator) goTo(configurator.getBoundingClientRect().top + window.scrollY - HEADER);
    });
  });

  /* ---- Carousel: гортання стрілками (нативний свайп лишається) ---- */
  document.querySelectorAll('[data-carousel]').forEach(function (c){
    var track = c.querySelector('.cases--row');
    var prev = c.querySelector('.carousel__arrow--prev');
    var next = c.querySelector('.carousel__arrow--next');
    if (!track || track.children.length < 2) return;

    var gap = 0, cardW = 0, busy = false;
    function perView(){ var w = c.clientWidth; return w <= 768 ? 1 : (w <= 1024 ? 2 : 3); }
    function layout(){
      var n = perView();
      var cs = getComputedStyle(track);
      gap = parseFloat(cs.columnGap || cs.gap) || 0;
      cardW = (c.clientWidth - gap * (n - 1)) / n;
      Array.prototype.forEach.call(track.children, function (it){ it.style.flex = '0 0 ' + cardW + 'px'; it.style.maxWidth = cardW + 'px'; });
      track.style.transition = 'none';
      track.style.transform = 'translateX(0)';
    }
    function afterAnim(cb){
      var done = false;
      function h(){ if (done) return; done = true; track.removeEventListener('transitionend', h); cb(); }
      track.addEventListener('transitionend', h);
      setTimeout(h, reduceMotion ? 0 : 560);
    }
    var EASE = 'transform .5s cubic-bezier(.4,0,.2,1)';
    function next1(){
      if (busy) return; busy = true;
      track.style.transition = reduceMotion ? 'none' : EASE;
      track.style.transform = 'translateX(' + (-(cardW + gap)) + 'px)';
      afterAnim(function (){
        track.style.transition = 'none';
        track.appendChild(track.firstElementChild);   /* перша картка → в кінець */
        track.style.transform = 'translateX(0)';
        void track.offsetWidth;                        /* reflow */
        busy = false;
      });
    }
    function prev1(){
      if (busy) return; busy = true;
      track.style.transition = 'none';
      track.insertBefore(track.lastElementChild, track.firstElementChild); /* остання → на початок */
      track.style.transform = 'translateX(' + (-(cardW + gap)) + 'px)';
      void track.offsetWidth;
      track.style.transition = reduceMotion ? 'none' : EASE;
      track.style.transform = 'translateX(0)';
      afterAnim(function (){ busy = false; });
    }
    if (next) next.addEventListener('click', next1);
    if (prev) prev.addEventListener('click', prev1);
    window.addEventListener('resize', layout);
    layout();
  });

  /* ---- Lead comment helpers (спільні для карток і конфігуратора) ---- */
  var commentEl = document.getElementById('leadComment');
  function commentLines(){
    return commentEl && commentEl.value ? commentEl.value.split('\n').filter(function (s){ return s.length; }) : [];
  }
  function addCommentLine(text){
    if (!commentEl) return;
    var lines = commentLines();
    if (lines.indexOf(text) === -1) lines.push(text);
    commentEl.value = lines.join('\n');
  }
  function setLineByPrefix(prefix, text){
    if (!commentEl) return;
    var lines = commentLines(), found = false;
    lines = lines.map(function (l){ if (l.indexOf(prefix) === 0){ found = true; return text; } return l; });
    if (!found) lines.push(text);
    commentEl.value = lines.join('\n');
  }
  /* доступно конфігуратору (configurator.js) */
  window.PersonaLead = {
    addCommentLine: addCommentLine,
    setConfig: function (summary){ setLineByPrefix('Конфігурація:', 'Конфігурація: ' + summary); }
  };

  /* ---- "Обрати" на картках колекцій → заявка + дублювання у коментар ---- */
  var contactEl = document.getElementById('contact');
  var editionsEl = document.getElementById('editions');
  document.querySelectorAll('.case').forEach(function (card){
    var titleEl = card.querySelector('.case__title');
    var name = titleEl ? titleEl.textContent.trim() : '';
    if (!name) return;
    var inCollections = !!card.closest('#collections');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill case__select';
    btn.textContent = inCollections ? 'Обрати видання' : 'Обрати';
    btn.setAttribute('data-collection', name);
    btn.addEventListener('click', function (){
      if (inCollections){
        if (editionsEl) goTo(anchorY(editionsEl));   /* → блок "Видання" */
      } else {
        addCommentLine('Цікавить: ' + name);
        if (contactEl) goTo(anchorY(contactEl));
      }
    });
    card.appendChild(btn);
  });

  /* ---- Lightbox: збільшення фото по кліку ---- */
  var zoomImgs = document.querySelectorAll('img.compare__photo, .stack__img img, img.zoomable');
  if (zoomImgs.length){
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('aria-hidden', 'true');
    var lbBig = document.createElement('img');
    lb.appendChild(lbBig);
    document.body.appendChild(lb);
    function lbOpen(src, alt){ lbBig.src = src; lbBig.alt = alt || ''; lb.classList.add('is-open'); lb.setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden'; }
    function lbClose(){ lb.classList.remove('is-open'); lb.setAttribute('aria-hidden','true'); document.body.style.overflow = ''; }
    lb.addEventListener('click', lbClose);
    document.addEventListener('keydown', function (e){ if (e.key === 'Escape') lbClose(); });
    zoomImgs.forEach(function (im){
      im.classList.add('is-zoomable');
      im.addEventListener('click', function (){ lbOpen(im.currentSrc || im.src, im.alt); });
    });
  }

  /* ---- FAQ: відкритий лише один пункт ---- */
  var faqItems = document.querySelectorAll('.faq__item');
  faqItems.forEach(function (d){
    d.addEventListener('toggle', function (){
      if (d.open) faqItems.forEach(function (o){ if (o !== d) o.open = false; });
    });
  });

  /* ---- Lead form ---- */
  var form = document.getElementById('leadForm');
  var note = document.getElementById('formNote');
  if (form){
    form.addEventListener('submit', function (e){
      e.preventDefault();
      var name = document.getElementById('name').value.trim(),
          phone = document.getElementById('phone').value.trim();
      if (!name || !phone){ if (note){ note.hidden = false; note.textContent = 'Будь ласка, заповніть ім’я та телефон.'; } return; }
      /* TODO: send to backend / WordPress endpoint */
      if (note){ note.hidden = false; note.textContent = 'Дякуємо. Ми зв’яжемося з вами найближчим часом.'; }
      form.reset();
    });
  }

  /* ---- Preorder form ---- */
  var poForm = document.getElementById('preorderForm');
  var poNote = document.getElementById('preorderNote');
  if (poForm){
    var poDate = document.getElementById('poDate');
    if (poDate){ poDate.min = new Date().toISOString().slice(0, 10); }   /* не раніше сьогодні */
    poForm.addEventListener('submit', function (e){
      e.preventDefault();
      var name = document.getElementById('poName').value.trim(),
          phone = document.getElementById('poPhone').value.trim(),
          date = poForm.date.value;
      if (!name || !phone || !date){
        if (poNote){ poNote.hidden = false; poNote.textContent = 'Будь ласка, заповніть ім’я, телефон та дату події.'; }
        return;
      }
      /* TODO: send to backend / WordPress endpoint */
      if (poNote){ poNote.hidden = false; poNote.textContent = 'Дякуємо! Передзамовлення прийнято. Арт-куратор зв’яжеться з вами та делікатно нагадає ближче до дати події.'; }
      poForm.reset();
    });
  }
})();
