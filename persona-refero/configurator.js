/* =========================================================
   PERSONA — Інтерактивний конфігуратор фотокниги
   ---------------------------------------------------------
   Увесь UI генерується з window.PERSONA_CONFIG.
   При зміні будь-якого параметра — миттєвий перерахунок ціни
   та перемальовка 3D-візуалізатора (без перезавантаження).
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.PERSONA_CONFIG;
  if (!CFG) return;
  var root = document.getElementById('configurator');
  if (!root) return;

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return list[0]; }

  // яскравість кольору 0..255 → колір фольги тиснення
  // світла тканина → мідна фольга (як ALESSANDRO & ELENA); темна → шампань-золото
  function foilFor(hex) {
    var h = hex.replace('#', '');
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 140 ? '#a96f3b' : '#d9c49c';
  }

  var PHOTO_TRIM = '#e7e0d2'; // лляний кант корінця/торців для фотообкладинки
  // темніший відтінок (для корінця)
  function darken(hex, k) {
    var h = hex.replace('#', '');
    var r = Math.round(parseInt(h.substr(0, 2), 16) * k);
    var g = Math.round(parseInt(h.substr(2, 2), 16) * k);
    var b = Math.round(parseInt(h.substr(4, 2), 16) * k);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function money(v) { return v + ' ' + CFG.currencySymbol; }

  /* ---------- state ---------- */
  var d = CFG.defaults;
  var pkg0 = find(CFG.packages, d.packageId);
  var state = {
    packageId: d.packageId,
    formatId:  d.formatId,
    coverId:   d.coverId,
    colorId:   d.colorId,
    text:      d.text || '',
    photo:     null,
    spreads:   pkg0.minSpreads,
  };

  /* ---------- build option chips ---------- */
  function buildChips(container, items, getActive, onPick, labelFn) {
    container.innerHTML = '';
    items.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = labelFn ? labelFn(item) : item.name;
      b.setAttribute('data-id', item.id);
      if (item.id === getActive()) b.classList.add('is-on');
      b.addEventListener('click', function () { onPick(item.id); });
      container.appendChild(b);
    });
  }

  function syncChips(container, activeId) {
    container.querySelectorAll('.chip').forEach(function (c) {
      c.classList.toggle('is-on', c.getAttribute('data-id') === activeId);
    });
  }

  /* package chips */
  var optPackage = $('optPackage');
  buildChips(optPackage, CFG.packages, function () { return state.packageId; }, setPackage);
  /* format chips */
  var optFormat = $('optFormat');
  buildChips(optFormat, CFG.formats, function () { return state.formatId; }, setFormat);
  /* cover chips */
  var optCover = $('optCover');
  buildChips(optCover, CFG.covers, function () { return state.coverId; }, setCover);

  /* color swatches */
  var optColor = $('optColor');
  CFG.fabricColors.forEach(function (c) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cfg__swatch';
    b.style.background = c.hex;
    b.setAttribute('data-id', c.id);
    b.setAttribute('title', c.name);
    b.setAttribute('aria-label', c.name);
    if (c.id === state.colorId) b.classList.add('is-on');
    b.addEventListener('click', function () { setColor(c.id); });
    optColor.appendChild(b);
  });

  /* ---------- setters ---------- */
  function setPackage(id) {
    state.packageId = id;
    var pkg = find(CFG.packages, id);
    // при виборі пакета — завжди скидаємо до мінімуму цього пакета
    state.spreads = pkg.minSpreads;
    syncChips(optPackage, id);
    renderAll();
  }
  function setFormat(id) { state.formatId = id; syncChips(optFormat, id); renderAll(); }
  /* вибір видання з таблиці → найдешевша комплектація (мін. формат + мін. розвороти) */
  function selectEdition(pkgId) {
    var pkg = find(CFG.packages, pkgId);
    var cheapest = CFG.formats.reduce(function (a, b) { return b.base[pkgId] < a.base[pkgId] ? b : a; });
    state.packageId = pkgId;
    state.formatId = cheapest.id;
    state.spreads = pkg.minSpreads;
    syncChips(optPackage, pkgId);
    syncChips(optFormat, cheapest.id);
    renderAll();
  }
  function setCover(id)  { state.coverId = id; syncChips(optCover, id); renderAll(); }
  function setColor(id)  {
    state.colorId = id;
    optColor.querySelectorAll('.cfg__swatch').forEach(function (s) {
      s.classList.toggle('is-on', s.getAttribute('data-id') === id);
    });
    renderBook(); renderLabels();
  }

  /* text */
  var coverText = $('coverText');
  coverText.value = state.text;
  coverText.addEventListener('input', function () {
    state.text = coverText.value;
    renderBook();
  });

  /* photo upload */
  var coverPhoto = $('coverPhoto');
  var uploadText = $('uploadText');
  var removePhoto = $('removePhoto');
  var uploadLabel = $('uploadLabel');
  coverPhoto.addEventListener('change', function () {
    var file = coverPhoto.files && coverPhoto.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      state.photo = e.target.result;
      uploadText.textContent = file.name.length > 22 ? file.name.slice(0, 20) + '…' : file.name;
      uploadLabel.classList.add('has-photo');
      removePhoto.hidden = false;
      renderBook();
    };
    reader.readAsDataURL(file);
  });
  removePhoto.addEventListener('click', function () {
    state.photo = null;
    coverPhoto.value = '';
    uploadText.textContent = 'Завантажити фото';
    uploadLabel.classList.remove('has-photo');
    removePhoto.hidden = true;
    renderBook();
  });

  /* spreads stepper + ручний ввід */
  var spreadInput = $('spreadInput');
  $('spreadMinus').addEventListener('click', function () { changeSpreads(-1); });
  $('spreadPlus').addEventListener('click', function () { changeSpreads(1); });
  function clampSpreads(v) {
    var pkg = find(CFG.packages, state.packageId);
    if (isNaN(v)) v = pkg.minSpreads;
    return Math.max(pkg.minSpreads, Math.min(CFG.spreads.max, v));
  }
  function changeSpreads(delta) {
    var next = clampSpreads(state.spreads + delta * CFG.spreads.step);
    if (next === state.spreads) return;
    state.spreads = next;
    renderAll();
  }
  /* поки користувач друкує — лишаємо тільки цифри; фіксуємо на change/blur */
  spreadInput.addEventListener('input', function () {
    spreadInput.value = spreadInput.value.replace(/[^\d]/g, '');
  });
  spreadInput.addEventListener('change', commitSpreadInput);
  function commitSpreadInput() {
    state.spreads = clampSpreads(parseInt(spreadInput.value, 10));
    renderAll();
  }
  spreadInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { spreadInput.blur(); }
  });

  /* ---------- compare table → preselect package ---------- */
  document.querySelectorAll('.edition__select').forEach(function (btn) {
    var sel = (btn.getAttribute('data-select') || '').toLowerCase();
    var match = CFG.packages.filter(function (p) {
      return (p.match || []).indexOf(sel) !== -1 || p.id === sel;
    })[0];
    if (!match) return;
    btn.addEventListener('click', function () { selectEdition(match.id); });
  });

  /* "від <мінімальна комплектація>" під назвами видань у таблиці */
  document.querySelectorAll('.compare__from').forEach(function (el) {
    var id = el.getAttribute('data-from');
    var min = Math.min.apply(null, CFG.formats.map(function (f) { return f.base[id]; }));
    el.innerHTML = 'від <strong>' + money(min) + '</strong>';
  });

  /* ---------- render ---------- */
  var book = $('book');
  var bookPhoto = $('bookPhoto');
  var bookText = $('bookText');
  var bookPlaque = $('bookPlaque');
  var bookShadow = $('bookShadow');

  function renderBook() {
    var fmt = find(CFG.formats, state.formatId);
    var color = find(CFG.fabricColors, state.colorId);
    var pkg = find(CFG.packages, state.packageId);

    // розмір та товщина (товщина росте з кількістю розворотів)
    book.style.setProperty('--scale', fmt.scale);
    var depth = 14 + state.spreads * 0.7;   // тонше: ~154px на 200 розворотів
    book.style.setProperty('--depth', depth.toFixed(1) + 'px');
    bookShadow.style.setProperty('--scale', fmt.scale);

    book.setAttribute('data-cover', state.coverId);

    // текстура тканини залежить від пакета (Light — звичайна, Premium/Grand — італійський льон)
    book.style.setProperty('--linen-tex', 'url("assets/' + pkg.texture + '?v=1")');

    if (state.coverId === 'photo') {
      // фото на передній панелі, лляний кант корінця/торців
      book.style.setProperty('--cover', PHOTO_TRIM);
      book.style.setProperty('--board', darken(PHOTO_TRIM, 0.8));
      bookPhoto.style.display = 'block';
      bookPhoto.style.backgroundImage = state.photo ? 'url(' + state.photo + ')' : 'none';
      bookPhoto.classList.toggle('is-empty', !state.photo);
      bookPlaque.style.display = 'none';
    } else {
      // тканина: колір обкладинки + торців, мідне/шампань тиснення
      book.style.setProperty('--cover', color.hex);
      book.style.setProperty('--board', darken(color.hex, 0.78));
      book.style.setProperty('--foil', foilFor(color.hex));
      bookPhoto.style.display = 'none';
      if (state.text.trim()) {
        bookPlaque.style.display = 'flex';
        bookText.textContent = state.text;
      } else {
        bookPlaque.style.display = 'none';
      }
    }
  }

  function renderPrice() {
    var fmt = find(CFG.formats, state.formatId);
    var pkg = find(CFG.packages, state.packageId);
    var base = fmt.base[state.packageId];
    var extra = Math.max(0, state.spreads - pkg.minSpreads);
    var total = base + extra * fmt.extraSpread;

    $('cfgPrice').textContent = money(total);
    var bd = $('cfgBreakdown');
    if (bd) {
      bd.textContent = extra > 0
        ? 'База ' + money(base) + '  ·  +' + extra + ' розв. × ' + money(fmt.extraSpread) + '  =  ' + money(extra * fmt.extraSpread)
        : 'База ' + money(base) + '  ·  ' + pkg.minSpreads + ' розворотів у пакеті';
    }
    return total;
  }

  function renderLabels() {
    var color = find(CFG.fabricColors, state.colorId);
    $('colorName').textContent = color.name;
  }

  function renderSpreads() {
    var pkg = find(CFG.packages, state.packageId);
    spreadInput.value = state.spreads;
    $('spreadMinus').disabled = state.spreads <= pkg.minSpreads;
    $('spreadPlus').disabled = state.spreads >= CFG.spreads.max;
    $('spreadHint').textContent = 'Мінімум для ' + pkg.name + ' — ' + pkg.minSpreads + ' · максимум ' + CFG.spreads.max;
  }

  function renderCoverMode() {
    var isFabric = state.coverId === 'fabric';
    $('fabricGroup').hidden = !isFabric;
    $('photoGroup').hidden = isFabric;
  }

  // зведення для форми заявки
  var formEdition = $('formEdition');
  function renderSummary(total) {
    if (!formEdition) return;
    var fmt = find(CFG.formats, state.formatId);
    var pkg = find(CFG.packages, state.packageId);
    var cover = find(CFG.covers, state.coverId);
    var parts = [
      pkg.name, fmt.name, cover.name,
      state.spreads + ' розв.',
    ];
    if (state.coverId === 'fabric') {
      parts.push('тканина: ' + find(CFG.fabricColors, state.colorId).name);
      if (state.text.trim()) parts.push('напис: «' + state.text.trim() + '»');
    } else if (state.photo) {
      parts.push('фото завантажено');
    }
    parts.push('≈ ' + money(total));
    formEdition.value = parts.join(' · ');
  }

  function renderAll() {
    renderCoverMode();
    renderBook();
    renderSpreads();
    renderLabels();
    var total = renderPrice();
    renderSummary(total);
  }

  /* CTA "Замовити цю конфігурацію" → дублюємо конфігурацію текстом у коментар заявки */
  var cfgCta = $('cfgCta');
  if (cfgCta) {
    cfgCta.addEventListener('click', function () {
      if (window.PersonaLead && formEdition) window.PersonaLead.setConfig(formEdition.value);
    });
  }

  renderAll();
})();
